# Virtual 3D Lego Builder

## What This Is

A web-based virtual Lego building application where users select pre-built sets and follow step-by-step instructions to assemble 3D models. Built on Python/Flask with Three.js for 3D rendering. Users pick pieces from a tray, see ghost overlays showing where each piece goes, and snap bricks onto a stud grid to complete builds. A personal/portfolio project.

## Core Value

A user can select a set, follow guided instructions, and build a complete 3D Lego model from start to finish.

## Requirements

### Validated

- [x] 3D scene with baseplate and camera controls (orbit, zoom, pan) — Validated in Phase 1
- [x] Brick library with standard bricks, plates, and slopes in multiple colors — Validated in Phase 1
- [x] Stud-grid snapping — bricks connect only at valid Lego positions — Validated in Phase 2
- [x] Piece tray showing all pieces in the current set — Validated in Phase 2
- [x] Pick a piece from tray into "hand" — piece and main model can be manipulated independently — Validated in Phase 2
- [x] Ghost/transparent overlay on the model showing where the next piece goes — Validated in Phase 2
- [x] Step-by-step instruction panel guiding the user through the build — Validated in Phase 2
- [x] Set data format defining pieces, positions, and build order — Validated in Phase 1

### Active

- [ ] Set selection screen — choose from 3-5 pre-built sets
- [ ] Completion state — finished model displayed when all pieces placed

### Out of Scope

- Free build / sandbox mode — deferred to v2, guided build is the v1 focus
- User accounts or login — personal project, no multi-user needed
- Saving/loading progress — v2 feature
- Specialty pieces (wheels, windows, minifigs) — v2 after core brick types work
- Mobile/touch support — desktop mouse interaction first
- Multiplayer or sharing — personal project scope

## Context

- Python/Flask backend serving the web app and set data
- Three.js for all 3D rendering, interaction, and camera controls
- Lego brick geometry follows real-world stud spacing (8mm grid standard)
- Sets are data-driven — JSON or similar format defining pieces, colors, positions, and build sequence
- 3-5 sets of varying complexity for v1 (e.g., small house, car, simple animal)
- Brick types for v1: standard bricks (1x1 through 2x4), plates (flat 1/3-height bricks), slopes/wedges

## Constraints

- **Tech stack**: Python + Flask backend, Three.js frontend — user's preference
- **Scope**: Personal/portfolio project — no production infrastructure needed
- **Interaction**: Mouse-only for v1 — orbit/zoom/pan for camera, click to pick and place bricks
- **Rendering**: Must run smoothly in modern browsers — keep polygon counts reasonable

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Three.js over Babylon.js | Lighter weight, bigger ecosystem, more Lego examples available | — Pending |
| Guided build before free build | Clear "done" state, structured interaction easier to build first | — Pending |
| Snap-only placement (no free positioning) | Simpler collision logic, authentic Lego feel | — Pending |
| Piece tray over auto-provide | More engaging — user finds the right piece like real Lego | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-05 after Phase 2 completion — core build loop validated*
