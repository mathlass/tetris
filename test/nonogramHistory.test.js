import test from 'node:test';
import assert from 'node:assert';
import {
  cloneBoard,
  createHistory,
  pushHistory,
  undoHistory,
  redoHistory,
  clearHistory
} from '../src/nonogramHistory.js';

test('cloneBoard creates a deep copy of the board', () => {
  const original = [
    ['empty', 'filled'],
    ['marked', 'empty']
  ];
  const copy = cloneBoard(original);
  assert.notStrictEqual(copy, original);
  assert.notStrictEqual(copy[0], original[0]);
  assert.deepStrictEqual(copy, original);
  copy[0][0] = 'filled';
  assert.strictEqual(original[0][0], 'empty');
});

test('pushHistory stores snapshots and clears future states', () => {
  const history = createHistory();
  const board = [
    ['empty', 'filled'],
    ['empty', 'marked']
  ];
  history.future.push(['temp']);
  pushHistory(history, board);
  assert.strictEqual(history.past.length, 1);
  assert.deepStrictEqual(history.past[0], board);
  assert.strictEqual(history.future.length, 0);
  board[0][0] = 'filled';
  assert.strictEqual(history.past[0][0][0], 'empty');
});

test('undoHistory restores previous board and populates future stack', () => {
  const history = createHistory();
  const board1 = [
    ['empty']
  ];
  const board2 = [
    ['filled']
  ];
  pushHistory(history, board1);
  const result = undoHistory(history, board2);
  assert.deepStrictEqual(result, board1);
  assert.strictEqual(history.past.length, 0);
  assert.strictEqual(history.future.length, 1);
  assert.deepStrictEqual(history.future[0], board2);
});

test('redoHistory restores future board and adds current board to past', () => {
  const history = createHistory();
  const current = [
    ['marked']
  ];
  const futureBoard = [
    ['empty']
  ];
  history.future.push(cloneBoard(futureBoard));
  const result = redoHistory(history, current);
  assert.deepStrictEqual(result, futureBoard);
  assert.strictEqual(history.future.length, 0);
  assert.strictEqual(history.past.length, 1);
  assert.deepStrictEqual(history.past[0], current);
});

test('undoHistory and redoHistory return null when not possible', () => {
  const history = createHistory();
  assert.strictEqual(undoHistory(history, [['empty']]), null);
  assert.strictEqual(redoHistory(history, [['empty']]), null);
  pushHistory(history, [['filled']]);
  void undoHistory(history, [['marked']]);
  clearHistory(history);
  assert.strictEqual(history.past.length, 0);
  assert.strictEqual(history.future.length, 0);
});
