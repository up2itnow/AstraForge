import { exec } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PhaseEvaluationOptions {
  phase: string;
  workspaceRoot?: string;
  humanDecision?: string;
  humanFeedback?: number;
  iteration?: number;
}

export interface CommandResult {
  id: string;
  command: string;
  success: boolean;
  durationMs: number;
  stdout: string;
  stderr: string;
  skipped?: boolean;
}

export interface PhaseMetric {
  key: string;
  value: number;
  unit?: string;
  details?: Record<string, unknown>;
}

export interface PhaseTelemetry {
  phase: string;
  timestamp: number;
  durationMs: number;
  success: boolean;
  metrics: PhaseMetric[];
  commandResults: CommandResult[];
  metadata?: {
    humanDecision?: string;
    humanFeedback?: number;
    iteration?: number;
    workspaceRoot?: string;
  };
}

interface PackageScripts {
  [name: string]: string;
}

export class PhaseEvaluator {
  private readonly workspaceRoot?: string;
  private readonly maxCommandOutput = 5000;

  constructor(workspaceRoot?: string) {
    this.workspaceRoot = workspaceRoot;
  }

  async evaluatePhase(options: PhaseEvaluationOptions): Promise<PhaseTelemetry> {
    const timestamp = Date.now();
    const workspace = options.workspaceRoot ?? this.workspaceRoot ?? process.cwd();
    const startTime = Date.now();
    const metrics: PhaseMetric[] = [];
    const commandResults: CommandResult[] = [];

    const skipExecution =
      process.env.ASTRAFORGE_FORCE_EVALUATOR !== '1' &&
      (process.env.ASTRAFORGE_SKIP_PHASE_EVAL === '1' || process.env.NODE_ENV === 'test');

    if (skipExecution) {
      const quality = this.deriveQualityFromFeedback(options.humanFeedback);
      metrics.push({
        key: 'quality.score',
        value: quality,
        unit: 'ratio',
        details: { reason: 'evaluation_skipped' },
      });
      metrics.push({ key: 'defects.count', value: 0, unit: 'count' });
      metrics.push({ key: 'latency.totalMs', value: 0, unit: 'ms' });

      return {
        phase: options.phase,
        timestamp,
        durationMs: Date.now() - startTime,
        success: true,
        metrics,
        commandResults,
        metadata: this.buildMetadata(options, workspace),
      };
    }

    const scripts = await this.loadPackageScripts(workspace);
    const lintResult = await this.runIfAvailable({
      id: 'lint',
      script: 'lint',
      fallback: undefined,
      scripts,
      workspace,
    });
    if (lintResult) {
      commandResults.push(lintResult);
    }

    const testResult = await this.runIfAvailable({
      id: 'tests',
      script: 'test:coverage',
      fallback: scripts['test']
        ? 'npm run test -- --runInBand --coverage --coverageReporters=json-summary'
        : undefined,
      scripts,
      workspace,
    });
    if (testResult) {
      commandResults.push(testResult);
    }

    const coverageMetrics = await this.collectCoverageMetrics(workspace);
    metrics.push(...coverageMetrics);

    const defects = commandResults.filter(result => !result.success && !result.skipped);
    metrics.push({
      key: 'defects.count',
      value: defects.length,
      unit: 'count',
      details: defects.length
        ? {
            signatures: defects.map(defect =>
              this.extractDefectSignature(defect.stderr || defect.stdout)
            ),
          }
        : undefined,
    });

    const lintScore = lintResult ? (lintResult.success ? 1 : 0) : 0.5;
    const testScore = testResult ? (testResult.success ? 1 : 0) : 0.5;
    const coverageValues = coverageMetrics.map(metric => metric.value);
    const coverageScore = coverageValues.length
      ? coverageValues.reduce((sum, value) => sum + value, 0) / coverageValues.length
      : 0.5;
    const qualityScore = Math.min(
      1,
      Math.max(0, (lintScore + testScore + coverageScore) / 3)
    );
    metrics.push({
      key: 'quality.score',
      value: qualityScore,
      unit: 'ratio',
      details: { lintScore, testScore, coverageScore },
    });

    const totalDuration = Date.now() - startTime;
    metrics.push({ key: 'latency.totalMs', value: totalDuration, unit: 'ms' });
    if (lintResult) {
      metrics.push({ key: 'latency.lintMs', value: lintResult.durationMs, unit: 'ms' });
    }
    if (testResult) {
      metrics.push({ key: 'latency.testMs', value: testResult.durationMs, unit: 'ms' });
    }

    return {
      phase: options.phase,
      timestamp,
      durationMs: totalDuration,
      success: defects.length === 0,
      metrics,
      commandResults,
      metadata: this.buildMetadata(options, workspace),
    };
  }

