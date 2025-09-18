import { LLMManager } from '../llm/llmManager';
import { VectorDB } from '../db/vectorDB';
import { logger } from '../utils/logger';
import { TechnicalPlan } from './planGenerator';
import * as fs from 'fs';
import * as path from 'path';

export interface TaskList {
  tasks: Task[];
  dependencies: TaskDependency[];
  parallelGroups: ParallelGroup[];
  estimatedDuration: string;
  content: string;
}

export interface Task {
  id: string;
  phase: string;
  description: string;
  filePath: string;
  isParallel: boolean;
  prerequisites: string[];
  estimatedTime: string;
  type: 'setup' | 'test' | 'implementation' | 'integration' | 'polish';
  priority: 'high' | 'medium' | 'low';
}

export interface TaskDependency {
  taskId: string;
  dependsOn: string[];
  reason: string;
}

export interface ParallelGroup {
  groupId: string;
  tasks: string[];
  description: string;
}

export class TaskGenerator {
  private llmManager: LLMManager;
  private vectorDB: VectorDB;
  private taskTemplate: string = '';

  constructor(llmManager: LLMManager, vectorDB: VectorDB) {
    this.llmManager = llmManager;
    this.vectorDB = vectorDB;
    this.loadTaskTemplate();
  }

  private loadTaskTemplate(): void {
    const templatePath = path.join(__dirname, '../../templates/tasks-template.md');
    try {
      this.taskTemplate = fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
      console.error('Failed to load task template:', error);
      this.taskTemplate = this.getDefaultTaskTemplate();
    }
  }

  private getDefaultTaskTemplate(): string {
    return `# Tasks: {{FEATURE_NAME}}

**Input**: Design documents from \`/specs/{{FEATURE_DIR}}/\`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Phase 3.1: Setup
{{SETUP_TASKS}}

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
{{TEST_TASKS}}

## Phase 3.3: Core Implementation (ONLY after tests are failing)
{{IMPLEMENTATION_TASKS}}

## Phase 3.4: Integration
{{INTEGRATION_TASKS}}

## Phase 3.5: Polish
{{POLISH_TASKS}}

## Dependencies
{{DEPENDENCIES}}

## Parallel Execution Groups
{{PARALLEL_GROUPS}}

## Task Validation
{{VALIDATION_CHECKLIST}}
`;
  }

  public async generateTasks(plan: TechnicalPlan): Promise<TaskList> {
    logger.info('Generating task list from implementation plan...');

    // Generate tasks by phase
    const setupTasks = await this.generateSetupTasks(plan);
    const testTasks = await this.generateTestTasks(plan);
    const implementationTasks = await this.generateImplementationTasks(plan);
    const integrationTasks = await this.generateIntegrationTasks(plan);
    const polishTasks = await this.generatePolishTasks(plan);

    // Combine all tasks
    const allTasks = [
      ...setupTasks,
      ...testTasks,
      ...implementationTasks,
      ...integrationTasks,
      ...polishTasks
    ];

    // Generate dependencies
    const dependencies = await this.generateDependencies(allTasks, plan);

    // Identify parallel groups
    const parallelGroups = await this.identifyParallelGroups(allTasks, dependencies);

    // Estimate duration
    const estimatedDuration = this.estimateDuration(allTasks);

    // Assemble task list content
    const content = this.assembleTaskList({
      tasks: allTasks,
      dependencies,
      parallelGroups,
      plan
    });

    return {
      tasks: allTasks,
      dependencies,
      parallelGroups,
      estimatedDuration,
      content
    };
  }

  private async generateSetupTasks(plan: TechnicalPlan): Promise<Task[]> {
    logger.info('Generating setup tasks...');
    const prompt = `
    Generate setup tasks for this technical plan:
    
    Technical Context: ${JSON.stringify(plan.technicalContext, null, 2)}
    Project Structure: ${JSON.stringify(plan.projectStructure, null, 2)}
    
    Generate 3-5 setup tasks covering:
    1. Project structure creation
    2. Dependency installation
    3. Configuration setup
    4. Development environment
    5. Initial tooling
    
    Each task should specify:
    - Exact file paths
    - Clear descriptions
    - Parallel execution potential
    
    Return JSON array of task objects.
    `;

    try {
      const response = await this.llmManager.generateResponse('openai', prompt);
      const tasks = JSON.parse(response);
      
      return tasks.map((task: any, index: number) => ({
        id: `T${String(index + 1).padStart(3, '0')}`,
        phase: 'setup',
        description: task.description,
        filePath: task.filePath || 'multiple',
        isParallel: task.isParallel || false,
        prerequisites: task.prerequisites || [],
        estimatedTime: task.estimatedTime || '15-30 min',
        type: 'setup' as const,
        priority: 'high' as const
      }));
    } catch (error) {
      console.error('Error generating setup tasks:', error);
      return [
        {
          id: 'T001',
          phase: 'setup',
          description: 'Create project structure per implementation plan',
          filePath: 'multiple',
          isParallel: false,
          prerequisites: [],
          estimatedTime: '15 min',
          type: 'setup',
          priority: 'high'
        },
        {
          id: 'T002',
          phase: 'setup',
          description: `Initialize ${plan.technicalContext.language} project with dependencies`,
          filePath: 'package.json',
          isParallel: false,
          prerequisites: ['T001'],
          estimatedTime: '10 min',
          type: 'setup',
          priority: 'high'
        }
      ];
    }
  }

