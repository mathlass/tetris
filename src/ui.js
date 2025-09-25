import { THEME_KEY, PLAYER_KEY } from './constants.js';

export function initUI(){
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const storedTheme = localStorage.getItem(THEME_KEY);
  if (storedTheme === 'light' || (storedTheme === null && prefersLight)) {
    document.body.classList.add('theme-light');
  }

  const btnThemes = document.querySelectorAll('#themeToggle');
  const themeIcons = document.querySelectorAll('[data-theme-icon]');
  const globalControls = document.getElementById('globalControls');
  const introScreen = document.getElementById('introScreen');
  const introForm = document.getElementById('introForm');
  const introNameInput = document.getElementById('introName');
  const introGameSelect = document.getElementById('introGameSelect');
  const gameSelect = document.getElementById('gameSelect');
  if(introScreen){
    introScreen.setAttribute('aria-hidden', 'false');
  }
  if(introGameSelect && gameSelect){
    introGameSelect.value = gameSelect.value;
  }

  function dispatchIntroComplete(game){
    const detail = { game };
    const CustomEvt = (typeof window !== 'undefined' && typeof window.CustomEvent === 'function')
      ? window.CustomEvent
      : (typeof CustomEvent === 'function' ? CustomEvent : null);
    let evt;
    if(CustomEvt){
      evt = new CustomEvt('intro-complete', { detail });
    }else{
      evt = new Event('intro-complete');
      evt.detail = detail;
    }
    document.dispatchEvent(evt);
  }
  function updateThemeIcon(){
    const symbol = document.body.classList.contains('theme-light') ? '🌙' : '🌞';
    themeIcons.forEach(icon => {
      icon.textContent = symbol;
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
  if(introNameInput){
    introNameInput.value = playerName;
    setTimeout(()=>introNameInput.focus(),0);
  }

  if(introForm){
    introForm.addEventListener('submit', e => {
      e.preventDefault();
      playerName = (introNameInput?.value.trim() || 'Player');
      localStorage.setItem(PLAYER_KEY, playerName);
      const selectedGame = introGameSelect?.value || 'tetris';
      if(gameSelect){
        gameSelect.value = selectedGame;
      }
      if(globalControls){
        globalControls.classList.remove('hidden');
      }
      if(introScreen){
        introScreen.classList.add('hide');
        introScreen.setAttribute('aria-hidden', 'true');
      }
      dispatchIntroComplete(selectedGame);
    });
  }else{
    if(globalControls){
      globalControls.classList.remove('hidden');
    }
    const selectedGame = gameSelect?.value || 'tetris';
    dispatchIntroComplete(selectedGame);
  }

  document.addEventListener('contextmenu', e => e.preventDefault());
}
