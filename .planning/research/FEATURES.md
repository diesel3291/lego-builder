# Feature Research

**Domain:** Virtual 3D Lego / Brick Builder — Guided Build Mode (Web)
**Researched:** 2026-04-05
**Confidence:** MEDIUM (ecosystem well-understood; web-specific guided mode is a narrower niche than free-build CAD tools)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels broken or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 3D scene with orbit / zoom / pan camera | Every 3D builder — LDD, Studio, LEGO Builder app, Mecabricks — provides full camera control. Users are trained to expect it. | MEDIUM | Three.js OrbitControls covers this; need to tune min/max distances for the baseplate scale |
| Stud-grid snapping | Real Lego only connects at stud positions. Without snap-to-grid, the product does not feel like Lego. | HIGH | Core of the interaction loop. 8mm grid standard; must enforce valid Y-height increments (plate vs brick height) |
| Ghost / transparent overlay showing next piece | LEGO Builder app, LDD building guide mode, and LDD Extended all show ghost placements. Users entering guided mode expect visual affordance. | HIGH | Ghost mesh = semi-transparent clone of the target brick at its final position; opacity ~0.35–0.45 works well |
| Step-by-step instruction panel | The entire value proposition is guided assembly. Panel needs: current step number, total steps, Next/Back controls. | MEDIUM | Must stay in sync with 3D scene state; advancing a step = placing the ghost piece and updating tray |
| Piece tray showing pieces for current step | LEGO physical sets give you a bag of pieces per stage. Users expect to identify and pick the right piece. | MEDIUM | Tray renders 2D or 3D mini-preview of each piece type; quantity counters; selected piece highlighted |
| Piece highlighted / "in hand" state | Users need to know which piece is selected before placement. Without active feedback the interaction is guesswork. | LOW | Visual highlight (outline or emissive glow) on the piece in hand; cursor change optional |
| Set selection / lobby screen | Without a starting point the app has no entry flow. 3-5 sets with thumbnail previews is the minimum. | LOW | Thumbnails can be pre-rendered images or small live Three.js previews; set metadata from JSON |
| Completion state | A "done" moment is required — otherwise users don't know they have finished. LEGO Builder app tracks completed sets. | LOW | Show final model, congratulatory message, option to restart or select new set |
| Progress indicator | LEGO includes progress bars in physical instructions since ~2007. Users expect to know how far along they are. | LOW | Step N of M display is sufficient; a visual progress bar adds polish with minimal cost |
| Valid placement feedback | Users must know if their placement attempt succeeded or failed. Silent failure = frustration. | MEDIUM | Success: snap animation + piece disappears from tray. Failure: visual shake / red flash on invalid drop zone |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued — especially for portfolio demonstration.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Exploded-view step animation | LDD building guide mode animates pieces "falling into place". More viscerally satisfying than teleporting. | MEDIUM | Tween piece from above its target position down to final position on step advance; 300–500ms feels natural |
| Color-matched piece highlight in tray | The LEGO Builder app highlights what color each piece should be — eliminates confusion about 2x4 red vs 2x4 blue. | LOW | Rendered with actual material colors, not just a name; reduces mis-picks |
| Incorrect placement detection | Detect when user places a piece in the wrong position and provide a clear error message. Most casual builders skip this. | HIGH | Requires comparing placed position to instruction position with tolerance; highlight wrong brick in red |
| Step "zoom in" camera focus | LEGO Builder app auto-rotates/zooms to the area where the next piece goes each step. Eliminates hunting. | MEDIUM | Tween camera target to bounding-box center of ghost piece region on step change |
| Piece count badge on tray items | Shows remaining quantity per piece type. Users feel progress without looking at the step counter. | LOW | Decrement count when piece placed; hide/grey out when exhausted |
| Undo last placement | Allows correcting mistakes without restarting the step. Not in most guided apps (they are linear). | MEDIUM | Store placed brick history stack; pop and restore tray count on undo |
| Baseplate grid visualization | Subtle stud dot grid on the baseplate gives spatial orientation. Studio and LDD show grid lines. | LOW | Plane geometry with stud texture or simple dot pattern; toggleable |
| Set difficulty / piece count metadata | Lets users pick a set appropriate for their patience. Differentiates sets on the lobby screen. | LOW | Part of set JSON — piece count, estimated minutes, difficulty label |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for this scope.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Free build / sandbox mode | Users assume a Lego app should let them build anything | Requires full piece catalog, collision detection, and open-ended save format. Scope is 3-4x the guided build. v1 core would be delayed significantly. | Defer to v2. Add a "creative mode" link on the completion screen as a teaser. |
| User accounts and cloud saves | Users want to save progress and return later | Adds auth, database, session management, and data modeling complexity. This is a personal/portfolio project with no multi-user requirement. | Store progress in localStorage; session persists without login. |
| Photorealistic rendering | Mecabricks and Studio can render near-photo images | Real-time browser rendering via Three.js cannot match offline raytracing. Attempting it degrades performance without delivering quality. | Use good PBR materials with correct plastic specularity. Looks polished without claiming photorealism. |
| Multiplayer / co-op building | Collaborative building is a LEGO Builder app feature | Real-time sync requires WebSockets, conflict resolution, and shared state. Enormous complexity for no v1 value. | Completion screen sharing (screenshot / URL) provides social value with zero complexity. |
| Mobile / touch support | Large user base is on phones | Three.js touch orbit and piece selection require redesigned interaction model. Piece tray and ghost overlay need responsive layout rework. Doubles QA surface. | Explicitly target desktop mouse for v1. Add a "best experienced on desktop" notice. |
| Full brick catalog (10,000+ parts) | Power users want every Lego element | Performance: loading and rendering thousands of unique geometries kills browser frame rate. UX: a 10K piece catalog requires advanced search/filter UI. | Curate 20-30 brick types covering standard bricks, plates, slopes. Sufficient for all v1 sets. |
| Physics simulation | Some builders want bricks to fall/stack with gravity | Physics adds significant CPU cost and collision complexity. Real Lego doesn't need physics — stud locking IS the constraint. | Stud-grid snapping is the physics. Bricks lock at valid positions. No simulation needed. |
| AI-generated sets | "Generate a set from a description" is trendy | Requires LLM integration, brick validity checking, and instruction sequencing — all unsolved hard problems even for large teams. | Pre-authored JSON sets are reliable and allow full quality control. |

