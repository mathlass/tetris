// Centralized menu overlay logic
import {
  MODE_LABELS,
  TETRIS_MODES,
  SNAKE_MODES,
  SNAKE_MODE_LABELS,
  SNAKE_BEST_KEY_BASE,
  SUDOKU_DIFFICULTIES,
  SUDOKU_DIFFICULTY_LABELS,
  SUDOKU_BEST_KEY_BASE,
  NONOGRAM_PUZZLES,
  NONOGRAM_PUZZLE_LABELS,
  NONOGRAM_BEST_KEY_BASE
} from './constants.js';
import { renderHS as renderTetrisHS, saveHS, bestKey } from './highscores.js';
import { renderHS as renderSnakeHS, clearHS as clearSnakeHS } from './snakeHighscores.js';
import { renderHS as renderSudokuHS, clearHS as clearSudokuHS } from './sudokuHighscores.js';
import { renderHS as renderNonogramHS, clearHS as clearNonogramHS } from './nonogramHighscores.js';
let overlay;
let btnClose;
let lastFocused = null;
let tabButtons = [];
let panels = {};
const TAB_KEY = 'menuTab';

export function initMenu(){
  overlay = document.getElementById('menuOverlay');
  if(!overlay) return;
  btnClose = document.getElementById('btnMenuClose');
  tabButtons = [document.getElementById('tabScore'), document.getElementById('tabSettings')].filter(Boolean);
  panels = {
    score: document.getElementById('scorePanel'),
    settings: document.getElementById('settingsPanel')
  };
  const scoreGameSelect = document.getElementById('scoreGameSelect');
  const scoreModeSelect = document.getElementById('scoreModeSelect');
  const hsTable = document.getElementById('hsTable');
  const snakeTable = document.getElementById('snakeScoreTable');
  const sudokuTable = document.getElementById('sudokuScoreTable');
  const nonogramTable = document.getElementById('nonogramScoreTable');
  const hsLabel = document.getElementById('hsModeLabel');
  const lastModeByGame = {
    tetris: TETRIS_MODES[0],
    snake: SNAKE_MODES[0],
    sudoku: SUDOKU_DIFFICULTIES[0],
    nonogram: NONOGRAM_PUZZLES[0]
  };
  const snakeBestKey = mode => `${SNAKE_BEST_KEY_BASE}_${mode}`;
  const sudokuBestKey = mode => `${SUDOKU_BEST_KEY_BASE}_${mode}`;
  const nonogramBestKey = mode => `${NONOGRAM_BEST_KEY_BASE}_${mode}`;

  function fillModeOptions(game, preferred){
    if(!scoreModeSelect) return preferred;
    let modes;
    let labels;
    if(game === 'snake'){
      modes = SNAKE_MODES;
      labels = SNAKE_MODE_LABELS;
    }else if(game === 'sudoku'){
      modes = SUDOKU_DIFFICULTIES;
      labels = SUDOKU_DIFFICULTY_LABELS;
    }else if(game === 'nonogram'){
      modes = NONOGRAM_PUZZLES;
      labels = NONOGRAM_PUZZLE_LABELS;
    }else{
      modes = TETRIS_MODES;
      labels = MODE_LABELS;
    }
    scoreModeSelect.innerHTML = '';
    modes.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = labels[m] || m;
      scoreModeSelect.appendChild(opt);
    });
    const target = preferred && modes.includes(preferred) ? preferred : modes[0];
    scoreModeSelect.value = target;
    return target;
  }

  async function updateScoreboard(game, mode){
    if(!mode) return;
    if(game === 'snake'){
      if(hsTable) hsTable.classList.add('hidden');
      if(snakeTable) snakeTable.classList.remove('hidden');
      if(sudokuTable) sudokuTable.classList.add('hidden');
      if(nonogramTable) nonogramTable.classList.add('hidden');
      if(hsLabel) hsLabel.textContent = `Snake – ${SNAKE_MODE_LABELS[mode] || mode}`;
      await renderSnakeHS(mode, { tableSelector: '#snakeScoreTable' });
    } else if(game === 'sudoku'){
      if(hsTable) hsTable.classList.add('hidden');
      if(snakeTable) snakeTable.classList.add('hidden');
      if(sudokuTable) sudokuTable.classList.remove('hidden');
      if(nonogramTable) nonogramTable.classList.add('hidden');
      if(hsLabel) hsLabel.textContent = `Sudoku – ${SUDOKU_DIFFICULTY_LABELS[mode] || mode}`;
      renderSudokuHS(mode, { tableSelector: '#sudokuScoreTable' });
    } else if(game === 'nonogram'){
      if(hsTable) hsTable.classList.add('hidden');
      if(snakeTable) snakeTable.classList.add('hidden');
      if(sudokuTable) sudokuTable.classList.add('hidden');
      if(nonogramTable) nonogramTable.classList.remove('hidden');
      if(hsLabel) hsLabel.textContent = `Nonogramm – ${NONOGRAM_PUZZLE_LABELS[mode] || mode}`;
      renderNonogramHS(mode, { tableSelector: '#nonogramScoreTable' });
    } else {
      if(hsTable) hsTable.classList.remove('hidden');
      if(snakeTable) snakeTable.classList.add('hidden');
      if(sudokuTable) sudokuTable.classList.add('hidden');
      if(nonogramTable) nonogramTable.classList.add('hidden');
      await renderTetrisHS(mode, { tableSelector: '#hsTable', labelSelector: '#hsModeLabel' });
    }
  }

  const gameSelect = document.getElementById('gameSelect');
  const tetrisModeSelect = document.getElementById('modeSelect');
  const snakeModeSelect = document.getElementById('snakeModeSelect');
  const sudokuModeSelect = document.getElementById('sudokuDifficulty');
  const nonogramModeSelect = document.getElementById('nonogramPuzzleSelect');

  async function syncScoreboardWithActiveGame(){
    if(!scoreGameSelect || !scoreModeSelect) return;
    const activeGame = gameSelect ? gameSelect.value : 'tetris';
    scoreGameSelect.value = activeGame;
    let currentMode;
    if(activeGame === 'snake'){
      currentMode = snakeModeSelect ? snakeModeSelect.value : lastModeByGame.snake;
    }else if(activeGame === 'sudoku'){
      currentMode = sudokuModeSelect ? sudokuModeSelect.value : lastModeByGame.sudoku;
    }else if(activeGame === 'nonogram'){
      currentMode = nonogramModeSelect ? nonogramModeSelect.value : lastModeByGame.nonogram;
    }else{
      currentMode = tetrisModeSelect ? tetrisModeSelect.value : lastModeByGame.tetris;
    }
    const selectedMode = fillModeOptions(activeGame, currentMode);
    lastModeByGame[activeGame] = selectedMode;
    await updateScoreboard(activeGame, selectedMode);
  }

  // Open buttons
  [
    document.getElementById('btnMenu'),
    document.getElementById('snakeBtnMenu'),
    document.getElementById('sudokuBtnMenu'),
    document.getElementById('nonogramBtnMenu')
  ]
    .filter(Boolean)
    .forEach(btn => btn.addEventListener('click', toggleMenuOverlay));

  // Restore last active tab
  const saved = localStorage.getItem(TAB_KEY);
  const defaultTab = saved === 'settings' ? tabButtons[1] : tabButtons[0];
  if(defaultTab) activateTab(defaultTab);

  // Attach handlers for tabs
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn));
    btn.addEventListener('keydown', handleTabKey);
  });

  // Close button
  if(btnClose){
    btnClose.addEventListener('click', toggleMenuOverlay);
  }

  // Trap focus & ESC
  overlay.addEventListener('keydown', e => {
    if(e.key === 'Tab'){
      trapFocus(e);
    } else if(e.key === 'Escape'){
      e.preventDefault();
      toggleMenuOverlay();
    }
  });

  if(scoreGameSelect){
    scoreGameSelect.addEventListener('change', () => {
      const game = scoreGameSelect.value;
      const mode = fillModeOptions(game, lastModeByGame[game]);
      lastModeByGame[game] = mode;
      void updateScoreboard(game, mode);
    });
  }
  if(scoreModeSelect){
    scoreModeSelect.addEventListener('change', () => {
      const game = scoreGameSelect ? scoreGameSelect.value : 'tetris';
      lastModeByGame[game] = scoreModeSelect.value;
      void updateScoreboard(game, scoreModeSelect.value);
    });
  }
  const btnResetHS = document.getElementById('btnResetHS');
  if(btnResetHS){
    btnResetHS.addEventListener('click', async () => {
      const game = scoreGameSelect ? scoreGameSelect.value : 'tetris';
      const mode = scoreModeSelect ? scoreModeSelect.value : lastModeByGame[game];
      if(game === 'snake'){
        clearHS(mode);
        localStorage.removeItem(snakeBestKey(mode));
        await updateScoreboard(game, mode);
        document.dispatchEvent(new CustomEvent('snakeHsCleared', { detail: { mode } }));
      } else if(game === 'sudoku'){
        clearSudokuHS(mode);
        localStorage.removeItem(sudokuBestKey(mode));
        await updateScoreboard(game, mode);
        document.dispatchEvent(new CustomEvent('sudokuHsCleared', { detail: { mode } }));
      } else if(game === 'nonogram'){
        clearNonogramHS(mode);
        localStorage.removeItem(nonogramBestKey(mode));
        await updateScoreboard(game, mode);
        document.dispatchEvent(new CustomEvent('nonogramHsCleared', { detail: { mode } }));
      } else {
        saveHS([], mode);
        localStorage.removeItem(bestKey(mode));
        await updateScoreboard(game, mode);
        document.dispatchEvent(new CustomEvent('tetrisHsCleared', { detail: { mode } }));
      }
    });
  }

  void syncScoreboardWithActiveGame();
  document.addEventListener('menuToggle', e => {
    if(e.detail && e.detail.show){
      void syncScoreboardWithActiveGame();
    }
  });
}

