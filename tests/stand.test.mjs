// Postzegel-ronde 13-11-2026, punt 1: startpagina met twee standen (Eenvoudig/Compleet).
// Keuzescherm bij de eerste opening (localStorage ifm_stand ontbreekt, geen hash naar inhoud); daarna alleen op
// het toestel. Profiel en Mijn modules hebben dezelfde schakelaar. Eenvoudig: zoekloket, vier snelkoppelingen,
// de band Vandaag met hooguit één regel, "Alles tonen". Compleet: zoekloket boven de band, Onze vier, negen
// tegels, "Te veel?"-blok. Live geverifieerd met Playwright op infopoche.fr (zie het eindrapport).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const lees = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const html = lees("index.html");

test("state: screen start op standkeuze zonder opgeslagen stand en zonder inhoudshash, anders hub", () => {
  assert.match(html, /state = \{ screen:\(\(\) => \{ try \{ return \(!localStorage\.getItem\("ifm_stand"\) && !\(window\.LandingLib && window\.LandingLib\.heeftInhoudHash\(location\.hash\)\)\) \? "standkeuze" : "hub"; \} catch\(e\)\{ return "hub"; \} \}\)\(\),/);
  assert.match(html, /stand:\(\(\) => \{ try \{ return localStorage\.getItem\("ifm_stand"\) === "eenvoudig" \? "eenvoudig" : "compleet"; \} catch\(e\)\{ return "compleet"; \} \}\)\(\),/);
});

test("kiesStand: slaat op in localStorage, gaat naar hub (of blijft op het huidige scherm met naarHub:false)", () => {
  assert.match(html, /kiesStand\(s, naarHub\)\{/);
  assert.match(html, /localStorage\.setItem\("ifm_stand", s\);/);
  assert.match(html, /this\.setState\(naarHub === false \? \{stand:s\} : \{stand:s, screen:"hub"\}\);/);
});

test("keuzescherm: twee kaarten, exacte teksten uit de goedgekeurde mock-up", () => {
  assert.match(html, /<sc-if value="\{\{ isStandkeuze \}\}" hint-placeholder-val="\{\{ false \}\}">/);
  assert.ok(html.includes("Welkom bij InfoPoche"));
  assert.ok(html.includes("Hoe wil je beginnen? Je kunt dit later altijd wijzigen in Profiel."));
  assert.ok(html.includes("Eén vraag, één antwoord"));
  assert.ok(html.includes("Een zoekvak en wat er vandaag speelt. Verder niets, tenzij je erom vraagt."));
  assert.ok(html.includes("Alles in één overzicht"));
  assert.ok(html.includes("Zoekvak, kalender, Onze vier en alle onderwerpen op de startpagina."));
  assert.match(html, /kiesEenvoudig: \(\) => this\.kiesStand\("eenvoudig"\), kiesCompleet: \(\) => this\.kiesStand\("compleet"\),/);
});

test("Eenvoudig: zoekloket groot, vier snelkoppelingen op één plek, Alles tonen, verder niets (favorieten/noodregel weg)", () => {
  assert.ok(html.includes("Waar kan ik je mee helpen?"));
  assert.ok(html.includes("Typ een vraag of een woord"));
  assert.match(html, /eenvoudigSnelLijst\(\)\{/);
  assert.match(html, /\{label:"Brief uitleggen", open:\(\) => this\.route\(this\.vindModule\("briefuitleg"\)\)\},/);
  assert.match(html, /\{label:"Kalender Frankrijk", open:\(\) => this\.go\("kalender"\)\},/);
  assert.match(html, /\{label:"Klusarchief", open:\(\) => this\.go\("klusarchief"\)\},/);
  assert.match(html, /\{label:"Mijn gemeente", open:\(\) => this\.gmOpen\("hub"\)\}/);
  assert.match(html, /eenvoudigAlles: \(\) => this\.go\("mod"\),/);
  assert.ok(html.includes("<span>Alles tonen</span>"));
  assert.match(html, /hubFavs: st\.screen === "hub" && st\.stand !== "eenvoudig" && favLijst\.length > 0,/);
  assert.match(html, /hubNood: st\.screen === "hub" && st\.stand !== "eenvoudig" && this\.spoedKnoppenLijst\(\)\.length > 0/);
  // de band Vandaag toont in Eenvoudig hooguit één regel
  assert.match(html, /vdRegels: aan \? \(st\.stand === "eenvoudig" \? st\.vdRegels\.slice\(0, 1\) : st\.vdRegels\)\.map/);
});

test("Compleet: zoekloket boven de band, Onze vier en negen tegels blijven, Te veel-blok onderaan", () => {
  assert.ok(html.includes("Onze vier"));
  assert.ok(html.includes("Of kies een onderwerp"));
  assert.ok(html.includes("Te veel?"));
  assert.ok(html.includes("Kies zelf wat je ziet, of zet InfoPoche op Eenvoudig."));
  assert.match(html, /teVeelAanpassen: \(\) => \{ this\.setState\(\{screen:"keuze", from:"hub"\}\); \},/);
});

test("prototypekaart is vervangen: nooit meer in de code", () => {
  assert.ok(!/data-proto="1"/.test(html));
  assert.ok(!/protoWeg|protoOpen\b/.test(html));
});

test("standschakelaar (Profiel en Mijn modules): dezelfde twee holes, wisselt zonder van scherm te veranderen", () => {
  assert.equal((html.match(/standKiesEenvoudig: \(\) => this\.kiesStand\("eenvoudig", false\)/g) || []).length, 1);
  assert.equal((html.match(/Stand van InfoPoche/g) || []).length, 2, "schakelaar staat op zowel Profiel als Mijn modules");
});

test("geen tekst onder 11,5 px en geen liggende streepjes in de nieuwe teksten", () => {
  const nieuw = ["Welkom bij InfoPoche", "Waar kan ik je mee helpen?", "Stand van InfoPoche", "Te veel?"];
  for (const t of nieuw) {
    const i = html.indexOf(t);
    assert.ok(i > 0, t);
    assert.ok(!/[–—]/.test(html.slice(i, i + 300)), t);
  }
});
