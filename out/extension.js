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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const setupWizard_1 = require("./providers/setupWizard");
const projectIgnition_1 = require("./providers/projectIgnition");
const llmManager_1 = require("./llm/llmManager");
const vectorDB_1 = require("./db/vectorDB");
const workflowManager_1 = require("./workflow/workflowManager");
const gitManager_1 = require("./git/gitManager");
let llmManager;
let vectorDB;
let workflowManager;
let gitManager;
async function activate(context) {
    console.log('AstraForge IDE activated! Launching into the stratosphere...');
    // Initialize managers
    llmManager = new llmManager_1.LLMManager();
    vectorDB = new vectorDB_1.VectorDB(context.extensionUri.fsPath);
    await vectorDB.init();
    gitManager = new gitManager_1.GitManager();
    workflowManager = new workflowManager_1.WorkflowManager(llmManager, vectorDB, gitManager);
    // Register providers
    const setupWizard = new setupWizard_1.SetupWizardProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('astraforge.setupWizard', setupWizard));
    const projectIgnition = new projectIgnition_1.ProjectIgnitionProvider(context.extensionUri, workflowManager);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('astraforge.projectIgnition', projectIgnition));
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
    // Auto-init Git if workspace open
    if (vscode.workspace.workspaceFolders) {
        await gitManager.initRepo(vscode.workspace.workspaceFolders[0].uri.fsPath);
    }
}
function deactivate() {
    vectorDB.close();
}
//# sourceMappingURL=extension.js.map