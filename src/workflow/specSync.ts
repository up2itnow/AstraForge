import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { SpecKitManager } from '../spec-kit/specKitManager';
import { GitManager, GitFileDiff, GitDiffStatus } from '../git/gitManager';
import { logger } from '../utils/logger';

interface TaskGraphNode {
  id: string;
  phase: string;
  description: string;
  filePath: string;
  prerequisites: string[];
  estimatedTime: string;
  type: string;
  priority: string;
}

interface TaskGraphEdge {
  from: string;
  to: string;
  reason?: string;
}

interface TaskGraphData {
  metadata: {
    workflowId: string;
    featureName: string;
    generatedAt: string;
    estimatedDuration: string;
  };
  nodes: TaskGraphNode[];
  edges: TaskGraphEdge[];
  parallelGroups: Array<{ groupId: string; tasks: string[]; description: string }>;
  acceptanceCriteria?: string[];
}

interface AcceptanceData {
  workflowId: string;
  featureName: string;
  acceptanceCriteria: string[];
  functionalRequirements?: string[];
  userScenarios?: string[];
}

interface WorkflowContext {
  workflowId: string;
  featureName: string;
  workspaceDir: string;
  specsDir: string;
  taskGraphPath: string;
  acceptancePath?: string;
}

export interface SpecAlignedTask {
  taskId: string;
  description: string;
  phase: string;
  filePath: string;
  normalizedPath?: string;
  gitStatus: GitFileDiff;
}

export interface SpecDeviation {
  type: 'missingImplementation' | 'phaseDrift' | 'testingLag' | 'acceptanceGap';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  relatedTaskIds?: string[];
}

export interface SpecSyncReport {
  workflowId: string;
  featureName: string;
  activePhase: string;
  generatedAt: string;
  acceptanceCriteria: string[];
  alignedTasks: SpecAlignedTask[];
  deviations: SpecDeviation[];
  progress: {
    totalTasks: number;
    touchedTasks: number;
    currentPhaseTasks: number;
    currentPhaseTouched: number;
  };
}

export class SpecSync {
  private readonly phaseTaskMapping: Record<string, string[]> = {
    Planning: ['setup'],
    Prototyping: ['test', 'implementation'],
    Testing: ['integration', 'test'],
    Deployment: ['polish', 'integration'],
  };

  constructor(
    private readonly gitManager: GitManager,
    private readonly specKitManager?: SpecKitManager
  ) {}

  async generateReports(activePhase: string): Promise<SpecSyncReport[]> {
    const contexts = await this.resolveWorkflowContexts();
    const reports: SpecSyncReport[] = [];

    for (const context of contexts) {
      try {
        const report = await this.buildReport(context, activePhase);
        if (report) {
          reports.push(report);
        }
      } catch (error) {
        logger.error(`SpecSync: failed to build report for ${context.workflowId}: ${error}`);
      }
    }

    return reports;
  }

  private async resolveWorkflowContexts(): Promise<WorkflowContext[]> {
    const contexts: WorkflowContext[] = [];

    if (this.specKitManager) {
      for (const workflow of this.specKitManager.getWorkflows()) {
        const taskGraphPath = path.join(workflow.specsDir, 'task-graph.json');
        if (!(await this.pathExists(taskGraphPath))) {
          continue;
        }

        const acceptancePath = await this.resolveAcceptancePath(workflow.specsDir);
        contexts.push({
          workflowId: workflow.id,
          featureName: workflow.featureName,
          workspaceDir: workflow.workspaceDir,
          specsDir: workflow.specsDir,
          taskGraphPath,
          acceptancePath,
        });
      }
    }

    if (contexts.length > 0) {
      return contexts;
    }

    const workspaceDir =
      this.gitManager.getWorkspacePath() || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (!workspaceDir) {
      return contexts;
    }

    const specsDir = path.join(workspaceDir, 'specs');
    try {
      const entries = await fs.promises.readdir(specsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }
        const directory = path.join(specsDir, entry.name);
        const taskGraphPath = path.join(directory, 'task-graph.json');
        if (!(await this.pathExists(taskGraphPath))) {
          continue;
        }

        let metadata: TaskGraphData['metadata'] | undefined;
        try {
          const raw = await fs.promises.readFile(taskGraphPath, 'utf8');
          const parsed = JSON.parse(raw) as TaskGraphData;
          metadata = parsed.metadata;
        } catch (error) {
          logger.warn(`SpecSync: unable to parse task graph metadata for ${directory}: ${error}`);
        }

        contexts.push({
          workflowId: metadata?.workflowId || entry.name,
          featureName: metadata?.featureName || entry.name,
          workspaceDir,
          specsDir: directory,
          taskGraphPath,
          acceptancePath: await this.resolveAcceptancePath(directory),
        });
      }
    } catch (error) {
      logger.warn(`SpecSync: unable to read specs directory: ${error}`);
    }

