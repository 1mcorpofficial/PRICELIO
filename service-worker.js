const CACHE_NAME = 'pricelio-pwa-v5';
const ASSETS = [
  '.',
  'index.html',
  'styles.css',
  'app.js',
  'manifest.webmanifest',
  'assets/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key)))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const req = event.request;
  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Never cache cross-origin traffic (for API and third-party resources).
  if (!isSameOrigin) {
    event.respondWith(fetch(req));
    return;
  }

  const isHtmlNavigation = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  const isStaticAsset = /\.(?:css|js|svg|png|jpg|jpeg|webp|gif|ico)$/.test(url.pathname);

  if (isHtmlNavigation) {
    // Network-first for HTML to reduce stale app shells; fallback to cache offline.
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return response;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('index.html')))
    );
    return;
  }

  if (isStaticAsset) {
    // Network-first for static files to avoid stale app.js/api-base issues after deploy.
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return response;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Default for same-origin non-static requests: network-only.
  event.respondWith(fetch(req));
});
