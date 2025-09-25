import { THEME_KEY, PLAYER_KEY } from './constants.js';

export function initUI(){
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const storedTheme = localStorage.getItem(THEME_KEY);
  const themeOrder = ['dark','light','aurora'];
  const themeConfig = {
    dark:{ className:'', icon:'🌙', label:'Dunkel' },
    light:{ className:'theme-light', icon:'🌞', label:'Hell' },
    aurora:{ className:'theme-aurora', icon:'⚡', label:'Aurora' }
  };
  const removableClasses = themeOrder
    .map(key => themeConfig[key]?.className)
    .filter(Boolean);

  function applyTheme(theme){
    removableClasses.forEach(cls => document.body.classList.remove(cls));
    const themeClass = themeConfig[theme]?.className;
    if(themeClass){
      document.body.classList.add(themeClass);
    }
    document.body.dataset.theme = theme;
  }

  let currentTheme = themeOrder.includes(storedTheme)
    ? storedTheme
    : (storedTheme === null && prefersLight ? 'light' : 'dark');
  applyTheme(currentTheme);

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
    const config = themeConfig[currentTheme] ?? themeConfig.dark;
    themeIcons.forEach(icon => {
      icon.textContent = config.icon;
    });
    btnThemes.forEach(btn => {
      const label = `Theme wechseln (aktuell: ${config.label})`;
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    });
  }
  updateThemeIcon();
  btnThemes.forEach(btn => {
    btn.addEventListener('click', () => {
      const nextIndex = (themeOrder.indexOf(currentTheme) + 1) % themeOrder.length;
      currentTheme = themeOrder[nextIndex];
      applyTheme(currentTheme);
      localStorage.setItem(THEME_KEY, currentTheme);
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
