import { THEME_KEY, PLAYER_KEY } from './constants.js';

export function initUI(){
  if (localStorage.getItem(THEME_KEY) === 'light') {
    document.body.classList.add('theme-light');
  }
  const btnTheme = document.getElementById('themeToggle');
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      document.body.classList.toggle('theme-light');
      localStorage.setItem(
        THEME_KEY,
        document.body.classList.contains('theme-light') ? 'light' : 'dark'
      );
    });
  }

  let playerName = localStorage.getItem(PLAYER_KEY) || 'Player';
  if (localStorage.getItem(PLAYER_KEY) === null) {
    const name = prompt('Bitte Spielername eingeben:');
    if (name !== null) {
      playerName = name.trim() || 'Player';
      localStorage.setItem(PLAYER_KEY, playerName);
    }
  }
  const btnPlayer = document.getElementById('btnPlayer');
  if (btnPlayer) {
    btnPlayer.addEventListener('click', () => {
      const name = prompt('Spielername:', playerName);
      if (name !== null) {
        playerName = name.trim() || 'Player';
        localStorage.setItem(PLAYER_KEY, playerName);
      }
    });
  }

  document.addEventListener('contextmenu', e => e.preventDefault());
}
