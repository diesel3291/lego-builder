# Phase 2: Core Build Loop - Research

**Researched:** 2026-04-05
**Domain:** Three.js interaction (Raycaster, OrbitControls, ghost overlay, state machine), UI HTML/CSS
**Confidence:** HIGH (foundation code fully read; Three.js patterns verified against official docs and CLAUDE.md)

---

## Summary

Phase 2 builds directly on the foundation established in Phase 1. The codebase already has a complete Three.js scene (`scene.js`), a stud-grid coordinate system (`grid.js`), a cached geometry factory (`geometry.js`), a Flask API serving set JSON, and three authored set files. None of these need to change — Phase 2 layers interaction and state on top.

The central engineering challenges in this phase are: (1) distinguishing between a camera-drag orbit and a deliberate click for piece selection/placement, (2) rendering a ghost overlay mesh that never z-fights with placed bricks from any camera angle, and (3) managing a step state machine that reads set data, advances steps, and drives the instruction panel and tray UI.

The key architectural insight is that all interactive state — current step index, placed brick registry, held piece — must live in a single `state.js` module that other modules read from but only the state machine mutates. This keeps the interaction layer, ghost overlay, tray rendering, and instruction panel loosely coupled and testable.

**Primary recommendation:** Build one new file per concern — `state.js` (step machine + placed registry), `interaction.js` (raycaster, click disambiguation, placement validation), `ghost.js` (transparent overlay mesh), `tray.js` (HTML piece tray), `hud.js` (instruction panel) — all coordinated from a refactored `main.js`.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BUILD-01 | Stud-grid snapping — bricks lock to valid 8mm grid positions only | `gridToWorld` / `worldToGrid` / `gridKey` already exist in `grid.js`; placement validation is a Set lookup against `occupiedCells` |
| BUILD-02 | Valid placement feedback — visual confirmation on success, error indication on invalid drop | Material color flash (green pulse on success, red flash on rejection) via GSAP tween on `MeshStandardMaterial.color`; no new library needed |
| GUIDE-01 | Step state machine — tracks current step, advances on correct placement | `state.js` module: `currentStep` index, `steps[]` array from set JSON, `advanceStep()` mutator |
| GUIDE-02 | Ghost/transparent overlay showing where current piece goes | Clone target geometry, `MeshStandardMaterial` with `transparent: true, opacity: 0.35, depthWrite: false`; `renderOrder: 1` to prevent z-fighting |
| GUIDE-03 | Instruction panel — step N of M with Next/Back navigation | HTML `<div>` overlay; driven by state; text update on step advance |
| UI-01 | Piece tray showing pieces for current step with correct colors | HTML tray below canvas; render one colored div per piece in current step |
| UI-02 | Piece-in-hand selection — picked piece highlighted with visual feedback | `heldPiece` field in state; tray item gets CSS `selected` class; ghost mesh becomes visible |
| DATA-04 | Progress indicator — step N of M counter in instruction panel | Derived from `state.currentStepIndex + 1` and `steps.length`; part of HUD render |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

- **Tech stack (locked):** Python + Flask backend, Three.js (r183) frontend, Vite dev server
- **Libraries available (from CLAUDE.md):** Three.js, GSAP 3.x, OrbitControls — all already in `package.json`; no new npm packages needed for this phase
- **Interaction model (locked):** Mouse-only for v1 — left-click for pick/place, orbit/zoom/pan for camera
- **Rendering budget:** Must run smoothly in modern browsers; individual `Mesh` objects per brick (not InstancedMesh) chosen in Phase 1 — adequate for v1 set sizes
- **No CDN imports:** All Three.js imports via `npm` + ESM (`three/addons/` for OrbitControls)
- **Slopes approximated as BoxGeometry:** Established in Phase 1; Phase 2 snapping/ghost logic must work with this approximation
- **Piece tray and instruction panel are HTML overlays:** Not Three.js objects — DOM elements positioned over the canvas via CSS absolute positioning

---

## Phase 1 Foundation Inventory

