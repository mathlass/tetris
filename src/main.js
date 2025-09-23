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

function switchGame(){
  if(!gameSelect || !tetrisWrap || !snakeWrap || !sudokuWrap) return;
  if(!introCompleted) return;
  if(menuOverlay && menuOverlay.classList.contains('show')){
    toggleMenuOverlay();
  }
  const selected = gameSelect.value;
  if(selected === 'snake'){
    tetrisGame.pause();
    tetrisWrap.classList.add('hidden');
    snakeWrap.classList.remove('hidden');
    sudokuWrap.classList.add('hidden');
    sudokuGame.pause();
    sudokuGame.hideOverlay();
    document.title = 'Snake';
    snakeGame.resume();
  }else if(selected === 'sudoku'){
    tetrisGame.pause();
    snakeGame.pause();
    snakeGame.hideOverlay();
    tetrisWrap.classList.add('hidden');
    snakeWrap.classList.add('hidden');
    sudokuWrap.classList.remove('hidden');
    document.title = 'Sudoku';
    sudokuGame.resume();
  }else{
    tetrisGame.resume();
    tetrisWrap.classList.remove('hidden');
    snakeWrap.classList.add('hidden');
    sudokuWrap.classList.add('hidden');
    document.title = 'Tetris – Vanilla JS (Einzeldatei) + Scoreboard';
    snakeGame.pause();
    snakeGame.hideOverlay();
    sudokuGame.pause();
    sudokuGame.hideOverlay();
  }
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
