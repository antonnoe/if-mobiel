// Mijn gemeente: aanvragen en verwerking. De antwoordvormen komen uit de browsertest van 29-10-2026 vanuit infopoche.fr (Bergerac, 24037).
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const G = createRequire(import.meta.url)("../gemeente-lib.js");

test("urls: alleen geldige code en postcode, juiste eindpunten, geen eigen headers nodig", () => {
  const u = G.risicoUrls("24037");
  assert.equal(u.risques, "https://georisques.gouv.fr/api/v1/gaspar/risques?code_insee=24037&page_size=1");
  assert.equal(u.catnat, "https://georisques.gouv.fr/api/v1/gaspar/catnat?code_insee=24037&page_size=1");
  assert.equal(u.radon, "https://georisques.gouv.fr/api/v1/radon?code_insee=24037");
  assert.equal(u.sismique, "https://georisques.gouv.fr/api/v1/zonage_sismique?code_insee=24037");
  assert.equal(G.risicoUrls("24037\" or 1=1"), null); assert.equal(G.belastingUrl("x"), ""); assert.equal(G.mairieUrl(""), ""); assert.equal(G.dvfUrl("1", 2026, 1), "");
  assert.ok(G.risicoUrls("2A004")); // Corsica
  const b = new URL(G.belastingUrl("24037")).searchParams;
  assert.equal(b.get("where"), 'insee_com="24037"'); assert.equal(b.get("order_by"), "exercice desc");
  assert.equal(b.get("select"), "exercice,libcom,taux_global_tfb,taux_global_tfnb,taux_plein_teom,taux_global_th");
  assert.equal(new URL(G.mairieUrl("24037")).searchParams.get("where"), 'pivot LIKE "mairie" AND code_insee_commune="24037"');
  assert.equal(G.dvfUrl("84054", 2026, 2), "https://apidf-preprod.cerema.fr/dvf_opendata/mutations/?code_insee=84054&anneemut_min=2023&anneemut_max=2026&codtypbien=111,121&page_size=500&page=2");
  assert.equal(G.communesUrl("8480"), ""); assert.ok(G.communesUrl("84800").includes("codePostal=84800"));
});

test("leesCommunes: grootste gemeente eerst, coördinaten uit centre, onbruikbare items vallen af", () => {
  const l = G.leesCommunes([{ nom: "Klein", code: "84001", codeDepartement: "84", population: 100, centre: { coordinates: [5.1, 43.9] } },
    { nom: "Groot", code: "84054", codeDepartement: "84", population: 19000, centre: { coordinates: [5.05, 43.92] } }, { nom: "Zonder code" }, null]);
  assert.deepEqual(l.map(c => c.nom), ["Groot", "Klein"]); assert.equal(l[0].lat, 43.92); assert.equal(l[0].lon, 5.05);
  assert.deepEqual(G.leesCommunes({}), []);
});

test("leesRisico: lijst, aantal besluiten, radonklasse en zone; deels falen blijft werken", () => {
  const r = G.leesRisico({
    risques: { results: 1, data: [{ code_insee: "24037", risques_detail: [{ num_risque: "11", libelle_risque_long: "Inondation", zone_sismicite: "2 - FAIBLE" }, { libelle_risque_long: "Mouvement de terrain" }, { libelle_risque_long: "Inondation" }] }] },
    catnat: { results: 28, page: 1, data: [{}] }, radon: { data: [{ classe_potentiel: "3" }] }, sismique: { data: [{ zone_sismicite: "2 - FAIBLE" }] } });
  assert.deepEqual(r.lijst, ["Inondation", "Mouvement de terrain"]); assert.equal(r.catnat, 28); assert.equal(r.radon, 3); assert.equal(r.zone, "2 - FAIBLE"); assert.equal(r.ok, true);
  const half = G.leesRisico({ risques: null, catnat: { results: 3 }, radon: null, sismique: null });
  assert.equal(half.ok, true); assert.equal(half.catnat, 3); assert.deepEqual(half.lijst, []);
  assert.equal(G.leesRisico({}).ok, false); assert.equal(G.leesRisico({ radon: { data: [{ classe_potentiel: "9" }] } }).radon, null);
});

