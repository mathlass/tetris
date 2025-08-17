import test from 'node:test';
import assert from 'node:assert';
import { newPiece } from '../src/pieces.js';

test('newPiece initializes with rotation unused', () => {
  const p = newPiece('T');
  assert.equal(p.rotated, false);
});
