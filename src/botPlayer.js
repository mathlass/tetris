import { COLS, ROWS } from './constants.js';
import { refillBag, newPiece } from './pieces.js';
import { collides, rotate, getDropY, clearLines } from './logic.js';

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function shuffle(arr, rnd) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export class BotPlayer {
  constructor(random = Math.random) {
    this.random = random;
    this.board = emptyBoard();
    this.bag = [];
    this.linesCleared = 0;
    this.logs = [];
    this.errors = [];
    this.pieces = 0;
  }

  log(msg) {
    this.logs.push(msg);
  }

  snapshot() {
    return this.board.map(row => row.join('')).join('\n');
  }

  playPiece() {
    if (this.bag.length === 0) refillBag(this.bag);
    const type = this.bag.shift();
    let piece = newPiece(type);
    this.pieces++;

    // random rotation
    const rotations = Math.floor(this.random() * piece.shape.length);
    for (let i = 0; i < rotations; i++) {
      piece = rotate(this.board, piece);
    }

    // find a column where piece fits
    const columns = Array.from({ length: COLS }, (_, i) => i);
    shuffle(columns, this.random);
    let placed = false;
    for (const x of columns) {
      const candidate = { ...piece, x };
      if (!collides(this.board, candidate)) {
        piece = candidate;
        placed = true;
        break;
      }
    }
    if (!placed) {
      const msg = `No valid position for piece ${type}`;
      this.errors.push(msg);
      this.log(msg);
      this.log(this.snapshot());
      return;
    }

    const dropY = getDropY(this.board, piece);
    piece.y = dropY;
    if (collides(this.board, piece)) {
      const msg = `Collision after drop for piece ${type}`;
      this.errors.push(msg);
      this.log(msg);
      this.log(this.snapshot());
      return;
    }

    // lock piece into board
    const shape = piece.shape[piece.rot];
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue;
        const ny = piece.y + y;
        const nx = piece.x + x;
        if (ny >= 0) this.board[ny][nx] = piece.type;
      }
    }

    const cleared = clearLines(this.board);
    this.linesCleared += cleared;

    this.log(`Placed ${type} x=${piece.x} rot=${piece.rot} cleared=${cleared}`);
    this.log(this.snapshot());
  }

  play(count = 100) {
    for (let i = 0; i < count; i++) {
      this.playPiece();
    }
    return {
      pieces: this.pieces,
      linesCleared: this.linesCleared,
      logs: this.logs,
      errors: this.errors
    };
  }
}

export function runBot(count = 100) {
  const bot = new BotPlayer();
  return bot.play(count);
}
