/**
 * Integration tests for AdaptiveWorkflowRL - Real learning system
 */
import { AdaptiveWorkflowRL } from '../src/rl/adaptiveWorkflow';
import * as dotenv from 'dotenv';
// Load environment variables
dotenv.config();
describe('AdaptiveWorkflowRL Integration', () => {
    let workflowRL;
    beforeEach(() => {
        workflowRL = new AdaptiveWorkflowRL();
    });
    // Helper function to create test states
    const createTestState = (phase, complexity = 0.5) => ({
        currentPhase: phase,
        projectComplexity: complexity,
        userSatisfaction: 0.5,
        errorRate: 0.1,
        timeSpent: 0.3
    });
    // Helper function to create test actions
    const createTestAction = (type, confidence = 0.8) => ({
        type,
        confidence,
        target: type === 'branch' ? 'testing' : undefined
    });
    describe('Initialization', () => {
        it('should initialize with default configuration', () => {
            expect(workflowRL).toBeDefined();
        });
        it('should have proper learning parameters', () => {
            expect(workflowRL).toHaveProperty('getBestAction');
            expect(workflowRL).toHaveProperty('updateQValue');
            expect(workflowRL).toHaveProperty('calculateReward');
        });
    });
    describe('Decision Making', () => {
        it('should provide action recommendations', () => {
            const state = createTestState('initial-phase');
            const action = workflowRL.getBestAction(state);
            expect(action).toBeDefined();
            expect(action).toHaveProperty('type');
            expect(action).toHaveProperty('confidence');
            expect(typeof action.confidence).toBe('number');
            expect(action.confidence).toBeGreaterThanOrEqual(0);
            expect(action.confidence).toBeLessThanOrEqual(1);
        });
        it('should handle different workflow states', () => {
            const phases = ['planning', 'implementation', 'testing', 'deployment'];
            phases.forEach(phase => {
                const state = createTestState(phase);
                const action = workflowRL.getBestAction(state);
                expect(action).toBeDefined();
                expect(action.type).toBeTruthy();
            });
        });
        it('should provide confidence scores for decisions', () => {
            const state = createTestState('complex-task', 0.9);
            const action = workflowRL.getBestAction(state);
            expect(action.confidence).toBeGreaterThanOrEqual(0);
            expect(action.confidence).toBeLessThanOrEqual(1);
        });
    });
    describe('Learning and Adaptation', () => {
        it('should update Q-values based on feedback', () => {
            const state = createTestState('test-state');
            const action = createTestAction('continue');
            const nextState = createTestState('next-state');
            const reward = 0.8;
            // This should not throw
            expect(() => {
                workflowRL.updateQValue(state, action, reward, nextState);
            }).not.toThrow();
        });
        it('should calculate rewards for different outcomes', () => {
            const state = createTestState('reward-test');
            const action = createTestAction('continue');
            const scenarios = [
                { success: true, userSatisfaction: 0.9, timeEfficiency: 0.8 },
                { success: false, userSatisfaction: 0.3, timeEfficiency: 0.5 },
                { success: true, userSatisfaction: 0.7, timeEfficiency: 0.9 }
            ];
            scenarios.forEach(scenario => {
                const newState = createTestState('next-state', 0.6);
                const reward = workflowRL.calculateReward(state, action, newState, scenario.success, scenario.userSatisfaction);
                expect(typeof reward).toBe('number');
                expect(reward).toBeGreaterThanOrEqual(0);
                expect(reward).toBeLessThanOrEqual(1);
            });
        });
        it('should learn from positive and negative feedback', () => {
            const state = createTestState('learning-test');
            const action = createTestAction('continue');
            const nextState = createTestState('next-learning-test');
            // Positive feedback
            workflowRL.updateQValue(state, action, 0.9, nextState);
            const actionAfterPositive = workflowRL.getBestAction(state);
            // Negative feedback
            workflowRL.updateQValue(state, action, 0.1, nextState);
            const actionAfterNegative = workflowRL.getBestAction(state);
            // Both should return valid actions
            expect(actionAfterPositive).toBeDefined();
            expect(actionAfterNegative).toBeDefined();
        });
    });
    describe('State Management', () => {
        it('should handle state transitions', () => {
            const initialState = createTestState('start');
            const nextState = createTestState('planning');
            const initialAction = workflowRL.getBestAction(initialState);
            const nextAction = workflowRL.getBestAction(nextState);
            expect(initialAction).toBeDefined();
            expect(nextAction).toBeDefined();
            expect(initialAction.type).toBeTruthy();
            expect(nextAction.type).toBeTruthy();
        });
        it('should maintain state consistency', () => {
            const state = createTestState('consistent-state');
            // Multiple calls to same state should be consistent
            const action1 = workflowRL.getBestAction(state);
            const action2 = workflowRL.getBestAction(state);
            expect(action1.type).toBe(action2.type);
        });
    });
    describe('Performance and Efficiency', () => {
        it('should make decisions quickly', () => {
            const startTime = Date.now();
            for (let i = 0; i < 100; i++) {
                const state = createTestState(`state-${i}`, Math.random());
                workflowRL.getBestAction(state);
            }
            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(1000); // Should be very fast
        });
        it('should handle concurrent decision requests', async () => {
            const promises = Array(10).fill(0).map((_, i) => Promise.resolve(workflowRL.getBestAction(createTestState(`concurrent-state-${i}`))));
            const results = await Promise.all(promises);
            expect(results).toHaveLength(10);
            results.forEach(result => {
                expect(result).toBeDefined();
                expect(result.type).toBeTruthy();
            });
        });
    });
    describe('Error Handling', () => {
        it('should handle invalid states gracefully', () => {
            const invalidStates = [
                null,
                undefined,
                {},
                { currentPhase: '', projectComplexity: -1, userSatisfaction: 2, errorRate: -1, timeSpent: -1 }
            ];
            invalidStates.forEach(state => {
                expect(() => {
                    workflowRL.getBestAction(state);
                }).not.toThrow();
            });
        });
        it('should handle invalid rewards gracefully', () => {
            const state = createTestState('test-state');
            const action = createTestAction('continue');
            const nextState = createTestState('next-state');
            const invalidRewards = [NaN, Infinity, -Infinity];
            invalidRewards.forEach(reward => {
                expect(() => {
                    workflowRL.updateQValue(state, action, reward, nextState);
                }).not.toThrow();
            });
        });
        it('should provide fallback actions when needed', () => {
            const unknownState = createTestState('completely-unknown-state-12345', 0.99);
            const action = workflowRL.getBestAction(unknownState);
            expect(action).toBeDefined();
            expect(action.type).toBeTruthy();
            expect(typeof action.confidence).toBe('number');
        });
    });
});
//# sourceMappingURL=adaptiveWorkflow.test.js.map