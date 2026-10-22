// AI-tools: de indeling is data (modules.json: ai en ai_uitleg) en moet onderbouwd zijn in docs/ai-onderzoek.md.
// Draaien: node --test tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const cat = JSON.parse(fs.readFileSync(path.join(root, "modules.json"), "utf8"));
const doc = fs.readFileSync(path.join(root, "docs/ai-onderzoek.md"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const metAi = [...cat.modules, ...cat.themas].filter(x => "ai" in x);

test("elk item met ai heeft een geldige waarde en een uitleg van een regel", () => {
  assert.ok(metAi.length >= 2);
  for (const x of metAi) {
    assert.ok(["tool", "ondersteuning"].includes(x.ai), x.id + ": ai");
    assert.ok(typeof x.ai_uitleg === "string" && x.ai_uitleg.length > 20, x.id + ": ai_uitleg");
    assert.ok(!/\n/.test(x.ai_uitleg) && !/[–—]/.test(x.ai_uitleg), x.id + ": een regel, geen lange streepjes");
  }
});

test("uitleg bevat geen belofte van onfeilbaarheid", () => {
  for (const x of metAi) assert.ok(!/altijd (juist|correct)|foutloos|100 ?%|onfeilbaar|gegarandeerd/i.test(x.ai_uitleg), x.id);
});

test("Cafe Claude staat erbij als tool en is een bestaande module", () => {
  const c = cat.modules.find(m => m.id === "cafeclaude");
  assert.ok(c);
  assert.equal(c.ai, "tool");
});

test("geen ai op iets dat niet bestaat: ids uniek, thema's bestaan", () => {
  const ids = cat.modules.map(m => m.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const m of cat.modules) assert.ok(m.thema === "ai" || m.thema === "dossier" || cat.themas.some(t => t.id === m.thema), m.id);
  for (const t of cat.themas.filter(t => "ai" in t)) assert.ok(t.scherm, t.id + " heeft een scherm om te openen");
});

test("docs/ai-onderzoek.md noemt elke module en elk thema met ai, met een URL of bronnaam", () => {
  for (const x of metAi) {
    assert.ok(new RegExp("###\\s+" + x.id.replace(/^./, c => "[" + c + c.toUpperCase() + "]") + "\\b").test(doc), x.id + " ontbreekt in het onderzoek");
  }
  for (const m of metAi.filter(x => x.url)) assert.ok(doc.includes(m.url.replace(/#.*$/, "")), m.id + ": url");
});

test("het scherm leest de data en kent geen eigen lijst met tools", () => {
  assert.match(html, /aiVals\(\)/);
  assert.match(html, /x\.ai === "tool" \|\| x\.ai === "ondersteuning"/);
  const blok = html.slice(html.indexOf("aiVals(){"), html.indexOf("openDossierDemo(){", html.indexOf("aiVals(){")));
  for (const m of cat.modules) assert.ok(!blok.includes('"' + m.id + '"'), "hardcoded id in aiVals: " + m.id);
});

test("Klussen heeft geen actieve zoekindex zonder CORS", () => {
  const k = cat.modules.find(m => m.id === "klussen");
  assert.equal(k.zoekindex, undefined);
});
