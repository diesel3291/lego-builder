import * as THREE from 'three';
import { getCurrentStep, holdPiece, getHeldPieceId, getPlacedThisStep } from './state.js';
import { showStepGhosts } from './ghost.js';
import { getGeometry } from './geometry.js';
import { getEnvironment } from './scene.js';

let _trayItemsEl = null;

// Cache rendered piece thumbnails by "type|color" key → dataURL
const _thumbCache = new Map();

// Reusable offscreen renderer for thumbnails — avoids WebGL context exhaustion
let _thumbRenderer = null;
let _thumbCanvas = null;

/**
 * Initialize the tray module. Finds the .tray-items DOM element.
 */
export function initTray() {
  _trayItemsEl = document.querySelector('.tray-items');
}

/**
 * Get or create the shared offscreen thumbnail renderer.
 * Reuses a single WebGL context to avoid context exhaustion (Chrome limit ~16).
 */
function _getThumbRenderer(size) {
  if (!_thumbCanvas) {
    _thumbCanvas = document.createElement('canvas');
  }
  _thumbCanvas.width = size;
  _thumbCanvas.height = size;

  if (!_thumbRenderer) {
    _thumbRenderer = new THREE.WebGLRenderer({ canvas: _thumbCanvas, antialias: true, alpha: true });
  }
  _thumbRenderer.setSize(size, size);
  _thumbRenderer.setClearColor(0x000000, 0);
  return _thumbRenderer;
}

/**
 * Render a 3D thumbnail of a single piece and return a dataURL.
 * Reuses a single shared WebGLRenderer to avoid WebGL context exhaustion.
 */
function _renderPieceThumb(type, color, size) {
  const key = `${type}|${color}|${size}`;
  if (_thumbCache.has(key)) return _thumbCache.get(key);

  const renderer = _getThumbRenderer(size);

  const thumbScene = new THREE.Scene();

  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  thumbScene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(20, 30, 25);
  thumbScene.add(dir);

  const geometry = getGeometry(type);
  const material = new THREE.MeshPhysicalMaterial({
    color: color,
    roughness: 0.3,
    metalness: 0.0,
    clearcoat: 0.6,
    clearcoatRoughness: 0.15,
    envMap: getEnvironment(),
    envMapIntensity: 0.8,
  });
  const mesh = new THREE.Mesh(geometry, material);
  thumbScene.add(mesh);

  // Frame the piece: compute bounding box and position camera
  const box = new THREE.Box3().setFromObject(mesh);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const bSize = new THREE.Vector3();
  box.getSize(bSize);
  const maxDim = Math.max(bSize.x, bSize.y, bSize.z);
  const fovRad = THREE.MathUtils.degToRad(40);
  const dist = (maxDim / Math.tan(fovRad / 2)) * 1.2;

  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 500);
  cam.position.set(
    center.x + dist * 0.5,
    center.y + dist * 0.6,
    center.z + dist * 0.7
  );
  cam.lookAt(center);
  cam.updateProjectionMatrix();

  renderer.render(thumbScene, cam);

  const dataURL = _thumbCanvas.toDataURL();
  material.dispose();

  _thumbCache.set(key, dataURL);
  return dataURL;
}

/**
 * Derive an "NxM" footprint label string for a piece type.
 * Returns a string like "2×4" / "1×1", or empty string if no match.
 */
function _footprintLabel(type) {
  if (!type) return '';
  // Match a NxM pattern in the type segments (e.g. brick-2x4, plate-2x3, slope-2x2)
  const m = type.match(/(\d+)x(\d+)/);
  if (m) {
    return `${m[1]}×${m[2]}`;
  }
  return '';
}

/**
 * Render the piece tray for the current step.
 * Each piece shows a 3D thumbnail preview and type label.
 */
export function renderTray() {
  if (!_trayItemsEl) return;
  _trayItemsEl.innerHTML = '';

  const step = getCurrentStep();
  if (!step) return;

  const placedThisStep = getPlacedThisStep();
  const heldPieceId = getHeldPieceId();

  for (const piece of step.pieces) {
    if (placedThisStep.has(piece.id)) continue;

    const item = document.createElement('div');
    item.className = 'tray-item';
    item.dataset.pieceId = piece.id;
    item.title = piece.type;

    // 3D thumbnail image
    const thumbURL = _renderPieceThumb(piece.type, piece.color, 128);
    const img = document.createElement('img');
    img.src = thumbURL;
    img.alt = piece.type;
    img.className = 'tray-piece-img';

    const label = document.createElement('div');
    label.className = 'tray-item-label';
    label.textContent = _formatType(piece.type);

    if (heldPieceId === piece.id) {
      item.classList.add('selected');
      _updateActivePiece(piece);
    }

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      holdPiece(piece.id);
      _updateActivePiece(piece);
      const currentStep = getCurrentStep();
      if (currentStep) showStepGhosts(currentStep);
      renderTray();
    });

    item.appendChild(img);
    item.appendChild(label);

    // Footprint label (e.g. "2×4")
    const fp = _footprintLabel(piece.type);
    if (fp) {
      const fpEl = document.createElement('div');
      fpEl.className = 'tray-footprint';
      fpEl.textContent = fp;
      item.appendChild(fpEl);
    }

    _trayItemsEl.appendChild(item);
  }

  if (!heldPieceId) {
    _clearActivePiece();
  }
}

/**
 * Update the active piece display in the left panel with a 3D preview.
 */
function _updateActivePiece(piece) {
  const previewEl = document.querySelector('.active-piece-preview');
  const name = document.getElementById('active-piece-name');
  const desc = document.getElementById('active-piece-desc');

  if (previewEl) {
    previewEl.innerHTML = '';
    const thumbURL = _renderPieceThumb(piece.type, piece.color, 200);
    const img = document.createElement('img');
    img.src = thumbURL;
    img.alt = piece.type;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    previewEl.appendChild(img);
  }
  if (name) name.textContent = _formatType(piece.type);
  if (desc) desc.textContent = piece.color;
}

/**
 * Clear the active piece display.
 */
function _clearActivePiece() {
  const previewEl = document.querySelector('.active-piece-preview');
  const name = document.getElementById('active-piece-name');
  const desc = document.getElementById('active-piece-desc');
  if (previewEl) {
    previewEl.innerHTML = '';
    const placeholder = document.createElement('div');
    placeholder.className = 'active-piece-swatch';
    placeholder.style.backgroundColor = '#e0e0e0';
    previewEl.appendChild(placeholder);
  }
  if (name) name.textContent = 'Select a piece';
  if (desc) desc.textContent = '';
}

/**
 * Format piece type for display (e.g., "brick-2x4" -> "2x4 Brick").
 */
function _formatType(type) {
  if (!type) return '';
  const parts = type.split('-');
  if (parts.length >= 2) {
    const kind = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    const size = parts.slice(1).join('-');
    return size + ' ' + kind;
  }
  return type;
}
