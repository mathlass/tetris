import {
  PLAYER_KEY,
  NONOGRAM_PUZZLES,
  NONOGRAM_PUZZLE_LABELS,
  NONOGRAM_BEST_KEY_BASE
} from './constants.js';
import {
  addHS,
  renderHS,
  formatNonogramTime,
  getBestTime
} from './nonogramHighscores.js';
import { createOverlayController } from './overlay.js';

const PUZZLES = {
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

export function initNonogram(){
  const gridWrapper = document.getElementById('nonogramGrid');
  const gridEl = document.getElementById('nonogramCells');
  const rowCluesEl = document.getElementById('nonogramRowClues');
  const colCluesEl = document.getElementById('nonogramColClues');
  const timerEl = document.getElementById('nonogramTimer');
  const bestEl = document.getElementById('nonogramBest');
  const startBtn = document.getElementById('nonogramStart');
  const puzzleSelect = document.getElementById('nonogramPuzzleSelect');
  const toolButtons = document.querySelectorAll('[data-nonogram-tool]');
  const overlay = createOverlayController({
    root: '#nonogramOverlay',
    bindings: {
      time: '#nonogramOvTime',
      best: '#nonogramOvBest'
    }
  });
  const btnRestart = document.getElementById('nonogramBtnRestart');
  const btnClose = document.getElementById('nonogramBtnClose');

  if(!gridEl || !rowCluesEl || !colCluesEl || !timerEl || !bestEl){
    return {
      start: () => {},
      pause: () => {},
      resume: () => {},
      stop: () => {},
      hideOverlay: () => {},
      showOverlay: () => {}
    };
  }

  const size = NONOGRAM_PUZZLES[0] || 'classic';
  const cells = [];
  let state = [];
  function normalizePuzzle(id){
    return NONOGRAM_PUZZLES.includes(id) ? id : size;
  }

  function listAvailablePuzzles(){
    return NONOGRAM_PUZZLES.filter(Boolean).map(normalizePuzzle);
  }

  function pickRandomPuzzle(excludeId){
    const available = listAvailablePuzzles();
    const pool = excludeId ? available.filter(id => id !== excludeId) : [...available];
    if(!pool.length){
      pool.push(...(available.length ? available : [size]));
    }
    const index = Math.floor(Math.random() * pool.length);
    return normalizePuzzle(pool[index] ?? size);
  }

  let currentPuzzle = normalizePuzzle(puzzleSelect ? puzzleSelect.value : size);
  let timer = null;
  let startTime = 0;
  let elapsed = 0;
  let running = false;
  let completed = false;
  let paused = false;
  let menuPaused = false;
  let activeTool = 'fill';

  function bestKey(puzzleId){
    return `${NONOGRAM_BEST_KEY_BASE}_${puzzleId}`;
  }

  function getPuzzle(puzzleId){
    const normalized = normalizePuzzle(puzzleId);
    return PUZZLES[normalized] || PUZZLES.classic;
  }

  function createEmptyState(rows, cols){
    return Array.from({ length: rows }, () => Array(cols).fill('empty'));
  }

  function computeLineClues(line){
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
    if(count) clues.push(count);
    return clues.length ? clues : [0];
  }

  function renderClues(puzzle){
    const rows = puzzle.grid.length;
    const cols = puzzle.grid[0].length;
    rowCluesEl.innerHTML = '';
    colCluesEl.innerHTML = '';

    for(let r = 0; r < rows; r++){
      const clue = document.createElement('div');
      clue.className = 'nonogram-clue nonogram-clue--row';
      const values = computeLineClues(puzzle.grid[r]);
      values.forEach(value => {
        const span = document.createElement('span');
        span.textContent = value === 0 ? '•' : String(value);
        clue.appendChild(span);
      });
      rowCluesEl.appendChild(clue);
    }

    for(let c = 0; c < cols; c++){
      const clue = document.createElement('div');
      clue.className = 'nonogram-clue nonogram-clue--col';
      const column = puzzle.grid.map(row => row[c]);
      const values = computeLineClues(column);
      values.forEach(value => {
        const span = document.createElement('span');
        span.textContent = value === 0 ? '•' : String(value);
        clue.appendChild(span);
      });
      colCluesEl.appendChild(clue);
    }
  }

  function buildBoard(puzzle){
    const rows = puzzle.grid.length;
    const cols = puzzle.grid[0].length;
    gridEl.innerHTML = '';
    cells.length = 0;
    const target = gridWrapper || gridEl;
    target.style.setProperty('--nonogram-columns', String(cols));
    target.style.setProperty('--nonogram-rows', String(rows));
    rowCluesEl.style.setProperty('--nonogram-rows', String(rows));
    colCluesEl.style.setProperty('--nonogram-columns', String(cols));
    for(let r = 0; r < rows; r++){
      const rowCells = [];
      for(let c = 0; c < cols; c++){
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'nonogram-cell';
        btn.dataset.row = String(r);
        btn.dataset.col = String(c);
        btn.setAttribute('aria-label', `Feld ${r + 1},${c + 1} – leer`);
        gridEl.appendChild(btn);
        rowCells.push(btn);
      }
      cells.push(rowCells);
    }
  }

  function updateCellState(row, col){
    const cell = cells[row]?.[col];
    if(!cell) return;
    const value = state[row][col];
    cell.classList.remove('nonogram-cell--filled', 'nonogram-cell--marked');
    let labelSuffix = 'leer';
    if(value === 'filled'){
      cell.classList.add('nonogram-cell--filled');
      labelSuffix = 'ausgefüllt';
    }else if(value === 'marked'){
      cell.classList.add('nonogram-cell--marked');
      labelSuffix = 'markiert';
    }
    cell.setAttribute('aria-label', `Feld ${Number(cell.dataset.row) + 1},${Number(cell.dataset.col) + 1} – ${labelSuffix}`);
  }

  function applyState(){
    for(let r = 0; r < state.length; r++){
      for(let c = 0; c < state[r].length; c++){
        updateCellState(r, c);
      }
    }
  }

  function updateTimerDisplay(){
    const seconds = Math.floor(elapsed / 1000);
    timerEl.textContent = `Zeit: ${formatNonogramTime(seconds)}`;
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
    const bestSeconds = Number(localStorage.getItem(bestKey(currentPuzzle)) || 0);
    bestEl.textContent = bestSeconds
      ? `Best: ${formatNonogramTime(bestSeconds)}`
      : 'Best: --';
  }

  function checkSolved(puzzle){
    for(let r = 0; r < puzzle.grid.length; r++){
      for(let c = 0; c < puzzle.grid[r].length; c++){
        const required = puzzle.grid[r][c] === 1;
        if(required && state[r][c] !== 'filled'){
          return false;
        }
        if(!required && state[r][c] === 'filled'){
          return false;
        }
      }
    }
    return true;
  }

  function handleCellAction(row, col, tool){
    if(!running || completed) return;
    const current = state[row][col];
    let next = current;
    if(tool === 'fill'){
      next = current === 'filled' ? 'empty' : 'filled';
    }else if(tool === 'mark'){
      next = current === 'marked' ? 'empty' : 'marked';
    }else if(tool === 'clear'){
      next = 'empty';
    }
    if(next === current) return;
    state[row][col] = next;
    updateCellState(row, col);
    const puzzle = getPuzzle(currentPuzzle);
    if(checkSolved(puzzle)){
      completePuzzle();
    }
  }

  function completePuzzle(){
    pauseTimer();
    running = false;
    completed = true;
    const totalSeconds = Math.max(1, Math.floor(elapsed / 1000));
    const playerName = localStorage.getItem(PLAYER_KEY) || 'Player';
    void addHS({
      name: playerName,
      time: totalSeconds,
      date: new Date().toLocaleDateString()
    }, currentPuzzle);
    const bestSeconds = Number(localStorage.getItem(bestKey(currentPuzzle)) || 0);
    if(!bestSeconds || totalSeconds < bestSeconds){
      localStorage.setItem(bestKey(currentPuzzle), String(totalSeconds));
    }
    updateBestDisplay();
    overlay.show({
      time: formatNonogramTime(totalSeconds),
      best: (() => {
        const best = getBestTime(currentPuzzle);
        return best ? formatNonogramTime(best) : '--';
      })()
    });
    renderHS(currentPuzzle, { tableSelector: '#nonogramOvTable' });
  }

  function startGame(){
    currentPuzzle = normalizePuzzle(puzzleSelect ? puzzleSelect.value : currentPuzzle);
    if(puzzleSelect){
      puzzleSelect.value = currentPuzzle;
    }
    const puzzle = getPuzzle(currentPuzzle);
    const label = NONOGRAM_PUZZLE_LABELS[currentPuzzle] || currentPuzzle;
    if(gridWrapper){
      gridWrapper.setAttribute('aria-label', `Nonogramm – ${label}`);
    }
    gridEl.setAttribute('aria-label', `Nonogramm Gitter – ${label}`);
    renderClues(puzzle);
    buildBoard(puzzle);
    state = createEmptyState(puzzle.grid.length, puzzle.grid[0].length);
    applyState();
    elapsed = 0;
    completed = false;
    running = true;
    paused = false;
    menuPaused = false;
    updateTimerDisplay();
    runTimer();
    updateBestDisplay();
    renderHS(currentPuzzle, { tableSelector: '#nonogramScoreTable' });
    overlay.hide();
  }

  function pause(){
    if(running && !completed && !paused){
      paused = true;
      pauseTimer();
    }
  }

  function resume(){
    if(running && !completed && paused){
      paused = false;
      runTimer();
    }
  }

  function stop(){
    if(running){
      pause();
      running = false;
    }
  }

  gridEl.addEventListener('click', e => {
    const target = e.target.closest('button');
    if(!target || !gridEl.contains(target)) return;
    const row = Number(target.dataset.row);
    const col = Number(target.dataset.col);
    if(Number.isNaN(row) || Number.isNaN(col)) return;
    handleCellAction(row, col, activeTool);
  });

  gridEl.addEventListener('auxclick', e => {
    if(e.button !== 1) return;
    const target = e.target.closest('button');
    if(!target || !gridEl.contains(target)) return;
    const row = Number(target.dataset.row);
    const col = Number(target.dataset.col);
    if(Number.isNaN(row) || Number.isNaN(col)) return;
    e.preventDefault();
    handleCellAction(row, col, 'clear');
  });

  gridEl.addEventListener('contextmenu', e => {
    const target = e.target.closest('button');
    if(!target || !gridEl.contains(target)) return;
    const row = Number(target.dataset.row);
    const col = Number(target.dataset.col);
    if(Number.isNaN(row) || Number.isNaN(col)) return;
    e.preventDefault();
    handleCellAction(row, col, 'mark');
  });

  function updateToolState(){
    toolButtons.forEach(btn => {
      const tool = btn.dataset.nonogramTool;
      const isActive = tool === activeTool;
      btn.classList.toggle('selected', isActive);
      if(btn.hasAttribute('aria-pressed')){
        btn.setAttribute('aria-pressed', String(isActive));
      }
    });
  }

  toolButtons.forEach(btn => {
    const tool = btn.dataset.nonogramTool;
    if(!tool) return;
    btn.addEventListener('click', () => {
      activeTool = tool;
      updateToolState();
      btn.focus();
    });
  });

  updateToolState();

  if(startBtn){
    startBtn.addEventListener('click', () => {
      const nextPuzzle = pickRandomPuzzle(currentPuzzle);
      if(puzzleSelect){
        puzzleSelect.value = nextPuzzle;
      }
      currentPuzzle = nextPuzzle;
      startGame();
    });
  }

  if(btnRestart){
    btnRestart.addEventListener('click', () => {
      overlay.hide();
      startGame();
    });
  }

  if(btnClose){
    btnClose.addEventListener('click', () => {
      overlay.hide();
    });
  }

  if(puzzleSelect){
    puzzleSelect.innerHTML = '';
    NONOGRAM_PUZZLES.forEach(id => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = NONOGRAM_PUZZLE_LABELS[id] || id;
      puzzleSelect.appendChild(opt);
    });
    puzzleSelect.value = currentPuzzle;
    puzzleSelect.addEventListener('change', () => {
      currentPuzzle = normalizePuzzle(puzzleSelect.value);
      updateBestDisplay();
      startGame();
    });
  }

  document.addEventListener('nonogramHsCleared', e => {
    const mode = e.detail ? normalizePuzzle(e.detail.mode) : null;
    if(mode && mode === currentPuzzle){
      localStorage.removeItem(bestKey(currentPuzzle));
      updateBestDisplay();
      renderHS(currentPuzzle, { tableSelector: '#nonogramOvTable' });
    }
  });

  document.addEventListener('menuToggle', e => {
    if(!running || completed) return;
    if(e.detail && e.detail.show){
      menuPaused = paused;
      pause();
    }else if(!menuPaused){
      resume();
    }
  });

  startGame();

  return {
    start: startGame,
    pause,
    resume,
    stop,
    hideOverlay: overlay.hide,
    showOverlay: overlay.show
  };
}
