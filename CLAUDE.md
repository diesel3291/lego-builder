<!-- GSD:project-start source:PROJECT.md -->
## Project

**Virtual 3D Lego Builder**

A web-based virtual Lego building application where users select pre-built sets and follow step-by-step instructions to assemble 3D models. Built on Python/Flask with Three.js for 3D rendering. Users pick pieces from a tray, see ghost overlays showing where each piece goes, and snap bricks onto a stud grid to complete builds. A personal/portfolio project.

**Core Value:** A user can select a set, follow guided instructions, and build a complete 3D Lego model from start to finish.

### Constraints

- **Tech stack**: Python + Flask backend, Three.js frontend — user's preference
- **Scope**: Personal/portfolio project — no production infrastructure needed
- **Interaction**: Mouse-only for v1 — orbit/zoom/pan for camera, click to pick and place bricks
- **Rendering**: Must run smoothly in modern browsers — keep polygon counts reasonable
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Python | 3.12.x | Backend runtime | LTS release with full ecosystem support; 3.13 is available but 3.12 has wider library compatibility in 2025-2026 |
| Flask | 3.1.3 | HTTP server, static asset serving, JSON API | User-specified. Lightweight, zero-overhead for personal project; serves static files natively and exposes JSON endpoints for set data without framework ceremony |
| Three.js | 0.183.x (r183) | 3D rendering, scene graph, camera, materials | User-specified. Most widely adopted WebGL abstraction; largest community for Lego/voxel examples; all required primitives (BoxGeometry, Raycaster, InstancedMesh, OrbitControls) are first-party |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Three.js OrbitControls | bundled with three | Camera orbit/zoom/pan around the model | Always — import from `three/addons/controls/OrbitControls.js`; handles mouse wheel, left-drag orbit, right-drag pan out of the box |
| Three.js Raycaster | bundled with three | Mouse-click picking — detect which brick or tray slot the cursor hits | Always — needed for "pick piece from tray" and "place on grid" interactions; call `raycaster.setFromCamera()` per mouse event |
| GSAP (GreenSock) | 3.x (latest) | Smooth animation for brick snap-into-place, step transitions | Use for any timed motion (brick flying from tray to position, ghost fade-in); lighter than a full animation framework, integrates directly with Three.js object properties |
| flask-cors | 4.x (latest) | CORS headers on Flask JSON endpoints | Only needed if the frontend is served from a different origin during development; not required when Flask serves both static files and the API from the same host |
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| uv | Python package manager and venv | Replaces pip + virtualenv; Rust-based, dramatically faster installs; `uv venv && uv pip install flask flask-cors` is the 2025 standard setup |
| Vite | Frontend JS bundler / dev server | Provides HMR during development, tree-shaking for production build; use `npm create vite@latest` with vanilla JS template; outputs static files that Flask serves in production |
| Python-dotenv | Environment variable loading | Standard pattern for Flask — keeps config out of source (port, debug flag, data path) |
| Pytest | Python testing | Lightweight, zero-config; verifies Flask routes and JSON schema for set data files |
## Installation
# Python backend
# Frontend (JS/Three.js)
# Dev workflow: run both
# Terminal 1:  flask run  (serves API on :5000)
# Terminal 2:  npm run dev  (Vite dev server on :5173, proxies /api to Flask)
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Three.js | Babylon.js | When you need a full game-engine feature set (physics, GUI widgets, inspector); overkill for a guided brick builder and has a smaller community for Lego-style projects |
| Three.js | React Three Fiber (R3F) | When the rest of the UI is a React app and you want declarative scene management; adds React overhead; unnecessary for a focused 3D canvas with minimal surrounding UI |
| Vite | Webpack | When working in a large enterprise monorepo with existing Webpack config; Vite is strictly better for greenfield — faster HMR, native ESM, zero config |
| GSAP | Tween.js | Tween.js is simpler and used in official Three.js examples; fine if animations are trivial (a single opacity fade); GSAP preferred when chaining multiple property animations across a step transition |
| uv | pip + venv | If the deployment target (e.g., shared hosting, legacy CI) does not support uv; `pip install flask flask-cors` remains perfectly valid |
| Flask serving static files | Nginx + Gunicorn | For production deployments under real load; for a personal/portfolio project Flask's built-in server is sufficient |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Three.js via CDN `<script>` tag | Loses tree-shaking; ships the entire 1MB+ library; no module imports; makes OrbitControls import awkward | Install via `npm install three` and import only what you use via ESM |
| `create-react-app` | Officially unmaintained as of 2024; slow, bloated, not compatible with modern tooling | Vite with vanilla JS template (or React template if React is needed) |
| Cannon.js (original) | Abandoned; last release 2015 | For physics: use `cannon-es` (maintained fork) — but this project does NOT need physics; stud snapping is pure math, not physics simulation |
| Flask in debug mode in production | `app.run(debug=True)` exposes the Werkzeug debugger PIN and allows arbitrary code execution | Use `FLASK_DEBUG=0` in production; only enable debug in local dev via `.env` |
| Three.js `WireframeGeometry` for brick edges | Creates a wireframe of every triangle, not just silhouette edges — looks noisy | Use `EdgesGeometry` with `LineSegments` + `LineBasicMaterial` for clean brick outlines |
## Stack Patterns by Variant
- Clone the target brick's geometry, apply `MeshStandardMaterial` with `transparent: true`, `opacity: 0.4`, `depthWrite: false`
- Add the ghost mesh to the scene independently; update its position to match the instruction target each step
- `depthWrite: false` prevents z-fighting with placed bricks underneath
- Store all placed brick positions in a `Set` of `"x,y,z"` strings keyed to the 8mm Lego unit grid
- On mouse move over the baseplate, project the hit point through `Math.round()` to the nearest stud coordinate
- Validate against occupied cells before allowing placement — pure JS, no physics engine needed
- Use `InstancedMesh` when many bricks of the same geometry+color are present (draw call: 1 instead of N)
- For the guided build at v1 scale (3-5 sets, <500 bricks each), individual `Mesh` objects per brick are acceptable and simpler to raycast against; switch to `InstancedMesh` only if frame rate drops below 30fps
- Define sets as static JSON files in `flask_app/data/sets/`
- Expose `GET /api/sets` (list) and `GET /api/sets/<set_id>` (full set data with step sequence)
- Flask reads from disk on first request and caches in-process; no database needed for personal project scale
## Version Compatibility
| Package | Compatible With | Notes |
|---------|-----------------|-------|
| three@0.183.x | Node 18+ / modern browsers | OrbitControls imported from `three/addons/` (not `three/examples/` — that path changed in r151+) |
| Flask 3.1.x | Python 3.9–3.13 | Python 3.12 is the recommended runtime; Flask 3.x dropped Python 3.8 support |
| gsap@3.x | Works with Three.js directly | Tween any `object3D.position`, `material.opacity`, etc. — no adapter needed |
| vite@5.x | Node 18+ | Compatible with `three` ESM imports out of the box; no special config required |
## Sources
- [github.com/mrdoob/three.js/releases](https://github.com/mrdoob/three.js/releases) — verified r183 as latest release (HIGH confidence)
- [pypi.org/project/Flask](https://pypi.org/project/Flask/) — verified Flask 3.1.3 as current version (HIGH confidence)
- [threejs.org/docs/pages/OrbitControls.html](https://threejs.org/docs/pages/OrbitControls.html) — OrbitControls import path from `three/addons/` confirmed (HIGH confidence)
- [threejs.org/docs/pages/InstancedMesh.html](https://threejs.org/docs/pages/InstancedMesh.html) — InstancedMesh draw-call batching confirmed (HIGH confidence)
- [tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/) — InstancedMesh performance data (MEDIUM confidence)
- [discourse.threejs.org/t/3d-lego-simulator-using-three-js-technology/89567](https://discourse.threejs.org/t/3d-lego-simulator-using-three-js-technology/89567) — community Lego Three.js examples confirming viability (MEDIUM confidence)
- [github.com/astral-sh/uv](https://github.com/astral-sh/uv) — uv as standard Python package manager 2025 (HIGH confidence)
- [flask.palletsprojects.com](https://flask.palletsprojects.com/) — Flask 3.1.x official docs (HIGH confidence)
- WebSearch: GSAP + Three.js integration patterns — multiple sources confirm GSAP 3.x as standard choice (MEDIUM confidence)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
