import * as THREE from 'three';
import { getGeometry } from './geometry.js';
import { gridToWorld } from './grid.js';
import { getCompletedBuilds, setTotalSetCount, clearCompletedBuilds } from './completion.js';
import { loadProgress, clearProgress } from './state.js';

let _onSetSelected = null;
let _cachedSets = null;

/**
 * Derive star rating (1-3) from piece count.
 * @param {number} pieceCount
 * @returns {{ stars: string, label: string }}
 */
function _starsForPieceCount(pieceCount) {
  if (pieceCount <= 25) return { stars: '\u2605', label: 'Simple' };
  if (pieceCount <= 60) return { stars: '\u2605\u2605', label: 'Medium' };
  return { stars: '\u2605\u2605\u2605', label: 'Hard' };
}

/**
 * Render a 3D thumbnail of the completed set model into the given canvas element.
 * Renders all pieces from all steps, then disposes the renderer and replaces canvas with img.
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

  const width = canvasEl.width || 320;
  const height = canvasEl.height || 240;

  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
  renderer.setSize(width, height);

  const thumbScene = new THREE.Scene();
  thumbScene.background = new THREE.Color(0xe8e8ec);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  thumbScene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(40, 60, 50);
  thumbScene.add(dirLight);

  const thumbCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);

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
        const material = new THREE.MeshPhysicalMaterial({
          color: piece.color,
          roughness: 0.3,
          metalness: 0.0,
          clearcoat: 0.6,
          clearcoatRoughness: 0.15,
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
    thumbCamera.far = distance * 3;
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

  try {
    const dataURL = canvasEl.toDataURL();
    const img = document.createElement('img');
    img.src = dataURL;
    img.alt = setData.name || setId;
    canvasEl.parentNode.replaceChild(img, canvasEl);
  } catch (e) {
    // If toDataURL fails, leave the canvas
  }

  for (const mesh of meshes) {
    mesh.material.dispose();
  }
  // Explicitly lose WebGL context before disposal to prevent context exhaustion
  const gl = renderer.getContext();
  const ext = gl.getExtension('WEBGL_lose_context');
  if (ext) ext.loseContext();
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
    setList.innerHTML = '<div style="color:#1a1a1a;padding:20px;">Error loading sets. Is the server running?</div>';
    return;
  }

  _cachedSets = sets;
  setTotalSetCount(sets.length);

  // Wire up reset button
  const resetBtn = document.getElementById('reset-progress-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (!confirm('Reset all puzzle progress? Completion badges and best times will be cleared.')) return;
      clearCompletedBuilds();
      clearProgress();
      showSelectionScreen(); // refresh cards
    });
  }

  const bossList = document.getElementById('boss-list');
  const bossSection = document.getElementById('boss-section');

  const regularSets = sets.filter(s => s.category !== 'boss');
  const bossSets = sets.filter(s => s.category === 'boss')
    .sort((a, b) => a.pieceCount - b.pieceCount); // easier boss first, bodybuilder last

  for (const setMeta of regularSets) {
    setList.appendChild(_createCard(setMeta));
  }
  if (bossList) {
    for (const setMeta of bossSets) {
      bossList.appendChild(_createCard(setMeta));
    }
  }
  if (bossSection) {
    bossSection.style.display = bossSets.length > 0 ? '' : 'none';
  }

  // Render thumbnails sequentially (one WebGL renderer at a time)
  const allCanvases = document.querySelectorAll('#set-list canvas.set-card-thumb, #boss-list canvas.set-card-thumb');
  const allSets = [...regularSets, ...bossSets];
  for (let i = 0; i < allSets.length; i++) {
    const canvasEl = allCanvases[i];
    if (canvasEl) {
      await _renderThumbnail(allSets[i].id, canvasEl);
    }
  }
}

/**
 * Create a set card DOM element matching the UI/UX design.
 */
