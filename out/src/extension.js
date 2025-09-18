import * as vscode from 'vscode';
import { SetupWizardProvider } from './providers/setupWizard';
import { ProjectIgnitionProvider } from './providers/projectIgnition';
import { ApiTesterProvider } from './testing/apiTesterProvider';
import { LLMManager } from './llm/llmManager';
import { VectorDB } from './db/vectorDB';
import { WorkflowManager } from './workflow/workflowManager';
import { GitManager } from './git/gitManager';
let llmManager;
let vectorDB;
let workflowManager;
let gitManager;
export async function activate(context) {
    console.log('AstraForge IDE activated! Launching into the stratosphere...');
    // Initialize managers
    llmManager = new LLMManager();
    vectorDB = new VectorDB(context.extensionUri.fsPath);
    await vectorDB.init();
    gitManager = new GitManager();
    workflowManager = new WorkflowManager(llmManager, vectorDB, gitManager);
    // Register providers
    const setupWizard = new SetupWizardProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('astraforge.setupWizard', setupWizard));
    const projectIgnition = new ProjectIgnitionProvider(context.extensionUri, workflowManager);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('astraforge.projectIgnition', projectIgnition));
    const apiTester = new ApiTesterProvider(context.extensionUri, context);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('astraforge.apiTester', apiTester));
    // Commands
    context.subscriptions.push(vscode.commands.registerCommand('astraforge.setupPanel', async () => {
        await vscode.commands.executeCommand('workbench.action.focusSideBar');
        await vscode.commands.executeCommand('workbench.view.extension.astraforge-activitybar');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('astraforge.submitIdea', (idea) => {
        workflowManager.startWorkflow(idea);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('astraforge.proceedPhase', () => {
        workflowManager.proceedToNextPhase();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('astraforge.testAPIs', async () => {
        await vscode.commands.executeCommand('workbench.action.focusSideBar');
        await vscode.commands.executeCommand('workbench.view.extension.astraforge-activitybar');
    }));
    // Spec Kit commands
    context.subscriptions.push(vscode.commands.registerCommand('astraforge.initSpecKit', async () => {
        const workspaceDir = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceDir) {
            vscode.window.showErrorMessage('Please open a workspace folder first');
            return;
        }
        try {
            const specKitManager = workflowManager.specKitManager;
            await specKitManager.initializeSpecKit(workspaceDir);
            vscode.window.showInformationMessage('✅ Spec Kit initialized successfully!');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to initialize Spec Kit: ${error}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('astraforge.createSpecification', async () => {
        const idea = await vscode.window.showInputBox({
            prompt: 'Describe your feature or project idea',
            placeHolder: 'Build a task management system with drag-and-drop boards...'
        });
        if (!idea)
            return;
        try {
            const specKitManager = workflowManager.specKitManager;
            await specKitManager.createSpecification({
                userIdea: idea,
                projectContext: 'AstraForge VS Code Extension',
                constraints: ['VS Code API', 'TypeScript/Node.js']
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to create specification: ${error}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('astraforge.viewWorkflows', async () => {
        const specKitManager = workflowManager.specKitManager;
        const workflows = specKitManager.getWorkflows();
        if (workflows.length === 0) {
            vscode.window.showInformationMessage('No spec-driven workflows found. Create a specification first.');
            return;
        }
        const items = workflows.map((w) => ({
            label: w.featureName,
            description: `Status: ${w.status}`,
            detail: `Created: ${w.createdAt.toLocaleDateString()}`,
            workflowData: w
        }));
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a workflow to view'
        });
        if (selected) {
            const specUri = vscode.Uri.file(selected.workflowData.specsDir + '/spec.md');
            await vscode.window.showTextDocument(specUri);
        }
    }));
    // Auto-init Git if workspace open
    if (vscode.workspace.workspaceFolders) {
        await gitManager.initRepo(vscode.workspace.workspaceFolders[0].uri.fsPath);
    }
}
export function deactivate() {
    vectorDB.close();
}
//# sourceMappingURL=extension.js.map