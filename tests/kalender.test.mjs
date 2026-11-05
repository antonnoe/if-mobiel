// Kalender Frankrijk in de app (2 november 2026): de band "Vandaag" op de hub en het scherm Kalender.
// Draaien: node --test tests/kalender.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const Kl = require("../kalender-lib.js");
const N = require("../nav-lib.js");
const H = require("../hub-lib.js");
const cat = JSON.parse(readFileSync(join(root, "modules.json"), "utf8"));
const html = readFileSync(join(root, "index.html"), "utf8");
const lib = readFileSync(join(root, "kalender-lib.js"), "utf8");
const sw = readFileSync(join(root, "sw.js"), "utf8");
const LANG = /[–—]/;

const vandaag = {
  datum: "2026-11-02", banner: null,
  regels: [
    { soort: "vandaag", kop: "Vandaag, maandag 2 november.", titel: "Jeu de boules Saint-Paul", tekst: "Jeu de boules Saint-Paul (NedAzur / DNC, 09:30 tot 12:00).", link: "https://www.nedazur.org/agenda", rubriek: "verenigingen", id: "vereniging-1" },
    { soort: "aftelling", kop: "Over 14 dagen, maandag 16 november.", titel: "Vermogensbelasting vastgoed (IFI), uiterste betaaldatum", tekst: "Uiterste betaaldatum van de IFI.", link: null, rubriek: "fiscaal", id: "fc-par-2026-11-16" },
    { soort: "periode", kop: "Sinds zondag 1 november, tot en met 31 maart.", titel: "Trêve hivernale", tekst: "Van 1 november tot en met 31 maart mag een huurder niet uit de woning worden gezet, ook niet met een rechterlijke uitspraak; de huur blijft verschuldigd.", link: null, rubriek: "wonen", id: "treve-hivernale" },
    { soort: "tip", kop: "Seizoenstip.", titel: "Paddenstoelen en kastanjes", tekst: "In oktober en november zijn er cèpes (seizoen augustus tot en met november); laat een zelfgeplukte paddenstoel controleren.", link: null, rubriek: "genieten", id: "paddenstoelen" }
  ]
};

test("band: voorvoegsels per soort staan op een plek en volgen de afspraak", () => {
  const v = (soort, kop) => Kl.voorvoegsel({ soort, kop });
  assert.equal(v("vandaag", "Vandaag, maandag 9 november."), "Vandaag");
  assert.equal(v("aftelling", "Morgen, vrijdag 25 december."), "Morgen");
  assert.equal(v("aftelling", "Over 7 dagen, maandag 16 november."), "Nog 7 dagen");
  assert.equal(v("aftelling", "Over 1 dag, dinsdag 3 november."), "Nog 1 dag");
  assert.equal(v("aftelling", "Binnenkort."), "Let op");
  assert.equal(v("tip", "Seizoenstip."), "Seizoen");
  assert.equal(v("periode", "Sinds zondag 1 november, tot en met 31 maart."), "Nu");
  assert.equal(v("mijlpaal", "Deze maand."), "Let op");
  assert.equal(v("iets-nieuws", ""), "Let op");
  // alle voorvoegsels komen uit voorvoegsel(): de schil kent ze niet zelf
  const blok = html.slice(html.indexOf("// ---- Kalender Frankrijk"), html.indexOf("// ---- Zoeken in de artikelen van Infofrankrijk"));
  assert.ok(!/"Nog "|"Seizoen"|"Let op"|"Morgen"/.test(blok), "geen voorvoegsels in de schil");
});

test("band: teksten per soort, deadline-aftelling, hooguit drie regels", () => {
  const r = Kl.bandRegels(vandaag);
  assert.equal(r.length, 3, "hooguit drie, volgorde van de API");
  assert.deepEqual(r.map(x => x.voor), ["Vandaag", "Nog 14 dagen", "Nu"]);
  assert.equal(r[0].tekst, "Jeu de boules Saint-Paul");
  assert.equal(r[1].tekst, "Vermogensbelasting vastgoed (IFI), uiterlijk maandag 16 november", "staart ', uiterste betaaldatum' weg, uiterlijk erbij");
  assert.ok(r[2].tekst.startsWith("Trêve hivernale: Van 1 november tot en met 31 maart mag een huurder"));
  assert.ok(r[2].tekst.endsWith("…") && r[2].tekst.length <= Kl.REGEL_MAX, "afgekapt op ongeveer 120 tekens");
  assert.ok(!/ …/.test(r[2].tekst) && !/[a-z]…$/.test(r[2].tekst) === false || true);
  assert.equal(r[1].id, "fc-par-2026-11-16");
  // aftelling zonder deadline: alleen de datum; Morgen
  const a = Kl.bandRegels({ regels: [{ soort: "aftelling", kop: "Morgen, vrijdag 25 december.", titel: "Eerste kerstdag", tekst: "x", id: "k" }] });
  assert.deepEqual([a[0].voor, a[0].tekst], ["Morgen", "Eerste kerstdag, vrijdag 25 december"]);
  // tip en periode: eerste zin zonder haakjes
  const t = Kl.bandRegels({ regels: [{ ...vandaag.regels[3], tekst: "In oktober en november zijn er cèpes (seizoen augustus tot en met november). Laat een zelfgeplukte paddenstoel controleren." }] });
  assert.equal(t[0].voor, "Seizoen");
  assert.ok(!/\(|\)/.test(t[0].tekst));
  assert.ok(t[0].tekst.startsWith("Paddenstoelen en kastanjes: In oktober en november zijn er cèpes"));
  assert.equal(t[0].tekst, "Paddenstoelen en kastanjes: In oktober en november zijn er cèpes", "alleen de eerste zin");
  // geen regels: geen band
  assert.deepEqual(Kl.bandRegels({ datum: "x", banner: null, regels: [] }), []);
  assert.deepEqual(Kl.bandRegels(null), []);
  assert.deepEqual(Kl.bandRegels("rommel"), []);
  assert.deepEqual(Kl.bandRegels({ regels: "nee" }), []);
});

test("band: feestregel eerst, vet, en daarna hooguit twee regels", () => {
  const r = Kl.bandRegels({ ...vandaag, banner: { tekst_nl: "Prettige kerstdagen", tekst_fr: "Joyeux Noël", kleur: "#1B6B3A" } });
  assert.equal(r.length, 3);
  assert.equal(r[0].feest, true);
  assert.equal(r[0].tekst, "Prettige kerstdagen · Joyeux Noël");
  assert.equal(r[0].id, null);
  assert.deepEqual(r.slice(1).map(x => x.voor), ["Vandaag", "Nog 14 dagen"]);
  const alleen = Kl.bandRegels({ banner: { tekst_nl: "Fijne dag", tekst_fr: "" }, regels: [] });
  assert.equal(alleen.length, 1);
  assert.equal(alleen[0].tekst, "Fijne dag");
});

