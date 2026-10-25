// Hub: begroeting, themakleuren (contrast WCAG AA), vijf tabs, regiokaart. Geen netwerk.
// Draaien: node --test tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const L = createRequire(import.meta.url)("../hub-lib.js");
const lees = f => fs.readFileSync(path.join(root, f), "utf8");
const cat = JSON.parse(lees("modules.json"));
const html = lees("index.html");

test("begroeting op de grenzen", () => {
  const b = (u, m) => L.begroeting(new Date(2026, 9, 22, u, m));
  assert.equal(b(4, 59), "Goedenavond");
  assert.equal(b(5, 0), "Goedemorgen");
  assert.equal(b(11, 59), "Goedemorgen");
  assert.equal(b(12, 0), "Goedemiddag");
  assert.equal(b(17, 59), "Goedemiddag");
  assert.equal(b(18, 0), "Goedenavond");
  assert.equal(b(0, 0), "Goedenavond");
});

test("contrastberekening klopt", () => {
  assert.ok(Math.abs(L.contrast("#000000", "#ffffff") - 21) < 0.01);
  assert.ok(Math.abs(L.contrast("#777777", "#ffffff") - 4.48) < 0.05);
});

test("negen themakleuren in modules.json, contrast minstens AA", () => {
  assert.equal(cat.themas.length, 9);
  const kaart = "#FFFFFF", pagina = "#F4F1F0", tekst = "#15181A";
  cat.themas.forEach(t => {
    assert.match(t.kleur || "", /^#[0-9a-fA-F]{6}$/, "kleur ontbreekt bij " + t.id);
    assert.match(t.tint || "", /^#[0-9a-fA-F]{6}$/, "tint ontbreekt bij " + t.id);
    const k = L.themaKleur(t);
    assert.equal(k.kleur, t.kleur);
    assert.ok(L.contrast(k.kleur, k.tint) >= 3, "icoon tegen cirkel < 3:1 bij " + t.id + ": " + L.contrast(k.kleur, k.tint));
    assert.ok(L.contrast(k.kleur, pagina) >= 4.5, "accent tegen pagina < 4.5:1 bij " + t.id);
    assert.ok(L.contrast(tekst, kaart) >= 4.5, "themanaam tegen kaart");
    assert.ok(L.contrast(tekst, k.tint) >= 4.5);
  });
  assert.equal(new Set(cat.themas.map(t => t.kleur.toLowerCase())).size, 9, "kleuren moeten verschillen");
});

test("themakleur-terugval in de code bij ontbrekend veld", () => {
  Object.keys(L.THEMA_KLEUREN).forEach(id => {
    const k = L.themaKleur({ id });
    assert.ok(L.contrast(k.kleur, k.tint) >= 3 && L.contrast(k.kleur, "#F4F1F0") >= 4.5, id);
  });
  assert.deepEqual(L.themaKleur({ id: "onbekend", kleur: "rood" }), { kleur: "#800000", tint: "#F3E0E0" });
});

test("vijf tabs met de juiste labels, ook in de app", () => {
  assert.deepEqual(L.TABS.map(t => t.label), ["Home", "Zoeken", "Modules", "Forum", "Nieuws"]);
  const bron = lees("hub-lib.js");
  ["Home", "Zoeken", "Modules", "Forum", "Nieuws"].forEach(l => assert.ok(bron.includes('label: "' + l + '"')));
  L.TABS.forEach(t => assert.ok(new RegExp("\\n  " + t.icon + ":\\s+'<svg").test(html), "icoon " + t.icon + " ontbreekt in ICONS"));
  assert.ok(html.includes("repeat(5,1fr)") && html.includes("HubLib.TABS.map"));
});

test("elk scherm hoort bij een tab", () => {
  const verwacht = { hub: "hub", thema: "hub", lamaison: "hub", gezondheid: "hub", dossierdemo: "hub", tool: "mod", regio: "hub", aitools: "hub",
    zoek: "zoek", gem: "gem", draad: "gem", nieuws: "nieuws", acc: "", mod: "mod", keuze: "mod", over: "" };
  Object.entries(verwacht).forEach(([s, t]) => assert.equal(L.tabVan(s), t, s));
  assert.ok(L.TABS.some(t => t.id === L.tabVan("onbekend")));
  assert.ok(!L.TABS.some(t => t.id === "acc"), "Profiel staat niet meer in de tabbalk");
});

test("regiokaart: label, departement, plaatsnaam", () => {
  assert.equal(L.regioLabel("", ""), "Stel uw postcode in");
  assert.equal(L.regioLabel(null, "Nice"), "Stel uw postcode in");
  assert.equal(L.regioLabel("123", "Nice"), "Stel uw postcode in");
  assert.equal(L.regioLabel("06000", "Nice"), "Voor uw regio: 06000 Nice");
  assert.equal(L.regioLabel("34360", ""), "Voor uw regio: 34360");
  assert.equal(L.departementCode("34360"), "34");
  assert.equal(L.departementCode("97100"), "971");
  assert.equal(L.departementCode("abc"), "");
  assert.equal(L.plaatsUitApi([{ nom: "Nice", codeDepartement: "06" }]), "Nice");
  assert.equal(L.plaatsUitApi([{ nom: "Klein", population: 10 }, { nom: "Groot", population: 500 }]), "Groot");
  assert.equal(L.plaatsUitApi([]), "");
  assert.equal(L.plaatsUitApi(null), "");
  assert.equal(L.plaatsUitApi({ fout: 1 }), "");
  assert.equal(L.plaatsUitOpslag(JSON.stringify({ postcode: "06000", plaats: "Nice" }), "06000"), "Nice");
  assert.equal(L.plaatsUitOpslag(JSON.stringify({ postcode: "06000", plaats: "Nice" }), "34360"), "");
  assert.equal(L.plaatsUitOpslag("kapot", "06000"), "");
  assert.match(L.plaatsUrl("34360"), /geo\.api\.gouv\.fr\/communes\?codePostal=34360/);
});

test("koppelvlakken aanwezig in de app", () => {
  assert.ok(html.includes("<!-- ============ AI-TOOLS (modules.json"));  // het stub-blok is door het echte scherm vervangen
  assert.ok(html.includes("openAiTools()") && html.includes('screen:"aitools"'));
  assert.ok(html.includes('screen:"regio"'));
  assert.ok(html.includes('<script src="./hub-lib.js"></script>'));
  assert.ok(!html.includes("tabVariant"));
});
