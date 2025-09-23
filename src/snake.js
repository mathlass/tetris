// Simple Snake game implementation
import { PLAYER_KEY, SNAKE_BEST_KEY_BASE } from './constants.js';
import { addHS, renderHS, clearHS } from './snakeHighscores.js';
import { toggleMenuOverlay } from './menu.js';
import { createOverlayController } from './overlay.js';

export function initSnake(){
  const canvas = document.getElementById('snakeCanvas');
  const btnStart = document.getElementById('snakeStart');
  const btnPause = document.getElementById('snakePause');
  const topScoreEl = document.getElementById('snakeTopScore');
  const topBestEl = document.getElementById('snakeTopBest');
  const overlay = createOverlayController({
    root: '#snakeOverlay',
    bindings: {
      score: '#snakeOvScore',
      best: '#snakeOvBest'
    }
  });
  const btnRestart = document.getElementById('snakeBtnRestart');
  const btnClose = document.getElementById('snakeBtnClose');
  const btnResetHS = document.getElementById('snakeBtnResetHS');
  const modeSelect = document.getElementById('snakeModeSelect');
  if(!canvas || !btnStart){
    return {
      start: () => {},
      stop: () => {},
      pause: () => {},
      resume: () => {},
      hideOverlay: () => {},
      showOverlay: () => {}
    };
  }
  const ctx = canvas.getContext('2d');
  const baseSize = 15;
  const cells = Math.floor(canvas.width / baseSize);
  const boardRadius = 12;
  const boardPadding = Math.max(6, boardRadius - 4);
  const size = (canvas.width - boardPadding * 2) / cells;
  const cellPaddingFactor = 0.08;
  let snake = [];
  let dir = {x:1, y:0};
  let dirQueue = [];
  let food = {x:0, y:0};
  // Pieces currently traveling through the snake after being eaten
  let digesting = [];
  let obstacles = [];
  let headPulse = 0;
  let timer = null;
  let score = 0;
  const bestKey = modeName => `${SNAKE_BEST_KEY_BASE}_${modeName}`;
  try{
    const legacyBest = localStorage.getItem('snakeBest');
    if(legacyBest !== null){
      localStorage.setItem(bestKey('classic'), legacyBest);
      localStorage.removeItem('snakeBest');
    }
  }catch{}
  let best = 0;
  let running = false;
  let paused = false;
  let menuPrevPaused = false;
  let mode = 'classic';

  function updateScore(){
    if(topScoreEl) topScoreEl.textContent = `Score: ${score}`;
    if(topBestEl) topBestEl.textContent = `Best: ${best}`;
  }

  function showOverlay(){
    overlay.show({ score, best });
    void renderHS(mode);
  }

  function hideOverlay(){
    overlay.hide();
  }

  function reset(){
    snake = [{x:Math.floor(cells/2), y:Math.floor(cells/2)}];
    dir = {x:1, y:0};
    dirQueue = [];
    score = 0;
    obstacles = [];
    digesting = [];
    headPulse = 0;
    best = Number(localStorage.getItem(bestKey(mode)) || 0);
    updateScore();
    if(mode === 'obstacles' || mode === 'ultra') placeObstacles(score, mode);
    placeFood();
    draw();
  }

  function placeFood(){
    let x, y;
    do {
      x = Math.floor(Math.random() * cells);
      y = Math.floor(Math.random() * cells);
    } while(
      snake.some(p => p.x===x && p.y===y) ||
      obstacles.some(o => o.x===x && o.y===y)
    );
    food = {x, y};
  }

  function isAdjacentToSnake(x, y){
    return snake.some(p => Math.abs(p.x - x) + Math.abs(p.y - y) === 1);
  }

  function placeObstacles(currentScore = score, currentMode = mode){
    if(currentMode !== 'obstacles' && currentMode !== 'ultra'){
      obstacles = [];
      return;
    }
    const baseCount = currentMode === 'ultra' ? 3 : 5;
    const extraEvery = 5;
    const extraPerThreshold = currentMode === 'ultra' ? 2 : 1;
    const extraCount = Math.floor(currentScore / extraEvery) * extraPerThreshold;
    const maxAvailable = Math.max(0, cells * cells - snake.length - 1);
    const total = Math.min(baseCount + extraCount, maxAvailable);
    obstacles = [];
    for(let i=0;i<total;i++){
      let x, y;
      do {
        x = Math.floor(Math.random() * cells);
        y = Math.floor(Math.random() * cells);
      } while(
        snake.some(p => p.x===x && p.y===y) ||
        isAdjacentToSnake(x, y) ||
        obstacles.some(o => o.x===x && o.y===y) ||
        (food.x === x && food.y === y)
      );
      const type = i < baseCount ? 'block' : 'hazard';
      obstacles.push({x, y, type});
    }
  }

  function roundedRectPath(ctx, x, y, w, h, r){
    const radius = Math.min(r, Math.min(w, h) / 2);
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }

  function drawCell(x, y, color, inset){
    const pad = inset ?? Math.max(1, size * cellPaddingFactor);
    const drawSize = size - pad * 2;
    ctx.fillStyle = color;
    ctx.fillRect(
      boardPadding + x * size + pad,
      boardPadding + y * size + pad,
      drawSize,
      drawSize
    );
  }

  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save();
    ctx.beginPath();
    roundedRectPath(ctx, 0, 0, canvas.width, canvas.height, boardRadius);
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = '#000';
    ctx.fillRect(boardPadding, boardPadding, size * cells, size * cells);
    const cellInset = Math.max(1, size * cellPaddingFactor);
    obstacles.forEach(o => {
      const color = o.type === 'hazard' ? '#f80' : '#888';
      drawCell(o.x, o.y, color, cellInset);
    });
    if(snake.length){
      const head = snake[0];
      const drawSize = size - cellInset * 2;
      const centerX = boardPadding + head.x * size + cellInset + drawSize / 2;
      const centerY = boardPadding + head.y * size + cellInset + drawSize / 2;
      ctx.save();
      ctx.translate(centerX, centerY);
      const scale = 1 + 0.3 * headPulse;
      ctx.scale(scale, scale);
      ctx.fillStyle = '#0f0';
      ctx.fillRect(-drawSize / 2, -drawSize / 2, drawSize, drawSize);
      ctx.restore();
      for(let i = 1; i < snake.length; i++){
        const segment = snake[i];
        drawCell(segment.x, segment.y, '#0f0', cellInset);
      }
    }

    // Draw digesting food as a pulsating block inside the snake
    const segmentSize = size - cellInset * 2;
    digesting.forEach(d => {
      if(d.index < snake.length){
        const seg = snake[d.index];
        const phase = d.phase ?? 0;
        const wave = (Math.sin(phase) + 1) / 2;
        const neon = { r: 57, g: 255, b: 20 };
        const yellow = { r: 255, g: 255, b: 0 };
        const r = Math.round(neon.r + (yellow.r - neon.r) * wave);
        const g = Math.round(neon.g + (yellow.g - neon.g) * wave);
        const b = Math.round(neon.b + (yellow.b - neon.b) * wave);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        const sizeFactor = 0.35 + 0.25 * wave;
        const innerSize = segmentSize * sizeFactor;
        const off = (segmentSize - innerSize) / 2;
        ctx.fillRect(
          boardPadding + seg.x * size + cellInset + off,
          boardPadding + seg.y * size + cellInset + off,
          innerSize,
          innerSize
        );
      }
    });
    drawCell(food.x, food.y, '#f00', cellInset);
    ctx.restore();
  }

  function step(){
    if(dirQueue.length) dir = dirQueue.shift();
    const head = {x:snake[0].x + dir.x, y:snake[0].y + dir.y};
    if(
      head.x<0 || head.y<0 || head.x>=cells || head.y>=cells ||
      snake.some(p=>p.x===head.x && p.y===head.y) ||
      obstacles.some(o=>o.x===head.x && o.y===head.y)
    ){
      gameOver();
      return;
    }
    snake.unshift(head);
    // move digesting pieces forward
    digesting.forEach(d => {
      d.index++;
      d.phase = (d.phase ?? 0) + 0.2;
    });
    let ate = head.x===food.x && head.y===food.y;
    if(ate){
      headPulse = 1;
      score++;
      if(score>best){
        best = score;
        localStorage.setItem(bestKey(mode), String(best));
      }
      updateScore();
      if(mode === 'obstacles' || mode === 'ultra'){
        placeObstacles(score, mode);
      }
      placeFood();
      digesting.push({index:0, phase:0});
    }
    let grow = digesting.some(d => d.index === snake.length - 1);
    if(!grow){
      snake.pop();
    } else {
      digesting = digesting.filter(d => d.index !== snake.length - 1);
    }
    draw();
    headPulse = Math.max(0, headPulse - 0.15);
  }

  function gameOver(){
    stop(false);
    const name = localStorage.getItem(PLAYER_KEY) || 'Player';
    void addHS({ name, score, date: new Date().toLocaleDateString() }, mode);
    showOverlay();
  }

  function start(){
    stop();
    running = true;
    paused = false;
    reset();
    timer = setInterval(step, 100);
  }

  function stop(hide=true){
    if(timer){
      clearInterval(timer);
      timer = null;
    }
    running = false;
    paused = false;
    headPulse = 0;
    if(hide) hideOverlay();
  }

  function pause(){
    if(running && !paused){
      if(timer){ clearInterval(timer); timer = null; }
      paused = true;
    }
  }

  function resume(){
    if(running && paused){
      timer = setInterval(step, 100);
      paused = false;
    }
  }

  function togglePause(){
    paused ? resume() : pause();
  }

  function handleKey(e){
    if(!running) return;
    let newDir;
    switch(e.key){
      case 'ArrowLeft': newDir = {x:-1,y:0}; break;
      case 'ArrowRight': newDir = {x:1,y:0}; break;
      case 'ArrowUp': newDir = {x:0,y:-1}; break;
      case 'ArrowDown': newDir = {x:0,y:1}; break;
      case 'KeyP':
        e.preventDefault();
        togglePause();
        return;
      default: return;
    }
    const lastDir = dirQueue[dirQueue.length-1] || dir;
    if(newDir.x === lastDir.x && newDir.y === lastDir.y) return;
    if(newDir.x === -lastDir.x && newDir.y === -lastDir.y) return;
    e.preventDefault();
    dirQueue.push(newDir);
  }

  function rotateLeft(){
    const current = dirQueue[dirQueue.length-1] || dir;
    dirQueue.push({x: current.y, y: -current.x});
  }

  function rotateRight(){
    const current = dirQueue[dirQueue.length-1] || dir;
    dirQueue.push({x: -current.y, y: current.x});
  }

  function handlePointer(e){
    if(!running) return;
    if(e.pointerType === 'mouse'){
      if(e.button === 2){
        rotateRight();
      }else{
        rotateLeft();
      }
    }else{
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if(x < rect.width / 2){
        rotateLeft();
      }else{
        rotateRight();
      }
    }
    e.preventDefault();
  }

  btnStart.addEventListener('click', start);
  if(btnPause) btnPause.addEventListener('click', togglePause);
  canvas.addEventListener('pointerdown', handlePointer, {passive:false});
  const preventTouchScroll = e => {
    if(e.cancelable){
      e.preventDefault();
    }
  };
  canvas.addEventListener('touchstart', preventTouchScroll, {passive:false});
  canvas.addEventListener('touchmove', preventTouchScroll, {passive:false});
  document.addEventListener('keydown', handleKey);
  if(btnRestart) btnRestart.addEventListener('click', start);
  if(btnClose) btnClose.addEventListener('click', hideOverlay);
  if(btnResetHS){
    btnResetHS.addEventListener('click', () => {
      clearHS(mode);
      localStorage.removeItem(bestKey(mode));
      best = Number(localStorage.getItem(bestKey(mode)) || 0);
      updateScore();
      void renderHS(mode);
      document.dispatchEvent(new CustomEvent('snakeHsCleared', { detail: { mode } }));
    });
  }

  if(modeSelect){
    mode = modeSelect.value;
    best = Number(localStorage.getItem(bestKey(mode)) || 0);
    updateScore();
    modeSelect.addEventListener('change', () => {
      mode = modeSelect.value;
      best = Number(localStorage.getItem(bestKey(mode)) || 0);
      updateScore();
      reset();
    });
  }

  document.addEventListener('snakeHsCleared', e => {
    if(e.detail && e.detail.mode === mode){
      localStorage.removeItem(bestKey(mode));
      best = Number(localStorage.getItem(bestKey(mode)) || 0);
      updateScore();
    }
  });

  document.addEventListener('menuToggle', e => {
    const show = e.detail.show;
    if(show){
      menuPrevPaused = paused;
      pause();
    } else if(running && !menuPrevPaused){
      resume();
    }
  });
  document.addEventListener('keydown', e => {
    if(e.code === 'Escape') toggleMenuOverlay();
  });

  return { start, stop, pause, resume, hideOverlay, showOverlay };
}