  private async generateTestTasks(plan: TechnicalPlan): Promise<Task[]> {
    const prompt = `
    Generate test tasks following TDD principles for this plan:
    
    Design Phase: ${JSON.stringify(plan.designPhase, null, 2)}
    Technical Context: ${JSON.stringify(plan.technicalContext, null, 2)}
    
    Generate test tasks covering:
    1. Contract tests (one per API endpoint)
    2. Integration tests (one per user scenario)
    3. Unit tests (for core logic)
    
    Requirements:
    - Tests MUST be written before implementation
    - Each test should target a specific file
    - Mark parallel tasks appropriately
    - Include exact file paths
    
    Return JSON array of test task objects.
    `;

    try {
      const response = await this.llmManager.generateResponse('anthropic', prompt);
      const tasks = JSON.parse(response);
      
      return tasks.map((task: any, index: number) => ({
        id: `T${String(index + 10).padStart(3, '0')}`,
        phase: 'tests',
        description: task.description,
        filePath: task.filePath,
        isParallel: task.isParallel || true,
        prerequisites: task.prerequisites || [],
        estimatedTime: task.estimatedTime || '20-30 min',
        type: 'test' as const,
        priority: 'high' as const
      }));
    } catch (error) {
      console.error('Error generating test tasks:', error);
      return [
        {
          id: 'T010',
          phase: 'tests',
          description: 'Create contract tests for API endpoints',
          filePath: 'tests/contract/api.test.ts',
          isParallel: true,
          prerequisites: ['T002'],
          estimatedTime: '30 min',
          type: 'test',
          priority: 'high'
        }
      ];
    }
  }

  private async generateImplementationTasks(plan: TechnicalPlan): Promise<Task[]> {
    const prompt = `
    Generate implementation tasks for this plan:
    
    Design Phase: ${JSON.stringify(plan.designPhase, null, 2)}
    Technical Context: ${JSON.stringify(plan.technicalContext, null, 2)}
    Constitution Check: ${JSON.stringify(plan.constitutionCheck, null, 2)}
    
    Generate implementation tasks covering:
    1. Data models/entities
    2. Service layer
    3. API endpoints
    4. Business logic
    5. CLI commands (if applicable)
    
    Requirements:
    - Implementation ONLY after tests are written
    - Each task targets specific files
    - Follow constitutional principles
    - Mark parallel opportunities
    
    Return JSON array of implementation task objects.
    `;

    try {
      const response = await this.llmManager.generateResponse('openai', prompt);
      const tasks = JSON.parse(response);
      
      return tasks.map((task: any, index: number) => ({
        id: `T${String(index + 20).padStart(3, '0')}`,
        phase: 'implementation',
        description: task.description,
        filePath: task.filePath,
        isParallel: task.isParallel || false,
        prerequisites: task.prerequisites || [],
        estimatedTime: task.estimatedTime || '30-45 min',
        type: 'implementation' as const,
        priority: 'medium' as const
      }));
    } catch (error) {
      console.error('Error generating implementation tasks:', error);
      return [
        {
          id: 'T020',
          phase: 'implementation',
          description: 'Implement core data models',
          filePath: 'src/models/index.ts',
          isParallel: true,
          prerequisites: ['T010'],
          estimatedTime: '45 min',
          type: 'implementation',
          priority: 'medium'
        }
      ];
    }
  }

