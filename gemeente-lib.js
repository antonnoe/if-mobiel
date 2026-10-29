// Mijn gemeente: pure functies voor de aanvragen en het lezen van de antwoorden van vijf officiële bronnen.
// Gewone JavaScript, geen buildstap: index.html laadt dit bestand (window.IfGem), de tests laden het met require.
// Alle aanvragen zijn simpele anonieme GET's zonder eigen headers. Veldnamen en eindpunten zijn op 29-10-2026 vanuit een tab op
// infopoche.fr getest (cross-origin, credentials omit); zie CLAUDE.md. Elke lees-functie geeft null of een leeg resultaat bij een
// onverwachte vorm, nooit een fout.
(function (root) {
  var GEO = "https://geo.api.gouv.fr/communes";
  var GEORISQUES = "https://georisques.gouv.fr/api/v1";
  var REI = "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/fiscalite-locale-des-particuliers/records";
  var ANNUAIRE = "https://api-lannuaire.service-public.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration/records";
  var LINKS = {
    georisques: "https://www.georisques.gouv.fr/",
    dvfKaart: "https://explore.data.gouv.fr/immobilier",
    arcepFix: "https://maconnexioninternet.arcep.fr/",
    arcepMobiel: "https://monreseaumobile.arcep.fr/",
    drees: "https://data.drees.solidarites-sante.gouv.fr/explore/dataset/530_l-accessibilite-potentielle-localisee-apl/",
    mairies: "https://lannuaire.service-public.fr/"
  };

  function tekst(v) { return typeof v === "string" ? v.trim() : ""; }
  function getal(v) { var n = typeof v === "number" ? v : parseFloat(v); return isFinite(n) ? n : null; }
  function codeOk(code) { return typeof code === "string" && /^(\d{5}|2[AB]\d{3})$/i.test(code); }
  function postcodeOk(pc) { return typeof pc === "string" && /^\d{5}$/.test(pc); }
  function q(v) { return encodeURIComponent(v); }
  function httpUrl(u) { u = tekst(u); return /^https?:\/\//i.test(u) ? u : ""; }

  // Procent met Nederlandse komma: 64.88 wordt "64,88 %".
  function pct(n) { var g = getal(n); return g === null ? "" : String(g.toFixed(2)).replace(".", ",") + " %"; }

  // ---- gemeente bij een postcode
  function communesUrl(pc) {
    return postcodeOk(pc) ? GEO + "?codePostal=" + q(pc) + "&fields=nom,code,codeDepartement,population,centre&format=json" : "";
  }
  function gemeente(c) {
    if (!c || !codeOk(tekst(c.code)) || !tekst(c.nom)) return null;
    var co = c.centre && Array.isArray(c.centre.coordinates) ? c.centre.coordinates : [];
    return { code: tekst(c.code), nom: tekst(c.nom), dep: tekst(c.codeDepartement), pop: getal(c.population) || 0,
      lon: getal(co[0]), lat: getal(co[1]) };
  }
  // Grootste gemeente eerst: dat is bij een gedeelde postcode meestal wat de lezer bedoelt.
  function leesCommunes(json) {
    if (!Array.isArray(json)) return [];
    return json.map(gemeente).filter(Boolean).sort(function (a, b) { return b.pop - a.pop; });
  }

  // ---- Géorisques: vier aparte aanvragen, elk mag mislukken
  function risicoUrls(code) {
    if (!codeOk(code)) return null;
    var c = "code_insee=" + q(code);
    return { risques: GEORISQUES + "/gaspar/risques?" + c + "&page_size=1", catnat: GEORISQUES + "/gaspar/catnat?" + c + "&page_size=1",
      radon: GEORISQUES + "/radon?" + c, sismique: GEORISQUES + "/zonage_sismique?" + c };
  }
  function eerste(json) { return json && Array.isArray(json.data) && json.data.length ? json.data[0] : null; }
  // r = {risques, catnat, radon, sismique}: de ruwe antwoorden, null waar de aanvraag mislukte. ok is waar als er iets uit kwam.
  function leesRisico(r) {
    r = r || {};
    var uit = { lijst: [], catnat: null, radon: null, zone: "", ok: false };
    var g = eerste(r.risques);
    if (g && Array.isArray(g.risques_detail)) {
      var gezien = {};
      g.risques_detail.forEach(function (d) {
        var t = d && tekst(d.libelle_risque_long);
        if (t && !gezien[t]) { gezien[t] = 1; uit.lijst.push(t); }
        if (!uit.zone && d && tekst(d.zone_sismicite)) uit.zone = tekst(d.zone_sismicite);
      });
    }
    if (r.catnat && typeof r.catnat === "object") {
      var n = typeof r.catnat.results === "number" ? r.catnat.results : (Array.isArray(r.catnat.data) ? r.catnat.data.length : null);
      uit.catnat = n;
    }
    var rd = eerste(r.radon), kl = rd ? getal(rd.classe_potentiel) : null;
    if (kl !== null && kl >= 1 && kl <= 3) uit.radon = kl;
    var zs = eerste(r.sismique);
    if (zs && tekst(zs.zone_sismicite)) uit.zone = tekst(zs.zone_sismicite);
    uit.adres = r.adres ? leesAdresRisico(r.adres) : null;
    uit.ok = uit.lijst.length > 0 || uit.catnat !== null || uit.radon !== null || !!uit.zone || !!(uit.adres && uit.adres.ok);
    return uit;
  }

  // ---- taxe foncière (tarieven, geen bedragen)
  function belastingUrl(code) {
    if (!codeOk(code)) return "";
    return REI + "?where=" + q('insee_com="' + code + '"') + "&order_by=" + q("exercice desc") + "&limit=6&select=" +
      q("exercice,libcom,taux_global_tfb,taux_global_tfnb,taux_plein_teom,taux_global_th");
  }
  // Per tarief het meest recente jaar waarin het gevuld is (taux_plein_teom was in 2025 leeg, in 2024 niet).
  function leesBelasting(json) {
    if (!json || !Array.isArray(json.results)) return null;
    var rijen = json.results.filter(function (r) { return r && getal(r.exercice) !== null; })
      .sort(function (a, b) { return getal(b.exercice) - getal(a.exercice); });
    function laatste(veld) {
      for (var i = 0; i < rijen.length; i++) { var w = getal(rijen[i][veld]); if (w !== null) return { jaar: getal(rijen[i].exercice), waarde: w }; }
      return null;
    }
    var uit = { bebouwd: laatste("taux_global_tfb"), onbebouwd: laatste("taux_global_tfnb"), afval: laatste("taux_plein_teom"), wonen: laatste("taux_global_th") };
    uit.ok = !!(uit.bebouwd || uit.onbebouwd || uit.afval || uit.wonen);
    return uit;
  }

  // ---- mairie (Annuaire de l'administration); adresse, telephone en site_internet zijn JSON-tekst in de dataset
  function mairieUrl(code) {
    return codeOk(code) ? ANNUAIRE + "?where=" + q('pivot LIKE "mairie" AND code_insee_commune="' + code + '"') + "&limit=10" : "";
  }
  function json(v) { if (typeof v !== "string") return v || null; try { return JSON.parse(v); } catch (e) { return null; } }
  function leesMairie(data) {
    if (!data || !Array.isArray(data.results)) return null;
    var rec = data.results.filter(function (r) {
      var p = json(r && r.pivot);
      if (!Array.isArray(p)) return true;
      var t = p.map(function (x) { return x && x.type_service_local; }).filter(Boolean);
      return !t.length || t.indexOf("mairie") >= 0;
    })[0];
    if (!rec || !tekst(rec.nom)) return { ok: false };
    var ad = json(rec.adresse), a = Array.isArray(ad) ? (ad.find(function (x) { return x && x.type_adresse === "Adresse"; }) || ad[0] || null) : null;
    var tel = json(rec.telephone), t = Array.isArray(tel) ? tel.find(function (x) { return x && tekst(x.valeur); }) : null;
    var si = json(rec.site_internet), s = Array.isArray(si) ? si.find(function (x) { return x && httpUrl(x.valeur); }) : null;
    return { ok: true, nom: tekst(rec.nom),
      adres: a ? [[a.numero_voie, a.complement1, a.complement2].map(tekst).filter(Boolean).join(", "), [tekst(a.code_postal), tekst(a.nom_commune)].filter(Boolean).join(" ")].filter(Boolean).join(", ") : "",
      tel: t ? tekst(t.valeur) : "", site: s ? httpUrl(s.valeur) : "" };
  }

  // ---- DVF via de Cerema-preprod-API (CORS *, geen stabiel productie-eindpunt). Getest 29-10-2026: filters code_insee, anneemut_min,
  // anneemut_max, codtypbien (beginwaarde: 111 maison, 121 appartement), page_size maximaal 500, page. Sorteren op datum werkt niet
  // (we sorteren zelf), libnatmut en libtypbien als filter worden genegeerd (we filteren zelf op "Vente"). De `next`-link van de bron
  // is http en wordt niet gebruikt.
  var DVF = "https://apidf-preprod.cerema.fr/dvf_opendata/mutations/";
  var DVF_PAGE = 500, DVF_MAX_PAGINA = 6, DVF_JAREN = 3, DVF_MIN = 5;
  function dvfUrl(code, jaar, pagina) {
    if (!codeOk(code) || !isFinite(jaar)) return "";
    return DVF + "?code_insee=" + q(code) + "&anneemut_min=" + (jaar - DVF_JAREN) + "&anneemut_max=" + jaar + "&codtypbien=111,121&page_size=" + DVF_PAGE + "&page=" + Math.max(1, pagina | 0 || 1);
  }
  function leesDvfPagina(data) {
    if (!data || typeof data.count !== "number" || !isFinite(data.count) || !Array.isArray(data.results)) return null;
    return { count: data.count, results: data.results };
  }
  function mediaan(lijst, p) {
    if (!lijst.length) return null;
    var s = lijst.slice().sort(function (a, b) { return a - b; }), i = (s.length - 1) * (p === undefined ? 0.5 : p), lo = Math.floor(i), hi = Math.ceil(i);
    return s[lo] + (s[hi] - s[lo]) * (i - lo);
  }
  function groep(records, code) {
    var verkopen = records.filter(function (r) { return r && r.libnatmut === "Vente" && tekst(r.codtypbien) === code; });
    var prijzen = [], perM2 = [];
    verkopen.forEach(function (r) {
      var v = getal(r.valeurfonc), m = getal(r.sbati);
      if (v === null || v <= 0) return;
      prijzen.push(v);
      if (m !== null && m >= 20) perM2.push(v / m);
    });
    var n = prijzen.length;
    return { n: n, genoeg: n >= DVF_MIN, prijs: n ? Math.round(mediaan(prijzen)) : null, perM2: perM2.length >= DVF_MIN ? Math.round(mediaan(perM2)) : null,
      perM2Laag: perM2.length >= DVF_MIN ? Math.round(mediaan(perM2, 0.25)) : null, perM2Hoog: perM2.length >= DVF_MIN ? Math.round(mediaan(perM2, 0.75)) : null };
  }
  // Mediaan, niet gemiddelde: een paar uitschieters (kasteel, krot) vertekenen een gemiddelde. onvolledig = niet alle pagina's gelukt of afgekapt.
  function dvfSamenvatting(records, onvolledig) {
    if (!Array.isArray(records)) return null;
    var jaren = records.filter(function (r) { return r && getal(r.anneemut) !== null; }).map(function (r) { return getal(r.anneemut); });
    var uit = { huis: groep(records, "111"), app: groep(records, "121"), van: jaren.length ? Math.min.apply(null, jaren) : null, tot: jaren.length ? Math.max.apply(null, jaren) : null, onvolledig: !!onvolledig };
    uit.ok = uit.huis.n > 0 || uit.app.n > 0;
    return uit;
  }
  function kaartLink(basis, lat, lon, extra) {
    if (lat === null || lon === null || typeof lat !== "number" || typeof lon !== "number") return basis;
    return basis + "?" + extra(lat.toFixed(5), lon.toFixed(5));
  }
  function dvfKaartUrl(lat, lon) { return kaartLink(LINKS.dvfKaart, lat, lon, function (a, o) { return "onglet=carte&lat=" + a + "&lon=" + o + "&zoom=14"; }); }
  function arcepUrl(lat, lon) { return kaartLink(LINKS.arcepFix, lat, lon, function (a, o) { return "lat=" + a + "&lng=" + o + "&zoom=14"; }); }


  // ---- zoeken op exact adres (Géoplateforme, CORS *) en Géorisques per punt (coördinaten als lon,lat)
  var GEOCODE = "https://data.geopf.fr/geocodage/search";
  var RAYON = 500; // meter rondom het adres voor overstroming, bodembeweging en holle ruimten
  function adresUrl(zoek) {
    zoek = tekst(zoek);
    return zoek.length >= 4 ? GEOCODE + "?q=" + q(zoek) + "&limit=5" : "";
  }
  function leesAdressen(data) {
    if (!data || !Array.isArray(data.features)) return [];
    var uit = [];
    data.features.forEach(function (f) {
      var p = f && f.properties, g = f && f.geometry && Array.isArray(f.geometry.coordinates) ? f.geometry.coordinates : [];
      var code = p ? tekst(p.citycode) : "", lon = getal(g[0]), lat = getal(g[1]);
      if (!p || !tekst(p.label) || !codeOk(code) || lon === null || lat === null) return;
      var dep = tekst(p.context).split(",")[0].trim() || (/^9[78]/.test(code) ? code.slice(0, 3) : code.slice(0, 2));
      uit.push({ label: tekst(p.label), code: code, nom: tekst(p.city) || tekst(p.label), dep: dep, pc: tekst(p.postcode), lon: lon, lat: lat });
    });
    return uit;
  }
  function adresRisicoUrls(lat, lon) {
    if (typeof lat !== "number" || typeof lon !== "number" || !isFinite(lat) || !isFinite(lon)) return null;
    var ll = "latlon=" + q(lon.toFixed(5) + "," + lat.toFixed(5)), r = "&rayon=" + RAYON;
    return { rga: GEORISQUES + "/rga?" + ll, azi: GEORISQUES + "/gaspar/azi?" + ll + r, tri: GEORISQUES + "/gaspar/tri?" + ll + r,
      mvt: GEORISQUES + "/mvt?" + ll + r, cavites: GEORISQUES + "/cavites?" + ll + r, sismique: GEORISQUES + "/zonage_sismique?" + ll };
  }
  function namen(json, veld) {
    var gezien = {}, uit = [];
    ((json && Array.isArray(json.data)) ? json.data : []).forEach(function (d) {
      var t = d && tekst(d[veld]); if (t && !gezien[t]) { gezien[t] = 1; uit.push(t); }
    });
    return uit;
  }
  var KLEIGROND = { 1: "Laag", 2: "Matig", 3: "Hoog" };
  // r = {rga, azi, tri, mvt, cavites, sismique}: de ruwe antwoorden, null waar de aanvraag mislukte of leeg was.
  function leesAdresRisico(r) {
    r = r || {};
    var uit = { kleigrond: null, azi: [], tri: [], mvt: [], cavites: null, zone: "", ok: false, aziOk: false, triOk: false, mvtOk: false };
    var cx = r.rga ? getal(r.rga.codeExposition) : null, ex = r.rga ? tekst(r.rga.exposition) : "";
    if (cx !== null && KLEIGROND[cx]) uit.kleigrond = KLEIGROND[cx] + (ex ? " (" + ex + ")" : "");
    else if (ex) uit.kleigrond = ex;
    uit.azi = namen(r.azi, "libelle_azi"); uit.tri = namen(r.tri, "libelle_tri");
    uit.aziOk = !!(r.azi && Array.isArray(r.azi.data)); uit.triOk = !!(r.tri && Array.isArray(r.tri.data)); uit.mvtOk = !!(r.mvt && Array.isArray(r.mvt.data));
    var mv = r.mvt && Array.isArray(r.mvt.data) ? r.mvt.data : [];
    mv.forEach(function (m) { if (m && tekst(m.type)) uit.mvt.push({ type: tekst(m.type), lieu: tekst(m.lieu), jaar: /^\d{4}/.test(tekst(m.date_debut)) ? tekst(m.date_debut).slice(0, 4) : "" }); });
    if (r.cavites && typeof r.cavites.results === "number") uit.cavites = r.cavites.results;
    var zs = eerste(r.sismique); if (zs && tekst(zs.zone_sismicite)) uit.zone = tekst(zs.zone_sismicite);
    uit.ok = !!(uit.kleigrond || uit.azi.length || uit.tri.length || uit.mvt.length || uit.cavites !== null || uit.zone);
    return uit;
  }

  // Indicatie taxe foncière: de grondslag is de helft van de cadastrale huurwaarde (service-public.fr, F59), maal het tarief
  // van de gemeente. Geen bedrag zonder die waarde: die staat op de aanslag, er is geen open bron per woning.
  function tfIndicatie(vlc, tarief) {
    var v = getal(String(vlc).replace(/\s/g, "").replace(",", ".")), t = getal(tarief);
    if (v === null || t === null || v <= 0 || v > 1000000 || t <= 0) return null;
    return Math.round(v * 0.5 * t / 100);
  }

  var api = { LINKS: LINKS, postcodeOk: postcodeOk, codeOk: codeOk, pct: pct, communesUrl: communesUrl, leesCommunes: leesCommunes, adresUrl: adresUrl, leesAdressen: leesAdressen, adresRisicoUrls: adresRisicoUrls, leesAdresRisico: leesAdresRisico, tfIndicatie: tfIndicatie, RAYON: RAYON,
    risicoUrls: risicoUrls, leesRisico: leesRisico, belastingUrl: belastingUrl, leesBelasting: leesBelasting, mairieUrl: mairieUrl,
    leesMairie: leesMairie, dvfUrl: dvfUrl, leesDvfPagina: leesDvfPagina, dvfSamenvatting: dvfSamenvatting, DVF_PAGE: DVF_PAGE, DVF_MAX_PAGINA: DVF_MAX_PAGINA, dvfKaartUrl: dvfKaartUrl, arcepUrl: arcepUrl };
  root.IfGem = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
