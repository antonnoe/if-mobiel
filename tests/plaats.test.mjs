// Plaats een bericht op het forum: ingangen op de startpagina en de tab Forum, blad met uitleg (26-11-2026).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const P = require("../plaats-lib.js");
const html = readFileSync(join(root, "index.html"), "utf8");
const sw = readFileSync(join(root, "sw.js"), "utf8");

test("drie ingangen met de afgesproken labels, in deze volgorde", () => {
  assert.deepEqual(P.SOORTEN.map(s => s.label), ["Stel een vraag", "Deel je ervaring", "Een leuk verhaal?"]);
  for (const s of P.SOORTEN.concat([P.ALGEMEEN])) { assert.ok(s.kop); assert.ok(s.tip); }
});

test("een onbekende soort valt terug op het algemene blad", () => {
  assert.equal(P.soort("vraag").id, "vraag");
  assert.equal(P.soort("onzin").id, "algemeen");
  assert.equal(P.soort().id, "algemeen");
});

test("gratis gaat naar het schrijfformulier, betaald naar de betaalpagina, beide https op Nederlanders.fr", () => {
  assert.equal(P.FORUM_NIEUW, "https://www.nederlanders.fr/profiles/blog/new");
  assert.equal(P.BETAALD, "https://www.nederlanders.fr/page/betaalpagina-berichten");
  assert.ok(html.includes('const FORUM_NIEUW = "' + P.FORUM_NIEUW + '"'));
});

test("het blok staat op de startpagina tussen het vraagveld en de negen onderwerpen", () => {
  const veld = html.indexOf('data-airegel="1"');
  const blok = html.indexOf('data-plaatsblok="hub"');
  const tegels = html.indexOf("Of kies een onderwerp");
  assert.ok(veld > 0 && veld < blok && blok < tegels);
});

test("op de startpagina komt er geen volle bordeaux knop bij", () => {
  const a = html.indexOf('data-plaatsblok="hub"');
  const stuk = html.slice(a, html.indexOf("Of kies een onderwerp", a));
  assert.ok(!/background:#800000/.test(stuk));
});

test("het blok staat op de tab Forum, boven de berichten, met de algemene knop", () => {
  const blok = html.indexOf('data-plaatsblok="forum"');
  assert.ok(blok > html.indexOf("isGem") && blok < html.indexOf("data-forum-fout"));
  assert.ok(html.includes('data-plaats-soort="algemeen"'));
});

test("het blad opent Nederlanders.fr pas na een tik en toont de betaalde route als link", () => {
  assert.ok(html.includes('data-plaatsblad="1"'));
  assert.ok(html.includes('data-plaats-open="1" href="{{ plaatsUrl }}"'));
  assert.ok(html.includes('data-plaats-betaald="1" href="{{ plaatsBetaaldUrl }}"'));
  assert.ok(/plaatsStart\(id\)\{[\s\S]{0,200}forumBlad:\{plaats:/.test(html), "hergebruikt de blad-staat forumBlad");
});

test("service worker kent plaats-lib.js en index.html laadt het", () => {
  assert.ok(sw.includes('"./plaats-lib.js"'));
  assert.ok(html.includes('<script src="./plaats-lib.js"></script>'));
});

test("sterrenkaart, blok onderaan: forumknop groot, Café Claude alleen als tekstlink", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const a = html.indexOf('data-sk-forum="1"');
  assert.ok(a > 0);
  const blok = html.slice(a, html.indexOf("{{ noResults }}", a));
  assert.match(blok, /data-sk-forumknop="1" onClick="\{\{ plaatsVraag \}\}"/);
  assert.match(blok, /Stel je vraag op het forum/);
  assert.match(blok, /data-sk-cafe="1"/);
  assert.ok(!/background:#8A5A2B;color:#fff/.test(blok), "geen volle Café Claude-knop meer");
  assert.match(html, /plaatsVraag: \(\) => this\.plaatsStart\("vraag"\)/);
});

test("één knop Plaats een bericht, geen keuzeknoppen per soort (besluit 26-11-2026)", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  assert.ok(!html.includes("plaatsSoorten"));
  assert.equal((html.match(/data-plaats-soort="algemeen"/g) || []).length, 2);
});
