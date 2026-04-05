# Pitfalls Research

**Domain:** Web-based virtual 3D Lego/brick builder (Three.js + Flask)
**Researched:** 2026-04-05
**Confidence:** MEDIUM — findings triangulated across Three.js forum threads, open-source Lego builder projects, official Three.js docs, and Lego rendering/modeling community discussions.

---

## Critical Pitfalls

### Pitfall 1: One Mesh Per Brick — Draw Call Explosion

**What goes wrong:**
Each brick placed is rendered as its own Three.js `Mesh` object. At even moderate complexity (50-200 bricks in a set), the GPU receives one draw call per brick, causing frame rate to drop sharply. A 200-piece set with naive rendering can hit 200+ draw calls for the built model alone, before accounting for ghost overlay, tray pieces, and UI.

**Why it happens:**
The intuitive implementation mirrors real-world thinking: a brick is an object, so it becomes one `Mesh`. This works in demos with 5-10 bricks but degrades visibly as set size grows.

**How to avoid:**
Use `THREE.InstancedMesh` per (geometry + material) combination. Group bricks by type and color — each unique combination becomes one `InstancedMesh` with N instances. For the guided build use-case, `InstancedMesh` allows updating instance transforms when a piece is placed without recreating geometry. Consider `THREE.BatchedMesh` (added in Three.js r155) for scenes mixing different geometries with the same material.

**Warning signs:**
- FPS drops noticeably as pieces are placed during testing
- Chrome DevTools performance timeline shows GPU time growing linearly with piece count
- More than ~50 individual `Mesh` objects in the scene at once

**Phase to address:**
Foundation phase (3D scene setup). Choose instanced rendering from the start — retrofitting it after a mesh-per-brick implementation is a near-complete rewrite of the placement and picking logic.

---

### Pitfall 2: Floating-Point Drift on Stud Grid Positions

**What goes wrong:**
Brick positions accumulate floating-point rounding errors when computed arithmetically (e.g., `x + 0.8 * n`). Over several placement operations, bricks that should share a face end up offset by fractions of a unit, causing visible cracks between bricks or z-fighting on shared faces. Raycasting snap detection also misfires when snapping candidates don't land on exact grid coordinates.

**Why it happens:**
Lego's stud spacing maps to 0.8 cm (8mm) in real-world units. Representing this in floating-point and doing repeated arithmetic against it introduces rounding. Developers assume the grid math is clean because the numbers look simple.

**How to avoid:**
Store all brick positions as integer stud-grid coordinates `(gridX, gridY, gridZ)` in your data model. Convert to world-space only at render time by multiplying by fixed scale constants (`STUD_WIDTH = 0.8`, `PLATE_HEIGHT = 0.32`, `BRICK_HEIGHT = 0.96`). Never compute world positions by adding floating-point offsets incrementally. Snapping logic operates entirely in integer grid space.

**Warning signs:**
- Thin dark lines appear between adjacent bricks in the rendered model
- Z-fighting (flickering) on shared faces between stacked plates
- Snap candidates occasionally miss by a sub-pixel amount

**Phase to address:**
Foundation phase — the integer grid coordinate system must be the fundamental data representation before any placement logic is built.

---

### Pitfall 3: OrbitControls vs. Raycasting Click/Drag Conflict

**What goes wrong:**
OrbitControls consumes `mousedown` and `mousemove` events for camera orbit. When the user tries to click a brick or the ghost overlay, OrbitControls intercepts the event, triggering a camera rotation instead of a piece selection. Conversely, brief orbit gestures sometimes register as unintended clicks on scene objects.

**Why it happens:**
This is a well-documented Three.js issue. Both OrbitControls and raycaster-based picking attach listeners to the same canvas events. Three.js provides no built-in disambiguation between a click and a drag gesture.

**How to avoid:**
Implement pointer-delta detection: on `mousedown`, record cursor position; on `mouseup`, if pointer moved fewer than ~4px, treat as a click and run the raycast. Disable `orbitControls.enabled` while a piece is "in hand" (held by the user for placement) so orbit doesn't interfere mid-placement. Enable it again after the piece is placed or returned to tray. Document this pattern in the first interaction sprint.

