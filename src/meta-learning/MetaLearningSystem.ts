/**
 * Meta-Learning System for AstraForge IDE
 *
 * This system implements recursive self-improvement by:
 * 1. Tracking performance patterns across different project types
 * 2. Analyzing success/failure patterns in multi-agent collaboration
 * 3. Optimizing learning strategies based on project characteristics
 * 4. Providing insights for system-wide improvements
 * 5. Enabling the system to learn how to learn better
 */

import * as _vscode from 'vscode';
import { logger } from '../utils/logger';

export interface ProjectPattern {
  id: string;
  projectType: string;
  complexity: number;
  technologies: string[];
  teamSize: number;
  duration: number; // in minutes
  success: boolean;
  successFactors: string[];
  failureFactors: string[];
  aiCollaborationScore: number;
  userSatisfaction: number;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface LearningStrategy {
  id: string;
  name: string;
  description: string;
  targetProjectTypes: string[];
  configuration: {
    agentCount: number;
    collaborationRounds: number;
    contextWindow: number;
    vectorRetrievalTopK: number;
    reinforcementLearning: boolean;
    emergentDetection: boolean;
  };
  performanceHistory: PerformanceMetric[];
  adaptationRules: AdaptationRule[];
}

export interface PerformanceMetric {
  timestamp: Date;
  metric: string;
  value: number;
  context: Record<string, any>;
}

export interface _PerformanceMetric {
  timestamp: Date;
  metric: string;
  value: number;
  context: Record<string, any>;
}

export interface AdaptationRule {
  condition: string; // JavaScript expression
  action: string; // Action to take
  priority: number;
  confidence: number;
}

export interface MetaLearningInsight {
  id: string;
  type: 'pattern' | 'trend' | 'optimization' | 'breakthrough';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high' | 'breakthrough';
  actionable: boolean;
  recommendation: string;
  timestamp: Date;
}

export interface _MetaLearningInsight {
  id: string;
  type: 'pattern' | 'trend' | 'optimization' | 'breakthrough';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high' | 'breakthrough';
  actionable: boolean;
  recommendation: string;
  timestamp: Date;
}

export class MetaLearningSystem {
  private patterns: Map<string, ProjectPattern> = new Map();
  private strategies: Map<string, LearningStrategy> = new Map();
  private insights: MetaLearningInsight[] = [];
  private performanceHistory: PerformanceMetric[] = [];
  private learningActive = false;

  constructor() {
    this.initializeDefaultStrategies();
    this.loadFromStorage();
    this.startContinuousLearning();
  }

  /**
   * Record a completed project for meta-learning analysis
   */
  async recordProjectCompletion(
    projectId: string,
    projectType: string,
    complexity: number,
    technologies: string[],
    teamSize: number,
    duration: number,
    success: boolean,
    aiCollaborationScore: number,
    userSatisfaction: number,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const pattern: ProjectPattern = {
      id: projectId,
      projectType,
      complexity,
      technologies,
      teamSize,
      duration,
      success,
      successFactors: metadata.successFactors || [],
      failureFactors: metadata.failureFactors || [],
      aiCollaborationScore,
      userSatisfaction,
      timestamp: new Date(),
      metadata
    };

    this.patterns.set(projectId, pattern);
    await this.analyzePattern(pattern);
    await this.updateStrategies(pattern);
    await this.generateInsights(pattern);
    await this.saveToStorage();

    logger.info(`📊 Recorded project completion: ${projectType} (${success ? 'SUCCESS' : 'FAILURE'})`);
  }

  /**
   * Get all patterns
   */
  getPatterns(): Map<string, ProjectPattern> {
    return this.patterns;
  }

  /**
   * Get all strategies
   */
  getStrategies(): Map<string, LearningStrategy> {
    return this.strategies;
  }

  /**
   * Add a new insight
   */
  addInsight(insight: MetaLearningInsight): void {
    this.insights.push(insight);

    // Keep only recent insights
    if (this.insights.length > 1000) {
      this.insights = this.insights.slice(-500);
    }

    logger.info(`💡 Added insight: ${insight.title}`);
  }

