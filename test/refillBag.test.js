import test from 'node:test';
import assert from 'node:assert';
import { refillBag } from '../src/pieces.js';

const types = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

test('refillBag shuffles pieces uniformly', () => {
  const counts = Array.from({ length: types.length }, () => Object.fromEntries(types.map(t => [t, 0])));
  const iterations = 10000;
  for (let i = 0; i < iterations; i++) {
    const bag = [];
    refillBag(bag);
    for (let idx = 0; idx < types.length; idx++) {
      counts[idx][bag[idx]]++;
    }
  }
  const expected = iterations / types.length;
  const tolerance = expected * 0.1; // 10%
  for (let pos = 0; pos < types.length; pos++) {
    for (const type of types) {
      assert.ok(Math.abs(counts[pos][type] - expected) < tolerance,
        `pos ${pos} type ${type} count ${counts[pos][type]} out of range`);
    }
  }
});

test('refillBag uses provided random function deterministically', () => {
  function createRng(seed) {
    return () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
  }
  const seed = 12345;
  const bag1 = [];
  const bag2 = [];
  refillBag(bag1, createRng(seed));
  refillBag(bag2, createRng(seed));
  assert.deepStrictEqual(bag1, bag2);
  assert.deepStrictEqual([...bag1].sort(), [...types].sort());
});