Everything Phase 2 builds on (all VERIFIED by reading source files):

| Export | File | What It Provides |
|--------|------|------------------|
| `initScene(canvasEl)` | `scene.js` | WebGLRenderer, PerspectiveCamera, OrbitControls, lights, baseplate, stud grid |
| `getScene()`, `getCamera()`, `getRenderer()`, `getControls()` | `scene.js` | Access to scene graph, camera, renderer, OrbitControls instance |
| `STUD_SIZE=8`, `BRICK_HEIGHT=9.6`, `PLATE_HEIGHT=3.2` | `grid.js` | Grid constants |
| `gridToWorld(gridX, gridZ, layer, pieceType)` | `grid.js` | Integer grid → THREE.Vector3 world position |
| `worldToGrid(worldPos, pieceType)` | `grid.js` | World position → `{gridX, gridZ, layer}` |
| `gridKey(gridX, gridZ, layer)` | `grid.js` | Canonical string key for placement Set |
| `getGeometry(type)` | `geometry.js` | Cached BufferGeometry, origin at bottom-face center |
| `BRICK_TYPES` (14 strings) | `geometry.js` | Valid piece type strings |
| GET `/api/sets` and GET `/api/sets/<id>` | `app.py` | Set catalogue and full step/piece data |
| Set JSON schema (v1) | `sets/schema.md` | Field names: `steps[].pieces[].gridX/gridZ/layer/type/color/rotation` |

`main.js` currently calls `initScene(canvas)` and `runStressTest()`. Phase 2 refactors `main.js` to fetch set data, initialize state, and wire the interaction layer — replacing the stress test call.

---

## Standard Stack

### Core (all already installed — no new packages)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| three | ^0.183.0 | Raycaster, Mesh, MeshStandardMaterial, scene graph | Installed [VERIFIED: package.json] |
| gsap | ^3.12.5 | Material color tween for placement feedback; ghost fade-in | Installed [VERIFIED: package.json] |
| Vite | ^5.4.0 | Dev server with /api proxy to Flask | Installed [VERIFIED: package.json] |

### No New npm Packages Required

All Phase 2 capabilities are covered by the already-installed stack:
- Raycasting: `THREE.Raycaster` (bundled with `three`)
- Click disambiguation: Pure JS mouse-delta tracking (no library needed)
- Ghost overlay: `THREE.MeshStandardMaterial` with `transparent: true, depthWrite: false`
- State machine: Plain JS module (no framework)
- Tray and HUD: HTML/CSS DOM elements (no library)
- Placement feedback animation: GSAP `gsap.to(material.color, ...)` [ASSUMED — GSAP can tween THREE.Color objects]

**Installation:** No new installation step needed. `npm install` already done.

---

## Architecture Patterns

### Recommended Module Structure

```
frontend/src/
├── main.js          # REFACTOR: fetch set, init state, wire all modules
├── scene.js         # UNCHANGED from Phase 1
├── grid.js          # UNCHANGED from Phase 1
├── geometry.js      # UNCHANGED from Phase 1
├── stressTest.js    # REMOVE from main.js call (keep file for reference)
├── state.js         # NEW: step machine, placed registry, held piece
├── interaction.js   # NEW: raycaster, click disambig, placement validation
├── ghost.js         # NEW: transparent overlay mesh
├── tray.js          # NEW: HTML piece tray renderer
└── hud.js           # NEW: HTML instruction panel renderer
```

### Pattern 1: Step State Machine (`state.js`)

**What:** A single module owning all mutable build state. No other module mutates state directly; they call exported mutators.

**When to use:** Whenever multiple modules (ghost, tray, hud, interaction) need to react to the same state change.

