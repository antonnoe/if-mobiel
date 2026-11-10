// Sterrenkaart op het zoekscherm (10 november 2026): data lezen en valideren, antwoorden groeperen, planeetposities,
// sterren en zonmaat. Gewone JavaScript, geen buildstap: index.html laadt dit met een script-tag (window.IfSk) en de
// tests laden het met require. Niets hier raakt het netwerk of localStorage, en geen toevalsgetallen (de sterren zijn deterministisch).
(function (root) {
  var BRONNEN = {
    if: { id: "if", naam: "Infofrankrijk", kleur: "#2f6b3d" },
    nl: { id: "nl", naam: "Nederlanders.fr", kleur: "#800000" },
    ng: { id: "ng", naam: "Nedergids", kleur: "#1F4E8C" },
    cc: { id: "cc", naam: "Café Claude", kleur: "#8A5A2B" }
  };
  var BRON_VOLGORDE = ["if", "nl", "ng", "cc"];
  // Vaste volgorde van de groepen op niveau 3.
  var GROEPEN = [
    { id: "begin", titel: "Begin hier", uitleg: "" },
    { id: "stap", titel: "Stap voor stap", uitleg: "lezen" },
    { id: "reken", titel: "Reken het uit", uitleg: "tools in de app" },
    { id: "adres", titel: "Bij jouw adres", uitleg: "" },
    { id: "ervaring", titel: "Ervaringen van anderen", uitleg: "" }
  ];
  var SCHERMEN = ["gemeente", "hygiene", "kalender", "infofr", "nedergids", "gezondheid"];
  var MAX_VRAGEN = 6;
  var ARTIKEL_HOSTS = ["infofrankrijk.com", "www.infofrankrijk.com"];

  function tekst(v, max) {
    if (typeof v !== "string") return "";
    // Lange streepjes zijn nergens toegestaan in zichtbare tekst: een komma ervoor in de plaats.
    var s = v.replace(/\s*[–—]\s*/g, ", ").replace(/\s+/g, " ").trim();
    return s.length > (max || 300) ? "" : s;
  }
  function httpsUrl(v) {
    if (typeof v !== "string") return null;
    var u;
    try { u = new URL(v); } catch (e) { return null; }
    return u.protocol === "https:" && u.hostname ? u : null;
  }
  function getal(v, min, max) {
    return typeof v === "number" && isFinite(v) && v >= min && v <= max ? v : null;
  }

  // Een antwoord uit de data. Precies één doel: module, artikel, scherm of url. Onbekend of onvolledig valt weg (null).
  function leesAntwoord(a) {
    if (!a || typeof a !== "object") return null;
    var groep = String(a.groep || ""), bron = String(a.bron || "");
    if (!GROEPEN.some(function (g) { return g.id === groep; })) return null;
    if (!BRONNEN[bron]) return null;
    var doelen = ["module", "artikel", "scherm", "url"].filter(function (k) { return a[k] != null && a[k] !== ""; });
    if (doelen.length !== 1) return null;
    var soort = doelen[0], waarde = a[soort], doel = null;
    if (soort === "module") {
      if (typeof waarde !== "string" || !/^[a-z0-9_-]{1,40}$/.test(waarde)) return null;
      doel = { soort: "module", waarde: waarde };
    } else if (soort === "scherm") {
      if (SCHERMEN.indexOf(waarde) < 0) return null;
      doel = { soort: "scherm", waarde: waarde };
    } else if (soort === "artikel") {
      var ua = httpsUrl(waarde);
      if (!ua || ARTIKEL_HOSTS.indexOf(ua.hostname) < 0) return null;
      doel = { soort: "artikel", waarde: ua.href };
    } else {
      var uu = httpsUrl(waarde);
      if (!uu) return null;
      doel = { soort: "url", waarde: uu.href };
    }
    var titel = tekst(a.titel, 160);
    // Bij een module mag de titel ontbreken: de app neemt dan de naam en regel van de module zelf.
    if (!titel && soort !== "module") return null;
    return { groep: groep, bron: bron, titel: titel, regel: tekst(a.regel, 200), doel: doel };
  }

  function leesVraag(q) {
    if (!q || typeof q !== "object") return null;
    var id = String(q.id || "");
    var t = tekst(q.tekst, 80);
    if (!/^[a-z0-9-]{1,40}$/.test(id) || !t) return null;
    var antw = (Array.isArray(q.antwoorden) ? q.antwoorden : []).map(leesAntwoord).filter(Boolean);
    return { id: id, tekst: t, intro: tekst(q.intro, 400), antwoorden: antw };
  }

  function leesOnderwerp(o) {
    if (!o || typeof o !== "object") return null;
    var id = String(o.id || ""), naam = tekst(o.naam, 40);
    var x = getal(o.x, 0, 100), y = getal(o.y, 0, 100);
    if (!/^[a-z0-9-]{1,40}$/.test(id) || !naam || x == null || y == null) return null;
    var vragen = (Array.isArray(o.vragen) ? o.vragen : []).map(leesVraag).filter(Boolean).slice(0, MAX_VRAGEN);
    if (!vragen.length) return null;
    return { id: id, naam: naam, x: x, y: y, cafe: typeof o.cafe === "string" && /^[a-z]{2,20}$/.test(o.cafe) ? o.cafe : "", vragen: vragen };
  }

  // Het blok `sterrenkaart` uit modules.json. Dubbele id's vallen weg, een onbruikbaar blok geeft een lege lijst.
  function leesData(raw) {
    var lijst = raw && Array.isArray(raw.onderwerpen) ? raw.onderwerpen : [];
    var gezien = {}, uit = [];
    lijst.map(leesOnderwerp).filter(Boolean).forEach(function (o) {
      if (gezien[o.id]) return;
      gezien[o.id] = true;
      var vz = {};
      o.vragen = o.vragen.filter(function (q) { if (vz[q.id]) return false; vz[q.id] = true; return true; });
      uit.push(o);
    });
    return { onderwerpen: uit };
  }

  // Antwoorden in de vaste volgorde van de groepen. `oplos(module-id)` geeft {naam, meta} als de module getoond mag
  // worden, anders null (dan valt het antwoord weg: geen knop zonder bestemming). Van "begin" blijft er hooguit een
  // over; een tweede begin-antwoord schuift naar "Stap voor stap". Geeft alleen groepen met items.
  function groepeer(antwoorden, oplos) {
    var per = {};
    GROEPEN.forEach(function (g) { per[g.id] = []; });
    (antwoorden || []).forEach(function (a) {
      var item = { groep: a.groep, bron: a.bron, titel: a.titel, regel: a.regel, doel: a.doel };
      if (a.doel.soort === "module") {
        var m = oplos ? oplos(a.doel.waarde) : null;
        if (!m) return;
        item.titel = a.titel || m.naam || "";
        item.regel = a.regel || m.meta || "";
        if (!item.titel) return;
      }
      var g = a.groep;
      if (g === "begin" && per.begin.length) g = "stap";
      item.groep = g;
      per[g].push(item);
    });
    return GROEPEN.map(function (g) {
      return { groep: g.id, titel: g.titel, uitleg: g.uitleg, items: per[g.id] };
    }).filter(function (g) { return g.items.length > 0; });
  }

  // Aantal voor de legenda: alleen bronnen die in deze vraag voorkomen zijn niet nodig, de legenda toont altijd alle vier.
  function legenda() { return BRON_VOLGORDE.map(function (b) { return BRONNEN[b]; }); }

  // Letterkeuze van een zon (96 px breed): 14 px, tenzij het langste woord daar niet in past; dan 13 of 12 px.
  // De zon is rond; de tekst heeft ruim 70 px. Schatting: Poppins 600 is ongeveer 0,62 em per teken.
  function zonLetter(naam) {
    var woorden = String(naam || "").split(/\s+/).filter(Boolean);
    var lang = woorden.reduce(function (m, w) { return Math.max(m, w.length); }, 0);
    var kies = 14;
    [14, 13, 12].some(function (px) { kies = px; return lang * px * 0.62 <= 72; });
    return kies;
  }

  // Posities van de planeten rond het midden, in pixels ten opzichte van het midden (x naar rechts, y naar beneden).
  // De planeten staan boven en onder de zon op een ellips (rx 108, ry 170); links en rechts van de zon blijft vrij,
  // zodat een brede pil de zon niet raakt. Boven en onder krijgen elk de helft (boven het meeste bij een oneven aantal).
  var RX = 108, RY = 170;
  var HOEKEN = { 1: [0], 2: [-50, 50], 3: [-55, 0, 55] };
  function planeten(n) {
    n = Math.max(0, Math.min(MAX_VRAGEN, Math.floor(n || 0)));
    var boven = Math.ceil(n / 2), onder = n - boven;
    function rij(k, richting) {
      return (HOEKEN[k] || []).map(function (h) {
        var r = h * Math.PI / 180;
        return { x: Math.round(RX * Math.sin(r) * (richting > 0 ? 1 : -1)), y: Math.round(-richting * RY * Math.cos(r)) };
      });
    }
    // Boven: richting 1 (y negatief). Onder: richting -1 (y positief), links naar rechts gespiegeld zodat de volgorde doorloopt.
    var uit = rij(boven, 1).concat(rij(onder, -1));
    return uit.slice(0, n);
  }

  // Deterministische sterren (zonder toevalsgetallen): x en y in procenten, afmeting 2 of 3 px, flikkertijd en vertraging.
  function frac(v) { return v - Math.floor(v); }
  function sterren(n) {
    var uit = [];
    for (var i = 1; i <= n; i++) {
      var x = frac(Math.sin(i * 12.9898) * 43758.5453), y = frac(Math.sin(i * 78.233) * 24634.6345), z = frac(Math.sin(i * 39.346) * 12345.6789);
      uit.push({
        x: Math.round((2 + x * 96) * 10) / 10,
        y: Math.round((2 + y * 96) * 10) / 10,
        s: z > 0.55 ? 3 : 2,
        d: Math.round((2.4 + frac(z * 7.3) * 3.2) * 10) / 10,
        dl: Math.round(frac(x * 9.1 + y * 3.7) * 50) / 10
      });
    }
    return uit;
  }

  // Zweef- en gloeitijden per zon (7 tot 10 s, eigen vertraging), vast per volgnummer.
  function zonBeweging(i) {
    var d = [7.4, 9.1, 8.2, 9.8, 7.0, 8.6, 9.4, 7.8][i % 8];
    return { zweef: d, gloei: Math.round((d + 1.6) * 10) / 10, vertraging: Math.round((i * 0.9 % 5) * 10) / 10 };
  }

  var api = {
    BRONNEN: BRONNEN, GROEPEN: GROEPEN, SCHERMEN: SCHERMEN, MAX_VRAGEN: MAX_VRAGEN, RX: RX, RY: RY,
    leesAntwoord: leesAntwoord, leesVraag: leesVraag, leesOnderwerp: leesOnderwerp, leesData: leesData,
    groepeer: groepeer, legenda: legenda, zonLetter: zonLetter, planeten: planeten, sterren: sterren, zonBeweging: zonBeweging
  };
  root.IfSk = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
