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
  assert.equal(A.restUrl("x-y"), "https://infofrankrijk.com/wp-json/wp/v2/posts?slug=x-y&_fields=title,content,date,link");
  assert.match(A.restUrl("x-y", "pages"), /\/wp\/v2\/pages\?slug=x-y&_fields=title,content,date,link$/);
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
  assert.deepEqual(vrij, { html: "<p>Alles vrij</p>", muur: false });
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

test("voorbeeldtools komen uit de catalogus", () => {
  const namen = B.voorbeeldTools(cat);
  assert.equal(namen.length, 2);
  namen.forEach(n => assert.ok(cat.modules.some(m => m.naam === n && m.prijs === "abonnee")));
  assert.equal(B.toolZin(["A", "B"]), ", zoals het A en B");
  assert.equal(B.toolZin([]), "");
});

test("onderblad: tekst letterlijk uit de opdracht", () => {
  [
    "Fijn dat Infopoche u helpt",
    "Wat u net gebruikte is gratis. Dat kan, omdat abonnees van Infofrankrijk de bekostiging en instandhouding mogelijk maken.",
    "Met een abonnement helpt u ook de toekomst van het forum Nederlanders.fr veilig te stellen, de plek waar Nederlanders en Vlamingen in Frankrijk elkaar al jaren verder helpen.",
    "Als abonnee leest u bovendien alle artikelen en dossiers en gebruikt u de tools met het label Abonnee.",
    "Bekijk het abonnement", "Niet nu", "U ziet deze vraag hooguit eens per week."
  ].forEach(t => assert.ok(html.includes(t), t));
  assert.ok(html.includes('role="dialog"') && html.includes('aria-label="Sluiten"'));
});

test("het vaste abonneeblok draagt dezelfde forumzin", () => {
  assert.ok(html.includes("Met een abonnement helpt u ook de toekomst van het forum Nederlanders.fr veilig te stellen, de plek waar Nederlanders en Vlamingen in Frankrijk elkaar al jaren verder helpen."));
});

test("index.html: artikelscherm hangt aan openInfoArtikel, nooit openArtikel; forumroute en delen", () => {
  assert.ok(!/openArtikel/.test(html));
  assert.match(html, /openInfoArtikel\(url\)\{\s*\n\s*const L = window\.IfArtikel/);
  assert.ok(html.includes("https://www.nederlanders.fr/profiles/blog/new"));
  assert.ok(html.includes("Tekst gekopieerd, plak hem in het bericht"));
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