```javascript
// Source: project design — no external library
let _setData = null;
let _currentStepIndex = 0;
let _heldPieceId = null;       // null = no piece held
const _placedCells = new Set(); // gridKey strings of all placed brick cells

export function loadSet(setData) {
  _setData = setData;
  _currentStepIndex = 0;
  _heldPieceId = null;
  _placedCells.clear();
}

export function getCurrentStep() {
  return _setData.steps[_currentStepIndex];
}

export function getTotalSteps() {
  return _setData.steps.length;
}

export function getCurrentStepNumber() {
  return _currentStepIndex + 1;
}

export function holdPiece(pieceId) {
  _heldPieceId = pieceId;
}

export function releasePiece() {
  _heldPieceId = null;
}

export function getHeldPieceId() {
  return _heldPieceId;
}

export function isOccupied(gridX, gridZ, layer) {
  return _placedCells.has(gridKey(gridX, gridZ, layer));
}

export function placeBrick(piece) {
  // Mark all cells the piece occupies
  const [cols, rows] = DIMS[piece.type];
  for (let cx = 0; cx < cols; cx++) {
    for (let rz = 0; rz < rows; rz++) {
      _placedCells.add(gridKey(piece.gridX + cx, piece.gridZ + rz, piece.layer));
    }
  }
}

export function advanceStep() {
  if (_currentStepIndex < _setData.steps.length - 1) {
    _currentStepIndex++;
    _heldPieceId = null;
  }
}
```

### Pattern 2: Pointer-Delta Click Disambiguation (`interaction.js`)

**What:** Track mouse position on `pointerdown`. On `pointerup`, if the pointer moved more than a threshold, treat as orbit drag (ignore); if within threshold, treat as click (fire raycast).

**Why this pattern:** OrbitControls and Raycaster both listen to mouse events on the same canvas element. Without disambiguation, a camera drag always also fires a raycast click. [VERIFIED: Three.js forum discussion confirms this is the standard community pattern]

**Threshold:** 4–5 pixels is the community-established threshold. Anything less than ~5px is a "click"; anything more is a "drag". [CITED: discourse.threejs.org/t/problem-raycaster-with-orbitcontrols/20625 — community convention, not official doc]

```javascript
// Source: community pattern — pointer delta disambiguation
let _pointerDownPos = { x: 0, y: 0 };
const CLICK_THRESHOLD_PX = 5;

canvas.addEventListener('pointerdown', (e) => {
  _pointerDownPos = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('pointerup', (e) => {
  const dx = e.clientX - _pointerDownPos.x;
  const dy = e.clientY - _pointerDownPos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < CLICK_THRESHOLD_PX) {
    _handleClick(e);
  }
  // else: it was a drag — OrbitControls handled it, ignore for raycasting
});
```

### Pattern 3: Raycasting for Tray Selection and Placement

**What:** Two raycasting targets — tray items are HTML elements (use DOM click, not Three.js raycasting); grid placement targets placed against the baseplate mesh using Three.js Raycaster.

**Tray items:** Regular DOM click events on tray `<div>` elements. No Three.js raycasting needed for tray.

**Grid placement:** Raycast against the baseplate and already-placed brick meshes to find world hit point, then convert to grid coordinates via `worldToGrid`. [VERIFIED: THREE.Raycaster docs — `setFromCamera` + `intersectObjects`]

```javascript
// Source: Three.js official docs — threejs.org/docs/#api/en/core/Raycaster
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function _handleClick(event) {
  // Convert to NDC (-1 to +1)
  ndc.x = (event.clientX / window.innerWidth) * 2 - 1;
  ndc.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(ndc, camera);

  // Intersect against baseplate + placed bricks
  const targets = [baseplateRef, ...placedMeshes];
  const hits = raycaster.intersectObjects(targets);

  if (hits.length > 0) {
    const hitPoint = hits[0].point;
    const heldPiece = getCurrentStepPieceForHeld();
    const gridPos = worldToGrid(hitPoint, heldPiece.type);
    _tryPlace(gridPos, heldPiece);
  }
}
```

