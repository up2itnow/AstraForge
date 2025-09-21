import * as vscode from 'vscode';
import { SpecKitManager } from '../spec-kit/specKitManager';
import { GitManager } from '../git/gitManager';
import { WorkflowManager } from '../workflow/workflowManager';
import { SpecSync } from '../workflow/specSync';
import { logger } from '../utils/logger';

export class SpecTelemetryDashboardProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private readonly specSync: SpecSync;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly specKitManager: SpecKitManager,
    private readonly gitManager: GitManager,
    private readonly workflowManager?: WorkflowManager
  ) {
    this.specSync = new SpecSync(this.gitManager, this.specKitManager);
  }

  async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
    };
    webviewView.webview.html = this.getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async message => {
      if (message?.command === 'refresh') {
        await this.pushData();
      }
    });

    webviewView.onDidChangeVisibility(async () => {
      if (webviewView.visible) {
        await this.pushData();
      }
    });

    await this.pushData();
  }

  private async pushData(): Promise<void> {
    if (!this.view) {
      return;
    }

    const activePhase = this.workflowManager?.getActivePhase() ?? 'Planning';

    try {
      const reports = await this.specSync.generateReports(activePhase);
      reports.forEach(report => {
        this.workflowManager?.ingestSpecDeviations(report);
      });

      this.view.webview.postMessage({
        type: 'spec-sync-report',
        payload: {
          activePhase,
          reports,
        },
      });
    } catch (error: any) {
      logger.error(`SpecTelemetryDashboard: failed to push data: ${error}`);
      vscode.window.showErrorMessage(
        `Spec Telemetry dashboard failed to refresh: ${error?.message || error}`
      );
    }
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = Date.now().toString(36);
    return /* html */ `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Spec Telemetry</title>
    <style>
      body {
        font-family: var(--vscode-font-family);
        color: var(--vscode-foreground);
        background: var(--vscode-sideBar-background);
        margin: 0;
        padding: 0.75rem;
      }
      h2 {
        font-size: 1.1rem;
        margin: 0 0 0.25rem 0;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.75rem;
      }
      .phase-pill {
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        padding: 0.2rem 0.6rem;
        border-radius: 999px;
        font-size: 0.8rem;
      }
      button.refresh {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        padding: 0.4rem 0.8rem;
        border-radius: 4px;
        cursor: pointer;
      }
      button.refresh:hover {
        background: var(--vscode-button-hoverBackground);
      }
      .report {
        border: 1px solid var(--vscode-panel-border);
        border-radius: 6px;
        padding: 0.75rem;
        margin-bottom: 0.75rem;
        background: var(--vscode-editor-background);
      }
      .progress-bar {
        width: 100%;
        background: var(--vscode-editor-inactiveSelectionBackground);
        border-radius: 4px;
        overflow: hidden;
        margin: 0.25rem 0 0.5rem 0;
      }
      .progress-bar span {
        display: block;
        height: 8px;
        background: var(--vscode-progressBar-background);
      }
      .deviation {
        border-left: 3px solid var(--vscode-errorForeground);
        padding-left: 0.5rem;
        margin: 0.3rem 0;
      }
      .deviation.warning {
        border-color: var(--vscode-editorWarning-foreground);
      }
      .deviation.info {
        border-color: var(--vscode-editorInfo-foreground);
      }
      ul.criteria {
        margin: 0.25rem 0 0.5rem 1rem;
      }
      table.tasks {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;
      }
      table.tasks th,
      table.tasks td {
        border-bottom: 1px solid var(--vscode-panel-border);
        padding: 0.2rem 0.3rem;
      }
      table.tasks th {
        text-align: left;
        color: var(--vscode-descriptionForeground);
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h2>Spec Telemetry</h2>
      <div>
        <span class="phase-pill" id="active-phase">Phase: -</span>
        <button class="refresh" id="refresh">Refresh</button>
      </div>
    </div>
    <div id="content">Loading spec telemetry...</div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();

      const severityClass = severity => {
        switch (severity) {
          case 'critical':
            return 'deviation';
          case 'warning':
            return 'deviation warning';
          default:
            return 'deviation info';
        }
      };

      const escapeHtml = value => {
        if (!value) {
          return '';
        }
        return value
          .toString()
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      };

      const renderProgress = progress => {
        if (!progress || progress.totalTasks === 0) {
          return '<div class="progress-bar"><span style="width:0%"></span></div>';
        }
        const percent = Math.round((progress.touchedTasks / progress.totalTasks) * 100);
        return (
          '<div class="progress-bar"><span style="width:' +
          percent +
          '%"></span></div><div>' +
          percent +
          '% overall coverage (' +
          progress.touchedTasks +
          '/' +
          progress.totalTasks +
          ')</div>'
        );
      };

      const renderReport = report => {
        const acceptance = report.acceptanceCriteria
          .map(item => '\n              <li>' + escapeHtml(item) + '</li>')
          .join('');

        const deviations = report.deviations.length
          ? report.deviations
              .map(
                deviation =>
                  '\n              <div class="' +
                  severityClass(deviation.severity) +
                  '">\n                <strong>' +
                  escapeHtml(deviation.type) +
                  '</strong> &mdash; ' +
                  escapeHtml(deviation.message) +
                  '\n              </div>'
              )
              .join('')
          : '<div class="deviation info">No discrepancies detected.</div>';

        const rows = report.alignedTasks
          .map(task => {
            const status = task.gitStatus?.status || 'clean';
            return (
              '\n              <tr>\n                <td>' +
              escapeHtml(task.taskId) +
              '</td>\n                <td>' +
              escapeHtml(task.phase) +
              '</td>\n                <td>' +
              escapeHtml(task.description) +
              '</td>\n                <td>' +
              escapeHtml(status) +
              '</td>\n              </tr>'
            );
          })
          .join('');

        return (
          '\n          <div class="report">\n            <h3>' +
          escapeHtml(report.featureName) +
          '</h3>\n            ' +
          renderProgress(report.progress) +
          '\n            <h4>Acceptance Criteria</h4>\n            <ul class="criteria">' +
          (acceptance || '<li>No criteria recorded.</li>') +
          '</ul>\n            <h4>Deviations</h4>\n            ' +
          deviations +
          '\n            <h4>Task Alignment</h4>\n            <table class="tasks">\n              <thead>\n                <tr>\n                  <th>ID</th>\n                  <th>Phase</th>\n                  <th>Description</th>\n                  <th>Git Status</th>\n                </tr>\n              </thead>\n              <tbody>' +
          rows +
          '</tbody>\n            </table>\n          </div>'
        );
      };

      const render = payload => {
        const phaseEl = document.getElementById('active-phase');
        if (phaseEl) {
          phaseEl.textContent = 'Phase: ' + payload.activePhase;
        }

        const content = document.getElementById('content');
        if (!payload.reports.length) {
          content.innerHTML = '<div class="deviation info">No Spec Kit artifacts available yet.</div>';
          return;
        }

        content.innerHTML = payload.reports.map(renderReport).join('');
      };

      window.addEventListener('message', event => {
        if (event.data && event.data.type === 'spec-sync-report') {
          render(event.data.payload);
        }
      });

      const refreshButton = document.getElementById('refresh');
      if (refreshButton) {
        refreshButton.addEventListener('click', () => {
          vscode.postMessage({ command: 'refresh' });
        });
      }
    </script>
  </body>
</html>`;
  }
}
