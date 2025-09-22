/**
 * AstraForge Workflow Manager
 *
 * Manages the complete software development workflow from idea to deployment.
 * Integrates LLM collaboration, vector-based context retrieval, Git version control,
 * and reinforcement learning for workflow optimization.
 *
 * @author AstraForge Team
 * @version 1.0.0
 */

import * as vscode from 'vscode';
import { LLMManager } from '../llm/llmManager';
import { VectorDB } from '../db/vectorDB';
import { GitManager } from '../git/gitManager';
import { AdaptiveWorkflowRL } from '../rl/adaptiveWorkflow';
import { CollaborationServer } from '../server/collaborationServer';
import { MetaLearningIntegration, createMetaLearningSystem } from '../meta-learning';
import { EmergentBehaviorSystem } from '../emergent-behavior';
import * as path from 'path';

/**
 * Metrics tracking for workflow performance and user engagement
 */
interface WorkflowMetrics {
  /** Timestamp when workflow started */
  startTime: number;
  /** Timestamp when current phase started */
  phaseStartTime: number;
  /** Number of errors encountered */
  errors: number;
  /** Array of user feedback scores (0-1) */
  userFeedback: number[];
  /** Number of iterations performed */
  iterations: number;
}

/**
 * Main workflow orchestrator that manages the complete development lifecycle
 *
 * Features:
 * - Phase-based development (Planning → Prototyping → Testing → Deployment)
 * - Multi-LLM collaboration and consensus voting
 * - Vector-based context retrieval for consistency
 * - Reinforcement learning for workflow optimization
 * - Real-time collaboration support
 * - Git integration for version control
 * - User oversight and feedback integration
 */
export class WorkflowManager {
  /** Current phase index in the workflow */
  private currentPhase = 0;

  /** Ordered list of workflow phases */
  private phases = ['Planning', 'Prototyping', 'Testing', 'Deployment'];

  /** User's project idea/description */
  private projectIdea: string = '';

  /** Generated project plan */
  private buildPlan: string = '';

  /** Reinforcement learning system for workflow optimization */
  private workflowRL: AdaptiveWorkflowRL;

  /** Optional collaboration server for multi-user workflows */
  private collaborationServer?: CollaborationServer;

  /** Performance and engagement metrics */
  private metrics: WorkflowMetrics;

  /** Unique identifier for this workspace session */
  private workspaceId: string;

  /** Meta-learning integration for recursive self-improvement */
  private metaLearning?: MetaLearningIntegration;

  /** Emergent behavior system for breakthrough detection */
  private emergentBehaviorSystem?: EmergentBehaviorSystem;

  /**
   * Initialize the WorkflowManager with required dependencies
   *
   * @param llmManager - Manager for LLM provider interactions
   * @param vectorDB - Vector database for context storage and retrieval
   * @param gitManager - Git integration for version control
   * @param emergentBehaviorSystem - System for emergent behavior detection
   */
  constructor(
    private llmManager: LLMManager,
    private vectorDB: VectorDB,
    private gitManager: GitManager,
    emergentBehaviorSystem?: EmergentBehaviorSystem
  ) {
    this.workflowRL = new AdaptiveWorkflowRL();
    this.workspaceId = `workspace_${Date.now()}`;
    this.emergentBehaviorSystem = emergentBehaviorSystem;
    this.metrics = {
      startTime: Date.now(),
      phaseStartTime: Date.now(),
      errors: 0,
      userFeedback: [],
      iterations: 0,
    };

    this.initializeCollaboration();
    this.initializeMetaLearning();
    this.initializeEmergentBehavior();
  }

  /**
   * Initialize emergent behavior system integration
   */
  private initializeEmergentBehavior(): void {
    if (this.emergentBehaviorSystem) {
      console.log('🧬 Emergent behavior system integrated with workflow manager');
    }
  }

