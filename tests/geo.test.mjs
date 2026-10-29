// Locatie op verzoek: van coördinaten naar postcode (geo.api.gouv.fr) en kaartlink bij een controle.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const req = createRequire(import.meta.url), Hub = req("../hub-lib.js"), H = req("../hygiene-lib.js");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("geoUrl: alleen getallen, vijf decimalen, naar geo.api.gouv.fr", () => {
  const u = new URL(Hub.geoUrl(43.918798, 5.053056));
  assert.equal(u.origin + u.pathname, "https://geo.api.gouv.fr/communes");
  assert.equal(u.searchParams.get("lat"), "43.91880"); assert.equal(u.searchParams.get("lon"), "5.05306");
  assert.equal(Hub.geoUrl(NaN, 1), ""); assert.equal(Hub.geoUrl("43", "5"), "");
});

test("postcodeUitGeo: eerste geldige postcode, onverwachte vorm of lege lijst geeft null", () => {
  assert.deepEqual(Hub.postcodeUitGeo([{ nom: "L'Isle-sur-la-Sorgue", codesPostaux: ["84800"] }]), { postcode: "84800", plaats: "L'Isle-sur-la-Sorgue" });
  assert.deepEqual(Hub.postcodeUitGeo([{ nom: "X", codesPostaux: ["ab", "75001"] }]).postcode, "75001");
  for (const v of [[], {}, null, [{ nom: "X" }], [{ codesPostaux: [] }]]) assert.equal(Hub.postcodeUitGeo(v), null);
});

test("kaartUrl: coördinaten van de bron, anders naam en adres, anders niets", () => {
  const r = { app_libelle_etablissement: "L'ISLE DIVINE", code_postal: "84800", libelle_commune: "L'Isle-sur-la-Sorgue", adresse_activite: "16 RUE ROSE GOUDARD", code_ua: "a", geores: { lat: 43.918798, lon: 5.053056 } };
  assert.equal(H.item(r).kaart, "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("43.918798,5.053056"));
  const zonder = H.item(Object.assign({}, r, { geores: null }));
  assert.ok(decodeURIComponent(zonder.kaart).includes("L'Isle Divine, 16 Rue Rose Goudard, 84800"));
  assert.equal(H.item({ libelle_etablissement: "Bar" }).kaart, "");
});

test("app: locatie alleen op een tik, op twee plekken, zonder te bewaren", () => {
  assert.match(html, /hyGeoKlik: \(\) => this\.geoVraag\("hy"/);
  assert.match(html, /pcGeoKlik: \(\) => this\.geoVraag\("pc", pc => this\.setState\(\{pcInvoer: pc\}\)\)/);
  const m = html.slice(html.indexOf("  geoVraag("), html.indexOf("  geoMelding("));
  assert.ok(m.includes("getCurrentPosition") && !/localStorage/.test(m));
  assert.equal((html.match(/getCurrentPosition/g) || []).length, 1);
});

test("iframe-rechten: alleen uit de vaste lijst, en alleen voor modules die er in modules.json om vragen", () => {
  const cat = JSON.parse(readFileSync(new URL("../modules.json", import.meta.url), "utf8"));
  const toegestaan = ["geolocation"];
  const met = cat.modules.filter(m => m.rechten);
  assert.ok(met.every(m => toegestaan.includes(m.rechten)), "onbekend recht in modules.json");
  assert.deepEqual(met.map(m => m.id + ":" + m.rechten), ["overhedenbuurt:geolocation"]);
  assert.match(html, /const IFRAME_RECHTEN = \["geolocation"\];/);
  assert.match(html, /allow="\{\{ toolAllow \}\}"/);
  assert.match(html, /IFRAME_RECHTEN\.indexOf\(T\.rechten\) >= 0/);
});
