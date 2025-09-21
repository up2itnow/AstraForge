const vscode = acquireVsCodeApi();

function submitIdea() {
  const ideaInput = document.getElementById('ideaInput');
  const optionSelect = document.getElementById('promptOption');
  const customBox = document.getElementById('customText');
  if (!ideaInput || !optionSelect) {
    return;
  }

  let idea = ideaInput.value.trim();
  const option = optionSelect.value;

  if (option === 'custom' && customBox) {
    const custom = customBox.value.trim();
    if (custom) {
      idea = `${idea}\n\nCustom Refinement:\n${custom}`;
    }
  }

  vscode.postMessage({ type: 'submitIdea', idea, option });
}

function toggleCustomBox() {
  const optionSelect = document.getElementById('promptOption');
  const customContainer = document.getElementById('customBox');
  if (!optionSelect || !customContainer) {
    return;
  }

  customContainer.style.display = optionSelect.value === 'custom' ? 'block' : 'none';
}

function renderArbitrationControls(modes) {
  const container = document.getElementById('arbitrationControls');
  if (!container) {
    return;
  }

  container.innerHTML = '';
  Object.entries(modes).forEach(([phase, mode]) => {
    const row = document.createElement('div');
    row.className = 'arbitration-control';

    const phaseLabel = document.createElement('div');
    phaseLabel.className = 'arbitration-phase';
    phaseLabel.textContent = phase;

    const toggleWrapper = document.createElement('label');
    toggleWrapper.className = 'toggle';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.phase = phase;
    input.checked = mode === 'autonomous';

    const slider = document.createElement('span');
    slider.className = 'slider';

    toggleWrapper.appendChild(input);
    toggleWrapper.appendChild(slider);

    const modeLabel = document.createElement('div');
    modeLabel.className = 'arbitration-mode-label';
    modeLabel.textContent = mode === 'autonomous' ? 'Autonomous' : 'Human-in-the-loop';

    input.addEventListener('change', () => {
      const newMode = input.checked ? 'autonomous' : 'human';
      modeLabel.textContent = input.checked ? 'Autonomous' : 'Human-in-the-loop';
      vscode.postMessage({ type: 'setArbitrationMode', phase, mode: newMode });
    });

    row.appendChild(phaseLabel);
    row.appendChild(toggleWrapper);
    row.appendChild(modeLabel);
    container.appendChild(row);
  });
}

function appendTelemetryCard(event) {
  const feed = document.getElementById('telemetryFeed');
  if (!feed) {
    return;
  }

  const card = document.createElement('div');
  card.className = `telemetry-card telemetry-${event.type}`;

  const header = document.createElement('div');
  header.className = 'telemetry-header';
  const phase = event.payload?.phase ?? 'Unknown phase';
  const timestamp = new Date(event.payload?.timestamp ?? Date.now()).toLocaleTimeString();
  header.textContent = `${phase} • ${event.type.replace(/_/g, ' ')} • ${timestamp}`;
  card.appendChild(header);

  const summary = document.createElement('div');
  summary.className = 'telemetry-summary';
  if (event.type === 'round') {
    summary.textContent = event.payload?.summary ?? 'Round completed';
  } else if (event.type === 'session_complete') {
    summary.textContent = event.payload?.summary ?? 'Session completed';
  } else if (event.type === 'session_summary') {
    summary.textContent = event.payload?.summary ?? 'Session summary';
  } else if (event.type === 'arbitration_mode_updated') {
    summary.textContent = `Arbitration for ${event.payload?.phase} set to ${event.payload?.mode}`;
  } else {
    summary.textContent = event.payload?.summary ?? 'Swarm update';
  }
  card.appendChild(summary);

  if (event.type === 'round' && event.payload?.outcome) {
    const metrics = document.createElement('div');
    metrics.className = 'telemetry-metrics';
    const outcome = event.payload.outcome;
    metrics.innerHTML = `Consensus: <strong>${Math.round(outcome.consensusStrength)}%</strong> • ` +
      `Engagement: ${outcome.metrics.participantEngagement}% • Critique: ${outcome.metrics.critiqueCoverage}%`;
    card.appendChild(metrics);

    if (outcome.suggestedPatches?.length) {
      const list = document.createElement('ul');
      list.className = 'telemetry-patches';
      outcome.suggestedPatches.slice(0, 3).forEach(patch => {
        const item = document.createElement('li');
        item.textContent = `${patch.priority.toUpperCase()}: ${patch.description}`;
        list.appendChild(item);
      });
      card.appendChild(list);
    }
  }

  if (event.type === 'session_complete') {
    const footer = document.createElement('div');
    footer.className = 'telemetry-footer';
    footer.textContent = `Quality score: ${event.payload?.qualityScore ?? 0}`;
    card.appendChild(footer);
  }

  feed.prepend(card);
  while (feed.children.length > 20) {
    feed.removeChild(feed.lastChild);
  }
}

window.addEventListener('message', event => {
  const { type, payload } = event.data;
  switch (type) {
    case 'arbitrationModes':
      renderArbitrationControls(payload || {});
      break;
    case 'swarmTelemetry':
      appendTelemetryCard(payload);
      if (payload?.type === 'arbitration_mode_updated' && payload?.payload?.phase && payload?.payload?.mode) {
        const checkbox = document.querySelector(`input[data-phase="${payload.payload.phase}"]`);
        if (checkbox instanceof HTMLInputElement) {
          checkbox.checked = payload.payload.mode === 'autonomous';
          const label = checkbox.parentElement?.parentElement?.querySelector('.arbitration-mode-label');
          if (label) {
            label.textContent = payload.payload.mode === 'autonomous' ? 'Autonomous' : 'Human-in-the-loop';
          }
        }
      }
      break;
    case 'swarmTelemetryBatch':
      (payload || []).forEach((entry) => {
        appendTelemetryCard({ type: 'round', payload: entry });
      });
      break;
    default:
      break;
  }
});

function registerEventHandlers() {
  const optionSelect = document.getElementById('promptOption');
  const submitButton = document.getElementById('submitIdeaButton');
  if (optionSelect) {
    optionSelect.addEventListener('change', toggleCustomBox);
  }
  if (submitButton) {
    submitButton.addEventListener('click', submitIdea);
  }

  toggleCustomBox();
}

registerEventHandlers();
vscode.postMessage({ type: 'requestInitialState' });
