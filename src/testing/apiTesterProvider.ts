import * as vscode from 'vscode';
// Types are imported for interface compliance but not directly used in this file
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ApiTesterCore, TestResult, BatchTestResult, VectorTestResult } from './apiTesterCore';

export class ApiTesterProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'astraforge.apiTester';
  private _view?: vscode.Webview;
  private _tester: ApiTesterCore;

  constructor(private readonly _extensionUri: vscode.Uri) {
    this._tester = new ApiTesterCore();
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView.webview;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async data => {
      try {
        switch (data.type) {
          case 'initialize':
            await this._tester.initialize();
            this._sendMessage('initialized', { success: true });
            break;

          case 'testLLM':
            await this._handleLLMTest(data);
            break;

          case 'testBatch':
            await this._handleBatchTest(data);
            break;

          case 'testVector':
            await this._handleVectorTest(data);
            break;

          case 'testWorkflow':
            await this._handleWorkflowTest(data);
            break;

          case 'validateKey':
            const isValid = this._tester.validateApiKey(data.provider, data.key);
            this._sendMessage('keyValidated', { isValid, provider: data.provider });
            break;

          case 'getProviders':
            const providers = this._tester.getSupportedProviders();
            this._sendMessage('providersList', { providers });
            break;

          case 'getModels':
            const models = this._tester.getSupportedModels(data.provider);
            this._sendMessage('modelsList', { models, provider: data.provider });
            break;

          default:
            console.warn('Unknown message type:', data.type);
        }
      } catch (error: any) {
        this._sendMessage('error', {
          message: error.message,
          type: data.type,
        });
      }
    });
  }

  private async _handleLLMTest(data: any) {
    const result = await this._tester.testLLM(data.provider, data.apiKey, data.model, data.prompt);

    this._sendMessage('llmTestResult', {
      result,
      requestId: data.requestId,
    });
  }

  private async _handleBatchTest(data: any) {
    const result = await this._tester.testBatchLLM(
      data.provider,
      data.apiKey,
      data.model,
      data.prompts
    );

    this._sendMessage('batchTestResult', {
      result,
      requestId: data.requestId,
    });
  }

  private async _handleVectorTest(data: any) {
    const result = await this._tester.testVectorQuery(data.query, data.topK || 5);

    this._sendMessage('vectorTestResult', {
      result,
      requestId: data.requestId,
    });
  }

  private async _handleWorkflowTest(data: any) {
    const results = await this._tester.testWorkflowSimulation(
      data.idea,
      data.provider,
      data.apiKey,
      data.model
    );

    this._sendMessage('workflowTestResult', {
      results,
      requestId: data.requestId,
    });
  }

  private _sendMessage(type: string, data: any) {
    if (this._view) {
      this._view.postMessage({ type, data });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'apiTester.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'styles.css')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AstraForge API Tester</title>
  <link href="${styleUri}" rel="stylesheet">
  <style>
    .api-tester {
      padding: 16px;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
    }
    .form-group {
      margin-bottom: 12px;
    }
    .form-group label {
      display: block;
      margin-bottom: 4px;
      font-weight: 500;
    }
    .form-group input, .form-group select, .form-group textarea {
      width: 100%;
      padding: 8px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 4px;
    }
    .form-group textarea {
      min-height: 80px;
      resize: vertical;
    }
    .button-group {
      display: flex;
      gap: 8px;
      margin: 16px 0;
    }
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .results {
      margin-top: 16px;
      padding: 12px;
      background: var(--vscode-textBlockQuote-background);
      border-radius: 4px;
      max-height: 300px;
      overflow-y: auto;
    }
    .result-item {
      margin-bottom: 8px;
      padding: 8px;
      background: var(--vscode-editor-background);
      border-radius: 4px;
    }
    .status-success {
      color: var(--vscode-testing-iconPassed);
    }
    .status-error {
      color: var(--vscode-testing-iconFailed);
    }
    .loading {
      opacity: 0.6;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div class="api-tester">
    <h2>AstraForge API Tester</h2>
    
    <div class="form-group">
      <label for="provider">API Provider:</label>
      <select id="provider">
        <option value="OpenAI">OpenAI</option>
        <option value="Anthropic">Anthropic</option>
        <option value="xAI">xAI</option>
        <option value="OpenRouter">OpenRouter</option>
      </select>
    </div>

    <div class="form-group">
      <label for="apiKey">API Key:</label>
      <input type="password" id="apiKey" placeholder="Enter your API key">
      <button class="btn btn-secondary" onclick="validateKey()">Validate Key</button>
    </div>

    <div class="form-group">
      <label for="model">Model:</label>
      <select id="model">
        <option value="gpt-4">gpt-4</option>
        <option value="gpt-4-turbo">gpt-4-turbo</option>
        <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
      </select>
    </div>

    <div class="form-group">
      <label for="prompt">Test Prompt:</label>
      <textarea id="prompt" placeholder="Enter your test prompt here..."></textarea>
    </div>

    <div class="button-group">
      <button class="btn btn-primary" onclick="testLLM()">Test LLM</button>
      <button class="btn btn-secondary" onclick="testVector()">Test Vector</button>
      <button class="btn btn-secondary" onclick="testWorkflow()">Test Workflow</button>
      <button class="btn btn-secondary" onclick="clearResults()">Clear</button>
    </div>

    <div id="results" class="results" style="display: none;">
      <h3>Results:</h3>
      <div id="resultsContent"></div>
    </div>
  </div>

  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}
