import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { LLMManager } from '../llm/llmManager';
import { VectorDB } from '../db/vectorDB';
import { GitManager } from '../git/gitManager';
import { SpecGenerator, GeneratedSpec, SpecificationRequest } from './specGenerator';
import { PlanGenerator, TechnicalPlan } from './planGenerator';
import { TaskGenerator, TaskList } from './taskGenerator';
import { logger } from '../utils/logger';
import { createSafePath, validateAndSanitizePath, validateFilename } from '../utils/inputValidation';

export interface SpecKitWorkflow {
  id: string;
  featureName: string;
  status: 'specification' | 'planning' | 'tasks' | 'implementation' | 'complete';
  spec?: GeneratedSpec;
  plan?: TechnicalPlan;
  tasks?: TaskList;
  workspaceDir: string;
  specsDir: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SpecKitConfig {
  autoCommit: boolean;
  useMultiLLM: boolean;
  enforceConstitution: boolean;
  defaultTechStack: {
    language: string;
    framework: string;
    testing: string;
  };
}

export class SpecKitManager {
  private llmManager: LLMManager;
  private vectorDB: VectorDB;
  private gitManager: GitManager;
  private specGenerator: SpecGenerator;
  private planGenerator: PlanGenerator;
  private taskGenerator: TaskGenerator;
  private workflows: Map<string, SpecKitWorkflow> = new Map();
  private config: SpecKitConfig;

  constructor(
    llmManager: LLMManager,
    vectorDB: VectorDB,
    gitManager: GitManager
  ) {
    this.llmManager = llmManager;
    this.vectorDB = vectorDB;
    this.gitManager = gitManager;
    
    this.specGenerator = new SpecGenerator(llmManager, vectorDB);
    this.planGenerator = new PlanGenerator(llmManager, vectorDB);
    this.taskGenerator = new TaskGenerator(llmManager, vectorDB);
    
    this.config = this.loadConfig();
  }

  private loadConfig(): SpecKitConfig {
    const workspaceConfig = vscode.workspace.getConfiguration('astraforge.specKit');
    return {
      autoCommit: workspaceConfig.get('autoCommit', true),
      useMultiLLM: workspaceConfig.get('useMultiLLM', true),
      enforceConstitution: workspaceConfig.get('enforceConstitution', true),
      defaultTechStack: {
        language: workspaceConfig.get('defaultLanguage', 'TypeScript'),
        framework: workspaceConfig.get('defaultFramework', 'Node.js'),
        testing: workspaceConfig.get('defaultTesting', 'Jest')
      }
    };
  }

  public async initializeSpecKit(workspaceDir: string): Promise<void> {
    logger.info('Initializing Spec Kit...');
    
    const specsDir = createSafePath(workspaceDir, 'specs');
    const templatesDir = createSafePath(workspaceDir, 'templates');
    const scriptsDir = createSafePath(workspaceDir, 'scripts');
    const memoryDir = createSafePath(workspaceDir, 'memory');

    const failedDirs: string[] = [];
    if (!specsDir) failedDirs.push('specsDir');
    if (!templatesDir) failedDirs.push('templatesDir');
    if (!scriptsDir) failedDirs.push('scriptsDir');
    if (!memoryDir) failedDirs.push('memoryDir');
    if (failedDirs.length > 0) {
      throw new Error(
        `Failed to resolve safe paths for Spec Kit directories: ${failedDirs.join(', ')}. ` +
        'Check workspace permissions and path validity.'
      );
    }

    // Create directory structure
    await this.createDirectoryStructure([specsDir, templatesDir, scriptsDir, memoryDir]);
    
    // Copy templates from spec-kit
    await this.copySpecKitTemplates(templatesDir);
    
    // Copy scripts
    await this.copySpecKitScripts(scriptsDir);
    
    // Create AstraForge constitution
    await this.createAstraForgeConstitution(memoryDir);
    
    // Initialize git if not already initialized
    if (this.config.autoCommit) {
      await this.gitManager.initRepo(workspaceDir);
      await this.gitManager.addAndCommit(['specs/', 'templates/', 'scripts/', 'memory/'], 'Initialize Spec Kit structure');
    }

    vscode.window.showInformationMessage('✅ Spec Kit initialized successfully!');
  }

