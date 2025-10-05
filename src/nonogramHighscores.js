import { NONOGRAM_HS_KEY_BASE } from './constants.js';
import {
  createHighscoreStore,
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
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function addHS(entry, puzzleId){
  return store.add(entry, puzzleId);
}

export function clearHS(puzzleId){
  store.clear(puzzleId);
}

export function renderHS(puzzleId, options = {}){
  const { tableSelector = '#nonogramScoreTable' } = options;
  const table = document.querySelector(tableSelector);
  const tbody = table ? table.querySelector('tbody') : null;
  if(!tbody) return;
  const list = store.sanitizeList(store.load(puzzleId), puzzleId);
  while(tbody.firstChild) tbody.removeChild(tbody.firstChild);
  list.forEach((entry, index) => {
    const tr = document.createElement('tr');
    const tdRank = document.createElement('td');
    tdRank.textContent = String(index + 1);
    const tdName = document.createElement('td');
    tdName.textContent = entry.name;
    const tdTime = document.createElement('td');
    tdTime.textContent = formatNonogramTime(entry.time);
    const tdDate = document.createElement('td');
    tdDate.textContent = entry.date || '';
    tr.append(tdRank, tdName, tdTime, tdDate);
    tbody.appendChild(tr);
  });
}

export function getBestTime(puzzleId){
  const list = store.sanitizeList(store.load(puzzleId), puzzleId);
  return list.length ? list[0].time : null;
}
