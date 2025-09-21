import * as vscode from 'vscode';
import { WorkflowManager } from '../workflow/workflowManager';

export class ProjectIgnitionProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'astraforge.projectIgnition';
  private _view?: vscode.Webview;
  private readonly _telemetryListener: (event: any) => void;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _workflowManager: WorkflowManager
  ) {
    // Initialize provider with extension URI and workflow manager
    this._telemetryListener = (event: any) => {
      if (!this._view) {
        return;
      }

      this._view.postMessage({ type: 'swarmTelemetry', payload: event });
    };

    this._workflowManager.on('swarm_telemetry', this._telemetryListener);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    // _context and _token are required by interface but not used in this implementation
    this._view = webviewView.webview;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    this.sendInitialState(webviewView.webview);

    webviewView.onDidDispose(() => this.dispose());

    webviewView.webview.onDidReceiveMessage(async data => {
      switch (data.type) {
        case 'submitIdea':
          this._workflowManager.startWorkflow(data.idea, data.option);
          break;
        case 'setArbitrationMode':
          this._workflowManager.setPhaseArbitrationMode(data.phase, data.mode);
          break;
        case 'requestInitialState':
          this.sendInitialState(webviewView.webview);
          break;
      }
    });
  }

  public dispose(): void {
    this._view = undefined;
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'ignition.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'styles.css')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <link href="${styleUri}" rel="stylesheet">
</head>
<body>
  <h1>Project Ignition</h1>
  <textarea id="ideaInput" placeholder="Enter your project idea..."></textarea>
  <select id="promptOption">
    <option value="direct">Direct Submit</option>
    <option value="letPanelDecide">Let the panel decide</option>
    <option value="custom">Custom refinements</option>
  </select>
  <div id="customBox" style="display:none;">
    <textarea id="customText"></textarea>
  </div>
  <button id="submitIdeaButton">Submit</button>

  <section class="arbitration-section">
    <h2>Phase Arbitration</h2>
    <p class="arbitration-hint">Toggle autonomous arbitration to let the swarm finalize a phase without manual approval.</p>
    <div id="arbitrationControls" class="arbitration-controls"></div>
  </section>

  <section class="telemetry-section">
    <h2>Swarm Telemetry</h2>
    <div id="telemetryFeed" class="telemetry-feed"></div>
  </section>

  <div id="progressTracker"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }

  private sendInitialState(webview: vscode.Webview): void {
    const arbitrationModes = this._workflowManager.getPhaseArbitrationModes();
    webview.postMessage({ type: 'arbitrationModes', payload: arbitrationModes });

    const recentTelemetry = this._workflowManager.getRecentTelemetry();
    if (recentTelemetry.length > 0) {
      webview.postMessage({ type: 'swarmTelemetryBatch', payload: recentTelemetry });
    }
  }
}
