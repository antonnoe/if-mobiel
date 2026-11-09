// Vervoershub (9-11-2026). Draaien: node --test tests/vervoershub.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const cat = JSON.parse(readFileSync(new URL("../modules.json", import.meta.url), "utf8"));
const m = cat.modules.find(x => x.id === "vervoershub");
test("Lift en transport: module in thema ervaring, knop naar Nederlanders.fr", () => {
  assert.ok(m);
  assert.equal(m.naam, "Lift en transport");
  assert.equal(m.thema, "ervaring");
  assert.equal(m.prijs, "gratis");
  assert.equal(m.kind, "iframe");
  assert.equal(m.weergave, "knop");
  assert.notEqual(m.standaard, "uit");
  assert.equal(m.url, "https://www.nederlanders.fr/page/lift-en-transportcentrale");
  "lift meerijden rit transport verhuizing verhuizen vervoer aanhanger bestelbus covoiturage vervoershub".split(" ")
    .forEach(w => assert.ok(m.zoekwoorden.split(" ").includes(w), w));
  assert.ok(![m.naam, m.meta, m.over].some(t => /[–—]/.test(t)));
  assert.ok(cat.themas.some(t => t.id === "ervaring"));
});
