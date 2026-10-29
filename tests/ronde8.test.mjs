// Ronde 29-10-2026: hub in drie lagen (Onze vier, onderwerpen, smalle rijen) en teksten van de Kennispiramide.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const lees = f => fs.readFileSync(new URL("../" + f, import.meta.url), "utf8");
const html = lees("index.html");
const pir = JSON.parse(lees("piramide.json"));

test("hub: kopje Onze vier, vier tegels met bordeaux rand van 1,5 px", () => {
  assert.match(html, />Onze vier</);
  assert.match(html, /list="\{\{ hubVier \}\}"[^>]*hint-placeholder-count="4"/);
  assert.match(html, /border:1\.5px solid #800000/);
  for (const t of ["Nederlanders.fr", "Het forum, sinds 2002", "Infofrankrijk", "Dossiers en gidsen, sinds 2001",
    "Café Claude", "Kort antwoord, volledige onderbouwing", "Nedergids", "Particulieren en dienstverleners"])
    assert.ok(html.includes('"' + t + '"'), t);
  assert.ok(!html.includes('"Particulieren en dienstverleners in Frankrijk"'));
});

test("hub: volgorde vier, onderwerpen, DossierFrankrijk, AI-tools, regio", () => {
  const i = s => { const n = html.indexOf(s); assert.ok(n > 0, s); return n; };
  const rij = [i(">Onze vier<"), i(">Of kies een onderwerp<"), i('list="{{ hubTegels }}"'), i("DossierFrankrijk, uw eigen dossier voor abonnees"), i("AI-tools, hulp bij uw vragen"), i("onClick=\"{{ openRegio }}\"")];
  assert.deepEqual(rij, rij.slice().sort((a, b) => a - b));
  assert.match(html, /openDossierDemo \}\}"[^>]*border:\.5px solid/);
});

test("hub: themategels compact, minstens 11,5 px en 44 px tikvlak", () => {
  const blok = html.slice(html.indexOf('list="{{ hubTegels }}"'), html.indexOf("DossierFrankrijk, uw eigen"));
  assert.match(blok, /font-size:11\.5px/);
  assert.match(blok, /min-height:88px/);
  assert.match(html, /themaIcoStijl\(t\.id, k\.kleur, 28\)/);
});

test("hub: Infofrankrijk opent het Nieuws-scherm met filter infofrankrijk", () => {
  assert.match(html, /this\.go\("nieuws"\); this\.setState\(\{nwFilter:"infofrankrijk"\}\)/);
});

test("piramide: nieuwe teksten en geen lange streepjes in lopende tekst", () => {
  const data = pir.BANDEN.find(b => /DATA/i.test(b.naam));
  assert.ok(data.omschrijving.endsWith("Data levert informatie, nog geen kennis: pas met een vraag en de juiste context wordt het bruikbaar."));
  assert.equal(data.bron, "Data verzinnen we niet zelf: alleen rang AAA, AA of A.");
  assert.ok(pir.BRONNEN_INTRO.includes("Wat geen rang heeft, zoals fora elders, sociale media en AI-uitvoer zonder bron, komt er niet in."));
  assert.doesNotMatch(JSON.stringify(pir), /[—–]/);
  assert.doesNotMatch(lees("piramide/scene.js").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ""), /[—–]/);
});

test("piramide: bronregel op de plaat wordt niet meer tot twee regels afgekapt", () => {
  const sc = lees("piramide/scene.js");
  assert.doesNotMatch(sc, /wrap\(g, bron,[^)]*\)\.slice\(0, 2\)/);
  assert.match(sc, /if \(bl\.length > 3\) return null/);
});

test("piramide: knoppenrij toont dat er meer komt", () => {
  assert.match(lees("piramide/opmaak.js"), /#pir-balk\[data-meer="1"\][^}]*mask-image/);
  assert.match(lees("piramide/scene.js"), /data-meer/);
});
