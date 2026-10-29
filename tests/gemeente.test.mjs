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
  assert.equal(G.risicoUrls("24037\" or 1=1"), null); assert.equal(G.belastingUrl("x"), ""); assert.equal(G.mairieUrl(""), ""); assert.equal(G.dvfUrl("1"), "");
  assert.ok(G.risicoUrls("2A004")); // Corsica
  const b = new URL(G.belastingUrl("24037")).searchParams;
  assert.equal(b.get("where"), 'insee_com="24037"'); assert.equal(b.get("order_by"), "exercice desc");
  assert.equal(b.get("select"), "exercice,libcom,taux_global_tfb,taux_global_tfnb,taux_plein_teom,taux_global_th");
  assert.equal(new URL(G.mairieUrl("24037")).searchParams.get("where"), 'pivot LIKE "mairie" AND code_insee_commune="24037"');
  assert.equal(G.dvfUrl("24037"), "https://apidf-preprod.cerema.fr/dvf_opendata/mutations/?code_insee=24037&page_size=1");
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

test("DVF: alleen een telling uit count, anders null (de kaart meldt dan dat DVF niet beschikbaar is); kaartlinks", () => {
  assert.deepEqual(G.leesDvf({ count: 8016, results: [] }), { aantal: 8016 }); assert.equal(G.leesDvf({}), null); assert.equal(G.leesDvf(null), null);
  assert.equal(G.dvfKaartUrl(44.8584, 1.2155), "https://explore.data.gouv.fr/immobilier?onglet=carte&lat=44.85840&lon=1.21550&zoom=14");
  assert.equal(G.dvfKaartUrl(null, null), "https://explore.data.gouv.fr/immobilier");
  assert.equal(G.arcepUrl(44.8584, 1.2155), "https://maconnexioninternet.arcep.fr/?lat=44.85840&lng=1.21550&zoom=14");
});
