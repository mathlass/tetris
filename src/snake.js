// Simple Snake game implementation
export function initSnake(){
  const canvas = document.getElementById('snakeCanvas');
  const btnStart = document.getElementById('snakeStart');
  const btnPause = document.getElementById('snakePause');
  const topScoreEl = document.getElementById('snakeTopScore');
  const topBestEl = document.getElementById('snakeTopBest');
  const menuOverlay = document.getElementById('menuOverlay');
  const ov = document.getElementById('snakeOverlay');
  const ovScoreEl = document.getElementById('snakeOvScore');
  const ovBestEl = document.getElementById('snakeOvBest');
  const btnRestart = document.getElementById('snakeBtnRestart');
  const btnClose = document.getElementById('snakeBtnClose');
  if(!canvas || !btnStart){
    return {
      start: () => {},
      stop: () => {}
    };
  }
  const ctx = canvas.getContext('2d');
  const size = 15;
  const cells = Math.floor(canvas.width / size);
  let snake = [];
  let dir = {x:1, y:0};
  let dirQueue = [];
  let food = {x:0, y:0};
  let timer = null;
  let score = 0;
  let best = Number(localStorage.getItem('snakeBest')) || 0;
  let running = false;
  let paused = false;
  let menuPrevPaused = false;

  function updateScore(){
    if(topScoreEl) topScoreEl.textContent = `Score: ${score}`;
    if(topBestEl) topBestEl.textContent = `Best: ${best}`;
  }

  function showOverlay(){
    if(!ov) return;
    if(ovScoreEl) ovScoreEl.textContent = String(score);
    if(ovBestEl) ovBestEl.textContent = String(best);
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
    updateScore();
    placeFood();
    draw();
  }

  function placeFood(){
    food = {
      x: Math.floor(Math.random() * cells),
      y: Math.floor(Math.random() * cells)
    };
  }

  function draw(){
    ctx.fillStyle = '#000';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#0f0';
    snake.forEach(s => ctx.fillRect(s.x*size, s.y*size, size-1, size-1));
    ctx.fillStyle = '#f00';
    ctx.fillRect(food.x*size, food.y*size, size-1, size-1);
  }

  function step(){
    if(dirQueue.length) dir = dirQueue.shift();
    const head = {x:snake[0].x + dir.x, y:snake[0].y + dir.y};
    if(head.x<0 || head.y<0 || head.x>=cells || head.y>=cells || snake.some(p=>p.x===head.x && p.y===head.y)){
      gameOver();
      return;
    }
    snake.unshift(head);
    if(head.x===food.x && head.y===food.y){
      score++;
      if(score>best){
        best = score;
        localStorage.setItem('snakeBest', String(best));
      }
      updateScore();
      placeFood();
    }else{
      snake.pop();
    }
    draw();
  }

  function gameOver(){
    stop(false);
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
    let newDir;
    switch(e.key){
      case 'ArrowLeft': newDir = {x:-1,y:0}; break;
      case 'ArrowRight': newDir = {x:1,y:0}; break;
      case 'ArrowUp': newDir = {x:0,y:-1}; break;
      case 'ArrowDown': newDir = {x:0,y:1}; break;
      case 'KeyP': togglePause(); return;
      default: return;
    }
    const lastDir = dirQueue[dirQueue.length-1] || dir;
    if(newDir.x === lastDir.x && newDir.y === lastDir.y) return;
    if(newDir.x === -lastDir.x && newDir.y === -lastDir.y) return;
    dirQueue.push(newDir);
    e.preventDefault();
  }

  function rotateLeft(){
    const current = dirQueue[dirQueue.length-1] || dir;
    dirQueue.push({x: current.y, y: -current.x});
  }

  function rotateRight(){
    const current = dirQueue[dirQueue.length-1] || dir;
    dirQueue.push({x: -current.y, y: current.x});
  }

  function handleTouch(e){
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    if(x < rect.width / 2){
      rotateLeft();
    }else{
      rotateRight();
    }
    e.preventDefault();
  }

  btnStart.addEventListener('click', start);
  if(btnPause) btnPause.addEventListener('click', togglePause);
  canvas.addEventListener('touchstart', handleTouch, {passive:false});
  canvas.addEventListener('mousedown', handleTouch);
  document.addEventListener('keydown', handleKey);
  if(btnRestart) btnRestart.addEventListener('click', start);
  if(btnClose) btnClose.addEventListener('click', hideOverlay);

  function toggleMenu(){
    if(!menuOverlay) return;
    const show = !menuOverlay.classList.contains('show');
    menuOverlay.classList.toggle('show', show);
    menuOverlay.setAttribute('aria-hidden', String(!show));
    if(show){
      menuPrevPaused = paused;
      pause();
    } else {
      if(running && !menuPrevPaused) resume();
    }
  }

  document.querySelectorAll('#btnMenu').forEach(btn =>
    btn.addEventListener('click', toggleMenu)
  );
  const btnMenuClose = document.getElementById('btnMenuClose');
  if(btnMenuClose){
    btnMenuClose.addEventListener('click', toggleMenu);
  }

  document.addEventListener('keydown', e => {
    if(e.code === 'Escape') toggleMenu();
  });

  return { start, stop };
}
