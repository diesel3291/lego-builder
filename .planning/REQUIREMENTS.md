# Requirements: Virtual 3D Lego Builder

**Defined:** 2026-04-05
**Core Value:** A user can select a set, follow guided instructions, and build a complete 3D Lego model from start to finish.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### 3D Scene

- [ ] **SCENE-01**: 3D scene with baseplate and OrbitControls (orbit, zoom, pan)
- [ ] **SCENE-02**: Brick geometry library — standard bricks (1x1 through 2x4), plates, slopes in multiple colors
- [ ] **SCENE-03**: Baseplate stud grid visualization for spatial orientation
- [ ] **SCENE-04**: Exploded-view placement animation — piece tweens into final position

### Build System

- [ ] **BUILD-01**: Stud-grid snapping — bricks lock to valid 8mm grid positions only
- [ ] **BUILD-02**: Valid placement feedback — visual confirmation on success, error indication on invalid drop
- [ ] **BUILD-03**: Undo last placement — reverse most recent brick and restore it to tray
- [ ] **BUILD-04**: Incorrect placement detection — flag when piece is placed in wrong position

### Guided Build

- [ ] **GUIDE-01**: Step state machine — tracks current step, advances on correct placement
- [ ] **GUIDE-02**: Ghost/transparent overlay showing where current piece goes
- [ ] **GUIDE-03**: Instruction panel — step N of M with Next/Back navigation
- [ ] **GUIDE-04**: Step camera zoom — camera auto-focuses on area where next piece goes

### UI & Interaction

- [ ] **UI-01**: Piece tray showing pieces for current step with correct colors
- [ ] **UI-02**: Piece-in-hand selection — picked piece highlighted with visual feedback
- [ ] **UI-03**: Set selection screen — choose from 3-5 sets with thumbnails and metadata
- [ ] **UI-04**: Completion state — congratulatory screen when all steps done

### Data & Backend

- [ ] **DATA-01**: Set data format (JSON) — defines pieces, positions, colors, build sequence
- [ ] **DATA-02**: Flask backend serving static files and set data API
- [ ] **DATA-03**: 3-5 pre-built sets of varying complexity
- [ ] **DATA-04**: Progress indicator — step N of M counter in instruction panel

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Free Build

- **FREE-01**: Open sandbox mode — place bricks freely without guided instructions
- **FREE-02**: Full piece catalog beyond curated set pieces

### Persistence

- **SAVE-01**: Save/load build progress via localStorage
- **SAVE-02**: Session persistence across browser refresh

### Specialty Pieces

- **SPEC-01**: Wheels, windows, doors, minifig parts geometry
- **SPEC-02**: Specialty piece snapping rules (non-stud connections)

### Mobile

- **MOBILE-01**: Touch-based orbit, zoom, and pan controls
- **MOBILE-02**: Responsive layout for piece tray and instruction panel

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| User accounts / authentication | Personal project — no multi-user needed |
| Cloud save / database | localStorage sufficient for v1; no backend persistence |
| Multiplayer / co-op building | Enormous complexity for no v1 value |
| Photorealistic rendering | Real-time browser can't match offline raytracing; good PBR is sufficient |
| Physics simulation | Stud-grid snapping IS the physics; simulation adds CPU cost with no benefit |
| AI-generated sets | Unsolved hard problem; pre-authored JSON sets are reliable |
| Full brick catalog (10,000+ parts) | Performance and UX issues; 20-30 curated types sufficient for v1 |
| Mobile / touch support | Requires interaction model redesign; desktop mouse first |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCENE-01 | Phase 1 | Pending |
| SCENE-02 | Phase 1 | Pending |
| SCENE-03 | Phase 1 | Pending |
| SCENE-04 | Phase 4 | Pending |
| BUILD-01 | Phase 2 | Pending |
| BUILD-02 | Phase 2 | Pending |
| BUILD-03 | Phase 4 | Pending |
| BUILD-04 | Phase 4 | Pending |
| GUIDE-01 | Phase 2 | Pending |
| GUIDE-02 | Phase 2 | Pending |
| GUIDE-03 | Phase 2 | Pending |
| GUIDE-04 | Phase 3 | Pending |
| UI-01 | Phase 2 | Pending |
| UI-02 | Phase 2 | Pending |
| UI-03 | Phase 3 | Pending |
| UI-04 | Phase 3 | Pending |
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| DATA-04 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-05*
*Last updated: 2026-04-05 after roadmap creation*
