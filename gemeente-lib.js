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

  // ---- eigen tussenlaag (api/gemeente.js, Vercel-functie op hetzelfde adres): voor wat een browser niet zelf kan opvragen.
  // Géorisques weigert `catnat` en `radon` bij een browser-User-Agent; een server stuurt een eigen, eerlijke User-Agent.
  var PROXY = "/api/gemeente";
  function proxyUrl(bron, p) {
    var qs = ["bron=" + q(bron)];
    Object.keys(p || {}).forEach(function (k) { qs.push(q(k) + "=" + q(String(p[k]))); });
    return PROXY + "?" + qs.join("&");
  }
  // Vraagstuk voor het hulpmiddel Internetverbinding (leest ?adres=, optioneel &lat=&lon=): alleen met een gekozen adres of locatie,
  // niet met alleen een gemeente (het middelpunt van een gemeente is geen adres). Leeg = niets voorinvullen.
  function internetQuery(c) {
    if (!c || !tekst(c.adres) || typeof c.lat !== "number" || typeof c.lon !== "number" || !isFinite(c.lat) || !isFinite(c.lon)) return "";
    var naam = c.adres === "Je locatie" ? "Je locatie, bij benadering" : tekst(c.adres);
    return "adres=" + q(naam.slice(0, 200)) + "&lat=" + c.lat.toFixed(6) + "&lon=" + c.lon.toFixed(6);
  }
  function catnatUrl(code, pagina, grootte) {
    return codeOk(code) ? GEORISQUES + "/gaspar/catnat?code_insee=" + q(code) + "&page_size=" + (grootte || 100) + "&page=" + Math.max(1, pagina | 0 || 1) : "";
  }
  function radonUrl(code) { return codeOk(code) ? GEORISQUES + "/radon?code_insee=" + q(code) : ""; }

  // ---- Géorisques: vier aparte aanvragen, elk mag mislukken
  function risicoUrls(code) {
    if (!codeOk(code)) return null;
    var c = "code_insee=" + q(code);
    return { risques: GEORISQUES + "/gaspar/risques?" + c + "&page_size=1", catnat: GEORISQUES + "/gaspar/catnat?" + c + "&page_size=1",
      radon: GEORISQUES + "/radon?" + c, sismique: GEORISQUES + "/zonage_sismique?" + c };
  }
  function eerste(json) { return json && Array.isArray(json.data) && json.data.length ? json.data[0] : null; }
  // Natuurrampbesluiten per soort risico: aantal en het laatste jaar (datum is dd/mm/jjjj).
  function catnatPerRisico(data) {
    var per = {};
    (Array.isArray(data) ? data : []).forEach(function (d) {
      var t = d && tekst(d.libelle_risque_jo); if (!t) return;
      var m = /(\d{4})\s*$/.exec(tekst(d.date_debut_evt)), jaar = m ? parseInt(m[1], 10) : null;
      var x = per[t] || (per[t] = { risico: t, aantal: 0, laatsteJaar: null });
      x.aantal++; if (jaar !== null && (x.laatsteJaar === null || jaar > x.laatsteJaar)) x.laatsteJaar = jaar;
    });
    return Object.keys(per).map(function (k) { return per[k]; }).sort(function (a, b) { return b.aantal - a.aantal; });
  }
  // r = {risques, catnat, radon, sismique}: de ruwe antwoorden, null waar de aanvraag mislukte. ok is waar als er iets uit kwam.
  function leesRisico(r) {
    r = r || {};
    var uit = { lijst: [], catnat: null, catnatPer: [], vloed: null, vloedOntbreekt: false, radon: null, zone: "", ok: false };
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
      uit.catnatPer = catnatPerRisico(r.catnat.data);
    }
    // overstroming staat in de natuurrampbesluiten, ook als de lijst van de gemeente hem niet noemt (Neuville-sous-Montreuil: 14 besluiten)
    var vloed = uit.catnatPer.filter(function (x) { return /inondation/i.test(x.risico); })[0];
    uit.vloedOntbreekt = !!(vloed && uit.lijst.length && !uit.lijst.some(function (t) { return /inondation/i.test(t); }));
    uit.vloed = vloed || null;
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


  // ---- Déchèteries: ADEME SINOE via de Tabular API van data.gouv.fr (Licence Ouverte 2.0, CORS *, getest 31-10-2026 vanuit infopoche.fr).
  // Filters: ANNEE__exact, C_DEPT__exact; page_size 100 werkt. Geen openingstijden in de bron. Per jaar een eigen rij per locatie.
  var DECH = "https://tabular-api.data.gouv.fr/api/resources/137251d6-443e-426e-8a22-0a5d4eb3312e/data/";
  var DECH_PAGE = 100, DECH_MAX_PAGINA = 3, DECH_AANTAL = 5;
  function dechUrl(dep, jaar, pagina) {
    dep = tekst(dep);
    if (!/^(\d{2,3}|2[AB])$/i.test(dep) || !isFinite(jaar)) return "";
    return DECH + "?ANNEE__exact=" + (jaar | 0) + "&C_DEPT__exact=" + q(dep.toUpperCase()) + "&page_size=" + DECH_PAGE + "&page=" + Math.max(1, pagina | 0 || 1);
  }
  function afstandKm(lat1, lon1, lat2, lon2) {
    var r = Math.PI / 180, dl = (lat2 - lat1) * r, dn = (lon2 - lon1) * r;
    var a = Math.sin(dl / 2) * Math.sin(dl / 2) + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dn / 2) * Math.sin(dn / 2);
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  // Geeft { totaal, paginas } of null bij een onverwachte vorm; de rijen komen mee in `rijen`.
  function leesDechPagina(data) {
    if (!data || !Array.isArray(data.data) || !data.meta || typeof data.meta.total !== "number") return null;
    return { totaal: data.meta.total, rijen: data.data, paginas: Math.ceil(data.meta.total / DECH_PAGE) };
  }
  function ontdubbel(rijen) {
    var gezien = {};
    return rijen.filter(function (r) { var k = tekst(r.C_SERVICE) || tekst(r.N_SERVICE) + tekst(r.CP_SITE); if (gezien[k]) return false; gezien[k] = 1; return true; });
  }
  // De dichtstbijzijnde locaties binnen het departement. Zonder bruikbare coördinaten van de gemeente: alle locaties van die gemeente zelf.
  // `onvolledig`: true als een van de vervolgpagina's van de bron niet kon worden opgehaald (de bron is wisselvallig, zie CLAUDE.md);
  // de al opgehaalde pagina's worden dan toch getoond, met die vermelding, in plaats van de hele kaart te laten vallen.
  function dechSamenvatting(rijen, lat, lon, code, onvolledig) {
    if (!Array.isArray(rijen)) return null;
    var heeft = typeof lat === "number" && typeof lon === "number" && isFinite(lat) && isFinite(lon);
    var l = ontdubbel(rijen).map(function (r) {
      var la = getal(r.GPS_LAT), lo = getal(r.GPS_LONG), n = tekst(r.N_SERVICE);
      if (!n) return null;
      var tel = tekst(r.TEL_SERVICE).replace(/\D/g, "");
      return { naam: n, adres: [tekst(r.AD1_SITE), [tekst(r.CP_SITE), tekst(r.L_VILLE_SITE)].filter(Boolean).join(" ")].filter(Boolean).join(", "),
        tel: tel.length === 10 ? tel.replace(/(\d{2})(?=\d)/g, "$1 ") : "", beheer: tekst(r.N_ACTEUR),
        ook_bedrijven: /PRO/.test(tekst(r.ORIGINE_DECHET_ACC)), eigen: !!code && tekst(r.C_COMM) === code,
        lat: la, lon: lo, km: heeft && la !== null && lo !== null ? afstandKm(lat, lon, la, lo) : null };
    }).filter(Boolean);
    if (heeft) l = l.filter(function (x) { return x.km !== null; }).sort(function (a, b) { return a.km - b.km; });
    else l = l.filter(function (x) { return x.eigen; });
    return { ok: l.length > 0, lijst: l.slice(0, DECH_AANTAL), heeftAfstand: heeft, onvolledig: !!onvolledig };
  }
  function dechKaartUrl(x) {
    if (!x) return "";
    if (typeof x.lat === "number" && typeof x.lon === "number") return "https://www.google.com/maps/search/?api=1&query=" + x.lat + "," + x.lon;
    return "https://www.google.com/maps/search/?api=1&query=" + q(x.naam + " " + x.adres);
  }

  // ---- Drinkwater via Hub'Eau (resultats_dis, CORS *, getest 31-10-2026 vanuit infopoche.fr, Bergerac 24037). Eén aanvraag per gemeente:
  // de laatste 200 resultaten, nieuwste eerst. Per netwerk (nom_uge) nemen we het laatste monster en daaruit de officiële conclusie.
  var HUBEAU = "https://hubeau.eaufrance.fr/api/v1/qualite_eau_potable/resultats_dis";
  var EAU_VELDEN = "date_prelevement,code_parametre,libelle_parametre,resultat_numerique,libelle_unite,limite_qualite_parametre,reference_qualite_parametre,conclusion_conformite_prelevement,nom_uge,nom_distributeur";
  var EAU_PARAMS = { "1340": "Nitraat", "7972": "Hardheid (titre hydrotimétrique)", "1302": "Zuurgraad (pH)" };
  function eauUrl(code) { return codeOk(code) ? HUBEAU + "?code_commune=" + q(code) + "&size=200&sort=desc&fields=" + EAU_VELDEN : ""; }
  function datumNl(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(tekst(iso)); return m ? m[3] + "-" + m[2] + "-" + m[1] : ""; }
  function leesEau(json) {
    if (!json || !Array.isArray(json.data)) return null;
    var netten = [], index = {};
    json.data.forEach(function (r) {
      if (!r) return;
      var naam = tekst(r.nom_uge) || "Waternetwerk", dag = tekst(r.date_prelevement).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dag)) return;
      var n = index[naam];
      if (!n) { if (netten.length >= 3) return; n = index[naam] = { naam: naam, distributeur: tekst(r.nom_distributeur), dag: dag, conclusie: "", params: {} }; netten.push(n); }
      if (dag > n.dag) return; // alleen het nieuwste monster per netwerk (de bron staat nieuwste eerst)
      var c = tekst(r.conclusion_conformite_prelevement);
      if (c && !n.conclusie && dag === n.dag) n.conclusie = c;
      var code = tekst(String(r.code_parametre));
      if (EAU_PARAMS[code] && getal(r.resultat_numerique) !== null && !n.params[code]) {
        var grens = tekst(r.limite_qualite_parametre) || tekst(r.reference_qualite_parametre);
        n.params[code] = { label: EAU_PARAMS[code], waarde: (String(getal(r.resultat_numerique)).replace(".", ",") + " " + tekst(r.libelle_unite).replace("unité pH", "")).trim(),
          grens: grens ? grens.replace(/<=/g, "\u2264 ").replace(/>=/g, "\u2265 ").replace("unité pH", "").replace(/ et /g, " en ").trim() : "", dag: dag };
      }
    });
    var lijst = netten.map(function (n) {
      var ps = Object.keys(EAU_PARAMS).map(function (k) { return n.params[k]; }).filter(function (p) { return p && p.dag === n.dag; });
      return { naam: n.naam, distributeur: n.distributeur, datum: datumNl(n.dag), conclusie: n.conclusie,
        niet: /non[ -]conforme/i.test(n.conclusie), conform: /^eau d'alimentation conforme/i.test(n.conclusie), params: ps };
    }).filter(function (n) { return n.conclusie || n.params.length; });
    return { ok: lijst.length > 0, netten: lijst };
  }

  // ---- Defibrillatoren: Géo'DAE via de Tabular API van data.gouv.fr (Licence Ouverte 2.0, CORS *, getest 31-10-2026: 190.234 rijen).
  // Zoeken in een vierkant om het punt (kolommen c_lat_coor1 en c_long_coor1 zijn getallen); de afstand rekenen we zelf.
  var DAE = "https://tabular-api.data.gouv.fr/api/resources/edb6a9e1-2f16-4bbf-99e7-c3eb6b90794c/data/";
  var DAE_STRAAL = 2.2, DAE_PAGE = 100, DAE_MAX_PAGINA = 3, DAE_AANTAL = 5;
  function daeUrl(lat, lon, pagina) {
    if (typeof lat !== "number" || typeof lon !== "number" || !isFinite(lat) || !isFinite(lon)) return "";
    var dl = DAE_STRAAL / 111, dn = DAE_STRAAL / (111 * Math.max(0.2, Math.cos(lat * Math.PI / 180)));
    return DAE + "?c_lat_coor1__greater=" + (lat - dl).toFixed(5) + "&c_lat_coor1__less=" + (lat + dl).toFixed(5) +
      "&c_long_coor1__greater=" + (lon - dn).toFixed(5) + "&c_long_coor1__less=" + (lon + dn).toFixed(5) + "&page_size=" + DAE_PAGE + "&page=" + Math.max(1, pagina | 0 || 1);
  }
  function leesDaePagina(data) {
    if (!data || !Array.isArray(data.data) || !data.meta || typeof data.meta.total !== "number") return null;
    return { totaal: data.meta.total, rijen: data.data, paginas: Math.ceil(data.meta.total / DAE_PAGE) };
  }
  function daeSamenvatting(rijen, lat, lon, onvolledig) {
    if (!Array.isArray(rijen)) return null;
    var gezien = {};
    var l = rijen.map(function (r) {
      if (!r || tekst(r.c_doublon) === "t" || tekst(r.c_dae_mobile) === "t" || !/fonctionnement/i.test(tekst(r.c_etat_fonct)) || /doute/i.test(tekst(r.c_etat_valid))) return null;
      var la = getal(r.c_lat_coor1), lo = getal(r.c_long_coor1);
      if (la === null || lo === null) return null;
      var km = afstandKm(lat, lon, la, lo);
      if (km > DAE_STRAAL) return null;
      var id = tekst(r.gid) || la + "," + lo; if (gezien[id]) return null; gezien[id] = 1;
      var adres = [[tekst(r.c_adr_num), tekst(r.c_adr_voie)].filter(Boolean).join(" "), [tekst(r.c_com_cp), tekst(r.c_com_nom)].filter(Boolean).join(" ")].filter(Boolean).join(", ");
      var binnen = /int/i.test(tekst(r.c_acc));
      return { naam: tekst(r.c_nom) || "Defibrillator", adres: adres, km: km, binnen: binnen, buiten: /ext/i.test(tekst(r.c_acc)),
        altijd: tekst(r.c_dispo_horaires) === "24/7", plek: tekst(r.c_acc_complt).slice(0, 120), opm: tekst(r.c_disp_complt).slice(0, 160), lat: la, lon: lo };
    }).filter(Boolean).sort(function (a, b) { return a.km - b.km; });
    return { ok: l.length > 0, lijst: l.slice(0, DAE_AANTAL), aantal: l.length, onvolledig: !!onvolledig };
  }
  function kmTekst(km) { return km < 1 ? Math.max(10, Math.round(km * 100) * 10) + " m" : (km < 10 ? km.toFixed(1).replace(".", ",") : String(Math.round(km))) + " km"; }

  // ---- Brandstofprijzen: data.economie.gouv.fr (Opendatasoft Explore v2.1), dataset prix-des-carburants-en-france-flux-instantane-v2.
  // CORS *, anoniem, getest 31-10-2026 vanuit infopoche.fr. Zoeken met within_distance op `geom`; `latitude` en `longitude` in de bron
  // zijn geschaalde tekstwaarden en worden niet gebruikt. Een brandstof met `*_rupture_debut` is niet beschikbaar en telt niet mee.
  var CARB = "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records";
  var CARB_SOORTEN = [["gazole", "Diesel (gazole)"], ["e10", "Benzine SP95-E10"], ["sp95", "Benzine SP95"], ["sp98", "Benzine SP98"], ["e85", "Superethanol E85"], ["gplc", "Autogas (GPL)"]];
  var CARB_STRAAL = 10, CARB_PAGE = 100, CARB_MAX_PAGINA = 3, CARB_MAX_DAGEN = 7;
  function carbUrl(lat, lon, pagina) {
    if (typeof lat !== "number" || typeof lon !== "number" || !isFinite(lat) || !isFinite(lon)) return "";
    var velden = ["id", "adresse", "ville", "cp", "geom", "horaires_automate_24_24"];
    CARB_SOORTEN.forEach(function (k) { velden.push(k[0] + "_prix", k[0] + "_maj", k[0] + "_rupture_debut"); });
    var where = "within_distance(geom, geom'POINT(" + lon.toFixed(5) + " " + lat.toFixed(5) + ")', " + CARB_STRAAL + "km)";
    return CARB + "?where=" + q(where) + "&select=" + q(velden.join(",")) + "&limit=" + CARB_PAGE + "&offset=" + (Math.max(1, pagina | 0 || 1) - 1) * CARB_PAGE;
  }
  function leesCarbPagina(data) {
    if (!data || !Array.isArray(data.results) || typeof data.total_count !== "number") return null;
    return { totaal: data.total_count, rijen: data.results, paginas: Math.ceil(data.total_count / CARB_PAGE) };
  }
  // De goedkoopste per brandstof onder de stations met een verse prijs (niet ouder dan CARB_MAX_DAGEN dagen) en zonder tekort.
  function carbSamenvatting(rijen, lat, lon, nu) {
    if (!Array.isArray(rijen)) return null;
    var nuMs = typeof nu === "number" ? nu : Date.now(), uit = [], stations = 0;
    CARB_SOORTEN.forEach(function (k) {
      var beste = null, n = 0;
      rijen.forEach(function (r) {
        if (!r || r[k[0] + "_rupture_debut"]) return;
        var pr = getal(r[k[0] + "_prix"]), maj = Date.parse(tekst(r[k[0] + "_maj"]));
        if (pr === null || pr < 0.3 || pr > 5 || !isFinite(maj) || nuMs - maj > CARB_MAX_DAGEN * 86400000 || maj > nuMs + 86400000) return;
        var g = r.geom && getal(r.geom.lat) !== null && getal(r.geom.lon) !== null ? r.geom : null;
        n++;
        if (!beste || pr < beste.prijs) beste = { prijs: pr, maj: tekst(r[k[0] + "_maj"]), ville: tekst(r.ville), adres: tekst(r.adresse), cp: tekst(r.cp),
          lat: g ? g.lat : null, lon: g ? g.lon : null, km: g ? afstandKm(lat, lon, g.lat, g.lon) : null, naam: "" };
      });
      if (beste) { stations = Math.max(stations, n); uit.push({ id: k[0], label: k[1], prijs: beste.prijs, prijsTekst: "\u20ac " + beste.prijs.toFixed(3).replace(".", ","),
        datum: datumNl(beste.maj), plaats: [beste.adres, [beste.cp, beste.ville].filter(Boolean).join(" ")].filter(Boolean).join(", "), km: beste.km, lat: beste.lat, lon: beste.lon, n: n }); }
    });
    return { ok: uit.length > 0, soorten: uit, stations: stations, straal: CARB_STRAAL, dagen: CARB_MAX_DAGEN };
  }

  // ---- Lokaal kopen bij de boer: Agence Bio, annuaire des operateurs bio (opendata.agencebio.org, open, CORS ok, getest 31-10-2026 vanuit infopoche.fr).
  // Alleen bio. Alleen bedrijven die aan particulieren verkopen (`venteAnnuaire.venteParticuliers`) en in de categorie Vente aux consommateurs (1),
  // Magasins specialises (4) of Artisans/commercants (5); grote winkels (6) en restaurants (2) vallen af, evenals bedrijven met de activiteit Grande surface (46).
  // Bewust NIET gebruikt: naam van de beheerder (`gerant`) en telefoonnummers: dat zijn gegevens van personen. Er wordt niets bewaard.
  var AGR = "https://opendata.agencebio.org/api/gouv/operateurs/";
  var AGR_STRAAL = 15, AGR_NB = 300, AGR_AANTAL = 8;
  var AGR_ACT = { 1: "honing", 16: "fruit", 18: "groenten", 34: "wijn", 11: "rundvlees", 12: "geitenproducten", 20: "eieren", 35: "pluimvee", 27: "varkensvlees", 17: "granen", 133: "oliehoudende gewassen", 26: "kruiden en planten", 8: "zelfpluk", 31: "planten (kwekerij)", 44: "producentenwinkel", 57: "markt", 41: "kaas", 36: "brood en gebak", 37: "vlees en charcuterie", 45: "biowinkel" };
  function agrUrl(lat, lon) {
    if (typeof lat !== "number" || typeof lon !== "number" || !isFinite(lat) || !isFinite(lon)) return "";
    return AGR + "?lat=" + lat.toFixed(5) + "&lng=" + lon.toFixed(5) + "&dist=" + AGR_STRAAL + "&nb=" + AGR_NB;
  }
  function leesAgr(data) {
    if (!data || !Array.isArray(data.items)) return null;
    return { totaal: getal(data.nbTotal), items: data.items };
  }
  function agrWeb(o) {
    var lijst = Array.isArray(o.siteWebs) ? o.siteWebs : [];
    for (var i = 0; i < lijst.length; i++) {
      var w = lijst[i], u = w && typeof w.url === "string" ? w.url.trim() : "";
      if (w && w.typeSiteWeb && w.typeSiteWeb.nom === "Site Officiel" && /^https:\/\/[^\s]+\.[^\s]+$/i.test(u)) return u;
    }
    return "";
  }
  function agrSamenvatting(data, lat, lon) {
    var l = leesAgr(data);
    if (!l) return null;
    var uit = [], gezien = {};
    l.items.forEach(function (o) {
      if (!o || !o.venteAnnuaire || o.venteAnnuaire.venteParticuliers !== true) return;
      var cats = (Array.isArray(o.categories) ? o.categories : []).map(function (c) { return c && c.id; });
      if (cats.indexOf(2) >= 0 || cats.indexOf(6) >= 0) return;
      if (!(cats.indexOf(1) >= 0 || cats.indexOf(4) >= 0 || cats.indexOf(5) >= 0)) return;
      var acts = (Array.isArray(o.annuaireActivites) ? o.annuaireActivites : []);
      if (acts.some(function (a) { return a && a.id === 46; })) return;
      var naam = tekst(o.denominationcourante) || tekst(o.raisonSociale);
      if (!naam) return;
      var beste = null;
      (Array.isArray(o.adressesOperateurs) ? o.adressesOperateurs : []).forEach(function (a) {
        if (!a || a.active === false || getal(a.lat) === null || getal(a.long) === null) return;
        var km = afstandKm(lat, lon, a.lat, a.long);
        if (km <= AGR_STRAAL && (!beste || km < beste.km)) beste = { km: km, a: a };
      });
      if (!beste) return;
      var sleutel = String(o.id || o.siret || naam) + "|" + beste.a.lieu;
      if (gezien[sleutel]) return; gezien[sleutel] = true;
      var wat = [];
      acts.forEach(function (a) { if (a && AGR_ACT[a.id] && wat.indexOf(AGR_ACT[a.id]) < 0) wat.push(AGR_ACT[a.id]); });
      // Een regel die met een persoonlijke aanhef begint ("Mr et Mme ...") laten we weg: alleen postcode en plaats.
      var lieu = tekst(beste.a.lieu); if (/^(m|mr|mme|mlle|monsieur|madame|messieurs)\b\.?\s/i.test(lieu)) lieu = "";
      uit.push({ naam: naam, adres: [lieu, [tekst(beste.a.codePostal), tekst(beste.a.ville)].filter(Boolean).join(" ")].filter(Boolean).join(", "),
        km: beste.km, wat: wat.slice(0, 4), web: agrWeb(o), lat: beste.a.lat, lon: beste.a.long });
    });
    uit.sort(function (a, b) { return a.km - b.km; });
    return { ok: uit.length > 0, aantal: uit.length, lijst: uit.slice(0, AGR_AANTAL), straal: AGR_STRAAL, afgekapt: l.totaal !== null && l.totaal > l.items.length };
  }

  var api = { internetQuery: internetQuery, PROXY: PROXY, proxyUrl: proxyUrl, catnatUrl: catnatUrl, radonUrl: radonUrl, catnatPerRisico: catnatPerRisico, LINKS: LINKS, postcodeOk: postcodeOk, codeOk: codeOk, pct: pct, communesUrl: communesUrl, leesCommunes: leesCommunes, adresUrl: adresUrl, leesAdressen: leesAdressen, adresRisicoUrls: adresRisicoUrls, leesAdresRisico: leesAdresRisico, tfIndicatie: tfIndicatie, RAYON: RAYON,
    risicoUrls: risicoUrls, leesRisico: leesRisico, belastingUrl: belastingUrl, leesBelasting: leesBelasting, mairieUrl: mairieUrl,
    leesMairie: leesMairie, dvfUrl: dvfUrl, leesDvfPagina: leesDvfPagina, dvfSamenvatting: dvfSamenvatting, DVF_PAGE: DVF_PAGE, DVF_MAX_PAGINA: DVF_MAX_PAGINA, DVF_JAREN: DVF_JAREN, dvfKaartUrl: dvfKaartUrl, arcepUrl: arcepUrl,
    dechUrl: dechUrl, leesDechPagina: leesDechPagina, dechSamenvatting: dechSamenvatting, afstandKm: afstandKm, dechKaartUrl: dechKaartUrl, DECH_PAGE: DECH_PAGE, DECH_MAX_PAGINA: DECH_MAX_PAGINA,
    eauUrl: eauUrl, leesEau: leesEau, daeUrl: daeUrl, leesDaePagina: leesDaePagina, daeSamenvatting: daeSamenvatting, kmTekst: kmTekst, DAE_STRAAL: DAE_STRAAL, DAE_PAGE: DAE_PAGE, DAE_MAX_PAGINA: DAE_MAX_PAGINA,
    carbUrl: carbUrl, leesCarbPagina: leesCarbPagina, carbSamenvatting: carbSamenvatting, CARB_MAX_PAGINA: CARB_MAX_PAGINA, CARB_STRAAL_TEKST: String(CARB_STRAAL),
    agrUrl: agrUrl, leesAgr: leesAgr, agrSamenvatting: agrSamenvatting, AGR_STRAAL: AGR_STRAAL };
  root.IfGem = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
