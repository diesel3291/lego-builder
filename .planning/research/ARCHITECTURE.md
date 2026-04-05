# Architecture Research

**Domain:** Web-based guided 3D Lego brick builder
**Researched:** 2026-04-05
**Confidence:** MEDIUM (core patterns are well-established; Lego-specific details verified against multiple community implementations)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         BROWSER (Client)                             │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │   UI Layer       │  │  App State       │  │  3D Scene        │   │
│  │ (HTML/CSS)       │  │  (JS module)     │  │  (Three.js)      │   │
│  │                  │  │                  │  │                  │   │
│  │ • Set selector   │  │ • currentStep    │  │ • Scene graph    │   │
│  │ • Piece tray     │  │ • placedPieces[] │  │ • Camera/lights  │   │
│  │ • Step panel     │  │ • heldPiece      │  │ • Placed meshes  │   │
│  │ • Completion msg │  │ • setData        │  │ • Ghost mesh     │   │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘   │
│           │                     │                     │             │
│           └─────────────────────┴─────────────────────┘             │
│                              Events / Calls                          │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                   Interaction Layer                           │    │
│  │  Raycaster  │  Mouse Event Handlers  │  Grid Snap Resolver  │    │
│  └──────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────┬────────────────────────────────────┘
                                  │ HTTP (fetch)
