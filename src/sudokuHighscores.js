// Local highscore handling for Sudoku (based on completion time)
import { SUDOKU_HS_KEY_BASE } from './constants.js';
import {
  createHighscoreStore,
  formatDuration,
  renderHighscoreTable,
  sanitizeName
} from './highscoreStore.js';

const store = createHighscoreStore({
  keyBase: SUDOKU_HS_KEY_BASE,
  sanitizeEntry: entry => {
    if (!entry) return null;
    const time = Number(entry.time);
    if (Number.isNaN(time)) return null;
    return {
      name: sanitizeName(entry.name || ''),
      time,
      date: entry.date || new Date().toLocaleDateString()
    };
  },
  sortEntries: (a, b) => a.time - b.time
});

export function formatTime(totalSeconds){
  return formatDuration(totalSeconds, { allowHours: true });
}

export function addHS(entry, difficulty){
  return store.add(entry, difficulty);
}

export function clearHS(difficulty){
  store.clear(difficulty);
}

export function renderHS(difficulty, options = {}){
  const { tableSelector = '#sudokuScoreTable' } = options;
  return renderHighscoreTable({
    store,
    mode: difficulty,
    tableSelector,
    formatRow: entry => [
      entry.name,
      formatDuration(entry.time, { allowHours: true }),
      entry.date || ''
    ]
  });
}

export function getBestTime(difficulty){
  const list = store.getListSync(difficulty);
  return list.length ? list[0].time : null;
}
