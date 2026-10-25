// Ronde 25-10-2026: tabvolgorde, hamburgermenu, namen. Draaien: node --test tests/ronde6.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const req = createRequire(import.meta.url);
const L = req("../hub-lib.js"), N = req("../nav-lib.js");
const lees = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const cat = JSON.parse(lees("modules.json")), html = lees("index.html");

test("tabvolgorde: Home, Zoeken, Modules, Forum, Nieuws; Profiel zit niet in de balk", () => {
  assert.deepEqual(L.TABS.map(t => t.label), ["Home", "Zoeken", "Modules", "Forum", "Nieuws"]);
  assert.deepEqual(L.TABS.map(t => t.id), ["hub", "zoek", "mod", "gem", "nieuws"]);
  assert.equal(L.tabVan("mod"), "mod"); assert.equal(L.tabVan("keuze"), "mod");
  assert.equal(L.tabVan("acc"), ""); assert.equal(L.tabVan("over"), "");
});

test("Alle modules is een hoofdscherm met eigen route", () => {
  assert.deepEqual(N.parseHash("#/modules"), { soort: "scherm", scherm: "mod" });
  assert.equal(N.bouwHash({ screen: "mod" }), "#/modules");
  assert.ok(N.isTop({ screen: "mod" }));
  assert.ok(!/SHOWBACK = \/[^/]*\|mod\|/.test(html), "mod heeft geen terugknop meer");
});

test("kopbalk: hamburgerknop 46 px, aria, geen badge GRATIS, logo", () => {
  assert.match(html, /id="ifm-menuknop"[^>]*aria-label="Menu"[^>]*aria-expanded="\{\{ menuOpen \}\}"/);
  assert.match(html, /id="ifm-menuknop"[^>]*width:46px;height:46px/);
  assert.match(html, /kopBadge: \(st\.screen === "dossierdemo" \|\| locked\)/);
  assert.ok(html.includes("background:#0E1A2E") && html.includes("./icons/logo-goud.svg"));
  assert.ok(!html.includes(">FR</div>"));
  assert.ok(html.includes("Kennis en ervaring dans la poche"));
  assert.ok(!/berichten niet bijgewerkt|geen postcode ingesteld/.test(html.slice(html.indexOf("const subs ="), html.indexOf("const subs =") + 900)));
});

test("menu-items in volgorde en de sluituitleg", () => {
  const a = html.indexOf('data-menu="1"'), z = html.indexOf("recente apps.") + 20;
  const stuk = html.slice(a, z);
  const volg = ["mnProfiel", "mnKeuze", "mnOver", "groteTekstSchakel", "mnPostcode", "mnBeginscherm"].map(k => stuk.indexOf("{{ " + k + " }}"));
  assert.ok(volg.every(i => i > 0) && volg.every((v, i) => i === 0 || v > volg[i - 1]), String(volg));
  assert.ok(stuk.includes("iPhone: tik op de deelknop, dan Zet op beginscherm.") && stuk.includes("Android: tik op Installeren."));
  assert.ok(stuk.includes("App sluiten: iPhone, veeg omhoog vanaf de onderkant. Android, tik op Terug of op recente apps."));
  assert.ok(stuk.includes("min-height:56px"));
});

test("Klussen in Frankrijk: geen KIF of oude naam in zichtbare velden", () => {
  const k = cat.modules.find(m => m.id === "klussen");
  assert.equal(k.naam, "Klussen in Frankrijk");
  assert.ok(!k.kort || k.kort === "Klussen");
  const zichtbaar = ["naam", "meta", "over", "kort"];
  cat.modules.forEach(m => zichtbaar.forEach(v => assert.ok(!/\bKIF\b|Klussen & verbouwen/.test(m[v] || ""), m.id + "." + v)));
  assert.ok(!/Klussen & verbouwen/.test(html));
});

test("Mijn lijstjes: module na Klussen, zelfde vorm", () => {
  const ids = cat.modules.map(m => m.id), i = ids.indexOf("klussen");
  assert.equal(ids[i + 1], "lijstjes");
  const m = cat.modules[i + 1], k = cat.modules[i];
  assert.equal(m.naam, "Mijn lijstjes"); assert.equal(m.groep, "wonen"); assert.equal(m.thema, "wonen");
  assert.equal(m.url, "https://infofrankrijk.com/klussen/lijstjes/"); assert.equal(m.weergave, "volledig");
  assert.equal(m.kind, "iframe"); assert.equal(m.prijs, "gratis"); assert.equal(m.schil, k.schil);
  assert.ok(!("standaard" in m) || m.standaard !== "uit");
});

test("geen tekst kleiner dan 11,5 px in de schil", () => {
  const re = /font(?:-size)?:\s*(?:italic\s+)?(?:\d{3}\s+)?(\d+(?:\.\d+)?)px/g;
  for (const f of ["index.html", "artikel-lib.js", "landing-lib.js", "abonnee-lib.js", "nieuws-lib.js", "lamaison-lib.js", "ondernemen-lib.js"]) {
    let m; const bron = lees(f);
    while ((m = re.exec(bron))) assert.ok(parseFloat(m[1]) >= 11.5, f + ": " + m[0]);
  }
});
