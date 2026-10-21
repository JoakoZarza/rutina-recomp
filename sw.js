/**
 * Service worker: permite abrir la app sin señal en el gimnasio.
 * Estrategia "red primero, caché de respaldo": siempre toma la versión más
 * nueva cuando hay conexión y usa la copia guardada cuando no la hay.
 */
// Subí este número en cada deploy que cambie archivos de la app.
const CACHE = 'recomp-v4';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png', './assets/apple-touch-icon.png',
  './css/tokens.css', './css/app.css',
  './js/main.js',
  './js/core/planner.js', './js/core/progression.js', './js/core/storage.js',
  './js/data/exercises.js', './js/data/figures.js', './js/data/templates.js',
  './js/ui/dom.js', './js/ui/figure.js', './js/ui/info.js', './js/ui/timer.js',
  './js/ui/views/train.js', './js/ui/views/progress.js', './js/ui/views/library.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && (new URL(e.request.url).origin === location.origin || e.request.url.includes('fonts.g'))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request)),
  );
});
