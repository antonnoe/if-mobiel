// Controle van het nieuwsscherm: pure functies (nieuws-lib.js) en de vorm van de live-levering.
// Draaien: node --test tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const L = createRequire(import.meta.url)("../nieuws-lib.js");
const cat = JSON.parse(fs.readFileSync(path.join(root, "modules.json"), "utf8"));

const art = (id, datum, extra = {}) => ({ id, titel: "Titel " + id, datum, summary: "s", soort: "pers", bronMeta: { naam: "Bron " + id, datum }, ...extra });
const fixture = {
  tegels: [
    { soort: "pers", id: "pers-landelijk", thema: "landelijk", label: "Landelijk", artikelen: [art("a", "2026-10-01T10:00:00Z")] },
    { soort: "overheid", id: "overheid-geld-belasting", thema: "geld-belasting", label: "Geld & belasting",
      artikelen: [art("b", "2026-10-05T10:00:00Z"), art("c", "2026-10-02T10:00:00Z"), art("d", "2026-10-09T10:00:00Z")] },
    { soort: "overheid", id: "overheid-economie", thema: "economie", label: "Economie",
      artikelen: [art("e", "2026-10-07T10:00:00Z"), art("f", "2026-10-03T10:00:00Z")] },
    { soort: "overheid", id: "overheid-leeg", thema: "leeg", label: "Leeg", artikelen: [], artikelAantal: 4 },
    { soort: "overheid", id: "overheid-zorg", thema: "zorg", label: "Zorg en gezondheid",
      artikelen: [art("g", "2026-10-08T10:00:00Z"), art("h", "2026-10-04T10:00:00Z")] },
    { soort: "pers", id: "pers-twee", thema: "twee", label: "Twee", artikelen: [art("i", "2026-10-06T10:00:00Z"), art("j", "2026-10-06T09:00:00Z")] },
    { soort: "archief", id: "archief", thema: "archief", label: "Archief", artikelen: [], artikelAantal: 114, artikelenApart: true }
  ]
};

test("tegels uit de API: archief apart, lege tegels vallen weg, aantal uit de data", () => {
  const u = L.tegelsUitApi(fixture);
  assert.equal(u.archiefAantal, 114);
  assert.ok(!u.tegels.some(t => t.id === "archief" || t.id === "overheid-leeg"));
  assert.equal(u.tegels.find(t => t.id === "overheid-zorg").items[0].key, "overheid-zorg/g");
  assert.equal(u.tegels.find(t => t.id === "overheid-zorg").label, "Zorg en gezondheid");
});

test("archiefaantal: zonder betrouwbaar getal geen getal", () => {
  assert.equal(L.tegelsUitApi({ tegels: [{ soort: "archief", id: "archief" }] }).archiefAantal, null);
  assert.equal(L.tegelsUitApi({ tegels: [] }).archiefAantal, null);
  assert.equal(L.tegelsUitApi(null).tegels.length, 0);
});

test("tegels van veel naar weinig, gelijke aantallen op volgorde van de API", () => {
  const ids = L.sorteerOpAantal(L.tegelsUitApi(fixture).tegels).map(t => t.id);
  assert.deepEqual(ids, ["overheid-geld-belasting", "overheid-economie", "overheid-zorg", "pers-twee", "pers-landelijk"]);
});

test("strook: de drie nieuwste over meerdere tegels", () => {
  const { tegels } = L.tegelsUitApi(fixture);
  const s = L.stripSelectie(tegels, ["geld-belasting", "economie"]);
  assert.deepEqual(s.map(a => a.id), ["d", "e", "b"]);
  assert.equal(s[0].tegelId, "overheid-geld-belasting");
  assert.equal(s[1].tegelId, "overheid-economie");
  assert.deepEqual(L.stripSelectie(tegels, ["zorg"]).map(a => a.id), ["g", "h"]);
  assert.deepEqual(L.stripSelectie(tegels, ["bestaat-niet"]), []);
  assert.deepEqual(L.stripSelectie(tegels, []), []);
});

test("strook 'alle nieuws': een bestaand API-thema gaat direct naar die tegel", () => {
  const { tegels } = L.tegelsUitApi(fixture);
  assert.equal(L.stripAlleDoel(tegels, ["zorg"]).id, "overheid-zorg");
  assert.equal(L.stripAlleDoel(tegels, ["geld-belasting", "economie"]), null);
  assert.equal(L.stripAlleDoel(tegels, ["verenigingen"]), null);
  assert.equal(L.stripAlleDoel(tegels, ["geld-belasting", "bestaat-niet"]).id, "overheid-geld-belasting");
});

test("themakoppeling uit modules.json: de vijf koppelingen exact", () => {
  // 29-10-2026: geen enkel thema heeft nog een nieuwsstrook (de stromen pasten niet bij de thema's).
  ["geld", "overheid", "adressen", "wonen", "gezondheid", "ervaring", "ondernemen", "taal", "nieuws"].forEach(id => assert.deepEqual(L.nieuwsIdsVoorThema(cat.themas, id), [], id));
  assert.deepEqual(L.nieuwsIdsVoorThema(cat.themas, "onbekend"), []);
});

test("n van N: het bericht waarvan de bovenkant het laatst boven de drempel kwam", () => {
  assert.equal(L.huidigIndex([300, 900, 1500], 100), 0);
  assert.equal(L.huidigIndex([-50, 700, 1300], 100), 0);
  assert.equal(L.huidigIndex([-900, -200, 600], 100), 1);
  assert.equal(L.huidigIndex([-1500, -900, -10], 100), 2);
  assert.equal(L.huidigIndex([], 100), 0);
  assert.equal(L.nVanN(0, 8), "1 van 8");
  assert.equal(L.nVanN(2, 8), "3 van 8");
});

test("alinea's", () => {
  assert.deepEqual(L.alineas("a\n\nb\n\n\n c "), ["a", "b", "c"]);
  assert.deepEqual(L.alineas(null), []);
});

test("index.html: geen dode paden naar het oude Actueel-scherm", () => {
  const h = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.ok(!/screen:\s*"artikel"/.test(h));
  assert.ok(!h.includes("openArtikel"));
  assert.ok(h.includes('src="./nieuws-lib.js"'));
});

test("live: vorm van /api/actueel en /api/actueel-archief", async t => {
  let d, ar;
  try {
    const sig = () => AbortSignal.timeout(20000);
    const r = await fetch("https://nlfr-menu.vercel.app/api/actueel", { signal: sig() });
    if (!r.ok) return t.skip("status " + r.status);
    d = await r.json();
    const r2 = await fetch("https://nlfr-menu.vercel.app/api/actueel-archief", { signal: sig() });
    ar = r2.ok ? await r2.json() : null;
  } catch (e) { return t.skip("geen netwerk: " + e.message); }
  assert.ok(Array.isArray(d.tegels) && d.tegels.length > 0);
  d.tegels.forEach(x => { assert.ok(x.id && x.label, "id en label"); assert.ok(Array.isArray(x.artikelen) || x.soort === "archief"); });
  const u = L.tegelsUitApi(d);
  assert.ok(u.tegels.length > 0);
  u.tegels.forEach(x => x.items.forEach(a => { assert.ok(a.id && a.titel && a.datum, x.id); assert.ok(isFinite(Date.parse(a.datum))); }));
  if (u.archiefAantal != null && ar) assert.equal(ar.artikelen.length, u.archiefAantal);
});
