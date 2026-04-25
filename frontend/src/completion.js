import { getControls } from './scene.js';
import { getElapsedMs } from './state.js';

const STORAGE_KEY = 'brickbuilder_completed';

let _completionEl = null;
let _timeEl = null;
let _celebrationEl = null;
let _totalSetCount = 0;

/**
 * Load completed builds from localStorage.
 * Returns an object keyed by set ID with { bestTime, completedAt }.
 */
export function getCompletedBuilds() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

/**
 * Clear all completed build records from localStorage.
 */
export function clearCompletedBuilds() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Record a build completion for the given set ID and elapsed time.
 */
export function markBuildCompleted(setId, elapsedMs) {
  const builds = getCompletedBuilds();
  const prev = builds[setId];
  builds[setId] = {
    bestTime: prev ? Math.min(prev.bestTime, elapsedMs) : elapsedMs,
    completedAt: new Date().toISOString(),
    count: (prev ? prev.count : 0) + 1,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(builds));
}

/**
 * Set the total number of sets so we can detect all-complete.
 */
export function setTotalSetCount(count) {
  _totalSetCount = count;
}

/**
 * Initialize the completion screen DOM references and button event listeners.
 * @param {{ onBuildAgain: Function, onNewSet: Function }} callbacks
 */
export function initCompletion({ onBuildAgain, onNewSet }) {
  _completionEl = document.getElementById('completion-screen');
  _timeEl = document.getElementById('completion-time');
  _celebrationEl = document.getElementById('celebration-screen');

  document.getElementById('build-again-btn').addEventListener('click', () => {
    hideCompletionScreen();
    if (onBuildAgain) onBuildAgain();
  });

  document.getElementById('new-set-btn').addEventListener('click', () => {
    hideCompletionScreen();
    if (onNewSet) onNewSet();
  });

  const celebCloseBtn = document.getElementById('celebration-close-btn');
  if (celebCloseBtn) {
    celebCloseBtn.addEventListener('click', () => {
      hideCelebrationScreen();
      if (onNewSet) onNewSet();
    });
  }
}

/**
 * Check whether every set has been completed at least once.
 */
export function isAllComplete() {
  if (_totalSetCount <= 0) return false;
  const builds = getCompletedBuilds();
  return Object.keys(builds).length >= _totalSetCount;
}

/**
 * Show the completion overlay with elapsed build time and auto-orbit.
 * If all sets are now complete, shows the celebration screen instead.
 */
export function showCompletionScreen() {
  if (!_completionEl) return;

  const ms = getElapsedMs();
  _timeEl.textContent = _formatElapsed(ms);

  const controls = getControls();
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.0;

  if (isAllComplete()) {
    showCelebrationScreen();
  } else {
    _completionEl.classList.add('visible');
  }
}

/**
 * Hide the completion overlay and disable auto-orbit.
 */
export function hideCompletionScreen() {
  if (!_completionEl) return;
  _completionEl.classList.remove('visible');

  const controls = getControls();
  if (controls) {
    controls.autoRotate = false;
  }
}

/**
 * Show the all-complete celebration screen with confetti.
 */
export function showCelebrationScreen() {
  if (!_celebrationEl) return;
  _spawnConfetti();
  _celebrationEl.classList.add('visible');
}

/**
 * Hide the celebration screen.
 */
export function hideCelebrationScreen() {
  if (!_celebrationEl) return;
  _celebrationEl.classList.remove('visible');

  const controls = getControls();
  if (controls) {
    controls.autoRotate = false;
  }
}

/**
 * Spawn confetti pieces into the celebration screen.
 * v2 — fruit-emoji confetti (orange, apple, peach, pineapple, leaf, juicebox).
 */
function _spawnConfetti() {
  const container = document.getElementById('celebration-confetti');
  if (!container) return;
  container.innerHTML = '';

  const FRUITS = ['🍊', '🍎', '🍑', '🍍', '🌿', '🧃'];

  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.textContent = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 3;
    const duration = 2.5 + Math.random() * 2;
    const fontSize = 18 + Math.random() * 16;

    piece.style.cssText = `
      left: ${left}vw;
      font-size: ${fontSize}px;
      animation-delay: ${delay}s;
      animation-duration: ${duration}s;
      animation-iteration-count: infinite;
    `;
    container.appendChild(piece);
  }
}

/**
 * Format elapsed milliseconds as a human-readable string.
 */
function _formatElapsed(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `Completed in ${m}m ${s}s` : `Completed in ${s}s`;
}
