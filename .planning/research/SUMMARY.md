# Project Research Summary

**Project:** Virtual 3D Lego Builder (web-based guided mode)
**Domain:** Interactive 3D web application — guided brick assembly
**Researched:** 2026-04-05
**Confidence:** MEDIUM

## Executive Summary

This is a web-based, guided step-by-step Lego building application using Python/Flask as a lightweight data-and-asset server and Three.js for in-browser 3D rendering. The recommended approach is a thin Flask backend that serves static files and a small JSON API for set data, with all interactive state and 3D logic living entirely in the browser. The central architectural decision — and the one that prevents the most costly rework — is adopting integer stud-grid coordinates as the primary data representation from day one, before any brick geometry or placement logic is written. Everything else (snapping, ghost overlays, step validation) derives from that single design choice.

The feature scope is well-understood from existing competitors (LEGO Builder App, BrickLink Studio, Mecabricks). For a v1 portfolio project the guided build loop has clear table stakes: orbit camera, stud-grid snapping, a ghost overlay showing the next piece's target, a per-step piece tray, an instruction panel, and a completion state. The most important architectural insight from research is that the Step State Machine is the central dependency — ghost overlay, piece tray, instruction panel, and completion detection all read from it. It must be built early and treated as the authoritative source of truth, with the Three.js scene acting purely as a rendering side-effect.

The primary risks are performance (one-mesh-per-brick draw call explosion), coordinate drift (floating-point positions in set data), and input conflict (OrbitControls intercepting raycasting clicks). All three are well-documented in the Three.js community and have straightforward prevention strategies that must be applied from the start, not retrofitted. Deferring free-build/sandbox mode, user accounts, physics simulation, and mobile support is strongly recommended — each represents 3-4x the complexity of the guided-build v1 scope.

---

## Key Findings

### Recommended Stack

The stack is user-specified at the framework level (Python/Flask + Three.js) and confirmed as appropriate for this use case by research. Flask 3.1.3 on Python 3.12 serves static assets and a dumb JSON API; Three.js r183 (installed via npm, not CDN) handles all 3D rendering. Vite is the correct frontend build tool — faster HMR than Webpack, native ESM, and zero-config Three.js compatibility. GSAP 3.x handles any timed animations (brick snap, ghost fade). The `uv` Python package manager is the 2025 standard for local development setup.

**Core technologies:**
- **Python 3.12 + Flask 3.1.3:** Backend runtime and HTTP server — serves static files and `GET /api/sets` JSON endpoints; no database, no session state
- **Three.js r183 (npm):** 3D scene, camera, materials, raycasting — all required primitives are first-party; OrbitControls imported from `three/addons/`
- **Vite 5.x:** Frontend dev server and production bundler — HMR during development, tree-shaking for production; use vanilla JS template
- **GSAP 3.x:** Smooth animations for brick snap-into-place and step transitions — integrates directly with Three.js object properties
- **uv:** Python package manager replacing pip+venv — dramatically faster installs

**Critical version note:** OrbitControls must be imported from `three/addons/controls/OrbitControls.js` — the old `three/examples/` path changed in r151 and will silently fail.

### Expected Features

Research against LEGO Builder App, BrickLink Studio, and Mecabricks confirms a clear feature tier structure.

**Must have (table stakes — build is broken without these):**
- 3D scene with orbit / zoom / pan camera controls
- Stud-grid snapping (8mm grid; integer Y-height increments for bricks vs. plates)
- Ghost / transparent overlay showing the target position for the next piece
- Step-by-step instruction panel (step N of M, Next/Back controls)
- Piece tray showing pieces needed for the current step with correct colors
- Piece-in-hand selection (pick from tray, confirm placement by clicking valid grid position)
- Valid placement feedback (success: snap animation; failure: visual rejection)
- Set selection screen (3-5 sets with names and thumbnails)
- Completion state (congratulatory screen when all steps done)
- Progress indicator (step N of M counter)

**Should have (differentiators, add after core loop is stable):**
- Exploded-view placement animation (brick animates from above into final position)
- Step camera zoom-to-ghost (auto-orient camera toward the ghost each step)
- Undo last placement (single-level Ctrl+Z)
- Piece count badge on tray items (remaining quantity per type)
- Baseplate stud grid visualization (subtle dot pattern for spatial orientation)