test("leesBelasting: per tarief het nieuwste gevulde jaar, geen bedragen, Nederlandse komma", () => {
  const b = G.leesBelasting({ results: [
    { exercice: 2024, taux_global_tfb: 64.88, taux_global_tfnb: 209.85, taux_plein_teom: 13.15, taux_global_th: 24.62 },
    { exercice: 2025, taux_global_tfb: 64.88, taux_global_tfnb: 209.89, taux_plein_teom: null, taux_global_th: 24.61 }] });
  assert.deepEqual(b.bebouwd, { jaar: 2025, waarde: 64.88 }); assert.deepEqual(b.onbebouwd, { jaar: 2025, waarde: 209.89 });
  assert.deepEqual(b.afval, { jaar: 2024, waarde: 13.15 }); assert.deepEqual(b.wonen, { jaar: 2025, waarde: 24.61 }); assert.equal(b.ok, true);
  assert.equal(G.pct(64.88), "64,88 %"); assert.equal(G.pct(13.1), "13,10 %"); assert.equal(G.pct(null), "");
  assert.equal(G.leesBelasting({ results: [] }).ok, false); assert.equal(G.leesBelasting(null), null);
});

test("leesMairie: naam, adres, telefoon en site uit de JSON-teksten van de Annuaire", () => {
  const m = G.leesMairie({ results: [{ nom: "Mairie de Bergerac", pivot: JSON.stringify([{ type_service_local: "mairie" }]),
    adresse: JSON.stringify([{ type_adresse: "Adresse", numero_voie: "Place de l'Hôtel de Ville", code_postal: "24100", nom_commune: "Bergerac" }]),
    telephone: JSON.stringify([{ valeur: "05 53 74 62 00" }]), site_internet: JSON.stringify([{ valeur: "https://www.bergerac.fr" }, { valeur: "javascript:alert(1)" }]) }] });
  assert.deepEqual(m, { ok: true, nom: "Mairie de Bergerac", adres: "Place de l'Hôtel de Ville, 24100 Bergerac", tel: "05 53 74 62 00", site: "https://www.bergerac.fr" });
  assert.equal(G.leesMairie({ results: [] }).ok, false); assert.equal(G.leesMairie(undefined), null);
  assert.equal(G.leesMairie({ results: [{ nom: "Hotel", pivot: JSON.stringify([{ type_service_local: "cpam" }]) }] }).ok, false);
});

test("DVF: pagina, mediaan per type woning, alleen verkopen, te weinig verkopen, onvolledig; kaartlinks", () => {
  assert.equal(G.leesDvfPagina({}), null); assert.equal(G.leesDvfPagina({ count: 3, results: "x" }), null); assert.deepEqual(G.leesDvfPagina({ count: 2, results: [1, 2] }), { count: 2, results: [1, 2] });
  const rec = (typ, prijs, m2, nat = "Vente", jaar = 2024) => ({ libnatmut: nat, codtypbien: typ, valeurfonc: String(prijs) + ".00", sbati: String(m2) + ".00", anneemut: jaar });
  const huizen = [100000, 200000, 300000, 400000, 5000000].map(p => rec("111", p, 100)).concat([rec("111", 999999, 100, "Echange"), rec("111", 0, 100)]);
  const s = G.dvfSamenvatting(huizen.concat([rec("121", 100000, 50, "Vente", 2022), rec("121", 150000, 50)]), false);
  assert.equal(s.huis.n, 5); assert.equal(s.huis.prijs, 300000); assert.equal(s.huis.perM2, 3000); assert.equal(s.huis.genoeg, true);
  assert.equal(s.huis.perM2Laag, 2000); assert.equal(s.huis.perM2Hoog, 4000);
  assert.equal(s.app.n, 2); assert.equal(s.app.genoeg, false); assert.equal(s.app.prijs, 125000); assert.equal(s.app.perM2, null);
  assert.equal(s.van, 2022); assert.equal(s.tot, 2024); assert.equal(s.ok, true); assert.equal(G.dvfSamenvatting([], false).ok, false); assert.equal(G.dvfSamenvatting(null), null);
  assert.equal(G.dvfSamenvatting(huizen, true).onvolledig, true);
  assert.equal(G.dvfKaartUrl(44.8584, 1.2155), "https://explore.data.gouv.fr/immobilier?onglet=carte&lat=44.85840&lon=1.21550&zoom=14");
  assert.equal(G.dvfKaartUrl(null, null), "https://explore.data.gouv.fr/immobilier");
  assert.equal(G.arcepUrl(44.8584, 1.2155), "https://maconnexioninternet.arcep.fr/?lat=44.85840&lng=1.21550&zoom=14");
});

