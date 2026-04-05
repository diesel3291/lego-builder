import { gridKey, DIMS } from './grid.js';

// Module-level private state
let _setData = null;
let _currentStepIndex = 0;
let _heldPieceId = null;
const _placedCells = new Set();       // gridKey strings of all occupied cells across all steps
const _placedThisStep = new Set();    // piece IDs placed in the current step
let _buildStartTime = null;           // timestamp (Date.now()) of first brick placement

/**
 * Load a set JSON object and reset all build state.
 * @param {Object} setData - the parsed set JSON (id, name, steps, ...)
 */
export function loadSet(setData) {
  _setData = setData;
  _currentStepIndex = 0;
  _heldPieceId = null;
  _placedCells.clear();
  _placedThisStep.clear();
  _buildStartTime = null;
}

/**
 * Returns the current step object, or null if no set is loaded or build is complete.
 * @returns {Object|null}
 */
export function getCurrentStep() {
  if (!_setData) return null;
  if (_currentStepIndex >= _setData.steps.length) return null;
  return _setData.steps[_currentStepIndex];
}

/**
 * Returns total number of steps in the loaded set, or 0 if no set loaded.
 * @returns {number}
 */
export function getTotalSteps() {
  if (!_setData) return 0;
  return _setData.steps.length;
}

/**
 * Returns the current step number (1-based).
 * @returns {number}
 */
export function getCurrentStepNumber() {
  return _currentStepIndex + 1;
}

/**
 * Sets the currently held piece ID.
 * @param {string} pieceId
 */
export function holdPiece(pieceId) {
  _heldPieceId = pieceId;
}

/**
 * Clears the currently held piece.
 */
export function releasePiece() {
  _heldPieceId = null;
}

/**
 * Returns the currently held piece ID, or null.
 * @returns {string|null}
 */
export function getHeldPieceId() {
  return _heldPieceId;
}

/**
 * Returns true if the given grid cell is already occupied by a placed brick.
 * @param {number} gridX
 * @param {number} gridZ
 * @param {number} layer
 * @returns {boolean}
 */
export function isOccupied(gridX, gridZ, layer) {
  return _placedCells.has(gridKey(gridX, gridZ, layer));
}

/**
 * Records a placed brick in both the global occupied-cells registry and the
 * current-step placement tracker. Marks ALL cells the piece occupies.
 * @param {{ id: string, type: string, gridX: number, gridZ: number, layer: number }} piece
 */
export function placeBrick(piece) {
  // Start timer on first brick placement (D-05)
  if (_buildStartTime === null) {
    _buildStartTime = Date.now();
  }
  const [cols, rows] = DIMS[piece.type] || [1, 1];
  for (let cx = 0; cx < cols; cx++) {
    for (let rz = 0; rz < rows; rz++) {
      _placedCells.add(gridKey(piece.gridX + cx, piece.gridZ + rz, piece.layer));
    }
  }
  _placedThisStep.add(piece.id);
}

/**
 * Returns the Set of piece IDs placed in the current step.
 * @returns {Set<string>}
 */
export function getPlacedThisStep() {
  return _placedThisStep;
}

/**
 * Returns true if every piece in the current step has been placed.
 * @returns {boolean}
 */
export function isStepComplete() {
  const step = getCurrentStep();
  if (!step) return false;
  return step.pieces.every(piece => _placedThisStep.has(piece.id));
}

/**
 * Advances to the next step, clearing per-step tracking state.
 * Does not advance past the last step.
 */
export function advanceStep() {
  if (_setData && _currentStepIndex < _setData.steps.length - 1) {
    _currentStepIndex++;
  }
  _placedThisStep.clear();
  _heldPieceId = null;
}

/**
 * Returns true if the entire build is complete (all steps done, last step complete).
 * @returns {boolean}
 */
export function isBuildComplete() {
  if (!_setData) return false;
  return _currentStepIndex >= _setData.steps.length - 1 && isStepComplete();
}

/**
 * Starts the build timer if not already started.
 */
export function startBuildTimer() {
  if (_buildStartTime === null) _buildStartTime = Date.now();
}

/**
 * No-op — timer value is preserved for getElapsedMs().
 */
export function stopBuildTimer() {
  // intentional no-op; timer value preserved for display
}

/**
 * Returns elapsed milliseconds since first brick placement, or 0 if timer not started.
 * @returns {number}
 */
export function getElapsedMs() {
  if (_buildStartTime === null) return 0;
  return Date.now() - _buildStartTime;
}

/**
 * Returns count of all occupied cells placed so far.
 * @returns {number}
 */
export function getPlacedCount() {
  return _placedCells.size;
}