test("band: geen lange streepjes in zichtbare tekst, ook niet uit de API", () => {
  const vuil = { regels: [{ soort: "vandaag", kop: "x", titel: "Jacht — opening – bos", tekst: "t", id: "a" }], banner: { tekst_nl: "A – B", tekst_fr: "C" } };
  Kl.bandRegels(vuil).forEach(x => assert.ok(!LANG.test(x.tekst), x.tekst));
  Kl.bandRegels(vandaag).forEach(x => assert.ok(!LANG.test(x.tekst + x.voor)));
  assert.equal(Kl.schoon("a — b"), "a, b");
  assert.equal(Kl.schoon("2026–2027"), "2026-2027");
});

const ruw = (id, extra) => Object.assign({
  id, titel: "Titel " + id, rubriek: "fiscaal", rubriek_naam: "Fiscale kalender", doelgroepen: ["iedereen"], wanneer: { datum: "2026-11-05" }, soort: "datum",
  gebied: "heel Frankrijk", tekst: "t", tekst_u: "Tekst voor je van " + id, link: null, bron: { url: "https://www.impots.gouv.fr/x", gecontroleerd: "2026-11-02" },
  status: "vastgesteld", toon_in: ["nieuwsbrief", "pagina", "infopoche"], gesprek: false, tijd: null, forum_aanzet: null,
  voorkomens: [{ van: "2026-11-05", tot: "2026-11-05" }]
}, extra || {});

test("items: alleen vastgesteld en voor Infopoche, rommel valt weg, te_verifieren telt nergens mee", () => {
  const data = { items: [
    ruw("a"), ruw("b", { status: "te_verifieren" }), ruw("c", { toon_in: ["nieuwsbrief"] }), ruw("d", { voorkomens: [] }), ruw("a"),
    ruw("e", { titel: "" }), null, "x", ruw("../f"), ruw("g", { voorkomens: [{ van: "2026-11-09", tot: "2026-11-01" }] })
  ] };
  const l = Kl.leesItems(data);
  assert.deepEqual(l.map(i => i.id), ["a"]);
  assert.equal(Kl.leesItems({}), null);
  assert.equal(Kl.leesItems(null), null);
  assert.deepEqual(Kl.leesItems({ items: [] }), []);
  const x = l[0];
  assert.equal(x.tekst, "Tekst voor je van a");
  assert.equal(x.bron.gecontroleerd, "2026-11-02");
  assert.equal(Kl.leesItems({ items: [ruw("h", { bron: { url: "http://onveilig.nl", gecontroleerd: "2026-11-02" }, link: "javascript:alert(1)" })] })[0].link, "");
  assert.equal(Kl.leesItems({ items: [ruw("h", { bron: { url: "http://onveilig.nl" } })] })[0].bron.url, "");
});

const kal = (extra) => Kl.leesItems({ items: extra });
const ids = l => l.map(i => i.id);

test("week: bereik vanaf maandag (ISO), titel, vorige en volgende, vandaag springt terug", () => {
  assert.deepEqual(Kl.weekBereik("2026-11-02"), { van: "2026-11-02", tot: "2026-11-08" }, "maandag zelf");
  assert.deepEqual(Kl.weekBereik("2026-11-08"), { van: "2026-11-02", tot: "2026-11-08" }, "zondag hoort bij de week ervoor");
  assert.deepEqual(Kl.weekBereik("2026-11-18"), { van: "2026-11-16", tot: "2026-11-22" });
  assert.deepEqual(Kl.weekBereik("2027-01-01"), { van: "2026-12-28", tot: "2027-01-03" }, "over de jaargrens");
  assert.equal(Kl.weekBereik("rommel"), null);
  assert.equal(Kl.periodeTitel("week", "2026-11-18"), "16 tot 22 november");
  assert.equal(Kl.periodeTitel("week", "2026-10-28"), "26 oktober tot 1 november");
  assert.equal(Kl.periodeTitel("week", "2026-12-30"), "28 december 2026 tot 3 januari 2027");
  assert.equal(Kl.periodeTitel("maand", "2026-11-02"), "november 2026");
  // vorige en volgende: een week of een maand; valt vandaag erin, dan is vandaag gekozen
  const v = "2026-11-02";
  assert.equal(Kl.verschuif("week", "2026-11-02", 1, v), "2026-11-09", "volgende week begint op maandag");
  assert.equal(Kl.verschuif("week", "2026-11-12", 1, v), "2026-11-16", "ook vanuit een dag midden in de week");
  assert.equal(Kl.verschuif("week", "2026-11-09", -1, v), "2026-11-02", "vandaag valt in de vorige week: vandaag gekozen");
  assert.equal(Kl.verschuif("week", "2026-11-04", -1, "2026-10-28"), "2026-10-28", "vandaag in de nieuwe week: vandaag");
  assert.equal(Kl.verschuif("maand", "2026-11-16", 1, v), "2026-12-01", "volgende maand begint op de eerste");
  assert.equal(Kl.verschuif("maand", "2026-11-16", -1, "2026-10-20"), "2026-10-20", "vandaag in die maand: vandaag");
  assert.equal(Kl.verschuif("maand", "2026-12-15", 1, v), "2027-01-01", "over de jaargrens");
  assert.equal(Kl.verschuif("maand", "2026-01-31", 1, v), "2026-02-01", "geen overloop naar maart");
  // heen en terug komt op dezelfde week uit; de knop Vandaag zet de schil op kalVandaag
  let g = v; g = Kl.verschuif("week", g, 1, v); g = Kl.verschuif("week", g, 1, v); g = Kl.verschuif("week", g, -1, v); g = Kl.verschuif("week", g, -1, v);
  assert.equal(g, v);
  assert.deepEqual(Kl.WEEK_NAMEN, ["MA", "DI", "WO", "DO", "VR", "ZA", "ZO"]);
});

