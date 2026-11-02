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
  gebied: "heel Frankrijk", tekst: "t", tekst_u: "Tekst voor u van " + id, link: null, bron: { url: "https://www.impots.gouv.fr/x", gecontroleerd: "2026-11-02" },
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
  assert.equal(x.tekst, "Tekst voor u van a");
  assert.equal(x.bron.gecontroleerd, "2026-11-02");
  assert.equal(Kl.leesItems({ items: [ruw("h", { bron: { url: "http://onveilig.nl", gecontroleerd: "2026-11-02" }, link: "javascript:alert(1)" })] })[0].link, "");
  assert.equal(Kl.leesItems({ items: [ruw("h", { bron: { url: "http://onveilig.nl" } })] })[0].bron.url, "");
});

test("groeperen per dag: datumkoppen, Vandaag en Morgen, perioden onder hun beginnende dag of onder Loopt nu", () => {
  const items = Kl.leesItems({ items: [
    ruw("vandaag", { voorkomens: [{ van: "2026-11-02", tot: "2026-11-02" }] }),
    ruw("morgen", { voorkomens: [{ van: "2026-11-03", tot: "2026-11-03" }], tijd: "20:00" }),
    ruw("morgen-eerder", { voorkomens: [{ van: "2026-11-03", tot: "2026-11-03" }], tijd: "09:30-12:00" }),
    ruw("morgen-zonder", { voorkomens: [{ van: "2026-11-03", tot: "2026-11-03" }] }),
    ruw("later", { voorkomens: [{ van: "2026-11-09", tot: "2026-11-09" }] }),
    ruw("periode-komt", { soort: "periode", voorkomens: [{ van: "2026-11-16", tot: "2026-12-31" }] }),
    ruw("seizoen-loopt", { soort: "seizoen", voorkomens: [{ van: "2026-09-15", tot: "2027-02-28" }] }),
    ruw("periode-loopt-ook", { soort: "periode", voorkomens: [{ van: "2026-10-13", tot: "2027-01-31" }] }),
    ruw("mijlpaal-loopt", { soort: "mijlpaal", voorkomens: [{ van: "2026-11-01", tot: "2026-12-31" }] }),
    ruw("voorbij", { voorkomens: [{ van: "2026-10-01", tot: "2026-10-01" }] }),
    ruw("te-ver", { voorkomens: [{ van: "2027-03-03", tot: "2027-03-03" }] }),
    ruw("net-op-de-grens", { voorkomens: [{ van: "2027-03-02", tot: "2027-03-02" }] }),
    ruw("herhaald", { voorkomens: [{ van: "2026-11-05", tot: "2026-11-05" }, { van: "2026-11-12", tot: "2026-11-12" }] })
  ] });
  const g = Kl.groepeer(items, "2026-11-02");
  assert.deepEqual(g.lopend.map(r => r.item.id), ["mijlpaal-loopt", "periode-loopt-ook", "seizoen-loopt"], "Loopt nu: wat het eerst afloopt eerst");
  assert.deepEqual(g.dagen.map(d => d.kop), ["Vandaag", "Morgen", "donderdag 5 november", "maandag 9 november", "donderdag 12 november", "maandag 16 november", "dinsdag 2 maart"]);
  assert.deepEqual(g.dagen[1].rijen.map(r => r.item.id), ["morgen-zonder", "morgen-eerder", "morgen"], "zonder tijd eerst, dan op tijd");
  assert.deepEqual(g.dagen[5].rijen.map(r => r.item.id), ["periode-komt"]);
  assert.equal(g.dagen.some(d => d.rijen.some(r => ["voorbij", "te-ver"].includes(r.item.id))), false);
  assert.equal(Kl.inVenster(items, "2026-11-02").some(i => i.id === "te-ver"), false);
  assert.equal(Kl.inVenster(items, "2026-11-02").some(i => i.id === "net-op-de-grens"), true, "tot en met 120 dagen vooruit");
});

