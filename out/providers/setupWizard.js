import * as vscode from 'vscode';
export class SetupWizardProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
        // Initialize setup wizard with extension URI
        // _extensionUri is used in _getHtmlForWebview method
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
            switch (data.type) {
                case 'savePanel':
                    await vscode.workspace
                        .getConfiguration('astraforge')
                        .update('llmPanel', data.panel, true);
                    vscode.window.showInformationMessage('LLM Panel configured! Ready for ignition.');
                    break;
            }
        });
    }
    _getHtmlForWebview(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'setup.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'styles.css'));
        // Basic HTML with form for 3/5 LLMs, providers dropdown (OpenAI, Anthropic, xAI, OpenRouter), API key inputs
        return `<!DOCTYPE html>
      <html lang="en">
      <head><link href="${styleUri}" rel="stylesheet"></head>
      <body>
        <h1>Setup LLM Panel</h1>
        <select id="panelSize">
          <option value="3">3 LLMs</option>
          <option value="5">5 LLMs</option>
        </select>
        <div id="llmForms"></div>
        <button onclick="savePanel()">Save Configuration</button>
        <script src="${scriptUri}"></script>
      </body>
      </html>`;
    }
}
SetupWizardProvider.viewType = 'astraforge.setupWizard';
//# sourceMappingURL=setupWizard.js.map