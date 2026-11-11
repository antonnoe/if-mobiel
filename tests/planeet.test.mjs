// De planeet "Alles in InfoPoche" (11 november 2026): indeling, volledigheid, geometrie en bedrading.
// Draaien: node --test tests/planeet.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const lees = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const require = createRequire(import.meta.url);
const P = require("../planeet-lib.js");
const Sk = require("../sterrenkaart-lib.js");
const html = lees("index.html"), sw = lees("sw.js"), cat = JSON.parse(lees("modules.json"));
const data = P.leesPlaneet(cat.planeet);
const bouwAlles = o => P.bouw(data, Object.assign({ modules: cat.modules, themas: cat.themas }, o));

test("catalogus: niets valt weg bij het inlezen, zeven manen, geldige verwijzingen", () => {
  assert.equal(data.manen.length, cat.planeet.manen.length);
  assert.deepEqual(data.manen.map(m => m.id), ["op-tijd", "buurt", "ai", "samen", "app", "reken", "lezen"]);
  assert.equal(data.schermen.length, cat.planeet.schermen.length, "elk scherm uit de data is geldig en uniek");
  assert.ok(data.manen.every(m => m.uitleg), "elke maan heeft een uitleg");
  assert.ok(data.manen.some(m => m.id === data.standaard));
  const ids = data.manen.map(m => m.id);
  cat.modules.forEach(m => {
    if (m.maan != null) assert.ok(ids.includes(m.maan), "onbekende maan bij " + m.id);
    if (m.bron != null) assert.ok(["if", "nl", "ng", "cc"].includes(m.bron), "onbekende bron bij " + m.id);
  });
  cat.planeet.schermen.forEach(s => assert.ok(P.BRONNEN[s.bron], "bron bij scherm " + s.id));
});

test("volledigheid: elke zichtbare module en elk thema staat op precies een maan", () => {
  const b = bouwAlles();
  const gezien = {};
  b.manen.forEach(m => m.items.forEach(it => { gezien[it.id] = (gezien[it.id] || 0) + 1; }));
  Object.entries(gezien).forEach(([k, n]) => assert.equal(n, 1, "dubbel op de planeet: " + k));
  cat.modules.filter(m => m.zichtbaar !== false).forEach(m => assert.equal(gezien["module:" + m.id], 1, "module staat nergens op de planeet: " + m.id));
  cat.themas.forEach(t => assert.equal(gezien["thema:" + t.id], 1, "thema staat nergens op de planeet: " + t.id));
  cat.planeet.schermen.forEach(s => assert.equal(gezien["scherm:" + s.id], 1, "scherm staat nergens op de planeet: " + s.id));
  assert.equal(b.totaal, Object.keys(gezien).length, "het totaal wordt geteld, nooit vast");
  assert.equal(b.manen.reduce((n, m) => n + m.aantal, 0), b.totaal);
});

test("een module die niet getoond wordt, staat er niet; een module zonder maan gaat naar het standaard", () => {
  const zonderKal = P.bouw(data, { modules: cat.modules.filter(m => m.id !== "kalender"), themas: cat.themas });
  assert.ok(!zonderKal.manen.flatMap(m => m.items).some(i => i.id === "module:kalender"));
  const uit = P.bouw(data, { modules: cat.modules, themas: cat.themas, zichtbaar: m => m.id !== "moestuin" });
  assert.ok(!uit.manen.flatMap(m => m.items).some(i => i.id === "module:moestuin"));
  const mods = [{ id: "nieuwe", naam: "Nieuwe tool", meta: "x", thema: "geld" }, { id: "nieuwai", naam: "Nieuwe AI", meta: "x", ai: "tool", thema: "geld" }, { id: "gekozen", naam: "Gekozen", maan: "samen", thema: "geld" }, { id: "fout", naam: "Fout", maan: "bestaat-niet", thema: "geld" }];
  const b = P.bouw(data, { modules: mods, themas: [] });
  const waar = id => b.manen.find(m => m.items.some(i => i.id === "module:" + id)).id;
  assert.equal(waar("nieuwe"), "reken");
  assert.equal(waar("nieuwai"), "ai");
  assert.equal(waar("gekozen"), "samen");
  assert.equal(waar("fout"), "reken", "een onbekende maan valt terug op het standaard");
});

