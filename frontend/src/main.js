import * as THREE from 'three';
import { initScene, getScene, focusCamera, resetCamera } from './scene.js';
import { loadSet, getCurrentStep, getPlacedThisStep } from './state.js';
import { showStepGhosts, hideAllGhosts } from './ghost.js';
import { initInteraction, getPlacedMeshes } from './interaction.js';
import { initTray, renderTray } from './tray.js';
import { initHUD, renderHUD } from './hud.js';
import { initSelection, showSelectionScreen, hideSelectionScreen } from './selection.js';
import { initCompletion, showCompletionScreen, hideCompletionScreen } from './completion.js';
import { gridToWorld } from './grid.js';

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
    // Camera auto-focus on next step (D-07, D-08)
    const step = getCurrentStep();
    if (step) _focusOnStep(step);
  },
  onBuildComplete: () => {
    renderTray();
    renderHUD();
    // Show completion screen (D-04)
    showCompletionScreen();
  },
});

// Track last loaded set for "Build Again"
let _lastSetData = null;

// Initialize completion screen (D-04)
initCompletion({
  onBuildAgain: () => {
    // Replay same set
    _cleanupBuild();
    const currentSetData = _lastSetData;
    if (currentSetData) startBuild(currentSetData);
  },
  onNewSet: () => {
    _cleanupBuild();
    resetCamera();
    showSelectionScreen();
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
  hideCompletionScreen(); // in case completion is showing
  resetCamera();
  showSelectionScreen();
});

/**
 * Start a build session with the selected set data.
 * Called by initSelection after user clicks a card and full set JSON is fetched.
 * @param {Object} setData - full set JSON from /api/sets/:id
 */
function startBuild(setData) {
  _lastSetData = setData;
  hideSelectionScreen();
  loadSet(setData);
  renderTray();
  renderHUD();
  const firstStep = getCurrentStep();
  if (firstStep) {
    showStepGhosts(firstStep);
    // Focus camera on first step's piece area (D-07)
    _focusOnStep(firstStep);
  }
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

/**
 * Compute bounding box center and appropriate camera distance for a step's pieces,
 * then tween the camera to focus on that area.
 * @param {Object} step - step object with pieces array
 */
function _focusOnStep(step) {
  if (!step || !step.pieces || step.pieces.length === 0) return;

  // Compute bounding box of all pieces in this step
  const box = new THREE.Box3();
  for (const piece of step.pieces) {
    const worldPos = gridToWorld(piece.gridX, piece.gridZ, piece.layer, piece.type);
    box.expandByPoint(worldPos);
  }

  const center = new THREE.Vector3();
  box.getCenter(center);

  // Zoom-to-fit: compute distance from bounding sphere radius (D-08)
  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);
  const fovRad = THREE.MathUtils.degToRad(45); // camera FOV from scene.js
  const halfFov = fovRad / 2;
  const fillFraction = 0.4; // target 40% of viewport height
  // Minimum distance of 40 to prevent camera clipping into small pieces
  const distance = Math.max(40, (sphere.radius / Math.tan(halfFov)) / fillFraction);

  focusCamera(center.x, center.y, center.z, distance);
}
