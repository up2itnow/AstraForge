"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowManager = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class WorkflowManager {
    constructor(llmManager, vectorDB, gitManager) {
        this.llmManager = llmManager;
        this.vectorDB = vectorDB;
        this.gitManager = gitManager;
        this.currentPhase = 0;
        this.phases = ['Planning', 'Prototyping', 'Testing', 'Deployment'];
        this.projectIdea = '';
        this.buildPlan = '';
    }
    async startWorkflow(idea, option) {
        this.projectIdea = idea;
        this.currentPhase = 0;
        try {
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
        try {
            // Generate code/test etc. via LLMs
            const phasePrompt = `Execute ${phase} for project: ${this.projectIdea}. Plan: ${this.buildPlan}`;
            const output = await this.llmManager.conference(phasePrompt);
            // Write output to file
            if (vscode.workspace.workspaceFolders) {
                const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
                const filePath = vscode.Uri.file(path.join(workspaceRoot, `${phase.toLowerCase()}.md`));
                await vscode.workspace.fs.writeFile(filePath, Buffer.from(output));
            }
            // Git commit
            await this.gitManager.commit(`Phase ${phase} complete`);
            // Review summary
            const summary = await this.llmManager.queryLLM(0, `Summarize ${phase}: ${output}`);
            vscode.window.showInformationMessage(summary);
            // Suggestions/innovations
            const suggestions = await this.llmManager.queryLLM(0, `Suggest improvements/innovations for ${phase}`);
            const userChoice = await vscode.window.showQuickPick(['Proceed', 'Apply Suggestions', 'Modify', 'Discuss'], { placeHolder: `Suggestions: ${suggestions}` });
            if (userChoice === 'Apply Suggestions') {
                const improvedOutput = await this.llmManager.conference(`Apply these suggestions: ${suggestions} to improve: ${output}`);
                if (vscode.workspace.workspaceFolders) {
                    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
                    const filePath = vscode.Uri.file(path.join(workspaceRoot, `${phase.toLowerCase()}_improved.md`));
                    await vscode.workspace.fs.writeFile(filePath, Buffer.from(improvedOutput));
                }
            }
            this.currentPhase++;
            if (this.currentPhase < this.phases.length) {
                vscode.window.showInformationMessage('Phase complete! Click "Acknowledge & Proceed".');
            }
            else {
                await this.completeProject();
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Phase ${phase} failed: ${error.message}`);
        }
    }
    proceedToNextPhase() {
        if (this.currentPhase < this.phases.length) {
            this.executePhase();
        }
    }
    async completeProject() {
        try {
            // Generate final report
            const report = await this.llmManager.queryLLM(0, `Generate final report for ${this.projectIdea}`);
            const bonuses = await this.llmManager.queryLLM(0, `Suggest 5 A+ enhancements`);
            vscode.window.showInformationMessage(`Project complete! Report: ${report.substring(0, 100)}... Enhancements: ${bonuses.substring(0, 100)}...`);
            // Save final report
            if (vscode.workspace.workspaceFolders) {
                const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
                const reportPath = vscode.Uri.file(path.join(workspaceRoot, 'final_report.md'));
                await vscode.workspace.fs.writeFile(reportPath, Buffer.from(`# Final Report\n\n${report}\n\n# Enhancement Suggestions\n\n${bonuses}`));
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Project completion failed: ${error.message}`);
        }
    }
}
exports.WorkflowManager = WorkflowManager;
//# sourceMappingURL=workflowManager.js.map