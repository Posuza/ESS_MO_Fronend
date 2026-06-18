self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Skip POST API calls — let them reach the app directly
  if (event.request.method === "POST") {
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  );
});
