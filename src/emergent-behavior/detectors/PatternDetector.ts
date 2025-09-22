/**
 * Pattern Detector for Emergent Behavior System
 *
 * Detects emergent behaviors by analyzing interaction patterns:
 * 1. Novel collaboration patterns between agents
 * 2. Unexpected problem-solving approaches
 * 3. Innovative solution strategies
 * 4. Adaptive behavior changes
 */

import { logger } from '../../utils/logger';

export interface InteractionPattern {
  id: string;
  agents: string[];
  interaction: string;
  context: string;
  outcome: Record<string, any>;
  timestamp: Date;
  sessionId: string;
}

export interface DetectedPattern {
  id: string;
  type: 'collaboration' | 'innovation' | 'optimization' | 'adaptation' | 'breakthrough';
  pattern: string;
  confidence: number;
  significance: number;
  frequency: number;
  context: string;
  timestamp: Date;
}

export class PatternDetector {
  private interactionHistory: InteractionPattern[] = [];
  private detectedPatterns: Map<string, DetectedPattern> = new Map();
  private patternSignatures: Map<string, {
    signature: string[];
    confidence: number;
    frequency: number;
  }> = new Map();

  constructor() {
    this.initializePatternSignatures();
  }

  /**
   * Analyze interaction for pattern detection
   */
  async analyzeInteraction(interaction: InteractionPattern): Promise<DetectedPattern[]> {
    logger.debug(`🔍 Analyzing interaction pattern: ${interaction.id}`);

    this.interactionHistory.push(interaction);

    // Keep history manageable
    if (this.interactionHistory.length > 10000) {
      this.interactionHistory = this.interactionHistory.slice(-5000);
    }

    const detectedPatterns: DetectedPattern[] = [];

    // Detect collaboration patterns
    const collaborationPatterns = await this.detectCollaborationPatterns(interaction);
    detectedPatterns.push(...collaborationPatterns);

    // Detect innovation patterns
    const innovationPatterns = await this.detectInnovationPatterns(interaction);
    detectedPatterns.push(...innovationPatterns);

    // Detect optimization patterns
    const optimizationPatterns = await this.detectOptimizationPatterns(interaction);
    detectedPatterns.push(...optimizationPatterns);

    // Detect adaptation patterns
    const adaptationPatterns = await this.detectAdaptationPatterns(interaction);
    detectedPatterns.push(...adaptationPatterns);

    // Detect breakthrough patterns
    const breakthroughPatterns = await this.detectBreakthroughPatterns(interaction);
    detectedPatterns.push(...breakthroughPatterns);

    // Store detected patterns
    detectedPatterns.forEach(pattern => {
      this.detectedPatterns.set(pattern.id, pattern);
    });

    return detectedPatterns;
  }

  /**
   * Detect novel collaboration patterns
   */
  private async detectCollaborationPatterns(interaction: InteractionPattern): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Multi-agent consensus patterns
    if (interaction.agents.length >= 3 && interaction.outcome.consensus > 0.9) {
      const pattern = await this.createPattern(
        'collaboration',
        'multi_agent_consensus',
        interaction,
        0.8,
        `Multi-agent consensus achieved with ${interaction.outcome.consensus} agreement`
      );

      if (pattern) patterns.push(pattern);
    }

    // Agent role specialization
    const agentRoles = this.extractAgentRoles(interaction);
    if (agentRoles.size > 1 && this.isRoleSpecializationEffective(interaction, agentRoles)) {
      const pattern = await this.createPattern(
        'collaboration',
        'role_specialization',
        interaction,
        0.85,
        `Effective role specialization detected across ${agentRoles.size} distinct roles`
      );

      if (pattern) patterns.push(pattern);
    }

    // Cross-domain collaboration
    const domains = this.extractDomains(interaction.context);
    if (domains.length > 1 && interaction.outcome.effectiveness > 0.8) {
      const pattern = await this.createPattern(
        'collaboration',
        'cross_domain_collaboration',
        interaction,
        0.9,
        `Successful cross-domain collaboration across ${domains.length} domains`
      );

      if (pattern) patterns.push(pattern);
    }

