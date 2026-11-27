// Startpagina "thuiskomen" (27-11-2026): pure logica voor de hub. Geen DOM, geen netwerk (de aanroepen staan in index.html).
//  - letOp: het blok "Let op" (hooguit 2 deadlines uit de band van Kalender Frankrijk, aangevuld met berichten van
//    nieuws.infofrankrijk.com met signaal wetswijziging of kans, hooguit 14 dagen oud, samen hooguit 3)
//  - forumMeta, naamVoorKomma: de regel onder een forumbericht
//  - ifTeller: "<N> artikelen en <M> instrumenten", of de terugval zonder getallen
//  - nedergidsTekst: titel en subregel van de Nedergids-regel
//  - ifTegels: de vier tegels van het Infofrankrijk-blok uit modules.json
(function (root) {
  "use strict";

  var MAX_LET_OP = 3, MAX_DEADLINES = 2, MAX_DAGEN = 14, DAG_MS = 86400000;
  var SIGNALEN = { wetswijziging: "Wetswijziging", kans: "Kans" };
  var VOET_LINKS = "Alles in InfoPoche ›";
  var VOET_RECHTS = "InfoPoche · Frankrijk op zak";
  var IF_TERUGVAL = "Alle artikelen en instrumenten van Infofrankrijk";
  var IF_SUB = "zoeken, per onderwerp, nieuwste eerst";
  var NG_SUB = "praktische adressen en diensten bij jou in de buurt";
  var NG_ZONDER_PC = "Nedergids: adressen bij jou";

  function schoon(t) { return String(t == null ? "" : t).replace(/\s+[—–]\s+/g, ", ").replace(/\s+/g, " ").trim(); }

  // Welke signaalwaarde telt? Een tekst ("wetswijziging") of een object met waarde of soort. Alles anders: "".
  function signaalSleutel(s) {
    var v = s;
    if (v && typeof v === "object") v = v.waarde != null ? v.waarde : v.soort;
    v = String(v == null ? "" : v).trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(SIGNALEN, v) ? v : "";
  }

  // deadlines: de regels uit IfKal.bandRegels (met veld soort); nieuws: items uit IfNv.lees (met veld signaal, datum als ISO).
  // Geeft hooguit 3 regels: eerst de deadlines (soort vandaag of aftelling, hooguit 2), daarna nieuws tot er 3 staan.
  function letOp(deadlines, nieuws, nu) {
    var t0 = typeof nu === "number" ? nu : Date.now(), uit = [];
    (Array.isArray(deadlines) ? deadlines : []).forEach(function (r) {
      if (!r || r.feest || uit.length >= MAX_DEADLINES) return;
      if (r.soort !== "vandaag" && r.soort !== "aftelling") return;
      if (!r.id || !r.voor || !r.tekst) return;
      uit.push({ type: "deadline", voor: String(r.voor), tekst: String(r.tekst), id: r.id });
    });
    var nw = (Array.isArray(nieuws) ? nieuws : []).filter(function (b) {
      if (!b || !b.id || !b.titel || !b.url) return false;
      if (!signaalSleutel(b.signaal)) return false;
      var d = Date.parse(b.datum);
      if (!isFinite(d)) return false;
      return t0 - d <= MAX_DAGEN * DAG_MS && d - t0 <= DAG_MS;
    }).sort(function (a, b) { return (Date.parse(b.datum) || 0) - (Date.parse(a.datum) || 0); });
    nw.forEach(function (b) {
      if (uit.length >= MAX_LET_OP) return;
      uit.push({ type: "nieuws", label: SIGNALEN[signaalSleutel(b.signaal)], tekst: schoon(b.titel), id: b.id, url: b.url || "" });
    });
    return uit.slice(0, MAX_LET_OP);
  }

  // Het deel van een naam voor de eerste komma ("Anton Noë, beheerder" wordt "Anton Noë").
  function naamVoorKomma(naam) {
    var n = String(naam == null ? "" : naam).split(",")[0].replace(/\s+/g, " ").trim();
    return n || "een lid";
  }
  function commentaren(n) { return n === 1 ? "1 commentaar" : n + " commentaren"; }
  // "Door <naam> · N commentaren" of, bij 0 reacties, "Door <naam> · <wanneer>" (wanneer = bijvoorbeeld "3 uur geleden").
  function forumMeta(auteur, n, wanneer) {
    var d = "Door " + naamVoorKomma(auteur), k = typeof n === "number" && n > 0 ? n : 0, w = schoon(wanneer);
    if (k > 0) return d + " · " + commentaren(k);
    return w ? d + " · " + w : d;
  }

  function groep(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function geldigAantal(n) { return typeof n === "number" && isFinite(n) && n > 0 && Math.floor(n) === n; }
  // n = aantal artikelen (header X-WP-Total), m = aantal instrumenten (modules met bron if). Zonder bruikbaar n de terugval zonder getallen.
  function ifTeller(n, m) {
    if (!geldigAantal(n)) return IF_TERUGVAL;
    var a = groep(n) + (n === 1 ? " artikel" : " artikelen");
    if (!geldigAantal(m)) return a;
    return a + " en " + groep(m) + (m === 1 ? " instrument" : " instrumenten");
  }
  function totaalUitHeader(v) {
    var n = parseInt(String(v == null ? "" : v).trim(), 10);
    return geldigAantal(n) ? n : null;
  }

  // Titel en subregel van de Nedergids-regel. Zonder postcode: "Nedergids: adressen bij jou". De subregel noemt geen onderwerpen.
  function nedergidsTekst(pc, plaats) {
    var ok = typeof pc === "string" && /^\d{5}$/.test(pc), p = typeof plaats === "string" ? plaats.trim() : "";
    return { titel: ok ? "Nedergids bij " + pc + (p ? " " + p : "") : NG_ZONDER_PC, sub: NG_SUB };
  }

  // De vier tegels uit modules.json (startpagina.ifTegels): titel en regel verplicht, precies een doel.
  function ifTegels(cfg) {
    var l = cfg && Array.isArray(cfg.ifTegels) ? cfg.ifTegels : [];
    return l.map(function (t) {
      if (!t || typeof t !== "object") return null;
      var titel = schoon(t.titel), regel = schoon(t.regel);
      var doel = ["scherm", "module", "thema"].filter(function (k) { return typeof t[k] === "string" && t[k]; });
      if (!titel || !regel || doel.length !== 1) return null;
      return { id: String(t.id || titel), titel: titel, regel: regel, soort: doel[0], waarde: t[doel[0]] };
    }).filter(Boolean).slice(0, 4);
  }

  var api = { MAX_LET_OP: MAX_LET_OP, MAX_DEADLINES: MAX_DEADLINES, MAX_DAGEN: MAX_DAGEN, SIGNALEN: SIGNALEN, VOET_LINKS: VOET_LINKS, VOET_RECHTS: VOET_RECHTS,
    IF_TERUGVAL: IF_TERUGVAL, IF_SUB: IF_SUB, NG_SUB: NG_SUB, NG_ZONDER_PC: NG_ZONDER_PC, signaalSleutel: signaalSleutel, letOp: letOp,
    naamVoorKomma: naamVoorKomma, forumMeta: forumMeta, ifTeller: ifTeller, totaalUitHeader: totaalUitHeader, nedergidsTekst: nedergidsTekst, ifTegels: ifTegels };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.IfStart = api;
})(typeof window !== "undefined" ? window : globalThis);
