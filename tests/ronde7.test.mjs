// Ronde 25-10-2026 (3): Onze sponsors en Te koop in Frankrijk. Draaien: node --test tests/ronde7.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, existsSync, statSync } from "node:fs";
const req = createRequire(import.meta.url);
const S = req("../sponsors-lib.js"), A = req("../advertenties-lib.js"), N = req("../nav-lib.js"), H = req("../hub-lib.js");
const lees = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const spons = JSON.parse(lees("sponsors.json")), cat = JSON.parse(lees("modules.json")), html = lees("index.html");
const fixture = JSON.parse(lees("tests/fixture-vastgoed.json"));

test("sponsors.json is geldig, in bronvolgorde, en alle beeldbestanden bestaan en zijn niet leeg", () => {
  assert.deepEqual(spons.map(s => s.id), ["loginfrance", "interfrance", "nvlr", "cmunf", "frankrijkkeuring", "caderonne"]);
  assert.equal(S.leesSponsors(spons).length, spons.length);
  assert.deepEqual(spons.map(s => s.beelden.length), [1, 1, 3, 1, 1, 5]);
  spons.forEach(s => s.beelden.forEach(b => {
    const pad = new URL("../sponsors/" + b, import.meta.url);
    assert.ok(existsSync(pad), b);
    assert.ok(statSync(pad).size > 1000, b);
    const kop = readFileSync(pad).subarray(0, 4);
    const png = kop[0] === 0x89 && kop[1] === 0x50, jpg = kop[0] === 0xff && kop[1] === 0xd8;
    assert.ok(png || jpg, b + " is geen geldig beeld");
    assert.equal(/\.png$/.test(b), png, b + ": extensie past niet bij de inhoud");
  }));
});

test("banners: NVLR 3 beelden elke 5 s fade 600 ms, Caderonne 5 beelden elke 5,5 s fade 1 s, de rest staat stil", () => {
  const nvlr = spons.find(s => s.id === "nvlr"), cad = spons.find(s => s.id === "caderonne");
  assert.equal(nvlr.interval, 5000); assert.equal(nvlr.fade, 600);
  assert.equal(cad.interval, 5500); assert.equal(cad.fade, 1000);
  spons.filter(s => s.beelden.length === 1).forEach(s => assert.equal(s.interval, undefined));
  assert.equal(S.bannerIndex(0, 0, 5000, 3), 0);
  assert.equal(S.bannerIndex(0, 4999, 5000, 3), 0);
  assert.equal(S.bannerIndex(0, 5000, 5000, 3), 1);
  assert.equal(S.bannerIndex(0, 15000, 5000, 3), 0);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(i => S.bannerIndex(0, i * 5500, 5500, 5)), [0, 1, 2, 3, 4, 0]);
  assert.equal(S.bannerIndex(1000, 500, 5000, 3), 0);
  assert.equal(S.bannerIndex(0, 99999, 5000, 1), 0);
});

test("een kapot beeld wordt overgeslagen; zijn alle beelden kapot, dan -1 (de kaart toont de naam)", () => {
  assert.equal(S.toonIndex(0, 5000, 5000, 3, [false, true, false]), 2);
  assert.equal(S.toonIndex(0, 0, 5000, 3, [true, false, false]), 1);
  assert.equal(S.toonIndex(0, 0, 5000, 1, [true]), -1);
});

test("schudden bevat alle sponsors precies een keer, laat de bron ongemoeid en is echt een permutatie", () => {
  const ids = spons.map(s => s.id), kopie = JSON.stringify(spons);
  for (let i = 0; i < 200; i++) {
    const s = S.schud(spons).map(x => x.id);
    assert.deepEqual([...s].sort(), [...ids].sort());
  }
  assert.equal(JSON.stringify(spons), kopie);
  assert.deepEqual(S.schud(spons, () => 0).map(x => x.id).length, 6);
  const gezien = new Set(); for (let i = 0; i < 200; i++) gezien.add(S.schud(ids).join("|"));
  assert.ok(gezien.size > 20, "volgorde wisselt");
  assert.deepEqual(S.schud([]), []); assert.deepEqual(S.schud(null), []);
});

test("sponsorgegevens worden gecontroleerd: https, geen paden in beeldnamen", () => {
  assert.equal(S.geldigeSponsor({ id: "a", naam: "A", url: "http://x.nl", beelden: ["a.png"] }), false);
  assert.equal(S.geldigeSponsor({ id: "a", naam: "A", url: "https://x.nl", beelden: ["../a.png"] }), false);
  assert.equal(S.geldigeSponsor({ id: "a", naam: "A", url: "https://x.nl", beelden: ["a.png", "b.png"] }), false, "wisselend zonder interval");
  assert.equal(S.geldigeSponsor({ id: "a", naam: "A", url: "https://x.nl", beelden: ["a.png"] }), true);
});

