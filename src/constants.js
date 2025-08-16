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
