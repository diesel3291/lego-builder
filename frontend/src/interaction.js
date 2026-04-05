import * as THREE from 'three';
import gsap from 'gsap';
import { getScene, getCamera, getRenderer } from './scene.js';
import { getGeometry } from './geometry.js';
import { gridToWorld, worldToGrid } from './grid.js';
import {
  getHeldPieceId, getCurrentStep, placeBrick,
  isStepComplete, advanceStep, releasePiece, isBuildComplete, getPlacedThisStep
} from './state.js';
import { getGhostMeshes, hideGhost, showStepGhosts, hideAllGhosts } from './ghost.js';

// Module-level private state
let _pointerDownPos = { x: 0, y: 0 };
const CLICK_THRESHOLD_PX = 5;
const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _placedMeshes = [];   // Array of THREE.Mesh — all placed opaque bricks
let _onStepAdvance = null;  // callback: called when step advances (for tray/hud re-render)
let _onBuildComplete = null; // callback: called when build finishes

// Preview mesh state
let _previewMesh = null;       // THREE.Mesh — semi-transparent brick following cursor
let _previewRotation = 0;      // degrees: 0, 90, 180, 270 — rotation offset for preview
let _baseplateMesh = null;     // cached reference to baseplate for raycasting

/**
 * Initialize the interaction module. Call once from main.js after initScene.
 * Attaches pointer event listeners to the canvas for click disambiguation and placement.
 * @param {{ onStepAdvance?: Function, onBuildComplete?: Function }} options
 */
export function initInteraction({ onStepAdvance, onBuildComplete } = {}) {
  _onStepAdvance = onStepAdvance || null;
  _onBuildComplete = onBuildComplete || null;

  const canvas = getRenderer().domElement;

  // Track pointer-down position for delta computation
  canvas.addEventListener('pointerdown', (e) => {
    _pointerDownPos = { x: e.clientX, y: e.clientY };
  });

  // On pointer-up, check if this was a click (delta < threshold) or a drag (orbit)
  canvas.addEventListener('pointerup', (e) => {
    const dx = e.clientX - _pointerDownPos.x;
    const dy = e.clientY - _pointerDownPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < CLICK_THRESHOLD_PX) {
      _handleClick(e);
    }
  });

  // Cache baseplate mesh for raycasting preview position
  _baseplateMesh = getScene().getObjectByName('baseplate');

  // Cursor state management — show crosshair when a piece is held, update preview mesh
  canvas.addEventListener('pointermove', (e) => {
    const heldId = getHeldPieceId();
    if (heldId !== null) {
      canvas.style.cursor = 'crosshair';
      _updatePreviewPosition(e);
    } else {
      canvas.style.cursor = 'default';
      _removePreview();
    }
  });

  // R-key rotation for preview mesh while holding a piece
  window.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
      if (getHeldPieceId() !== null) {
        _previewRotation = (_previewRotation + 90) % 360;
        if (_previewMesh) {
          _previewMesh.rotation.y = THREE.MathUtils.degToRad(_previewRotation);
        }
      }
    }
  });
}

/**
 * Returns the array of all placed opaque brick meshes.
 * Needed by future phases (undo, completion state, etc.).
 * @returns {THREE.Mesh[]}
 */
export function getPlacedMeshes() {
  return _placedMeshes;
}

/**
 * Handle a confirmed click event on the canvas.
 * Raycasts against ghost meshes only — user confirms placement by clicking the ghost.
 * @param {PointerEvent} event
 */
function _handleClick(event) {
  // No piece held — click on canvas does nothing
  if (getHeldPieceId() === null) return;

  // Compute NDC fresh from window dimensions (never use cached values — Pitfall 4)
  _ndc.x = (event.clientX / window.innerWidth) * 2 - 1;
  _ndc.y = -(event.clientY / window.innerHeight) * 2 + 1;

  _raycaster.setFromCamera(_ndc, getCamera());

  // Raycast against ghost meshes only — "click ghost to confirm" UX
  const targets = [...getGhostMeshes()];
  const hits = _raycaster.intersectObjects(targets);

  if (hits.length === 0) {
    // Clicked empty space — no visual feedback
    _rejectPlacement(null);
    return;
  }

  const hitGhost = hits[0].object;
  const pieceId = hitGhost.userData.ghostPieceId;

  // Find the piece in the current step
  const step = getCurrentStep();
  if (!step) return;

  const ghostPiece = step.pieces.find(p => p.id === pieceId);
  if (!ghostPiece) return;

  const heldId = getHeldPieceId();
  const heldPiece = step.pieces.find(p => p.id === heldId);
  if (!heldPiece) return;

  // Allow placement if exact match OR same type+color within the step (sibling flexibility)
  if (pieceId !== heldId && !(ghostPiece.type === heldPiece.type && ghostPiece.color === heldPiece.color)) {
    _rejectPlacement(hitGhost);
    return;
  }

  // Always use the ghost piece's data for placement (correct position)
  _confirmPlacement(ghostPiece, hitGhost);
}

/**
 * Confirm a valid placement: create opaque brick, flash green, update state.
 * @param {Object} piece - piece data from step JSON
 * @param {THREE.Mesh} ghostMesh - the ghost mesh to replace
 */
