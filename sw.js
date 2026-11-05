const C = "jonction-v3";
const FICHIERS = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png", "logo.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(C).then(c => c.addAll(FICHIERS))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(copie => {
    const reseau = fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; }).catch(() => copie);
    return copie || reseau;
  }));
});
