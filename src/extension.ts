import * as vscode from 'vscode';
import { SetupWizardProvider } from './providers/setupWizard';
import { ProjectIgnitionProvider } from './providers/projectIgnition';
import { ApiTesterProvider } from './testing/apiTesterProvider';
import { LLMManager } from './llm/llmManager';
import { VectorDB } from './db/vectorDB';
import { WorkflowManager } from './workflow/workflowManager';
import { GitManager } from './git/gitManager';

let llmManager: LLMManager;
let vectorDB: VectorDB;
let workflowManager: WorkflowManager;
let gitManager: GitManager;

export async function activate(context: vscode.ExtensionContext) {
  console.log('AstraForge IDE activated! Launching into the stratosphere...');

  // Initialize managers
  llmManager = new LLMManager();
  vectorDB = new VectorDB(context.extensionUri.fsPath);
  await vectorDB.init();
  gitManager = new GitManager();
  workflowManager = new WorkflowManager(llmManager, vectorDB, gitManager);

  // Register providers
  const setupWizard = new SetupWizardProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('astraforge.setupWizard', setupWizard)
  );

  const projectIgnition = new ProjectIgnitionProvider(context.extensionUri, workflowManager);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('astraforge.projectIgnition', projectIgnition)
  );

  const apiTester = new ApiTesterProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('astraforge.apiTester', apiTester)
  );

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('astraforge.setupPanel', async () => {
      await vscode.commands.executeCommand('workbench.action.focusSideBar');
      await vscode.commands.executeCommand('workbench.view.extension.astraforge-activitybar');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('astraforge.submitIdea', (idea: string) => {
      workflowManager.startWorkflow(idea);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('astraforge.proceedPhase', () => {
      workflowManager.proceedToNextPhase();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('astraforge.testAPIs', async () => {
      await vscode.commands.executeCommand('workbench.action.focusSideBar');
      await vscode.commands.executeCommand('workbench.view.extension.astraforge-activitybar');
    })
  );

  // Auto-init Git if workspace open
  if (vscode.workspace.workspaceFolders) {
    await gitManager.initRepo(vscode.workspace.workspaceFolders[0].uri.fsPath);
  }
}

export function deactivate() {
  vectorDB.close();
}