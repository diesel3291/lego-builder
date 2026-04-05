# Roadmap: Virtual 3D Lego Builder

## Overview

Four phases deliver the guided build experience from zero to polished. Phase 1 establishes the irreversible foundations — the JSON set schema and integer stud-grid coordinate system — before any interactive logic is written. Phase 2 builds the central value: the guided build loop where users pick pieces, see ghost overlays, snap bricks, and advance steps. Phase 3 completes the user journey with set selection and a completion screen. Phase 4 layers in animations, camera UX, and polish features once the core loop is validated.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Data schema, 3D scene, and coordinate system
- [ ] **Phase 2: Core Build Loop** - State machine, placement, ghost overlay, and guided UI
- [ ] **Phase 3: Set Flow and Completion** - Set selection screen and completion state
- [ ] **Phase 4: Polish** - Animations, camera UX, and build quality features

## Phase Details

### Phase 1: Foundation
**Goal**: The data contract and 3D environment are locked in — all downstream features can be built without changing coordinates, schema, or geometry
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, SCENE-01, SCENE-02, SCENE-03
**Success Criteria** (what must be TRUE):
  1. The Flask server starts, serves the app, and responds to `/api/sets` and `/api/sets/:id` with valid JSON
  2. The browser renders a 3D scene with a baseplate, working orbit/zoom/pan camera controls, and a visible stud grid
  3. All v1 brick types (1x1 through 2x4, plates, slopes) can be instantiated and rendered in multiple colors with no geometry errors
  4. At least one complete set (varying complexity) is authored in JSON and loads correctly — all piece positions use integer stud-grid coordinates, and a 100-brick stress test holds above 30fps
**Plans**: 3 plans
Plans:
- [x] 01-01-PLAN.md — Flask backend, set JSON schema, schema validation, /api/sets routes
- [x] 01-02-PLAN.md — Vite scaffold, Three.js scene, OrbitControls, stud grid, geometry factory (all 13 brick types)
- [x] 01-03-PLAN.md — Author 3 set JSON files (mini-rocket, starter-tower, color-steps stress test)
**UI hint**: yes

### Phase 2: Core Build Loop
**Goal**: A user can pick a piece from a tray, see the ghost overlay showing where it goes, place it on the grid, and advance through all steps of a build
**Depends on**: Phase 1
**Requirements**: BUILD-01, BUILD-02, GUIDE-01, GUIDE-02, GUIDE-03, UI-01, UI-02, DATA-04
**Success Criteria** (what must be TRUE):
  1. User can click a piece in the tray and see it highlighted as held; the camera remains usable while no piece is held
  2. A ghost overlay appears on the model showing exactly where the current step's piece belongs, from any camera angle, with no z-fighting
  3. User can click a valid grid position to snap the held piece into place — piece locks with visual confirmation and the step advances
  4. Clicking an invalid grid position shows a visual rejection (no snap, error indication)
  5. The instruction panel shows the current step number out of total steps and updates correctly when the step advances
**Plans**: 3 plans
Plans:
- [ ] 02-01-PLAN.md — State machine (state.js) and ghost overlay module (ghost.js)
- [ ] 02-02-PLAN.md — Interaction module: click disambiguation, raycasting, placement validation, feedback
- [ ] 02-03-PLAN.md — Piece tray, instruction panel HUD, index.html overlays, main.js wiring
**UI hint**: yes

### Phase 3: Set Flow and Completion
**Goal**: The product has a complete start-to-finish user flow — users land on a set selection screen, choose a set, build it, and reach a completion screen
**Depends on**: Phase 2
**Requirements**: UI-03, UI-04, GUIDE-04
**Success Criteria** (what must be TRUE):
  1. User sees a set selection screen listing 3-5 sets with thumbnails and metadata and can click any to begin
  2. After placing the final piece, user sees a congratulatory completion screen
  3. Camera auto-focuses on the area where the next piece goes at each new step
**Plans**: TBD
**UI hint**: yes

### Phase 4: Polish
**Goal**: The build experience feels smooth and complete — animations, undo, and incorrect placement detection raise the quality to portfolio-ready
**Depends on**: Phase 3
**Requirements**: SCENE-04, BUILD-03, BUILD-04
**Success Criteria** (what must be TRUE):
  1. When a piece snaps into place, it animates from above into its final position (exploded-view tween) rather than appearing instantly
  2. User can undo the last placement ��� the brick returns to the tray and the step reverts
  3. If user places a piece in a syntactically valid but wrong position, the app flags it as incorrect
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete |  |
| 2. Core Build Loop | 0/3 | Planned | - |
| 3. Set Flow and Completion | 0/? | Not started | - |
| 4. Polish | 0/? | Not started | - |
