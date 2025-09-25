const CACHE = 'tetris-cache-v5';
const ASSETS = [
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
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.map(k => (k !== CACHE ? caches.delete(k) : null))
  )));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return resp;
    }).catch(() => caches.match('./index.html')))
  );
});

