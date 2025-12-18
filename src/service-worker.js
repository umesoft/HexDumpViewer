const CACHE_NAME = 'hex-dump-viewer-cache-v2';
const urlsToCache = [
  './index.html',
  './hex_dump_lib.js',
  './byte_format_view.js',
  './hex_dump_sample.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
