import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STUD_SIZE } from './grid.js';

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
  // Render a subtle dot grid at y=0 using Points geometry
  // Dots at every stud intersection within the baseplate bounds
  const halfX = Math.floor(BASEPLATE_STUDS_X / 2);
  const halfZ = Math.floor(BASEPLATE_STUDS_Z / 2);

  const positions = [];
  for (let x = -halfX; x <= halfX; x++) {
    for (let z = -halfZ; z <= halfZ; z++) {
      positions.push(x * STUD_SIZE, 0.5, z * STUD_SIZE);  // y=0.5 floats above baseplate
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x2e7d32,  // darker green — subtle against baseplate
    size: 1.5,
    sizeAttenuation: true,
  });

  const grid = new THREE.Points(geometry, material);
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
