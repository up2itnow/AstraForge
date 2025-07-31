```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import { WorkflowManager } from '../workflow/workflowManager';

export class ProjectIgnitionProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'astraforge.projectIgnition';
  private _view?: vscode.Webview;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _workflowManager: WorkflowManager
  ) {}

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
      <head><link href="${styleUri}" rel="stylesheet"></head>
      <body>
        <h1>Project Ignition</h1>
        <textarea id="ideaInput" placeholder="Enter your project idea..."></textarea>
        <select id="promptOption">
          <option value="direct">Direct Submit</option>
          <option value="letPanelDecide">Let the panel decide</option>
          <option value="custom">Custom refinements</option>
        </select>
        <div id="customBox" style="display:none;"><textarea id="customText"></textarea></div>
        <button onclick="submitIdea()">Submit</button>
        <div id="progressTracker"></div>
        <script src="${scriptUri}"></script>
      </body>
      </html>`;
  }
}
media/ignition.js
javascript

Collapse

Wrap

Run

Copy
const vscode = acquireVsCodeApi();

const optionSelect = document.getElementById('promptOption');
optionSelect.onchange = () => {
  document.getElementById('customBox').style.display = optionSelect.value === 'custom' ? 'block' : 'none';
};

function submitIdea() {
  const idea = document.getElementById('ideaInput').value;
  const option = document.getElementById('promptOption').value;
  const custom = option === 'custom' ? document.getElementById('customText').value : '';
  vscode.postMessage({ type: 'submitIdea', idea: idea + (custom ? ' ' + custom : ''), option });
}
src/llm/llmManager.ts (as above)
src/db/vectorDB.ts (as above)
src/workflow/workflowManager.ts
typescript

Collapse

Wrap

Run

Copy
import * as vscode from 'vscode';
import { LLMManager } from '../llm/llmManager';
import { VectorDB } from '../db/vectorDB';
import { GitManager } from '../git/gitManager';

export class WorkflowManager {
  private currentPhase = 0;
  private phases = ['Planning', 'Prototyping', 'Testing', 'Deployment'];
  private projectIdea: string = '';
  private buildPlan: string = '';
  private costTracker = 0; // Track API costs (mock)

  constructor(
    private llmManager: LLMManager,
    private vectorDB: VectorDB,
    private gitManager: GitManager
  ) {}

  async startWorkflow(idea: string, option: string) {
    this.projectIdea = idea;
    this.currentPhase = 0;

    let prompt = idea;
    if (option === 'letPanelDecide') {
      prompt = await this.llmManager.conference(`Refine idea: ${idea}`);
    } // Custom already appended

    const discussion = await this.llmManager.conference(`Discuss project: ${prompt}. Tech stack, estimates, risks.`);
    this.buildPlan = discussion; // For MVP, assume plan from discussion

    // Clarifying questions if needed
    const ambiguities = await this.llmManager.queryLLM(0, `Check for ambiguities in ${prompt}. List questions if any.`);
    if (ambiguities.trim()) {
      // Show questions to user
      const userAnswers = await vscode.window.showInputBox({ prompt: `Answer: ${ambiguities}` });
      this.buildPlan = await this.llmManager.conference(`Incorporate answers: ${userAnswers}. Finalize plan.`);
    }

    // Vote on plan
    this.buildPlan = await this.llmManager.voteOnDecision(this.buildPlan, ['Approve', 'Reject']);

    if (this.buildPlan === 'Reject') {
      vscode.window.showErrorMessage('Panel rejected plan. Revise idea.');
      return;
    }

    // Store
    const embedding = await this.vectorDB.getEmbedding(this.buildPlan);
    await this.vectorDB.addEmbedding('projectPlan', embedding, { plan: this.buildPlan, tag: '#architecture' });

    await this.executePhase();
  }

  async executePhase() {
    const phase = this.phases[this.currentPhase];
    const context = await this.retrieveContext(phase);
    const phasePrompt = `Execute ${phase} for ${this.projectIdea}. Plan: ${this.buildPlan}. Context: ${context}. Generate modular code with comments. Adhere to SOLID, secure practices.`;
    let output = await this.llmManager.conference(phasePrompt);

    // Innovation check
    const innovations = await this.llmManager.queryLLM(0, `Suggest innovations for ${phase}, e.g., edge AI. Explain benefits/risks.`);
    const userAck = await vscode.window.showQuickPick(['Yes', 'No', 'Change', 'Discuss'], { placeHolder: innovations });
    if (userAck === 'Yes') {
      output = await this.llmManager.conference(`Integrate innovation: ${innovations}. Update output.`);
    } else if (userAck === 'Change') {
      const mod = await vscode.window.showInputBox({ prompt: 'Modifications:' });
      output = await this.llmManager.conference(`Apply changes: ${mod}. Update output.`);
    } else if (userAck === 'Discuss') {
      // Trigger chat
      const chat = await this.llmManager.conference(`Discuss suggestion: ${innovations}`);
      vscode.window.showInformationMessage(chat);
      return this.executePhase(); // Re-run
    }

    // Write code
    const filePath = vscode.Uri.file(vscode.workspace.workspaceFolders![0].uri.fsPath + `/${phase.toLowerCase()}.ts`);
    await vscode.workspace.fs.writeFile(filePath, Buffer.from(output));

    // Lint (assume ESLint extension installed, or mock)
    // Test if applicable

    // Git
    await this.gitManager.commit(`Completed ${phase}`);

    // Summary
    const summary = await this.llmManager.queryLLM(0, `Summarize ${phase}: ${output}`);
    vscode.window.showInformationMessage(summary);

    // Archive old
    this.archiveOldFiles(phase);

    this.currentPhase++;
    if (this.currentPhase < this.phases.length) {
      vscode.window.showInformationMessage('Phase done! Proceed?', { modal: true }).then(() => this.executePhase());
    } else {
      this.completeProject();
    }
  }

  private async retrieveContext(phase: string) {
    const queryVec = await this.vectorDB.getEmbedding(phase);
    const results = await this.vectorDB.queryEmbedding(queryVec);
    return results.map(r => r.metadata).join('\n');
  }

  private archiveOldFiles(phase: string) {
    // Move previous phase files to /history
    const wsPath = vscode.workspace.workspaceFolders![0].uri.fsPath;
    const historyPath = path.join(wsPath, 'history');
    // Assume fs operations to move
  }

  private async completeProject() {
    // Deployment bundle, e.g., Docker (mock)
    const report = await this.llmManager.queryLLM(0, `Final report for ${this.projectIdea}`);
    const bonuses = await this.llmManager.queryLLM(0, `5 A+ enhancements, e.g., WebSockets for collaboration.`);
    vscode.window.showInformationMessage(`Project complete! Report: ${report}\nEnhancements: ${bonuses}`);
  }
}
src/git/gitManager.ts
typescript

Collapse

Wrap

Run

Copy
import * as vscode from 'vscode';
import simpleGit from 'simple-git';

export class GitManager {
  private git: any;

  async initRepo(path: string) {
    this.git = simpleGit(path);
    await this.git.init();
  }

  async commit(message: string) {
    await this.git.add('.');
    await this.git.commit(message);
  }
}
media/styles.css
css

Collapse

Wrap

Copy
body { font-family: Arial; padding: 10px; }
h1 { color: #007acc; }
textarea { width: 100%; height: 100px; }
button { background: #007acc; color: white; }