**Defer to v2+:**
- Free build / sandbox mode — requires different architecture and full part catalog (3-4x scope)
- Save/load progress (localStorage) — only valuable once sets exceed ~15 minutes
- Mobile / touch support — requires full interaction model redesign
- User accounts / cloud saves — adds auth, DB, session complexity with no v1 value
- Physics simulation — stud-grid snapping IS the physics; simulation adds cost without benefit
- Full brick catalog (10,000+ parts) — curate 20-30 types for v1 sets

### Architecture Approach

The architecture is a clean client-heavy SPA backed by a dumb data API. Flask is a file-and-data server only — it never tracks build state. All interactive state lives in a single `state.js` module that acts as the hub: UI modules (tray, instructions) and scene modules (brickMesh, ghost) both read from it but never communicate with each other directly. The Three.js scene is purely a rendering side-effect of state; game logic never queries `scene.children`. Mouse events flow through a Grid Snap Resolver (integer arithmetic only) before any state mutation occurs.

**Major components:**
1. **Flask backend** — serves `static/` files and `GET /api/sets`, `GET /api/sets/:id` JSON endpoints; reads set JSON from `sets/` folder on disk
2. **App State module (`state.js`)** — single source of truth: `currentStep`, `placedPieces[]`, `heldPiece`, `setData`; all mutations via explicit functions
3. **3D Scene (`scene.js`)** — Three.js `WebGLRenderer`, `Scene`, `OrbitControls`, camera, lights, baseplate
4. **Geometry Factory (`geometry.js`)** — cached `BufferGeometry` per brick type; one geometry object shared across all meshes of the same type
5. **Ghost Mesh (`ghost.js`)** — dedicated `THREE.Mesh` with `transparent: true, opacity: 0.4, depthWrite: false, polygonOffset: true`; shown/repositioned/hidden per step
6. **Interaction Layer (`interaction.js`)** — `THREE.Raycaster`, pointer-delta click/drag disambiguation, Grid Snap Resolver; disables `OrbitControls` while piece is in-hand
7. **Step State Machine** — drives ghost position, tray contents, instruction panel, and completion detection; the central dependency for all other systems
8. **Set Data (JSON files)** — one `.json` file per set; integer grid coordinates, schema version field; validated at Flask startup

**Component build order** (per architecture research): Flask backend → Three.js scene bootstrap → Geometry factory → App state module → Set loading + piece rendering → Ghost mesh → Interaction layer → Piece tray UI → Instruction panel UI → Set selection screen.

### Critical Pitfalls

1. **One Mesh Per Brick (draw call explosion)** — Use `THREE.InstancedMesh` per geometry+material combination from the start. Group bricks by type and color. Retrofitting InstancedMesh after a per-Mesh implementation is a near-complete rewrite of placement and picking logic. Verify >30fps with 100 placed bricks before any UX work.

2. **Floating-point stud grid drift** — Store all brick positions as integer stud-grid coordinates `(gridX, gridZ, layer)` in all state and JSON data. Convert to world space only at render time via a single canonical function. Never compute positions by adding floating-point offsets. Violation causes visible cracks between bricks and raycasting snap misses.

3. **OrbitControls vs. Raycasting click conflict** — Implement pointer-delta detection: on `mousedown` record position; on `mouseup`, if pointer moved <4px treat as a click (run raycast). Disable `OrbitControls` while a piece is in-hand; re-enable after placement. This must be solved before any UX testing — users will abandon immediately if click vs. orbit is unreliable.

4. **Ghost z-fighting** — Apply `polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1` to the ghost material. Also set `depthWrite: false`. Test ghost visibility from at least 10 camera angles per step immediately after implementation.

5. **Set data format too rigid** — Design the schema against at least two hypothetical sets of different complexity before authoring any real sets. Include `schemaVersion: 1` from day one. Add a rotation field (Y-axis: 0/90/180/270 degrees). Validate all set JSON at Flask startup — fail loudly on schema violations.

---

## Implications for Roadmap

Based on the dependency graph in FEATURES.md and the component build order in ARCHITECTURE.md, research points to a 4-phase structure.

### Phase 1: Foundation — Data Schema, 3D Scene, and Coordinate System

**Rationale:** The set data JSON schema and the integer grid coordinate system are zero-dependency foundations that everything else builds on. Changing either after Phase 2 starts causes cascading rewrites. The Three.js scene bootstrap must also be proven working before any feature work. Per PITFALLS.md, both the floating-point drift pitfall and the data format rigidity pitfall are "Pre-Phase 1 / Phase 1" concerns — they must be resolved here or recovery cost is HIGH.

**Delivers:** Working Flask backend with `/api/sets` endpoints, set JSON schema with schema versioning, geometry factory with all v1 brick types, Three.js scene with camera/lights/baseplate rendering correctly, and the integer grid coordinate conversion functions.

