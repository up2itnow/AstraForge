/**
 * Meta-Learning System Integration
 *
 * This module integrates all meta-learning components:
 * - MetaLearningSystem: Core meta-learning functionality
 * - PatternAnalyzer: Pattern analysis and identification
 * - StrategyOptimizer: Strategy optimization and evolution
 * - InsightsEngine: Insight generation and recommendations
 */

export { MetaLearningSystem } from './MetaLearningSystem';
export { PatternAnalyzer } from './patterns/PatternAnalyzer';
export { StrategyOptimizer } from './strategies/StrategyOptimizer';
export { InsightsEngine } from './insights/InsightsEngine';

// Re-export types for convenience
export type {
  ProjectPattern,
  LearningStrategy,
  PerformanceMetric,
  AdaptationRule,
  MetaLearningInsight
} from './MetaLearningSystem';

export type {
  PatternAnalysisResult,
  SuccessPattern,
  AntiPattern,
  TechnologyCorrelation,
  ComplexityInsight,
  TemporalTrend
} from './patterns/PatternAnalyzer';

export type {
  StrategyPerformance,
  StrategyEvolution,
  OptimizationSuggestion
} from './strategies/StrategyOptimizer';

export type {
  PredictiveInsight,
  StrategicRecommendation,
  BreakthroughInsight
} from './insights/InsightsEngine';

// Types are already exported from their source modules above
// These duplicates were causing conflicts

// Factory function for creating integrated meta-learning system
import { MetaLearningSystem } from './MetaLearningSystem';
import { PatternAnalyzer } from './patterns/PatternAnalyzer';
import { StrategyOptimizer } from './strategies/StrategyOptimizer';
import { InsightsEngine } from './insights/InsightsEngine';

export interface MetaLearningComponents {
  metaLearningSystem: MetaLearningSystem;
  patternAnalyzer: PatternAnalyzer;
  strategyOptimizer: StrategyOptimizer;
  insightsEngine: InsightsEngine;
}

export function createMetaLearningSystem(): MetaLearningComponents {
  const metaLearningSystem = new MetaLearningSystem();
  const patternAnalyzer = new PatternAnalyzer();
  const strategyOptimizer = new StrategyOptimizer();
  const insightsEngine = new InsightsEngine();

  return {
    metaLearningSystem,
    patternAnalyzer,
    strategyOptimizer,
    insightsEngine
  };
}

// Integration utilities
export class MetaLearningIntegration {
  private components: MetaLearningComponents;

  constructor(components: MetaLearningComponents) {
    this.components = components;
  }

  /**
   * Record project completion and trigger full meta-learning analysis
   */
  async recordProjectAndAnalyze(
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
    // Record the project
    await this.components.metaLearningSystem.recordProjectCompletion(
      projectId, projectType, complexity, technologies, teamSize,
      duration, success, aiCollaborationScore, userSatisfaction, metadata
    );

    // Get current patterns for analysis
    const patterns = this.components.metaLearningSystem.getPatterns();
    const strategies = this.components.metaLearningSystem.getStrategies();

    // Run comprehensive analysis
    const analysis = this.components.patternAnalyzer.analyzePatterns(Array.from(patterns.values()));

    // Generate insights
    const insights = this.components.insightsEngine.generateInsights(patterns, strategies, analysis);

    // Log key findings
    console.log(`📊 Meta-learning analysis complete:`);
    console.log(`   - ${insights.metaInsights.length} new insights generated`);
    console.log(`   - ${insights.predictiveInsights.length} predictive insights`);
    console.log(`   - ${insights.strategicRecommendations.length} strategic recommendations`);
    console.log(`   - ${insights.breakthroughInsights.length} breakthrough insights`);

    // Store insights back in meta-learning system
    insights.metaInsights.forEach(insight => {
      this.components.metaLearningSystem.addInsight(insight);
    });
  }

  /**
   * Get optimal strategy for a new project
   */
  getOptimalStrategy(projectType: string, complexity: number) {
    return this.components.metaLearningSystem.getOptimalStrategy(projectType, complexity);
  }

  /**
   * Get all insights and recommendations
   */
  getAllInsights(): {
    metaInsights: any[];
    predictiveInsights: any[];
    strategicRecommendations: any[];
    breakthroughInsights: any[];
  } {
    const patterns = this.components.metaLearningSystem.getPatterns();
    const strategies = this.components.metaLearningSystem.getStrategies();
    const analysis = this.components.patternAnalyzer.analyzePatterns(Array.from(patterns.values()));

    return this.components.insightsEngine.generateInsights(patterns, strategies, analysis);
  }

  /**
   * Get analytics dashboard data
   */
  getAnalytics() {
    return {
      metaLearning: this.components.metaLearningSystem.getAnalytics(),
      patterns: this.components.patternAnalyzer.analyzePatterns(
        Array.from(this.components.metaLearningSystem.getPatterns().values())
      ),
      strategies: this.components.strategyOptimizer.getStrategyAnalytics()
    };
  }

