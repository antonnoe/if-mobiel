// Controle van het artikelscherm (besluit 7 en 8), het abonneeblok en het onderblad (besluit 3 en 4).
// Pure logica: slug uit URL, betaalmuurherkenning, weekregel. Sanering draait in headless Chromium
// (Playwright) en wordt overgeslagen als die ontbreekt. Draaien: node --test tests/artikel.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const A = require(path.join(root, "artikel-lib.js"));
const B = require(path.join(root, "abonnee-lib.js"));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const cat = JSON.parse(fs.readFileSync(path.join(root, "modules.json"), "utf8"));

test("slug uit het pad van de URL", () => {
  assert.equal(A.slugUitUrl("https://infofrankrijk.com/solvit-bureaucreatie-frankrijk-franse-instantie/"), "solvit-bureaucreatie-frankrijk-franse-instantie");
  assert.equal(A.slugUitUrl("https://www.infofrankrijk.com/ons-manifest-hoe-wij-werken"), "ons-manifest-hoe-wij-werken");
  assert.equal(A.slugUitUrl("https://infofrankrijk.com/ouderenzorg-frankrijk/?utm=x#ifr-sec-3"), "ouderenzorg-frankrijk");
  assert.equal(A.slugUitUrl("http://infofrankrijk.com/Artikel-Een/"), "artikel-een");
  assert.equal(A.slugUitUrl("/ons-manifest/"), "ons-manifest", "een relatief pad hoort bij infofrankrijk.com");
});

test("geen artikel: andere sites, de homepage, abonnement, systeempaden, de Klussen-site", () => {
  ["https://nederlanders.fr/profiles/blog/new", "https://infofrankrijk.com/", "https://infofrankrijk.com/abonnement/",
    "https://infofrankrijk.com/wp-admin/", "https://infofrankrijk.com/wp-json/wp/v2/posts", "https://infofrankrijk.com/klussen/artikelen/x/",
    "https://evil.example/infofrankrijk.com/artikel/", "https://infofrankrijk.com.evil.example/artikel/", "javascript:alert(1)", "", null, undefined]
    .forEach(u => assert.equal(A.isInApp(u), false, String(u)));
  assert.equal(A.isInApp("https://infofrankrijk.com/la-maison/"), true);
});

test("REST-adres: posts, pages, anoniem met de vier velden", () => {
  assert.equal(A.restUrl("x-y"), "https://infofrankrijk.com/wp-json/wp/v2/posts?slug=x-y&_fields=title,content,date,link,yoast_head_json.author");
  assert.match(A.restUrl("x-y", "pages"), /\/wp\/v2\/pages\?slug=x-y&_fields=title,content,date,link,yoast_head_json\.author$/);
});

test("betaalmuur: klassen en tekst met pms- worden herkend, 3PMSF niet", () => {
  assert.equal(A.heeftBetaalmuur('<p>Intro</p><div class="pms-restriction-message">Alleen voor leden</div>'), true);
  assert.equal(A.heeftBetaalmuur("<div class='x pms-restrict-message y'>"), true);
  assert.equal(A.heeftBetaalmuur("<p>[pms-restrict subscription_plans=\"1\"]</p>"), true);
  assert.equal(A.heeftBetaalmuur("<p>Alleen de 3PMSF-markering telt, niet M+S. PMS staat hier voor iets anders.</p>"), false);
  assert.equal(A.heeftBetaalmuur('<div class="mypms-box">'), false);
  assert.equal(A.heeftBetaalmuur(""), false);
});

test("betaalmuur: alleen de inleiding blijft, de rest vervalt", () => {
  const r = A.knipBijMuur('<div class="entry"><p>Inleiding.</p><div class="pms-restriction-message"><p>Wordt lid</p></div><p>Geheim</p></div><p>Ook geheim</p>');
  assert.equal(r.muur, true);
  assert.ok(r.html.includes("Inleiding."));
  assert.ok(!/Geheim|geheim|Wordt lid/.test(r.html));
  const vrij = A.knipBijMuur("<p>Alles vrij</p>");
  assert.deepEqual(vrij, { html: "<p>Alles vrij</p>", muur: false, inlog: false });
});

