import { COLS, ROWS } from './constants.js';

// Kick tables according to the Super Rotation System (SRS)
// Separate tables for I-piece and all other pieces
const JLSTZ_KICKS = [
  // 0 -> 1
  [ [0,0], [-1,0], [-1,1], [0,-2], [-1,-2] ],
  // 1 -> 2
  [ [0,0], [1,0], [1,-1], [0,2], [1,2] ],
  // 2 -> 3
  [ [0,0], [1,0], [1,1], [0,-2], [1,-2] ],
  // 3 -> 0
  [ [0,0], [-1,0], [-1,-1], [0,2], [-1,2] ]
];

const I_KICKS = [
  // 0 -> 1
  [ [0,0], [-2,0], [1,0], [-2,-1], [1,2] ],
  // 1 -> 2
  [ [0,0], [-1,0], [2,0], [-1,2], [2,-1] ],
  // 2 -> 3
  [ [0,0], [2,0], [-1,0], [2,1], [-1,-2] ],
  // 3 -> 0
  [ [0,0], [1,0], [-2,0], [1,-2], [-2,1] ]
];

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
  const rot = (p.rot + 1) % p.shape.length;
  const kicks = (p.type === 'I' ? I_KICKS : JLSTZ_KICKS)[p.rot];
  for (const [dx, dy] of kicks) {
    const test = { ...p, rot, x: p.x + dx, y: p.y + dy };
    if (!collides(board, test)) return test;
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
