// AstraForge API Tester Webview Script

const vscode = acquireVsCodeApi();

// Initialize the interface
document.addEventListener('DOMContentLoaded', () => {
  vscode.postMessage({ type: 'initialize' });
});

// Global state
let currentRequestId = 0;

// Message handling
window.addEventListener('message', event => {
  const message = event.data;
  
  switch (message.type) {
    case 'initialized':
      console.log('API Tester initialized');
      break;
      
    case 'llmTestResult':
      displayLLMResult(message.data);
      break;
      
    case 'vectorTestResult':
      displayVectorResult(message.data);
      break;
      
    case 'workflowTestResult':
      displayWorkflowResult(message.data);
      break;
      
    case 'keyValidated':
      displayKeyValidation(message.data);
      break;
      
    case 'error':
      displayError(message.data);
      break;
      
    default:
      console.log('Unknown message type:', message.type);
  }
});

// Test Functions
function testLLM() {
  const provider = document.getElementById('provider').value;
  const apiKey = document.getElementById('apiKey').value;
  const model = document.getElementById('model').value;
  const prompt = document.getElementById('prompt').value;
  
  if (!apiKey || !prompt) {
    showError('Please provide both API key and prompt');
    return;
  }
  
  setLoading(true);
  
  vscode.postMessage({
    type: 'testLLM',
    provider,
    apiKey,
    model,
    prompt,
    requestId: ++currentRequestId
  });
}

function testVector() {
  const query = document.getElementById('prompt').value;
  
  if (!query) {
    showError('Please provide a query for vector testing');
    return;
  }
  
  setLoading(true);
  
  vscode.postMessage({
    type: 'testVector',
    query,
    topK: 5,
    requestId: ++currentRequestId
  });
}

function testWorkflow() {
  const provider = document.getElementById('provider').value;
  const apiKey = document.getElementById('apiKey').value;
  const model = document.getElementById('model').value;
  const idea = document.getElementById('prompt').value;
  
  if (!apiKey || !idea) {
    showError('Please provide both API key and project idea');
    return;
  }
  
  setLoading(true);
  
  vscode.postMessage({
    type: 'testWorkflow',
    provider,
    apiKey,
    model,
    idea,
    requestId: ++currentRequestId
  });
}

function validateKey() {
  const provider = document.getElementById('provider').value;
  const apiKey = document.getElementById('apiKey').value;
  
  if (!apiKey) {
    showError('Please provide an API key');
    return;
  }
  
  vscode.postMessage({
    type: 'validateKey',
    provider,
    key: apiKey
  });
}

function clearResults() {
  document.getElementById('results').style.display = 'none';
  document.getElementById('resultsContent').innerHTML = '';
}

// Display Functions
function displayLLMResult(data) {
  setLoading(false);
  
  const result = data.result;
  const html = `
    <div class="result-item">
      <div class="status-${result.success ? 'success' : 'error'}">
        <strong>${result.success ? '✅ Success' : '❌ Error'}</strong>
      </div>
      <div><strong>Provider:</strong> ${result.provider}</div>
      <div><strong>Model:</strong> ${result.model || 'N/A'}</div>
      <div><strong>Latency:</strong> ${result.latency}ms</div>
      ${result.response ? `<div><strong>Response:</strong><br><pre>${escapeHtml(result.response)}</pre></div>` : ''}
      ${result.error ? `<div><strong>Error:</strong><br><pre>${escapeHtml(result.error)}</pre></div>` : ''}
    </div>
  `;
  
  showResults(html);
}

function displayVectorResult(data) {
  setLoading(false);
  
  const result = data.result;
  const html = `
    <div class="result-item">
      <div class="status-${result.success ? 'success' : 'error'}">
        <strong>${result.success ? '✅ Success' : '❌ Error'}</strong>
      </div>
      <div><strong>Query:</strong> ${escapeHtml(result.query)}</div>
      <div><strong>Latency:</strong> ${result.latency}ms</div>
      <div><strong>Results:</strong> ${result.results.length} items</div>
      ${result.results.length > 0 ? `
        <div><strong>Top Results:</strong>
          <ul>
            ${result.results.map(item => `
              <li>ID: ${item.id}, Similarity: ${item.similarity.toFixed(3)}</li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;
  
  showResults(html);
}

function displayWorkflowResult(data) {
  setLoading(false);
  
  const results = data.results;
  let html = `
    <div class="result-item">
      <div class="status-success">
        <strong>✅ Workflow Simulation Complete</strong>
      </div>
      <div><strong>Phases Tested:</strong> ${results.length}</div>
    </div>
  `;
  
  results.forEach((result, index) => {
    const phase = ['Planning', 'Prototyping', 'Testing', 'Deployment'][index];
    html += `
      <div class="result-item">
        <div class="status-${result.success ? 'success' : 'error'}">
          <strong>${phase}: ${result.success ? '✅ Success' : '❌ Error'}</strong>
        </div>
        <div><strong>Latency:</strong> ${result.latency}ms</div>
        ${result.response ? `<div><strong>Response:</strong><br><pre>${escapeHtml(result.response)}</pre></div>` : ''}
        ${result.error ? `<div><strong>Error:</strong><br><pre>${escapeHtml(result.error)}</pre></div>` : ''}
      </div>
    `;
  });
  
  showResults(html);
}

function displayKeyValidation(data) {
  const status = data.isValid ? '✅ Valid' : '❌ Invalid';
  const color = data.isValid ? 'status-success' : 'status-error';
  
  showMessage(`${status} API key for ${data.provider}`, color);
}

function displayError(data) {
  setLoading(false);
  showError(`Error in ${data.type}: ${data.message}`);
}

// Utility Functions
function setLoading(loading) {
  const buttons = document.querySelectorAll('.btn');
  buttons.forEach(btn => {
    if (loading) {
      btn.classList.add('loading');
      btn.disabled = true;
    } else {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  });
}

function showResults(html) {
  const resultsDiv = document.getElementById('results');
  const contentDiv = document.getElementById('resultsContent');
  
  contentDiv.innerHTML = html;
  resultsDiv.style.display = 'block';
}

function showMessage(message, className = 'status-success') {
  const resultsDiv = document.getElementById('results');
  const contentDiv = document.getElementById('resultsContent');
  
  contentDiv.innerHTML = `<div class="result-item ${className}">${message}</div>`;
  resultsDiv.style.display = 'block';
}

function showError(message) {
  showMessage(message, 'status-error');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Provider change handler
document.getElementById('provider').addEventListener('change', function() {
  const provider = this.value;
  vscode.postMessage({
    type: 'getModels',
    provider
  });
});

// Initialize models for default provider
document.addEventListener('DOMContentLoaded', () => {
  const provider = document.getElementById('provider').value;
  vscode.postMessage({
    type: 'getModels',
    provider
  });
});
