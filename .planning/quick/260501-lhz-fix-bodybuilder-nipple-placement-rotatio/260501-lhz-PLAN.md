---
type: quick
slug: 260501-lhz-fix-bodybuilder-nipple-placement-rotatio
files_modified:
  - sets/bodybuilder.json
  - frontend/src/interaction.js
  - frontend/index.html
---

<objective>
Fix three independent bugs in the lego builder:

1. **Bodybuilder nipple/fingernail placement** — `plate-round-1x1` pieces (the round "nipples" on the chest and fingernails on the fists) sit at integer `layer` values that, when multiplied by `PLATE_HEIGHT (3.2)` instead of `BRICK_HEIGHT (9.6)`, render far below their intended chest/fist surface. Result: the user sees the ghost overlay floating in empty space with nothing to attach to. Fix the layer values in the set JSON so the plates sit visibly on top of their support pieces.

2. **Rotation validation is too lenient** — `frontend/src/interaction.js` `_handleClick` allows any 90° multiple to satisfy "square" pieces, but `fist-2x2`, `wedge-2x2-corner`, `curve-2x2`, `nose-1x1`, slopes, and trapezoids are visually directional. Tighten the rotation gate to require exact match against the target rotation, with a single carve-out for the rotationally-symmetric set already in `isSymmetric` (rounds, domes, plate-round-1x1). Also change the R-key increment from 45° to 90° so users land on schema-valid rotations (0/90/180/270).

3. **No mobile rotate button** — desktop has the R key, but touch devices have no way to rotate. Add a visible rotate button to the build UI's `#top-bar` that calls the same rotation logic, styled with the existing `.keycap` utility class.

Output: bodybuilder set is buildable end-to-end with visible nipples/nails, rotation-required pieces refuse to snap unless rotation matches the ghost, and a Rotate (R) button is visible on touch and click on phones/tablets.
</objective>

<context>
@CLAUDE.md
@.planning/STATE.md
@frontend/src/interaction.js
@frontend/src/grid.js
@frontend/index.html
@sets/schema.md

# Key facts gleaned from exploration:

# grid.js coordinate math (already in @frontend/src/grid.js):
#   gridToWorld returns y = layer * 9.6 for bricks, y = layer * 3.2 for plates.
#   So a "plate at layer N" sits at y = N * 3.2, NOT on top of a brick at layer N.
#   To place a plate flush on top of a brick at layer K, plate_layer = (K + 1) * 3 = 3K + 3.

# Current broken positions in sets/bodybuilder.json:
#   - Step 17 nipples (s17p404 at gridX=2,gridZ=1 layer=30; s17p416 at gridX=5,gridZ=1 layer=30)
#     → render at y = 96 while surrounding chest bricks render at y = 288. Floating in space.
#   - Step 27 left-fist nails (s27p527..s27p530 at layer=46) and Step 28 right-fist nails
#     (s28p532..s28p535 at layer=46) → render at y = 147.2 while the fist body at layer 45
#     renders at y = 432. Floating below the fist.

# Step 27/28 nails: top of layer-45 fist = y = 46 * 9.6 = 441.6.
#   Plate layer to sit flush on top = 441.6 / 3.2 = 138. Nothing else is above the fists,
#   so changing nail layers from 46 → 138 is a clean fix (no conflict).