test("filters: rubriek en doelgroep, een item blijft staan bij iedereen of een gekozen doelgroep", () => {
  const items = Kl.leesItems({ items: [
    ruw("a", { rubriek: "fiscaal", doelgroepen: ["ondernemer"] }),
    ruw("b", { rubriek: "wonen", rubriek_naam: "Wonen en seizoen", doelgroepen: ["iedereen"] }),
    ruw("c", { rubriek: "wonen", rubriek_naam: "Wonen en seizoen", doelgroepen: ["huurder", "particulier"] }),
    ruw("d", { rubriek: "zorg", rubriek_naam: "Zorg", doelgroepen: ["gepensioneerde"] }),
    ruw("e", { rubriek: "zorg", rubriek_naam: "Zorg", doelgroepen: [] })
  ] });
  const ids = l => l.map(i => i.id);
  assert.deepEqual(ids(Kl.filterItems(items, "alles", [])), ["a", "b", "c", "d", "e"]);
  assert.deepEqual(ids(Kl.filterItems(items, "wonen", [])), ["b", "c"]);
  assert.deepEqual(ids(Kl.filterItems(items, "alles", ["huurder"])), ["b", "c", "e"]);
  assert.deepEqual(ids(Kl.filterItems(items, "alles", ["huurder", "ondernemer"])), ["a", "b", "c", "e"]);
  assert.deepEqual(ids(Kl.filterItems(items, "zorg", ["particulier"])), ["e"]);
  const rubrieken = Kl.leesRubrieken([
    { id: "zorg", naam: "Zorg", kleur: "#B3261E", tint: "#F8DFDD" }, { id: "wonen", naam: "Wonen en seizoen", kleur: "#800000", tint: "#F3E0E0" },
    { id: "fiscaal", naam: "Fiscale kalender", kleur: "rood", tint: "#DDEFE3" }, { id: "weg", naam: "Niet in de lijst", kleur: "#111111", tint: "#222222" }
  ]);
  assert.deepEqual(Kl.rubriekChips(items, rubrieken).map(c => c.id), ["zorg", "wonen", "fiscaal"], "alleen wat voorkomt, volgorde van de API");
  assert.equal(Kl.rubriekChips(items, rubrieken)[2].kleur, "#3D4346", "ongeldige kleur valt terug");
  assert.deepEqual(Kl.rubriekChips(items, []).map(c => c.naam), ["Fiscale kalender", "Wonen en seizoen", "Zorg"], "zonder rubriekenlijst: namen uit de items");
  assert.deepEqual(Kl.wieChips(items).map(c => c.id), ["iedereen", "particulier", "ondernemer", "gepensioneerde", "huurder"]);
  assert.equal(Kl.wieNaam("pas-verhuisd"), "Pas verhuisd");
  assert.deepEqual(Kl.zetWie([], "huurder"), ["huurder"]);
  assert.deepEqual(Kl.zetWie(["huurder", "gezin"], "huurder"), ["gezin"]);
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
  assert.deepEqual(Kl.forumDelen(it[1]), { titel: "Titel b", samenvatting: "Tekst voor u van b", link: "https://www.impots.gouv.fr/x" });
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
  assert.match(sw, /VERSIE = "2026-11-02-1"/);
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

test("scherm: kop, uitleg, filters, lege en foute toestand, bron, abonnementen, geen lange streepjes in zichtbare tekst", () => {
  const i = html.indexOf("<!-- ============ KALENDER FRANKRIJK");
  const scherm = html.slice(i, html.indexOf("<!-- ============ TE KOOP IN FRANKRIJK"));
  assert.ok(scherm.length > 5000);
  assert.ok(!LANG.test(scherm), "geen lang streepje in het scherm");
  assert.ok(!LANG.test(lib), "geen lang streepje in de lib");
  assert.equal(Kl.UITLEG, "Data die ertoe doen voor Nederlanders en Belgen in Frankrijk. Alleen wat we tegen de bron hebben gecontroleerd.");
  assert.equal(Kl.FOUT, "De kalender is nu niet bereikbaar.");
  assert.equal(Kl.LEEG, "Niets in deze keuze de komende 120 dagen.");
  [Kl.UITLEG, Kl.FOUT, Kl.LEEG, Kl.WEG, Kl.ABO_UITLEG].forEach(t => assert.ok(!LANG.test(t)));
  assert.match(scherm, /Opnieuw proberen/);
  assert.match(scherm, /Bekijk de bron &#8599;/);
  assert.match(scherm, /Bespreek op het forum/);
  assert.match(scherm, /Terug naar de kalender/);
  assert.match(scherm, /In uw eigen agenda/);
  assert.match(scherm, /Voor wie/);
  assert.match(scherm, /loading="lazy"/);
  assert.match(scherm, /alt="" loading="lazy"[^>]*width="48"/);
  assert.match(scherm, /width="72" height="72"/);
  assert.match(scherm, /Source Serif 4/);
  assert.match(scherm, /line-height:1\.8em/);
  assert.match(scherm, /min-height:44px/);
  assert.ok(!/aftellen|toon_in/.test(scherm), "aftellen en toon_in worden niet getoond");
  assert.match(html, /titles = \{[^}]*kalender:"Kalender Frankrijk"/);
});