test("inlogmelding: geen abonnementsmuur, wel afgeknipt en gemeld als inlog", () => {
  const r = A.knipBijMuur('<p>Kop.</p><div class="x"><p>Je moet ingelogd zijn om deze inhoud te bekijken.</p></div>');
  assert.equal(r.inlog, true);
  assert.equal(r.muur, false);
  assert.ok(r.html.includes("Kop.") && !/ingelogd/.test(r.html));
  assert.equal(A.knipBijMuur("<p>Gewoon</p>").inlog, false);
});

test("REST-antwoord: lege lijst of verkeerde vorm geeft null; titel en link blijven bewaard", () => {
  assert.equal(A.leesAntwoord([]), null);
  assert.equal(A.leesAntwoord({}), null);
  assert.equal(A.leesAntwoord([{ content: {} }]), null);
  const a = A.leesAntwoord([{ title: { rendered: "T" }, content: { rendered: "<p>x</p>" }, date: "2026-10-19T19:15:02", link: "https://infofrankrijk.com/t/" }]);
  assert.deepEqual([a.titel, a.html, a.link], ["T", "<p>x</p>", "https://infofrankrijk.com/t/"]);
});

test("haalOp probeert posts en dan pages; geeft een fout bij niets", async () => {
  const aangeroepen = [];
  const mk = (data) => async (u) => { aangeroepen.push(u); return { ok: true, json: async () => data }; };
  const pagina = [{ title: { rendered: "P" }, content: { rendered: "<p>pagina</p>" }, date: "2026-01-02T00:00:00", link: "" }];
  const f = async (u) => { aangeroepen.push(u); return { ok: true, json: async () => (/\/posts\?/.test(u) ? [] : pagina) }; };
  const a = await A.haalOp("een-pagina", { fetch: f });
  assert.equal(a.soort, "pages");
  assert.equal(aangeroepen.length, 2);
  await assert.rejects(A.haalOp("niets", { fetch: mk([]) }));
  await assert.rejects(A.haalOp("stuk", { fetch: async () => ({ ok: false, status: 500 }) }));
});

test("samenvatting en forumtekst", () => {
  const lang = "Dit is een zin die flink doorloopt en daardoor ingekort moet worden. ".repeat(10);
  const k = A.inkorten(lang, 100);
  assert.ok(k.length <= 101 && k.endsWith("…"));
  assert.equal(A.inkorten("kort", 100), "kort");
  const t = A.forumTekst("Titel", "Samenvatting", "https://infofrankrijk.com/t/");
  assert.equal(t, "Titel\n\nSamenvatting\n\nhttps://infofrankrijk.com/t/");
  assert.equal(A.forumTekst("Titel", "", "https://x.nl/"), "Titel\n\nhttps://x.nl/");
  assert.equal(A.datumNl("2026-10-21T09:44:55"), "21 oktober 2026");
  assert.equal(A.datumNl("rommel"), "");
});

test("weekregel van het onderblad", () => {
  const nu = Date.UTC(2026, 9, 23, 12);
  const dag = 24 * 3600 * 1000;
  assert.equal(B.moetOproep({ soort: "uitkomst", laatst: null, nu }), true, "nog nooit getoond");
  assert.equal(B.moetOproep({ soort: "uitkomst", laatst: nu - 2 * dag, nu }), false, "twee dagen geleden");
  assert.equal(B.moetOproep({ soort: "uitkomst", laatst: nu - 6.9 * dag, nu }), false);
  assert.equal(B.moetOproep({ soort: "uitkomst", laatst: nu - 7 * dag, nu }), true, "precies een week");
  assert.equal(B.moetOproep({ soort: "abonneetool", laatst: nu - 8 * dag, nu }), true);
  assert.equal(B.moetOproep({ soort: "abonneetool", laatst: nu - 1 * dag, nu }), false, "de weekregel geldt ook na een abonnee-tool");
  assert.equal(B.moetOproep({ soort: "uitkomst", laatst: nu + 30 * dag, nu }), true, "klok verzet: tijdstempel in de toekomst blokkeert niet");
  assert.equal(B.moetOproep({ soort: "uitkomst", laatst: null, nu, sessieGetoond: true }), false, "hooguit eens per sessie");
  assert.equal(B.moetOproep({ soort: "abonneetool", laatst: null, nu, sessieGetoond: true }), false);
  assert.equal(B.moetOproep({ soort: "iets", laatst: null, nu }), false);
  assert.equal(B.moetOproep({}), false);
});

