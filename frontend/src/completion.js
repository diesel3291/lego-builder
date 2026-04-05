import { getControls } from './scene.js';
import { getElapsedMs } from './state.js';

let _completionEl = null;
let _timeEl = null;

/**
 * Initialize the completion screen DOM references and button event listeners.
 * @param {{ onBuildAgain: Function, onNewSet: Function }} callbacks
 */
export function initCompletion({ onBuildAgain, onNewSet }) {
  _completionEl = document.getElementById('completion-screen');
  _timeEl = document.getElementById('completion-time');

  document.getElementById('build-again-btn').addEventListener('click', () => {
    hideCompletionScreen();
    if (onBuildAgain) onBuildAgain();
  });

  document.getElementById('new-set-btn').addEventListener('click', () => {
    hideCompletionScreen();
    if (onNewSet) onNewSet();
  });
}

/**
 * Show the completion overlay with elapsed build time and auto-orbit.
 * Fades in via CSS transition (.visible class).
 */
export function showCompletionScreen() {
  if (!_completionEl) return;

  // Display build time (D-05)
  const ms = getElapsedMs();
  _timeEl.textContent = _formatElapsed(ms);

  // Show overlay with fade (D-09)
  _completionEl.classList.add('visible');

  // Enable auto-orbit so completed model rotates behind overlay (D-06)
  const controls = getControls();
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.0;

  // Hide back button during completion
  const backBtn = document.getElementById('back-btn');
  if (backBtn) backBtn.style.display = 'none';
}

/**
 * Hide the completion overlay and disable auto-orbit.
 */
export function hideCompletionScreen() {
  if (!_completionEl) return;
  _completionEl.classList.remove('visible');

  // Disable auto-orbit
  const controls = getControls();
  if (controls) {
    controls.autoRotate = false;
  }
}

/**
 * Format elapsed milliseconds as a human-readable string.
 * @param {number} ms
 * @returns {string} e.g. "Completed in 3m 24s" or "Completed in 45s"
 */
function _formatElapsed(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `Completed in ${m}m ${s}s` : `Completed in ${s}s`;
}
