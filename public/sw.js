// Inspecter — basit cache-first service worker. Uygulama tamamen statik ve
// sunucu tarafı yok, bu yüzden "önce ağ" yerine "önce önbellek" tercih edildi:
// araçlar bir kere açıldıktan sonra internetsiz de çalışsın. Sürüm numarasını
// artırmak eski önbelleği temizler — bu, tek cache-busting mekanizmasıdır.
const CACHE = 'inspecter-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      const network = fetch(event.request)
        .then((res) => {
          if (res.ok) cache.put(event.request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached ?? network;
    }),
  );
});
