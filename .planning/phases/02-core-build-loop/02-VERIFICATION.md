---
phase: 02-core-build-loop
verified: 2026-04-05T12:00:00Z
status: human_needed
score: 5/5 roadmap success criteria verified
re_verification:
  previous_status: gaps_found
  previous_score: 4/5 (SC-3 partial)
  gaps_closed:
    - "Step 6 plate-2x2 layer data bug — layers corrected from 10/11/12 to 15/16/17 in mini-rocket.json"
    - "Position flexibility (strict pieceId match) — replaced with same-type+color sibling matching in interaction.js"
    - "No cursor-following 3D preview mesh — implemented _createPreview, _updatePreviewPosition with smooth lerp + magnetic snap"
    - "No R-key piece rotation — implemented keydown listener with 90-degree increments and rotation validation"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Verify stud bump geometry renders on placed bricks"
    expected: "Each placed brick shows raised cylindrical studs on top face. geometry.js already contains stud geometry (STUD_RADIUS=2.4, STUD_HEIGHT=1.8, STUD_SEGMENTS=12). A previous human checkpoint (02-03) flagged this as missing — verify the geometry is now visible."
    why_human: "Requires running the 3D renderer to visually confirm studs appear. Cannot verify through static code inspection that the merged geometry is rendering correctly in the browser."
  - test: "Verify cursor-following 3D preview mesh appears and snaps correctly"
    expected: "After clicking a tray swatch, moving mouse over canvas shows a semi-transparent brick following the cursor. Preview snaps magnetically to ghost positions within 12mm. Preview disappears after placement."
    why_human: "Smooth lerp + magnetic snap behavior requires visual observation of the 3D scene at runtime."
  - test: "Verify R-key rotation works and 90/270 rotation is rejected"
    expected: "Pressing R while holding a piece rotates preview 90 degrees each press. Attempting placement at 90 or 270 degrees (not matching ghost orientation) shows a red flash rejection."
    why_human: "Rotation state and rejection logic are wired in code but require interactive testing to confirm the rotation validation (diff != 0 && diff != 180) triggers correctly for each step's ghost orientations."
  - test: "Verify position flexibility: step 1 — hold s1p1, click ghost at s1p2 position (gridZ=4)"
    expected: "Placement succeeds with green flash. The ghost at the s1p2 position is consumed. The s1p1 swatch remains in tray for the other ghost position."
    why_human: "Gap closure is implemented in code. Requires runtime verification that the sibling matching fires correctly and the tray updates as expected."
  - test: "Verify step 6 plate ghosts render above step 5 bricks"
    expected: "After completing steps 1-5, step 6 ghost overlays appear above the brick layer, not inside or below it. Layer math: step 5 brick-2x2 top = 4*9.6+9.6=48mm; step 6 plate-2x2 at layer 15 = 15*3.2=48mm."
    why_human: "Layer values are confirmed correct in JSON (15/16/17). Visual stacking in 3D scene requires running the app."
  - test: "Verify full 7-step mini-rocket build completes"
    expected: "All 7 steps can be completed, HUD shows 'Build complete!' after final step, tray is empty."
    why_human: "End-to-end build completion with all gap fixes applied requires human play-through."
---

# Phase 2: Core Build Loop Verification Report

**Phase Goal:** A user can pick a piece from a tray, see the ghost overlay showing where it goes, place it on the grid, and advance through all steps of a build
**Verified:** 2026-04-05T12:00:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (plans 02-04 and 02-05)

## Re-verification Summary

This is a re-verification following gap closure. The previous verification (status: gaps_found) identified three code-level gaps. Plans 02-04 and 02-05 closed all three gaps. All previously failing roadmap success criteria now pass automated checks. Human verification items remain for runtime visual confirmation.

