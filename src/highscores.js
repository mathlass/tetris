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

const SUPABASE_URL =
  globalThis.NEXT_PUBLIC_SUPABASE_URL ||
  (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined);
const SUPABASE_KEY =
  globalThis.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined);
const useSupabase = SUPABASE_URL && SUPABASE_KEY;

async function loadServerHS(m) {
  if (useSupabase) {
    try {
      const url = `${SUPABASE_URL}/rest/v1/scores?select=player,score,lines,created_at&mode=eq.${m}&order=score.desc,lines.desc&limit=10`;
      const res = await fetch(url, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        return data.map(r => ({
          name: r.player,
          score: r.score,
          lines: r.lines ?? 0,
          date: (r.created_at || '').slice(0, 10)
        }));
      }
    } catch (e) {
      logError('Failed to load highscores from server', e);
    }
    return null;
  }
  try {
    const res = await fetch(`/scores/${m}`);
    if (res.ok) return await res.json();
  } catch (e) {
    logError('Failed to load highscores from server', e);
  }
  return null;
}

async function sendServerHS(entry, m) {
  if (useSupabase) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({
          player: entry.name,
          score: entry.score,
          lines: entry.lines ?? 0,
          mode: m
        })
      });
      if (!res.ok) {
        logError(`Failed to send highscore to server: ${res.status} ${res.statusText}`);
      }
    } catch (e) {
      logError('Failed to send highscore to server', e);
    }
    return;
  }
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