  summarizeTelemetry(telemetry: PhaseTelemetry): PhaseTelemetry {
    return {
      ...telemetry,
      commandResults: telemetry.commandResults.map(result => ({
        ...result,
        stdout: result.stdout.slice(0, this.maxCommandOutput),
        stderr: result.stderr.slice(0, this.maxCommandOutput),
      })),
    };
  }

  private async runIfAvailable(params: {
    id: string;
    script: string;
    fallback?: string;
    scripts: PackageScripts;
    workspace: string;
  }): Promise<CommandResult | undefined> {
    const { id, script, fallback, scripts, workspace } = params;

    if (!scripts[script]) {
      if (!fallback) {
        return {
          id,
          command: 'skip',
          success: true,
          durationMs: 0,
          stdout: '',
          stderr: `Skipped: no script named ${script}`,
          skipped: true,
        };
      }

      return this.runCommand({
        id,
        command: fallback,
        workspace,
      });
    }

    return this.runCommand({
      id,
      command: `npm run ${script}`,
      workspace,
    });
  }

  private async runCommand(params: {
    id: string;
    command: string;
    workspace: string;
  }): Promise<CommandResult> {
    const { id, command, workspace } = params;
    const start = Date.now();

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: workspace,
        maxBuffer: 20 * 1024 * 1024,
        env: { ...process.env },
      });

      return {
        id,
        command,
        success: true,
        durationMs: Date.now() - start,
        stdout,
        stderr,
      };
    } catch (error: any) {
      const stdout = error?.stdout ?? '';
      const stderr = error?.stderr ?? String(error);
      return {
        id,
        command,
        success: false,
        durationMs: Date.now() - start,
        stdout,
        stderr,
      };
    }
  }

  private async loadPackageScripts(workspace: string): Promise<PackageScripts> {
    try {
      const packagePath = path.join(workspace, 'package.json');
      const data = await fs.readFile(packagePath, 'utf-8');
      const packageJson = JSON.parse(data);
      return packageJson.scripts ?? {};
    } catch {
      return {};
    }
  }

  private async collectCoverageMetrics(workspace: string): Promise<PhaseMetric[]> {
    const summaryPath = path.join(workspace, 'coverage', 'coverage-summary.json');
    try {
      const data = await fs.readFile(summaryPath, 'utf-8');
      const summary = JSON.parse(data);
      const totals = summary.total ?? {};
      const keys = ['lines', 'statements', 'functions', 'branches'] as const;

      return keys
        .map(key => {
          const stats = totals[key];
          if (!stats || typeof stats.pct !== 'number') {
            return undefined;
          }

          return {
            key: `coverage.${key}`,
            value: Math.max(0, Math.min(1, stats.pct / 100)),
            unit: 'ratio',
            details: stats,
          } as PhaseMetric;
        })
        .filter((metric): metric is PhaseMetric => Boolean(metric));
    } catch {
      return [];
    }
  }

  private extractDefectSignature(output: string): string {
    const normalized = output.replace(/\x1b\[[0-9;]*m/g, '').trim();
    if (!normalized) {
      return 'Unknown failure';
    }

    return normalized
      .split('\n')
      .slice(0, 5)
      .map(line => line.trim())
      .join(' \u2022 ')
      .slice(0, 300);
  }

  private deriveQualityFromFeedback(feedback?: number): number {
    if (typeof feedback !== 'number' || Number.isNaN(feedback)) {
      return 0.7;
    }
    return Math.max(0, Math.min(1, feedback));
  }

  private buildMetadata(options: PhaseEvaluationOptions, workspace: string) {
    return {
      humanDecision: options.humanDecision,
      humanFeedback: options.humanFeedback,
      iteration: options.iteration,
      workspaceRoot: workspace,
    };
  }
}
