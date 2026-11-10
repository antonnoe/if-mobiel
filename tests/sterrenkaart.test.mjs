// Zoeken met sterrenkaart (10 november 2026): lib, catalogus en bedrading. Draaien: node --test tests/sterrenkaart.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const lees = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const require = createRequire(import.meta.url);
const Sk = require("../sterrenkaart-lib.js");
const Nv = require("../nav-lib.js");
const html = lees("index.html"), lib = lees("sterrenkaart-lib.js"), sw = lees("sw.js"), cat = JSON.parse(lees("modules.json"));

const goed = { groep: "stap", bron: "if", titel: "Titel", regel: "Regel", artikel: "https://infofrankrijk.com/x/" };

test("antwoord: precies een doel, bekende groep en bron, alleen https, titel verplicht", () => {
  assert.deepEqual(Sk.leesAntwoord(goed).doel, { soort: "artikel", waarde: "https://infofrankrijk.com/x/" });
  assert.equal(Sk.leesAntwoord({ ...goed, groep: "onbekend" }), null);
  assert.equal(Sk.leesAntwoord({ ...goed, bron: "xx" }), null);
  assert.equal(Sk.leesAntwoord({ ...goed, artikel: "http://infofrankrijk.com/x/" }), null);
  assert.equal(Sk.leesAntwoord({ ...goed, artikel: "https://voorbeeld.nl/x/" }), null);
  assert.equal(Sk.leesAntwoord({ ...goed, url: "https://a.nl/" }), null, "twee doelen");
  assert.equal(Sk.leesAntwoord({ groep: "stap", bron: "if", titel: "T" }), null, "geen doel");
  assert.equal(Sk.leesAntwoord({ groep: "stap", bron: "nl", titel: "T", url: "http://a.nl/" }), null);
  assert.equal(Sk.leesAntwoord({ groep: "stap", bron: "nl", titel: "T", url: "javascript:alert(1)" }), null);
  assert.deepEqual(Sk.leesAntwoord({ groep: "stap", bron: "nl", titel: "T", url: "https://a.nl/p?x=1" }).doel, { soort: "url", waarde: "https://a.nl/p?x=1" });
  assert.equal(Sk.leesAntwoord({ ...goed, titel: "" }), null);
  assert.equal(Sk.leesAntwoord({ groep: "reken", bron: "if", scherm: "onbekend", titel: "T" }), null);
  assert.equal(Sk.leesAntwoord({ groep: "reken", bron: "if", scherm: "gemeente", titel: "T" }).doel.soort, "scherm");
  const m = Sk.leesAntwoord({ groep: "reken", bron: "if", module: "energie" });
  assert.equal(m.titel, "", "bij een module mag de titel ontbreken");
  assert.equal(Sk.leesAntwoord({ groep: "reken", bron: "if", module: "Energie!" }), null);
  assert.ok(!/[–—]/.test(Sk.leesAntwoord({ ...goed, titel: "A – B" }).titel));
  assert.equal(Sk.leesAntwoord({ ...goed, titel: "A – B" }).titel, "A, B");
});

test("data: dubbele id's, onbruikbare onderwerpen en meer dan zes vragen vallen weg", () => {
  const q = i => ({ id: "v" + i, tekst: "Vraag " + i, intro: "i", antwoorden: [goed, goed] });
  const d = Sk.leesData({ onderwerpen: [
    { id: "a", naam: "A", x: 10, y: 10, vragen: [1, 2, 3, 4, 5, 6, 7, 8].map(q) },
    { id: "a", naam: "Dubbel", x: 10, y: 10, vragen: [q(1)] },
    { id: "b", naam: "B", x: 120, y: 10, vragen: [q(1)] },
    { id: "c", naam: "C", x: 10, y: 10, vragen: [] },
    null, { id: "d", naam: "D", x: 50, y: 50, cafe: "wonen", vragen: [q(1), q(1)] }] });
  assert.deepEqual(d.onderwerpen.map(o => o.id), ["a", "d"]);
  assert.equal(d.onderwerpen[0].vragen.length, 6);
  assert.equal(d.onderwerpen[1].vragen.length, 1, "dubbel vraag-id valt weg");
  assert.equal(d.onderwerpen[1].cafe, "wonen");
  assert.deepEqual(Sk.leesData(null).onderwerpen, []);
});