test("waar logisch: kalender op tijd, forum en tekoop samen, nedergids in de buurt, dossier in Jouw app, AI-tools bij AI", () => {
  const b = bouwAlles(), waar = id => b.manen.find(m => m.items.some(i => i.id === id)).id;
  assert.equal(waar("module:kalender"), "op-tijd");
  assert.equal(waar("scherm:meldingen"), "op-tijd");
  ["forum", "verenigingen", "tekoop", "vervoershub"].forEach(i => assert.equal(waar("module:" + i), "samen", i));
  ["nedergids", "veiligheid", "controletechnique", "overhedenbuurt"].forEach(i => assert.equal(waar("module:" + i), "buurt", i));
  assert.equal(waar("scherm:gemeente"), "buurt");
  assert.equal(waar("module:dossierfrankrijk"), "app");
  cat.modules.filter(m => m.ai === "tool" && !m.maan).forEach(m => assert.equal(waar("module:" + m.id), "ai", m.id));
  assert.equal(waar("module:cafeclaude"), "ai");
});

test("Rekenen en regelen is per thema gegroepeerd, de themanaam is de groepskop", () => {
  const reken = bouwAlles().manen.find(m => m.id === "reken");
  assert.ok(reken.groepen.length >= 4);
  assert.ok(reken.groepen.every(g => g.titel), "elke groep heeft een kop");
  const namen = cat.themas.map(t => t.naam);
  reken.groepen.forEach(g => assert.ok(namen.includes(g.titel), g.titel));
  const volgorde = reken.groepen.map(g => namen.indexOf(g.titel));
  assert.deepEqual(volgorde, volgorde.slice().sort((a, b) => a - b), "in de volgorde van de thema's");
});

test("Zet op je beginscherm valt weg in een geïnstalleerde app", () => {
  assert.ok(bouwAlles().manen.flatMap(m => m.items).some(i => i.doel.waarde === "installeer"));
  assert.ok(!bouwAlles({ geinstalleerd: true }).manen.flatMap(m => m.items).some(i => i.doel.waarde === "installeer"));
});

test("zichtbare tekst: geen lange streepjes, geen u-vorm, korte regels", () => {
  const b = bouwAlles();
  b.manen.forEach(m => {
    [m.naam, m.uitleg].concat(m.items.map(i => i.titel + " " + i.regel)).forEach(t => {
      assert.ok(!/[–—]/.test(t), "streepje: " + t);
      assert.ok(!/\b(u|uw|uzelf)\b/i.test(t.replace(/[A-Z]\./g, "")), "u-vorm: " + t);
    });
  });
  assert.equal(P.aantalTekst(1), "1 functie");
  assert.equal(P.aantalTekst(6), "6 functies");
  assert.equal(P.totaalTekst(64), "alle 64 functies, op een rij");
});

