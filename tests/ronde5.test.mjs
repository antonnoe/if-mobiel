// Ronde 24-10-2026 (2): de Taalassistent en het Zorglexicon zijn afgeschreven, het Woordenboek met uitleg is erbij.
// Draaien: node --test tests/ronde5.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const cat = JSON.parse(fs.readFileSync(path.join(root, "modules.json"), "utf8"));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const ids = cat.modules.map(m => m.id);

test("taal en zorglexicon zijn weg, woordenboek is er met de juiste url", () => {
  assert.ok(!ids.includes("taal"));
  assert.ok(!ids.includes("zorglexicon"));
  const w = cat.modules.find(m => m.id === "woordenboek");
  assert.ok(w);
  assert.equal(w.url, "https://taalhulp-fr.vercel.app/woordenboek");
  assert.equal(w.kind, "iframe");
  assert.equal(w.weergave, "volledig");
  assert.equal(w.thema, "taal");
  assert.equal(w.naam, "Woordenboek met uitleg");
});

test("geen verwijzing meer naar zorglexicon in de catalogus, geen kind taal of lex", () => {
  assert.ok(!JSON.stringify(cat).includes("zorglexicon"));
  assert.ok(!cat.modules.some(m => m.kind === "taal" || m.kind === "lex"));
});

test("index.html heeft geen Taalassistent-scherm meer", () => {
  assert.ok(!/Taalassistent/.test(html));
  assert.ok(!/isTaal|isLex|bigOpen|LEXSETS|const SC = /.test(html));
});

test("thema Taal heeft drie onderdelen en het woordenboek staat bij de dokter", () => {
  assert.deepEqual(cat.modules.filter(m => m.thema === "taal").map(m => m.id).sort(), ["correspondentie", "taalhulp", "woordenboek"]);
  assert.deepEqual(cat.gezondheid.onderwerpen.find(o => o.id === "woorden").modules, ["woordenboek"]);
});
