/**
 * Custom canvas cursor — single absolutely-positioned DOM element following
 * pointermove on the canvas. Toggles between four states via a data-attribute.
 * Cheaper than a THREE sprite. Public API:
 *   initCursor(canvas)
 *   setCursorState(state, color?)
 */

let _cursorEl = null;
let _canvasEl = null;
let _currentState = 'idle';
let _rejectTimer = null;
let _snapTimer = null;

const CURSOR_SIZE = 28;

/**
 * Create the cursor DOM follower and attach pointer listeners to the given canvas.
 * Idempotent — calling more than once returns without rebuilding.
 * @param {HTMLCanvasElement} canvas
 */
export function initCursor(canvas) {
  if (_cursorEl) return;
  _canvasEl = canvas;
  _cursorEl = document.createElement('div');
  _cursorEl.id = 'custom-cursor';
  _cursorEl.dataset.state = 'idle';
  _cursorEl.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: ${CURSOR_SIZE}px;
    height: ${CURSOR_SIZE}px;
    pointer-events: none;
    z-index: 9999;
    transform: translate(-50%, -50%);
    transition: transform 0.08s linear, opacity 0.2s ease;
    will-change: transform;
    display: none;
  `;
  document.body.appendChild(_cursorEl);

  // Track pointer position over canvas only
  canvas.addEventListener('pointermove', (e) => {
    if (!_cursorEl) return;
    _cursorEl.style.display = 'block';
    _cursorEl.style.left = e.clientX + 'px';
    _cursorEl.style.top = e.clientY + 'px';
  });
  canvas.addEventListener('pointerleave', () => {
    if (!_cursorEl) return;
    _cursorEl.style.display = 'none';
    canvas.style.cursor = '';
  });
  canvas.addEventListener('pointerenter', () => {
    canvas.style.cursor = 'none';
  });
}

/**
 * Update the cursor state (visual). Self-fading for transient states:
 *   - 'reject' → 'idle' after 300ms
 *   - 'snap'   → 'idle' after 200ms
 * @param {'idle'|'hold'|'snap'|'reject'} state
 * @param {string} [color] - hex color used by 'hold' state to tint the brick swatch
 */
export function setCursorState(state, color) {
  if (!_cursorEl) return;
  // Clear any pending auto-fade before changing state
  if (_rejectTimer) { clearTimeout(_rejectTimer); _rejectTimer = null; }
  if (_snapTimer)   { clearTimeout(_snapTimer);   _snapTimer = null; }

  _cursorEl.dataset.state = state;
  _currentState = state;

  if (state === 'hold' && color) {
    _cursorEl.style.setProperty('--cursor-color', color);
  }
  if (state === 'reject') {
    _rejectTimer = setTimeout(() => {
      // Auto-return to idle — interaction.js will re-issue 'hold' on next pointermove if still holding
      setCursorState('idle');
    }, 300);
  }
  if (state === 'snap') {
    // After confirm, fade back to idle
    _snapTimer = setTimeout(() => {
      setCursorState('idle');
    }, 200);
  }
}