---

## Feature Dependencies

```
Set Selection Screen
    └──requires──> Set Data Format (JSON)
                       └──requires──> Brick Geometry Library

3D Scene (camera, baseplate)
    └──requires──> Three.js scene setup

Step-by-Step Instruction Panel
    └──requires──> Set Data Format (JSON)
    └──requires──> Step State Machine (current step, total steps)
                       └──requires──> 3D Scene

Ghost Overlay
    └──requires──> Step State Machine (knows what the next piece is and where)
    └──requires──> 3D Scene
    └──requires──> Brick Geometry Library

Piece Tray
    └──requires──> Set Data Format (JSON — piece list per step)
    └──requires──> Step State Machine

Piece-in-Hand (pick and hold)
    └──requires──> Piece Tray
    └──requires──> 3D Scene (raycasting for placement)

Stud-Grid Snapping
    └──requires──> Piece-in-Hand
    └──requires──> 3D Scene

Valid Placement Feedback
    └──requires──> Stud-Grid Snapping
    └──requires──> Ghost Overlay (comparison target)

Completion State
    └──requires──> Step State Machine (detects last step reached)
    └──requires──> 3D Scene

Progress Indicator ──enhances──> Step State Machine
Piece Count Badge ──enhances──> Piece Tray
Step Zoom Camera ──enhances──> Ghost Overlay (shares position data)
Exploded Animation ──enhances──> Valid Placement Feedback (replaces instant snap)
Undo ──enhances──> Step State Machine (reverses one transition)

Free Build ──conflicts──> Guided Build (different interaction model; don't merge in v1)
Physics Simulation ──conflicts──> Stud-Grid Snapping (competing placement constraint systems)
```

### Dependency Notes

- **Step State Machine is the central dependency**: Ghost overlay, tray, panel, and completion all read from it. Build this early.
- **Brick Geometry Library must exist before any 3D feature**: Geometry is needed by the scene, tray previews, and ghost overlay simultaneously.
- **Set Data Format (JSON) gates everything**: No set data = no scene, no instructions, no tray. Define the schema in Phase 1.
- **Stud-Grid Snapping requires Piece-in-Hand**: You cannot snap until the user has picked a piece. Build pick before snap.
- **Exploded Animation conflicts with instant snap UX**: Pick one approach for v1. Instant snap is simpler; animation adds polish. Do not mix.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] Set selection screen — entry point; 3-5 sets with names and thumbnails
- [ ] Set data format (JSON) — defines pieces, positions, colors, build sequence
- [ ] Brick geometry library — standard bricks (1x1 through 2x4), plates, slopes
- [ ] 3D scene with camera controls — orbit, zoom, pan; baseplate visible
- [ ] Step state machine — tracks current step, advances on correct placement
- [ ] Instruction panel — step number, total steps, Next/Back navigation
- [ ] Piece tray — shows pieces needed for current step with correct colors
- [ ] Piece-in-hand selection — pick from tray, piece follows cursor in 3D
- [ ] Ghost overlay — transparent target showing where current piece goes
- [ ] Stud-grid snapping — piece locks to valid Lego position on drop
- [ ] Valid placement feedback — visual confirmation on success; error on invalid drop
- [ ] Completion state — congratulatory screen when all steps done
- [ ] Progress indicator — step N of M counter in instruction panel

### Add After Validation (v1.x)

Features to add once core loop is working and feels good.

- [ ] Exploded-view placement animation — if snap-instant feels jarring in practice
- [ ] Step camera zoom-to-ghost — if users report losing track of where to place
- [ ] Undo last placement — if incorrect placements cause frustration/restarts
- [ ] Piece count badge on tray items — if tray becomes crowded with many pieces
- [ ] Baseplate stud grid visualization — visual polish, low effort

### Future Consideration (v2+)

Features to defer until v1 is validated.

