// Entry point for bootstrapping the UI and game
import { initUI } from './ui.js';
import { initGame } from './game.js';
import { initSnake } from './snake.js';
import { initMenu, toggleMenuOverlay } from './menu.js';
import { logError } from './logger.js';

initUI();
initMenu();
const tetrisGame = initGame();
const snakeGame = initSnake();

const gameSelect = document.getElementById('gameSelect');
const tetrisWrap = document.getElementById('tetrisWrap');
const snakeWrap = document.getElementById('snakeWrap');
const menuOverlay = document.getElementById('menuOverlay');

function switchGame(){
  if(!gameSelect || !tetrisWrap || !snakeWrap) return;
  if(menuOverlay && menuOverlay.classList.contains('show')){
    toggleMenuOverlay();
  }
  if(gameSelect.value === 'snake'){
    tetrisGame.pause();
    tetrisWrap.classList.add('hidden');
    snakeWrap.classList.remove('hidden');
    document.title = 'Snake';
    snakeGame.resume();
  }else{
    tetrisGame.resume();
    tetrisWrap.classList.remove('hidden');
    snakeWrap.classList.add('hidden');
    document.title = 'Tetris – Vanilla JS (Einzeldatei) + Scoreboard';
    snakeGame.pause();
    snakeGame.hideOverlay();
  }
}

if(gameSelect){
  gameSelect.addEventListener('change', switchGame);
  switchGame();
}

// Register external Service Worker (works on Netlify & GitHub Pages)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('sw.js', { scope: './' })
      .catch(e => logError('Service worker registration failed', e));
  });
}
