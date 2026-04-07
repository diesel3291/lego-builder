import * as THREE from 'three';
import { initScene, getScene, focusCamera, resetCamera, createBrickMaterial } from './scene.js';
import { getGeometry } from './geometry.js';
import { loadSet, getCurrentStep, getPlacedThisStep, getElapsedMs, saveProgress, loadProgress, clearProgress, restoreFromSave } from './state.js';
import { showStepGhosts, hideAllGhosts } from './ghost.js';
import { initInteraction, getPlacedMeshes } from './interaction.js';
import { initTray, renderTray } from './tray.js';
import { initHUD, renderHUD, updateTopBarTitle } from './hud.js';
import { initSelection, showSelectionScreen, hideSelectionScreen } from './selection.js';
import { initCompletion, showCompletionScreen, hideCompletionScreen, hideCelebrationScreen, markBuildCompleted, setTotalSetCount } from './completion.js';
import { gridToWorld } from './grid.js';

const canvas = document.getElementById('canvas');
initScene(canvas);

// Initialize UI modules (DOM references)
initTray();
initHUD();

// Wire interaction callbacks
initInteraction({
  onPiecePlaced: () => {
    renderTray();
    renderHUD();
    saveProgress();
  },
  onStepAdvance: () => {
    renderTray();
    renderHUD();
    saveProgress();
    const step = getCurrentStep();
    if (step) _focusOnStep(step);
  },
  onBuildComplete: () => {
    renderTray();
    renderHUD();
    clearProgress();
    if (_lastSetData) markBuildCompleted(_lastSetData.id, getElapsedMs());
    showCompletionScreen();
  },
});

// Track last loaded set for "Build Again"
let _lastSetData = null;

// Initialize completion screen
initCompletion({
  onBuildAgain: () => {
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

// Set selection flow
initSelection(startBuild);

// Quit button (replaces back button — matches "Save & Quit" from design)
const quitBtn = document.getElementById('quit-btn');
quitBtn.addEventListener('click', () => {
  if (getPlacedThisStep().size > 0 || getPlacedMeshes().length > 0) {
    saveProgress();
  }
  _cleanupBuild();
  hideCompletionScreen();
  hideCelebrationScreen();
  resetCamera();
  showSelectionScreen();
});

/**
 * Start a build session with the selected set data.
 */
function startBuild(setData) {
  _lastSetData = setData;
  hideSelectionScreen();
  updateTopBarTitle(setData.name || '');

  // Check for saved progress
  const save = loadProgress();
  if (save && save.setId === setData.id && save.placedIds.length > 0) {
    loadSet(setData);
    const piecesToMesh = restoreFromSave(save);
    _restoreMeshes(piecesToMesh);
    renderTray();
    renderHUD();
    const step = getCurrentStep();
    if (step) {
      showStepGhosts(step);
      _focusOnStep(step);
    }
  } else {
    loadSet(setData);
    renderTray();
    renderHUD();
    const firstStep = getCurrentStep();
    if (firstStep) {
      showStepGhosts(firstStep);
      _focusOnStep(firstStep);
    }
  }
}

/**
 * Recreate placed brick meshes from restored state.
 */
function _restoreMeshes(pieces) {
  const scn = getScene();
  const meshes = getPlacedMeshes();
  for (const piece of pieces) {
    const geometry = getGeometry(piece.type);
    const material = createBrickMaterial(piece.color);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(gridToWorld(piece.gridX, piece.gridZ, piece.layer, piece.type));
    mesh.rotation.y = THREE.MathUtils.degToRad(piece.rotation || 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.pieceId = piece.id;
    scn.add(mesh);
    meshes.push(mesh);
  }
}

/**
 * Clean up all build state.
 */
function _cleanupBuild() {
  hideAllGhosts();
  const scn = getScene();
  const meshes = getPlacedMeshes();
  for (const m of meshes) {
    scn.remove(m);
    if (m.material) m.material.dispose();
  }
  meshes.length = 0;
}

/**
 * Focus camera on a step's piece area with zoom-to-fit.
 */
function _focusOnStep(step) {
  if (!step || !step.pieces || step.pieces.length === 0) return;

  const box = new THREE.Box3();
  for (const piece of step.pieces) {
    const worldPos = gridToWorld(piece.gridX, piece.gridZ, piece.layer, piece.type);
    box.expandByPoint(worldPos);
  }

  const center = new THREE.Vector3();
  box.getCenter(center);

  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);
  const fovRad = THREE.MathUtils.degToRad(45);
  const halfFov = fovRad / 2;
  const fillFraction = 0.4;
  const distance = Math.max(40, (sphere.radius / Math.tan(halfFov)) / fillFraction);

  focusCamera(center.x, center.y, center.z, distance);
}
