/**
 * Emergent Behavior System Integration
 *
 * This module integrates all emergent behavior components:
 * - EmergentBehaviorSystem: Core detection and amplification
 * - PatternDetector: Specific pattern detection
 * - BehaviorAmplifier: Behavior amplification strategies
 * - BehaviorAnalyzer: Deep analysis and insights
 */

export { EmergentBehaviorSystem } from './EmergentBehaviorSystem';
export { PatternDetector } from './detectors/PatternDetector';
export { BehaviorAmplifier } from './amplifiers/BehaviorAmplifier';
export { BehaviorAnalyzer } from './analyzers/BehaviorAnalyzer';

// Re-export types for convenience
export type {
  BehaviorPattern,
  EmergenceEvent,
  AmplificationStrategy
} from './EmergentBehaviorSystem';

// Import and re-export EmergentBehavior from the system
import type { EmergentBehavior } from './EmergentBehaviorSystem';
export type { EmergentBehavior };


export type {
  InteractionPattern,
  DetectedPattern
} from './detectors/PatternDetector';

export type {
  AmplificationResult,
  PropagationContext,
  BehaviorVariant
} from './amplifiers/BehaviorAmplifier';

export type {
  BehaviorAnalysis,
  EvolutionTrend,
  ImpactAssessment,
  StrategicInsight
} from './analyzers/BehaviorAnalyzer';

// Factory function for creating integrated emergent behavior system
import { EmergentBehaviorSystem } from './EmergentBehaviorSystem';
import { PatternDetector } from './detectors/PatternDetector';
import { BehaviorAmplifier } from './amplifiers/BehaviorAmplifier';
import { BehaviorAnalyzer } from './analyzers/BehaviorAnalyzer';
import { MetaLearningSystem } from '../meta-learning';

export interface EmergentBehaviorComponents {
  emergentBehaviorSystem: EmergentBehaviorSystem;
  patternDetector: PatternDetector;
  behaviorAmplifier: BehaviorAmplifier;
  behaviorAnalyzer: BehaviorAnalyzer;
}

export function createEmergentBehaviorSystem(
  metaLearning?: MetaLearningSystem
): EmergentBehaviorComponents {
  const emergentBehaviorSystem = new EmergentBehaviorSystem(metaLearning);
  const patternDetector = new PatternDetector();
  const behaviorAmplifier = new BehaviorAmplifier();
  const behaviorAnalyzer = new BehaviorAnalyzer();

  return {
    emergentBehaviorSystem,
    patternDetector,
    behaviorAmplifier,
    behaviorAnalyzer
  };
}

// Integration utilities
export class EmergentBehaviorIntegration {
  private components: EmergentBehaviorComponents;

  constructor(components: EmergentBehaviorComponents) {
    this.components = components;
  }

  /**
   * Process an interaction for emergent behavior detection and analysis
   */
  async processInteraction(
    agents: string[],
    context: string,
    interaction: string,
    outcome: Record<string, any>
  ): Promise<void> {
    // Create interaction pattern
    const interactionPattern = {
      id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agents,
      interaction,
      context,
      outcome,
      timestamp: new Date(),
      sessionId: `session_${Date.now()}`
    };

    // Detect patterns
    const detectedPatterns = await this.components.patternDetector.analyzeInteraction(interactionPattern);

    // For each detected pattern, create emergent behavior if significant
    for (const pattern of detectedPatterns) {
      if (pattern.confidence > 0.6) {
        const emergentBehavior = await this.components.emergentBehaviorSystem.monitorInteraction(
          agents, context, interaction, outcome
        );

        if (emergentBehavior) {
          // Analyze the behavior
          const analyses = await this.components.behaviorAnalyzer.analyzeBehavior(emergentBehavior);

          // Amplify if appropriate
          if (emergentBehavior.characteristics.effectiveness > 0.7) {
            await this.components.behaviorAmplifier.amplifyBehavior(
              emergentBehavior,
              this.selectAmplificationStrategy(emergentBehavior)
            );
          }

          console.log(`🚀 Emergent behavior processed: ${emergentBehavior.title}`);
          console.log(`   - Analyses: ${analyses.length}`);
          console.log(`   - Confidence: ${Math.round(emergentBehavior.characteristics.effectiveness * 100)}%`);
          console.log(`   - Type: ${emergentBehavior.type}`);
        }
      }
    }
  }

