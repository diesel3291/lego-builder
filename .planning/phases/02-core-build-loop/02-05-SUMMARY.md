---
phase: 02-core-build-loop
plan: "05"
subsystem: ui
tags: [three.js, raycasting, preview-mesh, interaction, cursor, keyboard]
dependency_graph:
  requires:
    - phase: 02-04
      provides: sibling-piece-flexibility and correct ghost positions
    - phase: 02-02
      provides: interaction.js with click disambiguation and raycasting
    - phase: 02-01
      provides: ghost overlay and state machine
  provides:
    - cursor-following-3d-preview-mesh
    - r-key-rotation-90-degree-increments
    - smooth-cursor-tracking-with-ghost-magnetism
    - layer-support-validation
    - 180-degree-symmetric-placement
  affects:
    - frontend/src/interaction.js
tech_stack:
  added: []
  patterns:
    - "Preview mesh uses opacity 0.5, depthWrite false, DoubleSide, renderOrder 2 (above ghosts at renderOrder 1)"
    - "THREE.Plane raycast at build layer height for accurate cursor tracking"
    - "Smooth lerp interpolation with magnetic snap near ghost positions (SNAP_DISTANCE 12mm)"
    - "Geometry never disposed in _removePreview — geometry.js cache owns lifetime; only material disposed"

key_files:
  created: []
  modified:
    - frontend/src/interaction.js

key-decisions:
  - "Preview follows cursor smoothly via lerp, snaps magnetically to ghosts within 12mm"
  - "Raycast plane height adjusts to current build layer — cursor stays accurate at all heights"
  - "Only 0° and 180° rotation accepted for placement — 90°/270° rejected with red flash"
  - "Pieces at layer > 0 require at least one occupied cell below — no midair placement"
  - "_previewRotation resets on placement only (not on _removePreview) — allows user to pre-rotate"

patterns-established:
  - "Preview mesh pattern: opacity 0.5, depthWrite false, DoubleSide, renderOrder 2"
  - "R-key rotation: 90-degree increments stored as degrees, converted to radians via THREE.MathUtils.degToRad"
  - "Layer support check: isOccupied on layer-1 cells before allowing placement"

requirements-completed: [UI-02, GUIDE-01, GUIDE-02, GUIDE-03, DATA-04]

metrics:
  duration: "~30 minutes"
  completed: "2026-04-05"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 1
---

# Phase 02 Plan 05: 3D Preview Mesh and R-Key Rotation Summary

**Cursor-following 3D preview with smooth tracking, magnetic ghost snap, R-key rotation, layer support validation, and 180° symmetric placement.**

## Performance

- **Duration:** ~30 minutes
- **Completed:** 2026-04-05
- **Tasks:** 2 of 2
- **Files modified:** 1

## Accomplishments

- Preview mesh follows cursor smoothly via lerp interpolation, snaps magnetically to ghost positions within 12mm
- Raycast plane adjusts to current build layer height — accurate cursor tracking at all layers
- R-key rotates preview 90° increments; only 0° and 180° accepted for placement (90°/270° rejected with red flash)
- Layer support validation — pieces at layer > 0 require occupied cells below (no midair floating)
- 180° rotation placement accepted for symmetric rectangular pieces (matches real Lego)
- Preview uses opacity 0.5, depthWrite false, DoubleSide, renderOrder 2

## Task Commits

1. **Task 1: Add cursor-following 3D preview mesh and R-key rotation** - `a531beb` (feat)
2. **Task 2: Verify all gap closures** - verified with user feedback, fixes applied:
   - `6b2f525` fix: ground plane raycast for preview
   - `4291d99` feat: smooth movement + 180° rotation
   - `03b3812` fix: raise raycast plane to build layer + reject 90°
   - `5fd4380` fix: reject midair placement

## Files Created/Modified

- `frontend/src/interaction.js` - Preview mesh system with smooth tracking, magnetic snap, rotation validation, and layer support checks

## Decisions Made

- Smooth lerp (0.3 factor) for free movement, instant snap for ghost proximity — balances fluid feel with precise placement
- THREE.Plane raycast instead of mesh raycast — more reliable, adjusts height per layer
- Layer support check uses DIMS to iterate all cells under the piece footprint

## Deviations from Plan

- Original plan used grid-snapping; changed to smooth cursor following with magnetic ghost snap per user feedback
- Added midair placement prevention (not in original plan) per user request
- Added rotation validation (reject 90°/270°) per user request

## Known Stubs

None.

## Self-Check: PASSED

- All features verified by user at http://localhost:5173
- Full 7-step build completes successfully
- Preview tracking, rotation, and placement validation all confirmed working