test("opslag van het onderblad: alleen een tijdstempel, zacht falend", () => {
  const mem = {}; const ok = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = v; } };
  assert.equal(B.leesLaatst(ok), null);
  assert.equal(B.schrijfLaatst(ok, 1234), true);
  assert.equal(B.leesLaatst(ok), 1234);
  assert.equal(mem[B.SLEUTEL], "1234");
  const kapot = { getItem() { throw new Error("x"); }, setItem() { throw new Error("x"); } };
  assert.equal(B.leesLaatst(kapot), null);
  assert.equal(B.schrijfLaatst(kapot, 1), false);
  assert.equal(B.leesLaatst(null), null);
});

test("abonnementslink: één plek in modules.json, terugval in de code", () => {
  assert.equal(cat.abonnement.url, "https://infofrankrijk.com/abonnement/");
  assert.equal(B.abonneeUrl(cat), "https://infofrankrijk.com/abonnement/");
  assert.equal(B.abonneeUrl({ abonnement: { url: "https://voorbeeld.nl/nieuw/" } }), "https://voorbeeld.nl/nieuw/");
  assert.equal(B.abonneeUrl({ abonnement: { url: "javascript:alert(1)" } }), B.ABONNEE_URL);
  assert.equal(B.abonneeUrl({}), B.ABONNEE_URL);
  assert.equal(B.abonneeUrl(undefined), B.ABONNEE_URL);
  assert.ok(!/href="https?:\/\/(www\.)?infofrankrijk\.com\/abonnement\/?"/.test(html), "geen losse abonnementslink in index.html");
});

test("voorbeeldtools komen uit de catalogus (nu leeg: alle prijzen staan voorlopig op gratis)", () => {
  assert.equal(B.voorbeeldTools(cat).length, 0);
  const proef = { modules: [{ naam: "A", prijs: "abonnee", kind: "iframe" }, { naam: "B", prijs: "abonnee", kind: "iframe" }, { naam: "C", prijs: "gratis", kind: "iframe" }] };
  assert.deepEqual(B.voorbeeldTools(proef), ["A", "B"], "de haak blijft werken zodra een module weer abonnee wordt");
  assert.equal(B.toolZin(["A", "B"]), ", zoals het A en B");
  assert.equal(B.toolZin([]), "");
});

test("onderblad: tekst letterlijk uit de opdracht", () => {
  [
    "Fijn dat InfoPoche je helpt",
    "Wat je net gebruikte is gratis. Dat kan, omdat abonnees van Infofrankrijk de bekostiging en instandhouding mogelijk maken.",
    "Met een abonnement help je ook de toekomst van het forum Nederlanders.fr veilig te stellen, de plek waar Nederlanders en Vlamingen in Frankrijk elkaar al jaren verder helpen.",
    "Bekijk het abonnement", "Niet nu", "Je ziet deze vraag hooguit eens per week."
  ].forEach(t => assert.ok(html.includes(t), t));
  assert.ok(html.includes('role="dialog"') && html.includes('aria-label="Sluiten"'));
  assert.ok(!html.includes("Als abonnee lees je bovendien"), "alinea 3 van het onderblad is weg");
  assert.ok(!/tools met het label Abonnee/.test(html), "geen belofte van exclusieve toegang meer in de teksten");
});

