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

test('T piece near floor uses SRS kick to rotate', () => {
  const board = emptyBoard();
  let piece = { type: 'T', rot: 0, x: 4, y: 18, shape: SHAPES.T };
  piece = rotate(board, piece);
  assert.equal(piece.rot, 1);
  assert.equal(piece.x, 4);
  assert.equal(piece.y, 16);
});

test('I piece at wall rotates using I-kick table', () => {
  const board = emptyBoard();
  let piece = { type: 'I', rot: 1, x: -2, y: 0, shape: SHAPES.I };
  piece = rotate(board, piece);
  assert.equal(piece.rot, 2);
  assert.equal(piece.x, 0);
  assert.equal(piece.y, 0);
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

test('clearLines leaves board when row has a gap', () => {
  const board = emptyBoard();
  board[ROWS - 1].fill('X');
  board[ROWS - 1][2] = 0; // create a gap
  const before = board.map(row => row.slice());
  const cleared = clearLines(board);
  assert.equal(cleared, 0);
  assert.deepEqual(board, before);
});

test('clearLines removes only the filled middle row', () => {
  const board = emptyBoard();
  const mid = Math.floor(ROWS / 2);
  board[mid].fill('X');
  board[mid - 1][0] = 'Y';
  const cleared = clearLines(board);
  assert.equal(cleared, 1);
  assert.equal(board[mid][0], 'Y');
  assert.equal(board[mid - 1][0], 0);
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