| Previous Gap | Closed By | Verification |
|---|---|---|
| Step 6 plate layer bug (layers 10/11/12) | 02-04, Task 1 | mini-rocket.json step 6 layers now 15/16/17 — CONFIRMED |
| Position flexibility (strict pieceId match) | 02-04, Task 2 | interaction.js now uses type+color sibling matching — CONFIRMED |
| No cursor-following 3D preview mesh | 02-05, Task 1 | `_createPreview`, `_updatePreviewPosition` implemented — CONFIRMED |
| No R-key piece rotation | 02-05, Task 1 | keydown 'r'/'R' handler with 90-degree increments — CONFIRMED |

---

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|---|---|---|
| SC-1 | User can click a piece in the tray and see it highlighted as held; camera remains usable while no piece is held | VERIFIED | tray.js adds `.selected` class on `holdPiece()`; interaction.js event listeners on canvas only (pointerdown/up/move); OrbitControls from Phase 1 remain active |
| SC-2 | A ghost overlay appears on the model showing exactly where the current step's piece belongs, from any camera angle, with no z-fighting | VERIFIED | ghost.js: `opacity:0.35`, `depthWrite:false`, `renderOrder:1`, `side:THREE.DoubleSide`. `showStepGhosts()` shows all step pieces simultaneously. No geometry.dispose() calls. |
| SC-3 | User can click a valid grid position to snap the held piece into place — piece locks with visual confirmation and the step advances | VERIFIED | `_confirmPlacement`: opaque MeshStandardMaterial, green flash (#4caf50, 0.4s GSAP), `placeBrick` + `advanceStep`. Sibling flexibility allows same-type+color ghost swapping. Step 6 plate layers corrected to 15/16/17. |
| SC-4 | Clicking an invalid grid position shows a visual rejection (no snap, error indication) | VERIFIED | `_rejectPlacement`: red flash (#e53935, 0.3s GSAP) on wrong-piece ghost click; silent for empty-space clicks. Additional validation: rotation must be 0 or 180 (not 90/270), and layer > 0 requires support below. |
| SC-5 | The instruction panel shows the current step number out of total steps and updates correctly when the step advances | VERIFIED | hud.js `renderHUD()` renders "Step N of M" with description and progress bar; `onStepAdvance` callback triggers re-render; `aria-live="polite"` on counter element |

**Score:** 5/5 roadmap success criteria verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `frontend/src/state.js` | Step state machine, 13 exported functions | VERIFIED | All 13 exports present and substantive: loadSet, getCurrentStep, getTotalSteps, getCurrentStepNumber, holdPiece, releasePiece, getHeldPieceId, isOccupied, placeBrick, advanceStep, getPlacedThisStep, isStepComplete, isBuildComplete |
| `frontend/src/ghost.js` | Ghost overlay management, 5 exported functions | VERIFIED | All 5 exports: showGhost, hideGhost, showStepGhosts, hideAllGhosts, getGhostMeshes. `depthWrite:false`, `renderOrder:1`, `opacity:0.35`. No geometry.dispose(). |
| `frontend/src/interaction.js` | Raycaster, click disambiguation, placement, preview, rotation | VERIFIED | Exports initInteraction, getPlacedMeshes. CLICK_THRESHOLD_PX=5. Sibling matching. Preview mesh system. R-key rotation. Layer support check. Rotation validation. |
| `frontend/src/tray.js` | HTML piece tray renderer | VERIFIED | Exports initTray, renderTray. Skips placed pieces. Selected state. e.stopPropagation(). title accessibility. |
| `frontend/src/hud.js` | HTML instruction panel renderer | VERIFIED | Exports initHUD, renderHUD. Three states: loading/complete/normal. aria-live="polite". Progress bar at Math.round((N/M)*100)%. |
| `frontend/src/main.js` | Application entry point, fetches set, wires modules | VERIFIED | fetch('/api/sets/mini-rocket'). loadSet, initInteraction, initTray, initHUD all called. No stressTest import. |
| `frontend/index.html` | DOM containers for tray and HUD overlays | VERIFIED | id="hud", id="tray", class="tray-items". CSS: position:fixed for both. #tray height:72px, #hud bg rgba(22,33,62,0.88). .tray-item.selected with 2px #e94560 border. |
| `sets/mini-rocket.json` | Corrected step 6 plate layer values | VERIFIED | Step 6 pieces: s6p1 layer=15, s6p2 layer=16, s6p3 layer=17. Steps 1-5 and 7 unchanged. |

---

## Key Link Verification

### Plan 02-01 Key Links

| From | To | Via | Status | Details |
|---|---|---|---|---|
| state.js | grid.js | import gridKey, DIMS | WIRED | Line 1: `import { gridKey, DIMS } from './grid.js'` |
| ghost.js | geometry.js | import getGeometry | WIRED | Line 3: `import { getGeometry } from './geometry.js'` |
| ghost.js | grid.js | import gridToWorld | WIRED | Line 4: `import { gridToWorld } from './grid.js'` |
| ghost.js | scene.js | import getScene | WIRED | Line 2: `import { getScene } from './scene.js'` |

### Plan 02-02 Key Links

| From | To | Via | Status | Details |
|---|---|---|---|---|
| interaction.js | state.js | multiple imports | WIRED | Lines 6-10: getHeldPieceId, getCurrentStep, placeBrick, isStepComplete, advanceStep, releasePiece, isBuildComplete, getPlacedThisStep, isOccupied |
| interaction.js | ghost.js | import getGhostMeshes, hideGhost, etc. | WIRED | Line 11: `import { getGhostMeshes, hideGhost, showStepGhosts, hideAllGhosts } from './ghost.js'` |
| interaction.js | geometry.js | import getGeometry | WIRED | Line 4: `import { getGeometry } from './geometry.js'` |
| interaction.js | grid.js | import gridToWorld, DIMS | WIRED | Line 5: `import { gridToWorld, DIMS } from './grid.js'` (Note: DIMS added by 02-05 for layer support checks) |

### Plan 02-03 Key Links

| From | To | Via | Status | Details |
|---|---|---|---|---|
| main.js | /api/sets/mini-rocket | fetch call | WIRED | Line 34: `fetch('/api/sets/mini-rocket')` |
| main.js | state.js | import loadSet, getCurrentStep | WIRED | Line 2: `import { loadSet, getCurrentStep } from './state.js'` |
| main.js | interaction.js | import initInteraction | WIRED | Line 4: `import { initInteraction } from './interaction.js'` |
| tray.js | state.js | import holdPiece, getHeldPieceId, etc. | WIRED | Line 1: `import { getCurrentStep, holdPiece, getHeldPieceId, getPlacedThisStep } from './state.js'` |
| tray.js | ghost.js | import showStepGhosts | WIRED | Line 2: `import { showStepGhosts } from './ghost.js'` |

### Plan 02-04 Key Links

| From | To | Via | Status | Details |
|---|---|---|---|---|
| interaction.js | state.js | import getCurrentStep, placeBrick | WIRED | Already present; sibling matching uses `getCurrentStep().pieces.find(...)` |
| ghost.js | sets/mini-rocket.json | gridToWorld uses piece.layer | WIRED | `showGhost` calls `gridToWorld(piece.gridX, piece.gridZ, piece.layer, piece.type)`; layer data corrected in JSON |

### Plan 02-05 Key Links

| From | To | Via | Status | Details |
|---|---|---|---|---|
| interaction.js | scene.js | getScene() for preview mesh | WIRED | `_createPreview` calls `getScene().add(_previewMesh)` |
| interaction.js | geometry.js | getGeometry for preview mesh | WIRED | `_createPreview` calls `getGeometry(pieceType)` |
| interaction.js | grid.js | gridToWorld for placement position | WIRED | `_confirmPlacement` calls `gridToWorld(...)`. Note: Plan 05 acceptance criteria specified `worldToGrid` for cursor snapping, but implementation used `THREE.Plane` intersection instead — documented deviation, functionally equivalent. |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| hud.js renderHUD | totalSteps, stepNumber, step.description | getTotalSteps(), getCurrentStepNumber(), getCurrentStep() — populated by loadSet(setData) | Yes — setData from live fetch to /api/sets/mini-rocket | FLOWING |
| tray.js renderTray | step.pieces | getCurrentStep() from state.js | Yes — loaded from real set JSON | FLOWING |
| interaction.js _confirmPlacement | piece.color, piece.type, piece.gridX/Z/layer | getCurrentStep().pieces from state.js | Yes — piece data from step JSON, not hardcoded | FLOWING |
| ghost.js showGhost | piece.gridX, piece.gridZ, piece.layer | Piece objects from showStepGhosts(step) | Yes — real step data; step 6 layers now corrected | FLOWING |
| interaction.js _updatePreviewPosition | _previewMesh position | THREE.Plane intersection at build layer height → lerp/snap | Yes — computed from real cursor position and ghost positions | FLOWING |

---

## Behavioral Spot-Checks

Step 7b: SKIPPED — no runnable entry points without both Flask server and Vite dev server running simultaneously. The API endpoint `/api/sets/mini-rocket` requires Flask. Interactive behaviors (ghost overlay, placement flash, cursor preview, R-key rotation) require a browser environment.

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| BUILD-01 | 02-02 | Stud-grid snapping — bricks lock to valid 8mm grid positions only | SATISFIED | Placement uses `gridToWorld(piece.gridX, piece.gridZ, piece.layer, piece.type)` from step JSON — exact grid positions, no free-form placement |
| BUILD-02 | 02-02, 02-04, 02-05 | Valid placement feedback — visual confirmation on success, error indication on invalid drop | SATISFIED | Green flash (#4caf50, 0.4s) via GSAP lerpColors proxy; red flash (#e53935, 0.3s) on rejection; also rejects: wrong type, wrong rotation (90/270), midair (no support) |
| GUIDE-01 | 02-01 | Step state machine — tracks current step, advances on correct placement | SATISFIED | state.js 13 functions; `advanceStep()` called after `isStepComplete()` check in `_confirmPlacement` |
| GUIDE-02 | 02-01 | Ghost/transparent overlay showing where current piece goes | SATISFIED | ghost.js: opacity:0.35, depthWrite:false, renderOrder:1, DoubleSide — all step pieces shown simultaneously |
| GUIDE-03 | 02-03 | Instruction panel — step N of M with Next/Back navigation | PARTIALLY SATISFIED | hud.js shows "Step N of M" with description and progress bar. Note: no explicit Next/Back navigation buttons — advancement is placement-driven. This matches the Phase 2 interaction model where placing all pieces advances the step automatically. |
| UI-01 | 02-03 | Piece tray showing pieces for current step with correct colors | SATISFIED | tray.js renders .tray-swatch with piece.color backgroundColor; placed pieces removed from tray on re-render |
| UI-02 | 02-03, 02-05 | Piece-in-hand selection — picked piece highlighted with visual feedback | SATISFIED | .selected class (2px #e94560 border + rgba background); canvas cursor → crosshair when holding; cursor-following 3D preview mesh (opacity 0.5, renderOrder 2); R-key rotation |
| DATA-04 | 02-03 | Progress indicator — step N of M counter in instruction panel | SATISFIED | hud.js renderHUD() shows "Step N of M" with animated progress bar (width = Math.round((N/M)*100)%) |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| frontend/src/interaction.js | 137-151 | Layer support check compares against `ghostPiece.layer - 1` using the same `DIMS[ghostPiece.type]` | Info | The support check uses the ghost piece's layer, not a current build layer concept. This is intentional — placement is validated against the step data. Not a stub. |

No TODO/FIXME/placeholder comments. No empty handler stubs. No hardcoded empty data. No geometry.dispose() on shared cache geometry in ghost.js or interaction.js.

**Notable deviation from plan (not a gap):** Plan 05 acceptance criteria specified `worldToGrid` for cursor grid-snapping. The implementation uses `THREE.Plane` intersection with smooth lerp + magnetic snap instead. This deviation is documented in the 02-05 SUMMARY and was confirmed by human verification as superior UX. `worldToGrid` is not imported into interaction.js, but the cursor preview functionality is fully working through the plane-intersection approach.

---

## Human Verification Required

### 1. Stud Bump Geometry

**Test:** Start both servers (`flask run` in project root, `npm run dev` in frontend/), open http://localhost:5173, complete step 1 (place 2 gray bricks). Inspect placed bricks from multiple camera angles.
**Expected:** Each brick shows raised cylindrical studs on top face. geometry.js includes stud geometry (STUD_RADIUS=2.4, STUD_HEIGHT=1.8, STUD_SEGMENTS=12 via CylinderGeometry merged with BufferGeometryUtils). Previous checkpoint (02-03) reported this as missing, but the code was already present in Phase 1 — needs confirmation that it now renders correctly.
**Why human:** 3D geometry rendering (merged stud cylinders) cannot be verified from static code inspection.

### 2. Cursor-Following 3D Preview Mesh

**Test:** Click any tray swatch to hold a piece. Move mouse across the canvas.
**Expected:** A semi-transparent brick (opacity 0.5) follows the cursor, snapping instantly to ghost positions when within 12mm, smoothly lerping (factor 0.3) otherwise. Preview hides when cursor leaves the build plane. Preview disappears after placement.
**Why human:** Smooth lerp and magnetic snap dynamics require runtime observation.

### 3. R-Key Rotation and Rotation Validation

**Test:** Hold a piece. Press R multiple times. Attempt to place with 90-degree rotation active (2 presses from ghost orientation).
**Expected:** Preview rotates 90 degrees per R press. Placement with 90 or 270 degree offset from ghost shows red flash. Placement at 0 or 180 offset succeeds.
**Why human:** Requires testing each rotation state interactively.

### 4. Position Flexibility — Same-Type Sibling Placement

**Test:** In step 1, click first gray swatch (s1p1). Click the ghost at the SECOND position (gridZ=4, s1p2's position).
**Expected:** Brick placed at second position with green flash. First swatch stays in tray for remaining ghost. Click first swatch again, click remaining ghost — step advances.
**Why human:** Requires interactive confirmation that the sibling swap fires correctly and tray updates appropriately.

### 5. Step 6 Ghost Position Above Step 5 Bricks

**Test:** Complete steps 1-5. Observe ghost overlay for step 6.
**Expected:** Three plate-2x2 ghosts appear stacked above step 5's brick-2x2 bricks. JSON layers 15/16/17 compute to y=48/51.2/54.4mm; step 5 brick top = 48mm. Ghosts should NOT appear inside the existing bricks.
**Why human:** 3D spatial stacking requires visual confirmation in the rendered scene.

### 6. Full 7-Step Build Completion

**Test:** Complete all 7 steps of mini-rocket. Step 7 has slopes at rotations 0, 180, 90, 270.
**Expected:** Steps 1-7 all completable. After final step, HUD shows "Build complete!", tray is empty, no console errors.
**Why human:** End-to-end integration test with all gap fixes active requires human play-through, especially step 7 with non-zero-rotation pieces to validate rotation acceptance/rejection.

---

## Gaps Summary

No code-level gaps remain. All three gaps from the previous verification have been closed:

1. Step 6 data bug — CLOSED: mini-rocket.json step 6 layers corrected to 15/16/17 (confirmed in file).
2. Position flexibility — CLOSED: interaction.js now allows same-type+color sibling placement at any ghost of the same type within the current step (confirmed in code).
3. 3D interactions — CLOSED: cursor-following preview mesh and R-key rotation implemented in interaction.js (confirmed: _createPreview, _updatePreviewPosition, keydown 'r'/'R' handler, all present and substantive).

All 5 roadmap success criteria now pass automated code-level checks. Status is `human_needed` because the visual and interactive behaviors must be confirmed at runtime before the phase can be marked passed.

---

_Verified: 2026-04-05T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
_Mode: Re-verification (all previous gaps closed)_
