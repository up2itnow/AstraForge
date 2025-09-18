/**
 * Reinforcement Learning module for adaptive workflow optimization
 * Uses Q-learning to optimize phase sequencing and decision making
 */
export class AdaptiveWorkflowRL {
    constructor() {
        this.qTable = new Map();
        this.learningRate = 0.1;
        this.discountFactor = 0.9;
        this.explorationRate = 0.1;
        this.minExplorationRate = 0.01;
        this.explorationDecay = 0.995;
        this.phases = ['Planning', 'Prototyping', 'Testing', 'Deployment'];
        this.actions = [
            { type: 'continue', confidence: 1.0 },
            { type: 'skip', confidence: 0.8 },
            { type: 'repeat', confidence: 0.9 },
            { type: 'branch', target: 'Testing', confidence: 0.7 },
            { type: 'optimize', confidence: 0.6 }
        ];
        this.loadQTable();
    }
    /**
     * Get the best action for a given state using epsilon-greedy policy
     */
    getBestAction(state) {
        const stateKey = this.serializeState(state);
        // Epsilon-greedy exploration
        if (Math.random() < this.explorationRate) {
            return this.getRandomAction();
        }
        // Get best known action
        const stateActions = this.qTable.get(stateKey);
        if (!stateActions || stateActions.size === 0) {
            return this.getRandomAction();
        }
        let bestAction = this.actions[0];
        let bestQValue = -Infinity;
        for (const [actionKey, entry] of stateActions) {
            if (entry.qValue > bestQValue) {
                bestQValue = entry.qValue;
                bestAction = this.deserializeAction(actionKey);
            }
        }
        console.log(`RL: Selected action ${bestAction.type} for state ${stateKey} (Q-value: ${bestQValue.toFixed(3)})`);
        return bestAction;
    }
    /**
     * Update Q-value based on reward received
     */
    updateQValue(state, action, reward, nextState) {
        const stateKey = this.serializeState(state);
        const actionKey = this.serializeAction(action);
        const nextStateKey = this.serializeState(nextState);
        // Initialize state in Q-table if not exists
        if (!this.qTable.has(stateKey)) {
            this.qTable.set(stateKey, new Map());
        }
        const stateActions = this.qTable.get(stateKey);
        // Initialize action if not exists
        if (!stateActions.has(actionKey)) {
            stateActions.set(actionKey, {
                state: stateKey,
                action: actionKey,
                qValue: 0,
                visits: 0
            });
        }
        const entry = stateActions.get(actionKey);
        // Get max Q-value for next state
        const nextStateActions = this.qTable.get(nextStateKey);
        let maxNextQValue = 0;
        if (nextStateActions) {
            for (const nextEntry of nextStateActions.values()) {
                maxNextQValue = Math.max(maxNextQValue, nextEntry.qValue);
            }
        }
        // Q-learning update rule
        const oldQValue = entry.qValue;
        const newQValue = oldQValue + this.learningRate * (reward + this.discountFactor * maxNextQValue - oldQValue);
        entry.qValue = newQValue;
        entry.visits++;
        // Decay exploration rate
        this.explorationRate = Math.max(this.minExplorationRate, this.explorationRate * this.explorationDecay);
        console.log(`RL: Updated Q(${stateKey}, ${actionKey}) from ${oldQValue.toFixed(3)} to ${newQValue.toFixed(3)} (reward: ${reward.toFixed(3)})`);
        // Save updated Q-table periodically
        if (entry.visits % 10 === 0) {
            this.saveQTable();
        }
    }
    /**
     * Calculate reward based on workflow performance
     */
    calculateReward(oldState, action, newState, phaseSuccess, userFeedback) {
        let reward = 0;
        // Base reward for phase success
        if (phaseSuccess) {
            reward += 1.0;
        }
        else {
            reward -= 0.5;
        }
        // Reward for improving user satisfaction
        const satisfactionImprovement = newState.userSatisfaction - oldState.userSatisfaction;
        reward += satisfactionImprovement * 2.0;
        // Penalty for increasing error rate
        const errorIncrease = newState.errorRate - oldState.errorRate;
        reward -= errorIncrease * 1.5;
        // Reward for efficient time usage
        if (newState.timeSpent < oldState.timeSpent && phaseSuccess) {
            reward += 0.3;
        }
        // Action-specific rewards
        switch (action.type) {
            case 'continue':
                if (phaseSuccess && newState.userSatisfaction > 0.7) {
                    reward += 0.2;
                }
                break;
            case 'skip':
                if (oldState.projectComplexity < 0.3 && phaseSuccess) {
                    reward += 0.4; // Good to skip for simple projects
                }
                else {
                    reward -= 0.3; // Risky for complex projects
                }
                break;
            case 'repeat':
                if (oldState.errorRate > 0.5 && newState.errorRate < oldState.errorRate) {
                    reward += 0.5; // Good decision to repeat when there were errors
                }
                break;
            case 'optimize':
                if (newState.timeSpent < oldState.timeSpent * 0.8) {
                    reward += 0.6; // Significant time improvement
                }
                break;
        }
        // User feedback integration
        if (userFeedback !== undefined) {
            reward += (userFeedback - 0.5) * 2.0; // Scale 0-1 feedback to -1 to +1
        }
        return Math.max(-2.0, Math.min(2.0, reward)); // Clamp reward between -2 and +2
    }
    getRandomAction() {
        return this.actions[Math.floor(Math.random() * this.actions.length)];
    }
    serializeState(state) {
        return JSON.stringify({
            phase: state.currentPhase,
            complexity: Math.round(state.projectComplexity * 10) / 10,
            satisfaction: Math.round(state.userSatisfaction * 10) / 10,
            errorRate: Math.round(state.errorRate * 10) / 10,
            timeNorm: Math.round(state.timeSpent * 10) / 10
        });
    }
    serializeAction(action) {
        return JSON.stringify({
            type: action.type,
            target: action.target || null
        });
    }
    deserializeAction(actionKey) {
        const parsed = JSON.parse(actionKey);
        return {
            type: parsed.type,
            target: parsed.target,
            confidence: 0.8 // Default confidence for deserialized actions
        };
    }
    saveQTable() {
        try {
            const serialized = Array.from(this.qTable.entries()).map(([stateKey, actions]) => ({
                state: stateKey,
                actions: Array.from(actions.entries()).map(([actionKey, entry]) => ({
                    action: actionKey,
                    qValue: entry.qValue,
                    visits: entry.visits
                }))
            }));
            // Store in memory for now - in VS Code extension, this would use vscode.ExtensionContext.globalState
            global.astraforge_qtable = serialized;
            console.log(`RL: Saved Q-table with ${this.qTable.size} states`);
        }
        catch (error) {
            console.warn('RL: Failed to save Q-table:', error);
        }
    }
    loadQTable() {
        try {
            const saved = global.astraforge_qtable;
            if (!saved)
                return;
            const serialized = saved;
            for (const stateData of serialized) {
                const stateActions = new Map();
                for (const actionData of stateData.actions) {
                    stateActions.set(actionData.action, {
                        state: stateData.state,
                        action: actionData.action,
                        qValue: actionData.qValue,
                        visits: actionData.visits
                    });
                }
                this.qTable.set(stateData.state, stateActions);
            }
            console.log(`RL: Loaded Q-table with ${this.qTable.size} states`);
        }
        catch (error) {
            console.warn('RL: Failed to load Q-table:', error);
        }
    }
    /**
     * Get learning statistics for monitoring
     */
    getStats() {
        let totalActions = 0;
        for (const actions of this.qTable.values()) {
            totalActions += actions.size;
        }
        return {
            totalStates: this.qTable.size,
            totalActions,
            explorationRate: this.explorationRate
        };
    }
}
//# sourceMappingURL=adaptiveWorkflow.js.map