// FrioCosta Service Worker
const CACHE_NAME = 'friocosta-v1';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap'
];

// Instalación: cachea los archivos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE).catch(err => {
        console.log('Cache addAll error:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activación: limpia caches antiguos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: estrategia network-first para Apps Script y HTML, cache-first para el resto
self.addEventListener('fetch', event => {
  const url = event.request.url;
  
  // No cachear peticiones a Apps Script (siempre en red)
  if (url.includes('script.google.com')) {
    return;
  }
  
  // Network-first para HTML (para que siempre tome cambios nuevos cuando hay internet)
  if (event.request.mode === 'navigate' || url.endsWith('.html') || url.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // Cache-first para todo lo demás
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(fetchResponse => {
        const responseClone = fetchResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return fetchResponse;
      });
    }).catch(() => {
      // Si todo falla, intenta servir el index.html
      return caches.match('./index.html');
    })
  );
});
