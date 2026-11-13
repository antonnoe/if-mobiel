// Postzegel-ronde 13-11-2026, punt 2: zoeken laag 1 uitgebreid met kalenderitems, het Klusarchief en Nedergids-links,
// gegroepeerd per bron. Meting vooraf (live, infopoche.fr, 13-11-2026): "taxe d'habitation" vond geen kalenderitem,
// "déchèterie" vond geen enkele relevante module, kaart of archiefdraad, "huisarts" en "septic tank" vonden alleen
// artikelen op Infofrankrijk, nooit de eigen bronnen van de app (Mijn gemeente, Kalender Frankrijk, Klusarchief).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const lees = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const html = lees("index.html"), cat = JSON.parse(lees("modules.json"));

test("gemeenteZoek: data bestaat, dekt déchèterie en taxe d'habitation, elke regel heeft woorden en titel", () => {
  const o = (cat.gemeenteZoek || {}).onderwerpen;
  assert.ok(Array.isArray(o) && o.length >= 6);
  for (const x of o) { assert.ok(x.titel && x.woorden, JSON.stringify(x)); assert.ok(!/[–—]/.test(x.titel + " " + x.regel)); }
  assert.ok(o.some(x => /dechèterie/i.test(x.woorden)));
  assert.ok(o.some(x => /taxe habitation/i.test(x.woorden)));
});

test("search(): doorzoekt gemeenteZoek en nedergidsLinks lokaal, zonder liggende streepjes", () => {
  assert.match(html, /gemeenteZoek \|\| \{\}\)\.onderwerpen \|\| \[\]\)\.forEach\(o => \{/);
  assert.match(html, /kind:"GEMEENTE", fr:o\.titel, nl:o\.regel \|\| "", where:"Mijn gemeente/);
  assert.match(html, /\(\(this\.state\.cat \|\| \{\}\)\.nedergidsLinks\) \|\| \[\]\)\.forEach\(l => \{/);
  assert.match(html, /kind:"GIDS", fr:l\.titel/);
});

test("Kalender: zoekt in het standaardvenster, hergebruikt kalItems als het scherm al open was, geen mislukking blijft hangen", () => {
  assert.match(html, /laadKalenderZoek\(\)\{/);
  assert.match(html, /if \(st\.kalStatus === "klaar" && st\.kalItems && st\.kalItems\.length\) \{ this\._zka = \{status:"klaar", items:st\.kalItems\}; return; \}/);
  assert.match(html, /this\._zka = lijst \? \{status:"klaar", items:lijst\} : null;/); // null bij fout: geen permanente cache van een mislukking
  assert.match(html, /kalenderZoekTreffers\(q\)\{/);
  assert.match(html, /this\.laadKalenderZoek\(\);\s*\n\s*this\.kalenderZoekTreffers\(q\)\.forEach\(r => out\.push\(r\)\);/);
  // bij het openen van het zoekscherm wordt alvast geladen (sneller dan wachten op twee tekens)
  assert.match(html, /if \(s === "zoek"\) \{ this\.laadZoekindexen\(\); this\.laadKalenderZoek\(\); \}/);
});

test("Klusarchief: eigen zoekfunctie (v=2, bron alles) vanuit het hoofdzoekveld, met debounce en cache per term", () => {
  assert.match(html, /zoekKlusarchief\(q\)\{/);
  assert.match(html, /Ka\.zoekUrl\(qn, 0, "alles"\)/);
  // leesZoek geeft {resultaten:[...]}, geen kale array: de array moet er expliciet uitgehaald worden
  assert.match(html, /const items = \(Ka\.leesZoek\(d\) \|\| \{\}\)\.resultaten \|\| \[\];/);
  assert.match(html, /kzVals\(\)\{/);
  assert.match(html, /onQ: e => \{ const v = e\.target\.value;.*this\.zoekKlusarchief\(v\); \}/);
  // de oude statische doorverwijzing blijft als terugval zolang er geen echte hits zijn
  assert.match(html, /zoekKlusToon: this\.zoekKlusAan\(\) && st\.q\.trim\(\)\.replace\(\/\\s\+\/g, " "\)\.length >= 3 && !this\.kzVals\(\)\.kzHeeft,/);
  assert.ok(html.includes('data-zoek-klusarchief="1"'));
});

test("drie bronnen als eigen label in het zoekscherm template (KAL, GEMEENTE/GIDS gemengd met MODULE, Klusarchief eigen kaart)", () => {
  assert.match(html, /<div style="padding:16px 18px 8px;font:600 12px Mulish;letter-spacing:\.10em;text-transform:uppercase;color:#5F6669">Klusarchief<\/div>/);
  assert.match(html, /<sc-for list="\{\{ kzItems \}\}" as="r" hint-placeholder-count="3">/);
  assert.match(html, /Meer in het Klusarchief/);
});

test("herstel (13-11-2026, melding na een vreemde zoekopdracht 'postzegel'): Artikelen op Infofrankrijk dedupliceert tegen wat het Klusarchief al toont, alleen op het zoekscherm zelf", () => {
  assert.match(html, /const kzUrls = st\.screen === "zoek" \? new Set\(\(this\.kzVals\(\)\.kzItems \|\| \[\]\)\.filter\(it => it\.label === "INFOFRANKRIJK" && it\.href\)\.map\(it => it\.href\)\) : new Set\(\);/);
  assert.match(html, /const items = ruw\.filter\(it => !kzUrls\.has\(it\.url\)\);/);
  // zaLeeg blijft op de ruwe uitkomst (geen valse "geen artikelen gevonden" als alles al hierboven stond);
  // de sectie zelf verdwijnt helemaal als na het filter niets overblijft.
  assert.match(html, /const alleGedupliceerd = status === "klaar" && ruw\.length > 0 && items\.length === 0;/);
  assert.match(html, /zaLeeg: status === "klaar" && ruw\.length === 0,/);
});