# Step 17 chest nipples: top of layer-30 chest = y = 31 * 9.6 = 297.6 → plate layer 93.
#   But step 18 places brick-1x1 at (2,1) and (5,1) layer 31, which would clip the plate.
#   Cleanest visual: leave the chest column intact, swap the layer-31 brick at (2,1)/(5,1)
#   for the plate-round-1x1 nipple itself. The "nipple" then IS the layer-31 brick row at
#   those columns (visible round bump on the chest, with subsequent rows still stacking on
#   top — there will be a tiny ~6.4mm vertical gap at that column, visually negligible).
#   Concrete change:
#     - In step 17, change s17p404 from {gridX:2,gridZ:1,layer:30} to {gridX:2,gridZ:1,layer:93}.
#     - In step 17, change s17p416 from {gridX:5,gridZ:1,layer:30} to {gridX:5,gridZ:1,layer:93}.
#     - In step 18, REMOVE the two brick-1x1 entries at (2,1,31) and (5,1,31)  — these are
#       replaced by the nipples that now occupy that vertical slot. Their IDs are
#       s18p... — locate by gridX/gridZ/layer. Adjust step 17/18 piece counts and any
#       top-level pieceCount accordingly.
#   Alternative (executor's call if preferred): leave step 18 alone and just bump nipples to
#   the next genuinely free layer (e.g., layer 96 = top of layer-31 brick), but that puts
#   the nipples ONE row higher than the original anatomical intent. Either fix is acceptable
#   so long as the user clearly sees a nipple-shaped attachment point on the chest.

# interaction.js rotation logic (lines 76-86, 148-169):
#   - keydown: _previewRotation = (_previewRotation + 45) % 360  ← bug: 45° step
#   - _handleClick: rotation gate uses two branches:
#       isSymmetric (round/dome/plate-round): no rotation check (correct)
#       isSquare (1x1/2x2/wedge/curve/fist): allows any 90° multiple (TOO LENIENT)
#       else (rectangular): allows 0 or 180 (still too lenient for slopes/trapezoid/nose)
#   - The fix: require exact rotation match (gr === pr) for everything except isSymmetric.

# Build UI markup (frontend/index.html lines 1244-1261):
#   <div id="top-bar"> contains .top-bar-left, .top-bar-center, and #quit-btn.
#   Add a rotate button immediately before #quit-btn so it sits at the right edge,
#   visible on all viewport widths (top-bar is fixed top:12, left/right:12).
#   Use class="keycap keycap--water" for visual styling consistent with #quit-btn.
#   Wire button to dispatch the same rotation as the R-key — easiest path is to
#   export a `rotateHeldPiece()` function from interaction.js and import + bind in
#   main.js, OR have the button dispatch a synthetic 'r' KeyboardEvent on window.
#   Prefer the explicit export approach (cleaner, no key-event coupling).

# How rotation is rendered (already correct in frontend/src/ghost.js line 64):
#   group.rotation.y = THREE.MathUtils.degToRad(piece.rotation);
#   Ghost already shows the target rotation, so once the placement gate is tightened the
#   user can visually compare preview rotation vs ghost rotation.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix bodybuilder nipple and fingernail layer placement</name>
  <files>sets/bodybuilder.json</files>
  <action>
Edit `sets/bodybuilder.json` to make the round plates visibly attach to the body.

Required edits:

1. **Fingernails (clean fix, no conflicts):** Change `layer: 46` → `layer: 138` on all 8 fingernail pieces:
   - Step 27 left fist: `s27p527`, `s27p528`, `s27p529`, `s27p530`
   - Step 28 right fist: `s28p532`, `s28p533`, `s28p534`, `s28p535`

   Math: layer 138 plate = y = 138 * 3.2 = 441.6 = top of layer-45 fist (46 * 9.6). Plates
   sit flush on top of the fists. No other pieces occupy that vertical column.

2. **Chest nipples (one piece move plus one row removal):**
   - Change `s17p404` from `layer: 30` to `layer: 93` (keep gridX=2, gridZ=1).
   - Change `s17p416` from `layer: 30` to `layer: 93` (keep gridX=5, gridZ=1).
   - In Step 18 (`stepNumber: 18`), REMOVE the two `brick-1x1` pieces at
     `gridX:2, gridZ:1, layer:31` and `gridX:5, gridZ:1, layer:31`. Find them by
     scanning step 18's `pieces` array for those exact coords and delete the two objects.
     This frees the column so the layer-93 plates (y = 297.6, 3.2mm tall) don't clip
     against the layer-31 bricks (which would also occupy y = 297.6 to 307.2).

