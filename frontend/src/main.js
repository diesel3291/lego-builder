import { initScene } from './scene.js';

const canvas = document.getElementById('canvas');
initScene(canvas);

// Phase 1 stress test: import geometry factory and render all types.
// Remove or replace in Phase 2 when real set loading is wired.
import('./stressTest.js').catch(() => {
  // stressTest.js may not exist yet; silently skip
});
