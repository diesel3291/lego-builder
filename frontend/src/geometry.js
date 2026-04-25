import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { STUD_SIZE, BRICK_HEIGHT, PLATE_HEIGHT, DIMS } from './grid.js';

// All valid piece types. Must match sets/schema.md and app.py VALID_TYPES exactly.
export const BRICK_TYPES = [
  'brick-1x1', 'brick-1x2', 'brick-1x3', 'brick-1x4',
  'brick-2x2', 'brick-2x3', 'brick-2x4',
  'plate-1x1', 'plate-1x2', 'plate-1x3', 'plate-1x4', 'plate-2x2', 'plate-2x3', 'plate-2x4',
  'slope-2x1', 'slope-2x2',
  'round-1x1', 'round-2x2',
  'curve-2x2', 'wedge-2x2-corner',
  'plate-round-1x1',
  'fist-2x2', 'bicep-2x2', 'deltoid-2x2',
  'trapezoid-2x1', 'nose-1x1',
];

// Geometry cache: keyed by type string, value is THREE.BufferGeometry
const _cache = new Map();

// Stud dimensions (classic Lego proportions)
const STUD_RADIUS = 2.4;   // ~2.4mm radius
const STUD_HEIGHT = 1.8;   // ~1.8mm tall
const STUD_SEGMENTS = 12;  // cylinder segments — enough for smooth look

// Capped vs flat-top stud toggle.
// PERF FALLBACK — if total stud count in the scene > ~400 and FPS dips,
// call setStudCapMode('flat') (clears geometry cache) to swap back to flat-top studs.
let _USE_FLAT_STUDS = false;

/**
 * Build a single stud template geometry. Origin centered along Y so callsites
 * can `stud.translate(sx, height + STUD_HEIGHT/2, sz)` exactly as before.
 * @returns {THREE.BufferGeometry}
 */
