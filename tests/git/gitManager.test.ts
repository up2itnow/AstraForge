/**
 * Tests for Git Manager
 */

import { GitManager } from '../../src/git/gitManager';
import * as vscode from 'vscode';
import { exec } from 'child_process';

jest.mock('child_process');
jest.mock('vscode');

const mockExec = exec as jest.MockedFunction<typeof exec>;
const mockExecAsync = jest.fn();

describe('GitManager', () => {
  let gitManager: GitManager;
  let mockWindow: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    gitManager = new GitManager();
    mockWindow = jest.spyOn(vscode.window, 'showInformationMessage').mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should create GitManager instance', () => {
      expect(gitManager).toBeInstanceOf(GitManager);
    });

    it('should initialize workspace path correctly', async () => {
      const testPath = '/test/workspace';
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });

      await gitManager.initRepo(testPath);

      expect((gitManager as any).workspacePath).toBe(testPath);
    });
  });

  describe('repository operations', () => {
    beforeEach(() => {
      (gitManager as any).workspacePath = '/test/workspace';
    });

    it('should handle commit operations', async () => {
      const mockShowWarning = jest.spyOn(vscode.window, 'showWarningMessage').mockImplementation(() => Promise.resolve());
      const commitMessage = 'Test commit message';

      await gitManager.commit(commitMessage);

      expect(mockShowWarning).not.toHaveBeenCalled();
    });

    it('should show warning when workspace not initialized', async () => {
      const mockShowWarning = jest.spyOn(vscode.window, 'showWarningMessage').mockImplementation(() => Promise.resolve());
      const gitManagerNoPath = new GitManager();
      const commitMessage = 'Test commit';

      await gitManagerNoPath.commit(commitMessage);

      expect(mockShowWarning).toHaveBeenCalledWith('Git workspace not initialized');
    });

    it('should handle getStatus operations', async () => {
      const mockShowWarning = jest.spyOn(vscode.window, 'showWarningMessage').mockImplementation(() => Promise.resolve());

      await gitManager.getStatus();

      expect(mockShowWarning).not.toHaveBeenCalled();
    });

    it('should handle getDiff operations', async () => {
      const mockShowWarning = jest.spyOn(vscode.window, 'showWarningMessage').mockImplementation(() => Promise.resolve());

      await gitManager.getDiff();

      expect(mockShowWarning).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors gracefully', async () => {
      const mockShowError = jest.spyOn(vscode.window, 'showErrorMessage').mockImplementation(() => Promise.resolve());
      const testPath = '/test/workspace';

      // Mock execAsync to throw an error for init
      mockExecAsync.mockRejectedValue(new Error('Git init failed'));

      await gitManager.initRepo(testPath);

      expect(mockShowError).toHaveBeenCalledWith('Failed to initialize Git: Git init failed');
    });

    it('should handle commit errors gracefully', async () => {
      const mockShowError = jest.spyOn(vscode.window, 'showErrorMessage').mockImplementation(() => Promise.resolve());
      (gitManager as any).workspacePath = '/test/workspace';

      // Mock execAsync to throw an error for commit
      mockExecAsync.mockRejectedValue(new Error('Commit failed'));

      const commitMessage = 'Test commit';
      await gitManager.commit(commitMessage);

      expect(mockShowError).toHaveBeenCalledWith('Failed to commit: Commit failed');
    });
  });

  describe('integration with VSCode', () => {
    it('should show information messages for successful operations', async () => {
      const mockShowInfo = jest.spyOn(vscode.window, 'showInformationMessage').mockImplementation(() => Promise.resolve());
      const testPath = '/test/workspace';

      await gitManager.initRepo(testPath);

      expect(mockShowInfo).toHaveBeenCalledWith('Git repository initialized');
    });

    it('should handle missing workspace gracefully', async () => {
      const gitManagerNoPath = new GitManager();

      const result = await gitManagerNoPath.getStatus();

      expect(result).toBeUndefined();
    });
  });

  describe('async operations', () => {
    beforeEach(() => {
      (gitManager as any).workspacePath = '/test/workspace';
    });

    it('should handle concurrent git operations', async () => {
      const operations = [
        gitManager.getStatus(),
        gitManager.getDiff(),
        gitManager.commit('Concurrent test')
      ];

      // Should not throw errors
      await Promise.allSettled(operations);
    });

    it('should maintain operation order', async () => {
      const callOrder: string[] = [];
      mockExecAsync.mockImplementation(async (command: string) => {
        callOrder.push(command);
        return { stdout: '', stderr: '' };
      });

      await gitManager.getStatus();
      await gitManager.getDiff();

      expect(callOrder).toContain('git status');
      expect(callOrder).toContain('git diff');
    });
  });
});
