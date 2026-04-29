import { getCurrentStepNumber, getTotalSteps, getCurrentStep, isBuildComplete, getPlacedThisStep } from './state.js';

const MENTOR_TIPS = [
  '🍊 Tap R to rotate the held piece.',
  '🍎 Scroll to zoom — drag to orbit.',
  '🍏 Click the glowing ghost to lock a brick into place.',
  '🍊 Right-drag pans the camera.',
  '🍎 Each step lights up only the bricks you need next — Echo would be proud.',
];
let _mentorTipIndex = 0;

let _hudEl = null;

/**
 * Initialize the HUD module.
 */
export function initHUD() {
  _hudEl = document.getElementById('hud');
}

/**
 * Render the right-panel HUD with step progress and instructions.
 */
export function renderHUD() {
  if (!_hudEl) return;
  _hudEl.innerHTML = '';

  const totalSteps = getTotalSteps();

  if (!isBuildComplete() && totalSteps === 0) return;
  if (isBuildComplete()) return;

  const stepNumber = getCurrentStepNumber();
  const step = getCurrentStep();

  // ----- Top-bar progress / level / meta -----
  if (step) {
    const placedThisStep = getPlacedThisStep().size;
    const stepPieceCount = Math.max(1, step.pieces.length);
    const stepFraction = placedThisStep / stepPieceCount;
    const pct = Math.min(
      100,
      Math.round(100 * (stepNumber - 1 + stepFraction) / Math.max(1, totalSteps))
    );

    const fillEl = document.getElementById('top-progress-fill');
    if (fillEl) fillEl.style.width = pct + '%';

    const lvlEl = document.getElementById('lvl-chip');
    if (lvlEl) lvlEl.textContent = `LVL ${stepNumber}`;

    const metaEl = document.getElementById('top-bar-meta');
    if (metaEl) metaEl.textContent = `STEP ${stepNumber} / ${totalSteps} · ${step.pieces.length} pieces`;
  }

  // Goal Pieces card — shows step progress
  const card = document.createElement('div');
  card.className = 'hud-card';

  const title = document.createElement('div');
  title.className = 'hud-card-title';
  title.textContent = '🍊 Goal Pieces';
  card.appendChild(title);

  // Show each step as a progress item
  const maxVisible = Math.min(totalSteps, 5);
  const startStep = Math.max(1, stepNumber - 1);
  const endStep = Math.min(totalSteps, startStep + maxVisible - 1);

  // We need access to per-step pieces for mini-brick coloring. Build a quick lookup
  // by reading totalSteps and walking via getCurrentStep \u2014 but state.js only exposes
  // getCurrentStep(). The plan accepts using `step.pieces[0]?.color` as the heuristic
  // for the *current* step; for non-current steps we fall back to a neutral.
  // (Engine-read-only: no mutations.)
  for (let i = startStep; i <= endStep; i++) {
    const item = document.createElement('div');
    item.className = 'hud-step-item';

    const mini = document.createElement('div');
    mini.className = 'hud-step-mini-brick';
    // Predominant color heuristic \u2014 current step uses its own first piece color;
    // others use a neutral cream-2 so they read as "pending".
    let predominant = '#CCCCCC';
    if (i === stepNumber && step && step.pieces && step.pieces.length > 0) {
      predominant = step.pieces[0].color || '#CCCCCC';
    } else if (i < stepNumber) {
      predominant = '#A38F7F'; // muted ink-2 for done
    }
    mini.style.background = predominant;

    const info = document.createElement('div');
    info.className = 'hud-step-info';

    const name = document.createElement('div');
    name.className = 'hud-step-name';
    name.textContent = `Step ${i}`;

    const bar = document.createElement('div');
    bar.className = 'hud-step-progress-bar';
    const fill = document.createElement('div');
    fill.className = 'hud-step-progress-fill';

    const count = document.createElement('div');
    count.className = 'hud-step-count';

    if (i < stepNumber) {
      mini.classList.add('done');
      fill.classList.add('done');
      fill.style.width = '100%';
      count.textContent = '\u2713';
    } else if (i === stepNumber) {
      mini.classList.add('current');
      fill.classList.add('current');
      fill.style.width = '50%';
      count.textContent = `${i}/${totalSteps}`;
    } else {
      mini.classList.add('pending');
      fill.style.width = '0%';
    }

    bar.appendChild(fill);
    info.appendChild(name);
    info.appendChild(bar);

    item.appendChild(mini);
    item.appendChild(info);
    item.appendChild(count);
    card.appendChild(item);
  }

  // Instructions section
  if (step && step.description) {
    const instrDiv = document.createElement('div');
    instrDiv.className = 'hud-instructions';

    const header = document.createElement('div');
    header.className = 'hud-instructions-header';

    const instrLabel = document.createElement('span');
    instrLabel.textContent = '🍎 Instructions';
    const pageLabel = document.createElement('span');
    pageLabel.textContent = `Step ${stepNumber} of ${totalSteps}`;

    header.appendChild(instrLabel);
    header.appendChild(pageLabel);

    const text = document.createElement('div');
    text.className = 'hud-instructions-text';
    text.textContent = `"${step.description}"`;

    instrDiv.appendChild(header);
    instrDiv.appendChild(text);
    card.appendChild(instrDiv);
  }

  _hudEl.appendChild(card);

  // Mentor row — orange "O" avatar + rotating tip from MENTOR_TIPS
  const mentor = document.createElement('div');
  mentor.className = 'hud-card hud-mentor';
  const avatar = document.createElement('div');
  avatar.className = 'hud-mentor-avatar';
  avatar.textContent = 'O';
  const tip = document.createElement('div');
  tip.className = 'hud-mentor-tip';
  tip.textContent = MENTOR_TIPS[_mentorTipIndex % MENTOR_TIPS.length];
  _mentorTipIndex++;
  mentor.appendChild(avatar);
  mentor.appendChild(tip);
  _hudEl.appendChild(mentor);

  // Update top bar step info
  const topStep = document.getElementById('top-bar-step');
  if (topStep) {
    topStep.textContent = `Step ${stepNumber} of ${totalSteps}`;
  }
}

/**
 * Update the top bar with the set name.
 */
export function updateTopBarTitle(setName) {
  const el = document.getElementById('top-bar-title');
  if (el) el.textContent = setName || '';
}