function _buildStudTemplate() {
  if (_USE_FLAT_STUDS) {
    // Flat-top fallback — original cylinder
    return new THREE.CylinderGeometry(STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, STUD_SEGMENTS);
  }
  // Capped stud: cylinder body + low-poly hemisphere on top
  const body = new THREE.CylinderGeometry(STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, STUD_SEGMENTS);
  body.translate(0, STUD_HEIGHT / 2, 0);
  body.deleteAttribute('uv');
  const cap = new THREE.SphereGeometry(STUD_RADIUS, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  cap.translate(0, STUD_HEIGHT, 0);
  cap.deleteAttribute('uv');
  const merged = mergeGeometries([body, cap]);
  body.dispose();
  cap.dispose();
  // Original CylinderGeometry centered on Y — shift our merged piece so its
  // own "center" sits at y=0 to keep the existing translate(... height + STUD_HEIGHT/2 ...) callsites correct.
  merged.translate(0, -STUD_HEIGHT / 2, 0);
  return merged;
}

/**
 * Toggle the stud cap mode at runtime. Clears the geometry cache so all
 * pieces are rebuilt with the new stud template.
 * @param {'capped'|'flat'} mode
 */
export function setStudCapMode(mode) {
  const next = mode === 'flat';
  if (next === _USE_FLAT_STUDS) return;
  _USE_FLAT_STUDS = next;
  disposeGeometryCache();
}

// Types that use custom (non-box) body geometry and lack UVs
const _CUSTOM_BODY_TYPES = new Set([
  'slope-2x1', 'slope-2x2',
  'round-1x1', 'round-2x2', 'plate-round-1x1',
  'curve-2x2', 'wedge-2x2-corner',
  'fist-2x2', 'bicep-2x2', 'deltoid-2x2',
  'trapezoid-2x1', 'nose-1x1',
]);

// ---- Custom body builders ----

/**
 * Build a wedge (slope) body geometry.
 * Full brick height at the front (negative Z), slopes down to plate height at the back.
 */
function _buildSlopeBody(w, d, height) {
  const hw = w / 2;
  const hd = d / 2;
  const lo = PLATE_HEIGHT;

  const vertices = new Float32Array([
    -hw, 0, -hd,    hw, 0, -hd,    -hw, height, -hd,    hw, height, -hd,
    -hw, 0,  hd,    hw, 0,  hd,    -hw, lo,     hd,     hw, lo,     hd,
  ]);
  const indices = [
    0, 3, 2,  0, 1, 3,
    4, 6, 7,  4, 7, 5,
    0, 4, 5,  0, 5, 1,
    0, 2, 6,  0, 6, 4,
    1, 5, 7,  1, 7, 3,
    2, 3, 7,  2, 7, 6,
  ];

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Build a cylinder body. Used by round-1x1, round-2x2, plate-round-1x1.
 * Origin at center of bottom face.
 */
function _buildCylinderBody(w, d, height) {
  const radius = Math.min(w, d) / 2;
  const geo = new THREE.CylinderGeometry(radius, radius, height, 16);
  geo.translate(0, height / 2, 0);
  // Strip UVs — CylinderGeometry generates them but we need UV-free for merge
  geo.deleteAttribute('uv');
  return geo;
}

/**
 * Build a quarter-cylinder body for curve-2x2.
 * 90° arc occupying the (+X, -Z) quadrant. Flat faces on X=0 and Z=0 planes.
 * Origin at center of 2x2 footprint bottom.
 */
function _buildQuarterCylinder(w, d, height) {
  const hw = w / 2;
  const hd = d / 2;
  const radius = Math.min(w, d);
  const segs = 12;

  const positions = [];
  const indices = [];

  // Center of arc at (-hw, 0, hd) — inner corner
  const cx = -hw;
  const cz = hd;

  // Arc vertices: bottom ring, then top ring
  // Arc goes from +X direction (angle=0) to -Z direction (angle=PI/2)
  for (let i = 0; i <= segs; i++) {
    const theta = (Math.PI / 2) * (i / segs);
    const ax = cx + radius * Math.cos(theta);
    const az = cz - radius * Math.sin(theta);
    // bottom vertex
    positions.push(ax, 0, az);
    // top vertex
    positions.push(ax, height, az);
  }
  // Center vertices for bottom and top fans
  const bottomCenter = positions.length / 3;
  positions.push(cx, 0, cz);
  const topCenter = positions.length / 3;
  positions.push(cx, height, cz);

  // Curved wall: quad strip between bottom[i] and top[i]
  for (let i = 0; i < segs; i++) {
    const b0 = i * 2;
    const t0 = i * 2 + 1;
    const b1 = (i + 1) * 2;
    const t1 = (i + 1) * 2 + 1;
    indices.push(b0, b1, t1, b0, t1, t0);
  }

  // Bottom fan (winding: CW from below → CCW from above for backface)
  for (let i = 0; i < segs; i++) {
    const b0 = i * 2;
    const b1 = (i + 1) * 2;
    indices.push(bottomCenter, b1, b0);
  }

  // Top fan
  for (let i = 0; i < segs; i++) {
    const t0 = i * 2 + 1;
    const t1 = (i + 1) * 2 + 1;
    indices.push(topCenter, t0, t1);
  }

  // Flat side faces (X=cx plane and Z=cz plane)
  const firstBottom = 0;
  const firstTop = 1;
  const lastBottom = segs * 2;
  const lastTop = segs * 2 + 1;

  // Side 1: from center to first arc point (angle=0, +X direction)
  indices.push(bottomCenter, firstBottom, firstTop, bottomCenter, firstTop, topCenter);
  // Side 2: from last arc point to center (angle=PI/2, -Z direction)
  indices.push(lastBottom, bottomCenter, topCenter, lastBottom, topCenter, lastTop);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Build a right-triangle prism for wedge-2x2-corner.
 * Triangle occupies 3 of 4 cells in the 2x2 footprint (diagonal cut removes +X,+Z corner).
 * Origin at center of 2x2 footprint bottom.
 */
function _buildWedgeCorner(w, d, height) {
  const hw = w / 2;
  const hd = d / 2;

  // Triangle: (-hw,-hd), (hw,-hd), (-hw,hd) — the +X,+Z corner is cut
  const vertices = new Float32Array([
    // bottom triangle
    -hw, 0, -hd,    hw, 0, -hd,    -hw, 0, hd,
    // top triangle
    -hw, height, -hd,    hw, height, -hd,    -hw, height, hd,
  ]);
  // 0=BL-bot, 1=BR-bot, 2=TL-bot, 3=BL-top, 4=BR-top, 5=TL-top
  const indices = [
    // bottom face
    0, 2, 1,
    // top face
    3, 4, 5,
    // front face (z=-hd): 0,1 bottom → 3,4 top
    0, 1, 4,  0, 4, 3,
    // left face (x=-hw): 0,2 bottom → 3,5 top
    0, 3, 5,  0, 5, 2,
    // diagonal face: 1,2 bottom → 4,5 top
    1, 2, 5,  1, 5, 4,
  ];

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Build a fist shape for fist-2x2.
 * Box body with 4 knuckle ridge bumps on the front face (-Z).
 */
function _buildFist(w, d, height) {
  // Main body — box without UVs
  const mainBody = new THREE.BoxGeometry(w, height, d);
  mainBody.translate(0, height / 2, 0);
  mainBody.deleteAttribute('uv');

  const parts = [mainBody];

  // 4 knuckle ridges across the front face
  const knuckleW = w / 5.5;
  const knuckleH = height * 0.18;
  const knuckleD = d * 0.15;
  for (let i = 0; i < 4; i++) {
    const knuckle = new THREE.BoxGeometry(knuckleW, knuckleH, knuckleD);
    const kx = (i - 1.5) * (w / 4.5);
    knuckle.translate(kx, height * 0.72, -d / 2 - knuckleD / 2);
    knuckle.deleteAttribute('uv');
    parts.push(knuckle);
  }

  const geo = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return geo;
}

/**
 * Build a bicep dome for bicep-2x2.
 * Cylinder lower portion + hemisphere cap on top. No studs.
 */
function _buildBicep(w, d, height) {
  const radius = Math.min(w, d) / 2;
  const cylHeight = height * 0.6;

  // Lower cylinder
  const cyl = new THREE.CylinderGeometry(radius, radius, cylHeight, 16);
  cyl.translate(0, cylHeight / 2, 0);
  cyl.deleteAttribute('uv');

  // Hemisphere cap
  const cap = new THREE.SphereGeometry(radius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  cap.translate(0, cylHeight, 0);
  cap.deleteAttribute('uv');

  const parts = [cyl, cap];
  const geo = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return geo;
}

/**
 * Build a deltoid hemisphere dome for deltoid-2x2.
 * Half-sphere sitting on a flat bottom. No studs.
 */
function _buildDeltoid(w, d, height) {
  const radius = Math.min(w, d) / 2;

  // Hemisphere
  const dome = new THREE.SphereGeometry(radius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.deleteAttribute('uv');

  // Bottom disc to close the flat base
  const disc = new THREE.CircleGeometry(radius, 16);
  disc.rotateX(-Math.PI / 2); // face downward
  disc.deleteAttribute('uv');

  const parts = [dome, disc];
  const geo = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return geo;
}

/**
 * Build a trapezoid body for trapezoid-2x1.
 * Full width at bottom, 70% width at top. Like a tapered brick.
 */
function _buildTrapezoid(w, d, height) {
  const hw = w / 2;
  const hd = d / 2;
  const tw = w * 0.35; // half of top width (70% of full)

  const vertices = new Float32Array([
    // bottom: full width
    -hw, 0, -hd,    hw, 0, -hd,    hw, 0, hd,    -hw, 0, hd,
    // top: narrower
    -tw, height, -hd,    tw, height, -hd,    tw, height, hd,    -tw, height, hd,
  ]);
  // 0-3: bottom (FL, FR, BR, BL), 4-7: top (FL, FR, BR, BL)
  const indices = [
    // bottom
    0, 2, 1,  0, 3, 2,
    // top
    4, 5, 6,  4, 6, 7,
    // front (z=-hd)
    0, 1, 5,  0, 5, 4,
    // back (z=+hd)
    2, 3, 7,  2, 7, 6,
    // left (x=-w)
    3, 0, 4,  3, 4, 7,
    // right (x=+w)
    1, 2, 6,  1, 6, 5,
  ];

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Build a nose wedge for nose-1x1.
 * Rectangular back, tapers to a pointed front edge at -Z.
 */
function _buildNose(w, d, height) {
  const hw = w / 2;
  const hd = d / 2;
  const tipH = height * 0.5; // tip is shorter than full height

  const vertices = new Float32Array([
    // back face (z=+hd): full rectangle
    -hw, 0, hd,    hw, 0, hd,    hw, height, hd,    -hw, height, hd,
    // front tip (z=-hd): single edge at center
    0, 0, -hd,    0, tipH, -hd,
  ]);
  // 0-3: back (BL, BR, TR, TL), 4-5: tip (bottom, top)
  const indices = [
    // back face
    0, 1, 2,  0, 2, 3,
    // bottom face
    0, 4, 1,
    // top/slope face
    3, 2, 5,
    // left face
    0, 3, 5,  0, 5, 4,
    // right face
    1, 4, 5,  1, 5, 2,
    // bottom left triangle
    // (already covered by bottom face triangle)
  ];

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ---- Main geometry factory ----

/**
 * Returns a cached THREE.BufferGeometry for the given piece type.
 * Includes cylindrical studs on top (except dome/bicep pieces).
 * Origin is at the center of the bottom face.
 * @param {string} type - one of BRICK_TYPES
 * @returns {THREE.BufferGeometry}
 */
export function getGeometry(type) {
  if (!BRICK_TYPES.includes(type)) {
    throw new Error(`Unknown brick type: "${type}". Valid types: ${BRICK_TYPES.join(', ')}`);
  }

  if (_cache.has(type)) return _cache.get(type);

  const [cols, rows] = DIMS[type];
  const isPlate = type.startsWith('plate');
  const isSlope = type.startsWith('slope');
  const isCustom = _CUSTOM_BODY_TYPES.has(type);
  const height = isPlate ? PLATE_HEIGHT : BRICK_HEIGHT;

  const GAP = 0.2;
  const w = cols * STUD_SIZE - GAP;
  const d = rows * STUD_SIZE - GAP;

  // Pieces with no studs — dome/bicep tops replace studs
  const noStuds = type === 'bicep-2x2' || type === 'deltoid-2x2';

  // Build body
  let body;
  if (isSlope) {
    body = _buildSlopeBody(w, d, height);
  } else if (type === 'round-1x1' || type === 'round-2x2' || type === 'plate-round-1x1') {
    body = _buildCylinderBody(w, d, height);
  } else if (type === 'curve-2x2') {
    body = _buildQuarterCylinder(w, d, height);
  } else if (type === 'wedge-2x2-corner') {
    body = _buildWedgeCorner(w, d, height);
  } else if (type === 'fist-2x2') {
    body = _buildFist(w, d, height);
  } else if (type === 'bicep-2x2') {
    body = _buildBicep(w, d, height);
  } else if (type === 'deltoid-2x2') {
    body = _buildDeltoid(w, d, height);
  } else if (type === 'trapezoid-2x1') {
    body = _buildTrapezoid(w, d, height);
  } else if (type === 'nose-1x1') {
    body = _buildNose(w, d, height);
  } else {
    // Standard box — translated so bottom face is at y=0
    body = new THREE.BoxGeometry(w, height, d);
    body.translate(0, height / 2, 0);
  }

  // Dome/bicep pieces already return merged geometry with no studs
  if (noStuds) {
    _cache.set(type, body);
    return body;
  }

  // Pre-merged custom pieces (fist) already include their sub-parts
  // but still need studs added
  const parts = [body];
  const studTemplate = _buildStudTemplate();

  if (isSlope) {
    // Slopes: studs only on the raised front row (rz = 0)
    for (let cx = 0; cx < cols; cx++) {
      const stud = studTemplate.clone();
      const sx = (cx - (cols - 1) / 2) * STUD_SIZE;
      const sz = -(rows - 1) / 2 * STUD_SIZE;
      stud.translate(sx, height + STUD_HEIGHT / 2, sz);
      parts.push(stud);
    }
  } else if (type === 'trapezoid-2x1') {
    // Trapezoid: single center stud on the narrow top
    const stud = studTemplate.clone();
    stud.translate(0, height + STUD_HEIGHT / 2, 0);
    parts.push(stud);
  } else if (type === 'nose-1x1') {
    // Nose: single stud at the back (z=+)
    const stud = studTemplate.clone();
    stud.translate(0, height + STUD_HEIGHT / 2, (rows - 1) / 2 * STUD_SIZE);
    parts.push(stud);
  } else if (type === 'wedge-2x2-corner') {
    // Wedge corner: studs on the 3 cells the triangle covers (skip +X,+Z corner)
    for (let cx = 0; cx < cols; cx++) {
      for (let rz = 0; rz < rows; rz++) {
        if (cx === cols - 1 && rz === rows - 1) continue; // skip cut corner
        const stud = studTemplate.clone();
        const sx = (cx - (cols - 1) / 2) * STUD_SIZE;
        const sz = (rz - (rows - 1) / 2) * STUD_SIZE;
        stud.translate(sx, height + STUD_HEIGHT / 2, sz);
        parts.push(stud);
      }
    }
  } else if (type === 'curve-2x2') {
    // Quarter cylinder: studs on the 3 cells covered by the arc
    // The arc center is at (-hw, cz=+hd), so cell (0,0) and (0,1) and (1,0) are under the arc
    for (let cx = 0; cx < cols; cx++) {
      for (let rz = 0; rz < rows; rz++) {
        if (cx === cols - 1 && rz === rows - 1) continue; // outside the arc
        const stud = studTemplate.clone();
        const sx = (cx - (cols - 1) / 2) * STUD_SIZE;
        const sz = (rz - (rows - 1) / 2) * STUD_SIZE;
        stud.translate(sx, height + STUD_HEIGHT / 2, sz);
        parts.push(stud);
      }
    }
  } else {
    // Standard grid: studs on all cells (bricks, plates, round pieces)
    for (let cx = 0; cx < cols; cx++) {
      for (let rz = 0; rz < rows; rz++) {
        const stud = studTemplate.clone();
        const sx = (cx - (cols - 1) / 2) * STUD_SIZE;
        const sz = (rz - (rows - 1) / 2) * STUD_SIZE;
        stud.translate(sx, height + STUD_HEIGHT / 2, sz);
        parts.push(stud);
      }
    }
  }

  // Strip UVs for any type with a custom body (no UVs) to match stud cylinders
  if (isCustom) {
    for (const p of parts) p.deleteAttribute('uv');
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