- [ ] Free build / sandbox mode — requires different architecture and full part catalog
- [ ] Save/load progress (localStorage) — useful only once sets take >15 min to complete
- [ ] Specialty pieces (wheels, windows, minifigs) — after core brick types are solid
- [ ] Mobile / touch support — requires interaction model redesign
- [ ] Incorrect placement detection — high complexity; may frustrate more than help if false positives

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| 3D scene + camera controls | HIGH | MEDIUM | P1 |
| Set data format (JSON schema) | HIGH | LOW | P1 |
| Brick geometry library | HIGH | MEDIUM | P1 |
| Step state machine | HIGH | MEDIUM | P1 |
| Ghost overlay | HIGH | HIGH | P1 |
| Stud-grid snapping | HIGH | HIGH | P1 |
| Instruction panel (N of M, Next/Back) | HIGH | LOW | P1 |
| Piece tray | HIGH | MEDIUM | P1 |
| Piece-in-hand selection | HIGH | MEDIUM | P1 |
| Valid placement feedback | HIGH | MEDIUM | P1 |
| Completion state | MEDIUM | LOW | P1 |
| Set selection screen | MEDIUM | LOW | P1 |
| Progress indicator | MEDIUM | LOW | P1 |
| Exploded placement animation | MEDIUM | MEDIUM | P2 |
| Step camera zoom | MEDIUM | MEDIUM | P2 |
| Undo last placement | MEDIUM | MEDIUM | P2 |
| Piece count badge | LOW | LOW | P2 |
| Baseplate stud grid | LOW | LOW | P2 |
| Incorrect placement detection | MEDIUM | HIGH | P3 |
| Save/load progress (localStorage) | LOW | MEDIUM | P3 |
| Free build mode | LOW (for v1 users) | HIGH | P3 |

**Priority key:**
- P1: Must have for launch — guided build is broken without these
- P2: Should have — adds polish; add when P1 is stable
- P3: Nice to have — future consideration or v2

---

## Competitor Feature Analysis

| Feature | LEGO Builder App (official) | BrickLink Studio | Mecabricks (web) | Our v1 Approach |
|---------|-----------------------------|--------------------|-------------------|-----------------|
| Guided step-by-step | Yes — core feature | Yes — generate from model | No (free build only) | Yes — core feature |
| Ghost / placement preview | Yes | No | No | Yes — ghost overlay |
| Camera controls | Orbit, zoom, pan | Full 6-axis | Full WebGL controls | OrbitControls; orbit/zoom/pan |
| Piece tray | Per-step bag view | Full catalog search | Full catalog search | Per-step tray, curated |
| Stud-grid snapping | Yes (physical instructions; digital is view-only) | Yes — snap detection | Yes | Yes — core |
| Completion / progress | Set completion tracking, total bricks built | N/A | N/A | Completion screen + step counter |
| Free build | No | Yes — primary mode | Yes — primary mode | Out of scope for v1 |
| Undo/redo | Not in guided mode | Yes | Yes | Deferred to v1.x |
| Rendering quality | Real-time mobile 3D | Photorealistic offline | High-quality WebGL | PBR materials, real-time Three.js |
| Collaboration | Build Together (multi-user) | No | Shared models | Out of scope |
| Mobile support | Yes (native iOS/Android) | Desktop only | Yes (WebGL) | Desktop-only for v1 |

---

## Sources

- [LEGO Builder App — Official LEGO Shop](https://www.lego.com/en-us/builder-app) (feature list, guided build, collaborative build)
- [LEGO Builder App — Google Play](https://play.google.com/store/apps/details?id=com.lego.legobuildinginstructions&hl=en_US) (step-by-step 3D instructions, zoom/rotate per step)
- [BrickLink Studio — Wikipedia](https://en.wikipedia.org/wiki/BrickLink_Studio) (snap detection, photorealistic rendering, community)
- [Mecabricks — Brick Discovery](https://www.brickdiscovery.com/tools/mecabricks/) (web-based, WebGL, no install)
- [Mecabricks — The Brick Blogger](https://thebrickblogger.com/2018/02/building-3d-lego-models-with-mecabricks/) (feature list: build, render, share)
- [LDD Building Guide Mode — Rebrickable](https://rebrickable.com/help/guide-to-lego-digital-designer/) (animated piece placement in building guide mode)
- [LEGO Progress Bars in Instructions — Brothers Brick](https://www.brothers-brick.com/2023/02/27/when-and-why-did-lego-include-progress-bars-in-instructions-guides-feature/) (history and rationale of progress indicators)
- [Three.js Lego Builder examples — three.js forum](https://discourse.threejs.org/t/3d-lego-simulator-using-three-js-technology/89567) (grid snapping, ghost overlay implementation patterns)
- [GridSnapThreeJS — GitHub](https://github.com/andeplane/GridSnapThreeJS) (snap-to-vertex grid implementation)
- [LDD vs Studio comparison — BrickHello](https://www.brickhello.com/post/2017/11/05/battle-of-lego-design-software-ldd-vs-studio) (feature comparison context)

---

*Feature research for: Virtual 3D Lego Builder (web, guided mode)*
*Researched: 2026-04-05*
