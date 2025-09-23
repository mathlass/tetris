// Local highscore handling for Sudoku (based on completion time)
import { SUDOKU_HS_KEY_BASE } from './constants.js';
import {
  createHighscoreStore,
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
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if(hrs > 0){
    return `${hrs}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  }
  return `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
}

export function addHS(entry, difficulty){
  return store.add(entry, difficulty);
}

export function clearHS(difficulty){
  store.clear(difficulty);
}

export function renderHS(difficulty, options = {}){
  const { tableSelector = '#sudokuScoreTable' } = options;
  const table = document.querySelector(tableSelector);
  const tbody = table ? table.querySelector('tbody') : null;
  if(!tbody) return;
  const list = store.sanitizeList(store.load(difficulty), difficulty);
  while(tbody.firstChild) tbody.removeChild(tbody.firstChild);
  list.forEach((entry, index) => {
    const tr = document.createElement('tr');
    const tdRank = document.createElement('td');
    tdRank.textContent = String(index + 1);
    const tdName = document.createElement('td');
    tdName.textContent = entry.name;
    const tdTime = document.createElement('td');
    tdTime.textContent = formatTime(entry.time);
    const tdDate = document.createElement('td');
    tdDate.textContent = entry.date || '';
    tr.append(tdRank, tdName, tdTime, tdDate);
    tbody.appendChild(tr);
  });
}

export function getBestTime(difficulty){
  const list = store.sanitizeList(store.load(difficulty), difficulty);
  return list.length ? list[0].time : null;
}
