// Entry point for bootstrapping the UI and game
import { initUI } from './ui.js';
import { initGame } from './game.js';
import { initSnake } from './snake.js';
import { logError } from './logger.js';

initUI();
initGame();
initSnake();

const gameSelect = document.getElementById('gameSelect');
const tetrisWrap = document.getElementById('tetrisWrap');
const snakeWrap = document.getElementById('snakeWrap');

function switchGame(){
  if(!gameSelect || !tetrisWrap || !snakeWrap) return;
  if(gameSelect.value === 'snake'){
    tetrisWrap.style.display = 'none';
    snakeWrap.style.display = 'block';
  }else{
    tetrisWrap.style.display = 'block';
    snakeWrap.style.display = 'none';
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
