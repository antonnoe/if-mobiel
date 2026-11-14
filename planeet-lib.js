// De planeet "Alles in InfoPoche" onder de sterrenkaart (11 november 2026): de indeling van alle functies van de app over
// zeven manen, de posities van planeet, manen en satellieten, en de maten van het sterrenveld. Gewone JavaScript, geen
// buildstap: index.html laadt dit met een script-tag (window.IfPl) en de tests laden het met require. Niets hier raakt het
// netwerk of localStorage. De indeling komt uit modules.json (blok `planeet` en de velden `maan` en `bron` van een module).
(function (root) {
  // Kleuren van de bronnen zoals in de sterrenkaart; `ip` is de app zelf (profiel, instellingen).
  var BRONNEN = {
    if: { id: "if", naam: "Infofrankrijk", kleur: "#2f6b3d" },
    nl: { id: "nl", naam: "Nederlanders.fr", kleur: "#800000" },
    ng: { id: "ng", naam: "Nedergids", kleur: "#1F4E8C" },
    cc: { id: "cc", naam: "Café Claude", kleur: "#8A5A2B" },
    ip: { id: "ip", naam: "InfoPoche", kleur: "#5F6669" }
  };
  var BRON_VOLGORDE = ["if", "nl", "ng", "cc", "ip"];
  // Bestemmingen van een scherm of menu-onderdeel dat geen module is; de app kent voor elk een open-functie (plOpen).
  var DOELEN = ["gemeente", "hygiene", "meldingen", "infofr", "sponsors", "werkwijze", "acc", "keuze", "over", "mod", "dossierdemo", "feedback", "installeer", "postcode"];
  var ID = /^[a-z0-9-]{1,30}$/;
  var PLID = "planeet"; // waarde van state.skOnd zolang de lezer op de planeet is

  // Maten van het sterrenveld (px). Eén plek: index.html bouwt zijn stijlen hieruit en de test controleert er de overlap mee.
  var VELD = {
    minHoogte: 660,        // hoogte van het veld (groeit mee met een hoog scherm)
    zonTop: 72,            // bovenrand van het vlak van de zonnen (onder de kop)
    zonOnder: 232,         // onderrand van dat vlak, gemeten vanaf de onderkant van het veld
    zonD: 84,              // diameter van een zon
    zweef: 8,              // ruimte die de zweefbeweging van een zon nodig heeft
    planeetD: 260,         // diameter van de grote planeet op niveau 1
    planeetZichtbaar: 190  // hoeveel daarvan boven de onderrand van het veld uitkomt
  };
  // Niveau 2: manen op een ellips rond de planeet. Hoogte van het veld op dat niveau is minimaal minHoogte.
  var MAAN = { d: 86, rx: 112, ry: 205, planeetD: 112, binnenR: 84, zweef: 3 };

  function tekst(v, max) {
    if (typeof v !== "string") return "";
    // Lange streepjes zijn nergens toegestaan in zichtbare tekst: een komma ervoor in de plaats.
    var s = v.replace(/\s*[–—]\s*/g, ", ").replace(/\s+/g, " ").trim();
    return s.length > (max || 200) ? "" : s;
  }
  function httpsUrl(v) {
    if (typeof v !== "string") return null;
    var u;
    try { u = new URL(v); } catch (e) { return null; }
    return u.protocol === "https:" && u.hostname ? u.href : null;
  }

  // Het blok `planeet` uit modules.json. Alles wat niet klopt valt weg; dubbele id's ook. Geen manen: leeg resultaat.
  function leesPlaneet(raw) {
    var uit = { manen: [], schermen: [], standaard: "", onderwerpen: null };
    if (!raw || typeof raw !== "object") return uit;
    var gezien = {};
    (Array.isArray(raw.manen) ? raw.manen : []).forEach(function (m) {
      if (!m || typeof m !== "object" || !ID.test(String(m.id || "")) || gezien[m.id]) return;
      var naam = tekst(m.naam, 40);
      if (!naam) return;
      gezien[m.id] = true;
      uit.manen.push({ id: m.id, naam: naam, uitleg: tekst(m.uitleg, 220) });
    });
    var ids = uit.manen.map(function (m) { return m.id; });
    uit.standaard = ids.indexOf(raw.standaard) >= 0 ? raw.standaard : (ids.indexOf("reken") >= 0 ? "reken" : ids[ids.length - 1] || "");
    var sz = {};
    (Array.isArray(raw.schermen) ? raw.schermen : []).forEach(function (s) {
      if (!s || typeof s !== "object" || !ID.test(String(s.id || "")) || sz[s.id] || ids.indexOf(s.maan) < 0) return;
      var titel = tekst(s.titel, 80), doel = null;
      if (!titel) return;
      if (DOELEN.indexOf(s.doel) >= 0) doel = { soort: "scherm", waarde: s.doel };
      else if (typeof s.url === "string" && httpsUrl(s.url)) doel = { soort: "url", waarde: httpsUrl(s.url) };
      if (!doel) return;
      sz[s.id] = true;
      uit.schermen.push({ id: s.id, maan: s.maan, titel: titel, regel: tekst(s.regel, 160), bron: BRONNEN[s.bron] ? s.bron : "ip", doel: doel, groep: tekst(s.groep, 40) });
    });
    var o = raw.onderwerpen;
    if (o && typeof o === "object" && ids.indexOf(o.maan) >= 0) uit.onderwerpen = { maan: o.maan, groep: tekst(o.groep, 40) };
    return uit;
  }

  // De indeling. data = leesPlaneet(...). opt: modules (alle uit modules.json), themas, zichtbaar(m) (standaard:
  // zichtbaar niet false), geinstalleerd (dan valt "Zet op je beginscherm" weg: geen knop zonder bestemming).
  // Geeft {manen:[{id, naam, uitleg, aantal, items, groepen:[{titel, items}]}], totaal}. Een maan zonder functies valt weg.
  function bouw(data, opt) {
    opt = opt || {};
    var zicht = typeof opt.zichtbaar === "function" ? opt.zichtbaar : function (m) { return m.zichtbaar !== false; };
    var themas = Array.isArray(opt.themas) ? opt.themas : [];
    var perMaan = {};
    data.manen.forEach(function (m) { perMaan[m.id] = []; });
    var gezien = {};
    function zet(maan, item) {
      if (!perMaan[maan] || gezien[item.id]) return;
      gezien[item.id] = true;
      item.maan = maan;
      perMaan[maan].push(item);
    }
    var themaNaam = {};
    themas.forEach(function (t) { themaNaam[t.id] = t.naam; });
    (Array.isArray(opt.modules) ? opt.modules : []).forEach(function (m) {
      if (!m || !m.id || !zicht(m)) return;
      var maan = perMaan[m.maan] ? m.maan : (m.ai === "tool" && perMaan.ai ? "ai" : data.standaard);
      var groep = maan === data.standaard ? (themaNaam[m.thema] || "") : "";
      zet(maan, { id: "module:" + m.id, soort: "module", titel: String(m.naam || ""), regel: tekst(m.meta, 220), bron: BRONNEN[m.bron] ? m.bron : "if",
        doel: { soort: "module", waarde: m.id }, groep: groep });
    });
    data.schermen.forEach(function (s) {
      if (opt.geinstalleerd && s.doel.waarde === "installeer") return;
      zet(s.maan, { id: "scherm:" + s.id, soort: "scherm", titel: s.titel, regel: s.regel, bron: s.bron, doel: s.doel, groep: s.groep });
    });
    if (data.onderwerpen) {
      themas.forEach(function (t) {
        if (!t || !t.id || !t.naam) return;
        zet(data.onderwerpen.maan, { id: "thema:" + t.id, soort: "thema", titel: t.naam, regel: tekst(t.wat, 200), bron: "ip", doel: { soort: "thema", waarde: t.id }, groep: data.onderwerpen.groep });
      });
    }
    var thVolgorde = themas.map(function (t) { return t.naam; });
    var manen = data.manen.map(function (m) {
      var items = perMaan[m.id];
      // Groepen: eerst items zonder groep (in catalogusvolgorde), dan de groepen zoals het thema of de data ze noemt.
      var namen = [], idx = {};
      items.forEach(function (it) { if (idx[it.groep] == null) { idx[it.groep] = namen.length; namen.push(it.groep); } });
      namen.sort(function (a, b) {
        if (a === b) return 0;
        if (a === "") return -1;
        if (b === "") return 1;
        var ia = thVolgorde.indexOf(a), ib = thVolgorde.indexOf(b);
        if (ia >= 0 && ib >= 0) return ia - ib;
        return idx[a] - idx[b];
      });
      var groepen = namen.map(function (n) { return { titel: n, items: items.filter(function (it) { return it.groep === n; }) }; });
      return { id: m.id, naam: m.naam, uitleg: m.uitleg, aantal: items.length, items: items, groepen: groepen };
    }).filter(function (m) { return m.aantal > 0; });
    return { manen: manen, totaal: manen.reduce(function (n, m) { return n + m.aantal; }, 0) };
  }

  function aantalTekst(n) { return n === 1 ? "1 functie" : n + " functies"; }
  function totaalTekst(n) { return "alle " + n + " functies, op een rij"; }

  // Legenda: alleen de bronnen die in deze lijst voorkomen.
  function legenda(items) {
    var heeft = {};
    (items || []).forEach(function (it) { heeft[it.bron] = true; });
    return BRON_VOLGORDE.filter(function (b) { return heeft[b]; }).map(function (b) { return BRONNEN[b]; });
  }

  // Hoogte van het veld op een scherm van `schermHoogte` px (zelfde formule als de sterrenkaart: groeit mee, nooit lager dan minHoogte).
  function veldHoogte(schermHoogte) { return Math.max(VELD.minHoogte, (schermHoogte || 0) - 255); }
  // Hoogte van het vlak waarin de zonnen staan (percentages van x en y gelden binnen dit vlak).
  function zonVlak(veldH) { return veldH - VELD.zonTop - VELD.zonOnder; }

  // Posities (px, relatief aan het midden van het veld, x naar rechts, y naar beneden) van n manen op de ellips, vanaf boven
  // met de klok mee. Bij een kleiner veld krimpen rx en ry mee, zodat geen maan buiten het veld valt.
  function maanPosities(n, breedte, hoogte) {
    n = Math.max(0, Math.min(9, Math.floor(n || 0)));
    var rx = Math.min(MAAN.rx, breedte / 2 - MAAN.d / 2 - MAAN.zweef - 9);
    var ry = Math.min(MAAN.ry, hoogte / 2 - MAAN.d / 2 - 66);
    var uit = [];
    for (var i = 0; i < n; i++) {
      var a = (i * 360 / n) * Math.PI / 180;
      uit.push({ x: Math.round(rx * Math.sin(a)), y: Math.round(-ry * Math.cos(a)) });
    }
    return { rx: rx, ry: ry, posities: uit };
  }

  // Gouden stipjes (satellieten) als versiering: op de binnenbaan en op de buitenbaan, alleen waar geen maan of planeet is.
  // Deterministisch (geen toevalsgetallen). Geeft hooguit `max` punten.
  function satellieten(maan, max) {
    var kand = [], i, a;
    for (i = 0; i < 18; i++) { a = (i * 20 + 10) * Math.PI / 180; kand.push({ x: MAAN.binnenR * Math.sin(a), y: -MAAN.binnenR * Math.cos(a) }); }
    for (i = 0; i < 16; i++) { a = (i * 22.5 + 11) * Math.PI / 180; kand.push({ x: maan.rx * Math.sin(a), y: -maan.ry * Math.cos(a) }); }
    var vrij = kand.filter(function (p) {
      if (Math.sqrt(p.x * p.x + p.y * p.y) < MAAN.planeetD / 2 + 12) return false;
      return maan.posities.every(function (m) { return Math.sqrt((p.x - m.x) * (p.x - m.x) + (p.y - m.y) * (p.y - m.y)) >= MAAN.d / 2 + 14; });
    });
    var stap = Math.max(1, Math.ceil(vrij.length / (max || 9)));
    return vrij.filter(function (p, k) { return k % stap === 0; }).slice(0, max || 9).map(function (p, k) {
      return { x: Math.round(p.x), y: Math.round(p.y), d: k % 3 === 0 ? 8 : 6, t: Math.round((2.6 + (k * 0.7) % 2.4) * 10) / 10, v: Math.round((k * 0.6 % 3) * 10) / 10 };
    });
  }

  // Kleine decoratieve maantjes rond de grote planeet op niveau 1: x en y in procenten van de veldbreedte, y in px boven de onderrand.
  // Ze staan in de ruimte tussen de zonnen en de planeet.
  var DECO = [{ x: 20, boven: 196, d: 12 }, { x: 88, boven: 200, d: 10 }, { x: 95, boven: 130, d: 14 }, { x: 6, boven: 150, d: 9 }];

  var api = {
    BRONNEN: BRONNEN, BRON_VOLGORDE: BRON_VOLGORDE, DOELEN: DOELEN, PLID: PLID, VELD: VELD, MAAN: MAAN, DECO: DECO,
    leesPlaneet: leesPlaneet, bouw: bouw, aantalTekst: aantalTekst, totaalTekst: totaalTekst, legenda: legenda,
    veldHoogte: veldHoogte, zonVlak: zonVlak, maanPosities: maanPosities, satellieten: satellieten
  };
  root.IfPl = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
