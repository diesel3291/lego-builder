import * as THREE from 'three';
import { getGeometry } from './geometry.js';
import { gridToWorld } from './grid.js';
import { getCompletedBuilds, setTotalSetCount, clearCompletedBuilds } from './completion.js';
import { loadProgress, clearProgress } from './state.js';

let _onSetSelected = null;
let _cachedSets = null;
let _activeFilter = 'all';
let _bossModalPopulated = false;

// Fruit/snack ID maps for category derivation (no JSON changes)
const FRUIT_IDS = ['orange', 'apple', 'peach', 'pineapple'];
const SNACK_IDS = ['juicebox', 'hot-dog', 'honeypot'];

/**
 * Read the user's saved streak count from localStorage. Default 0 if missing/invalid.
 */
function _readStreak() {
  return parseInt(localStorage.getItem('brickbuilder_streak'), 10) || 0;
}

/**
 * Derive a category bucket for a set's metadata.
 * @returns {'fruits'|'snacks'|'bosses'|'other'}
 */
function _categoryFor(setMeta) {
  if (setMeta.category === 'boss') return 'bosses';
  if (FRUIT_IDS.includes(setMeta.id)) return 'fruits';
  if (SNACK_IDS.includes(setMeta.id)) return 'snacks';
  return 'other';
}

/**
 * Derive star rating (1-3) from piece count.
 * @param {number} pieceCount
 * @returns {{ stars: string, label: string }}
 */
function _starsForPieceCount(pieceCount) {
  if (pieceCount <= 25) return { stars: '★', label: 'Simple' };
  if (pieceCount <= 60) return { stars: '★★', label: 'Medium' };
  return { stars: '★★★', label: 'Hard' };
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

  // Display streak pill
  const streakEl = document.getElementById('streak-pill');
  if (streakEl) streakEl.textContent = `${_readStreak()}-day streak`;

  // Wire category tabs
  const tabs = document.querySelectorAll('.category-tab');
  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      const filter = tab.dataset.filter || 'all';
      _activeFilter = filter;
      for (const t of tabs) t.classList.toggle('active', t === tab);
      _renderGrid();
    });
  }

  // Wire boss collapsed card → modal
  const bossCollapsed = document.getElementById('boss-collapsed');
  const bossModal = document.getElementById('boss-modal');
  const bossModalClose = document.getElementById('boss-modal-close');
  if (bossCollapsed && bossModal) {
    bossCollapsed.addEventListener('click', () => {
      _populateBossModal();
      bossModal.classList.remove('hidden');
    });
  }
  if (bossModalClose && bossModal) {
    bossModalClose.addEventListener('click', () => {
      bossModal.classList.add('hidden');
    });
  }
  if (bossModal) {
    bossModal.addEventListener('click', (e) => {
      if (e.target === bossModal) bossModal.classList.add('hidden');
    });
  }

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
      _bossModalPopulated = false;
      showSelectionScreen(); // refresh cards
    });
  }

  await _renderGrid();
}

/**
 * Render (or re-render) the set list grid using the active filter.
 * Sequentially generates WebGL thumbnails for the visible cards.
 */
async function _renderGrid() {
  const setList = document.getElementById('set-list');
  const bossCollapsed = document.getElementById('boss-collapsed');
  if (!setList || !_cachedSets) return;

  setList.innerHTML = '';

  const regularSets = _cachedSets.filter(s => s.category !== 'boss');
  const bossSets = _cachedSets.filter(s => s.category === 'boss')
    .sort((a, b) => a.pieceCount - b.pieceCount);

  // Boss gate: bosses unlock only after every non-boss set is completed.
  const completed = getCompletedBuilds();
  const bossesUnlocked = regularSets.length > 0 && regularSets.every(s => !!completed[s.id]);

  // Hide the Bosses tab when locked; if it was the active filter, fall back to 'all'.
  const bossTab = document.querySelector('.category-tab[data-filter="bosses"]');
  if (bossTab) bossTab.classList.toggle('hidden', !bossesUnlocked);
  if (!bossesUnlocked && _activeFilter === 'bosses') {
    _activeFilter = 'all';
    document.querySelectorAll('.category-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.filter === 'all');
    });
  }

  let visibleSets;
  if (_activeFilter === 'bosses') {
    visibleSets = bossSets;
    if (bossCollapsed) bossCollapsed.classList.add('hidden');
  } else if (_activeFilter === 'fruits') {
    visibleSets = regularSets.filter(s => _categoryFor(s) === 'fruits');
    if (bossCollapsed) bossCollapsed.classList.toggle('hidden', !bossesUnlocked);
  } else if (_activeFilter === 'snacks') {
    visibleSets = regularSets.filter(s => _categoryFor(s) === 'snacks');
    if (bossCollapsed) bossCollapsed.classList.toggle('hidden', !bossesUnlocked);
  } else {
    // 'all'
    visibleSets = regularSets;
    if (bossCollapsed) bossCollapsed.classList.toggle('hidden', !bossesUnlocked);
  }

  for (const setMeta of visibleSets) {
    setList.appendChild(_createCard(setMeta));
  }

  // Render thumbnails sequentially (one WebGL renderer at a time)
  const allCanvases = setList.querySelectorAll('canvas.set-card-thumb');
  for (let i = 0; i < visibleSets.length; i++) {
    const canvasEl = allCanvases[i];
    if (canvasEl) {
      await _renderThumbnail(visibleSets[i].id, canvasEl);
    }
  }
}

