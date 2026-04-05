---
phase: 02-core-build-loop
plan: "03"
subsystem: frontend-ui
tags: [tray, hud, overlay, main-bootstrap, build-loop]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [tray-renderer, hud-renderer, app-bootstrap]
  affects: [frontend/src/tray.js, frontend/src/hud.js, frontend/src/main.js, frontend/index.html]
tech_stack:
  added: []
  patterns:
    - vanilla HTML/CSS overlays over Three.js canvas via position:fixed
    - DOM innerHTML clear-and-repopulate pattern for reactive tray/HUD updates
    - async fetch with error fallback rendered into HUD
key_files:
  created:
    - frontend/src/tray.js
    - frontend/src/hud.js
  modified:
    - frontend/src/main.js
    - frontend/index.html
decisions:
  - Tray click uses e.stopPropagation() to prevent canvas pointerup from firing and misinterpreting tray clicks as placement attempts
  - showStepGhosts called on every tray item click (not just first selection) so ghost set always matches current step — handles edge case where ghosts were hidden and user re-clicks tray
  - renderHUD loading detection uses getTotalSteps() === 0 (no set loaded) rather than a separate flag, keeping state module as single source of truth
metrics:
  duration: "<5 minutes"
  completed_date: "2026-04-05"
  tasks_completed: 1
  tasks_total: 2
  files_changed: 4
verification_status: issues_found
---

# Phase 02 Plan 03: Tray, HUD, and Main Bootstrap Summary

HTML overlay tray (colored swatches, selected state, placed-piece skipping) and HUD instruction panel (loading/step/complete states, progress bar, aria-live) wired into refactored main.js that fetches mini-rocket set data and bootstraps all modules.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create tray.js, hud.js, update index.html, refactor main.js | 2b290af | frontend/src/tray.js, frontend/src/hud.js, frontend/src/main.js, frontend/index.html |

## Human Verification Result

**Task 2: Verify complete build loop — ISSUES FOUND**

The user tested the app at http://localhost:5173 and reported 5 issues:

| # | Issue | Severity |
|---|-------|----------|
| 1 | Bricks look like colored boxes — no stud bumps on top, no physical Lego feel | High |
| 2 | Position flexibility — for the same piece type, only one specific orientation/position is accepted; the other valid position is rejected | High |
| 3 | Step 6 data bug — brick location appears inside/overlapping previous bricks | High |
| 4 | No physical pick-up feel — selecting a piece in the tray does not show the brick following the mouse cursor in 3D space | Medium |
| 5 | No piece rotation — user cannot rotate a held piece to match target orientation | Medium |

These issues will be addressed in a gap-closure plan. This plan's code (tray.js, hud.js, main.js, index.html) is correct; the issues are in the 3D rendering layer (stud geometry), placement validation logic (position flexibility), set data (step 6 overlap), interaction layer (cursor-attached brick preview), and interaction/state (rotation support).

## What Was Built

**tray.js** — `initTray()` + `renderTray()`. Clears and repopulates `.tray-items` on each render call. For each unplaced piece in the current step: creates a `.tray-item` with a colored `.tray-swatch`, sets `title=piece.type` for accessibility, adds `.selected` class if this piece is held, calls `e.stopPropagation()` on click to prevent canvas bleed-through, calls `holdPiece()` + `showStepGhosts()` + `renderTray()` on selection.

**hud.js** — `initHUD()` + `renderHUD()`. Three render paths: loading (getTotalSteps()===0 and not complete → "Loading set..."), build complete (isBuildComplete()===true → "Build complete!"), normal (Step N of M + description + progress bar fill at Math.round((N/M)*100)%). Step counter element carries `aria-live="polite"` in all states.

**index.html** — Added `#hud` and `#tray` / `.tray-items` containers above the `<script>` tag. Added full overlay CSS: `#hud` fixed top-left (220px, rgba(22,33,62,0.88), border-radius:8px), `#tray` fixed bottom full-width (72px, #16213e), `.tray-item` 44px click targets, `.tray-item.selected` with 2px #e94560 border and rgba(233,69,96,0.15) background, `.tray-swatch` 40px swatches.

**main.js** — Removed stressTest import and call. Now: initScene → initTray/initHUD → renderHUD (loading state) → initInteraction (onStepAdvance/onBuildComplete callbacks re-render tray+HUD) → startBuild() async (fetch /api/sets/mini-rocket → loadSet → renderTray/renderHUD → showStepGhosts for first step). Error path renders "Error loading set" into HUD.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows from live fetch of /api/sets/mini-rocket. Tray renders real piece colors from set JSON. HUD renders real step counts and descriptions.

## Threat Flags

None — no new network endpoints, auth paths, or file access patterns introduced beyond the fetch to local Flask already specified in the plan's threat model.

## Self-Check: PASSED

- frontend/src/tray.js: FOUND
- frontend/src/hud.js: FOUND
- frontend/src/main.js: FOUND (modified)
- frontend/index.html: FOUND (modified)
- Commit 2b290af: FOUND (verified via git log)
- tray exports initTray, renderTray: VERIFIED (node import check passed)
- hud exports initHUD, renderHUD: VERIFIED (node import check passed)
- main.js contains fetch('/api/sets/mini-rocket'): VERIFIED
- main.js does NOT contain runStressTest: VERIFIED
- index.html contains id="hud", id="tray", class="tray-items": VERIFIED
- All CSS values match UI-SPEC: VERIFIED