  public async createSpecification(request: SpecificationRequest): Promise<string> {
    logger.info('SpecKit: createSpecification');
    
    // Generate specification
    const spec = await this.specGenerator.generateSpecification(request);
    
    // Create workflow
    const workflowId = this.generateWorkflowId();
    const workspaceDir = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
    
    // Sanitize the spec title to prevent path traversal
    let sanitizedTitle = spec.title
      .toLowerCase()
      .replace(/[^a-z0-9\-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!sanitizedTitle) {
      sanitizedTitle = 'feature';
    }
    const specDirName = `${workflowId}-${sanitizedTitle}`;

    const specsBaseDir = createSafePath(workspaceDir, 'specs');
    if (!specsBaseDir) {
      throw new Error('Failed to resolve base specification directory');
    }

    // Validate the directory name
    const specDirValidation = validateAndSanitizePath(specDirName, specsBaseDir);
    if (!specDirValidation.isValid) {
      throw new Error(`Invalid specification directory name: ${specDirValidation.errors.join(', ')}`);
    }

    const specsDir = createSafePath(specsBaseDir, specDirValidation.sanitizedPath!);
    if (!specsDir) {
      throw new Error('Failed to create safe path for specification directory');
    }
    
    const workflow: SpecKitWorkflow = {
      id: workflowId,
      featureName: spec.title,
      status: 'specification',
      spec,
      workspaceDir,
      specsDir,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.workflows.set(workflowId, workflow);
    
    // Create spec directory and save specification
    await this.createDirectoryStructure([specsDir]);
    
    const specPath = createSafePath(specsDir, 'spec.md');
    if (!specPath) {
      throw new Error('Failed to create safe path for specification file');
    }
    
    await fs.promises.writeFile(specPath, spec.content, 'utf8');
    
    // Save to vector DB for context
    await this.vectorDB.addDocument(`spec-${workflowId}`, spec.content, {
      type: 'specification',
      workflowId,
      featureName: spec.title
    });
    
    // Auto-commit if enabled
    if (this.config.autoCommit) {
      const filesToCommit = this.getGitRelativePaths(workspaceDir, [specPath]);
      if (filesToCommit.length > 0) {
        await this.gitManager.addAndCommit(filesToCommit, `Add specification: ${spec.title}`);
      }
    }
    
    // Show results to user
    await this.showSpecificationResults(workflow);
    
    return workflowId;
  }

  public async createImplementationPlan(workflowId: string, technicalRequirements?: any): Promise<void> {
    logger.info('SpecKit: createImplementationPlan');
    const workflow = this.workflows.get(workflowId);
    if (!workflow || !workflow.spec) {
      throw new Error('Workflow or specification not found');
    }

    // Generate technical plan
    const plan = await this.planGenerator.generatePlan(workflow.spec, technicalRequirements);
    
    // Execute research tasks
    const completedResearch = await this.planGenerator.executeResearch(plan.researchTasks);
    plan.researchTasks = completedResearch;
    
    // Update workflow
    workflow.plan = plan;
    workflow.status = 'planning';
    workflow.updatedAt = new Date();
    
    // Save plan documents
    const planPath = createSafePath(workflow.specsDir, 'plan.md');
    const researchPath = createSafePath(workflow.specsDir, 'research.md');
    const dataModelPath = createSafePath(workflow.specsDir, 'data-model.md');
    const contractsDir = createSafePath(workflow.specsDir, 'contracts');
    
    if (!planPath || !researchPath || !dataModelPath || !contractsDir) {
      throw new Error('Failed to create safe paths for plan documents');
    }
    
    await fs.promises.writeFile(planPath, plan.content, 'utf8');
    await fs.promises.writeFile(researchPath, this.formatResearchResults(plan.researchTasks), 'utf8');
    await fs.promises.writeFile(dataModelPath, plan.designPhase.dataModel, 'utf8');
    
    // Create contracts directory and files
    await this.createDirectoryStructure([contractsDir]);
    for (const contract of plan.designPhase.apiContracts) {
      // Sanitize contract name to prevent path traversal
      const sanitizedContractName = contract.toLowerCase().replace(/[^a-z0-9\-_]/g, '-').replace(/-+/g, '-');
      const contractFilename = `${sanitizedContractName}.json`;
      
      // Validate filename
      const filenameValidation = validateFilename(contractFilename);
      if (!filenameValidation.isValid) {
        logger.warn(`Skipping invalid contract filename: ${contract}`);
        continue;
      }
      
      const contractPath = createSafePath(contractsDir, contractFilename);
      if (!contractPath) {
        logger.warn(`Failed to create safe path for contract: ${contract}`);
        continue;
      }
      
      await fs.promises.writeFile(contractPath, JSON.stringify({ contract }, null, 2), 'utf8');
    }
    
    // Save to vector DB
    await this.vectorDB.addDocument(`plan-${workflowId}`, plan.content, {
      type: 'plan',
      workflowId,
      featureName: workflow.featureName
    });
    
    // Auto-commit if enabled
    if (this.config.autoCommit) {
      const filesToCommit = this.getGitRelativePaths(workflow.workspaceDir, [
        planPath,
        researchPath,
        dataModelPath,
        contractsDir
      ]);
      if (filesToCommit.length > 0) {
        await this.gitManager.addAndCommit(
          filesToCommit,
          `Add implementation plan: ${workflow.featureName}`
        );
      }
    }
    
    // Show results
    await this.showPlanResults(workflow);
  }

  public async generateTasks(workflowId: string): Promise<void> {
    logger.info('SpecKit: generateTasks');
    const workflow = this.workflows.get(workflowId);
    if (!workflow || !workflow.plan) {
      throw new Error('Workflow or plan not found');
    }

    // Generate task list
    const taskList = await this.taskGenerator.generateTasks(workflow.plan);
    
    // Validate tasks
    const validation = await this.taskGenerator.validateTasks(taskList);
    if (!validation.valid) {
      const proceed = await vscode.window.showWarningMessage(
        `Task validation found issues:\n${validation.issues.join('\n')}\n\nProceed anyway?`,
        'Proceed', 'Fix Issues'
      );
      
      if (proceed !== 'Proceed') {
        return;
      }
    }
    
    // Update workflow
    workflow.tasks = taskList;
    workflow.status = 'tasks';
    workflow.updatedAt = new Date();
    
    // Save tasks
    const tasksPath = createSafePath(workflow.specsDir, 'tasks.md');
    if (!tasksPath) {
      throw new Error('Failed to create safe path for tasks file');
    }
    
    await fs.promises.writeFile(tasksPath, taskList.content, 'utf8');
    
    // Save to vector DB
    await this.vectorDB.addDocument(`tasks-${workflowId}`, taskList.content, {
      type: 'tasks',
      workflowId,
      featureName: workflow.featureName
    });
    
    // Auto-commit if enabled
    if (this.config.autoCommit) {
      const filesToCommit = this.getGitRelativePaths(workflow.workspaceDir, [tasksPath]);
      if (filesToCommit.length > 0) {
        await this.gitManager.addAndCommit(filesToCommit, `Add task list: ${workflow.featureName}`);
      }
    }
    
    // Show results
    await this.showTaskResults(workflow);
  }

  public async refineSpecification(workflowId: string, refinements: string[]): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || !workflow.spec) {
      throw new Error('Workflow or specification not found');
    }

    // Refine specification
    const refinedSpec = await this.specGenerator.refineSpecification(workflow.spec.content, refinements);
    
    // Update workflow
    workflow.spec = refinedSpec;
    workflow.updatedAt = new Date();
    
    // Save refined specification
    const specPath = createSafePath(workflow.specsDir, 'spec.md');
    if (!specPath) {
      throw new Error('Failed to create safe path for refined specification file');
    }
    
    await fs.promises.writeFile(specPath, refinedSpec.content, 'utf8');
    
    // Update vector DB
    await this.vectorDB.addDocument(`spec-${workflowId}`, refinedSpec.content, {
      type: 'specification',
      workflowId,
      featureName: refinedSpec.title
    });
    
    // Auto-commit if enabled
    if (this.config.autoCommit) {
      const filesToCommit = this.getGitRelativePaths(workflow.workspaceDir, [specPath]);
      if (filesToCommit.length > 0) {
        await this.gitManager.addAndCommit(filesToCommit, `Refine specification: ${workflow.featureName}`);
      }
    }
    
    vscode.window.showInformationMessage('✅ Specification refined successfully!');
  }

