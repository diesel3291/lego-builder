import * as THREE from 'three';
import { getScene } from './scene.js';
import { getGeometry, BRICK_TYPES } from './geometry.js';
import { gridToWorld, DIMS } from './grid.js';

// No green — reserved for baseplate
const COLORS = ['#e3000b', '#006db7', '#f5c518', '#ffffff', '#ff6f00', '#9e9e9e'];
const BRICK_ONLY_TYPES = BRICK_TYPES.filter(t => !t.startsWith('slope'));

const BASEPLATE_HALF = 16; // baseplate spans -16 to +15 studs

/**
 * Check if a brick at (gx, gz) with given dims fits on the baseplate
 * and doesn't overlap any occupied cells.
 */
function canPlace(gx, gz, cols, rows, occupied) {
  for (let cx = 0; cx < cols; cx++) {
    for (let rz = 0; rz < rows; rz++) {
      const sx = gx + cx;
      const sz = gz + rz;
      if (sx < -BASEPLATE_HALF || sx > BASEPLATE_HALF - 1) return false;
      if (sz < -BASEPLATE_HALF || sz > BASEPLATE_HALF - 1) return false;
      if (occupied.has(`${sx},${sz}`)) return false;
    }
  }
  return true;
}

function markOccupied(gx, gz, cols, rows, occupied) {
  for (let cx = 0; cx < cols; cx++) {
    for (let rz = 0; rz < rows; rz++) {
      occupied.add(`${gx + cx},${gz + rz}`);
    }
  }
}

/**
 * Place 100 bricks on the baseplate with no overlaps and within bounds.
 * Uses a scanning placement strategy.
 */
export function runStressTest() {
  const scene = getScene();
  const meshes = [];
  const occupied = new Set();

  let placed = 0;
  let gx = -BASEPLATE_HALF;
  let gz = -BASEPLATE_HALF;

  while (placed < 100 && gz <= BASEPLATE_HALF - 1) {
    const type = BRICK_ONLY_TYPES[placed % BRICK_ONLY_TYPES.length];
    const [cols, rows] = DIMS[type];
    const color = COLORS[placed % COLORS.length];

    if (canPlace(gx, gz, cols, rows, occupied)) {
      markOccupied(gx, gz, cols, rows, occupied);

      const geometry = getGeometry(type);
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.5,
        metalness: 0.0,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const pos = gridToWorld(gx, gz, 0, type);
      mesh.position.copy(pos);
      scene.add(mesh);
      meshes.push(mesh);

      gx += cols; // advance past this brick
      placed++;
    } else {
      gx++; // try next column
    }

    // Wrap to next row when past the edge
    if (gx > BASEPLATE_HALF - 1) {
      gx = -BASEPLATE_HALF;
      gz++;
    }
  }

  console.log(`[StressTest] Placed ${placed} bricks`);

  // Measure FPS over 60 frames
  let frameCount = 0;
  const start = performance.now();

  function measure() {
    frameCount++;
    if (frameCount < 60) {
      requestAnimationFrame(measure);
      return;
    }
    const elapsed = (performance.now() - start) / 1000;
    const fps = Math.round(frameCount / elapsed);
    if (fps >= 30) {
      console.log(`[StressTest] PASS — ${fps} fps at 100 bricks`);
    } else {
      console.warn(`[StressTest] FAIL — ${fps} fps at 100 bricks (target: 30+). Consider InstancedMesh.`);
    }

    // Keep bricks visible for visual verification
  }

  requestAnimationFrame(measure);
}

// Removed auto-run — main.js calls runStressTest() after initScene()
