import * as THREE from 'three';

// Lego stud-grid constants (LDraw standard, 1 unit = 1mm)
export const STUD_SIZE = 8;      // horizontal spacing between stud centers (8mm)
export const BRICK_HEIGHT = 9.6; // standard brick height (9.6mm)
export const PLATE_HEIGHT = 3.2; // plate height (1/3 of brick height)

/**
 * Convert integer stud-grid coordinates to Three.js world position.
 * The returned Vector3 is the CENTER of the brick's bottom face.
 * @param {number} gridX - integer stud column
 * @param {number} gridZ - integer stud row
 * @param {number} layer - integer stack height (0 = on baseplate surface)
 * @param {string} pieceType - one of the 13 BRICK_TYPES strings
 * @returns {THREE.Vector3}
 */
export function gridToWorld(gridX, gridZ, layer, pieceType) {
  const isPlate = pieceType.startsWith('plate');
  const h = isPlate ? PLATE_HEIGHT : BRICK_HEIGHT;
  return new THREE.Vector3(
    gridX * STUD_SIZE,
    layer * h,
    gridZ * STUD_SIZE
  );
}

/**
 * Convert a Three.js world position back to integer stud-grid coordinates.
 * Uses Math.round() — result is always integers (no floating-point drift).
 * @param {THREE.Vector3} worldPos
 * @param {string} pieceType
 * @returns {{ gridX: number, gridZ: number, layer: number }}
 */
export function worldToGrid(worldPos, pieceType) {
  const isPlate = pieceType.startsWith('plate');
  const h = isPlate ? PLATE_HEIGHT : BRICK_HEIGHT;
  return {
    gridX: Math.round(worldPos.x / STUD_SIZE),
    gridZ: Math.round(worldPos.z / STUD_SIZE),
    layer: Math.round(worldPos.y / h),
  };
}

/**
 * Canonical string key for a grid cell. Used as key in placement Set.
 * e.g. gridKey(2, -1, 3) === "2,-1,3"
 */
export function gridKey(gridX, gridZ, layer) {
  return `${gridX},${gridZ},${layer}`;
}
