/**
 * Recursive Self-Modification System Integration
 *
 * Unified interface for the complete self-modification framework:
 * - SelfModificationSystem: Core orchestration
 * - SelfAnalysisEngine: System analysis and improvement identification
 * - CodeModificationSystem: Safe code modifications
 * - ValidationFramework: Comprehensive validation
 * - SafetyFramework: Safety and rollback mechanisms
 */

export { SelfModificationSystem } from './SelfModificationSystem';
export { SelfAnalysisEngine } from './analyzers/SelfAnalysisEngine';
export { CodeModificationSystem } from './modifiers/CodeModificationSystem';
export { ValidationFramework } from './validators/ValidationFramework';
export { SafetyFramework } from './safety/SafetyFramework';

// Re-export types for convenience
export type {
  SelfModification,
  ModificationResult,
  SystemHealth
} from './SelfModificationSystem';

export type {
  AnalysisResult,
  SystemAnalysis
} from './analyzers/SelfAnalysisEngine';

export type {
  CodeModification,
  ModificationResult as CodeModificationResult,
  OptimizationRule
} from './modifiers/CodeModificationSystem';

export type {
  ValidationTest,
  ValidationResult,
  ValidationSuite,
  ValidationReport
} from './validators/ValidationFramework';

export type {
  SafetyCheck,
  RiskAssessment,
  RollbackPlan,
  SystemSnapshot
} from './safety/SafetyFramework';

// Factory function for creating integrated self-modification system
import { SelfModificationSystem } from './SelfModificationSystem';
import { SelfAnalysisEngine } from './analyzers/SelfAnalysisEngine';
import { CodeModificationSystem } from './modifiers/CodeModificationSystem';
import { ValidationFramework } from './validators/ValidationFramework';
import { SafetyFramework } from './safety/SafetyFramework';
import { MetaLearningIntegration } from '../meta-learning';
import { EmergentBehaviorSystem } from '../emergent-behavior';

export interface SelfModificationComponents {
  selfModificationSystem: SelfModificationSystem;
  analysisEngine: SelfAnalysisEngine;
  codeModifier: CodeModificationSystem;
  validator: ValidationFramework;
  safety: SafetyFramework;
}

export function createSelfModificationSystem(
  workspacePath: string,
  metaLearning?: MetaLearningIntegration,
  emergentBehavior?: EmergentBehaviorSystem
): SelfModificationComponents {
  // Initialize all components
  const analysisEngine = new SelfAnalysisEngine(workspacePath);
  const codeModifier = new CodeModificationSystem(workspacePath);
  const validator = new ValidationFramework(workspacePath);
  const safety = new SafetyFramework(workspacePath);

  // Create main self-modification system with dependencies
  const selfModificationSystem = new SelfModificationSystem(
    workspacePath,
    metaLearning,
    emergentBehavior
  );

  return {
    selfModificationSystem,
    analysisEngine,
    codeModifier,
    validator,
    safety
  };
}

// Integration utilities
export class SelfModificationIntegration {
  private components: SelfModificationComponents;
  private activeModifications: Set<string> = new Set();
  private modificationQueue: Array<{
    id: string;
    priority: number;
    timestamp: Date;
  }> = [];

  constructor(components: SelfModificationComponents) {
    this.components = components;
  }

