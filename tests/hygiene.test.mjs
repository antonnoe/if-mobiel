// Hygiënecontroles (Alim'confiance): aanvraag en verwerking. De voorbeeldrij is een echt record van de officiële API (29-10-2026).
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const H = createRequire(import.meta.url)("../hygiene-lib.js");

const REC = { app_libelle_activite_etablissement: ["Restaurants"], app_libelle_etablissement: "L'ISLE DIVINE", code_postal: "84800",
  com_name: "L'Isle-sur-la-Sorgue", synthese_eval_sanit: "Très satisfaisant", date_inspection: "2026-10-28T00:00:00+00:00",
  siret: "10249045500015", libelle_commune: "L'Isle-sur-la-Sorgue", adresse_activite: "16 RUE ROSE GOUDARD", code_ua: "10249045500015_00001" };

test("url: officiële API, postcode als tekst, nieuwste eerst, geen select en geen eigen headers nodig", () => {
  const u = H.url("84800", 0, 20);
  assert.ok(u.startsWith("https://dgal.opendatasoft.com/api/explore/v2.1/catalog/datasets/export_alimconfiance/records?"));
  const q = new URL(u).searchParams;
  assert.equal(q.get("where"), 'code_postal="84800"');
  assert.equal(q.get("order_by"), "date_inspection desc");
  assert.equal(q.get("limit"), "20"); assert.equal(q.get("offset"), "0");
  assert.equal(q.has("select"), false);
  assert.equal(H.url("8480", 0), ""); assert.equal(H.url('84800" or 1=1', 0), "");
  assert.equal(new URL(H.url("84800", 99999)).searchParams.get("offset"), "9980");
});

test("lees: record wordt een kaart met naam, soort, adres, uitkomst en datum", () => {
  const l = H.lees({ total_count: 71472, results: [REC] });
  assert.equal(l.totaal, 71472);
  assert.deepEqual(l.items[0], { sleutel: "10249045500015_00001", naam: "L'Isle Divine", soort: "Restaurants",
    adres: "16 Rue Rose Goudard, 84800 L'Isle-sur-la-Sorgue", uitkomst: "Très satisfaisant", datum: "28-10-2026" });
});

test("lees: onverwachte vorm geeft null, record zonder naam valt af, ontbrekende velden geven lege tekst", () => {
  assert.equal(H.lees(null), null); assert.equal(H.lees({}), null); assert.equal(H.lees({ results: "x" }), null);
  const l = H.lees({ results: [{}, null, { libelle_etablissement: "Bar", code_postal: "84800" }] });
  assert.equal(l.items.length, 1); assert.equal(l.items[0].uitkomst, ""); assert.equal(l.items[0].datum, "");
  assert.equal(l.aantalRuw, 3);
});

test("voegSamen houdt de nieuwste per zaak en kanMeer volgt het totaal en de grens van 10000", () => {
  const a = H.item(REC), b = H.item(Object.assign({}, REC, { date_inspection: "2025-01-02T00:00:00+00:00" }));
  const s = H.voegSamen([a], [b]);
  assert.equal(s.length, 1); assert.equal(s[0].datum, "28-10-2026");
  assert.equal(H.kanMeer(0, 20, 50), true); assert.equal(H.kanMeer(40, 10, 50), false);
  assert.equal(H.kanMeer(9980, 20, 71472), false); assert.equal(H.kanMeer(0, 0, 50), false);
});

test("uitkomstTekst: Nederlandse omschrijving met het Franse origineel, onbekende tekst ongewijzigd", () => {
  assert.equal(H.uitkomstTekst("Très satisfaisant"), "Zeer tevredenstellend (Très satisfaisant)");
  assert.equal(H.uitkomstTekst("Iets nieuws"), "Iets nieuws"); assert.equal(H.uitkomstTekst(null), "");
});
