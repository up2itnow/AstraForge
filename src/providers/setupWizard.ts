import * as vscode from 'vscode';

export class SetupWizardProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'astraforge.setupWizard';
  private _view?: vscode.Webview;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView.webview;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'savePanel':
          await vscode.workspace.getConfiguration('astraforge').update('llmPanel', data.panel, true);
          vscode.window.showInformationMessage('LLM Panel configured! Ready for ignition.');
          break;
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
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