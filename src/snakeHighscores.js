// Highscore storage and rendering for Snake
import { SNAKE_HS_KEY_BASE } from './constants.js';
import { createHighscoreStore, sanitizeName } from './highscoreStore.js';

const LEGACY_HS_KEY = 'snake_hs';

const store = createHighscoreStore({
  keyBase: SNAKE_HS_KEY_BASE,
  sanitizeEntry: entry => {
    if (!entry) return null;
    return {
      name: sanitizeName(entry.name || ''),
      score: Number(entry.score) || 0,
      date: entry.date || ''
    };
  },
  sortEntries: (a, b) => b.score - a.score,
  migrate: (mode, storage) => {
    if (mode !== 'classic') return;
    try {
      const legacy = storage.getItem(LEGACY_HS_KEY);
      if (legacy && !storage.getItem(storage.storageKey)) {
        storage.setItem(storage.storageKey, legacy);
        storage.removeItem(LEGACY_HS_KEY);
      }
    } catch {}
  }
});

export function clearHS(mode) {
  store.clear(mode);
}

export function addHS(entry, mode) {
  return store.add(entry, mode);
}

export async function renderHS(mode, options = {}) {
  const { tableSelector = '#snakeHsTable' } = options;
  const table = document.querySelector(tableSelector);
  const tbody = table ? table.querySelector('tbody') : null;
  if(!tbody) return;
  const list = await store.getList(mode);
  while(tbody.firstChild) tbody.removeChild(tbody.firstChild);
  list.forEach((e,i)=>{
    const tr = document.createElement('tr');
    const tdRank = document.createElement('td');
    tdRank.textContent = String(i+1);
    const tdName = document.createElement('td');
    tdName.textContent = e.name;
    const tdScore = document.createElement('td');
    tdScore.textContent = String(e.score);
    const tdDate = document.createElement('td');
    tdDate.textContent = e.date;
    tr.append(tdRank, tdName, tdScore, tdDate);
    tbody.appendChild(tr);
  });
}
