// Core game loop and rendering logic for the Tetris implementation
import {
  COLS,
  ROWS,
  SIZE,
  FALL_BASE_MS,
  LINES_PER_LEVEL,
  SCORE_LINE,
  MODE_CLASSIC,
  MODE_ULTRA,
  MODE_CLASSIC_ONCE,
  ULTRA_SECONDS,
  PLAYER_KEY
} from './constants.js';
import { newPiece, refillBag } from './pieces.js';
import { createSfx } from './audio.js';
import { collides, clearLines as clearBoardLines, rotate, getDropY } from './logic.js';
import { addHS, renderHS, sanitizeName, bestKey } from './highscores.js';
import { loadSettings, saveSettings, applyPalette } from './settings.js';
import { toggleMenuOverlay } from './menu.js';

// ==== Scoring helper (exported for tests)
export function updateScore(state, linesCleared, combo, backToBack) {
  let { score, lines, level } = state;
  if (linesCleared > 0) {
    score += SCORE_LINE[linesCleared];
    combo = (combo < 0 ? 0 : combo + 1);
    score += Math.max(0, combo) * 50;
    if (linesCleared === 4) {
      if (backToBack) score += 200;
      backToBack = true;
    } else {
      backToBack = false;
    }
    lines += linesCleared;
    level = Math.floor(lines / LINES_PER_LEVEL) + 1;
  } else {
    combo = -1;
  }
  return { score, lines, level, combo, backToBack };
}

