/**
 * Pattern Analyzer for Meta-Learning System
 *
 * Analyzes project patterns to identify:
 * 1. Success patterns and anti-patterns
 * 2. Technology-specific success factors
 * 3. Complexity-performance relationships
 * 4. Team size optimization patterns
 * 5. Temporal patterns and trends
 */

import { ProjectPattern, _MetaLearningInsight } from '../MetaLearningSystem';
import { logger } from '../../utils/logger';

export interface PatternAnalysisResult {
  successPatterns: SuccessPattern[];
  antiPatterns: AntiPattern[];
  technologyCorrelations: TechnologyCorrelation[];
  complexityInsights: ComplexityInsight[];
  temporalTrends: TemporalTrend[];
  recommendations: string[];
}

export interface SuccessPattern {
  name: string;
  description: string;
  confidence: number;
  frequency: number;
  factors: string[];
  projectTypes: string[];
}

export interface AntiPattern {
  name: string;
  description: string;
  risk: number;
  commonCauses: string[];
  mitigationStrategies: string[];
}

export interface _SuccessPattern {
  name: string;
  description: string;
  confidence: number;
  frequency: number;
  factors: string[];
  projectTypes: string[];
}

export interface _AntiPattern {
  name: string;
  description: string;
  risk: number;
  commonCauses: string[];
  mitigationStrategies: string[];
}

export interface TechnologyCorrelation {
  technology: string;
  successRate: number;
  avgSatisfaction: number;
  projectCount: number;
  correlatedTechnologies: string[];
}

export interface ComplexityInsight {
  complexityRange: string;
  successRate: number;
  avgDuration: number;
  recommendedTeamSize: number;
  commonPitfalls: string[];
}

export interface TemporalTrend {
  period: string;
  metric: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  change: number;
  confidence: number;
}

export class PatternAnalyzer {
  /**
   * Analyze a collection of project patterns
   */
  analyzePatterns(patterns: ProjectPattern[]): PatternAnalysisResult {
    logger.info(`🔍 Analyzing ${patterns.length} project patterns`);

    const result: PatternAnalysisResult = {
      successPatterns: this.identifySuccessPatterns(patterns),
      antiPatterns: this.identifyAntiPatterns(patterns),
      technologyCorrelations: this.analyzeTechnologyCorrelations(patterns),
      complexityInsights: this.analyzeComplexityInsights(patterns),
      temporalTrends: this.analyzeTemporalTrends(patterns),
      recommendations: this.generateRecommendations(patterns)
    };

    return result;
  }

  /**
   * Identify patterns that lead to project success
   */
  private identifySuccessPatterns(patterns: ProjectPattern[]): SuccessPattern[] {
    const successPatterns: SuccessPattern[] = [];
    const successful = patterns.filter(p => p.success);

    if (successful.length < 3) return successPatterns;

    // AI Collaboration Success Pattern
    const highAICollab = successful.filter(p => p.aiCollaborationScore > 0.8);
    if (highAICollab.length / successful.length > 0.6) {
      successPatterns.push({
        name: 'High AI Collaboration',
        description: 'Projects with strong AI-agent collaboration show significantly higher success rates',
        confidence: 0.85,
        frequency: highAICollab.length / successful.length,
        factors: ['aiCollaborationScore > 0.8', 'multiAgentRounds >= 4'],
        projectTypes: ['all']
      });
    }

    // Technology Stack Success Pattern
    const techSuccessRates = new Map<string, { success: number, total: number }>();
    patterns.forEach(p => {
      p.technologies.forEach(tech => {
        const stats = techSuccessRates.get(tech) || { success: 0, total: 0 };
        stats.total++;
        if (p.success) stats.success++;
        techSuccessRates.set(tech, stats);
      });
    });

    for (const [tech, stats] of techSuccessRates.entries()) {
      const successRate = stats.success / stats.total;
      if (successRate > 0.8 && stats.total >= 3) {
        successPatterns.push({
          name: `${tech} Success Pattern`,
          description: `${tech} shows strong correlation with project success`,
          confidence: Math.min(successRate, 0.9),
          frequency: successRate,
          factors: [`technology.includes("${tech}")`],
          projectTypes: ['all']
        });
      }
    }

    // Team Size Optimization Pattern
    const teamSizeSuccess = new Map<number, { success: number, total: number }>();
    successful.forEach(p => {
      const stats = teamSizeSuccess.get(p.teamSize) || { success: 0, total: 0 };
      stats.success++;
      teamSizeSuccess.set(p.teamSize, stats);
    });

    patterns.forEach(p => {
      const stats = teamSizeSuccess.get(p.teamSize) || { success: 0, total: 0 };
      stats.total++;
      teamSizeSuccess.set(p.teamSize, stats);
    });

    for (const [teamSize, stats] of teamSizeSuccess.entries()) {
      const successRate = stats.success / stats.total;
      if (successRate > 0.7 && stats.total >= 5) {
        successPatterns.push({
          name: `Optimal Team Size (${teamSize})`,
          description: `Team size of ${teamSize} shows good success rates`,
          confidence: successRate,
          frequency: successRate,
          factors: [`teamSize === ${teamSize}`],
          projectTypes: ['all']
        });
      }
    }

    return successPatterns;
  }