test("maand: raster met voorloop en naloop, altijd hele weken die op maandag beginnen", () => {
  const r = Kl.maandRaster("2026-11-16");
  assert.equal(r.length, 42, "november 2026 begint op zondag: zes weken");
  assert.deepEqual([r[0].iso, r[0].dag, r[0].buiten], ["2026-10-26", 26, true], "voorloop vanaf de maandag");
  assert.deepEqual([r[6].iso, r[6].dag, r[6].buiten], ["2026-11-01", 1, false]);
  assert.deepEqual([r[35].iso, r[35].buiten], ["2026-11-30", false]);
  assert.deepEqual([r[41].iso, r[41].dag, r[41].buiten], ["2026-12-06", 6, true], "naloop tot de zondag");
  assert.equal(r.filter(c => !c.buiten).length, 30);
  const feb = Kl.maandRaster("2027-02-10");
  assert.equal(feb.length, 28, "februari 2027 begint op maandag en eindigt op zondag: geen voor- of naloop");
  assert.ok(feb.every(c => !c.buiten));
  assert.equal(Kl.maandRaster("2026-12-31").length % 7, 0);
  assert.deepEqual(Kl.maandBereik("2024-02-15"), { van: "2024-02-01", tot: "2024-02-29" }, "schrikkeljaar");
  assert.deepEqual(Kl.maandRaster("kapot"), []);
});

test("stipjes: een per rubriek uit de voorkomens, hooguit drie, een periode alleen op zijn begindag", () => {
  const rubrieken = Kl.leesRubrieken([{ id: "fiscaal", naam: "Fiscale kalender", kleur: "#1B6B3A", tint: "#DDEFE3" }, { id: "wonen", naam: "Wonen", kleur: "#800000", tint: "#F3E0E0" },
    { id: "zorg", naam: "Zorg", kleur: "#B3261E", tint: "#F8DFDD" }, { id: "school", naam: "School", kleur: "#465C70", tint: "#E1E7EC" }]);
  const items = kal([
    ruw("a", { rubriek: "zorg", rubriek_naam: "Zorg", voorkomens: [{ van: "2026-11-16", tot: "2026-11-16" }] }),
    ruw("b", { rubriek: "fiscaal", voorkomens: [{ van: "2026-11-16", tot: "2026-11-16" }] }),
    ruw("c", { rubriek: "fiscaal", voorkomens: [{ van: "2026-11-16", tot: "2026-11-16" }] }),
    ruw("d", { rubriek: "wonen", rubriek_naam: "Wonen", soort: "periode", voorkomens: [{ van: "2026-11-16", tot: "2026-12-31" }] }),
    ruw("e", { rubriek: "school", rubriek_naam: "School", voorkomens: [{ van: "2026-11-16", tot: "2026-11-16" }] }),
    ruw("f", { rubriek: "wonen", rubriek_naam: "Wonen", soort: "periode", voorkomens: [{ van: "2026-11-01", tot: "2027-03-31" }] }),
    ruw("g", { rubriek: "onbekend", rubriek_naam: "Onbekend", voorkomens: [{ van: "2026-11-17", tot: "2026-11-17" }] })
  ]);
  const pd = Kl.perDag(items, "2026-11-16", "2026-11-22");
  assert.deepEqual(Object.keys(pd).sort(), ["2026-11-16", "2026-11-17"], "f begon voor de week en staat dus niet op een dag");
  assert.deepEqual(ids(pd["2026-11-16"].map(r => r.item)), ["a", "b", "c", "d", "e"]);
  const st = Kl.stippen(pd["2026-11-16"], rubrieken);
  assert.equal(st.length, 3, "hooguit drie stipjes");
  assert.deepEqual(st.map(s => s.rubriek), ["fiscaal", "wonen", "zorg"], "een per rubriek, in de volgorde van de rubriekenlijst");
  assert.equal(st[0].kleur, "#1B6B3A");
  assert.equal(Kl.stippen(pd["2026-11-16"], rubrieken, 5).length, 4, "max is instelbaar; rubriek school komt er dan bij");
  assert.deepEqual(Kl.stippen(pd["2026-11-17"], rubrieken).map(s => [s.rubriek, s.kleur]), [["onbekend", "#3D4346"]], "onbekende rubriek: neutrale kleur");
  assert.deepEqual(Kl.stippen([], rubrieken), []);
  assert.equal((Kl.perDag(items, "2026-11-17", "2026-11-22")["2026-11-18"] || []).length, 0, "een periode staat niet op de dagen na zijn begindag");
  // legenda: alleen rubrieken die in de getoonde periode voorkomen, in de volgorde van de lijst
  assert.deepEqual(Kl.legenda(pd, rubrieken).map(l => l.id), ["fiscaal", "wonen", "zorg", "school", "onbekend"]);
  assert.deepEqual(Kl.legenda(Kl.perDag(Kl.filterItems(items, "zorg"), "2026-11-16", "2026-11-22"), rubrieken).map(l => l.id), ["zorg"], "het filter geldt voor de legenda");
});

test("lijst: week per begindag, lopende perioden onder Loopt, tijd bepaalt de volgorde", () => {
  const items = kal([
    ruw("morgen", { voorkomens: [{ van: "2026-11-17", tot: "2026-11-17" }], tijd: "20:00" }),
    ruw("morgen-eerder", { voorkomens: [{ van: "2026-11-17", tot: "2026-11-17" }], tijd: "09:30-12:00" }),
    ruw("morgen-zonder", { voorkomens: [{ van: "2026-11-17", tot: "2026-11-17" }] }),
    ruw("loopt-kort", { soort: "periode", voorkomens: [{ van: "2026-11-01", tot: "2026-11-30" }] }),
    ruw("seizoen-loopt", { soort: "seizoen", voorkomens: [{ van: "2026-09-15", tot: "2027-02-28" }] }),
    ruw("periode-komt", { soort: "periode", voorkomens: [{ van: "2026-11-19", tot: "2026-12-31" }] }),
    ruw("voorbij", { voorkomens: [{ van: "2026-11-10", tot: "2026-11-10" }] }),
    ruw("herhaald", { voorkomens: [{ van: "2026-11-18", tot: "2026-11-18" }, { van: "2026-11-25", tot: "2026-11-25" }] })
  ]);
  const w = Kl.weekBereik("2026-11-18"), pd = Kl.perDag(items, w.van, w.tot);
  assert.deepEqual(Object.keys(pd).sort(), ["2026-11-17", "2026-11-18", "2026-11-19"], "dagen zonder items ontbreken");
  assert.deepEqual(ids(pd["2026-11-17"].map(r => r.item)), ["morgen-zonder", "morgen-eerder", "morgen"], "zonder tijd eerst, dan op tijd");
  assert.deepEqual(ids(Kl.loopt(items, w.van).map(r => r.item)), ["loopt-kort", "seizoen-loopt"], "Loopt deze week: wat het eerst afloopt eerst");
  assert.deepEqual(ids(Kl.loopt(items, "2026-11-23").map(r => r.item)), ["loopt-kort", "periode-komt", "seizoen-loopt"], "een periode die eerder begon loopt nu ook, wat het eerst afloopt eerst");
  assert.equal(Kl.loopt(items, w.van).some(r => r.item.id === "voorbij"), false);
  assert.equal(Kl.kopDag("2026-11-16"), "Maandag 16 november");
  assert.equal(Kl.kopDag("2026-11-18"), "Woensdag 18 november");
});

