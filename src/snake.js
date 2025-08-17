// Simple Snake game implementation
export function initSnake(){
  const canvas = document.getElementById('snakeCanvas');
  const btnStart = document.getElementById('snakeStart');
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

  function updateScore(){
    const el = document.getElementById('snakeScore');
    if(el) el.textContent = String(score);
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
      updateScore();
      placeFood();
    }else{
      snake.pop();
    }
    draw();
  }

  function start(){
    stop();
    reset();
    timer = setInterval(step, 100);
  }

  function stop(){
    if(timer){
      clearInterval(timer);
      timer = null;
    }
  }

  function handleKey(e){
    switch(e.key){
      case 'ArrowLeft': if(dir.x!==1) dir={x:-1,y:0}; break;
      case 'ArrowRight': if(dir.x!==-1) dir={x:1,y:0}; break;
      case 'ArrowUp': if(dir.y!==1) dir={x:0,y:-1}; break;
      case 'ArrowDown': if(dir.y!==-1) dir={x:0,y:1}; break;
      default: return;
    }
    e.preventDefault();
  }

  btnStart.addEventListener('click', start);
  document.addEventListener('keydown', handleKey);

  return { start, stop };
}