  /**
   * Optimize strategies based on current performance
   */
  optimizeStrategies(): void {
    const patterns = this.components.metaLearningSystem.getPatterns();
    const strategies = this.components.metaLearningSystem.getStrategies();

    // Analyze performance
    const performances = this.components.strategyOptimizer.analyzeStrategyPerformance(strategies, patterns);

    // Get optimization suggestions
    const recommendations = this.components.strategyOptimizer.getOptimizationRecommendations(strategies, Array.from(patterns.values()));

    // Apply optimizations
    for (const [strategyId, suggestions] of Object.entries(recommendations)) {
      suggestions.forEach(suggestion => {
        console.log(`🔧 Strategy optimization: ${suggestion.suggestion} (${Math.round(suggestion.expectedImprovement * 100)}% improvement)`);
      });
    }

    // Evolve strategies
    const evolutions = this.components.strategyOptimizer.evolveStrategies(strategies, patterns);

    evolutions.forEach(evolution => {
      console.log(`🧬 Strategy evolution: ${evolution.evolvedStrategy.name} (${Math.round(evolution.performanceImprovement * 100)}% improvement)`);
    });
  }
}

// VS Code integration
import * as vscode from 'vscode';

export class MetaLearningProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private integration: MetaLearningIntegration;

  constructor(private extensionUri: vscode.Uri, integration: MetaLearningIntegration) {
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
        <title>AstraForge Meta-Learning</title>
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
          .insight {
            padding: 10px;
            margin: 8px 0;
            border-radius: 4px;
            border-left: 4px solid var(--vscode-textLink-foreground);
          }
          .high { background-color: rgba(255, 193, 7, 0.1); }
          .medium { background-color: rgba(34, 139, 34, 0.1); }
          .breakthrough { background-color: rgba(147, 112, 219, 0.1); }
          .metric {
            display: inline-block;
            margin: 5px;
            padding: 5px 10px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 3px;
          }
        </style>
      </head>
      <body>
        <h1>🧠 AstraForge Meta-Learning Dashboard</h1>

        <div class="section">
          <h3>📊 Performance Analytics</h3>
          <div id="analytics"></div>
        </div>

        <div class="section">
          <h3>💡 Latest Insights</h3>
          <div id="insights"></div>
        </div>

        <div class="section">
          <h3>🔮 Predictive Insights</h3>
          <div id="predictions"></div>
        </div>

        <div class="section">
          <h3>🚀 Breakthrough Opportunities</h3>
          <div id="breakthroughs"></div>
        </div>

        <div class="section">
          <h3>📈 Strategic Recommendations</h3>
          <div id="recommendations"></div>
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          let analytics = {};
          let insights = [];
          let predictions = [];
          let breakthroughs = [];
          let recommendations = [];

          function updateContent() {
            // Analytics
            const analyticsDiv = document.getElementById('analytics');
            analyticsDiv.innerHTML = Object.entries(analytics).map(([key, value]) =>
              \`<span class="metric">\${key}: \${typeof value === 'number' ? value.toFixed(2) : value}</span>\`
            ).join('');

            // Insights
            const insightsDiv = document.getElementById('insights');
            insightsDiv.innerHTML = insights.slice(0, 5).map(insight =>
              \`<div class="insight \${insight.impact}">
                <strong>\${insight.title}</strong><br>
                <small>\${insight.description}</small><br>
                <em>Confidence: \${Math.round(insight.confidence * 100)}%</em>
              </div>\`
            ).join('');

            // Predictions
            const predictionsDiv = document.getElementById('predictions');
            predictionsDiv.innerHTML = predictions.slice(0, 3).map(prediction =>
              \`<div class="insight \${prediction.impact}">
                <strong>\${prediction.title}</strong><br>
                <small>\${prediction.prediction}</small><br>
                <em>\${prediction.timeframe} • Confidence: \${Math.round(prediction.confidence * 100)}%</em>
              </div>\`
            ).join('');

            // Breakthroughs
            const breakthroughsDiv = document.getElementById('breakthroughs');
            breakthroughsDiv.innerHTML = breakthroughs.slice(0, 3).map(breakthrough =>
              \`<div class="insight breakthrough">
                <strong>\${breakthrough.title}</strong><br>
                <small>\${breakthrough.description}</small><br>
                <em>Novelty: \${Math.round(breakthrough.novelty * 100)}% • Potential: \${Math.round(breakthrough.potential * 100)}%</em>
              </div>\`
            ).join('');

            // Recommendations
            const recommendationsDiv = document.getElementById('recommendations');
            recommendationsDiv.innerHTML = recommendations.slice(0, 3).map(rec =>
              \`<div class="insight">
                <strong>\${rec.title}</strong><br>
                <small>\${rec.description}</small><br>
                <em>Priority: \${rec.priority} • Impact: \${Math.round(rec.expectedImpact * 100)}%</em>
              </div>\`
            ).join('');
          }

          // Message handling
          window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
              case 'update':
                analytics = message.analytics;
                insights = message.insights;
                predictions = message.predictions;
                breakthroughs = message.breakthroughs;
                recommendations = message.recommendations;
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
      const data = this.integration.getAllInsights();
      const analytics = this.integration.getAnalytics();

      this.view.webview.postMessage({
        type: 'update',
        analytics: analytics.metaLearning,
        insights: data.metaInsights,
        predictions: data.predictiveInsights,
        breakthroughs: data.breakthroughInsights,
        recommendations: data.strategicRecommendations
      });
    }
  }

  refresh(): void {
    this.updateWebview();
  }
}
