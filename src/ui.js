import { THEME_KEY, PLAYER_KEY } from './constants.js';

export function initUI(){
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const storedTheme = localStorage.getItem(THEME_KEY);
  if (storedTheme === 'light' || (storedTheme === null && prefersLight)) {
    document.body.classList.add('theme-light');
  }

  const btnThemes = document.querySelectorAll('#themeToggle');
  const themeIcons = document.querySelectorAll('#themeIcon');
  function updateThemeIcon(){
    themeIcons.forEach(icon => {
      icon.textContent = document.body.classList.contains('theme-light') ? 'dark_mode' : 'light_mode';
    });
  }
  updateThemeIcon();
  btnThemes.forEach(btn => {
    btn.addEventListener('click', () => {
      document.body.classList.toggle('theme-light');
      localStorage.setItem(
        THEME_KEY,
        document.body.classList.contains('theme-light') ? 'light' : 'dark'
      );
      updateThemeIcon();
    });
  });

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
  const btnPlayers = document.querySelectorAll('#btnPlayer');
  btnPlayers.forEach(btn => btn.addEventListener('click', openPlayerDialog));

  document.addEventListener('contextmenu', e => e.preventDefault());
}
