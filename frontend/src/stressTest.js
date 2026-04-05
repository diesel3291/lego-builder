import * as THREE from 'three';
import { getScene } from './scene.js';
import { getGeometry, BRICK_TYPES } from './geometry.js';
import { gridToWorld } from './grid.js';

const COLORS = ['#e3000b', '#006db7', '#f5c518', '#4caf50', '#ffffff'];
const BRICK_ONLY_TYPES = BRICK_TYPES.filter(t => !t.startsWith('slope'));

/**
 * Add 100 bricks in a 10x10 grid. Measures frame rate over 60 frames.
 * Logs pass/fail to console. Removes bricks after measurement.
 */
export function runStressTest() {
  const scene = getScene();
  const meshes = [];

  for (let i = 0; i < 100; i++) {
    const col = i % 10;
    const row = Math.floor(i / 10);
    const type = BRICK_ONLY_TYPES[i % BRICK_ONLY_TYPES.length];
    const color = COLORS[i % COLORS.length];

    const geometry = getGeometry(type);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      metalness: 0.0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const pos = gridToWorld(col * 3, row * 3, 0, type);
    mesh.position.copy(pos);
    scene.add(mesh);
    meshes.push(mesh);
  }

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

    // Clean up stress test meshes
    for (const mesh of meshes) {
      scene.remove(mesh);
      mesh.material.dispose();
    }
  }

  requestAnimationFrame(measure);
}

// Removed auto-run — main.js calls runStressTest() after initScene()
