---
phase: 01-foundation
plan: 02
subsystem: frontend
tags: [threejs, vite, webgl, orbit-controls, geometry, stud-grid]

# Dependency graph
requires:
  - phase: none
    provides: greenfield frontend scaffold
provides:
  - Three.js scene with WebGLRenderer, PerspectiveCamera, OrbitControls, lights, green baseplate
  - Stud-grid coordinate system (grid.js) with STUD_SIZE=8, BRICK_HEIGHT=9.6, PLATE_HEIGHT=3.2
  - Geometry factory (geometry.js) covering all 13 v1 brick types with caching
  - gridToWorld/worldToGrid round-trip coordinate conversion
  - Vite dev server with /api proxy to Flask on port 5000
  - 100-brick stress test confirming rendering pipeline works
affects: [02-interaction, 03-sets, 04-ui]

# Tech tracking
tech-stack:
  added: [three@0.183.x, gsap@3.12.5, vite@5.4.x]
  patterns: [geometry-cache-factory, stud-grid-coordinate-system, bottom-face-origin-geometry]

key-files:
  created:
    - frontend/src/scene.js
    - frontend/src/grid.js
    - frontend/src/geometry.js
    - frontend/src/stressTest.js
    - frontend/src/main.js
    - frontend/package.json
    - frontend/vite.config.js
    - frontend/index.html
  modified:
    - .gitignore

key-decisions:
  - "OrbitControls imported from three/addons/ (not three/examples/) per r151+ convention"
  - "Geometry origin at bottom-face center (translate y+height/2) for intuitive layer stacking"
  - "Individual Mesh per brick for v1 (not InstancedMesh) -- simpler raycasting, adequate perf at 100 bricks"
  - "Slopes approximated as BoxGeometry in v1 -- full wedge geometry deferred to polish phase"

patterns-established:
  - "Geometry cache pattern: getGeometry(type) returns same BufferGeometry reference on repeat calls"
  - "Grid coordinate system: integer stud coords -> world position via gridToWorld/worldToGrid"
  - "gridKey(x,z,layer) as canonical string key for placement Set lookups"

requirements-completed: [SCENE-01, SCENE-02, SCENE-03]

# Metrics
duration: 2min
completed: 2026-04-05
---

# Phase 1 Plan 2: Three.js Scene, Grid System, and Geometry Factory Summary

**Three.js scene bootstrap with OrbitControls, stud-grid coordinate system (8mm grid), and cached geometry factory for all 13 v1 brick types**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-05T07:55:01Z
- **Completed:** 2026-04-05T07:56:52Z
- **Tasks:** 3 (2 auto + 1 checkpoint auto-approved)
- **Files modified:** 2

## Accomplishments
- Fixed OrbitControls import path from `three/examples/jsm/` to `three/addons/` (required for three.js r151+)
- Verified all 13 brick types in geometry.js with cached factory pattern
- Verified npm run build succeeds with zero errors (Vite produces 518KB bundle)
- Added static/ to .gitignore for Vite build output

## Task Commits

Each task was committed atomically:

1. **Task 1: Vite scaffold, scene bootstrap, and stud-grid baseplate** - `1e0792f` (fix) - corrected OrbitControls import path
2. **Task 2: Geometry factory and stress test verification** - `c9bb371` (chore) - added static/ to .gitignore

**Note:** Most files were already correct from prior commits. Only scene.js needed the OrbitControls import fix, and .gitignore needed static/ added.

## Files Created/Modified
- `frontend/src/scene.js` - Three.js scene with renderer, camera, OrbitControls, lights, baseplate, stud grid (fixed import path)
- `frontend/src/grid.js` - Stud-grid constants and coordinate conversion (unchanged, already correct)
- `frontend/src/geometry.js` - Cached geometry factory for all 13 v1 brick types (unchanged, already correct)
- `frontend/src/stressTest.js` - 100-brick stress test with FPS measurement (unchanged, already correct)
- `frontend/src/main.js` - App entry point (unchanged, already correct)
- `frontend/package.json` - three@^0.183.0, gsap@^3.12.5, vite@^5.4.0 (unchanged, already correct)
- `frontend/vite.config.js` - Vite config with /api proxy (unchanged, already correct)
- `frontend/index.html` - Canvas-based HTML entry (unchanged, already correct)
- `.gitignore` - Added static/ for Vite build output

## Key Exports for Downstream Plans

**grid.js** (imported by geometry.js, and all Phase 2 modules):
- `STUD_SIZE = 8` (mm per stud)
- `BRICK_HEIGHT = 9.6` (mm per brick layer)
- `PLATE_HEIGHT = 3.2` (mm per plate layer)
- `gridToWorld(gridX, gridZ, layer, pieceType)` -> THREE.Vector3
- `worldToGrid(worldPos, pieceType)` -> { gridX, gridZ, layer }
- `gridKey(gridX, gridZ, layer)` -> string

**geometry.js** (imported by stressTest.js and Phase 2 brick rendering):
- `BRICK_TYPES` - array of 13 strings: brick-1x1 through brick-2x4, plate-1x1 through plate-2x4, slope-2x1, slope-2x2
- `getGeometry(type)` -> cached THREE.BufferGeometry (origin at bottom-face center)
- `disposeGeometryCache()` - cleanup

**scene.js** (imported by main.js and Phase 2 interaction):
- `initScene(canvasEl)`, `getScene()`, `getCamera()`, `getRenderer()`, `getControls()`

## Decisions Made
- OrbitControls from `three/addons/` not `three/examples/` -- the examples path was deprecated in r151
- Geometry origin translated to bottom-face center for intuitive stacking math
- Individual Mesh objects (not InstancedMesh) for v1 -- adequate performance, simpler raycasting
- Slopes use BoxGeometry placeholder in v1 -- full wedge geometry deferred

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added static/ to .gitignore**
- **Found during:** Task 2 verification
- **Issue:** `npm run build` generates static/ directory which was not gitignored
- **Fix:** Added `static/` to .gitignore
- **Files modified:** .gitignore
- **Commit:** c9bb371

---

**Total deviations:** 1 auto-fixed (blocking - generated files)
**Impact on plan:** Minor housekeeping. No scope creep.

## Issues Encountered
- None beyond the OrbitControls import path which was the known issue from the important_context

## Next Phase Readiness
- Scene, grid, and geometry foundations are complete
- OrbitControls working -- Phase 2 interaction.js can layer raycasting on top
- All 13 brick types registered -- Phase 2 placement and Phase 3 set authoring can reference them
- Coordinate system locked in -- gridToWorld/worldToGrid provide the canonical conversion

## Self-Check: PASSED

All 8 source files verified present. Both commits (1e0792f, c9bb371) verified in git log. OrbitControls import path verified correct.

---
*Phase: 01-foundation*
*Completed: 2026-04-05*
