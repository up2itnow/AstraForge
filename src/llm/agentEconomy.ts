import { LLMManager } from './llmManager';
import { LLMConfig, ProviderMetricsSummary } from './interfaces';

export interface EconomyRequestContext {
  requestId: string;
  prompt: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  costBudget?: number;
  contextType: 'workflow' | 'collaboration';
  expectedParticipants?: number;
  metadata?: Record<string, any>;
}

export interface RoutingAllocation {
  provider: LLMConfig['provider'];
  model: string;
  role: 'primary' | 'secondary' | 'support';
  weight: number;
  maxTokens: number;
  expectedTokens: number;
  expectedCostUsd: number;
  expectedLatencyMs: number;
  score: number;
  capacityScore: number;
}

export interface RoutingPlan {
  requestId: string;
  contextType: EconomyRequestContext['contextType'];
  priority: EconomyRequestContext['priority'];
  budgetTokens?: number;
  totalEstimatedTokens: number;
  totalEstimatedCostUsd: number;
  allocations: RoutingAllocation[];
  createdAt: number;
  metadata?: Record<string, any>;
}

interface CandidateScore {
  config: LLMConfig;
  metrics?: ProviderMetricsSummary;
  score: number;
  normalized: {
    latency: number;
    cost: number;
    reliability: number;
  };
  avgTokens: number;
  avgLatency: number;
  avgCost: number;
}

export class AgentEconomy {
  constructor(private llmManager: LLMManager) {}

  createRoutingPlan(context: EconomyRequestContext): RoutingPlan {
    const configs = this.llmManager.getPanelConfigurations();
    const createdAt = Date.now();

    if (configs.length === 0) {
      return {
        requestId: context.requestId,
        contextType: context.contextType,
        priority: context.priority,
        budgetTokens: context.costBudget,
        totalEstimatedTokens: 0,
        totalEstimatedCostUsd: 0,
        allocations: [],
        createdAt,
        metadata: {
          message: 'No providers configured for routing',
          ...context.metadata
        }
      };
    }

    const providerMetrics = this.llmManager.getProviderMetricsSummary();
    const metricsMap = new Map<string, ProviderMetricsSummary>();
    providerMetrics.forEach(summary => {
      metricsMap.set(`${summary.provider}:${summary.model}`, summary);
    });

    const candidates = configs.map(config => {
      const metrics = metricsMap.get(`${config.provider}:${config.model}`);
      const avgLatency = metrics?.avgLatencyMs ?? 2500;
      const avgTokens = metrics && metrics.successfulRequests > 0
        ? metrics.totalTokens / metrics.successfulRequests
        : Math.min(config.maxTokens ?? 1200, 1200);
      const avgCost = metrics?.avgCostUsd ?? this.llmManager.estimateCostFromTotalTokens(config.provider, avgTokens);

      return {
        config,
        metrics,
        avgLatency,
        avgTokens,
        avgCost,
        score: 0,
        normalized: { latency: 0, cost: 0, reliability: 0 }
      } as CandidateScore;
    });

    const latencyValues = candidates.map(candidate => candidate.avgLatency);
    const costValues = candidates.map(candidate => candidate.avgCost);
    const reliabilityValues = candidates.map(candidate => candidate.metrics?.successRate ?? 0.7);

    const maxLatency = Math.max(...latencyValues);
    const minLatency = Math.min(...latencyValues);
    const maxCost = Math.max(...costValues);
    const minCost = Math.min(...costValues);
    const maxReliability = Math.max(...reliabilityValues);
    const minReliability = Math.min(...reliabilityValues);

    const weights = this.getPriorityWeights(context.priority);

    candidates.forEach((candidate, index) => {
      const reliability = candidate.metrics?.successRate ?? 0.7;
      const normalizedLatency = maxLatency === minLatency
        ? 1
        : (maxLatency - candidate.avgLatency) / (maxLatency - minLatency);
      const normalizedCost = maxCost === minCost
        ? 1
        : (maxCost - candidate.avgCost) / (maxCost - minCost);
      const normalizedReliability = maxReliability === minReliability
        ? 1
        : (reliability - minReliability) / (maxReliability - minReliability);

      candidate.normalized = {
        latency: normalizedLatency,
        cost: normalizedCost,
        reliability: normalizedReliability
      };

      candidate.score =
        normalizedLatency * weights.latency +
        normalizedCost * weights.cost +
        normalizedReliability * weights.reliability +
        this.getRoleBonus(index, context.priority);
    });

    const sortedCandidates = candidates.sort((a, b) => b.score - a.score);

    const budgetTokens = typeof context.costBudget === 'number' ? context.costBudget : Number.POSITIVE_INFINITY;
    let remainingBudget = budgetTokens;
    const selected: { candidate: CandidateScore; expectedTokens: number }[] = [];
    const tokenScaling = this.getPriorityTokenScaling(context.priority);

    for (const candidate of sortedCandidates) {
      const estimatedTokens = Math.max(200, Math.round(candidate.avgTokens * tokenScaling));
      const maxTokens = candidate.config.maxTokens ?? Math.max(estimatedTokens, 4000);
      const cappedTokens = Math.min(estimatedTokens, maxTokens);

      if (selected.length === 0 || !Number.isFinite(remainingBudget) || remainingBudget >= cappedTokens) {
        selected.push({ candidate, expectedTokens: cappedTokens });
        if (Number.isFinite(remainingBudget)) {
          remainingBudget = Math.max(0, remainingBudget - cappedTokens);
        }
      }

      if (selected.length >= (context.expectedParticipants || configs.length)) {
        break;
      }
    }

    if (selected.length === 0) {
      const topCandidate = sortedCandidates[0];
      const fallbackTokens = Math.max(200, Math.round(topCandidate.avgTokens * tokenScaling));
      selected.push({ candidate: topCandidate, expectedTokens: fallbackTokens });
    }

    const allocations = this.buildAllocations(selected);
    const totalEstimatedTokens = allocations.reduce((sum, allocation) => sum + allocation.expectedTokens, 0);
    const totalEstimatedCostUsd = allocations.reduce((sum, allocation) => sum + allocation.expectedCostUsd, 0);

    return {
      requestId: context.requestId,
      contextType: context.contextType,
      priority: context.priority,
      budgetTokens: context.costBudget,
      totalEstimatedTokens,
      totalEstimatedCostUsd,
      allocations,
      createdAt,
      metadata: context.metadata
    };
  }