export function initGame(){
  // ==== Settings
  let settings = loadSettings();
  let COLORS = applyPalette(settings);

  // ==== Audio (WebAudio beeps)
  const sfx = createSfx(settings);

  // ==== Overlay helpers
  const overlay = () => document.getElementById('overlay');
  function showOverlay({score, lines}){
    document.getElementById('ovScore').textContent = score;
    document.getElementById('ovLines').textContent = lines;
    overlay().classList.add('show');
  }
  function hideOverlay(){ overlay().classList.remove('show'); }

  // ==== State
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const nextCtx = [1,2,3].map(n => {
    const c = document.getElementById(`next${n}`);
    return c ? c.getContext('2d') : null;
  });

  let board, cur, bag=[], queue=[];
  let score=0, lines=0, level=1, best=0;
  let combo=-1, backToBack=false;
  let mode = MODE_CLASSIC;
  let timeLeft = null; // in Sekunden für Ultra
  let dropTimer=0, dropInterval=FALL_BASE_MS, lastTime=0, paused=false, running=false;

  function setPaused(val){
    paused = val;
    const el = document.getElementById('pauseOverlay');
    if(el){
      el.classList.toggle('show', paused);
      el.setAttribute('aria-hidden', String(!paused));
    }
  }

  function emptyBoard(){
    return Array.from({length:ROWS}, ()=>Array(COLS).fill(0));
  }

  function pullNext(){
    if(bag.length<3) refillBag(bag);
    const t = bag.shift();
    return newPiece(t);
  }

  function reset(){
    hideOverlay();
    board = emptyBoard();
    score=0; lines=0; level=1; dropInterval = FALL_BASE_MS; dropTimer=0; lastTime = performance.now();
    bag=[]; queue = [pullNext(), pullNext(), pullNext()];
    cur = queue.shift();
    queue.push(pullNext());
    running=true; setPaused(false);
    // Mode & Timer
    const sel = document.getElementById('modeSelect');
    mode = sel ? sel.value : MODE_CLASSIC;
    timeLeft = (mode===MODE_ULTRA) ? ULTRA_SECONDS : null;
    best = Number(localStorage.getItem(bestKey(mode))||0);
    const tEl = document.getElementById('timer');
    if(tEl){
      tEl.style.visibility = timeLeft === null ? 'hidden' : 'visible';
      if(timeLeft===null) tEl.textContent='';
      else {
        const s = Math.floor(timeLeft%60).toString().padStart(2,'0');
        tEl.textContent = `⏱️ ${Math.floor(timeLeft/60)}:${s}`;
      }
    }
    updateSide();
    drawBoard();
    renderHS(mode);
  }

  // ==== Rendering
  function drawCell(gx, gy, color, targetCtx=ctx, cellSize=SIZE, alpha=1){
    if(color===0 || alpha<=0) return;
    const x = gx*cellSize, y = gy*cellSize;
    const grad = targetCtx.createLinearGradient(x, y, x, y+cellSize);
    grad.addColorStop(0, shadeColor(color, 0.3));
    grad.addColorStop(1, shadeColor(color, -0.3));
    targetCtx.save();
    targetCtx.globalAlpha = alpha;
    targetCtx.fillStyle = grad;
    targetCtx.fillRect(x, y, cellSize, cellSize);
    // simple bevel
    targetCtx.fillStyle = 'rgba(255,255,255,0.12)';
    targetCtx.fillRect(x, y, cellSize, 4);
    targetCtx.fillStyle = 'rgba(0,0,0,0.25)';
    targetCtx.fillRect(x, y+cellSize-4, cellSize, 4);
    targetCtx.strokeStyle = shadeColor(color, -0.4);
    targetCtx.lineWidth = 1;
    targetCtx.strokeRect(x+0.5, y+0.5, cellSize-1, cellSize-1);
    targetCtx.restore();
  }

  function clearCanvas(c){ c.clearRect(0,0,c.canvas.width,c.canvas.height); }

  function shadeColor(hex, percent){
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    const t = percent < 0 ? 0 : 255;
    const p = Math.abs(percent);
    const R = Math.round((t - r) * p) + r;
    const G = Math.round((t - g) * p) + g;
    const B = Math.round((t - b) * p) + b;
    return `rgb(${R},${G},${B})`;
  }

  function drawBoard(){
    clearCanvas(ctx);
    // ghost piece (optional)
    if(settings.ghost){
      const ghostY = getDropY(board, cur);
      drawPiece(cur, ghostY, true);
    }
    // board
    for(let y=0;y<ROWS;y++){
      for(let x=0;x<COLS;x++){
        const v = board[y][x];
        if(v) drawCell(x,y,COLORS[v]);
      }
    }
    // current
    drawPiece(cur);
  }

  function drawPiece(p, overrideY=null, ghost=false){
    const m = p.shape[p.rot];
    const alpha = ghost
      ? (document.body.classList.contains('theme-light') ? 0.2 : 0.12)
      : 1;
    for(let y=0; y<m.length; y++){
      for(let x=0; x<m[y].length; x++){
        if(m[y][x]){
          const cx = p.x + x;
          const cy = (overrideY ?? p.y) + y;
          if(cy < 0) continue; // skip above board
          drawCell(cx, cy, COLORS[p.type], ctx, SIZE, alpha);
        }
      }
    }
  }

  function drawMini(ctx2, piece){
    clearCanvas(ctx2);
    if(!piece) return;
    const m = piece.shape[0];
    const size = Math.floor(Math.min(ctx2.canvas.width, ctx2.canvas.height) / 4);
    const offX = Math.floor((ctx2.canvas.width/size - m[0].length)/2);
    const offY = Math.floor((ctx2.canvas.height/size - m.length)/2);
    for(let y=0;y<m.length;y++){
      for(let x=0;x<m[y].length;x++){
        if(m[y][x]) drawCell(offX+x, offY+y, COLORS[piece.type], ctx2, size);
      }
    }
  }

  function updateSide(){
    const scoreTop = document.getElementById('topScore');
    if(scoreTop) scoreTop.textContent = `Score: ${score}`;
    const bestTop = document.getElementById('topBest');
    if(bestTop) bestTop.textContent = `Best: ${best}`;

    const comboEl = document.getElementById('comboTag');
    if(comboEl){
      let t = '';
      if(combo>=1) t += `Combo x${combo+1}`;
      if(backToBack) t += (t?' • ':'')+`Back‑to‑Back`;
      comboEl.textContent = t;
    }

    nextCtx.forEach((c,i)=> c && drawMini(c, queue[i]));
  }

  // ==== Logik
  function isOutOfTop(p){
    const m = p.shape[p.rot];
    for(let y=0;y<m.length;y++){
      for(let x=0;x<m[y].length;x++){
        if(m[y][x] && (p.y + y) < 0) return true;
      }
    }
    return false;
  }

  function merge(){
    const m = cur.shape[cur.rot];
    for(let y=0;y<m.length;y++){
      for(let x=0;x<m[y].length;x++){
        if(!m[y][x]) continue;
        const by = cur.y+y;
        if(by<0) continue;
        board[by][cur.x+x] = cur.type;
      }
    }
  }

  function hardDrop(){
    if(paused) return;
    const targetY = getDropY(board, cur);
    const dropped = targetY - cur.y;
    cur.y = targetY;
    if(settings.softDropPoints) score += dropped*2;
    sfx.hard();
    lockPiece();
  }

  function softDrop(){
    if(paused) return;
    const p = {...cur, y:cur.y+1};
    if(!collides(board, p)) { cur.y++; if(settings.softDropPoints) score += 1; }
    else lockPiece();
  }

  function lockPiece(){
    if(isOutOfTop(cur)) { gameOver(); return; }
    sfx.lock();
    merge();
    const cleared = clearBoardLines(board);
    const prevLevel = level;
    ({ score, lines, level, combo, backToBack } = updateScore({ score, lines, level }, cleared, combo, backToBack));
    if(cleared>0){
      if(level>prevLevel){
        dropInterval = Math.max(80, FALL_BASE_MS * Math.pow(0.85, level-1));
        sfx.level();
      }
      sfx.clear();
    }
    cur = queue.shift();
    queue.push(pullNext());
    if(collides(board, cur)) { gameOver(); return; }
    updateSide();
  }

  function gameOver(){
    running=false;
    setPaused(false);
    best = Math.max(best, score);
    localStorage.setItem(bestKey(mode), best);
    const name = sanitizeName((localStorage.getItem(PLAYER_KEY) || 'Player').trim());
    addHS({ name, score, lines, date: new Date().toISOString().slice(0,10) }, mode);
    renderHS(mode);
    updateSide();
    showOverlay({score, lines});
    sfx.gameover();
  }

  // ==== Loop
  function update(time=performance.now()){
    if(!running) return;
    const delta = time - lastTime; lastTime = time;
    if(!paused){
      // Timer-Logik für Ultra Mode
      const tEl = document.getElementById('timer');
      if(timeLeft!==null){
        timeLeft = Math.max(0, timeLeft - delta/1000);
        if(tEl){ const s=Math.floor(timeLeft%60).toString().padStart(2,'0'); tEl.textContent=`⏱️ ${Math.floor(timeLeft/60)}:${s}`; }
        if(timeLeft===0){ gameOver(); }
      } else if(tEl){
        tEl.textContent='';
      }
      dropTimer += delta;
      if(dropTimer > dropInterval){
        softDrop();
        dropTimer = 0;
      }
      drawBoard();
    }
    requestAnimationFrame(update);
  }

  // ==== Input
  window.addEventListener('keydown', (e)=>{
    // Overlay hat Vorrang: Enter = Neustart, Escape = Schließen
    const ov = document.getElementById('overlay');
    if(ov && ov.classList.contains('show')){
      if(['Enter','NumpadEnter'].includes(e.code)) { e.preventDefault(); reset(); update(); return; }
      if(e.code==='Escape') { e.preventDefault(); hideOverlay(); return; }
      e.preventDefault(); return;
    }

    const mOverlay = document.getElementById('menuOverlay');
    if(mOverlay && mOverlay.classList.contains('show')){
      if(e.code==='Escape'){ e.preventDefault(); toggleMenuOverlay(); }
      return;
    }

    if(!running) return;
    if(e.code==='KeyP'){ setPaused(!paused); return; }
    if(paused) return;
    if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Space','KeyW'].includes(e.code)) e.preventDefault();
    switch(e.code){
      case 'ArrowLeft':{
        const p = {...cur, x:cur.x-1};
        if(!collides(board, p)) { cur.x--; sfx.move(); }
        break;
      }
      case 'ArrowRight':{
        const p = {...cur, x:cur.x+1};
        if(!collides(board, p)) { cur.x++; sfx.move(); }
        break;
      }
      case 'ArrowDown': softDrop(); break;
      case 'ArrowUp':
      case 'KeyW': {
        if(mode !== MODE_CLASSIC_ONCE || !cur.rotated){
          const r = rotate(board, cur);
          if(r !== cur && mode === MODE_CLASSIC_ONCE) r.rotated = true;
          cur = r;
          sfx.rotate();
        }
        break;
      }
      case 'Space': hardDrop(); break;
    }
  }, {passive:false});

  // ==== UI Buttons
  let menuPrevPaused = false;
  document.addEventListener('menuToggle', e => {
    const show = e.detail.show;
    if(show){
      menuPrevPaused = paused;
      setPaused(true);
    } else {
      setPaused(menuPrevPaused);
    }
  });
  const btnStart = document.getElementById('btnStart');
  if(btnStart){ btnStart.addEventListener('click', e=>{ e.preventDefault(); reset(); update(); }); }
  const modeSelect = document.getElementById('modeSelect');
  if(modeSelect){ modeSelect.addEventListener('change', ()=>{ reset(); update(); }); }
  document.getElementById('btnPause').addEventListener('click', ()=>{ if(running){ setPaused(!paused); }});
  const btnResetHS = document.getElementById('btnResetHS');
  if(btnResetHS){
    btnResetHS.addEventListener('click', ()=>{
      saveHS([], mode);
      best = 0;
      localStorage.removeItem(bestKey(mode));
      updateSide();
      renderHS(mode);
    });
  }
  // Overlay Buttons
  const btnRestart = document.getElementById('btnRestart');
  if(btnRestart){ btnRestart.addEventListener('click', ()=>{ reset(); update(); }); }
  const btnClose = document.getElementById('btnClose');
  if(btnClose){ btnClose.addEventListener('click', ()=> hideOverlay()); }

  // Touch actions for swipe gestures
  const touchMap = {
    mLeft:()=>{ if(paused) return; const p={...cur,x:cur.x-1}; if(!collides(board, p)) {cur.x--; sfx.move();}},
    mRight:()=>{ if(paused) return; const p={...cur,x:cur.x+1}; if(!collides(board, p)) {cur.x++; sfx.move();}},
    mRotate:()=>{
      if(paused) return;
      if(mode !== MODE_CLASSIC_ONCE || !cur.rotated){
        const r = rotate(board, cur);
        if(r !== cur && mode === MODE_CLASSIC_ONCE) r.rotated = true;
        cur = r;
        sfx.rotate();
      }
    },
    mHard:()=>{ if(paused) return; hardDrop(); }
  };

  // Swipe Gestures auf dem Board
  (function(){
    const el=document.querySelector('.board-wrap'); if(!el) return;
    let sx=0, sy=0, st=0, lx=0, moved=false;
    el.addEventListener('touchstart', (e)=>{ if(paused) return; const t=e.changedTouches[0]; sx=lx=t.clientX; sy=t.clientY; st=performance.now(); moved=false;});
    el.addEventListener('touchmove', (e)=>{
      if(paused) return;
      const t=e.changedTouches[0]; const dx=t.clientX-lx; const absX=Math.abs(dx); const MOVE_THRESH=12;
      if(absX>MOVE_THRESH){
        e.preventDefault();
        if(dx>0) touchMap.mRight(); else touchMap.mLeft();
        lx=t.clientX; moved=true;
      }
    }, {passive:false});
    el.addEventListener('touchend', (e)=>{
      if(paused) return;
      const t=e.changedTouches[0]; const dx=t.clientX-sx; const dy=t.clientY-sy; const dt=performance.now()-st;
      const absX=Math.abs(dx), absY=Math.abs(dy);
      const THRESH=16; // Pixel
      if(dt<600){
        if(!moved && absX>absY && absX>THRESH){ if(dx>0) touchMap.mRight(); else touchMap.mLeft(); return; }
        if(absY>absX && absY>THRESH){ if(dy>0) touchMap.mHard(); else touchMap.mRotate(); return; }
        if(!moved && absX<10 && absY<10) touchMap.mRotate();
      }
    }, {passive:true});
  })();

  // Settings bindings
  const chkSound = document.getElementById('optSound');
  const chkGhost = document.getElementById('optGhost');
  const chkSoft = document.getElementById('optSoftDropPoints');
  const selPalette = document.getElementById('optPalette');
  if(chkSound){ chkSound.checked = !!settings.sound; chkSound.addEventListener('change', ()=>{ settings.sound = chkSound.checked; saveSettings(settings); }); }
  if(chkGhost){ chkGhost.checked = !!settings.ghost; chkGhost.addEventListener('change', ()=>{ settings.ghost = chkGhost.checked; saveSettings(settings); drawBoard(); }); }
  if(chkSoft){ chkSoft.checked = !!settings.softDropPoints; chkSoft.addEventListener('change', ()=>{ settings.softDropPoints = chkSoft.checked; saveSettings(settings); }); }
  if(selPalette){
    selPalette.value = settings.palette || 'standard';
    selPalette.addEventListener('change', ()=>{
      settings.palette = selPalette.value;
      COLORS = applyPalette(settings);
      saveSettings(settings);
      drawBoard();
      updateSide();
    });
  }

  // Initiale Anzeige
  renderHS(mode);
  updateSide();

  return {
    pause: () => { if(running) setPaused(true); },
    resume: () => { if(running) setPaused(false); }
  };
}