test("het vaste abonneeblok draagt dezelfde forumzin", () => {
  assert.ok(html.includes("Met een abonnement help je ook de toekomst van het forum Nederlanders.fr veilig te stellen, de plek waar Nederlanders en Vlamingen in Frankrijk elkaar al jaren verder helpen."));
});

test("index.html: artikelscherm hangt aan openInfoArtikel, nooit openArtikel; forumroute en delen", () => {
  assert.ok(!/openArtikel/.test(html));
  assert.match(html, /openInfoArtikel\(url, opt\)\{\s*\n\s*const L = window\.IfArtikel/);
  assert.ok(html.includes("https://www.nederlanders.fr/profiles/blog/new"));
  assert.ok(html.includes("Tekst gekopieerd. Open Nederlanders.fr, maak een nieuw bericht en plak de tekst."));
  assert.match(html, /navigator\.share/);
  assert.ok(html.includes('src="./artikel-lib.js"') && html.includes('src="./abonnee-lib.js"'));
  assert.ok(!/window\.open\(url, "_blank", "noopener"\); \} catch\(e\)\{\} \}\n\s+openMods/.test(html));
});

// ---- Sanering: heeft een DOM nodig, dus in headless Chromium --------------------------------------
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

test("sanering: geen scripts, stijlen, iframes, on*-attributen of javascript-links", async (t) => {
  const vies = '<p onclick="x()" style="color:red" class="a">Tekst <a href="javascript:alert(1)">fout</a> <a href="/ander-artikel/" onmouseover="y()">goed</a></p>'
    + '<script>alert(1)</script><style>p{display:none}</style><iframe src="https://evil.example/"></iframe><form><input name=x></form>'
    + '<img src="http://onveilig.example/a.png" onerror="z()"><img src="https://infofrankrijk.com/a.png" srcset="b.png 2x" width="9" height="9" onerror="z()">'
    + '<h1>Kop</h1><table><tr><td>cel</td></tr></table><a href="https://nederlanders.fr/x/">buiten</a><a href="https://infofrankrijk.com/abonnement/">abo</a>';
  const uit = await inBrowser(h => { const b = window.IfArtikel.schoon(h); return { html: b.innerHTML, inApp: [...b.querySelectorAll("a[data-art]")].map(a => a.getAttribute("href")) }; }, vies);
  if (!uit) return t.skip("geen headless browser beschikbaar");
  assert.ok(!/<script|<style|<iframe|<form|<input|onclick|onerror|onmouseover|javascript:|srcset|http:\/\/onveilig/i.test(uit.html), uit.html);
  assert.ok(uit.html.includes("Tekst fout"), "de kapotte link blijft als tekst staan");
  assert.ok(uit.html.includes("<h2"), "h1 wordt h2 (de titel staat al in de kop)");
  assert.ok(uit.html.includes("overflow-x:auto"), "tabellen scrollen");
  assert.ok(/line-height:1\.8em/.test(uit.html) && /font:400 16px/.test(uit.html), "lopende tekst 16px met 1.8em");
  assert.deepEqual(uit.inApp, ["https://infofrankrijk.com/ander-artikel/"], "alleen artikellinks openen in de app; nederlanders.fr en de abonnementspagina niet");
  assert.ok(/<a [^>]*href="https:\/\/nederlanders\.fr\/x\/"[^>]*target="_blank"/.test(uit.html) || /<a [^>]*target="_blank"[^>]*href="https:\/\/nederlanders\.fr\/x\/"/.test(uit.html));
});

test("haalOp: een hangend verzoek wijst na de tijdgrens af (herstelronde 2)", async () => {
  let signaal = null;
  const hangend = (url, o) => { signaal = o && o.signal; return new Promise(() => {}); };
  const t0 = Date.now();
  await assert.rejects(A.haalOp("x", { fetch: hangend, timeout: 60 }), /time-out/);
  assert.ok(Date.now() - t0 < 2000);
  assert.ok(signaal && signaal.aborted, "het verzoek wordt ook afgebroken");
});