3. **Update piece counts:**
   - Decrement the top-level `pieceCount` field by 2 (we removed 2 pieces from step 18).
   - Step 17 piece count is unchanged (we only modified `layer` values, no add/remove).
   - Step 18 piece count is unchanged in the JSON (pieces are an array, not a count
     field) — but if the file has any per-step `pieceCount`-like field, decrement it.
     (Schema only mandates top-level pieceCount per sets/schema.md, so just the top one.)

If the executor decides during the change that the chest result looks wrong (e.g.,
plates clip into surrounding bricks at the same y), an acceptable fallback is to put
the nipples at `layer: 96` instead (top of the layer-31 chest row, one row up from
the original intent) and skip the step-18 removal. Document the choice in the commit
message. Either outcome must satisfy the verify step: ghost overlays for the nipples
and fingernails appear on the visible body surface, not floating in space.

Do NOT touch any other set file or any other piece in bodybuilder.json.
  </action>
  <verify>
Run the Flask server and front-end:
```
./run.sh   # or:  flask run  &  cd frontend && npm run dev
```
1. Load the bodybuilder set from the selection screen.
2. Advance to step 17. Visually confirm the two nipple ghost overlays appear on the
   front of the chest (round, slightly recessed/protruding circles), not floating
   below the platform.
3. Place the step 17 pieces; confirm placement succeeds and the chest looks right.
4. Continue to step 27 (left fist) and step 28 (right fist). Confirm fingernail
   ghost overlays appear on top of the fist (4 little nails on each fist), not
   floating below.
5. Place the nails; confirm they snap and look like fingernails on top of the fist.
6. Validate JSON is still well-formed:
   ```
   python3 -c "import json; json.load(open('sets/bodybuilder.json'))"
   ```
   exits 0.
7. Validate Flask still serves the set:
   ```
   curl -s http://localhost:5000/api/sets/bodybuilder | python3 -c "import sys,json; d=json.load(sys.stdin); print('pieces:', d['pieceCount'], 'steps:', len(d['steps']))"
   ```
   should return without error and show updated piece count.
  </verify>
  <done>Nipples (step 17) and fingernails (steps 27/28) are visibly attached to the chest and fists during the build, ghost overlays appear in the right anatomical place, JSON validates, and Flask still serves the set.</done>
</task>

<task type="auto">
  <name>Task 2: Tighten rotation validation and fix R-key increment</name>
  <files>frontend/src/interaction.js</files>
  <action>
Edit `frontend/src/interaction.js`:

1. **Fix R-key increment (line ~80):** Change
   ```js
   _previewRotation = (_previewRotation + 45) % 360;
   ```
   to
   ```js
   _previewRotation = (_previewRotation + 90) % 360;
   ```
   so each press cycles 0 → 90 → 180 → 270 → 0, matching the schema-valid rotation
   values used in set JSON files.

2. **Tighten rotation match in `_handleClick` (lines ~148-166):** Replace the existing
   rotation gate (the block from `const gr = ...` through the end of the
   rectangular-else branch) with strict equality, keeping only the symmetric carve-out:

   ```js
   // Rotation matching — strict equality unless the piece is rotationally symmetric.
   const gr = ((ghostPiece.rotation || 0) % 360 + 360) % 360;
   const pr = (_previewRotation % 360 + 360) % 360;

   const pt = ghostPiece.type;
   const isSymmetric =
     pt === 'brick-1x1' || pt === 'plate-1x1' ||              // 1x1 squares look identical at any rotation
     pt === 'brick-2x2' || pt === 'plate-2x2' ||              // 2x2 squares too
     pt.startsWith('round-') || pt === 'plate-round-1x1' ||   // cylinders
     pt === 'bicep-2x2' || pt === 'deltoid-2x2';              // domes

   if (!isSymmetric && pr !== gr) {
     _rejectPlacement(hitGroup);
     return;
   }
   ```

   Notes:
   - `fist-2x2`, `wedge-2x2-corner`, `curve-2x2`, `nose-1x1`, `trapezoid-2x1`,
     `slope-2x1`, `slope-2x2`, and rectangular bricks/plates (e.g. `brick-1x2`,
     `plate-2x4`) all fall through to the strict check — exact match against the
     target rotation is required.
   - Keep `_confirmPlacement(ghostPiece, hitGroup, pr)` unchanged — it still
     applies the user's preview rotation to the placed mesh, which now equals
     the target rotation by construction.

