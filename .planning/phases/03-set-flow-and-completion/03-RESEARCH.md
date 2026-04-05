# Phase 3: Set Flow and Completion - Research

**Researched:** 2026-04-05
**Domain:** Three.js screen transitions, camera animation, set selection UI, completion overlays
**Confidence:** HIGH

## Summary

Phase 3 adds the full start-to-finish user journey: a set selection screen, camera auto-focus on each step's target area, and a congratulatory completion overlay. All required building blocks already exist in the codebase — OrbitControls with `autoRotate`, GSAP for tweening, the `/api/sets` endpoint, and the `onBuildComplete` callback. This phase is almost entirely wiring existing pieces together with new HTML overlay elements.

The primary implementation challenge is the GSAP + OrbitControls camera tween pattern: tweening `camera.position` and `controls.target` simultaneously while calling `controls.update()` in the `onUpdate` callback prevents the snap-back bug that afflicts naive implementations. Every other feature (set selection cards, fade overlays, completion screen, build timer) is straightforward DOM and state work.

**Primary recommendation:** Build Phase 3 as three additive modules — `selection.js` (set selection screen), `completion.js` (completion overlay + timer), and extend `scene.js` with a `focusCamera()` export. Wire them together in `main.js` by replacing the hardcoded `startBuild()` call with a selection flow.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Centered list layout — vertical list of sets, one per row, thumbnail on left, info on right
- **D-02:** 3D preview render thumbnails — render the completed model in a small Three.js canvas or snapshot for each set
- **D-03:** Star difficulty rating (1-3 stars) derived from piece count — easy visual indicator alongside set name and piece count
- **D-04:** Full celebration overlay screen — congratulatory message with the completed model visible and auto-rotating in the background, plus "Build Again" and "New Set" buttons
- **D-05:** Track and display build time — elapsed time from first piece placed to last, shown on completion screen (e.g., "3m 24s")
- **D-06:** Slow auto-orbit on completion — camera auto-rotates around the finished model using OrbitControls.autoRotate
- **D-07:** Smooth tween camera to target area on step advance — use GSAP (already in project) to animate camera position/target to frame the next piece's location
- **D-08:** Zoom to fit — camera adjusts distance so the target piece area fills a comfortable portion of the viewport
- **D-09:** Fade transitions between screens — CSS opacity transitions; selection screen is HTML overlay, build is the 3D canvas, completion is overlay on canvas
- **D-10:** Back button in HUD to quit mid-build — small back arrow or X that returns to set selection with confirmation if pieces have been placed

### Claude's Discretion
- Exact fade transition duration and easing
- How to generate/cache 3D preview thumbnails (offscreen canvas, pre-rendered snapshots, etc.)
- Difficulty star thresholds (which piece counts map to 1/2/3 stars)
- Camera tween duration and easing curve
- Zoom-to-fit distance calculation approach
- Confirmation dialog style for mid-build exit

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-03 | Set selection screen — choose from 3-5 sets with thumbnails and metadata | Selection screen HTML overlay + `/api/sets` fetch + thumbnail rendering (D-01 through D-03) |
| UI-04 | Completion state — congratulatory screen when all steps done | Completion overlay triggered by existing `onBuildComplete` callback (D-04 through D-06) |
| GUIDE-04 | Step camera zoom — camera auto-focuses on area where next piece goes | GSAP tween of `camera.position` + `controls.target` on each `onStepAdvance` callback (D-07, D-08) |
</phase_requirements>

---

## Standard Stack

### Core (already in project — no new installs)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Three.js | r183 | Offscreen thumbnail rendering + scene camera | Already installed; `WebGLRenderer` with separate offscreen canvas for thumbnails [VERIFIED: codebase grep] |
| GSAP | 3.x | Camera tween animation | Already imported in `interaction.js`; confirmed pattern for OrbitControls tween [VERIFIED: codebase grep] |
| OrbitControls | bundled (three/addons) | `autoRotate` / `autoRotateSpeed` for completion screen | Already initialized in `scene.js` with `getControls()` export [VERIFIED: codebase grep] |