    return contexts;
  }

  private async buildReport(
    context: WorkflowContext,
    activePhase: string
  ): Promise<SpecSyncReport | null> {
    try {
      const raw = await fs.promises.readFile(context.taskGraphPath, 'utf8');
      const graph = JSON.parse(raw) as TaskGraphData;

      const acceptanceData = await this.loadAcceptanceData(context.acceptancePath);
      const acceptanceCriteria =
        acceptanceData?.acceptanceCriteria || graph.acceptanceCriteria || [];

      const normalizedPaths = graph.nodes
        .map(node => this.normalizeTaskPath(node.filePath, context.workspaceDir))
        .filter((value): value is string => Boolean(value));

      const gitDiffs = await this.gitManager.getFileDiffs(normalizedPaths);

      const alignedTasks: SpecAlignedTask[] = graph.nodes.map(node => {
        const normalizedPath = this.normalizeTaskPath(node.filePath, context.workspaceDir) || undefined;
        const gitStatus: GitFileDiff = normalizedPath
          ? gitDiffs[normalizedPath] || { status: 'clean' }
          : { status: 'unknown' };
        return {
          taskId: node.id,
          description: node.description,
          phase: node.phase,
          filePath: node.filePath,
          normalizedPath,
          gitStatus,
        };
      });

      const relevantPhases = this.phaseTaskMapping[activePhase] || [];
      const currentPhaseTasks = alignedTasks.filter(task => relevantPhases.includes(task.phase));
      const currentPhaseTouched = currentPhaseTasks.filter(task => this.isTouched(task.gitStatus.status)).length;
      const touchedTasks = alignedTasks.filter(task => this.isTouched(task.gitStatus.status)).length;

      const deviations = this.detectDeviations(
        alignedTasks,
        relevantPhases,
        activePhase,
        acceptanceCriteria
      );

      return {
        workflowId: context.workflowId,
        featureName: context.featureName,
        activePhase,
        generatedAt: new Date().toISOString(),
        acceptanceCriteria,
        alignedTasks,
        deviations,
        progress: {
          totalTasks: alignedTasks.length,
          touchedTasks,
          currentPhaseTasks: currentPhaseTasks.length,
          currentPhaseTouched,
        },
      };
    } catch (error) {
      logger.error(`SpecSync: failed to load task graph for ${context.workflowId}: ${error}`);
      return null;
    }
  }

  private detectDeviations(
    alignedTasks: SpecAlignedTask[],
    relevantPhases: string[],
    activePhase: string,
    acceptanceCriteria: string[]
  ): SpecDeviation[] {
    const deviations: SpecDeviation[] = [];

    for (const task of alignedTasks) {
      if (relevantPhases.includes(task.phase) && !this.isTouched(task.gitStatus.status)) {
        deviations.push({
          type: 'missingImplementation',
          severity: 'warning',
          message: `Task ${task.taskId} (${task.description}) has not started in active phase ${activePhase}.`,
          relatedTaskIds: [task.taskId],
        });
      }

      if (!relevantPhases.includes(task.phase) && this.isTouched(task.gitStatus.status)) {
        deviations.push({
          type: 'phaseDrift',
          severity: 'critical',
          message: `Task ${task.taskId} (${task.description}) is progressing outside of the active phase (${activePhase}).`,
          relatedTaskIds: [task.taskId],
        });
      }
    }

    const implementationTouched = alignedTasks.filter(
      task => task.phase === 'implementation' && this.isTouched(task.gitStatus.status)
    );
    const testTouched = alignedTasks.filter(
      task => task.phase === 'test' && this.isTouched(task.gitStatus.status)
    );

    if (implementationTouched.length > 0 && testTouched.length === 0) {
      deviations.push({
        type: 'testingLag',
        severity: 'critical',
        message:
          'Implementation activity detected without corresponding test updates. Ensure TDD sequence is respected.',
        relatedTaskIds: implementationTouched.map(task => task.taskId),
      });
    }

    if (acceptanceCriteria.length > 0 && testTouched.length === 0 && relevantPhases.includes('test')) {
      deviations.push({
        type: 'acceptanceGap',
        severity: 'warning',
        message: 'Acceptance criteria defined but no test tasks show progress yet.',
      });
    }

    return deviations;
  }

  private isTouched(status: GitDiffStatus): boolean {
    return status !== 'clean' && status !== 'unknown';
  }

  private async resolveAcceptancePath(specsDir: string): Promise<string | undefined> {
    const acceptancePath = path.join(specsDir, 'acceptance-criteria.json');
    if (await this.pathExists(acceptancePath)) {
      return acceptancePath;
    }
    return undefined;
  }

  private async loadAcceptanceData(
    acceptancePath?: string
  ): Promise<AcceptanceData | undefined> {
    if (!acceptancePath) {
      return undefined;
    }

    try {
      const raw = await fs.promises.readFile(acceptancePath, 'utf8');
      return JSON.parse(raw) as AcceptanceData;
    } catch (error) {
      logger.warn(`SpecSync: unable to parse acceptance criteria at ${acceptancePath}: ${error}`);
      return undefined;
    }
  }

  private normalizeTaskPath(filePath: string, workspaceDir: string): string | null {
    if (!filePath || filePath === 'multiple') {
      return null;
    }

    const cleaned = filePath.replace(/^\.\//, '').trim();
    if (!cleaned) {
      return null;
    }

    const absolute = path.isAbsolute(cleaned) ? cleaned : path.join(workspaceDir, cleaned);
    const relative = path.relative(workspaceDir, absolute).replace(/\\/g, '/');

    if (!relative || relative.startsWith('..')) {
      return null;
    }

    return relative;
  }

  private async pathExists(targetPath: string): Promise<boolean> {
    try {
      await fs.promises.access(targetPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}