test("haalOp: standaard tijdgrens 15 s; artikelzoeken en postcodeblad in index.html", () => {
  assert.match(fs.readFileSync(path.join(root, "artikel-lib.js"), "utf8"), /: 15000;/);
  assert.match(html, /zoekArtikelen[\s\S]{0,1800}new AbortController\(\); timer = setTimeout\(\(\) => ctl\.abort\(\), 15000\)/);
  assert.match(html, /if \(t\.blad\) \{\s*try \{\s*history\.replaceState\(\{ifm:1, id:0, key:base[\s\S]{0,200}history\.pushState\(\{ifm:1, id:1, key, base, sheet:true\}/);
  assert.ok(!/<path d="\{\{/.test(html), "geen <path d> met een hole: dat geeft consolefouten bij het parseren");
});

test("sanering: een lege link (alleen een regeleinde) verdwijnt, de inhoud blijft (25-10-2026)", async (t) => {
  const bron = '<p><a href="https://infofrankrijk.com/a/">Een</a><a href="https://infofrankrijk.com/b/"><br /></a><a href="https://infofrankrijk.com/c/">Twee</a> <a href="https://infofrankrijk.com/d/"><img src="https://infofrankrijk.com/x.png"></a></p>';
  const uit = await inBrowser(h => { const b = window.IfArtikel.schoon(h); return { links: [...b.querySelectorAll("a")].map(a => a.textContent || "img"), br: b.querySelectorAll("br").length }; }, bron);
  if (!uit) return t.skip("geen headless browser beschikbaar");
  assert.deepEqual(uit.links, ["Een", "Twee", "img"], "alleen links met tekst of beeld blijven");
  assert.equal(uit.br, 1, "het regeleinde zelf blijft staan");
});

test("artikelknoppen Delen en Op infofrankrijk.com zijn even breed (25-10-2026)", () => {
  assert.match(html, /onClick="\{\{ artDelen \}\}" style="flex:1 1 0;min-width:0;/);
  assert.match(html, /href="\{\{ artSiteUrl \}\}" target="_blank" rel="noopener" style="flex:1 1 0;min-width:0;/);
});

test("kaartjes in een artikel worden tegels in twee kolommen met de app-stijl (subsidie-artikel)", async (t) => {
  const kaart = (titel, tekst, link) => '<div style="border: 1px solid rgba(128,0,0,.18); border-radius: 14px; padding: 14px 16px; margin: 12px 0; background: #fff;"><div style="font-family: Poppins,Arial,sans-serif; color: #800000; font-weight: bold; margin: 0 0 6px 0;">' + titel + '</div><div style="margin: 0 0 10px 0;">' + tekst + '</div><div><a href="https://infofrankrijk.com/x/">' + link + '</a></div></div>';
  const bron = "<h2>De 5 hoofdregelingen</h2><p><!-- x --></p>" + kaart("MaPrimeRénov’", "Subsidie voor renovatiewerken.", "Lees verder: één") + kaart("CEE", "Premies.", "Lees verder: twee") + kaart("Éco-PTZ", "Renteloze lening.", "Lees verder: drie") + "<p>Daarna gewone tekst.</p>" + kaart("Alleen", "Een los kaartje.", "Lees verder: vier");
  const uit = await inBrowser(h => {
    const b = window.IfArtikel.schoon(h);
    const r = b.querySelector("[data-tegels]");
    return { aantal: r ? r.getAttribute("data-tegels") : null, raster: r ? r.getAttribute("style") : "", kolommen: r ? r.children.length : 0,
      laatsteLoopt: r ? r.lastElementChild.getAttribute("style").includes("grid-column:1/-1") : null,
      titel: r ? r.firstElementChild.firstElementChild.getAttribute("style") : "", titelTekst: r ? r.firstElementChild.firstElementChild.textContent : "",
      losse: b.querySelectorAll(":scope > div[style*='border:1px solid rgba(21,24,26,.10)']").length, grid: b.querySelectorAll("[data-tegels]").length,
      oud: /rgba\(128,0,0,\.18\)|font-family: Poppins,Arial/.test(b.innerHTML) };
  }, bron);
  if (!uit) { t.skip("geen headless Chromium"); return; }
  assert.equal(uit.aantal, "3");
  assert.equal(uit.grid, 1, "de drie kaartjes op een rij staan in één raster, het losse kaartje apart");
  assert.match(uit.raster, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.equal(uit.laatsteLoopt, true, "een oneven laatste tegel loopt over beide kolommen");
  assert.equal(uit.titelTekst, "MaPrimeRénov’");
  assert.match(uit.titel, /Poppins/);
  assert.equal(uit.losse, 1, "het losse kaartje krijgt dezelfde tegelstijl buiten een raster");
  assert.equal(uit.oud, false, "de oorspronkelijke opmaak is gewist");
});

test("een opmaaktabel met kaartcellen (waardekwadrant) wordt een raster van vier tegels, de aslabels worden chips", async (t) => {
  const cel = (naam, a, b) => '<td style="background: #fff; border: 3px solid #ecf0f1; padding: 30px; border-radius: 15px; width: 45%; vertical-align: top;"><div style="font-size: 2.5em; text-align: center;">E</div><div style="color: #800000; font-size: 1.5em; font-weight: bold; text-align: center;">' + naam + '</div><p style="margin: 8px 0;">✓ ' + a + '</p><p style="margin: 8px 0;">✓ ' + b + '</p></td>';
  const bron = '<div style="text-align: center;"><span style="background: white; padding: 10px 20px; border-radius: 25px; border: 3px solid #800000; display: inline-block;">⬆ INTERREGIONAAL</span></div>' +
    '<table style="width: 100%;"><tbody><tr><td style="width: 50px; text-align: center;">PARTICULIER ⬅</td>' + cel("SOCIAAL NETWERK", "Hulp aan ouderen", "Praktische hulp") + cel("BELANGEN BEHARTIGING", "Fiscale zaken", "Mutuelle") + '<td>➡ ZAKELIJK</td></tr>' +
    '<tr><td></td>' + cel("GEZELLIGHEID", "Borrels", "Wandeltochten") + cel("BUSINESS NETWERK", "Zakelijke netwerken", "Klusplatform") + '<td></td></tr></tbody></table>';
  const uit = await inBrowser(h => {
    const b = window.IfArtikel.schoon(h);
    const r = b.querySelector("[data-tegels]");
    return { tabel: b.querySelectorAll("table").length, aantal: r ? r.children.length : 0, kolommen: r ? r.getAttribute("style") : "",
      volgorde: r ? [...r.children].map(c => c.children[1] ? c.children[1].textContent : "") : [],
      chip: (b.querySelector("span") || {getAttribute: () => ""}).getAttribute("style"), uitgelijnd: /text-align:center/.test(b.firstElementChild.getAttribute("style") || ""),
      zijlabel: /PARTICULIER|ZAKELIJK/.test(b.textContent) };
  }, bron);
  if (!uit) { t.skip("geen headless Chromium"); return; }
  assert.equal(uit.tabel, 0, "geen kolommentabel meer");
  assert.equal(uit.aantal, 4);
  assert.match(uit.kolommen, /repeat\(2,minmax\(0,1fr\)\)/);
  assert.deepEqual(uit.volgorde, ["SOCIAAL NETWERK", "BELANGEN BEHARTIGING", "GEZELLIGHEID", "BUSINESS NETWERK"], "rij voor rij: links boven, rechts boven, links onder, rechts onder");
  assert.match(uit.chip, /border-radius:999px/);
  assert.equal(uit.uitgelijnd, true);
  assert.equal(uit.zijlabel, false, "de zijlabels van de assen vervallen");
});

test("inhoudsopgave van een reeks wordt een raster van tegels; het huidige deel is geen link (05-11-2026)", async (t) => {
  const bron = '<p>Door Rob</p><h4 style="text-align: justify;">1.   <a href="https://infofrankrijk.com/de-elektrische-installatie/">De Franse elektrische installatie</a>.<br />\n<strong>2.   De elektriciteitstoevoer en de elektriciteitsmeter</strong><br />\n3.   <a href="https://infofrankrijk.com/de-hoofdschakelaar/">De hoofdschakelaar</a><br />\n4.   <a href="https://infofrankrijk.com/de-groepenkast/">De groepenkast</a><br />\n10. <a href="https://infofrankrijk.com/aanbevolen-websites/">Aanbevolen websites en de veranderende NF C 15-100 normen</a>.</h4>\n<hr />\n<h4>Lopende tekst met een <a href="https://infofrankrijk.com/a/">link</a>, nog een <a href="https://infofrankrijk.com/b/">link</a><br />en een <a href="https://infofrankrijk.com/c/">derde</a>.</h4><p>1. <a href="https://infofrankrijk.com/a/">Een</a><br />2. <a href="https://infofrankrijk.com/b/">Twee</a></p>';
  const uit = await inBrowser(h => {
    const b = window.IfArtikel.schoon(h), r = b.querySelectorAll("[data-reeks]");
    const cellen = r[0] ? [...r[0].children] : [];
    return { rasters: r.length, aantal: r[0] ? r[0].getAttribute("data-reeks") : null,
      tags: cellen.map(c => c.tagName), nrs: cellen.map(c => c.children[0].textContent), titels: cellen.map(c => c.children[1].children[0].textContent),
      art: cellen.filter(c => c.getAttribute("data-art") === "1").length, nu: b.querySelectorAll("[data-reeks-nu]").length,
      nuTekst: (b.querySelector("[data-reeks-nu]") || {}).textContent || "", laatste: cellen.length ? cellen[cellen.length - 1].getAttribute("style") : "",
      hr: b.querySelectorAll("hr").length, h4: b.querySelectorAll("h4").length, p: b.querySelectorAll("p").length };
  }, bron);
  if (!uit) return t.skip("geen headless browser beschikbaar");
  assert.equal(uit.rasters, 1, "alleen de genummerde lijst met minstens drie artikellinks wordt een raster");
  assert.equal(uit.aantal, "5");
  assert.deepEqual(uit.tags, ["A", "DIV", "A", "A", "A"]);
  assert.deepEqual(uit.nrs, ["1", "2", "3", "4", "10"]);
  assert.deepEqual(uit.titels, ["De Franse elektrische installatie", "De elektriciteitstoevoer en de elektriciteitsmeter", "De hoofdschakelaar", "De groepenkast", "Aanbevolen websites en de veranderende NF C 15-100 normen"]);
  assert.equal(uit.art, 4, "de vier andere delen openen in de app");
  assert.equal(uit.nu, 1); assert.match(uit.nuTekst, /Je leest dit deel/);
  assert.match(uit.laatste, /grid-column:1\/-1/, "een oneven laatste tegel loopt over beide kolommen");
  assert.equal(uit.hr, 0, "de lijn onder de oude lijst vervalt");
  assert.equal(uit.h4, 1, "een kop met lopende tekst en links blijft een kop");
  assert.equal(uit.p, 2, "een korte genummerde lijst (twee links) blijft tekst");
});

test("auteur: de naam van de site staat onder de titel, een verzamelnaam niet (06-11-2026)", () => {
  const maak = (au) => A.leesAntwoord([{ title: { rendered: "T" }, content: { rendered: "<p>x</p>" }, date: "2017-06-07T22:30:10", link: "https://infofrankrijk.com/t/", yoast_head_json: au === undefined ? undefined : { author: au } }]);
  assert.equal(maak("Rob van der Meulen").auteur, "Rob van der Meulen");
  assert.equal(maak("Redactieteam").auteur, "");
  assert.equal(maak("admin").auteur, "");
  assert.equal(maak(undefined).auteur, "");
  assert.equal(maak(["x"]).auteur, "");
  assert.equal(maak("<b>Rob</b>  van der Meulen").auteur, "Rob van der Meulen");
  assert.equal(A.metaRegel("7 juni 2017", "Rob van der Meulen"), "7 juni 2017 · Rob van der Meulen · Infofrankrijk");
  assert.equal(A.metaRegel("7 juni 2017", ""), "7 juni 2017 · Infofrankrijk");
  assert.equal(A.metaRegel("", ""), "Infofrankrijk");
  assert.match(html, /artMeta: klaar \? window\.IfArtikel\.metaRegel\(a\.datum, a\.auteur\)/);
});

test("een opsomming in een kaartje is compact, niet de ruime lopende tekst (06-11-2026)", async (t) => {
  const bron = '<div style="border:1px solid #e3caca;border-radius:8px;padding:16px 20px;"><div style="font-weight:bold;">Actualisering</div><ul><li>Een punt</li><li>Nog een</li></ul></div><ul><li>Buiten</li></ul>';
  const uit = await inBrowser(h => { const b = window.IfArtikel.schoon(h); return [...b.querySelectorAll("li")].map(l => l.getAttribute("style")); }, bron);
  if (!uit) return t.skip("geen headless browser beschikbaar");
  assert.match(uit[0], /400 14px\/1\.6 Mulish/); assert.match(uit[1], /400 14px\/1\.6 Mulish/);
  assert.match(uit[2], /line-height:1\.8em/, "een lijst buiten een kaartje blijft lopende tekst");
});

test("ankerbalk: een rij #-sprongen (A tot Z) wordt knoppen van 44 px; doelen krijgen data-anker (12-11-2026)", async (t) => {
  const knop = l => `<a style="display:inline-block" href="#sec-${l}">${l}</a><br />`;
  const sec = l => `<h2 id="sec-${l}">${l}</h2><table><tr><td>woord ${l}</td><td>mot</td></tr></table>`;
  const h = `<p>Inleiding met <a href="#sec-B">een losse sprong</a> in tekst.</p><div>${["A","B","C"].map(knop).join("")}<a href="#top">Top</a></div><div id="top"></div>${["A","B","C"].map(sec).join("<div><a href=\"#top\">Terug naar boven</a></div>")}`;
  const uit = await inBrowser(x => {
    const b = window.IfArtikel.schoon(x), balk = b.querySelector("[data-ankerbalk]");
    return { balken: b.querySelectorAll("[data-ankerbalk]").length, knoppen: balk ? [...balk.querySelectorAll("[data-sprong]")].map(k => k.textContent + "|" + k.getAttribute("data-sprong")) : [],
      doelen: [...b.querySelectorAll("h2[data-anker]")].map(d => d.getAttribute("data-anker")), terug: b.querySelectorAll("h2 [data-sprong]").length,
      balkAnker: balk ? balk.getAttribute("data-anker") : "", stijl: balk ? balk.querySelector("button").getAttribute("style") : "", inleiding: b.textContent.includes("Inleiding met een losse sprong in tekst."), top: b.textContent.includes("Terug naar boven") };
  }, h);
  if (!uit) return t.skip("geen headless browser beschikbaar");
  assert.equal(uit.balken, 1);
  assert.deepEqual(uit.knoppen, ["A|sec-A", "B|sec-B", "C|sec-C"], "Top valt weg");
  assert.ok(!uit.top, "losse Terug naar boven-link is weg");
  assert.deepEqual(uit.doelen, ["sec-A", "sec-B", "sec-C"]);
  assert.equal(uit.terug, 3, "elke letter heeft een knop terug naar de rij");
  assert.ok(/min-width:44px;min-height:44px/.test(uit.stijl));
  assert.ok(uit.inleiding, "een alinea met tekst en een losse sprong blijft tekst");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.ok(html.includes('closest("[data-artikel] [data-sprong]")'), "index.html handelt de sprongen af");
});