  public getWorkflows(): SpecKitWorkflow[] {
    return Array.from(this.workflows.values());
  }

  public getWorkflow(workflowId: string): SpecKitWorkflow | undefined {
    return this.workflows.get(workflowId);
  }

  private generateWorkflowId(): string {
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const counter = String(this.workflows.size + 1).padStart(3, '0');
    return `${timestamp}-${counter}`;
  }

  private async createDirectoryStructure(dirs: string[]): Promise<void> {
    for (const dir of dirs) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
  }

  private async copySpecKitTemplates(templatesDir: string): Promise<void> {
    const sourceTemplatesDir = path.join(__dirname, '../../temp_spec_kit/templates');

    try {
      await this.copyDirectorySafely(
        sourceTemplatesDir,
        templatesDir,
        (relativePath, entry) => entry.isFile() && relativePath.endsWith('.md')
      );
    } catch (error) {
      console.error('Error copying templates:', error);
      // Create basic templates if copy fails
      await this.createBasicTemplates(templatesDir);
    }
  }

  private async createBasicTemplates(templatesDir: string): Promise<void> {
    const specTemplate = `# Feature Specification: {{FEATURE_NAME}}

**Created**: {{DATE}}
**Status**: Draft

## User Scenarios & Testing
{{USER_SCENARIOS}}

## Requirements
{{FUNCTIONAL_REQUIREMENTS}}

## Review & Acceptance Checklist
- [ ] Requirements are testable and unambiguous
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
`;

    const templatePath = createSafePath(templatesDir, 'spec-template.md');
    if (!templatePath) {
      throw new Error('Failed to create safe path for spec template');
    }
    
    await fs.promises.writeFile(templatePath, specTemplate, 'utf8');
  }