  /**
   * Start a new development workflow from a project idea
   *
   * @param idea - The user's project description or idea
   * @param option - Optional workflow configuration or starting phase
   * @returns Promise that resolves when workflow initialization is complete
   *
   * @example
   * ```typescript
   * await workflowManager.startWorkflow(
   *   "Create a task management app with React and TypeScript"
   * );
   * ```
   */
  async startWorkflow(idea: string, option?: string): Promise<void> {
    this.projectIdea = idea;
    this.currentPhase = 0;

    try {
      // Get optimal strategy from meta-learning
      const optimalStrategy = this.metaLearning?.getOptimalStrategy(
        this.categorizeProjectType(idea),
        this.estimateComplexity(idea)
      );

      if (optimalStrategy) {
        console.log(`🧠 Using meta-learning optimized strategy: ${optimalStrategy.name}`);
        // Apply strategy configuration to LLM manager
        // This would configure agent count, rounds, etc.
      }

      // Enhance project idea with emergent behavior insights from vector context
      let enhancedIdea = idea;
      try {
        const contextualInsights = await this.vectorDB.getContextualInsights(idea, {
          domain: this.extractDomain(idea),
          complexity: this.estimateComplexity(idea),
          requiredInnovation: this.isInnovativeProject(idea),
          behaviorPatterns: this.identifyBehaviorPatterns(idea)
        });

        if (contextualInsights.insights.dominantBehaviorType !== 'unknown') {
          console.log(`🔍 Found contextual insights: ${contextualInsights.insights.dominantBehaviorType} pattern detected`);
          enhancedIdea = `${idea} (Context: ${contextualInsights.insights.dominantBehaviorType}, Innovation: ${Math.round(contextualInsights.insights.averageInnovationIndex * 100)}%)`;
        }
      } catch (error) {
        console.warn('Failed to get contextual insights:', error);
        // Continue with original idea if contextual enhancement fails
      }

      let prompt = enhancedIdea;
      if (option === 'letPanelDecide') {
        prompt = await this.llmManager.conference(`Refine this project idea: ${enhancedIdea}`);
      }

      // Step 2: Conferencing
      const discussion = await this.llmManager.conference(
        `Discuss project: ${prompt}. Propose tech stack, estimates, plan.`
      );

      this.buildPlan = await this.llmManager.voteOnDecision(discussion, [
        'Approve Plan',
        'Need Questions',
      ]);

      if (this.buildPlan === 'Need Questions') {
        const questions = await this.llmManager.queryLLM(
          0,
          `Generate 5-10 questions for clarification on ${prompt}`
        );
        const answers = await vscode.window.showInputBox({
          prompt: `Please answer these questions: ${questions}`,
        });
        if (answers) {
          this.buildPlan = await this.llmManager.conference(
            `Incorporate answers: ${answers}. Finalize plan.`
          );
        }
      }

      // Store in vector DB
      const embedding = await this.vectorDB.getEmbedding(this.buildPlan);
      await this.vectorDB.addEmbedding('buildPlan', embedding, { plan: this.buildPlan });

      vscode.window.showInformationMessage('Build Plan ready! Proceeding to phases.');
      await this.executePhase();
    } catch (error: any) {
      vscode.window.showErrorMessage(`Workflow failed: ${error.message}`);
    }
  }

