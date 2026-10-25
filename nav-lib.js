// Navigatie en laadtokens: pure logica, zonder DOM. Browser: window.IfNav; tests: require.
// Hash-routes (geen server nodig): #/artikel/<slug> opent een artikel, #/nieuws, #/forum, #/profiel en #/zoek
// openen een hoofdscherm. Alles anders (ook een kapotte of onbekende hash) valt terug op de hub.
(function (root) {
  var TOP = { nieuws: "nieuws", forum: "gem", profiel: "acc", zoek: "zoek", modules: "mod" };
  var NAAR_HASH = { nieuws: "nieuws", gem: "forum", acc: "profiel", zoek: "zoek", mod: "modules" };
  var SLUG = /^[a-z0-9][a-z0-9_-]*$/;

  // "#/artikel/mijn-slug" -> {soort:"artikel", slug}; "#/nieuws" -> {soort:"scherm", scherm:"nieuws"}; anders {soort:"hub"}.
  function parseHash(hash) {
    var h = String(hash || "").replace(/^#/, "");
    if (h.charAt(0) !== "/") return { soort: "hub" };
    var delen = h.slice(1).split("?")[0].split("/").filter(Boolean);
    if (delen[0] === "artikel" && delen.length === 2) {
      var s = delen[1];
      try { s = decodeURIComponent(s); } catch (e) { return { soort: "hub" }; }
      s = s.toLowerCase();
      return SLUG.test(s) ? { soort: "artikel", slug: s } : { soort: "hub" };
    }
    if (delen.length === 1 && Object.prototype.hasOwnProperty.call(TOP, delen[0])) return { soort: "scherm", scherm: TOP[delen[0]] };
    return { soort: "hub" };
  }

  // Hash voor een toestand: {screen, artSlug}. Hub en diepe schermen zonder eigen route: lege hash (de hub).
  function bouwHash(t) {
    if (t && t.screen === "artikel" && t.artSlug && SLUG.test(t.artSlug)) return "#/artikel/" + t.artSlug;
    if (t && Object.prototype.hasOwnProperty.call(NAAR_HASH, t.screen)) return "#/" + NAAR_HASH[t.screen];
    return "";
  }

  // Deelbare link naar een artikel in de app.
  function deelUrl(oorsprong, slug) {
    return String(oorsprong || "https://infopoche.fr").replace(/\/+$/, "") + "/#/artikel/" + slug;
  }

  // Een scherm met een eigen hash op het hoogste niveau (tabs); daaronder komt een geschiedenisregel.
  function isTop(t) {
    return !!t && !t.blad && (t.screen === "hub" || t.screen === "zoek" || t.screen === "gem" || t.screen === "acc" || t.screen === "mod" ||
      (t.screen === "nieuws" && !t.nwTegel && !t.nwTerug));
  }

  // Sleutel van wat de lezer ziet (scherm, onderdeel, blad). Verandert die, dan hoort er een geschiedenisregel bij.
  function navKey(t) {
    t = t || {};
    return [t.screen, t.artSlug || "", t.gzHfd || "", t.gzOnd || "", t.gzLijst == null ? "" : t.gzLijst, t.onStap == null ? "" : t.onStap, t.nwTegel || "",
      t.sc || "", t.themaId || "", t.toolId || "", t.blad || ""].join("|");
  }

  // Laadtoken: elke nieuwe aanvraag krijgt een nummer; alleen het laatste nummer mag het scherm nog bijwerken.
  // Los van state, dus ook als setState nog in de wachtrij staat (schermovergang) klopt het.
  function maakTeller() {
    var n = 0;
    return { volgende: function () { return ++n; }, actueel: function (t) { return t === n; }, huidig: function () { return n; } };
  }

  // Zoekterm voor de Infofrankrijk-artikelen: minimaal 3 tekens, ingekort, URL-veilig.
  function artikelZoekUrl(term) {
    var t = String(term || "").trim().replace(/\s+/g, " ").slice(0, 80);
    if (t.length < 3) return null;
    return "https://infofrankrijk.com/wp-json/wp/v2/search?search=" + encodeURIComponent(t) + "&per_page=8&_fields=title,url,subtype";
  }
  // Antwoord van de zoek-API naar bruikbare treffers {titel, url}. Alleen echte berichten en pagina's.
  function artikelTreffers(data) {
    if (!Array.isArray(data)) return [];
    var uit = [], gezien = {};
    data.forEach(function (x) {
      if (!x || typeof x.url !== "string") return;
      if (x.subtype && x.subtype !== "post" && x.subtype !== "page") return;
      var titel = String(x.title || "").replace(/<[^>]*>/g, "").replace(/&#8217;|&rsquo;/g, "’").replace(/&#8211;|&ndash;/g, "–")
        .replace(/&amp;/g, "&").replace(/&#038;/g, "&").replace(/&#8220;|&#8221;/g, '"').replace(/&nbsp;/g, " ").trim();
      if (!titel || gezien[x.url]) return;
      gezien[x.url] = true;
      uit.push({ titel: titel, url: x.url });
    });
    return uit;
  }

  var api = { parseHash: parseHash, bouwHash: bouwHash, deelUrl: deelUrl, isTop: isTop, navKey: navKey, maakTeller: maakTeller,
    artikelZoekUrl: artikelZoekUrl, artikelTreffers: artikelTreffers };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.IfNav = api;
})(typeof window !== "undefined" ? window : globalThis);