  private async copySpecKitScripts(scriptsDir: string): Promise<void> {
    const sourceScriptsDir = path.join(__dirname, '../../temp_spec_kit/scripts/powershell');

    try {
      await this.copyDirectorySafely(
        sourceScriptsDir,
        scriptsDir,
        (relativePath, entry) => entry.isFile() && relativePath.endsWith('.ps1')
      );
    } catch (error) {
      console.error('Error copying scripts:', error);
    }
  }

  private async createAstraForgeConstitution(memoryDir: string): Promise<void> {
    const constitution = `# AstraForge Development Constitution

## Core Principles

### I. AI-First Development
Every feature leverages AI collaboration for design, implementation, and optimization.
Multi-LLM panels provide diverse perspectives and reduce single-point-of-failure in decision making.
Vector-based context ensures decisions are informed by project history and best practices.

### II. Spec-Driven Development
Specifications are executable and directly generate implementations.
Requirements are validated through multi-agent collaboration before implementation begins.
Test-driven development is mandatory: Red-Green-Refactor cycle strictly enforced.

### III. Self-Improving Systems
Feedback loops capture user interactions and system performance.
Workflows adapt based on success patterns and failure analysis.
Knowledge base grows with each project, improving future recommendations.

### IV. Modular Architecture
Every feature starts as a standalone, testable library.
Clear separation of concerns with defined interfaces.
VS Code extension architecture supports pluggable components.

### V. Quality Gates (NON-NEGOTIABLE)
Constitution compliance checked at each phase.
Test coverage minimum 85% with real dependencies.
Performance benchmarks validated before deployment.
Security scans mandatory for external integrations.

## Development Workflow

### Phase 0: Specification
- Multi-LLM collaboration generates comprehensive specs
- User scenarios validate against real needs
- Constitution compliance verified
- Clarifications resolved before proceeding

### Phase 1: Technical Planning
- Research tasks executed with web search
- Architecture decisions documented with rationale
- API contracts generated from specifications
- Test strategies planned following TDD principles

### Phase 2: Task Generation
- Granular, executable tasks with clear dependencies
- Parallel execution opportunities identified
- TDD order enforced: Tests before implementation
- File-level dependency tracking prevents conflicts

### Phase 3: Implementation
- Automated task execution with AI assistance
- Real-time progress tracking and adaptation
- Continuous integration with quality gates
- Vector DB captures implementation patterns

### Phase 4: Validation & Deployment
- Comprehensive testing including performance benchmarks
- User acceptance validation against original specifications
- Deployment automation with rollback capabilities
- Post-deployment monitoring and feedback collection

## Technology Standards

### Languages & Frameworks
- Primary: TypeScript 5.1+ for VS Code extensions
- Testing: Jest with comprehensive coverage reporting
- Storage: Vector DB (Vectra) + file system for specifications
- Communication: Multi-LLM APIs (OpenAI, Anthropic, xAI, OpenRouter)

### Architecture Patterns
- Event-driven architecture for extension components
- Provider pattern for UI components
- Manager pattern for system integration
- Repository pattern for data persistence

### Quality Standards
- Cyclomatic complexity ≤ 10
- Test coverage ≥ 85%
- Code duplication ≤ 3%
- Performance: <100ms response time for UI actions

## Governance

This constitution supersedes all other development practices.
Violations must be explicitly justified with technical rationale.
Amendments require documentation, team approval, and migration plan.
All code reviews verify constitutional compliance.

**Version**: 1.0.0 | **Ratified**: ${new Date().toISOString().split('T')[0]} | **Last Amended**: ${new Date().toISOString().split('T')[0]}
`;

    const constitutionPath = createSafePath(memoryDir, 'constitution.md');
    if (!constitutionPath) {
      throw new Error('Failed to create safe path for constitution file');
    }
    
    await fs.promises.writeFile(constitutionPath, constitution, 'utf8');
  }

