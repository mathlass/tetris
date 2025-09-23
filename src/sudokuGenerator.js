// Utility functions to generate Sudoku puzzles with a unique solution
const SIZE = 9;
const BOX = 3;
const DIGITS = [1,2,3,4,5,6,7,8,9];

function createGrid(){
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function cloneGrid(grid){
  return grid.map(row => row.slice());
}

function shuffle(arr){
  const copy = arr.slice();
  for(let i = copy.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function isSafe(grid, row, col, num){
  for(let i = 0; i < SIZE; i++){
    if(grid[row][i] === num || grid[i][col] === num) return false;
  }
  const boxRow = Math.floor(row / BOX) * BOX;
  const boxCol = Math.floor(col / BOX) * BOX;
  for(let r = 0; r < BOX; r++){
    for(let c = 0; c < BOX; c++){
      if(grid[boxRow + r][boxCol + c] === num) return false;
    }
  }
  return true;
}

function findEmpty(grid){
  for(let r = 0; r < SIZE; r++){
    for(let c = 0; c < SIZE; c++){
      if(grid[r][c] === 0) return { row: r, col: c };
    }
  }
  return null;
}

function fillGrid(grid){
  const empty = findEmpty(grid);
  if(!empty) return true;
  const { row, col } = empty;
  const nums = shuffle(DIGITS);
  for(const num of nums){
    if(isSafe(grid, row, col, num)){
      grid[row][col] = num;
      if(fillGrid(grid)){
        return true;
      }
      grid[row][col] = 0;
    }
  }
  return false;
}

function countSolutions(grid, limit = 2){
  const empty = findEmpty(grid);
  if(!empty) return 1;
  const { row, col } = empty;
  let count = 0;
  for(const num of DIGITS){
    if(isSafe(grid, row, col, num)){
      grid[row][col] = num;
      count += countSolutions(grid, limit);
      if(count >= limit) break;
    }
  }
  grid[row][col] = 0;
  return count;
}

const DIFFICULTY_SETTINGS = {
  easy: { minClues: 38, maxClues: 45 },
  medium: { minClues: 30, maxClues: 35 },
  hard: { minClues: 24, maxClues: 30 }
};

function removeCells(grid, targetClues){
  let clues = SIZE * SIZE;
  const positions = Array.from({ length: SIZE * SIZE }, (_, i) => i);
  let attempts = 0;
  let index = 0;
  while(clues > targetClues && attempts < positions.length * 4){
    if(index >= positions.length){
      index = 0;
      const shuffled = shuffle(positions);
      for(let i = 0; i < positions.length; i++) positions[i] = shuffled[i];
    }
    const pos = positions[index++];
    const row = Math.floor(pos / SIZE);
    const col = pos % SIZE;
    if(grid[row][col] === 0){
      attempts++;
      continue;
    }
    const backup = grid[row][col];
    grid[row][col] = 0;
    const copy = cloneGrid(grid);
    const solutions = countSolutions(copy, 2);
    if(solutions !== 1){
      grid[row][col] = backup;
    } else {
      clues--;
    }
    attempts++;
  }
}

export function generateSudoku(difficulty = 'easy'){
  const solved = createGrid();
  fillGrid(solved);
  const puzzle = cloneGrid(solved);
  const settings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.easy;
  const cluesTarget = Math.floor(Math.random() * (settings.maxClues - settings.minClues + 1)) + settings.minClues;
  removeCells(puzzle, cluesTarget);
  return { puzzle, solution: solved };
}

export function gridToString(grid){
  return grid.map(row => row.join('')).join('');
}

export function stringToGrid(str){
  const grid = createGrid();
  for(let i = 0; i < str.length && i < SIZE * SIZE; i++){
    const row = Math.floor(i / SIZE);
    const col = i % SIZE;
    grid[row][col] = Number(str[i]) || 0;
  }
  return grid;
}

export function clone(grid){
  return cloneGrid(grid);
}
