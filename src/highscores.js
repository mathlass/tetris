// Highscore storage and rendering
import {
  HS_KEY_BASE,
  BEST_KEY_BASE,
  MODE_ULTRA,
  MODE_CLASSIC_ONCE,
  HS_NAME_MAX_LENGTH
} from './constants.js';
import { logError } from './logger.js';

export const hsKey = m => `${HS_KEY_BASE}_${m}`;
export const bestKey = m => `${BEST_KEY_BASE}_${m}`;

async function loadServerHS(m) {
  try {
    const res = await fetch(`/scores/${m}`);
    if (res.ok) return await res.json();
  } catch (e) {
    logError('Failed to load highscores from server', e);
  }
  return null;
}

async function sendServerHS(entry, m) {
  try {
    const res = await fetch(`/scores/${m}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    if (!res.ok) {
      logError(`Failed to send highscore to server: ${res.status} ${res.statusText}`);
    }
  } catch (e) {
    logError('Failed to send highscore to server', e);
  }
}

export function loadHS(m) {
  try {
    return JSON.parse(localStorage.getItem(hsKey(m))) || [];
  } catch (e) {
    logError('Failed to parse highscores from storage', e);
    return [];
  }
}

export function saveHS(list, m) {
  try {
    localStorage.setItem(hsKey(m), JSON.stringify(list));
  } catch (e) {
    logError('Failed to save highscores', e);
  }
}

export function sanitizeName(str){
  return str.replace(/<[^>]*>/g, '').trim().slice(0, HS_NAME_MAX_LENGTH);
}

export function sanitizeHS(list,m){
  let changed=false;
  const cleaned=list.map(e=>{
    const name=sanitizeName(e.name||'');
    if(name!==e.name) changed=true;
    return {...e, name};
  });
  if(changed) saveHS(cleaned,m);
  return cleaned;
}

export async function addHS(entry,m){
  const list = sanitizeHS(loadHS(m),m);
  const cleanEntry = {...entry, name: sanitizeName(entry.name)};
  list.push(cleanEntry);
  list.sort((a,b)=>b.score - a.score || b.lines - a.lines);
  const top10 = list.slice(0,10);
  saveHS(top10,m);
  await sendServerHS(cleanEntry,m);
  return top10;
}

export async function renderHS(m){
  const tbody = document.querySelector('#hsTable tbody');
  if(!tbody) return;
  let list = await loadServerHS(m);
  list = list ? sanitizeHS(list,m) : sanitizeHS(loadHS(m),m);
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
  const label=document.getElementById('hsModeLabel');
  if(label){
    label.textContent =
      m===MODE_ULTRA ? 'Ultra' :
      m===MODE_CLASSIC_ONCE ? 'Classic – 1 Drehung' :
      'Classic';
  }
}
