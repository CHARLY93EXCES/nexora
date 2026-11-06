// Service worker : met l'application en cache pour qu'elle fonctionne sans internet.
// Changer VERSION à chaque publication pour proposer la mise à jour aux utilisateurs.
const VERSION = 'nexora-mobile-1.1.1';
const FICHIERS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './icones/icone-192.png',
  './icones/icone-512.png',
  './icones/icone-maskable-512.png',
  './icones/apple-touch-icon.png',
  './js/main.js',
  './js/nav.js',
  './js/util.js',
  './js/db.js',
  './js/modele.js',
  './js/pannes.js',
  './js/licence.js',
  './js/securite.js',
  './js/whatsapp.js',
  './js/recu.js',
  './js/sauvegarde.js',
  './js/vues/composants.js',
  './js/vues/accueil.js',
  './js/vues/reparations.js',
  './js/vues/nouvelle.js',
  './js/vues/reparation.js',
  './js/vues/diagnostic.js',
  './js/vues/clients.js',
  './js/vues/stock.js',
  './js/vues/plus.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FICHIERS.map((f) => new Request(f, { cache: 'reload' })))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const cle of await caches.keys()) if (cle !== VERSION) await caches.delete(cle);
    await self.clients.claim();
  })());
});

// La page demande l'activation de la nouvelle version (bouton « Mettre à jour »).
self.addEventListener('message', (e) => {
  if (e.data === 'activer') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    if (req.mode === 'navigate') {
      return (await cache.match('./index.html')) || fetch(req);
    }
    const trouve = await cache.match(req, { ignoreSearch: true });
    if (trouve) return trouve;
    try {
      return await fetch(req);
    } catch (err) {
      return new Response('', { status: 504, statusText: 'Hors ligne' });
    }
  })());
});
