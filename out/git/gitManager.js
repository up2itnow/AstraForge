import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
export class GitManager {
    async initRepo(path) {
        this.workspacePath = path;
        try {
            // Check if git is already initialized
            await execAsync('git status', { cwd: path });
        }
        catch {
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
            const { stdout: status } = await execAsync('git status --porcelain', {
                cwd: this.workspacePath,
            });
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
                    await execAsync('git config user.email "astraforge@example.com"', {
                        cwd: this.workspacePath,
                    });
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
    /**
     * Add specific files and commit with a message
     * Legacy method for backward compatibility
     */
    async addAndCommit(files, message) {
        if (!this.workspacePath) {
            vscode.window.showWarningMessage('Git workspace not initialized');
            return;
        }
        try {
            // Add specified files
            for (const file of files) {
                await execAsync(`git add "${file}"`, { cwd: this.workspacePath });
            }
            // Check if there are changes to commit
            const { stdout: status } = await execAsync('git status --porcelain', {
                cwd: this.workspacePath,
            });
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
                vscode.window.showErrorMessage('Git user not configured. Please set git user.name and user.email');
            }
            else {
                vscode.window.showErrorMessage(`Git commit failed: ${error.message}`);
            }
        }
    }
}
//# sourceMappingURL=gitManager.js.map