    return patterns;
  }

  /**
   * Detect innovative problem-solving patterns
   */
  private async detectInnovationPatterns(interaction: InteractionPattern): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Novel solution approaches
    const solutionNovelty = this.assessSolutionNovelty(interaction);
    if (solutionNovelty > 0.7 && interaction.outcome.success) {
      const pattern = await this.createPattern(
        'innovation',
        'novel_solution_approach',
        interaction,
        solutionNovelty,
        `Novel solution approach with ${Math.round(solutionNovelty * 100)}% novelty score`
      );

      if (pattern) patterns.push(pattern);
    }

    // Creative problem reframing
    const reframingScore = this.assessProblemReframing(interaction);
    if (reframingScore > 0.8) {
      const pattern = await this.createPattern(
        'innovation',
        'creative_problem_reframing',
        interaction,
        reframingScore,
        `Creative problem reframing detected with ${Math.round(reframingScore * 100)}% originality`
      );

      if (pattern) patterns.push(pattern);
    }

    // Unexpected solution synthesis
    const synthesisScore = this.assessSolutionSynthesis(interaction);
    if (synthesisScore > 0.75 && interaction.outcome.innovation > 0.8) {
      const pattern = await this.createPattern(
        'innovation',
        'solution_synthesis',
        interaction,
        synthesisScore,
        `Innovative solution synthesis combining multiple approaches`
      );

      if (pattern) patterns.push(pattern);
    }

    return patterns;
  }

  /**
   * Detect optimization patterns
   */
  private async detectOptimizationPatterns(interaction: InteractionPattern): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Efficiency improvements
    const efficiencyGain = this.calculateEfficiencyGain(interaction);
    if (efficiencyGain > 0.3 && interaction.outcome.efficiency > 0.8) {
      const pattern = await this.createPattern(
        'optimization',
        'efficiency_optimization',
        interaction,
        efficiencyGain,
        `Efficiency optimization detected with ${Math.round(efficiencyGain * 100)}% improvement`
      );

      if (pattern) patterns.push(pattern);
    }

    // Resource optimization
    const resourceOptimization = this.assessResourceOptimization(interaction);
    if (resourceOptimization > 0.7) {
      const pattern = await this.createPattern(
        'optimization',
        'resource_optimization',
        interaction,
        resourceOptimization,
        `Resource optimization pattern with ${Math.round(resourceOptimization * 100)}% effectiveness`
      );

      if (pattern) patterns.push(pattern);
    }

    // Process streamlining
    const streamliningScore = this.assessProcessStreamlining(interaction);
    if (streamliningScore > 0.6 && interaction.outcome.efficiency > 0.7) {
      const pattern = await this.createPattern(
        'optimization',
        'process_streamlining',
        interaction,
        streamliningScore,
        `Process streamlining detected with ${Math.round(streamliningScore * 100)}% improvement`
      );

      if (pattern) patterns.push(pattern);
    }

    return patterns;
  }

  /**
   * Detect adaptation patterns
   */
  private async detectAdaptationPatterns(interaction: InteractionPattern): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Context adaptation
    const contextAdaptation = this.assessContextAdaptation(interaction);
    if (contextAdaptation > 0.7) {
      const pattern = await this.createPattern(
        'adaptation',
        'context_adaptation',
        interaction,
        contextAdaptation,
        `Context adaptation detected with ${Math.round(contextAdaptation * 100)}% effectiveness`
      );

      if (pattern) patterns.push(pattern);
    }

    // Dynamic strategy adjustment
    const strategyAdjustment = this.assessStrategyAdjustment(interaction);
    if (strategyAdjustment > 0.8 && interaction.outcome.adaptation > 0.7) {
      const pattern = await this.createPattern(
        'adaptation',
        'dynamic_strategy_adjustment',
        interaction,
        strategyAdjustment,
        `Dynamic strategy adjustment with ${Math.round(strategyAdjustment * 100)}% success rate`
      );

      if (pattern) patterns.push(pattern);
    }

    // Learning from failure
    const failureLearning = this.assessFailureLearning(interaction);
    if (failureLearning > 0.75) {
      const pattern = await this.createPattern(
        'adaptation',
        'failure_learning',
        interaction,
        failureLearning,
        `Learning from failure pattern with ${Math.round(failureLearning * 100)}% improvement`
      );

      if (pattern) patterns.push(pattern);
    }

    return patterns;
  }

  /**
   * Detect breakthrough patterns
   */
  private async detectBreakthroughPatterns(interaction: InteractionPattern): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Paradigm-shifting solutions
    const paradigmShift = this.assessParadigmShift(interaction);
    if (paradigmShift > 0.9 && interaction.outcome.success) {
      const pattern = await this.createPattern(
        'breakthrough',
        'paradigm_shift',
        interaction,
        paradigmShift,
        `Paradigm-shifting breakthrough with ${Math.round(paradigmShift * 100)}% novelty`
      );

      if (pattern) patterns.push(pattern);
    }

    // Unexpected success patterns
    const unexpectedSuccess = this.assessUnexpectedSuccess(interaction);
    if (unexpectedSuccess > 0.85 && interaction.outcome.success) {
      const pattern = await this.createPattern(
        'breakthrough',
        'unexpected_success',
        interaction,
        unexpectedSuccess,
        `Unexpected success pattern with ${Math.round(unexpectedSuccess * 100)}% surprise factor`
      );

      if (pattern) patterns.push(pattern);
    }

    // Emergent complexity handling
    const complexityHandling = this.assessComplexityHandling(interaction);
    if (complexityHandling > 0.8 && interaction.outcome.success) {
      const pattern = await this.createPattern(
        'breakthrough',
        'emergent_complexity_handling',
        interaction,
        complexityHandling,
        `Emergent complexity handling with ${Math.round(complexityHandling * 100)}% effectiveness`
      );

      if (pattern) patterns.push(pattern);
    }

    return patterns;
  }

  /**
   * Create a detected pattern
   */
  private async createPattern(
    type: DetectedPattern['type'],
    pattern: string,
    interaction: InteractionPattern,
    confidence: number,
    context: string
  ): Promise<DetectedPattern | null> {
    const patternId = `pattern_${type}_${pattern}_${Date.now()}`;

    // Check if similar pattern already exists
    const existingPattern = Array.from(this.detectedPatterns.values()).find(p =>
      p.type === type && p.pattern === pattern &&
      this.calculatePatternSimilarity(p.context, context) > 0.8
    );

    if (existingPattern) {
      // Update existing pattern
      existingPattern.frequency++;
      existingPattern.confidence = (existingPattern.confidence + confidence) / 2;
      return null;
    }

    // Create new pattern
    const detectedPattern: DetectedPattern = {
      id: patternId,
      type,
      pattern,
      confidence,
      significance: this.calculateSignificance(type, confidence),
      frequency: 1,
      context,
      timestamp: new Date()
    };

    return detectedPattern;
  }

  // Assessment methods

  private assessSolutionNovelty(interaction: InteractionPattern): number {
    // Analyze how novel the solution approach is
    let novelty = 0.5; // Base novelty

    // Compare with historical solutions
    const similarSolutions = this.interactionHistory.filter(h =>
      this.calculateInteractionSimilarity(h.interaction, interaction.interaction) > 0.7
    );

    if (similarSolutions.length === 0) {
      novelty += 0.3; // Completely novel solution
    }

    // Check for unconventional approaches
    const unconventionalElements = this.identifyUnconventionalElements(interaction.interaction);
    novelty += unconventionalElements * 0.2;

    return Math.min(novelty, 1.0);
  }

  private assessProblemReframing(interaction: InteractionPattern): number {
    // Check if the problem was reframed in an innovative way
    const contextKeywords = interaction.context.toLowerCase().split(/\s+/);
    const interactionKeywords = interaction.interaction.toLowerCase().split(/\s+/);

    // Look for reframing indicators
    const reframingIndicators = [
      'reframe', 'rethink', 'alternative', 'different approach',
      'new perspective', 'unconventional', 'creative solution'
    ];

    let reframingScore = 0;
    reframingIndicators.forEach(indicator => {
      if (interactionKeywords.includes(indicator)) {
        reframingScore += 0.2;
      }
    });

    // Check for domain crossing
    const domainMismatch = this.checkDomainMismatch(contextKeywords, interactionKeywords);
    if (domainMismatch > 0.6) {
      reframingScore += 0.3;
    }

    return Math.min(reframingScore, 1.0);
  }

  private assessSolutionSynthesis(interaction: InteractionPattern): number {
    // Check if multiple approaches were synthesized
    const approachCount = this.countDistinctApproaches(interaction.interaction);
    const synthesisScore = Math.min(approachCount * 0.2, 0.6);

    // Check for integration quality
    const integrationQuality = this.assessIntegrationQuality(interaction.interaction);
    const integrationScore = integrationQuality * 0.4;

    return synthesisScore + integrationScore;
  }

  private calculateEfficiencyGain(interaction: InteractionPattern): number {
    // Calculate efficiency improvements
    const baselineEfficiency = this.getBaselineEfficiency(interaction.context);
    const actualEfficiency = interaction.outcome.efficiency || 0.5;

    return Math.max(0, actualEfficiency - baselineEfficiency);
  }

  private assessResourceOptimization(interaction: InteractionPattern): number {
    // Assess how well resources were optimized
    const resourceMetrics = interaction.outcome.resourceEfficiency || 0.5;
    const complexity = this.calculateInteractionComplexity(interaction);

    // Higher score for achieving good efficiency despite complexity
    return resourceMetrics * (1 + complexity * 0.5);
  }

  private assessProcessStreamlining(interaction: InteractionPattern): number {
    // Check for process improvements
    const stepReduction = interaction.outcome.stepReduction || 0;
    const timeReduction = interaction.outcome.timeReduction || 0;

    return (stepReduction + timeReduction) / 2;
  }

  private assessContextAdaptation(interaction: InteractionPattern): number {
    // Assess how well the solution adapted to context
    const contextRelevance = this.calculateContextRelevance(interaction.context, interaction.interaction);
    const outcomeFit = interaction.outcome.contextFit || 0.5;

    return (contextRelevance + outcomeFit) / 2;
  }

  private assessStrategyAdjustment(interaction: InteractionPattern): number {
    // Check for dynamic strategy changes
    const strategyChanges = interaction.outcome.strategyChanges || 0;
    const adaptationSuccess = interaction.outcome.adaptation || 0.5;

    return strategyChanges > 0 ? adaptationSuccess : 0.3;
  }

  private assessFailureLearning(interaction: InteractionPattern): number {
    // Check if learning occurred from previous failures
    const recentFailures = this.interactionHistory.slice(-5).filter(h => !h.outcome.success);
    const failureLearning = recentFailures.length > 0 ?
      interaction.outcome.success * 0.8 : 0.3;

    return failureLearning;
  }

  private assessParadigmShift(interaction: InteractionPattern): number {
    // Assess paradigm-shifting nature
    const paradigmKeywords = [
      'revolutionary', 'breakthrough', 'paradigm', 'fundamental',
      'transformative', 'disruptive', 'innovative'
    ];

    const keywordScore = paradigmKeywords.reduce((score, keyword) => {
      return interaction.interaction.toLowerCase().includes(keyword) ? score + 0.15 : score;
    }, 0);

    const noveltyScore = this.assessSolutionNovelty(interaction);
    const impactScore = interaction.outcome.impact || 0.5;

    return (keywordScore + noveltyScore + impactScore) / 3;
  }

  private assessUnexpectedSuccess(interaction: InteractionPattern): number {
    // Check for unexpected successful outcomes
    const expectedSuccess = this.calculateExpectedSuccess(interaction);
    const actualSuccess = interaction.outcome.success ? 1 : 0;

    const surpriseFactor = actualSuccess - expectedSuccess;
    return Math.max(0, surpriseFactor);
  }

  private assessComplexityHandling(interaction: InteractionPattern): number {
    // Assess how well complex problems were handled
    const complexity = this.calculateInteractionComplexity(interaction);
    const success = interaction.outcome.success ? 1 : 0;

    // Higher score for handling high complexity successfully
    return complexity * success;
  }

  // Helper methods

  private extractAgentRoles(interaction: InteractionPattern): Set<string> {
    const roles = new Set<string>();
    const interactionText = interaction.interaction.toLowerCase();

    if (interactionText.includes('implement') || interactionText.includes('code')) {
      roles.add('implementer');
    }
    if (interactionText.includes('design') || interactionText.includes('ui')) {
      roles.add('designer');
    }
    if (interactionText.includes('test') || interactionText.includes('debug')) {
      roles.add('tester');
    }
    if (interactionText.includes('plan') || interactionText.includes('architect')) {
      roles.add('planner');
    }

    return roles;
  }

  private isRoleSpecializationEffective(interaction: InteractionPattern, roles: Set<string>): boolean {
    // Check if role specialization led to better outcomes
    const roleCount = roles.size;
    const agentCount = interaction.agents.length;

    // Effective specialization when multiple roles with adequate agents
    return roleCount > 1 && agentCount >= roleCount && interaction.outcome.success;
  }

  private extractDomains(context: string): string[] {
    const domains: string[] = [];
    const lowerContext = context.toLowerCase();

    if (lowerContext.includes('web') || lowerContext.includes('frontend')) {
      domains.push('web');
    }
    if (lowerContext.includes('mobile') || lowerContext.includes('app')) {
      domains.push('mobile');
    }
    if (lowerContext.includes('ai') || lowerContext.includes('machine learning')) {
      domains.push('ai');
    }
    if (lowerContext.includes('data') || lowerContext.includes('database')) {
      domains.push('data');
    }

    return domains;
  }

  private identifyUnconventionalElements(interaction: string): number {
    // Count unconventional elements in the solution
    const unconventionalKeywords = [
      'unconventional', 'creative', 'innovative', 'novel', 'unique',
      'alternative', 'different', 'experimental', 'radical'
    ];

    return unconventionalKeywords.filter(keyword =>
      interaction.toLowerCase().includes(keyword)
    ).length;
  }

  private calculateInteractionSimilarity(interaction1: string, interaction2: string): number {
    // Simple similarity calculation
    const words1 = interaction1.toLowerCase().split(/\s+/);
    const words2 = interaction2.toLowerCase().split(/\s+/);

    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]);

    return commonWords.length / totalWords.size;
  }

  private checkDomainMismatch(contextKeywords: string[], interactionKeywords: string[]): number {
    // Check for domain mismatch (good for innovation)
    const contextDomains = contextKeywords.filter(word =>
      ['web', 'mobile', 'ai', 'data', 'cloud', 'blockchain'].includes(word)
    );

    const interactionDomains = interactionKeywords.filter(word =>
      ['web', 'mobile', 'ai', 'data', 'cloud', 'blockchain'].includes(word)
    );

    const domainOverlap = contextDomains.filter(domain =>
      interactionDomains.includes(domain)
    ).length;

    const domainMismatch = contextDomains.length > 0 ?
      1 - (domainOverlap / contextDomains.length) : 0;

    return domainMismatch;
  }

  private countDistinctApproaches(interaction: string): number {
    // Count distinct problem-solving approaches
    const approachKeywords = {
      'analytical': ['analyze', 'calculate', 'measure', 'evaluate'],
      'creative': ['create', 'design', 'innovate', 'imagine'],
      'practical': ['implement', 'build', 'develop', 'construct'],
      'systematic': ['plan', 'organize', 'structure', 'method']
    };

    let approachCount = 0;
    for (const approach of Object.values(approachKeywords)) {
      if (approach.some(keyword => interaction.toLowerCase().includes(keyword))) {
        approachCount++;
      }
    }

    return approachCount;
  }

  private assessIntegrationQuality(interaction: string): number {
    // Assess how well different approaches are integrated
    const integrationKeywords = [
      'combine', 'integrate', 'merge', 'synthesize', 'unify',
      'coordinate', 'harmonize', 'blend', 'fuse'
    ];

    const hasIntegration = integrationKeywords.some(keyword =>
      interaction.toLowerCase().includes(keyword)
    );

    const approachCount = this.countDistinctApproaches(interaction);

    return hasIntegration && approachCount > 1 ? 0.8 : 0.4;
  }

  private getBaselineEfficiency(context: string): number {
    // Get baseline efficiency for the context
    const similarInteractions = this.interactionHistory.filter(h =>
      this.calculateInteractionSimilarity(h.context, context) > 0.5
    );

    if (similarInteractions.length === 0) return 0.5; // Default baseline

    const avgEfficiency = similarInteractions.reduce((sum, h) =>
      sum + (h.outcome.efficiency || 0.5), 0
    ) / similarInteractions.length;

    return avgEfficiency;
  }

  private calculateInteractionComplexity(interaction: InteractionPattern): number {
    // Calculate complexity of the interaction
    let complexity = 0.1; // Base complexity

    // Agent count complexity
    complexity += (interaction.agents.length - 1) * 0.15;

    // Context complexity
    const contextWords = interaction.context.split(/\s+/).length;
    complexity += Math.min(contextWords / 100, 0.3);

    // Interaction complexity
    const interactionWords = interaction.interaction.split(/\s+/).length;
    complexity += Math.min(interactionWords / 150, 0.4);

    return Math.min(complexity, 1.0);
  }

  private calculateContextRelevance(context: string, interaction: string): number {
    // Calculate how relevant the interaction is to the context
    const contextKeywords = context.toLowerCase().split(/\s+/);
    const interactionKeywords = interaction.toLowerCase().split(/\s+/);

    const relevantKeywords = interactionKeywords.filter(keyword =>
      contextKeywords.includes(keyword)
    );

    return relevantKeywords.length / Math.max(contextKeywords.length, 1);
  }

  private calculateExpectedSuccess(interaction: InteractionPattern): number {
    // Calculate expected success rate based on historical data
    const similarInteractions = this.interactionHistory.filter(h =>
      this.calculateInteractionSimilarity(h.interaction, interaction.interaction) > 0.6
    );

    if (similarInteractions.length === 0) return 0.5; // Default expectation

    const successCount = similarInteractions.filter(h => h.outcome.success).length;
    return successCount / similarInteractions.length;
  }

  private calculateSignificance(type: DetectedPattern['type'], confidence: number): number {
    // Calculate significance based on type and confidence
    const baseSignificance = {
      'collaboration': 0.6,
      'innovation': 0.8,
      'optimization': 0.7,
      'adaptation': 0.6,
      'breakthrough': 0.9
    };

    return baseSignificance[type] * confidence;
  }

  private calculatePatternSimilarity(context1: string, context2: string): number {
    // Calculate similarity between two pattern contexts
    const words1 = context1.toLowerCase().split(/\s+/);
    const words2 = context2.toLowerCase().split(/\s+/);

    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]);

    return commonWords.length / totalWords.size;
  }

  private initializePatternSignatures(): void {
    // Initialize known pattern signatures
    this.patternSignatures.set('multi_agent_consensus', {
      signature: ['consensus', 'agreement', 'collaboration', 'multiple agents'],
      confidence: 0.8,
      frequency: 0
    });

    this.patternSignatures.set('novel_solution', {
      signature: ['novel', 'innovative', 'creative', 'new approach'],
      confidence: 0.7,
      frequency: 0
    });

    this.patternSignatures.set('efficiency_optimization', {
      signature: ['efficient', 'optimize', 'streamline', 'improve performance'],
      confidence: 0.75,
      frequency: 0
    });
  }
}