// ---- Volledigheid ten opzichte van de schermen in index.html -----------------------------------------------------------
// Elk scherm (state.screen) staat op de planeet of heeft hier een reden waarom niet. Komt er een scherm bij in index.html dat
// hier niet staat, dan faalt deze test: beslis dan waar het hoort (planeet.schermen in modules.json) of leg vast waarom niet.
const OP_PLANEET = {
  mod: "scherm:allemodules", gemeente: "scherm:gemeente", hygiene: "scherm:hygiene", meldingen: "scherm:meldingen", infofr: "scherm:infofrankrijk",
  sponsors: "scherm:sponsors", acc: "scherm:profiel", keuze: "scherm:mijnmodules", over: "scherm:overons", dossierdemo: "scherm:dossierdemo",
  // Schermen van een module: de module staat zelf op de planeet.
  gem: "module:forum", kalender: "module:kalender", brief: "module:briefuitleg", nedergids: "module:nedergids", klusarchief: "module:klusforum",
  tekoop: "module:tekoop", vastgoed: "module:vastgoed", zorg: "module:zorg", ruyter: "module:ruyter", energie: "module:energie", linklijst: "module:verenigingsbeheer",
  // Themaschermen: het thema staat bij Lezen en vinden.
  gezondheid: "thema:gezondheid", lamaison: "thema:wonen", ondernemen: "thema:ondernemen", nieuws: "thema:nieuws", thema: "thema:geld"
};
const WEGGELATEN = {
  hub: "het beginscherm, hier komt de lezer vandaan",
  zoek: "het scherm waar de planeet zelf op staat",
  aitools: "overzicht van dezelfde AI-tools die al op de maan Vragen aan AI staan",
  tool: "generiek moduleschermpje (iframe of knop): de modules zelf staan op de planeet",
  piramide: "uitleg met een 3D-model, alleen bereikbaar via Over ons",
  draad: "een forumdraad, onderdeel van het Forum",
  artikel: "een artikel, geen functie maar inhoud"
};
const MENU_OP_PLANEET = { mnProfiel: "scherm:profiel", mnKeuze: "scherm:mijnmodules", mnSponsors: "scherm:sponsors", mnMeldingen: "scherm:meldingen", mnFeedback: "scherm:feedback", mnOver: "scherm:overons", mnPostcode: "scherm:postcode", mnBeginscherm: "scherm:beginscherm" };
const MENU_WEGGELATEN = { groteTekstSchakel: "een schakelaar, geen scherm; hij staat ook in het hamburgermenu zelf en in Profiel" };

test("elk scherm in index.html staat op de planeet of heeft een vastgelegde reden", () => {
  const schermen = new Set();
  for (const m of html.matchAll(/\bscreen\s*(?:===|:)\s*"([a-z]+)"/g)) schermen.add(m[1]);
  const art = html.match(/const SCHERM_ART\s*=\s*"([a-z]+)"/);
  if (art) schermen.add(art[1]);
  assert.ok(schermen.size >= 25, "de schermen zijn gevonden (" + schermen.size + ")");
  const b = bouwAlles(), op = new Set(b.manen.flatMap(m => m.items.map(i => i.id)));
  for (const s of schermen) {
    const bekend = Object.prototype.hasOwnProperty.call(OP_PLANEET, s) || Object.prototype.hasOwnProperty.call(WEGGELATEN, s);
    assert.ok(bekend, "nieuw scherm \"" + s + "\": zet het op de planeet (planeet.schermen in modules.json) of leg in deze test vast waarom niet");
    if (OP_PLANEET[s]) assert.ok(op.has(OP_PLANEET[s]), "scherm " + s + " hoort bij " + OP_PLANEET[s] + ", maar dat staat niet op de planeet");
  }
  Object.keys(OP_PLANEET).concat(Object.keys(WEGGELATEN)).forEach(s => assert.ok(schermen.has(s), "scherm \"" + s + "\" bestaat niet meer in index.html: haal het uit de controlelijst"));
});

test("elk onderdeel van het hamburgermenu staat op de planeet of heeft een vastgelegde reden", () => {
  const start = html.indexOf('id="ifm-menu"') >= 0 ? html.indexOf('id="ifm-menu"') : html.indexOf("mnProfiel");
  const blok = html.slice(Math.max(0, start - 3000), start + 9000);
  const gezien = new Set();
  for (const m of blok.matchAll(/onClick="\{\{ (mn[A-Za-z]+|groteTekstSchakel) \}\}"/g)) gezien.add(m[1]);
  assert.ok(gezien.size >= 8, "menu-onderdelen gevonden: " + [...gezien]);
  const op = new Set(bouwAlles().manen.flatMap(m => m.items.map(i => i.id)));
  for (const h of gezien) {
    assert.ok(MENU_OP_PLANEET[h] || MENU_WEGGELATEN[h], "nieuw menu-onderdeel " + h + ": zet het op de planeet of leg vast waarom niet");
    if (MENU_OP_PLANEET[h]) assert.ok(op.has(MENU_OP_PLANEET[h]), h + " hoort bij " + MENU_OP_PLANEET[h]);
  }
});

test("elk doel van een scherm heeft een open-functie in de app", () => {
  P.DOELEN.forEach(d => assert.match(html, new RegExp('case "' + d + '":'), "plOpen kent " + d));
});