  private formatResearchResults(researchTasks: any[]): string {
    let content = '# Research Results\n\n';
    
    researchTasks.forEach(task => {
      content += `## ${task.id}: ${task.description}\n\n`;
      content += `**Rationale**: ${task.rationale}\n\n`;
      content += `**Alternatives Considered**: ${task.alternatives.join(', ')}\n\n`;
      if (task.decision) {
        content += `**Decision**: ${task.decision}\n\n`;
      }
      content += '---\n\n';
    });
    
    return content;
  }

  private async showSpecificationResults(workflow: SpecKitWorkflow): Promise<void> {
    const spec = workflow.spec!;
    
    let message = `✅ Specification created: ${spec.title}\n\n`;
    
    if (spec.clarificationNeeded.length > 0) {
      message += `⚠️  Clarifications needed:\n${spec.clarificationNeeded.map(c => `• ${c}`).join('\n')}\n\n`;
    }
    
    if (!spec.constitutionCompliance.passed) {
      message += `🚨 Constitution violations:\n${spec.constitutionCompliance.violations.map(v => `• ${v}`).join('\n')}\n\n`;
    }
    
    message += `📋 ${spec.functionalRequirements.length} functional requirements\n`;
    message += `👥 ${spec.userScenarios.length} user scenarios\n`;
    message += `🏗️  ${spec.keyEntities.length} key entities identified`;
    
    const action = await vscode.window.showInformationMessage(
      message,
      'Create Plan', 'Refine Spec', 'View Spec'
    );
    
    switch (action) {
      case 'Create Plan':
        await this.createImplementationPlan(workflow.id);
        break;
      case 'Refine Spec':
        const refinements = await vscode.window.showInputBox({
          prompt: 'Enter refinements (comma-separated)',
          placeHolder: 'Add more details about user roles, clarify requirements...'
        });
        if (refinements) {
          await this.refineSpecification(workflow.id, refinements.split(',').map(r => r.trim()));
        }
        break;
      case 'View Spec':
        {
          const specFilePath = createSafePath(workflow.specsDir, 'spec.md');
          if (!specFilePath) {
            vscode.window.showErrorMessage('Unable to resolve specification file path safely.');
            return;
          }
          const specUri = vscode.Uri.file(specFilePath);
          await vscode.window.showTextDocument(specUri);
        }
        break;
    }
  }

  private async showPlanResults(workflow: SpecKitWorkflow): Promise<void> {
    const plan = workflow.plan!;
    
    let message = `✅ Implementation plan created: ${workflow.featureName}\n\n`;
    message += `🏗️  Project type: ${plan.projectStructure.type}\n`;
    message += `💻 Tech stack: ${plan.technicalContext.language}, ${plan.technicalContext.primaryDependencies.join(', ')}\n`;
    message += `🔍 ${plan.researchTasks.length} research tasks completed\n`;
    
    if (plan.constitutionCheck.violations.length > 0) {
      message += `\n🚨 Constitution violations:\n${plan.constitutionCheck.violations.map(v => `• ${v}`).join('\n')}`;
    }
    
    const action = await vscode.window.showInformationMessage(
      message,
      'Generate Tasks', 'View Plan', 'Review Research'
    );
    
    switch (action) {
      case 'Generate Tasks':
        await this.generateTasks(workflow.id);
        break;
      case 'View Plan':
        {
          const planPath = createSafePath(workflow.specsDir, 'plan.md');
          if (!planPath) {
            vscode.window.showErrorMessage('Unable to resolve plan file path safely.');
            return;
          }
          const planUri = vscode.Uri.file(planPath);
          await vscode.window.showTextDocument(planUri);
        }
        break;
      case 'Review Research':
        {
          const researchPath = createSafePath(workflow.specsDir, 'research.md');
          if (!researchPath) {
            vscode.window.showErrorMessage('Unable to resolve research file path safely.');
            return;
          }
          const researchUri = vscode.Uri.file(researchPath);
          await vscode.window.showTextDocument(researchUri);
        }
        break;
    }
  }

