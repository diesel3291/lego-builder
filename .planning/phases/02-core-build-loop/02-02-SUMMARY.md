---
phase: 02-core-build-loop
plan: 02
subsystem: ui
tags: [three.js, interaction, raycasting, click-disambiguation, gsap, placement-validation]

# Dependency graph
requires:
  - phase: 02-core-build-loop
    plan: 01
    provides: state.js (getHeldPieceId, getCurrentStep, placeBrick, isStepComplete, advanceStep, releasePiece, isBuildComplete), ghost.js (getGhostMeshes, hideGhost, showStepGhosts, hideAllGhosts)
  - phase: 01-foundation
    provides: scene.js (getScene, getCamera, getRenderer), geometry.js (getGeometry), grid.js (gridToWorld)

provides:
  - interaction.js: pointer-delta click disambiguation, ghost-mesh raycasting, placement validation, green/red flash feedback

affects: [02-03, main.js, tray.js, hud.js]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pointer-delta disambiguation: pointerdown/up delta measured in px; dist < 5 = click, >= 5 = orbit drag"
    - "Ghost-only raycasting: intersectObjects targets ghost meshes only, user confirms by clicking ghost (RESEARCH.md OQ3)"
    - "GSAP lerpColors proxy pattern for reliable THREE.Color animation (avoids direct tween on Color object)"
    - "NDC computed fresh from window.innerWidth/Height on every click (never cached - Pitfall 4)"
    - "Per-brick MeshStandardMaterial created at placement time; cached geometry shared from geometry.js"

key-files:
  created:
    - frontend/src/interaction.js
  modified: []

key-decisions:
  - "GSAP color tween uses proxy {t:0} + lerpColors pattern instead of direct gsap.to(material.color) for compatibility"
  - "Raycasting targets ghost meshes only — user clicks the ghost position to confirm, not arbitrary canvas click-to-place"
  - "piece.rotation defaults to 0 if undefined (mesh.rotation.y = THREE.MathUtils.degToRad(piece.rotation || 0))"
  - "Callbacks (onStepAdvance, onBuildComplete) passed at init time to avoid circular imports with main.js"

requirements-completed: [BUILD-01, BUILD-02]

# Metrics
duration: ~2min
completed: 2026-04-05
---

# Phase 02 Plan 02: Interaction Module Summary

**Raycaster-based brick placement with pointer-delta click disambiguation, ghost-mesh confirmation UX, and GSAP color flash feedback**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-05T00:00:00Z
- **Completed:** 2026-04-05T00:02:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `interaction.js` wiring mouse events to state mutations and scene changes
- Pointer-delta disambiguation prevents orbit drags from triggering placement (threshold: 5px)
- Raycasting targets only ghost meshes — "click ghost to confirm" UX from RESEARCH.md OQ3
- `_confirmPlacement`: creates opaque `MeshStandardMaterial` brick, green flash (0x4caf50) at 0.4s, calls `placeBrick` + `releasePiece`, advances step/build when complete
- `_rejectPlacement`: red flash (0xe53935) at 0.3s on wrong-piece ghost click; silent no-op on empty-space click
- Cursor changes to `crosshair` when piece is held, `default` when not
- Callbacks (`onStepAdvance`, `onBuildComplete`) allow main.js to trigger tray/hud re-renders without circular imports

## Task Commits

Each task was committed atomically:

1. **Task 1: Create interaction.js with click disambiguation and raycasting** - `535f49f` (feat)

## Files Created/Modified

- `frontend/src/interaction.js` — Exports: `initInteraction(options)`, `getPlacedMeshes()`
  - Private: `_handleClick`, `_confirmPlacement`, `_rejectPlacement`
  - Event listeners: `pointerdown`, `pointerup`, `pointermove` on canvas

## Decisions Made

- GSAP color tween uses proxy `{t:0}` + `lerpColors` pattern. Direct `gsap.to(material.color, {...})` may not reliably track THREE.Color properties; the proxy pattern is the safe fallback documented in RESEARCH.md Assumption A1.
- Ghost meshes are the sole raycast target array. The baseplate and placed bricks are excluded — user always places by clicking the transparent guide position.
- `piece.rotation || 0` defensive default ensures graceful handling if step JSON omits rotation field.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written. The GSAP fallback proxy pattern was used from the start (plan explicitly documented it as the preferred safe approach for RESEARCH.md Assumption A1).

## Known Stubs

None — no stub data, hardcoded empty values, or placeholder text in the created file.

## Threat Flags

None — no new security surface beyond what the threat model documented in the plan covers.

---
*Phase: 02-core-build-loop*
*Completed: 2026-04-05*

## Self-Check: PASSED

- FOUND: frontend/src/interaction.js
- FOUND: .planning/phases/02-core-build-loop/02-02-SUMMARY.md
- FOUND commit: 535f49f (feat(02-02): add interaction.js with click disambiguation and raycasting)
