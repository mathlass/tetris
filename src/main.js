// Entry point for bootstrapping the UI and game
import { initUI } from './ui.js';
import { initGame } from './game.js';
import { logError } from './logger.js';

initUI();
initGame();

// Register external Service Worker (works on Netlify & GitHub Pages)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('sw.js', { scope: './' })
      .catch(e => logError('Service worker registration failed', e));
  });
}
