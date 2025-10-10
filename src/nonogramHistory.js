export function cloneBoard(board){
  if(!Array.isArray(board)){
    return [];
  }
  return board.map(row => Array.isArray(row) ? row.slice() : []);
}

export function createHistory(){
  return {
    past: [],
    future: []
  };
}

export function clearHistory(history){
  if(!history){
    return;
  }
  history.past.length = 0;
  history.future.length = 0;
}

export function pushHistory(history, board){
  if(!history){
    return;
  }
  history.past.push(cloneBoard(board));
  history.future.length = 0;
}

export function undoHistory(history, currentBoard){
  if(!history || history.past.length === 0){
    return null;
  }
  const previous = history.past.pop();
  history.future.push(cloneBoard(currentBoard));
  return cloneBoard(previous);
}

export function redoHistory(history, currentBoard){
  if(!history || history.future.length === 0){
    return null;
  }
  const next = history.future.pop();
  history.past.push(cloneBoard(currentBoard));
  return cloneBoard(next);
}
