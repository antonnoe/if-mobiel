// Scherm Infofrankrijk (10 november 2026): url-bouwers, antwoord lezen, entiteiten, datum, bedrading.
// Draaien: node --test tests/infofr.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const I = require("../infofr-lib.js");
const Nv = require("../nav-lib.js");
const lees = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const html = lees("index.html"), sw = lees("sw.js"), cat = JSON.parse(lees("modules.json"));
const fixture = JSON.parse(lees("tests/fixture-infofr.json"));

test("url-bouwers", () => {
  assert.equal(I.nieuwsteUrl(), "https://infofrankrijk.com/wp-json/wp/v2/posts?per_page=5&_fields=title,date,link");
  assert.equal(I.rubriekUrl([563, 343], 2), "https://infofrankrijk.com/wp-json/wp/v2/posts?categories=563,343&per_page=20&page=2&_fields=title,date,link");
  assert.equal(I.rubriekUrl([361]), "https://infofrankrijk.com/wp-json/wp/v2/posts?categories=361&per_page=20&page=1&_fields=title,date,link");
  assert.equal(I.rubriekUrl([], 1), null);
  assert.equal(I.rubriekUrl(["x", -3, 1.5, "7"], 1).includes("categories=7&"), true);
});
test("entiteiten en tags worden platte tekst", () => {
  assert.equal(I.decodeer("A &#038; B &#8220;citaat&#8221; &amp; &eacute;"), 'A & B “citaat” & é');
  assert.equal(I.decodeer("De hoofdschakelaar "), "De hoofdschakelaar");
  assert.equal(I.decodeer("Pas op &#8211; <b>vet</b> &lt;script&gt;"), "Pas op - vet <script>");
  assert.equal(I.decodeer("&onbekend; blijft"), "&onbekend; blijft");
  assert.equal(I.decodeer(null), "");
});
test("datum dd-mm-jjjj", () => {
  assert.equal(I.datumNl("2026-11-06T08:50:00"), "06-11-2026");
  assert.equal(I.datumNl(""), "");
  assert.equal(I.datumNl("onzin"), "");
});
test("alleen https-links op infofrankrijk.com", () => {
  for (const u of ["https://infofrankrijk.com/a/", "https://www.infofrankrijk.com/b/"]) assert.ok(I.linkOk(u), u);
  for (const u of ["http://infofrankrijk.com/a/", "https://infofrankrijk.com.evil.nl/a", "https://evil.nl/infofrankrijk.com/", "javascript:alert(1)", "", null, "https://infofrankrijk.com/a b"]) assert.ok(!I.linkOk(u), String(u));
});
test("echt antwoord wordt gelezen; kapotte rijen vallen af", () => {
  const r = I.leesPosts(fixture);
  assert.equal(r.length, fixture.length);
  for (const x of r) { assert.ok(x.titel && !/&#?\w+;/.test(x.titel)); assert.ok(I.linkOk(x.url)); assert.match(x.datum, /^\d{2}-\d{2}-\d{4}$/); }
  assert.ok(r.some(x => x.titel.includes("“") || x.titel.includes("&")));
  const k = I.leesPosts([{title:{rendered:""}, link:"https://infofrankrijk.com/x/"}, {title:{rendered:"Zonder link"}}, {title:{rendered:"Buiten"}, link:"https://andere.nl/x"},
    {title:{rendered:"Goed"}, link:"https://infofrankrijk.com/g/", date:"2026-01-02T00:00:00"}, {title:{rendered:"Dubbel"}, link:"https://infofrankrijk.com/g/"}, null]);
  assert.deepEqual(k, [{titel:"Goed", url:"https://infofrankrijk.com/g/", datum:"02-01-2026"}]);
  assert.deepEqual(I.leesPosts({fout:1}), []);
});
test("aantal pagina's", () => {
  assert.equal(I.aantalPaginas("15", 1, 20), 15);
  assert.equal(I.aantalPaginas(null, 1, 20), 2);
  assert.equal(I.aantalPaginas(null, 3, 7), 3);
  assert.equal(I.aantalPaginas("0", 1, 3), 1);
});
test("catalogus: acht onderwerpen in de afgesproken volgorde met de afgesproken categorieen", () => {
  const o = I.leesOnderwerpen(cat.infofrankrijk);
  assert.deepEqual(o.map(x => x.titel), ["Geldzaken & belasting", "Overheden", "Zorg en welzijn", "Wonen", "Vastgoed", "Verbouwen", "Ondernemen", "Emigreren"]);
  assert.deepEqual(o.map(x => x.categorieen), [[361], [26], [49], [47], [355], [39], [22], [563, 343]]);
  assert.deepEqual(I.leesOnderwerpen({onderwerpen:[{titel:"", categorieen:[1]}, {titel:"Leeg", categorieen:[]}, null]}), []);
  assert.deepEqual(I.leesOnderwerpen(null), []);
});
test("bedrading: hash, navKey, tab, scripts, service worker", () => {
  assert.deepEqual(Nv.parseHash("#/infofrankrijk"), {soort:"scherm", scherm:"infofr"});
  assert.equal(Nv.bouwHash({screen:"infofr", ifOnd:"3"}), "#/infofrankrijk");
  assert.notEqual(Nv.navKey({screen:"infofr", ifOnd:""}), Nv.navKey({screen:"infofr", ifOnd:"2"}));
  assert.equal(require("../hub-lib.js").tabVan("infofr"), "hub");
  assert.match(html, /<script src="\.\/infofr-lib\.js"><\/script>/);
  assert.ok(sw.includes('"./infofr-lib.js"'));
  assert.match(html, /SHOWBACK = \/\^\([^)]*\|infofr\|/);
  assert.ok(!/KOP_H1 = \[[^\]]*infofr/.test(html));
  assert.ok(html.includes('open:() => this.go("infofr")'));
  assert.ok(html.includes('ifOnd: st.screen === "infofr"'));
  assert.ok(html.includes('st.screen === "infofr" && st.ifOnd'));
});
test("scherm: geen lange streepjes, geen innerHTML, afbeeldingen niet nodig", () => {
  const blok = html.slice(html.indexOf("INFOFRANKRIJK (dossiers"), html.indexOf("TE KOOP IN FRANKRIJK (advertenties"));
  assert.ok(blok.length > 1000 && !/[–—]/.test(blok) && !/<img/.test(blok));
  const van = html.indexOf("// ---- Scherm Infofrankrijk"), code = html.slice(van, html.indexOf("// Tabnavigatie verlaat de module", van));
  assert.ok(code.length > 1000 && !/innerHTML/.test(code) && code.includes('credentials:"omit"'));
  assert.ok(!/[–—]/.test(lees("infofr-lib.js").replace(/\\u201[34]/g, "")));
});
