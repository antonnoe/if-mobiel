import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const V = require("../vraag-lib.js");
const K = require("../klusarchief-lib.js");
const html = readFileSync(join(root, "index.html"), "utf8");
const lib = readFileSync(join(root, "vraag-lib.js"), "utf8");
const sw = readFileSync(join(root, "sw.js"), "utf8");
const fn = readFileSync(join(root, "supabase/functions/infopoche-vraag/index.ts"), "utf8");

test("body: schoon, 5 tot 300 tekens, honingpot leeg", () => {
  assert.equal(V.body("abc"), null);
  assert.equal(V.body("   "), null);
  assert.deepEqual(JSON.parse(V.body("  mag ik   een schuur bouwen ")), { vraag: "mag ik een schuur bouwen", web: "" });
  assert.equal(JSON.parse(V.body("x".repeat(400))).vraag.length, 300);
});

test("automatisch starten: 3 of meer woorden of een vraagteken", () => {
  assert.equal(V.metAuto("mag ik een schuur bouwen"), true);
  assert.equal(V.metAuto("hoe vind ik"), true);
  assert.equal(V.metAuto("huisarts?"), true);
  assert.equal(V.metAuto("huisarts"), false);
  assert.equal(V.metAuto("taxe foncière"), false);
  assert.equal(V.metAuto("ab ?"), false);
  assert.equal(V.metAuto(""), false);
});

test("sleutel: dezelfde vraag, andere schrijfwijze", () => {
  assert.equal(V.sleutel("Wat is de Taxe Foncière?"), V.sleutel("wat is de taxe fonciere"));
  assert.notEqual(V.sleutel("huisarts zoeken"), V.sleutel("tandarts zoeken"));
});

test("status en soorten", () => {
  assert.equal(V.aan({ ok: true, aan: true }), true);
  assert.equal(V.aan({ ok: true, aan: false }), false);
  assert.equal(V.aan(null), false);
  assert.equal(V.soort(403, { ok: false, fout: "herkomst" }), "uit");
  assert.equal(V.soort(503, { ok: false, fout: "uit" }), "uit");
  assert.equal(V.soort(429, { ok: false, fout: "druk" }), "druk");
  assert.equal(V.soort(200, { ok: true, antwoord: "x", bronnen: [] }), "ok");
  assert.equal(V.soort(502, { ok: false, fout: "model" }), "fout");
});