test("groeperen: vaste volgorde, een begin-antwoord, modules die uit staan vallen weg", () => {
  const a = [
    { groep: "ervaring", bron: "nl", titel: "E", regel: "", doel: { soort: "url", waarde: "https://a.nl/" } },
    { groep: "reken", bron: "if", titel: "", regel: "", doel: { soort: "module", waarde: "aan" } },
    { groep: "reken", bron: "if", titel: "", regel: "", doel: { soort: "module", waarde: "uit" } },
    { groep: "begin", bron: "if", titel: "B1", regel: "", doel: { soort: "artikel", waarde: "https://infofrankrijk.com/a/" } },
    { groep: "begin", bron: "if", titel: "B2", regel: "", doel: { soort: "artikel", waarde: "https://infofrankrijk.com/b/" } },
    { groep: "stap", bron: "if", titel: "S", regel: "", doel: { soort: "artikel", waarde: "https://infofrankrijk.com/c/" } }];
  const g = Sk.groepeer(a, id => id === "aan" ? { naam: "Naam", meta: "meta" } : null);
  assert.deepEqual(g.map(x => x.groep), ["begin", "stap", "reken", "ervaring"]);
  assert.deepEqual(g[0].items.map(i => i.titel), ["B1"]);
  assert.deepEqual(g[1].items.map(i => i.titel), ["B2", "S"]);
  assert.deepEqual(g[2].items.map(i => [i.titel, i.regel]), [["Naam", "meta"]]);
  assert.deepEqual(Sk.groepeer([], () => null), []);
  assert.deepEqual(Sk.GROEPEN.map(x => x.id), ["begin", "stap", "reken", "adres", "ervaring"]);
});

test("planeten: binnen het veld, niet op de zon en niet op elkaar, voor 1 tot en met 6 vragen", () => {
  for (let n = 1; n <= 6; n++) {
    const p = Sk.planeten(n);
    assert.equal(p.length, n);
    p.forEach((a, i) => {
      assert.ok(Math.abs(a.x) + 75 <= 185 - 8, "binnen het veld van 370 px breed (n=" + n + ")");
      assert.ok(Math.abs(a.y) >= 54 + 28 + 14 || n === 1 && Math.abs(a.y) > 0, "boven of onder de zon (n=" + n + ")");
      p.forEach((b, j) => { if (j > i) assert.ok(Math.abs(a.x - b.x) >= 150 || Math.abs(a.y - b.y) >= 60, "geen overlap tussen pillen (n=" + n + ")"); });
    });
  }
  assert.deepEqual(Sk.planeten(0), []);
  assert.equal(Sk.planeten(9).length, 6, "zes is het maximum");
});

test("sterren: deterministisch, 46 stuks, 2 of 3 px, binnen het veld", () => {
  const a = Sk.sterren(46), b = Sk.sterren(46);
  assert.deepEqual(a, b);
  assert.equal(a.length, 46);
  a.forEach(s => { assert.ok(s.s === 2 || s.s === 3); assert.ok(s.x >= 0 && s.x <= 100 && s.y >= 0 && s.y <= 100); assert.ok(s.d > 0); });
  assert.ok(!/Math\.random/.test(lib), "geen Math.random in de lib");
});

test("zonletter: 14, 13 of 12 px naar het langste woord, nooit kleiner dan 12", () => {
  assert.equal(Sk.zonLetter("Wonen"), 14);
  [14, 13, 12].forEach(px => assert.ok([14, 13, 12].includes(px)));
  ["Wonen", "Verbouwen", "Geld en belasting", "Gezondheid", "Papieren", "Samen leven", "Werk en bedrijf", "Vervoer"].forEach(n => assert.ok([14, 13, 12].includes(Sk.zonLetter(n)), n));
  assert.ok(Sk.zonLetter("Gezondheid") <= Sk.zonLetter("Wonen"));
});

const blok = cat.sterrenkaart, data = Sk.leesData(blok);
const POS = { wonen: [26, 20], verbouwen: [72, 16], geld: [48, 37], gezondheid: [20, 54], papieren: [78, 52], samen: [50, 66], werk: [27, 84], vervoer: [74, 83] };
test("catalogus: acht onderwerpen op de afgesproken posities, hooguit zes vragen, elke vraag minstens twee antwoorden", () => {
  assert.deepEqual(data.onderwerpen.map(o => o.naam), ["Wonen", "Verbouwen", "Geld en belasting", "Gezondheid", "Papieren", "Samen leven", "Werk en bedrijf", "Vervoer"]);
  data.onderwerpen.forEach(o => {
    assert.deepEqual([o.x, o.y], POS[o.id], o.id);
    assert.ok(o.vragen.length >= 1 && o.vragen.length <= 6, o.id);
    o.vragen.forEach(q => assert.ok(q.antwoorden.length >= 2, o.id + "/" + q.id));
  });
  // Niets valt stilletjes weg bij het lezen: wat in de JSON staat is geldig.
  const ruw = blok.onderwerpen.reduce((n, o) => n + o.vragen.reduce((m, q) => m + q.antwoorden.length, 0), 0);
  const gelezen = data.onderwerpen.reduce((n, o) => n + o.vragen.reduce((m, q) => m + q.antwoorden.length, 0), 0);
  assert.equal(gelezen, ruw);
  assert.equal(data.onderwerpen.reduce((n, o) => n + o.vragen.length, 0), blok.onderwerpen.reduce((n, o) => n + o.vragen.length, 0));
});