**Warning signs:**
- Clicking a piece in the tray sometimes rotates the camera instead
- Short orbit gestures accidentally select a brick
- Ghost overlay placement feels unreliable

**Phase to address:**
Interaction phase (piece pick-and-place). This must be solved before any UX testing — users will abandon immediately if click vs. orbit is unreliable.

---

### Pitfall 4: Z-Fighting on Coplanar Ghost Overlay and Placed Bricks

**What goes wrong:**
The ghost overlay (transparent brick showing the next placement position) shares the exact position as either the baseplate or an already-placed brick. When two meshes occupy the same Z depth, the GPU flickers between them (z-fighting), making the ghost look broken or invisible.

**Why it happens:**
The ghost is placed at the same grid coordinate as where the brick will go. If a previously placed brick or the baseplate occupies adjacent or identical geometry, their depth values compete in the depth buffer.

**How to avoid:**
Apply `polygonOffset` to the ghost material: set `polygonOffset = true`, `polygonOffsetFactor = -1`, `polygonOffsetUnits = -1`. This nudges the ghost slightly toward the camera in depth buffer terms without visually moving it. Alternatively, render the ghost in a separate render pass with `depthTest = false` for the ghost layer only. Ensure the ghost uses `THREE.DoubleSide` so it's visible from any camera angle.

**Warning signs:**
- Ghost overlay flickers against the baseplate at step 1
- Ghost disappears when viewed from certain angles
- Flickering increases as more bricks are placed

**Phase to address:**
Ghost overlay implementation phase. Test ghost visibility from multiple camera angles immediately after implementation.

---

### Pitfall 5: Set Data Format Too Rigid or Underspecified

**What goes wrong:**
The JSON format for defining sets is designed for the first set only. When authoring the second or third set, edge cases emerge: pieces that share a position across steps, pieces that need a different orientation than expected, or step groupings that don't map cleanly to the original schema. The format gets patched ad-hoc per set, breaking the parser for earlier sets.

**Why it happens:**
Designing data formats for one example gives false confidence. The format feels complete until real authoring reveals gaps.

**How to avoid:**
Before authoring any sets, define and validate the schema against at least two hypothetical sets of different complexity (e.g., a 20-piece simple model and a 50-piece model). Required fields at minimum: piece type, color, grid position `(x, y, z)`, rotation (0/90/180/270 around Y-axis), step number, and piece instance ID. Include a schema version field (`"schemaVersion": 1`) from day one. Validate set JSON against the schema in Flask startup — fail loudly if invalid.

**Warning signs:**
- Authoring the second set requires changing the parser
- Step numbers are non-consecutive or ambiguous
- Rotation is stored as degrees in one set and radians in another

**Phase to address:**
Data format definition phase, before any sets are authored. Treat the schema as a contract between set data and the renderer.

---

### Pitfall 6: Ghost Overlay Invisible or Ambiguous From Default Camera Angle

**What goes wrong:**
The ghost overlay shows where to place the next brick, but the default camera position obscures the ghost behind already-placed bricks. The user cannot tell which face of the model the ghost is on, or which orientation the piece should have. The instruction is technically present but practically unreadable.

**Why it happens:**
Ghost overlays are developed while looking straight at the model from the "best" angle. The camera default is set once and never reconsidered. Real assembly involves bricks placed on the back, bottom, and sides of growing models.

**How to avoid:**
For each build step, pre-author or compute a recommended camera angle stored in the step data. Smoothly animate the camera to that angle when advancing steps (Three.js camera animation via lerp or a tween). Allow the user to orbit freely, but provide a "reset to recommended view" button. Test every step of every set from the default camera to verify ghost visibility before shipping.

**Warning signs:**
- Any step where the ghost is on the back or bottom of the model
- Instructions that require the user to orbit the camera to understand placement
- User testing where testers orbit repeatedly before placing a piece

