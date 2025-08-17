// Simple Snake game implementation
export function initSnake(){
  const canvas = document.getElementById('snakeCanvas');
  const btnStart = document.getElementById('snakeStart');
  const btnPause = document.getElementById('snakePause');
  const btnMobileStart = document.getElementById('sStart');
  const btnMobilePause = document.getElementById('sPause');
  const btnLeft = document.getElementById('sLeft');
  const btnRight = document.getElementById('sRight');
  const btnUp = document.getElementById('sUp');
  const btnDown = document.getElementById('sDown');
  const topScoreEl = document.getElementById('snakeTopScore');
  const topBestEl = document.getElementById('snakeTopBest');
  const menuOverlay = document.getElementById('menuOverlay');
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

  function reset(){
    snake = [{x:Math.floor(cells/2), y:Math.floor(cells/2)}];
    dir = {x:1, y:0};
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
    const head = {x:snake[0].x + dir.x, y:snake[0].y + dir.y};
    if(head.x<0 || head.y<0 || head.x>=cells || head.y>=cells || snake.some(p=>p.x===head.x && p.y===head.y)){
      stop();
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

  function start(){
    stop();
    running = true;
    paused = false;
    reset();
    timer = setInterval(step, 100);
  }

  function stop(){
    if(timer){
      clearInterval(timer);
      timer = null;
    }
    running = false;
    paused = false;
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
    switch(e.key){
      case 'ArrowLeft': if(dir.x!==1) dir={x:-1,y:0}; break;
      case 'ArrowRight': if(dir.x!==-1) dir={x:1,y:0}; break;
      case 'ArrowUp': if(dir.y!==1) dir={x:0,y:-1}; break;
      case 'ArrowDown': if(dir.y!==-1) dir={x:0,y:1}; break;
      case 'KeyP': togglePause(); break;
      default: return;
    }
    e.preventDefault();
  }

  btnStart.addEventListener('click', start);
  if(btnPause) btnPause.addEventListener('click', togglePause);
  if(btnMobileStart) btnMobileStart.addEventListener('click', start);
  if(btnMobilePause) btnMobilePause.addEventListener('click', togglePause);
  if(btnLeft) btnLeft.addEventListener('click', () => { if(dir.x!==1) dir={x:-1,y:0}; });
  if(btnRight) btnRight.addEventListener('click', () => { if(dir.x!==-1) dir={x:1,y:0}; });
  if(btnUp) btnUp.addEventListener('click', () => { if(dir.y!==1) dir={x:0,y:-1}; });
  if(btnDown) btnDown.addEventListener('click', () => { if(dir.y!==-1) dir={x:0,y:1}; });
  document.addEventListener('keydown', handleKey);

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
