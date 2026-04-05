import * as THREE from 'three';
import { STUD_SIZE, BRICK_HEIGHT, PLATE_HEIGHT } from './grid.js';

// All valid v1 piece types. Must match sets/schema.md exactly.
export const BRICK_TYPES = [
  'brick-1x1', 'brick-1x2', 'brick-1x3', 'brick-1x4',
  'brick-2x2', 'brick-2x3', 'brick-2x4',
  'plate-1x1', 'plate-1x2', 'plate-1x4', 'plate-2x2', 'plate-2x4',
  'slope-2x1', 'slope-2x2',
];

// Geometry cache: keyed by type string, value is THREE.BufferGeometry
const _cache = new Map();

// Brick stud dimensions (columns x rows)
const DIMS = {
  'brick-1x1': [1, 1], 'brick-1x2': [1, 2], 'brick-1x3': [1, 3], 'brick-1x4': [1, 4],
  'brick-2x2': [2, 2], 'brick-2x3': [2, 3], 'brick-2x4': [2, 4],
  'plate-1x1': [1, 1], 'plate-1x2': [1, 2], 'plate-1x4': [1, 4],
  'plate-2x2': [2, 2], 'plate-2x4': [2, 4],
  'slope-2x1': [2, 1], 'slope-2x2': [2, 2],
};

/**
 * Returns a cached THREE.BufferGeometry for the given brick type.
 * The geometry origin is at the center of the bottom face.
 * @param {string} type - one of BRICK_TYPES
 * @returns {THREE.BufferGeometry}
 * @throws {Error} if type is not in BRICK_TYPES
 */
export function getGeometry(type) {
  if (!BRICK_TYPES.includes(type)) {
    throw new Error(`Unknown brick type: "${type}". Valid types: ${BRICK_TYPES.join(', ')}`);
  }

  if (_cache.has(type)) return _cache.get(type);

  const [cols, rows] = DIMS[type];
  const isPlate = type.startsWith('plate');
  const height = isPlate ? PLATE_HEIGHT : BRICK_HEIGHT;

  // Width: cols studs, depth: rows studs (minus a tiny gap for aesthetics)
  const GAP = 0.2;  // small gap between adjacent bricks for visual separation
  const w = cols * STUD_SIZE - GAP;
  const d = rows * STUD_SIZE - GAP;

  let geometry;

  if (type.startsWith('slope')) {
    // Slopes: use a wedge via custom geometry. For v1, approximate with a BoxGeometry
    // and a visible shear — or simply use a narrower box tilted via rotation in the mesh.
    // Simple approach: standard box with same dims as a brick; rotation set in brickMesh.js.
    // Full wedge geometry deferred to polish phase. This keeps v1 simple.
    geometry = new THREE.BoxGeometry(w, height, d);
  } else {
    geometry = new THREE.BoxGeometry(w, height, d);
  }

  // Translate geometry so origin is at the BOTTOM face center (not the geometric center).
  // This makes gridToWorld() position math intuitive: position.y = layer * height puts
  // the bottom face at the correct layer without an offset correction.
  geometry.translate(0, height / 2, 0);

  _cache.set(type, geometry);
  return geometry;
}

/**
 * Dispose all cached geometries. Call when switching sets or on teardown.
 */
export function disposeGeometryCache() {
  for (const geo of _cache.values()) {
    geo.dispose();
  }
  _cache.clear();
}