test("adres: Géoplateforme-zoek, coördinaten lon,lat, onbruikbare treffers vallen af", () => {
  assert.equal(G.adresUrl("ab"), ""); const u = new URL(G.adresUrl("16 rue rose goudard 84800"));
  assert.equal(u.origin + u.pathname, "https://data.geopf.fr/geocodage/search"); assert.equal(u.searchParams.get("limit"), "5");
  const l = G.leesAdressen({ features: [{ geometry: { coordinates: [5.053056, 43.918798] }, properties: { label: "16 Rue Rose Goudard 84800 L'Isle-sur-la-Sorgue", citycode: "84054", city: "L'Isle-sur-la-Sorgue", postcode: "84800", context: "84, Vaucluse, Provence-Alpes-Côte d'Azur" } },
    { geometry: { coordinates: [1, 2] }, properties: { label: "Zonder code" } }, null] });
  assert.equal(l.length, 1); assert.deepEqual([l[0].code, l[0].dep, l[0].lat, l[0].lon, l[0].pc], ["84054", "84", 43.918798, 5.053056, "84800"]);
  assert.deepEqual(G.leesAdressen({}), []);
});

test("adresRisicoUrls: lon,lat, rayon 500 m, zes eindpunten", () => {
  const u = G.adresRisicoUrls(44.8517, 0.4833);
  assert.equal(u.rga, "https://georisques.gouv.fr/api/v1/rga?latlon=0.48330%2C44.85170");
  assert.ok(u.azi.endsWith("&rayon=500") && u.tri.includes("/gaspar/tri?") && u.mvt.includes("/mvt?") && u.cavites.includes("/cavites?") && u.sismique.includes("/zonage_sismique?latlon="));
  assert.equal(G.adresRisicoUrls(NaN, 1), null);
});

test("leesAdresRisico: kleigrond, overstromingsgebieden, bodembeweging, holle ruimten en zone op het adres (vormen van Bergerac)", () => {
  const a = G.leesAdresRisico({ rga: { codeExposition: "2", exposition: "Exposition moyenne" },
    azi: { data: [{ libelle_azi: "La Dordogne du conflent du Couzeau au confluent du Caudeau" }, { libelle_azi: "Le Caudeau de sa source au confluent de la Dordogne" }] },
    tri: { data: [{ libelle_tri: "BERGERAC" }] }, mvt: { results: 1, data: [{ type: "Erosion de berges", lieu: "Ile de la Pelouse", date_debut: "2006-06-01" }] },
    cavites: { results: 0, data: [] }, sismique: { data: [{ zone_sismicite: "1 - TRES FAIBLE" }] } });
  assert.equal(a.kleigrond, "Matig (Exposition moyenne)"); assert.equal(a.azi.length, 2); assert.deepEqual(a.tri, ["BERGERAC"]);
  assert.deepEqual(a.mvt, [{ type: "Erosion de berges", lieu: "Ile de la Pelouse", jaar: "2006" }]); assert.equal(a.cavites, 0); assert.equal(a.zone, "1 - TRES FAIBLE"); assert.equal(a.ok, true);
  assert.equal(G.leesAdresRisico({}).ok, false); assert.equal(G.leesAdresRisico({ rga: {} }).kleigrond, null);
  const r = G.leesRisico({ risques: null, catnat: { results: 3 }, adres: { rga: { codeExposition: "3", exposition: "Exposition forte" } } });
  assert.equal(r.ok, true); assert.equal(r.adres.kleigrond, "Hoog (Exposition forte)");
});

test("tfIndicatie: de helft van de cadastrale huurwaarde maal het tarief, geen bedrag zonder waarde", () => {
  assert.equal(G.tfIndicatie(3000, 64.88), 973); assert.equal(G.tfIndicatie("3 000,50", 64.88), 973);
  for (const v of ["", "abc", 0, -5, 5000000]) assert.equal(G.tfIndicatie(v, 64.88), null);
  assert.equal(G.tfIndicatie(3000, null), null);
});

