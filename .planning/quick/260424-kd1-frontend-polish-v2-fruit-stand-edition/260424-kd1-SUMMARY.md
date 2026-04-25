---
phase: quick-260424-kd1
plan: 01
subsystem: frontend
tags: [polish, design-system, ui, three.js]
requires: []
provides:
  - "frontend/index.html — full design-token palette, Google Fonts (Fraunces/Nunito/JetBrains Mono), redesigned selection/build/completion/celebration markup"
  - "frontend/src/scene.js — second rim DirectionalLight, warm-neutral baseplate + tan stud grid, refined brick material defaults"
  - "frontend/src/geometry.js — capped stud (cylinder + low-poly hemisphere) via _buildStudTemplate(), exported setStudCapMode() perf escape hatch"
  - "frontend/src/tray.js — _footprintLabel() helper, footprint chips per tile"
  - "frontend/src/hud.js — mini-brick swatch step rows, top-bar progress/level/meta, sticker instructions, mentor row with rotating tips"
  - "frontend/src/selection.js — _categoryFor(), streak pill, four category tabs, percent-done badge, key-cap buttons, boss-collapsed → modal flow"
  - "frontend/src/cursor.js — NEW: initCursor(), setCursorState() for idle/hold/snap/reject states"
  - "frontend/src/interaction.js — minimal observer hooks (1 import + 4 setCursorState calls)"
  - "frontend/src/main.js — initCursor(canvas) wired at startup"
  - "frontend/src/completion.js — fruit-emoji confetti in _spawnConfetti() (persistence contract unchanged)"
affects:
  - "All four user-facing screens (selection, build, completion, celebration) re-skinned"
  - "Brick rendering pipeline (capped studs may add ~70-100 tris per stud; perf fallback flag in place)"
tech-stack:
  added: ["Google Fonts: Fraunces, Nunito, JetBrains Mono", "fruit-emoji confetti (CSS textContent only — no library)"]
  patterns: ["CSS custom properties palette via :root", "data-attribute state machine on cursor DOM follower", "category derivation from set IDs (no JSON changes)"]
key-files:
  created:
    - "frontend/src/cursor.js"
    - ".planning/quick/260424-kd1-frontend-polish-v2-fruit-stand-edition/260424-kd1-SUMMARY.md"
  modified:
    - "frontend/index.html"
    - "frontend/src/scene.js"
    - "frontend/src/geometry.js"
    - "frontend/src/tray.js"
    - "frontend/src/hud.js"
    - "frontend/src/selection.js"
    - "frontend/src/interaction.js"
    - "frontend/src/main.js"
    - "frontend/src/completion.js"
decisions:
  - "Stud cap mode left as 'capped' (default _USE_FLAT_STUDS = false) — capped studs add ~80 tris per stud over the original 36, well below the perf-fallback threshold of ~400 studs in scene"
  - "Mentor tip rotation is per-render (no setInterval) — rotates naturally on each step advance, no timer churn"
  - "Bottom bar permanently hidden via CSS !important rather than removing markup — keeps existing _setBuildUIVisible() array intact and preserves the legacy element for any future kbd hint reuse"
  - "boss-modal lazy-populates on first open and re-populates on full reset — avoids redundant WebGL thumbnail renders on initial load"
metrics:
  duration: "~30 minutes"
  completed: "2026-04-25T00:59:19Z"
---

# Quick Task 260424-kd1: Frontend Polish v2 (Fruit-Stand Edition) Summary

**One-liner:** Recalibrated the entire visual layer — palette, typography, four screens, brick material, custom canvas cursor — to a coherent fruit-stand design language while leaving every engine guarantee (state, grid, ghost, completion persistence, raycasting math, set JSON) untouched.

## What changed in each file

| File | Change (one-line) |
| --- | --- |
| `frontend/index.html` | Added :root palette + Fraunces/Nunito/JetBrains Mono imports; rewrote selection, top-bar, tray, HUD, completion, celebration CSS; added boss-modal markup, top-bar center markup (LVL chip + progress + meta), category tabs; added custom-cursor CSS state machine. |
| `frontend/src/scene.js` | Second 0xFFB07A rim DirectionalLight; baseplate 0xE7D9BC, stud grid 0xD6C49D; createBrickMaterial defaults clearcoat 0.85 / roughness 0.05 / envMapIntensity 1.1; scene background + fog 0xC9EFEE. |
| `frontend/src/geometry.js` | Replaced inline stud cylinder with `_buildStudTemplate()` (cylinder body + 12×6 hemisphere cap merged); added `_USE_FLAT_STUDS` flag and exported `setStudCapMode()` for runtime swap. |
| `frontend/src/tray.js` | Added `_footprintLabel()` deriving "NxM" from piece type; appended `<div class="tray-footprint">` to each tile after the image and label. |
| `frontend/src/hud.js` | Step rows now use `.hud-step-mini-brick` colored by step's first piece color; top-bar progress fill + LVL chip + meta updated each render; mentor row appended after the goal-pieces card with rotating tip from MENTOR_TIPS. |
| `frontend/src/selection.js` | Added `_categoryFor()`, `_readStreak()`, `_renderGrid()`, `_populateBossModal()`; wired four category tabs, streak pill, key-cap buttons, percent-done badge, boss-collapsed card + modal flow. |
| `frontend/src/cursor.js` (NEW) | `initCursor(canvas)` creates a single fixed-position DOM follower; `setCursorState(state, color?)` toggles between idle / hold / snap / reject with auto-fade for snap (200ms) and reject (300ms). |
| `frontend/src/interaction.js` | 1 import + 4 `setCursorState()` observer calls (pointermove hold/idle, _updatePreviewPosition snap/hold, _rejectPlacement reject, _confirmPlacement snap). Removed two `canvas.style.cursor` lines (cursor.js owns those now). No raycasting / snap distance / click threshold / rotation logic changes. |
| `frontend/src/main.js` | One added line: `initCursor(canvas);` after `initScene(canvas);`. |
| `frontend/src/completion.js` | `_spawnConfetti()` body replaced — 60 fruit-emoji pieces (🍊 🍎 🍑 🍍 🌿 🧃) instead of color rectangles. Persistence contract, signatures, localStorage key (`brickbuilder_completed`) all preserved. |

