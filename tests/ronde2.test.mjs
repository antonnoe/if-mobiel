// Bouwronde 2 (23-10-2026): Gezondheid in twee niveaus, toolkaart voor iframes in artikelen, veld `artikel` op modules,
// prijzen voorlopig gratis. Draaien: node --test tests/ronde2.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const cat = JSON.parse(fs.readFileSync(path.join(root, "modules.json"), "utf8"));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const A = require(path.join(root, "artikel-lib.js"));
const Nv = require(path.join(root, "nav-lib.js"));
const gz = cat.gezondheid;
const mod = id => cat.modules.find(m => m.id === id);

// ---- Gezondheid: indeling -----------------------------------------------------------------------
test("gezondheid: zes onderwerpen in de afgesproken volgorde, spoedblok met tel:15", () => {
  assert.deepEqual(gz.onderwerpen.map(o => o.id), ["verzekerd", "arts", "ziekenhuis", "apotheek", "ouderen", "woorden"]);
  assert.equal(gz.intro, "Verzekerd zijn, naar de dokter, het ziekenhuis, de apotheek, en zorg als u ouder wordt.");
  assert.equal(gz.spoed.tel, "15");
  assert.equal(gz.spoed.knop, "Bel 15");
  assert.equal(gz.spoed.tekst, "Medisch spoedgeval: 15 (Samu). Overal in de EU: 112.");
  assert.deepEqual(gz.spoed.knoppen, [{ label: "Bel 15", tel: "15" }, { label: "Bel 112", tel: "112" }]);
  assert.match(html, /gzSpoedKnoppen: spoedKnoppen/);
});

test("gezondheid: elk onderwerp heeft een bestemming (artikel, module of scherm)", () => {
  gz.onderwerpen.forEach(o => {
    assert.ok(o.titel && o.regel && o.icoon, o.id + ": titel, regel en icoon");
    const arts = o.artikelen || [], mods = o.modules || [];
    assert.ok(arts.length || mods.length || o.scherm, o.id + " heeft geen bestemming");
    arts.forEach(a => { assert.ok(A.isInApp(a.url), a.url + " opent in de app"); assert.ok(a.titel && a.titel.length > 3); });
    mods.forEach(id => assert.ok(mod(id), "module " + id + " bestaat"));
    if (o.scherm) assert.equal(o.scherm, "ouderen");
    assert.ok(new RegExp("gz" + o.icoon.replace(/^gz/, "") + ":").test(html), "icoon " + o.icoon + " staat in THEMA_ICONS");
  });
  const artikelen = gz.onderwerpen.flatMap(o => (o.artikelen || []).map(a => a.url));
  assert.equal(artikelen.length, 10, "de tien artikelen uit de opdracht");
  assert.equal(new Set(artikelen).size, artikelen.length);
  assert.deepEqual(gz.onderwerpen.find(o => o.id === "woorden").modules, ["woordenboek"]);
});

test("gezondheid: het dossier Ouder worden blijft ongewijzigd (zes fasen, nood, nu al regelen)", () => {
  assert.equal(gz.fasen.length, 6);
  assert.deepEqual(gz.nood.hoofdstukken, [28, 30]);
  assert.deepEqual(gz.nuregelen.hoofdstukken, [22, 23, 24, 25]);
});

test("gezondheid: terug en geschiedenis kennen het onderwerp (gzOnd)", () => {
  assert.match(html, /st\.screen === "gezondheid" && st\.gzOnd !== null\) \{ this\.setState\(\{gzOnd:null\}\)/);
  assert.match(html, /gzHfd:st\.gzHfd, gzOnd:st\.gzOnd, gzLijst:st\.gzLijst/);
  const a = Nv.navKey({ screen: "gezondheid", gzOnd: "arts" }), b = Nv.navKey({ screen: "gezondheid", gzOnd: "apotheek" }), c = Nv.navKey({ screen: "gezondheid" });
  assert.notEqual(a, b); assert.notEqual(a, c);
});

