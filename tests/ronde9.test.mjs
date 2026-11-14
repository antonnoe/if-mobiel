// Ronde 29-10-2026 (prototypekaart, Peil, Klussen-blok, Over ons). Draaien: node --test tests/ronde9.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const lees = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const html = lees("index.html"), cat = JSON.parse(lees("modules.json"));
const mod = id => cat.modules.find(m => m.id === id);

// Opgeruimd in de postzegel-ronde (13-11-2026, twee standen Eenvoudig/Compleet): de prototypekaart stond vóór de
// nieuwe begroeting-zoekloket-volgorde in de weg en is vervangen door het blok "Te veel?" in de stand Compleet.
// Feedback geven blijft bereikbaar via het hamburgermenu (mnFeedback).
test("hub: prototypekaart is weg, feedback blijft bereikbaar via het hamburgermenu", () => {
  assert.ok(!/data-proto="1"/.test(html));
  assert.ok(!/protoWeg|protoOpen|protoFeedback|protoSluit/.test(html));
  assert.match(html, /mnFeedback: \(\) => this\.fbOpenen\(\)/);
});

test("Over ons: Nederlanders.fr en de moderatie zijn één kaart, Peil heeft zijn eigen link", () => {
  assert.equal(html.split("Een gemodereerde gemeenschap</div>").length - 1, 0);
  assert.match(html, /Het is een gemodereerde gemeenschap, met toelating, huisregels en optreden tegen spam en misbruik\./);
  // sinds 14-11-2026 heeft de Peil-sectie van Over ons één knop
  assert.ok(!/Peil: bekijk wat we per tool controleren/.test(html));
  assert.ok(!/Lees hoe wij werken/.test(html));
  assert.match(html, /Zo werken wij: bekijk de dia's/);
});

test("Klussen: eigen blok in Wonen met de drie klus-modules en de lijstjes", () => {
  assert.match(html, /data-klusblok="1"/);
  assert.match(html, /const klusIds = \["klussen","klusforum","dossierelektra","elektrabuiten","lijstjes"\]/);
  assert.equal(mod("klussen").url, "https://infofrankrijk.com/klussen/");
  assert.equal(mod("dossierelektra").url, "https://infofrankrijk.com/klussen/dossiers/de-franse-elektrische-installatie/");
  assert.equal(mod("elektrabuiten").url, "https://infofrankrijk.com/klussen/dossiers/elektra-buiten-het-huis/");
  for (const id of ["klussen", "dossierelektra", "elektrabuiten", "lijstjes"]) {
    assert.equal(mod(id).thema, "wonen", id);
    assert.notEqual(mod(id).standaard, "uit", id);
    assert.equal(mod(id).weergave, "volledig", id);
  }
  assert.ok(!/dossier-elektriciteit-if\.vercel\.app/.test(JSON.stringify(cat)), "oude redactie-exemplaar is vervangen");
});

test("Mijn lijstjes: uitleg zegt wat het is en dat het niets met DossierFrankrijk te maken heeft", () => {
  const m = mod("lijstjes");
  assert.match(m.over, /persoonlijke woordenlijst/);
  assert.match(m.over, /niets te maken met DossierFrankrijk/);
  assert.ok(!/dossier/i.test(m.meta));
});

test("geen nieuwsstroken op themaschermen, geen liggende streepjes in de nieuwe teksten", () => {
  assert.ok(cat.themas.every(t => !t.nieuws));
  for (const id of ["klussen", "lijstjes", "dossierelektra", "elektrabuiten"]) {
    const m = mod(id);
    assert.ok(!/[–—]/.test([m.naam, m.meta, m.over].join(" ")), id);
  }
});