function _createCard(setMeta) {
  const card = document.createElement('div');
  card.className = 'set-card';
  card.setAttribute('data-set-id', setMeta.id);

  // Check completion status
  const completed = getCompletedBuilds();
  const completion = completed[setMeta.id];

  // Thumbnail wrapper
  const thumbWrap = document.createElement('div');
  thumbWrap.className = 'set-card-thumb-wrap';
  const thumb = document.createElement('canvas');
  thumb.className = 'set-card-thumb';
  thumb.width = 320;
  thumb.height = 240;
  thumbWrap.appendChild(thumb);

  if (completion) {
    const badge = document.createElement('div');
    badge.className = 'set-card-badge';
    badge.textContent = '\u2713';
    thumbWrap.appendChild(badge);
  }

  // Body
  const body = document.createElement('div');
  body.className = 'set-card-body';

  const name = document.createElement('div');
  name.className = 'set-card-name';
  name.textContent = setMeta.name;

  const meta = document.createElement('div');
  meta.className = 'set-card-meta';

  const { stars, label } = _starsForPieceCount(setMeta.pieceCount);
  const starsSpan = document.createElement('span');
  starsSpan.className = 'set-card-stars';
  starsSpan.textContent = stars;

  const diffSpan = document.createElement('span');
  diffSpan.className = 'set-card-difficulty';
  diffSpan.textContent = ' \u00B7 ' + label;

  meta.appendChild(starsSpan);
  meta.appendChild(diffSpan);

  if (completion) {
    const bestSpan = document.createElement('span');
    bestSpan.className = 'set-card-difficulty';
    const totalSec = Math.floor(completion.bestTime / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    bestSpan.textContent = ' \u00B7 Best: ' + (m > 0 ? m + 'm ' + s + 's' : s + 's');
    meta.appendChild(bestSpan);
  }

  // Build button — show CONTINUE if there's saved progress for this set
  const btnWrap = document.createElement('div');
  btnWrap.className = 'set-card-btn';
  const btn = document.createElement('button');
  const save = loadProgress();
  const hasSave = save && save.setId === setMeta.id && save.placedIds.length > 0;
  btn.textContent = hasSave ? 'CONTINUE' : (completion ? 'REBUILD' : 'BUILD');
  btnWrap.appendChild(btn);

  body.appendChild(name);
  body.appendChild(meta);
  body.appendChild(btnWrap);

  card.appendChild(thumbWrap);
  card.appendChild(body);

  // Click handler
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
 * Show the selection screen and hide build UI.
 */
export function showSelectionScreen() {
  const screen = document.getElementById('selection-screen');
  if (screen) screen.classList.remove('hidden');

  // Refresh cards to pick up new completion badges
  if (_cachedSets) {
    const setList = document.getElementById('set-list');
    const bossList = document.getElementById('boss-list');
    const bossSection = document.getElementById('boss-section');

    const regularSets = _cachedSets.filter(s => s.category !== 'boss');
    const bossSets = _cachedSets.filter(s => s.category === 'boss')
      .sort((a, b) => a.pieceCount - b.pieceCount);

    if (setList) {
      setList.innerHTML = '';
      for (const setMeta of regularSets) {
        setList.appendChild(_createCard(setMeta));
      }
    }
    if (bossList) {
      bossList.innerHTML = '';
      for (const setMeta of bossSets) {
        bossList.appendChild(_createCard(setMeta));
      }
    }
    if (bossSection) {
      bossSection.style.display = bossSets.length > 0 ? '' : 'none';
    }

    // Re-render thumbnails
    const allCanvases = document.querySelectorAll('#set-list canvas.set-card-thumb, #boss-list canvas.set-card-thumb');
    const allSets = [...regularSets, ...bossSets];
    for (let i = 0; i < allSets.length; i++) {
      const canvasEl = allCanvases[i];
      if (canvasEl) _renderThumbnail(allSets[i].id, canvasEl);
    }
  }

  // Hide build UI elements
  _setBuildUIVisible(false);
}

/**
 * Hide the selection screen and show build UI.
 */
export function hideSelectionScreen() {
  const screen = document.getElementById('selection-screen');
  if (screen) screen.classList.add('hidden');

  // Show build UI elements
  _setBuildUIVisible(true);
}

/**
 * Toggle visibility of all build UI panels.
 */
function _setBuildUIVisible(visible) {
  const display = visible ? 'flex' : 'none';
  const els = ['top-bar', 'tray-panel', 'hud', 'bottom-bar'];
  for (const id of els) {
    const el = document.getElementById(id);
    if (el) el.style.display = display;
  }
}
