import { SHAPES, COLS } from './constants.js';

export function newPiece(type){
  const shape = SHAPES[type];
  return {type, rot:0, x: Math.floor(COLS/2)-2, y: -2, shape};
}

export function refillBag(bag){
  const types=['I','J','L','O','S','T','Z'];
  for(let i=types.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [types[i],types[j]]=[types[j],types[i]];
  }
  bag.push(...types);
}
