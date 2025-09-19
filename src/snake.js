// Simple Snake game implementation
import { PLAYER_KEY, SNAKE_BEST_KEY_BASE } from './constants.js';
import { addHS, renderHS, clearHS } from './snakeHighscores.js';
import { toggleMenuOverlay } from './menu.js';

export function initSnake(){
  const canvas = document.getElementById('snakeCanvas');
  const btnStart = document.getElementById('snakeStart');
  const btnPause = document.getElementById('snakePause');
  const topScoreEl = document.getElementById('snakeTopScore');
  const topBestEl = document.getElementById('snakeTopBest');
  const ov = document.getElementById('snakeOverlay');
  const ovScoreEl = document.getElementById('snakeOvScore');
  const ovBestEl = document.getElementById('snakeOvBest');
  const btnRestart = document.getElementById('snakeBtnRestart');
  const btnClose = document.getElementById('snakeBtnClose');
  const btnResetHS = document.getElementById('snakeBtnResetHS');
  const modeSelect = document.getElementById('snakeModeSelect');
  if(!canvas || !btnStart){
    return {
      start: () => {},
      stop: () => {}
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
  let eatParticles = [];
  let obstacles = [];
  let timer = null;
  let animationFrame = null;
  let lastAnimationTime = null;
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
    if(!ov) return;
    if(ovScoreEl) ovScoreEl.textContent = String(score);
    if(ovBestEl) ovBestEl.textContent = String(best);
    renderHS(mode);
    ov.classList.add('show');
  }

  function hideOverlay(){
    if(ov) ov.classList.remove('show');
  }

  function reset(){
    snake = [{x:Math.floor(cells/2), y:Math.floor(cells/2)}];
    dir = {x:1, y:0};
    dirQueue = [];
    score = 0;
    obstacles = [];
    digesting = [];
    eatParticles = [];
    cancelAnimationLoop();
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
    snake.forEach(s => drawCell(s.x, s.y, '#0f0', cellInset));

    // Draw digesting food as a smaller block inside the snake
    ctx.fillStyle = '#ff0';
    const segmentSize = size - cellInset * 2;
    digesting.forEach(d => {
      if(d.index < snake.length){
        const seg = snake[d.index];
        const off = segmentSize / 4;
        ctx.fillRect(
          boardPadding + seg.x * size + cellInset + off,
          boardPadding + seg.y * size + cellInset + off,
          segmentSize / 2,
          segmentSize / 2
        );
      }
    });
    drawCell(food.x, food.y, '#f00', cellInset);

    if(eatParticles.length){
      const particleBaseRadius = Math.max(1.5, size * 0.15);
      eatParticles.forEach(p => {
        const lifeRatio = Math.max(0, Math.min(1, p.life / p.maxLife));
        const px = boardPadding + p.x * size;
        const py = boardPadding + p.y * size;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = lifeRatio;
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        const radius = particleBaseRadius * (0.6 + lifeRatio * 0.6);
        ctx.ellipse(0, 0, radius, radius * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function cancelAnimationLoop(){
    if(animationFrame !== null){
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    lastAnimationTime = null;
  }

  function ensureAnimationLoop(){
    if(animationFrame === null && eatParticles.length){
      animationFrame = requestAnimationFrame(updateAnimations);
    }
  }

  function updateAnimations(timestamp){
    if(lastAnimationTime === null){
      lastAnimationTime = timestamp;
    }
    const delta = timestamp - lastAnimationTime;
    lastAnimationTime = timestamp;
    const dt = delta / 1000;
    eatParticles = eatParticles.filter(p => {
      p.life -= delta;
      if(p.life <= 0) return false;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.985;
      p.vy += p.gravity * dt;
      p.rotation += p.vr * dt;
      return true;
    });
    draw();
    if(eatParticles.length){
      animationFrame = requestAnimationFrame(updateAnimations);
    }else{
      animationFrame = null;
      lastAnimationTime = null;
    }
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
    digesting.forEach(d => d.index++);
    let ate = head.x===food.x && head.y===food.y;
    if(ate){
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
      digesting.push({index:0});
      const centerX = head.x + 0.5;
      const centerY = head.y + 0.5;
      const burstCount = 10 + Math.floor(Math.random() * 6);
      for(let i=0;i<burstCount;i++){
        const angle = Math.random() * Math.PI * 2;
        const speed = 2.5 + Math.random() * 3.5;
        const maxLife = 350 + Math.random() * 250;
        eatParticles.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          gravity: 3,
          life: maxLife,
          maxLife,
          rotation: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 6
        });
      }
      ensureAnimationLoop();
    }
    let grow = digesting.some(d => d.index === snake.length - 1);
    if(!grow){
      snake.pop();
    } else {
      digesting = digesting.filter(d => d.index !== snake.length - 1);
    }
    draw();
  }

  function gameOver(){
    stop(false);
    const name = localStorage.getItem(PLAYER_KEY) || 'Player';
    addHS({ name, score, date: new Date().toLocaleDateString() }, mode);
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
    cancelAnimationLoop();
    eatParticles = [];
    running = false;
    paused = false;
    if(hide) hideOverlay();
  }

  function pause(){
    if(running && !paused){
      if(timer){ clearInterval(timer); timer = null; }
      cancelAnimationLoop();
      paused = true;
    }
  }

  function resume(){
    if(running && paused){
      timer = setInterval(step, 100);
      paused = false;
      ensureAnimationLoop();
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
  document.addEventListener('keydown', handleKey);
  if(btnRestart) btnRestart.addEventListener('click', start);
  if(btnClose) btnClose.addEventListener('click', hideOverlay);
  if(btnResetHS){
    btnResetHS.addEventListener('click', () => {
      clearHS(mode);
      localStorage.removeItem(bestKey(mode));
      best = Number(localStorage.getItem(bestKey(mode)) || 0);
      updateScore();
      renderHS(mode);
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

  return { start, stop, pause, resume, hideOverlay };
}
