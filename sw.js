// Cache de l'app pour un démarrage fiable même avec un réseau faible.
// Les appels API (adresses, routes, tuiles de carte) passent toujours par le réseau.
const CACHE = "tournee-v3";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"];
self.addEventListener("install", e => {
  // chaque fichier est mis en cache séparément : un échec n'empêche pas l'installation
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (u.origin !== location.origin && u.hostname !== "unpkg.com") return; // réseau direct pour les API
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(e.request, { ignoreSearch: true }) || (e.request.mode === "navigate" ? await cache.match("index.html") : null);
    // réseau en priorité (mises à jour), mais on n'attend pas plus de 3 s s'il y a une copie en cache
    const net = fetch(e.request).then(r => { if (r.ok) cache.put(e.request, r.clone()); return r; });
    if (!cached) return net.catch(() => new Response("Hors ligne", { status: 503 }));
    return Promise.race([net.catch(() => cached), new Promise(res => setTimeout(() => res(cached), 3000))]);
  })());
});