  /**
   * Analyze system and identify improvement opportunities
   */
  async analyzeAndSuggestImprovements(): Promise<{
    opportunities: any[];
    analysis: any;
    safetyStatus: any;
    recommendations: string[];
  }> {
    try {
      // Run system analysis
      const analysis = await this.components.analysisEngine.analyzeSystem();

      // Get safety status
      const safetyStatus = this.components.safety.getSafetyStatus();

      // Check if system is safe for modifications
      const safetyCheck = await this.components.safety.isSafeForModifications();

      if (!safetyCheck.safe) {
        return {
          opportunities: [],
          analysis,
          safetyStatus,
          recommendations: [
            ...safetyCheck.recommendations,
            'System is not safe for modifications at this time'
          ]
        };
      }

      // Get improvement opportunities
      const opportunities = await this.components.selfModificationSystem.analyzeAndImprove();

      // Assess risks for each opportunity
      const opportunitiesWithRisks = await Promise.all(
        opportunities.map(async (opp) => {
          const riskAssessment = await this.components.safety.assessRisk(opp);
          const rollbackPlan = await this.components.safety.createRollbackPlan(opp);

          return {
            ...opp,
            riskAssessment,
            rollbackPlan
          };
        })
      );

      // Generate recommendations
      const recommendations = this.generateAnalysisRecommendations(
        analysis,
        safetyStatus,
        opportunitiesWithRisks
      );

      return {
        opportunities: opportunitiesWithRisks,
        analysis,
        safetyStatus,
        recommendations
      };

    } catch (error) {
      console.error('Self-modification analysis failed:', error);
      return {
        opportunities: [],
        analysis: { overallHealth: 0, categories: {}, topIssues: [], recommendations: [] },
        safetyStatus: { emergencyMode: true, activeViolations: 1, systemStability: 0 },
        recommendations: ['Analysis failed - manual intervention may be required']
      };
    }
  }

  /**
   * Apply a self-improvement modification
   */
  async applyImprovement(
    modification: any,
    options: {
      skipValidation?: boolean;
      force?: boolean;
      dryRun?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    result?: any;
    safetyReport: any;
    rollbackAvailable: boolean;
  }> {
    try {
      // Safety check
      const safetyCheck = await this.components.safety.isSafeForModifications();
      if (!safetyCheck.safe && !options.force) {
        return {
          success: false,
          safetyReport: safetyCheck,
          rollbackAvailable: false
        };
      }

      // Risk assessment
      const riskAssessment = await this.components.safety.assessRisk(modification);
      if (riskAssessment.overallRisk > 0.7 && !options.force) {
        return {
          success: false,
          safetyReport: { approved: false, risk: riskAssessment.overallRisk },
          rollbackAvailable: false
        };
      }

      // Validation (unless skipped)
      if (!options.skipValidation) {
        const validation = await this.components.validator.validateModification(modification);
        if (!validation.approved && !options.force) {
          return {
            success: false,
            safetyReport: validation,
            rollbackAvailable: false
          };
        }
      }

      // Create rollback plan
      const rollbackPlan = await this.components.safety.createRollbackPlan(modification);

      // Apply modification
      const result = await this.components.selfModificationSystem.applyModification(modification);

      return {
        success: result.success,
        result,
        safetyReport: {
          riskAssessed: riskAssessment.overallRisk,
          rollbackPlan: rollbackPlan.successProbability,
          validationPassed: true
        },
        rollbackAvailable: result.rollback?.available || false
      };

    } catch (error) {
      console.error('Failed to apply improvement:', error);
      return {
        success: false,
        safetyReport: { error: error },
        rollbackAvailable: false
      };
    }
  }

  /**
   * Get comprehensive system status
   */
  async getSystemStatus(): Promise<{
    analysis: any;
    safety: any;
    modifications: any;
    validation: any;
    health: any;
    recommendations: string[];
  }> {
    const [analysis, safety, modifications, validation] = await Promise.all([
      this.components.analysisEngine.analyzeSystem(),
      this.components.safety.getSafetyStatus(),
      this.components.selfModificationSystem.getModificationStats(),
      this.components.validator.getValidationStats()
    ]);

    const health = this.components.selfModificationSystem.getSystemHealth();

    const recommendations = this.generateSystemRecommendations({
      analysis,
      safety,
      modifications,
      validation,
      health
    });

    return {
      analysis,
      safety,
      modifications,
      validation,
      health,
      recommendations
    };
  }

  /**
   * Emergency shutdown
   */
  async emergencyShutdown(reason: string): Promise<void> {
    await this.components.safety.emergencyShutdown(reason);
  }

  /**
   * Get modification history
   */
  getModificationHistory(): Array<{
    id: string;
    type: string;
    status: 'success' | 'failed' | 'pending';
    timestamp: Date;
    risk: number;
    impact: number;
  }> {
    // This would return formatted modification history
    return [];
  }

  // Private helper methods

  private generateAnalysisRecommendations(
    analysis: any,
    safetyStatus: any,
    opportunities: any[]
  ): string[] {
    const recommendations: string[] = [];

    // Safety recommendations
    if (!safetyStatus.emergencyMode && safetyStatus.systemStability > 0.8) {
      if (opportunities.length > 0) {
        const safeOpportunities = opportunities.filter((opp: any) =>
          opp.riskAssessment.overallRisk < 0.3
        );

        if (safeOpportunities.length > 0) {
          recommendations.push(
            `Found ${safeOpportunities.length} low-risk improvement opportunities`
          );
        }
      }

      // System health recommendations
      const lowHealthCategories = Object.entries(analysis.categories).filter(
        ([_, data]: [string, any]) => data.score < 0.7
      );

      if (lowHealthCategories.length > 0) {
        recommendations.push(
          `Focus on improving: ${lowHealthCategories.map(([cat]) => cat).join(', ')}`
        );
      }
    } else {
      recommendations.push('System is not ready for modifications - address safety concerns first');
    }

    return recommendations;
  }

  private generateSystemRecommendations(status: any): string[] {
    const recommendations: string[] = [];

    // Analysis-based recommendations
    if (status.analysis.overallHealth < 0.8) {
      recommendations.push('System health is below optimal - consider running diagnostics');
    }

    // Safety recommendations
    if (status.safety.emergencyMode) {
      recommendations.push('EMERGENCY: System is in emergency mode - manual intervention required');
    } else if (status.safety.activeViolations > 0) {
      recommendations.push('Address active safety violations before proceeding with modifications');
    }

    // Modification recommendations
    if (status.modifications.failed > 0) {
      const failureRate = status.modifications.failed / status.modifications.total;
      if (failureRate > 0.2) {
        recommendations.push('High modification failure rate detected - review modification strategy');
      }
    }

    // Validation recommendations
    if (status.validation.averageSuccessRate < 0.9) {
      recommendations.push('Validation success rate is low - investigate test issues');
    }

    // Health recommendations
    if (status.health.performance.memoryUsage > 400) { // MB
      recommendations.push('High memory usage detected - consider optimization');
    }

    return recommendations.slice(0, 5); // Limit to top 5
  }
}

// VS Code integration
import * as vscode from 'vscode';

export class SelfModificationProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private integration: SelfModificationIntegration;

