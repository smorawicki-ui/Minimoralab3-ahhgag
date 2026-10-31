/**
 * MORA MINILAB 3 — Service Worker v4 (GitHub Pages & PWA Auto-Update)
 * - App Shell: NETWORK-FIRST (recibe actualizaciones de GitHub automáticamente)
 * - Samples MP3 (Pianos, Órganos, Violines, Cuerdas): CACHE-FIRST permanente (0ms offline)
 */

const SHELL_CACHE = 'mora-minilab3-shell-v4';
const SAMPLES_CACHE = 'mora-minilab3-samples-v1';

const SHELL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './192.png',
  './512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .catch(() => {})
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== SHELL_CACHE && k !== SAMPLES_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'CLEAR_SHELL_CACHE') {
    event.waitUntil(
      caches.keys().then(keys =>
        Promise.all(
          keys.filter(k => k !== SAMPLES_CACHE).map(k => caches.delete(k))
        )
      )
    );
  }
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1. Samples reales MP3 (FluidR3_GM): Cache-First permanente para baja latencia y uso 100% offline
  if (url.hostname === 'gleitz.github.io' || url.pathname.endsWith('.mp3')) {
    event.respondWith(
      caches.open(SAMPLES_CACHE).then(async cache => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const netRes = await fetch(req);
          if (netRes && netRes.ok) {
            cache.put(req, netRes.clone());
          }
          return netRes;
        } catch (err) {
          return new Response('', { status: 503 });
        }
      })
    );
    return;
  }

  // 2. App Shell (HTML, JS, CSS): Network-First para aplicar actualizaciones de GitHub al instante
  event.respondWith(
    (async () => {
      try {
        const netRes = await fetch(req, { cache: 'no-cache' });
        if (netRes && netRes.ok && url.origin === self.location.origin) {
          const cache = await caches.open(SHELL_CACHE);
          cache.put(req, netRes.clone());
        }
        return netRes;
      } catch (err) {
        const cached = await caches.match(req, { ignoreSearch: true });
        if (cached) return cached;
        if (req.mode === 'navigate') {
          return (await caches.match('./index.html', { ignoreSearch: true })) ||
                 (await caches.match('./', { ignoreSearch: true }));
        }
        return new Response('Offline', { status: 503 });
      }
    })()
  );
});
