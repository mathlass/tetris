// Utility functions for Tetromino handling
import { SHAPES, COLS } from './constants.js';

// Precompute preview data for the primary rotation of each tetromino so that
// the side-panel rendering can avoid repeatedly walking the matrices. The data
// is tiny (7 pieces * up to 4 cells) but saves a noticeable amount of work
// because the preview is redrawn every time the queue changes.
const PREVIEW_DATA = Object.entries(SHAPES).reduce((acc, [type, rotations]) => {
  const matrix = rotations[0];
  const cells = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      if (!matrix[y][x]) continue;
      cells.push([x, y]);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (cells.length === 0) {
    acc[type] = { cells: [], width: 0, height: 0 };
    return acc;
  }

  const normalizedCells = cells.map(([x, y]) => [x - minX, y - minY]);
  acc[type] = {
    cells: normalizedCells,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
  return acc;
}, {});

export function getPreviewData(type) {
  return PREVIEW_DATA[type];
}

/**
 * Create a new Tetromino piece at the spawn position
 * @param {string} type Piece identifier (I, J, L, O, S, T, Z)
 */
export function newPiece(type) {
  const shape = SHAPES[type];
  return {
    type,
    rot: 0,
    x: Math.floor(COLS / 2) - 2,
    y: -2,
    shape,
    rotated: false
  };
}

/**
 * Refill the piece bag with a shuffled set of all piece types
 * @param {string[]} bag Mutable array representing the current bag
 * @param {() => number} [randomFn=Math.random] RNG function for shuffling
 */
export function refillBag(bag, randomFn = Math.random) {
  const types = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  bag.push(...types);
}
