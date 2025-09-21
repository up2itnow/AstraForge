/**
 * Reinforcement Learning module for adaptive workflow optimization
 * Uses Q-learning to optimize phase sequencing and decision making
 */

import { PhaseTelemetry } from '../testing/phaseEvaluator';

interface WorkflowState {
  currentPhase: string;
  projectComplexity: number; // 0-1 scale
  userSatisfaction: number; // 0-1 scale from feedback
  errorRate: number; // 0-1 scale
  timeSpent: number; // normalized time
}

interface WorkflowAction {
  type: 'continue' | 'skip' | 'repeat' | 'branch' | 'optimize';
  target?: string; // target phase or optimization
  confidence: number; // 0-1 scale
}

interface QTableEntry {
  state: string; // serialized state
  action: string; // serialized action
  qValue: number;
  visits: number;
}

export class AdaptiveWorkflowRL {
  private qTable: Map<string, Map<string, QTableEntry>> = new Map();
  private learningRate = 0.1;
  private discountFactor = 0.9;
  private explorationRate = 0.1;
  private minExplorationRate = 0.01;
  private explorationDecay = 0.995;
  private telemetryHistory: PhaseTelemetry[] = [];
  private readonly maxTelemetryHistory = 50;

  private readonly phases = ['Planning', 'Prototyping', 'Testing', 'Deployment'];
  private readonly actions: WorkflowAction[] = [
    { type: 'continue', confidence: 1.0 },
    { type: 'skip', confidence: 0.8 },
    { type: 'repeat', confidence: 0.9 },
    { type: 'branch', target: 'Testing', confidence: 0.7 },
    { type: 'optimize', confidence: 0.6 },
  ];

  constructor() {
    this.loadQTable();
    this.loadTelemetryHistory();
  }

  /**
   * Get the best action for a given state using epsilon-greedy policy
   */
  getBestAction(state: WorkflowState): WorkflowAction {
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

    let bestAction: WorkflowAction = this.actions[0];
    let bestQValue = -Infinity;

    for (const [actionKey, entry] of stateActions) {
      if (entry.qValue > bestQValue) {
        bestQValue = entry.qValue;
        bestAction = this.deserializeAction(actionKey);
      }
    }

    console.log(
      `RL: Selected action ${bestAction.type} for state ${stateKey} (Q-value: ${bestQValue.toFixed(3)})`
    );
    return bestAction;
  }

  /**
   * Update Q-value based on reward received
   */
  updateQValue(
    state: WorkflowState,
    action: WorkflowAction,
    reward: number,
    nextState: WorkflowState
  ): void {
    const stateKey = this.serializeState(state);
    const actionKey = this.serializeAction(action);
    const nextStateKey = this.serializeState(nextState);

    // Initialize state in Q-table if not exists
    if (!this.qTable.has(stateKey)) {
      this.qTable.set(stateKey, new Map());
    }

    const stateActions = this.qTable.get(stateKey)!;

    // Initialize action if not exists
    if (!stateActions.has(actionKey)) {
      stateActions.set(actionKey, {
        state: stateKey,
        action: actionKey,
        qValue: 0,
        visits: 0,
      });
    }

    const entry = stateActions.get(actionKey)!;

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
    const newQValue =
      oldQValue + this.learningRate * (reward + this.discountFactor * maxNextQValue - oldQValue);

    entry.qValue = newQValue;
    entry.visits++;

    // Decay exploration rate
    this.explorationRate = Math.max(
      this.minExplorationRate,
      this.explorationRate * this.explorationDecay
    );

    console.log(
      `RL: Updated Q(${stateKey}, ${actionKey}) from ${oldQValue.toFixed(3)} to ${newQValue.toFixed(3)} (reward: ${reward.toFixed(3)})`
    );

    // Save updated Q-table periodically
    if (entry.visits % 10 === 0) {
      this.saveQTable();
    }
  }