┌─────────────────────────────────▼────────────────────────────────────┐
│                         FLASK BACKEND                                │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │  Static Server   │  │  Set API         │  │  Set Data        │   │
│  │  /static/*       │  │  GET /api/sets   │  │  (JSON files)    │   │
│  │  (JS, CSS, HTML) │  │  GET /api/sets/  │  │  sets/*.json     │   │
│  │                  │  │       :id        │  │                  │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Flask static server** | Delivers HTML, JS, CSS to browser | Flask `send_from_directory` or built-in `/static` |
| **Set API** | Serves set catalogue and per-set JSON data | `@app.route('/api/sets')` returning JSON |
| **Set data (JSON)** | Declares pieces, colors, positions, build order | One JSON file per set in `sets/` folder |
| **App State module** | Single source of truth for build progress | Plain JS object or ES module; no framework needed for v1 |
| **3D Scene (Three.js)** | Renders placed bricks, ghost, baseplate, camera | `THREE.Scene`, `WebGLRenderer`, `OrbitControls` |
| **Geometry factory** | Creates reusable brick `BufferGeometry` per brick type | Cached geometry objects keyed by type (e.g. `2x4`, `plate-1x2`) |
| **Interaction layer** | Translates mouse events into game actions | `THREE.Raycaster`, DOM event listeners |
| **Grid snap resolver** | Converts world-space hit point to valid stud coordinate | Pure function: round to 8-LDU grid, clamp to Y layer |
| **Ghost mesh** | Transparent preview of next piece target position | Shared `MeshBasicMaterial` with `opacity: 0.4, transparent: true` |
| **Piece tray (UI)** | Shows remaining pieces for current step; user picks from here | HTML panel driven by state; click dispatches "pick piece" action |
| **Instruction panel (UI)** | Shows current step number, description, diagram | HTML panel; updates on step advance |

## Recommended Project Structure

```
lego-builder/
├── app.py                    # Flask entry point, routes
├── sets/                     # Set definition JSON files
│   ├── small-house.json
│   ├── car.json
│   └── ...
├── static/
│   ├── index.html            # Single-page shell
│   ├── js/
│   │   ├── main.js           # Bootstrap: fetch set, init scene, wire events
│   │   ├── state.js          # App state: currentStep, placedPieces, heldPiece
│   │   ├── scene.js          # Three.js scene setup, renderer, camera, lights
│   │   ├── geometry.js       # Brick BufferGeometry factory, geometry cache
│   │   ├── brickMesh.js      # Create/place/remove brick meshes in scene
│   │   ├── ghost.js          # Ghost mesh lifecycle: show, position, hide
│   │   ├── interaction.js    # Mouse events, raycaster, snap, pick/place logic
│   │   ├── tray.js           # Piece tray UI: render, handle pick click
│   │   ├── instructions.js   # Step panel UI: render step, advance/back
│   │   └── sets.js           # Fetch set list, fetch single set from API
│   ├── css/
│   │   └── style.css
│   └── assets/
│       └── textures/         # Brick color textures (optional)
└── requirements.txt
```

### Structure Rationale

- **sets/ at root level:** Flask reads JSON directly from disk; no database needed for v1. Easy to add new sets by dropping a file.
- **static/js/ per-concern modules:** Each file has one job. `scene.js` never touches the DOM; `tray.js` never touches Three.js. This makes phased development tractable — build one module at a time.
- **state.js as hub:** UI modules and scene modules both read from and write to `state.js`. Neither talks to the other directly. This prevents circular dependencies.
- **geometry.js as factory:** Brick geometries are expensive to compute. A keyed cache (e.g. `{ '2x4': BufferGeometry, 'plate-1x2': BufferGeometry }`) means each type is constructed once and reused by `InstancedMesh` or cloned for individual meshes.

## Architectural Patterns

### Pattern 1: Data-Driven Set Definition

**What:** All build knowledge lives in a JSON file, not in code. The engine reads the file and drives the UI, scene, and step logic from it.

**When to use:** Always — this is the only sustainable approach for multiple sets.

**Trade-offs:** Requires a well-designed schema upfront; once locked in, schema changes touch all set files.

**Example schema:**
```json
{
  "id": "small-house",
  "name": "Small House",
  "steps": [
    {
      "stepNumber": 1,
      "description": "Place the 2x4 green baseplate",
      "pieces": [
        {
          "type": "brick-2x4",
          "color": "#4caf50",
          "gridX": 0,
          "gridZ": 0,
          "layer": 0
        }
      ]
    },
    {
      "stepNumber": 2,
      "description": "Add a 1x2 red brick on the left",
      "pieces": [
        {
          "type": "brick-1x2",
          "color": "#f44336",
          "gridX": -1,
          "gridZ": 0,
          "layer": 1
        }
      ]
    }
  ]
}
```

### Pattern 2: Stud Grid Coordinate System

**What:** All piece positions are expressed in stud-grid coordinates (integer gridX, gridZ, layer), not raw world units. The renderer converts to world space when placing meshes.

**When to use:** Always — raw world coordinates drift with rounding errors and make data files hard to author.

**Trade-offs:** Requires a canonical conversion function that must be consistent across geometry factory, snap resolver, and set data.

**Conversion (confirmed against LDraw standard):**
- 1 stud = 8mm real-world = 8 Three.js units (if 1 unit = 1mm)
- Standard brick height = 9.6 units (3.2 per plate)
- World X = gridX * 8
- World Z = gridZ * 8
- World Y = layer * 9.6 (bricks) or layer * 3.2 (plates)

```javascript
// geometry.js / grid.js
const STUD_SIZE = 8;       // world units per stud
const BRICK_HEIGHT = 9.6;  // world units per brick layer
const PLATE_HEIGHT = 3.2;  // world units per plate layer

function gridToWorld(gridX, gridZ, layer, pieceType) {
  const height = pieceType.startsWith('plate') ? PLATE_HEIGHT : BRICK_HEIGHT;
  return new THREE.Vector3(
    gridX * STUD_SIZE,
    layer * height,
    gridZ * STUD_SIZE
  );
}

function worldToGrid(worldPos, pieceType) {
  const height = pieceType.startsWith('plate') ? PLATE_HEIGHT : BRICK_HEIGHT;
  return {
    gridX: Math.round(worldPos.x / STUD_SIZE),
    gridZ: Math.round(worldPos.z / STUD_SIZE),
    layer: Math.round(worldPos.y / height)
  };
}
```

### Pattern 3: Ghost Mesh as Separate Scene Object

**What:** The ghost (transparent preview of the target position) is a dedicated `THREE.Mesh` that is shown, repositioned, and hidden independently from placed bricks. It is never a child of a placed brick.

**When to use:** For the guided build overlay indicating where the next piece goes.

**Trade-offs:** Simple to implement; the ghost mesh must be updated every time the current step changes.

**Example:**
```javascript
// ghost.js
const ghostMaterial = new THREE.MeshBasicMaterial({
  color: 0x2196f3,
  transparent: true,
  opacity: 0.4,
  depthWrite: false   // prevents z-fighting with placed bricks
});

let ghostMesh = null;

function showGhost(geometry, worldPosition) {
  if (ghostMesh) scene.remove(ghostMesh);
  ghostMesh = new THREE.Mesh(geometry, ghostMaterial);
  ghostMesh.position.copy(worldPosition);
  scene.add(ghostMesh);
}

function hideGhost() {
  if (ghostMesh) scene.remove(ghostMesh);
  ghostMesh = null;
}
```

### Pattern 4: Raycaster-Based Pick and Snap

**What:** On mouse click, cast a ray from camera through mouse position. If it hits the baseplate or a placed brick's top face, compute the snapped grid position. If it matches the target from current step data, confirm placement.

**When to use:** This is the primary interaction mechanism for placing bricks.

**Trade-offs:** Raycasting against many meshes is CPU-expensive; throttle to mouse-down events only (not every mousemove) for snap-confirmation. Mousemove can use a coarser check for ghost positioning.

```javascript
// interaction.js
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

canvas.addEventListener('click', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(placedMeshes.concat([baseplate]));

  if (hits.length > 0) {
    const snapped = worldToGrid(hits[0].point, state.heldPiece.type);
    if (matchesTarget(snapped, state.currentStepTarget)) {
      confirmPlacement(snapped);
    }
  }
});
```

## Data Flow

### Set Loading Flow

```
User selects set on selection screen
    ↓
sets.js: fetch('/api/sets/:id')
    ↓
Flask returns set JSON
    ↓
state.js: setData = parsed JSON, currentStep = 0, placedPieces = []
    ↓
instructions.js: render step 1 description + piece list
    ↓
tray.js: render piece tray for step 1
    ↓
ghost.js: show ghost at step 1 target position
    ↓
scene.js: camera orbits built model
```

### Piece Placement Flow

```
User clicks piece in tray
    ↓
tray.js: dispatch pickPiece(pieceId) → state.heldPiece = piece
    ↓
interaction.js: activates placement raycasting mode
    ↓
User clicks in 3D viewport
    ↓
interaction.js: raycast → snap to grid → validate against currentStepTarget
    ↓ (if valid)
state.js: placedPieces.push(piece), heldPiece = null
brickMesh.js: add mesh to scene at snapped world position
ghost.js: hideGhost()
    ↓
instructions.js: check if all step pieces placed → advance step or show completion
    ↓ (if step complete)
state.js: currentStep++
tray.js: re-render for new step
ghost.js: showGhost at new step's target
```

### State Management

```
state.js (single object, imported by all modules)
    ↓ (read)
tray.js         → renders available pieces
instructions.js → renders current step
ghost.js        → positions ghost overlay
interaction.js  → validates placements
brickMesh.js    → knows which meshes exist

    ↑ (write — only via explicit state mutations)
interaction.js  → confirmPlacement()
tray.js         → pickPiece()
instructions.js → advanceStep()
```

### Key Data Flows

1. **Set data → Scene:** JSON is loaded once per session. The geometry factory pre-builds one `BufferGeometry` per brick type referenced in the set, then reuses it for all meshes and the ghost.
2. **State → UI:** UI panels (tray, instructions) are re-rendered from state on every state mutation. No two-way binding; state is the authority.
3. **Mouse → World → Grid → State:** All interaction passes through the snap resolver before touching state. No raw world coordinates are ever stored in state.
4. **State → Scene:** Scene meshes are added/removed reactively when `placedPieces` changes. The scene never reads JSON directly.

## Scaling Considerations

This is a personal/portfolio project with no multi-user requirements. Scaling concerns are front-end rendering only.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 3-5 sets, ~50 pieces/set | Monolith JS modules, single Flask process — appropriate for v1 |
| 10+ sets, 200+ pieces | Pre-compute geometry buffers on load; consider merging static meshes per step using `BufferGeometryUtils.mergeGeometries` |
| Free-build sandbox (v2) | Replace step-driven state machine with free-form placement map; add collision detection layer |

### Scaling Priorities

1. **First bottleneck:** Raycaster intersecting all placed meshes slows as brick count grows. Fix: maintain a separate flat `hitTargets[]` array of simplified collision planes rather than testing full brick geometry.
2. **Second bottleneck:** Many individual `Mesh` objects vs. `InstancedMesh`. For the guided build with ~50 pieces this is not an issue. For free-build v2 with hundreds of bricks, switch to `InstancedMesh` per brick type per color.

## Anti-Patterns

### Anti-Pattern 1: Storing World Coordinates in Set Data

**What people do:** Define piece positions as `{ x: 32.0, y: 9.6, z: 0.0 }` in JSON.

**Why it's wrong:** Floating-point drift makes equality checks unreliable. Data files become hard to read and author. Refactoring the coordinate scale breaks all existing sets.

**Do this instead:** Store integer grid coordinates `{ gridX: 4, gridZ: 0, layer: 1 }`. Convert to world space in one canonical function at render time.

### Anti-Pattern 2: Mutating the Three.js Scene as Primary State

**What people do:** Add meshes to the scene and then query the scene to determine build progress (`scene.children.length === totalPieces`).

**Why it's wrong:** Three.js scene graph is a rendering concern, not a data concern. Querying it for game logic creates tight coupling. The scene may contain non-brick objects (ghost, lights, baseplate) that pollute counts.

**Do this instead:** Maintain `state.placedPieces[]` as the canonical record. The scene is a side-effect that mirrors state. When state says a brick is placed, add it to the scene. Never go the other direction.

### Anti-Pattern 3: One Mesh Per Brick Type Per Color (Geometry Duplication)

**What people do:** Create a new `BoxGeometry` for every brick instantiated in the scene.

**Why it's wrong:** Geometry allocation is expensive. Fifty 2x4 bricks create fifty identical geometry objects in GPU memory.

**Do this instead:** Geometry factory caches one `BufferGeometry` per brick type. All meshes of the same type share it. Color differences are handled by `MeshStandardMaterial` instances (materials are cheaper to duplicate than geometry).

### Anti-Pattern 4: Raycasting on Every Mousemove Frame

**What people do:** Run the full raycaster intersect loop inside `requestAnimationFrame` or a `mousemove` handler.

**Why it's wrong:** Raycasting against 50+ meshes every frame causes measurable frame-rate drops on mid-range hardware.

**Do this instead:** Use `mousemove` only to update the ghost mesh position (raycast against the baseplate plane only — fast). Use `click` for the placement validation raycast (runs once per user action). Throttle ghost raycasting to 30Hz if needed.

### Anti-Pattern 5: Flask as a Heavy Application Server

**What people do:** Render Jinja templates with dynamic Lego state, make Flask track session/build progress server-side.

**Why it's wrong:** This couples backend to frontend state, complicates the architecture, and provides no benefit for a single-user portfolio project.

**Do this instead:** Flask serves static files and a dumb data API (`GET /api/sets`, `GET /api/sets/:id`). All state lives in the browser. Flask is a file-and-data server, not an application server.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| None (v1) | — | No third-party services in scope |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Flask → Browser | HTTP JSON response | Set data fetched once on set selection; static assets served normally |
| state.js → scene.js | Direct function calls | `scene.js` exports `addBrick(piece, position)`, `removeBrick(id)` |
| state.js → UI modules | Direct function calls | `tray.js` exports `render(state)`, called on every state change |
| interaction.js → state.js | Direct mutation via exported functions | `state.confirmPlacement(piece)` — not raw property assignment |
| geometry.js → brickMesh.js | Shared geometry references | `geometry.js` exports `getGeometry(type)` — cache is internal |

## Component Build Order

Build in this sequence to avoid blocked work:

1. **Flask backend + set JSON schema** — Defines the data contract everything else consumes. No frontend work is correct without this.
2. **Three.js scene bootstrap** (scene.js, camera, lights, baseplate) — Proves the renderer works before adding complexity.
3. **Geometry factory** (geometry.js) — Build brick shapes for all v1 types (brick, plate, slope). Verify in isolation with a test scene.
4. **App state module** (state.js) — Define the state shape and mutation functions against the set JSON schema.
5. **Set loading + piece rendering** (sets.js + brickMesh.js) — Fetch a set, place all pieces at once to verify coordinate conversion.
6. **Ghost mesh** (ghost.js) — Overlay the target piece; verify depth/transparency.
7. **Interaction layer** (interaction.js) — Raycasting, snap, pick/place. Depends on scene, ghost, and state.
8. **Piece tray UI** (tray.js) — Depends on state and interaction.
9. **Instruction panel UI** (instructions.js) — Depends on state; can be built in parallel with tray.
10. **Set selection screen** — Depends on the API; can be the last thing wired together.

## Sources

- [Three.js Scene Graph fundamentals](https://threejsfundamentals.org/threejs/lessons/threejs-scenegraph.html)
- [Three.js InstancedMesh docs](https://threejs.org/docs/pages/InstancedMesh.html)
- [Three.js Material.transparent](https://threejs.org/docs/#api/en/materials/Material.transparent)
- [Raycasting and Picking — DeepWiki three.js](https://deepwiki.com/mrdoob/three.js/5.1-raycasting-and-picking)
- [LDraw stud dimensions (8mm/20 LDU standard)](https://www.brickowl.com/help/stud-dimensions)
- [LEGO basic dimensions guide](https://grabcad.com/tutorials/lego-01-basic-dimensions-bricks-explained)
- [buildinginstructions.js — browser-based Lego instruction renderer](https://github.com/LasseD/buildinginstructions.js/)
- [brick-builder — React/Three.js open source brick builder](https://github.com/nicmosc/brick-builder)
- [lego-builder — R3F open source brick builder](https://github.com/bhushan6/lego-builder)
- [Flask static file serving](https://flask.palletsprojects.com/en/stable/api/)
- [Designing a RESTful API with Python and Flask](https://blog.miguelgrinberg.com/post/designing-a-restful-api-with-python-and-flask)
- [Three.js Raycaster tutorial](https://sbcode.net/threejs/raycaster/)

---
*Architecture research for: Web-based guided 3D Lego brick builder (Flask + Three.js)*
*Researched: 2026-04-05*
