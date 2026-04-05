import * as THREE from 'three';
import { getScene } from './scene.js';
import { getGeometry } from './geometry.js';
import { gridToWorld } from './grid.js';

// All currently visible ghost meshes
let _ghostMeshes = [];

/**
 * Create and show a single ghost mesh for one piece.
 * Uses cached geometry from geometry.js — never clones or disposes it.
 * @param {{ id: string, type: string, color: string, gridX: number, gridZ: number, layer: number, rotation: number }} piece
 * @returns {THREE.Mesh} the created ghost mesh
 */
export function showGhost(piece) {
  const geometry = getGeometry(piece.type);  // do NOT clone — use cached reference

  const material = new THREE.MeshStandardMaterial({
    color: piece.color,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 1;

  const pos = gridToWorld(piece.gridX, piece.gridZ, piece.layer, piece.type);
  mesh.position.copy(pos);
  mesh.rotation.y = THREE.MathUtils.degToRad(piece.rotation);
  mesh.userData.ghostPieceId = piece.id;

  getScene().add(mesh);
  _ghostMeshes.push(mesh);

  return mesh;
}

/**
 * Remove the ghost mesh for a specific piece ID from the scene.
 * Disposes only the material — NEVER the geometry (belongs to cache).
 * @param {string} pieceId
 */
export function hideGhost(pieceId) {
  const index = _ghostMeshes.findIndex(m => m.userData.ghostPieceId === pieceId);
  if (index === -1) return;

  const mesh = _ghostMeshes[index];
  getScene().remove(mesh);
  mesh.material.dispose();  // dispose material to prevent leak; NEVER geometry

  _ghostMeshes.splice(index, 1);
}

/**
 * Show all ghost meshes for an entire step simultaneously.
 * Clears any existing ghosts first, then creates one per piece in the step.
 * @param {{ pieces: Array }} step
 * @returns {THREE.Mesh[]} array of created ghost meshes
 */
export function showStepGhosts(step) {
  hideAllGhosts();
  const meshes = step.pieces.map(piece => showGhost(piece));
  return meshes;
}

/**
 * Remove all ghost meshes from the scene.
 * Disposes materials but NEVER geometry.
 */
export function hideAllGhosts() {
  for (const mesh of _ghostMeshes) {
    getScene().remove(mesh);
    mesh.material.dispose();  // material only — geometry is shared cache
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
