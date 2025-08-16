import test from 'node:test';
import assert from 'node:assert';
import { collides, rotate, clearLines, getDropY } from '../src/logic.js';
import { SHAPES, COLS, ROWS } from '../src/constants.js';

const emptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));

// collides tests

test('collides detects boundaries and filled cells', () => {
  const board = emptyBoard();
  const piece = { type: 'O', rot: 0, x: 4, y: 0, shape: SHAPES.O };
  assert.equal(collides(board, piece), false);
  const left = { ...piece, x: -1 };
  assert.equal(collides(board, left), true);
  board[1][4] = 'X';
  assert.equal(collides(board, piece), true);
});

// rotate tests

test('rotate changes rotation when space is free', () => {
  const board = emptyBoard();
  let piece = { type: 'T', rot: 0, x: 4, y: 0, shape: SHAPES.T };
  piece = rotate(board, piece);
  assert.equal(piece.rot, 1);
  assert.equal(piece.x, 4);
});

test('rotate fails when no space available', () => {
  const board = emptyBoard();
  board.forEach(row => row.fill('X'));
  const piece = { type: 'T', rot: 0, x: 4, y: 0, shape: SHAPES.T };
  const rotated = rotate(board, piece);
  assert.equal(rotated.rot, 0);
  assert.equal(rotated.x, 4);
});

// clearLines tests

test('clearLines removes multiple full rows', () => {
  const board = emptyBoard();
  board[ROWS - 1].fill('X');
  board[ROWS - 2].fill('X');
  const cleared = clearLines(board);
  assert.equal(cleared, 2);
  assert.deepEqual(board[ROWS - 1], Array(COLS).fill(0));
});

// getDropY tests

test('getDropY finds bottom on empty board and above blocks', () => {
  const piece = { type: 'O', rot: 0, x: 0, y: 0, shape: SHAPES.O };
  const board1 = emptyBoard();
  assert.equal(getDropY(board1, piece), ROWS - 2);
  const board2 = emptyBoard();
  board2[10][0] = 'X';
  assert.equal(getDropY(board2, piece), 8);
});
