import test from 'node:test';
import assert from 'node:assert';
import { THEME_KEY, PLAYER_KEY } from '../src/constants.js';

let JSDOM;
try {
  ({ JSDOM } = await import('jsdom'));
} catch {}

if (!JSDOM) {
  test('jsdom not installed - skipping ui tests', t => t.skip('jsdom not available'));
} else {
  const { initUI } = await import('../src/ui.js');

  test('theme toggle updates localStorage and icon', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body>
      <button id="themeToggle"><span data-theme-icon></span></button>
    </body>`, { url: 'http://localhost' });

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });

    initUI();

    const btn = document.getElementById('themeToggle');
    const icon = document.querySelector('[data-theme-icon]');

    assert.strictEqual(icon.textContent, '🌓');
    assert.strictEqual(document.body.dataset.theme, 'beige');

    btn.dispatchEvent(new window.Event('click'));

    assert.strictEqual(localStorage.getItem(THEME_KEY), 'light');
    assert.strictEqual(document.body.dataset.theme, 'light');
    assert.strictEqual(icon.textContent, '🌞');

    btn.dispatchEvent(new window.Event('click'));

    assert.strictEqual(localStorage.getItem(THEME_KEY), 'aurora');
    assert.strictEqual(document.body.dataset.theme, 'aurora');
    assert.strictEqual(icon.textContent, '⚡');

    btn.dispatchEvent(new window.Event('click'));

    assert.strictEqual(localStorage.getItem(THEME_KEY), 'beige');
    assert.strictEqual(document.body.dataset.theme, 'beige');
    assert.strictEqual(icon.textContent, '🌓');

    delete global.window;
    delete global.document;
    delete global.localStorage;
  });

  test('intro form stores player name and selects game', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body>
      <div id="introScreen" class="hidden"></div>
      <form id="introForm">
        <input id="introName" />
        <select id="introGameSelect">
          <option value="tetris">Tetris</option>
          <option value="snake">Snake</option>
        </select>
      </form>
      <div id="globalControls" class="hidden"></div>
      <select id="gameSelect">
        <option value="tetris">Tetris</option>
        <option value="snake">Snake</option>
      </select>
    </body>`, { url: 'http://localhost' });

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });

    let receivedEvent;
    document.addEventListener('intro-complete', e => { receivedEvent = e; });

    initUI();

    const introName = document.getElementById('introName');
    const introGameSelect = document.getElementById('introGameSelect');
    introName.value = 'Alice';
    introGameSelect.value = 'snake';

    document.getElementById('introForm').dispatchEvent(new window.Event('submit'));

    assert.strictEqual(localStorage.getItem(PLAYER_KEY), 'Alice');
    assert.strictEqual(document.getElementById('gameSelect').value, 'snake');
    assert.ok(!document.getElementById('globalControls').classList.contains('hidden'));
    assert.ok(document.getElementById('introScreen').classList.contains('hide'));
    assert.strictEqual(receivedEvent?.detail?.game, 'snake');

    delete global.window;
    delete global.document;
    delete global.localStorage;
  });
}
