const APP_VERSION = '1.1.54';
const CACHE_NAME = `pesquisa-satisfacao-${APP_VERSION}`;

const URLS = [
  '/pesquisa-satisfacao/',
  '/pesquisa-satisfacao/index.html',
  '/pesquisa-satisfacao/pesquisa.html',
  '/pesquisa-satisfacao/pesquisa-interno.html',
  '/pesquisa-satisfacao/pesquisa-colaborador.html',
  '/pesquisa-satisfacao/pesquisa-escritorio.html',
  '/pesquisa-satisfacao/dashboard.html',
  '/pesquisa-satisfacao/manifest.json',
  '/pesquisa-satisfacao/manifest-dashboard.json',
  '/pesquisa-satisfacao/css/instituto.css',
  '/pesquisa-satisfacao/assets/logo-72.png',
  '/pesquisa-satisfacao/assets/logo-192.png',
  '/pesquisa-satisfacao/assets/logo-512.png',
  '/pesquisa-satisfacao/assets/Logo-isv.svg',
  '/pesquisa-satisfacao/assets/timbrado-isv.png',
  '/pesquisa-satisfacao/assets/municipios/caucaia.png',
  '/pesquisa-satisfacao/assets/municipios/maracanau.jpeg',
  '/pesquisa-satisfacao/assets/municipios/caps-tabuleiro-ana-rita.jpeg',
  '/pesquisa-satisfacao/assets/municipios/forquilha.png',
  '/pesquisa-satisfacao/assets/municipios/guaraciaba-do-norte.png',
  '/pesquisa-satisfacao/assets/municipios/iguatu.png',
  '/pesquisa-satisfacao/assets/municipios/lavras-da-mangabeira.png',
  '/pesquisa-satisfacao/assets/municipios/massape.png',
  '/pesquisa-satisfacao/assets/municipios/oros.png',
  '/pesquisa-satisfacao/assets/municipios/pacatuba.png',
  '/pesquisa-satisfacao/assets/municipios/pedra-branca.png',
  '/pesquisa-satisfacao/assets/municipios/tabuleiro-do-norte.png',
  '/pesquisa-satisfacao/assets/municipios/varzea-alegre.png',
  '/pesquisa-satisfacao/docs/qrcodes/Template-QR-Code-Pesquisa-ISV.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
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
