import test from 'node:test';
import assert from 'node:assert';
import { logError } from '../src/logger.js';

test('logError prefixes message and logs error', () => {
  const original = console.error;
  let args;
  console.error = (...a) => { args = a; };
  const err = new Error('E');
  logError('msg', err);
  console.error = original;
  assert.ok(args);
  assert.ok(args[0].startsWith('[Tetris] msg'));
  assert.strictEqual(args[1], err);
});
