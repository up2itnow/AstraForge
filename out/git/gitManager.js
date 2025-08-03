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
exports.GitManager = void 0;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class GitManager {
    async initRepo(path) {
        this.workspacePath = path;
        try {
            // Check if git is already initialized
            await execAsync('git status', { cwd: path });
        }
        catch (_error) {
            // Git not initialized, initialize it
            try {
                await execAsync('git init', { cwd: path });
                vscode.window.showInformationMessage('Git repository initialized');
            }
            catch (initError) {
                vscode.window.showErrorMessage(`Failed to initialize Git: ${initError.message}`);
            }
        }
    }
    async commit(message) {
        if (!this.workspacePath) {
            vscode.window.showWarningMessage('Git workspace not initialized');
            return;
        }
        try {
            // Add all changes
            await execAsync('git add .', { cwd: this.workspacePath });
            // Check if there are changes to commit
            const { stdout: status } = await execAsync('git status --porcelain', { cwd: this.workspacePath });
            if (status.trim()) {
                // There are changes to commit
                await execAsync(`git commit -m "${message}"`, { cwd: this.workspacePath });
                vscode.window.showInformationMessage(`Committed: ${message}`);
            }
            else {
                vscode.window.showInformationMessage('No changes to commit');
            }
        }
        catch (error) {
            // Handle case where git user is not configured
            if (error.message.includes('user.email') || error.message.includes('user.name')) {
                try {
                    await execAsync('git config user.email "astraforge@example.com"', { cwd: this.workspacePath });
                    await execAsync('git config user.name "AstraForge"', { cwd: this.workspacePath });
                    // Retry commit
                    await execAsync(`git commit -m "${message}"`, { cwd: this.workspacePath });
                    vscode.window.showInformationMessage(`Committed: ${message}`);
                }
                catch (retryError) {
                    vscode.window.showErrorMessage(`Git commit failed: ${retryError.message}`);
                }
            }
            else {
                vscode.window.showErrorMessage(`Git commit failed: ${error.message}`);
            }
        }
    }
    async getStatus() {
        if (!this.workspacePath) {
            return 'Git workspace not initialized';
        }
        try {
            const { stdout } = await execAsync('git status --short', { cwd: this.workspacePath });
            return stdout;
        }
        catch (error) {
            return `Git status failed: ${error.message}`;
        }
    }
}
exports.GitManager = GitManager;
//# sourceMappingURL=gitManager.js.map