### No new npm dependencies required
All functionality is achievable with the existing stack. No additional libraries to install.

**Version verification:** Three.js r183, GSAP 3.x — confirmed as installed via `frontend/src/interaction.js` imports. [VERIFIED: codebase grep]

---

## Architecture Patterns

### Recommended Project Structure additions
```
frontend/src/
├── main.js           # Replace hardcoded startBuild() with selection flow orchestration
├── selection.js      # NEW: Set selection screen module (fetch sets, render cards, thumbnails)
├── completion.js     # NEW: Completion overlay module (timer, buttons, auto-orbit activation)
├── scene.js          # EXTEND: add focusCamera(targetPos, distance) export
├── hud.js            # EXTEND: add back button rendering + mid-build confirmation
├── state.js          # EXTEND: add build timer (startTimer, stopTimer, getElapsedTime)
frontend/index.html   # ADD: #selection-screen and #completion-screen overlay divs
```

### Pattern 1: GSAP + OrbitControls Camera Tween (D-07, D-08)

**What:** Animate both `camera.position` and `controls.target` simultaneously. Call `controls.update()` in `onUpdate` to prevent the snap-back bug where OrbitControls overwrites manual camera changes.

**When to use:** Any time camera needs to move programmatically — step advance, initial load, return to overview.

**The critical rule:** `camera.position` and `controls.target` MUST be distinct vector objects (not the same reference). Tweening the same vector for both destroys OrbitControls state. [CITED: discourse.threejs.org/t/tweening-with-orbitcontrols/17356]

```javascript
// Source: threejs discourse — Mugen87's accepted answer pattern
// In scene.js — export this function
export function focusCamera(targetX, targetY, targetZ, distance = 60, duration = 0.8) {
  // Direction: keep camera above-and-back from the target
  const offset = camera.position.clone().sub(controls.target).normalize().multiplyScalar(distance);
  const newCamPos = new THREE.Vector3(targetX, targetY + distance * 0.6, targetZ).add(offset);

  gsap.to(camera.position, {
    x: newCamPos.x,
    y: newCamPos.y,
    z: newCamPos.z,
    duration,
    ease: 'power2.inOut',
    onUpdate: () => controls.update(),  // CRITICAL: prevents snap-back
  });

  gsap.to(controls.target, {
    x: targetX,
    y: targetY,
    z: targetZ,
    duration,
    ease: 'power2.inOut',
  });
}
```

### Pattern 2: Zoom-to-Fit Distance Calculation (D-08)