  /**
   * Analyze a project pattern for insights
   */
  private async analyzePattern(pattern: ProjectPattern): Promise<void> {
    // Find similar patterns
    const similarPatterns = Array.from(this.patterns.values()).filter(p =>
      p.projectType === pattern.projectType &&
      Math.abs(p.complexity - pattern.complexity) < 0.2
    );

    if (similarPatterns.length < 3) return;

    // Calculate success rates and factors
    const successRate = similarPatterns.filter(p => p.success).length / similarPatterns.length;
    const _avgSatisfaction = similarPatterns.reduce((sum, p) => sum + p.userSatisfaction, 0) / similarPatterns.length;
    const avgCollaborationScore = similarPatterns.reduce((sum, p) => sum + p.aiCollaborationScore, 0) / similarPatterns.length;

    // Identify success patterns
    const successFactors = new Map<string, number>();
    const failureFactors = new Map<string, number>();

    similarPatterns.forEach(p => {
      p.successFactors.forEach(factor => {
        successFactors.set(factor, (successFactors.get(factor) || 0) + 1);
      });
      p.failureFactors.forEach(factor => {
        failureFactors.set(factor, (failureFactors.get(factor) || 0) + 1);
      });
    });

    // Generate insights based on analysis
    if (pattern.success && successRate > 0.8) {
      await this.generateInsight(
        'pattern',
        'High Success Pattern Detected',
        `Projects of type ${pattern.projectType} with complexity ${pattern.complexity.toFixed(1)} have ${successRate.toFixed(1)}% success rate`,
        0.85,
        'high',
        true,
        `Consider using similar approach for future ${pattern.projectType} projects`
      );
    }

    if (pattern.success && pattern.aiCollaborationScore > 0.9 && avgCollaborationScore < 0.7) {
      await this.generateInsight(
        'breakthrough',
        'Collaboration Breakthrough',
        `This project achieved exceptional AI collaboration (${pattern.aiCollaborationScore}) compared to similar projects`,
        0.9,
        'breakthrough',
        true,
        'Study this collaboration pattern for replication in future projects'
      );
    }
  }

  /**
   * Update learning strategies based on new pattern
   */
  private async updateStrategies(pattern: ProjectPattern): Promise<void> {
    for (const strategy of this.strategies.values()) {
      if (strategy.targetProjectTypes.includes(pattern.projectType)) {
        // Update performance history
        strategy.performanceHistory.push({
          timestamp: new Date(),
          metric: 'success_rate',
          value: pattern.success ? 1 : 0,
          context: { complexity: pattern.complexity, teamSize: pattern.teamSize }
        });

        // Apply adaptation rules
        for (const rule of strategy.adaptationRules) {
          try {
            if (this.evaluateCondition(rule.condition, pattern)) {
              await this.applyAdaptationAction(strategy, rule.action, pattern);
            }
          } catch (error) {
            logger.warn(`Failed to apply adaptation rule: ${error}`);
          }
        }

        // Auto-adapt strategy based on performance
        const recentPerformance = strategy.performanceHistory.slice(-10);
        const avgSuccess = recentPerformance.reduce((sum, p) => sum + p.value, 0) / recentPerformance.length;

        if (avgSuccess > 0.8 && strategy.configuration.agentCount < 5) {
          strategy.configuration.agentCount++;
          logger.info(`🔧 Auto-adapted strategy ${strategy.name}: increased agent count to ${strategy.configuration.agentCount}`);
        }
      }
    }
  }

  /**
   * Update learning strategies (overload for strategy objects)
   */
  private async updateStrategy(strategy: LearningStrategy): Promise<void> {
    // Update performance history with strategy-specific data
    strategy.performanceHistory.push({
      timestamp: new Date(),
      metric: 'strategy_update',
      value: 1,
      context: { strategyId: strategy.id }
    });
  }

