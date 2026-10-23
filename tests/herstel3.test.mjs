// Herstelronde na bouwronde 2 (23-10-2026): teksten zonder exclusiviteit, spoedknoppen, onderblad, tabs, toolpagina, zoekvolgorde.
// Draaien: node --test tests/herstel3.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const A = require(path.join(root, "artikel-lib.js"));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const cat = JSON.parse(fs.readFileSync(path.join(root, "modules.json"), "utf8"));
const mod = id => cat.modules.find(m => m.id === id);

test("teksten beloven geen exclusiviteit voor abonnees", () => {
  ["de rest bij het abonnement", "alleen de uitkomst hoort bij het abonnement", "of om betaalde modules te gebruiken", "Wat achter het abonnement zit",
    "Wat u hier zoekt vindt u wél via het zoekveld"].forEach(z => assert.ok(!html.includes(z), z));
  assert.ok(html.includes("Alle onderdelen zijn gratis te gebruiken."));
  assert.ok(html.includes("Aanmelden is alleen nodig om te reageren op de site."));
  assert.ok(!/voor abonnees/i.test(JSON.stringify(cat.modules.map(m => m.ai_uitleg || ""))));
});

test("spoedblok: Bel 15 en Bel 112, minimaal 48 px hoog", () => {
  assert.deepEqual(cat.gezondheid.spoed.knoppen.map(k => k.tel), ["15", "112"]);
  assert.match(html, /href="\{\{ k\.href \}\}" style="flex:1;[^"]*min-height:48px/);
});

test("onderblad: niet na het einde van een artikel", () => {
  assert.ok(!/st\.screen === "artikel" && st\.artGelezen[^\n]*return "uitkomst"/.test(html));
});

test("forumblok onder een artikel: één korte regel", () => {
  assert.ok(html.includes(">Bespreek dit op het forum Nederlanders.fr</button>"));
  assert.ok(!html.includes("Ervaring met dit onderwerp?"));
  assert.ok(!html.includes("worden gekopieerd, zodat u ze in een nieuw bericht kunt plakken. Daarvoor"));
});

test("modules: correspondentie en financieel kompas volledig in de app", () => {
  assert.equal(mod("correspondentie").url, "https://briefhulp-fr.vercel.app");
  assert.equal(mod("correspondentie").weergave, "volledig");
  assert.equal(mod("kompas").weergave, "volledig");
});

test("zoeken: modules, dan artikelen, dan zinnen en woorden", () => {
  const i1 = html.indexOf('value="{{ hasResults }}"'), i2 = html.indexOf('value="{{ zaToon }}"'), i3 = html.indexOf('value="{{ hasResultsTaal }}"');
  assert.ok(i1 > 0 && i1 < i2 && i2 < i3);
});

test("gezondheid: het zorglandschap is gemarkeerd als tool", () => {
  const a = cat.gezondheid.onderwerpen.flatMap(o => o.artikelen || []).find(x => /het-zorglandschap/.test(x.url));
  assert.equal(a.soort, "tool");
});

test("divi: [et_pb_tab title] wordt een kop", () => {
  const u = A.zonderDivi('[et_pb_tab title=&#8221;Zorg &#038; Mutuelle&#8221; _builder_version=&#8221;4&#8243;]<p>Inhoud</p>[/et_pb_tab]');
  assert.match(u, /^<h3>Zorg &#038; Mutuelle<\/h3><p>Inhoud<\/p>$/);
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

test("tabs: radiotabs en Divi-tabs worden koppen met de inhoud eronder", async t => {
  const radio = '<div id="w"><p>Intro</p></p><div class="fr-ins-tabs">  <input type="radio" name="fr_tabs" id="tab-home" checked><label for="tab-home">Woning &#038; Weer</label>'
    + '<input type="radio" name="fr_tabs" id="tab-zorg"><label for="tab-zorg">Zorg &#038; Mutuelle</label>'
    + '</p><div id="content-home" class="fr-ins-tab-content"><h2>Een</h2><p>Tekst woning</p></div><div id="content-zorg" class="fr-ins-tab-content"><p>Tekst zorg</p></div></div></div>';
  const divi = '<div class="et_pb_tabs"><ul class="et_pb_tabs_controls"><li><a>Tab A</a></li><li><a>Tab B</a></li></ul><div class="et_pb_all_tabs"><div class="et_pb_tab"><p>Inhoud A</p></div><div class="et_pb_tab"><p>Inhoud B</p></div></div></div>';
  const uit = await inBrowser(([a, b]) => {
    const r = (h) => { const x = window.IfArtikel.schoon(h); return { koppen: [...x.querySelectorAll("h3")].map(e => e.textContent), tekst: x.textContent.replace(/\s+/g, " "), input: !!x.querySelector("input"), label: !!x.querySelector("label") }; };
    return [r(a), r(b)];
  }, [radio, divi]);
  if (!uit) return t.skip("geen headless browser beschikbaar");
  assert.deepEqual(uit[0].koppen, ["Woning & Weer", "Zorg & Mutuelle"]);
  assert.ok(uit[0].tekst.indexOf("Woning & Weer") < uit[0].tekst.indexOf("Tekst woning") && uit[0].tekst.indexOf("Tekst woning") < uit[0].tekst.indexOf("Zorg & Mutuelle") && uit[0].tekst.indexOf("Zorg & Mutuelle") < uit[0].tekst.indexOf("Tekst zorg"));
  assert.ok(!uit[0].input && !uit[0].label);
  assert.deepEqual(uit[1].koppen, ["Tab A", "Tab B"]);
});

test("toolpagina: artikel dat vrijwel alleen een toolkaart is toont de kaart bovenaan met korte regel", async t => {
  const h = '<div style="position:relative"><iframe src="https://antonnoe.github.io/zorglexicon-frankrijk/"><br /></iframe></div>';
  const uit = await inBrowser(([x, mods]) => { const b = window.IfArtikel.schoon(x, { modules: mods }); return { eerste: b.firstChild.textContent, regel: !!b.querySelector("[data-toolregel]"), kaart: !!b.querySelector("[data-toolkaart]") }; }, [h, cat.modules]);
  if (!uit) return t.skip("geen headless browser beschikbaar");
  assert.equal(uit.eerste, "Dit onderdeel is een interactieve tool.");
  assert.ok(uit.regel && uit.kaart);
});
