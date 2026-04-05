import { getCurrentStepNumber, getTotalSteps, getCurrentStep, isBuildComplete } from './state.js';

// Module-level private state
let _hudEl = null;

/**
 * Initialize the HUD module. Stores reference to the #hud DOM element.
 * Call once from main.js after DOM is ready.
 */
export function initHUD() {
  _hudEl = document.getElementById('hud');
}

/**
 * Render the instruction panel HUD.
 * Handles three states: loading (no set), build complete, and normal step display.
 */
export function renderHUD() {
  if (!_hudEl) return;
  _hudEl.innerHTML = '';

  const totalSteps = getTotalSteps();

  // Loading state — no set loaded yet
  if (!isBuildComplete() && totalSteps === 0) {
    const counter = document.createElement('div');
    counter.className = 'hud-step-counter';
    counter.setAttribute('aria-live', 'polite');
    counter.textContent = 'Loading set...';
    _hudEl.appendChild(counter);
    return;
  }

  // Build complete state
  if (isBuildComplete()) {
    const counter = document.createElement('div');
    counter.className = 'hud-step-counter';
    counter.setAttribute('aria-live', 'polite');
    counter.textContent = 'Build complete!';
    _hudEl.appendChild(counter);
    return;
  }

  // Normal state — show step counter, description, and progress bar
  const stepNumber = getCurrentStepNumber();
  const step = getCurrentStep();
  const percent = Math.round((stepNumber / totalSteps) * 100);

  const counter = document.createElement('div');
  counter.className = 'hud-step-counter';
  counter.setAttribute('aria-live', 'polite');
  counter.textContent = `Step ${stepNumber} of ${totalSteps}`;

  const desc = document.createElement('div');
  desc.className = 'hud-step-desc';
  desc.textContent = step ? step.description : '';

  const progress = document.createElement('div');
  progress.className = 'hud-progress';

  const fill = document.createElement('div');
  fill.className = 'hud-progress-fill';
  fill.style.width = `${percent}%`;

  progress.appendChild(fill);
  _hudEl.appendChild(counter);
  _hudEl.appendChild(desc);
  _hudEl.appendChild(progress);
}
