import test from 'node:test';
import assert from 'node:assert';
import { initGame } from '../src/game.js';
import { JSDOM } from 'jsdom';

function createCtx() {
  const calls = [];
  return {
    canvas: { width: 300, height: 600 },
    fillRect: (x, y, w, h) => { calls.push({ x, y, w, h }); },
    clearRect: () => {},
    strokeRect: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    save: () => {},
    restore: () => {},
    globalAlpha: 1,
    fillStyle: null,
    strokeStyle: null,
    lineWidth: 1,
    calls
  };
}

const html = `
<canvas id="game"></canvas>
<canvas id="next1"></canvas>
<canvas id="next2"></canvas>
<canvas id="next3"></canvas>
<button id="btnStart"></button>
<button id="btnPause"></button>
<button id="btnResetHS"></button>
<button id="btnRestart"></button>
<button id="btnClose"></button>
<div id="pauseOverlay"></div>
<div id="overlay"></div>
<div id="timer"></div>
<div id="topScore"></div>
<select id="modeSelect"><option value="classic"></option></select>`;

const dom = new JSDOM(`<!DOCTYPE html><body>${html}</body>`, { url: 'http://localhost' });
const { window } = dom;
const { document } = window;

global.window = window;
global.document = document;
global.localStorage = window.localStorage;

global.requestAnimationFrame = cb => { global.__raf = cb; };

function attachCtx(id) {
  const canvas = document.getElementById(id);
  const ctx = createCtx();
  canvas.getContext = () => ctx;
  return ctx;
}

attachCtx('next1');
attachCtx('next2');
attachCtx('next3');
const gameCtx = attachCtx('game');

const topScore = document.getElementById('topScore');
const modeSelect = document.getElementById('modeSelect');
modeSelect.value = 'classic';

document.body.classList.add('theme-dark');

localStorage.setItem('tetris_settings_v1', JSON.stringify({ ghost: false, softDropPoints: true, sound: false }));

// ===== Test =====
test('gameplay responds to key events and updates score', () => {
  const keydown = code => window.dispatchEvent(new window.KeyboardEvent('keydown', { code, bubbles: true, cancelable: true }));
  const originalRandom = Math.random;
  Math.random = () => 0;
  initGame();
  document.getElementById('btnStart').dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true }));
  Math.random = originalRandom;

  const ctx = document.getElementById('game').getContext('2d');
  ctx.calls.length = 0;

  // bring piece into view
  keydown('ArrowDown');
  global.__raf();
  keydown('ArrowDown');
  global.__raf();

  // Baseline draw
  ctx.calls.length = 0;
  global.__raf();
  const cellXs = calls => {
    const xs = [];
    for (let i = 0; i < calls.length; i += 3) xs.push(calls[i].x);
    return xs;
  };
  const startXs = cellXs(ctx.calls);

  // Move left
  keydown('ArrowLeft');
  global.__raf();
  const leftXs = cellXs(ctx.calls.slice(-12));
  for (let i = 0; i < leftXs.length; i++) {
    assert.strictEqual(leftXs[i], startXs[i] - 30);
  }

  // Move right back
  keydown('ArrowRight');
  global.__raf();
  const rightXs = cellXs(ctx.calls.slice(-12));
  for (let i = 0; i < rightXs.length; i++) {
    assert.strictEqual(rightXs[i], startXs[i]);
  }

  // Rotate
  keydown('ArrowUp');
  global.__raf();

  // Hard drop
  keydown('Space');
  const scoreText = topScore.textContent;
  assert.match(scoreText, /Score: \d+/);
  assert.notStrictEqual(scoreText, 'Score: 0');
});
