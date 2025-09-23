// Utility functions to generate Sudoku puzzles with a unique solution
const SIZE = 9;
const BOX = 3;
const DIGITS = [1,2,3,4,5,6,7,8,9];

function getBoxIndex(row, col){
  return Math.floor(row / BOX) * BOX + Math.floor(col / BOX);
}

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
  const emptyCellsPerBox = Array(BOX * BOX).fill(0);

  for(let row = 0; row < SIZE; row++){
    for(let col = 0; col < SIZE; col++){
      if(grid[row][col] === 0){
        emptyCellsPerBox[getBoxIndex(row, col)]++;
      }
    }
  }

  const needsEmptyCell = () => emptyCellsPerBox.some(count => count === 0);

  while((clues > targetClues || needsEmptyCell()) && attempts < positions.length * 6){
    if(index >= positions.length){
      index = 0;
      const shuffled = shuffle(positions);
      for(let i = 0; i < positions.length; i++) positions[i] = shuffled[i];
    }

    let pos = positions[index];

    if(needsEmptyCell()){
      const requiredBoxes = [];
      for(let i = 0; i < emptyCellsPerBox.length; i++){
        if(emptyCellsPerBox[i] === 0) requiredBoxes.push(i);
      }
      if(requiredBoxes.length){
        const targetBox = requiredBoxes[Math.floor(Math.random() * requiredBoxes.length)];
        const startRow = Math.floor(targetBox / BOX) * BOX;
        const startCol = (targetBox % BOX) * BOX;
        const candidates = [];
        for(let r = 0; r < BOX; r++){
          for(let c = 0; c < BOX; c++){
            const row = startRow + r;
            const col = startCol + c;
            if(grid[row][col] !== 0){
              candidates.push(row * SIZE + col);
            }
          }
        }
        if(candidates.length){
          pos = candidates[Math.floor(Math.random() * candidates.length)];
        }
      }
    }

    index++;
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
      emptyCellsPerBox[getBoxIndex(row, col)]++;
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
