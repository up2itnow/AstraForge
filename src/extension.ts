/**
 * AstraForge IDE Extension Entry Point
 * Optimized for fast activation with lazy loading
 */

import * as vscode from 'vscode';

// Lazy-loaded module references
let llmManager: any;
let vectorDB: any;
let workflowManager: any;
let gitManager: any;
let specKitManager: any;

export async function activate(context: vscode.ExtensionContext) {
  console.log('AstraForge IDE activated! Launching into the stratosphere...');

  // Register providers immediately but lazy-load heavy modules
  await registerProviders(context);

  // Register commands
  registerCommands(context);

  // Initialize heavy modules only when needed
  await initializeManagers(context);

  console.log('AstraForge IDE fully activated');
}

/**
 * Register webview providers immediately for UI responsiveness
 */
async function registerProviders(context: vscode.ExtensionContext) {
  // Setup Wizard - lightweight, load immediately
  const { SetupWizardProvider } = await import('./providers/setupWizard');
  const setupWizard = new SetupWizardProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('astraforge.setupWizard', setupWizard)
  );

  // API Tester - load immediately for testing
  const { ApiTesterProvider } = await import('./testing/apiTesterProvider');
  const apiTester = new ApiTesterProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('astraforge.apiTester', apiTester)
  );

  // Project Ignition - delay until workflow is needed
  let projectIgnition: any;
  const getProjectIgnition = async () => {
    if (!projectIgnition) {
      const { ProjectIgnitionProvider } = await import('./providers/projectIgnition');
      await ensureWorkflowManager(context);
      projectIgnition = new ProjectIgnitionProvider(context.extensionUri, workflowManager);
    }
    return projectIgnition;
  };

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('astraforge.projectIgnition', {
      resolveWebviewView: async (webviewView, context, token) => {
        const provider = await getProjectIgnition();
        return provider.resolveWebviewView(webviewView, context, token);
      },
    })
  );

  let specTelemetry: any;
  const getSpecTelemetry = async () => {
    await Promise.all([ensureWorkflowManager(context), ensureSpecKitManager(context)]);

    if (!specTelemetry) {
      const { SpecTelemetryDashboardProvider } = await import('./providers/specTelemetryDashboard');
      specTelemetry = new SpecTelemetryDashboardProvider(
        context.extensionUri,
        specKitManager,
        gitManager,
        workflowManager
      );
    }

    return specTelemetry;
  };

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('astraforge.specTelemetry', {
      resolveWebviewView: async (webviewView, viewContext, token) => {
        const provider = await getSpecTelemetry();
        return provider.resolveWebviewView(webviewView, viewContext, token);
      },
    })
  );
}

/**
 * Register extension commands
 */
function registerCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('astraforge.setupPanel', async () => {
      await vscode.commands.executeCommand('workbench.action.focusSideBar');
      await vscode.commands.executeCommand('workbench.view.extension.astraforge-activitybar');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('astraforge.submitIdea', async (idea: string) => {
      await ensureWorkflowManager(context);
      workflowManager.startWorkflow(idea);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('astraforge.proceedPhase', async () => {
      await ensureWorkflowManager(context);
      workflowManager.proceedToNextPhase();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('astraforge.testAPIs', async () => {
      await vscode.commands.executeCommand('workbench.action.focusSideBar');
      await vscode.commands.executeCommand('workbench.view.extension.astraforge-activitybar');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('astraforge.clearCache', async () => {
      await ensureLLMManager();
      llmManager.clearCache();
      vscode.window.showInformationMessage('LLM cache cleared');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('astraforge.showCacheStats', async () => {
      await ensureLLMManager();
      const stats = llmManager.getCacheStats();
      vscode.window.showInformationMessage(
        `Cache Stats - Size: ${stats.cacheSize}, Throttled: ${stats.throttleEntries}`
      );
    })
  );
}

/**
 * Initialize heavy managers only when needed
 */
async function initializeManagers(context: vscode.ExtensionContext) {
  // Auto-init Git if workspace is open (lightweight)
  if (vscode.workspace.workspaceFolders) {
    await ensureGitManager();
    try {
      await gitManager.initRepo(vscode.workspace.workspaceFolders[0].uri.fsPath);
    } catch (error) {
      console.error('Git initialization failed:', error);
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
async function ensureVectorDB(context: vscode.ExtensionContext) {
  if (!vectorDB) {
    const { VectorDB } = await import('./db/vectorDB');
    vectorDB = new VectorDB(context.extensionUri.fsPath);
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
 * Lazy-load Workflow Manager (depends on other managers)
 */
async function ensureWorkflowManager(context: vscode.ExtensionContext) {
  if (!workflowManager) {
    await Promise.all([ensureLLMManager(), ensureVectorDB(context), ensureGitManager()]);

    const { WorkflowManager } = await import('./workflow/workflowManager');
    workflowManager = new WorkflowManager(llmManager, vectorDB, gitManager);
  }
  return workflowManager;
}

async function ensureSpecKitManager(context: vscode.ExtensionContext) {
  if (!specKitManager) {
    await Promise.all([ensureLLMManager(), ensureVectorDB(context), ensureGitManager()]);

    const { SpecKitManager } = await import('./spec-kit/specKitManager');
    specKitManager = new SpecKitManager(llmManager, vectorDB, gitManager);
  }

  return specKitManager;
}

export function deactivate() {
  if (vectorDB) {
    vectorDB.close();
  }

  if (llmManager) {
    llmManager.clearCache();
  }
}
