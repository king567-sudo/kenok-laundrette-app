const CACHE_NAME = 'kenok-laundrette-v1';
const urlsToCache = [
  'index.html',
  'style.css',
  'firebase-config.js',
  'auth.js',
  'customers.js',
  'register.js',
  'chat.js',
  'analysis.js',
  'sw-register.js',
  'kenok-logo.jpeg',
  'manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});