// ---- Toolkaart ------------------------------------------------------------------------------------
test("toolkaart: module-herkenning op host (en op eerste padsegment bij github.io)", () => {
  const k = A.toolKaartVoor("https://financieel-kompas-ai.vercel.app/embed?x=1", cat.modules);
  assert.equal(k.soort, "module"); assert.equal(k.module, "kompas"); assert.equal(k.naam, mod("kompas").naam); assert.equal(k.knop, "Open de tool");
  assert.equal(A.toolKaartVoor("https://www.moestuin-fr.vercel.app/", cat.modules).module, "moestuin", "www telt niet mee");
  assert.equal(A.toolKaartVoor("https://antonnoe.github.io/erfrecht-en-testament/", cat.modules).module, "erfrecht");
  assert.equal(A.toolKaartVoor("https://antonnoe.github.io/Vastgoedtransactie/index.html", cat.modules).module, "transactiekosten");
  assert.equal(A.moduleVoorUrl("https://antonnoe.github.io/onbekend/", cat.modules), null, "ander github.io-pad is een andere tool");
  const ext = A.toolKaartVoor("https://onbekende-tool.vercel.app/", cat.modules);
  assert.equal(ext.soort, "extern"); assert.equal(ext.label, "Interactieve tool"); assert.equal(ext.naam, "onbekende-tool.vercel.app");
  assert.equal(A.toolKaartVoor("http://onveilig.example/", cat.modules), null, "alleen https");
  assert.equal(A.toolKaartVoor("javascript:alert(1)", cat.modules), null);
  const v = A.toolKaartVoor("https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0", cat.modules);
  assert.equal(v.soort, "video"); assert.equal(v.href, "https://www.youtube.com/watch?v=dQw4w9WgXcQ"); assert.match(v.knop, /^Bekijk de video/);
  assert.equal(A.toolKaartVoor("https://player.vimeo.com/video/12345", cat.modules).href, "https://vimeo.com/12345");
  const weg = [{ id: "x", url: "https://x.example/", zichtbaar: false, naam: "X" }];
  assert.equal(A.moduleVoorUrl("https://x.example/", weg), null, "een module die overal weg is telt niet");
});

async function inBrowser(fn, arg) {
  let chromium;
  try { chromium = createRequire("/opt/node-tools/node_modules/")("playwright").chromium; }
  catch { try { chromium = require("playwright").chromium; } catch { return undefined; } }
  let browser;
  try { browser = await chromium.launch(); } catch { return undefined; }
  try {
    const page = await browser.newPage();
    await page.addScriptTag({ content: fs.readFileSync(path.join(root, "artikel-lib.js"), "utf8") });
    return await page.evaluate(fn, arg);
  } finally { await browser.close(); }
}

test("toolkaart: een iframe in een artikel wordt een kaart, nooit een iframe", async t => {
  const lang = '<p>' + 'Lopende tekst die het artikel een echt artikel maakt. '.repeat(8) + '</p>';
  const h = lang + '<p>Voor</p><p><iframe src="https://financieel-kompas-ai.vercel.app/" width="600"></iframe></p>'
    + '<div><iframe src="https://www.youtube.com/embed/abcdefghijk"></iframe></div><iframe src="http://onveilig.example/"></iframe>'
    + '<iframe data-src="https://tool.example/x"></iframe><p>Na</p>';
  const uit = await inBrowser(([x, mods]) => {
    const b = window.IfArtikel.schoon(x, { modules: mods });
    return { html: b.innerHTML, kaarten: [...b.querySelectorAll("[data-toolkaart]")].map(k => ({ soort: k.getAttribute("data-toolkaart"), tekst: k.textContent, a: k.querySelector("a").getAttribute("href"), tool: k.querySelector("a").getAttribute("data-tool"), target: k.querySelector("a").getAttribute("target") })) };
  }, [h, cat.modules]);
  if (!uit) return t.skip("geen headless browser beschikbaar");
  assert.ok(!/<iframe/i.test(uit.html), uit.html);
  assert.equal(uit.kaarten.length, 3, "http-iframe valt weg, de drie https-iframes worden kaarten");
  assert.deepEqual(uit.kaarten.map(k => k.soort), ["module", "video", "extern"]);
  assert.match(uit.kaarten[0].tekst, /Financieel kompas.*Open de tool/);
  assert.equal(uit.kaarten[0].tool, "kompas");
  assert.match(uit.kaarten[1].tekst, /Bekijk de video/);
  assert.equal(uit.kaarten[1].a, "https://www.youtube.com/watch?v=abcdefghijk");
  assert.equal(uit.kaarten[2].tool, null); assert.equal(uit.kaarten[2].target, "_blank");
  assert.ok(uit.html.indexOf("Voor") < uit.html.indexOf("data-toolkaart") && uit.html.lastIndexOf("data-toolkaart") < uit.html.indexOf("Na"), "de kaart staat op de plek van het iframe");
});

