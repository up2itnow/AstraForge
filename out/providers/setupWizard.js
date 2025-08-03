"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetupWizardProvider = void 0;
const vscode = __importStar(require("vscode"));
class SetupWizardProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    resolveWebviewView(webviewView, context, _token) {
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
exports.SetupWizardProvider = SetupWizardProvider;
SetupWizardProvider.viewType = 'astraforge.setupWizard';
//# sourceMappingURL=setupWizard.js.map