// ---- tussenlaag (api/gemeente.js), met een nagebootste fetch
const maak = createRequire(import.meta.url)("../api/gemeente.js").maak;
function aanroep(handler, url, method = "GET") {
  return new Promise(klaar => {
    const h = {}; const res = { statusCode: 0, setHeader: (k, v) => { h[k.toLowerCase()] = v; }, end: b => klaar({ status: res.statusCode, h, body: JSON.parse(b) }) };
    handler({ method, url }, res);
  });
}
const ok = body => ({ ok: true, status: 200, json: async () => body });

test("tussenlaag: alleen GET, alleen bekende bronnen, parameters gecontroleerd, nooit een vrije URL", async () => {
  const urls = []; const h = maak(async u => { urls.push(u); return ok({ data: [] }); });
  assert.equal((await aanroep(h, "/api/gemeente?bron=radon&code=24037", "POST")).status, 405);
  assert.equal((await aanroep(h, "/api/gemeente?bron=https://evil.example/&code=24037")).status, 400);
  assert.equal((await aanroep(h, "/api/gemeente?bron=constructor&code=24037")).status, 400);
  assert.equal((await aanroep(h, "/api/gemeente?bron=radon&code=24037%22%20or")).status, 400);
  assert.equal((await aanroep(h, "/api/gemeente?bron=dvf&code=24037&jaar=abc")).status, 400);
  assert.equal(urls.length, 0, "geen enkele upstream-aanvraag bij ongeldige invoer");
});

test("tussenlaag: radon gaat naar Géorisques met een eerlijke User-Agent en wordt gecachet", async () => {
  let kop; const h = maak(async (u, o) => { kop = [u, o.headers["User-Agent"]]; return ok({ data: [{ classe_potentiel: "1" }] }); });
  const r = await aanroep(h, "/api/gemeente?bron=radon&code=62610");
  assert.equal(r.status, 200); assert.deepEqual(r.body.data, [{ classe_potentiel: "1" }]);
  assert.equal(kop[0], "https://georisques.gouv.fr/api/v1/radon?code_insee=62610"); assert.match(kop[1], /^Infopoche\/1\.0/); assert.ok(!/Mozilla/.test(kop[1]));
  assert.match(r.h["cache-control"], /s-maxage=86400/);
});

test("tussenlaag: catnat voegt pagina's samen en houdt alleen de gebruikte velden", async () => {
  const pag = n => ({ results: 3, total_pages: 2, data: n === 1 ? [{ libelle_risque_jo: "Inondations et/ou Coulées de Boue", date_debut_evt: "01/01/2023", date_fin_evt: "02/01/2023", geheim: "x" }, { libelle_risque_jo: "Mouvement de Terrain", date_debut_evt: "05/05/1999" }] : [{ libelle_risque_jo: "Inondations et/ou Coulées de Boue", date_debut_evt: "01/11/2024" }] });
  const h = maak(async u => ok(pag(new URL(u).searchParams.get("page") === "2" ? 2 : 1)));
  const r = await aanroep(h, "/api/gemeente?bron=catnat&code=62610");
  assert.equal(r.body.results, 3); assert.equal(r.body.data.length, 3); assert.ok(!("geheim" in r.body.data[0]));
  const per = G.catnatPerRisico(r.body.data);
  assert.deepEqual(per, [{ risico: "Inondations et/ou Coulées de Boue", aantal: 2, laatsteJaar: 2024 }, { risico: "Mouvement de Terrain", aantal: 1, laatsteJaar: 1999 }]);
});

test("tussenlaag: DVF alle pagina's in één antwoord, onvolledig als een pagina mislukt, 502 als de bron wegvalt", async () => {
  const rec = i => ({ libnatmut: "Vente", codtypbien: "111", valeurfonc: "100000.00", sbati: "100.00", anneemut: 2024, datemut: "2024-01-01", extra: i });
  const h = maak(async u => { const p = Number(new URL(u).searchParams.get("page")); return ok({ count: 1100, results: [rec(p)] }); });
  const r = await aanroep(h, "/api/gemeente?bron=dvf&code=84054&jaar=2026");
  assert.equal(r.body.count, 1100); assert.equal(r.body.results.length, 3); assert.equal(r.body.onvolledig, false); assert.ok(!("extra" in r.body.results[0]));
  const h2 = maak(async u => { const p = Number(new URL(u).searchParams.get("page")); if (p === 2) throw new Error("x"); return ok({ count: 1100, results: [rec(p)] }); });
  assert.equal((await aanroep(h2, "/api/gemeente?bron=dvf&code=84054&jaar=2026")).body.onvolledig, true);
  const h3 = maak(async () => { throw new Error("down"); });
  const r3 = await aanroep(h3, "/api/gemeente?bron=dvf&code=84054&jaar=2026"); assert.equal(r3.status, 502); assert.equal(r3.h["cache-control"], "no-store");
});

