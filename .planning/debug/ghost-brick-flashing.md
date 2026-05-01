---
status: awaiting_human_verify
trigger: "ghost-brick-flashing — Ghost brick overlay flashes/flickers instead of stable translucent render"
created: 2026-04-29T00:00:00Z
updated: 2026-04-29T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — `side: THREE.DoubleSide` on transparent ghost + preview materials with `depthWrite: false` causes per-frame sort instability under OrbitControls damping micro-jitter.
test: Fix applied: removed DoubleSide on ghost fill (frontend/src/ghost.js) and preview (frontend/src/interaction.js). Bumped ghost edges.renderOrder 1→2 and preview renderOrder 2→3 so all overlays sort deterministically. Rebuilt frontend successfully (zero DoubleSide refs in bundle).
expecting: User hard-refreshes http://localhost:5001 → ghost preview is rock-steady translucent, no flicker.
next_action: Await user verification, then commit and archive.

## Symptoms

expected: Ghost brick renders as a stable, smoothly-shaded translucent preview at the target stud position. No visual flicker. Opacity and color remain steady frame-to-frame.
actual: The ghost brick flashes — visible flicker on the ghost overlay. User observed at http://localhost:5001 after rebrand quick task (commit 2eba331).
errors: None reported in console
reproduction: Run `bash run.sh` (PORT=5001), pick any set, watch the ghost preview on baseplate / on top of placed bricks.
started: Not explicitly stated; must check recent commits including 849a7af (capped studs via LatheGeometry + chamfered brick bodies) which is most likely culprit since it added new sub-mesh geometry.

## Eliminated

- hypothesis: Ghost has stud + body sub-meshes with inconsistent material flags
  evidence: geometry.js `getGeometry()` returns a SINGLE merged BufferGeometry (line 540: `mergeGeometries(parts)` then `_cache.set`). Ghost mesh in ghost.js:31 is one mesh with one material — sub-meshes are not a thing here.
  timestamp: 2026-04-29

- hypothesis: Per-frame ghost mesh recreation
  evidence: scene.js `_animate()` (line 147) only calls `controls.update()` and `renderer.render()`. ghost.js `showGhost`/`showStepGhosts` are only called on step advance (interaction.js:230). pointermove never calls ghost-creation; it only updates `_previewMesh`. No ghost recreation in animation loop.
  timestamp: 2026-04-29

- hypothesis: GSAP opacity tween churn on the ghost
  evidence: Searched for tweens — interaction.js only tweens preview color on reject (line 256-264) and placement color (line 198-206). Neither targets `opacity`. No opacity tweens on ghost material exist.
  timestamp: 2026-04-29

- hypothesis: Recent rebrand commits caused regression
  evidence: Will rule out by `git log --oneline frontend/src/ghost.js` and diff. (TBD — but symptoms-prefilled context already notes rebrand commits only touched HTML/JS strings in HUD/tray/selection.)
  timestamp: 2026-04-29

## Evidence

- timestamp: 2026-04-29
  checked: frontend/src/ghost.js material setup (lines 23-29)
  found: Ghost fill material has `transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide`. **`side: THREE.DoubleSide` on a transparent translucent material with `depthWrite: false` causes visible flicker** because each frame, both back and front faces of every triangle are submitted with depthTest:true but no depthWrite — the transparent fragments are drawn in arbitrary triangle order, and double-sided rendering doubles the number of overlapping translucent surfaces at the SAME depth. The renderer cannot consistently order them, so per-frame render order varies with camera micro-jitter (OrbitControls damping is on — `controls.dampingFactor = 0.08` in scene.js:47, so even when the user is "still" the camera is constantly settling). This is the classic z-fight-style flicker for translucent doubled surfaces.
  implication: Removing `side: THREE.DoubleSide` (default is `FrontSide`) on the ghost fill should eliminate the flicker. The ghost is convex enough that single-sided is correct.

- timestamp: 2026-04-29
  checked: frontend/src/ghost.js renderOrder (lines 32 + 47)
  found: Both fill mesh AND edge LineSegments have `renderOrder = 1` — same value. With both transparent and depthWrite:false, the edges and the fill at the same renderOrder also have ambiguous draw order. Edges drawn before fill → fine. Edges drawn after fill → fine. But the order can flip per frame, contributing to flicker.
  implication: Set `edges.renderOrder = 2` (above fill) so edges always draw last and consistently.

