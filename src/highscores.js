// Highscore storage and rendering
import {
  HS_KEY_BASE,
  BEST_KEY_BASE,
  MODE_LABELS
} from './constants.js';
import { createHighscoreStore, sanitizeName } from './highscoreStore.js';

export { sanitizeName } from './highscoreStore.js';

export const bestKey = m => `${BEST_KEY_BASE}_${m}`;

const store = createHighscoreStore({
  keyBase: HS_KEY_BASE,
  limit: 10,
  sanitizeEntry: entry => {
    if (!entry) return null;
    const cleanScore = Number(entry.score) || 0;
    const cleanLines = Number(entry.lines) || 0;
    return {
      name: sanitizeName(entry.name || ''),
      score: cleanScore,
      lines: cleanLines,
      date: entry.date || ''
    };
  },
  sortEntries: (a, b) => b.score - a.score || b.lines - a.lines
});

export const hsKey = mode => store.storageKey(mode);

export function loadHS(mode) {
  return store.load(mode);
}

export function saveHS(list, mode) {
  store.save(list, mode);
}

export function sanitizeHS(list, mode) {
  return store.sanitizeList(list, mode);
}

export async function addHS(entry, mode) {
  return store.add(entry, mode);
}

export async function getHSList(mode) {
  return store.getList(mode);
}

export async function renderHS(mode, options = {}) {
  const { tableSelector = '#hsTable', labelSelector = '#hsModeLabel' } = options;
  const table = document.querySelector(tableSelector);
  const tbody = table ? table.querySelector('tbody') : null;
  if(!tbody) return;
  const list = await getHSList(mode);
  while(tbody.firstChild) tbody.removeChild(tbody.firstChild);
  list.forEach((e,i)=>{
    const tr=document.createElement('tr');
    const tdRank=document.createElement('td');
    tdRank.textContent=String(i+1);
    const tdName=document.createElement('td');
    tdName.textContent=e.name;
    const tdScore=document.createElement('td');
    tdScore.textContent=String(e.score);
    const tdLines=document.createElement('td');
    tdLines.textContent=String(e.lines);
    const tdDate=document.createElement('td');
    tdDate.textContent=e.date;
    tr.append(tdRank,tdName,tdScore,tdLines,tdDate);
    tbody.appendChild(tr);
  });
  if(labelSelector){
    const label = document.querySelector(labelSelector);
    if(label){
      const modeLabel = MODE_LABELS[mode] || mode;
      label.textContent = `Tetris – ${modeLabel}`;
    }
  }
}