  async executePhase() {
    const phase = this.phases[this.currentPhase];
    this.metrics.phaseStartTime = Date.now();

    try {
      // Get current workflow state for RL
      const currentState = this.getCurrentWorkflowState();

      // Get RL recommendation for next action
      const recommendedAction = this.workflowRL.getBestAction(currentState);

      // Apply RL action if not 'continue'
      if (recommendedAction.type !== 'continue') {
        const actionResult = await this.applyRLAction(recommendedAction, phase);
        if (actionResult.shouldReturn) {
          return;
        }
      }

      // Notify collaboration server about phase start
      this.collaborationServer?.broadcastToWorkspace(this.workspaceId, 'phase_started', {
        phase,
        timestamp: Date.now(),
        projectIdea: this.projectIdea,
      });

      // Enhanced context retrieval using vector DB
      const contextQuery = `${phase} for ${this.projectIdea}`;
      const contextEmbedding = await this.vectorDB.getEmbedding(contextQuery);
      const relevantContext = await this.vectorDB.queryEmbedding(contextEmbedding, 3);

      const contextText = relevantContext
        .map(item => item.metadata)
        .filter(meta => meta && typeof meta === 'object')
        .map(meta => meta.plan || meta.content || '')
        .join('\n');

      // Generate phase content with enhanced prompting
      const phasePrompt = this.buildEnhancedPrompt(phase, contextText);
      const output = await this.llmManager.conference(phasePrompt);

      // Process and validate output
      const processedOutput = await this.processPhaseOutput(output, phase);

      // Write output to file with better organization
      await this.writePhaseOutput(processedOutput, phase);

      // Git commit with detailed message
      await this.gitManager.commit(`Phase ${phase} complete - ${this.getPhaseMetrics()}`);

      // Enhanced review with multiple perspectives
      const review = await this.conductPhaseReview(processedOutput, phase);

      // Intelligent suggestions using context
      const suggestions = await this.generateIntelligentSuggestions(
        phase,
        processedOutput,
        contextText
      );

      // User interaction with better UX
      const userDecision = await this.getUserDecision(suggestions, review);
      const userFeedback = await this.processUserDecision(
        userDecision,
        suggestions,
        processedOutput,
        phase
      );

      // Update RL with feedback
      const newState = this.getCurrentWorkflowState();
      const reward = this.workflowRL.calculateReward(
        currentState,
        recommendedAction,
        newState,
        true, // Phase succeeded
        userFeedback
      );

      this.workflowRL.updateQValue(currentState, recommendedAction, reward, newState);

      // Store phase results in vector DB for future context
      await this.storePhaseContext(phase, processedOutput, review);

      this.metrics.iterations++;
      this.currentPhase++;

      if (this.currentPhase < this.phases.length) {
        vscode.window.showInformationMessage(
          `Phase ${phase} complete! Next: ${this.phases[this.currentPhase]}. Click "Acknowledge & Proceed".`
        );
      } else {
        await this.completeProject();
      }
    } catch (error: any) {
      await this.handlePhaseError(error, phase);
    }
  }

  proceedToNextPhase() {
    if (this.currentPhase < this.phases.length) {
      this.executePhase();
    }
  }

  // Supporting methods for enhanced workflow

  private async initializeCollaboration(): Promise<void> {
    try {
      // Use a random port between 3000-4000 to avoid conflicts in tests
      const port = process.env.NODE_ENV === 'test' ? 0 : 3001;
      this.collaborationServer = new CollaborationServer(port);
      await this.collaborationServer.start();
      console.log('Collaboration server initialized');
    } catch (error) {
      console.warn('Failed to start collaboration server:', error);
    }
  }

  private initializeMetaLearning(): void {
    try {
      const metaLearningComponents = createMetaLearningSystem();
      this.metaLearning = new MetaLearningIntegration(metaLearningComponents);
      console.log('🧠 Meta-learning system initialized');
    } catch (error) {
      console.warn('Failed to initialize meta-learning system:', error);
    }
  }

  private getCurrentWorkflowState(): any {
    const totalTime = Date.now() - this.metrics.startTime;

    return {
      currentPhase: this.phases[this.currentPhase],
      projectComplexity: this.estimateProjectComplexity(),
      userSatisfaction: this.calculateUserSatisfaction(),
      errorRate: this.metrics.errors / Math.max(1, this.metrics.iterations),
      timeSpent: Math.min(1, totalTime / (1000 * 60 * 60)), // Normalize to hours
    };
  }

  private estimateProjectComplexity(): number {
    // Simple heuristic based on project description and phases
    const ideaLength = this.projectIdea.length;
    const complexityKeywords = [
      'api',
      'database',
      'authentication',
      'real-time',
      'machine learning',
      'ai',
      'blockchain',
    ];
    const matches = complexityKeywords.filter(keyword =>
      this.projectIdea.toLowerCase().includes(keyword)
    ).length;

    return Math.min(1, (ideaLength / 500 + matches / complexityKeywords.length) / 2);
  }

