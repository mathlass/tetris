import test from 'node:test';
import assert from 'node:assert';
import { loadSettings, saveSettings, applyPalette } from '../src/settings.js';
import { SETTINGS_KEY, COLOR_SETS } from '../src/constants.js';

// loadSettings with invalid JSON
test('loadSettings returns defaults on invalid JSON and logs error', () => {
  const store = { [SETTINGS_KEY]: 'invalid' };
  global.localStorage = {
    getItem: k => store[k] ?? null,
    setItem: (k,v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  };
  const errs = [];
  const origErr = console.error;
  console.error = (...args) => errs.push(args.join(' '));
  const s = loadSettings();
  assert.deepStrictEqual(s, { sound: true, ghost: true, softDropPoints: true, palette: 'standard' });
  assert.ok(errs.length > 0);
  console.error = origErr;
  delete global.localStorage;
});

// saveSettings storage failure
test('saveSettings logs error when localStorage.setItem throws', () => {
  global.localStorage = {
    setItem: () => { throw new Error('fail'); }
  };
  const errs = [];
  const origErr = console.error;
  console.error = (...args) => errs.push(args.join(' '));
  saveSettings({ sound: false });
  assert.ok(errs.length > 0);
  console.error = origErr;
  delete global.localStorage;
});

// applyPalette
test('applyPalette returns matching palette or default', () => {
  assert.strictEqual(applyPalette({ palette: 'accessible' }), COLOR_SETS.accessible);
  assert.strictEqual(applyPalette({ palette: 'unknown' }), COLOR_SETS.standard);
});
