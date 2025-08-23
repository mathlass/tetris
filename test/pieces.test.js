import test from 'node:test';
import assert from 'node:assert';
import { newPiece } from '../src/pieces.js';
import { COLS, SHAPES } from '../src/constants.js';

test('newPiece initializes with rotation unused', () => {
  const p = newPiece('T');
  assert.equal(p.rotated, false);
});

test('newPiece positions I piece correctly', () => {
  const p = newPiece('I');
  assert.equal(p.x, Math.floor(COLS / 2) - 2);
  assert.equal(p.y, -2);
  assert.equal(p.shape, SHAPES[p.type]);
});
