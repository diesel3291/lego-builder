# Phase 3: Set Flow and Completion - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete the user journey from start to finish — users land on a set selection screen, choose a set, build it, and reach a completion screen. Camera auto-focuses on the target area at each new step. Creating new sets, saving progress, and undo are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Set selection screen
- **D-01:** Centered list layout — vertical list of sets, one per row, thumbnail on left, info on right
- **D-02:** 3D preview render thumbnails — render the completed model in a small Three.js canvas or snapshot for each set
- **D-03:** Star difficulty rating (1-3 stars) derived from piece count — easy visual indicator alongside set name and piece count

### Completion experience
- **D-04:** Full celebration overlay screen — congratulatory message with the completed model visible and auto-rotating in the background, plus "Build Again" and "New Set" buttons
- **D-05:** Track and display build time — elapsed time from first piece placed to last, shown on completion screen (e.g., "3m 24s")
- **D-06:** Slow auto-orbit on completion — camera auto-rotates around the finished model using OrbitControls.autoRotate

### Step camera auto-focus
- **D-07:** Smooth tween camera to target area on step advance — use GSAP (already in project) to animate camera position/target to frame the next piece's location
- **D-08:** Zoom to fit — camera adjusts distance so the target piece area fills a comfortable portion of the viewport (closer for small/low pieces, further for tall builds)

### Navigation flow
- **D-09:** Fade transitions between screens — CSS opacity transitions; selection screen is HTML overlay, build is the 3D canvas, completion is overlay on canvas
- **D-10:** Back button in HUD to quit mid-build — small back arrow or X that returns to set selection with confirmation if pieces have been placed

### Claude's Discretion
- Exact fade transition duration and easing
- How to generate/cache 3D preview thumbnails (offscreen canvas, pre-rendered snapshots, etc.)
- Difficulty star thresholds (which piece counts map to 1/2/3 stars)
- Camera tween duration and easing curve
- Zoom-to-fit distance calculation approach
- Confirmation dialog style for mid-build exit

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above.

Key source files for integration:
- `frontend/src/main.js` — Current hardcoded set load (line 34) to be replaced with set selection flow
- `frontend/src/scene.js` — Camera and OrbitControls setup; auto-focus and auto-rotate integrate here
- `frontend/src/hud.js` — Instruction panel; back button and completion state display
- `frontend/src/state.js` — Build state machine; completion detection via `isBuildComplete()`
- `frontend/src/interaction.js` — `onBuildComplete` callback already wired
- `frontend/index.html` — HTML overlay structure for selection and completion screens
- `app.py` — Flask API serving `/api/sets` (list) and `/api/sets/:id` (detail)
- `sets/` — 3 existing set JSON files (mini-rocket, starter-tower, color-steps)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `OrbitControls` (scene.js) — has built-in `autoRotate` and `autoRotateSpeed` properties for completion screen
- GSAP (already imported in interaction.js) — available for camera tween animations
- `/api/sets` endpoint (app.py) — returns list of all sets with metadata, ready for selection screen
- `isBuildComplete()` (state.js) — already tracks build completion state
- `onBuildComplete` callback (interaction.js → main.js) — already wired, just needs to trigger completion screen
- Dark theme colors established: `#1a1a2e` bg, `#16213e` panels, `#e94560` accent

### Established Patterns
- HTML overlay elements positioned with `position: fixed` and `z-index: 10` (HUD, tray in index.html)
- Module pattern: each concern in its own JS file with `init*()` and `render*()` exports
- State module (state.js) is the single source of truth for build progress

### Integration Points
- `main.js:34` — Replace hardcoded `fetch('/api/sets/mini-rocket')` with set selection flow
- `main.js:28` — `onBuildComplete` callback is where completion screen triggers
- `index.html` — Add selection screen and completion overlay HTML elements
- `scene.js` — Export camera/controls for auto-focus tweening from other modules

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-set-flow-and-completion*
*Context gathered: 2026-04-05*
