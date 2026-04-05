import { initScene } from './scene.js';
import { runStressTest } from './stressTest.js';

const canvas = document.getElementById('canvas');
initScene(canvas);
runStressTest();
