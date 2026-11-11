// Hub: pure functies voor de begroeting, de themakleuren, de vijf tabs en de regiokaart.
// Gewone JavaScript, geen buildstap: index.html laadt dit bestand met een script-tag (window.HubLib)
// en de tests laden het met require. Geen functie hier raakt het netwerk of localStorage.
(function (root) {
  // Begroeting naar dagdeel, lokale tijd van het toestel, zonder naam.
  // 5:00 tot 12:00 ochtend, 12:00 tot 18:00 middag, de rest avond (ook 0:00 tot 4:59).
  function begroeting(date) {
    var d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
    var u = d.getHours();
    if (u >= 5 && u < 12) return "Goedemorgen";
    if (u >= 12 && u < 18) return "Goedemiddag";
    return "Goedenavond";
  }

  // Themakleuren. De bron is modules.json (themas[].kleur en .tint); dit is de terugval.
  // kleur = donkere variant (icoon, accent), tint = lichte cirkel erachter.
  var THEMA_KLEUREN = {
    geld:       { kleur: "#1B6B3A", tint: "#DDEFE3" },
    overheid:   { kleur: "#1D4F9E", tint: "#DCE6F7" },
    gezondheid: { kleur: "#B3261E", tint: "#F8DFDD" },
    adressen:   { kleur: "#6B3FA0", tint: "#E9E0F5" },
    nieuws:     { kleur: "#9E4505", tint: "#FBE5D3" },
    ervaring:   { kleur: "#775800", tint: "#F6EBC2" },
    ondernemen: { kleur: "#0E5B66", tint: "#D7EDF0" },
    wonen:      { kleur: "#800000", tint: "#F3E0E0" },
    taal:       { kleur: "#465C70", tint: "#E1E8EE" }
  };
  var HEX = /^#[0-9a-fA-F]{6}$/;
  function themaKleur(thema) {
    var id = thema && thema.id, vast = THEMA_KLEUREN[id] || { kleur: "#800000", tint: "#F3E0E0" };
    return {
      kleur: thema && HEX.test(thema.kleur || "") ? thema.kleur : vast.kleur,
      tint: thema && HEX.test(thema.tint || "") ? thema.tint : vast.tint
    };
  }

  // WCAG 2.x contrastverhouding tussen twee kleuren als #rrggbb.
  function luminantie(hex) {
    var c = [1, 3, 5].map(function (i) {
      var v = parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrast(a, b) {
    var l1 = luminantie(a), l2 = luminantie(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  // De vijf tabs, gelijke plekken. icon verwijst naar een sleutel in ICONS (index.html).
  var TABS = [
    { id: "hub", label: "Home", icon: "hub" },
    { id: "zoek", label: "Zoeken", icon: "zoek" },
    { id: "mod", label: "Modules", icon: "mod" },
    { id: "gem", label: "Forum", icon: "gem" },
    { id: "nieuws", label: "Nieuws", icon: "act" }
  ];
  // Bij welke tab hoort een scherm? Alles wat niet apart genoemd is hoort bij Home (themaschermen, taal,
  // regio, AI-tools, dossier). Alle modules en Mijn modules horen bij Modules; een draad hoort bij Forum.
  // Profiel en Over ons staan in het hamburgermenu en markeren geen tab (lege tekst).
  function tabVan(screen) {
    if (screen === "zoek") return "zoek";
    if (screen === "mod" || screen === "keuze" || screen === "tool" || screen === "tekoop" || screen === "klusarchief" || screen === "kalender" || screen === "linklijst" || screen === "brief") return "mod";
    if (screen === "gem" || screen === "draad") return "gem";
    if (screen === "nieuws") return "nieuws";
    if (screen === "acc" || screen === "over" || screen === "piramide" || screen === "sponsors" || screen === "meldingen") return "";
    return "hub";
  }

  // Regiokaart op de hub.
  function postcodeOk(pc) { return typeof pc === "string" && /^\d{5}$/.test(pc); }
  function regioLabel(pc, plaats) {
    if (!postcodeOk(pc)) return "Mijn gemeente: stel je postcode in";
    var p = typeof plaats === "string" ? plaats.trim() : "";
    return "Mijn gemeente: " + pc + (p ? " " + p : "");
  }
  // Departementscode uit de postcode: 97x en 98x hebben drie cijfers, de rest twee.
  function departementCode(pc) {
    if (!postcodeOk(pc)) return "";
    return /^9[78]/.test(pc) ? pc.slice(0, 3) : pc.slice(0, 2);
  }
  // Antwoord van geo.api.gouv.fr/communes?codePostal=..: een lijst gemeenten. Bij meer dan een
  // gemeente met dezelfde postcode kiest dit de grootste (veld population), anders de eerste.
  // Elke onverwachte vorm geeft "" (dan toont de kaart alleen de postcode).
  function plaatsUitApi(json) {
    if (!Array.isArray(json)) return "";
    var best = null;
    json.forEach(function (c) {
      if (!c || typeof c.nom !== "string" || !c.nom.trim()) return;
      if (!best || (typeof c.population === "number" && c.population > (best.population || 0))) best = c;
    });
    return best ? best.nom.trim() : "";
  }
  function plaatsUrl(pc) {
    return "https://geo.api.gouv.fr/communes?codePostal=" + encodeURIComponent(pc) + "&fields=nom,codeDepartement,population&format=json";
  }
  // Opgeslagen ifm_plaats = JSON {postcode, plaats}; alleen geldig bij dezelfde postcode.
  function plaatsUitOpslag(tekst, pc) {
    try {
      var o = JSON.parse(tekst);
      return o && o.postcode === pc && typeof o.plaats === "string" ? o.plaats : "";
    } catch (e) { return ""; }
  }

  // Locatie naar postcode: geo.api.gouv.fr/communes?lat=..&lon=.. geeft de gemeente(n) op dat punt, met codesPostaux.
  // Buiten Frankrijk of bij een onverwachte vorm geeft postcodeUitGeo null.
  function geoUrl(lat, lon) {
    if (typeof lat !== "number" || typeof lon !== "number" || !isFinite(lat) || !isFinite(lon)) return "";
    return "https://geo.api.gouv.fr/communes?lat=" + encodeURIComponent(lat.toFixed(5)) + "&lon=" + encodeURIComponent(lon.toFixed(5)) +
      "&fields=nom,code,codesPostaux,codeDepartement,centre&format=json";
  }
  function postcodeUitGeo(json) {
    if (!Array.isArray(json)) return null;
    for (var i = 0; i < json.length; i++) {
      var c = json[i], lijst = c && Array.isArray(c.codesPostaux) ? c.codesPostaux : [];
      for (var j = 0; j < lijst.length; j++) if (postcodeOk(lijst[j])) {
        var co = c.centre && Array.isArray(c.centre.coordinates) ? c.centre.coordinates : [];
        return { postcode: lijst[j], plaats: typeof c.nom === "string" ? c.nom.trim() : "", code: typeof c.code === "string" ? c.code : "",
          dep: typeof c.codeDepartement === "string" ? c.codeDepartement : "", lon: typeof co[0] === "number" ? co[0] : null, lat: typeof co[1] === "number" ? co[1] : null };
      }
    }
    return null;
  }

  // Terugval als geo.api.gouv.fr niet antwoordt (11-11-2026: de dienst weigerde verbindingen): de Géoplateforme van IGN
  // (data.geopf.fr, CORS *, ook gebruikt voor adressen). De omzetting levert dezelfde vorm als geo.api.gouv.fr, zodat de
  // bestaande lezers (leesCommunes, plaatsUitApi, postcodeUitGeo) ongewijzigd blijven. Arrondissementen van Parijs, Lyon en
  // Marseille vallen weg: geo.api.gouv.fr geeft daar de hele stad.
  var GEOPF = "https://data.geopf.fr/geocodage";
  function arrondissement(code) { return /^(751(0[1-9]|1\d|20)|6938[1-9]|132(0[1-9]|1[0-6]))$/.test(code); }
  function gemeentenUrlGeopf(pc) {
    return postcodeOk(pc) ? GEOPF + "/search?q=" + encodeURIComponent(pc) + "&type=municipality&limit=50" : "";
  }
  function depUit(p) {
    if (p && typeof p.depcode === "string" && p.depcode) return p.depcode;
    var c = p && typeof p.context === "string" ? p.context.split(",")[0].trim() : "";
    return /^(\d{2,3}|2A|2B)$/.test(c) ? c : "";
  }
  function gemeentenUitGeopf(json, pc) {
    var f = json && Array.isArray(json.features) ? json.features : [], uit = [], gezien = {};
    f.forEach(function (x) {
      var p = x && x.properties, co = x && x.geometry && Array.isArray(x.geometry.coordinates) ? x.geometry.coordinates : [];
      if (!p || p.postcode !== pc || typeof p.citycode !== "string" || !/^(\d{5}|2[AB]\d{3})$/.test(p.citycode)) return;
      if (arrondissement(p.citycode) || gezien[p.citycode]) return;
      var nom = typeof p.city === "string" && p.city.trim() ? p.city.trim() : (typeof p.name === "string" ? p.name.trim() : "");
      if (!nom) return;
      gezien[p.citycode] = true;
      uit.push({ nom: nom, code: p.citycode, codeDepartement: depUit(p), population: typeof p.population === "number" ? p.population : 0,
        codesPostaux: [pc], centre: { type: "Point", coordinates: [co[0], co[1]] } });
    });
    return uit;
  }
  function geoUrlGeopf(lat, lon) {
    if (typeof lat !== "number" || typeof lon !== "number" || !isFinite(lat) || !isFinite(lon)) return "";
    return GEOPF + "/reverse?lat=" + encodeURIComponent(lat.toFixed(5)) + "&lon=" + encodeURIComponent(lon.toFixed(5)) + "&limit=1";
  }
  function geoUitGeopf(json) {
    var x = json && Array.isArray(json.features) ? json.features[0] : null, p = x && x.properties;
    if (!p || !postcodeOk(p.postcode) || typeof p.citycode !== "string") return [];
    var co = x.geometry && Array.isArray(x.geometry.coordinates) ? x.geometry.coordinates : [];
    return [{ nom: typeof p.city === "string" ? p.city.trim() : "", code: p.citycode, codesPostaux: [p.postcode], codeDepartement: depUit(p),
      centre: { type: "Point", coordinates: [co[0], co[1]] } }];
  }

  var api = {
    begroeting: begroeting, THEMA_KLEUREN: THEMA_KLEUREN, themaKleur: themaKleur, luminantie: luminantie,
    contrast: contrast, TABS: TABS, tabVan: tabVan, postcodeOk: postcodeOk, regioLabel: regioLabel,
    departementCode: departementCode, geoUrl: geoUrl, postcodeUitGeo: postcodeUitGeo, plaatsUitApi: plaatsUitApi, plaatsUrl: plaatsUrl, plaatsUitOpslag: plaatsUitOpslag,
    gemeentenUrlGeopf: gemeentenUrlGeopf, gemeentenUitGeopf: gemeentenUitGeopf, geoUrlGeopf: geoUrlGeopf, geoUitGeopf: geoUitGeopf
  };
  root.HubLib = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
