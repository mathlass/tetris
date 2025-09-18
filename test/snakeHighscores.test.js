import test from 'node:test';
import assert from 'node:assert';

let JSDOM;
try {
  ({ JSDOM } = await import('jsdom'));
} catch {}

if (!JSDOM) {
  test('jsdom not installed - skipping snake highscores tests', t => t.skip('jsdom not available'));
} else {
  const { addHS, clearHS, renderHS } = await import('../src/snakeHighscores.js');
  const { SNAKE_HS_KEY_BASE } = await import('../src/constants.js');
  const MODE = 'classic';
  const HS_KEY = `${SNAKE_HS_KEY_BASE}_${MODE}`;

  test('addHS sanitizes stored name', () => {
    const dom = new JSDOM('', { url: 'http://localhost' });
    global.localStorage = dom.window.localStorage;
    global.fetch = async () => ({ ok: true });
    const list = addHS({ name: '<b>Eve</b>', score: 1, date: 'now' }, MODE);
    assert.strictEqual(list[0].name, 'Eve');
    const saved = JSON.parse(dom.window.localStorage.getItem(HS_KEY));
    assert.strictEqual(saved[0].name, 'Eve');
    delete global.fetch;
    delete global.localStorage;
  });

  test('clearHS removes highscores from localStorage', () => {
    const dom = new JSDOM('', { url: 'http://localhost' });
    global.localStorage = dom.window.localStorage;
    dom.window.localStorage.setItem(HS_KEY, '[]');
    clearHS(MODE);
    assert.strictEqual(dom.window.localStorage.getItem(HS_KEY), null);
    delete global.localStorage;
  });

  test('renderHS creates table rows from stored scores', async () => {
    const dom = new JSDOM(`<!DOCTYPE html><table id="snakeHsTable"><tbody></tbody></table>`, { url: 'http://localhost' });
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.fetch = async () => { throw new Error('offline'); };
    const entries = [
      { name: 'Ana', score: 2, date: 'd1' },
      { name: 'Bob', score: 1, date: 'd2' }
    ];
    dom.window.localStorage.setItem(HS_KEY, JSON.stringify(entries));
    await renderHS(MODE);
    const rows = dom.window.document.querySelectorAll('#snakeHsTable tbody tr');
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].children[1].textContent, 'Ana');
    assert.strictEqual(rows[1].children[2].textContent, '1');
    delete global.fetch;
    delete global.document;
    delete global.localStorage;
  });
}
