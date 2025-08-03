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
exports.ProjectIgnitionProvider = void 0;
const vscode = __importStar(require("vscode"));
class ProjectIgnitionProvider {
    constructor(_extensionUri, _workflowManager) {
        this._extensionUri = _extensionUri;
        this._workflowManager = _workflowManager;
    }
    resolveWebviewView(webviewView, context, _token) {
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
exports.ProjectIgnitionProvider = ProjectIgnitionProvider;
ProjectIgnitionProvider.viewType = 'astraforge.projectIgnition';
//# sourceMappingURL=projectIgnition.js.map