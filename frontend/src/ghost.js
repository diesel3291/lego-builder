import * as THREE from 'three';
import { getScene } from './scene.js';
import { getGeometry } from './geometry.js';
import { gridToWorld } from './grid.js';
import { getPlacedThisStep } from './state.js';

// All currently visible ghost meshes (each entry is a THREE.Group with mesh + edge lines)
let _ghostMeshes = [];

// Cache EdgesGeometry per brick type to avoid recomputing
const _edgesCache = new Map();

/**
 * Create and show a single ghost mesh for one piece.
 * Uses cached geometry from geometry.js — never clones or disposes it.
 * @param {{ id: string, type: string, color: string, gridX: number, gridZ: number, layer: number, rotation: number }} piece
 * @returns {THREE.Mesh} the created ghost mesh
 */
export function showGhost(piece) {
  const geometry = getGeometry(piece.type);  // do NOT clone — use cached reference

  // Semi-transparent fill
  const material = new THREE.MeshStandardMaterial({
    color: piece.color,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 1;

  // Solid edge outline for visibility against same-color bricks
  if (!_edgesCache.has(piece.type)) {
    _edgesCache.set(piece.type, new THREE.EdgesGeometry(geometry, 30));
  }
  const edgesGeo = _edgesCache.get(piece.type);
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    linewidth: 1,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const edges = new THREE.LineSegments(edgesGeo, edgeMaterial);
  edges.renderOrder = 1;

  // Group the fill mesh and edge lines together
  const group = new THREE.Group();
  group.add(mesh);
  group.add(edges);

  const pos = gridToWorld(piece.gridX, piece.gridZ, piece.layer, piece.type);
  group.position.copy(pos);
  group.rotation.y = THREE.MathUtils.degToRad(piece.rotation);
  group.userData.ghostPieceId = piece.id;

  getScene().add(group);
  _ghostMeshes.push(group);

  return group;
}

/**
 * Remove the ghost mesh for a specific piece ID from the scene.
 * Disposes only the material — NEVER the geometry (belongs to cache).
 * @param {string} pieceId
 */
export function hideGhost(pieceId) {
  const index = _ghostMeshes.findIndex(m => m.userData.ghostPieceId === pieceId);
  if (index === -1) return;

  const group = _ghostMeshes[index];
  getScene().remove(group);
  // Dispose materials for all children (fill mesh + edge lines); NEVER geometry
  for (const child of group.children) {
    if (child.material) child.material.dispose();
  }

  _ghostMeshes.splice(index, 1);
}

/**
 * Show all ghost meshes for an entire step simultaneously.
 * Clears any existing ghosts first, then creates one per unplaced piece in the step.
 * Skips pieces that have already been placed to avoid ghost overlays on opaque bricks.
 * @param {{ pieces: Array }} step
 * @returns {THREE.Mesh[]} array of created ghost meshes
 */
export function showStepGhosts(step) {
  hideAllGhosts();
  const placed = getPlacedThisStep();
  const meshes = step.pieces
    .filter(piece => !placed.has(piece.id))
    .map(piece => showGhost(piece));
  return meshes;
}

/**
 * Remove all ghost meshes from the scene.
 * Disposes materials but NEVER geometry.
 */
export function hideAllGhosts() {
  for (const group of _ghostMeshes) {
    getScene().remove(group);
    for (const child of group.children) {
      if (child.material) child.material.dispose();
    }
  }
  _ghostMeshes = [];
}

/**
 * Returns the array of currently visible ghost meshes.
 * Used by interaction.js to include ghosts as raycaster targets.
 * @returns {THREE.Mesh[]}
 */
export function getGhostMeshes() {
  return _ghostMeshes;
}
