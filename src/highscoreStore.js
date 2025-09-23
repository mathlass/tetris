// Generic utilities for creating reusable highscore stores
import { HS_NAME_MAX_LENGTH } from './constants.js';
import { logError } from './logger.js';

const SUPABASE_URL =
  globalThis.NEXT_PUBLIC_SUPABASE_URL ||
  (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined);
const SUPABASE_KEY =
  globalThis.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined);
const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

export function sanitizeName(str = '') {
  return str.replace(/<[^>]*>/g, '').trim().slice(0, HS_NAME_MAX_LENGTH);
}

export function createSupabaseSync({
  modePrefix = '',
  buildFetchQuery,
  mapRecord,
  toPayload,
  fallbackPayload,
  fallbackPath
} = {}) {
  const toModeValue = mode => `${modePrefix}${mode}`;

  async function fetchFromServer(mode) {
    const modeValue = toModeValue(mode);
    if (hasSupabase) {
      try {
        const query = buildFetchQuery ? buildFetchQuery(modeValue) : '';
        const url = `${SUPABASE_URL}/rest/v1/scores${query ? `?${query}` : ''}`;
        const res = await fetch(url, {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
        });
        if (res.ok) {
          const data = await res.json();
          return mapRecord ? data.map(record => mapRecord(record, modeValue)) : data;
        }
      } catch (e) {
        logError('Failed to load highscores from server', e);
      }
      return null;
    }
    const path = fallbackPath ? fallbackPath(modeValue) : null;
    if (!path) return null;
    try {
      const res = await fetch(path);
      if (res.ok) {
        const data = await res.json();
        return mapRecord ? data.map(record => mapRecord(record, modeValue)) : data;
      }
    } catch (e) {
      logError('Failed to load highscores from server', e);
    }
    return null;
  }

  async function sendToServer(entry, mode) {
    const modeValue = toModeValue(mode);
    const supabasePayload = toPayload ? toPayload(entry, modeValue) : entry;
    if (!supabasePayload) return;
    if (hasSupabase) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`
          },
          body: JSON.stringify(supabasePayload)
        });
        if (!res.ok) {
          logError(`Failed to send highscore to server: ${res.status} ${res.statusText}`);
        }
      } catch (e) {
        logError('Failed to send highscore to server', e);
      }
      return;
    }
    const path = fallbackPath ? fallbackPath(modeValue) : null;
    if (!path) return;
    const payload = fallbackPayload ? fallbackPayload(entry, modeValue) : supabasePayload;
    if (!payload) return;
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        logError(`Failed to send highscore to server: ${res.status} ${res.statusText}`);
      }
    } catch (e) {
      logError('Failed to send highscore to server', e);
    }
  }

  return {
    fetch: fetchFromServer,
    send: sendToServer
  };
}

export function createHighscoreStore({
  keyBase,
  limit = 10,
  sanitizeEntry = entry => entry,
  sortEntries = () => 0,
  migrate,
  server
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
    const serverList = server && typeof server.fetch === 'function' ? await server.fetch(mode) : null;
    const list = serverList && Array.isArray(serverList) && serverList.length > 0 ? serverList : load(mode);
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
    if (server && typeof server.send === 'function') {
      await server.send(sanitizedEntry, mode);
    }
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
