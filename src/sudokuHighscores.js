// Local highscore handling for Sudoku (based on completion time)
import { HS_NAME_MAX_LENGTH, SUDOKU_HS_KEY_BASE } from './constants.js';
import { logError } from './logger.js';

const hsKey = difficulty => `${SUDOKU_HS_KEY_BASE}_${difficulty}`;

function loadHS(difficulty){
  try{
    return JSON.parse(localStorage.getItem(hsKey(difficulty))) || [];
  }catch(e){
    logError('Failed to parse sudoku highscores', e);
    return [];
  }
}

function saveHS(list, difficulty){
  try{
    localStorage.setItem(hsKey(difficulty), JSON.stringify(list));
  }catch(e){
    logError('Failed to save sudoku highscores', e);
  }
}

function sanitizeName(str = ''){
  return str.replace(/<[^>]*>/g, '').trim().slice(0, HS_NAME_MAX_LENGTH);
}

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
  const list = loadHS(difficulty);
  const cleanEntry = {
    name: sanitizeName(entry.name),
    time: Number(entry.time),
    date: entry.date || new Date().toLocaleDateString()
  };
  if(Number.isNaN(cleanEntry.time)){
    return list;
  }
  list.push(cleanEntry);
  list.sort((a,b) => a.time - b.time);
  const top10 = list.slice(0, 10);
  saveHS(top10, difficulty);
  return top10;
}

export function clearHS(difficulty){
  try{
    localStorage.removeItem(hsKey(difficulty));
  }catch(e){
    logError('Failed to clear sudoku highscores', e);
  }
}

export function renderHS(difficulty, options = {}){
  const { tableSelector = '#sudokuScoreTable' } = options;
  const table = document.querySelector(tableSelector);
  const tbody = table ? table.querySelector('tbody') : null;
  if(!tbody) return;
  const list = loadHS(difficulty);
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
  const list = loadHS(difficulty);
  return list.length ? list[0].time : null;
}