  private buildAllocations(selected: { candidate: CandidateScore; expectedTokens: number }[]): RoutingAllocation[] {
    const supports = Math.max(0, selected.length - 2);
    const primaryWeight = 0.5;
    const secondaryWeight = selected.length > 1 ? 0.3 : 0;
    const supportWeightPool = Math.max(0, 1 - (primaryWeight + secondaryWeight));
    const supportWeight = supports > 0 ? supportWeightPool / supports : 0;

    return selected.map(({ candidate, expectedTokens }, index) => {
      const role = this.determineRole(index);
      const weight =
        role === 'primary'
          ? primaryWeight
          : role === 'secondary'
          ? secondaryWeight
          : supportWeight;
      const expectedCostUsd = this.llmManager.estimateCostFromTotalTokens(
        candidate.config.provider,
        expectedTokens
      );
      const capacityScore = Math.max(
        0.1,
        Math.min(1, 1 - expectedTokens / Math.max(candidate.config.maxTokens ?? expectedTokens * 2, 1))
      );

      return {
        provider: candidate.config.provider,
        model: candidate.config.model,
        role,
        weight,
        maxTokens: candidate.config.maxTokens ?? expectedTokens,
        expectedTokens,
        expectedCostUsd,
        expectedLatencyMs: candidate.avgLatency,
        score: Number(candidate.score.toFixed(3)),
        capacityScore: Number(capacityScore.toFixed(3))
      };
    });
  }

  private determineRole(index: number): RoutingAllocation['role'] {
    if (index === 0) {
      return 'primary';
    }
    if (index === 1) {
      return 'secondary';
    }
    return 'support';
  }

  private getPriorityWeights(priority: EconomyRequestContext['priority']): {
    latency: number;
    cost: number;
    reliability: number;
  } {
    switch (priority) {
      case 'critical':
        return { latency: 0.45, cost: 0.2, reliability: 0.35 };
      case 'high':
        return { latency: 0.4, cost: 0.25, reliability: 0.35 };
      case 'low':
        return { latency: 0.25, cost: 0.45, reliability: 0.3 };
      default:
        return { latency: 0.3, cost: 0.35, reliability: 0.35 };
    }
  }

  private getPriorityTokenScaling(priority: EconomyRequestContext['priority']): number {
    switch (priority) {
      case 'critical':
        return 1.4;
      case 'high':
        return 1.2;
      case 'low':
        return 0.8;
      default:
        return 1;
    }
  }

  private getRoleBonus(index: number, priority: EconomyRequestContext['priority']): number {
    if (index === 0) {
      return priority === 'critical' ? 0.1 : 0.05;
    }
    if (index === 1) {
      return priority === 'low' ? 0.02 : 0.04;
    }
    return 0;
  }
}
