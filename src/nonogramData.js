export const NONOGRAM_PUZZLE_DATA = {
  classic: {
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
  smiley: {
    title: 'Smiley',
    grid: [
      [0,0,1,1,1,1,1,1,0,0],
      [0,1,0,0,0,0,0,0,1,0],
      [1,0,1,0,0,0,0,1,0,1],
      [1,0,1,0,0,0,0,1,0,1],
      [1,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,1],
      [1,0,1,0,0,0,0,1,0,1],
      [1,0,0,1,1,1,1,0,0,1],
      [0,1,0,0,0,0,0,0,1,0],
      [0,0,1,1,1,1,1,1,0,0]
    ]
  },
  space: {
    title: 'Space-Invader',
    grid: [
      [0,0,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,0],
      [1,1,0,1,1,1,1,0,1,1],
      [1,1,1,1,1,1,1,1,1,1],
      [1,1,1,0,1,1,0,1,1,1],
      [1,1,1,1,1,1,1,1,1,1],
      [0,1,1,0,0,0,0,1,1,0],
      [0,0,1,1,0,0,1,1,0,0],
      [0,0,1,0,0,0,0,1,0,0],
      [0,1,0,0,0,0,0,0,1,0]
    ]
  },
  tree: {
    title: 'Winterbaum',
    grid: [
      [0,0,0,0,0,1,0,0,0,0],
      [0,0,0,0,1,1,1,0,0,0],
      [0,0,0,1,1,1,1,1,0,0],
      [0,0,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1],
      [0,0,0,0,0,1,0,0,0,0],
      [0,0,0,0,0,1,0,0,0,0],
      [0,0,0,0,0,1,0,0,0,0],
      [0,0,0,0,1,1,1,0,0,0],
      [0,0,0,1,1,1,1,1,0,0]
    ]
  },
  house: {
    title: 'Haus',
    grid: [
      [0,0,0,0,0,1,0,0,0,0],
      [0,0,0,0,1,1,1,0,0,0],
      [0,0,0,1,1,1,1,1,0,0],
      [0,0,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1],
      [1,1,1,0,0,0,0,0,1,1],
      [1,0,0,1,0,0,1,0,0,1],
      [1,0,0,1,1,1,1,0,0,1],
      [1,0,0,1,0,0,1,0,0,1],
      [1,1,1,1,1,1,1,1,1,1]
    ]
  }
};

export function normalizePuzzleId(id, fallback = 'classic'){
  return NONOGRAM_PUZZLE_DATA[id] ? id : fallback;
}

export function getNonogramPuzzle(id){
  return NONOGRAM_PUZZLE_DATA[normalizePuzzleId(id)];
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
