import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { CommitAnalyzer } from '../utils/commitAnalyzer';

const execAsync = promisify(exec);

export class GitManager {
  private workspacePath: string | undefined;
  private commitAnalyzer = new CommitAnalyzer();

  getWorkspacePath(): string | undefined {
    return this.workspacePath;
  }

  async getFileDiffs(paths: string[]): Promise<Record<string, GitFileDiff>> {
    if (!this.workspacePath) {
      return {};
    }

    const uniquePaths = Array.from(new Set(paths.filter(Boolean)));
    const results: Record<string, GitFileDiff> = {};

    for (const target of uniquePaths) {
      const normalized = this.normalizePath(target);
      if (!normalized) {
        continue;
      }

      try {
        const statusResult = await execAsync(`git status --porcelain -- "${normalized}"`, {
          cwd: this.workspacePath,
        });

        const statusLine = statusResult.stdout.trim().split('\n').find(line => line.trim());
        const status = this.parseStatusCode(statusLine);

        let diff = '';
        if (status !== 'clean') {
          try {
            const diffResult = await execAsync(`git diff -- "${normalized}"`, {
              cwd: this.workspacePath,
            });
            diff = diffResult.stdout;
          } catch (diffError: any) {
            diff = diffError.stdout || '';
          }
        }

        results[normalized] = { status, diff };
      } catch (error: any) {
        results[normalized] = {
          status: 'unknown',
          error: error.message,
        };
      }
    }

    return results;
  }

  private normalizePath(filePath: string): string | null {
    if (!this.workspacePath) {
      return null;
    }

    const cleaned = filePath.replace(/"/g, '').trim();
    if (!cleaned || cleaned === 'multiple') {
      return null;
    }

    const absolute = path.isAbsolute(cleaned)
      ? cleaned
      : path.join(this.workspacePath, cleaned);
    const relative = path.relative(this.workspacePath, absolute).replace(/\\/g, '/');

    if (!relative || relative.startsWith('..')) {
      return null;
    }

    return relative;
  }

  private parseStatusCode(statusLine?: string): GitDiffStatus {
    if (!statusLine) {
      return 'clean';
    }

    const code = statusLine.substring(0, 2).trim();
    switch (code) {
      case 'M':
      case 'MM':
      case 'AM':
      case 'MD':
        return 'modified';
      case 'A':
        return 'added';
      case '??':
        return 'untracked';
      case 'D':
      case 'AD':
      case 'DM':
        return 'deleted';
      case 'R':
        return 'renamed';
      default:
        return code === '' ? 'clean' : 'unknown';
    }
  }

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

  /**
   * Add specific files and commit with message
   * Compatibility method to support existing API usage
   */
  async addAndCommit(files: string[], message: string): Promise<void> {
    if (!this.workspacePath) {
      vscode.window.showWarningMessage('Git workspace not initialized');
      return;
    }

    try {
      // Add specific files
      const fileArgs = files.map(file => `"${file}"`).join(' ');
      await execAsync(`git add ${fileArgs}`, { cwd: this.workspacePath });

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
   * Analyze commit message for severity and create a commit with appropriate priority
   */
  async commitWithSeverityAnalysis(message: string): Promise<void> {
    const analysis = this.commitAnalyzer.analyzeSeverity(message);
    
    // Add severity prefix to commit message if severity keywords were found
    let enhancedMessage = message;
    if (analysis.hasSeverityKeywords && analysis.severity !== 'low') {
      enhancedMessage = `[${analysis.severity.toUpperCase()}] ${message}`;
    }
    
    // Show user the analysis results
    if (analysis.hasSeverityKeywords) {
      const severityInfo = `Detected severity: ${analysis.severity} (keywords: ${analysis.matchedKeywords.join(', ')})`;
      vscode.window.showInformationMessage(severityInfo);
    }
    
    await this.commit(enhancedMessage);
  }
}

export type GitDiffStatus =
  | 'clean'
  | 'modified'
  | 'added'
  | 'deleted'
  | 'renamed'
  | 'untracked'
  | 'unknown';

export interface GitFileDiff {
  status: GitDiffStatus;
  diff?: string;
  error?: string;
}
