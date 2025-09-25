// Generic utilities for creating reusable highscore stores
import { HS_NAME_MAX_LENGTH } from './constants.js';
import { logError } from './logger.js';

export function sanitizeName(str = '') {
  return str.replace(/<[^>]*>/g, '').trim().slice(0, HS_NAME_MAX_LENGTH);
}

export function createHighscoreStore({
  keyBase,
  limit = 10,
  sanitizeEntry = entry => entry,
  sortEntries = () => 0,
  migrate
} = {}) {
  if (!keyBase) throw new Error('keyBase is required for highscore store');

  const getStorageKey = mode => `${keyBase}_${mode}`;

  function runMigrations(mode) {
    if (typeof migrate !== 'function') return;
    try {
      migrate(mode, {
        getItem: key => localStorage.getItem(key),
        setItem: (key, value) => localStorage.setItem(key, value),
        removeItem: key => localStorage.removeItem(key),
        storageKey: getStorageKey(mode)
      });
    } catch (e) {
      logError('Failed to migrate highscores', e);
    }
  }

  function load(mode) {
    runMigrations(mode);
    try {
      const raw = localStorage.getItem(getStorageKey(mode));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      logError('Failed to parse highscores from storage', e);
      return [];
    }
  }

  function save(list, mode) {
    try {
      localStorage.setItem(getStorageKey(mode), JSON.stringify(list));
    } catch (e) {
      logError('Failed to save highscores', e);
    }
  }

  function sanitizeList(list, mode) {
    let changed = false;
    const sanitized = list
      .map(entry => sanitizeEntry(entry, mode))
      .filter(entry => entry !== null && typeof entry === 'object');
    if (sanitized.length !== list.length) {
      changed = true;
    } else {
      for (let i = 0; i < list.length; i++) {
        if (sanitized[i] !== list[i]) {
          changed = true;
          break;
        }
      }
    }
    if (changed) save(sanitized, mode);
    return sanitized;
  }

  async function getList(mode) {
    const list = load(mode);
    return sanitizeList(list, mode);
  }

  async function add(entry, mode) {
    const existing = sanitizeList(load(mode), mode);
    const sanitizedEntry = sanitizeEntry(entry, mode);
    if (!sanitizedEntry) return existing;
    existing.push(sanitizedEntry);
    existing.sort((a, b) => sortEntries(a, b, mode));
    const top = existing.slice(0, limit);
    save(top, mode);
    return top;
  }

  function clear(mode) {
    try {
      localStorage.removeItem(getStorageKey(mode));
    } catch (e) {
      logError('Failed to clear highscores', e);
    }
  }

  return {
    load,
    save,
    add,
    clear,
    getList,
    sanitizeEntry,
    sanitizeList,
    storageKey: getStorageKey
  };
}