**Phase to address:**
Instruction system phase. Camera-per-step data must be part of the set format spec.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| One `Mesh` per brick | Simple code, fast to prototype | Draw call explosion at real set sizes; requires near-complete rewrite | Only in the very first prototype with <10 bricks, never in a set with real piece counts |
| World-space floating-point positions for brick data | Easy to compute placements | Accumulated rounding errors cause cracks and snapping bugs | Never — integer grid coordinates cost nothing extra upfront |
| Single global event listener for all interaction | Simple to wire up | Impossible to disable picking during orbit or orbit during placement | Only in proof-of-concept, before any UX work |
| Hard-coding set data in JS arrays | No parser needed initially | Every new set requires code changes; no schema validation | Only for the very first test set, remove before second set |
| Default Lambert/Phong material for all bricks | Ships fast | Bricks look plasticky and either too dull or too shiny; MeshStandardMaterial is nearly as easy | Never — `MeshStandardMaterial` is the correct default and takes the same effort |
| No schema version on set JSON | Simpler format | Schema changes break all existing set files without a version to gate on | Never — add `schemaVersion` from day one, costs one line |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Flask serving JS/CSS | Flask dev server serves assets with wrong MIME type or caching headers; Three.js module imports may fail | Set explicit MIME types for `.js` files; use Flask `send_from_directory` with correct headers; for production use a real static server (nginx) |
| Flask API + Three.js fetch | Forgetting `Content-Type: application/json` on Flask responses causes silent parse failures in JS | Always set `return jsonify(data)` in Flask routes returning JSON; never return raw dicts |
| Three.js module imports | Importing Three.js as a CDN global (`<script>`) conflicts with ES module imports; mixing patterns breaks tree shaking | Pick one import strategy (ES modules via importmap or bundler) and use it everywhere |
| OrbitControls + custom pointer events | OrbitControls imported separately from Three.js must match the Three.js version exactly | Import OrbitControls from `three/addons/controls/OrbitControls.js` relative to the installed Three.js version |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Raycasting against all scene objects every `mousemove` | Mouse movement causes stuttering, high CPU usage | Only raycast on `mousemove` when a piece is in-hand; raycast against a limited object list (snap candidates), not the entire scene | With 50+ meshes in scene |
| Recreating ghost overlay mesh on every step advance | Step transitions cause a visible hitch | Create the ghost mesh once, update its geometry/position; reuse material across steps | Every step transition |
| Loading all set geometry upfront on page load | Long initial load; all sets in memory even if unused | Lazy-load set geometry when a set is selected; unload previous set when switching | With 3-5 sets and complex brick geometry |
| Not disposing of Three.js geometries and materials | Memory leak over a session; browser tab grows unbounded | Call `.dispose()` on geometry and material when removing bricks or switching sets | After 20-30 minutes of use |
| Using `scene.children` traversal for snap detection | O(n) scan per frame during placement | Maintain a separate spatial index (simple object keyed by grid coords) for snap lookups; O(1) grid coordinate lookup | With 100+ placed bricks |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visual feedback when a piece is "in hand" | User doesn't know if they picked up the piece; double-clicks trying to confirm | Dim the piece in the tray immediately on pick; show it attached to the cursor in the 3D scene |
| Ghost overlay same color as the brick being placed | Ghost is indistinguishable from placed bricks | Use a distinct ghost color (semi-transparent blue or white with 40% opacity) regardless of actual brick color |
| Step counter only (no visual progress) | User has no sense of how far along the build is | Show both step number and a progress bar; optionally dim completed steps in the model |
| Advancing steps auto-places the piece | Removes the physical satisfaction of snapping; confuses guided vs. auto-build | Always require the user to explicitly place the piece; the ghost shows where, the user confirms with a click |
| No "undo last placement" | A misclick wastes significant time on complex builds | Support single-level undo (Ctrl+Z) for the most recently placed piece |
| Tray shows all pieces for all remaining steps | Overwhelming; user can't find the current piece | Filter tray to show only pieces needed for the current step, with rest grayed out or hidden |

---

## "Looks Done But Isn't" Checklist

