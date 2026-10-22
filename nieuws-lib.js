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

  return { maakItems: maakItems, tegelsUitApi: tegelsUitApi, sorteerOpAantal: sorteerOpAantal, sorteerOpDatum: sorteerOpDatum,
    stripSelectie: stripSelectie, tegelsVoorThema: tegelsVoorThema, stripAlleDoel: stripAlleDoel,
    nieuwsIdsVoorThema: nieuwsIdsVoorThema, huidigIndex: huidigIndex, nVanN: nVanN, alineas: alineas };
});