**Addresses:** Set data format (JSON schema), brick geometry library, 3D scene with camera controls (from FEATURES.md P1 list)

**Avoids:** Floating-point stud grid drift, set data format rigidity (PITFALLS.md critical pitfalls 2 and 5)

### Phase 2: Core Build Loop — State Machine, Placement, and Ghost Overlay

**Rationale:** With the data contract and scene established, the Step State Machine and piece placement interaction can be built. This is the central value proposition of the product. The ghost overlay, piece tray, and instruction panel all depend on the state machine, which must be built first within this phase. The OrbitControls/raycasting conflict must be solved here before any UX testing.

**Delivers:** Full guided build loop — pick piece from tray, ghost shows target position, click to place, step advances, instruction panel updates, progress tracked. This is a functional (if unpolished) product.

**Uses:** Three.js Raycaster, OrbitControls (with pointer-delta click/drag disambiguation), GSAP for snap animation

**Implements:** App State module, Step State Machine, Interaction Layer, Ghost Mesh, Piece Tray UI, Instruction Panel UI

**Addresses:** Ghost overlay, stud-grid snapping, piece-in-hand selection, valid placement feedback, instruction panel, piece tray, progress indicator (FEATURES.md P1 list)

**Avoids:** OrbitControls vs. raycasting conflict, ghost z-fighting (PITFALLS.md critical pitfalls 3 and 4)

### Phase 3: Set Flow and Completion

**Rationale:** The set selection screen and completion state bookend the user experience. These are lower complexity (LOW in FEATURES.md) but required for the product to feel complete and for testing with real users. Building them after the core loop means they can be validated against a working guided build.

**Delivers:** Full end-to-end user flow — land on set selection, pick a set, complete the build, see the completion screen. Product is demo-ready.

**Addresses:** Set selection screen, completion state (FEATURES.md P1 list)

**Avoids:** Missing entry/exit points that make the product feel broken during review

### Phase 4: Polish — Animations, Camera UX, and v1.x Differentiators

**Rationale:** With the core loop validated, polish features from FEATURES.md's "Add After Validation (v1.x)" list can be layered in. These are independent enhancements that don't change the underlying architecture. The ghost camera ambiguity pitfall (PITFALLS.md pitfall 6) — ghost obscured from default camera — is addressed here with per-step recommended camera angles.

**Delivers:** Exploded-view placement animation, step camera zoom-to-ghost, undo last placement, piece count badges, baseplate stud grid visualization. Product feels polished and competitive with LEGO Builder App's guided mode.

**Addresses:** Differentiator features from FEATURES.md v1.x list

**Avoids:** Ghost overlay invisible from default camera angle (PITFALLS.md pitfall 6)

### Phase Ordering Rationale

- The JSON schema must precede all other work because it is the data contract between Flask and the browser; no frontend feature is correct without it
- The geometry factory must precede the interaction loop because brick shapes are needed by the ghost, tray previews, and placed meshes simultaneously
- The state machine must precede the tray and instruction panel because both are rendering projections of state — building UI before state creates throw-away code
- InstancedMesh must be chosen in Phase 1 (not retrofitted later) because switching post-implementation requires rewriting placement, picking, and ghost overlay logic — HIGH recovery cost per PITFALLS.md
- Polish features are last because they require a stable core loop to evaluate — exploded animation only feels right once snap-instant placement is known to be jarring

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (interaction layer):** OrbitControls + raycasting click disambiguation has multiple community patterns; worth a focused research spike before implementation to confirm the pointer-delta approach vs. alternative `controls.addEventListener('start'/'end')` approach
- **Phase 2 (InstancedMesh pick-and-place):** Raycasting against `InstancedMesh` instances requires `instanceId` from the intersection result — different pattern from individual `Mesh` picking; verify approach against Three.js r183 docs

