// Ronde 3 (17-11-2026): één startpagina zonder standkeuze (B1, B2, B3), "Bij jou" op het zoekscherm (B4).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const lees = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const html = lees("index.html");
const cat = JSON.parse(lees("modules.json"));
const H = require("../hub-lib.js");
const B = require("../bijjou-lib.js");

test("B1: geen standkeuze meer; ifm_stand wordt nergens gelezen of geschreven", () => {
  assert.match(html, /state = \{ screen:"hub",/);
  for (const w of ["ifm_stand", "standkeuze", "isStandkeuze", "kiesStand", "standEenvoudig", "standCompleet", "Stand van InfoPoche", "Te veel?", "eenvoudigSnel"])
    assert.ok(!html.includes(w), w + " is weg");
});

test("B2: volgorde van de startpagina", () => {
  const i = s => { const n = html.indexOf(s); assert.ok(n > 0, s); return n; };
  const rij = [i("{{ begroetingTekst }}"), i(">Waar kunnen we je mee helpen?</h2>"), i('id="hubq"'), i('data-airegel="1"'), i('list="{{ hubTegels }}"'),
    i(">Onze platforms<"), i('list="{{ hubPlatforms }}"'), i('data-vandaag="1"'), i('data-podium="1"'), i('data-abonneeblok="1"'), i(">Meer<"),
    i('data-hubextra="dossier"'), i('data-hubextra="aitools"'), i("{{ hubFavs }}"), i("{{ hubNood }}")];
  assert.deepEqual(rij, rij.slice().sort((a, b) => a - b));
  assert.ok(!html.includes(">Onze vier<"), "geen tiende tegel of Onze vier meer");
  assert.equal((html.match(/hubTegels/g) || []).length >= 2, true);
});

test("B2: vraagveld is een echt veld, 2px bordeaux, juiste placeholder, navigeert nooit per toets", () => {
  const j = html.indexOf('data-hubzoek="1"');
  const blok = html.slice(j, j + 900);
  assert.match(blok, /border:2px solid #800000/);
  assert.match(blok, /placeholder="Typ je vraag in je eigen woorden"/);
  const tag = html.slice(html.indexOf('<input id="hubq"'), html.indexOf('<input id="hubq"') + 500).match(/<input[^>]*>/)[0];
  assert.ok(!/onFocus|onBlur/.test(tag));
  assert.match(html, /onHubQ: e => \{ this\.setState\(\{q:e\.target\.value\}\); \},/);
  assert.match(html, /onHubQEnter: e => \{ if \(e\.key !== "Enter"\) return; this\.hubZoekGa\(e\.target\.value\); \},/);
  assert.ok(!/_hubQT/.test(html));
  assert.ok(!/setTimeout\([^\n]*this\.go\("zoek"/.test(html));
  assert.ok(html.includes("{{ aiRegelVooraf }}<b"));
  assert.ok(html.includes("{{ aiRegelVet }}</b>"));
});

test("B2: begroeting met postcode en plaats", () => {
  const d = new Date(2026, 10, 17, 14, 0, 0);
  assert.equal(H.begroetingMetPlaats(d, "62170", "Montreuil-sur-Mer"), "Goedemiddag · 62170 Montreuil-sur-Mer");
  assert.equal(H.begroetingMetPlaats(d, "62170", ""), "Goedemiddag · 62170");
  assert.equal(H.begroetingMetPlaats(d, null, "x"), "Goedemiddag");
  assert.equal(H.begroetingMetPlaats(d, "123", "x"), "Goedemiddag");
});

test("B2: onze platforms in de afgesproken volgorde, Nedergids als link met postcode", () => {
  const p = H.platforms(cat.startpagina, "62170");
  assert.deepEqual(p.map(x => x.label), ["Infofrankrijk", "Nederlanders.fr", "Nedergids", "Café Claude", "Kalender", "Mijn gemeente"]);
  assert.equal(p.find(x => x.id === "nedergids").href, "https://nedergids-v2.vercel.app/zoek?postcode=62170");
  assert.equal(H.platforms(cat.startpagina, null).find(x => x.id === "nedergids").href, "https://nedergids-v2.vercel.app/");
  assert.equal(H.platforms(null, null).length, 6);
  assert.equal(p.filter(x => x.extern).length, 1);
  assert.match(html, /infofrankrijk: \(\) => this\.go\("infofr"\)/);
  assert.match(html, /nlfr: \(\) => this\.go\("gem"\)/);
  assert.match(html, /cafeclaude: \(\) => this\.route\(this\.vindModule\("cafeclaude"\)\)/);
  assert.match(html, /kalender: \(\) => this\.go\("kalender"\)/);
  assert.match(html, /gemeente: \(\) => this\.openRegio\(\)/);
  assert.ok(html.includes("min-height:44px;padding:0 16px"));
});

test("B2: blok Word abonnee, één regel uit de data, knop naar abonneeUrl", () => {
  assert.equal(H.aboRegel(cat.startpagina), "Kort antwoord met AI · Dossier Frankrijk · kalender per maand");
  const j = html.indexOf('data-abonneeblok="1"'), blok = html.slice(j, j + 1200);
  assert.match(blok, /border:1\.5px solid #800000/);
  assert.ok(blok.includes(">Word abonnee<") && blok.includes("Je steunt er ook het netwerk mee.") && blok.includes("Bekijk het abonnement") && blok.includes("{{ abonneeUrl }}"));
});

test("B3: kalender Maand blijft open, met label abonnee; geen nieuwe belofte (geen meerdere postcodes)", () => {
  assert.ok(html.includes('data-abonnee-label="1"'));
  assert.match(html, /kalNaarMaand: \(\) => this\.setState\(\{kalWeergave:"maand"\}\)/);
  assert.ok(!/meerdere postcodes|meer dan één postcode/i.test(html));
});

test("B5: geen lange streepjes in de nieuwe teksten", () => {
  for (const t of ["Waar kunnen we je mee helpen?", "Onze platforms", "Word abonnee"]) { const i = html.indexOf(t); assert.ok(i > 0); assert.ok(!/[–—]/.test(html.slice(i, i + 400)), t); }
  assert.ok(!/[–—]/.test(JSON.stringify(cat.bijJou) + JSON.stringify(cat.startpagina)));
});

// ---- B4: Bij jou ----
test("bijJou: normaliseren en woordgrens", () => {
  assert.equal(B.normaliseer("  Médecin Généraliste! "), "medecin generaliste");
  const t = v => (B.vindOnderwerp(v, cat.bijJou) || {}).anker || null;
  assert.equal(t("bouwvergunning"), "overheden");
  assert.deepEqual(B.vindOnderwerp("Bouwvergunning aanvragen", cat.bijJou).overheid, ["mairie"]);
  assert.deepEqual(B.vindOnderwerp("Déclaration préalable", cat.bijJou).overheid, ["mairie"]);
  assert.equal(t("huisarts"), "zorg");
  assert.equal(t("huisartsen in de buurt"), "zorg");
  assert.equal(t("urgences"), "spoed");
  assert.deepEqual(B.vindOnderwerp("gendarmerie", cat.bijJou).overheid, ["gendarmerie", "commissariat_police", "police_municipale"]);
  assert.deepEqual(B.vindOnderwerp("CPAM", cat.bijJou).overheid, ["cpam"]);
  assert.equal(t("EHPAD"), "ehpad");
  assert.equal(t("verpleeghuis"), "ehpad");
  assert.equal(t("restaurant"), "hygiene");
  assert.equal(t("vereniging"), "verenigingen");
  assert.equal(t("club"), "verenigingen");
  assert.deepEqual(B.vindOnderwerp("France services", cat.bijJou).overheid, ["france_services"]);
  assert.equal(t("impots"), "overheden");
  // woordgrens: geen treffer midden in een woord
  assert.equal(t("transclub"), null);
  assert.equal(t("kapotte arts-lijst"), "zorg");
  assert.equal(t("taxe fonciere"), null);
  assert.equal(t(""), null);
  assert.equal(t("ab"), null);
});

test("bijJou: data is geldig (soorten, ankers, alleen https)", () => {
  assert.match(cat.bijJou.basis, /^https:\/\//);
  for (const o of cat.bijJou.onderwerpen) {
    assert.ok(B.SOORTEN.includes(o.soort)); assert.match(o.anker, /^[a-z]+$/); assert.ok(o.titel);
    if (o.soort === "overheden") assert.ok(Array.isArray(o.overheid) && o.overheid.length);
  }
});

test("bijJou: postcode naar grootste gemeente en aanvraag-URL's", () => {
  const d = { ok: true, gemeenten: [{ nom: "A", code: "62018", centre: { coordinates: [1.86, 50.48] }, population: 264 }, { nom: "Montreuil", code: "62588", centre: { coordinates: [1.76, 50.46] }, population: 2000 }, { nom: "Kapot", code: "1", centre: null, population: 99999 }] };
  const g = B.grootsteGemeente(d);
  assert.deepEqual(g, { nom: "Montreuil", code: "62588", lat: 50.46, lng: 1.76 });
  assert.equal(B.grootsteGemeente({ ok: false }), null);
  const o = n => cat.bijJou.onderwerpen.find(x => x.anker === n);
  assert.equal(B.bronUrl(cat.bijJou, o("zorg"), g), "https://nedergids-v2.vercel.app/api/zorg?lat=50.46&lng=1.76");
  assert.equal(B.bronUrl(cat.bijJou, o("overheden"), g), "https://nedergids-v2.vercel.app/api/overheden?insee=62588&lat=50.46&lng=1.76");
  assert.equal(B.bronUrl(cat.bijJou, { soort: "gemeente" }, g), "");
  assert.equal(B.postcodeUrl(cat.bijJou, "62170"), "https://nedergids-v2.vercel.app/api/postcode?pc=62170");
  assert.equal(B.postcodeUrl(cat.bijJou, "6217"), "");
  assert.equal(B.zoekUrl(cat.bijJou, "62170", "zorg"), "https://nedergids-v2.vercel.app/zoek?postcode=62170#zorg");
});

test("bijJou: items kiezen, hooguit drie, overheden op soort", () => {
  const it = (id, soort, km, extra) => ({ id, soort, naam: "N" + id, plaats: "P", afstand_km: km, extra });
  const ov = { ok: true, items: [it(1, "mairie", 10.5, { bevoegd: true }), it(2, "sip", 0.3), it(3, "gendarmerie", 11.8, { bevoegd: true }), it(4, "commissariat_police", 13.5, { bevoegd: false }), it(5, "police_municipale", 10.3, { bevoegd: true }), it(6, "gendarmerie", 30, { bevoegd: false })] };
  const m = B.kiesItems({ soort: "overheden", overheid: ["mairie"] }, ov, 3);
  assert.deepEqual(m.map(x => x.id), ["1"]);
  const g = B.kiesItems({ soort: "overheden", overheid: ["gendarmerie", "commissariat_police", "police_municipale"] }, ov, 3);
  assert.deepEqual(g.map(x => x.id), ["3", "4", "5"]);
  assert.equal(g[0].soortLabel, "Gendarmerie"); assert.equal(g[0].afstand, "11,8 km");
  const z = B.kiesItems({ soort: "zorg" }, { ok: true, items: [it(1, "ziekenhuis", 9), it(2, "ziekenhuis", 3), it(3, "ziekenhuis", 5), it(4, "ziekenhuis", 7)] }, 3);
  assert.deepEqual(z.map(x => x.id), ["2", "3", "4"]);
  const v = B.kiesItems({ soort: "verenigingen" }, { ok: true, items: [it(1, "vereniging", 90, { dekt: false }), it(2, "vereniging", 120, { dekt: true }), it(3, "vereniging", 50, { dekt: true })] }, 3);
  assert.deepEqual(v.map(x => x.id), ["3", "2"]);
  assert.deepEqual(B.kiesItems({ soort: "zorg" }, { ok: false }, 3), []);
  assert.deepEqual(B.kiesItems({ soort: "zorg" }, { ok: true, items: [{ naam: "" }, null] }, 3), []);
  assert.equal(B.afstandTekst(0.5), "500 m"); assert.equal(B.afstandTekst(10.46), "10,5 km"); assert.equal(B.afstandTekst(NaN), "");
});

test("bijJou: bedrading in index.html en service worker", () => {
  assert.ok(html.includes('<script src="./bijjou-lib.js"></script>'));
  assert.ok(lees("sw.js").includes('"./bijjou-lib.js"'));
  assert.match(html, /this\.bijJouZoek\(v\); this\.vraagPlan\(v, false\); \},/);
  assert.match(html, /hubZoekGa\(v\)\{[^\n]*this\.bijJouZoek\(v\);/);
  const stuk = html.slice(html.indexOf("bijJouDoe(v){"), html.indexOf("bijJouVals(){"));
  assert.match(stuk, /_bjTeller/); assert.match(stuk, /credentials:"omit"/); assert.match(stuk, /AbortController/); assert.match(stuk, /timeoutMs/);
  assert.match(stuk, /catch\(\(\) => zet\(null\)\)/);
  assert.ok(!/innerHTML/.test(stuk));
  assert.ok(html.includes("Vul je postcode in voor adressen bij jou"));
  assert.ok(html.includes("Alles bij jou in de Nedergids") && html.includes('target="_blank" rel="noopener"'));
  assert.equal(cat.bijJou.timeoutMs, 30000);
});
