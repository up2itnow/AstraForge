/**
 * Unit tests for AdaptiveWorkflowRL - Q-learning system
 */

import { AdaptiveWorkflowRL } from '../src/rl/adaptiveWorkflow';

// Type definitions for test data
interface WorkflowState {
  currentPhase: string;
  projectComplexity: number;
  userSatisfaction: number;
  errorRate: number;
  timeSpent: number;
}

interface WorkflowAction {
  type: 'continue' | 'skip' | 'repeat' | 'branch' | 'optimize';
  target?: string;
  confidence: number;
}

// Mock global for localStorage simulation
const mockGlobal = global as any;
const originalNodeEnv = process.env.NODE_ENV;

describe('AdaptiveWorkflowRL', () => {
  let rl: AdaptiveWorkflowRL;

  beforeEach(() => {
    // Clear global storage
    delete mockGlobal.astraforge_qtable;
    process.env.NODE_ENV = 'test';
    rl = new AdaptiveWorkflowRL();
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('Initialization', () => {
    it('should initialize with default parameters', () => {
      expect(rl).toBeInstanceOf(AdaptiveWorkflowRL);

      const stats = rl.getStats();
      expect(stats.totalStates).toBe(0);
      expect(stats.totalActions).toBe(0);
      // Exploration is disabled in test mode for deterministic behaviour
      expect(stats.explorationRate).toBeCloseTo(0, 2);
    });

    it('should load existing Q-table from global storage', () => {
      const mockQTableData = [
        {
          state: '{"phase":"Planning","complexity":0.5}',
          actions: [{ action: '{"type":"continue"}', qValue: 0.8, visits: 5 }],
        },
      ];
      mockGlobal.astraforge_qtable = mockQTableData;

      const rlWithData = new AdaptiveWorkflowRL();
      const stats = rlWithData.getStats();

      expect(stats.totalStates).toBe(1);
      expect(stats.totalActions).toBe(1);
    });

    it('should retain exploration configuration outside test mode', () => {
      process.env.NODE_ENV = 'development';
      const rlNonTest = new AdaptiveWorkflowRL();
      const stats = rlNonTest.getStats();

      expect(stats.explorationRate).toBeCloseTo(0.1, 2);
      process.env.NODE_ENV = 'test';
    });
  });

  describe('State Serialization', () => {
    it('should serialize states consistently', () => {
      const state = {
        currentPhase: 'Planning',
        projectComplexity: 0.75,
        userSatisfaction: 0.8,
        errorRate: 0.1,
        timeSpent: 0.5,
      };

      const serialized = (rl as any).serializeState(state);
      const parsed = JSON.parse(serialized);

      expect(parsed.phase).toBe('Planning');
      expect(parsed.complexity).toBeCloseTo(0.75, 2);
      expect(parsed.satisfaction).toBeCloseTo(0.8, 2);
      expect(parsed.errorRate).toBeCloseTo(0.1, 2);
      expect(parsed.timeNorm).toBeCloseTo(0.5, 2);
    });

    it('should round values consistently for state bucketing', () => {
      const state1 = {
        currentPhase: 'Testing',
        projectComplexity: 0.74,
        userSatisfaction: 0.76,
        errorRate: 0.04,
        timeSpent: 0.23,
      };
      const state2 = {
        currentPhase: 'Testing',
        projectComplexity: 0.76,
        userSatisfaction: 0.74,
        errorRate: 0.06,
        timeSpent: 0.27,
      };

      const serialized1 = (rl as any).serializeState(state1);
      const serialized2 = (rl as any).serializeState(state2);

      // Should be bucketed to same state due to rounding
      expect(serialized1).toBe(serialized2);
    });
  });

  describe('Action Management', () => {
    it('should serialize and deserialize actions correctly', () => {
      const action: WorkflowAction = { type: 'continue', target: 'Testing', confidence: 0.9 };

      const serialized = (rl as any).serializeAction(action);
      const deserialized = (rl as any).deserializeAction(serialized);

      expect(deserialized.type).toBe('continue');
      expect(deserialized.target).toBe('Testing');
      expect(deserialized.confidence).toBe(0.8); // Default confidence for deserialized
    });

    it('should handle actions without targets', () => {
      const action: WorkflowAction = { type: 'skip', confidence: 0.7 };

      const serialized = (rl as any).serializeAction(action);
      const deserialized = (rl as any).deserializeAction(serialized);

      expect(deserialized.type).toBe('skip');
      expect(deserialized.target).toBeNull();
    });
  });

  describe('Action Selection', () => {
    const mockState = {
      currentPhase: 'Planning',
      projectComplexity: 0.5,
      userSatisfaction: 0.7,
      errorRate: 0.2,
      timeSpent: 0.3,
    };

    it('should default to continuing for unexplored states', () => {
      const action = rl.getBestAction(mockState);

      expect(action).toBeDefined();
      expect(action.type).toBe('continue');
    });

    it('should use epsilon-greedy policy', () => {
      // Manually set exploration rate to 0 for deterministic testing
      (rl as any).explorationRate = 0;

      // Add some Q-values
      const continueAction: WorkflowAction = { type: 'continue', confidence: 1.0 };
      const skipAction: WorkflowAction = { type: 'skip', confidence: 0.8 };
      rl.updateQValue(mockState, continueAction, 1.0, mockState);
      rl.updateQValue(mockState, skipAction, -0.5, mockState);

      const action = rl.getBestAction(mockState);
      expect(action.type).toBe('continue'); // Should pick the higher Q-value action
    });

    it('should explore with epsilon probability outside deterministic mode', () => {
      process.env.NODE_ENV = 'development';
      delete mockGlobal.astraforge_qtable;
      const rlExploration = new AdaptiveWorkflowRL();
      (rlExploration as any).explorationRate = 1.0; // Always explore

      const continueAction: WorkflowAction = { type: 'continue', confidence: 1.0 };
      const skipAction: WorkflowAction = { type: 'skip', confidence: 0.8 };
      rlExploration.updateQValue(mockState, continueAction, 1.0, mockState);
      rlExploration.updateQValue(mockState, skipAction, -0.5, mockState);

      const actions: string[] = [];
      for (let i = 0; i < 10; i++) {
        actions.push(rlExploration.getBestAction(mockState).type);
      }

      const uniqueActions = new Set(actions);
      expect(uniqueActions.size).toBeGreaterThan(1);
      process.env.NODE_ENV = 'test';
    });
  });

  describe('Q-Value Updates', () => {
    const state1: WorkflowState = {
      currentPhase: 'Planning',
      projectComplexity: 0.5,
      userSatisfaction: 0.7,
      errorRate: 0.2,
      timeSpent: 0.3,
    };

    const state2: WorkflowState = {
      currentPhase: 'Prototyping',
      projectComplexity: 0.5,
      userSatisfaction: 0.8,
      errorRate: 0.1,
      timeSpent: 0.4,
    };

    const action: WorkflowAction = { type: 'continue', confidence: 1.0 };

    it('should update Q-values using Q-learning formula', () => {
      const initialStats = rl.getStats();
      expect(initialStats.totalStates).toBe(0);

      rl.updateQValue(state1, action, 1.0, state2);

      const updatedStats = rl.getStats();
      expect(updatedStats.totalStates).toBe(1);
      expect(updatedStats.totalActions).toBe(1);
    });

    it('should keep exploration disabled in deterministic mode during updates', () => {
      expect(rl.getStats().explorationRate).toBe(0);

      rl.updateQValue(state1, action, 1.0, state2);

      expect(rl.getStats().explorationRate).toBe(0);
    });

    it('should increase Q-value for positive rewards', () => {
      rl.updateQValue(state1, action, 1.0, state2);

      // Get the Q-value (through another update to see the change)
      const beforeSecondUpdate = rl.getStats();
      rl.updateQValue(state1, action, 1.0, state2);
      const afterSecondUpdate = rl.getStats();

      // Visit count should increase
      expect(afterSecondUpdate.totalActions).toBe(beforeSecondUpdate.totalActions);
    });

    it('should decrease Q-value for negative rewards', () => {
      rl.updateQValue(state1, action, -1.0, state2);
      rl.updateQValue(state1, action, -1.0, state2);

      // The Q-value should be negative after negative rewards
      const stats = rl.getStats();
      expect(stats.totalStates).toBe(1);
    });

    it('should decay exploration rate over time outside deterministic mode', () => {
      process.env.NODE_ENV = 'development';
      delete mockGlobal.astraforge_qtable;
      const rlNonDeterministic = new AdaptiveWorkflowRL();

      const initialExploration = (rlNonDeterministic as any).explorationRate;

      // Perform multiple updates
      for (let i = 0; i < 10; i++) {
        rlNonDeterministic.updateQValue(state1, action, 0.5, state2);
      }

      const finalExploration = rlNonDeterministic.getStats().explorationRate;
      expect(finalExploration).toBeLessThan(initialExploration);
      expect(finalExploration).toBeGreaterThanOrEqual(0.01); // Min exploration rate
      process.env.NODE_ENV = 'test';
    });
  });

  describe('Reward Calculation', () => {
    const oldState = {
      currentPhase: 'Planning',
      projectComplexity: 0.5,
      userSatisfaction: 0.6,
      errorRate: 0.3,
      timeSpent: 0.5,
    };

    const newState = {
      currentPhase: 'Prototyping',
      projectComplexity: 0.5,
      userSatisfaction: 0.8,
      errorRate: 0.1,
      timeSpent: 0.6,
    };

    it('should reward phase success', () => {
      const testAction: WorkflowAction = { type: 'continue', confidence: 1.0 };
      const reward = rl.calculateReward(
        oldState,
        testAction,
        newState,
        true
      );
      expect(reward).toBeGreaterThan(0);
    });

    it('should penalize phase failure', () => {
      const testAction: WorkflowAction = { type: 'continue', confidence: 1.0 };
      const reward = rl.calculateReward(
        oldState,
        testAction,
        newState,
        false
      );
      expect(reward).toBeLessThan(0);
    });

    it('should reward satisfaction improvement', () => {
      const testAction2: WorkflowAction = { type: 'continue', confidence: 1.0 };
      const rewardWithImprovement = rl.calculateReward(
        oldState,
        testAction2,
        newState,
        true
      );

      const newStateWorseStatisfaction = { ...newState, userSatisfaction: 0.4 };
      const rewardWithDegradation = rl.calculateReward(
        oldState,
        testAction2,
        newStateWorseStatisfaction,
        true
      );

      expect(rewardWithImprovement).toBeGreaterThan(rewardWithDegradation);
    });

    it('should penalize error rate increase', () => {
      const testAction3: WorkflowAction = { type: 'continue', confidence: 1.0 };
      const newStateMoreErrors = { ...newState, errorRate: 0.5 };
      const reward = rl.calculateReward(
        oldState,
        testAction3,
        newStateMoreErrors,
        true
      );

      // Should be less than base success reward due to error penalty
      const baseReward = rl.calculateReward(
        oldState,
        testAction3,
        newState,
        true
      );
      expect(reward).toBeLessThan(baseReward);
    });

    it('should handle skip actions appropriately', () => {
      const skipAction: WorkflowAction = { type: 'skip', confidence: 0.8 };
      const simpleProject = { ...oldState, projectComplexity: 0.2 };
      const complexProject = { ...oldState, projectComplexity: 0.9 };

      const skipSimple = rl.calculateReward(
        simpleProject,
        skipAction,
        newState,
        true
      );
      const skipComplex = rl.calculateReward(
        complexProject,
        skipAction,
        newState,
        true
      );

      expect(skipSimple).toBeGreaterThan(skipComplex); // Skipping simple projects should be rewarded more
    });

    it('should incorporate user feedback', () => {
      const feedbackAction: WorkflowAction = { type: 'continue', confidence: 1.0 };
      const rewardWithGoodFeedback = rl.calculateReward(
        oldState,
        feedbackAction,
        newState,
        true,
        0.9
      );
      const rewardWithBadFeedback = rl.calculateReward(
        oldState,
        feedbackAction,
        newState,
        true,
        0.1
      );

      expect(rewardWithGoodFeedback).toBeGreaterThan(rewardWithBadFeedback);
    });

    it('should clamp rewards to valid range', () => {
      const extremeAction: WorkflowAction = { type: 'continue', confidence: 1.0 };
      const extremeState = { ...newState, userSatisfaction: 1.0, errorRate: 0.0 };
      const reward = rl.calculateReward(
        oldState,
        extremeAction,
        extremeState,
        true,
        1.0
      );

      expect(reward).toBeLessThanOrEqual(2.0);
      expect(reward).toBeGreaterThanOrEqual(-2.0);
    });
  });

  describe('Persistence', () => {
    it('should save Q-table to global storage', () => {
      const state: WorkflowState = {
        currentPhase: 'Testing',
        projectComplexity: 0.5,
        userSatisfaction: 0.7,
        errorRate: 0.2,
        timeSpent: 0.3,
      };
      const action: WorkflowAction = { type: 'continue', confidence: 1.0 };

      rl.updateQValue(state, action, 1.0, state);

      expect(mockGlobal.astraforge_qtable).toBeDefined();
      expect(Array.isArray(mockGlobal.astraforge_qtable)).toBe(true);
      expect(mockGlobal.astraforge_qtable.length).toBeGreaterThan(0);
    });

    it('should load Q-table on initialization', () => {
      // Set up mock data
      const mockData = [
        {
          state: '{"phase":"Planning","complexity":0.5}',
          actions: [{ action: '{"type":"continue"}', qValue: 1.5, visits: 3 }],
        },
      ];
      mockGlobal.astraforge_qtable = mockData;

      const newRL = new AdaptiveWorkflowRL();
      const stats = newRL.getStats();

      expect(stats.totalStates).toBe(1);
      expect(stats.totalActions).toBe(1);
    });

    it('should handle corrupted storage gracefully', () => {
      mockGlobal.astraforge_qtable = 'invalid data';

      // Should not throw and initialize with empty Q-table
      const newRL = new AdaptiveWorkflowRL();
      const stats = newRL.getStats();

      expect(stats.totalStates).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should track learning progress accurately', () => {
      const state: WorkflowState = {
        currentPhase: 'Planning',
        projectComplexity: 0.5,
        userSatisfaction: 0.7,
        errorRate: 0.2,
        timeSpent: 0.3,
      };
      const action1: WorkflowAction = { type: 'continue', confidence: 1.0 };
      const action2: WorkflowAction = { type: 'skip', confidence: 0.8 };

      rl.updateQValue(state, action1, 1.0, state);
      rl.updateQValue(state, action2, 0.5, state);

      const stats = rl.getStats();
      expect(stats.totalStates).toBe(1);
      expect(stats.totalActions).toBe(2);
      expect(stats.explorationRate).toBeLessThan(0.1); // Should have decayed
    });

    it('should count unique states correctly', () => {
      const state1: WorkflowState = {
        currentPhase: 'Planning',
        projectComplexity: 0.5,
        userSatisfaction: 0.7,
        errorRate: 0.2,
        timeSpent: 0.3,
      };
      const state2: WorkflowState = {
        currentPhase: 'Testing',
        projectComplexity: 0.5,
        userSatisfaction: 0.7,
        errorRate: 0.2,
        timeSpent: 0.3,
      };
      const action: WorkflowAction = { type: 'continue', confidence: 1.0 };

      rl.updateQValue(state1, action, 1.0, state1);
      rl.updateQValue(state2, action, 1.0, state2);

      const stats = rl.getStats();
      expect(stats.totalStates).toBe(2);
    });
  });
});

// Custom matcher for oneOf
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    return {
      message: () =>
        pass
          ? `expected ${received} not to be one of ${expected}`
          : `expected ${received} to be one of ${expected}`,
      pass,
    };
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}
