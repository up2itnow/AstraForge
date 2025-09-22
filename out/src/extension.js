/**
 * AstraForge IDE Extension Entry Point
 * Optimized for fast activation with lazy loading
 */
import * as vscode from 'vscode';
import { logger } from './utils/logger';
// Lazy-loaded module references
let llmManager;
let vectorDB;
let workflowManager;
let gitManager;
let metaLearningProvider;
let emergentBehaviorSystem;
export async function activate(context) {
    logger.info('🚀 AstraForge IDE activated! Launching into the stratosphere...');
    // Register providers immediately but lazy-load heavy modules
    await registerProviders(context);
    // Register commands
    registerCommands(context);
    // Initialize heavy modules only when needed
    await initializeManagers(context);
    logger.info('✅ AstraForge IDE fully activated');
}
/**
 * Register webview providers immediately for UI responsiveness
 */
async function registerProviders(context) {
    // Setup Wizard - lightweight, load immediately
    const { SetupWizardProvider } = await import('./providers/setupWizard');
    const setupWizard = new SetupWizardProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('astraforge.setupWizard', setupWizard));
    // API Tester - load immediately for testing
    const { ApiTesterProvider } = await import('./testing/apiTesterProvider');
    const apiTester = new ApiTesterProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('astraforge.apiTester', apiTester));
    // Project Ignition - delay until workflow is needed
    let projectIgnition;
    const getProjectIgnition = async () => {
        if (!projectIgnition) {
            const { ProjectIgnitionProvider } = await import('./providers/projectIgnition');
            await ensureWorkflowManager(context);
            projectIgnition = new ProjectIgnitionProvider(context.extensionUri, workflowManager);
        }
        return projectIgnition;
    };
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('astraforge.projectIgnition', {
        resolveWebviewView: async (webviewView, context, token) => {
            const provider = await getProjectIgnition();
            return provider.resolveWebviewView(webviewView, context, token);
        },
    }));
    // Meta-Learning Dashboard - register immediately for insights access
    const getMetaLearningProvider = async () => {
        if (!metaLearningProvider) {
            const { MetaLearningProvider } = await import('./meta-learning');
            const { createMetaLearningSystem } = await import('./meta-learning');
            const metaLearningComponents = createMetaLearningSystem();
            const integration = new (await import('./meta-learning')).MetaLearningIntegration(metaLearningComponents);
            metaLearningProvider = new MetaLearningProvider(context.extensionUri, integration);
        }
        return metaLearningProvider;
    };
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('astraforge.metaLearning', {
        resolveWebviewView: async (webviewView, context, token) => {
            const provider = await getMetaLearningProvider();
            return provider.resolveWebviewView(webviewView, context, token);
        },
    }));
}
/**
 * Register extension commands
 */
function registerCommands(context) {
    context.subscriptions.push(vscode.commands.registerCommand('astraforge.setupPanel', async () => {
        await vscode.commands.executeCommand('workbench.action.focusSideBar');
        await vscode.commands.executeCommand('workbench.view.extension.astraforge-activitybar');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('astraforge.submitIdea', async (idea) => {
        await ensureWorkflowManager(context);
        workflowManager.startWorkflow(idea);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('astraforge.proceedPhase', async () => {
        await ensureWorkflowManager(context);
        workflowManager.proceedToNextPhase();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('astraforge.testAPIs', async () => {
        await vscode.commands.executeCommand('workbench.action.focusSideBar');
        await vscode.commands.executeCommand('workbench.view.extension.astraforge-activitybar');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('astraforge.clearCache', async () => {
        await ensureLLMManager();
        llmManager.clearCache();
        vscode.window.showInformationMessage('LLM cache cleared');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('astraforge.showCacheStats', async () => {
        await ensureLLMManager();
        const stats = llmManager.getCacheStats();
        vscode.window.showInformationMessage(`Cache Stats - Size: ${stats.cacheSize}, Throttled: ${stats.throttleEntries}`);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('astraforge.showMetaLearning', async () => {
        await vscode.commands.executeCommand('workbench.view.extension.astraforge-activitybar');
        // The MetaLearningProvider will handle the webview display
    }));
}
/**
 * Initialize heavy managers only when needed
 */
async function initializeManagers(_context) {
    // Auto-init Git if workspace is open (lightweight)
    if (vscode.workspace.workspaceFolders) {
        await ensureGitManager();
        try {
            await gitManager.initRepo(vscode.workspace.workspaceFolders[0].uri.fsPath);
        }
        catch (error) {
            logger.error('Git initialization failed:', error);
        }
    }
}
/**
 * Lazy-load LLM Manager
 */
async function ensureLLMManager() {
    if (!llmManager) {
        const { LLMManager } = await import('./llm/llmManager');
        llmManager = new LLMManager();
    }
    return llmManager;
}
/**
 * Lazy-load Vector DB
 */
async function ensureVectorDB(context) {
    if (!vectorDB) {
        const { VectorDB } = await import('./db/vectorDB');
        const emergentBehavior = await ensureEmergentBehaviorSystem();
        vectorDB = new VectorDB(context.extensionUri.fsPath, emergentBehavior);
        await vectorDB.init();
    }
    return vectorDB;
}
/**
 * Lazy-load Git Manager
 */
async function ensureGitManager() {
    if (!gitManager) {
        const { GitManager } = await import('./git/gitManager');
        gitManager = new GitManager();
    }
    return gitManager;
}
/**
 * Lazy-load Emergent Behavior System
 */
async function ensureEmergentBehaviorSystem() {
    if (!emergentBehaviorSystem) {
        const { createEmergentBehaviorSystem } = await import('./emergent-behavior');
        const { _MetaLearningSystem } = await import('./meta-learning');
        // Initialize meta-learning first if needed
        let metaLearning;
        try {
            const { createMetaLearningSystem } = await import('./meta-learning');
            const metaComponents = createMetaLearningSystem();
            const { MetaLearningIntegration } = await import('./meta-learning');
            metaLearning = new MetaLearningIntegration(metaComponents);
        }
        catch (error) {
            logger.warn('Meta-learning system not available for emergent behavior:', error);
        }
        const behaviorComponents = createEmergentBehaviorSystem(metaLearning);
        emergentBehaviorSystem = behaviorComponents.emergentBehaviorSystem;
    }
    return emergentBehaviorSystem;
}
/**
 * Lazy-load Workflow Manager (depends on other managers)
 */
async function ensureWorkflowManager(context) {
    if (!workflowManager) {
        await Promise.all([
            ensureLLMManager(),
            ensureVectorDB(context),
            ensureGitManager(),
            ensureEmergentBehaviorSystem()
        ]);
        const { WorkflowManager } = await import('./workflow/workflowManager');
        workflowManager = new WorkflowManager(llmManager, vectorDB, gitManager, emergentBehaviorSystem);
    }
    return workflowManager;
}
export function deactivate() {
    if (vectorDB) {
        vectorDB.close();
    }
    if (llmManager) {
        llmManager.clearCache();
    }
}
//# sourceMappingURL=extension.js.map