- timestamp: 2026-04-29
  checked: frontend/src/scene.js animation loop (line 147)
  found: Standard rAF loop, no per-frame mesh creation, only `controls.update()` + `renderer.render()`. OrbitControls damping is enabled (line 47, dampingFactor 0.08), so camera position changes slightly each frame even when user is still — this exposes any unstable transparent sort ordering as flicker.
  implication: Confirms the symptom fits "transparent surfaces sorted inconsistently" rather than mesh churn.

- timestamp: 2026-04-29
  checked: frontend/src/interaction.js _createPreview (lines 286-292)
  found: Preview mesh ALSO uses `side: THREE.DoubleSide` with `transparent: true, opacity: 0.5, depthWrite: false`. SAME bug class. Preview only appears while user is holding a piece. The preview SNAPS to the exact ghost world position when within SNAP_DISTANCE (interaction.js:357-368), creating two coincident transparent meshes at the same xyz. With both DoubleSided + depthWrite:false, this creates 4 layers of translucent geometry (preview front+back × ghost front+back) all at the same depth → maximum sort instability.
  implication: Apply the same `side` removal to the preview material. Also: when snapped, hide the underlying ghost (or reduce its opacity to 0) so only one translucent surface renders at the snap position. Minimal fix is to just remove DoubleSide on both — that already collapses 4 layers → 2 layers, and the remaining 2 are identical and depth-coincident, which alpha-blend deterministically.

- timestamp: 2026-04-29
  checked: git log -- frontend/src/ghost.js (1409d99 = original creation, dc26b16 = boss rename)
  found: `side: THREE.DoubleSide` has been on the ghost material since the very first commit that created ghost.js (1409d99). The flag is the latent root cause. Recent commits (849a7af capped studs via LatheGeometry, body chamfering via RoundedBoxGeometry) added MORE triangles and curved surfaces to the merged geometry — this multiplied the number of translucent doubled fragments and made the latent bug visually obvious. The rebrand commits (4139a7f, e02d36c, 2eba331) only touched HTML/JS strings — confirmed not implicated.
  implication: Fix is DoubleSide removal on ghost + preview materials, plus a renderOrder tweak so edges always draw above fill. No regression risk on the cited rebrand commits.

## Resolution

root_cause: Ghost (frontend/src/ghost.js) and preview (frontend/src/interaction.js) materials use `side: THREE.DoubleSide` together with `transparent: true, depthWrite: false`. With DoubleSided rendering, every triangle is submitted twice — back face and front face — at the same depth. With depthWrite disabled, the WebGL pipeline cannot disambiguate the draw order of those coincident fragments. Camera micro-jitter from OrbitControls damping (dampingFactor 0.08) re-evaluates per-frame triangle sort order, flipping which layer wins → visible flicker. Recent geometry additions (chamfered RoundedBoxGeometry bodies + LatheGeometry capped studs) multiplied the number of translucent surfaces, making the latent bug obvious. Same bug class affects the cursor-follower preview, which is doubly-bad when it snaps to coincide with a ghost position (4 coincident translucent surfaces).
fix: |
  1. frontend/src/ghost.js — Removed `side: THREE.DoubleSide` from the ghost
     fill MeshStandardMaterial (defaults to FrontSide). Bumped edge LineSegments
     `renderOrder` from 1 to 2 so edges always draw above the fill and never lose a
     same-renderOrder sort tie.
  2. frontend/src/interaction.js — Removed `side: THREE.DoubleSide` from the
     cursor-follower preview MeshStandardMaterial. Bumped preview `renderOrder` from
     2 to 3 so it now sorts above ghost fill (1) AND ghost edges (2).
  3. Rebuilt frontend (`npm run build`) so the running Flask server at :5001
     reflects the change. New bundle: static/assets/index-D-GXV-tC.js — verified
     zero `DoubleSide` references remain in the built bundle.
verification: |
  - npm run build: clean, exit 0, 24 modules transformed.
  - grep DoubleSide built bundle: 0 occurrences (was non-zero before).
  - All other ghost rendering invariants preserved per CLAUDE.md guidance:
    transparent: true, opacity: 0.25, depthWrite: false still set on ghost.
  - No regression to placed-brick rendering (no changes outside the two preview
    material literals).
  - Awaiting user confirmation in browser at http://localhost:5001 (hard-refresh
    the page or clear cache so the new bundle loads).
files_changed:
  - frontend/src/ghost.js
  - frontend/src/interaction.js
  - static/index.html (regenerated by vite build)
  - static/assets/index-D-GXV-tC.js (regenerated by vite build)
