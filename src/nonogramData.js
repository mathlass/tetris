export const NONOGRAM_DIFFICULTY_DATA = {
  easy: [
    {
      id: 'cross',
      title: 'Kreuz',
      grid: [
        [0,1,0,1,0],
        [1,1,1,1,1],
        [0,1,1,1,0],
        [1,1,1,1,1],
        [0,1,0,1,0]
      ]
    },
    {
      id: 'smile',
      title: 'Smiley',
      grid: [
        [0,1,0,1,0],
        [0,1,0,1,0],
        [0,0,0,0,0],
        [1,0,0,0,1],
        [0,1,1,1,0]
      ]
    },
    {
      id: 'house',
      title: 'Haus',
      grid: [
        [0,0,1,0,0],
        [0,1,1,1,0],
        [1,1,1,1,1],
        [1,0,1,0,1],
        [1,1,1,1,1]
      ]
    }
  ],
  medium: [
    {
      id: 'arrow',
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
    {
      id: 'key',
      title: 'Schlüssel',
      grid: [
        [0,1,1,1,0,0,0],
        [0,0,1,0,0,0,0],
        [1,1,1,1,1,1,1],
        [0,0,1,0,0,0,0],
        [0,0,1,0,0,0,0],
        [0,1,1,1,0,0,0],
        [0,0,1,0,0,0,0]
      ]
    },
    {
      id: 'heart-small',
      title: 'Mini-Herz',
      grid: [
        [0,1,0,0,0,1,0],
        [1,1,1,0,1,1,1],
        [1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1],
        [0,1,1,1,1,1,0],
        [0,0,1,1,1,0,0],
        [0,0,0,1,0,0,0]
      ]
    }
  ],
  hard: [
    {
      id: 'pixel-heart',
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
    },
    {
      id: 'spaceship',
      title: 'Raumschiff',
      grid: [
        [0,0,0,0,1,0,0,0,0,0],
        [0,0,0,1,1,1,0,0,0,0],
        [0,0,1,1,1,1,1,0,0,0],
        [0,1,1,1,1,1,1,1,0,0],
        [1,1,1,1,1,1,1,1,1,0],
        [0,0,0,1,1,1,1,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,1,0,0,1,0,0,0],
        [0,0,1,0,0,0,0,1,0,0]
      ]
    },
    {
      id: 'diamond',
      title: 'Diamant',
      grid: [
        [0,0,0,0,1,1,1,0,0,0],
        [0,0,0,1,1,1,1,1,0,0],
        [0,0,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [0,1,1,1,1,1,1,1,1,1],
        [0,0,1,1,1,1,1,1,1,0],
        [0,0,0,1,1,1,1,1,0,0],
        [0,0,0,0,1,1,1,0,0,0],
        [0,0,0,0,0,1,0,0,0,0]
      ]
    }
  ]
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

function deriveSeed(base, multiplier, increment){
  return (base * multiplier + increment) % 1;
}

export function getNonogramPuzzle(id, variationSeed = Math.random()){
  const normalized = normalizeDifficulty(id);
  const list = NONOGRAM_DIFFICULTY_DATA[normalized];
  if(!list || list.length === 0){
    throw new Error(`Unknown nonogram difficulty: ${id}`);
  }
  const seed = Number.isFinite(variationSeed) ? Math.abs(variationSeed % 1) : Math.random();
  const variantSeed = deriveSeed(seed, 7919, 0.215);
  const puzzleSeed = deriveSeed(seed, 104729, 0.481);
  const variantIndex = Math.floor(variantSeed * GRID_VARIANTS.length);
  const puzzleIndex = Math.floor(puzzleSeed * list.length);
  const selected = list[puzzleIndex] || list[0];
  const transform = GRID_VARIANTS[variantIndex] || GRID_VARIANTS[0];
  const transformedGrid = transform(selected.grid);
  return {
    id: `${normalized}-${selected.id || puzzleIndex}-v${variantIndex}`,
    title: selected.title,
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
