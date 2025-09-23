// Entry point for bootstrapping the UI and game
import { initUI } from './ui.js';
import { initGame } from './game.js';
import { initSnake } from './snake.js';
import { initSudoku } from './sudoku.js';
import { initMenu, toggleMenuOverlay } from './menu.js';
import { logError } from './logger.js';

initUI();
initMenu();
const tetrisGame = initGame();
const snakeGame = initSnake();
const sudokuGame = initSudoku();

const gameSelect = document.getElementById('gameSelect');
const tetrisWrap = document.getElementById('tetrisWrap');
const snakeWrap = document.getElementById('snakeWrap');
const sudokuWrap = document.getElementById('sudokuWrap');
const menuOverlay = document.getElementById('menuOverlay');
let introCompleted = false;

const games = {
  tetris: {
    controller: tetrisGame,
    wrapper: tetrisWrap,
    title: 'Tetris – Vanilla JS (Einzeldatei) + Scoreboard'
  },
  snake: {
    controller: snakeGame,
    wrapper: snakeWrap,
    title: 'Snake'
  },
  sudoku: {
    controller: sudokuGame,
    wrapper: sudokuWrap,
    title: 'Sudoku'
  }
};

function switchGame(){
  if(!gameSelect) return;
  if(!introCompleted) return;
  if(menuOverlay && menuOverlay.classList.contains('show')){
    toggleMenuOverlay();
  }
  const selected = games[gameSelect.value] ? gameSelect.value : 'tetris';
  Object.entries(games).forEach(([key, { controller, wrapper, title }]) => {
    const isActive = key === selected;
    if(wrapper){
      wrapper.classList.toggle('hidden', !isActive);
    }
    if(controller){
      if(isActive){
        controller.resume?.();
      }else{
        controller.pause?.();
        controller.hideOverlay?.();
      }
    }
    if(isActive && title){
      document.title = title;
    }
  });
}

if(gameSelect){
  gameSelect.addEventListener('change', switchGame);
}

document.addEventListener('intro-complete', event => {
  introCompleted = true;
  const selectedGame = event.detail?.game || 'tetris';
  if(gameSelect){
    gameSelect.value = selectedGame;
  }
  const introScreen = document.getElementById('introScreen');
  if(introScreen){
    introScreen.setAttribute('aria-hidden', 'true');
  }
  switchGame();
});

// Register external Service Worker (works on Netlify & GitHub Pages)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('sw.js', { scope: './' })
      .catch(e => logError('Service worker registration failed', e));
  });
}
