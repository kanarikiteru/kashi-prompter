// ネットのない会場でも開けるようにするための仕組み。
// まず端末に保存した分をすぐ表示し、裏で新しい版を取りに行く（次回から反映）。
const CACHE = 'kashi-prompter-v1';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request, { ignoreSearch: true });
    // cache: 'no-cache' で、ブラウザの一時保存ではなく公開先に新しい版があるかを必ず確かめる
    const refresh = fetch(event.request.url, { cache: 'no-cache' }).then(res => {
      if (res.ok) cache.put(event.request, res.clone());
      return res;
    });
    if (cached) {
      refresh.catch(() => {});
      event.waitUntil(refresh.catch(() => {}));
      return cached;
    }
    return refresh;
  })());
});