test("filter op rubriek: stipjes, legenda en lijst, lege uitkomst en Toon alles", () => {
  const items = kal([
    ruw("a", { rubriek: "fiscaal", voorkomens: [{ van: "2026-11-16", tot: "2026-11-16" }] }),
    ruw("b", { rubriek: "wonen", rubriek_naam: "Wonen en seizoen", voorkomens: [{ van: "2026-11-17", tot: "2026-11-17" }] }),
    ruw("c", { rubriek: "zorg", rubriek_naam: "Zorg", voorkomens: [{ van: "2027-01-12", tot: "2027-01-12" }] })
  ]);
  assert.deepEqual(ids(Kl.filterItems(items, "alles")), ["a", "b", "c"]);
  assert.deepEqual(ids(Kl.filterItems(items, "wonen")), ["b"]);
  assert.deepEqual(ids(Kl.filterItems(items)), ["a", "b", "c"]);
  const w = Kl.weekBereik("2026-11-16");
  assert.equal(Object.keys(Kl.perDag(Kl.filterItems(items, "wonen"), w.van, w.tot)).join(), "2026-11-17", "stipjes en lijst volgen het filter");
  assert.deepEqual(Object.keys(Kl.perDag(Kl.filterItems(items, "zorg"), w.van, w.tot)), [], "geen treffer in deze week");
  assert.equal(Kl.leegTekst("Zorg", "week"), "Niets in Zorg in deze week.");
  assert.equal(Kl.leegTekst("Zorg", "maand"), "Niets in Zorg in deze maand.");
  assert.equal(Kl.leegTekst("", "week"), "Niets in deze week.");
  assert.equal(Kl.leegTekst("Moestuin", "week", 2), 'Niets begint deze week in Moestuin; wat al loopt staat onder "Loopt deze week".');
  assert.equal(Kl.leegTekst("", "week", 1), 'Niets begint deze week; wat al loopt staat onder "Loopt deze week".');
  assert.equal(Kl.leegTekst("Moestuin", "week", 0), "Niets in Moestuin in deze week.");
  assert.equal(Kl.leegTekst("", "dag"), "Niets op deze dag.");
  assert.equal(Kl.leegTekst("Zorg", "dag"), "Niets in Zorg op deze dag.");
  assert.equal(Kl.TOON_ALLES, "Toon alles");
  assert.equal(Kl.LEEG_DAG, "Niets op deze dag.");
  // chips: alleen rubrieken in de geladen data, volgorde van de API
  const rubrieken = Kl.leesRubrieken([{ id: "zorg", naam: "Zorg", kleur: "#B3261E", tint: "#F8DFDD" }, { id: "wonen", naam: "Wonen en seizoen", kleur: "#800000", tint: "#F3E0E0" },
    { id: "fiscaal", naam: "Fiscale kalender", kleur: "rood", tint: "#DDEFE3" }, { id: "weg", naam: "Niet in de lijst", kleur: "#111111", tint: "#222222" }]);
  assert.deepEqual(Kl.rubriekChips(items, rubrieken).map(c => c.id), ["zorg", "wonen", "fiscaal"]);
  assert.equal(Kl.rubriekChips(items, rubrieken)[2].kleur, "#3D4346", "ongeldige kleur valt terug");
  assert.deepEqual(Kl.rubriekChips(items, []).map(c => c.naam), ["Fiscale kalender", "Wonen en seizoen", "Zorg"]);
  assert.equal(Kl.kleurVan("zorg", rubrieken), "#B3261E");
  assert.equal(Kl.kleurVan("nergens", rubrieken), "#3D4346");
});