test("Onze sponsors: route, geen tab, terugknop, menu tussen Mijn modules en Over ons", () => {
  assert.deepEqual(N.parseHash("#/sponsors"), { soort: "scherm", scherm: "sponsors" });
  assert.equal(N.bouwHash({ screen: "sponsors" }), "#/sponsors");
  assert.equal(H.tabVan("sponsors"), "");
  assert.match(html, /const SHOWBACK = \/[^\n]*\|sponsors\|/);
  const i1 = html.indexOf("mnKeuze }}"), i2 = html.indexOf("mnSponsors }}"), i3 = html.indexOf("mnOver }}");
  assert.ok(i1 > 0 && i1 < i2 && i2 < i3);
  assert.match(html, />Onze sponsors<\/span><\/button>/);
  assert.match(html, /mnSponsors: \(\) => this\.sponsorsOpen\(\)/);
  assert.match(html, /Deze bedrijven en verenigingen steunen de media van Communities Abroad: Infofrankrijk, Nederlanders\.fr en InfoPoche\./);
  assert.match(html, /Volgorde wisselt bij elke opening\./);
  assert.match(html, /href="https:\/\/www\.nederlanders\.fr\/page\/sponsors" target="_blank" rel="noopener"[^>]*>Word ook sponsor &#8599;</);
  assert.match(html, /<a href="\{\{ s\.url \}\}" target="_blank" rel="noopener"/);
  assert.match(html, /alt: "Sponsor " \+ s\.naam/);
});

test("Te koop: module geldig in modules.json, onder lijstjes, thema wonen, kind advertenties", () => {
  const ms = cat.modules, i = ms.findIndex(m => m.id === "tekoop"), j = ms.findIndex(m => m.id === "lijstjes");
  assert.ok(i > j && i - j === 1, "direct onder lijstjes");
  const m = ms[i];
  assert.equal(m.naam, "Te koop in Frankrijk"); assert.equal(m.kort, "Te koop in Frankrijk");
  assert.equal(m.groep, "wonen"); assert.equal(m.thema, "wonen"); assert.equal(m.prijs, "gratis"); assert.equal(m.kind, "advertenties");
  assert.equal(m.standaard, undefined, "standaard aan");
  assert.equal(m.meta, "woningen te koop van Nederlanders.fr");
  assert.equal(m.over, "Advertenties van particulieren en makelaars, geplaatst op Nederlanders.fr. Nieuwste bovenaan. Een tik opent de advertentie op Nederlanders.fr.");
  ["te koop", "huis", "vastgoed", "advertentie"].forEach(w => assert.ok((m.naam + " " + m.meta + " " + m.over + " " + m.zoekwoorden).toLowerCase().includes(w), w));
  assert.match(html, /m\.kind === "advertenties"/);
  assert.match(html, /\(m\.zoekwoorden \|\| ""\)/);
  assert.equal(H.tabVan("tekoop"), "mod");
  assert.deepEqual(N.parseHash("#/tekoop"), { soort: "scherm", scherm: "tekoop" });
  assert.equal(N.bouwHash({ screen: "tekoop", toolId: "tekoop" }), "#/tekoop");
});

test("advertenties: antwoord van if-plek wordt gelezen, onveilige of onvolledige items vallen af", () => {
  assert.equal(A.API, "https://if-plek.vercel.app/api/vastgoed");
  const l = A.lees(fixture);
  assert.equal(l.aantal, 3, "javascript:-link valt af");
  assert.deepEqual(l.items.map(x => x.titel), ["Barjac, Gard", "Groot huis met appartement en tuin, Le Bugue, Dordogne", "Zonder datumISO"]);
  assert.equal(l.items[0].prijsTekst, "€ 395.000"); assert.equal(l.items[0].exploitatie, true); assert.equal(l.items[0].datum, "12-10-2026");
  assert.equal(l.items[1].prijsTekst, "€ 164.000", "prijsTekst ontbreekt: uit het getal");
  assert.equal(l.items[1].foto, "");
  assert.equal(l.items[2].foto, "", "http-foto wordt niet gebruikt"); assert.equal(l.items[2].datum, "1 oktober 2026"); assert.equal(l.items[2].exploitatie, true);
  assert.equal(A.lees(null), null); assert.equal(A.lees({ fout: "x" }), null); assert.equal(A.lees({ items: "x" }), null);
  assert.equal(A.lees({ items: [] }).aantal, 0);
});

test("advertenties: datum, telling en blokken van 20", () => {
  assert.equal(A.datumTekst({ datumISO: "2026-10-12T08:00:00Z" }), "12-10-2026");
  assert.equal(A.datumTekst({ datum: " 3 mei " }), "3 mei");
  assert.equal(A.datumTekst({}), "");
  assert.equal(A.telTekst(1), "1 advertentie"); assert.equal(A.telTekst(25), "25 advertenties"); assert.equal(A.telTekst(0), "0 advertenties");
  const rij = Array.from({ length: 45 }, (_, i) => i);
  assert.equal(A.STAP, 20);
  assert.equal(A.eerste(rij, 20).length, 20);
  assert.equal(A.meer(20, 45), 40); assert.equal(A.meer(40, 45), 45);
  assert.equal(A.bedrag(1234567), "€ 1.234.567"); assert.equal(A.bedrag(0), "");
});

test("Te koop: scherm met de afgesproken teksten, contract en foutafhandeling", () => {
  ["Advertenties van Nederlanders.fr, nieuw bovenaan. Een tik opent de advertentie.", "Adverteren is betaald en gaat via Nederlanders.fr. Staat uw advertentie daar, dan vindt u hem ook in deze lijst.", "Adverteren op Nederlanders.fr",
    "De advertenties zijn nu niet te laden.", "Opnieuw proberen", "Open de advertenties op Nederlanders.fr", "Toon meer (nog ", "Exploitatie mogelijk"].forEach(t => assert.ok(html.includes(t), t));
  assert.ok(html.includes("https://www.nederlanders.fr/page/onroerend-goed") || A.ADVERTEREN_URL === "https://www.nederlanders.fr/page/onroerend-goed");
  assert.equal(A.ADVERTEREN_URL, "https://www.nederlanders.fr/page/onroerend-goed");
  const stuk = html.slice(html.indexOf("tkLaad(){"), html.indexOf("tkVals(){"));
  assert.match(stuk, /credentials:"omit"/); assert.match(stuk, /10000/); assert.match(stuk, /maakTeller/);
  assert.match(html, /<a href="\{\{ k\.url \}\}" target="_blank" rel="noopener"/);
  assert.match(html, /-webkit-line-clamp:3/);
  assert.match(html, /aspect-ratio:16\/9/);
  assert.match(html, /loading="lazy"[^>]*onError="\{\{ k\.fout \}\}"/);
  assert.ok(!/Gekopieerd/.test(html.slice(html.indexOf("TE KOOP IN FRANKRIJK"), html.indexOf("OVER ONS ===="))));
});

test("service worker kent de nieuwe bestanden en de versie is opgehoogd", () => {
  const sw = lees("sw.js");
  assert.match(sw, /VERSIE = "2026-10-30-9"/);
  ["./sponsors.json", "./sponsors-lib.js", "./advertenties-lib.js"].forEach(f => assert.ok(sw.includes('"' + f + '"'), f));
  spons.forEach(s => s.beelden.forEach(b => assert.ok(sw.includes('"./sponsors/' + b + '"'), b)));
  assert.match(html, /<script src="\.\/sponsors-lib\.js"><\/script>/); assert.match(html, /<script src="\.\/advertenties-lib\.js"><\/script>/);
});

test("geen liggende streepjes en geen verboden woorden in de nieuwe teksten", () => {
  const bron = [lees("sponsors.json"), lees("sponsors-lib.js"), lees("advertenties-lib.js"), JSON.stringify(cat.modules.find(m => m.id === "tekoop")),
    html.slice(html.indexOf("ONZE SPONSORS ====="), html.indexOf("OVER ONS ====")), html.slice(html.indexOf("Onze sponsors (sponsors.json"), html.indexOf("Zoeken in de artikelen van Infofrankrijk (WordPress"))].join("\n");
  assert.ok(!/[–—]/.test(bron), "em of en dash gevonden");
  assert.ok(!/ecosysteem|corpus|\bKIF\b/i.test(bron));
});

test("herstel 1: prijs k.k. voluit, bron ongewijzigd, nog-aantal, sponsorlabel en vertraging", async () => {
  const { createRequire } = await import("node:module");
  const A = createRequire(import.meta.url)("../advertenties-lib.js");
  assert.equal(A.prijsWeergave("€ 45.000 k.k."), "€ 45.000 k.k. (kosten koper)");
  assert.equal(A.prijsWeergave("€ 45.000 K.K."), "€ 45.000 k.k. (kosten koper)");
  assert.equal(A.prijsWeergave("€ 45.000 kk"), "€ 45.000 k.k. (kosten koper)");
  assert.equal(A.prijsWeergave("€ 45.000"), "€ 45.000");
  assert.equal(A.prijsWeergave("Prijs op aanvraag"), "Prijs op aanvraag");
  const l = A.lees({items:[{titel:"Huis", url:"https://x.nl/a", prijsTekst:"€ 45.000 k.k."}]});
  assert.equal(l.items[0].prijsTekst, "€ 45.000 k.k. (kosten koper)");
  assert.match(html, /"Toon meer \(nog " \+/);
  assert.match(html, /SPONSOR &middot; \{\{ s\.naamHoofd \}\}/);
  assert.match(html, /Naar de site van \{\{ s\.naam \}\} &#8599;/);
  assert.match(html, /Bekijk op Nederlanders\.fr &#8599;/);
  assert.match(html, /Volgorde wisselt bij elke opening\. Tik op een sponsor om de site te openen\./);
  const sp = spons;
  assert.ok(sp.find(s => s.id === "nvlr").vertraging >= 2500);
});
