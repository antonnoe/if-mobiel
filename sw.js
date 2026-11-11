// Service worker van Infopoche: netwerk eerst, de cache is alleen een terugval als het netwerk haperkt.
// Verhoog VERSIE bij een wijziging van deze lijst; bij activate gaan oude caches weg.
const VERSIE = "2026-11-11-4";
const CACHE = "infopoche-" + VERSIE;
const SCHIL = [
  "./", "./index.html", "./support.js", "./dossier.js", "./nav-lib.js", "./artikel-lib.js", "./abonnee-lib.js", "./landing-lib.js", "./versie-lib.js", "./lamaison-lib.js", "./nieuws-lib.js", "./sponsors-lib.js", "./advertenties-lib.js", "./hygiene-lib.js", "./gemeente-lib.js", "./klusarchief-lib.js", "./brief-lib.js", "./kalender-lib.js", "./infofr-lib.js", "./sterrenkaart-lib.js", "./feedback-lib.js", "./meldingen-lib.js", "./hub-lib.js", "./ondernemen-lib.js", "./sponsors.json",
  "./modules.json", "./manifest.webmanifest",
  "./vendor/react.production.min.js", "./vendor/react-dom.production.min.js",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png", "./icons/logo-goud.svg", "./icons/qr-infopoche.svg",
  "./sponsors/loginfrance.png", "./sponsors/interfrance.png", "./sponsors/nvlr-1.png", "./sponsors/nvlr-2.png", "./sponsors/nvlr-3.png", "./sponsors/cmunf.png",
  "./sponsors/frankrijkkeuring.jpg", "./sponsors/caderonne-1.png", "./sponsors/caderonne-2.png", "./sponsors/caderonne-3.png", "./sponsors/caderonne-4.png", "./sponsors/caderonne-5.png"
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
  if (url.pathname.indexOf("/api/") === 0) return; // tussenlaag: nooit uit de cache, een verouderd antwoord is erger dan een melding
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

// Pushmeldingen bij deadlines uit Kalender Frankrijk (zie meldingen-lib.js en de Edge Function infopoche-push-zend).
// De server stuurt {b: tekst, id: item-id, tag}; een tik opent dat item in de kalender, of focust de al open app.
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = {}; }
  const tekst = typeof d.b === "string" && d.b ? d.b.slice(0, 200) : "Er is een nieuwe herinnering in de kalender.";
  const id = typeof d.id === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(d.id) ? d.id : "";
  const tag = typeof d.tag === "string" && d.tag ? d.tag.slice(0, 120) : "kalender";
  e.waitUntil(self.registration.showNotification("InfoPoche", { body: tekst, icon: "./icons/icon-192.png", badge: "./icons/icon-192.png", tag, data: { id } }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const id = e.notification.data && e.notification.data.id;
  const url = new URL(id ? "./#/kalender/" + id : "./#/kalender", self.registration.scope).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lijst) => {
      const open = lijst.find((c) => c.url.indexOf(self.registration.scope) === 0);
      if (open) {
        return open.navigate(url).then((c) => (c || open).focus()).catch(() => open.focus());
      }
      return self.clients.openWindow(url);
    })
  );
});
