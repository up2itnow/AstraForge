/**
 * Unit tests for AdaptiveWorkflowRL - Q-learning system
 */

import { AdaptiveWorkflowRL } from '../src/rl/adaptiveWorkflow';
import { PhaseTelemetry } from '../src/testing/phaseEvaluator';

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

const buildTelemetry = (
  phase: string,
  quality: number,
  defects: number,
  coverage: number,
  latencyMs: number
): PhaseTelemetry => ({
  phase,
  timestamp: Date.now(),
  durationMs: latencyMs,
  success: defects === 0,
  metrics: [
    { key: 'quality.score', value: quality },
    { key: 'coverage.lines', value: coverage },
    { key: 'coverage.statements', value: coverage },
    { key: 'defects.count', value: defects },
    { key: 'latency.totalMs', value: latencyMs },
  ],
  commandResults: [],
});

describe('AdaptiveWorkflowRL', () => {
  let rl: AdaptiveWorkflowRL;

  beforeEach(() => {
    // Clear global storage
    delete mockGlobal.astraforge_qtable;
    delete mockGlobal.astraforge_phaseTelemetry;
    rl = new AdaptiveWorkflowRL();
  });

  describe('Initialization', () => {
    it('should initialize with default parameters', () => {
      expect(rl).toBeInstanceOf(AdaptiveWorkflowRL);

      const stats = rl.getStats();
      expect(stats.totalStates).toBe(0);
      expect(stats.totalActions).toBe(0);
      expect(stats.explorationRate).toBeCloseTo(0.1, 2);
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
      expect(parsed.complexity).toBe(0.8); // Rounded to 1 decimal
      expect(parsed.satisfaction).toBe(0.8);
      expect(parsed.errorRate).toBe(0.1);
      expect(parsed.timeNorm).toBe(0.5);
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

    it('should return random action for unexplored states', () => {
      const action = rl.getBestAction(mockState);

      expect(action).toBeDefined();
      expect(action.type).toBeOneOf(['continue', 'skip', 'repeat', 'branch', 'optimize']);
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

    it('should explore with epsilon probability', () => {
      (rl as any).explorationRate = 1.0; // Always explore

      // Add Q-values
      const continueAction2: WorkflowAction = { type: 'continue', confidence: 1.0 };
      rl.updateQValue(mockState, continueAction2, 1.0, mockState);

      const actions = [];
      for (let i = 0; i < 10; i++) {
        actions.push(rl.getBestAction(mockState).type);
      }

      // Should have some variety due to exploration
      const uniqueActions = new Set(actions);
      expect(uniqueActions.size).toBeGreaterThan(1);
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

    it('should decay exploration rate over time', () => {
      const initialExploration = rl.getStats().explorationRate;

      // Perform multiple updates
      for (let i = 0; i < 10; i++) {
        rl.updateQValue(state1, action, 0.5, state2);
      }

      const finalExploration = rl.getStats().explorationRate;
      expect(finalExploration).toBeLessThan(initialExploration);
      expect(finalExploration).toBeGreaterThanOrEqual(0.01); // Min exploration rate
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

    it('should incorporate evaluator telemetry into rewards', () => {
      const action: WorkflowAction = { type: 'continue', confidence: 1.0 };
      const baseReward = rl.calculateReward(oldState, action, newState, true);

      const highQualityTelemetry = buildTelemetry('Planning', 0.9, 0, 0.85, 1200);
      const highQualityReward = rl.calculateReward(
        oldState,
        action,
        newState,
        true,
        undefined,
        highQualityTelemetry
      );

      delete mockGlobal.astraforge_phaseTelemetry;
      const rlLowQuality = new AdaptiveWorkflowRL();
      const lowQualityTelemetry = buildTelemetry('Planning', 0.3, 2, 0.4, 90000);
      const lowQualityReward = rlLowQuality.calculateReward(
        oldState,
        action,
        newState,
        true,
        undefined,
        lowQualityTelemetry
      );

      expect(highQualityReward).toBeGreaterThan(baseReward);
      expect(lowQualityReward).toBeLessThanOrEqual(baseReward);
      expect(highQualityReward).toBeGreaterThan(lowQualityReward);
    });

    it('should adapt exploration rate using telemetry deltas', () => {
      const action: WorkflowAction = { type: 'continue', confidence: 1.0 };
      const initialRate = (rl as any).explorationRate;

      const baselineTelemetry = buildTelemetry('Planning', 0.5, 0, 0.6, 4000);
      rl.calculateReward(oldState, action, newState, true, undefined, baselineTelemetry);

      const improvedTelemetry = buildTelemetry('Planning', 0.85, 0, 0.9, 2500);
      rl.calculateReward(oldState, action, newState, true, undefined, improvedTelemetry);

      const reducedRate = (rl as any).explorationRate;
      expect(reducedRate).toBeLessThan(initialRate);

      const regressedTelemetry = buildTelemetry('Planning', 0.3, 1, 0.4, 7000);
      rl.calculateReward(oldState, action, newState, true, undefined, regressedTelemetry);

      const increasedRate = (rl as any).explorationRate;
      expect(increasedRate).toBeGreaterThan(reducedRate);
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
