---
phase: 01-foundation
plan: 01
subsystem: api
tags: [flask, python, pytest, json-schema, cors, dotenv]

# Dependency graph
requires: []
provides:
  - Flask backend with GET /api/sets and GET /api/sets/<set_id> routes
  - Set JSON schema v1 (the data contract for all set authors and Phase 2)
  - validate_set() function enforcing all required fields, valid piece types, valid rotations, and integer grid constraints
  - pytest suite with 8 tests covering routes and schema validation
  - _sets_cache dict shape: {id -> full set JSON object}
affects:
  - 01-02 (Three.js scene reads set data via /api/sets/<id> — field names must match exactly)
  - 01-03 (Set authors write files conforming to this schema)
  - phase-2 (frontend geometry.js must use same 13 piece type strings; state.js reads _sets_cache response shape)

# Tech tracking
tech-stack:
  added:
    - flask==3.1.3
    - flask-cors==4.0.2
    - python-dotenv==1.0.1
    - pytest==8.3.5
  patterns:
    - Sets loaded at Flask startup from SETS_DIR/*.json, cached in _sets_cache dict
    - Schema validation at startup (fail-loud with SystemExit) — not at request time
    - All routes return jsonify() — never raw dict
    - FLASK_DEBUG defaults off via os.getenv('FLASK_DEBUG', '0') == '1'
    - Integer stud-grid coordinates (gridX, gridZ, layer) — no floating-point positions in set data

key-files:
  created:
    - app.py
    - requirements.txt
    - .env.example
    - .gitignore
    - sets/schema.md
    - tests/test_api.py
  modified: []

key-decisions:
  - "Set JSON schema v1 field names locked: schemaVersion, id, name, description, pieceCount, steps[].stepNumber, steps[].pieces[].gridX, steps[].pieces[].gridZ, steps[].pieces[].layer, steps[].pieces[].rotation — changing these after Phase 2 starts cascades across set files, state.js, and geometry lookups"
  - "13 valid piece types locked: brick-1x1/1x2/1x3/1x4/2x2/2x3/2x4, plate-1x1/1x2/1x4/2x2/2x4, slope-2x1/slope-2x2 — geometry.js in Plan 02 must match exactly"
  - "World-space conversion: X=gridX*8, Z=gridZ*8, Y=layer*9.6 (bricks/slopes) or Y=layer*3.2 (plates)"
  - "Schema validation runs at startup via _load_sets() — invalid JSON files prevent server start with clear field-level error messages"

patterns-established:
  - "Pattern: validate_set(data, filepath='') returns list of error strings — empty list = valid; callers check len(errors) > 0"
  - "Pattern: _sets_cache is a module-level dict {str -> dict}; route tests patch it directly via flask_app_module._sets_cache"
  - "Pattern: GET /api/sets returns summary objects (id, name, description, pieceCount); GET /api/sets/<id> returns full set JSON"

requirements-completed: [DATA-01, DATA-02]

# Metrics
duration: 3min
completed: 2026-04-05
---

# Phase 1 Plan 01: Foundation Summary

**Flask backend serving set data via /api/sets routes with startup schema validation enforcing the v1 data contract (13 piece types, integer stud grid, 0/90/180/270 rotations)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-05T07:24:47Z
- **Completed:** 2026-04-05T07:27:14Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Defined and documented the v1 set JSON schema (the locked data contract for all future set authors and Phase 2 frontend)
- Flask app with /api/sets (catalogue) and /api/sets/<set_id> (full set) routes, both always returning jsonify()
- validate_set() enforces all required fields, 13 valid piece type strings, valid rotations (0/90/180/270), and integer constraints on gridX/gridZ/layer — runs at startup so bad set files are caught before serving any requests
- 8 pytest tests passing, covering 200/404 route behavior and all validator rejection paths

## Task Commits

Each task was committed atomically:

1. **Task 1: Project scaffold and set JSON schema** - `c9bd725` (chore)
2. **Task 2: Flask app with API routes and startup schema validation** - `34f2e8f` (feat)

## Files Created/Modified

- `/Users/chien/lego-builder/app.py` - Flask app: CORS, dotenv, _sets_cache, validate_set(), /api/sets, /api/sets/<set_id>
- `/Users/chien/lego-builder/requirements.txt` - Pinned dependencies: flask==3.1.3, flask-cors==4.0.2, python-dotenv==1.0.1, pytest==8.3.5
- `/Users/chien/lego-builder/.env.example` - Config template: FLASK_DEBUG, FLASK_RUN_PORT, SETS_DIR
- `/Users/chien/lego-builder/.gitignore` - Ignores .venv/, __pycache__/, *.pyc, .env, node_modules/, dist/, .DS_Store
- `/Users/chien/lego-builder/sets/schema.md` - Authoritative v1 set JSON schema: all 13 piece types, integer grid coordinate system with world-space conversion formulas, rotation field, schemaVersion, 2-step example
- `/Users/chien/lego-builder/tests/test_api.py` - 8 pytest tests: route 200/404, validate_set() unit tests

## Decisions Made

- Pinned exact library versions (no `>=`) for reproducibility on a personal project
- validate_set() is a standalone importable function (not a method) so tests can call it directly without spinning up Flask
- Schema validator uses isinstance(x, int) for gridX/gridZ/layer — catches float drift at the data level before any rendering converts coordinates
- FLASK_DEBUG defaults to '0' via os.getenv pattern; only enabled by explicit env var to prevent accidental Werkzeug debugger exposure

## Deviations from Plan

None - plan executed exactly as written.

One minor adaptation: `list[str]` return type annotation in validate_set() was changed to `list` (without brackets) for Python 3.9 compatibility (3.9 doesn't support `list[str]` syntax in runtime annotations without `from __future__ import annotations`). This is a correctness fix, not a functional change.

## Issues Encountered

- `uv` was not on PATH in the worktree shell; installed via `brew install uv`, then used absolute path `/opt/homebrew/bin/uv` to create the venv and install dependencies.
- Python 3.9 (system Python on macOS) doesn't support `list[str]` runtime annotation syntax — changed to `list` to avoid TypeError on import.

## Threat Surface Scan

No new threat surface beyond what the plan's threat model documented. All mitigations implemented:

- T-01-01 (Tampering via set files): validate_set() rejects malformed files at startup before any HTTP serving
- T-01-02 (Info disclosure via set_id): Returns {"error": "Set not found"} with 404; no file paths, stack traces, or directory listings exposed
- T-01-03 (Debug mode): FLASK_DEBUG defaults to '0'; debug=True requires explicit env var

## User Setup Required

None - no external service configuration required. To run:

```bash
cd /Users/chien/lego-builder
/opt/homebrew/bin/uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
python -m pytest tests/test_api.py -v
FLASK_DEBUG=1 flask run --port 5000
```

## Self-Check: PASSED

All created files verified present on disk. Both task commits (c9bd725, 34f2e8f) and final metadata commit (1df6151) verified in git log.

## Next Phase Readiness

- Flask backend complete and tested — ready for Plan 02 (Three.js scene bootstrap) and Plan 03 (set data files)
- Plan 02 (Three.js) can import set data via GET /api/sets and GET /api/sets/<id> immediately
- Plan 03 (set files) must author JSON files conforming to sets/schema.md; any schema violations will be caught at Flask startup
- The 13 piece type strings in VALID_TYPES (app.py) must match exactly the geometry factory strings in geometry.js (Plan 02)

---
*Phase: 01-foundation*
*Completed: 2026-04-05*