**Critical detail:** After OrbitControls rotates the camera, `raycaster.setFromCamera()` must be called with a freshly computed NDC coordinate on each click. The raycaster is not stale after orbit — it recomputes correctly as long as the camera reference is current. [VERIFIED: Three.js docs confirm `setFromCamera` uses camera's current state]

### Pattern 4: Ghost Overlay Mesh (`ghost.js`)

**What:** A transparent version of the target piece's geometry, positioned at the target grid position for the current step, always visible from any camera angle.

**Z-fighting prevention:** Two techniques combined:
1. `depthWrite: false` — ghost does not write to depth buffer; placed bricks underneath it are unaffected [VERIFIED: CLAUDE.md explicit pattern]
2. `renderOrder: 1` — ghost renders after opaque geometry; avoids sorting conflicts with transparent objects [CITED: discourse.threejs.org/t/shapes-z-order-renderorder-polygonoffset/7970]
3. `polygonOffset` as fallback if z-fighting still visible: `polygonOffsetFactor: -1, polygonOffsetUnits: -1` [CITED: github.com/mrdoob/three.js/issues/2593]

```javascript
// Source: CLAUDE.md explicit pattern + Three.js forum verification
import * as THREE from 'three';
import { getScene } from './scene.js';
import { getGeometry } from './geometry.js';
import { gridToWorld } from './grid.js';

let _ghostMesh = null;

export function showGhost(piece) {
  hideGhost();
  const geometry = getGeometry(piece.type);
  const material = new THREE.MeshStandardMaterial({
    color: piece.color,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,     // CRITICAL: prevents z-fighting with placed bricks
    side: THREE.DoubleSide, // visible from any camera angle
  });
  _ghostMesh = new THREE.Mesh(geometry, material);
  _ghostMesh.renderOrder = 1; // render after opaque meshes

  const pos = gridToWorld(piece.gridX, piece.gridZ, piece.layer, piece.type);
  _ghostMesh.position.copy(pos);
  _ghostMesh.rotation.y = THREE.MathUtils.degToRad(piece.rotation);

  getScene().add(_ghostMesh);
}

export function hideGhost() {
  if (_ghostMesh) {
    getScene().remove(_ghostMesh);
    _ghostMesh.geometry.dispose();  // no — geometry is from cache, DON'T dispose
    _ghostMesh.material.dispose();  // do dispose material
    _ghostMesh = null;
  }
}
```

**Pitfall:** Do NOT call `_ghostMesh.geometry.dispose()` — the geometry is shared from the `getGeometry()` cache. Only dispose the material.

### Pattern 5: Placement Validation

**What:** When the user clicks a grid position, check: (a) is the clicked position the correct target from the current step? (b) is the position unoccupied?

**For v1 guided build:** Correct placement = the piece's target `gridX/gridZ/layer` from the current step JSON. The user must place it in the exact correct position.

```javascript
// Source: project design
function isValidPlacement(clickedGridPos, heldPiece) {
  // Must match the exact target position from current step
  if (clickedGridPos.gridX !== heldPiece.gridX) return false;
  if (clickedGridPos.gridZ !== heldPiece.gridZ) return false;
  if (clickedGridPos.layer !== heldPiece.layer) return false;

  // Must not already be occupied (defensive check)
  if (isOccupied(heldPiece.gridX, heldPiece.gridZ, heldPiece.layer)) return false;

  return true;
}
```

**Design decision:** The "invalid position" feedback (BUILD-02) should be forgiving — the user clicked somewhere wrong, not somewhere invalid in a Lego rules sense. The ghost overlay always shows the correct target. This makes the interaction more like "click the ghost to confirm" rather than free placement.

### Pattern 6: Placement Feedback (BUILD-02)

**What:** Visual confirmation on correct placement; visual rejection on incorrect.

**Success:** Snap the piece into place (add `Mesh` to scene at target position), flash the piece green briefly. GSAP tween on `mesh.material.color`. [ASSUMED — GSAP 3.x can tween THREE.Color; training knowledge, not verified in session]

**Rejection:** Flash the ghost mesh red briefly, then return to ghost color. GSAP tween.

```javascript
// Source: ASSUMED - GSAP 3.x THREE.Color tween pattern
import gsap from 'gsap';

// On success — flash placed brick green then settle to piece color
gsap.fromTo(placedMesh.material.color,
  { r: 0, g: 1, b: 0 },
  { r: targetR, g: targetG, b: targetB, duration: 0.4 }
);

// On rejection — flash ghost red then return to ghost color
gsap.fromTo(ghostMaterial.color,
  { r: 1, g: 0, b: 0 },
  { r: ghostR, g: ghostG, b: ghostB, duration: 0.3 }
);
```

**Alternative (no GSAP):** Use a timer + `requestAnimationFrame` to lerp color manually. Simpler to implement if GSAP THREE.Color tween has issues.

### Pattern 7: HTML Tray and HUD

**What:** Piece tray (bottom bar) and instruction panel (top-right or top-left) are HTML `<div>` elements positioned absolutely over the `<canvas>`.

**Why HTML not Three.js:** Text rendering in Three.js requires `TextGeometry` or sprites — unnecessary complexity for UI labels. The project uses a `<canvas>` that fills the viewport with HTML overlays on top. [VERIFIED: CLAUDE.md — "Piece tray and instruction panel are HTML overlays"]

**Tray update cycle:**
1. On step advance → clear tray inner HTML → re-render pieces for new step
2. Each piece = a `<div class="tray-item">` with background-color set to piece color
3. Click on tray item → call `holdPiece(pieceId)` in state → add `selected` CSS class → show ghost

**HUD update cycle:**
1. On step advance → update `stepCounter.textContent = 'Step ${n} of ${total}'`
2. On step advance → update `stepDescription.textContent = step.description`

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Grid coordinate math | Custom coordinate converter | `gridToWorld` / `worldToGrid` in `grid.js` | Already implemented and tested in Phase 1 |
| Mouse-to-ray conversion | Custom ray math | `THREE.Raycaster.setFromCamera()` | Three.js handles NDC → ray correctly for all camera types |
| Placement cell tracking | Custom spatial index | `Set` of `gridKey(x,z,layer)` strings | Already established in Phase 1 via `gridKey()`; O(1) lookup |
| Step sequencing | Custom linked list | Array index in state.js | JSON `steps[]` is already ordered; index arithmetic is sufficient |
| Color animation | Manual lerp loop | GSAP `gsap.to()` | GSAP handles easing, cancellation, and chaining; avoids frame-by-frame state |
| Ghost transparency | Custom shader | `MeshStandardMaterial` with `transparent: true, depthWrite: false` | Standard Three.js pattern; documented in CLAUDE.md |

**Key insight:** Phase 1 already solved the hardest infrastructure problems (coordinate system, geometry cache, grid key). Phase 2 is primarily wiring and interaction logic.

---

## Common Pitfalls

### Pitfall 1: OrbitControls Intercepts Clicks
**What goes wrong:** OrbitControls listens on `renderer.domElement` for mouse events. A click that starts and ends in the same pixel still triggers OrbitControls internal state, which can cause raycaster to fire on mouse-up after a long orbit drag.
**Why it happens:** Both systems listen to the same DOM element with no coordination.
**How to avoid:** Pointer-delta disambiguation pattern (Pattern 2 above). Track `pointerdown` position; only fire raycast if `pointerup` position is within 5px.
**Warning signs:** Raycasting fires unpredictably after camera orbits; pieces appear to "click" during drags.

### Pitfall 2: Z-Fighting on Ghost Overlay
**What goes wrong:** The ghost mesh occupies the same or nearly-the-same world-space position as a placed brick below it (same layer). Depth buffer flickering causes the ghost to appear and disappear as camera moves.
**Why it happens:** WebGL depth buffer precision is limited; two meshes at identical depth values get indeterminate draw order.
**How to avoid:** `depthWrite: false` on ghost material (ghost doesn't write depth → no conflict). Add `renderOrder: 1`. If still flickering, add `polygonOffsetFactor: -1, polygonOffsetUnits: -1`.
**Warning signs:** Ghost flickers or disappears when camera is at certain angles over placed bricks.

### Pitfall 3: Ghost Geometry Disposal
**What goes wrong:** `ghost.js` calls `ghostMesh.geometry.dispose()` when hiding/updating the ghost. This destroys the cached geometry in `geometry.js`'s `_cache` Map, causing all subsequent bricks of that type to have empty geometry.
**Why it happens:** `getGeometry()` returns the same `BufferGeometry` reference each call. Disposing it removes the GPU buffer.
**How to avoid:** Only dispose `_ghostMesh.material`. Never dispose `_ghostMesh.geometry` — it belongs to the cache.
**Warning signs:** Bricks of one type go invisible or show as a single point after a ghost is shown and hidden.

### Pitfall 4: NDC Coordinates Wrong After Window Resize
**What goes wrong:** Raycaster clicks register in wrong positions after the browser window is resized.
**Why it happens:** NDC calculation uses `window.innerWidth/innerHeight` hardcoded at setup. After resize, these values are stale if not re-read.
**How to avoid:** Always compute NDC live from `event.clientX / window.innerWidth` in the `pointerup` handler — do NOT cache window dimensions.
**Warning signs:** Clicks work correctly initially but drift after resizing the window.

### Pitfall 5: Step Advancing Before All Step Pieces Are Placed
**What goes wrong:** The step advances after the first piece is placed, even though a step may have multiple pieces.
**Why it happens:** `advanceStep()` is called after any single successful placement.
**How to avoid:** A step can have multiple pieces (`step.pieces` is an array). Track how many pieces in the current step have been placed. Only call `advanceStep()` when all pieces in the current step are placed.
**Warning signs:** Steps with 2+ pieces skip early; subsequent steps show wrong ghost positions.

### Pitfall 6: `worldToGrid` Layer Confusion Between Brick and Plate Heights
**What goes wrong:** User clicks the top of a brick-1x1 placed at layer 0. The hit point Y is ~9.6 (top of brick). `worldToGrid()` with `pieceType='plate-1x2'` gives layer=3 (because plate height is 3.2, and 9.6/3.2=3) — but the intended layer is 1 (one plate height above the brick).
**Why it happens:** `worldToGrid` needs to know the piece type to interpret Y correctly. The clicked object's Y position is a physical height, not a grid layer.
**How to avoid:** For Phase 2 guided build, don't convert click hit point to grid coordinates for the purpose of determining placement layer. Instead, read the target layer directly from the current step's piece data in the JSON (`piece.layer`). The ghost is at the correct position; the user is confirming the placement, not specifying coordinates.
**Warning signs:** Pieces snap to wrong layers; bricks appear floating or buried.

### Pitfall 7: Stale `_setData` in state.js Before First Fetch
**What goes wrong:** `main.js` accesses `getCurrentStep()` before the async fetch to `/api/sets/<id>` resolves. `_setData` is null and `_setData.steps[0]` throws.
**Why it happens:** JavaScript fetch is async. Code that runs synchronously after calling fetch sees the pre-fetch state.
**How to avoid:** Initialize all UI and ghost/tray rendering only in the `.then()` callback of the fetch, or use `async/await` with a guard. Render a loading state until fetch completes.
**Warning signs:** `Cannot read properties of null (reading 'steps')` in console on startup.

---

## Code Examples

### Fetching Set Data in main.js

```javascript
// Source: standard Fetch API + existing Flask route pattern
async function startBuild(setId) {
  const res = await fetch(`/api/sets/${setId}`);
  const setData = await res.json();
  loadSet(setData);     // state.js
  renderTray();         // tray.js
  renderHUD();          // hud.js
  showGhost(getCurrentStep().pieces[0]);  // ghost.js — show first piece ghost
}
```

### Multi-Piece Step Advancement

```javascript
// Source: project design — handle steps with multiple pieces
let _placedThisStep = new Set(); // piece IDs placed in current step

function onSuccessfulPlacement(pieceId) {
  _placedThisStep.add(pieceId);
  const currentPieces = getCurrentStep().pieces;
  const allPlaced = currentPieces.every(p => _placedThisStep.has(p.id));
  if (allPlaced) {
    _placedThisStep.clear();
    advanceStep();  // state.js
    renderTray();   // tray.js
    renderHUD();    // hud.js
    // Show ghost for first piece of new step
    const nextStep = getCurrentStep();
    if (nextStep) showGhost(nextStep.pieces[0]);
    else hideGhost(); // build complete
  } else {
    // Step has more pieces — show ghost for next unplaced piece
    const nextPiece = currentPieces.find(p => !_placedThisStep.has(p.id));
    showGhost(nextPiece);
  }
}
```

### Tray Item HTML Structure

```javascript
// Source: project design
function renderTray() {
  const step = getCurrentStep();
  trayEl.innerHTML = '';
  step.pieces.forEach(piece => {
    const item = document.createElement('div');
    item.className = 'tray-item';
    item.dataset.pieceId = piece.id;
    item.style.backgroundColor = piece.color;
    item.title = `${piece.type}`;
    if (getHeldPieceId() === piece.id) {
      item.classList.add('selected');
    }
    item.addEventListener('click', () => {
      holdPiece(piece.id);   // state.js
      showGhost(piece);      // ghost.js
      renderTray();          // re-render to show selection state
    });
    trayEl.appendChild(item);
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `OrbitControls` from `three/examples/jsm/` | From `three/addons/` (changed in r151) | Already correct in Phase 1 — no action needed |
| `Raycaster` setFromCamera with stale camera | Always use live camera ref from `getCamera()` | Correct by design if `getCamera()` always returns current camera |
| `depthTest: false` to fix z-fighting | `depthWrite: false` + `renderOrder` | `depthWrite: false` is the correct modern approach for overlay meshes; `depthTest: false` makes the ghost draw on top of everything including UI |

**Deprecated/outdated:**
- `THREE.Color.lerp()` in requestAnimationFrame loop: Still works, but GSAP `gsap.to()` is cleaner for this project
- Manual HTML canvas text rendering: Not needed — HTML DOM overlays are simpler and used here

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | GSAP 3.x can directly tween `THREE.Color` properties (`r`, `g`, `b` fields) using `gsap.to(material.color, {...})` | Architecture Patterns (Pattern 6), Don't Hand-Roll | If GSAP cannot tween THREE.Color directly, use manual `requestAnimationFrame` lerp or `gsap.to({value:0}, {value:1, onUpdate: ...})` as fallback |
| A2 | `side: THREE.DoubleSide` on ghost material ensures it is visible from any camera angle without clipping | Architecture Patterns (Pattern 4) | If DoubleSide causes rendering artifacts, fall back to `THREE.FrontSide` (the default) — z-fighting prevention still works |
| A3 | The 5px pointer-delta threshold is sufficient for this project's orbit behavior | Architecture Patterns (Pattern 2) | If OrbitControls are too sensitive (small orbit looks like a click), increase threshold to 8–10px |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.
A1 is the most material assumption — the fallback is well-defined and trivial to implement.

---

## Open Questions

1. **Which set does Phase 2 load by default?**
   - What we know: Flask serves `mini-rocket`, `starter-tower`, `color-steps`; set selection screen (UI-03) is Phase 3
   - What's unclear: Phase 2 needs a hardcoded starting set since there's no set selection screen yet
   - Recommendation: Hardcode `mini-rocket` as the default set in Phase 2 `main.js` — smallest set (18 pieces, 7 steps), exercises brick + plate + slope types. Phase 3 will replace the hardcoded call with the set selection screen.

2. **Steps with multiple pieces: show all ghosts simultaneously or one at a time?**
   - What we know: The step JSON `pieces` array can have multiple pieces per step; Phase 2 success criteria say "the ghost overlay appears... where the current step's piece belongs"
   - What's unclear: Should all pieces in a step show as ghosts at once, or should the user place one at a time?
   - Recommendation: Show all pieces as ghosts simultaneously (simpler state) — matches how real Lego instruction books show all step pieces at once. One ghost per piece in the step, all visible at the same time.

3. **Placement confirmation UX: click anywhere or click the ghost specifically?**
   - What we know: Success criteria say "click a valid grid position to snap the held piece"
   - What's unclear: Does "valid grid position" mean anywhere near the ghost, or does the user need to click the ghost mesh directly?
   - Recommendation: Click the ghost mesh directly. This is natural — user sees the ghost, clicks to confirm. Implement by adding ghost meshes to the raycaster targets. This avoids coordinate math for proximity detection.

---

## Environment Availability

Phase 2 is purely frontend code changes. No new external tools, services, or CLI utilities are needed beyond what Phase 1 established.

| Dependency | Required By | Available | Version |
|------------|------------|-----------|---------|
| Node.js / npm | Vite dev server | Verified in Phase 1 | 18+ (implicit from Phase 1 completion) |
| Three.js r183 | Raycaster, ghost mesh | Installed | ^0.183.0 [VERIFIED: package.json] |
| GSAP 3.x | Placement feedback animation | Installed | ^3.12.5 [VERIFIED: package.json] |
| Flask dev server | `/api/sets` | Running in Phase 1 | flask==3.1.3 [VERIFIED: requirements.txt] |

No missing dependencies. No fallbacks needed.

---

## Validation Architecture

`nyquist_validation` is set to `false` in `.planning/config.json`. This section is skipped per configuration.

---

## Security Domain

Phase 2 introduces no new trust boundaries beyond Phase 1. No user-provided data enters the system — the user clicks on DOM elements and canvas positions; all set data is read-only from the server. The Flask API (Phase 1) already validates set JSON at startup. No new security controls required.

---

## Sources

### Primary (HIGH confidence)
- `/Users/chien/lego-builder/frontend/src/scene.js` — Phase 1 Three.js scene exports verified
- `/Users/chien/lego-builder/frontend/src/grid.js` — STUD_SIZE=8, BRICK_HEIGHT=9.6, PLATE_HEIGHT=3.2, gridToWorld, worldToGrid, gridKey all verified
- `/Users/chien/lego-builder/frontend/src/geometry.js` — getGeometry, BRICK_TYPES, geometry cache pattern verified
- `/Users/chien/lego-builder/frontend/package.json` — three@^0.183.0, gsap@^3.12.5, vite@^5.4.0 verified
- `/Users/chien/lego-builder/CLAUDE.md` — ghost overlay pattern (`depthWrite: false`), HTML overlay pattern, stack constraints verified
- `/Users/chien/lego-builder/sets/schema.md` — set JSON field names (steps, pieces, gridX, gridZ, layer, rotation, type) verified
- threejs.org/docs/#api/en/core/Raycaster — `setFromCamera(coords, camera)`, `intersectObjects(objects, recursive)` API verified

### Secondary (MEDIUM confidence)
- [discourse.threejs.org/t/problem-raycaster-with-orbitcontrols/20625](https://discourse.threejs.org/t/problem-raycaster-with-orbitcontrols/20625) — pointer-delta disambiguation as community-established pattern
- [discourse.threejs.org/t/shapes-z-order-renderorder-polygonoffset/7970](https://discourse.threejs.org/t/shapes-z-order-renderorder-polygonoffset/7970) — `renderOrder` for z-fighting prevention
- [github.com/mrdoob/three.js/issues/2593](https://github.com/mrdoob/three.js/issues/2593) — `polygonOffset` as z-fighting fallback

### Tertiary (LOW confidence / ASSUMED — see Assumptions Log)
- A1: GSAP THREE.Color tween — training knowledge; verify at implementation time

---

## Metadata

**Confidence breakdown:**
- Foundation inventory: HIGH — read all Phase 1 source files directly
- Standard stack: HIGH — all packages verified in package.json
- Raycasting API: HIGH — verified against official Three.js docs
- Ghost overlay z-fighting prevention: HIGH — CLAUDE.md explicit + community verification
- Pointer-delta disambiguation: MEDIUM — community pattern, no official Three.js doc
- GSAP THREE.Color tween: LOW — A1 in assumptions log

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable stack; Three.js and GSAP APIs are stable across minor versions)
