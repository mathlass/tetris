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
  const progressText = document.getElementById('sudokuProgressText');
  const progressFill = document.getElementById('sudokuProgressFill');
  const noteToggle = document.getElementById('sudokuNoteToggle');
  const markToggle = document.getElementById('sudokuMarkToggle');

  if(!boardEl || !padEl || !timerEl || !bestEl){
    return {
      start: () => {},
      pause: () => {},
      resume: () => {},
      hideOverlay: () => {}
    };
  }

  const bestKey = difficulty => `${SUDOKU_BEST_KEY_BASE}_${difficulty}`;
  const totalCells = GRID_SIZE * GRID_SIZE;
  const cells = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  const padButtons = padEl ? Array.from(padEl.querySelectorAll('button[data-value]')) : [];
  let initial = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  let board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  let solution = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  let notes = createNotesGrid();
  let selectedCell = null;
  let currentDifficulty = difficultySelect ? difficultySelect.value : SUDOKU_DIFFICULTIES[0];
  let startTime = 0;
  let elapsed = 0;
  let timer = null;
  let active = false;
  let completed = false;
  let paused = false;
  let menuPaused = false;
  let noteMode = false;
  let markMode = false;
  let highlightedDigit = null;

  function createNotesGrid(){
    return Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => new Set()));
  }

  function renderNotes(noteSet){
    return `<div class="sudoku-notes">${Array.from({ length: 9 }, (_, index) => {
      const value = noteSet.has(index + 1) ? String(index + 1) : '&nbsp;';
      return `<span>${value}</span>`;
    }).join('')}</div>`;
  }

  function updatePadState(){
    padButtons.forEach(btn => {
      const value = Number(btn.dataset.value);
      btn.classList.toggle('selected', highlightedDigit === value);
    });
    if(noteToggle){
      noteToggle.setAttribute('aria-pressed', noteMode ? 'true' : 'false');
    }
    if(markToggle){
      markToggle.setAttribute('aria-pressed', markMode ? 'true' : 'false');
    }
  }

  function updateHighlights(){
    cells.forEach(row => row.forEach(cell => {
      if(cell){
        cell.classList.remove('highlight-row', 'highlight-col', 'highlight-block', 'highlight-number');
      }
    }));

    if(selectedCell){
      const rowIndex = Number(selectedCell.dataset.row);
      const colIndex = Number(selectedCell.dataset.col);
      if(!Number.isNaN(rowIndex) && !Number.isNaN(colIndex)){
        for(let c = 0; c < GRID_SIZE; c++){
          cells[rowIndex][c]?.classList.add('highlight-row');
        }
        for(let r = 0; r < GRID_SIZE; r++){
          cells[r][colIndex]?.classList.add('highlight-col');
        }
        const startRow = Math.floor(rowIndex / 3) * 3;
        const startCol = Math.floor(colIndex / 3) * 3;
        for(let r = startRow; r < startRow + 3; r++){
          for(let c = startCol; c < startCol + 3; c++){
            cells[r][c]?.classList.add('highlight-block');
          }
        }
        selectedCell.classList.add('selected');
      }
    }

    if(highlightedDigit){
      for(let r = 0; r < GRID_SIZE; r++){
        for(let c = 0; c < GRID_SIZE; c++){
          if(board[r][c] === highlightedDigit){
            cells[r][c]?.classList.add('highlight-number');
          }
        }
      }
    }
  }

  function updateProgress(){
    let filled = 0;
    for(let r = 0; r < GRID_SIZE; r++){
      for(let c = 0; c < GRID_SIZE; c++){
        if(board[r][c] !== 0){
          filled++;
        }
      }
    }
    const percent = Math.round((filled / totalCells) * 100);
    const remaining = totalCells - filled;
    if(progressText){
      progressText.textContent = `${filled}/${totalCells} Felder (${remaining} offen)`;
    }
    if(progressFill){
      progressFill.style.width = `${percent}%`;
    }
  }

  function clearSelection(){
    if(selectedCell){
      selectedCell.classList.remove('selected');
    }
    selectedCell = null;
    updateHighlights();
  }

  function selectCell(cell){
    if(!cell) return;
    if(selectedCell && selectedCell !== cell){
      selectedCell.classList.remove('selected');
    }
    selectedCell = cell;
    selectedCell.classList.add('selected');
    if(!markMode){
      const value = Number(cell.dataset.value || 0);
      highlightedDigit = value || highlightedDigit;
    }
    updatePadState();
    updateHighlights();
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
        if(r % 3 === 0 && r !== 0) cell.classList.add('border-top');
        if(c % 3 === 0 && c !== 0) cell.classList.add('border-left');
        if(r === GRID_SIZE - 1) cell.classList.add('border-bottom');
        if(c === GRID_SIZE - 1) cell.classList.add('border-right');
        cell.addEventListener('click', () => selectCell(cell));
        cell.addEventListener('focus', () => {
          selectCell(cell);
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

  function updateCellState(row, col){
    const cell = cells[row][col];
    if(!cell) return;
    const isFixed = initial[row][col] !== 0;
    const value = board[row][col];
    const noteSet = notes[row][col] || (notes[row][col] = new Set());

    cell.classList.remove('fixed', 'filled', 'error', 'has-notes');

    if(isFixed){
      cell.textContent = String(value);
      cell.classList.add('fixed');
      cell.disabled = false;
      cell.setAttribute('aria-disabled', 'true');
      cell.dataset.value = String(value);
      if(noteSet) noteSet.clear();
      cell.setAttribute('aria-label', `Feld ${row + 1},${col + 1} – Vorgabe ${value}`);
      return;
    }

    cell.disabled = false;
    cell.removeAttribute('aria-disabled');

    if(value){
      cell.textContent = String(value);
      cell.classList.add('filled');
      cell.dataset.value = String(value);
      const correct = value === solution[row][col];
      cell.classList.toggle('error', !correct);
      const suffix = correct ? '' : ' (Konflikt)';
      cell.setAttribute('aria-label', `Feld ${row + 1},${col + 1} – ${value}${suffix}`);
      if(noteSet) noteSet.clear();
    }else if(noteSet && noteSet.size){
      cell.innerHTML = renderNotes(noteSet);
      cell.dataset.value = '';
      cell.classList.add('has-notes');
      cell.classList.remove('filled');
      cell.classList.remove('error');
      const noteList = Array.from(noteSet).sort((a, b) => a - b).join(', ');
      cell.setAttribute('aria-label', `Feld ${row + 1},${col + 1} – Notizen ${noteList}`);
    }else{
      cell.textContent = '';
      cell.dataset.value = '';
      cell.classList.remove('filled');
      cell.classList.remove('error');
      cell.classList.remove('has-notes');
      cell.setAttribute('aria-label', `Feld ${row + 1},${col + 1} – leer`);
    }
  }

  function applyPuzzle(){
    clearSelection();
    notes = createNotesGrid();
    for(let r = 0; r < GRID_SIZE; r++){
      for(let c = 0; c < GRID_SIZE; c++){
        const value = initial[r][c];
        board[r][c] = value;
        updateCellState(r, c);
      }
    }
    updateProgress();
    updateHighlights();
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
    noteMode = false;
    markMode = false;
    highlightedDigit = null;
    applyPuzzle();
    updateBestDisplay();
    updatePadState();
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
    if(markMode){
      highlightedDigit = highlightedDigit === num ? null : num;
      updatePadState();
      updateHighlights();
      return;
    }

    if(!active || completed){
      highlightedDigit = num;
      updatePadState();
      updateHighlights();
      return;
    }

    if(!selectedCell){
      highlightedDigit = num;
      updatePadState();
      updateHighlights();
      return;
    }

    const row = Number(selectedCell.dataset.row);
    const col = Number(selectedCell.dataset.col);
    if(Number.isNaN(row) || Number.isNaN(col)) return;

    highlightedDigit = num;

    if(initial[row][col] !== 0){
      updatePadState();
      updateHighlights();
      return;
    }

    const noteSet = notes[row][col] || (notes[row][col] = new Set());

    if(noteMode){
      if(board[row][col] !== 0){
        board[row][col] = 0;
      }
      if(noteSet.has(num)){
        noteSet.delete(num);
      }else{
        noteSet.add(num);
      }
      updateCellState(row, col);
    }else{
      if(noteSet) noteSet.clear();
      board[row][col] = num;
      updateCellState(row, col);
      if(checkCompletion()){
        completePuzzle();
      }
    }

    updateProgress();
    updatePadState();
    updateHighlights();
  }

  function handleClearInput(){
    if(markMode){
      highlightedDigit = null;
      updatePadState();
      updateHighlights();
      return;
    }

    if(!selectedCell || !active || completed) return;
    const row = Number(selectedCell.dataset.row);
    const col = Number(selectedCell.dataset.col);
    if(Number.isNaN(row) || Number.isNaN(col)) return;
    if(initial[row][col] !== 0) return;

    const noteSet = notes[row][col];
    const hadValue = board[row][col] !== 0 || (noteSet && noteSet.size);

    if(noteSet) noteSet.clear();
    board[row][col] = 0;
    updateCellState(row, col);

    if(hadValue){
      updateProgress();
    }

    updatePadState();
    updateHighlights();
  }

  padEl.addEventListener('click', e => {
    const button = e.target.closest('button');
    if(!button || !padEl.contains(button)) return;
    if(button.dataset.action === 'clear'){
      handleClearInput();
      return;
    }
    if(button.hasAttribute('data-value')){
      const value = Number(button.dataset.value);
      if(value >= 1 && value <= 9){
        handleNumberInput(value);
      }
    }
  });

  boardEl.addEventListener('keydown', e => {
    if(e.key >= '1' && e.key <= '9'){
      handleNumberInput(Number(e.key));
      e.preventDefault();
    }else if(e.key === 'Backspace' || e.key === 'Delete' || e.key === '0'){
      handleClearInput();
      e.preventDefault();
    }
  });

  if(noteToggle){
    noteToggle.addEventListener('click', () => {
      noteMode = !noteMode;
      if(noteMode){
        markMode = false;
      }
      updatePadState();
    });
  }

  if(markToggle){
    markToggle.addEventListener('click', () => {
      markMode = !markMode;
      if(markMode){
        noteMode = false;
      }
      if(!markMode && selectedCell){
        const value = Number(selectedCell.dataset.value || 0);
        highlightedDigit = value || highlightedDigit;
      }
      updatePadState();
      updateHighlights();
    });
  }

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