3. **Export a rotation function for the mobile button (Task 3 will use it):**
   Add at the bottom of the file:
   ```js
   /**
    * Rotate the held piece preview by 90° (same effect as pressing R).
    * No-op when no piece is held. Exported so UI controls (e.g., a mobile
    * rotate button in the top bar) can trigger rotation without synthesizing
    * keyboard events.
    */
   export function rotateHeldPiece() {
     if (getHeldPieceId() === null) return;
     _previewRotation = (_previewRotation + 90) % 360;
     if (_previewMesh) {
       _previewMesh.rotation.y = THREE.MathUtils.degToRad(_previewRotation);
     }
   }
   ```
   Refactor the existing keydown handler to call `rotateHeldPiece()` so the
   key path and the button path share one implementation:
   ```js
   window.addEventListener('keydown', (e) => {
     if (e.key === 'r' || e.key === 'R') rotateHeldPiece();
   });
   ```
  </action>
  <verify>
Manual smoke test against bodybuilder set (it has rotation-required pieces — see
`s10p162` wedge-2x2-corner rotation:90, `s18p452` curve-2x2 rotation:90,
`s32p582`/`s32p583` nose-1x1 rotation:180, `s36p620`/`s36p621` slope-2x2 rotation:180):

1. `cd frontend && npm run dev`, open the app, load the bodybuilder set.
2. Advance to step 10. Pick the wedge-2x2-corner from the tray. Without rotating,
   click the ghost — placement is REJECTED (red flash). Press R once (90°), click
   the ghost — placement SUCCEEDS.
3. Advance to step 32. Pick a nose-1x1 from the tray (target rotation 180). Click
   the ghost without rotating — REJECTED. Press R twice → 180° → click ghost — SUCCEEDS.
4. On a 1x1 brick (rotationally symmetric), confirm placement succeeds at any rotation
   (0, 90, 180, 270 by pressing R 0/1/2/3 times).
5. Confirm preview only rotates in 90° steps (no 45° intermediate state).
6. Confirm the rotation reset after placement still works: place a piece at 90°, pick the
   next piece — preview starts at 0°.
7. Lint check (no test runner configured for the front-end, but JS errors would surface):
   ```
   cd frontend && npm run dev
   ```
   no console errors on app boot.
  </verify>
  <done>Rotation-required pieces refuse placement unless preview rotation === target rotation; symmetric 1x1/2x2 squares, cylinders, and domes still place at any rotation; R cycles 0→90→180→270; rotateHeldPiece is exported.</done>
</task>

<task type="auto">
  <name>Task 3: Add mobile-visible rotate button to the build top bar</name>
  <files>frontend/index.html, frontend/src/main.js</files>
  <action>
Add a visible Rotate button to the build UI that triggers the same logic as the R key.

1. **Edit `frontend/index.html`** — inside `<div id="top-bar">` (around line 1245),
   immediately before `<button id="quit-btn" class="keycap">🍊 Save &amp; Quit</button>`,
   add:
   ```html
   <button id="rotate-btn" class="keycap keycap--water" aria-label="Rotate held piece">🔄 Rotate (R)</button>
   ```
   Rationale:
   - The top bar already uses `display: flex; align-items: center; justify-content: space-between`
     so adding a sibling next to #quit-btn places it cleanly to the right.
   - `.keycap--water` matches the existing visual language of the build UI buttons.
   - The button is in the existing top-bar so it's always visible during a build (no
     touch-only media query needed — desktop users get a discoverable affordance and
     touch users get the only available rotate trigger).
   - `aria-label` for screen readers.

