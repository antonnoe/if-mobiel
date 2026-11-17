// Herstelronde 2 van ronde 3 (17-11-2026): privacyregel gelijk aan Brief uitleggen, documentatiekopie van de Edge Function infopoche-vraag.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const V = require("../vraag-lib.js");
const B = fs.readFileSync(new URL("../brief-lib.js", import.meta.url), "utf8");
const F = fs.readFileSync(new URL("../supabase/functions/infopoche-vraag/index.ts", import.meta.url), "utf8");

test("privacyregel: zelfde kern als Brief uitleggen", () => {
  assert.match(B, /Anthropic kan zulke gegevens zelf een beperkte tijd bewaren/);
  assert.match(V.PRIVACY, /Anthropic kan zulke gegevens zelf een beperkte tijd bewaren/);
  assert.match(V.PRIVACY, /InfoPoche bewaart hem niet en schrijft hem nergens op/);
  assert.match(V.PRIVACY, /zoektermen .* infofrankrijk\.com/);
});
test("edge function: limiet via RPC, budget, alinea-selectie, nafilter", () => {
  assert.match(F, /infopoche_vraag_toegang/);
  assert.match(F, /BUDGET_MS = 40000/);
  assert.match(F, /PER_BRON = 6000/);
  assert.match(F, /TOTAAL = 24000/);
  assert.match(F, /<vraag>\$\{vraag\}<\/vraag>/);
  assert.match(F, /gedichtVorm/);
  assert.match(F, /Europe\/Paris/);
  assert.match(F, /modified/);
  assert.equal(/\.insert\(\{\}\)/.test(F), false, "geen losse insert meer");
  assert.equal(/Infopoche/.test(F), false, "spelling InfoPoche");
});
