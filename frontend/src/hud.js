import { getCurrentStepNumber, getTotalSteps, getCurrentStep, isBuildComplete, getPlacedThisStep } from './state.js';

let _hudEl = null;

/**
 * Initialize the HUD module.
 */
export function initHUD() {
  _hudEl = document.getElementById('hud');
}

/**
 * Render the right-panel HUD with step progress and instructions.
 */
export function renderHUD() {
  if (!_hudEl) return;
  _hudEl.innerHTML = '';

  const totalSteps = getTotalSteps();

  if (!isBuildComplete() && totalSteps === 0) return;
  if (isBuildComplete()) return;

  const stepNumber = getCurrentStepNumber();
  const step = getCurrentStep();

  // ----- Top-bar progress / level / meta -----
  if (step) {
    const placedThisStep = getPlacedThisStep().size;
    const stepPieceCount = Math.max(1, step.pieces.length);
    const stepFraction = placedThisStep / stepPieceCount;
    const pct = Math.min(
      100,
      Math.round(100 * (stepNumber - 1 + stepFraction) / Math.max(1, totalSteps))
    );

    const fillEl = document.getElementById('top-progress-fill');
    if (fillEl) fillEl.style.width = pct + '%';

    const lvlEl = document.getElementById('lvl-chip');
    if (lvlEl) lvlEl.textContent = `LVL ${stepNumber}`;

    const metaEl = document.getElementById('top-bar-meta');
    if (metaEl) metaEl.textContent = `STEP ${stepNumber} / ${totalSteps} · ${step.pieces.length} pieces`;
  }

  // Goal Pieces card — shows step progress
  const card = document.createElement('div');
  card.className = 'hud-card';

  const title = document.createElement('div');
  title.className = 'hud-card-title';
  title.textContent = 'Goal Pieces';
  card.appendChild(title);

  // Show each step as a progress item
  const maxVisible = Math.min(totalSteps, 5);
  const startStep = Math.max(1, stepNumber - 1);
  const endStep = Math.min(totalSteps, startStep + maxVisible - 1);

  for (let i = startStep; i <= endStep; i++) {
    const item = document.createElement('div');
    item.className = 'hud-step-item';

    const dot = document.createElement('div');
    dot.className = 'hud-step-dot';

    const info = document.createElement('div');
    info.className = 'hud-step-info';

    const name = document.createElement('div');
    name.className = 'hud-step-name';
    name.textContent = `Step ${i}`;

    const bar = document.createElement('div');
    bar.className = 'hud-step-progress-bar';
    const fill = document.createElement('div');
    fill.className = 'hud-step-progress-fill';

    const count = document.createElement('div');
    count.className = 'hud-step-count';

    if (i < stepNumber) {
      dot.classList.add('done');
      fill.classList.add('done');
      fill.style.width = '100%';
      count.textContent = '\u2713';
    } else if (i === stepNumber) {
      dot.classList.add('current');
      fill.classList.add('current');
      fill.style.width = '50%';
      count.textContent = `${i}/${totalSteps}`;
    } else {
      dot.classList.add('pending');
      fill.style.width = '0%';
    }

    bar.appendChild(fill);
    info.appendChild(name);
    info.appendChild(bar);

    item.appendChild(dot);
    item.appendChild(info);
    item.appendChild(count);
    card.appendChild(item);
  }

  // Instructions section
  if (step && step.description) {
    const instrDiv = document.createElement('div');
    instrDiv.className = 'hud-instructions';

    const header = document.createElement('div');
    header.className = 'hud-instructions-header';

    const instrLabel = document.createElement('span');
    instrLabel.textContent = 'Instructions';
    const pageLabel = document.createElement('span');
    pageLabel.textContent = `Step ${stepNumber} of ${totalSteps}`;

    header.appendChild(instrLabel);
    header.appendChild(pageLabel);

    const text = document.createElement('div');
    text.className = 'hud-instructions-text';
    text.textContent = `"${step.description}"`;

    instrDiv.appendChild(header);
    instrDiv.appendChild(text);
    card.appendChild(instrDiv);
  }

  _hudEl.appendChild(card);

  // Update top bar step info
  const topStep = document.getElementById('top-bar-step');
  if (topStep) {
    topStep.textContent = `Step ${stepNumber} of ${totalSteps}`;
  }
}

/**
 * Update the top bar with the set name.
 */
export function updateTopBarTitle(setName) {
  const el = document.getElementById('top-bar-title');
  if (el) el.textContent = setName || '';
}
