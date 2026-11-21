/* Waymark offline support.
 * - Pages: try the network first so updates arrive straight away; offline, fall back to the saved app.
 * - Built files (/app/_expo, /app/assets, icons): their names change with every release, so the saved
 *   copy is always correct and is used first.
 * Nothing outside /app/ is touched, so payments (/api) always go to the network.
 */
// The build (tools/spa-routes.mjs) fills in the release id and every file the app needs,
// so the whole app, including screens not yet opened, works offline after the first visit.
const RELEASE = "__RELEASE__";
const PRECACHE = [] /* __PRECACHE__ */;
const CACHE = `waymark-${RELEASE}`;
const SHELL = "/app/index.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll([SHELL, "/app/manifest.json", "/app/icons/icon-192.png", ...PRECACHE])).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("waymark-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith("/app/")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(SHELL, copy));
          }
          return res;
        })
        .catch(() => caches.match(SHELL)),
    );
    return;
  }

  if (/^\/app\/(_expo|assets|icons)\//.test(url.pathname) || url.pathname.endsWith("favicon.ico")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
