import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('refillBag shuffles pieces uniformly', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'tetris.js'), 'utf8');
  const match = code.match(/function\s+refillBag\(\)\{([\s\S]*?)\n  \}/);
  assert.ok(match, 'refillBag function not found');
  const context = { bag: [] };
  vm.createContext(context);
  vm.runInContext(`function refillBag(){${match[1]}}`, context);

  const types = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  const counts = Array.from({ length: types.length }, () => Object.fromEntries(types.map(t => [t, 0])));
  const iterations = 70000;
  for (let i = 0; i < iterations; i++) {
    context.bag = [];
    vm.runInContext('refillBag()', context);
    const arr = context.bag;
    for (let idx = 0; idx < types.length; idx++) {
      counts[idx][arr[idx]]++;
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
