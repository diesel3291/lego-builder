import { initScene } from './scene.js';
import { loadSet, getCurrentStep } from './state.js';
import { showStepGhosts } from './ghost.js';
import { initInteraction } from './interaction.js';
import { initTray, renderTray } from './tray.js';
import { initHUD, renderHUD } from './hud.js';

const canvas = document.getElementById('canvas');
initScene(canvas);

// Initialize UI modules (DOM references)
initTray();
initHUD();

// Show loading state
renderHUD();

// Wire interaction callbacks
initInteraction({
  onStepAdvance: () => {
    renderTray();
    renderHUD();
  },
  onBuildComplete: () => {
    renderTray();
    renderHUD();
  },
});

// Fetch default set (mini-rocket — smallest set, per RESEARCH.md OQ1)
// Phase 3 will replace this hardcoded ID with set selection screen
async function startBuild() {
  try {
    const res = await fetch('/api/sets/mini-rocket');
    if (!res.ok) throw new Error(`Failed to load set: ${res.status}`);
    const setData = await res.json();
    loadSet(setData);
    renderTray();
    renderHUD();
    // Show ghosts for first step
    const firstStep = getCurrentStep();
    if (firstStep) showStepGhosts(firstStep);
  } catch (err) {
    console.error('Failed to start build:', err);
    document.getElementById('hud').innerHTML =
      '<div class="hud-step-counter">Error loading set</div>';
  }
}

startBuild();
