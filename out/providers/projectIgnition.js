import * as vscode from 'vscode';
export class ProjectIgnitionProvider {
    constructor(_extensionUri, _workflowManager) {
        this._extensionUri = _extensionUri;
        this._workflowManager = _workflowManager;
        // Initialize provider with extension URI and workflow manager
        // These parameters are used in the class methods
    }
    resolveWebviewView(webviewView, _context, _token) {
        // _context and _token are required by interface but not used in this implementation
        this._view = webviewView.webview;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(async (data) => {
            if (data.type === 'submitIdea') {
                this._workflowManager.startWorkflow(data.idea, data.option);
            }
        });
    }
    _getHtmlForWebview(webview) {
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
ProjectIgnitionProvider.viewType = 'astraforge.projectIgnition';
//# sourceMappingURL=projectIgnition.js.map