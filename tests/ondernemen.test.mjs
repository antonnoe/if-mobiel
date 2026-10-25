// Ondernemen als route: validatie (ondernemen-lib.js), koppeling in modules.json, het veld `ook`
// en de omschrijvingen per thema. De live-test slaat vriendelijk over bij een netwerkfout.
// Draaien: node --test tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { ondernemenValideer, ondernemenUrl, ondernemenOok } = require(path.join(root, "ondernemen-lib.js"));
const cat = JSON.parse(fs.readFileSync(path.join(root, "modules.json"), "utf8"));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

const geldig = () => JSON.parse(JSON.stringify({ stappen: [
  { nr: 1, titel: "Mag het", items: [{ titel: "Checker", pad: "/checker/", soort: "artikel" }] },
  { nr: 2, titel: "Starten", items: [
    { titel: "Gîte", pad: "/gite/", soort: "artikel", ook: ["wonen"] },
    { titel: "Kompas", soort: "tool", module: "gitekompas" }] },
  { nr: 3, titel: "Factureren", items: [{ titel: "Wijzer", soort: "tool", module: "efacturatie" }, { titel: "Extern", url: "https://voorbeeld.example/x", soort: "artikel" }] },
  { nr: 4, titel: "Belasting", items: [{ titel: "Later", soort: "artikel", later: true }] }] }));

test("geldige vorm wordt aangenomen en genormaliseerd", () => {
  const v = ondernemenValideer(geldig());
  assert.equal(v.ok, true);
  assert.equal(v.stappen.length, 4);
  assert.deepEqual(v.stappen.map(s => s.nr), [1, 2, 3, 4]);
  assert.equal(v.stappen[1].items[0].soort, "artikel");
  assert.equal(v.stappen[1].items[1].module, "gitekompas");
  assert.equal(v.stappen[3].items[0].later, true);
  assert.equal(ondernemenUrl("https://infofrankrijk.com/", v.stappen[0].items[0]), "https://infofrankrijk.com/checker/");
  assert.equal(ondernemenUrl("https://infofrankrijk.com", v.stappen[2].items[1]), "https://voorbeeld.example/x");
  assert.deepEqual(ondernemenOok(v.stappen, "wonen").map(i => i.titel), ["Gîte"]);
  assert.deepEqual(ondernemenOok(v.stappen, "geld"), []);
});

test("ongeldige vormen geven {ok:false} en nooit een uitzondering", () => {
  for (const slecht of [null, undefined, 5, "x", [], {}, { stappen: [] }, { stappen: [{ titel: "a", items: [] }] }]) {
    assert.equal(ondernemenValideer(slecht).ok, false);
  }
  const mut = (f) => { const d = geldig(); f(d); return ondernemenValideer(d).ok; };
  assert.equal(mut(d => { d.stappen[0].items[0].pad = "geen-slashes"; }), false);
  assert.equal(mut(d => { d.stappen[0].items[0].pad = "https://x.nl/a/"; }), false);
  assert.equal(mut(d => { delete d.stappen[0].items[0].pad; }), false);
  assert.equal(mut(d => { d.stappen[1].items[1].module = ""; }), false);
  assert.equal(mut(d => { d.stappen[0].items[0].soort = "film"; }), false);
  assert.equal(mut(d => { d.stappen[2].items[1].url = "http://onveilig.example/"; }), false);
  assert.equal(mut(d => { d.stappen[1].items[0].ook = "wonen"; }), false);
  assert.equal(mut(d => { d.stappen[0].titel = " "; }), false);
});

test("modules.json: Ondernemen opent het eigen scherm met bron", () => {
  const t = cat.themas.find(x => x.id === "ondernemen");
  assert.equal(t.scherm, "ondernemen");
  assert.equal(t.bron, "https://if-plek.vercel.app/ondernemen.json");
  assert.ok(!t.nieuws, "geen nieuwskoppeling verzinnen");
  assert.ok(/^https:\/\/infofrankrijk\.com\/.+\/$/.test(t.terugval));
  assert.match(html, /ondernemen:"ondernemen"/);
  assert.match(html, /<script src="\.\/ondernemen-lib\.js"><\/script>/);
  assert.match(html, /<sc-if value="\{\{ isOndernemen \}\}"/);
});

test("de drie tools uit de route bestaan in de catalogus en staan onder Ondernemen", () => {
  for (const id of ["gitekompas", "efacturatie"]) {
    const m = cat.modules.find(x => x.id === id);
    assert.ok(m, id);
    assert.equal(m.thema, "ondernemen", id);
    assert.equal(m.standaard, "uit", id);
  }
});

test("het veld ook: Gîtekompas hoort bij Ondernemen en Geld; Erfrecht alleen bij Geld", () => {
  const ids = cat.themas.map(t => t.id);
  const g = cat.modules.find(m => m.id === "gitekompas");
  assert.equal(g.thema, "ondernemen");
  assert.deepEqual(g.ook, ["geld"]);
  assert.equal(cat.modules.find(m => m.id === "erfrecht").ook, undefined);
  assert.equal(cat.modules.find(m => m.id === "erfrecht").thema, "geld");
  for (const m of cat.modules) {
    if (m.ook === undefined) continue;
    assert.ok(Array.isArray(m.ook) && m.ook.length > 0, m.id);
    for (const o of m.ook) {
      assert.ok(ids.includes(o), m.id + " ook " + o);
      assert.notEqual(o, m.thema, m.id + " staat anders twee keer in zijn eigen thema");
    }
    assert.equal(new Set(m.ook).size, m.ook.length, m.id);
  }
  // elke module-id komt één keer voor: Mijn modules en zoeken tonen dus één rij
  const mid = cat.modules.map(m => m.id);
  assert.equal(new Set(mid).size, mid.length);
});

test("omschrijvingen: negen aanwezig, twee vaste teksten letterlijk", () => {
  assert.equal(cat.themas.length, 9);
  for (const t of cat.themas) {
    assert.ok(typeof t.omschrijving === "string" && t.omschrijving.trim().length > 20, t.id);
    assert.ok(t.omschrijving.endsWith("."), t.id);
    assert.ok(!/[–—]/.test(t.omschrijving), "geen lange streepjes " + t.id);
  }
  const per = Object.fromEntries(cat.themas.map(t => [t.id, t.omschrijving]));
  assert.equal(per.geld, "Uw eigen financiën als particulier: inkomen, belasting, sociale heffingen, erfenis en de kosten van uw huis.");
  assert.equal(per.ondernemen, "Voor wie in Frankrijk zelf iets onderneemt of verhuurt: of het mag, starten, factureren en belastingregels voor ondernemers.");
});

test("live: ondernemen.json op if-plek is geldig", async (t) => {
  let d;
  try {
    const r = await fetch("https://if-plek.vercel.app/ondernemen.json", { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return t.skip("status " + r.status);
    d = await r.json();
  } catch (e) { return t.skip("geen netwerk"); }
  const v = ondernemenValideer(d);
  assert.equal(v.ok, true, v.fout);
  assert.equal(v.stappen.length, 4);
  const mods = v.stappen.flatMap(s => s.items).filter(i => i.soort === "tool").map(i => i.module);
  for (const id of mods) assert.ok(cat.modules.find(m => m.id === id), id);
  for (const it of v.stappen.flatMap(s => s.items)) if (it.soort === "artikel" && !it.later) assert.ok(it.pad || it.url, it.titel);
});
