import test from 'node:test';
import assert from 'node:assert';

let JSDOM;
try {
  ({ JSDOM } = await import('jsdom'));
} catch {}

if (!JSDOM) {
  test('jsdom not installed - skipping menu tests', t => t.skip('jsdom not available'));
} else {
  const { initMenu, toggleMenuOverlay } = await import('../src/menu.js');

  test('toggleMenuOverlay toggles overlay and dispatches events', async () => {
    const dom = new JSDOM(`<!DOCTYPE html><body>
      <div id="menuOverlay" aria-hidden="true">
        <button id="btnMenuClose"></button>
        <button id="tabScore"></button>
        <button id="tabSettings"></button>
        <div id="scorePanel"></div>
        <div id="settingsPanel"></div>
      </div>
      <button id="btnMenu"></button>
      <button id="snakeBtnMenu"></button>
    </body>`, { url: 'http://localhost' });
    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;

    // Before initMenu -> should return false
    assert.strictEqual(toggleMenuOverlay(), false);

    const events = [];
    document.addEventListener('menuToggle', e => events.push(e.detail.show));

    initMenu();

    // Open overlay
    assert.strictEqual(toggleMenuOverlay(), true);
    assert.ok(document.getElementById('menuOverlay').classList.contains('show'));
    assert.strictEqual(events.pop(), true);

    // Close overlay
    assert.strictEqual(toggleMenuOverlay(), false);
    assert.ok(!document.getElementById('menuOverlay').classList.contains('show'));
    assert.strictEqual(events.pop(), false);

    delete global.window;
    delete global.document;
    delete global.localStorage;
    delete global.CustomEvent;
  });
}
