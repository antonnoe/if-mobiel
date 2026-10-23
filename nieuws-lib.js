// Pure functies van het nieuwsscherm van Infopoche. Geen DOM, geen netwerk.
// Werkt in de browser (window.NieuwsLib, gewone <script>) en in node (require/import).
(function (root, fabriek) {
  if (typeof module === "object" && module.exports) module.exports = fabriek();
  else root.NieuwsLib = fabriek();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Een lijst API-artikelen naar items met een sleutel "<tegelId>/<artikelId>" (zo staat ook de tekstlevering).
  function maakItems(t, lijst) {
    const items = [];
    (lijst || []).forEach(function (a) {
      if (!a) return;
      const titel = a.titel || a.title;
      if (!titel) return;
      const bm = a.bronMeta || {};
      items.push({
        key: (t.id || "") + "/" + (a.id || ""), id: a.id || "", tegelId: t.id || "", thema: t.thema || "",
        soort: a.soort || t.soort || "", titel: titel, summary: a.summary || "", label: a.label || "",
        datum: a.datum || a.date || bm.datum || "", bronNaam: bm.naam || "", bronDatum: bm.datum || "",
        bronAantal: a.bronAantal || 0, url: a.url || a.href || a.link || "", themaLabel: a.themaLabel || ""
      });
    });
    return items;
  }

  // /api/actueel levert tegels met `artikelen`; de archieftegel heeft `artikelAantal` en de
  // artikelen staan apart (/api/actueel-archief). Een tegel zonder artikelen telt niet mee.
  function tegelsUitApi(d) {
    const uit = { tegels: [], archiefAantal: null };
    ((d && d.tegels) || []).forEach(function (t) {
      if (!t) return;
      if (t.soort === "archief" || t.id === "archief") {
        const n = Number(t.artikelAantal);
        if (isFinite(n) && n > 0) uit.archiefAantal = Math.floor(n);
        return;
      }
      const items = maakItems(t, t.artikelen || t.items);
      if (items.length) uit.tegels.push({ id: t.id || t.label, thema: t.thema || "", soort: t.soort || "", label: t.label || t.titel || "Nieuws", items: items });
    });
    return uit;
  }

  // Veel naar weinig; gelijke aantallen houden de volgorde van de API. Tegels zonder berichten vallen weg.
  function sorteerOpAantal(tegels) {
    return (tegels || []).map(function (t, i) { return { t: t, i: i, n: (t.items || []).length }; })
      .filter(function (x) { return x.n > 0; })
      .sort(function (a, b) { return b.n - a.n || a.i - b.i; })
      .map(function (x) { return x.t; });
  }

  function tijd(d) { const n = Date.parse(d); return isFinite(n) ? n : 0; }

  // Nieuwste eerst; gelijke datum houdt de invoervolgorde.
  function sorteerOpDatum(items) {
    return (items || []).map(function (a, i) { return { a: a, i: i }; })
      .sort(function (x, y) { return tijd(y.a.datum) - tijd(x.a.datum) || x.i - y.i; })
      .map(function (x) { return x.a; });
  }

  // De drie (of `max`) nieuwste berichten uit de tegels die bij de API-thema's horen.
  function stripSelectie(tegels, themaIds, max) {
    const ids = themaIds || [];
    let alle = [];
    (tegels || []).forEach(function (t) { if (ids.indexOf(t.thema) >= 0) alle = alle.concat(t.items || []); });
    return sorteerOpDatum(alle).slice(0, max == null ? 3 : max);
  }

  // Tegels waar een thema uit modules.json naar wijst, in de volgorde van die lijst.
  function tegelsVoorThema(tegels, themaIds) {
    const uit = [];
    (themaIds || []).forEach(function (id) {
      (tegels || []).forEach(function (t) { if (t.thema === id && (t.items || []).length) uit.push(t); });
    });
    return uit;
  }

  // "Alle nieuws": precies een bestaande tegel, dan direct de doorlopende pagina; anders het overzicht (null).
  function stripAlleDoel(tegels, themaIds) {
    const t = tegelsVoorThema(tegels, themaIds);
    return t.length === 1 ? t[0] : null;
  }

  function nieuwsIdsVoorThema(themas, themaId) {
    const t = (themas || []).find(function (x) { return x.id === themaId; });
    return t && Array.isArray(t.nieuws) ? t.nieuws.slice() : [];
  }

  // Welk bericht staat in beeld: het laatste waarvan de bovenkant op of boven de drempel ligt (0-gebaseerd).
  function huidigIndex(tops, drempel) {
    let h = 0;
    (tops || []).forEach(function (t, i) { if (t <= drempel) h = i; });
    return h;
  }
  function nVanN(index, totaal) { return (index + 1) + " van " + totaal; }

  function alineas(tekst) {
    return String(tekst || "").split(/\n\n+/).map(function (p) { return p.trim(); }).filter(Boolean);
  }


  // ---- Themabeeld (besluit 2) ---------------------------------------------------------------------
  // Eigen illustratie per nieuwsthema: getinte vlakte, stippenraster, één pictogram in de themakleur.
  // Nooit persfoto's, nooit een externe afbeelding. Welk thema welke kleur en welk pictogram krijgt
  // staat als data in modules.json (`nieuwsBeeld`); hier staan alleen de pictogramlijnen (76x76,
  // lijndikte 4, afgeronde uiteinden) en de neutrale terugval voor een thema dat nergens staat.
  const ICONEN = {
    weg: "M30 10 20 66M46 10 56 66M38 14v8M38 32v10M38 52v10",
    hart: "M38 62C22 50 12 40 12 29 12 21 18 15 25 15 31 15 36 18 38 23 40 18 45 15 51 15 58 15 64 21 64 29 64 40 54 50 38 62zM38 28v14M31 35h14",
    land: "M62 38a24 24 0 1 1-48 0 24 24 0 1 1 48 0zM14 38h48M38 14c-12 12-12 36 0 48M38 14c12 12 12 36 0 48",
    krant: "M16 14h34v48H20a4 4 0 0 1-4-4zM50 26h10v32a4 4 0 0 1-4 4M24 24h18M24 34h18M24 44h12",
    pin: "M38 68S58 48 58 33a20 20 0 0 0-40 0c0 15 20 35 20 35zM31 33a7 7 0 1 0 14 0 7 7 0 1 0-14 0",
    munt: "M62 38a24 24 0 1 1-48 0 24 24 0 1 1 48 0zM47 28a11 11 0 1 0 0 20M29 35h15M29 42h13",
    grafiek: "M14 62V14M14 62H64M22 52 36 38 46 46 62 24M52 24H62V34",
    lijst: "M14 20l4 4 8-8M32 20h30M14 38l4 4 8-8M32 38h30M14 56l4 4 8-8M32 56h30",
    koffer: "M14 26h48v34H14zM28 26v-8h20v8M14 40h48",
    doos: "M38 10 64 22v32L38 66 12 54V22zM12 22l26 12 26-12M38 34v32",
    wet: "M38 12v50M24 62h28M16 22h44M16 22 8 40a8 8 0 0 0 16 0zM60 22l-8 18a8 8 0 0 0 16 0z",
    gebouw: "M10 30 38 12 66 30zM18 34v22M30 34v22M46 34v22M58 34v22M10 62h56",
    blad: "M14 62C14 30 30 14 62 14 62 46 46 62 14 62zM14 62 40 36",
    huis: "M12 38 38 14l26 24M18 34v28h40V34M32 62V46h12v16",
    mensen: "M30 32a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 62c0-10 8-16 18-16s18 6 18 16M52 30a8 8 0 1 0 0-16M56 46c6 2 10 8 10 16"
  };
  // Neutraal beeld voor een onbekend thema: grijs op lichtgrijs (icoon tegen tint ruim boven 3:1).
  const NEUTRAAL = { kleur: "#4B5563", tint: "#E5E7EB", icoon: "krant" };
  const HEX = /^#[0-9a-fA-F]{6}$/;

  // {kleur, tint, icoon (sleutel), d (pad), themaId, bekend}. `kaart` = modules.json `nieuwsBeeld`,
  // `themas` = modules.json `themas`. Ontbreekt iets of klopt iets niet, dan het neutrale beeld.
  function beeldVoor(themaId, kaart, themas) {
    const m = kaart && typeof kaart === "object" && Object.prototype.hasOwnProperty.call(kaart, themaId) ? kaart[themaId] : null;
    const t = m && (themas || []).find(function (x) { return x && x.id === m.thema; });
    if (!m || !t || !HEX.test(t.kleur || "") || !HEX.test(t.tint || "") || !ICONEN[m.icoon]) {
      return { kleur: NEUTRAAL.kleur, tint: NEUTRAAL.tint, icoon: NEUTRAAL.icoon, d: ICONEN[NEUTRAAL.icoon], themaId: "", bekend: false };
    }
    return { kleur: t.kleur, tint: t.tint, icoon: m.icoon, d: ICONEN[m.icoon], themaId: m.thema, bekend: true };
  }

  // Filterchips: "Alles" en dan de tegels, veel naar weinig.
  function chips(tegels) {
    return [{ id: "alles", label: "Alles" }].concat(sorteerOpAantal(tegels).map(function (t) { return { id: t.id, label: t.label }; }));
  }
  // Nieuwste eerst, een bericht dat in meer dan één tegel staat telt één keer. `max` begrenst "Alles".
  function lijstVoorFilter(tegels, filter, max) {
    const gezien = {}; let alle = [];
    (tegels || []).forEach(function (t) {
      if (filter && filter !== "alles" && filter !== t.id) return;
      (t.items || []).forEach(function (a) {
        const k = a.url || a.titel;
        if (gezien[k]) return;
        gezien[k] = true;
        alle.push(Object.assign({}, a, { tegelLabel: t.label }));
      });
    });
    alle = sorteerOpDatum(alle);
    return max ? alle.slice(0, max) : alle;
  }
  // Een filter dat niet (meer) bestaat valt terug op "alles".
  function geldigFilter(tegels, filter) {
    return filter === "alles" || (tegels || []).some(function (t) { return t.id === filter; }) ? filter : "alles";
  }
  // Uniek per item en veilig als SVG-id.
  function patroonId(prefix, index) { return String(prefix || "nwp") + "-" + index; }

  return { maakItems: maakItems, tegelsUitApi: tegelsUitApi, sorteerOpAantal: sorteerOpAantal, sorteerOpDatum: sorteerOpDatum,
    stripSelectie: stripSelectie, tegelsVoorThema: tegelsVoorThema, stripAlleDoel: stripAlleDoel,
    nieuwsIdsVoorThema: nieuwsIdsVoorThema, huidigIndex: huidigIndex, nVanN: nVanN, alineas: alineas,
    ICONEN: ICONEN, NEUTRAAL: NEUTRAAL, beeldVoor: beeldVoor, chips: chips, lijstVoorFilter: lijstVoorFilter,
    geldigFilter: geldigFilter, patroonId: patroonId };
});
