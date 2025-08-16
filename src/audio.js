export function createSfx(settings){
  let actx = null;
  function ensureAudio(){
    if(!settings.sound) return null;
    if(!actx){
      try{ actx = new (window.AudioContext||window.webkitAudioContext)(); }catch{}
    }
    return actx;
  }
  function beep(freq=440, dur=0.06, type='sine', gain=0.05){
    const ac = ensureAudio(); if(!ac) return;
    const o = ac.createOscillator(); const g = ac.createGain();
    o.type = type; o.frequency.value=freq; g.gain.value=gain;
    o.connect(g); g.connect(ac.destination);
    const t = ac.currentTime; o.start(t); o.stop(t+dur);
  }
  return {
    move: ()=>beep(300,0.03,'square',0.025),
    rotate: ()=>beep(520,0.04,'sine',0.035),
    lock: ()=>beep(220,0.06,'triangle',0.05),
    clear: ()=>{ beep(700,0.05,'sine',0.05); setTimeout(()=>beep(920,0.05,'sine',0.05),40); },
    level: ()=>{ beep(500,0.08,'triangle',0.06); setTimeout(()=>beep(750,0.08,'triangle',0.06),70); },
    hard: ()=>beep(180,0.05,'square',0.06),
    gameover: ()=>{ beep(200,0.08,'sawtooth',0.07); setTimeout(()=>beep(150,0.12,'sawtooth',0.06),90); }
  };
}