// ---- Geometrie ---------------------------------------------------------------------------------------------------------
const afstand = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
for (const W of [340, 370]) { // veldbreedte op 360 en 390 px
  test("niveau 1 bij veldbreedte " + W + ": geen zon raakt de planeet of een andere zon, niets buiten het veld", () => {
    const sk = Sk.leesData(cat.sterrenkaart);
    for (const schermH of [640, 800, 1000]) {
      const H = P.veldHoogte(schermH), vh = P.zonVlak(H), V = P.VELD, d = V.zonD, ruimte = V.zweef;
      const zon = sk.onderwerpen.map(o => ({ n: o.naam, x: o.x / 100 * W, y: V.zonTop + o.y / 100 * vh }));
      zon.forEach(z => {
        assert.ok(z.x - d / 2 - ruimte >= 0 && z.x + d / 2 + ruimte <= W, "binnen het veld in de breedte: " + z.n + " bij " + W + "x" + schermH);
        assert.ok(z.y - d / 2 - ruimte >= 44, "onder de titel: " + z.n);
      });
      zon.forEach((a, i) => zon.slice(i + 1).forEach(b => assert.ok(afstand(a, b) >= d + ruimte, "zonnen " + a.n + " en " + b.n + " raken elkaar bij " + W + "x" + schermH + " (" + Math.round(afstand(a, b)) + ")")));
      // Planeet: cirkel met middelpunt op planeetD/2 onder zijn bovenkant, de bovenkant ligt planeetZichtbaar boven de onderrand.
      const pm = { x: W / 2, y: H - V.planeetZichtbaar + V.planeetD / 2 }, pr = V.planeetD / 2;
      zon.forEach(z => {
        assert.ok(z.y + d / 2 + ruimte <= H - V.planeetZichtbaar, "zon " + z.n + " ligt boven de planeet");
        assert.ok(afstand(z, pm) >= pr + d / 2 + ruimte + 8, "zon " + z.n + " raakt de planeet");
      });
      assert.ok(V.planeetD <= W, "de planeet past in de breedte");
      // Decoratieve maantjes: binnen het veld, niet op een zon, niet in de planeet.
      P.DECO.forEach(m => {
        const c = { x: m.x / 100 * W, y: H - m.boven - m.d / 2 };
        assert.ok(c.x - m.d / 2 >= 0 && c.x + m.d / 2 <= W && c.y > 0, "maantje binnen het veld");
        assert.ok(afstand(c, pm) >= pr + m.d / 2 + 4, "maantje buiten de planeet");
        zon.forEach(z => assert.ok(afstand(c, z) >= d / 2 + m.d / 2 + ruimte + 4, "maantje raakt zon " + z.n));
      });
    }
  });

  test("niveau 2 bij veldbreedte " + W + ": geen maan buiten het veld of afgesneden, geen overlap, satellieten vrij", () => {
    const M = P.MAAN;
    for (const n of [1, 2, 3, 4, 5, 6, 7]) {
      for (const H of [P.VELD.minHoogte, 800]) {
        const mp = P.maanPosities(n, W, H), pos = mp.posities;
        assert.equal(pos.length, n);
        pos.forEach((p, i) => {
          const extra = M.d / 2 + M.zweef;
          assert.ok(Math.abs(p.x) + extra <= W / 2 - 4, "maan " + i + " van " + n + " valt buiten de breedte bij " + W);
          assert.ok(p.y - extra >= -H / 2 + 56, "maan " + i + " van " + n + " raakt de terugknop (boven)");
          assert.ok(p.y + extra <= H / 2 - 36, "maan " + i + " van " + n + " valt onder het veld of op de hinttekst");
          assert.ok(afstand(p, { x: 0, y: 0 }) >= M.planeetD / 2 + M.d / 2 + 6, "maan " + i + " raakt de planeet");
          pos.slice(i + 1).forEach(q => assert.ok(afstand(p, q) >= M.d + 2 * M.zweef, "manen raken elkaar (n=" + n + ", " + Math.round(afstand(p, q)) + ")"));
        });
        const sat = P.satellieten(mp, 9);
        if (n === 7) assert.ok(sat.length >= 6, "genoeg gouden stipjes");
        sat.forEach(s => {
          assert.ok(Math.abs(s.x) + s.d / 2 <= W / 2 - 4, "satelliet binnen het veld");
          assert.ok(afstand(s, { x: 0, y: 0 }) >= M.planeetD / 2 + s.d / 2 + 4, "satelliet buiten de planeet");
          pos.forEach(p => assert.ok(afstand(s, p) >= M.d / 2 + M.zweef + s.d / 2 + 4, "satelliet onder een maan (n=" + n + ")"));
        });
      }
    }
  });
}