  private async showTaskResults(workflow: SpecKitWorkflow): Promise<void> {
    const tasks = workflow.tasks!;
    
    let message = `✅ Task list generated: ${workflow.featureName}\n\n`;
    message += `📋 ${tasks.tasks.length} tasks created\n`;
    message += `⏱️  Estimated duration: ${tasks.estimatedDuration}\n`;
    message += `🔄 ${tasks.parallelGroups.length} parallel execution groups\n`;
    
    const testTasks = tasks.tasks.filter(t => t.type === 'test').length;
    const implTasks = tasks.tasks.filter(t => t.type === 'implementation').length;
    
    message += `\n🧪 ${testTasks} test tasks (TDD enforced)\n`;
    message += `⚙️ ${implTasks} implementation tasks`;
    
    const action = await vscode.window.showInformationMessage(
      message,
      'Start Implementation', 'View Tasks', 'Export Tasks'
    );
    
    switch (action) {
      case 'Start Implementation':
        // This would integrate with the existing workflow manager
        vscode.window.showInformationMessage('🚀 Ready for implementation! Tasks are available in the workflow manager.');
        break;
      case 'View Tasks':
        {
          const tasksPath = createSafePath(workflow.specsDir, 'tasks.md');
          if (!tasksPath) {
            vscode.window.showErrorMessage('Unable to resolve tasks file path safely.');
            return;
          }
          const tasksUri = vscode.Uri.file(tasksPath);
          await vscode.window.showTextDocument(tasksUri);
        }
        break;
      case 'Export Tasks':
        // Export to project management tool or clipboard
        await vscode.env.clipboard.writeText(tasks.content);
        vscode.window.showInformationMessage('📋 Tasks copied to clipboard');
        break;
    }
  }

  public async cleanupTempFiles(): Promise<void> {
    // Clean up temporary spec-kit repository
    const tempDir = path.join(process.cwd(), 'temp_spec_kit');
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }

  private async copyDirectorySafely(
    sourceDir: string,
    destinationDir: string,
    fileFilter?: (relativePath: string, entry: fs.Dirent) => boolean
  ): Promise<void> {
    const resolvedSource = path.resolve(sourceDir);
    const resolvedDestination = path.resolve(destinationDir);

    await fs.promises.mkdir(resolvedDestination, { recursive: true });

    const processDirectory = async (currentSource: string, relativeBase: string): Promise<void> => {
      const entries = await fs.promises.readdir(currentSource, { withFileTypes: true });

      for (const entry of entries) {
        const relativePath = relativeBase ? path.join(relativeBase, entry.name) : entry.name;
        const sourcePath = path.resolve(currentSource, entry.name);

        if (!sourcePath.startsWith(resolvedSource + path.sep) && sourcePath !== resolvedSource) {
          logger.warn(`Skipping path outside source directory: ${sourcePath}`);
          continue;
        }

        if (entry.isSymbolicLink()) {
          logger.warn(`Skipping symbolic link while copying Spec Kit assets: ${sourcePath}`);
          continue;
        }

        const validation = validateAndSanitizePath(relativePath);
        if (!validation.isValid || !validation.sanitizedPath) {
          logger.warn(`Skipping invalid path while copying Spec Kit assets: ${relativePath}`);
          continue;
        }

        const safeDestinationPath = createSafePath(resolvedDestination, validation.sanitizedPath);
        if (!safeDestinationPath) {
          logger.warn(`Unable to create safe destination path for: ${relativePath}`);
          continue;
        }

        if (entry.isDirectory()) {
          await fs.promises.mkdir(safeDestinationPath, { recursive: true });
          await processDirectory(sourcePath, validation.sanitizedPath);
        } else if (!fileFilter || fileFilter(validation.sanitizedPath, entry)) {
          const destinationDirname = path.dirname(safeDestinationPath);
          await fs.promises.mkdir(destinationDirname, { recursive: true });
          await fs.promises.copyFile(sourcePath, safeDestinationPath);
        }
      }
    };

    await processDirectory(resolvedSource, '');
  }

  private getGitRelativePaths(workspaceDir: string, pathsToAdd: string[]): string[] {
    const safePaths: string[] = [];

    for (const targetPath of pathsToAdd) {
      if (!targetPath) {
        continue;
      }

      const relativePath = path.relative(workspaceDir, targetPath);

      if (!relativePath || relativePath.startsWith('..')) {
        logger.warn(`Skipping path outside workspace for git commit: ${targetPath}`);
        continue;
      }

      safePaths.push(relativePath.replace(/\\/g, '/'));
    }

    return safePaths;
  }
}
