// Ronde 30-10-2026: kind "linklijst" en Verenigingsbeheer. Draaien: node --test tests/ronde10.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const lees = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const html = lees("index.html"), cat = JSON.parse(lees("modules.json"));
const H = createRequire(import.meta.url)("../hub-lib.js");
const m = cat.modules.find(x => x.id === "verenigingsbeheer");

test("Verenigingsbeheer: module onder Verenigingen met de vier links", () => {
  assert.ok(m);
  assert.equal(m.kind, "linklijst");
  assert.equal(m.thema, "adressen");
  assert.equal(m.naam, "Verenigingsbeheer");
  assert.deepEqual(m.links.map(k => k.url), [
    "https://infofrankrijk.com/vereniging-oprichten-in-frankrijk/",
    "https://infofrankrijk.com/vereniging-besturen-in-frankrijk/",
    "https://infofrankrijk.com/enquete-nl-verenigingen-2021/",
    "https://www.vereniging.fr/"]);
  assert.deepEqual(m.links.map(k => !!k.extern), [false, false, false, true]);
  m.links.forEach(k => { assert.ok(k.titel && k.regel, k.url); assert.match(k.url, /^https:\/\//); });
  assert.ok(![m.naam, m.meta, m.over, ...m.links.map(k => k.regel)].some(t => /[–—]/.test(t)), "geen liggende streepjes");
});

test("de app kent het kind: route, scherm, terugknop, tab en kop", () => {
  assert.match(html, /if \(m\.kind === "linklijst"\) return this\.setState\(\{screen:"linklijst", tool:m/);
  assert.match(html, /\|linklijst\)\$\/;/);
  assert.match(html, /<sc-if value="\{\{ isLinklijst \}\}"/);
  assert.match(html, /llVals\(\)\{/);
  assert.match(html, /\.\.\.this\.llVals\(\)/);
  assert.equal(H.tabVan("linklijst"), "mod");
});

test("artikelen openen in de app, vereniging.fr als gewone externe link in een nieuw tabblad", () => {
  assert.match(html, /window\.IfArtikel\.isInApp\(k\.url\)/);
  assert.match(html, /<a href="\{\{ k\.url \}\}" target="_blank" rel="noopener"/);
});