  private async generateIntegrationTasks(plan: TechnicalPlan): Promise<Task[]> {
    const prompt = `
    Generate integration tasks for this plan:
    
    Technical Context: ${JSON.stringify(plan.technicalContext, null, 2)}
    Project Structure: ${JSON.stringify(plan.projectStructure, null, 2)}
    
    Generate integration tasks covering:
    1. Database/storage integration
    2. External service connections
    3. Middleware setup
    4. Error handling
    5. Logging and monitoring
    
    Return JSON array of integration task objects.
    `;

    try {
      const response = await this.llmManager.generateResponse('anthropic', prompt);
      const tasks = JSON.parse(response);
      
      return tasks.map((task: any, index: number) => ({
        id: `T${String(index + 30).padStart(3, '0')}`,
        phase: 'integration',
        description: task.description,
        filePath: task.filePath,
        isParallel: task.isParallel || false,
        prerequisites: task.prerequisites || [],
        estimatedTime: task.estimatedTime || '20-40 min',
        type: 'integration' as const,
        priority: 'medium' as const
      }));
    } catch (error) {
      console.error('Error generating integration tasks:', error);
      return [
        {
          id: 'T030',
          phase: 'integration',
          description: 'Setup error handling and logging',
          filePath: 'src/utils/errorHandler.ts',
          isParallel: true,
          prerequisites: ['T020'],
          estimatedTime: '30 min',
          type: 'integration',
          priority: 'medium'
        }
      ];
    }
  }

  private async generatePolishTasks(plan: TechnicalPlan): Promise<Task[]> {
    const prompt = `
    Generate polish/finalization tasks for this plan:
    
    Technical Context: ${JSON.stringify(plan.technicalContext, null, 2)}
    Constitution Check: ${JSON.stringify(plan.constitutionCheck, null, 2)}
    
    Generate polish tasks covering:
    1. Performance optimization
    2. Code cleanup and refactoring
    3. Documentation updates
    4. Final testing
    5. Deployment preparation
    
    Return JSON array of polish task objects.
    `;

    try {
      const response = await this.llmManager.generateResponse('openai', prompt);
      const tasks = JSON.parse(response);
      
      return tasks.map((task: any, index: number) => ({
        id: `T${String(index + 40).padStart(3, '0')}`,
        phase: 'polish',
        description: task.description,
        filePath: task.filePath,
        isParallel: task.isParallel || true,
        prerequisites: task.prerequisites || [],
        estimatedTime: task.estimatedTime || '15-25 min',
        type: 'polish' as const,
        priority: 'low' as const
      }));
    } catch (error) {
      console.error('Error generating polish tasks:', error);
      return [
        {
          id: 'T040',
          phase: 'polish',
          description: 'Performance optimization and cleanup',
          filePath: 'multiple',
          isParallel: true,
          prerequisites: ['T030'],
          estimatedTime: '20 min',
          type: 'polish',
          priority: 'low'
        }
      ];
    }
  }

