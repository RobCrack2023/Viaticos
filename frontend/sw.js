const CACHE_NAME = "viaticos-v2";
const STATIC_ASSETS = [
  "/css/app.css?v=2",
  "/js/app.js",
  "/js/api.js",
  "/js/db.js",
  "/js/sync.js",
  "/js/pages/login.js",
  "/js/pages/dashboard.js",
  "/js/pages/account.js",
  "/js/pages/viatico.js",
  "/js/pages/admin.js",
  "/manifest.json",
];

const NEVER_CACHE = ["/", "/index.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // API calls: network first, fallback to queue offline
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(
      fetch(e.request.clone()).catch(() =>
        new Response(JSON.stringify({ offline: true, error: "Sin conexión" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    return;
  }

  // HTML (index) — always network first, never cache
  if (NEVER_CACHE.includes(url.pathname)) {
    e.respondWith(fetch(e.request).catch(() => caches.match("/index.html")));
    return;
  }

  // Static assets: cache first
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).then((res) => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
      return res;
    }))
  );
});

// Sync when back online
self.addEventListener("sync", (e) => {
  if (e.tag === "sync-pending") {
    e.waitUntil(
      self.clients.matchAll().then((clients) =>
        clients.forEach((client) => client.postMessage({ type: "SYNC_NOW" }))
      )
    );
  }
});
