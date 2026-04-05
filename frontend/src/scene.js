import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { STUD_SIZE } from './grid.js';
import gsap from 'gsap';

let renderer, scene, camera, controls;

const BASEPLATE_STUDS_X = 32;  // 32 studs wide
const BASEPLATE_STUDS_Z = 32;  // 32 studs deep
const BASEPLATE_THICKNESS = 3.2;

/**
 * Initialize the Three.js scene, attach renderer to the given canvas element.
 * Starts the render loop.
 */
export function initScene(canvasEl) {
  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  scene.fog = new THREE.Fog(0x1a1a2e, 200, 600);

  // Camera
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(80, 80, 120);
  camera.lookAt(0, 0, 0);

  // OrbitControls — import from three/addons/ (not three/examples/ — changed in r151)
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 20;
  controls.maxDistance = 400;
  controls.maxPolarAngle = Math.PI / 2 - 0.05; // don't go below ground

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(60, 120, 80);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 500;
  dirLight.shadow.camera.left = -150;
  dirLight.shadow.camera.right = 150;
  dirLight.shadow.camera.top = 150;
  dirLight.shadow.camera.bottom = -150;
  scene.add(dirLight);

  // Baseplate
  _addBaseplate();

  // Stud grid (SCENE-03)
  _addStudGrid();

  // Resize handler
  window.addEventListener('resize', _onResize);

  // Render loop
  _animate();
}

function _addBaseplate() {
  const w = BASEPLATE_STUDS_X * STUD_SIZE;
  const d = BASEPLATE_STUDS_Z * STUD_SIZE;
  const geometry = new THREE.BoxGeometry(w, BASEPLATE_THICKNESS, d);
  const material = new THREE.MeshStandardMaterial({
    color: 0x4caf50,  // classic green baseplate
    roughness: 0.8,
    metalness: 0.0,
  });
  const baseplate = new THREE.Mesh(geometry, material);
  baseplate.position.set(0, -BASEPLATE_THICKNESS / 2, 0);
  baseplate.receiveShadow = true;
  baseplate.name = 'baseplate';
  scene.add(baseplate);
}

function _addStudGrid() {
  // Render cylindrical studs on the baseplate surface (like real Lego baseplates)
  const halfX = Math.floor(BASEPLATE_STUDS_X / 2);
  const halfZ = Math.floor(BASEPLATE_STUDS_Z / 2);

  const STUD_RADIUS = 2.4;
  const STUD_HEIGHT = 1.2;
  const studTemplate = new THREE.CylinderGeometry(STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 10);

  const parts = [];
  for (let x = 0; x < BASEPLATE_STUDS_X; x++) {
    for (let z = 0; z < BASEPLATE_STUDS_Z; z++) {
      const stud = studTemplate.clone();
      // Center 32 studs within the baseplate: positions from -124 to +124mm
      const sx = (x - (BASEPLATE_STUDS_X - 1) / 2) * STUD_SIZE;
      const sz = (z - (BASEPLATE_STUDS_Z - 1) / 2) * STUD_SIZE;
      stud.translate(sx, STUD_HEIGHT / 2, sz);
      parts.push(stud);
    }
  }

  // Merge all into one geometry for performance (single draw call)
  const merged = mergeGeometries(parts);
  studTemplate.dispose();
  for (const p of parts) p.dispose();

  const material = new THREE.MeshStandardMaterial({
    color: 0x43a047,  // slightly different green from baseplate for definition
    roughness: 0.7,
    metalness: 0.0,
  });

  const grid = new THREE.Mesh(merged, material);
  grid.receiveShadow = true;
  grid.name = 'studGrid';
  scene.add(grid);
}

function _onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function _animate() {
  requestAnimationFrame(_animate);
  controls.update();  // required for damping
  renderer.render(scene, camera);
}

export function getScene() { return scene; }
export function getCamera() { return camera; }
export function getRenderer() { return renderer; }
export function getControls() { return controls; }

/**
 * Smoothly tween camera to focus on a target world position.
 * Uses GSAP to animate both camera.position and controls.target simultaneously.
 * CRITICAL: calls controls.update() in onUpdate to prevent snap-back bug.
 * @param {number} targetX - world X coordinate to focus on
 * @param {number} targetY - world Y coordinate to focus on
 * @param {number} targetZ - world Z coordinate to focus on
 * @param {number} distance - camera distance from target (computed by zoom-to-fit)
 * @param {number} [duration=0.8] - tween duration in seconds
 */
export function focusCamera(targetX, targetY, targetZ, distance, duration = 0.8) {
  // Compute new camera position: keep camera above and slightly to the side of target
  const elevationAngle = Math.PI / 4;  // 45 degrees above
  const azimuthAngle = Math.PI / 6;    // 30 degrees to the right
  const newCamX = targetX + distance * Math.sin(azimuthAngle) * Math.cos(elevationAngle);
  const newCamY = targetY + distance * Math.sin(elevationAngle);
  const newCamZ = targetZ + distance * Math.cos(azimuthAngle) * Math.cos(elevationAngle);

  gsap.to(camera.position, {
    x: newCamX,
    y: newCamY,
    z: newCamZ,
    duration,
    ease: 'power2.inOut',
    onUpdate: () => controls.update(),  // CRITICAL: prevents OrbitControls snap-back
  });

  gsap.to(controls.target, {
    x: targetX,
    y: targetY,
    z: targetZ,
    duration,
    ease: 'power2.inOut',
  });
}

/**
 * Reset camera to the default overview position.
 */
export function resetCamera() {
  gsap.to(camera.position, {
    x: 80, y: 80, z: 120,
    duration: 0.6,
    ease: 'power2.inOut',
    onUpdate: () => controls.update(),
  });
  gsap.to(controls.target, {
    x: 0, y: 0, z: 0,
    duration: 0.6,
    ease: 'power2.inOut',
  });
}
