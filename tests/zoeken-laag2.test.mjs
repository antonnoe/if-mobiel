// Postzegel-ronde 13-11-2026, punt 3: zoeken laag 2, de AI-vraag via de bestaande module nlfrzoek
// (nlfr-if-zoek.vercel.app). Gecontroleerd 13-11-2026 in repo antonnoe/nlfr-if-zoek, api/search.js:
// de daadwerkelijke daglimieten in de code zijn 3 (anoniem/IP), 8 (ingelogd NING-lid) en 40
// (Infofrankrijk-abonnee, een stille technische veiligheidsgrens, niet als getal gecommuniceerd).
// De README van die repo noemt andere getallen (6 / 15) en is dus niet de bron van waarheid; alleen
// de code telt. Model claude-haiku-4-5-20251001 is 13-11-2026 live getest (POST naar /api/search) en
// gaf een goed antwoord met bronnen terug.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const lees = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const html = lees("index.html"), cat = JSON.parse(lees("modules.json"));

test("module nlfrzoek bestaat en wijst naar nlfr-if-zoek.vercel.app", () => {
  const m = cat.modules.find(x => x.id === "nlfrzoek");
  assert.ok(m, "module nlfrzoek ontbreekt");
  assert.equal(m.url, "https://nlfr-if-zoek.vercel.app");
});

test("laag2Vals: bouwt de juiste embed-url, verbergt zich zonder module of te korte vraag", () => {
  assert.match(html, /laag2Vals\(\)\{/);
  assert.match(html, /const toon = !!mod && qn\.length >= 2;/);
  assert.match(html, /mod\.url \+ "\?embed=1&q=" \+ encodeURIComponent\(qn\)/);
  assert.match(html, /this\.routeMetUrl\(mod, mod\.url \+ "\?embed=1&q="/);
});

test("het blok staat onder de resultaten, met de echte daglimiet uit de code (3 per dag), geen placeholder", () => {
  assert.match(html, /<sc-if value="\{\{ laag2Toon \}\}" hint-placeholder-val="\{\{ false \}\}">/);
  assert.ok(html.includes("Niet gevonden wat je zocht?"));
  assert.ok(html.includes("Stel je vraag in gewone woorden. Het antwoord komt uit onze bronnen, met bronvermelding."));
  assert.ok(html.includes(">Stel je vraag<"));
  assert.ok(html.includes("3 vragen per dag gratis, meer als lid van Nederlanders.fr of abonnee van Infofrankrijk."));
  assert.ok(!/\[N\] vragen per dag/.test(html));
  assert.ok(!/[–—]/.test(html.slice(html.indexOf("Niet gevonden wat je zocht?"), html.indexOf("Niet gevonden wat je zocht?") + 400)));
});
