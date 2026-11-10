// Scherm Infofrankrijk (10 november 2026): url-bouwers, antwoord lezen, entiteiten, datum, bedrading.
// Draaien: node --test tests/infofr.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const I = require("../infofr-lib.js");
const Nv = require("../nav-lib.js");
const lees = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const html = lees("index.html"), sw = lees("sw.js"), cat = JSON.parse(lees("modules.json"));

const B = "https://infofrankrijk.com/wp-json/wp/v2";
const VELDEN = "id,title,link,date,excerpt,categories,featured_media,yoast_head_json.description,yoast_head_json.twitter_misc";
const lijst = JSON.parse(lees("tests/fixture-infofr-lijst.json")), media = JSON.parse(lees("tests/fixture-infofr-media.json"));
const chipsData = JSON.parse(lees("tests/fixture-infofr-chips.json")), catData = JSON.parse(lees("tests/fixture-infofr-cat.json"));
test("url-bouwers", () => {
  assert.equal(I.nieuwsteUrl(), B + "/posts?per_page=20&page=1&_fields=" + VELDEN);
  assert.equal(I.rubriekUrl([563, 343], 2), B + "/posts?per_page=20&categories=563,343&page=2&_fields=" + VELDEN);
  assert.equal(I.lijstUrl([18], 1), B + "/posts?per_page=20&categories=18&page=1&_fields=" + VELDEN);
  assert.equal(I.rubriekUrl([], 1), null);
  assert.equal(I.rubriekUrl(["x", -3, 1.5, "7"], 1).includes("categories=7&"), true);
  assert.equal(I.mediaUrl([5, 6, "x"]), B + "/media?include=5,6&per_page=2&_fields=id,media_details");
  assert.equal(I.mediaUrl([]), null);
  assert.ok(!/og_image|_embed/.test(I.mediaUrl([5])));
  assert.equal(I.chipsUrl(361), B + "/categories?parent=361&_fields=id,name,count,link&per_page=50");
  assert.equal(I.chipsUrl("x"), null);
  assert.equal(I.categorieUrl([361]), B + "/categories?include=361&_fields=id,name,link&per_page=1");
});
test("entiteiten en tags worden platte tekst; lange streepjes worden komma", () => {
  assert.equal(I.decodeer("A &#038; B &#8220;citaat&#8221; &amp; &eacute;"), 'A & B “citaat” & é');
  assert.equal(I.decodeer("De hoofdschakelaar "), "De hoofdschakelaar");
  assert.equal(I.decodeer("Pas op &#8211; <b>vet</b> &lt;script&gt;"), "Pas op, vet <script>");
  assert.equal(I.decodeer("Wacht \u2014 en zie \u2013 dit &mdash; ook"), "Wacht, en zie, dit, ook");
  assert.equal(I.decodeer("2012 &#8211; 2020"), "2012-2020");
  assert.equal(I.decodeer("&onbekend; blijft"), "&onbekend; blijft");
  assert.equal(I.decodeer(null), "");
});
test("datum dd-mm-jjjj en voluit", () => {
  assert.equal(I.datumNl("2026-11-06T08:50:00"), "06-11-2026");
  assert.equal(I.datumNl(""), "");
  assert.equal(I.datumNl("onzin"), "");
  assert.equal(I.datumVoluit("2026-11-06T08:50:00"), "6 november 2026");
  assert.equal(I.datumVoluit("2026-01-02"), "2 januari 2026");
  assert.equal(I.datumVoluit("2026-13-02"), "");
  assert.equal(I.datumVoluit(""), "");
});
test("alleen https-links op infofrankrijk.com", () => {
  for (const u of ["https://infofrankrijk.com/a/", "https://www.infofrankrijk.com/b/"]) assert.ok(I.linkOk(u), u);
  for (const u of ["http://infofrankrijk.com/a/", "https://infofrankrijk.com.evil.nl/a", "https://evil.nl/infofrankrijk.com/", "javascript:alert(1)", "", null, "https://infofrankrijk.com/a b"]) assert.ok(!I.linkOk(u), String(u));
});
test("echt antwoord wordt gelezen; kapotte rijen vallen af", () => {
  const r = I.leesLijst(lijst);
  assert.equal(r.length, lijst.length);
  for (const x of r) { assert.ok(x.titel && !/&#?\w+;/.test(x.titel)); assert.ok(I.linkOk(x.url)); assert.match(x.datum, /^\d{2}-\d{2}-\d{4}$/); assert.ok(x.datumVoluit && x.slug); assert.ok(!/[–—]/.test(x.samenvatting + x.titel)); }
  assert.equal(I.leesLijst([{title:{rendered:"A &#038; B &#8220;x&#8221;"}, link:"https://infofrankrijk.com/e/"}])[0].titel, "A & B “x”");
  const k = I.leesLijst([{title:{rendered:""}, link:"https://infofrankrijk.com/x/"}, {title:{rendered:"Zonder link"}}, {title:{rendered:"Buiten"}, link:"https://andere.nl/x"},
    {id:7, title:{rendered:"Goed"}, link:"https://infofrankrijk.com/g/", date:"2026-01-02T00:00:00"}, {title:{rendered:"Dubbel"}, link:"https://infofrankrijk.com/g/"}, null]);
  assert.equal(k.length, 1);
  assert.deepEqual([k[0].titel, k[0].url, k[0].slug, k[0].datum, k[0].datumVoluit, k[0].leestijd, k[0].media], ["Goed", "https://infofrankrijk.com/g/", "g", "02-01-2026", "2 januari 2026", "", 0]);
  assert.deepEqual(I.leesLijst({fout:1}), []);
});
test("samenvatting: Yoast-beschrijving, anders excerpt, behalve een excerpt dat met 1. begint", () => {
  assert.equal(I.kiesSamenvatting({yoast_head_json:{description:"Yoast &amp; zo"}, excerpt:{rendered:"<p>Excerpt</p>"}}), "Yoast & zo");
  assert.equal(I.kiesSamenvatting({yoast_head_json:{description:""}, excerpt:{rendered:"<p>Excerpt tekst</p>"}}), "Excerpt tekst");
  assert.equal(I.kiesSamenvatting({excerpt:{rendered:"<p>Excerpt tekst</p>"}}), "Excerpt tekst");
  assert.equal(I.kiesSamenvatting({excerpt:{rendered:"<p>1.   Een titel 2. Twee</p>"}}), "");
  assert.equal(I.kiesSamenvatting({}), "");
});
test("leestijd: alleen als de bron hem geeft", () => {
  assert.equal(I.leestijd({yoast_head_json:{twitter_misc:{"Geschatte leestijd":"12 minuten"}}}), "12 min lezen");
  assert.equal(I.leestijd({yoast_head_json:{twitter_misc:{"Geschatte leestijd":"1 minuut"}}}), "1 min lezen");
  assert.equal(I.leestijd({yoast_head_json:{twitter_misc:{}}}), "");
  assert.equal(I.leestijd({yoast_head_json:{twitter_misc:{"Geschatte leestijd":"0 minuten"}}}), "");
  assert.equal(I.leestijd({}), "");
  const r = I.leesLijst(lijst).find(x => x.url.includes("cak-vroegpensioen") || x.titel.startsWith("CAK, vroegpensioen"));
  assert.equal(r.leestijd, "16 min lezen");
});
test("reeksen: sleutel, samenvoegen vanaf drie, kaart met de titel gelijk aan de sleutel, eerlijke telling", () => {
  const r = I.leesLijst(lijst), k = I.voegReeksenSamen(r);
  const reeks = k.filter(x => x.n >= 3);
  assert.equal(reeks.length, 1);
  assert.equal(reeks[0].item.titel, "De Franse elektrische installatie");
  assert.equal(reeks[0].reeks, "De Franse elektrische installatie");
  assert.equal(reeks[0].n, 10, "de genummerde inhoudsopgave in de excerpt zegt 10 delen");
  assert.ok(k.length < r.length);
  const maak = (t, key) => ({titel: t, reeks: key, reeksLengte: 0});
  const drie = I.voegReeksenSamen([maak("Deel 2", "Serie"), maak("Serie", "Serie"), maak("Los", ""), maak("Deel 3", "Serie")]);
  assert.deepEqual(drie.map(x => [x.item.titel, x.n]), [["Serie", 3], ["Los", 1]]);
  const twee = I.voegReeksenSamen([maak("A", "S"), maak("B", "S")]);
  assert.deepEqual(twee.map(x => [x.item.titel, x.n]), [["A", 1], ["B", 1]], "minder dan drie blijven los");
  const zonder = I.voegReeksenSamen([maak("Deel 2", "S"), maak("Deel 3", "S"), maak("Deel 4", "S")]);
  assert.deepEqual([zonder[0].item.titel, zonder[0].n], ["Deel 2", 3], "zonder gelijke titel het eerste item");
  assert.equal(I.reeksSleutel({excerpt:{rendered:"<p>1.   De Franse elektrische installatie 2.   De meter 3. X</p>"}}), "De Franse elektrische installatie");
  assert.equal(I.reeksSleutel({excerpt:{rendered:"<p>Gewone tekst</p>"}}), "");
  assert.deepEqual(I.voegReeksenSamen(null), []);
});
test("tool-herkenning: slug gelijk aan het artikel-veld van een zichtbare module, of de kalender", () => {
  const slugs = I.toolSlugs(cat.modules.filter(m => m.zichtbaar !== false));
  const r = I.leesLijst(lijst), isT = t => I.isTool(r.find(x => x.titel === t), slugs);
  assert.ok(isT("Kalender Frankrijk"));
  assert.ok(isT("Uit het klusforum van Infofrankrijk.com"));
  assert.ok(!isT("CAK, vroegpensioen en zorg in Frankrijk"));
  assert.ok(!I.isTool(null, slugs));
  const weg = I.toolSlugs([{artikel:"https://infofrankrijk.com/verborgen-tool/", zichtbaar:false}, {artikel:"https://infofrankrijk.com/zichtbaar-tool/"}]);
  assert.deepEqual([!!weg["verborgen-tool"], !!weg["zichtbaar-tool"], !!weg["kalender-frankrijk"]], [false, true, true]);
});
test("media: alleen thumbnail of medium, https, nooit zonder sizes", () => {
  const m = I.leesMedia(media);
  assert.ok(Object.keys(m).length >= 5);
  for (const u of Object.values(m)) assert.match(u, /^https:\/\/infofrankrijk\.com\/.+150x150/);
  assert.deepEqual(I.leesMedia([{id:1, media_details:{}}, {id:2}, {id:3, media_details:{sizes:{full:{source_url:"https://x.nl/a.jpg"}}}}, {id:4, media_details:{sizes:{medium:{source_url:"https://x.nl/m.jpg"}}}},
    {id:5, media_details:{sizes:{thumbnail:{source_url:"http://x.nl/t.jpg"}}}}, null]), {4:"https://x.nl/m.jpg"});
  assert.deepEqual(I.leesMedia({fout:1}), {});
  const r = I.leesLijst(lijst).filter(x => x.media);
  assert.ok(r.length >= 1 && r.every(x => typeof x.media === "number"));
});
test("chips en categorielink", () => {
  assert.deepEqual(I.leesChips([chipsData]), [{id:362, naam:"Bankieren"}, {id:18, naam:"Belastingen"}, {id:42, naam:"Verzekeringen"}]);
  assert.deepEqual(I.leesChips([[{id:1, name:"Leeg", count:0}, {id:2, name:"A &amp; B", count:3}], [{id:2, name:"A", count:3}, {id:3, name:"C", count:1}]]), [{id:2, naam:"A & B"}, {id:3, naam:"C"}]);
  assert.deepEqual(I.leesChips([null, {fout:1}]), []);
  assert.equal(I.leesCategorieLink(catData), "https://infofrankrijk.com/categorie/geldzaken-belasting/");
  assert.equal(I.leesCategorieLink([{link:"https://evil.nl/x"}]), "");
  assert.equal(I.leesCategorieLink(null), "");
});
test("aantal pagina's", () => {
  assert.equal(I.aantalPaginas("15", 1, 20), 15);
  assert.equal(I.aantalPaginas(null, 1, 20), 2);
  assert.equal(I.aantalPaginas(null, 3, 7), 3);
  assert.equal(I.aantalPaginas("0", 1, 3), 1);
});
test("catalogus: acht onderwerpen met regel, icoon, thema en categorieen; vier gidsen met bestemming", () => {
  const o = I.leesOnderwerpen(cat.infofrankrijk);
  assert.deepEqual(o.map(x => x.titel), ["Geld en belasting", "Overheden", "Zorg en welzijn", "Wonen", "Vastgoed", "Verbouwen", "Ondernemen", "Emigreren"]);
  assert.deepEqual(o.map(x => x.categorieen), [[361], [26], [49], [47], [355], [39], [22], [563, 343]]);
  assert.equal(o[0].regel, "Bankieren, belastingen, verzekeringen");
  assert.equal(o[2].regel, "Zorgverzekering, apotheek, ouderenzorg, overlijden");
  const themas = cat.themas.map(t => t.id);
  for (const x of o) { assert.ok(x.regel && x.icoon && themas.includes(x.thema), x.titel); if (x.tools) assert.ok(themas.includes(x.tools), x.titel); }
  assert.equal(o[0].tools, "geld");
  assert.deepEqual(I.leesOnderwerpen({onderwerpen:[{titel:"", categorieen:[1]}, {titel:"Leeg", categorieen:[]}, null]}), []);
  assert.deepEqual(I.leesOnderwerpen(null), []);
  const g = I.leesGidsen(cat.infofrankrijk);
  assert.deepEqual(g.map(x => x.titel), ["La Maison", "Klussen in Frankrijk", "Ouder worden in Frankrijk", "Kalender Frankrijk"]);
  assert.deepEqual(g.map(x => x.scherm || x.module), ["lamaison", "klussen", "ouderen", "kalender"]);
  for (const x of g) { assert.ok(x.regel && x.icoon && themas.includes(x.thema), x.titel); }
  assert.ok(cat.modules.some(m => m.id === "klussen") && cat.modules.some(m => m.id === "kalender"));
  assert.ok(cat.gezondheid.onderwerpen.some(x => x.scherm === "ouderen"));
  assert.deepEqual(I.leesGidsen({gidsen:[{titel:"Zonder bestemming"}, null]}), []);
  const iconen = [...o, ...g].map(x => x.icoon);
  for (const k of iconen) assert.ok(new RegExp("^  " + k + ": '", "m").test(html), "icoon " + k + " staat in THEMA_ICONS");
});
test("bedrading: hash, navKey, tab, scripts, service worker", () => {
  assert.deepEqual(Nv.parseHash("#/infofrankrijk"), {soort:"scherm", scherm:"infofr"});
  assert.equal(Nv.bouwHash({screen:"infofr", ifOnd:"3"}), "#/infofrankrijk");
  assert.notEqual(Nv.navKey({screen:"infofr", ifOnd:""}), Nv.navKey({screen:"infofr", ifOnd:"2"}));
  assert.equal(require("../hub-lib.js").tabVan("infofr"), "hub");
  assert.match(html, /<script src="\.\/infofr-lib\.js"><\/script>/);
  assert.ok(sw.includes('"./infofr-lib.js"'));
  assert.match(html, /SHOWBACK = \/\^\([^)]*\|infofr\|/);
  assert.ok(!/KOP_H1 = \[[^\]]*infofr/.test(html));
  assert.ok(html.includes('open:() => this.go("infofr")'));
  assert.ok(html.includes('ifOnd: st.screen === "infofr"'));
  assert.ok(html.includes('st.screen === "infofr" && st.ifOnd'));
  assert.ok(sw.includes('const VERSIE = "2026-11-10-8"') || /const VERSIE = "2026-11-(1[0-9]|[23]\d)-\d+"/.test(sw));
});
test("scherm: geen lange streepjes, geen innerHTML, beeld lazy met onError", () => {
  const blok = html.slice(html.indexOf("INFOFRANKRIJK (dossiers"), html.indexOf("TE KOOP IN FRANKRIJK (advertenties"));
  assert.ok(blok.length > 1000 && !/[–—]/.test(blok));
  assert.ok(/<img[^>]*loading="lazy"[^>]*onError="\{\{ r\.beeldFout \}\}"/.test(blok), "beeld met loading lazy en onError");
  assert.ok(!/allow="\{\{/.test(blok));
  const van = html.indexOf("// ---- Scherm Infofrankrijk"), code = html.slice(van, html.indexOf("// Tabnavigatie verlaat de module", van));
  assert.ok(code.length > 1000 && !/innerHTML/.test(code) && code.includes('credentials:"omit"'));
  assert.ok(!/[–—]/.test(lees("infofr-lib.js").replace(/\\u201[34]/g, "")));
});

test("scherm: teksten van het ontwerp staan er", () => {
  for (const t of ["DOSSIERS EN GIDSEN, SINDS 2001", "Uitleg over wonen, geld, zorg en regels in Frankrijk, in het Nederlands.", "GROTE GIDSEN", "ONDERWERPEN", "NIEUW OP INFOFRANKRIJK", "Opent in de app", "Rekenen en regelen", "Toon meer"])
    assert.ok(html.includes(t), t);
  assert.ok(html.includes("Reeks in \" + k.n + \" delen"));
  assert.ok(html.includes("De tools bij \" + tTh.naam + \" in de app"));
});

test("reeks: hoofdstukken met 'Hoofdstuk N van <reeks>' in de samenvatting horen erbij", () => {
  const I = require("../infofr-lib.js");
  const k = "De Franse elektrische installatie";
  const items = [
    {titel:k, samenvatting:"Intro", reeks:k, reeksLengte:10},
    {titel:"De aarding", samenvatting:"x", reeks:k},
    {titel:"De groepenkast", samenvatting:"De groepenkast. Hoofdstuk 3 van de Franse elektrische installatie.", reeks:""},
    {titel:"Los", samenvatting:"Iets anders", reeks:""}];
  const uit = I.voegReeksenSamen(items);
  assert.equal(uit.length, 2);
  assert.equal(uit[0].n, 10);
});

test("verwijskaart bij alle acht onderwerpen (tools of toolsModule)", () => {
  const cat = JSON.parse(readFileSync(new URL("../modules.json", import.meta.url), "utf8"));
  const ids = cat.modules.map(m => m.id), themas = cat.themas.map(t => t.id);
  for (const o of cat.infofrankrijk.onderwerpen) assert.ok((o.tools && themas.includes(o.tools)) || (o.toolsModule && ids.includes(o.toolsModule)), o.titel);
});