  private calculateUserSatisfaction(): number {
    if (this.metrics.userFeedback.length === 0) return 0.7; // Default neutral
    return (
      this.metrics.userFeedback.reduce((sum, rating) => sum + rating, 0) /
      this.metrics.userFeedback.length
    );
  }

  private async applyRLAction(action: any, phase: string): Promise<{ shouldReturn: boolean }> {
    switch (action.type) {
      case 'skip':
        vscode.window.showInformationMessage(`RL suggests skipping ${phase} phase`);
        this.currentPhase++;
        return { shouldReturn: true };

      case 'repeat':
        vscode.window.showInformationMessage(`RL suggests repeating ${phase} phase`);
        // Phase will be re-executed
        return { shouldReturn: false };

      case 'optimize':
        vscode.window.showInformationMessage(`RL suggests optimizing ${phase} phase`);
        // Continue with optimization hints
        return { shouldReturn: false };

      default:
        return { shouldReturn: false };
    }
  }

  private buildEnhancedPrompt(phase: string, contextText: string): string {
    const basePrompt = `Execute ${phase} for project: ${this.projectIdea}. Plan: ${this.buildPlan}`;

    if (contextText) {
      return `${basePrompt}\n\nRelevant context from previous work:\n${contextText}\n\nPlease build upon this context and ensure consistency.`;
    }

    return basePrompt;
  }

  private async processPhaseOutput(output: string, phase: string): Promise<string> {
    // Add phase-specific processing
    let processed = output;

    // Add timestamp and phase info
    processed = `# ${phase} Phase Output\n\n*Generated: ${new Date().toISOString()}*\n\n${processed}`;

    // Validate output based on phase
    if (phase === 'Planning' && !processed.includes('architecture')) {
      processed +=
        '\n\n## Architecture Notes\n*Architecture details should be included in planning phase.*';
    }

    return processed;
  }

