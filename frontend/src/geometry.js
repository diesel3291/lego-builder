import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { STUD_SIZE, BRICK_HEIGHT, PLATE_HEIGHT, DIMS } from './grid.js';

// All valid v1 piece types. Must match sets/schema.md exactly.
export const BRICK_TYPES = [
  'brick-1x1', 'brick-1x2', 'brick-1x3', 'brick-1x4',
  'brick-2x2', 'brick-2x3', 'brick-2x4',
  'plate-1x1', 'plate-1x2', 'plate-1x4', 'plate-2x2', 'plate-2x4',
  'slope-2x1', 'slope-2x2',
];

// Geometry cache: keyed by type string, value is THREE.BufferGeometry
const _cache = new Map();

// Stud dimensions (classic Lego proportions)
const STUD_RADIUS = 2.4;   // ~2.4mm radius
const STUD_HEIGHT = 1.8;   // ~1.8mm tall
const STUD_SEGMENTS = 12;  // cylinder segments — enough for smooth look

/**
 * Returns a cached THREE.BufferGeometry for the given brick type.
 * Includes cylindrical studs on top. Origin is at the center of the bottom face.
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

  const GAP = 0.2;
  const w = cols * STUD_SIZE - GAP;
  const d = rows * STUD_SIZE - GAP;

  // Body box — translated so bottom face is at y=0
  const body = new THREE.BoxGeometry(w, height, d);
  body.translate(0, height / 2, 0);

  // Create studs on top
  const parts = [body];
  const studTemplate = new THREE.CylinderGeometry(STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, STUD_SEGMENTS);

  for (let cx = 0; cx < cols; cx++) {
    for (let rz = 0; rz < rows; rz++) {
      const stud = studTemplate.clone();
      // Position each stud centered on its grid cell, on top of the body
      const sx = (cx - (cols - 1) / 2) * STUD_SIZE;
      const sz = (rz - (rows - 1) / 2) * STUD_SIZE;
      stud.translate(sx, height + STUD_HEIGHT / 2, sz);
      parts.push(stud);
    }
  }

  const geometry = mergeGeometries(parts);
  studTemplate.dispose();
  for (const p of parts) p.dispose();

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
