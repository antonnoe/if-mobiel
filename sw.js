// Service worker van Infopoche: netwerk eerst, de cache is alleen een terugval als het netwerk haperkt.
// Verhoog VERSIE bij een wijziging van deze lijst; bij activate gaan oude caches weg.
const VERSIE = "2026-10-25-4";
const CACHE = "infopoche-" + VERSIE;
const SCHIL = [
  "./", "./index.html", "./support.js", "./dossier.js", "./nav-lib.js", "./artikel-lib.js", "./abonnee-lib.js", "./landing-lib.js", "./lamaison-lib.js", "./nieuws-lib.js",
  "./modules.json", "./manifest.webmanifest",
  "./vendor/react.production.min.js", "./vendor/react-dom.production.min.js",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png", "./icons/logo-goud.svg", "./icons/qr-infopoche.svg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(SCHIL.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Alles van andere herkomst (nlfr-menu, nlfr-berichten, if-plek, WordPress, fonts) gaat ongemoeid door.
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js") return;
  if (req.headers.has("range")) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && res.type === "basic") {
          const kopie = res.clone();
          caches.open(CACHE).then((c) => c.put(req, kopie)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("./index.html") : undefined))
          .then((hit) => hit || Response.error())
      )
  );
});
