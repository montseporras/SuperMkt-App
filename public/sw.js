// Service worker de "Compras de casa": permite abrir la app sin conexión.
// - Archivos estáticos de Next (/_next/static, íconos): caché primero.
// - Páginas (navegación): red primero y, si no hay red, la última copia guardada.
// - /api nunca se cachea aquí: los datos offline los guarda la propia app en el dispositivo.
const VERSION = "v2";
const STATIC = `static-${VERSION}`;
const PAGES = `pages-${VERSION}`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => ![STATIC, PAGES].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone(); // se clona antes de entregar la respuesta
            e.waitUntil(caches.open(PAGES).then((c) => c.put(req, copy)));
          }
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match("/")) || Response.error()),
    );
  }
});