// ---- Veld artikel op modules ------------------------------------------------------------------------
test("veld artikel: gevulde modules wijzen naar een artikel dat de app kan openen", () => {
  const verwacht = { kompas: "financieel-kompas", auto: "auto-importeren-in-frankrijk-stappenplan-en-kostenraming", internet: "internet-internetverbinding",
    moestuin: "de-moestuin-in-frankrijk-van-begin-januari-tot-eind-december", devisdossier: "zakelijke-transactie-van-offerte-tot-incasso",
    bouwgrond: "locatie-en-omgevingsanalyse", plusvalue: "plus-value-calculator", correspondentie: "correspondentie-assistent",
    // ronde 24-10-2026: zes modules erbij (tests/ronde4.test.mjs)
    beroepenchecker: "beroepenchecker-werken-of-ondernemen-in-frankrijk", energieportaal: "energieportaal-bereken-de-energieprestatie-van-uw-franse-woning",
    vastgoedanalyse: "vastgoed-in-frankrijk-analyseren-per-adres-prijzen-risicos-dpe-plu", klusforum: "uit-het-klusforum-van-infofrankrijk-com",
    controletechnique: "de-controle-technique-de-franse-apk", tekoop: "huizen-van-leden-te-koop", overhedenbuurt: "vind-franse-overheden-en-instellingen-bij-jou-in-de-buurt" };
  Object.entries(verwacht).forEach(([id, slug]) => assert.equal(A.slugUitUrl(mod(id).artikel), slug, id));
  cat.modules.filter(m => m.artikel).forEach(m => assert.ok(A.isInApp(m.artikel), m.id));
  assert.equal(cat.modules.filter(m => m.artikel).length, Object.keys(verwacht).length);
  assert.equal(mod("plusvalue").weergave, "knop", "plus-value-calculator staat framing niet toe: nieuw tabblad");
});
test("veld artikel: tegel opent de tool, de uitlegrij en hash-routes het artikel", () => {
  assert.match(html, /if \(opt && opt\.tegel\) \{ const m = this\.moduleVoorArtikel\(slug\); if \(m\) \{ this\.route\(m\); return; \} \}/);
  assert.match(html, /toolArtikelOpen: \(\) => \{ const u = T && this\.toolArtikel\(T\); if \(u\) this\.openInfoArtikel\(u\); \}/);
  assert.match(html, /openInfoArtikel\(A\.BASIS \+ "\/" \+ r\.slug \+ "\/"\)/);
  assert.match(html, /Lees de uitleg op Infofrankrijk/);
  assert.match(html, /closest\("a\[data-tool\]"\)/);
});

// ---- Prijzen ---------------------------------------------------------------------------------------
test("prijs-labels: geen module staat nog op abonnee, het veld drempel is er en leeg", () => {
  assert.equal(cat.modules.filter(m => m.prijs === "abonnee").length, 0);
  ["energie", "kompas", "erfrecht", "transactiekosten", "dossierfrankrijk"].forEach(id => {
    assert.equal(mod(id).prijs, "gratis", id);
    assert.equal(mod(id).drempel, "", id + ": leeg veld drempel");
  });
  assert.ok(/drempel \(optioneel/.test(cat._uitleg) && /artikel \(optioneel/.test(cat._uitleg), "beide velden staan in _uitleg");
  assert.ok(html.includes('m.prijs === "abonnee"'), "de knip-haken in de code blijven bestaan");
  cat.modules.forEach(m => assert.ok(["gratis", "gratis-lezen", "gratis-eerste", "abonnee"].includes(m.prijs), m.id));
});
