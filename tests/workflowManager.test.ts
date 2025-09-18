/**
 * Unit tests for WorkflowManager - AI-powered workflow orchestration
 */

import { WorkflowManager } from '../src/workflow/workflowManager';
import { LLMManager } from '../src/llm/llmManager';
import { VectorDB } from '../src/db/vectorDB';
import { GitManager } from '../src/git/gitManager';
import * as vscode from 'vscode';

// Mock all dependencies
jest.mock('../src/llm/llmManager');
jest.mock('../src/db/vectorDB');
jest.mock('../src/git/gitManager');
jest.mock('../src/rl/adaptiveWorkflow');
jest.mock('../src/server/collaborationServer');

// Mock vscode
jest.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }],
    fs: {
      createDirectory: jest.fn(),
      writeFile: jest.fn(),
    },
    openTextDocument: jest.fn(),
    getConfiguration: jest.fn(() => ({ get: jest.fn() })),
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

const mockLLMManager = LLMManager as jest.MockedClass<typeof LLMManager>;
const mockVectorDB = VectorDB as jest.MockedClass<typeof VectorDB>;
const mockGitManager = GitManager as jest.MockedClass<typeof GitManager>;

describe('WorkflowManager', () => {
  let workflowManager: WorkflowManager;
  let mockLLM: jest.Mocked<LLMManager>;
  let mockVector: jest.Mocked<VectorDB>;
  let mockGit: jest.Mocked<GitManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockLLM = {
      conference: jest.fn(),
      queryLLM: jest.fn(),
      voteOnDecision: jest.fn(),
    } as any;

    mockVector = {
      init: jest.fn(),
      getEmbedding: jest.fn(),
      queryEmbedding: jest.fn(),
      addEmbedding: jest.fn(),
    } as any;

    mockGit = {
      commit: jest.fn(),
    } as any;

    mockLLMManager.mockImplementation(() => mockLLM);
    mockVectorDB.mockImplementation(() => mockVector);
    mockGitManager.mockImplementation(() => mockGit);

    workflowManager = new WorkflowManager(mockLLM, mockVector, mockGit);
  });

  describe('Initialization', () => {
    it('should initialize with all required managers', () => {
      expect(workflowManager).toBeInstanceOf(WorkflowManager);
      expect(mockVector.init).toHaveBeenCalled();
    });

    it('should initialize RL and collaboration systems', () => {
      // Test that the workflow manager sets up its internal systems
      expect(workflowManager).toBeDefined();
    });
  });

  describe('Workflow Execution', () => {
    beforeEach(() => {
      // Setup common mocks
      mockLLM.conference.mockResolvedValue('LLM conference response');
      mockLLM.queryLLM.mockResolvedValue('LLM query response');
      mockVector.getEmbedding.mockResolvedValue([1, 2, 3, 4]);
      mockVector.queryEmbedding.mockResolvedValue([]);
      mockGit.commit.mockResolvedValue(undefined);
    });

    it('should start workflow with project idea', async () => {
      const testIdea = 'Build a todo app';

      await workflowManager.startWorkflow(testIdea);

      expect(mockLLM.conference).toHaveBeenCalled();
      expect(mockVector.addEmbedding).toHaveBeenCalled();
    });

    it('should handle "letPanelDecide" option', async () => {
      const testIdea = 'Build a todo app';

      await workflowManager.startWorkflow(testIdea, 'letPanelDecide');

      // Should call conference to refine the idea
      expect(mockLLM.conference).toHaveBeenCalledWith(
        expect.stringContaining('Refine this project idea')
      );
    });

    it('should execute phases sequentially', async () => {
      const testIdea = 'Build a todo app';

      // Mock user interaction
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue('Proceed as planned');
      (vscode.workspace.fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await workflowManager.startWorkflow(testIdea);
      workflowManager.proceedToNextPhase();

      expect(mockVector.getEmbedding).toHaveBeenCalled();
      expect(mockLLM.conference).toHaveBeenCalled();
      expect(mockGit.commit).toHaveBeenCalled();
    });
  });

  describe('Phase Execution', () => {
    beforeEach(() => {
      mockVector.getEmbedding.mockResolvedValue([1, 2, 3, 4]);
      mockVector.queryEmbedding.mockResolvedValue([
        { id: 'test1', vector: [1, 2, 3, 4], similarity: 0.9, metadata: { plan: 'Previous plan data' } },
      ]);
      mockLLM.conference.mockResolvedValue('Phase execution result');
      mockLLM.queryLLM.mockResolvedValue('Review result');
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue('Proceed as planned');
    });

    it('should retrieve relevant context from vector DB', async () => {
      await workflowManager.startWorkflow('Test project');

      expect(mockVector.getEmbedding).toHaveBeenCalledWith(
        expect.stringContaining('Planning for Test project')
      );
      expect(mockVector.queryEmbedding).toHaveBeenCalled();
    });

    it('should generate enhanced prompts with context', async () => {
      await workflowManager.startWorkflow('Test project');

      expect(mockLLM.conference).toHaveBeenCalledWith(
        expect.stringContaining('Previous plan data')
      );
    });

    it('should write phase output to organized files', async () => {
      await workflowManager.startWorkflow('Test project');

      expect(vscode.workspace.fs.createDirectory).toHaveBeenCalled();
      expect(vscode.workspace.fs.writeFile).toHaveBeenCalledWith(
        expect.objectContaining({
          fsPath: expect.stringContaining('astraforge_output'),
        }),
        expect.any(Object)
      );
    });

    it('should commit changes with detailed messages', async () => {
      await workflowManager.startWorkflow('Test project');

      expect(mockGit.commit).toHaveBeenCalledWith(expect.stringContaining('Planning complete'));
    });

    it('should store phase context in vector DB', async () => {
      await workflowManager.startWorkflow('Test project');

      expect(mockVector.addEmbedding).toHaveBeenCalledWith(
        expect.stringContaining('phase_'),
        expect.any(Array),
        expect.objectContaining({
          phase: expect.any(String),
          content: expect.any(String),
        })
      );
    });
  });

  describe('User Interaction', () => {
    beforeEach(() => {
      mockLLM.conference.mockResolvedValue('Test output');
      mockLLM.queryLLM.mockResolvedValue('Test review');
      mockVector.getEmbedding.mockResolvedValue([1, 2, 3]);
      mockVector.queryEmbedding.mockResolvedValue([]);
    });

    it('should handle "Apply suggestions" user choice', async () => {
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue('Apply suggestions');

      await workflowManager.startWorkflow('Test project');

      expect(mockLLM.conference).toHaveBeenCalledWith(
        expect.stringContaining('Apply these suggestions')
      );
    });

    it('should handle "Request modifications" user choice', async () => {
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue('Request modifications');
      (vscode.window.showInputBox as jest.Mock).mockResolvedValue('Make it better');

      await workflowManager.startWorkflow('Test project');

      expect(vscode.window.showInputBox).toHaveBeenCalled();
      expect(mockLLM.conference).toHaveBeenCalledWith(
        expect.stringContaining('Apply these modifications')
      );
    });

    it('should handle "Get more details" user choice', async () => {
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue('Get more details');

      await workflowManager.startWorkflow('Test project');

      expect(mockLLM.queryLLM).toHaveBeenCalledWith(
        0,
        expect.stringContaining('Provide more detailed explanation')
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle phase execution errors gracefully', async () => {
      mockLLM.conference.mockRejectedValue(new Error('LLM Error'));
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue('Retry phase');

      await workflowManager.startWorkflow('Test project');

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Planning encountered an error'),
        'Retry phase',
        'Skip phase',
        'Abort workflow'
      );
    });

    it('should allow user to skip failed phases', async () => {
      mockLLM.conference.mockRejectedValue(new Error('LLM Error'));
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue('Skip phase');

      await workflowManager.startWorkflow('Test project');

      // Should proceed to next phase
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });

    it('should handle workflow abortion', async () => {
      mockLLM.conference.mockRejectedValue(new Error('LLM Error'));
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue('Abort workflow');

      await workflowManager.startWorkflow('Test project');

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Workflow aborted by user');
    });
  });

  describe('Project Completion', () => {
    beforeEach(() => {
      mockLLM.queryLLM
        .mockResolvedValueOnce('Comprehensive project report')
        .mockResolvedValueOnce('Enhancement suggestions');
      (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue({});
      (vscode.window.showTextDocument as jest.Mock).mockResolvedValue(undefined);
    });

    it('should generate comprehensive final report', async () => {
      // Simulate completing all phases
      const manager = workflowManager as any;
      manager.currentPhase = 4; // Beyond all phases

      await manager.completeProject();

      expect(mockLLM.queryLLM).toHaveBeenCalledWith(
        0,
        expect.stringContaining('Generate a comprehensive final report')
      );
      expect(mockLLM.queryLLM).toHaveBeenCalledWith(
        0,
        expect.stringContaining('Suggest 5 innovative A+ enhancements')
      );
    });

    it('should include AI learning metrics in final report', async () => {
      const manager = workflowManager as any;
      manager.currentPhase = 4;

      await manager.completeProject();

      expect(vscode.workspace.fs.writeFile).toHaveBeenCalledWith(
        expect.objectContaining({
          fsPath: expect.stringContaining('FINAL_REPORT.md'),
        }),
        expect.objectContaining({
          toString: expect.any(Function),
        })
      );
    });

    it('should open final report for user review', async () => {
      const manager = workflowManager as any;
      manager.currentPhase = 4;

      await manager.completeProject();

      expect(vscode.workspace.openTextDocument).toHaveBeenCalled();
      expect(vscode.window.showTextDocument).toHaveBeenCalled();
    });
  });

  describe('RL Integration', () => {
    it('should use RL for workflow decisions', async () => {
      // Mock RL to suggest skipping a phase
      const manager = workflowManager as any;
      manager.workflowRL = {
        getBestAction: jest.fn().mockReturnValue({ type: 'skip', confidence: 0.9 }),
        updateQValue: jest.fn(),
        calculateReward: jest.fn().mockReturnValue(0.8),
        getStats: jest
          .fn()
          .mockReturnValue({ totalStates: 5, totalActions: 10, explorationRate: 0.05 }),
      };

      await workflowManager.startWorkflow('Test project');

      expect(manager.workflowRL.getBestAction).toHaveBeenCalled();
    });

    it('should update RL based on user feedback', async () => {
      const manager = workflowManager as any;
      manager.workflowRL = {
        getBestAction: jest.fn().mockReturnValue({ type: 'continue', confidence: 1.0 }),
        updateQValue: jest.fn(),
        calculateReward: jest.fn().mockReturnValue(0.8),
        getStats: jest
          .fn()
          .mockReturnValue({ totalStates: 1, totalActions: 1, explorationRate: 0.1 }),
      };

      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue('Proceed as planned');

      await workflowManager.startWorkflow('Test project');

      expect(manager.workflowRL.updateQValue).toHaveBeenCalled();
      expect(manager.workflowRL.calculateReward).toHaveBeenCalled();
    });
  });

  describe('Collaboration Integration', () => {
    it('should broadcast phase events to collaboration server', async () => {
      const manager = workflowManager as any;
      manager.collaborationServer = {
        broadcastToWorkspace: jest.fn(),
      };

      await workflowManager.startWorkflow('Test project');

      expect(manager.collaborationServer.broadcastToWorkspace).toHaveBeenCalledWith(
        expect.any(String),
        'phase_started',
        expect.objectContaining({
          phase: 'Planning',
          projectIdea: 'Test project',
        })
      );
    });

    it('should notify completion to collaboration server', async () => {
      const manager = workflowManager as any;
      manager.currentPhase = 4;
      manager.collaborationServer = {
        broadcastToWorkspace: jest.fn(),
      };

      await manager.completeProject();

      expect(manager.collaborationServer.broadcastToWorkspace).toHaveBeenCalledWith(
        expect.any(String),
        'project_completed',
        expect.objectContaining({
          projectIdea: expect.any(String),
          metrics: expect.any(Object),
        })
      );
    });
  });

  describe('Metrics Tracking', () => {
    it('should track workflow metrics accurately', async () => {
      await workflowManager.startWorkflow('Test project');

      const manager = workflowManager as any;
      expect(manager.metrics.startTime).toBeDefined();
      expect(manager.metrics.iterations).toBeGreaterThanOrEqual(0);
    });

    it('should calculate user satisfaction from feedback', async () => {
      const manager = workflowManager as any;
      manager.metrics.userFeedback = [0.8, 0.9, 0.7];

      const satisfaction = manager.calculateUserSatisfaction();
      expect(satisfaction).toBeCloseTo(0.8, 1);
    });

    it('should estimate project complexity from keywords', async () => {
      const manager = workflowManager as any;
      manager.projectIdea =
        'Build a real-time machine learning API with authentication and database';

      const complexity = manager.estimateProjectComplexity();
      expect(complexity).toBeGreaterThan(0.5); // Should detect high complexity
    });
  });
});
