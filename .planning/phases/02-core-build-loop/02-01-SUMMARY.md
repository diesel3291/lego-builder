---
phase: 02-core-build-loop
plan: 01
subsystem: ui
tags: [three.js, state-machine, ghost-overlay, lego-grid, transparency]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: grid.js (DIMS, gridKey, gridToWorld), geometry.js (getGeometry), scene.js (getScene)

provides:
  - state.js: step state machine with placed-cell registry, held piece tracking, 13 exported functions
  - ghost.js: transparent overlay mesh management, 5 exported functions

affects: [02-02, 02-03, interaction.js, tray.js, hud.js, main.js]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared geometry cache pattern: ghost.js uses geometry references from cache, never clones or disposes"
    - "depthWrite:false + renderOrder:1 for transparent overlay z-fighting prevention"
    - "Set-based occupancy registry using gridKey strings for O(1) collision detection"
    - "Per-step placement tracking cleared on advanceStep to isolate step-level completion gating"

key-files:
  created:
    - frontend/src/state.js
    - frontend/src/ghost.js
  modified: []

key-decisions:
  - "Ghost geometry is never cloned or disposed — always uses the shared cache reference from geometry.js"
  - "showStepGhosts calls hideAllGhosts first to avoid accumulating stale meshes across steps"
  - "placeBrick marks ALL cells a piece occupies (not just corner cell) using nested DIMS loop"
  - "advanceStep clears both _placedThisStep and _heldPieceId to prevent state bleed between steps"

patterns-established:
  - "Ghost material: opacity:0.35, depthWrite:false, side:DoubleSide, renderOrder:1"
  - "Geometry reference (not clone) from getGeometry() cache"
  - "gridKey(x, z, layer) as Set key for O(1) occupancy checks"

requirements-completed: [GUIDE-01, GUIDE-02]

# Metrics
duration: 12min
completed: 2026-04-05
---

# Phase 02 Plan 01: State Machine and Ghost Overlay Summary

**Step state machine with per-cell occupancy registry and transparent ghost mesh system using depthWrite:false and shared geometry cache**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-05T00:00:00Z
- **Completed:** 2026-04-05T00:12:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `state.js` with 13 exported functions serving as the single source of truth for all build state
- `placeBrick` marks every stud cell a piece occupies via nested DIMS loop, enabling accurate collision detection
- Created `ghost.js` with 5 exported functions rendering transparent step-guide overlays with proper z-fighting prevention
- Ghost meshes use shared geometry cache reference (never cloned/disposed), preventing memory fragmentation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create state.js step state machine** - `d6b8a8a` (feat)
2. **Task 2: Create ghost.js transparent overlay module** - `1409d99` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `frontend/src/state.js` - Step state machine: loadSet, getCurrentStep, getTotalSteps, getCurrentStepNumber, holdPiece, releasePiece, getHeldPieceId, isOccupied, placeBrick, advanceStep, getPlacedThisStep, isStepComplete, isBuildComplete
- `frontend/src/ghost.js` - Ghost overlay management: showGhost, hideGhost, showStepGhosts, hideAllGhosts, getGhostMeshes

## Decisions Made
- Ghost geometry uses the cached reference from geometry.js, not a clone. Disposing it would corrupt the cache shared across all brick renders.
- `showStepGhosts` always calls `hideAllGhosts` first so step transitions never leave orphaned ghost meshes in the scene.
- `placeBrick` uses `DIMS[piece.type]` to mark all stud cells, not just the anchor corner. This is required for correct `isOccupied` checks against future placements.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `state.js` and `ghost.js` are fully ready for import by `interaction.js`, `tray.js`, `hud.js`, and `main.js` in plans 02-02 and 02-03
- Ghost raycaster targets exposed via `getGhostMeshes()` — interaction.js can include these in its raycast array
- No blockers for the next plan

---
*Phase: 02-core-build-loop*
*Completed: 2026-04-05*

## Self-Check: PASSED

- FOUND: frontend/src/state.js
- FOUND: frontend/src/ghost.js
- FOUND: .planning/phases/02-core-build-loop/02-01-SUMMARY.md
- FOUND commit: d6b8a8a (feat(02-01): create state.js step state machine)
- FOUND commit: 1409d99 (feat(02-01): create ghost.js transparent overlay module)
