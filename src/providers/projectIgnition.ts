import * as vscode from 'vscode';
import { WorkflowManager } from '../workflow/workflowManager';

export class ProjectIgnitionProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'astraforge.projectIgnition';
  private _view?: vscode.Webview;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _workflowManager: WorkflowManager
  ) {
    // Initialize provider with extension URI and workflow manager
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView.webview;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      if (data.type === 'submitIdea') {
        this._workflowManager.startWorkflow(data.idea, data.option);
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'ignition.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'styles.css'));

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
  <button onclick="submitIdea()">Submit</button>
  <div id="progressTracker"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}