  /**
   * Get comprehensive emergent behavior analytics
   */
  getAnalytics(): Record<string, any> {
    const behaviors = Array.from(this.components.emergentBehaviorSystem.getBehaviors().values());
    const analyses = this.components.behaviorAnalyzer.getAnalysisHistory();
    const evolutionTrends = Array.from(this.components.behaviorAnalyzer.getEvolutionTrends().values());

    const behaviorCount = behaviors.length;
    const breakthroughCount = behaviors.filter(b => b.type === 'breakthrough').length;
    const innovationCount = behaviors.filter(b => b.type === 'innovation').length;
    const avgEffectiveness = behaviors.reduce((sum, b) => sum + b.characteristics.effectiveness, 0) / behaviorCount || 0;

    const typeDistribution = behaviors.reduce((dist, b) => {
      dist[b.type] = (dist[b.type] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    const impactDistribution = behaviors.reduce((dist, b) => {
      const impact = b.metadata.potential;
      if (impact > 0.8) dist.high = (dist.high || 0) + 1;
      else if (impact > 0.5) dist.medium = (dist.medium || 0) + 1;
      else dist.low = (dist.low || 0) + 1;
      return dist;
    }, { high: 0, medium: 0, low: 0 });

    return {
      behaviorCount,
      breakthroughCount,
      innovationCount,
      avgEffectiveness: Math.round(avgEffectiveness * 100) / 100,
      typeDistribution,
      impactDistribution,
      analysisCount: analyses.length,
      evolutionTrendCount: evolutionTrends.length,
      recentActivity: this.getRecentActivity()
    };
  }

  /**
   * Get recent emergent behavior activity
   */
  private getRecentActivity(): any[] {
    const recentBehaviors = Array.from(this.components.emergentBehaviorSystem.getBehaviors().values())
      .filter(b => b.trigger.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
      .sort((a, b) => b.trigger.timestamp.getTime() - a.trigger.timestamp.getTime())
      .slice(0, 10);

    return recentBehaviors.map(b => ({
      id: b.id,
      type: b.type,
      title: b.title,
      effectiveness: Math.round(b.characteristics.effectiveness * 100),
      novelty: Math.round(b.characteristics.novelty * 100),
      timestamp: b.trigger.timestamp.toISOString()
    }));
  }

  /**
   * Select appropriate amplification strategy for a behavior
   */
  private selectAmplificationStrategy(behavior: EmergentBehavior): 'reinforce' | 'propagate' | 'adapt' | 'combine' | 'specialize' {
    // Strategy selection based on behavior characteristics
    if (behavior.type === 'breakthrough') {
      return 'specialize';
    }
    if (behavior.characteristics.effectiveness > 0.8 && behavior.characteristics.reproducibility > 0.7) {
      return 'propagate';
    }
    if (behavior.characteristics.complexity > 0.6) {
      return 'adapt';
    }
    if (behavior.characteristics.novelty > 0.7) {
      return 'combine';
    }
    return 'reinforce';
  }

  /**
   * Get strategic insights for emergent behaviors
   */
  getStrategicInsights(): any[] {
    const behaviors = Array.from(this.components.emergentBehaviorSystem.getBehaviors().values());
    const insights: any[] = [];

    for (const behavior of behaviors.slice(0, 5)) { // Top 5 behaviors
      const evolution = this.components.behaviorAnalyzer.getEvolutionTrends().get(behavior.id);
      const impact = this.components.behaviorAnalyzer.getImpactAssessments().get(behavior.id);

      insights.push({
        behaviorId: behavior.id,
        title: behavior.title,
        strategicValue: behavior.metadata.potential,
        currentStage: evolution?.currentStage || 'unknown',
        predictedNext: evolution?.predictedNext || [],
        immediateImpact: impact?.immediateImpact || 0,
        longTermPotential: impact?.longTermPotential || 0,
        riskFactors: impact?.riskFactors || [],
        successFactors: impact?.successFactors || [],
        recommendation: this.generateRecommendation(behavior, evolution, impact)
      });
    }

    return insights;
  }

  /**
   * Generate recommendation for a behavior
   */
  private generateRecommendation(
    behavior: EmergentBehavior,
    evolution?: any,
    impact?: any
  ): string {
    const type = behavior.type;
    const effectiveness = behavior.characteristics.effectiveness;
    const potential = behavior.metadata.potential;

    if (type === 'breakthrough' && effectiveness > 0.8) {
      return 'Deploy immediately in production environments with monitoring';
    }
    if (potential > 0.8 && effectiveness > 0.7) {
      return 'Amplify and propagate to similar contexts';
    }
    if (evolution?.currentStage === 'emerging') {
      return 'Protect and nurture this nascent behavior';
    }
    if (impact?.riskFactors && impact.riskFactors.length > 2) {
      return 'Mitigate risks before further development';
    }
    if (potential > 0.6) {
      return 'Consider for integration into standard workflows';
    }

    return 'Monitor for further development and testing';
  }
}

// VS Code integration
import * as vscode from 'vscode';

export class EmergentBehaviorProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private integration: EmergentBehaviorIntegration;

  constructor(private extensionUri: vscode.Uri, integration: EmergentBehaviorIntegration) {
    this.integration = integration;
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true };

    webviewView.webview.html = this.getWebviewContent();
    this.updateWebview();
  }

  private getWebviewContent(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>AstraForge Emergent Behavior</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
          }
          .section {
            margin-bottom: 30px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 15px;
          }
          .section h3 {
            margin-top: 0;
            color: var(--vscode-textLink-foreground);
          }
          .behavior-item {
            padding: 10px;
            margin: 8px 0;
            border-radius: 4px;
            border-left: 4px solid var(--vscode-textLink-foreground);
          }
          .breakthrough { background-color: rgba(147, 112, 219, 0.1); border-left-color: #9338d8; }
          .innovation { background-color: rgba(34, 139, 34, 0.1); border-left-color: #228b22; }
          .optimization { background-color: rgba(255, 193, 7, 0.1); border-left-color: #ffc107; }
          .adaptation { background-color: rgba(70, 130, 180, 0.1); border-left-color: #4682b4; }
          .collaboration { background-color: rgba(205, 92, 92, 0.1); border-left-color: #cd5c5c; }
          .metric {
            display: inline-block;
            margin: 5px;
            padding: 5px 10px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 3px;
          }
          .activity-item {
            padding: 8px;
            margin: 4px 0;
            border-radius: 3px;
            background-color: var(--vscode-input-background);
          }
        </style>
      </head>
      <body>
        <h1>🚀 AstraForge Emergent Behavior Dashboard</h1>

        <div class="section">
          <h3>📊 Analytics Overview</h3>
          <div id="analytics"></div>
        </div>

        <div class="section">
          <h3>🧬 Recent Emergent Behaviors</h3>
          <div id="recent-behaviors"></div>
        </div>

        <div class="section">
          <h3>📈 Activity Timeline</h3>
          <div id="activity-timeline"></div>
        </div>

        <div class="section">
          <h3>🎯 Strategic Insights</h3>
          <div id="strategic-insights"></div>
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          let analytics = {};
          let recentBehaviors = [];
          let activityTimeline = [];
          let strategicInsights = [];

          function updateContent() {
            // Analytics
            const analyticsDiv = document.getElementById('analytics');
            analyticsDiv.innerHTML = Object.entries(analytics).map(([key, value]) => {
              if (typeof value === 'object') {
                return Object.entries(value).map(([subKey, subValue]) =>
                  \`<span class="metric">\${key}.\${subKey}: \${subValue}</span>\`
                ).join('');
              }
              return \`<span class="metric">\${key}: \${value}</span>\`;
            }).join('');

            // Recent Behaviors
            const behaviorsDiv = document.getElementById('recent-behaviors');
            behaviorsDiv.innerHTML = recentBehaviors.map(behavior =>
              \`<div class="behavior-item \${behavior.type}">
                <strong>\${behavior.title}</strong><br>
                <small>Type: \${behavior.type} | Effectiveness: \${behavior.effectiveness}% | Novelty: \${behavior.novelty}%</small><br>
                <em>\${behavior.timestamp}</em>
              </div>\`
            ).join('');

            // Activity Timeline
            const timelineDiv = document.getElementById('activity-timeline');
            timelineDiv.innerHTML = activityTimeline.map(activity =>
              \`<div class="activity-item">
                <strong>\${activity.type}</strong> - \${activity.title}<br>
                <small>\${activity.timestamp}</small>
              </div>\`
            ).join('');

            // Strategic Insights
            const insightsDiv = document.getElementById('strategic-insights');
            insightsDiv.innerHTML = strategicInsights.map(insight =>
              \`<div class="behavior-item">
                <strong>\${insight.title}</strong><br>
                <small>Stage: \${insight.currentStage} | Value: \${Math.round(insight.strategicValue * 100)}%</small><br>
                <em>Recommendation: \${insight.recommendation}</em>
              </div>\`
            ).join('');
          }

          // Message handling
          window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
              case 'update':
                analytics = message.analytics;
                recentBehaviors = message.recentBehaviors || [];
                activityTimeline = message.activityTimeline || [];
                strategicInsights = message.strategicInsights || [];
                updateContent();
                break;
            }
          });

          // Request initial data
          vscode.postMessage({ type: 'ready' });
        </script>
      </body>
      </html>
    `;
  }

  private updateWebview(): void {
    if (this.view) {
      const analytics = this.integration.getAnalytics();
      const strategicInsights = this.integration.getStrategicInsights();

      this.view.webview.postMessage({
        type: 'update',
        analytics,
        recentBehaviors: analytics.recentActivity,
        activityTimeline: analytics.recentActivity,
        strategicInsights
      });
    }
  }

  refresh(): void {
    this.updateWebview();
  }
}
