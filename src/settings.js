// Persistence helpers for user settings
import { SETTINGS_KEY, COLOR_SETS } from './constants.js';
import { logError } from './logger.js';

const defaultSettings = {
  sound: true,
  ghost: true,
  softDropPoints: true,
  palette: 'standard'
};

export function loadSettings() {
  try {
    return Object.assign(
      {},
      defaultSettings,
      JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
    );
  } catch (e) {
    logError('Failed to load settings', e);
    return { ...defaultSettings };
  }
}

export function saveSettings(s) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch (e) {
    logError('Failed to save settings', e);
  }
}

export function applyPalette(settings) {
  return COLOR_SETS[settings.palette] || COLOR_SETS.standard;
}
