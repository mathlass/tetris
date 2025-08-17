import { HS_KEY_BASE, BEST_KEY_BASE, MODE_ULTRA, MODE_CLASSIC_ONCE } from './constants.js';

export const hsKey = m => `${HS_KEY_BASE}_${m}`;
export const bestKey = m => `${BEST_KEY_BASE}_${m}`;

export function loadHS(m){
  try{ return JSON.parse(localStorage.getItem(hsKey(m))) || []; }catch(e){ return []; }
}

export function saveHS(list,m){
  localStorage.setItem(hsKey(m), JSON.stringify(list));
}

export function sanitizeName(str){
  return str.replace(/<[^>]*>/g, '').trim();
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

export function addHS(entry,m){
  const list = sanitizeHS(loadHS(m),m);
  list.push({...entry, name: sanitizeName(entry.name)});
  list.sort((a,b)=>b.score - a.score || b.lines - a.lines);
  const top10 = list.slice(0,10);
  saveHS(top10,m);
  return top10;
}

export function renderHS(m){
  const tbody = document.querySelector('#hsTable tbody');
  if(!tbody) return;
  const list = sanitizeHS(loadHS(m),m);
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
