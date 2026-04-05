import * as THREE from 'three';
import { getGeometry } from './geometry.js';
import { gridToWorld } from './grid.js';

let _onSetSelected = null;

/**
 * Derive star rating (1-3) from piece count.
 * 1 star: <= 25 pieces, 2 stars: <= 60 pieces, 3 stars: > 60 pieces
 * @param {number} pieceCount
 * @returns {string} filled star characters
 */
function _starsForPieceCount(pieceCount) {
  let count;
  if (pieceCount <= 25) count = 1;
  else if (pieceCount <= 60) count = 2;
  else count = 3;
  return '\u2605'.repeat(count);
}

/**
 * Render a 3D thumbnail of the completed set model into the given canvas element.
 * Renders all pieces from all steps, then disposes the renderer and replaces canvas with img.
 * @param {string} setId
 * @param {HTMLCanvasElement} canvasEl
 */
async function _renderThumbnail(setId, canvasEl) {
  let setData;
  try {
    const res = await fetch('/api/sets/' + setId);
    if (!res.ok) return;
    setData = await res.json();
  } catch (err) {
    console.warn('Thumbnail fetch failed for', setId, err);
    return;
  }

  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
  renderer.setSize(120, 90);

  const thumbScene = new THREE.Scene();
  thumbScene.background = new THREE.Color(0x1a1a2e);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  thumbScene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(40, 60, 50);
  thumbScene.add(dirLight);

  const thumbCamera = new THREE.PerspectiveCamera(45, 120 / 90, 0.1, 500);

  // Build all pieces across all steps
  const meshes = [];
  if (setData.steps) {
    for (const step of setData.steps) {
      if (!step.pieces) continue;
      for (const piece of step.pieces) {
        let geometry;
        try {
          geometry = getGeometry(piece.type);
        } catch (e) {
          continue;
        }
        const material = new THREE.MeshStandardMaterial({
          color: piece.color,
          roughness: 0.6,
          metalness: 0.1,
        });
        const mesh = new THREE.Mesh(geometry, material);
        const pos = gridToWorld(piece.gridX, piece.gridZ, piece.layer, piece.type);
        mesh.position.copy(pos);
        mesh.rotation.y = THREE.MathUtils.degToRad(piece.rotation || 0);
        thumbScene.add(mesh);
        meshes.push(mesh);
      }
    }
  }

  // Compute bounding box to frame camera
  if (meshes.length > 0) {
    const box = new THREE.Box3();
    for (const mesh of meshes) {
      box.expandByObject(mesh);
    }
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const fovRad = THREE.MathUtils.degToRad(45);
    const distance = (maxDim / Math.tan(fovRad / 2)) * 1.5;
    // Position camera above and in front of the model center
    thumbCamera.position.set(
      center.x + distance * 0.5,
      center.y + distance * 0.6,
      center.z + distance * 0.8
    );
    thumbCamera.lookAt(center);
  } else {
    thumbCamera.position.set(40, 40, 60);
    thumbCamera.lookAt(0, 0, 0);
  }

  thumbCamera.updateProjectionMatrix();
  renderer.render(thumbScene, thumbCamera);

  // Capture to image and replace canvas to free WebGL context
  try {
    const dataURL = canvasEl.toDataURL();
    const img = document.createElement('img');
    img.src = dataURL;
    img.className = 'set-card-thumb';
    img.alt = setData.name || setId;
    canvasEl.parentNode.replaceChild(img, canvasEl);
  } catch (e) {
    // If toDataURL fails (e.g., cross-origin), just leave the canvas
  }

  // Dispose all materials and renderer
  for (const mesh of meshes) {
    mesh.material.dispose();
  }
  renderer.dispose();
}

/**
 * Initialize the selection screen. Fetches /api/sets and renders set cards.
 * @param {Function} onSetSelected - callback called with full set data when user picks a set
 */
export async function initSelection(onSetSelected) {
  _onSetSelected = onSetSelected;

  const setList = document.getElementById('set-list');
  if (!setList) return;

  let sets;
  try {
    const res = await fetch('/api/sets');
    if (!res.ok) throw new Error(`Failed to load sets: ${res.status}`);
    sets = await res.json();
  } catch (err) {
    console.error('Failed to load set list:', err);
    setList.innerHTML = '<div style="color:#e8eaf6;font-family:system-ui;">Error loading sets. Is the server running?</div>';
    return;
  }

  // Render cards sequentially so thumbnails don't exhaust WebGL context limit
  for (const setMeta of sets) {
    const card = _createCard(setMeta);
    setList.appendChild(card);
  }

  // Render thumbnails sequentially (T-03-02 mitigation: one renderer at a time)
  const thumbCanvases = setList.querySelectorAll('canvas.set-card-thumb');
  for (let i = 0; i < sets.length; i++) {
    const canvasEl = thumbCanvases[i];
    if (canvasEl) {
      await _renderThumbnail(sets[i].id, canvasEl);
    }
  }
}

/**
 * Create a set card DOM element.
 * @param {{ id: string, name: string, description: string, pieceCount: number }} setMeta
 * @returns {HTMLDivElement}
 */
function _createCard(setMeta) {
  const card = document.createElement('div');
  card.className = 'set-card';
  card.setAttribute('data-set-id', setMeta.id);

  // Thumbnail canvas (will be replaced with img after rendering)
  const thumb = document.createElement('canvas');
  thumb.className = 'set-card-thumb';
  thumb.width = 120;
  thumb.height = 90;

  // Info section
  const info = document.createElement('div');
  info.className = 'set-card-info';

  const name = document.createElement('div');
  name.className = 'set-card-name';
  name.textContent = setMeta.name;

  const desc = document.createElement('div');
  desc.className = 'set-card-desc';
  desc.textContent = setMeta.description || '';

  const meta = document.createElement('div');
  meta.className = 'set-card-meta';

  const pieces = document.createElement('span');
  pieces.textContent = setMeta.pieceCount + ' pieces';

  const stars = document.createElement('span');
  stars.className = 'set-card-stars';
  stars.textContent = _starsForPieceCount(setMeta.pieceCount);

  meta.appendChild(pieces);
  meta.appendChild(stars);

  info.appendChild(name);
  info.appendChild(desc);
  info.appendChild(meta);

  card.appendChild(thumb);
  card.appendChild(info);

  // Click handler: fetch full set data and call onSetSelected
  card.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/sets/' + setMeta.id);
      if (!res.ok) throw new Error(`Failed to load set: ${res.status}`);
      const fullSetData = await res.json();
      if (_onSetSelected) _onSetSelected(fullSetData);
    } catch (err) {
      console.error('Error loading set:', setMeta.id, err);
    }
  });

  return card;
}

/**
 * Show the selection screen (remove .hidden class) and hide back button.
 */
export function showSelectionScreen() {
  const screen = document.getElementById('selection-screen');
  if (screen) screen.classList.remove('hidden');

  const backBtn = document.getElementById('back-btn');
  if (backBtn) backBtn.style.display = 'none';

  // Disable tray pointer-events during selection
  const tray = document.getElementById('tray');
  if (tray) tray.style.pointerEvents = 'none';
}

/**
 * Hide the selection screen (add .hidden class) and show back button.
 */
export function hideSelectionScreen() {
  const screen = document.getElementById('selection-screen');
  if (screen) screen.classList.add('hidden');

  const backBtn = document.getElementById('back-btn');
  if (backBtn) backBtn.style.display = 'block';

  // Restore tray pointer-events
  const tray = document.getElementById('tray');
  if (tray) tray.style.pointerEvents = '';
}
