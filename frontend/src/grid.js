import * as THREE from 'three';

// Lego stud-grid constants (LDraw standard, 1 unit = 1mm)
export const STUD_SIZE = 8;      // horizontal spacing between stud centers (8mm)
export const BRICK_HEIGHT = 9.6; // standard brick height (9.6mm)
export const PLATE_HEIGHT = 3.2; // plate height (1/3 of brick height)

// Brick stud dimensions (columns x rows) — shared with geometry.js
export const DIMS = {
  'brick-1x1': [1, 1], 'brick-1x2': [1, 2], 'brick-1x3': [1, 3], 'brick-1x4': [1, 4],
  'brick-2x2': [2, 2], 'brick-2x3': [2, 3], 'brick-2x4': [2, 4],
  'plate-1x1': [1, 1], 'plate-1x2': [1, 2], 'plate-1x3': [1, 3], 'plate-1x4': [1, 4],
  'plate-2x2': [2, 2], 'plate-2x3': [2, 3], 'plate-2x4': [2, 4],
  'slope-2x1': [2, 1], 'slope-2x2': [2, 2],
  'round-1x1': [1, 1], 'round-2x2': [2, 2],
  'curve-2x2': [2, 2], 'wedge-2x2-corner': [2, 2],
  'plate-round-1x1': [1, 1],
  'fist-2x2': [2, 2], 'bicep-2x2': [2, 2], 'deltoid-2x2': [2, 2],
  'trapezoid-2x1': [2, 1], 'nose-1x1': [1, 1],
};

/**
 * Convert integer stud-grid coordinates to Three.js world position.
 * gridX/gridZ is the corner stud of the brick (smallest x/z stud).
 * Returns the CENTER of the brick's bottom face so geometry aligns studs to the grid.
 * @param {number} gridX - integer stud column (corner)
 * @param {number} gridZ - integer stud row (corner)
 * @param {number} layer - integer stack height (0 = on baseplate surface)
 * @param {string} pieceType - one of the 13 BRICK_TYPES strings
 * @returns {THREE.Vector3}
 */
export function gridToWorld(gridX, gridZ, layer, pieceType) {
  const isPlate = pieceType.startsWith('plate');
  const h = isPlate ? PLATE_HEIGHT : BRICK_HEIGHT;
  const [cols, rows] = DIMS[pieceType] || [1, 1];
  return new THREE.Vector3(
    (gridX + (cols - 1) / 2) * STUD_SIZE,
    layer * h,
    (gridZ + (rows - 1) / 2) * STUD_SIZE
  );
}

/**
 * Convert a Three.js world position back to integer stud-grid coordinates.
 * Returns the corner stud (smallest x/z).
 * @param {THREE.Vector3} worldPos
 * @param {string} pieceType
 * @returns {{ gridX: number, gridZ: number, layer: number }}
 */
export function worldToGrid(worldPos, pieceType) {
  const isPlate = pieceType.startsWith('plate');
  const h = isPlate ? PLATE_HEIGHT : BRICK_HEIGHT;
  const [cols, rows] = DIMS[pieceType] || [1, 1];
  return {
    gridX: Math.round(worldPos.x / STUD_SIZE - (cols - 1) / 2),
    gridZ: Math.round(worldPos.z / STUD_SIZE - (rows - 1) / 2),
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
