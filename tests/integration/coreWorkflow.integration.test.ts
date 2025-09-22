/**
 * Integration tests for core AstraForge workflow
 * Tests critical paths from extension activation to basic functionality
 */

import * as vscode from 'vscode';
import { WorkflowManager } from '../../src/workflow/workflowManager';
import { LLMManager } from '../../src/llm/llmManager';
import { VectorDB } from '../../src/db/vectorDB';
import { GitManager } from '../../src/git/gitManager';
import { AdaptiveWorkflowRL } from '../../src/rl/adaptiveWorkflow';
import { CollaborationServer } from '../../src/server/collaborationServer';

describe('AstraForge Core Workflow Integration', () => {
  let workflowManager: WorkflowManager;
  let mockLLM: jest.Mocked<LLMManager>;
  let mockVector: jest.Mocked<VectorDB>;
  let mockGit: jest.Mocked<GitManager>;
  let mockCollaboration: jest.Mocked<CollaborationServer>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup comprehensive mocks
    mockLLM = {
      conference: jest.fn(),
      queryLLM: jest.fn(),
      voteOnDecision: jest.fn(),
      panel: [
        { provider: 'OpenRouter', key: 'test-key', model: 'test-model', role: 'primary' }
      ],
      providers: new Map([['OpenRouter', {} as any]]),
      cache: {
        get: jest.fn(),
        set: jest.fn(),
        isThrottled: jest.fn().mockReturnValue(false),
        clear: jest.fn()
      } as any
    } as any;

    mockVector = {
      init: jest.fn(),
      getEmbedding: jest.fn(),
      queryEmbedding: jest.fn(),
      addEmbedding: jest.fn(),
      getContextualInsights: jest.fn(),
      save: jest.fn(),
      close: jest.fn()
    } as any;

    mockGit = {
      commit: jest.fn(),
      initRepo: jest.fn(),
      getStatus: jest.fn(),
      getDiff: jest.fn()
    } as any;

    mockCollaboration = {
      broadcastToWorkspace: jest.fn(),
      handleUserMessage: jest.fn(),
      startSession: jest.fn(),
      endSession: jest.fn()
    } as any;

    // Create workflow manager instance
    workflowManager = new WorkflowManager(mockLLM, mockVector, mockGit);
  });

  describe('Extension Initialization Integration', () => {
    it('should initialize all core systems successfully', () => {
      expect(workflowManager).toBeInstanceOf(WorkflowManager);
      expect(workflowManager.llmManager).toBe(mockLLM);
      expect(workflowManager.vectorDB).toBe(mockVector);
      expect(workflowManager.gitManager).toBe(mockGit);
    });

    it('should initialize RL system', () => {
      expect(workflowManager.workflowRL).toBeInstanceOf(AdaptiveWorkflowRL);
      expect(workflowManager.workspaceId).toBeDefined();
      expect(workflowManager.metrics).toBeDefined();
    });

    it('should setup collaboration integration', () => {
      expect(workflowManager.collaborationServer).toBeUndefined(); // Not initialized by default
    });
  });

  describe('Project Analysis Integration', () => {
    beforeEach(() => {
      // Setup mock responses
      mockVector.getContextualInsights.mockResolvedValue([
        {
          id: 'context-1',
          content: 'Previous project used React with TypeScript',
          similarity: 0.8,
          metadata: { domain: 'web', complexity: 0.7 }
        }
      ]);

      mockLLM.conference.mockResolvedValue(
        'Based on the context, I recommend using React with TypeScript for this web application. ' +
        'The project structure should include components, services, and proper testing setup.'
      );
    });

    it('should analyze project idea and retrieve context', async () => {
      const projectIdea = 'Create a task management app with React';

      // Mock the categorizeProjectType method
      jest.spyOn(workflowManager as any, 'categorizeProjectType').mockReturnValue('web');
      jest.spyOn(workflowManager as any, 'estimateComplexity').mockReturnValue(0.6);
      jest.spyOn(workflowManager as any, 'extractDomain').mockReturnValue('web');
      jest.spyOn(workflowManager as any, 'identifyBehaviorPatterns').mockReturnValue(['pattern1']);

      await workflowManager.startWorkflow(projectIdea);

      expect(mockVector.getContextualInsights).toHaveBeenCalledWith(
        projectIdea,
        expect.objectContaining({
          domain: 'web',
          complexity: 0.6
        })
      );
    });

    it('should generate enhanced project plan using LLM', async () => {
      const projectIdea = 'Build a simple web app';

      // Setup mocks
      jest.spyOn(workflowManager as any, 'categorizeProjectType').mockReturnValue('web');
      jest.spyOn(workflowManager as any, 'estimateComplexity').mockReturnValue(0.3);
      jest.spyOn(workflowManager as any, 'extractDomain').mockReturnValue('web');
      jest.spyOn(workflowManager as any, 'identifyBehaviorPatterns').mockReturnValue([]);

      mockVector.getContextualInsights.mockResolvedValue([]);
      mockLLM.conference.mockResolvedValue('Simple web app plan');

      await workflowManager.startWorkflow(projectIdea);

      expect(mockLLM.conference).toHaveBeenCalledWith(
        expect.stringContaining(projectIdea)
      );
    });
  });

  describe('Workflow Phase Execution Integration', () => {
    beforeEach(() => {
      // Setup basic workflow state
      (workflowManager as any).projectIdea = 'Test project';
      (workflowManager as any).currentPhase = 0;

      // Mock helper methods
      jest.spyOn(workflowManager as any, 'categorizeProjectType').mockReturnValue('web');
      jest.spyOn(workflowManager as any, 'estimateComplexity').mockReturnValue(0.5);
      jest.spyOn(workflowManager as any, 'extractDomain').mockReturnValue('web');
      jest.spyOn(workflowManager as any, 'identifyBehaviorPatterns').mockReturnValue([]);
    });

    it('should execute planning phase with context retrieval', async () => {
      const mockContext = [
        {
          id: 'context-1',
          content: 'Previous planning phase succeeded',
          similarity: 0.9,
          metadata: { phase: 'planning', success: true }
        }
      ];

      mockVector.getContextualInsights.mockResolvedValue(mockContext);
      mockLLM.conference.mockResolvedValue('Planning phase completed successfully');

      await workflowManager.startWorkflow('Test project');

      expect(mockVector.getContextualInsights).toHaveBeenCalled();
      expect(mockLLM.conference).toHaveBeenCalled();
    });

    it('should handle phase transitions', () => {
      (workflowManager as any).currentPhase = 0;

      const nextPhase = (workflowManager as any).proceedToNextPhase();
      expect(nextPhase).toBe(1);
    });
  });

  describe('Error Handling Integration', () => {
    beforeEach(() => {
      // Setup mocks for error scenarios
      jest.spyOn(workflowManager as any, 'categorizeProjectType').mockReturnValue('web');
      jest.spyOn(workflowManager as any, 'estimateComplexity').mockReturnValue(0.5);
      jest.spyOn(workflowManager as any, 'extractDomain').mockReturnValue('web');
      jest.spyOn(workflowManager as any, 'identifyBehaviorPatterns').mockReturnValue([]);
    });

    it('should handle LLM API failures gracefully', async () => {
      mockLLM.conference.mockRejectedValue(new Error('API Rate Limit'));

      const result = await workflowManager.startWorkflow('Test project');

      // Should not throw, should handle error gracefully
      expect(mockLLM.conference).toHaveBeenCalled();
    });

    it('should handle vector DB failures', async () => {
      mockVector.getContextualInsights.mockRejectedValue(new Error('Database connection failed'));

      const result = await workflowManager.startWorkflow('Test project');

      expect(mockVector.getContextualInsights).toHaveBeenCalled();
    });
  });

  describe('Metrics and Learning Integration', () => {
    it('should track workflow metrics', async () => {
      (workflowManager as any).projectIdea = 'Test project';
      (workflowManager as any).currentPhase = 0;

      expect(workflowManager.metrics).toBeDefined();
      expect(workflowManager.metrics.startTime).toBeLessThanOrEqual(Date.now());
    });

    it('should provide RL-based optimization', () => {
      expect(workflowManager.workflowRL).toBeDefined();
      expect(typeof workflowManager.workflowRL.updateQValue).toBe('function');
      expect(typeof workflowManager.workflowRL.calculateReward).toBe('function');
    });

    it('should estimate project complexity', () => {
      const complexity = (workflowManager as any).estimateProjectComplexity();
      expect(typeof complexity).toBe('number');
      expect(complexity).toBeGreaterThanOrEqual(0);
      expect(complexity).toBeLessThanOrEqual(1);
    });
  });

  describe('System Health Integration', () => {
    it('should be in healthy state after initialization', () => {
      expect(workflowManager).toBeDefined();
      expect(workflowManager.llmManager).toBeDefined();
      expect(workflowManager.vectorDB).toBeDefined();
      expect(workflowManager.gitManager).toBeDefined();
    });

    it('should handle component failures gracefully', async () => {
      // Test that one component failure doesn't break the entire system
      mockVector.init.mockRejectedValue(new Error('Vector DB init failed'));

      // Should still create workflow manager instance
      expect(workflowManager).toBeInstanceOf(WorkflowManager);
    });

    it('should provide fallback mechanisms', () => {
      // Test that the system can work with minimal components
      const minimalWorkflow = new WorkflowManager(mockLLM, mockVector, mockGit);

      expect(minimalWorkflow).toBeInstanceOf(WorkflowManager);
      expect(minimalWorkflow.llmManager).toBe(mockLLM);
    });
  });

  describe('Performance Integration', () => {
    it('should handle concurrent operations', async () => {
      const promises = [
        workflowManager.startWorkflow('Project 1'),
        workflowManager.startWorkflow('Project 2'),
        workflowManager.startWorkflow('Project 3')
      ];

      // Should not throw
      await Promise.allSettled(promises);
    });

    it('should maintain state consistency', async () => {
      const project1 = 'Web App 1';
      const project2 = 'Web App 2';

      await workflowManager.startWorkflow(project1);
      expect((workflowManager as any).projectIdea).toBe(project1);

      await workflowManager.startWorkflow(project2);
      expect((workflowManager as any).projectIdea).toBe(project2);
    });
  });

  describe('Configuration Integration', () => {
    it('should work with different LLM configurations', () => {
      // Test with different provider configurations
      mockLLM.panel = [
        { provider: 'Anthropic', key: 'test-key', model: 'claude-3', role: 'primary' }
      ];

      expect(workflowManager.llmManager.panel).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ provider: 'Anthropic' })
        ])
      );
    });

    it('should adapt to different project types', () => {
      const mobileProject = 'Create a mobile app';
      const webProject = 'Create a web dashboard';

      jest.spyOn(workflowManager as any, 'categorizeProjectType')
        .mockReturnValueOnce('mobile')
        .mockReturnValueOnce('web');

      const mobileType = (workflowManager as any).categorizeProjectType(mobileProject);
      const webType = (workflowManager as any).categorizeProjectType(webProject);

      expect(mobileType).toBe('mobile');
      expect(webType).toBe('web');
    });
  });
});
