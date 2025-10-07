// Highscore storage and rendering for Snake
import { SNAKE_HS_KEY_BASE } from './constants.js';
import {
  createHighscoreStore,
  renderHighscoreTable,
  sanitizeName
} from './highscoreStore.js';

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

export function renderHS(mode, options = {}) {
  const { tableSelector = '#snakeHsTable' } = options;
  return renderHighscoreTable({
    store,
    mode,
    tableSelector,
    formatRow: entry => [entry.name, entry.score, entry.date]
  });
}
