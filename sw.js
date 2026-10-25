'use strict';

const CACHE_NAME = 'expense-tracker-v29';
const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './styles-modern.css',
  './styles-preview.css',
  './notes.css',
  './app.js',
  './notes.js',
  './manifest.json',
  './icons/icon.svg'
];

async function precacheAssets() {
  const cache = await caches.open(CACHE_NAME);

  await Promise.all(PRECACHE_URLS.map(async (url) => {
    const response = await fetch(url, { cache: 'reload' });

    if (!response.ok) {
      throw new Error(`Не удалось загрузить ${url} для офлайн-кэша.`);
    }

    await cache.put(url, response);
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    precacheAssets().then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
          const responseClone = networkResponse.clone();

          event.waitUntil(
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(request, responseClone))
              .catch(() => {
                // Не мешаем отдать ответ, если запись в кэш не удалась.
              })
          );
        }

        return networkResponse;
      });
    })
  );
});
