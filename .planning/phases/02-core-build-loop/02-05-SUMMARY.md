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
    - preview-snaps-to-stud-grid-via-baseplate-raycast
  affects:
    - frontend/src/interaction.js
tech_stack:
  added: []
  patterns:
    - "Preview mesh uses opacity 0.5, depthWrite false, DoubleSide, renderOrder 2 (above ghosts at renderOrder 1)"
    - "worldToGrid->gridToWorld roundtrip for snapping preview to nearest stud"
    - "Baseplate cached on init (getObjectByName('baseplate')) for raycasting ground-plane hits"
    - "Geometry never disposed in _removePreview — geometry.js cache owns lifetime; only material disposed"

key_files:
  created: []
  modified:
    - frontend/src/interaction.js

key-decisions:
  - "Preview always shows at layer 0 (ground level) — ghost overlay shows the correct target height separately; no confusion between 'where I can preview' and 'where the brick must go'"
  - "_previewRotation resets on placement only (not on _removePreview) — allows user to pre-rotate before picking a piece"
  - "Preview reused if type+color match (_createPreview guard) — avoids unnecessary material create/dispose on each mousemove"

patterns-established:
  - "Preview mesh pattern: opacity 0.5, depthWrite false, DoubleSide, renderOrder 2 — consistent with ghost overlay but visually distinct"
  - "R-key rotation: 90-degree increments stored as degrees, converted to radians via THREE.MathUtils.degToRad"

requirements-completed: [UI-02, GUIDE-01, GUIDE-02, GUIDE-03, DATA-04]

metrics:
  duration: "~15 minutes"
  completed: "2026-04-05"
  tasks_completed: 1
  tasks_total: 2
  files_changed: 1
---

# Phase 02 Plan 05: 3D Preview Mesh and R-Key Rotation Summary

**Semi-transparent cursor-following 3D preview mesh added to interaction.js with R-key 90-degree rotation, raycasting against baseplate for stud-grid snapping.**

## Performance

- **Duration:** ~15 minutes
- **Started:** 2026-04-05T00:00:00Z
- **Completed:** 2026-04-05
- **Tasks:** 1 of 2 (Task 2 is human-verify checkpoint — awaiting verification)
- **Files modified:** 1

## Accomplishments

- Added `_previewMesh`, `_previewRotation`, `_baseplateMesh` private state to interaction.js
- Preview mesh follows cursor over the baseplate, snapped to stud grid via `worldToGrid` -> `gridToWorld` roundtrip
- R-key handler rotates preview 90 degrees (0/90/180/270), resets to 0 on placement
- Preview uses `opacity: 0.5`, `depthWrite: false`, `side: THREE.DoubleSide`, `renderOrder: 2` (renders above ghosts at renderOrder 1)
- Preview removed and material disposed on placement; geometry cache never touched
- Preview hides when mouse leaves baseplate area; reappears when cursor returns
- Existing click disambiguation (CLICK_THRESHOLD_PX = 5), success/rejection flash logic unchanged

## Task Commits

1. **Task 1: Add cursor-following 3D preview mesh and R-key rotation** - `a531beb` (feat)
2. **Task 2: Verify all gap closures** - awaiting human verification (checkpoint:human-verify)

## Files Created/Modified

- `frontend/src/interaction.js` - Added preview mesh system: `_createPreview`, `_removePreview`, `_updatePreviewPosition`, R-key keydown listener, baseplate cache on init, `worldToGrid` import

## Decisions Made

- Preview always renders at layer 0 (ground level) — the ghost overlay shows the target placement height separately; decoupling "preview position" from "placement position" avoids confusion
- Geometry is never disposed in `_removePreview` — `geometry.js` cache owns geometry lifetime; only material is disposed per-preview
- `_previewRotation` resets on placement only (not on `_removePreview`) — user can pre-rotate before moving mouse, rotation persists until brick is placed

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. The two threats in the plan's threat model were reviewed:
- T-02-12 (DoS via pointermove raycasting): O(1) single-mesh raycast per event; acceptable at 60fps
- T-02-13 (Tampering via R-key): Visual-only client-side state; does not affect placement validation

## Self-Check: PASSED

- `frontend/src/interaction.js` modified and committed at `a531beb`
- All 13 automated verification checks PASS (worldToGrid import, _previewMesh, _previewRotation, _baseplateMesh, keydown, R key, _createPreview, _removePreview, _updatePreviewPosition, opacity 0.5, renderOrder 2, getObjectByName baseplate, intersectObject baseplate)
