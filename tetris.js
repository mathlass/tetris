const THEME_KEY = 'tetris_theme';
if (localStorage.getItem(THEME_KEY) === 'light') {
  document.body.classList.add('theme-light');
}
const btnTheme = document.getElementById('themeToggle');
if (btnTheme) {
  btnTheme.addEventListener('click', () => {
    document.body.classList.toggle('theme-light');
    localStorage.setItem(
      THEME_KEY,
      document.body.classList.contains('theme-light') ? 'light' : 'dark'
    );
  });
}

const PLAYER_KEY = 'tetris_player';
let playerName = localStorage.getItem(PLAYER_KEY) || 'Player';
const btnPlayer = document.getElementById('btnPlayer');
if (btnPlayer) {
  btnPlayer.addEventListener('click', () => {
    const name = prompt('Spielername:', playerName);
    if (name !== null) {
      playerName = name.trim() || 'Player';
      localStorage.setItem(PLAYER_KEY, playerName);
    }
  });
}
document.addEventListener('contextmenu', e => e.preventDefault());
(() => {
  // ==== Konfiguration
  const COLS=10, ROWS=20, SIZE=30;
  const FALL_BASE_MS = 800; // Basisintervall (Level 1)
  const LINES_PER_LEVEL = 10;
  const SCORE_LINE = [0,100,300,500,800];
  const SETTINGS_KEY = 'tetris_settings_v1';
  const MODE_CLASSIC = 'classic';
  const MODE_ULTRA = 'ultra';
  const ULTRA_SECONDS = 120;

  const COLOR_SETS = {
    standard: {
      0: '#000000', // leer (wird nicht gemalt)
      I: '#4fd1ff', J: '#4c6ef5', L: '#f59f00', O: '#fcc419',
      S: '#51cf66', T: '#be4bdb', Z: '#ff6b6b'
    },
    accessible: {
      0: '#000000',
      I: '#0072b2', J: '#56b4e9', L: '#e69f00', O: '#f0e442',
      S: '#009e73', T: '#cc79a7', Z: '#d55e00'
    }
  };
  let COLORS = COLOR_SETS.standard;

  // Tetromino-Matrizen (4×4 Frames) – im Uhrzeigersinn rotierend
  const SHAPES = {
    I: [
      [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
      [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
      [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
      [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]
    ],
    J: [
      [[1,0,0],[1,1,1],[0,0,0]],
      [[0,1,1],[0,1,0],[0,1,0]],
      [[0,0,0],[1,1,1],[0,0,1]],
      [[0,1,0],[0,1,0],[1,1,0]]
    ],
    L: [
      [[0,0,1],[1,1,1],[0,0,0]],
      [[0,1,0],[0,1,0],[0,1,1]],
      [[0,0,0],[1,1,1],[1,0,0]],
      [[1,1,0],[0,1,0],[0,1,0]]
    ],
    O: [
      [[1,1],[1,1]],
      [[1,1],[1,1]],
      [[1,1],[1,1]],
      [[1,1],[1,1]]
    ],
    S: [
      [[0,1,1],[1,1,0],[0,0,0]],
      [[0,1,0],[0,1,1],[0,0,1]],
      [[0,0,0],[0,1,1],[1,1,0]],
      [[1,0,0],[1,1,0],[0,1,0]]
    ],
    T: [
      [[0,1,0],[1,1,1],[0,0,0]],
      [[0,1,0],[0,1,1],[0,1,0]],
      [[0,0,0],[1,1,1],[0,1,0]],
      [[0,1,0],[1,1,0],[0,1,0]]
    ],
    Z: [
      [[1,1,0],[0,1,1],[0,0,0]],
      [[0,0,1],[0,1,1],[0,1,0]],
      [[0,0,0],[1,1,0],[0,1,1]],
      [[0,1,0],[1,1,0],[1,0,0]]
    ]
  };

  // ==== Highscores (LocalStorage)
  const HS_KEY_BASE = 'tetris_highscores_v1';
  const BEST_KEY_BASE = 'tetris_best';
  const hsKey = m => `${HS_KEY_BASE}_${m}`;
  const bestKey = m => `${BEST_KEY_BASE}_${m}`;
  function loadHS(m){ try{ return JSON.parse(localStorage.getItem(hsKey(m))) || []; }catch(e){ return []; } }
  function saveHS(list,m){ localStorage.setItem(hsKey(m), JSON.stringify(list)); }
  function addHS(entry,m){
    const list = loadHS(m);
    list.push(entry);
    list.sort((a,b)=>b.score - a.score || b.lines - a.lines);
    const top10 = list.slice(0,10);
    saveHS(top10,m);
    return top10;
  }
  function renderHS(m=mode){
    const tbody = document.querySelector('#hsTable tbody');
    if(!tbody) return;
    const list = loadHS(m);
    tbody.innerHTML = list.map((e,i)=>
      `<tr><td>${i+1}</td><td>${e.name}</td><td>${e.score}</td><td>${e.lines}</td><td>${e.date}</td></tr>`
    ).join('');
    const label=document.getElementById('hsModeLabel');
    if(label) label.textContent = (m===MODE_ULTRA? 'Ultra' : 'Classic');
  }

  // ==== Settings (persist)
  const defaultSettings = { sound:true, ghost:true, softDropPoints:true, palette:'standard' };
  function loadSettings(){
    try{ return Object.assign({}, defaultSettings, JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')); }catch{ return {...defaultSettings}; }
  }
  function saveSettings(s){ localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }
  let settings = loadSettings();
  COLORS = COLOR_SETS[settings.palette] || COLOR_SETS.standard;

  // ==== Audio (WebAudio beeps)
  let actx = null;
  function ensureAudio(){ if(!settings.sound) return null; if(!actx){ try{ actx = new (window.AudioContext||window.webkitAudioContext)(); }catch{} } return actx; }
  function beep(freq=440, dur=0.06, type='sine', gain=0.05){
    const ac = ensureAudio(); if(!ac) return;
    const o = ac.createOscillator(); const g = ac.createGain();
    o.type = type; o.frequency.value=freq; g.gain.value=gain;
    o.connect(g); g.connect(ac.destination);
    const t = ac.currentTime; o.start(t); o.stop(t+dur);
  }
  const sfx = {
    move: ()=>beep(300,0.03,'square',0.025),
    rotate: ()=>beep(520,0.04,'sine',0.035),
    lock: ()=>beep(220,0.06,'triangle',0.05),
    clear: ()=>{ beep(700,0.05,'sine',0.05); setTimeout(()=>beep(920,0.05,'sine',0.05),40); },
    level: ()=>{ beep(500,0.08,'triangle',0.06); setTimeout(()=>beep(750,0.08,'triangle',0.06),70); },
    hard: ()=>beep(180,0.05,'square',0.06),
    gameover: ()=>{ beep(200,0.08,'sawtooth',0.07); setTimeout(()=>beep(150,0.12,'sawtooth',0.06),90); }
  };

  // ==== Overlay helpers
  const overlay = () => document.getElementById('overlay');
  function showOverlay(vals){
    document.getElementById('ovScore').textContent = vals.score;
    document.getElementById('ovLines').textContent = vals.lines;
    document.getElementById('ovLevel').textContent = vals.level;
    document.getElementById('ovBest').textContent = vals.best;
    overlay().classList.add('show');
  }
  function hideOverlay(){ overlay().classList.remove('show'); }

  // ==== State
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

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

  function newPiece(type){
    const shape = SHAPES[type];
    return {type, rot:0, x: Math.floor(COLS/2)-2, y: -2, shape};
  }

  function refillBag(){
    const types=['I','J','L','O','S','T','Z'];
    const shuffled = [...types].sort(()=>Math.random()-0.5);
    bag.push(...shuffled);
  }

  function pullNext(){
    if(bag.length<3) refillBag();
    const t = bag.shift();
    return newPiece(t);
  }

  function reset(){
    hideOverlay();
    board = emptyBoard();
    score=0; lines=0; level=1; dropInterval = FALL_BASE_MS; dropTimer=0; lastTime = performance.now();
    bag=[]; queue = [pullNext(), pullNext(), pullNext()];
    cur = pullNext();
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
  function drawCell(gx, gy, color, targetCtx=ctx, cellSize=SIZE){
    if(color===0) return;
    const x = gx*cellSize, y = gy*cellSize;
    const grad = targetCtx.createLinearGradient(x, y, x, y+cellSize);
    grad.addColorStop(0, shadeColor(color, 0.3));
    grad.addColorStop(1, shadeColor(color, -0.3));
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
  }

  function clearCanvas(c){ c.clearRect(0,0,c.canvas.width,c.canvas.height); }

  function hexToRgba(hex, alpha){
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

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
      const ghostY = getDropY();
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
    const ghostColor = hexToRgba(
      COLORS[p.type],
      document.body.classList.contains('theme-light') ? 0.2 : 0.12
    );
    for(let y=0;y<m.length;y++){
      for(let x=0;x<m[y].length;x++){
        if(m[y][x]){
          const cx = p.x + x;
          const cy = (overrideY??p.y) + y;
          if(cy<0) continue; // skip above board
          const color = ghost ? ghostColor : COLORS[p.type];
          drawCell(cx, cy, color);
        }
      }
    }
  }

  function drawMini(ctx2, piece){
    clearCanvas(ctx2);
    if(!piece) return;
    const m = piece.shape[0];
    const size = 24;
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
  }

  // ==== Logik
  function collides(p){
    const m = p.shape[p.rot];
    for(let y=0;y<m.length;y++){
      for(let x=0;x<m[y].length;x++){
        if(!m[y][x]) continue;
        const nx = p.x + x;
        const ny = p.y + y;
        if(nx<0 || nx>=COLS || ny>=ROWS) return true;
        if(ny>=0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function isOutOfTop(p){
    const m = p.shape[p.rot];
    for(let y=0;y<m.length;y++){
      for(let x=0;x<m[y].length;x++){
        if(m[y][x] && (p.y + y) < 0) return true;
      }
    }
    return false;
  }

  function rotate(p){
    const test = {...p, rot:(p.rot+1)%p.shape.length};
    if(!collides(test)) return test;
    for(const dx of [-1,1,-2,2]){
      const kicked = {...test, x:test.x+dx};
      if(!collides(kicked)) return kicked;
    }
    return p;
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

  function clearLines(){
    let cleared=0;
    outer: for(let y=ROWS-1;y>=0;y--){
      for(let x=0;x<COLS;x++){
        if(!board[y][x]) continue outer;
      }
      board.splice(y,1);
      board.unshift(Array(COLS).fill(0));
      cleared++;
      y++;
    }
    if(cleared>0){
      score += SCORE_LINE[cleared];
      combo = (combo<0?0:combo+1);
      score += Math.max(0, combo) * 50;
      if(cleared===4){ if(backToBack) score += 200; backToBack=true; } else backToBack=false;
      lines += cleared;
      const newLevel = Math.floor(lines / LINES_PER_LEVEL) + 1;
      if(newLevel>level){ level = newLevel; dropInterval = Math.max(80, FALL_BASE_MS * Math.pow(0.85, level-1)); sfx.level(); }
      sfx.clear();
    } else {
      combo = -1;
    }
  }

  function getDropY(){
    const p = {...cur};
    while(true){
      p.y++;
      if(collides(p)) { p.y--; return p.y; }
    }
  }

  function hardDrop(){
    const targetY = getDropY();
    const dropped = targetY - cur.y;
    cur.y = targetY;
    if(settings.softDropPoints) score += dropped*2;
    sfx.hard();
    lockPiece();
  }

  function softDrop(){
    const p = {...cur, y:cur.y+1};
    if(!collides(p)) { cur.y++; if(settings.softDropPoints) score += 1; }
    else lockPiece();
  }

  function lockPiece(){
    if(isOutOfTop(cur)) { gameOver(); return; }
    sfx.lock();
    merge();
    clearLines();
    cur = queue.shift();
    queue.push(pullNext());
    if(collides(cur)) { gameOver(); return; }
    updateSide();
  }

  function gameOver(){
    running=false;
    setPaused(false);
    best = Math.max(best, score);
    localStorage.setItem(bestKey(mode), best);
    const name = playerName.trim() || 'Player';
    addHS({ name, score, lines, date: new Date().toISOString().slice(0,10) }, mode);
    renderHS(mode);
    updateSide();
    showOverlay({score, lines, level, best});
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
      if(e.code==='Escape'){ e.preventDefault(); toggleMenu(); }
      return;
    }

    if(!running) return;
    if(e.code==='KeyP'){ setPaused(!paused); return; }
    if(paused) return;
    if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Space','KeyW'].includes(e.code)) e.preventDefault();
    switch(e.code){
      case 'ArrowLeft':{
        const p = {...cur, x:cur.x-1};
        if(!collides(p)) { cur.x--; sfx.move(); }
        break;
      }
      case 'ArrowRight':{
        const p = {...cur, x:cur.x+1};
        if(!collides(p)) { cur.x++; sfx.move(); }
        break;
      }
      case 'ArrowDown': softDrop(); break;
      case 'ArrowUp':
      case 'KeyW': cur = rotate(cur); sfx.rotate(); break;
      case 'Space': hardDrop(); break;
    }
  }, {passive:false});

  // ==== UI Buttons
  const menuOverlay = document.getElementById('menuOverlay');
  let menuPrevPaused = false;
  function toggleMenu(){
    const show = !menuOverlay.classList.contains('show');
    menuOverlay.classList.toggle('show', show);
    menuOverlay.setAttribute('aria-hidden', String(!show));
    if(show){
      menuPrevPaused = paused;
      setPaused(true);
    } else {
      setPaused(menuPrevPaused);
    }
  }
  const btnMenu = document.getElementById('btnMenu');
  if(btnMenu){ btnMenu.addEventListener('click', toggleMenu); }
  const btnMenuClose = document.getElementById('btnMenuClose');
  if(btnMenuClose){ btnMenuClose.addEventListener('click', toggleMenu); }
  const tabScore = document.getElementById('tabScore');
  const tabSettings = document.getElementById('tabSettings');
  const scorePanel = document.getElementById('scorePanel');
  const settingsPanel = document.getElementById('settingsPanel');
  if(tabScore && tabSettings){
    tabScore.addEventListener('click', ()=>{ scorePanel.style.display='block'; settingsPanel.style.display='none'; });
    tabSettings.addEventListener('click', ()=>{ scorePanel.style.display='none'; settingsPanel.style.display='block'; });
  }
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

  // Touch Buttons
  const touchMap = {
    mLeft:()=>{const p={...cur,x:cur.x-1}; if(!collides(p)) {cur.x--; sfx.move();}},
    mRight:()=>{const p={...cur,x:cur.x+1}; if(!collides(p)) {cur.x++; sfx.move();}},
    mRotate:()=>{cur=rotate(cur); sfx.rotate();},
    mSoft:()=>softDrop(),
    mHard:()=>hardDrop(),
    mPause:()=>{ if(running){ setPaused(!paused); } },
    mStart:()=>{ reset(); update(); }
  };
  Object.keys(touchMap).forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    if(id==='mLeft' || id==='mRight') return;
    el.addEventListener('click', touchMap[id]);
  });

  function addHoldRepeat(id, fn){
    const el=document.getElementById(id);
    if(!el) return;
    let t=null, iv=null;
    const clear=()=>{ if(t){clearTimeout(t); t=null;} if(iv){clearInterval(iv); iv=null;} };
    const start=(e)=>{ e.preventDefault(); fn(); t=setTimeout(()=>{ iv=setInterval(fn,80); },150); };
    const end=()=>clear();
    ['touchstart','mousedown'].forEach(evt=>el.addEventListener(evt,start));
    ['touchend','mouseup','mouseleave','touchcancel'].forEach(evt=>el.addEventListener(evt,end));
  }
  addHoldRepeat('mLeft', touchMap.mLeft);
  addHoldRepeat('mRight', touchMap.mRight);

  // Swipe Gestures auf dem Board
  (function(){
    const el=document.querySelector('.board-wrap'); if(!el) return;
    let sx=0, sy=0, st=0, lx=0, moved=false;
    el.addEventListener('touchstart', (e)=>{ const t=e.changedTouches[0]; sx=lx=t.clientX; sy=t.clientY; st=performance.now(); moved=false;});
    el.addEventListener('touchmove', (e)=>{
      const t=e.changedTouches[0]; const dx=t.clientX-lx; const absX=Math.abs(dx); const MOVE_THRESH=12;
      if(absX>MOVE_THRESH){
        e.preventDefault();
        if(dx>0) touchMap.mRight(); else touchMap.mLeft();
        lx=t.clientX; moved=true;
      }
    }, {passive:false});
    el.addEventListener('touchend', (e)=>{
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
      COLORS = COLOR_SETS[settings.palette] || COLOR_SETS.standard;
      saveSettings(settings);
      drawBoard();
      updateSide();
    });
  }

  // Initiale Anzeige
  renderHS(mode);
  updateSide();
})();

// Register external Service Worker (works on Netlify & GitHub Pages)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { scope: './' }).catch(()=>{});
  });
}