  constructor(
    private extensionUri: vscode.Uri,
    integration: SelfModificationIntegration
  ) {
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
        <title>AstraForge Self-Modification</title>
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
          .metric {
            display: inline-block;
            margin: 5px;
            padding: 5px 10px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 3px;
          }
          .opportunity {
            padding: 10px;
            margin: 8px 0;
            border-radius: 4px;
            border-left: 4px solid var(--vscode-textLink-foreground);
          }
          .low-risk { background-color: rgba(34, 139, 34, 0.1); border-left-color: #228b22; }
          .medium-risk { background-color: rgba(255, 193, 7, 0.1); border-left-color: #ffc107; }
          .high-risk { background-color: rgba(220, 53, 69, 0.1); border-left-color: #dc3545; }
          .status-item {
            padding: 8px;
            margin: 4px 0;
            border-radius: 3px;
            background-color: var(--vscode-input-background);
          }
          .emergency { background-color: rgba(220, 53, 69, 0.2); color: #dc3545; }
          .warning { background-color: rgba(255, 193, 7, 0.2); color: #ffc107; }
          .success { background-color: rgba(34, 139, 34, 0.2); color: #228b22; }
        </style>
      </head>
      <body>
        <h1>🔧 AstraForge Recursive Self-Modification</h1>

        <div class="section">
          <h3>📊 System Status</h3>
          <div id="system-status"></div>
        </div>

        <div class="section">
          <h3>🔍 Improvement Opportunities</h3>
          <div id="opportunities"></div>
        </div>

        <div class="section">
          <h3>🛡️ Safety & Validation</h3>
          <div id="safety-validation"></div>
        </div>

        <div class="section">
          <h3>📈 Performance Metrics</h3>
          <div id="performance-metrics"></div>
        </div>

        <div class="section">
          <h3>⚡ Actions</h3>
          <div id="actions"></div>
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          let systemStatus = {};
          let opportunities = [];
          let safetyValidation = {};
          let performanceMetrics = {};

          function updateContent() {
            // System Status
            const statusDiv = document.getElementById('system-status');
            statusDiv.innerHTML = Object.entries(systemStatus).map(([key, value]) => {
              const statusClass = value > 0.8 ? 'success' : value > 0.6 ? 'warning' : 'emergency';
              return \`<div class="status-item \${statusClass}">\${key}: \${typeof value === 'number' ? value.toFixed(2) : value}</div>\`;
            }).join('');

            // Opportunities
            const opportunitiesDiv = document.getElementById('opportunities');
            opportunitiesDiv.innerHTML = opportunities.map(opp => {
              const riskClass = opp.risk < 0.3 ? 'low-risk' : opp.risk < 0.6 ? 'medium-risk' : 'high-risk';
              return \`<div class="opportunity \${riskClass}">
                <strong>\${opp.title}</strong><br>
                <small>Type: \${opp.type} | Risk: \${(opp.risk * 100).toFixed(1)}% | Impact: \${(opp.impact * 100).toFixed(1)}%</small><br>
                <em>\${opp.description}</em>
              </div>\`;
            }).join('') || '<div class="status-item">No improvement opportunities found</div>';

            // Safety & Validation
            const safetyDiv = document.getElementById('safety-validation');
            safetyDiv.innerHTML = Object.entries(safetyValidation).map(([key, value]) => {
              const statusClass = value === true || value > 0.8 ? 'success' : value > 0.5 ? 'warning' : 'emergency';
              return \`<div class="status-item \${statusClass}">\${key}: \${value}</div>\`;
            }).join('');

            // Performance Metrics
            const metricsDiv = document.getElementById('performance-metrics');
            metricsDiv.innerHTML = Object.entries(performanceMetrics).map(([key, value]) => {
              return \`<span class="metric">\${key}: \${typeof value === 'number' ? value.toFixed(2) : value}</span>\`;
            }).join('');
          }

          // Message handling
          window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
              case 'update':
                systemStatus = message.systemStatus || {};
                opportunities = message.opportunities || [];
                safetyValidation = message.safetyValidation || {};
                performanceMetrics = message.performanceMetrics || {};
                updateContent();
                break;
              case 'action':
                vscode.postMessage({ type: message.action });
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
      this.integration.getSystemStatus().then(status => {
        this.view!.webview.postMessage({
          type: 'update',
          systemStatus: {
            'Overall Health': status.analysis.overallHealth,
            'System Stability': status.safety.systemStability,
            'Active Violations': status.safety.activeViolations,
            'Rollback Availability': status.safety.rollbackAvailability
          },
          safetyValidation: {
            'Emergency Mode': status.safety.emergencyMode,
            'Safe for Modifications': status.safety.activeViolations === 0 && status.safety.systemStability > 0.8,
            'Validation Success Rate': status.validation.averageSuccessRate,
            'Recent Assessments': status.safety.recentAssessments
          },
          performanceMetrics: {
            'Memory Usage': status.health.performance.memoryUsage,
            'Test Count': status.validation.totalTests,
            'Success Rate': status.validation.averageSuccessRate,
            'Modifications': status.modifications.total
          }
        });
      }).catch(error => {
        console.error('Failed to update self-modification webview:', error);
      });
    }
  }

  refresh(): void {
    this.updateWebview();
  }
}
