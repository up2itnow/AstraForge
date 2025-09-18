import * as vscode from 'vscode';
import { AdaptiveWorkflowRL } from '../rl/adaptiveWorkflow';
import { CollaborationServer } from '../server/collaborationServer';
import { SpecKitManager } from '../spec-kit/specKitManager';
import * as path from 'path';
export class WorkflowManager {
    constructor(llmManager, vectorDB, gitManager, testMode = false) {
        this.llmManager = llmManager;
        this.vectorDB = vectorDB;
        this.gitManager = gitManager;
        this.testMode = testMode;
        this.currentPhase = 0;
        this.phases = ['Specification', 'Planning', 'Tasks', 'Implementation', 'Deployment'];
        this.projectIdea = '';
        this.buildPlan = '';
        // These parameters are used throughout the class methods
        this.workflowRL = new AdaptiveWorkflowRL();
        this.workspaceId = `workspace_${Date.now()}`;
        this.metrics = {
            startTime: Date.now(),
            phaseStartTime: Date.now(),
            errors: 0,
            userFeedback: [],
            iterations: 0
        };
        this.specKitManager = new SpecKitManager(llmManager, vectorDB, gitManager);
        // Initialize vector database
        this.vectorDB.init();
        this.initializeCollaboration();
    }
    async executeSpecDrivenWorkflow(idea, option) {
        console.log('🌱 Starting spec-driven workflow for:', idea);
        // Phase 1: Create Specification
        this.currentPhase = 0; // Specification
        await this.updatePhaseProgress('Specification', 'Generating comprehensive specification...');
        const specRequest = {
            userIdea: idea,
            projectContext: option === 'letPanelDecide' ? 'Multi-LLM collaboration requested' : undefined,
            constraints: ['VS Code extension environment', 'TypeScript/Node.js stack']
        };
        const workflowId = await this.specKitManager.createSpecification(specRequest);
        this.currentSpecWorkflow = this.specKitManager.getWorkflow(workflowId);
        if (!this.currentSpecWorkflow) {
            throw new Error('Failed to create specification workflow');
        }
        // Phase 2: Create Implementation Plan
        this.currentPhase = 1; // Planning
        await this.updatePhaseProgress('Planning', 'Creating technical implementation plan...');
        await this.specKitManager.createImplementationPlan(workflowId);
        this.currentSpecWorkflow = this.specKitManager.getWorkflow(workflowId);
        // Phase 3: Generate Tasks
        this.currentPhase = 2; // Tasks
        await this.updatePhaseProgress('Tasks', 'Generating detailed task list...');
        await this.specKitManager.generateTasks(workflowId);
        this.currentSpecWorkflow = this.specKitManager.getWorkflow(workflowId);
        // Phase 4: Execute Implementation (integrate with existing workflow)
        this.currentPhase = 3; // Implementation
        await this.updatePhaseProgress('Implementation', 'Executing tasks following TDD principles...');
        if (this.currentSpecWorkflow && this.currentSpecWorkflow.tasks) {
            await this.executeSpecKitTasks(this.currentSpecWorkflow.tasks);
        }
        // Phase 5: Deployment (existing logic)
        this.currentPhase = 4; // Deployment
        await this.updatePhaseProgress('Deployment', 'Preparing for deployment...');
        console.log('✅ Spec-driven workflow completed successfully!');
    }
    async executeSpecKitTasks(taskList) {
        console.log('📋 Executing', taskList.tasks.length, 'tasks...');
        // Group tasks by phase for execution
        const tasksByPhase = new Map();
        taskList.tasks.forEach((task) => {
            const phase = task.phase || 'implementation';
            if (!tasksByPhase.has(phase)) {
                tasksByPhase.set(phase, []);
            }
            tasksByPhase.get(phase).push(task);
        });
        // Execute tasks in order: setup -> tests -> implementation -> integration -> polish
        const phaseOrder = ['setup', 'tests', 'implementation', 'integration', 'polish'];
        for (const phase of phaseOrder) {
            const phaseTasks = tasksByPhase.get(phase) || [];
            if (phaseTasks.length === 0)
                continue;
            console.log(`🔄 Executing ${phase} phase (${phaseTasks.length} tasks)...`);
            // Execute parallel tasks concurrently
            const parallelTasks = phaseTasks.filter(t => t.isParallel);
            const sequentialTasks = phaseTasks.filter(t => !t.isParallel);
            // Execute parallel tasks
            if (parallelTasks.length > 0) {
                await Promise.all(parallelTasks.map(task => this.executeTask(task)));
            }
            // Execute sequential tasks
            for (const task of sequentialTasks) {
                await this.executeTask(task);
            }
            console.log(`✅ ${phase} phase completed`);
        }
    }
    async executeTask(task) {
        console.log(`🔧 Executing task ${task.id}: ${task.description}`);
        try {
            // Use LLM to generate code/content for the task
            const prompt = `
      Execute this development task:
      
      Task: ${task.description}
      File: ${task.filePath}
      Type: ${task.type}
      
      Context: This is part of a spec-driven development workflow.
      ${task.type === 'test' ? 'Generate failing tests following TDD principles.' : ''}
      ${task.type === 'implementation' ? 'Implement code to make the tests pass.' : ''}
      
      Generate the appropriate code/content for this task.
      `;
            const result = await this.llmManager.generateResponse('openai', prompt);
            // Store the result in vector DB for context
            await this.vectorDB.addDocument(`task-${task.id}`, result, {
                taskId: task.id,
                taskType: task.type,
                filePath: task.filePath
            });
            console.log(`✅ Task ${task.id} completed`);
        }
        catch (error) {
            console.error(`❌ Task ${task.id} failed:`, error);
            this.metrics.errors++;
        }
    }
    async updatePhaseProgress(phaseName, description) {
        // Update metrics
        this.metrics.phaseStartTime = Date.now();
        this.metrics.iterations++;
        // Notify collaboration server
        if (this.collaborationServer) {
            this.collaborationServer.broadcastToWorkspace(this.workspaceId, 'progress', {
                phase: phaseName,
                description,
                progress: (this.currentPhase + 1) / this.phases.length * 100
            });
        }
        // Show progress to user
        vscode.window.showInformationMessage(`🚀 ${phaseName}: ${description}`);
    }
    async startWorkflow(idea, option) {
        this.projectIdea = idea;
        this.currentPhase = 0;
        try {
            // Initialize Spec Kit if not already done
            const workspaceDir = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (workspaceDir) {
                await this.specKitManager.initializeSpecKit(workspaceDir);
            }
            // Start with spec-driven approach (skip in test mode)
            if (!this.testMode) {
                await this.executeSpecDrivenWorkflow(idea, option);
            }
            let prompt = idea;
            if (option === 'letPanelDecide') {
                prompt = await this.llmManager.conference(`Refine this project idea: ${idea}`);
            }
            // Step 2: Conferencing
            const discussion = await this.llmManager.conference(`Discuss project: ${prompt}. Propose tech stack, estimates, plan.`);
            this.buildPlan = await this.llmManager.voteOnDecision(discussion, ['Approve Plan', 'Need Questions']);
            if (this.buildPlan === 'Need Questions') {
                const questions = await this.llmManager.queryLLM(0, `Generate 5-10 questions for clarification on ${prompt}`);
                const answers = await vscode.window.showInputBox({
                    prompt: `Please answer these questions: ${questions}`
                });
                if (answers) {
                    this.buildPlan = await this.llmManager.conference(`Incorporate answers: ${answers}. Finalize plan.`);
                }
            }
            // Store in vector DB
            const embedding = await this.vectorDB.getEmbedding(this.buildPlan);
            await this.vectorDB.addEmbedding('buildPlan', embedding, { plan: this.buildPlan });
            vscode.window.showInformationMessage('Build Plan ready! Proceeding to phases.');
            await this.executePhase();
        }
        catch (error) {
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
                projectIdea: this.projectIdea
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
            const suggestions = await this.generateIntelligentSuggestions(phase, processedOutput, contextText);
            // User interaction with better UX
            const userDecision = await this.getUserDecision(suggestions, review);
            const userFeedback = await this.processUserDecision(userDecision, suggestions, processedOutput, phase);
            // Update RL with feedback
            const newState = this.getCurrentWorkflowState();
            const reward = this.workflowRL.calculateReward(currentState, recommendedAction, newState, true, // Phase succeeded
            userFeedback);
            this.workflowRL.updateQValue(currentState, recommendedAction, reward, newState);
            // Store phase results in vector DB for future context
            await this.storePhaseContext(phase, processedOutput, review);
            this.metrics.iterations++;
            this.currentPhase++;
            if (this.currentPhase < this.phases.length) {
                vscode.window.showInformationMessage(`Phase ${phase} complete! Next: ${this.phases[this.currentPhase]}. Click "Acknowledge & Proceed".`);
            }
            else {
                await this.completeProject();
            }
        }
        catch (error) {
            await this.handlePhaseError(error, phase);
        }
    }
    proceedToNextPhase() {
        if (this.currentPhase < this.phases.length) {
            this.executePhase();
        }
    }
    // Supporting methods for enhanced workflow
    async initializeCollaboration() {
        try {
            if (this.testMode) {
                console.log('Collaboration server skipped in test mode');
                return;
            }
            // Use different port for testing to avoid conflicts
            const port = process.env.NODE_ENV === 'test' ? 3000 + Math.floor(Math.random() * 1000) : 3001;
            this.collaborationServer = new CollaborationServer(port);
            await this.collaborationServer.start();
            console.log(`Collaboration server initialized on port ${port}`);
        }
        catch (error) {
            console.warn('Failed to start collaboration server:', error);
            // Don't throw - collaboration server is optional
        }
    }
    getCurrentWorkflowState() {
        const totalTime = Date.now() - this.metrics.startTime;
        return {
            currentPhase: this.phases[this.currentPhase],
            projectComplexity: this.estimateProjectComplexity(),
            userSatisfaction: this.calculateUserSatisfaction(),
            errorRate: this.metrics.errors / Math.max(1, this.metrics.iterations),
            timeSpent: Math.min(1, totalTime / (1000 * 60 * 60)) // Normalize to hours
        };
    }
    estimateProjectComplexity() {
        // Simple heuristic based on project description and phases
        const ideaLength = this.projectIdea.length;
        const complexityKeywords = ['api', 'database', 'authentication', 'real-time', 'machine learning', 'ai', 'blockchain'];
        const matches = complexityKeywords.filter(keyword => this.projectIdea.toLowerCase().includes(keyword)).length;
        return Math.min(1, (ideaLength / 500 + matches / complexityKeywords.length) / 2);
    }
    calculateUserSatisfaction() {
        if (this.metrics.userFeedback.length === 0)
            return 0.7; // Default neutral
        return this.metrics.userFeedback.reduce((sum, rating) => sum + rating, 0) / this.metrics.userFeedback.length;
    }
    async applyRLAction(action, phase) {
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
    buildEnhancedPrompt(phase, contextText) {
        const basePrompt = `Execute ${phase} for project: ${this.projectIdea}. Plan: ${this.buildPlan}`;
        if (contextText) {
            return `${basePrompt}\n\nRelevant context from previous work:\n${contextText}\n\nPlease build upon this context and ensure consistency.`;
        }
        return basePrompt;
    }
    async processPhaseOutput(output, phase) {
        // Add phase-specific processing
        let processed = output;
        // Add timestamp and phase info
        processed = `# ${phase} Phase Output\n\n*Generated: ${new Date().toISOString()}*\n\n${processed}`;
        // Validate output based on phase
        if (phase === 'Planning' && !processed.includes('architecture')) {
            processed += '\n\n## Architecture Notes\n*Architecture details should be included in planning phase.*';
        }
        return processed;
    }
    async writePhaseOutput(output, phase) {
        if (!vscode.workspace.workspaceFolders)
            return;
        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const timestamp = new Date().toISOString().split('T')[0];
        const fileName = `${phase.toLowerCase()}_${timestamp}.md`;
        const filePath = vscode.Uri.file(path.join(workspaceRoot, 'astraforge_output', fileName));
        // Ensure directory exists
        const dirPath = path.join(workspaceRoot, 'astraforge_output');
        try {
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath));
        }
        catch {
            // Directory might already exist
        }
        await vscode.workspace.fs.writeFile(filePath, Buffer.from(output));
        // Also update the latest version
        const latestPath = vscode.Uri.file(path.join(workspaceRoot, 'astraforge_output', `${phase.toLowerCase()}_latest.md`));
        await vscode.workspace.fs.writeFile(latestPath, Buffer.from(output));
    }
    getPhaseMetrics() {
        const phaseTime = Date.now() - this.metrics.phaseStartTime;
        return `Time: ${Math.round(phaseTime / 1000)}s, Iteration: ${this.metrics.iterations + 1}`;
    }
    async conductPhaseReview(output, phase) {
        const reviewPrompt = `Review this ${phase} phase output for quality, completeness, and potential issues:\n\n${output}`;
        return await this.llmManager.conference(reviewPrompt);
    }
    async generateIntelligentSuggestions(phase, output, contextText) {
        const suggestionPrompt = `Based on the ${phase} output and context, suggest 3-5 specific improvements or innovations:\n\nOutput:\n${output}\n\nContext:\n${contextText}`;
        return await this.llmManager.queryLLM(0, suggestionPrompt);
    }
    async getUserDecision(suggestions, review) {
        const options = ['Proceed as planned', 'Apply suggestions', 'Request modifications', 'Get more details'];
        const choice = await vscode.window.showQuickPick(options, {
            placeHolder: `Review: ${review.substring(0, 100)}... | Suggestions: ${suggestions.substring(0, 100)}...`,
            canPickMany: false
        });
        return choice || 'Proceed as planned';
    }
    async processUserDecision(decision, suggestions, output, phase) {
        let feedback = 0.7; // Default neutral feedback
        switch (decision) {
            case 'Proceed as planned':
                feedback = 0.8;
                break;
            case 'Apply suggestions': {
                feedback = 0.9;
                const improvedOutput = await this.llmManager.conference(`Apply these suggestions: ${suggestions} to improve: ${output}`);
                await this.writePhaseOutput(improvedOutput, `${phase}_improved`);
                break;
            }
            case 'Request modifications': {
                feedback = 0.5;
                const modification = await vscode.window.showInputBox({
                    prompt: 'What modifications would you like?'
                });
                if (modification) {
                    const modifiedOutput = await this.llmManager.conference(`Apply these modifications: ${modification} to: ${output}`);
                    await this.writePhaseOutput(modifiedOutput, `${phase}_modified`);
                }
                break;
            }
            case 'Get more details': {
                feedback = 0.6;
                const details = await this.llmManager.queryLLM(0, `Provide more detailed explanation for: ${output}`);
                vscode.window.showInformationMessage(`Details: ${details.substring(0, 200)}...`);
                break;
            }
        }
        this.metrics.userFeedback.push(feedback);
        return feedback;
    }
    async storePhaseContext(phase, output, review) {
        const contextData = {
            phase,
            content: output,
            review,
            timestamp: Date.now(),
            projectIdea: this.projectIdea
        };
        const embedding = await this.vectorDB.getEmbedding(`${phase} ${this.projectIdea} ${output.substring(0, 500)}`);
        await this.vectorDB.addEmbedding(`phase_${phase}_${Date.now()}`, embedding, contextData);
    }
    async handlePhaseError(error, phase) {
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
                }
                else {
                    await this.completeProject();
                }
                break;
            case 'Abort workflow':
                vscode.window.showErrorMessage('Workflow aborted by user');
                break;
        }
    }
    async completeProject() {
        try {
            // Generate comprehensive final report with metrics
            const totalTime = Date.now() - this.metrics.startTime;
            const rlStats = this.workflowRL.getStats();
            const report = await this.llmManager.queryLLM(0, `Generate a comprehensive final report for ${this.projectIdea}. Include project summary, key achievements, and lessons learned.`);
            const bonuses = await this.llmManager.queryLLM(0, `Suggest 5 innovative A+ enhancements for ${this.projectIdea}, considering cutting-edge technologies like AI, blockchain, and real-time collaboration.`);
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
            vscode.window.showInformationMessage('🎉 Project Complete! Check the final report for details and enhancements.');
            // Save comprehensive final report
            if (vscode.workspace.workspaceFolders) {
                const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
                const reportPath = vscode.Uri.file(path.join(workspaceRoot, 'astraforge_output', 'FINAL_REPORT.md'));
                await vscode.workspace.fs.writeFile(reportPath, Buffer.from(finalReport));
                // Open the report
                const doc = await vscode.workspace.openTextDocument(reportPath);
                await vscode.window.showTextDocument(doc);
            }
            // Notify collaboration server
            this.collaborationServer?.broadcastToWorkspace(this.workspaceId, 'project_completed', {
                projectIdea: this.projectIdea,
                metrics: this.metrics,
                timestamp: Date.now()
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Project completion failed: ${error.message}`);
        }
    }
}
//# sourceMappingURL=workflowManager.js.map