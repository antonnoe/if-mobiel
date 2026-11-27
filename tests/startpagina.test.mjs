// Startpagina thuiskomen (27-11-2026). Draaien: node --test tests/startpagina.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const S = require("../startpagina-lib.js");
const Nv = require("../nieuwsvoorziening-lib.js");
const Kl = require("../kalender-lib.js");
const Nav = require("../nav-lib.js");
const Ab = require("../abonnee-lib.js");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const cat = JSON.parse(readFileSync(new URL("../modules.json", import.meta.url), "utf8"));
const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
const NU = Date.parse("2026-11-27T12:00:00Z");
const dl = (soort, id) => ({ voor: "Nog 3 dagen", tekst: "IFI, uiterlijk maandag 30 november", id, feest: false, soort });
const nw = (id, signaal, dagen) => ({ id, titel: "Kop " + id, signaal, datum: new Date(NU - dagen * 86400000).toISOString(), url: "https://nieuws.infofrankrijk.com/bericht/" + id });

test("Let op: eerst hooguit 2 deadlines (alleen vandaag en aftelling), daarna nieuws tot 3", () => {
  const r = S.letOp([dl("tip", "a"), dl("aftelling", "b"), dl("vandaag", "c"), dl("aftelling", "d")], [nw("n1", "kans", 1), nw("n2", "wetswijziging", 2)], NU);
  assert.deepEqual(r.map(x => x.type + ":" + x.id), ["deadline:b", "deadline:c", "nieuws:n1"]);
  assert.equal(r[2].label, "Kans");
  assert.equal(S.letOp([], [nw("n2", "wetswijziging", 2)], NU)[0].label, "Wetswijziging");
});
test("Let op: nieuws zonder signaal, met een ander signaal of ouder dan 14 dagen telt niet; geen regels geeft een lege lijst", () => {
  assert.deepEqual(S.letOp([], [nw("a", "", 1), nw("b", "nieuws", 1), nw("c", "kans", 15), { id: "d", titel: "x", datum: "kapot", signaal: "kans", url: "https://x.nl" }], NU), []);
  assert.equal(S.letOp([], [nw("e", "kans", 14)], NU).length, 1);
  assert.deepEqual(S.letOp(null, null, NU), []);
  assert.equal(S.letOp([], [nw("a", { waarde: "Kans" }, 1)], NU).length, 1);
});
test("Let op: de feestregel en regels zonder id tellen niet; nooit meer dan 3", () => {
  assert.deepEqual(S.letOp([{ voor: "", tekst: "Joyeux", id: null, feest: true, soort: "vandaag" }, { ...dl("vandaag", null) }], [], NU), []);
  assert.equal(S.letOp([dl("vandaag", "a"), dl("vandaag", "b")], [nw("1", "kans", 1), nw("2", "kans", 1), nw("3", "kans", 1)], NU).length, 3);
});
test("kalender-lib geeft de soort van elke bandregel mee", () => {
  const r = Kl.bandRegels({ regels: [{ soort: "aftelling", titel: "IFI: aangifte", id: 12, tekst: "x" }] });
  assert.equal(r[0].soort, "aftelling");
});
test("nieuwsvoorziening: kanaal infopoche in de url, signaal in het item", () => {
  assert.equal(Nv.apiUrl({ kanaal: "infopoche" }), "https://nieuws.infofrankrijk.com/api/nieuws?limiet=30&kanaal=infopoche");
  assert.equal(Nv.apiUrl({ kanaal: "onzin" }), "https://nieuws.infofrankrijk.com/api/nieuws?limiet=30");
  const items = Nv.lees({ berichten: [{ id: "a1", kop: "K", samenvatting: "s", gepubliceerdOp: "2026-11-26T10:00:00Z", signaal: "Wetswijziging" }, { id: "a2", kop: "Z", gepubliceerdOp: "2026-11-26T10:00:00Z" }] });
  assert.equal(items.find(i => i.id === "a1").signaal, "wetswijziging");
  assert.equal(items.find(i => i.id === "a2").signaal, "");
});
test("forumregel: naam voor de komma, commentaren of wanneer", () => {
  assert.equal(S.naamVoorKomma("Anton Noë, beheerder en gastheer"), "Anton Noë");
  assert.equal(S.forumMeta("Janny O.", 26, "3 uur geleden"), "Door Janny O. · 26 commentaren");
  assert.equal(S.forumMeta("Janny O.", 1, ""), "Door Janny O. · 1 commentaar");
  assert.equal(S.forumMeta("Janny O.", 0, "3 uur geleden"), "Door Janny O. · 3 uur geleden");
  assert.equal(S.forumMeta("", 0, ""), "Door een lid");
});
test("Infofrankrijk-teller: getallen met punt, terugval zonder getallen", () => {
  assert.equal(S.ifTeller(4123, 52), "4.123 artikelen en 52 instrumenten");
  assert.equal(S.ifTeller(1, 1), "1 artikel en 1 instrument");
  assert.equal(S.ifTeller(900, 0), "900 artikelen");
  assert.equal(S.ifTeller(null, 52), "Alle artikelen en instrumenten van Infofrankrijk");
  assert.equal(S.ifTeller(0, 52), S.IF_TERUGVAL);
  assert.equal(S.totaalUitHeader("4123"), 4123); assert.equal(S.totaalUitHeader(null), null); assert.equal(S.totaalUitHeader("abc"), null);
});
test("Nedergids-regel met en zonder postcode, subregel noemt geen onderwerpen", () => {
  assert.equal(S.nedergidsTekst("62170", "Montreuil-sur-Mer").titel, "Nedergids bij 62170 Montreuil-sur-Mer");
  assert.equal(S.nedergidsTekst("62170", "").titel, "Nedergids bij 62170");
  assert.equal(S.nedergidsTekst("", "x").titel, "Nedergids: adressen bij jou");
  assert.ok(!/huisarts|zorg|ziekenhuis/i.test(S.NG_SUB));
});
test("modules.json: ledenregel en vier tegels met precies een doel", () => {
  assert.equal(cat.startpagina.ledenRegel, "26.000+ leden gingen je voor en heten je welkom");
  const t = S.ifTegels(cat.startpagina);
  assert.deepEqual(t.map(x => x.titel), ["Een huis in Frankrijk", "Ouder worden", "Klussen", "Geld en belasting"]);
  assert.deepEqual(t.map(x => x.soort + ":" + x.waarde), ["scherm:lamaison", "scherm:ouderen", "module:klussen", "thema:geld"]);
  assert.ok(cat.modules.some(m => m.id === "klussen"));
  assert.ok(cat.themas.some(m => m.id === "geld"));
  assert.deepEqual(S.ifTegels({ ifTegels: [{ titel: "a", regel: "b" }, { titel: "a", regel: "b", scherm: "x", module: "y" }] }), []);
});
test("volgorde van de startpagina in de template (B2)", () => {
  const a = html.indexOf('data-startpagina="1"'), i = s => { const n = html.indexOf(s, a); assert.ok(n > 0, s); return n; };
  const rij = [i('data-woordbeeld="1"'), i('data-ledenregel="1"'), i('id="hubq"'), i('data-plaatsknop="hub"'), i('data-airegel="1"'), i('data-letop="1"'),
    i('data-startberichten="1"'), i('data-ifblok="1"'), i('data-nedergids-regel="1"'), i('data-categorieenregel="1"'), i('data-abonneeblok="1"'), i('data-voet-alles="1"')];
  assert.deepEqual(rij, rij.slice().sort((x, y) => x - y));
  assert.ok(!html.slice(a, html.indexOf("<!-- ============ HUB / VANDAAG")).includes("{{ begroetingTekst }}"));
  assert.ok(!html.slice(a, html.indexOf("<!-- ============ HUB / VANDAAG")).includes('data-vandaag="1"'), "geen groene band op de startpagina");
});
test("kopbalk: bordeaux op alle schermen, navigatiewoorden op de hub, theme-color blijft wit", () => {
  assert.match(html, /data-kopbalk="1"/);
  assert.match(html, /background:#800000;color:#fff" data-kopbalk="1"/);
  for (const w of ["forum", "infofrankrijk", "kalender", "nieuws"]) assert.ok(html.includes('data-kopnav-item="' + w + '"'));
  assert.ok(html.includes("font:700 12.5px Mulish;cursor:pointer\">Forum</button>"));
  assert.match(html, /<meta name="theme-color" content="#FFFFFF">/i);
  const man = JSON.parse(readFileSync(new URL("../manifest.webmanifest", import.meta.url), "utf8"));
  assert.match(man.theme_color, /^#fff(fff)?$/i);
  assert.match(html, /data-installbalk="1" style="[^"]*border-top:1px solid rgba\(255,255,255,\.28\)/);
});
test("scherm Categorieën is overal geregistreerd", () => {
  assert.equal(Nav.parseHash("#/categorieen").scherm, "categorieen");
  assert.equal(Nav.bouwHash({ screen: "categorieen" }), "#/categorieen");
  assert.ok(Nav.isTop({ screen: "categorieen" }) === false);
  assert.match(html, /\|categorieen\)\$\/;/);
  assert.match(html, /const KOP_H1 = \[[^\]]*"categorieen"\]/);
  assert.match(html, /categorieen:"Categorieën"/);
  assert.match(html, /hubToontTegels: st\.screen === "categorieen"/);
  assert.equal(require("../hub-lib.js").tabVan("categorieen"), "hub");
  assert.ok(!html.includes('data-plaatsblok="hub"'));
});
test("Dossier Frankrijk-blok onder een artikel, teksten op een plek", () => {
  const b = Ab.DOSSIER_BLOK;
  assert.equal(b.kop, "Bewaar dit in je Dossier Frankrijk");
  assert.match(b.tekst, /^Je eigen map voor het leven in Frankrijk: artikelen, notities, taken en deadlines op één plek\. Voor abonnees\.$/);
  assert.equal(b.knop, "Naar dossierfrankrijk.nl ↗"); assert.equal(b.url, "https://www.dossierfrankrijk.nl/");
  const e = html.indexOf("</article>"), d = html.indexOf('data-art-dossier="1"'), m = html.indexOf('data-art-inlog');
  assert.ok(e > 0 && d > e && d < m);
  assert.ok(html.slice(d, d + 1200).includes("#0E1A2E") && html.slice(d, d + 1200).includes("#E8B04A"));
});
test("geen lange streepjes en geen u-vormen in de nieuwe zichtbare teksten; service worker kent de lib", () => {
  const tekst = [S.VOET_LINKS, S.VOET_RECHTS, S.IF_TERUGVAL, S.IF_SUB, S.NG_SUB, cat.startpagina.ledenRegel, Ab.DOSSIER_BLOK.tekst].join(" ");
  assert.ok(!/[–—]/.test(tekst));
  assert.ok(sw.includes('"./startpagina-lib.js"'));
  assert.ok(html.includes('<script src="./startpagina-lib.js"></script>'));
  assert.match(sw, /VERSIE = "2026-11-27-1"/);
});