  /**
   * Calculate reward based on workflow performance
   */
  calculateReward(
    oldState: WorkflowState,
    action: WorkflowAction,
    newState: WorkflowState,
    phaseSuccess: boolean,
    userFeedback?: number,
    telemetry?: PhaseTelemetry
  ): number {
    let reward = 0;

    // Base reward for phase success
    if (phaseSuccess) {
      reward += 1.0;
    } else {
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
        } else {
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

    if (telemetry) {
      const previousTelemetry = this.getPreviousTelemetry(telemetry.phase);
      const qualityMetric = this.extractMetricValue(telemetry, 'quality.score');
      if (qualityMetric !== undefined) {
        reward += (qualityMetric - 0.6); // baseline expectation of 0.6 quality
      }

      if (previousTelemetry && qualityMetric !== undefined) {
        const previousQuality = this.extractMetricValue(previousTelemetry, 'quality.score');
        if (previousQuality !== undefined) {
          const qualityDelta = qualityMetric - previousQuality;
          reward += qualityDelta * 1.2;
          this.adjustExplorationRate(qualityDelta);
        }
      }

      const coverageAverage = this.getCoverageAverage(telemetry);
      if (coverageAverage !== undefined) {
        reward += (coverageAverage - 0.75) * 0.5;
        if (previousTelemetry) {
          const previousCoverage = this.getCoverageAverage(previousTelemetry);
          if (previousCoverage !== undefined) {
            reward += (coverageAverage - previousCoverage) * 0.5;
          }
        }
      }

      const defectMetric = this.extractMetricValue(telemetry, 'defects.count');
      if (defectMetric !== undefined) {
        reward -= Math.min(1.5, defectMetric * 0.3);
      }

      const latencyMetric = this.extractMetricValue(telemetry, 'latency.totalMs');
      if (latencyMetric !== undefined) {
        const normalizedLatency = Math.min(1, latencyMetric / (60 * 1000));
        reward -= normalizedLatency * 0.2;
      }

      this.recordTelemetry(telemetry);
    }

    return Math.max(-2.0, Math.min(2.0, reward)); // Clamp reward between -2 and +2
  }

  private getRandomAction(): WorkflowAction {
    return this.actions[Math.floor(Math.random() * this.actions.length)];
  }

  private serializeState(state: WorkflowState): string {
    return JSON.stringify({
      phase: state.currentPhase,
      complexity: Math.round(state.projectComplexity * 10) / 10,
      satisfaction: Math.round(state.userSatisfaction * 10) / 10,
      errorRate: Math.round(state.errorRate * 10) / 10,
      timeNorm: Math.round(state.timeSpent * 10) / 10,
    });
  }

  private serializeAction(action: WorkflowAction): string {
    return JSON.stringify({
      type: action.type,
      target: action.target || null,
    });
  }

  private deserializeAction(actionKey: string): WorkflowAction {
    const parsed = JSON.parse(actionKey);
    return {
      type: parsed.type,
      target: parsed.target,
      confidence: 0.8, // Default confidence for deserialized actions
    };
  }

  private saveQTable(): void {
    try {
      const serialized = Array.from(this.qTable.entries()).map(([stateKey, actions]) => ({
        state: stateKey,
        actions: Array.from(actions.entries()).map(([actionKey, entry]) => ({
          action: actionKey,
          qValue: entry.qValue,
          visits: entry.visits,
        })),
      }));

      // Store in memory for now - in VS Code extension, this would use vscode.ExtensionContext.globalState
      (global as any).astraforge_qtable = serialized;
      console.log(`RL: Saved Q-table with ${this.qTable.size} states`);
    } catch (error) {
      console.warn('RL: Failed to save Q-table:', error);
    }
  }

  private recordTelemetry(telemetry: PhaseTelemetry): void {
    this.telemetryHistory.push(telemetry);
    if (this.telemetryHistory.length > this.maxTelemetryHistory) {
      this.telemetryHistory.shift();
    }

    this.saveTelemetryHistory();
  }

  private getPreviousTelemetry(phase: string): PhaseTelemetry | undefined {
    for (let index = this.telemetryHistory.length - 1; index >= 0; index--) {
      const entry = this.telemetryHistory[index];
      if (entry.phase === phase) {
        return entry;
      }
    }
    return undefined;
  }

  private extractMetricValue(telemetry: PhaseTelemetry, key: string): number | undefined {
    const metric = telemetry.metrics.find(item => item.key === key);
    if (!metric || typeof metric.value !== 'number') {
      return undefined;
    }
    return metric.value;
  }

  private getCoverageAverage(telemetry: PhaseTelemetry): number | undefined {
    const coverageMetrics = telemetry.metrics.filter(metric =>
      metric.key.startsWith('coverage.')
    );
    if (coverageMetrics.length === 0) {
      return undefined;
    }
    const total = coverageMetrics.reduce((sum, metric) => sum + metric.value, 0);
    return total / coverageMetrics.length;
  }

  private adjustExplorationRate(deltaQuality: number): void {
    if (!Number.isFinite(deltaQuality) || deltaQuality === 0) {
      return;
    }

    if (deltaQuality > 0.02) {
      this.explorationRate = Math.max(
        this.minExplorationRate,
        this.explorationRate * 0.9
      );
    } else if (deltaQuality < -0.02) {
      this.explorationRate = Math.min(0.5, this.explorationRate * 1.1 + 0.01);
    }
  }

  private saveTelemetryHistory(): void {
    try {
      (global as any).astraforge_phaseTelemetry = this.telemetryHistory;
    } catch (error) {
      console.warn('RL: Failed to save telemetry history:', error);
    }
  }

  private loadTelemetryHistory(): void {
    try {
      const saved = (global as any).astraforge_phaseTelemetry;
      if (!saved || !Array.isArray(saved)) {
        return;
      }

      this.telemetryHistory = saved;
    } catch (error) {
      console.warn('RL: Failed to load telemetry history:', error);
    }
  }

  private loadQTable(): void {
    try {
      const saved = (global as any).astraforge_qtable;
      if (!saved) return;

      const serialized = saved;
      for (const stateData of serialized) {
        const stateActions = new Map<string, QTableEntry>();
        for (const actionData of stateData.actions) {
          stateActions.set(actionData.action, {
            state: stateData.state,
            action: actionData.action,
            qValue: actionData.qValue,
            visits: actionData.visits,
          });
        }
        this.qTable.set(stateData.state, stateActions);
      }

      console.log(`RL: Loaded Q-table with ${this.qTable.size} states`);
    } catch (error) {
      console.warn('RL: Failed to load Q-table:', error);
    }
  }

  /**
   * Get learning statistics for monitoring
   */
  getStats(): { totalStates: number; totalActions: number; explorationRate: number } {
    let totalActions = 0;
    for (const actions of this.qTable.values()) {
      totalActions += actions.size;
    }

    return {
      totalStates: this.qTable.size,
      totalActions,
      explorationRate: this.explorationRate,
    };
  }
}
