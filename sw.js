const APP_VERSION = '0.3.0';
const CACHE_NAME = `pesquisa-satisfacao-${APP_VERSION}`;

const URLS = [
  '/pesquisa-satisfacao/',
  '/pesquisa-satisfacao/index.html',
  '/pesquisa-satisfacao/pesquisa.html',
  '/pesquisa-satisfacao/dashboard.html',
  '/pesquisa-satisfacao/manifest.json',
  '/pesquisa-satisfacao/shared/styles/instituto.css',
  '/pesquisa-satisfacao/shared/assets/logo-192.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(
        URLS.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Falha ao cachear:', url, err))
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || network;
    })
  );
});
