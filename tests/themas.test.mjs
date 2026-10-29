// Controle van de indeling in thema's (modules.json) en van het demodossier. Geen netwerk.
// Draaien: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const lees = (...p) => fs.readFileSync(path.join(root, ...p), "utf8");
const cat = JSON.parse(lees("modules.json"));
const mods = cat.modules;
const vind = id => mods.find(m => m.id === id);
const VOLGORDE = ["geld", "overheid", "gezondheid", "adressen", "nieuws", "ervaring", "ondernemen", "wonen", "taal"];
const INDELING = {
  geld: ["kompas", "ruyter", "erfrecht", "transactiekosten", "plusvalue"],
  overheid: ["emigreren", "auto", "frankrijklegal", "controletechnique", "overhedenbuurt"],
  gezondheid: ["zorg", "zorgkompas", "palliatief", "zoekers"],
  adressen: ["nedergids", "verenigingen"],
  nieuws: [],
  ervaring: ["forum", "nlfrzoek", "klusforum"],
  ondernemen: ["efacturatie", "gitekompas", "beroepenchecker"],
  wonen: ["klussen", "lijstjes", "tekoop", "dossierelektra", "elektrabuiten", "veiligheid", "internet", "moestuin", "woonplan", "bouwgrond", "devisdossier", "huizenchecker", "woningzoeker", "vastgoed", "energie", "subsidieroute", "energieportaal", "vastgoedanalyse"],
  taal: ["correspondentie", "taalhulp", "woordenboek"]
};

test("negen thema's in de juiste volgorde", () => {
  assert.deepEqual(cat.themas.map(t => t.id), VOLGORDE);
  assert.deepEqual(cat.themas.map(t => t.naam), ["Geld", "Overheid", "Gezondheid", "Verenigingen", "Nieuws", "Ervaring", "Ondernemen", "Wonen", "Taal"]);
  cat.themas.forEach(t => assert.ok(t.wat && t.wat.length > 3, "wat ontbreekt bij " + t.id));
});

test("eigen schermen en nieuwsstroken per thema", () => {
  const scherm = Object.fromEntries(cat.themas.filter(t => t.scherm).map(t => [t.id, t.scherm]));
  assert.deepEqual(scherm, {gezondheid: "gezondheid", nieuws: "nieuws", ondernemen: "ondernemen", wonen: "lamaison"});
  // 29-10-2026: geen nieuwsstroken meer op de themaschermen, de berichten uit de stromen hadden niets met het thema te maken. Nieuws heeft zijn eigen tab.
  const nieuws = Object.fromEntries(cat.themas.filter(t => t.nieuws).map(t => [t.id, t.nieuws]));
  assert.deepEqual(nieuws, {});
});

test("elke module heeft een geldig thema", () => {
  const geldig = new Set([...VOLGORDE, "ai", "dossier"]);
  mods.forEach(m => assert.ok(geldig.has(m.thema), m.id + " heeft thema " + m.thema));
  assert.equal(new Set(mods.map(m => m.id)).size, mods.length, "dubbele id's");
});

test("indeling per thema", () => {
  for (const [t, ids] of Object.entries(INDELING)) {
    const echt = mods.filter(m => m.thema === t).map(m => m.id).sort();
    assert.deepEqual(echt, ids.slice().sort(), "thema " + t);
  }
});

test("cafeclaude is ai en dossierfrankrijk is dossier, tompolak bestaat niet", () => {
  assert.equal(vind("cafeclaude").thema, "ai");
  assert.equal(vind("dossierfrankrijk").thema, "dossier");
  assert.equal(vind("tompolak"), undefined);
  assert.ok(!/tompolak|tom-polak/i.test(lees("index.html")));
});

test("correspondentie opent de briefhulp volledig in de app, met uitleg-artikel", () => {
  const c = vind("correspondentie");
  assert.equal(c.url, "https://briefhulp-fr.vercel.app");
  assert.equal(c.weergave, "volledig");
  assert.equal(c.artikel, "https://infofrankrijk.com/correspondentie-assistent/");
  assert.notEqual(c.zichtbaar, false);
});

test("taalhulp en woordenboek zijn in ontwikkeling", () => {
  assert.equal(vind("woordenboek").status, "in ontwikkeling");
  assert.equal(vind("taalhulp").status, "in ontwikkeling");
  assert.equal(vind("zoekers").status, "in ontwikkeling");
});

test("nieuwe modules en Klussen", () => {
  assert.equal(vind("zoekers").url, "https://ouderenzorg.vercel.app");
  assert.equal(vind("woordenboek").url, "https://taalhulp-fr.vercel.app/woordenboek");
  assert.equal(vind("zoekers").weergave, "volledig");
  assert.equal(vind("woordenboek").weergave, "volledig");
  assert.equal(vind("forum").kind, "forum");
  assert.equal(vind("klussen").kort, "Klussen");
});

test("modules die standaard uit staan blijven uit", () => {
  const uit = ["moestuin", "efacturatie", "palliatief", "frankrijklegal", "plusvalue", "bouwgrond", "devisdossier", "huizenchecker", "gitekompas", "woningzoeker", "nlfrzoek"];
  uit.filter(id => vind(id)).forEach(id => assert.equal(vind(id).standaard, "uit", id));
  assert.ok(mods.filter(m => m.standaard === "uit").length >= 12);
});

test("elke iframe-module heeft een url", () => {
  mods.filter(m => m.kind === "iframe").forEach(m => assert.match(m.url || "", /^https:\/\//, m.id));
});

test("hub en themascherm hebben de afgesproken koppelvlakken", () => {
  const index = lees("index.html");
  for (const naam of ["SCHERMEN_VOOR_THEMA", "openThema", "strookVoorThema", "strookZichtbaar", "strookItems", "themaNaam", "isDossierdemo"]) assert.ok(index.includes(naam), naam);
});

test("demodossier is geldig en bevat geen echte gegevens", () => {
  const ruw = lees("data", "dossier-demo.json");
  const d = JSON.parse(ruw);
  assert.equal(d.voorbeeld, true);
  assert.ok(d.onderdelen.length >= 3 && d.onderdelen.length <= 4);
  assert.ok(d.documenten.length > 0 && d.termijnen.length > 0);
  d.documenten.forEach(x => assert.ok(d.onderdelen.some(o => o.id === x.onderdeel), x.id));
  d.termijnen.forEach(x => assert.ok(d.onderdelen.some(o => o.id === x.onderdeel), x.id));
  assert.ok(!/[A-Z]{2}\d{2}[ ]?[A-Z0-9]{4}[ ]?\d{4}/.test(ruw), "IBAN-patroon");
  assert.ok(!/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(ruw), "mailadres");
  assert.ok(!/(\+|00)\d{2}[ \d]{8,}|\b0\d([ .]?\d{2}){4}\b/.test(ruw), "telefoonnummer");
  assert.ok(!/\b\d{9}\b/.test(ruw), "BSN-patroon");
  assert.ok(/Voorbeeld/.test(d.naam));
});

test("thema Verenigingen (voorheen Adressen): id en kleur blijven, Nedergids staat er niet dubbel", () => {
  const th = cat.themas.find(x => x.id === "adressen");
  assert.equal(th.naam, "Verenigingen"); assert.deepEqual(th.uitsluiten, ["nedergids"]);
  assert.ok(cat.modules.some(m => m.id === "nedergids" && m.thema === "adressen"), "de module zelf blijft vindbaar in Alle modules en bij zoeken");
  assert.match(fs.readFileSync(new URL("../index.html", import.meta.url), "utf8"), /weg\.indexOf\(m\.id\) < 0/);
});
