// Highscore storage and rendering for Snake
import { HS_NAME_MAX_LENGTH } from './constants.js';
import { logError } from './logger.js';
const HS_KEY = 'snake_hs';

const SUPABASE_URL =
  globalThis.NEXT_PUBLIC_SUPABASE_URL ||
  (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined);
const SUPABASE_KEY =
  globalThis.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined);
const useSupabase = SUPABASE_URL && SUPABASE_KEY;

async function loadServerHS(){
  if(useSupabase){
    try{
      const url = `${SUPABASE_URL}/rest/v1/scores?select=player,score,created_at&mode=eq.snake&order=score.desc&limit=10`;
      const res = await fetch(url,{
        headers:{ apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      });
      if(res.ok){
        const data = await res.json();
        return data.map(r=>({ name: r.player, score: r.score, date: (r.created_at||'').slice(0,10) }));
      }
    }catch(e){
      logError('Failed to load snake highscores from server', e);
    }
    return null;
  }
  try{
    const res = await fetch('/scores/snake');
    if(res.ok) return await res.json();
  }catch(e){
    logError('Failed to load snake highscores from server', e);
  }
  return null;
}

async function sendServerHS(entry){
  if(useSupabase){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/scores`,{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          apikey: SUPABASE_KEY,
          Authorization:`Bearer ${SUPABASE_KEY}`
        },
        body:JSON.stringify({ player: entry.name, mode:'snake', score: entry.score })
      });
      if(!res.ok){
        logError(`Failed to send snake highscore to server: ${res.status} ${res.statusText}`);
      }
    }catch(e){
      logError('Failed to send snake highscore to server', e);
    }
    return;
  }
  try{
    const res = await fetch('/scores/snake',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ ...entry, lines: entry.lines ?? 0 })
    });
    if(!res.ok){
      logError(`Failed to send snake highscore to server: ${res.status} ${res.statusText}`);
    }
  }catch(e){
    logError('Failed to send snake highscore to server', e);
  }
}

function load(){
  try{
    return JSON.parse(localStorage.getItem(HS_KEY)) || [];
  }catch{
    return [];
  }
}

function save(list){
  try{
    localStorage.setItem(HS_KEY, JSON.stringify(list));
  }catch{}
}

export function clearHS(){
  try{
    localStorage.removeItem(HS_KEY);
  }catch{}
}

function sanitizeName(str){
  return str.replace(/<[^>]*>/g, '').trim().slice(0, HS_NAME_MAX_LENGTH);
}

function sanitizeList(list){
  let changed=false;
  const cleaned=list.map(e=>{
    const name=sanitizeName(e.name||'');
    if(name!==e.name) changed=true;
    return {...e,name};
  });
  if(changed) save(cleaned);
  return cleaned;
}

export function addHS(entry){
  const list = load();
  const cleanEntry = { ...entry, name: sanitizeName(entry.name) };
  list.push(cleanEntry);
  list.sort((a,b) => b.score - a.score);
  const top10 = list.slice(0,10);
  save(top10);
  sendServerHS(cleanEntry);
  return top10;
}

export async function renderHS(){
  const tbody = document.querySelector('#snakeHsTable tbody');
  if(!tbody) return;
  let list = await loadServerHS();
  list = list ? sanitizeList(list) : sanitizeList(load());
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
