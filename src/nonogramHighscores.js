import { NONOGRAM_HS_KEY_BASE } from './constants.js';
import {
  createHighscoreStore,
  formatDuration,
  renderHighscoreTable,
  sanitizeName
} from './highscoreStore.js';

const store = createHighscoreStore({
  keyBase: NONOGRAM_HS_KEY_BASE,
  sanitizeEntry: entry => {
    if(!entry) return null;
    const time = Number(entry.time);
    if(Number.isNaN(time)) return null;
    return {
      name: sanitizeName(entry.name || ''),
      time,
      date: entry.date || new Date().toLocaleDateString()
    };
  },
  sortEntries: (a, b) => a.time - b.time
});

export function formatNonogramTime(totalSeconds){
  return formatDuration(totalSeconds);
}

export function addHS(entry, puzzleId){
  return store.add(entry, puzzleId);
}

export function clearHS(puzzleId){
  store.clear(puzzleId);
}

export function renderHS(puzzleId, options = {}){
  const { tableSelector = '#nonogramScoreTable' } = options;
  return renderHighscoreTable({
    store,
    mode: puzzleId,
    tableSelector,
    formatRow: entry => [
      entry.name,
      formatDuration(entry.time),
      entry.date || ''
    ]
  });
}

export function getBestTime(puzzleId){
  const list = store.getListSync(puzzleId);
  return list.length ? list[0].time : null;
}

export function getHighscores(puzzleId){
  return store.getListSync(puzzleId);
}