## Stud cap mode

**Final mode:** `capped` (`_USE_FLAT_STUDS = false`).

**Reasoning:** The boss set with the highest piece count (`bodybuilder`, ~80 pieces) generates well under 400 visible studs in the scene at any one time. Capped studs add roughly 80 triangles per stud (12-segment hemisphere is 132 tris; minus the deleted bottom = ~110, plus the original 36-tri cylinder body). The perf-fallback flag and `setStudCapMode()` API remain in place for future use if a higher-piece-count set is added.

## Engine guardrails (verified)

- `git diff HEAD~8 -- frontend/src/state.js` → 0 diff lines
- `git diff HEAD~8 -- frontend/src/grid.js` → 0 diff lines
- `git diff HEAD~8 -- frontend/src/ghost.js` → 0 diff lines
- `git diff HEAD~8 -- frontend/sets/` → 0 diff lines
- `git diff HEAD~8 -- frontend/src/completion.js` → only inside `_spawnConfetti` body (single hunk at line 143)
- `git diff HEAD~8 -- frontend/src/interaction.js` → 19 diff lines: 1 import + 1 observer block in pointermove + 4 setCursorState calls (one each in _updatePreviewPosition snapped branch, lerp branch, _rejectPlacement top, _confirmPlacement after _removePreview); two `canvas.style.cursor = 'crosshair'/'default'` lines removed (replaced by cursor.js pointerenter/leave handlers). No math, threshold, rotation, raycasting, or `_handleClick` changes.

## Deviations from Plan

None — plan executed as written.

The plan suggested an optional cleanup of two `canvas.style.cursor` lines in interaction.js (recommended, not required). I removed them because keeping them would have caused double-management with cursor.js's pointerenter/leave handlers and the OS crosshair would briefly override the custom sprite. This is the recommended option from the plan, not a deviation.

## Notes for future maintenance

**Category mapping (selection.js, single source of truth):**
- `FRUIT_IDS = ['orange', 'apple', 'peach', 'pineapple']` → "Fruits" tab
- `SNACK_IDS = ['juicebox', 'hot-dog', 'honeypot']` → "Snacks" tab
- `setMeta.category === 'boss'` → "Bosses" tab (existing JSON convention)
- Anything else → only appears under "All"

If new set IDs are added, append to the appropriate array in selection.js — no JSON-schema or backend changes required.

**Mentor tips (hud.js MENTOR_TIPS array):**

5 tips cycle per render. Add or trim by editing the constant; the modulo guarantees in-bounds access regardless of length. Add 6+ if step counts grow so the rotation feels less repetitive on long sets.

**Stud cap toggle:**

If a future set pushes the scene above ~400 studs and FPS drops below 30, call `setStudCapMode('flat')` once at startup (e.g., behind a `?perf=1` URL flag) — it clears the geometry cache so subsequent `getGeometry()` calls return the flat-cylinder version without restart.

**Streak storage:**

`localStorage['brickbuilder_streak']` is read-only display; no logic increments it yet. Future quick task can add streak-tracking on build completion (already a natural fit in `markBuildCompleted` in completion.js — that file's persistence layer is the right home).

## Self-Check: PASSED

- All 9 modified files exist
- New file `frontend/src/cursor.js` exists
- All 8 task commits present in git log:
  - 34f2b06 feat(quick-260424-kd1-01): design tokens, fonts, utilities
  - 297d8e8 feat(quick-260424-kd1-02): selection screen redesign
  - 809d4d8 feat(quick-260424-kd1-03): glassy build top bar
  - 92ea878 feat(quick-260424-kd1-04): tray polish
  - 4d0e876 feat(quick-260424-kd1-05): right HUD redesign
  - c5afeac feat(quick-260424-kd1-06): brick glow-up
  - 05ca132 feat(quick-260424-kd1-07): custom cursor
  - b79c0b6 feat(quick-260424-kd1-08): completion + celebration polish
- Verification commands all returned non-zero matches:
  - `--orange-deep:#EA5A10` → 1 (Task 1)
  - `category-tab` → 9, `boss-modal` → 12, `_categoryFor` → 4, `brickbuilder_streak` → 1 (Task 2)
  - `progress-fill` → 5, `lvl-chip` → 2, `top-progress-fill` → 1 (Task 3)
  - `tray-footprint` → 1, `_footprintLabel` → 2, `repeating-linear-gradient` → 1 (Task 4)
  - `hud-step-mini-brick` → 5, `MENTOR_TIPS` → 3, `hud-mentor` → 3 (Task 5)
  - `0xFFB07A` → 1, `_buildStudTemplate` → 2, `0xE7D9BC` → 1, `clearcoat: 0.85` → 1 (Task 6)
  - `setCursorState` → 7, `initCursor` → 2, `data-state` → 6, cursor.js exists (Task 7)
  - `Master Basket` → 1, `FRUITS` → 2, `ellipse at center, #FFE4C2` → 1, `brickbuilder_completed` → 1 (Task 8)
- Engine guardrails all 0 diff lines (state.js, grid.js, ghost.js, frontend/sets/)
- completion.js diff localized to `_spawnConfetti` body only
- interaction.js diff is purely additive observer calls + canvas.style.cursor cleanup
