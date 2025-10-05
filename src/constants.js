export const THEME_KEY = 'tetris_theme';
export const PLAYER_KEY = 'tetris_player';

export const COLS = 10;
export const ROWS = 20;
export const SIZE = 30;
export const FALL_BASE_MS = 600; // Basisintervall (Level 1)
export const LINES_PER_LEVEL = 5;
export const SCORE_LINE = [0,100,300,500,800];
export const SETTINGS_KEY = 'tetris_settings_v1';
export const MODE_CLASSIC = 'classic';
export const MODE_ULTRA = 'ultra';
export const MODE_CLASSIC_ONCE = 'classic_once';
export const TETRIS_MODES = [MODE_CLASSIC, MODE_CLASSIC_ONCE, MODE_ULTRA];
export const MODE_LABELS = {
  [MODE_CLASSIC]: 'Classic (endlos)',
  [MODE_CLASSIC_ONCE]: 'Classic – 1 Drehung',
  [MODE_ULTRA]: 'Ultra – 2 Minuten'
};
export const ULTRA_SECONDS = 120;

export const COLOR_SETS = {
  standard: {
    0: '#000000', // leer (wird nicht gemalt)
    I: '#4fd1ff', J: '#4c6ef5', L: '#f59f00', O: '#fcc419',
    S: '#51cf66', T: '#be4bdb', Z: '#ff6b6b'
  },
  accessible: {
    0: '#000000',
    I: '#0072b2', J: '#56b4e9', L: '#e69f00', O: '#f0e442',
    S: '#009e73', T: '#cc79a7', Z: '#d55e00'
  }
};

// Tetromino-Matrizen (4×4 Frames) – im Uhrzeigersinn rotierend
export const SHAPES = {
  I: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]
  ],
  J: [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,0]]
  ],
  L: [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]],
    [[1,1,0],[0,1,0],[0,1,0]]
  ],
  O: [
    [[1,1],[1,1]],
    [[1,1],[1,1]],
    [[1,1],[1,1]],
    [[1,1],[1,1]]
  ],
  S: [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[0,1,1],[0,0,1]],
    [[0,0,0],[0,1,1],[1,1,0]],
    [[1,0,0],[1,1,0],[0,1,0]]
  ],
  T: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]]
  ],
  Z: [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,0,1],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,0],[0,1,1]],
    [[0,1,0],[1,1,0],[1,0,0]]
  ]
};

export const HS_KEY_BASE = 'tetris_highscores_v1';
export const BEST_KEY_BASE = 'tetris_best';
export const HS_NAME_MAX_LENGTH = 20;

export const SNAKE_MODES = ['classic', 'obstacles', 'ultra'];
export const SNAKE_MODE_LABELS = {
  classic: 'Classic',
  obstacles: 'Mit Hindernissen',
  ultra: 'Ultra'
};
export const SNAKE_HS_KEY_BASE = 'snake_highscores_v1';
export const SNAKE_BEST_KEY_BASE = 'snake_best_v1';

export const SUDOKU_DIFFICULTIES = ['easy', 'medium', 'hard'];
export const SUDOKU_DIFFICULTY_LABELS = {
  easy: 'Leicht',
  medium: 'Mittel',
  hard: 'Schwer'
};
export const SUDOKU_HS_KEY_BASE = 'sudoku_highscores_v1';
export const SUDOKU_BEST_KEY_BASE = 'sudoku_best_v1';

export const NONOGRAM_PUZZLES = ['classic', 'smiley', 'space', 'tree', 'house'];
export const NONOGRAM_PUZZLE_LABELS = {
  classic: 'Pixel-Herz (10×10)',
  smiley: 'Smiley (10×10)',
  space: 'Space-Invader (10×10)',
  tree: 'Winterbaum (10×10)',
  house: 'Haus (10×10)'
};
export const NONOGRAM_HS_KEY_BASE = 'nonogram_highscores_v1';
export const NONOGRAM_BEST_KEY_BASE = 'nonogram_best_v1';