const bronA = { n: 1, soort: "artikel", titel: "Fiscale kalender", datum: "2026-10-10", jaar: 2026, url: "https://infofrankrijk.com/fiscale-kalender-frankrijk/", id: null, verouderd: false };
const bronO = { n: 2, soort: "officieel", titel: "Abri de jardin", datum: "2025-03-21", jaar: 2025, url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F662", id: null, verouderd: false };
const bronF = { n: 3, soort: "forum", titel: "Septic tank", datum: null, jaar: 2014, url: null, id: 123, verouderd: false };

test("lees: geldige bronnen blijven, ongeldige vallen af", () => {
  const l = V.lees({ ok: true, antwoord: "Dit [1] en dat [2] en dit [3].", bronnen: [bronA, bronO, bronF] });
  assert.equal(l.bronnen.length, 3);
  assert.equal(l.geenBron, false);
  const slecht = V.lees({ ok: true, antwoord: "Tekst [1] [2] [3] [4].", bronnen: [
    { ...bronA, url: "http://infofrankrijk.com/x/" },
    { ...bronO, url: "https://evil.example/service-public.gouv.fr/" },
    { ...bronF, id: "abc" },
    { ...bronA, n: 4, url: "https://infofrankrijk.com.evil.nl/x/" }] });
  assert.equal(slecht.geenBron, true);
  assert.equal(slecht.bronnen.length, 0);
  assert.equal(slecht.antwoord, V.GEEN_BRON);
});

test("lees: een artikel op een vreemde host of een javascript-url valt af", () => {
  const l = V.lees({ ok: true, antwoord: "A [1] B [2]", bronnen: [bronA, { ...bronA, n: 2, url: "javascript:alert(1)" }] });
  assert.deepEqual(l.bronnen.map((b) => b.n), [1]);
});

test("lees: het vaste antwoord zonder bron en foute antwoorden", () => {
  const l = V.lees({ ok: true, antwoord: V.GEEN_BRON, bronnen: [] });
  assert.equal(l.geenBron, true);
  assert.equal(V.lees({ ok: false }), null);
  assert.equal(V.lees({ ok: true, antwoord: "", bronnen: [] }), null);
  assert.equal(V.lees(null), null);
});

test("blokken: [n] met bron wordt segment, zonder bron kale tekst, nooit HTML", () => {
  const b = V.blokken("Tekst met <b>x</b> [1] en [9].\n\n- punt [2]", [bronA, bronO]);
  assert.equal(b[0].soort, "alinea");
  const segs = b[0].segs;
  assert.ok(segs.some((s) => s.bron && s.n === 1));
  assert.ok(!segs.some((s) => s.bron && s.n === 9));
  assert.ok(segs.some((s) => !s.bron && s.t.indexOf("<b>x</b>") >= 0), "HTML blijft tekst");
  assert.equal(b[1].soort, "lijst");
});

test("meta, privacy, label en teksten", () => {
  assert.match(V.bronMeta(bronA), /2026-10-10|10-10-2026/);
  assert.equal(V.LABEL, "abonnee, nu gratis");
  assert.equal(V.REGEL, "Kort antwoord met AI: voor abonnees, nu nog voor iedereen");
  assert.match(V.PRIVACY, /Claude van Anthropic/);
  assert.match(V.PRIVACY, /Infopoche bewaart hem niet/);
  assert.equal(V.WACHT, "Antwoord zoeken in onze bronnen...");
  assert.equal(V.TIMEOUT_MS, 45000);
  assert.equal(V.samenvatting(), "Samenvatting door de app op basis van de bronnen hierboven. Franse bronnen zijn vertaald.");
  assert.equal(V.heeftForum([bronA, bronF]), true);
  assert.equal(V.heeftForum([bronA]), false);
  for (const t of [V.KOP, V.KNOP, V.WACHT, V.PRIVACY, V.GEEN_BRON]) assert.equal(/[–—]/.test(t), false, "geen lange streepjes");
});

test("bestand en schil: één URL, geen sleutels, in SCHIL, VERSIE opgehoogd", () => {
  assert.equal((lib.match(/supabase\.co/g) || []).length, 1);
  assert.ok(V.BASIS.endsWith("/functions/v1/infopoche-vraag"));
  assert.equal(/sk-ant|ANTHROPIC|localStorage|sessionStorage|innerHTML/.test(lib), false);
  assert.ok(sw.includes('"./vraag-lib.js"'));
  assert.match(sw, /const VERSIE = "\d{4}-\d{2}-\d{2}-\d+"/);
  assert.ok(html.includes('<script src="./vraag-lib.js"></script>'));
  assert.ok(html.indexOf("klusarchief-lib.js") < html.indexOf("vraag-lib.js"));
});

test("scherm: kaart bovenaan het zoekscherm, boven Bij jou, label abonnee, geen opslag", () => {
  const i = html.indexOf('data-vraag="1"');
  assert.ok(i > 0);
  assert.ok(i < html.indexOf('data-bijjou="1"'), "boven het blok Bij jou");
  assert.ok(i > html.indexOf('id="zq"'), "onder het zoekveld");
  for (const a of ["data-vraag-knop", "data-vraag-wacht", "data-vraag-antwoord", "data-vraag-bronnen", "data-vraag-samenvatting", "data-vraag-privacy", "data-vraag-label"]) assert.ok(html.includes(a), a);
  const m = html.slice(html.indexOf("vraagCheck(){"), html.indexOf("bijJouVals(){"));
  assert.equal(/localStorage|sessionStorage|history\.|innerHTML/.test(m), false);
  assert.match(m, /V\.TIMEOUT_MS/);
  assert.match(m, /_vrTeller/);
  assert.match(html, /this\.vraagPlan\(v, true\)/, "Enter op de startpagina start meteen");
});

test("functie (documentatiekopie): herkomst, limieten, model, geen sleutel in code", () => {
  assert.match(fn, /const MODEL = "claude-sonnet-5-5"/);
  assert.equal(/temperature/.test(fn), false);
  assert.match(fn, /Deno\.env\.get\("ANTHROPIC_API_KEY"\)/);
  assert.equal(/sk-ant-/.test(fn), false);
  assert.match(fn, /MAX_PER_UUR = 150/);
  assert.match(fn, /MAX_PER_DAG = 800/);
  assert.match(fn, /infopoche_vraag/);
  assert.match(fn, /const THUIS = \["https:\/\/infopoche\.fr"/);
  assert.match(fn, /infofrankrijk\.com\/wp-json\/wp\/v2"/);
  assert.match(fn, /\/search\?search=.*per_page=10&subtype=post,page/);
  assert.match(fn, /\$\{t\.subtype === "page" \? "pages" : "posts"\}\/\$\{t\.id\}/);
  assert.match(fn, /Behandelt een bron het onderwerp van de vraag deels/);
  assert.match(fn, /klusarchief_kennis_context/);
  assert.match(fn, /klusarchief_context/);
  assert.ok(fn.includes("Hier vond ik geen bron voor. Kijk in de resultaten hieronder of stel je vraag op het forum."));
});
