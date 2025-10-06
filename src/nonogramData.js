export const NONOGRAM_DIFFICULTY_DATA = {
  easy: {
    title: 'Kreuz',
    grid: [
      [0,1,0,1,0],
      [1,1,1,1,1],
      [0,1,1,1,0],
      [1,1,1,1,1],
      [0,1,0,1,0]
    ]
  },
  medium: {
    title: 'Pfeil',
    grid: [
      [0,0,1,0,0,0,0],
      [0,1,1,1,0,0,0],
      [1,1,1,1,1,0,0],
      [0,0,1,1,1,1,0],
      [0,0,0,1,1,1,1],
      [0,0,0,0,1,1,0],
      [0,0,0,0,0,1,0]
    ]
  },
  hard: {
    title: 'Pixel-Herz',
    grid: [
      [0,1,1,0,0,0,0,1,1,0],
      [1,1,1,1,0,0,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1],
      [0,1,1,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,1,1,0,0],
      [0,0,0,1,1,1,1,0,0,0],
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,1,0,0,0,0,0],
      [0,0,0,0,1,0,0,0,0,0]
    ]
  }
};

export function normalizeDifficulty(id, fallback = 'easy'){
  return NONOGRAM_DIFFICULTY_DATA[id] ? id : fallback;
}

function cloneGrid(grid){
  return grid.map(row => row.slice());
}

function rotateClockwise(grid){
  const rows = grid.length;
  const cols = grid[0].length;
  const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));
  for(let r = 0; r < rows; r++){
    for(let c = 0; c < cols; c++){
      rotated[c][rows - 1 - r] = grid[r][c];
    }
  }
  return rotated;
}

function flipHorizontal(grid){
  return grid.map(row => row.slice().reverse());
}

const GRID_VARIANTS = [
  grid => cloneGrid(grid),
  grid => rotateClockwise(grid),
  grid => rotateClockwise(rotateClockwise(grid)),
  grid => rotateClockwise(rotateClockwise(rotateClockwise(grid))),
  grid => flipHorizontal(grid),
  grid => rotateClockwise(flipHorizontal(grid)),
  grid => rotateClockwise(rotateClockwise(flipHorizontal(grid))),
  grid => rotateClockwise(rotateClockwise(rotateClockwise(flipHorizontal(grid))))
];

export function getNonogramPuzzle(id, variationSeed = Math.random()){
  const normalized = normalizeDifficulty(id);
  const base = NONOGRAM_DIFFICULTY_DATA[normalized];
  if(!base){
    throw new Error(`Unknown nonogram difficulty: ${id}`);
  }
  const seed = Number.isFinite(variationSeed) ? Math.abs(variationSeed % 1) : Math.random();
  const variantIndex = Math.floor(seed * GRID_VARIANTS.length);
  const transform = GRID_VARIANTS[variantIndex] || GRID_VARIANTS[0];
  const transformedGrid = transform(base.grid);
  return {
    title: base.title,
    grid: transformedGrid
  };
}

export function createEmptyBoard(rows, cols){
  return Array.from({ length: rows }, () => Array(cols).fill('empty'));
}

export function computeLineClues(line){
  const clues = [];
  let count = 0;
  for(let i = 0; i < line.length; i++){
    if(line[i]){
      count++;
    }else if(count){
      clues.push(count);
      count = 0;
    }
  }
  if(count){
    clues.push(count);
  }
  return clues.length ? clues : [0];
}

export function countFilledCells(grid){
  return grid.reduce((total, row) => total + row.filter(Boolean).length, 0);
}
