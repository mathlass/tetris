import test from 'node:test';
import assert from 'node:assert';

let JSDOM;
try {
  ({ JSDOM } = await import('jsdom'));
} catch {}

if (!JSDOM) {
  test('jsdom not installed - skipping highscores tests', t => t.skip('jsdom not available'));
} else {
  const { hsKey, addHS, loadHS, renderHS, sanitizeName } = await import('../src/highscores.js');

  test('sanitizeName strips HTML tags and trims', () => {
    assert.strictEqual(sanitizeName('  <b>Alice</b>  '), 'Alice');
  });

  test('loadHS returns empty array on invalid JSON and logs error', () => {
    const dom = new JSDOM('', { url: 'http://localhost' });
    global.localStorage = dom.window.localStorage;
    dom.window.localStorage.setItem(hsKey('classic'), 'not-json');
    const errors = [];
    const originalErr = console.error;
    console.error = (...args) => { errors.push(args.join(' ')); };
    const list = loadHS('classic');
    assert.deepStrictEqual(list, []);
    assert.ok(errors.length > 0);
    console.error = originalErr;
    delete global.localStorage;
  });

  test('addHS sanitizes name, sorts und begrenzt auf Top 10', async () => {
    const dom = new JSDOM('', { url: 'http://localhost' });
    global.localStorage = dom.window.localStorage;
    const existing = Array.from({ length: 9 }, (_, i) => ({
      name: `P${i}`,
      score: 100 - i,
      lines: i,
      date: `d${i}`
    }));
    dom.window.localStorage.setItem(hsKey('classic'), JSON.stringify(existing));
    const top = await addHS({ name: '<i>Zed</i>', score: 50, lines: 5, date: 'now' }, 'classic');
    assert.strictEqual(top.length, 10);
    assert.strictEqual(top[0].score, 100);
    assert.strictEqual(top[9].name, 'Zed');
    const saved = JSON.parse(dom.window.localStorage.getItem(hsKey('classic')));
    assert.strictEqual(saved[9].name, 'Zed');
    delete global.localStorage;
  });

  test('renderHS baut Tabelle aus lokal gespeicherten Daten und aktualisiert Label', async () => {
    const dom = new JSDOM(`<!DOCTYPE html><table id="hsTable"><tbody></tbody></table><div id="hsModeLabel"></div>`, { url: 'http://localhost' });
    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    dom.window.localStorage.setItem(hsKey('classic'), JSON.stringify([
      { name: '<b>Bob</b>', score: 1, lines: 0, date: 'x' }
    ]));
    await renderHS('classic');
    const rows = document.querySelectorAll('#hsTable tbody tr');
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].children[1].textContent, 'Bob');
    assert.strictEqual(document.getElementById('hsModeLabel').textContent, 'Tetris – Classic (endlos)');
    delete global.window;
    delete global.document;
    delete global.localStorage;
  });
}
