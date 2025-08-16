import { initUI } from './ui.js';
import { initGame } from './game.js';

initUI();
initGame();

// Register external Service Worker (works on Netlify & GitHub Pages)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { scope: './' }).catch(()=>{});
  });
}
