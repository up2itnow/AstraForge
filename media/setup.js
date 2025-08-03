const vscode = acquireVsCodeApi();

function savePanel() {
  const size = document.getElementById('panelSize').value;
  const panel = [];
  for (let i = 0; i < size; i++) {
    const provider = document.getElementById(`provider${i}`).value;
    const key = document.getElementById(`key${i}`).value;
    const model = document.getElementById(`model${i}`).value;
    const role = i === 0 ? 'primary' : 'secondary';
    panel.push({ provider, key, model, role });
  }
  vscode.postMessage({ type: 'savePanel', panel });
}

// Dynamically generate forms
const panelSizeSelect = document.getElementById('panelSize');
panelSizeSelect.onchange = () => {
  const size = panelSizeSelect.value;
  const formsDiv = document.getElementById('llmForms');
  formsDiv.innerHTML = '';
  for (let i = 0; i < size; i++) {
    formsDiv.innerHTML += `
      <div style="margin: 10px 0; padding: 10px; border: 1px solid #ccc; border-radius: 5px;">
        <h3>LLM ${i+1} ${i === 0 ? '(Primary)' : '(Secondary)'}</h3>
        <label>Provider:</label>
        <select id="provider${i}" style="width: 100%; margin: 5px 0;">
          <option>OpenAI</option>
          <option>Anthropic</option>
          <option>xAI</option>
          <option>OpenRouter</option>
        </select>
        <label>API Key:</label>
        <input id="key${i}" type="password" style="width: 100%; margin: 5px 0;" />
        <label>Model:</label>
        <input id="model${i}" type="text" placeholder="e.g., gpt-4o, claude-3-sonnet" style="width: 100%; margin: 5px 0;" />
      </div>
    `;
  }
};
panelSizeSelect.onchange(); // Initial render