- [ ] **Stud snapping:** Verify snapping works from all camera angles, not just the default front view — raycasting a stud grid through a rotated camera is different from the standard case.
- [ ] **Ghost overlay:** Verify the ghost is visible and unambiguous for every step of every set, not just the first few steps.
- [ ] **Piece tray:** Verify tray correctly tracks remaining pieces when a user places a wrong piece type (should the tray allow it? The spec says snap-only, so this should be a non-issue — verify the constraint holds).
- [ ] **Step completion detection:** Verify the "step complete" trigger fires only when the correct piece is placed at the correct grid position, not just when any piece is placed.
- [ ] **Set completion state:** Verify the completion screen appears exactly when all pieces are placed — not one step early, not requiring an extra click.
- [ ] **OrbitControls during placement:** Verify the camera can still orbit while a piece is in-hand (to inspect where the ghost is) but orbit does not interfere with the placement click.
- [ ] **Flask JSON API:** Verify all set JSON endpoints return 200 with correct content-type; test with a set that has 50+ pieces to catch any serialization size issues.
- [ ] **Browser compatibility:** Three.js WebGL2 is required — verify the app fails gracefully (error message) on browsers without WebGL2 rather than showing a blank canvas.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Mesh-per-brick instead of InstancedMesh | HIGH | Requires refactoring the entire placement, picking, and ghost overlay system; estimate 2-3 days minimum |
| Floating-point grid positions in data | HIGH | All placed-brick state and set data must be migrated to integer coordinates; placement math must be rewritten |
| OrbitControls/click conflict shipped to users | MEDIUM | Add pointer-delta check as a patch; can be done without touching placement logic; 1 day |
| Rigid set format requiring parser changes for each set | MEDIUM | Define a proper schema and write a migration script for existing sets; 1-2 days depending on set count |
| Ghost z-fighting shipped | LOW | Apply `polygonOffset` to ghost material; 30-minute fix |
| No undo support | LOW | Add a single-step undo stack; well-contained if placement state is already in a data model |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Mesh-per-brick draw call explosion | Phase 1: 3D scene foundation | Confirm `InstancedMesh` is used; profile with 100 placed bricks and verify >30fps |
| Floating-point stud grid drift | Phase 1: 3D scene foundation | All brick positions in code are integer grid coords; no floating-point arithmetic in placement logic |
| OrbitControls vs. raycasting conflict | Phase 2: Piece pick-and-place interaction | Manual test: orbit, then click; click, then orbit; no interference in either direction |
| Ghost z-fighting | Phase 3: Ghost overlay + instruction system | Test ghost visibility with camera at 10 different angles per step; no flickering |
| Set data format rigidity | Pre-Phase 1: Data format design | Schema validator runs on all set files; second set authored without parser changes |
| Ghost ambiguity from camera angle | Phase 3: Instruction system | Every step of every set has been visually tested for ghost clarity from the default camera |
| Missing step UX feedback | Phase 3: Instruction system | User can always see current step, total steps, progress bar, and ghost before placing |

---

## Sources

- Three.js forum — OrbitControls + raycasting conflicts: https://discourse.threejs.org/t/raycasting-works-perfectly-before-i-rotate-orbitcontrols/65720
- Three.js forum — OrbitControls mousedown interference: https://discourse.threejs.org/t/orbitcontrols-mousedown-event-when-rotating-interfering-with-mousedown-event-in-webapp/16566
- Three.js docs — InstancedMesh: https://threejs.org/docs/pages/InstancedMesh.html
- Three.js forum — When is InstancedMesh worth it: https://discourse.threejs.org/t/when-is-instancedmesh-worth-it-in-three/62044
- Codrops — Three.js instances 2025: https://tympanus.net/codrops/2025/07/10/three-js-instances-rendering-multiple-objects-simultaneously/
- Stefan Muller CG blog — Exploring Lego material (rendering pitfalls): https://stefanmuller.com/exploring-lego-material-part-1/
- Three.js forum — Z-fighting with polygonOffset: https://github.com/mrdoob/three.js/issues/2593
- LDraw file format spec (coordinate system, LDU units): https://www.ldraw.org/article/218.html
- BrickLink Studio collision detection known issues: https://studiohelp.bricklink.com/hc/en-us/articles/5412820155927-Collision
- Flask static file serving pitfalls: https://testdriven.io/tips/e3ecc90d-0612-4d48-bf51-2323e913e17b/
- GitHub — nicmosc/brick-builder (Three.js brick builder reference): https://github.com/nicmosc/brick-builder
- GitHub — bhushan6/lego-builder (R3F brick builder with Zustand state management): https://github.com/bhushan6/lego-builder
- BrickPal AR assembly instructions research (ghost overlay UX): https://arxiv.org/html/2307.03162

---
*Pitfalls research for: web-based virtual 3D Lego/brick builder (Three.js + Flask)*
*Researched: 2026-04-05*
