// Ronde 3, herstelronde 1 (17-11-2026): kernwoorden, Bij jou-onderwerpen, labels, pijltjes, Mijn gemeente.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const N = require("../nav-lib.js");
const B = require("../bijjou-lib.js");
const V = require("../vraag-lib.js");
const cat = JSON.parse(readFileSync(new URL("../modules.json", import.meta.url), "utf8"));
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("kernwoorden: stopwoorden eruit, aanvragen blijft", () => {
  assert.deepEqual(N.kernwoorden("Moet ik een vergunning aanvragen voor een tuinhuisje?"), ["vergunning", "aanvragen", "tuinhuisje"]);
  assert.deepEqual(N.kernwoorden("Hoe vind ik een huisarts"), ["vind", "huisarts"]);
  assert.deepEqual(N.kernwoorden("wat is de taxe foncière"), ["taxe", "foncière"]);
  assert.deepEqual(N.kernwoorden("mag ik een schuur bouwen"), ["schuur", "bouwen"]);
  assert.deepEqual(N.kernwoorden(""), []);
});
test("zoekTerm: pas vanaf 3 woorden, nooit leeg, nooit een stopwoord-only resultaat", () => {
  assert.equal(N.zoekTerm("huisarts"), "huisarts");
  assert.equal(N.zoekTerm("de huisarts"), "de huisarts");
  assert.equal(N.zoekTerm("Moet ik een vergunning aanvragen voor een tuinhuisje?"), "vergunning aanvragen tuinhuisje");
  assert.equal(N.zoekTerm("hoe moet ik dat"), "hoe moet ik dat");
});
test("zoeken gebruikt de kernwoorden en Niets gevonden staat nooit naast resultaten", () => {
  assert.match(html, /const q = norm\(window\.IfNav \? window\.IfNav\.zoekTerm\(this\.state\.q\)/);
  assert.match(html, /q = Nv \? Nv\.zoekTerm\(q\) : q;/);
  assert.match(html, /noResults: [^\n]*!this\.kzVals\(\)\.kzHeeft[^\n]*!this\.bijJouVals\(\)\.bjToon[^\n]*!this\.vraagVals\(\)\.vrToon/);
});
test("Bij jou: bouwonderwerpen wijzen naar de mairie, ook in een hele zin", () => {
  for (const w of ["tuinhuis", "tuinhuisje", "schuur", "abri de jardin", "aanbouw", "uitbouw", "veranda", "carport", "zwembad", "dakkapel", "vergunning", "verbouwen", "verbouwing"]) {
    const o = B.vindOnderwerp("ik wil graag een " + w + " plaatsen bij mijn huis", cat.bijJou);
    assert.ok(o && o.overheid && o.overheid[0] === "mairie", w);
  }
  const o = B.vindOnderwerp("Moet ik een vergunning aanvragen voor een tuinhuisje?", cat.bijJou);
  assert.equal(o.anker, "overheden");
});
test("Bij jou: huisarts krijgt de eerlijke titel, ziekenhuis de gewone", () => {
  assert.equal(B.vindOnderwerp("hoe vind ik een huisarts", cat.bijJou).titel, "Ziekenhuizen bij jou (huisartsen staan nog niet in de Nedergids)");
  assert.equal(B.vindOnderwerp("ziekenhuis", cat.bijJou).titel, "Ziekenhuizen bij jou");
});
test("abonnee-label en AI-regel komen uit één plek (vraag-lib)", () => {
  assert.equal(V.LABEL, "abonnee, nu gratis");
  assert.equal(V.REGEL, "Kort antwoord met AI: voor abonnees, nu nog voor iedereen");
  assert.ok(html.includes("kalMaandLabel: window.IfVraag ? window.IfVraag.LABEL"));
  assert.ok(html.includes("{{ kalMaandLabel }}"));
  assert.ok(html.includes("vrLabel: V ? V.LABEL"));
});
test("externe links krijgen een pijltje", () => {
  assert.ok(html.includes("{{ p.label }}&nbsp;↗</a>"));
  assert.equal((html.match(/Bekijk het abonnement<\/a>/g) || []).length, 0);
  assert.ok((html.match(/Bekijk het abonnement ↗<\/a>/g) || []).length >= 5);
  assert.ok(html.includes("{{ b.naam }} ↗</b>"));
});
test("placeholder volledig, veld volle breedte met knop eronder", () => {
  const j = html.indexOf('data-hubzoek="1"');
  const blok = html.slice(j, j + 1500);
  assert.match(blok, /placeholder="Typ je vraag in je eigen woorden"/);
  assert.match(blok, /justify-content:flex-end/);
  assert.match(blok, /font:600 15px Mulish/);
});
test("Mijn gemeente: grootste gemeente direct, ander dorp achter een knop, Bewaren gaat door", () => {
  assert.match(html, /this\.gmKies\(l\[0\], zoek\);\s*this\.gmSet\(\{anderen:l\}\)/);
  assert.ok(html.includes("Ander dorp met deze postcode"));
  assert.ok(html.includes("gmAnder: () => this.gmSet({status:\"kies\""));
  assert.match(html, /pcNaarGemeente:true/);
  assert.match(html, /if \(naarGem\) this\.gmOpen\("hub", pcNieuw\)/);
  const G = require("../gemeente-lib.js");
  const l = G.leesCommunes([{nom:"Klein", code:"62001", population:100, codeDepartement:"62", centre:{coordinates:[2,50]}}, {nom:"Groot", code:"62002", population:9000, codeDepartement:"62", centre:{coordinates:[2,50]}}]);
  assert.equal(l[0].nom, "Groot");
});