test("catalogus: bestaande modules en domeinen, geen verzonnen telefoonnummers", () => {
  const ids = new Set(cat.modules.map(m => m.id));
  const domeinen = new Set(cat.groepen.map(g => g.cafe && g.cafe.domein).filter(Boolean));
  data.onderwerpen.forEach(o => {
    if (o.cafe) assert.ok(domeinen.has(o.cafe), o.id + " domein " + o.cafe);
    o.vragen.forEach(q => {
      assert.ok(!/\d{2}[ .]?\d{2}[ .]?\d{2}/.test(q.intro), "geen nummers in de intro van " + q.id);
      q.antwoorden.forEach(a => { if (a.doel.soort === "module") assert.ok(ids.has(a.doel.waarde), "module " + a.doel.waarde); });
    });
  });
  const spoed = data.onderwerpen.find(o => o.id === "gezondheid").vragen.find(q => q.id === "spoed");
  assert.ok(spoed.antwoorden.some(a => a.doel.soort === "scherm" && a.doel.waarde === "gezondheid"), "spoed verwijst naar het scherm Gezondheid");
  assert.ok(!/(^|[^\d])(15|112|18)([^\d]|$)/.test(spoed.intro + spoed.antwoorden.map(a => a.titel + a.regel).join(" ")), "geen nummers van het spoed typen");
});

test("bedrading: sterrenkaart alleen bij een leeg zoekveld, niveaus in sub-staat met geschiedenis", () => {
  assert.match(html, /<script src="\.\/sterrenkaart-lib\.js"><\/script>/);
  assert.match(html, /skNiveau\(\)\{[\s\S]{0,300}st\.screen !== "zoek" \|\| String\(st\.q \|\| ""\)\.trim\(\) !== ""\) return 0/);
  assert.match(html, /onQ: e => \{ const v = e\.target\.value; this\.setState\(v\.trim\(\) \? \{q:v, skOnd:"", skVraag:""\}/);
  assert.match(html, /if \(st\.screen === "zoek" && st\.skVraag\) \{ this\.setState\(\{skVraag:""\}\)/);
  assert.match(html, /if \(st\.screen === "zoek" && st\.skOnd\) \{ this\.setState\(\{skOnd:""\}\)/);
  assert.match(html, /skOnd: st\.screen === "zoek" && st\.skOnd/);
  assert.notEqual(Nv.navKey({ screen: "zoek" }), Nv.navKey({ screen: "zoek", skOnd: "wonen" }));
  assert.notEqual(Nv.navKey({ screen: "zoek", skOnd: "wonen" }), Nv.navKey({ screen: "zoek", skOnd: "wonen", skVraag: "x" }));
  assert.ok(Nv.isTop({ screen: "zoek" }) && !Nv.isTop({ screen: "zoek", skOnd: "wonen" }));
  assert.ok(!/suggesties:/.test(html) && !html.includes("{{ suggesties }}"), "de zes suggestieknopjes zijn weg");
  assert.ok(/sw|SCHIL/.test(sw) && sw.includes('"./sterrenkaart-lib.js"'));
});

test("beweging en toegankelijkheid: keyframes in helmet, stil bij reduced motion, echte buttons en links", () => {
  ["sk-twinkel", "sk-zweef", "sk-gloei", "sk-wieg", "sk-tegen", "sk-in", "sk-draai", "sk-op"].forEach(k => assert.ok(html.includes("@keyframes " + k), k));
  assert.match(html, /@media \(prefers-reduced-motion:reduce\)\{\[data-sterrenkaart\],\[data-sterrenkaart\] \*\{animation:none!important/);
  assert.match(html, /<button data-zon="1" onClick="\{\{ z\.open \}\}"/);
  assert.match(html, /<button data-planeet="1" onClick="\{\{ p\.open \}\}"/);
  assert.match(html, /<a href="\{\{ r\.href \}\}" target="_blank" rel="noopener"/);
  const m = html.match(/skVals\(\)\{[\s\S]*?\n  ifVals\(\)\{/)[0];
  assert.ok(!/innerHTML/.test(m) && !/Math\.random/.test(m));
  assert.ok(!/font:\d+ (?:[0-9]|10|11)px/.test(html.match(/<sc-if value="\{\{ skN1 \}\}"[\s\S]*?<!-- ============ GEMEENSCHAP/)[0]), "geen tekst onder 11,5 px");
});

test("kop: een h1 per scherm, op niveau 3 de vraag", () => {
  assert.match(html, /kopH1: KOP_H1\.indexOf\(st\.screen\) >= 0 && !this\.skN3Aan\(\)/);
  assert.match(html, /<h1 style="margin:4px 0 0;font-family:'Source Serif 4'[^>]*>\{\{ skVraagTekst \}\}<\/h1>/);
});
