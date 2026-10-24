// Ronde 24-10-2026: zes nieuwe modules (standaard uit, volledig in de app) en de noodregel op de hub.
// Draaien: node --test tests/ronde4.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const cat = JSON.parse(fs.readFileSync(path.join(root, "modules.json"), "utf8"));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const A = require(path.join(root, "artikel-lib.js"));
const mod = id => cat.modules.find(m => m.id === id);
const thema = cat.themas.map(t => t.id);

const NIEUW = {
  beroepenchecker: ["https://werk-in-frankrijk-platform-v02.vercel.app", "https://infofrankrijk.com/beroepenchecker-werken-of-ondernemen-in-frankrijk/"],
  energieportaal: ["https://energieportaal-pbuv.vercel.app", "https://infofrankrijk.com/energieportaal-bereken-de-energieprestatie-van-uw-franse-woning/"],
  vastgoedanalyse: ["https://vastgoed-analyse-v84x.vercel.app", "https://infofrankrijk.com/vastgoed-in-frankrijk-analyseren-per-adres-prijzen-risicos-dpe-plu/"],
  klusforum: ["https://infofrankrijk-klussen-archief.vercel.app", "https://infofrankrijk.com/uit-het-klusforum-van-infofrankrijk-com/"],
  controletechnique: ["https://controle-technique-zoeker.vercel.app", "https://infofrankrijk.com/de-controle-technique-de-franse-apk/"],
  overhedenbuurt: ["https://dashboard-admin-beige-ten.vercel.app", "https://infofrankrijk.com/vind-franse-overheden-en-instellingen-bij-jou-in-de-buurt/"],
};

test("zes nieuwe modules: velden, standaard uit, gratis, artikel-URL", () => {
  for (const [id, [url, artikel]] of Object.entries(NIEUW)) {
    const m = mod(id);
    assert.ok(m, id + " bestaat");
    assert.equal(m.kind, "iframe"); assert.equal(m.url, url); assert.equal(m.artikel, artikel);
    assert.equal(m.standaard, "uit"); assert.equal(m.prijs, "gratis"); assert.equal(m.weergave, "volledig");
    assert.ok(thema.includes(m.thema), id + " thema");
    assert.ok(m.naam && m.meta && m.over && m.over.length > 40, id + " teksten");
    assert.ok(A.isInApp(m.artikel), id + " artikel opent in de app");
  }
  assert.equal(new Set(cat.modules.map(m => m.id)).size, cat.modules.length, "ids uniek");
});

test("EnergiePortaal: volledige site naast de ongewijzigde eigen schil", () => {
  assert.match(mod("energieportaal").naam, /volledige site/);
  const e = mod("energie");
  assert.equal(e.kind, "energie"); assert.equal(e.naam, "Energie & verwarming"); assert.ok(!e.url);
});

test("toolkaart in het artikel wordt Tool in de app voor alle zes", () => {
  for (const [id, [url]] of Object.entries(NIEUW)) {
    const k = A.toolKaartVoor(url, cat.modules);
    assert.equal(k.soort, "module", id); assert.equal(k.module, id); assert.equal(k.label, "Tool in de app");
  }
});

test("noodregel op de hub leest uit gezondheid.spoed (één bron)", () => {
  const sp = cat.gezondheid.spoed;
  assert.equal(sp.hubTekst, "Spoed? Bel 15 (Samu) of 112");
  assert.deepEqual(sp.knoppen.map(k => k.tel), ["15", "112"]);
  assert.match(html, /spoedKnoppenLijst\(\)/);
  assert.match(html, /hubNoodKnoppen: this\.spoedKnoppenLijst\(\)/);
  assert.match(html, /hubNood: st\.screen === "hub"/);
  assert.ok(!/hubNoodTekst: "Spoed/.test(html), "tekst staat niet in de code");
});