Phases with standard patterns (skip research-phase):
- **Phase 1 (Flask + JSON API):** Extremely well-documented; standard Flask route patterns apply
- **Phase 1 (Three.js scene bootstrap):** Camera, lights, OrbitControls setup is boilerplate with dozens of tutorials
- **Phase 3 (Set selection + completion screens):** Standard HTML/CSS UI with no Three.js complexity
- **Phase 4 (GSAP animations):** GSAP + Three.js is a standard pattern with extensive examples

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core stack is user-specified; library versions verified against official release pages and docs; version compatibility table confirmed |
| Features | MEDIUM | Table stakes confirmed against 3 major competitors; web-specific guided mode is a narrower niche than general free-build CAD tools |
| Architecture | MEDIUM | Core patterns (state hub, data-driven JSON, grid coordinate system) verified against multiple open-source Lego builder implementations; Lego-specific rendering details from community sources |
| Pitfalls | MEDIUM | Findings triangulated across Three.js forum threads, open-source Lego builder projects, and official docs; recovery cost estimates are informed estimates, not measured data |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Piece rotation in set data:** Architecture and feature research assume Y-axis rotation (0/90/180/270 degrees) is needed, but no concrete rotation format was tested against real set authoring. Validate the rotation field representation during Phase 1 schema design by authoring one set with asymmetric pieces.
- **InstancedMesh + raycasting interaction:** The specific pattern for picking individual instances within an `InstancedMesh` (using `intersection.instanceId`) was cited in PITFALLS.md but not fully detailed in ARCHITECTURE.md. Needs a focused implementation spike in Phase 2.
- **Performance threshold with real sets:** The 30fps-at-100-bricks benchmark from PITFALLS.md is a community estimate. Actual performance on mid-range hardware with the chosen brick geometry complexity is unknown until profiled. Build a 100-brick stress test scene in Phase 1 to validate before committing to geometry complexity.
- **Ghost per-step camera angles:** PITFALLS.md recommends pre-authoring or computing a recommended camera angle per step. Whether this should be hand-authored in JSON or auto-computed (bounding box center of ghost position) needs a decision before Phase 4.

---

## Sources

### Primary (HIGH confidence)
- [github.com/mrdoob/three.js/releases](https://github.com/mrdoob/three.js/releases) — Three.js r183 as latest release
- [pypi.org/project/Flask](https://pypi.org/project/Flask/) — Flask 3.1.3 as current version
- [threejs.org/docs](https://threejs.org/docs/) — OrbitControls import path, InstancedMesh, Material.transparent
- [flask.palletsprojects.com](https://flask.palletsprojects.com/) — Flask 3.1.x static serving and route patterns
- [github.com/astral-sh/uv](https://github.com/astral-sh/uv) — uv as standard Python package manager 2025
- [www.ldraw.org/article/218.html](https://www.ldraw.org/article/218.html) — LDraw coordinate system and LDU units (stud dimensions)

### Secondary (MEDIUM confidence)
- [discourse.threejs.org — 3D Lego simulator](https://discourse.threejs.org/t/3d-lego-simulator-using-three-js-technology/89567) — community Lego Three.js examples confirming viability
- [discourse.threejs.org — OrbitControls + raycasting conflict](https://discourse.threejs.org/t/raycasting-works-perfectly-before-i-rotate-orbitcontrols/65720) — click/drag disambiguation patterns
- [discourse.threejs.org — InstancedMesh worth it](https://discourse.threejs.org/t/when-is-instancedmesh-worth-it-in-three/62044) — draw call thresholds
- [tympanus.net/codrops — Three.js instances 2025](https://tympanus.net/codrops/2025/07/10/three-js-instances-rendering-multiple-objects-simultaneously/) — InstancedMesh performance data
- [github.com/nicmosc/brick-builder](https://github.com/nicmosc/brick-builder) — open-source Three.js brick builder reference
- [github.com/bhushan6/lego-builder](https://github.com/bhushan6/lego-builder) — R3F brick builder with Zustand state management patterns
- [github.com/LasseD/buildinginstructions.js](https://github.com/LasseD/buildinginstructions.js/) — browser-based Lego instruction renderer reference
- [LEGO Builder App](https://www.lego.com/en-us/builder-app) — guided build feature baseline
- [BrickLink Studio — Wikipedia](https://en.wikipedia.org/wiki/BrickLink_Studio) — competitor feature comparison
- [Mecabricks](https://www.brickdiscovery.com/tools/mecabricks/) — web-based Lego CAD feature comparison

### Tertiary (LOW confidence / needs validation)
- [arxiv.org/html/2307.03162](https://arxiv.org/html/2307.03162) — BrickPal AR assembly instructions research (ghost overlay UX patterns; AR context, not directly applicable)
- [stefanmuller.com — Exploring Lego material](https://stefanmuller.com/exploring-lego-material-part-1/) — Lego plastic material rendering pitfalls (rendering-focused, not interactive)
- GSAP + Three.js integration — multiple community sources agree on GSAP 3.x as standard choice; no single authoritative source

---
*Research completed: 2026-04-05*
*Ready for roadmap: yes*
