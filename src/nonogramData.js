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

export function getNonogramPuzzle(id){
  return NONOGRAM_DIFFICULTY_DATA[normalizeDifficulty(id)];
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
