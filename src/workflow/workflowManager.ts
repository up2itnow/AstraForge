import * as vscode from 'vscode';
import { LLMManager } from '../llm/llmManager';
import { VectorDB } from '../db/vectorDB';
import { GitManager } from '../git/gitManager';
import * as path from 'path';

export class WorkflowManager {
  private currentPhase = 0;
  private phases = ['Planning', 'Prototyping', 'Testing', 'Deployment'];
  private projectIdea: string = '';
  private buildPlan: string = '';

  constructor(
    private llmManager: LLMManager,
    private vectorDB: VectorDB,
    private gitManager: GitManager
  ) {}

  async startWorkflow(idea: string, option?: string) {
    this.projectIdea = idea;
    this.currentPhase = 0;

    try {
      let prompt = idea;
      if (option === 'letPanelDecide') {
        prompt = await this.llmManager.conference(`Refine this project idea: ${idea}`);
      }

      // Step 2: Conferencing
      const discussion = await this.llmManager.conference(
        `Discuss project: ${prompt}. Propose tech stack, estimates, plan.`
      );
      
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
    } catch (error: any) {
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
      const userChoice = await vscode.window.showQuickPick(
        ['Proceed', 'Apply Suggestions', 'Modify', 'Discuss'],
        { placeHolder: `Suggestions: ${suggestions}` }
      );

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
      } else {
        await this.completeProject();
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Phase ${phase} failed: ${error.message}`);
    }
  }

  proceedToNextPhase() {
    if (this.currentPhase < this.phases.length) {
      this.executePhase();
    }
  }

  private async completeProject() {
    try {
      // Generate final report
      const report = await this.llmManager.queryLLM(0, `Generate final report for ${this.projectIdea}`);
      const bonuses = await this.llmManager.queryLLM(0, `Suggest 5 A+ enhancements`);
      
      vscode.window.showInformationMessage(
        `Project complete! Report: ${report.substring(0, 100)}... Enhancements: ${bonuses.substring(0, 100)}...`
      );

      // Save final report
      if (vscode.workspace.workspaceFolders) {
        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const reportPath = vscode.Uri.file(path.join(workspaceRoot, 'final_report.md'));
        await vscode.workspace.fs.writeFile(reportPath, Buffer.from(`# Final Report\n\n${report}\n\n# Enhancement Suggestions\n\n${bonuses}`));
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Project completion failed: ${error.message}`);
    }
  }
}