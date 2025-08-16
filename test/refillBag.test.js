import test from 'node:test';
import assert from 'node:assert';
import { refillBag } from '../src/helpers.js';

const types = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

test('refillBag shuffles pieces uniformly', () => {
  const counts = Array.from({ length: types.length }, () => Object.fromEntries(types.map(t => [t, 0])));
  const iterations = 70000;
  for (let i = 0; i < iterations; i++) {
    const bag = [];
    refillBag(bag);
    for (let idx = 0; idx < types.length; idx++) {
      counts[idx][bag[idx]]++;
    }
  }
  const expected = iterations / types.length;
  const tolerance = expected * 0.05; // 5%
  for (let pos = 0; pos < types.length; pos++) {
    for (const type of types) {
      assert.ok(Math.abs(counts[pos][type] - expected) < tolerance,
        `pos ${pos} type ${type} count ${counts[pos][type]} out of range`);
    }
  }
});
