/**
 * Strategy Optimizer for Meta-Learning System
 *
 * Optimizes learning strategies by:
 * 1. Analyzing strategy performance across different project types
 * 2. Dynamically adjusting strategy parameters
 * 3. Creating new strategies based on successful patterns
 * 4. Evolutionary optimization of strategy configurations
 */

import { LearningStrategy, ProjectPattern, _PerformanceMetric } from '../MetaLearningSystem';
import { _logger } from '../../utils/logger';

export interface StrategyPerformance {
  strategyId: string;
  projectType: string;
  successRate: number;
  avgSatisfaction: number;
  avgDuration: number;
  confidence: number;
  sampleSize: number;
  lastUpdated: Date;
}

export interface StrategyEvolution {
  parentStrategyId: string;
  evolvedStrategy: LearningStrategy;
  evolutionType: 'mutation' | 'crossover' | 'specialization';
  performanceImprovement: number;
  timestamp: Date;
}

export interface OptimizationSuggestion {
  strategyId: string;
  suggestion: string;
  expectedImprovement: number;
  confidence: number;
  reasoning: string;
}

export class StrategyOptimizer {
  private performanceHistory: StrategyPerformance[] = [];
  private evolutionHistory: StrategyEvolution[] = [];

  /**
   * Analyze strategy performance across project patterns
   */
  analyzeStrategyPerformance(
    strategies: Map<string, LearningStrategy>,
    patterns: Map<string, ProjectPattern>
  ): StrategyPerformance[] {
    const _performances: StrategyPerformance[] = [];

    for (const [strategyId, strategy] of strategies.entries()) {
      const relevantPatterns = Array.from(patterns.values()).filter(pattern =>
        strategy.targetProjectTypes.includes(pattern.projectType)
      );

      if (relevantPatterns.length < 3) continue;

      const successCount = relevantPatterns.filter(p => p.success).length;
      const successRate = successCount / relevantPatterns.length;
      const avgSatisfaction = relevantPatterns.reduce((sum, p) => sum + p.userSatisfaction, 0) / relevantPatterns.length;
      const avgDuration = relevantPatterns.reduce((sum, p) => sum + p.duration, 0) / relevantPatterns.length;

      // Calculate confidence based on sample size and consistency
      const confidence = Math.min(
        Math.sqrt(relevantPatterns.length) / 10, // More samples = higher confidence
        successRate > 0.8 ? 0.9 : 0.7 // High success rate = higher confidence
      );

      _performances.push({
        strategyId,
        projectType: strategy.targetProjectTypes[0], // Primary project type
        successRate,
        avgSatisfaction,
        avgDuration,
        confidence,
        sampleSize: relevantPatterns.length,
        lastUpdated: new Date()
      });
    }

    this.performanceHistory = _performances;
    return _performances;
  }

  /**
   * Optimize a strategy based on performance data
   */
  optimizeStrategy(
    strategy: LearningStrategy,
    patterns: ProjectPattern[]
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const relevantPatterns = patterns.filter(p =>
      strategy.targetProjectTypes.includes(p.projectType)
    );

    if (relevantPatterns.length < 5) {
      return suggestions;
    }

    // Analyze agent count optimization
    const agentCountAnalysis = this.analyzeAgentCountOptimization(strategy, relevantPatterns);
    if (agentCountAnalysis) {
      suggestions.push(agentCountAnalysis);
    }

    // Analyze collaboration rounds optimization
    const roundsAnalysis = this.analyzeRoundsOptimization(strategy, relevantPatterns);
    if (roundsAnalysis) {
      suggestions.push(roundsAnalysis);
    }

    // Analyze context window optimization
    const contextAnalysis = this.analyzeContextOptimization(strategy, relevantPatterns);
    if (contextAnalysis) {
      suggestions.push(contextAnalysis);
    }

    return suggestions;
  }

  /**
   * Evolve strategies through genetic algorithms
   */
  evolveStrategies(
    strategies: Map<string, LearningStrategy>,
    patterns: Map<string, ProjectPattern>
  ): StrategyEvolution[] {
    const evolutions: StrategyEvolution[] = [];

    // Get top-performing strategies
    const _performances = this.analyzeStrategyPerformance(strategies, patterns);
    const topPerformers = _performances
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 3);

    if (topPerformers.length < 2) return evolutions;

    // Create evolved strategies
    const mutations = this.createMutations(strategies, topPerformers, patterns);
    const crossovers = this.createCrossovers(strategies, topPerformers);

    evolutions.push(...mutations, ...crossovers);