test("leesRisico: overstroming uit de natuurrampbesluiten, ook als de lijst van de gemeente hem niet noemt", () => {
  const r = G.leesRisico({ risques: { data: [{ risques_detail: [{ libelle_risque_long: "Mouvement de terrain" }] }] },
    catnat: { results: 15, data: [{ libelle_risque_jo: "Inondations et/ou Coulées de Boue", date_debut_evt: "01/01/2023" }, { libelle_risque_jo: "Inondations et/ou Coulées de Boue", date_debut_evt: "01/01/2024" }] } });
  assert.equal(r.vloedOntbreekt, true); assert.equal(r.vloed.aantal, 2); assert.equal(r.vloed.laatsteJaar, 2024); assert.equal(r.catnat, 15);
  const r2 = G.leesRisico({ risques: { data: [{ risques_detail: [{ libelle_risque_long: "Inondation" }] }] }, catnat: { results: 1, data: [{ libelle_risque_jo: "Inondations", date_debut_evt: "01/01/2023" }] } });
  assert.equal(r2.vloedOntbreekt, false);
  assert.equal(G.proxyUrl("dvf", { code: "84054", jaar: 2026 }), "/api/gemeente?bron=dvf&code=84054&jaar=2026");
});

test("tussenlaag: een mislukte poging (503) wordt herhaald, en na drie mislukkingen volgt 502 binnen het budget", async () => {
  let n = 0; const h = maak(async () => { n++; if (n < 3) return { ok: false, status: 503, json: async () => ({}) }; return ok({ data: [{ classe_potentiel: "2" }] }); });
  const r = await aanroep(h, "/api/gemeente?bron=radon&code=62610"); assert.equal(r.status, 200); assert.equal(n, 3);
  let m = 0; const h2 = maak(async () => { m++; return { ok: false, status: 503, json: async () => ({}) }; });
  const t0 = Date.now(); const r2 = await aanroep(h2, "/api/gemeente?bron=radon&code=62610"); assert.equal(r2.status, 502); assert.equal(m, 3); assert.ok(Date.now() - t0 < 3000);
});

import { readFileSync } from "node:fs";
test("Mijn gemeente: de internetkaart opent het bestaande hulpmiddel Internetverbinding in de app", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /this\.vindModule\("internet"\)/); assert.match(html, /this\.route\(inetMod\)/);
  assert.match(html, /Open het hulpmiddel Internetverbinding/); assert.match(html, /list="\{\{ k\.acties \}\}"/);
  const cat = JSON.parse(readFileSync(new URL("../modules.json", import.meta.url), "utf8"));
  const m = cat.modules.find(x => x.id === "internet"); assert.ok(m && m.kind === "iframe" && m.zichtbaar !== false);
});

test("internetQuery: alleen met een gekozen adres of locatie, met coördinaten, nooit voor alleen een gemeente", () => {
  assert.equal(G.internetQuery({ adres: "5 Rue de Boulogne 62170 Neuville-sous-Montreuil", lat: 50.474505, lon: 1.780041 }), "adres=5%20Rue%20de%20Boulogne%2062170%20Neuville-sous-Montreuil&lat=50.474505&lon=1.780041");
  assert.equal(G.internetQuery({ adres: "Uw locatie", lat: 50.4, lon: 1.7 }), "adres=Uw%20locatie%2C%20bij%20benadering&lat=50.400000&lon=1.700000");
  for (const c of [null, {}, { adres: "", lat: 1, lon: 1 }, { adres: "x", lat: NaN, lon: 1 }, { nom: "Neuville", lat: 50, lon: 1 }]) assert.equal(G.internetQuery(c), "");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /T\.id === "internet" && st\.toolQuery/); assert.match(html, /if \(this\.state\.toolQuery\) this\.setState\(\{toolQuery:""\}\)/);
});
