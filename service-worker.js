
const CACHE_NAME = "misi-wira-sihat-v1";

// Fail asas yang perlu tersedia ketika offline.
const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json"
];

// Pasang service worker dan simpan fail aplikasi.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

// Aktifkan versi baharu dan bersihkan cache lama.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) =>
              key.startsWith("misi-wira-sihat-") &&
              key !== CACHE_NAME
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Cuba rangkaian dahulu; gunakan cache jika offline.
self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Abaikan permintaan daripada domain luar.
  if (url.origin !== self.location.origin) return;

  // Navigasi website: cuba rangkaian, kemudian cache.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) =>
                cache.put("./index.html", copy)
              );
          }
          return response;
        })
        .catch(async () => {
          return (
            await caches.match(request) ||
            await caches.match("./index.html") ||
            await caches.match("./")
          );
        })
    );
    return;
  }

  // Fail lain: cache dahulu, kemudian rangkaian.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