2. **Edit `frontend/src/main.js`** — wire the button:
   - Import `rotateHeldPiece` from `./interaction.js` alongside existing imports.
   - After the existing `quitBtn` lookup near line 79 (`const quitBtn = document.getElementById('quit-btn');`),
     add:
     ```js
     const rotateBtn = document.getElementById('rotate-btn');
     if (rotateBtn) {
       const handleRotate = (e) => {
         // Prevent button from stealing focus / firing twice on touch devices that
         // emit both touchend and click. We listen on click only — modern mobile
         // browsers synthesize click from tap reliably.
         e.preventDefault();
         rotateHeldPiece();
       };
       rotateBtn.addEventListener('click', handleRotate);
     }
     ```
   - Do NOT add a separate `touchstart` handler — modern iOS/Android Safari/Chrome
     fire `click` on tap with no delay for buttons inside a <button> element. Adding
     touchstart causes double-rotation on devices that fire both events.

3. Confirm no CSS changes are needed — `.keycap` and `.keycap--water` already exist
   in `frontend/index.html`'s `<style>` block (lines 51-83) and the top-bar layout
   uses flex `gap: 16px`.
  </action>
  <verify>
1. `cd frontend && npm run dev`. Load a set, enter the build.
2. Confirm the "🔄 Rotate (R)" button is visible in the top bar to the right of the
   progress meter, styled as a blue keycap button (water variant).
3. Pick any piece from the tray. Click the rotate button — preview rotates 90°.
   Click again — another 90°. Cycle through all four orientations.
4. Verify functional parity with R key: place a rotation-required piece (e.g.,
   step 32 nose-1x1) using ONLY the button — succeeds when at 180°, rejected otherwise.
5. Mobile test (use desktop devtools mobile emulator or actual phone):
   - Open DevTools → Toggle device toolbar → iPhone 14 / Pixel.
   - Confirm the rotate button is visible and positioned within the top bar (no
     horizontal scroll, no overlap with the quit button on narrow screens).
   - Tap (touch event) the rotate button — preview rotates exactly once per tap
     (no double-fire).
6. Confirm rotation still resets between pieces: pick piece, rotate via button to
   90°, place it; pick next piece — preview starts at 0°.
  </verify>
  <done>A "🔄 Rotate (R)" button is visible in #top-bar on all viewport widths (desktop + mobile emulator), tapping/clicking it rotates the held piece by 90°, and it produces identical placement behavior to the R key.</done>
</task>

</tasks>

<verification>
End-to-end check after all three tasks:
1. Load bodybuilder set, build through steps 17, 27, 28 — nipples and nails are
   visibly attached and snap correctly.
2. Build through steps 10, 18, 32, 36 — rotation-required pieces refuse incorrect
   rotations and accept correct ones.
3. Rotate button is visible and functional on a mobile emulator viewport.
4. No console errors during a full build of any set.
</verification>

<success_criteria>
- The bodybuilder set is buildable end-to-end with the nipple plates anatomically
  visible on the chest and fingernails visible on each fist.
- All non-symmetric pieces (fist, wedge, curve, nose, slopes, trapezoid, rectangular
  bricks/plates) reject placement unless the preview rotation exactly matches the
  ghost's target rotation. Symmetric pieces (1x1, 2x2 squares, rounds, domes) still
  place at any rotation.
- A "Rotate (R)" button is visible in the top bar during builds and works on touch
  devices.
- bodybuilder.json passes JSON parse and Flask continues to serve `/api/sets/bodybuilder`.
</success_criteria>

<output>
After completion, commit with message:
```
fix(quick-260501-lhz): bodybuilder nipple/nail placement, strict rotation, mobile rotate button
```
Files: `sets/bodybuilder.json`, `frontend/src/interaction.js`, `frontend/index.html`, `frontend/src/main.js`.
</output>
