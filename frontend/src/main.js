import { initScene, getScene } from './scene.js';
import { loadSet, getCurrentStep, getPlacedThisStep } from './state.js';
import { showStepGhosts, hideAllGhosts } from './ghost.js';
import { initInteraction, getPlacedMeshes } from './interaction.js';
import { initTray, renderTray } from './tray.js';
import { initHUD, renderHUD } from './hud.js';
import { initSelection, showSelectionScreen, hideSelectionScreen } from './selection.js';

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

// Set selection flow — replaces hardcoded startBuild()
initSelection(startBuild);

// Back button (D-10) — quit mid-build and return to selection
const backBtn = document.getElementById('back-btn');
backBtn.addEventListener('click', () => {
  // Confirm if pieces have been placed (D-10)
  if (getPlacedThisStep().size > 0 || getPlacedMeshes().length > 0) {
    if (!confirm('Leave this build? Progress will be lost.')) return;
  }
  _cleanupBuild();
  showSelectionScreen();
});

/**
 * Start a build session with the selected set data.
 * Called by initSelection after user clicks a card and full set JSON is fetched.
 * @param {Object} setData - full set JSON from /api/sets/:id
 */
function startBuild(setData) {
  hideSelectionScreen();
  loadSet(setData);
  renderTray();
  renderHUD();
  const firstStep = getCurrentStep();
  if (firstStep) showStepGhosts(firstStep);
}

/**
 * Clean up all build state — remove placed meshes from scene and hide ghosts.
 * Called when user returns to set selection mid-build.
 */
function _cleanupBuild() {
  hideAllGhosts();
  const scn = getScene();
  const meshes = getPlacedMeshes();
  for (const m of meshes) {
    scn.remove(m);
    if (m.material) m.material.dispose();
  }
  meshes.length = 0; // clear the array in-place (interaction.js _placedMeshes reference)
}