**What:** Compute camera distance so the target piece (or bounding box of a step's pieces) fills ~40% of the viewport.

**Formula approach:** Use the camera's vertical FOV and the object's half-height to back-calculate required distance. [ASSUMED]

```javascript
// Zoom-to-fit: given a bounding sphere radius, return camera distance
// that frames it to fill `fillFraction` of the vertical viewport
function zoomToFitDistance(boundingSphereRadius, fillFraction = 0.4) {
  const vFovRad = THREE.MathUtils.degToRad(camera.fov); // camera.fov is 45 in scene.js
  const halfFov = vFovRad / 2;
  return (boundingSphereRadius / Math.tan(halfFov)) / fillFraction;
}
```

**For step camera focus:** Compute bounding box of all pieces in the current step, get its center + sphere radius, then call `focusCamera` with the computed distance.

### Pattern 3: Completion Screen Auto-Orbit (D-06)

**What:** Set `controls.autoRotate = true` and `controls.autoRotateSpeed = 1.0` (slow) when completion screen appears. Disable on "Build Again" / "New Set".

```javascript
// In completion.js
export function showCompletionScreen(elapsedMs) {
  const controls = getControls();
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.0;  // slow rotation — default is 2.0 (30s per orbit at 60fps)
  // ... show overlay
}

export function hideCompletionScreen() {
  const controls = getControls();
  controls.autoRotate = false;
  // ... hide overlay
}
```

[VERIFIED: threejs.org/docs — autoRotate and autoRotateSpeed are standard OrbitControls properties]

### Pattern 4: Offscreen Canvas Thumbnail Rendering (D-02)

**What:** Create a second `WebGLRenderer` targeting a small offscreen `<canvas>` (or `OffscreenCanvas`). Load the set's completed model, render one frame, call `renderer.domElement.toDataURL()` to get a base64 PNG. Cache the result so thumbnails render once.

**Approach recommended:** Use a visible mini `<canvas>` element per card (simpler than OffscreenCanvas, no Safari compat issues with Web Workers). [ASSUMED — OffscreenCanvas in workers has incomplete Safari support per search results]

```javascript
// selection.js
async function renderThumbnail(setData, canvasEl) {
  const thumbRenderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
  thumbRenderer.setSize(120, 90);
  const thumbScene = new THREE.Scene();
  const thumbCamera = new THREE.PerspectiveCamera(45, 120 / 90, 0.1, 500);
  thumbCamera.position.set(40, 40, 60);
  thumbCamera.lookAt(0, 0, 0);
  // Add ambient + directional light
  // Load all pieces from all steps (final state)
  // Add piece meshes to thumbScene
  thumbRenderer.render(thumbScene, thumbCamera);
  // thumbRenderer can be disposed after first render to free GPU memory
  thumbRenderer.dispose();
}
```

**Caching:** After first render, store `canvasEl.toDataURL()` and replace the canvas with an `<img>` to avoid holding multiple WebGL contexts. Browsers limit concurrent WebGL contexts (typically 8-16). [ASSUMED — browser WebGL context limit is well-known but exact number is implementation-specific]

### Pattern 5: Screen Fade Transitions (D-09)

**What:** Overlay divs with `opacity: 0 / 1` transitions. The 3D canvas stays running the whole time — only overlays appear/disappear on top.

```css
/* index.html — add to <style> */
#selection-screen, #completion-screen {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: rgba(26, 26, 46, 0.96);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.35s ease;
}
#selection-screen.visible, #completion-screen.visible {
  opacity: 1;
  pointer-events: all;
}
```

Toggle `.visible` class to trigger fade in/out. [ASSUMED — this is the standard established pattern in the codebase: `position: fixed`, `z-index: 10` per index.html inspection]

### Pattern 6: Build Timer (D-05)

**What:** Track elapsed time from first piece placed to `isBuildComplete()`. Store `startTime` in state.js or a new `timer.js`, expose `getElapsedMs()`. Format on completion screen.

**Implementation:** Add `startBuildTimer()` / `stopBuildTimer()` / `getElapsedMs()` to `state.js` (consistent with existing state-is-single-source-of-truth pattern). Timer starts on the first successful `placeBrick()` call and stops when `isBuildComplete()` returns true. [ASSUMED — logical fit for state.js per established patterns]

```javascript
// Format helper (completion.js or utils)
function formatElapsed(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
```

### Pattern 7: Back Button + Mid-Build Confirmation (D-10)

**What:** Add a small "back" button to the HUD. If pieces have been placed (`_placedCells.size > 0` in state.js — or expose `getPlacedCount()`), show a native `confirm()` dialog before returning to selection. [ASSUMED — `window.confirm()` is the simplest approach matching the project's minimal UI philosophy; no custom dialog library needed]

**Alternative:** If `confirm()` feels too browser-native, a simple inline confirmation banner inside the HUD panel is also viable.

### Anti-Patterns to Avoid

- **Tweening camera.position without calling controls.update() in onUpdate:** OrbitControls will overwrite the camera in its own `update()` call, causing the camera to snap back. Always include `onUpdate: () => controls.update()` in the camera position tween. [CITED: discourse.threejs.org/t/tweening-with-orbitcontrols/17356]
- **Using the same Vector3 for camera.position and controls.target in tweens:** Corrupts OrbitControls internal state. Always use separate Vector3 objects.
- **Holding multiple active WebGL renderers simultaneously for all thumbnails:** Browsers cap concurrent WebGL contexts. Render each thumbnail sequentially and dispose the renderer (or switch to `toDataURL()` + img) after rendering. [ASSUMED — based on known browser WebGL context limits]
- **Mutating controls.target directly without calling controls.update():** Changes to `controls.target` are not applied until `update()` is called in the animation loop.
- **Hiding the canvas element to show overlays:** Causes the WebGL context to be lost in some browsers. Always keep the canvas visible; use semi-transparent/opaque overlay divs on top instead.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Camera easing/animation | Custom lerp in requestAnimationFrame | GSAP `gsap.to(camera.position, ...)` | GSAP handles easing curves, duration, chaining, and onComplete; manual lerp requires frame-count tracking |
| Auto-orbit on completion screen | Custom rotation logic in animate loop | `controls.autoRotate = true` + `controls.autoRotateSpeed` | OrbitControls built-in; zero code, respects damping |
| Fade transitions | JavaScript opacity tweening | CSS `transition: opacity` + class toggle | GPU-composited, no JS frame budget, simpler code |
| Time formatting | Custom date math | Simple inline arithmetic (`Math.floor(ms/60000)`) | No library needed; the format is trivial |

**Key insight:** Every feature in Phase 3 is assembly of existing primitives, not new invention.

---

## Common Pitfalls

### Pitfall 1: Camera Snap-Back After GSAP Tween
**What goes wrong:** Camera tweens smoothly to new position, then snaps back to its previous position the next frame.
**Why it happens:** `controls.update()` in the animation loop resets the camera to match OrbitControls' internally tracked spherical coordinates, overriding the tween target.
**How to avoid:** Include `onUpdate: () => controls.update()` inside the GSAP tween for camera position. This re-syncs OrbitControls' internal state with each frame of the tween.
**Warning signs:** Camera moves correctly during tween but jumps back immediately on completion.

### Pitfall 2: Multiple WebGL Contexts Exceeding Browser Limit
**What goes wrong:** Thumbnail rendering for 3-5 sets creates 3-5 WebGL renderers simultaneously. Browser silently drops contexts past the limit (typically 8-16), causing blank thumbnails.
**Why it happens:** Each `new THREE.WebGLRenderer()` creates a WebGL context. Browsers limit these system-wide.
**How to avoid:** Render thumbnails sequentially with `await`-style flow (one renderer at a time, dispose after use), OR render once to `toDataURL()` and replace canvas with `<img>`.
**Warning signs:** Some thumbnails render correctly, others are blank or show a black canvas.

### Pitfall 3: autoRotate Continuing After User Returns to Selection
**What goes wrong:** User clicks "New Set," returns to selection screen, picks a new set, and the camera starts in auto-rotating state (disorienting for the next build).
**Why it happens:** `controls.autoRotate` was set to `true` on completion and never reset.
**How to avoid:** Explicitly set `controls.autoRotate = false` in any "return to selection" or "start new build" handler. [ASSUMED]

### Pitfall 4: step.pieces coordinates needed for camera focus target
**What goes wrong:** Camera focus targets the wrong location because piece coordinates are in grid units (stud integers), not world units (mm).
**Why it happens:** `gridToWorld()` conversion exists in `grid.js` but must be called — grid integer coordinates cannot be used directly as world positions.
**How to avoid:** Compute the bounding box center of the step's pieces by calling `gridToWorld()` on each piece, then average the positions. [VERIFIED: grid.js imports and patterns in interaction.js]

### Pitfall 5: Build timer starts on page load instead of first piece placed
**What goes wrong:** Completion screen shows inflated build time because the timer started when the set was loaded, not when the user began building.
**Why it happens:** Timer is started in `loadSet()` rather than in `placeBrick()`.
**How to avoid:** Start the timer on the first call to `placeBrick()` (check `_startTime === null` before setting). [ASSUMED]

---

## Code Examples

Verified patterns from codebase inspection and official sources:

### Accessing camera and controls from other modules
```javascript
// Already exported from scene.js — use these imports
import { getCamera, getControls } from './scene.js';
// getCamera() → THREE.PerspectiveCamera (fov: 45, position: set(80, 80, 120))
// getControls() → OrbitControls instance with enableDamping: true
```
[VERIFIED: scene.js lines 138-141]

### Triggering completion screen from interaction.js callback
```javascript
// main.js — existing wiring point (line 24-27)
initInteraction({
  onStepAdvance: () => {
    renderTray();
    renderHUD();
    // ADD: focusCamera() call here using next step's piece positions
  },
  onBuildComplete: () => {
    renderTray();
    renderHUD();
    // ADD: showCompletionScreen() call here
  },
});
```
[VERIFIED: main.js lines 19-28]

### Fetching sets list for selection screen
```javascript
// /api/sets returns: [{ id, name, description, pieceCount }, ...]
// app.py line 82-91 — returns catalogue without full step data (lightweight)
const res = await fetch('/api/sets');
const sets = await res.json();
// Each set has: id, name, description, pieceCount
// Difficulty stars derived from pieceCount — no backend change needed
```
[VERIFIED: app.py lines 80-91]

### Replacing hardcoded set load in main.js
```javascript
// BEFORE (main.js line 34):
const res = await fetch('/api/sets/mini-rocket');

// AFTER — Phase 3 flow:
// 1. Show selection screen on load
// 2. User clicks a set → fetch '/api/sets/{selectedId}'
// 3. loadSet(setData) → renderTray() → renderHUD() → showStepGhosts(firstStep)
// 4. focusCamera on first step's piece positions
```
[VERIFIED: main.js lines 32-50]

### isBuildComplete check (for completion trigger)
```javascript
// state.js lines 132-135 — already returns true when all steps done
// Called in interaction.js line 218 — _onBuildComplete callback already fires
export function isBuildComplete() {
  if (!_setData) return false;
  return _currentStepIndex >= _setData.steps.length - 1 && isStepComplete();
}
```
[VERIFIED: state.js lines 132-135, interaction.js line 218]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tween camera.position only | Tween both camera.position AND controls.target with controls.update() in onUpdate | Established pattern in Three.js community ~2021 | Prevents snap-back bug |
| OffscreenCanvas for thumbnails | Inline `<canvas>` element + dispose after render | Always for simple use cases | No Safari worker compat issues |
| Custom orbit code for auto-rotate | OrbitControls.autoRotate + autoRotateSpeed | Since OrbitControls introduction | Zero custom code needed |

**Deprecated/outdated:**
- `controls.enableKeys` (removed in r125): not used in this project, no impact
- Three.js `examples/jsm/` import path: replaced by `three/addons/` in r151+. Project already uses correct path. [VERIFIED: scene.js line 3]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Inline `<canvas>` elements (vs. OffscreenCanvas) recommended for thumbnails due to Safari compat | Architecture Pattern 4 | Low — OffscreenCanvas in a worker would also work in Chrome/Firefox; inline canvas is strictly simpler |
| A2 | Browser WebGL context limit is ~8-16 simultaneously | Pitfall 2, Pattern 4 | Medium — if limit is higher, sequential rendering optimization is optional not required; if lower, even more important |
| A3 | Build timer belongs in state.js as `startBuildTimer`/`getElapsedMs` | Architecture Pattern 6 | Low — could be in a separate `timer.js`; either works |
| A4 | `window.confirm()` is acceptable for mid-build exit confirmation dialog | Pattern 7 | Low — can be replaced with inline HUD confirmation banner if native dialog feels out of place |
| A5 | Zoom-to-fit formula using camera FOV and bounding sphere radius | Pattern 2 | Low — formula is standard perspective math; exact `fillFraction` constant is tunable |
| A6 | `controls.autoRotate = false` must be explicitly reset on returning to selection | Pitfall 3 | Low — easily verified by manual testing |

---

## Open Questions

1. **Difficulty star thresholds (D-03 is Claude's discretion)**
   - What we know: Piece counts across 3 existing sets — mini-rocket: 18, starter-tower and color-steps: unknown without reading their JSON
   - What's unclear: The range of piece counts across all 3 sets determines sensible thresholds
   - Recommendation: Read starter-tower.json and color-steps.json during planning; distribute stars proportionally (e.g., 1 star ≤ 20 pieces, 2 stars ≤ 40, 3 stars > 40)

2. **Fade transition duration (D-09 is Claude's discretion)**
   - What we know: CSS `transition: opacity 0.3s ease` is already used for `hud-progress-fill` in index.html
   - Recommendation: Use `0.35s ease` for consistency with existing project animation style

3. **Camera tween duration and easing (D-07 is Claude's discretion)**
   - What we know: Existing brick placement flash tween is `0.4s power2.out`, reject tween is `0.3s power1.inOut`
   - Recommendation: Use `0.8s power2.inOut` for camera focus — longer feels more cinematic for a "zoom to next piece" motion

---

## Environment Availability

Step 2.6: SKIPPED (no new external dependencies — all required tools already installed in the project)

---

## Validation Architecture

Step 2.4: SKIPPED — `workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`

---

## Security Domain

This phase adds no authentication, user data handling, file uploads, or external API calls beyond the already-present `/api/sets` and `/api/sets/:id` endpoints. No new security surface area is introduced.

---

## Sources

### Primary (HIGH confidence)
- Codebase: `/Users/chien/lego-builder/frontend/src/scene.js` — OrbitControls setup, camera position, `getCamera()`/`getControls()` exports verified
- Codebase: `/Users/chien/lego-builder/frontend/src/interaction.js` — GSAP import, `onBuildComplete` callback, `onStepAdvance` callback wiring verified
- Codebase: `/Users/chien/lego-builder/frontend/src/main.js` — hardcoded set load at line 34, callback wiring at lines 19-28 verified
- Codebase: `/Users/chien/lego-builder/app.py` — `/api/sets` endpoint returning `{id, name, description, pieceCount}` verified
- [Three.js OrbitControls docs](https://threejs.org/docs/pages/OrbitControls.html) — `autoRotate`, `autoRotateSpeed`, `target`, `update()` properties confirmed

### Secondary (MEDIUM confidence)
- [Three.js forum — Tweening with OrbitControls](https://discourse.threejs.org/t/tweening-with-orbitcontrols/17356) — Pattern of `onUpdate: () => controls.update()` + separate vectors confirmed by Mugen87 (Three.js maintainer)
- [Three.js forum — Camera snaps with OrbitControls after tween](https://discourse.threejs.org/t/camera-snaps-with-orbitcontrols-after-tween/30368) — snap-back problem confirmed

### Tertiary (LOW confidence — see Assumptions Log)
- WebSearch: OffscreenCanvas Safari support limitations — multiple sources confirm worker+WebGL is incomplete in Safari

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in the codebase, verified by direct file inspection
- Architecture: HIGH for camera tween pattern (forum-verified), MEDIUM for thumbnail approach (assumed inline canvas over OffscreenCanvas)
- Pitfalls: HIGH for camera snap-back (documented issue with official community solution), MEDIUM for WebGL context limit (known behavior, exact threshold ASSUMED)

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable library stack — Three.js r183 and GSAP 3.x are not rapidly changing)
