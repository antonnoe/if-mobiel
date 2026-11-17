// Ronde 29-10-2026 (hubtests van ronde 3 vervangen, zie ronde3.test.mjs): teksten van de Kennispiramide.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const lees = f => fs.readFileSync(new URL("../" + f, import.meta.url), "utf8");
const html = lees("index.html");
const pir = JSON.parse(lees("piramide.json"));

test("hub: themategels compact, minstens 11,5 px en 44 px tikvlak", () => {
  const blok = html.slice(html.indexOf('list="{{ hubTegels }}"'), html.indexOf('data-hubextra="dossier"'));
  assert.match(blok, /font-size:11\.5px/);
  assert.match(blok, /min-height:88px/);
  assert.match(html, /themaIcoStijl\(t\.id, k\.kleur, 28\)/);
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

test("Alle modules: kop per onderwerp en tegels in twee kolommen", () => {
  const i = html.indexOf('data-modgroep="1"');
  assert.ok(i > 0);
  const blok = html.slice(i, html.indexOf("</section>", i));
  assert.match(blok, /<h2 /);
  assert.match(blok, /data-modtegels="1" style="display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(blok, /aria-label="Bij favorieten" style="position:absolute;right:0;bottom:0;width:48px;height:48px/);
});
