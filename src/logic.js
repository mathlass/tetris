import { COLS, ROWS } from './constants.js';

export function collides(board, p) {
  const m = p.shape[p.rot];
  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < m[y].length; x++) {
      if (!m[y][x]) continue;
      const nx = p.x + x;
      const ny = p.y + y;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

export function rotate(board, p) {
  const test = { ...p, rot: (p.rot + 1) % p.shape.length };
  if (!collides(board, test)) return test;
  for (const dx of [-1, 1, -2, 2]) {
    const kicked = { ...test, x: test.x + dx };
    if (!collides(board, kicked)) return kicked;
  }
  return p;
}

export function clearLines(board) {
  let cleared = 0;
  outer: for (let y = ROWS - 1; y >= 0; y--) {
    for (let x = 0; x < COLS; x++) {
      if (!board[y][x]) continue outer;
    }
    board.splice(y, 1);
    board.unshift(Array(COLS).fill(0));
    cleared++;
    y++;
  }
  return cleared;
}

export function getDropY(board, p) {
  const test = { ...p };
  while (true) {
    test.y++;
    if (collides(board, test)) {
      test.y--;
      return test.y;
    }
  }
}
