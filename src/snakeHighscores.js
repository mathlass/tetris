// Highscore storage and rendering for Snake
import { logError } from './logger.js';
const HS_KEY = 'snake_hs';

function load(){
  try{
    return JSON.parse(localStorage.getItem(HS_KEY)) || [];
  }catch(e){
    logError('Failed to load snake highscores', e);
    return [];
  }
}

function save(list){
  try{
    localStorage.setItem(HS_KEY, JSON.stringify(list));
  }catch(e){
    logError('Failed to save snake highscores', e);
  }
}

export function clearHS(){
  try{
    localStorage.removeItem(HS_KEY);
  }catch(e){
    logError('Failed to clear snake highscores', e);
  }
}

function sanitizeName(str){
  return str.replace(/<[^>]*>/g, '').trim();
}

export function addHS(entry){
  const list = load();
  const cleanEntry = { ...entry, name: sanitizeName(entry.name) };
  list.push(cleanEntry);
  list.sort((a,b) => b.score - a.score);
  const top10 = list.slice(0,10);
  save(top10);
  return top10;
}

export function renderHS(){
  const tbody = document.querySelector('#snakeHsTable tbody');
  if(!tbody) return;
  const list = load();
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
