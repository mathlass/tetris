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
      <button id="themeToggle"></button>
      <span id="themeIcon"></span>
    </body>`, { url: 'http://localhost' });

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });

    initUI();

    const btn = document.getElementById('themeToggle');
    const icon = document.getElementById('themeIcon');

    btn.dispatchEvent(new window.Event('click'));

    assert.strictEqual(localStorage.getItem(THEME_KEY), 'light');
    assert.strictEqual(icon.textContent, 'dark_mode');

    delete global.window;
    delete global.document;
    delete global.localStorage;
  });

  test('player dialog saves name', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body>
      <dialog id="playerDialog">
        <input id="playerInput">
        <button id="playerSave"></button>
        <button id="playerCancel"></button>
      </dialog>
      <button id="btnPlayer"></button>
    </body>`, { url: 'http://localhost' });

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });

    const dlg = document.getElementById('playerDialog');
    if (!dlg.showModal) {
      dlg.showModal = function() { this.setAttribute('open', ''); };
      dlg.close = function() { this.removeAttribute('open'); };
    }

    localStorage.setItem(PLAYER_KEY, 'Existing');
    initUI();

    document.getElementById('btnPlayer').dispatchEvent(new window.Event('click'));
    assert.ok(dlg.hasAttribute('open'));

    const input = document.getElementById('playerInput');
    input.value = 'Alice';
    document.getElementById('playerSave').dispatchEvent(new window.Event('click'));
    assert.strictEqual(localStorage.getItem(PLAYER_KEY), 'Alice');
    assert.ok(!dlg.hasAttribute('open'));

    delete global.window;
    delete global.document;
    delete global.localStorage;
  });
}
