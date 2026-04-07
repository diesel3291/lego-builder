import * as THREE from 'three';
import gsap from 'gsap';
import { getScene, getCamera, getRenderer, createBrickMaterial } from './scene.js';
import { getGeometry } from './geometry.js';
import { gridToWorld } from './grid.js';
import {
  getHeldPieceId, getCurrentStep, placeBrick,
  isStepComplete, advanceStep, releasePiece, isBuildComplete, getPlacedThisStep,
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
let _onPiecePlaced = null;   // callback: called after each piece placement

// Preview mesh state
let _previewMesh = null;       // THREE.Mesh — semi-transparent brick following cursor
let _previewRotation = 0;      // degrees: 0, 90, 180, 270 — rotation offset for preview
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // y=0 ground plane for raycasting
const _planeIntersect = new THREE.Vector3(); // reusable intersection point
const _targetPos = new THREE.Vector3();      // smooth movement target
const SNAP_DISTANCE = 12; // distance (mm) at which preview snaps to nearest ghost

/**
 * Initialize the interaction module. Call once from main.js after initScene.
 * Attaches pointer event listeners to the canvas for click disambiguation and placement.
 * @param {{ onStepAdvance?: Function, onBuildComplete?: Function }} options
 */
export function initInteraction({ onStepAdvance, onBuildComplete, onPiecePlaced } = {}) {
  _onStepAdvance = onStepAdvance || null;
  _onBuildComplete = onBuildComplete || null;
  _onPiecePlaced = onPiecePlaced || null;

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
        _previewRotation = (_previewRotation + 45) % 360;
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

  // Raycast against ghost groups (recursive to hit child meshes)
  const targets = [...getGhostMeshes()];
  const hits = _raycaster.intersectObjects(targets, true);

  if (hits.length === 0) {
    // Clicked empty space — no visual feedback
    _rejectPlacement(null);
    return;
  }

  // Walk up to the ghost group to get the pieceId (child meshes don't have it)
  let hitGroup = hits[0].object;
  while (hitGroup && !hitGroup.userData.ghostPieceId) {
    hitGroup = hitGroup.parent;
  }
  if (!hitGroup) return;
  const pieceId = hitGroup.userData.ghostPieceId;

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
    _rejectPlacement(hitGroup);
    return;
  }

  // Rotation matching — type-aware logic for different piece symmetries
  const gr = ((ghostPiece.rotation || 0) % 360 + 360) % 360;
  const pr = (_previewRotation % 360 + 360) % 360;
  const diff = (pr - gr + 360) % 360;

  const pt = ghostPiece.type;
  const isSymmetric = pt.startsWith('round-') || pt === 'plate-round-1x1' ||
                      pt === 'deltoid-2x2' || pt === 'bicep-2x2';

  if (!isSymmetric) {
    // Square pieces (1x1, 2x2): any 90° multiple is valid
    const isSquare = pt.endsWith('-1x1') || pt.endsWith('-2x2') || pt === 'wedge-2x2-corner' || pt === 'curve-2x2' || pt === 'fist-2x2';
    if (isSquare) {
      if (diff % 90 !== 0) { _rejectPlacement(hitGroup); return; }
    } else {
      // Rectangular (2x1, 1x2, etc.): only 0° and 180°
      if (diff !== 0 && diff !== 180) { _rejectPlacement(hitGroup); return; }
    }
  }

  _confirmPlacement(ghostPiece, hitGroup, pr);
}

/**
 * Confirm a valid placement: create opaque brick, flash green, update state.
 * @param {Object} piece - piece data from step JSON
 * @param {THREE.Mesh} ghostMesh - the ghost mesh to replace
 * @param {number} [rotation] - override rotation in degrees (for 180° symmetry)
 */
function _confirmPlacement(piece, ghostMesh, rotation) {
  const appliedRotation = rotation !== undefined ? rotation : (piece.rotation || 0);
  // Create the opaque brick mesh using cached geometry + new per-brick material
  const geometry = getGeometry(piece.type);
  const material = createBrickMaterial(piece.color);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(gridToWorld(piece.gridX, piece.gridZ, piece.layer, piece.type));
  mesh.rotation.y = THREE.MathUtils.degToRad(appliedRotation);
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

  // Notify tray/hud immediately so placed piece disappears from tray
  if (_onPiecePlaced) _onPiecePlaced();

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
 * @param {THREE.Group|null} ghostGroup - the ghost group that was clicked, or null for empty-space click
 */
function _rejectPlacement(ghostGroup) {
  if (!ghostGroup) return;  // empty-space click — no visual feedback

  // Find the fill mesh (first Mesh child) inside the group
  const fillMesh = ghostGroup.children.find(c => c.isMesh);
  if (!fillMesh) return;

  const origColor = fillMesh.material.color.clone();
  const rejectColor = new THREE.Color(0xe53935);  // rejection red from UI-SPEC
  fillMesh.material.color.copy(rejectColor);

  // Tween back to original color
  const proxy = { t: 0 };
  gsap.to(proxy, {
    t: 1,
    duration: 0.3,
    ease: 'power1.inOut',
    onUpdate: function () {
      fillMesh.material.color.lerpColors(rejectColor, origColor, proxy.t);
      fillMesh.material.needsUpdate = true;
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
 * Raycast against the ground plane to find cursor world position.
 * Preview follows cursor smoothly and snaps magnetically when near a ghost.
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

  // Raycast against a plane at the current build layer height
  const layerHeight = heldPiece.layer * (heldPiece.type.startsWith('plate') ? 3.2 : 9.6);
  _groundPlane.constant = -layerHeight; // plane eq: y = layerHeight → normal·p + d = 0 → d = -height
  _ndc.x = (event.clientX / window.innerWidth) * 2 - 1;
  _ndc.y = -(event.clientY / window.innerHeight) * 2 + 1;
  _raycaster.setFromCamera(_ndc, getCamera());

  const hit = _raycaster.ray.intersectPlane(_groundPlane, _planeIntersect);

  if (!hit) {
    _previewMesh.visible = false;
    return;
  }

  _previewMesh.visible = true;

  // Cursor position is already at the correct build height from the plane intersection
  _targetPos.copy(hit);

  // Check proximity to ghost positions — magnetic snap
  let snapped = false;
  const ghosts = getGhostMeshes();
  for (const ghost of ghosts) {
    const dx = _targetPos.x - ghost.position.x;
    const dz = _targetPos.z - ghost.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < SNAP_DISTANCE) {
      _targetPos.copy(ghost.position);
      snapped = true;
      break;
    }
  }

  // Smooth lerp toward target (snapped or free-following)
  if (snapped) {
    // Snap immediately to ghost position for precise feedback
    _previewMesh.position.copy(_targetPos);
  } else {
    // Smooth interpolation — 30% per frame gives responsive but fluid motion
    _previewMesh.position.lerp(_targetPos, 0.3);
  }
}
