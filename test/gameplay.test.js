import test from 'node:test';
import assert from 'node:assert';
import { initGame } from '../src/game.js';

// Minimal EventTarget implementation
class EventTarget {
  constructor() { this.listeners = {}; }
  addEventListener(type, cb) {
    (this.listeners[type] ||= []).push(cb);
  }
  dispatchEvent(event) {
    (this.listeners[event.type] || []).forEach(cb => cb(event));
  }
}

class ClassList {
  constructor() { this.set = new Set(); }
  add(cls) { this.set.add(cls); }
  remove(cls) { this.set.delete(cls); }
  contains(cls) { return this.set.has(cls); }
  toggle(cls, force) {
    if (force === undefined) {
      this.set.has(cls) ? this.set.delete(cls) : this.set.add(cls);
    } else {
      force ? this.set.add(cls) : this.set.delete(cls);
    }
  }
}

class Element extends EventTarget {
  constructor(id) {
    super();
    this.id = id;
    this.textContent = '';
    this.style = {};
    this.value = '';
    this.classList = new ClassList();
    this.attributes = {};
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
}

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

class CanvasElement extends Element {
  constructor(id, ctx) {
    super(id);
    this._ctx = ctx;
  }
  getContext() { return this._ctx; }
}

class Document extends EventTarget {
  constructor() {
    super();
    this.elements = {};
    this.body = new Element('body');
  }
  getElementById(id) { return this.elements[id] || null; }
  createElement(tag) { return new Element(null); }
  querySelector(selector) { return null; }
}

// Setup globals
global.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] ?? null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; }
};

const document = new Document();
const window = new EventTarget();
window.document = document;

global.document = document;
global.window = window;

global.requestAnimationFrame = cb => { global.__raf = cb; };

document.elements.game = new CanvasElement('game', createCtx());
['next1','next2','next3'].forEach(id => {
  document.elements[id] = new CanvasElement(id, createCtx());
});
['btnStart','btnPause','btnResetHS','btnRestart','btnClose','pauseOverlay','overlay','timer'].forEach(id => {
  document.elements[id] = new Element(id);
});
const topScore = new Element('topScore');
document.elements.topScore = topScore;
const modeSelect = new Element('modeSelect');
modeSelect.value = 'classic';
document.elements.modeSelect = modeSelect;

document.body.classList.add('theme-dark');

localStorage.setItem('tetris_settings_v1', JSON.stringify({ ghost: false, softDropPoints: true, sound: false }));

// ===== Test =====
test('gameplay responds to key events and updates score', () => {
  const originalRandom = Math.random;
  Math.random = () => 0;
  initGame();
  document.getElementById('btnStart').dispatchEvent({ type: 'click', preventDefault(){} });
  Math.random = originalRandom;

  const ctx = document.getElementById('game').getContext('2d');
  ctx.calls.length = 0;

  // bring piece into view
  window.dispatchEvent({ type: 'keydown', code: 'ArrowDown', preventDefault(){} });
  global.__raf();
  window.dispatchEvent({ type: 'keydown', code: 'ArrowDown', preventDefault(){} });
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
  window.dispatchEvent({ type: 'keydown', code: 'ArrowLeft', preventDefault(){} });
  global.__raf();
  const leftXs = cellXs(ctx.calls.slice(-12));
  for (let i = 0; i < leftXs.length; i++) {
    assert.strictEqual(leftXs[i], startXs[i] - 30);
  }

  // Move right back
  window.dispatchEvent({ type: 'keydown', code: 'ArrowRight', preventDefault(){} });
  global.__raf();
  const rightXs = cellXs(ctx.calls.slice(-12));
  for (let i = 0; i < rightXs.length; i++) {
    assert.strictEqual(rightXs[i], startXs[i]);
  }

  // Rotate
  window.dispatchEvent({ type: 'keydown', code: 'ArrowUp', preventDefault(){} });
  global.__raf();

  // Hard drop
  window.dispatchEvent({ type: 'keydown', code: 'Space', preventDefault(){} });
  const scoreText = topScore.textContent;
  assert.match(scoreText, /Score: \d+/);
  assert.notStrictEqual(scoreText, 'Score: 0');
});