  /**
   * Generate insights from pattern analysis
   */
  private async generateInsights(pattern: ProjectPattern): Promise<void> {
    // Trend analysis
    const recentPatterns = Array.from(this.patterns.values())
      .filter(p => p.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (recentPatterns.length >= 5) {
      const successTrend = recentPatterns.slice(0, 5).filter(p => p.success).length / 5;
      const satisfactionTrend = recentPatterns.slice(0, 5).reduce((sum, p) => sum + p.userSatisfaction, 0) / 5;

      if (successTrend > 0.8 && satisfactionTrend > 0.8) {
        await this.generateInsight(
          'trend',
          'Exceptional Performance Trend',
          'Last 5 projects show exceptional success and satisfaction rates',
          0.9,
          'high',
          true,
          'Current strategies are working well - continue with similar approaches'
        );
      }
    }

    // Technology-specific insights
    const techPatterns = Array.from(this.patterns.values()).filter(p =>
      p.technologies.includes(pattern.technologies[0])
    );

    if (techPatterns.length >= 3) {
      const techSuccessRate = techPatterns.filter(p => p.success).length / techPatterns.length;

      if (techSuccessRate > 0.9) {
        await this.generateInsight(
          'optimization',
          'Technology Success Pattern',
          `${pattern.technologies[0]} projects have ${techSuccessRate.toFixed(1)}% success rate`,
          0.8,
          'medium',
          true,
          `Prioritize ${pattern.technologies[0]} for similar project types`
        );
      }
    }
  }

  /**
   * Get optimal strategy for a project type and characteristics
   */
  getOptimalStrategy(projectType: string, complexity: number): LearningStrategy | null {
    let bestStrategy: LearningStrategy | null = null;
    let bestScore = 0;

    for (const strategy of this.strategies.values()) {
      if (strategy.targetProjectTypes.includes(projectType)) {
        // Calculate strategy score based on performance history
        const relevantPerformance = strategy.performanceHistory.filter(p =>
          Math.abs(p.context.complexity - complexity) < 0.2
        );

        if (relevantPerformance.length > 0) {
          const avgSuccess = relevantPerformance.reduce((sum, p) => sum + p.value, 0) / relevantPerformance.length;
          const score = avgSuccess * strategy.adaptationRules.length;

          if (score > bestScore) {
            bestScore = score;
            bestStrategy = strategy;
          }
        }
      }
    }

    return bestStrategy;
  }

  /**
   * Get insights for the user
   */
  getInsights(limit: number = 10): MetaLearningInsight[] {
    return this.insights
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get performance analytics
   */
  getAnalytics(): Record<string, any> {
    const patterns = Array.from(this.patterns.values());
    const strategies = Array.from(this.strategies.values());

    const totalProjects = patterns.length;
    const successfulProjects = patterns.filter(p => p.success).length;
    const avgSatisfaction = patterns.reduce((sum, p) => sum + p.userSatisfaction, 0) / totalProjects || 0;
    const avgCollaboration = patterns.reduce((sum, p) => sum + p.aiCollaborationScore, 0) / totalProjects || 0;

    // Project type breakdown
    const projectTypeStats = new Map<string, { count: number, success: number, satisfaction: number }>();
    patterns.forEach(p => {
      const stats = projectTypeStats.get(p.projectType) || { count: 0, success: 0, satisfaction: 0 };
      stats.count++;
      if (p.success) stats.success++;
      stats.satisfaction += p.userSatisfaction;
      projectTypeStats.set(p.projectType, stats);
    });

    const projectTypeBreakdown = Object.fromEntries(
      Array.from(projectTypeStats.entries()).map(([type, stats]) => [
        type,
        {
          count: stats.count,
          successRate: stats.success / stats.count,
          avgSatisfaction: stats.satisfaction / stats.count
        }
      ])
    );

    return {
      totalProjects,
      successRate: successfulProjects / totalProjects,
      avgSatisfaction,
      avgCollaboration,
      projectTypeBreakdown,
      strategyCount: strategies.length,
      insightsCount: this.insights.length,
      learningActive: this.learningActive
    };
  }

  // Private helper methods

  private initializeDefaultStrategies(): void {
    const defaultStrategies: LearningStrategy[] = [
      {
        id: 'standard_collaboration',
        name: 'Standard Multi-Agent Collaboration',
        description: 'Balanced approach for most project types',
        targetProjectTypes: ['web', 'mobile', 'backend', 'fullstack'],
        configuration: {
          agentCount: 3,
          collaborationRounds: 4,
          contextWindow: 5,
          vectorRetrievalTopK: 3,
          reinforcementLearning: true,
          emergentDetection: false
        },
        performanceHistory: [],
        adaptationRules: [
          {
            condition: 'success === false && complexity > 0.7',
            action: 'increaseAgentCount',
            priority: 1,
            confidence: 0.8
          },
          {
            condition: 'userSatisfaction < 0.6',
            action: 'reduceCollaborationRounds',
            priority: 1,
            confidence: 0.7
          }
        ]
      },
      {
        id: 'creative_innovation',
        name: 'Creative Innovation Focus',
        description: 'Enhanced creativity for innovative projects',
        targetProjectTypes: ['ai', 'blockchain', 'game', 'creative'],
        configuration: {
          agentCount: 4,
          collaborationRounds: 5,
          contextWindow: 7,
          vectorRetrievalTopK: 5,
          reinforcementLearning: true,
          emergentDetection: true
        },
        performanceHistory: [],
        adaptationRules: [
          {
            condition: 'aiCollaborationScore > 0.9',
            action: 'enableEmergentDetection',
            priority: 2,
            confidence: 0.9
          }
        ]
      }
    ];

    defaultStrategies.forEach(strategy => {
      this.strategies.set(strategy.id, strategy);
    });
  }

  private async generateInsight(
    type: MetaLearningInsight['type'],
    title: string,
    description: string,
    confidence: number,
    impact: MetaLearningInsight['impact'],
    actionable: boolean,
    recommendation: string
  ): Promise<void> {
    const insight: MetaLearningInsight = {
      id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      description,
      confidence,
      impact,
      actionable,
      recommendation,
      timestamp: new Date()
    };

    this.insights.push(insight);

    // Keep only recent insights
    if (this.insights.length > 1000) {
      this.insights = this.insights.slice(-500);
    }

    logger.info(`💡 Generated ${type} insight: ${title}`);
  }

  private evaluateCondition(condition: string, pattern: ProjectPattern): boolean {
    try {
      // Simple evaluation context
      const context = {
        success: pattern.success,
        complexity: pattern.complexity,
        userSatisfaction: pattern.userSatisfaction,
        aiCollaborationScore: pattern.aiCollaborationScore,
        duration: pattern.duration,
        teamSize: pattern.teamSize
      };

      // Basic JavaScript evaluation (in production, use a safer expression evaluator)
      return new Function(...Object.keys(context), `return ${condition}`)(...Object.values(context));
    } catch (error) {
      logger.warn(`Failed to evaluate condition: ${condition}`, error);
      return false;
    }
  }

  private async applyAdaptationAction(strategy: LearningStrategy, action: string, _pattern: ProjectPattern): Promise<void> {
    switch (action) {
      case 'increaseAgentCount':
        if (strategy.configuration.agentCount < 5) {
          strategy.configuration.agentCount++;
          logger.info(`🔧 Applied adaptation: increased agent count to ${strategy.configuration.agentCount}`);
        }
        break;
      case 'reduceCollaborationRounds':
        if (strategy.configuration.collaborationRounds > 2) {
          strategy.configuration.collaborationRounds--;
          logger.info(`🔧 Applied adaptation: reduced collaboration rounds to ${strategy.configuration.collaborationRounds}`);
        }
        break;
      case 'enableEmergentDetection':
        strategy.configuration.emergentDetection = true;
        logger.info(`🔧 Applied adaptation: enabled emergent detection`);
        break;
    }
  }

  private startContinuousLearning(): void {
    this.learningActive = true;

    // Run meta-learning analysis every hour
    setInterval(async () => {
      await this.runMetaLearningCycle();
    }, 60 * 60 * 1000);

    logger.info('🧠 Meta-learning system activated');
  }

  private async runMetaLearningCycle(): Promise<void> {
    try {
      // Analyze patterns for new insights
      const recentPatterns = Array.from(this.patterns.values())
        .filter(p => p.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000))
        .slice(-20);

      for (const pattern of recentPatterns) {
        await this.analyzePattern(pattern);
      }

      // Update strategy performance
      for (const strategy of this.strategies.values()) {
        await this.updateStrategy(strategy);
      }

      // Clean up old data
      this.cleanupOldData();

      logger.debug('🔄 Completed meta-learning cycle');
    } catch (error) {
      logger.error('❌ Meta-learning cycle failed:', error);
    }
  }

  private cleanupOldData(): void {
    // Keep patterns for last 6 months
    const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
    for (const [id, pattern] of this.patterns.entries()) {
      if (pattern.timestamp < sixMonthsAgo) {
        this.patterns.delete(id);
      }
    }

    // Keep only recent insights
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.insights = this.insights.filter(i => i.timestamp > oneMonthAgo);
  }

  private async saveToStorage(): Promise<void> {
    try {
      const data = {
        patterns: Array.from(this.patterns.entries()),
        strategies: Array.from(this.strategies.entries()),
        insights: this.insights,
        performanceHistory: this.performanceHistory
      };

      // In VS Code extension, use workspace state or global state
      const _storageData = JSON.stringify(data);

      // For now, store in memory (in production, use VS Code's storage APIs)
      (global as any).astraforge_meta_learning = data;

    } catch (error) {
      logger.error('Failed to save meta-learning data:', error);
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const saved = (global as any).astraforge_meta_learning;
      if (!saved) return;

      this.patterns = new Map(saved.patterns || []);
      this.strategies = new Map(saved.strategies || []);
      this.insights = saved.insights || [];
      this.performanceHistory = saved.performanceHistory || [];

      logger.info(`📊 Loaded ${this.patterns.size} patterns, ${this.strategies.size} strategies`);
    } catch (error) {
      logger.error('Failed to load meta-learning data:', error);
    }
  }
}