  /**
   * Identify anti-patterns that lead to project failure
   */
  private identifyAntiPatterns(patterns: ProjectPattern[]): AntiPattern[] {
    const antiPatterns: AntiPattern[] = [];
    const failed = patterns.filter(p => !p.success);

    // Complexity Mismatch Anti-pattern
    const highComplexityFailures = failed.filter(p => p.complexity > 0.7);
    if (highComplexityFailures.length / failed.length > 0.5) {
      antiPatterns.push({
        name: 'Complexity Mismatch',
        description: 'High complexity projects failing due to inadequate planning or resources',
        risk: 0.8,
        commonCauses: ['Insufficient planning time', 'Inadequate team size', 'Poor technology choices'],
        mitigationStrategies: [
          'Increase planning phase duration',
          'Add more experienced team members',
          'Use proven technology stacks'
        ]
      });
    }

    // AI Collaboration Issues
    const lowAICollabFailures = failed.filter(p => p.aiCollaborationScore < 0.5);
    if (lowAICollabFailures.length / failed.length > 0.4) {
      antiPatterns.push({
        name: 'Poor AI Collaboration',
        description: 'Projects failing due to ineffective AI-agent collaboration',
        risk: 0.75,
        commonCauses: ['Insufficient agent count', 'Poor prompt engineering', 'Inadequate context sharing'],
        mitigationStrategies: [
          'Increase number of AI agents',
          'Improve prompt quality',
          'Enhance context retrieval'
        ]
      });
    }

    // Duration Issues
    const longDurationFailures = failed.filter(p => p.duration > 300); // 5+ hours
    if (longDurationFailures.length / failed.length > 0.3) {
      antiPatterns.push({
        name: 'Project Fatigue',
        description: 'Long-running projects failing due to fatigue and loss of momentum',
        risk: 0.7,
        commonCauses: ['Poor phase management', 'Scope creep', 'Lack of intermediate milestones'],
        mitigationStrategies: [
          'Break into smaller phases',
          'Set clear milestones',
          'Regular progress reviews'
        ]
      });
    }

    return antiPatterns;
  }

  /**
   * Analyze correlations between technologies and success
   */
  private analyzeTechnologyCorrelations(patterns: ProjectPattern[]): TechnologyCorrelation[] {
    const correlations: TechnologyCorrelation[] = [];

    // Get all unique technologies
    const allTechnologies = new Set<string>();
    patterns.forEach(p => p.technologies.forEach(tech => allTechnologies.add(tech)));

    for (const tech of allTechnologies) {
      const techPatterns = patterns.filter(p => p.technologies.includes(tech));
      const successCount = techPatterns.filter(p => p.success).length;
      const successRate = successCount / techPatterns.length;

      if (techPatterns.length >= 3) {
        // Find correlated technologies
        const correlatedTechnologies: string[] = [];
        for (const otherTech of allTechnologies) {
          if (otherTech === tech) continue;

          const combinedPatterns = patterns.filter(p =>
            p.technologies.includes(tech) && p.technologies.includes(otherTech)
          );

          if (combinedPatterns.length >= 2) {
            const combinedSuccessRate = combinedPatterns.filter(p => p.success).length / combinedPatterns.length;
            if (combinedSuccessRate > successRate + 0.1) {
              correlatedTechnologies.push(otherTech);
            }
          }
        }

        correlations.push({
          technology: tech,
          successRate,
          avgSatisfaction: techPatterns.reduce((sum, p) => sum + p.userSatisfaction, 0) / techPatterns.length,
          projectCount: techPatterns.length,
          correlatedTechnologies
        });
      }
    }

    return correlations.sort((a, b) => b.successRate - a.successRate);
  }

