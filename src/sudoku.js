// Sudoku game implementation
import {
  PLAYER_KEY,
  SUDOKU_BEST_KEY_BASE,
  SUDOKU_DIFFICULTIES
} from './constants.js';
import { generateSudoku } from './sudokuGenerator.js';
import { addHS, renderHS, formatTime } from './sudokuHighscores.js';

const GRID_SIZE = 9;

export function initSudoku(){
  const boardEl = document.getElementById('sudokuBoard');
  const padEl = document.getElementById('sudokuPad');
  const timerEl = document.getElementById('sudokuTimer');
  const bestEl = document.getElementById('sudokuBest');
  const startBtn = document.getElementById('sudokuStart');
  const difficultySelect = document.getElementById('sudokuDifficulty');
  const overlay = document.getElementById('sudokuOverlay');
  const ovTimeEl = document.getElementById('sudokuOvTime');
  const ovBestEl = document.getElementById('sudokuOvBest');
  const btnRestart = document.getElementById('sudokuBtnRestart');
  const btnClose = document.getElementById('sudokuBtnClose');

  if(!boardEl || !padEl || !timerEl || !bestEl){
    return {
      start: () => {},
      pause: () => {},
      resume: () => {},
      hideOverlay: () => {}
    };
  }

  const bestKey = difficulty => `${SUDOKU_BEST_KEY_BASE}_${difficulty}`;
  const cells = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  let initial = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  let board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  let solution = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  let selectedCell = null;
  let currentDifficulty = difficultySelect ? difficultySelect.value : SUDOKU_DIFFICULTIES[0];
  let startTime = 0;
  let elapsed = 0;
  let timer = null;
  let active = false;
  let completed = false;
  let paused = false;
  let menuPaused = false;

  function clearSelection(){
    cells.forEach(row => row.forEach(cell => cell?.classList.remove('selected')));
    selectedCell = null;
  }

  function selectCell(cell){
    if(!cell || cell.classList.contains('fixed')) return;
    clearSelection();
    selectedCell = cell;
    selectedCell.classList.add('selected');
  }

  function buildBoard(){
    boardEl.innerHTML = '';
    for(let r = 0; r < GRID_SIZE; r++){
      for(let c = 0; c < GRID_SIZE; c++){
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'sudoku-cell';
        cell.dataset.row = String(r);
        cell.dataset.col = String(c);
        if(r % 3 === 0) cell.classList.add('border-top');
        if(c % 3 === 0) cell.classList.add('border-left');
        if(r === GRID_SIZE - 1) cell.classList.add('border-bottom');
        if(c === GRID_SIZE - 1) cell.classList.add('border-right');
        cell.addEventListener('click', () => selectCell(cell));
        cell.addEventListener('focus', () => {
          if(!cell.classList.contains('fixed')){
            selectCell(cell);
          }
        });
        boardEl.appendChild(cell);
        cells[r][c] = cell;
      }
    }
  }

  function updateTimerDisplay(){
    const seconds = Math.floor(elapsed / 1000);
    timerEl.textContent = formatTime(seconds);
  }

  function runTimer(){
    if(timer){
      clearInterval(timer);
    }
    startTime = Date.now() - elapsed;
    timer = setInterval(() => {
      elapsed = Date.now() - startTime;
      updateTimerDisplay();
    }, 250);
  }

  function pauseTimer(){
    if(timer){
      clearInterval(timer);
      timer = null;
    }
    elapsed = Date.now() - startTime;
    updateTimerDisplay();
  }

  function updateBestDisplay(){
    const bestSeconds = Number(localStorage.getItem(bestKey(currentDifficulty)) || 0);
    bestEl.textContent = bestSeconds
      ? `Best: ${formatTime(bestSeconds)}`
      : 'Best: --';
  }

  function setCellValue(row, col, value, fixed){
    const cell = cells[row][col];
    if(!cell) return;
    cell.classList.remove('fixed', 'filled', 'error', 'selected');
    if(fixed){
      cell.textContent = String(value);
      cell.classList.add('fixed');
      cell.disabled = true;
      cell.setAttribute('aria-label', `Feld ${row + 1},${col + 1} – Vorgabe ${value}`);
    }else if(value){
      cell.textContent = String(value);
      cell.classList.add('filled');
      cell.disabled = false;
      cell.setAttribute('aria-label', `Feld ${row + 1},${col + 1} – ${value}`);
    }else{
      cell.textContent = '';
      cell.disabled = false;
      cell.setAttribute('aria-label', `Feld ${row + 1},${col + 1} – leer`);
    }
  }

  function applyPuzzle(){
    clearSelection();
    for(let r = 0; r < GRID_SIZE; r++){
      for(let c = 0; c < GRID_SIZE; c++){
        const value = initial[r][c];
        board[r][c] = value;
        setCellValue(r, c, value, value !== 0);
      }
    }
  }

  function findFirstEditable(){
    for(let r = 0; r < GRID_SIZE; r++){
      for(let c = 0; c < GRID_SIZE; c++){
        if(initial[r][c] === 0){
          return cells[r][c];
        }
      }
    }
    return null;
  }

  function startGame(){
    currentDifficulty = difficultySelect ? difficultySelect.value : currentDifficulty;
    const { puzzle, solution: solved } = generateSudoku(currentDifficulty);
    initial = puzzle.map(row => row.slice());
    board = puzzle.map(row => row.slice());
    solution = solved.map(row => row.slice());
    elapsed = 0;
    updateTimerDisplay();
    runTimer();
    active = true;
    completed = false;
    paused = false;
    applyPuzzle();
    updateBestDisplay();
    hideOverlay();
    const first = findFirstEditable();
    if(first){
      selectCell(first);
      first.focus();
    }
  }

  function hideOverlay(){
    if(!overlay) return;
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
  }

  function showOverlay(seconds){
    if(!overlay) return;
    if(ovTimeEl) ovTimeEl.textContent = formatTime(seconds);
    const bestSeconds = Number(localStorage.getItem(bestKey(currentDifficulty)) || 0);
    if(ovBestEl) ovBestEl.textContent = bestSeconds ? formatTime(bestSeconds) : '--';
    renderHS(currentDifficulty, { tableSelector: '#sudokuOvTable' });
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function checkCompletion(){
    for(let r = 0; r < GRID_SIZE; r++){
      for(let c = 0; c < GRID_SIZE; c++){
        if(board[r][c] !== solution[r][c]) return false;
      }
    }
    return true;
  }

  function completePuzzle(){
    pauseTimer();
    completed = true;
    const totalSeconds = Math.max(1, Math.floor(elapsed / 1000));
    const playerName = localStorage.getItem(PLAYER_KEY) || 'Player';
    addHS({ name: playerName, time: totalSeconds, date: new Date().toLocaleDateString() }, currentDifficulty);
    const bestSeconds = Number(localStorage.getItem(bestKey(currentDifficulty)) || 0);
    if(!bestSeconds || totalSeconds < bestSeconds){
      localStorage.setItem(bestKey(currentDifficulty), String(totalSeconds));
    }
    updateBestDisplay();
    showOverlay(totalSeconds);
  }

  function handleNumberInput(num){
    if(!selectedCell || !active || completed) return;
    const row = Number(selectedCell.dataset.row);
    const col = Number(selectedCell.dataset.col);
    if(Number.isNaN(row) || Number.isNaN(col)) return;
    if(initial[row][col] !== 0) return;
    if(solution[row][col] === num){
      board[row][col] = num;
      selectedCell.classList.remove('error');
      selectedCell.textContent = String(num);
      selectedCell.classList.add('filled');
      selectedCell.setAttribute('aria-label', `Feld ${row + 1},${col + 1} – ${num}`);
      if(checkCompletion()){
        completePuzzle();
      }
    }else{
      selectedCell.classList.add('error');
      setTimeout(() => selectedCell && selectedCell.classList.remove('error'), 350);
    }
  }

  padEl.addEventListener('click', e => {
    const target = e.target.closest('button[data-value]');
    if(!target) return;
    const value = Number(target.dataset.value);
    if(value >= 1 && value <= 9){
      handleNumberInput(value);
    }
  });

  boardEl.addEventListener('keydown', e => {
    if(e.key >= '1' && e.key <= '9'){
      handleNumberInput(Number(e.key));
      e.preventDefault();
    }
  });

  if(startBtn){
    startBtn.addEventListener('click', startGame);
  }

  if(btnRestart){
    btnRestart.addEventListener('click', () => {
      hideOverlay();
      startGame();
    });
  }

  if(btnClose){
    btnClose.addEventListener('click', hideOverlay);
  }

  if(difficultySelect){
    difficultySelect.addEventListener('change', () => {
      currentDifficulty = difficultySelect.value;
      updateBestDisplay();
      startGame();
    });
  }

  document.addEventListener('sudokuHsCleared', e => {
    if(e.detail && e.detail.mode === currentDifficulty){
      localStorage.removeItem(bestKey(currentDifficulty));
      updateBestDisplay();
      renderHS(currentDifficulty, { tableSelector: '#sudokuOvTable' });
    }
  });

  document.addEventListener('menuToggle', e => {
    if(!active || completed) return;
    if(e.detail && e.detail.show){
      menuPaused = paused;
      pause();
    }else if(!menuPaused){
      resume();
    }
  });

  buildBoard();
  updateBestDisplay();
  startGame();

  function pause(){
    if(active && !completed && !paused){
      paused = true;
      pauseTimer();
    }
  }

  function resume(){
    if(active && !completed && paused){
      paused = false;
      runTimer();
    }
  }

  return {
    start: startGame,
    pause,
    resume,
    hideOverlay
  };
}
