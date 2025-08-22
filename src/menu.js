// Centralized menu overlay logic
let overlay;
let btnClose;
let lastFocused = null;
let tabButtons = [];
let panels = {};
const TAB_KEY = 'menuTab';

export function initMenu(){
  overlay = document.getElementById('menuOverlay');
  if(!overlay) return;
  btnClose = document.getElementById('btnMenuClose');
  tabButtons = [document.getElementById('tabScore'), document.getElementById('tabSettings')].filter(Boolean);
  panels = {
    score: document.getElementById('scorePanel'),
    settings: document.getElementById('settingsPanel')
  };

  // Open buttons
  [document.getElementById('btnMenu'), document.getElementById('snakeBtnMenu')]
    .filter(Boolean)
    .forEach(btn => btn.addEventListener('click', toggleMenuOverlay));

  // Restore last active tab
  const saved = localStorage.getItem(TAB_KEY);
  const defaultTab = saved === 'settings' ? tabButtons[1] : tabButtons[0];
  if(defaultTab) activateTab(defaultTab);

  // Attach handlers for tabs
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn));
    btn.addEventListener('keydown', handleTabKey);
  });

  // Close button
  if(btnClose){
    btnClose.addEventListener('click', toggleMenuOverlay);
  }

  // Trap focus & ESC
  overlay.addEventListener('keydown', e => {
    if(e.key === 'Tab'){
      trapFocus(e);
    } else if(e.key === 'Escape'){
      e.preventDefault();
      toggleMenuOverlay();
    }
  });
}

export function toggleMenuOverlay(){
  if(!overlay) return false;
  const show = !overlay.classList.contains('show');
  overlay.classList.toggle('show', show);
  overlay.setAttribute('aria-hidden', String(!show));
  if(show){
    lastFocused = document.activeElement;
    setTimeout(() => btnClose && btnClose.focus(), 0);
  } else if(lastFocused){
    lastFocused.focus();
  }
  document.dispatchEvent(new CustomEvent('menuToggle', { detail: { show } }));
  return show;
}

function activateTab(btn){
  const isScore = btn === tabButtons[0];
  tabButtons.forEach((b,i) => {
    const selected = b === btn;
    b.classList.toggle('active', selected);
    b.setAttribute('aria-selected', String(selected));
    const panel = i===0 ? panels.score : panels.settings;
    if(panel) panel.style.display = selected ? 'block' : 'none';
  });
  localStorage.setItem(TAB_KEY, isScore ? 'score' : 'settings');
}

function handleTabKey(e){
  const idx = tabButtons.indexOf(e.currentTarget);
  if(e.key === 'ArrowRight' || e.code === 'ArrowRight'){
    e.preventDefault();
    const next = tabButtons[(idx+1)%tabButtons.length];
    next.focus();
    activateTab(next);
  } else if(e.key === 'ArrowLeft' || e.code === 'ArrowLeft'){
    e.preventDefault();
    const prev = tabButtons[(idx-1+tabButtons.length)%tabButtons.length];
    prev.focus();
    activateTab(prev);
  }
}

function trapFocus(e){
  const focusable = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if(focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if(e.shiftKey){
    if(document.activeElement === first){
      e.preventDefault();
      last.focus();
    }
  } else {
    if(document.activeElement === last){
      e.preventDefault();
      first.focus();
    }
  }
}