/**
 * Populate the boss modal once with all four boss tiles.
 */
async function _populateBossModal() {
  if (_bossModalPopulated) return;
  if (!_cachedSets) return;
  const list = document.getElementById('boss-modal-list');
  if (!list) return;

  list.innerHTML = '';
  const bossSets = _cachedSets.filter(s => s.category === 'boss')
    .sort((a, b) => a.pieceCount - b.pieceCount);
  for (const setMeta of bossSets) {
    list.appendChild(_createCard(setMeta));
  }
  _bossModalPopulated = true;

  const allCanvases = list.querySelectorAll('canvas.set-card-thumb');
  for (let i = 0; i < bossSets.length; i++) {
    const canvasEl = allCanvases[i];
    if (canvasEl) {
      await _renderThumbnail(bossSets[i].id, canvasEl);
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

  // Thumbnail wrapper with category tint
  const thumbWrap = document.createElement('div');
  thumbWrap.className = 'set-card-thumb-wrap';
  const cat = _categoryFor(setMeta);
  if (cat === 'fruits') {
    thumbWrap.classList.add('tint-fruits-' + setMeta.id);
  } else if (cat === 'snacks') {
    thumbWrap.classList.add('tint-snacks');
  } else if (cat === 'bosses') {
    thumbWrap.classList.add('tint-bosses');
  }

  const thumb = document.createElement('canvas');
  thumb.className = 'set-card-thumb';
  thumb.width = 320;
  thumb.height = 240;
  thumbWrap.appendChild(thumb);

  // Percent-done water-blue badge (top-left) — when there's saved progress for this set
  const save = loadProgress();
  const hasSave = save && save.setId === setMeta.id && save.placedIds.length > 0;
  if (hasSave && setMeta.pieceCount > 0) {
    const pct = Math.floor(100 * save.placedIds.length / setMeta.pieceCount);
    const progressBadge = document.createElement('div');
    progressBadge.className = 'set-card-progress-badge';
    progressBadge.textContent = pct + '%';
    thumbWrap.appendChild(progressBadge);
  }

  // Completion check badge (top-right, stays alongside progress badge)
  if (completion) {
    const badge = document.createElement('div');
    badge.className = 'set-card-badge';
    badge.textContent = '✓';
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
  diffSpan.textContent = ' · ' + label;

  meta.appendChild(starsSpan);
  meta.appendChild(diffSpan);

  if (completion) {
    const bestSpan = document.createElement('span');
    bestSpan.className = 'set-card-difficulty';
    const totalSec = Math.floor(completion.bestTime / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    bestSpan.textContent = ' · Best: ' + (m > 0 ? m + 'm ' + s + 's' : s + 's');
    meta.appendChild(bestSpan);
  }

  // Build button — show CONTINUE if there's saved progress for this set
  const btnWrap = document.createElement('div');
  btnWrap.className = 'set-card-btn';
  const btn = document.createElement('button');
  btn.classList.add('keycap');
  if (hasSave) {
    btn.classList.add('keycap--water');
    btn.textContent = 'CONTINUE';
  } else if (completion) {
    btn.classList.add('keycap--cream');
    btn.textContent = 'REBUILD';
  } else {
    btn.textContent = 'BUILD';
  }
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
      // Close boss modal if open
      const bm = document.getElementById('boss-modal');
      if (bm) bm.classList.add('hidden');
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

  // Refresh streak display
  const streakEl = document.getElementById('streak-pill');
  if (streakEl) streakEl.textContent = `${_readStreak()}-day streak`;

  // Force boss modal to repopulate next open (in case completion changed)
  _bossModalPopulated = false;
  const bossModal = document.getElementById('boss-modal');
  if (bossModal) bossModal.classList.add('hidden');

  // Refresh cards to pick up new completion badges
  if (_cachedSets) {
    _renderGrid();
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