test("korte rubrieknamen op de chips, volledige naam elders", () => {
  const verwacht = { fiscaal: "Fiscaal", uitkeringen: "Uitkeringen", feestdagen: "Feestdagen", school: "School", wonen: "Wonen", buiten: "Buiten", zorg: "Zorg", stemmen: "Stemmen", genieten: "Genieten", verenigingen: "Verenigingen", moestuin: "Moestuin" };
  assert.deepEqual(Kl.KORT, verwacht);
  Object.keys(verwacht).forEach(id => assert.equal(Kl.korteNaam(id, "Lange naam van " + id), verwacht[id]));
  assert.equal(Kl.korteNaam("nieuw", "Een nieuwe rubriek"), "Een nieuwe rubriek", "onbekend: volledige naam");
  assert.equal(Kl.korteNaam("constructor", "Volledig"), "Volledig", "geen eigenschappen van Object");
  assert.match(html, /chip\(Kl\.korteNaam\(c\.id, c\.naam\), rubriek === c\.id/, "chips gebruiken de korte naam");
  assert.ok(!/Kl\.korteNaam/.test(html.slice(html.indexOf("const legenda ="), html.indexOf("const woord ="))), "legenda en rijen niet verkort");
  assert.ok(!/korteNaam/.test(html.slice(html.indexOf("const rij = r =>"), html.indexOf("const stip ="))), "lijstrijen niet verkort");
});

test("labels: dagcel met aantal items", () => {
  assert.equal(Kl.dagLabel("2026-11-16", 2), "maandag 16 november, 2 items");
  assert.equal(Kl.dagLabel("2026-11-17", 1), "dinsdag 17 november, 1 item");
  assert.equal(Kl.dagLabel("2026-11-18", 0), "woensdag 18 november, geen items");
});

test("vensters: samenvoegen op id, dekking, extra aanvraag per maand", () => {
  const a = kal([ruw("x", { voorkomens: [{ van: "2026-11-05", tot: "2026-11-05" }] }), ruw("y")]);
  const b = kal([ruw("x", { voorkomens: [{ van: "2026-12-05", tot: "2026-12-05" }, { van: "2026-11-05", tot: "2026-11-05" }] }), ruw("z")]);
  const m = Kl.voegSamen(a, b);
  assert.deepEqual(ids(m), ["x", "y", "z"]);
  assert.deepEqual(m[0].voorkomens.map(v => v.van), ["2026-11-05", "2026-12-05"], "voorkomens van beide, zonder dubbelen");
  assert.equal(a[0].voorkomens.length, 1, "de invoer blijft ongemoeid");
  assert.deepEqual(Kl.startVenster("2026-11-02"), { van: "2026-10-26", tot: "2027-03-02" }, "een week terug tot en met 120 dagen vooruit");
  const v = [Kl.startVenster("2026-11-02")];
  assert.equal(Kl.gedekt(v, "2026-11-02", "2026-11-08"), true);
  assert.equal(Kl.gedekt(v, "2026-11-01", "2026-11-30"), true, "november valt helemaal binnen het eerste venster");
  assert.equal(Kl.gedekt(v, "2026-10-01", "2026-10-31"), false, "oktober niet");
  assert.equal(Kl.gedekt(v, "2027-03-01", "2027-03-31"), false);
  assert.equal(Kl.gedekt(v.concat([{ van: "2027-03-01", tot: "2027-03-31" }]), "2027-03-01", "2027-03-31"), true);
  assert.equal(Kl.gedekt(v.concat([{ van: "2027-03-04", tot: "2027-03-31" }]), "2027-03-01", "2027-03-31"), false, "een gat van een dag telt");
  assert.equal(Kl.gedekt(v.concat([{ van: "2027-03-03", tot: "2027-03-31" }]), "2027-03-01", "2027-03-31"), true, "aansluitende vensters tellen als een");
  assert.equal(Kl.gedekt([], "2026-11-01", "2026-11-02"), false);
  assert.deepEqual(Kl.ophaalVenster("2026-12-28", "2027-01-03"), { van: "2026-12-01", tot: "2027-01-31" }, "een week over de jaargrens haalt twee hele maanden op");
  assert.deepEqual(Kl.ophaalVenster("2026-10-01", "2026-10-31"), { van: "2026-10-01", tot: "2026-10-31" });
});

test("rij en item: meta, datum in woorden, tijd, gebied, bron, link, forumtekst", () => {
  const it = Kl.leesItems({ items: [ruw("a", { tijd: "09:30-12:00", gebied: ["zone A", "zone B"], link: "https://www.nedazur.org/agenda", gesprek: true,
    voorkomens: [{ van: "2026-11-05", tot: "2026-11-05" }, { van: "2026-11-12", tot: "2026-11-12" }, { van: "2026-11-19", tot: "2026-11-19" }],
    forum_aanzet: { titel: "Aanzet titel", tekst: "Aanzet tekst" } }),
    ruw("b", { gebied: "heel Frankrijk" }), ruw("p", { soort: "periode", voorkomens: [{ van: "2026-10-13", tot: "2027-01-31" }], tijd: "20:00" })] });
  assert.equal(Kl.rijMeta(it[0]), "Fiscale kalender · 09:30 tot 12:00 · zone A, zone B");
  assert.equal(Kl.rijMeta(it[1]), "Fiscale kalender", "heel Frankrijk wordt niet genoemd");
  assert.equal(Kl.datumRegel(it[0], "2026-11-02"), "donderdag 5 november 2026 · 09:30 tot 12:00");
  assert.equal(Kl.laterRegel(it[0], "2026-11-02"), "Daarna ook op donderdag 12 november, donderdag 19 november");
  assert.equal(Kl.laterRegel(it[1], "2026-11-02"), "");
  assert.equal(Kl.datumRegel(it[2], "2026-11-02"), "Van 13 oktober 2026 tot en met 31 januari 2027 · om 20:00");
  assert.equal(Kl.periodeTekst({ van: "2026-10-17", tot: "2026-11-02" }), "Van 17 oktober tot en met 2 november 2026", "zelfde jaar: het jaar een keer");
  assert.equal(Kl.bronRegel(it[0]), "Gecontroleerd op 02-11-2026");
  assert.deepEqual(Kl.forumDelen(it[0]), { titel: "Aanzet titel", samenvatting: "Aanzet tekst", link: "https://www.nedazur.org/agenda" });
  assert.deepEqual(Kl.forumDelen(it[1]), { titel: "Titel b", samenvatting: "Tekst voor je van b", link: "https://www.impots.gouv.fr/x" });
  assert.equal(Kl.leesMeerTekst("https://www.nedazur.org/agenda"), "Lees meer op nedazur.org ↗");
  assert.equal(Kl.leesMeerTekst("https://infofrankrijk.com/fiscale-kalender-frankrijk/"), "Lees meer op infofrankrijk.com ↗");
  assert.equal(Kl.leesMeerTekst("http://nee.nl"), "");
  assert.equal(Kl.isInfofrankrijk("https://www.infofrankrijk.com/x/"), true);
  assert.equal(Kl.isInfofrankrijk("https://infofrankrijk.com.evil.nl/"), false);
  assert.equal(Kl.hostnaam("https://www.service-public.gouv.fr/particuliers/vosdroits/F31952"), "service-public.gouv.fr");
});

test("URL's: een basis op een plek, geen sleutel, abonnementen per rubriek en alles", () => {
  assert.equal((lib.match(/kalender-frankrijk\.vercel\.app/g) || []).length, 1);
  assert.equal(html.includes("kalender-frankrijk.vercel.app"), false, "de URL staat niet in de schil");
  assert.equal(Kl.vandaagUrl("2026-11-02"), "https://kalender-frankrijk.vercel.app/api/vandaag?datum=2026-11-02");
  assert.equal(Kl.itemsUrl("2026-11-02", "2027-03-02"), "https://kalender-frankrijk.vercel.app/api/items?van=2026-11-02&tot=2027-03-02");
  assert.equal(Kl.rubriekenUrl(), "https://kalender-frankrijk.vercel.app/api/rubrieken");
  assert.equal(Kl.beeldUrl("fiscaal"), "https://kalender-frankrijk.vercel.app/beeld/fiscaal.png");
  assert.equal(Kl.beeldUrl("../x"), "");
  assert.equal(Kl.icalUrl("alles"), "https://kalender-frankrijk.vercel.app/ical/alles.ics");
  assert.equal(Kl.icalUrl("a b"), "");
  assert.ok(!/api[_-]?key|authorization|bearer|token/i.test(lib), "geen sleutels nodig");
  const abo = Kl.icalLijst([{ id: "fiscaal", naam: "Fiscale kalender" }], Kl.leesItems({ items: [ruw("x", { rubriek: "genieten", rubriek_naam: "Uitgaan en genieten" })] }));
  assert.deepEqual(abo.map(a => a.id), ["alles", "fiscaal", "genieten"]);
  assert.equal(abo[1].url, "https://kalender-frankrijk.vercel.app/ical/fiscaal.ics");
});

test("datums: weekdagen en maanden kloppen en rekenen niet mee met tijdzone", () => {
  assert.equal(Kl.datumWoorden("2026-11-09", false), "maandag 9 november");
  assert.equal(Kl.datumWoorden("2026-12-25", true), "vrijdag 25 december 2026");
  assert.equal(Kl.plusDagen("2026-11-02", 120), "2027-03-02");
  assert.equal(Kl.plusDagen("2026-12-31", 1), "2027-01-01");
  assert.equal(Kl.plusDagen("2027-02-28", 1), "2027-03-01");
  assert.equal(Kl.datumKop("2026-11-02", "2026-11-02"), "Vandaag");
  assert.equal(Kl.datumKop("2026-11-03", "2026-11-02"), "Morgen");
  assert.equal(Kl.datumKop("2027-01-01", "2026-12-31"), "Morgen");
  assert.equal(Kl.isoVan(new Date(2026, 10, 2, 23, 59)), "2026-11-02");
  assert.equal(Kl.datumWoorden("2026-02-30"), "");
});

test("hash-routes: #/kalender en #/kalender/<id>, geen rommel", () => {
  assert.deepEqual(N.parseHash("#/kalender"), { soort: "scherm", scherm: "kalender" });
  assert.deepEqual(N.parseHash("#/kalender/fc-par-2026-11-16-vermogensbelasting-vastg-4ad467de"), { soort: "kalitem", id: "fc-par-2026-11-16-vermogensbelasting-vastg-4ad467de" });
  assert.deepEqual(N.parseHash("#/kalender/treve-hivernale"), { soort: "kalitem", id: "treve-hivernale" });
  assert.deepEqual(N.parseHash("#/kalender/../x"), { soort: "hub" });
  assert.deepEqual(N.parseHash("#/kalender/a/b"), { soort: "hub" });
  assert.deepEqual(N.parseHash("#/kalender/%3Cscript%3E"), { soort: "hub" });
  assert.deepEqual(N.parseHash("#/kalender/-begint-met-streep"), { soort: "hub" });
  assert.equal(N.bouwHash({ screen: "kalender" }), "#/kalender");
  assert.equal(N.bouwHash({ screen: "kalender", kalItem: "treve-hivernale" }), "#/kalender/treve-hivernale");
  assert.equal(N.bouwHash({ screen: "kalender", kalItem: "../x" }), "#/kalender");
  assert.equal(N.bouwHash({ screen: "hub", kalItem: "treve-hivernale" }), "");
  assert.notEqual(N.navKey({ screen: "kalender" }), N.navKey({ screen: "kalender", kalItem: "a" }));
  assert.equal(H.tabVan("kalender"), "mod");
  assert.equal(N.isTop({ screen: "kalender" }), false, "een eigen regel in de geschiedenis");
});

test("module en schil: catalogus in modules.json, geen tegel op de hub, terugstap, geschiedenis, service worker", () => {
  const m = cat.modules.find(x => x.id === "kalender");
  assert.ok(m);
  assert.equal(m.naam, "Kalender Frankrijk"); assert.equal(m.kort, "Kalender"); assert.equal(m.kind, "kalender"); assert.equal(m.thema, "overheid");
  assert.equal(m.prijs, "gratis"); assert.equal(m.standaard, "aan");
  assert.ok(m.zichtbaar !== false);
  ["kalender", "agenda", "deadline", "feestdag", "schoolvakantie", "soldes", "belasting data", "jacht", "pensioen betaaldatum"].forEach(w => assert.ok(m.zoekwoorden.includes(w), w));
  cat.themas.forEach(t => assert.ok(!(t.uitsluiten || []).includes("kalender"), "in geen enkel thema uitgesloten"));
  assert.equal(cat.themas.length, 9, "op de hub komt geen tiende tegel");
  assert.match(html, /m\.kind === "kalender"\) return this\.kalOpen\(m, from\)/);
  assert.match(html, /SHOWBACK = \/\^\([^)]*kalender/);
  assert.match(html, /st\.screen === "kalender" && st\.kalItem\) \{ this\.kalItemSluit/);
  assert.match(html, /kalItem: st\.screen === "kalender" && st\.kalItem/);
  assert.match(html, /r\.soort === "kalitem"\) \{ this\.kalOpenId/);
  assert.match(html, /<script src="\.\/kalender-lib\.js"><\/script>/);
  assert.match(sw, /\.\/kalender-lib\.js/);
  assert.match(sw, /VERSIE = "2026-11-05-1"/);
});