// ---- Bedrading ---------------------------------------------------------------------------------------------------------
test("bedrading: planeet is een echte knop, eigen sub-staat, terugstap en focusrand komen uit het bestaande patroon", () => {
  assert.match(html, /<button data-planeet-groot="1" onClick="\{\{ plOpen \}\}"/);
  assert.match(html, /<button data-maan="1" onClick="\{\{ p\.open \}\}"/);
  assert.match(html, /<button data-functie="1" onClick="\{\{ r\.open \}\}"/);
  assert.match(html, /<a data-functie="1" href="\{\{ r\.href \}\}" target="_blank" rel="noopener"/);
  assert.match(html, /\[data-sterrenkaart\] button:focus-visible/, "focusrand geldt voor de nieuwe knoppen");
  assert.match(html, /st\.skOnd === "planeet"/);
  // De pijl en het gebaar gaan een stap terug via de bestaande regels voor skVraag en skOnd.
  assert.match(html, /if \(st\.screen === "zoek" && st\.skVraag\) \{ this\.setState\(\{skVraag:""\}\)/);
  assert.match(html, /if \(st\.screen === "zoek" && st\.skOnd\) \{ this\.setState\(\{skOnd:""\}\)/);
  // Geschiedenisregel per niveau: skOnd en skVraag zitten in histToestand en navKey.
  const Nv = require("../nav-lib.js");
  const a = Nv.navKey({ screen: "zoek", skOnd: "planeet" }), b = Nv.navKey({ screen: "zoek", skOnd: "planeet", skVraag: "buurt" }), c = Nv.navKey({ screen: "zoek" });
  assert.notEqual(a, b); assert.notEqual(a, c);
  assert.equal(Nv.isTop({ screen: "zoek", skOnd: "planeet" }), false);
  assert.match(html, /skOnd: st\.screen === "zoek" && st\.skOnd \? String\(st\.skOnd\) : ""/);
});

test("bedrading: Forum, Profiel en Alle modules gaan met terug naar dezelfde maan (plVan)", () => {
  assert.match(html, /if \(st\.plVan && \/\^\(gem\|acc\|mod\)\$\/\.test\(st\.screen\)\) \{ this\.setState\(\{screen:"zoek", plVan:false/);
  assert.match(html, /menuNaar\(update\)\{ this\.setState\(\{menu:false, q:"", tool:null, plVan:false, \.\.\.update\}\); \}/);
});

test("bedrading: bij reduced motion beweegt niets (bestaande regel voor de sterrenkaart), maantjes zijn aria-hidden", () => {
  assert.match(html, /@media \(prefers-reduced-motion:reduce\)\{\[data-sterrenkaart\],\[data-sterrenkaart\] \*\{animation:none!important/);
  assert.match(html, /<sc-for list="\{\{ plDeco \}\}" as="d" hint-placeholder-count="4"><span aria-hidden="true"/);
  assert.match(html, /<sc-for list="\{\{ plSat \}\}" as="s" hint-placeholder-count="8"><span aria-hidden="true"/);
});

test("bedrading: service worker kent de lib en heeft een nieuwe versie", () => {
  assert.match(sw, /"\.\/planeet-lib\.js"/);
  const v = (sw.match(/const VERSIE = "(\d{4})-(\d{2})-(\d{2})-(\d+)"/) || []).slice(1).map(Number);
  assert.equal(v.length, 4);
  assert.ok(v[0] * 1e7 + v[1] * 1e5 + v[2] * 1e3 + v[3] >= 2026 * 1e7 + 11 * 1e5 + 11 * 1e3 + 8, 'VERSIE moet minstens 2026-11-11-8 zijn');
  assert.match(html, /<script src="\.\/planeet-lib\.js"><\/script>/);
});
