import { getCurrentStep, holdPiece, getHeldPieceId, getPlacedThisStep } from './state.js';
import { showStepGhosts } from './ghost.js';

// Module-level private state
let _trayItemsEl = null;

/**
 * Initialize the tray module. Finds the .tray-items DOM element.
 * Call once from main.js after DOM is ready.
 */
export function initTray() {
  _trayItemsEl = document.querySelector('.tray-items');
}

/**
 * Render the piece tray for the current step.
 * Clears and repopulates .tray-items with one .tray-item per unplaced piece.
 * Skips pieces already placed this step. Shows selected state for held piece.
 */
export function renderTray() {
  if (!_trayItemsEl) return;
  _trayItemsEl.innerHTML = '';

  const step = getCurrentStep();
  if (!step) return;  // build complete — tray stays empty

  const placedThisStep = getPlacedThisStep();
  const heldPieceId = getHeldPieceId();

  for (const piece of step.pieces) {
    // Skip pieces already placed in this step
    if (placedThisStep.has(piece.id)) continue;

    const item = document.createElement('div');
    item.className = 'tray-item';
    item.dataset.pieceId = piece.id;
    item.title = piece.type;  // accessibility — screen reader discovery

    const swatch = document.createElement('div');
    swatch.className = 'tray-swatch';
    swatch.style.backgroundColor = piece.color;

    // Show selected state for the currently held piece
    if (heldPieceId === piece.id) {
      item.classList.add('selected');
    }

    item.addEventListener('click', (e) => {
      e.stopPropagation();  // prevent click-through to canvas
      holdPiece(piece.id);
      // Show all step ghosts simultaneously (per RESEARCH.md OQ2 — show all, not just held)
      const currentStep = getCurrentStep();
      if (currentStep) showStepGhosts(currentStep);
      renderTray();  // re-render to update selected state
    });

    item.appendChild(swatch);
    _trayItemsEl.appendChild(item);
  }
}
