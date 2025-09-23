import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { CommitAnalyzer, SeverityAnalysis } from '../utils/commitAnalyzer';

const execAsync = promisify(exec);

export class GitManager {
  private workspacePath: string | undefined;

  async initRepo(path: string) {
    this.workspacePath = path;
    try {
      // Check if git is already initialized
      await execAsync('git status', { cwd: path });
    } catch {
      // Git not initialized, initialize it
      try {
        await execAsync('git init', { cwd: path });
        vscode.window.showInformationMessage('Git repository initialized');
      } catch (initError: any) {
        vscode.window.showErrorMessage(`Failed to initialize Git: ${initError.message}`);
      }
    }
  }

  async commit(message: string) {
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
      } else {
        vscode.window.showInformationMessage('No changes to commit');
      }
    } catch (error: any) {
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
        } catch (retryError: any) {
          vscode.window.showErrorMessage(`Git commit failed: ${retryError.message}`);
        }
      } else {
        vscode.window.showErrorMessage(`Git commit failed: ${error.message}`);
      }
    }
  }

  async getStatus(): Promise<string> {
    if (!this.workspacePath) {
      return 'Git workspace not initialized';
    }

    try {
      const { stdout } = await execAsync('git status --short', { cwd: this.workspacePath });
      return stdout;
    } catch (error: any) {
      return `Git status failed: ${error.message}`;
    }
  }

  async getDiff(): Promise<string> {
    if (!this.workspacePath) {
      return 'Git workspace not initialized';
    }

    try {
      const { stdout } = await execAsync('git diff', { cwd: this.workspacePath });
      return stdout;
    } catch (error: any) {
      return `Git diff failed: ${error.message}`;
    }
  }

  async addAndCommit(files: string[], message: string): Promise<void> {
    if (!this.workspacePath) {
      vscode.window.showWarningMessage('Git workspace not initialized');
      return;
    }

    try {
      // Add specific files or patterns
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
      } else {
        vscode.window.showInformationMessage('No changes to commit');
      }
    } catch (error: any) {
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
        } catch (retryError: any) {
          vscode.window.showErrorMessage(`Git commit failed: ${retryError.message}`);
        }
      } else {
        vscode.window.showErrorMessage(`Git commit failed: ${error.message}`);
      }
    }
  }

  /**
   * Commit with severity analysis for better categorization
   */
  async commitWithSeverityAnalysis(message: string): Promise<{
    committed: boolean;
    analysis: SeverityAnalysis;
  }> {
    const analyzer = new CommitAnalyzer();
    const analysis = analyzer.analyzeSeverity(message);
    
    try {
      await this.commit(message);
      return { committed: true, analysis };
    } catch (error) {
      return { committed: false, analysis };
    }
  }
}
