import test from 'node:test';
import assert from 'node:assert';
import { clearLines } from '../src/logic.js';
import { COLS, ROWS, SCORE_LINE, LINES_PER_LEVEL } from '../src/constants.js';
import { updateScore } from '../src/game.js';

const emptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));

// helper to run update and return new state
test('single line clear awards correct score and combo', () => {
  let state = { score: 0, lines: 0, level: 1 };
  let combo = -1;
  let backToBack = false;

  const board = emptyBoard();
  board[ROWS - 1].fill('X');
  const cleared = clearLines(board);
  ({ score: state.score, lines: state.lines, level: state.level, combo, backToBack } =
    updateScore(state, cleared, combo, backToBack));

  assert.strictEqual(state.score, SCORE_LINE[1]);
  assert.strictEqual(combo, 0);
  assert.strictEqual(backToBack, false);
  assert.strictEqual(state.level, 1);
});

test('double line clear awards correct score and combo', () => {
  let state = { score: 0, lines: 0, level: 1 };
  let combo = -1;
  let backToBack = false;

  const board = emptyBoard();
  board[ROWS - 1].fill('X');
  board[ROWS - 2].fill('X');
  const cleared = clearLines(board);
  ({ score: state.score, lines: state.lines, level: state.level, combo, backToBack } =
    updateScore(state, cleared, combo, backToBack));

  assert.strictEqual(cleared, 2);
  assert.strictEqual(state.score, SCORE_LINE[2]);
  assert.strictEqual(combo, 0);
  assert.strictEqual(backToBack, false);
  assert.strictEqual(state.level, 1);
});

test('triple line clear awards correct score and combo', () => {
  let state = { score: 0, lines: 0, level: 1 };
  let combo = -1;
  let backToBack = false;

  const board = emptyBoard();
  for (let y = ROWS - 3; y < ROWS; y++) board[y].fill('X');
  const cleared = clearLines(board);
  ({ score: state.score, lines: state.lines, level: state.level, combo, backToBack } =
    updateScore(state, cleared, combo, backToBack));

  assert.strictEqual(cleared, 3);
  assert.strictEqual(state.score, SCORE_LINE[3]);
  assert.strictEqual(combo, 0);
  assert.strictEqual(backToBack, false);
  assert.strictEqual(state.level, 1);
});

test('no line clear resets combo', () => {
  let state = { score: 0, lines: 0, level: 1 };
  let combo = 2;
  let backToBack = true;

  const board = emptyBoard();
  const cleared = clearLines(board);
  ({ score: state.score, lines: state.lines, level: state.level, combo, backToBack } =
    updateScore(state, cleared, combo, backToBack));

  assert.strictEqual(cleared, 0);
  assert.strictEqual(combo, -1);
  assert.strictEqual(state.score, 0);
  assert.strictEqual(state.lines, 0);
  assert.strictEqual(state.level, 1);
  assert.strictEqual(backToBack, true);
});

test('level increases after clearing enough lines', () => {
  let state = { score: 0, lines: 0, level: 1 };
  let combo = -1;
  let backToBack = false;

  // clear four lines
  const board1 = emptyBoard();
  for (let y = ROWS - 4; y < ROWS; y++) board1[y].fill('X');
  const cleared1 = clearLines(board1);
  ({ score: state.score, lines: state.lines, level: state.level, combo, backToBack } =
    updateScore(state, cleared1, combo, backToBack));

  // clear one more line to reach next level
  const board2 = emptyBoard();
  board2[ROWS - 1].fill('X');
  const cleared2 = clearLines(board2);
  ({ score: state.score, lines: state.lines, level: state.level, combo, backToBack } =
    updateScore(state, cleared2, combo, backToBack));

  assert.strictEqual(state.lines, 5);
  assert.strictEqual(state.level, Math.floor(5 / LINES_PER_LEVEL) + 1);
  assert.strictEqual(combo, 1);
  assert.strictEqual(backToBack, false);
});

test('back-to-back tetrises grant bonus', () => {
  let state = { score: 0, lines: 0, level: 1 };
  let combo = -1;
  let backToBack = false;

  const makeTetrisBoard = () => {
    const b = emptyBoard();
    for (let y = ROWS - 4; y < ROWS; y++) b[y].fill('X');
    return b;
  };

  // first tetris
  const cleared1 = clearLines(makeTetrisBoard());
  ({ score: state.score, lines: state.lines, level: state.level, combo, backToBack } =
    updateScore(state, cleared1, combo, backToBack));

  // second tetris
  const cleared2 = clearLines(makeTetrisBoard());
  ({ score: state.score, lines: state.lines, level: state.level, combo, backToBack } =
    updateScore(state, cleared2, combo, backToBack));

  const expected = SCORE_LINE[4] * 2 + 50 + 200; // combo bonus + B2B bonus
  assert.strictEqual(state.score, expected);
  assert.strictEqual(backToBack, true);
  assert.strictEqual(combo, 1);
  assert.strictEqual(state.level, Math.floor(state.lines / LINES_PER_LEVEL) + 1);
});
