/**
 * Tests for Adaptive Workflow Reinforcement Learning
 * Tests Q-learning implementation for workflow optimization
 */

import { AdaptiveWorkflowRL, WorkflowState, WorkflowAction } from '../../src/rl/adaptiveWorkflow';

describe('AdaptiveWorkflowRL', () => {
  let rlSystem: AdaptiveWorkflowRL;

  beforeEach(() => {
    jest.clearAllMocks();
    rlSystem = new AdaptiveWorkflowRL();
  });

  describe('initialization', () => {
    it('should create AdaptiveWorkflowRL instance', () => {
      expect(rlSystem).toBeInstanceOf(AdaptiveWorkflowRL);
    });

    it('should initialize with default parameters', () => {
      const rl = new AdaptiveWorkflowRL();
      expect(rl).toBeDefined();

      // Should initialize Q-table
      const qTable = (rl as any).qTable;
      expect(qTable).toBeDefined();
      expect(qTable instanceof Map).toBe(true);
    });

    it('should initialize RL parameters correctly', () => {
      const rl = new AdaptiveWorkflowRL();

      // Check default RL parameters
      expect((rl as any).learningRate).toBe(0.1);
      expect((rl as any).discountFactor).toBe(0.9);
      expect((rl as any).explorationRate).toBe(0.1);
      expect((rl as any).minExplorationRate).toBe(0.01);
      expect((rl as any).explorationDecay).toBe(0.995);
    });

    it('should define workflow phases', () => {
      const phases = (rlSystem as any).phases;
      expect(phases).toContain('Planning');
      expect(phases).toContain('Prototyping');
      expect(phases).toContain('Testing');
      expect(phases).toContain('Deployment');
    });

    it('should define workflow actions', () => {
      const actions = (rlSystem as any).actions;
      expect(actions).toHaveLength(5);
      expect(actions.some(a => a.type === 'continue')).toBe(true);
      expect(actions.some(a => a.type === 'skip')).toBe(true);
      expect(actions.some(a => a.type === 'repeat')).toBe(true);
      expect(actions.some(a => a.type === 'branch')).toBe(true);
      expect(actions.some(a => a.type === 'optimize')).toBe(true);
    });
  });

  describe('Q-learning functionality', () => {
    it('should get optimal action using epsilon-greedy policy', () => {
      const state: WorkflowState = {
        currentPhase: 'Planning',
        projectComplexity: 0.5,
        userSatisfaction: 0.8,
        errorRate: 0.1,
        timeSpent: 0.3
      };

      const optimalAction = rlSystem.getOptimalAction(state);

      expect(optimalAction).toBeDefined();
      expect(optimalAction.type).toBeDefined();
      expect(optimalAction.confidence).toBeGreaterThanOrEqual(0);
      expect(optimalAction.confidence).toBeLessThanOrEqual(1);
    });

    it('should calculate reward based on workflow performance', () => {
      const oldState: WorkflowState = {
        currentPhase: 'Planning',
        projectComplexity: 0.3,
        userSatisfaction: 0.7,
        errorRate: 0.2,
        timeSpent: 0.5
      };

      const action: WorkflowAction = {
        type: 'continue',
        confidence: 0.9
      };

      const newState: WorkflowState = {
        currentPhase: 'Prototyping',
        projectComplexity: 0.3,
        userSatisfaction: 0.85,
        errorRate: 0.1,
        timeSpent: 0.6
      };

      const reward = (rlSystem as any).calculateReward(oldState, action, newState, true, 0.9);

      expect(typeof reward).toBe('number');
      expect(reward).toBeGreaterThanOrEqual(-2);
      expect(reward).toBeLessThanOrEqual(2);
    });

    it('should update Q-values using temporal difference learning', () => {
      const state: WorkflowState = {
        currentPhase: 'Planning',
        projectComplexity: 0.4,
        userSatisfaction: 0.7,
        errorRate: 0.1,
        timeSpent: 0.3
      };

      const action: WorkflowAction = {
        type: 'continue',
        confidence: 0.8
      };

      const reward = 1.0;
      const nextState: WorkflowState = {
        currentPhase: 'Prototyping',
        projectComplexity: 0.4,
        userSatisfaction: 0.8,
        errorRate: 0.05,
        timeSpent: 0.4
      };

      const result = rlSystem.updateQValue(state, action, reward, nextState);

      expect(result).toBeDefined();
      expect(typeof result).toBe('number'); // Returns new Q-value
    });

    it('should handle exploration vs exploitation trade-off', () => {
      const state: WorkflowState = {
        currentPhase: 'Testing',
        projectComplexity: 0.6,
        userSatisfaction: 0.7,
        errorRate: 0.15,
        timeSpent: 0.7
      };

      // Test multiple calls to see exploration
      const actions: WorkflowAction[] = [];
      for (let i = 0; i < 10; i++) {
        const action = rlSystem.getOptimalAction(state);
        actions.push(action);
      }

      // Should have some variety due to exploration
      const uniqueActions = new Set(actions.map(a => a.type));
      expect(uniqueActions.size).toBeGreaterThan(1); // Should explore different actions
    });
  });

  describe('state management', () => {
    it('should serialize workflow states', () => {
      const state: WorkflowState = {
        currentPhase: 'Planning',
        projectComplexity: 0.5,
        userSatisfaction: 0.8,
        errorRate: 0.1,
        timeSpent: 0.3
      };

      const serialized = (rlSystem as any).serializeState(state);

      expect(typeof serialized).toBe('string');
      expect(serialized).toContain('Planning');
      expect(serialized).toContain('0.5'); // Complexity rounded to 1 decimal
    });

    it('should serialize workflow actions', () => {
      const action: WorkflowAction = {
        type: 'branch',
        target: 'Testing',
        confidence: 0.7
      };

      const serialized = (rlSystem as any).serializeAction(action);

      expect(typeof serialized).toBe('string');
      expect(serialized).toContain('branch');
      expect(serialized).toContain('Testing');
    });

    it('should deserialize actions correctly', () => {
      const actionKey = JSON.stringify({
        type: 'optimize',
        target: null,
      });

      const deserialized = (rlSystem as any).deserializeAction(actionKey);

      expect(deserialized.type).toBe('optimize');
      expect(deserialized.confidence).toBe(0.8); // Default confidence
    });
  });

  describe('learning and adaptation', () => {
    it('should learn from successful workflows', async () => {
      const initialState: WorkflowState = {
        currentPhase: 'Planning',
        projectComplexity: 0.4,
        userSatisfaction: 0.7,
        errorRate: 0.1,
        timeSpent: 0.2
      };

      const successfulAction: WorkflowAction = {
        type: 'continue',
        confidence: 0.9
      };

      const finalState: WorkflowState = {
        currentPhase: 'Deployment',
        projectComplexity: 0.4,
        userSatisfaction: 0.9,
        errorRate: 0.05,
        timeSpent: 0.8
      };

      // Simulate successful workflow learning
      const reward = (rlSystem as any).calculateReward(initialState, successfulAction, finalState, true, 0.95);
      const newQValue = rlSystem.updateQValue(initialState, successfulAction, reward, finalState);

      expect(newQValue).toBeGreaterThan(0); // Should have positive Q-value for successful action
    });

    it('should learn from failed workflows', async () => {
      const initialState: WorkflowState = {
        currentPhase: 'Testing',
        projectComplexity: 0.6,
        userSatisfaction: 0.5,
        errorRate: 0.3,
        timeSpent: 0.7
      };

      const failedAction: WorkflowAction = {
        type: 'skip',
        confidence: 0.6
      };

      const finalState: WorkflowState = {
        currentPhase: 'Testing',
        projectComplexity: 0.6,
        userSatisfaction: 0.3,
        errorRate: 0.5,
        timeSpent: 0.9
      };

      // Simulate failed workflow learning
      const reward = (rlSystem as any).calculateReward(initialState, failedAction, finalState, false, 0.2);
      const newQValue = rlSystem.updateQValue(initialState, failedAction, reward, finalState);

      expect(newQValue).toBeLessThan(0); // Should have negative Q-value for failed action
    });

    it('should adapt exploration rate over time', () => {
      const initialRate = (rlSystem as any).explorationRate;

      // Simulate many learning iterations
      for (let i = 0; i < 100; i++) {
        rlSystem.getOptimalAction({
          currentPhase: 'Planning',
          projectComplexity: 0.5,
          userSatisfaction: 0.8,
          errorRate: 0.1,
          timeSpent: 0.3
        });
      }

      const finalRate = (rlSystem as any).explorationRate;

      expect(finalRate).toBeLessThan(initialRate); // Should decay exploration rate
      expect(finalRate).toBeGreaterThanOrEqual((rlSystem as any).minExplorationRate);
    });
  });

  describe('performance optimization', () => {
    it('should handle Q-table persistence', () => {
      const rl = new AdaptiveWorkflowRL();

      // Simulate Q-table operations
      expect((rl as any).qTable).toBeDefined();

      // Should be able to save/load Q-table (mocked for testing)
      expect(typeof (rl as any).saveQTable).toBe('function');
      expect(typeof (rl as any).loadQTable).toBe('function');
    });

    it('should provide efficient state lookup', () => {
      const state: WorkflowState = {
        currentPhase: 'Planning',
        projectComplexity: 0.5,
        userSatisfaction: 0.8,
        errorRate: 0.1,
        timeSpent: 0.3
      };

      const startTime = performance.now();
      const action1 = rlSystem.getOptimalAction(state);
      const action2 = rlSystem.getOptimalAction(state);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
      expect(action1.type).toBeDefined();
      expect(action2.type).toBeDefined();
    });

    it('should handle concurrent learning sessions', async () => {
      const states: WorkflowState[] = [
        {
          currentPhase: 'Planning',
          projectComplexity: 0.3,
          userSatisfaction: 0.8,
          errorRate: 0.1,
          timeSpent: 0.2
        },
        {
          currentPhase: 'Testing',
          projectComplexity: 0.6,
          userSatisfaction: 0.7,
          errorRate: 0.2,
          timeSpent: 0.5
        },
        {
          currentPhase: 'Deployment',
          projectComplexity: 0.4,
          userSatisfaction: 0.9,
          errorRate: 0.05,
          timeSpent: 0.8
        }
      ];

      const learningPromises = states.map(state =>
        Promise.resolve(rlSystem.getOptimalAction(state))
      );

      const results = await Promise.allSettled(learningPromises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
        expect((result as any).value.type).toBeDefined();
      });
    });
  });

  describe('integration with workflow system', () => {
    it('should provide optimal actions for workflow phases', () => {
      const phases = ['Planning', 'Prototyping', 'Testing', 'Deployment'];

      phases.forEach(phase => {
        const state: WorkflowState = {
          currentPhase: phase,
          projectComplexity: 0.5,
          userSatisfaction: 0.8,
          errorRate: 0.1,
          timeSpent: 0.3
        };

        const optimalAction = rlSystem.getOptimalAction(state);

        expect(optimalAction).toBeDefined();
        expect(optimalAction.type).toBeDefined();
        expect(optimalAction.confidence).toBeGreaterThan(0);
      });
    });

    it('should adapt to different project complexities', () => {
      const simpleState: WorkflowState = {
        currentPhase: 'Planning',
        projectComplexity: 0.2,
        userSatisfaction: 0.9,
        errorRate: 0.05,
        timeSpent: 0.1
      };

      const complexState: WorkflowState = {
        currentPhase: 'Testing',
        projectComplexity: 0.8,
        userSatisfaction: 0.6,
        errorRate: 0.25,
        timeSpent: 0.7
      };

      const simpleAction = rlSystem.getOptimalAction(simpleState);
      const complexAction = rlSystem.getOptimalAction(complexState);

      // Complex projects might prefer different actions
      expect(simpleAction.type).toBeDefined();
      expect(complexAction.type).toBeDefined();
    });

    it('should learn from workflow feedback', () => {
      const initialState: WorkflowState = {
        currentPhase: 'Planning',
        projectComplexity: 0.4,
        userSatisfaction: 0.7,
        errorRate: 0.1,
        timeSpent: 0.2
      };

      const action: WorkflowAction = {
        type: 'continue',
        confidence: 0.8
      };

      // Simulate positive feedback learning
      const reward = 1.5; // High reward
      const nextState: WorkflowState = {
        currentPhase: 'Prototyping',
        projectComplexity: 0.4,
        userSatisfaction: 0.9,
        errorRate: 0.05,
        timeSpent: 0.3
      };

      const newQValue = rlSystem.updateQValue(initialState, action, reward, nextState);

      expect(newQValue).toBeGreaterThan(0);
      expect(newQValue).toBeGreaterThan(1); // Should be high due to positive reward
    });
  });

  describe('error handling and robustness', () => {
    it('should handle invalid states gracefully', () => {
      const invalidState = {
        currentPhase: 'InvalidPhase',
        projectComplexity: 1.5, // Invalid: > 1
        userSatisfaction: -0.1, // Invalid: < 0
        errorRate: 1.2, // Invalid: > 1
        timeSpent: -0.5 // Invalid: < 0
      } as any;

      const action = rlSystem.getOptimalAction(invalidState);

      expect(action).toBeDefined();
      expect(action.type).toBeDefined();
    });

    it('should handle empty Q-table gracefully', () => {
      const rl = new AdaptiveWorkflowRL();

      // Clear the Q-table to simulate empty state
      (rl as any).qTable.clear();

      const state: WorkflowState = {
        currentPhase: 'Planning',
        projectComplexity: 0.5,
        userSatisfaction: 0.8,
        errorRate: 0.1,
        timeSpent: 0.3
      };

      const action = rlSystem.getOptimalAction(state);

      expect(action).toBeDefined();
      expect(action.type).toBeDefined(); // Should still provide a valid action
    });

    it('should handle learning rate bounds', () => {
      const rl = new AdaptiveWorkflowRL();

      // Test that learning rate stays within bounds
      for (let i = 0; i < 1000; i++) {
        rlSystem.getOptimalAction({
          currentPhase: 'Planning',
          projectComplexity: 0.5,
          userSatisfaction: 0.8,
          errorRate: 0.1,
          timeSpent: 0.3
        });
      }

      const finalRate = (rlSystem as any).explorationRate;
      expect(finalRate).toBeGreaterThanOrEqual((rlSystem as any).minExplorationRate);
      expect(finalRate).toBeLessThanOrEqual(0.1); // Should not exceed initial rate
    });
  });

  describe('workflow optimization', () => {
    it('should optimize phase transitions', () => {
      const currentState: WorkflowState = {
        currentPhase: 'Planning',
        projectComplexity: 0.3,
        userSatisfaction: 0.8,
        errorRate: 0.1,
        timeSpent: 0.2
      };

      const optimalAction = rlSystem.getOptimalAction(currentState);

      expect(optimalAction.type).toBeDefined();
      expect(['continue', 'skip', 'repeat', 'branch', 'optimize']).toContain(optimalAction.type);
    });

    it('should handle phase-specific optimization', () => {
      const planningState: WorkflowState = {
        currentPhase: 'Planning',
        projectComplexity: 0.2,
        userSatisfaction: 0.9,
        errorRate: 0.05,
        timeSpent: 0.1
      };

      const testingState: WorkflowState = {
        currentPhase: 'Testing',
        projectComplexity: 0.6,
        userSatisfaction: 0.7,
        errorRate: 0.2,
        timeSpent: 0.6
      };

      const planningAction = rlSystem.getOptimalAction(planningState);
      const testingAction = rlSystem.getOptimalAction(testingState);

      // Different phases might prefer different actions
      expect(planningAction.type).toBeDefined();
      expect(testingAction.type).toBeDefined();
    });

    it('should learn optimal phase sequencing', async () => {
      const states: WorkflowState[] = [
        {
          currentPhase: 'Planning',
          projectComplexity: 0.4,
          userSatisfaction: 0.8,
          errorRate: 0.1,
          timeSpent: 0.2
        },
        {
          currentPhase: 'Prototyping',
          projectComplexity: 0.4,
          userSatisfaction: 0.85,
          errorRate: 0.08,
          timeSpent: 0.4
        },
        {
          currentPhase: 'Testing',
          projectComplexity: 0.4,
          userSatisfaction: 0.9,
          errorRate: 0.05,
          timeSpent: 0.6
        }
      ];

      // Simulate learning across workflow
      for (let i = 0; i < states.length - 1; i++) {
        const action = { type: 'continue', confidence: 0.9 } as WorkflowAction;
        const reward = (rlSystem as any).calculateReward(states[i], action, states[i + 1], true, 0.9);
        rlSystem.updateQValue(states[i], action, reward, states[i + 1]);
      }

      const finalAction = rlSystem.getOptimalAction(states[states.length - 1]);
      expect(finalAction.type).toBeDefined();
      expect(finalAction.confidence).toBeGreaterThan(0.5); // Should have learned good actions
    });
  });
});
