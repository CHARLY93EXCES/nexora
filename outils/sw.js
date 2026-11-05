// Service worker de l'outil de licences : il fonctionne aussi sans internet.
const VERSION = 'nexora-licences-1.0.0';
const FICHIERS = ['./licence.html', './manifest.webmanifest', './icones/licences-192.png', './icones/licences-512.png', './icones/licences-maskable-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const cle of await caches.keys()) if (cle !== VERSION) await caches.delete(cle);
    await self.clients.claim();
  })());
});

// Réseau d'abord (pour avoir la dernière version), cache si hors ligne.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    try {
      const rep = await fetch(e.request);
      if (rep.ok) (await caches.open(VERSION)).put(e.request, rep.clone());
      return rep;
    } catch (err) {
      return (await caches.match(e.request, { ignoreSearch: true })) || (await caches.match('./licence.html'));
    }
  })());
});
