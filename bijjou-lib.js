// "Bij jou" op het zoekscherm (ronde 3, 17-11-2026): pure functies. Geen netwerk, geen localStorage.
// index.html laadt dit bestand (window.IfBijJou) en doet zelf de aanvragen; de tests laden het met require.
// De onderwerpen (woorden, soort, titel, anker) staan in modules.json onder `bijJou`, nooit hier.
(function (root) {
  var BASIS = "https://nedergids-v2.vercel.app";
  var SOORTEN = ["zorg", "overheden", "verenigingen", "ehpad", "hygiene", "gemeente"];

  // Kleine letters, accenten weg, alles wat geen letter of cijfer is wordt een spatie.
  function normaliseer(t) {
    if (typeof t !== "string") return "";
    var s = t.toLowerCase();
    try { s = s.normalize("NFD").replace(/[̀-ͯ]/g, ""); } catch (e) {}
    return s.replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  }

  // woorden: komma-gescheiden (ook meerwoordige zinnen); zonder komma gelden losse woorden.
  function zinnen(woorden) {
    if (typeof woorden !== "string") return [];
    var delen = woorden.indexOf(",") >= 0 ? woorden.split(",") : woorden.split(/\s+/);
    var uit = [];
    delen.forEach(function (d) { var n = normaliseer(d); if (n && uit.indexOf(n) < 0) uit.push(n); });
    return uit;
  }

  function esc(t) { return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  // Woordgrens vóór en na; een meervoud op -s of -en telt mee ("huisartsen", "verenigingen" staat apart).
  function matchtZin(q, zin) {
    if (!q || !zin) return false;
    return new RegExp("(^| )" + esc(zin) + "(s|en)?( |$)").test(q);
  }

  // Het eerste onderwerp waarvan een zin in de vraag voorkomt, of null. cfg = modules.json `bijJou`.
  function vindOnderwerp(vraag, cfg) {
    var q = normaliseer(vraag);
    if (!q || q.length < 3) return null;
    var lijst = cfg && Array.isArray(cfg.onderwerpen) ? cfg.onderwerpen : [];
    for (var i = 0; i < lijst.length; i++) {
      var o = lijst[i];
      if (!o || SOORTEN.indexOf(o.soort) < 0 || typeof o.anker !== "string" || !/^[a-z]+$/.test(o.anker)) continue;
      var z = zinnen(o.woorden);
      for (var j = 0; j < z.length; j++) if (matchtZin(q, z[j])) return o;
    }
    return null;
  }

  function basisVan(cfg) {
    var b = cfg && typeof cfg.basis === "string" && /^https:\/\/[a-z0-9.-]+$/i.test(cfg.basis) ? cfg.basis : BASIS;
    return b.replace(/\/+$/, "");
  }

  // Uit het antwoord van /api/postcode?pc=: de grootste gemeente (inwonertal) als {nom, code, lat, lng}, anders null.
  function grootsteGemeente(antwoord) {
    var g = antwoord && antwoord.ok !== false && Array.isArray(antwoord.gemeenten) ? antwoord.gemeenten : [];
    var beste = null;
    g.forEach(function (x) {
      var c = x && x.centre && Array.isArray(x.centre.coordinates) ? x.centre.coordinates : null;
      if (!c || typeof c[0] !== "number" || typeof c[1] !== "number" || !isFinite(c[0]) || !isFinite(c[1])) return;
      var pop = typeof x.population === "number" && isFinite(x.population) ? x.population : 0;
      if (!beste || pop > beste.pop) beste = { nom: typeof x.nom === "string" ? x.nom : "", code: typeof x.code === "string" ? x.code : "", lat: c[1], lng: c[0], pop: pop };
    });
    return beste ? { nom: beste.nom, code: beste.code, lat: beste.lat, lng: beste.lng } : null;
  }

  function postcodeUrl(cfg, pc) {
    return /^\d{5}$/.test(pc) ? basisVan(cfg) + "/api/postcode?pc=" + pc : "";
  }

  // Aanvraag voor een onderwerp, gegeven het punt van de postcode. Leeg = niet te bouwen.
  function bronUrl(cfg, onderwerp, punt) {
    if (!onderwerp || !punt || !isFinite(punt.lat) || !isFinite(punt.lng)) return "";
    var q = "lat=" + punt.lat + "&lng=" + punt.lng;
    var b = basisVan(cfg);
    switch (onderwerp.soort) {
      case "zorg": return b + "/api/zorg?" + q;
      case "ehpad": return b + "/api/ehpad?" + q;
      case "hygiene": return b + "/api/hygiene?" + q;
      case "verenigingen": return b + "/api/verenigingen?" + q;
      case "overheden": return punt.code ? b + "/api/overheden?insee=" + encodeURIComponent(punt.code) + "&" + q : "";
      default: return "";
    }
  }

  function zoekUrl(cfg, pc, anker) {
    if (!/^\d{5}$/.test(pc)) return "";
    return basisVan(cfg) + "/zoek?postcode=" + pc + (typeof anker === "string" && /^[a-z]+$/.test(anker) ? "#" + anker : "");
  }

  var SOORT_LABELS = {
    ziekenhuis: "Ziekenhuis", ehpad: "Verpleeghuis (EHPAD)", vereniging: "Vereniging", restaurant: "Eetgelegenheid",
    mairie: "Mairie (gemeentehuis)", gendarmerie: "Gendarmerie", commissariat_police: "Politiebureau", police_municipale: "Gemeentepolitie",
    cpam: "CPAM (zorgverzekering)", caf: "CAF", sie: "Belastingkantoor bedrijven (SIE)", sip: "Belastingkantoor particulieren (SIP)",
    sous_pref: "Onderprefectuur", prefecture: "Prefectuur", france_services: "France services"
  };
  function soortLabel(it) {
    var s = it && typeof it.soort === "string" ? it.soort : "";
    if (s === "restaurant" && it.extra && typeof it.extra.activiteit === "string" && it.extra.activiteit.trim()) return it.extra.activiteit.trim();
    return SOORT_LABELS[s] || "";
  }

  // "10,5 km" of "800 m"; geen getal geeft "".
  function afstandTekst(km) {
    if (typeof km !== "number" || !isFinite(km) || km < 0) return "";
    if (km < 1) return Math.max(50, Math.round(km * 20) * 50) + " m";
    return (Math.round(km * 10) / 10).toString().replace(".", ",") + " km";
  }

  function schoon(it) {
    if (!it || typeof it !== "object" || typeof it.naam !== "string" || !it.naam.trim()) return null;
    var plaats = typeof it.plaats === "string" ? it.plaats.trim() : "";
    return {
      id: String(it.id || it.naam), naam: it.naam.trim(), soortLabel: soortLabel(it), plaats: plaats,
      afstand: afstandTekst(it.afstand_km), km: typeof it.afstand_km === "number" ? it.afstand_km : 1e9
    };
  }

  // Kies hooguit `max` items uit het antwoord van de bron, passend bij het onderwerp.
  // overheden: alleen de soorten uit onderwerp.overheid; per soort eerst de bevoegde of dichtstbijzijnde, daarna de rest.
  // verenigingen: eerst de verenigingen waarvan het werkgebied de plek dekt, anders de dichtstbijzijnde.
  function kiesItems(onderwerp, antwoord, max) {
    var n = typeof max === "number" && max > 0 ? max : 3;
    if (!onderwerp || !antwoord || antwoord.ok !== true || !Array.isArray(antwoord.items)) return [];
    var items = antwoord.items.filter(function (i) { return i && typeof i === "object"; });
    var byKm = function (a, b) { return (a.afstand_km == null ? 1e9 : a.afstand_km) - (b.afstand_km == null ? 1e9 : b.afstand_km); };
    var gekozen = [];
    if (onderwerp.soort === "overheden") {
      var soorten = Array.isArray(onderwerp.overheid) ? onderwerp.overheid : [];
      var rest = [];
      soorten.forEach(function (s) {
        var van = items.filter(function (i) { return i.soort === s; });
        van.sort(function (a, b) {
          var ba = a.extra && a.extra.bevoegd ? 0 : 1, bb = b.extra && b.extra.bevoegd ? 0 : 1;
          return ba - bb || byKm(a, b);
        });
        if (van.length) { gekozen.push(van[0]); rest = rest.concat(van.slice(1)); }
      });
      rest.sort(byKm);
      gekozen = gekozen.concat(rest);
    } else if (onderwerp.soort === "verenigingen") {
      var dekt = items.filter(function (i) { return i.extra && i.extra.dekt === true; }).sort(byKm);
      var overig = items.filter(function (i) { return !(i.extra && i.extra.dekt === true); }).sort(byKm);
      gekozen = dekt.length ? dekt : overig;
    } else {
      gekozen = items.slice().sort(byKm);
    }
    var uit = [], gezien = {};
    gekozen.forEach(function (i) {
      var s = schoon(i);
      if (s && !gezien[s.id] && uit.length < n) { gezien[s.id] = 1; uit.push(s); }
    });
    return uit;
  }

  var api = {
    BASIS: BASIS, SOORTEN: SOORTEN, normaliseer: normaliseer, zinnen: zinnen, vindOnderwerp: vindOnderwerp, grootsteGemeente: grootsteGemeente,
    postcodeUrl: postcodeUrl, bronUrl: bronUrl, zoekUrl: zoekUrl, soortLabel: soortLabel, afstandTekst: afstandTekst, kiesItems: kiesItems
  };
  root.IfBijJou = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