export function toggleMenuOverlay(){
  if(!overlay) return false;
  const show = !overlay.classList.contains('show');
  overlay.classList.toggle('show', show);
  overlay.setAttribute('aria-hidden', String(!show));
  if(show){
    lastFocused = document.activeElement;
    setTimeout(() => btnClose && btnClose.focus(), 0);
  } else if(lastFocused){
    lastFocused.focus();
  }
  document.dispatchEvent(new CustomEvent('menuToggle', { detail: { show } }));
  return show;
}

function activateTab(btn){
  const isScore = btn === tabButtons[0];
  tabButtons.forEach((b,i) => {
    const selected = b === btn;
    b.classList.toggle('active', selected);
    b.setAttribute('aria-selected', String(selected));
    const panel = i===0 ? panels.score : panels.settings;
    if(panel) panel.style.display = selected ? 'block' : 'none';
  });
  localStorage.setItem(TAB_KEY, isScore ? 'score' : 'settings');
}

function handleTabKey(e){
  const idx = tabButtons.indexOf(e.currentTarget);
  if(e.key === 'ArrowRight' || e.code === 'ArrowRight'){
    e.preventDefault();
    const next = tabButtons[(idx+1)%tabButtons.length];
    next.focus();
    activateTab(next);
  } else if(e.key === 'ArrowLeft' || e.code === 'ArrowLeft'){
    e.preventDefault();
    const prev = tabButtons[(idx-1+tabButtons.length)%tabButtons.length];
    prev.focus();
    activateTab(prev);
  }
}

function trapFocus(e){
  const focusable = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if(focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if(e.shiftKey){
    if(document.activeElement === first){
      e.preventDefault();
      last.focus();
    }
  } else {
    if(document.activeElement === last){
      e.preventDefault();
      first.focus();
    }
  }
}
