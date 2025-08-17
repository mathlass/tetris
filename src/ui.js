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
  const dlgPlayer = document.getElementById('playerDialog');
  const inputPlayer = document.getElementById('playerInput');
  const btnSave = document.getElementById('playerSave');
  const btnCancel = document.getElementById('playerCancel');

  function openPlayerDialog(){
    if(!dlgPlayer || !inputPlayer) return;
    inputPlayer.value = playerName;
    dlgPlayer.showModal();
    setTimeout(()=>inputPlayer.focus(),0);
  }

  if (localStorage.getItem(PLAYER_KEY) === null) {
    openPlayerDialog();
  }

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      playerName = inputPlayer.value.trim() || 'Player';
      localStorage.setItem(PLAYER_KEY, playerName);
      dlgPlayer.close();
    });
  }
  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      dlgPlayer.close();
    });
  }
  const btnPlayer = document.getElementById('btnPlayer');
  if (btnPlayer) {
    btnPlayer.addEventListener('click', openPlayerDialog);
  }

  document.addEventListener('contextmenu', e => e.preventDefault());
}