function _confirmPlacement(piece, ghostMesh) {
  // Create the opaque brick mesh using cached geometry + new per-brick material
  const geometry = getGeometry(piece.type);
  const material = new THREE.MeshStandardMaterial({
    color: piece.color,
    roughness: 0.6,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(gridToWorld(piece.gridX, piece.gridZ, piece.layer, piece.type));
  mesh.rotation.y = THREE.MathUtils.degToRad(piece.rotation || 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.pieceId = piece.id;
  getScene().add(mesh);
  _placedMeshes.push(mesh);

  // Success flash — tween material color from green to piece color
  const targetColor = new THREE.Color(piece.color);
  const startColor = new THREE.Color(0x4caf50);  // success green from UI-SPEC
  mesh.material.color.copy(startColor);

  // Use object tween pattern for THREE.Color compatibility (GSAP Assumption A1 fallback)
  const proxy = { t: 0 };
  gsap.to(proxy, {
    t: 1,
    duration: 0.4,
    ease: 'power2.out',
    onUpdate: function () {
      mesh.material.color.lerpColors(startColor, targetColor, proxy.t);
      mesh.material.needsUpdate = true;
    },
  });

  // Remove the ghost for this piece
  hideGhost(piece.id);

  // Update state — mark cells occupied, release held piece
  placeBrick(piece);
  releasePiece();
  _removePreview();
  _previewRotation = 0;  // reset rotation for next piece

  // Check step / build completion
  if (isStepComplete()) {
    if (isBuildComplete()) {
      hideAllGhosts();
      if (_onBuildComplete) _onBuildComplete();
    } else {
      advanceStep();
      const nextStep = getCurrentStep();
      if (nextStep) showStepGhosts(nextStep);
      if (_onStepAdvance) _onStepAdvance();
    }
  }
  // If step is NOT complete (multi-piece step), ghosts for remaining pieces stay visible
}

/**
 * Reject a placement attempt — flash the ghost red if one was hit, or do nothing for empty-space clicks.
 * @param {THREE.Mesh|null} ghostMesh - the ghost that was clicked, or null for empty-space click
 */
function _rejectPlacement(ghostMesh) {
  if (!ghostMesh) return;  // empty-space click — no visual feedback

  const origColor = ghostMesh.material.color.clone();
  const rejectColor = new THREE.Color(0xe53935);  // rejection red from UI-SPEC
  ghostMesh.material.color.copy(rejectColor);

  // Tween back to original color
  const proxy = { t: 0 };
  gsap.to(proxy, {
    t: 1,
    duration: 0.3,
    ease: 'power1.inOut',
    onUpdate: function () {
      ghostMesh.material.color.lerpColors(rejectColor, origColor, proxy.t);
      ghostMesh.material.needsUpdate = true;
    },
  });
}

/**
 * Create (or reuse) the preview mesh for the given piece type and color.
 * Preview is semi-transparent (opacity 0.5) and rendered above ghosts (renderOrder 2).
 * Does NOT dispose geometry (cached in geometry.js).
 * @param {string} pieceType
 * @param {string|number} pieceColor
 */
function _createPreview(pieceType, pieceColor) {
  // Check if existing preview matches — reuse if so
  if (
    _previewMesh &&
    _previewMesh.userData.previewType === pieceType &&
    _previewMesh.userData.previewColor === pieceColor
  ) {
    return;
  }
  _removePreview();

  const geometry = getGeometry(pieceType);  // cached, do NOT dispose
  const material = new THREE.MeshStandardMaterial({
    color: pieceColor,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  _previewMesh = new THREE.Mesh(geometry, material);
  _previewMesh.renderOrder = 2;  // render after ghosts (renderOrder 1)
  _previewMesh.userData.previewType = pieceType;
  _previewMesh.userData.previewColor = pieceColor;
  _previewMesh.rotation.y = THREE.MathUtils.degToRad(_previewRotation);
  getScene().add(_previewMesh);
}

/**
 * Remove the preview mesh from the scene and dispose its material.
 * Does NOT reset _previewRotation — rotation resets only on placement in _confirmPlacement.
 */
function _removePreview() {
  if (_previewMesh) {
    getScene().remove(_previewMesh);
    _previewMesh.material.dispose();  // dispose material only, NOT geometry (cached)
    _previewMesh = null;
  }
}

/**
 * Raycast against the baseplate to find cursor world position, snap to stud grid,
 * and reposition the preview mesh.
 * @param {PointerEvent} event
 */
function _updatePreviewPosition(event) {
  const heldId = getHeldPieceId();
  if (!heldId) return;

  const step = getCurrentStep();
  if (!step) return;

  const heldPiece = step.pieces.find(p => p.id === heldId);
  if (!heldPiece) return;

  // Create or update preview mesh for the held piece type/color
  _createPreview(heldPiece.type, heldPiece.color);

  // Raycast against the baseplate to find cursor world position
  _ndc.x = (event.clientX / window.innerWidth) * 2 - 1;
  _ndc.y = -(event.clientY / window.innerHeight) * 2 + 1;
  _raycaster.setFromCamera(_ndc, getCamera());

  if (!_baseplateMesh) return;
  const hits = _raycaster.intersectObject(_baseplateMesh);

  if (hits.length === 0) {
    // Cursor is off the baseplate — hide preview
    _previewMesh.visible = false;
    return;
  }

  _previewMesh.visible = true;
  const hitPoint = hits[0].point;

  // Snap to stud grid using worldToGrid then gridToWorld roundtrip
  const gridPos = worldToGrid(hitPoint, heldPiece.type);
  // Use layer 0 for ground-level preview (ghost shows correct target height)
  const snappedWorld = gridToWorld(gridPos.gridX, gridPos.gridZ, 0, heldPiece.type);
  _previewMesh.position.copy(snappedWorld);
}
