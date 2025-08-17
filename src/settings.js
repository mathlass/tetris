import { SETTINGS_KEY, COLOR_SETS } from './constants.js';

const defaultSettings = { sound:true, ghost:true, softDropPoints:true, palette:'standard' };

export function loadSettings(){
  try{
    return Object.assign({}, defaultSettings, JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}'));
  }catch{
    return { ...defaultSettings };
  }
}

export function saveSettings(s){
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function applyPalette(settings){
  return COLOR_SETS[settings.palette] || COLOR_SETS.standard;
}