  /**
   * Analyze insights based on project complexity
   */
  private analyzeComplexityInsights(patterns: ProjectPattern[]): ComplexityInsight[] {
    const insights: ComplexityInsight[] = [];

    const complexityRanges = [
      { min: 0, max: 0.3, label: 'Low' },
      { min: 0.3, max: 0.7, label: 'Medium' },
      { min: 0.7, max: 1.0, label: 'High' }
    ];

    for (const range of complexityRanges) {
      const rangePatterns = patterns.filter(p =>
        p.complexity >= range.min && p.complexity < range.max
      );

      if (rangePatterns.length < 3) continue;

      const successRate = rangePatterns.filter(p => p.success).length / rangePatterns.length;
      const avgDuration = rangePatterns.reduce((sum, p) => sum + p.duration, 0) / rangePatterns.length;

      // Find common team sizes for this complexity range
      const teamSizeCount = new Map<number, number>();
      rangePatterns.forEach(p => {
        teamSizeCount.set(p.teamSize, (teamSizeCount.get(p.teamSize) || 0) + 1);
      });

      let recommendedTeamSize = 1;
      let maxCount = 0;
      for (const [size, count] of teamSizeCount.entries()) {
        if (count > maxCount) {
          maxCount = count;
          recommendedTeamSize = size;
        }
      }

      // Identify common pitfalls
      const failed = rangePatterns.filter(p => !p.success);
      const commonFailureFactors = new Map<string, number>();

      failed.forEach(p => {
        p.failureFactors.forEach(factor => {
          commonFailureFactors.set(factor, (commonFailureFactors.get(factor) || 0) + 1);
        });
      });

      const commonPitfalls = Array.from(commonFailureFactors.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([factor]) => factor);

      insights.push({
        complexityRange: range.label,
        successRate,
        avgDuration,
        recommendedTeamSize,
        commonPitfalls
      });
    }

    return insights;
  }

  /**
   * Analyze temporal trends in project performance
   */
  private analyzeTemporalTrends(patterns: ProjectPattern[]): TemporalTrend[] {
    const trends: TemporalTrend[] = [];

    if (patterns.length < 10) return trends;

    const sortedPatterns = patterns.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Weekly trends (last 8 weeks)
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      const weekPatterns = sortedPatterns.filter(p =>
        p.timestamp >= weekStart && p.timestamp < weekEnd
      );

      if (weekPatterns.length >= 2) {
        weeks.push({
          start: weekStart,
          patterns: weekPatterns
        });
      }
    }

    // Analyze success rate trend
    if (weeks.length >= 4) {
      const firstHalf = weeks.slice(0, 4);
      const secondHalf = weeks.slice(4);

      const firstSuccessRate = firstHalf.reduce((sum, w) =>
        sum + (w.patterns.filter(p => p.success).length / w.patterns.length), 0
      ) / firstHalf.length;

      const secondSuccessRate = secondHalf.reduce((sum, w) =>
        sum + (w.patterns.filter(p => p.success).length / w.patterns.length), 0
      ) / secondHalf.length;

      const change = secondSuccessRate - firstSuccessRate;
      const trend: TemporalTrend = {
        period: 'Last 8 weeks',
        metric: 'Success Rate',
        trend: change > 0.05 ? 'increasing' : change < -0.05 ? 'decreasing' : 'stable',
        change,
        confidence: 0.7
      };

      trends.push(trend);
    }

    return trends;
  }

  /**
   * Generate actionable recommendations based on analysis
   */
  private generateRecommendations(patterns: ProjectPattern[]): string[] {
    const recommendations: string[] = [];

    const successRate = patterns.filter(p => p.success).length / patterns.length;

    if (successRate < 0.6) {
      recommendations.push('Consider increasing AI collaboration rounds for better consensus');
      recommendations.push('Review technology stack choices - some may have poor success rates');
      recommendations.push('Evaluate team size optimization based on project complexity');
    }

    // Find most successful technology combinations
    const techCombinations = new Map<string, { success: number, total: number }>();

    patterns.forEach(p => {
      if (p.technologies.length >= 2) {
        const combo = p.technologies.sort().join('+');
        const stats = techCombinations.get(combo) || { success: 0, total: 0 };
        stats.total++;
        if (p.success) stats.success++;
        techCombinations.set(combo, stats);
      }
    });

    const bestCombo = Array.from(techCombinations.entries())
      .filter(([_, stats]) => stats.total >= 3)
      .sort((a, b) => (b[1].success / b[1].total) - (a[1].success / a[1].total))[0];

    if (bestCombo && bestCombo[1].success / bestCombo[1].total > 0.8) {
      recommendations.push(`Consider using ${bestCombo[0].replace('+', ' + ')} for better success rates`);
    }

    // Complexity-based recommendations
    const highComplexity = patterns.filter(p => p.complexity > 0.7);
    if (highComplexity.length >= 3) {
      const highComplexitySuccessRate = highComplexity.filter(p => p.success).length / highComplexity.length;
      if (highComplexitySuccessRate < 0.5) {
        recommendations.push('High complexity projects need more careful planning and larger teams');
        recommendations.push('Consider breaking high complexity projects into smaller phases');
      }
    }

    return recommendations;
  }
}
