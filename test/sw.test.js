import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

function createEnv() {
  const listeners = {};
  const env = {
    fetch: async () => new Response('dummy'),
    skipWaiting: () => {},
    clients: { claim: () => {} },
    addEventListener: (type, cb) => {
      listeners[type] = cb;
    },
    listeners,
  };

  class Cache {
    constructor() {
      this.store = new Map();
    }
    async match(req) {
      const url = typeof req === 'string' ? new URL(req, 'https://example.com').href : req.url;
      return this.store.get(url);
    }
    async put(req, res) {
      const url = typeof req === 'string' ? new URL(req, 'https://example.com').href : req.url;
      this.store.set(url, res);
    }
    async addAll(assets) {
      for (const asset of assets) {
        const url = new URL(asset, 'https://example.com');
        const req = new Request(url);
        const res = await env.fetch(req);
        await this.put(req, res);
      }
    }
    async keys() {
      return Array.from(this.store.keys()).map(u => new Request(u));
    }
  }

  class CacheStorage {
    constructor() {
      this.caches = new Map();
    }
    async open(name) {
      if (!this.caches.has(name)) this.caches.set(name, new Cache());
      return this.caches.get(name);
    }
    async keys() {
      return Array.from(this.caches.keys());
    }
    async delete(name) {
      return this.caches.delete(name);
    }
    async match(req) {
      const url = typeof req === 'string' ? new URL(req, 'https://example.com').href : req.url;
      for (const cache of this.caches.values()) {
        const res = await cache.match(url);
        if (res) return res;
      }
      return undefined;
    }
  }

  env.caches = new CacheStorage();
  env.self = env;
  return env;
}

const expectedAssets = [
  './',
  './index.html',
  './manifest.json',
  './styles.css',
  './src/audio.js',
  './src/botPlayer.js',
  './src/constants.js',
  './src/game.js',
  './src/highscoreStore.js',
  './src/highscores.js',
  './src/logger.js',
  './src/logic.js',
  './src/main.js',
  './src/menu.js',
  './src/overlay.js',
  './src/pieces.js',
  './src/settings.js',
  './src/snake.js',
  './src/snakeHighscores.js',
  './src/sudoku.js',
  './src/sudokuGenerator.js',
  './src/sudokuHighscores.js',
  './src/ui.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

test('service worker caches assets and serves them offline', async () => {
  const swSrc = await fs.readFile(new URL('../sw.js', import.meta.url), 'utf8');
  const env = createEnv();
  vm.createContext(env);
  vm.runInContext(swSrc, env);

  let installDone;
  await env.listeners.install({ waitUntil: p => { installDone = p; } });
  await installDone;

  const cache = await env.caches.open('tetris-cache-v5');
  const keys = await cache.keys();
  const urls = keys.map(req => req.url.replace('https://example.com', '.'));
  assert.deepEqual(urls.sort(), expectedAssets.sort());

  env.fetch = async () => { throw new Error('offline'); };
  let responsePromise;
  await env.listeners.fetch({
    request: new Request('https://example.com/index.html'),
    respondWith: p => {
      responsePromise = p;
    },
  });
  const response = await responsePromise;
  assert.equal(await response.text(), 'dummy');
});

