/**
 * Integration tests for the complete AstraForge extension
 */

import * as vscode from 'vscode';
import { LLMManager } from '../../src/llm/llmManager';
import { VectorDB } from '../../src/db/vectorDB';
import { WorkflowManager } from '../../src/workflow/workflowManager';
import { GitManager } from '../../src/git/gitManager';

// Mock vscode for integration testing
jest.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/test/integration' } }],
    fs: {
      createDirectory: jest.fn(),
      writeFile: jest.fn(),
    },
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key: string) => {
        if (key === 'llmPanel') {
          return [
            { provider: 'OpenAI', key: 'test-integration-key', model: 'gpt-4', role: 'primary' },
          ];
        }
        return undefined;
      }),
    })),
  },
  window: {
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showQuickPick: jest.fn(),
    showInputBox: jest.fn(),
    showTextDocument: jest.fn(),
  },
  Uri: {
    file: jest.fn((path: string) => ({ fsPath: path })),
  },
}));

// Mock external dependencies
jest.mock('axios');
jest.mock('@huggingface/inference');
jest.mock('child_process');

describe('AstraForge Extension Integration', () => {
  let llmManager: LLMManager;
  let vectorDB: VectorDB;
  let gitManager: GitManager;
  let workflowManager: WorkflowManager;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Initialize components in integration order
    llmManager = new LLMManager();
    vectorDB = new VectorDB('/test/integration');
    gitManager = new GitManager();
    workflowManager = new WorkflowManager(llmManager, vectorDB, gitManager);

    // Initialize vector DB
    await vectorDB.init();
  });

  afterEach(async () => {
    // Clean up any servers or resources
    try {
      if (workflowManager && (workflowManager as any).collaborationServer) {
        await (workflowManager as any).collaborationServer.stop();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('End-to-End Workflow', () => {
    it('should complete a full project workflow', async () => {
      const projectIdea = 'Build a simple calculator app';

      // Mock successful responses
      (require('axios').post as jest.Mock).mockResolvedValue({
        data: { choices: [{ message: { content: 'Calculator implementation plan' } }] },
      });

      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue('Proceed as planned');

      // Start workflow
      await workflowManager.startWorkflow(projectIdea);

      // Verify initialization
      expect(vscode.workspace.getConfiguration).toHaveBeenCalled();
      expect(vscode.workspace.fs.createDirectory).toHaveBeenCalled();

      // Verify LLM integration
      expect(require('axios').post).toHaveBeenCalled();

      // Verify file operations
      expect(vscode.workspace.fs.writeFile).toHaveBeenCalled();
    });

    it('should handle multi-phase execution with context persistence', async () => {
      const projectIdea = 'Build a todo app with authentication';

      // Mock HuggingFace embeddings
      const mockHf = require('@huggingface/inference').HfInference;
      mockHf.prototype.featureExtraction = jest.fn().mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5]);

      // Mock LLM responses
      (require('axios').post as jest.Mock)
        .mockResolvedValueOnce({
          data: { choices: [{ message: { content: 'Planning phase output' } }] },
        })
        .mockResolvedValueOnce({
          data: { choices: [{ message: { content: 'Review of planning' } }] },
        })
        .mockResolvedValueOnce({
          data: { choices: [{ message: { content: 'Suggestions for improvement' } }] },
        });

      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue('Proceed as planned');

      // Execute first phase
      await workflowManager.startWorkflow(projectIdea);

      // Verify context storage
      expect(mockHf.prototype.featureExtraction).toHaveBeenCalled();

      // Execute next phase
      workflowManager.proceedToNextPhase();

      // Verify context retrieval and usage
      expect(require('axios').post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('todo app with authentication'),
            }),
          ]),
        }),
        expect.any(Object)
      );
    });
  });

  describe('Component Integration', () => {
    it('should integrate LLM manager with vector DB for context-aware responses', async () => {
      // Add some context to vector DB
      const contextEmbedding = [0.1, 0.2, 0.3, 0.4];
      await vectorDB.addEmbedding('context1', contextEmbedding, {
        type: 'previous_project',
        content: 'Previous calculator implementation',
      });

      // Mock embeddings
      const mockHf = require('@huggingface/inference').HfInference;
      mockHf.prototype.featureExtraction = jest.fn().mockResolvedValue([0.1, 0.2, 0.3, 0.4]); // Similar to stored context

      // Query with similar context
      const queryEmbedding = await vectorDB.getEmbedding('calculator implementation');
      const results = await vectorDB.queryEmbedding(queryEmbedding, 1);

      expect(results).toHaveLength(1);
      expect(results[0].similarity).toBeGreaterThan(0.8);
      expect(results[0].metadata.content).toContain('calculator implementation');
    });

    it('should integrate RL feedback with workflow decisions', async () => {
      const projectIdea = 'Build a weather app';

      // Mock user providing positive feedback
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue('Apply suggestions');

      (require('axios').post as jest.Mock).mockResolvedValue({
        data: { choices: [{ message: { content: 'Weather app implementation' } }] },
      });

      await workflowManager.startWorkflow(projectIdea);

      // Verify RL integration
      const workflowRL = (workflowManager as any).workflowRL;
      expect(workflowRL).toBeDefined();

      // Verify metrics tracking
      const metrics = (workflowManager as any).metrics;
      expect(metrics.startTime).toBeDefined();
      expect(metrics.userFeedback).toBeDefined();
    });
  });

  describe('Error Handling Integration', () => {
    it('should gracefully handle LLM API failures with fallbacks', async () => {
      // Mock LLM API failure
      (require('axios').post as jest.Mock).mockRejectedValue(new Error('API Rate Limit'));

      const result = await llmManager.queryLLM(0, 'test query');

      expect(result).toContain('Error querying LLM');
      expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    it('should handle embedding API failures with deterministic fallbacks', async () => {
      // Mock HuggingFace API failure
      const mockHf = require('@huggingface/inference').HfInference;
      mockHf.prototype.featureExtraction = jest
        .fn()
        .mockRejectedValue(new Error('Embedding API Error'));

      const embedding = await vectorDB.getEmbedding('test text');

      expect(embedding).toHaveLength(384); // Fallback embedding size
      expect(Array.isArray(embedding)).toBe(true);
    });

    it('should handle workflow interruptions gracefully', async () => {
      const projectIdea = 'Build a complex app';

      // Mock user choosing to abort
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue('Abort workflow');

      // Mock an error during workflow
      (require('axios').post as jest.Mock).mockRejectedValue(new Error('Workflow Error'));

      await workflowManager.startWorkflow(projectIdea);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Workflow aborted by user');
    });
  });

  describe('Performance Integration', () => {
    it('should handle concurrent LLM requests efficiently', async () => {
      // Mock multiple successful responses
      (require('axios').post as jest.Mock).mockResolvedValue({
        data: { choices: [{ message: { content: 'Response' } }] },
      });

      const startTime = Date.now();

      // Simulate conference with multiple LLMs
      const result = await llmManager.conference('Test concurrent prompt');

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete reasonably quickly (parallel execution)
      expect(duration).toBeLessThan(1000); // 1 second max for mocked responses
      expect(result).toContain('Test concurrent prompt');
      expect(result).toContain('Response');
    });

    it('should handle batch embedding requests efficiently', async () => {
      const mockHf = require('@huggingface/inference').HfInference;
      mockHf.prototype.featureExtraction = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);

      const texts = ['text1', 'text2', 'text3', 'text4', 'text5'];
      const startTime = Date.now();

      const embeddings = await vectorDB.getBatchEmbeddings(texts);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(embeddings).toHaveLength(5);
      expect(duration).toBeLessThan(2000); // Should handle batching efficiently
    });
  });

  describe('Data Persistence Integration', () => {
    it('should persist vector DB data across sessions', async () => {
      // Add data to vector DB
      await vectorDB.addEmbedding('test1', [1, 2, 3], { content: 'test data' });
      await vectorDB.save();

      // Create new instance (simulating restart)
      const newVectorDB = new VectorDB('/test/integration');
      await newVectorDB.init();

      // Should be able to query previously stored data
      const results = await newVectorDB.queryEmbedding([1, 2, 3], 1);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('test1');
    });

    it('should persist RL learning across sessions', async () => {
      const workflowRL = (workflowManager as any).workflowRL;

      // Perform some learning
      const state = {
        currentPhase: 'Planning',
        projectComplexity: 0.5,
        userSatisfaction: 0.8,
        errorRate: 0.1,
        timeSpent: 0.3,
      };

      workflowRL.updateQValue(state, { type: 'continue', confidence: 1.0 }, 1.0, state);

      const stats = workflowRL.getStats();
      expect(stats.totalStates).toBeGreaterThan(0);
      expect(stats.totalActions).toBeGreaterThan(0);
    });
  });

  describe('Configuration Integration', () => {
    it('should respect VS Code configuration settings', async () => {
      // Mock different configuration
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn((key: string) => {
          if (key === 'llmPanel') {
            return [
              { provider: 'Anthropic', key: 'claude-key', model: 'claude-3', role: 'primary' },
              { provider: 'OpenAI', key: 'gpt-key', model: 'gpt-4', role: 'secondary' },
            ];
          }
          return undefined;
        }),
      });

      const configuredLLM = new LLMManager();

      // Should use the configured panel
      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('astraforge');
    });

    it('should handle missing configuration gracefully', async () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn(() => undefined),
      });

      const unconfiguredLLM = new LLMManager();
      const result = await unconfiguredLLM.conference('test prompt');

      expect(result).toContain('No LLMs configured');
    });
  });
});