    this.evolutionHistory = evolutions;
    return evolutions;
  }

  /**
   * Create a new strategy based on successful patterns
   */
  createSpecializedStrategy(
    baseStrategy: LearningStrategy,
    targetProjectType: string,
    successfulPatterns: ProjectPattern[]
  ): LearningStrategy {
    const specializedStrategy: LearningStrategy = {
      ...baseStrategy,
      id: `${baseStrategy.id}_${targetProjectType}_${Date.now()}`,
      name: `${baseStrategy.name} - ${targetProjectType} Specialized`,
      description: `Specialized version of ${baseStrategy.name} optimized for ${targetProjectType}`,
      targetProjectTypes: [targetProjectType],
      configuration: { ...baseStrategy.configuration },
      performanceHistory: [],
      adaptationRules: [...baseStrategy.adaptationRules]
    };

    // Optimize configuration based on successful patterns
    const avgComplexity = successfulPatterns.reduce((sum, p) => sum + p.complexity, 0) / successfulPatterns.length;
    const avgTeamSize = successfulPatterns.reduce((sum, p) => sum + p.teamSize, 0) / successfulPatterns.length;

    // Adjust agent count based on complexity and team size
    const optimalAgentCount = Math.min(5, Math.max(2,
      Math.ceil(avgComplexity * 4 + avgTeamSize / 2)
    ));
    specializedStrategy.configuration.agentCount = optimalAgentCount;

    // Adjust collaboration rounds based on success factors
    const successfulProjects = successfulPatterns.filter(p => p.success);
    if (successfulProjects.length > 0) {
      const avgCollaborationScore = successfulProjects.reduce((sum, p) => sum + p.aiCollaborationScore, 0) / successfulProjects.length;
      if (avgCollaborationScore > 0.8) {
        specializedStrategy.configuration.collaborationRounds += 1;
      }
    }

    // Add specialized adaptation rules
    specializedStrategy.adaptationRules.push({
      condition: `projectType === "${targetProjectType}" && complexity > 0.7`,
      action: 'increaseAgentCount',
      priority: 2,
      confidence: 0.8
    });

    return specializedStrategy;
  }

  /**
   * Get optimization recommendations for all strategies
   */
  getOptimizationRecommendations(
    strategies: Map<string, LearningStrategy>,
    patterns: ProjectPattern[]
  ): Record<string, OptimizationSuggestion[]> {
    const recommendations: Record<string, OptimizationSuggestion[]> = {};

    for (const [_strategyId, strategy] of strategies.entries()) {
      recommendations[_strategyId] = this.optimizeStrategy(strategy, patterns);
    }

    return recommendations;
  }

  /**
   * Get strategy performance analytics
   */
  getStrategyAnalytics(): Record<string, any> {
    const totalStrategies = this.performanceHistory.length;
    const avgSuccessRate = this.performanceHistory.reduce((sum, p) => sum + p.successRate, 0) / totalStrategies || 0;
    const avgConfidence = this.performanceHistory.reduce((sum, p) => sum + p.confidence, 0) / totalStrategies || 0;

    const projectTypePerformance = new Map<string, number[]>();
    this.performanceHistory.forEach(p => {
      const rates = projectTypePerformance.get(p.projectType) || [];
      rates.push(p.successRate);
      projectTypePerformance.set(p.projectType, rates);
    });

    const projectTypeStats = Object.fromEntries(
      Array.from(projectTypePerformance.entries()).map(([type, rates]) => [
        type,
        {
          avgSuccessRate: rates.reduce((sum, r) => sum + r, 0) / rates.length,
          strategyCount: rates.length
        }
      ])
    );

    return {
      totalStrategies,
      avgSuccessRate,
      avgConfidence,
      projectTypeStats,
      evolutionCount: this.evolutionHistory.length,
      lastOptimization: this.performanceHistory[0]?.lastUpdated || null
    };
  }

  // Private helper methods

  private analyzeAgentCountOptimization(
    strategy: LearningStrategy,
    patterns: ProjectPattern[]
  ): OptimizationSuggestion | null {
    const currentAgentCount = strategy.configuration.agentCount;

    // Group patterns by agent count effectiveness
    const agentCountEffectiveness = new Map<number, { success: number, total: number }>();

    patterns.forEach(pattern => {
      // Simulate what agent count would have been optimal for this pattern
      const optimalAgents = Math.min(5, Math.max(2, Math.ceil(pattern.complexity * 4)));
      const stats = agentCountEffectiveness.get(optimalAgents) || { success: 0, total: 0 };
      stats.total++;
      if (pattern.success) stats.success++;
      agentCountEffectiveness.set(optimalAgents, stats);
    });

    // Find the most effective agent count
    let bestAgentCount = currentAgentCount;
    let bestEffectiveness = 0;

    for (const [agentCount, stats] of agentCountEffectiveness.entries()) {
      const effectiveness = stats.success / stats.total;
      if (effectiveness > bestEffectiveness) {
        bestEffectiveness = effectiveness;
        bestAgentCount = agentCount;
      }
    }

    if (bestAgentCount !== currentAgentCount && bestEffectiveness > 0.7) {
      const improvement = bestEffectiveness - (patterns.filter(p => p.success).length / patterns.length);

      return {
        strategyId: strategy.id,
        suggestion: `Adjust agent count from ${currentAgentCount} to ${bestAgentCount}`,
        expectedImprovement: improvement,
        confidence: bestEffectiveness,
        reasoning: `Analysis shows ${bestAgentCount} agents would be more effective for this project type`
      };
    }

    return null;
  }

  private analyzeRoundsOptimization(
    strategy: LearningStrategy,
    patterns: ProjectPattern[]
  ): OptimizationSuggestion | null {
    const currentRounds = strategy.configuration.collaborationRounds;

    // Analyze relationship between collaboration rounds and success
    const roundsSuccess = new Map<number, { success: number, total: number }>();

    patterns.forEach(pattern => {
      // Estimate optimal rounds based on complexity and success factors
      let estimatedRounds = 3;
      if (pattern.complexity > 0.7) estimatedRounds = 5;
      else if (pattern.complexity < 0.3) estimatedRounds = 2;

      const stats = roundsSuccess.get(estimatedRounds) || { success: 0, total: 0 };
      stats.total++;
      if (pattern.success) stats.success++;
      roundsSuccess.set(estimatedRounds, stats);
    });

    // Find optimal rounds
    let bestRounds = currentRounds;
    let bestSuccess = 0;

    for (const [rounds, stats] of roundsSuccess.entries()) {
      const success = stats.success / stats.total;
      if (success > bestSuccess) {
        bestSuccess = success;
        bestRounds = rounds;
      }
    }

    if (bestRounds !== currentRounds && bestSuccess > 0.6) {
      const improvement = bestSuccess - (patterns.filter(p => p.success).length / patterns.length);

      return {
        strategyId: strategy.id,
        suggestion: `Adjust collaboration rounds from ${currentRounds} to ${bestRounds}`,
        expectedImprovement: improvement,
        confidence: bestSuccess,
        reasoning: `Pattern analysis indicates ${bestRounds} rounds would improve success rates`
      };
    }

    return null;
  }

  private analyzeContextOptimization(
    strategy: LearningStrategy,
    patterns: ProjectPattern[]
  ): OptimizationSuggestion | null {
    const currentContext = strategy.configuration.vectorRetrievalTopK;

    // Analyze context effectiveness
    const contextSuccess = new Map<number, { success: number, total: number }>();

    patterns.forEach(pattern => {
      // Estimate optimal context window based on project characteristics
      let optimalContext = 3;
      if (pattern.technologies.length > 3) optimalContext = 5;
      else if (pattern.complexity < 0.3) optimalContext = 2;

      const stats = contextSuccess.get(optimalContext) || { success: 0, total: 0 };
      stats.total++;
      if (pattern.success) stats.success++;
      contextSuccess.set(optimalContext, stats);
    });

    // Find optimal context
    let bestContext = currentContext;
    let bestSuccess = 0;

    for (const [context, stats] of contextSuccess.entries()) {
      const success = stats.success / stats.total;
      if (success > bestSuccess) {
        bestSuccess = success;
        bestContext = context;
      }
    }

    if (bestContext !== currentContext && bestSuccess > 0.65) {
      const improvement = bestSuccess - (patterns.filter(p => p.success).length / patterns.length);

      return {
        strategyId: strategy.id,
        suggestion: `Adjust vector retrieval top-K from ${currentContext} to ${bestContext}`,
        expectedImprovement: improvement,
        confidence: bestSuccess,
        reasoning: `Context analysis suggests ${bestContext} results would improve relevance`
      };
    }

    return null;
  }

  private createMutations(
    strategies: Map<string, LearningStrategy>,
    topPerformers: StrategyPerformance[],
    patterns: Map<string, ProjectPattern>
  ): StrategyEvolution[] {
    const mutations: StrategyEvolution[] = [];

    for (const performance of topPerformers.slice(0, 2)) {
      const parentStrategy = strategies.get(performance.strategyId);
      if (!parentStrategy) continue;

      // Create a mutated version
      const mutatedStrategy = this.mutateStrategy(parentStrategy, patterns);

      const expectedImprovement = this.calculateExpectedImprovement(mutatedStrategy, parentStrategy, patterns);

      mutations.push({
        parentStrategyId: parentStrategy.id,
        evolvedStrategy: mutatedStrategy,
        evolutionType: 'mutation',
        performanceImprovement: expectedImprovement,
        timestamp: new Date()
      });
    }

    return mutations;
  }

  private createCrossovers(
    strategies: Map<string, LearningStrategy>,
    topPerformers: StrategyPerformance[]
  ): StrategyEvolution[] {
    const crossovers: StrategyEvolution[] = [];

    for (let i = 0; i < topPerformers.length - 1; i++) {
      const parent1 = strategies.get(topPerformers[i].strategyId);
      const parent2 = strategies.get(topPerformers[i + 1].strategyId);

      if (!parent1 || !parent2) continue;

      const crossoverStrategy = this.crossoverStrategies(parent1, parent2);
      const expectedImprovement = this.calculateExpectedImprovement(crossoverStrategy, parent1);

      crossovers.push({
        parentStrategyId: parent1.id,
        evolvedStrategy: crossoverStrategy,
        evolutionType: 'crossover',
        performanceImprovement: expectedImprovement,
        timestamp: new Date()
      });
    }

    return crossovers;
  }

  private mutateStrategy(strategy: LearningStrategy, _patterns: Map<string, ProjectPattern>): LearningStrategy {
    const mutated = { ...strategy };

    // Random mutations with small changes
    const mutations = Math.floor(Math.random() * 3) + 1; // 1-3 mutations

    for (let i = 0; i < mutations; i++) {
      const mutationType = Math.random();

      if (mutationType < 0.3) {
        // Mutate agent count
        mutated.configuration.agentCount = Math.min(5, Math.max(2,
          mutated.configuration.agentCount + (Math.random() > 0.5 ? 1 : -1)
        ));
      } else if (mutationType < 0.6) {
        // Mutate collaboration rounds
        mutated.configuration.collaborationRounds = Math.min(6, Math.max(2,
          mutated.configuration.collaborationRounds + (Math.random() > 0.5 ? 1 : -1)
        ));
      } else {
        // Mutate context window
        mutated.configuration.vectorRetrievalTopK = Math.min(7, Math.max(2,
          mutated.configuration.vectorRetrievalTopK + (Math.random() > 0.5 ? 1 : -1)
        ));
      }
    }

    return mutated;
  }

  private crossoverStrategies(strategy1: LearningStrategy, strategy2: LearningStrategy): LearningStrategy {
    const crossover = { ...strategy1 };

    // Crossover configuration parameters
    if (Math.random() > 0.5) {
      crossover.configuration.agentCount = strategy2.configuration.agentCount;
    }
    if (Math.random() > 0.5) {
      crossover.configuration.collaborationRounds = strategy2.configuration.collaborationRounds;
    }
    if (Math.random() > 0.5) {
      crossover.configuration.vectorRetrievalTopK = strategy2.configuration.vectorRetrievalTopK;
    }

    // Crossover adaptation rules
    if (Math.random() > 0.5) {
      crossover.adaptationRules = [...strategy2.adaptationRules];
    }

    return crossover;
  }

  private calculateExpectedImprovement(
    evolvedStrategy: LearningStrategy,
    parentStrategy: LearningStrategy,
    patterns?: Map<string, ProjectPattern>
  ): number {
    // Simple heuristic: calculate improvement based on configuration differences
    let improvement = 0;

    if (evolvedStrategy.configuration.agentCount !== parentStrategy.configuration.agentCount) {
      improvement += 0.05;
    }
    if (evolvedStrategy.configuration.collaborationRounds !== parentStrategy.configuration.collaborationRounds) {
      improvement += 0.05;
    }
    if (evolvedStrategy.configuration.vectorRetrievalTopK !== parentStrategy.configuration.vectorRetrievalTopK) {
      improvement += 0.03;
    }

    // If we have patterns, use them to estimate improvement
    if (patterns) {
      const relevantPatterns = Array.from(patterns.values()).filter(p =>
        evolvedStrategy.targetProjectTypes.includes(p.projectType)
      );

      if (relevantPatterns.length > 0) {
        const successRate = relevantPatterns.filter(p => p.success).length / relevantPatterns.length;
        improvement = Math.max(improvement, successRate * 0.1); // Scale by actual success rate
      }
    }

    return Math.min(improvement, 0.3); // Cap at 30% improvement
  }
}