  private async generateDependencies(tasks: Task[], plan: TechnicalPlan): Promise<TaskDependency[]> {
    const prompt = `
    Analyze these tasks and generate dependencies:
    
    Tasks: ${JSON.stringify(tasks.map(t => ({ id: t.id, description: t.description, filePath: t.filePath, type: t.type })), null, 2)}
    
    Identify dependencies based on:
    1. File dependencies (same file can't be modified in parallel)
    2. Logical dependencies (tests before implementation)
    3. Build dependencies (setup before coding)
    4. Integration dependencies (models before services)
    
    Return JSON array of dependency objects with taskId, dependsOn array, and reason.
    `;

    try {
      const response = await this.llmManager.generateResponse('anthropic', prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Error generating dependencies:', error);
      // Generate basic dependencies based on task types
      return this.generateBasicDependencies(tasks);
    }
  }

  private generateBasicDependencies(tasks: Task[]): TaskDependency[] {
    const dependencies: TaskDependency[] = [];
    
    // Setup tasks come first
    const setupTasks = tasks.filter(t => t.type === 'setup');
    const testTasks = tasks.filter(t => t.type === 'test');
    const implementationTasks = tasks.filter(t => t.type === 'implementation');
    const integrationTasks = tasks.filter(t => t.type === 'integration');
    const polishTasks = tasks.filter(t => t.type === 'polish');
    
    // Tests depend on setup
    testTasks.forEach(task => {
      if (setupTasks.length > 0) {
        dependencies.push({
          taskId: task.id,
          dependsOn: [setupTasks[setupTasks.length - 1].id],
          reason: 'Tests require project setup'
        });
      }
    });
    
    // Implementation depends on tests
    implementationTasks.forEach(task => {
      const relatedTestTask = testTasks.find(t => 
        t.filePath.includes(task.filePath.split('/').pop()?.split('.')[0] || '')
      );
      if (relatedTestTask) {
        dependencies.push({
          taskId: task.id,
          dependsOn: [relatedTestTask.id],
          reason: 'TDD: Implementation after tests'
        });
      }
    });
    
    // Integration depends on implementation
    integrationTasks.forEach(task => {
      if (implementationTasks.length > 0) {
        dependencies.push({
          taskId: task.id,
          dependsOn: [implementationTasks[0].id],
          reason: 'Integration requires core implementation'
        });
      }
    });
    
    // Polish depends on integration
    polishTasks.forEach(task => {
      if (integrationTasks.length > 0) {
        dependencies.push({
          taskId: task.id,
          dependsOn: [integrationTasks[integrationTasks.length - 1].id],
          reason: 'Polish after integration complete'
        });
      }
    });
    
    return dependencies;
  }

  private async identifyParallelGroups(tasks: Task[], dependencies: TaskDependency[]): Promise<ParallelGroup[]> {
    const groups: ParallelGroup[] = [];
    const parallelTasks = tasks.filter(t => t.isParallel);
    
    // Group by phase and file independence
    const phases = ['setup', 'tests', 'implementation', 'integration', 'polish'];
    
    phases.forEach(phase => {
      const phaseTasks = parallelTasks.filter(t => t.phase === phase);
      if (phaseTasks.length > 1) {
        // Check if tasks can truly run in parallel (no file conflicts)
        const independentTasks = this.findIndependentTasks(phaseTasks, dependencies);
        if (independentTasks.length > 1) {
          groups.push({
            groupId: `PG_${phase.toUpperCase()}`,
            tasks: independentTasks.map(t => t.id),
            description: `Parallel ${phase} tasks - independent files`
          });
        }
      }
    });
    
    return groups;
  }

  private findIndependentTasks(tasks: Task[], dependencies: TaskDependency[]): Task[] {
    // Find tasks that don't modify the same files and have no dependencies between them
    const independent: Task[] = [];
    const fileMap = new Map<string, Task[]>();
    
    // Group by file path
    tasks.forEach(task => {
      const file = task.filePath;
      if (!fileMap.has(file)) {
        fileMap.set(file, []);
      }
      fileMap.get(file)!.push(task);
    });
    
    // Only include files with single tasks (no conflicts)
    fileMap.forEach(fileTasks => {
      if (fileTasks.length === 1) {
        const task = fileTasks[0];
        // Check if this task has dependencies on other tasks in the same phase
        const hasPhaseDependency = dependencies.some(dep => 
          dep.taskId === task.id && 
          tasks.some(t => t.id === dep.dependsOn[0] && t.phase === task.phase)
        );
        
        if (!hasPhaseDependency) {
          independent.push(task);
        }
      }
    });
    
    return independent;
  }

  private estimateDuration(tasks: Task[]): string {
    const totalMinutes = tasks.reduce((sum, task) => {
      const timeRange = task.estimatedTime.match(/(\d+)(?:-(\d+))?\s*min/);
      if (timeRange) {
        const min = parseInt(timeRange[1]);
        const max = timeRange[2] ? parseInt(timeRange[2]) : min;
        return sum + (min + max) / 2;
      }
      return sum + 30; // Default 30 minutes
    }, 0);
    
    const hours = Math.round(totalMinutes / 60 * 10) / 10;
    const days = Math.round(hours / 8 * 10) / 10;
    
    return `${hours} hours (${days} days at 8h/day)`;
  }

  private assembleTaskList(data: any): string {
    let content = this.taskTemplate;
    
    const featureName = data.plan.summary.split(' ')[1] || 'Feature';
    const featureDir = `001-${featureName.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Replace template variables
    content = content.replace(/\{\{FEATURE_NAME\}\}/g, featureName);
    content = content.replace(/\{\{FEATURE_DIR\}\}/g, featureDir);
    
    // Format task sections
    const setupSection = this.formatTaskSection(data.tasks.filter((t: Task) => t.type === 'setup'));
    const testSection = this.formatTaskSection(data.tasks.filter((t: Task) => t.type === 'test'));
    const implementationSection = this.formatTaskSection(data.tasks.filter((t: Task) => t.type === 'implementation'));
    const integrationSection = this.formatTaskSection(data.tasks.filter((t: Task) => t.type === 'integration'));
    const polishSection = this.formatTaskSection(data.tasks.filter((t: Task) => t.type === 'polish'));
    
    content = content.replace('{{SETUP_TASKS}}', setupSection);
    content = content.replace('{{TEST_TASKS}}', testSection);
    content = content.replace('{{IMPLEMENTATION_TASKS}}', implementationSection);
    content = content.replace('{{INTEGRATION_TASKS}}', integrationSection);
    content = content.replace('{{POLISH_TASKS}}', polishSection);
    
    // Format dependencies
    const dependencySection = this.formatDependencies(data.dependencies);
    content = content.replace('{{DEPENDENCIES}}', dependencySection);
    
    // Format parallel groups
    const parallelSection = this.formatParallelGroups(data.parallelGroups);
    content = content.replace('{{PARALLEL_GROUPS}}', parallelSection);
    
    // Format validation checklist
    const validationSection = this.formatValidationChecklist(data.tasks);
    content = content.replace('{{VALIDATION_CHECKLIST}}', validationSection);
    
    return content;
  }

  private formatTaskSection(tasks: Task[]): string {
    return tasks.map(task => {
      const parallel = task.isParallel ? '[P] ' : '';
      const prerequisites = task.prerequisites.length > 0 ? ` (after ${task.prerequisites.join(', ')})` : '';
      return `- [ ] ${task.id} ${parallel}${task.description} in ${task.filePath}${prerequisites}`;
    }).join('\n');
  }

  private formatDependencies(dependencies: TaskDependency[]): string {
    if (dependencies.length === 0) {
      return 'No explicit dependencies - follow phase order';
    }
    
    return dependencies.map(dep => {
      return `- ${dep.taskId} depends on ${dep.dependsOn.join(', ')}: ${dep.reason}`;
    }).join('\n');
  }

  private formatParallelGroups(groups: ParallelGroup[]): string {
    if (groups.length === 0) {
      return 'No parallel execution groups identified';
    }
    
    return groups.map(group => {
      return `**${group.groupId}**: ${group.description}\n` +
             `Tasks: ${group.tasks.join(', ')}\n`;
    }).join('\n');
  }

  private formatValidationChecklist(tasks: Task[]): string {
    const contractTests = tasks.filter(t => t.type === 'test' && t.description.includes('contract'));
    const entities = tasks.filter(t => t.type === 'implementation' && t.description.includes('model'));
    const testsFirst = tasks.filter(t => t.type === 'test').length > 0;
    
    return `- [ ] All contracts have corresponding tests (${contractTests.length} found)
- [ ] All entities have model tasks (${entities.length} found)  
- [ ] All tests come before implementation (${testsFirst ? 'Yes' : 'No'})
- [ ] Parallel tasks truly independent
- [ ] Each task specifies exact file path
- [ ] No task modifies same file as another [P] task`;
  }

  public async validateTasks(taskList: TaskList): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    // Check TDD compliance
    const testTasks = taskList.tasks.filter(t => t.type === 'test');
    const implementationTasks = taskList.tasks.filter(t => t.type === 'implementation');
    
    if (testTasks.length === 0) {
      issues.push('No test tasks found - TDD requires tests first');
    }
    
    // Check parallel task file conflicts
    const parallelTasks = taskList.tasks.filter(t => t.isParallel);
    const fileGroups = new Map<string, Task[]>();
    
    parallelTasks.forEach(task => {
      const file = task.filePath;
      if (!fileGroups.has(file)) {
        fileGroups.set(file, []);
      }
      fileGroups.get(file)!.push(task);
    });
    
    fileGroups.forEach((tasks, file) => {
      if (tasks.length > 1) {
        issues.push(`File conflict: ${file} modified by parallel tasks ${tasks.map(t => t.id).join(', ')}`);
      }
    });
    
    // Check dependency cycles
    const cycles = this.detectDependencyCycles(taskList.dependencies);
    if (cycles.length > 0) {
      issues.push(`Dependency cycles detected: ${cycles.join(', ')}`);
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }

  private detectDependencyCycles(dependencies: TaskDependency[]): string[] {
    const graph = new Map<string, string[]>();
    const cycles: string[] = [];
    
    // Build adjacency list
    dependencies.forEach(dep => {
      dep.dependsOn.forEach(prereq => {
        if (!graph.has(prereq)) {
          graph.set(prereq, []);
        }
        graph.get(prereq)!.push(dep.taskId);
      });
    });
    
    // Simple cycle detection (would need more sophisticated algorithm for complex cases)
    graph.forEach((dependents, task) => {
      dependents.forEach(dependent => {
        if (graph.has(dependent) && graph.get(dependent)!.includes(task)) {
          cycles.push(`${task} ↔ ${dependent}`);
        }
      });
    });
    
    return cycles;
  }
}