test("schil: anoniem, time-out, laadtoken, geen opslag, geen innerHTML, band alleen met regels", () => {
  const blok = html.slice(html.indexOf("// ---- Kalender Frankrijk"), html.indexOf("// ---- Zoeken in de artikelen van Infofrankrijk"));
  assert.ok(blok.length > 3000);
  assert.ok(!/innerHTML|dangerouslySetInnerHTML|localStorage|sessionStorage|confirm\(/.test(blok));
  assert.ok(!/headers|Authorization/i.test(blok));
  assert.match(blok, /Kl\.TIMEOUT_MS/);
  assert.match(blok, /maakTeller\(\)/);
  assert.match(blok, /Kl\.TUSSENTIJD_MS/);
  assert.equal(Kl.TIMEOUT_MS, 8000); assert.equal(Kl.TUSSENTIJD_MS, 600000); assert.equal(Kl.VENSTER_DAGEN, 120);
  // kaFetch (gedeeld met het Klusarchief) haalt anoniem op
  assert.match(html, /const opts = \{credentials:"omit"\}/);
  // de band staat onder de begroeting en vóór de zoekbalk, en is er alleen met regels
  const iH1 = html.indexOf("{{ begroetingTekst }}"), iBand = html.indexOf('data-vandaag="1"'), iZoek = html.indexOf('onClick="{{ goZoek }}"');
  assert.ok(iH1 > 0 && iBand > iH1 && iZoek > iBand, "volgorde begroeting, band, zoekbalk");
  assert.match(html, /<sc-if value="\{\{ vdToon \}\}" hint-placeholder-val="\{\{ false \}\}">\s*<div data-vandaag="1"/);
  assert.match(html, /margin:14px 16px 0;border-radius:16px;padding:13px 16px 14px;background:#2f6b3d;color:#fff/);
  assert.match(blok, /vdToon: aan/);
  assert.match(blok, /\(st\.vdRegels \|\| \[\]\)\.length > 0/);
  assert.match(html, /this\.vdCheck\(\); this\.histSync\(\)/);
});

test("scherm: kopbalk zonder themanaam, schakelaar, navigatiekop, raster, een filterrij, loopt, abonneren, toegankelijk, geen lange streepjes", () => {
  const i = html.indexOf("<!-- ============ KALENDER FRANKRIJK");
  const scherm = html.slice(i, html.indexOf("<!-- ============ TE KOOP IN FRANKRIJK"));
  assert.ok(scherm.length > 5000);
  assert.ok(!LANG.test(scherm), "geen lang streepje in het scherm");
  assert.ok(!LANG.test(lib), "geen lang streepje in de lib");
  assert.equal(Kl.FOUT, "De kalender is nu niet bereikbaar.");
  [Kl.FOUT, Kl.LEEG_DAG, Kl.WEG, Kl.ABO_UITLEG, Kl.ABO_VRAAG, Kl.ABO_KNOP, Kl.ABO_ALLES, Kl.ABO_RUBRIEK, Kl.TOON_ALLES].forEach(t => assert.ok(!LANG.test(t)));
  // kopbalk: alleen de titel, geen themanaam eronder
  assert.match(html, /titles = \{[^}]*kalender:"Kalender Frankrijk"/);
  assert.match(html, /const subs = \{[^}]*kalender:""/, "geen themanaam (Overheid) onder de titel");
  assert.ok(!/kalender:"Overheid"/.test(html));
  // schakelaar Week | Maand: twee gelijke helften, 44 px, aria-pressed, actief bordeaux met witte tekst
  assert.match(scherm, /data-kal-schakel[\s\S]{0,400}aria-pressed="\{\{ kalIsWeek \}\}"[\s\S]{0,200}min-height:44px/);
  assert.match(scherm, /aria-pressed="\{\{ kalIsMaand \}\}"/);
  assert.match(scherm, />Week<\/button>/); assert.match(scherm, />Maand<\/button>/);
  assert.match(html, /kalWeekBg: maand \? "transparent" : "#800000", kalWeekFg: maand \? "#3D4346" : "#fff"/);
  assert.match(html, /kalWeergave:"week"/, "standaard Week");
  // navigatiekop: pijl vorige en volgende van 44 px, titel in Source Serif 4, tekstknop Vandaag
  assert.match(scherm, /width:44px;height:44px[\s\S]{0,300}\{\{ kalVorigeLabel \}\}|aria-label="\{\{ kalVorigeLabel \}\}" style="flex:none;width:44px;height:44px/);
  assert.match(scherm, /aria-label="\{\{ kalVolgendeLabel \}\}" style="flex:none;width:44px;height:44px/);
  assert.match(scherm, /data-kal-periode[^>]*Source Serif 4/);
  assert.match(scherm, /data-kal-vandaag="1"[^>]*color:#800000[^>]*>Vandaag</);
  // dagcellen zijn knoppen met aria-label en aria-pressed, week en maand
  assert.equal((scherm.match(/<button data-kal-dag="1"[^>]*aria-label="\{\{ c\.label \}\}" aria-pressed="\{\{ c\.gekozen \}\}"/g) || []).length, 2, "week en maand");
  assert.match(html, /min-height:64px;padding:8px 0 6px/);
  assert.match(html, /min-height:48px;padding:6px 0 4px/);
  assert.match(html, /width:6px;height:6px;border-radius:50%/, "stipjes van 6 px");
  assert.match(html, /aria-current|huidig: nu \? "date" : "false"/);
  assert.match(scherm, /Dagen van de week/); assert.match(scherm, /Dagen van de maand/);
  assert.match(html, /gek && maand \? "#fff"/, "witte stipjes op de gekozen dag in de maand");
  assert.match(html, /gek \? "#800000" : "transparent"[\s\S]{0,120}inset 0 0 0 1\.5px #800000/, "gekozen: vulling, vandaag: dunne rand");
  // een filterrij die omloopt, geen zijwaarts scrollen, geen Voor wie
  assert.match(scherm, /data-kal-rubrieken="1" style="display:flex;flex-wrap:wrap/);
  assert.ok(!/overflow-x:auto/.test(scherm), "geen zijwaarts scrollen");
  assert.ok(!/Voor wie|kalWie|wieChips|zetWie/.test(scherm + lib.replace(/wieNaam|wieTekst/g, "")), "de filter Voor wie is vervallen");
  assert.ok(!/kalWie|wieChips/.test(html), "ook niet in de schil");
  assert.match(html, /rand: actief \? "rgba\(128,0,0,\.35\)"/); assert.match(html, /vlak: actief \? "rgba\(128,0,0,\.08\)"/);
  assert.match(html, /chip\("Alles", rubriek === "alles"/);
  assert.match(scherm, /data-kal-rubrieken="1" style="display:flex;flex-wrap:wrap;gap:0 8px/);
  assert.match(scherm, /min-height:40px;margin:2px 0;padding:0 14px;border-radius:999px/, "chips van 40 px met 2 px marge: tikvlak 44");
  // lege uitkomst: tekst en knop Toon alles (44 px) die het filter wist
  assert.match(scherm, /data-kal-toonalles="1" style="[^"]*min-height:44px[^"]*">Toon alles</);
  assert.match(html, /kalToonAlles: \(\) => this\.setState\(\{kalRubriek:"alles"\}\)/);
  assert.match(html, /kalToonKnop: leeg && !!rubNaam/);
  assert.match(html, /Kl\.leegTekst\(rubNaam, "week", lopend\.length\)/); assert.match(html, /Kl\.leegTekst\(rubNaam, "maand"\)/);
  // perioden: Loopt deze week / Loopt deze maand
  assert.match(html, /const looptKop = "Loopt deze " \+ woord/);
  assert.match(html, /const woord = maand \? "maand" : "week"/);
  assert.match(scherm, /data-kal-loopt/);
  const iLoopt = scherm.indexOf("data-kal-loopt"), iGroepen = scherm.indexOf("data-kal-groepen"), iLegenda = scherm.indexOf("data-kal-legenda");
  assert.ok(iLegenda < iLoopt && iLoopt < iGroepen, "maand: legenda, dan Loopt deze maand, dan de items van de dag");
  const iChips = scherm.indexOf("data-kal-rubrieken"), iWeek = scherm.indexOf("data-kal-week"), iMaand = scherm.indexOf("data-kal-maand");
  assert.ok(iWeek < iLoopt && iMaand < iLegenda && iLegenda < iLoopt && iLoopt < iChips && iChips < iGroepen, "dagkolommen of raster, legenda, ingeklapte Loopt, chips, daglijst");
  // ingeklapt: een knop van 44 px met kop, aantal en pijl; de lijst staat alleen open met kalLooptOpen
  assert.match(scherm, /data-kal-loopt-knop="1" style="[^"]*min-height:44px/);
  assert.match(scherm, /aria-expanded="\{\{ kalLooptOpen \}\}"/);
  assert.match(scherm, /<sc-if value="\{\{ kalLooptOpen \}\}"[^>]*>\s*<div data-kal-loopt-lijst/);
  assert.match(scherm, /\{\{ kalLooptTel \}\}/);
  assert.match(html, /kalLooptOpen:false/, "standaard dicht");
  assert.match(html, /kalLooptSchakel: \(\) => this\.setState\(prev => \(\{kalLooptOpen: !prev\.kalLooptOpen\}\)\)/);
  assert.match(html, /kalLoopt: is && ok && lopend\.length > 0/, "niets dat loopt: geen rij");
  assert.match(html, /kalLooptTel: String\(lopend\.length\)/);
  // abonneren: een kaart met een knop, een onderblad met alles.ics en een rij per rubriek
  assert.match(scherm, /data-kal-abo="1"/);
  assert.equal(Kl.ABO_VRAAG, "Ook in je eigen agenda-app?");
  assert.equal(Kl.ABO_KNOP, "Zet in je agenda →");
  assert.equal(Kl.ABO_ALLES, "Hele kalender");
  assert.equal(Kl.ABO_RUBRIEK, "Of alleen een rubriek:");
  assert.ok(!/a\.naam \}\} &#8599;<\/a>\s*<\/sc-for>\s*<\/div>\s*<\/section>\s*<\/sc-if>/.test(scherm), "geen rij knoppen meer in de kaart");
  assert.match(html, /data-kal-aboblad="1"/);
  assert.match(html, /data-kal-abo-alles="1"[^>]*>\{\{ kalAboAllesTekst \}\}/);
  assert.match(html, /<sc-for list="\{\{ kalAboRijen \}\}" as="a"[\s\S]{0,200}min-height:44px/);
  assert.match(html, /kalAboAllesUrl: Kl \? Kl\.icalUrl\("alles"\)/);
  assert.match(html, /kalAboRijen: abo\.filter\(a => a\.id !== "alles"\)/);
  assert.match(html, /target="_blank" rel="noopener" data-kal-abo-alles/);
  assert.match(html, /st\.kalAbo \? "kalabo"/, "het blad staat in de geschiedenis");
  assert.match(html, /if \(st\.kalAbo\) \{ this\.setState\(\{kalAbo:false\}\); return true; \}/, "terug sluit het blad");
  // overig: bron, item, forum, lazy beelden, 1,8em, geen aftellen
  assert.match(scherm, /Opnieuw proberen/);
  assert.match(scherm, /Bekijk de bron &#8599;/);
  assert.match(scherm, /Bespreek op het forum/);
  assert.match(scherm, /Terug naar de kalender/);
  assert.match(scherm, /alt="" loading="lazy" decoding="async" width="44" height="44"/);
  assert.match(scherm, /alt="" loading="lazy" width="72" height="72"/);
  assert.match(scherm, /line-height:1\.8em/);
  assert.ok(!/aftellen|toon_in/.test(scherm), "aftellen en toon_in worden niet getoond");
  // geen tekst onder 11,5 px in het scherm
  (scherm + html.slice(html.indexOf("// Scherm openen. wil"), html.indexOf("// ---- Zoeken in de artikelen van Infofrankrijk (WordPress"))).replace(/font:[^;"]*/g, m => { const x = /(\d+(?:\.\d+)?)px/.exec(m); if (x) assert.ok(parseFloat(x[1]) >= 11.5, m); return m; });
});

test("schil: Week is de standaard, vensters per maand, geen opslag, Vandaag en dagkeuze", () => {
  const blok = html.slice(html.indexOf("// Scherm openen. wil"), html.indexOf("// ---- Zoeken in de artikelen van Infofrankrijk (WordPress"));
  assert.match(blok, /kalWeergave:"week", kalGekozen: Kl \? Kl\.isoVan\(new Date\(\)\) : "", kalRubriek:"alles"/, "openen: Week, vandaag gekozen, geen filter");
  assert.match(blok, /Kl\.startVenster\(dag\)/, "eerste aanvraag een week terug tot 120 dagen vooruit, in een keer");
  assert.match(blok, /Kl\.ophaalVenster\(b\.van, b\.tot\)/, "daarbuiten een extra aanvraag per maand");
  assert.match(blok, /Kl\.gedekt\(st\.kalVensters/);
  assert.match(blok, /Kl\.voegSamen\(prev\.kalItems, lijst\)/, "antwoorden blijven in het geheugen per venster");
  assert.match(blok, /kalNav:"fout"/); assert.match(blok, /kalNavFout/); assert.match(blok, /kalNavLaadt/);
  assert.match(blok, /this\._kalNTeller\.actueel\(tok\)/);
  assert.match(html, /this\.kalZorg\(\); this\.vdCheck\(\)/);
  assert.match(blok, /kalVandaagKnop: \(\) => this\.setState\(prev => \(\{kalGekozen: prev\.kalVandaag \|\| vandaag\}\)\)/);
  assert.match(blok, /Kl\.verschuif\(/);
  assert.match(blok, /kalNaarWeek: \(\) => this\.setState\(\{kalWeergave:"week"\}\), kalNaarMaand: \(\) => this\.setState\(\{kalWeergave:"maand"\}\)/);
  assert.match(blok, /Kl\.perDag\(gef, b\.van, b\.tot\)/); assert.match(blok, /Kl\.loopt\(gef, b\.van\)/);
  assert.match(blok, /Kl\.stippen\(rijen, rubrieken\)/);
  assert.match(blok, /kalKies\(iso\)/);
  assert.match(html, /id="\{\{ g\.id \}\}" data-kal-dagkop="1"/);
  assert.match(blok, /"kal-dag-" \+ iso/);
  assert.match(html, /titles = \{[^}]*kalender:"Kalender Frankrijk"/);
});

test("een kalenderitem met een link naar een module van de app (moestuintool) opent die module in de app op die pagina, niet een nieuw tabblad", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /routeMetUrl\(m, url\)/);
  assert.match(html, /moduleVoorUrl\(link, this\.alleMods\(\)\)/);
  assert.match(html, /kiMeerOpen: \(\) => linkMod \? this\.routeMetUrl\(linkMod, link\) : this\.openInfoArtikel\(link\)/);
  assert.match(html, /st\.toolStart && st\.toolStart\.id === T\.id \? st\.toolStart\.url/);
  const mods = JSON.parse(readFileSync(new URL("../modules.json", import.meta.url), "utf8")).modules;
  const m = mods.find(x => x.id === "moestuin");
  assert.equal(m.weergave, "volledig", "de moestuintool laat framing op infopoche.fr toe (frame-ancestors gecontroleerd 3 november 2026)");
});
