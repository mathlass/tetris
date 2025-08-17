// Utility functions for Tetromino handling
import { SHAPES, COLS } from './constants.js';

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
 */
export function refillBag(bag) {
  const types = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  bag.push(...types);
}
