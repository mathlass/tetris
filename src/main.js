// Entry point for bootstrapping the UI and game
import { initUI } from './ui.js';
import { initGame } from './game.js';
import { initSnake } from './snake.js';
import { logError } from './logger.js';

initUI();
initGame();
const snakeGame = initSnake();

const gameSelect = document.getElementById('gameSelect');
const tetrisWrap = document.getElementById('tetrisWrap');
const snakeWrap = document.getElementById('snakeWrap');
const menuOverlay = document.getElementById('menuOverlay');

function switchGame(){
  if(!gameSelect || !tetrisWrap || !snakeWrap) return;
  if(menuOverlay){
    menuOverlay.classList.remove('show');
    menuOverlay.setAttribute('aria-hidden', 'true');
  }
  if(gameSelect.value === 'snake'){
    tetrisWrap.style.display = 'none';
    snakeWrap.style.display = 'block';
    document.title = 'Snake';
    snakeGame.start();
  }else{
    tetrisWrap.style.display = 'block';
    snakeWrap.style.display = 'none';
    document.title = 'Tetris – Vanilla JS (Einzeldatei) + Scoreboard';
    snakeGame.stop();
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