  private async writePhaseOutput(output: string, phase: string): Promise<void> {
    if (!vscode.workspace.workspaceFolders) return;

    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `${phase.toLowerCase()}_${timestamp}.md`;
    const filePath = vscode.Uri.file(path.join(workspaceRoot, 'astraforge_output', fileName));

    // Ensure directory exists
    const dirPath = path.join(workspaceRoot, 'astraforge_output');
    try {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath));
    } catch {
      // Directory might already exist
    }

    await vscode.workspace.fs.writeFile(filePath, Buffer.from(output));

    // Also update the latest version
    const latestPath = vscode.Uri.file(
      path.join(workspaceRoot, 'astraforge_output', `${phase.toLowerCase()}_latest.md`)
    );
    await vscode.workspace.fs.writeFile(latestPath, Buffer.from(output));
  }

  private getPhaseMetrics(): string {
    const phaseTime = Date.now() - this.metrics.phaseStartTime;
    return `Time: ${Math.round(phaseTime / 1000)}s, Iteration: ${this.metrics.iterations + 1}`;
  }

  private async conductPhaseReview(output: string, phase: string): Promise<string> {
    const reviewPrompt = `Review this ${phase} phase output for quality, completeness, and potential issues:\n\n${output}`;
    return await this.llmManager.conference(reviewPrompt);
  }

  private async generateIntelligentSuggestions(
    phase: string,
    output: string,
    contextText: string
  ): Promise<string> {
    const suggestionPrompt = `Based on the ${phase} output and context, suggest 3-5 specific improvements or innovations:\n\nOutput:\n${output}\n\nContext:\n${contextText}`;
    return await this.llmManager.queryLLM(0, suggestionPrompt);
  }

  private async getUserDecision(suggestions: string, review: string): Promise<string> {
    const options = [
      'Proceed as planned',
      'Apply suggestions',
      'Request modifications',
      'Get more details',
    ];

    const choice = await vscode.window.showQuickPick(options, {
      placeHolder: `Review: ${review.substring(0, 100)}... | Suggestions: ${suggestions.substring(0, 100)}...`,
      canPickMany: false,
    });

    return choice || 'Proceed as planned';
  }

  private async processUserDecision(
    decision: string,
    suggestions: string,
    output: string,
    phase: string
  ): Promise<number> {
    let feedback = 0.7; // Default neutral feedback

    switch (decision) {
      case 'Proceed as planned':
        feedback = 0.8;
        break;

      case 'Apply suggestions': {
        feedback = 0.9;
        const improvedOutput = await this.llmManager.conference(
          `Apply these suggestions: ${suggestions} to improve: ${output}`
        );
        await this.writePhaseOutput(improvedOutput, `${phase}_improved`);
        break;
      }

      case 'Request modifications': {
        feedback = 0.5;
        const modification = await vscode.window.showInputBox({
          prompt: 'What modifications would you like?',
        });
        if (modification) {
          const modifiedOutput = await this.llmManager.conference(
            `Apply these modifications: ${modification} to: ${output}`
          );
          await this.writePhaseOutput(modifiedOutput, `${phase}_modified`);
        }
        break;
      }

      case 'Get more details': {
        feedback = 0.6;
        const details = await this.llmManager.queryLLM(
          0,
          `Provide more detailed explanation for: ${output}`
        );
        vscode.window.showInformationMessage(`Details: ${details.substring(0, 200)}...`);
        break;
      }
    }

    this.metrics.userFeedback.push(feedback);
    return feedback;
  }

  private async storePhaseContext(phase: string, output: string, review: string): Promise<void> {
    const contextData = {
      phase,
      content: output,
      review,
      timestamp: Date.now(),
      projectIdea: this.projectIdea,
    };

    const embedding = await this.vectorDB.getEmbedding(
      `${phase} ${this.projectIdea} ${output.substring(0, 500)}`
    );
    await this.vectorDB.addEmbedding(`phase_${phase}_${Date.now()}`, embedding, contextData);
  }

  private async handlePhaseError(error: any, phase: string): Promise<void> {
    this.metrics.errors++;

    console.error(`Phase ${phase} error:`, error);

    const errorMessage = `Phase ${phase} encountered an error: ${error.message}`;
    const options = ['Retry phase', 'Skip phase', 'Abort workflow'];

    const choice = await vscode.window.showErrorMessage(errorMessage, ...options);

    switch (choice) {
      case 'Retry phase':
        await this.executePhase();
        break;

      case 'Skip phase':
        this.currentPhase++;
        if (this.currentPhase < this.phases.length) {
          await this.executePhase();
        } else {
          await this.completeProject();
        }
        break;

      case 'Abort workflow':
        vscode.window.showErrorMessage('Workflow aborted by user');
        break;
    }
  }

  private async completeProject() {
    try {
      // Generate comprehensive final report with metrics
      const totalTime = Date.now() - this.metrics.startTime;
      const rlStats = this.workflowRL.getStats();

      const report = await this.llmManager.queryLLM(
        0,
        `Generate a comprehensive final report for ${this.projectIdea}. Include project summary, key achievements, and lessons learned.`
      );

      const bonuses = await this.llmManager.queryLLM(
        0,
        `Suggest 5 innovative A+ enhancements for ${this.projectIdea}, considering cutting-edge technologies like AI, blockchain, and real-time collaboration.`
      );

      const finalReport = `# AstraForge Project Completion Report

## Project: ${this.projectIdea}

### Execution Metrics
- **Total Time**: ${Math.round(totalTime / 1000 / 60)} minutes
- **Phases Completed**: ${this.currentPhase} / ${this.phases.length}
- **Iterations**: ${this.metrics.iterations}
- **Errors Encountered**: ${this.metrics.errors}
- **Average User Satisfaction**: ${this.calculateUserSatisfaction().toFixed(2)}

### AI Learning Metrics
- **RL States Explored**: ${rlStats.totalStates}
- **Actions Learned**: ${rlStats.totalActions}
- **Current Exploration Rate**: ${rlStats.explorationRate.toFixed(3)}

## Project Report
${report}

## Enhancement Suggestions
${bonuses}

---
*Generated by AstraForge IDE - ${new Date().toISOString()}*
`;

      vscode.window.showInformationMessage(
        '🎉 Project Complete! Check the final report for details and enhancements.'
      );

      // Save comprehensive final report
      if (vscode.workspace.workspaceFolders) {
        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const reportPath = vscode.Uri.file(
          path.join(workspaceRoot, 'astraforge_output', 'FINAL_REPORT.md')
        );
        await vscode.workspace.fs.writeFile(reportPath, Buffer.from(finalReport));

        // Open the report
        const doc = await vscode.workspace.openTextDocument(reportPath);
        await vscode.window.showTextDocument(doc);
      }

      // Record project completion in meta-learning system
      const projectType = this.categorizeProjectType(this.projectIdea);
      const complexity = this.estimateComplexity(this.projectIdea);

      await this.metaLearning?.recordProjectAndAnalyze(
        `project_${Date.now()}`,
        projectType,
        complexity,
        this.extractTechnologies(this.projectIdea),
        1, // teamSize (could be enhanced to track actual team size)
        Math.round(totalTime / 1000 / 60), // duration in minutes
        this.metrics.errors === 0, // success
        this.calculateUserSatisfaction(), // aiCollaborationScore (using user satisfaction as proxy)
        this.calculateUserSatisfaction(), // userSatisfaction
        {
          phasesCompleted: this.currentPhase,
          iterations: this.metrics.iterations,
          errors: this.metrics.errors,
          rlStats,
          buildPlan: this.buildPlan
        }
      );

      // Notify collaboration server
      this.collaborationServer?.broadcastToWorkspace(this.workspaceId, 'project_completed', {
        projectIdea: this.projectIdea,
        metrics: this.metrics,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      vscode.window.showErrorMessage(`Project completion failed: ${error.message}`);
    }
  }

  // Meta-learning helper methods

  private categorizeProjectType(idea: string): string {
    return this.determineProjectType(idea.toLowerCase());
  }

  private determineProjectType(lowerIdea: string): string {
    const projectTypeMap: Record<string, string> = {
      'web': 'web',
      'website': 'web',
      'frontend': 'web',
      'mobile': 'mobile',
      'ios': 'mobile',
      'android': 'mobile',
      'backend': 'backend',
      'api': 'backend',
      'server': 'backend',
      'ai': 'ai',
      'machine learning': 'ai',
      'neural': 'ai',
      'blockchain': 'blockchain',
      'crypto': 'blockchain',
      'smart contract': 'blockchain',
      'game': 'game',
      'gaming': 'game',
      'unity': 'game',
      'desktop': 'desktop',
      'electron': 'desktop',
      'app': 'desktop'
    };

    for (const [keyword, type] of Object.entries(projectTypeMap)) {
      if (lowerIdea.includes(keyword)) {
        return type;
      }
    }

    return 'fullstack'; // Default
  }

  private estimateComplexity(idea: string): number {
    const lowerIdea = idea.toLowerCase();
    let complexity = 0.1; // Base complexity

    // Technology complexity factors
    const complexityKeywords = {
      high: ['machine learning', 'neural network', 'computer vision', 'natural language', 'blockchain', 'microservices', 'real-time', 'distributed', 'kubernetes', 'docker'],
      medium: ['authentication', 'database', 'payment', 'websocket', 'api', 'integration', 'testing'],
      low: ['static', 'simple', 'basic', 'crud', 'form']
    };

    for (const keyword of complexityKeywords.high) {
      if (lowerIdea.includes(keyword)) complexity += 0.2;
    }
    for (const keyword of complexityKeywords.medium) {
      if (lowerIdea.includes(keyword)) complexity += 0.1;
    }
    for (const keyword of complexityKeywords.low) {
      if (lowerIdea.includes(keyword)) complexity -= 0.05;
    }

    // Length-based complexity
    if (idea.length > 500) complexity += 0.1;
    if (idea.length > 1000) complexity += 0.1;

    // Technology stack complexity
    const techCount = this.extractTechnologies(idea).length;
    complexity += Math.min(techCount * 0.05, 0.2);

    return Math.min(complexity, 1.0); // Cap at 1.0
  }

  private extractTechnologies(idea: string): string[] {
    const lowerIdea = idea.toLowerCase();
    const technologies: string[] = [];

    const techMap: Record<string, string[]> = {
      'react': ['react', 'jsx', 'next.js', 'remix', 'vite'],
      'vue': ['vue', 'nuxt', 'vue.js'],
      'angular': ['angular', 'ng'],
      'nodejs': ['node', 'nodejs', 'express', 'fastify', 'koa'],
      'python': ['python', 'django', 'flask', 'fastapi'],
      'typescript': ['typescript', 'ts'],
      'javascript': ['javascript', 'js'],
      'database': ['mongodb', 'postgresql', 'mysql', 'redis', 'sqlite'],
      'cloud': ['aws', 'azure', 'gcp', 'vercel', 'netlify'],
      'mobile': ['react native', 'flutter', 'ios', 'android', 'swift', 'kotlin'],
      'blockchain': ['ethereum', 'solidity', 'web3', 'smart contract'],
      'ai': ['openai', 'gpt', 'claude', 'machine learning', 'tensorflow', 'pytorch']
    };

    for (const [tech, keywords] of Object.entries(techMap)) {
      if (keywords.some(keyword => lowerIdea.includes(keyword))) {
        technologies.push(tech);
      }
    }

    return technologies;
  }

  // Enhanced vector context helper methods
  private extractDomain(idea: string): string {
    return this.getDomainFromIdea(idea.toLowerCase());
  }

  private getDomainFromIdea(lowerIdea: string): string {
    const domainMap: Record<string, string> = {
      'web': 'Web Development',
      'frontend': 'Web Development',
      'react': 'Web Development',
      'mobile': 'Mobile Development',
      'ios': 'Mobile Development',
      'android': 'Mobile Development',
      'ai': 'AI/ML',
      'machine learning': 'AI/ML',
      'blockchain': 'Blockchain',
      'crypto': 'Blockchain',
      'game': 'Game Development',
      'gaming': 'Game Development',
      'data': 'Data Science',
      'database': 'Data Science'
    };

    for (const [keyword, domain] of Object.entries(domainMap)) {
      if (lowerIdea.includes(keyword)) {
        return domain;
      }
    }

    return 'General Development';
  }

  private isInnovativeProject(idea: string): boolean {
    const lowerIdea = idea.toLowerCase();
    const innovationKeywords = [
      'innovative', 'novel', 'creative', 'breakthrough', 'revolutionary',
      'unique', 'original', 'pioneering', 'groundbreaking', 'transformative',
      'cutting-edge', 'next-generation', 'disruptive'
    ];

    return innovationKeywords.some(keyword => lowerIdea.includes(keyword));
  }

  private identifyBehaviorPatterns(idea: string): string[] {
    return this.analyzeBehaviorPatterns(idea.toLowerCase());
  }

  private analyzeBehaviorPatterns(lowerIdea: string): string[] {
    const patterns: string[] = [];

    this.addPatternIfMatches(patterns, lowerIdea, ['collaborative', 'team', 'multi-user'], 'collaboration');
    this.addPatternIfMatches(patterns, lowerIdea, ['optimization', 'performance', 'efficient'], 'optimization');
    this.addPatternIfMatches(patterns, lowerIdea, ['adaptive', 'learning', 'intelligent'], 'adaptation');

    if (this.isInnovativeProject(lowerIdea)) {
      patterns.push('innovation');
    }

    return patterns.length > 0 ? patterns : ['collaboration']; // Default to collaboration
  }

  private addPatternIfMatches(patterns: string[], content: string, keywords: string[], patternName: string): void {
    if (keywords.some(keyword => content.includes(keyword))) {
      patterns.push(patternName);
    }
  }
}
