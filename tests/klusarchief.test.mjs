import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const K = require("../klusarchief-lib.js");
const N = require("../nav-lib.js");
const H = require("../hub-lib.js");
const cat = JSON.parse(readFileSync(join(root, "modules.json"), "utf8"));
const html = readFileSync(join(root, "index.html"), "utf8");
const lib = readFileSync(join(root, "klusarchief-lib.js"), "utf8");

test("URL's: een basis op een plek, term gevalideerd en gecodeerd", () => {
  assert.equal((lib.match(/supabase\.co/g) || []).length, 1);
  assert.equal(html.includes("supabase.co/functions/v1/klusarchief"), false, "de URL staat niet in de schil");
  assert.equal(K.zoekUrl("septic tank", 0), K.BASIS + "?q=septic%20tank&p=0&bron=alles");
  assert.equal(K.zoekUrl("  septic   tank ", 2), K.BASIS + "?q=septic%20tank&p=2&bron=alles");
  assert.equal(K.zoekUrl("a", 0), null);
  assert.equal(K.zoekUrl("  ", 0), null);
  assert.equal(K.zoekUrl("é&=#", -3), K.BASIS + "?q=%C3%A9%26%3D%23&p=0&bron=alles");
  assert.equal(decodeURIComponent(K.zoekUrl("x".repeat(300), 0).split("q=")[1].split("&")[0]).length, 120);
  assert.equal(K.draadUrl(199356), K.BASIS + "?id=199356");
  assert.equal(K.draadUrl("../x"), null);
  assert.equal(K.draadUrl(undefined), null);
  assert.equal(K.draadUrl(-1), null);
});

test("meldBody: vaste reden, alleen een veilig id", () => {
  assert.deepEqual(JSON.parse(K.meldBody(12)), { id: 12, reden: "naam of persoonsgegeven" });
  assert.equal(K.meldBody("a b"), null);
});

test("soortAntwoord", () => {
  assert.equal(K.soortAntwoord(200, { ok: true }), "ok");
  assert.equal(K.soortAntwoord(400, { ok: false, fout: "kort" }), "kort");
  assert.equal(K.soortAntwoord(429, { fout: "druk" }), "druk");
  assert.equal(K.soortAntwoord(404, null), "weg");
  assert.equal(K.soortAntwoord(500, null), "fout");
  assert.equal(K.soortAntwoord(0, null), "fout");
  assert.equal(K.soortAntwoord(200, null), "fout");
  assert.equal(K.soortAntwoord(200, { ok: false }), "fout");
});

test("leesZoek: item zonder id of titel valt af, vorm gecontroleerd", () => {
  const l = K.leesZoek({ ok: true, totaal: 13, pagina: 0, perPagina: 10, resultaten: [
    { id: 1, titel: " Septic  tank ", jaar: 2013, forum: "Bouwen", antwoorden: 17, fragment: "a [[b]] c" },
    { id: 2, titel: "", jaar: 2014 }, { titel: "zonder id" }, null, "x",
    { id: "3", titel: "Derde", antwoorden: "x" }] });
  assert.equal(l.totaal, 13);
  assert.deepEqual(l.resultaten.map(r => r.id), ["1", "3"]);
  assert.equal(l.resultaten[0].titel, "Septic tank");
  assert.equal(l.resultaten[1].antwoorden, 0);
  assert.equal(K.leesZoek(null), null);
  assert.equal(K.leesZoek({ ok: false }), null);
  assert.equal(K.leesZoek({ ok: true, resultaten: "nee" }), null);
  assert.equal(K.leesZoek({ ok: true, totaal: 0, resultaten: [] }).resultaten.length, 0);
});

test("leesDraad: titel en id nodig, lege reacties vallen af", () => {
  const d = K.leesDraad({ ok: true, draad: { id: 5, titel: "Lek", jaar: 2018, datum: "2018-08-23", forum: "Klussen", tekst: "Hoi\n\nDag",
    antwoorden: [{ datum: "2018-08-24", tekst: "Reactie" }, { datum: "x", tekst: "  " }, { datum: "2018-09-01T10:00:00Z", tekst: "Nog een" }] } });
  assert.equal(d.id, "5"); assert.equal(d.datum, "23-08-2018");
  assert.deepEqual(d.antwoorden.map(a => a.datum), ["24-08-2018", "01-09-2018"]);
  assert.equal(K.leesDraad({ ok: true, draad: { id: 5 } }), null);
  assert.equal(K.leesDraad({ ok: true, draad: { titel: "x" } }), null);
  assert.equal(K.leesDraad({ ok: true }), null);
  assert.equal(K.leesDraad({ ok: true, draad: { id: 1, titel: "T" } }).antwoorden.length, 0);
});

test("segmenten: [[ ]] wordt vet, randgevallen houden de tekst", () => {
  assert.deepEqual(K.segmenten("de [[septic]] [[tank]] is"), [{ t: "de ", vet: false }, { t: "septic", vet: true }, { t: " ", vet: false }, { t: "tank", vet: true }, { t: " is", vet: false }]);
  assert.deepEqual(K.segmenten("zonder haken"), [{ t: "zonder haken", vet: false }]);
  assert.deepEqual(K.segmenten("open [[ zonder sluiting"), [{ t: "open  zonder sluiting", vet: false }]);
  assert.deepEqual(K.segmenten("sluit ]] zonder open"), [{ t: "sluit  zonder open", vet: false }]);
  assert.deepEqual(K.segmenten("[[a [[b]] c]]"), [{ t: "a b", vet: true }, { t: " c", vet: false }]);
  assert.deepEqual(K.segmenten("[[]]x"), [{ t: "x", vet: false }]);
  assert.deepEqual(K.segmenten(""), []);
  assert.deepEqual(K.segmenten(undefined), []);
  assert.deepEqual(K.segmenten("regel\n\nbreuk [[x]]"), [{ t: "regel breuk ", vet: false }, { t: "x", vet: true }]);
  // HTML blijft gewone tekst: er wordt niets uitgepakt of weggehaald
  assert.deepEqual(K.segmenten("<b>[[x]]</b><script>alert(1)</script>"), [{ t: "<b>", vet: false }, { t: "x", vet: true }, { t: "</b><script>alert(1)</script>", vet: false }]);
});

test("datum, reacties en metaregel", () => {
  assert.equal(K.datumTekst("2014-03-05"), "05-03-2014");
  assert.equal(K.datumTekst("2014-03-05T10:00:00Z"), "05-03-2014");
  assert.equal(K.datumTekst("gisteren"), "");
  assert.equal(K.datumTekst(null), "");
  assert.equal(K.reactiesTekst(1), "1 reactie"); assert.equal(K.reactiesTekst(0), "0 reacties"); assert.equal(K.reactiesTekst(7), "7 reacties");
  assert.equal(K.metaRegel({ jaar: 2014, antwoorden: 7 }), "2014 · 7 reacties");
  assert.equal(K.metaRegel({ jaar: 2014, antwoorden: 1 }), "2014 · 1 reactie");
  assert.equal(K.metaRegel({ jaar: null, antwoorden: 3 }), "3 reacties");
  assert.equal(K.jaarForum({ jaar: 2018, forum: "Klussen" }), "2018 · Klussen");
  assert.equal(K.jaarForum({ jaar: 2018 }), "2018");
});

test("alineas: witregels splitsen, HTML blijft tekst", () => {
  assert.deepEqual(K.alineas("een\r\n\r\ntwee\nregel\n \n\n\ndrie  "), ["een", "twee\nregel", "drie"]);
  assert.deepEqual(K.alineas("<img src=x onerror=alert(1)>"), ["<img src=x onerror=alert(1)>"]);
  assert.deepEqual(K.alineas(""), []);
  assert.deepEqual(K.alineas(null), []);
});

test("Toon meer en telling komen uit de data", () => {
  assert.equal(K.meerTekst(13, 10), "Toon meer (nog 3)");
  assert.equal(K.nogOver(5, 9), 0);
  assert.equal(K.telTekst(1), "1 resultaat gevonden"); assert.equal(K.telTekst(13), "13 resultaten gevonden");
  assert.deepEqual(K.voegToe([{ id: "1" }], [{ id: "1" }, { id: "2" }]).map(x => x.id), ["1", "2"]);
});

test("besluiten van Anton staan letterlijk in de lib", () => {
  assert.equal(K.PRIVACY, "Om privacyredenen zijn alle namen in dit archief verzonnen.");
  assert.equal(K.WAARSCHUWING, "Advies uit 2012 tot 2020. Regels, bedragen en normen kunnen verouderd zijn, controleer ze bij de officiële bron.");
  assert.equal(K.MAIL, "info@communitiesabroad.com");
  assert.ok(K.TERUGVAL_URL.startsWith("https://infofrankrijk.com/klussen"));
  assert.deepEqual(K.VOORBEELDEN, ["septic tank", "afvoer", "dak", "houtkachel", "elektra", "tuin"]);
});

test("module klusforum is het Klusarchief in Wonen, zonder oude url", () => {
  const m = cat.modules.find(x => x.id === "klusforum");
  assert.equal(m.naam, "Klusarchief"); assert.equal(m.kort, "Klusarchief"); assert.equal(m.kind, "klusarchief");
  assert.equal(m.thema, "wonen"); assert.equal(m.prijs, "gratis"); assert.equal(m.standaard, "aan");
  assert.ok(!("url" in m) && !("let" in m) && !("weergave" in m));
  ["septic", "afvoer", "riool", "dak", "houtkachel", "elektra", "water", "tuin", "bouwen", "verbouwen", "klussen", "forum"].forEach(w => assert.ok(m.zoekwoorden.split(" ").includes(w), w));
  assert.match(html, /const klusIds = \["klussen","klusforum"/);
  assert.ok(!/infofrankrijk-klussen-archief/.test(JSON.stringify(cat)));
});

test("navigatie: hash, tab Modules, scherm en draad in de sleutel", () => {
  assert.deepEqual(N.parseHash("#/klusarchief"), { soort: "scherm", scherm: "klusarchief" });
  assert.equal(N.bouwHash({ screen: "klusarchief" }), "#/klusarchief");
  assert.deepEqual(N.parseHash("#/klusarchief/zomaar"), { soort: "hub" });
  assert.equal(H.tabVan("klusarchief"), "mod");
  assert.notEqual(N.navKey({ screen: "klusarchief" }), N.navKey({ screen: "klusarchief", kaDraad: "12" }));
  assert.match(html, /kaDraad: st\.screen === "klusarchief"/);
  assert.match(html, /SHOWBACK = \/\^\([^)]*klusarchief/);
  assert.match(html, /st\.screen === "klusarchief" && st\.kaDraad\) \{ this\.kaDraadSluit/);
  assert.match(html, /<script src="\.\/klusarchief-lib\.js"><\/script>/);
  assert.match(readFileSync(join(root, "sw.js"), "utf8"), /\.\/klusarchief-lib\.js/);
});

test("schil: geen innerHTML voor archieftekst, geen opslag van de zoekterm, geen AI of chat", () => {
  const blok = html.slice(html.indexOf("// ---- Klusarchief"), html.indexOf("// ---- Zoeken in de artikelen van Infofrankrijk"));
  assert.ok(blok.length > 1000);
  assert.ok(!/innerHTML|dangerouslySetInnerHTML|localStorage|sessionStorage|confirm\(/.test(blok));
  assert.ok(!/NotebookLM|chatbox/i.test(JSON.stringify(cat.modules.find(x => x.id === "klusforum"))));
  assert.match(blok, /credentials:"omit"/);
});

test("herstelronde 1: deep link per draad, teller, tips, kopje reacties", () => {
  assert.deepEqual(N.parseHash("#/klusarchief/123"), { soort: "klusdraad", id: "123" });
  assert.deepEqual(N.parseHash("#/klusarchief/12a"), { soort: "hub" });
  assert.deepEqual(N.parseHash("#/klusarchief/1/2"), { soort: "hub" });
  assert.equal(N.bouwHash({ screen: "klusarchief", kaDraad: "123" }), "#/klusarchief/123");
  assert.equal(N.bouwHash({ screen: "klusarchief", kaDraad: "abc" }), "#/klusarchief");
  assert.equal(N.bouwHash({ screen: "klusarchief", kaDraad: "" }), "#/klusarchief");
  assert.equal(K.draadHashId("42"), "42"); assert.equal(K.draadHashId("x1"), null);
  assert.equal(K.telTekst(20, 10), "20 resultaten gevonden, de eerste 10 hieronder");
  assert.equal(K.telTekst(8, 8), "8 resultaten gevonden"); assert.equal(K.telTekst(1, 1), "1 resultaat gevonden");
  assert.equal(K.reactiesKop(7), "Reacties (7)");
  assert.equal(K.LEEG_TIPS.length, 3); assert.match(K.TIP_FRANS, /fosse septique/);
  assert.match(html, /Typ minstens 2 letters\./);
  assert.match(html, /Meld deze draad/); assert.ok(!/Meld dit bericht/.test(html));
  assert.match(html, /data-ka-meld-boven/); assert.match(html, /scrollIntoView\(\{block:"center"\}\)/);
  assert.match(html, /Zoek ook in het Klusarchief: /); assert.match(html, /zoekKlusAan\(\)\{ return this\.mods\(\)/);
});

test("bron: URL-bouw met bron, onbekende waarde wordt alles", () => {
  assert.equal(K.zoekUrl("dak", 1, "nlfr"), K.BASIS + "?q=dak&p=1&bron=nlfr");
  assert.equal(K.zoekUrl("dak", 0, "forum"), K.BASIS + "?q=dak&p=0&bron=forum");
  assert.equal(K.zoekUrl("dak", 0, "x&y"), K.BASIS + "?q=dak&p=0&bron=alles");
});
test("gemengde resultaten: forum en nlfr valideren, rest valt af", () => {
  const l = K.leesZoek({ ok: true, totaal: 9, resultaten: [
    { bron: "forum", id: 5, titel: "Dak", jaar: 2014, antwoorden: 3, fragment: "[[dak]]" },
    { bron: "nlfr", titel: " Dakrenovatie ", jaar: 2023, antwoorden: 14, url: "https://www.nederlanders.fr/profiles/blogs/dakrenovatie" },
    { bron: "nlfr", titel: "Buiten", url: "https://evil.example/profiles/blogs/x" },
    { bron: "nlfr", titel: "Http", url: "http://www.nederlanders.fr/x" },
    { bron: "nlfr", titel: "", url: "https://www.nederlanders.fr/profiles/blogs/y" },
    { bron: "nlfr", titel: "Zonder url" },
    { bron: "nlfr", titel: "Valse host", url: "https://www.nederlanders.fr.evil.com/x" }] });
  assert.deepEqual(l.resultaten.map(r => r.bron), ["forum", "nlfr"]);
  assert.equal(l.resultaten[1].titel, "Dakrenovatie");
  assert.equal(l.resultaten[1].fragment, "");
  assert.equal(l.resultaten[1].forum, "Nederlanders.fr");
  assert.equal(l.resultaten[1].url, "https://www.nederlanders.fr/profiles/blogs/dakrenovatie");
  assert.equal(l.totaal, 9);
});
test("nlfrMeta: enkelvoud en nul reacties", () => {
  assert.equal(K.nlfrMeta({ jaar: 2023, antwoorden: 14 }), "2023 · 14 reacties");
  assert.equal(K.nlfrMeta({ jaar: 2020, antwoorden: 1 }), "2020 · 1 reactie");
  assert.equal(K.nlfrMeta({ jaar: 2019, antwoorden: 0 }), "2019");
});

// ---- Vraag het archief (chat) ----
test("chat: URL een keer, vraag 5 tot 300 tekens, lichaam met vorige en leeg vulveld", () => {
  assert.equal(K.CHAT_URL, "https://mqkhfyvrizgmmmcbdkxh.supabase.co/functions/v1/klusarchief-chat");
  assert.equal(html.includes("klusarchief-chat"), false);
  assert.equal(K.chatBody("abc"), null);
  assert.equal(K.chatBody("   "), null);
  assert.deepEqual(JSON.parse(K.chatBody("  mag ik  zelf een septic tank vervangen? ")), { vraag: "mag ik zelf een septic tank vervangen?", web: "" });
  assert.equal(JSON.parse(K.chatBody("x".repeat(400))).vraag.length, 300);
  const b = JSON.parse(K.chatBody("en de kosten?", { vraag: "septic tank", antwoord: "a".repeat(2000) }));
  assert.equal(b.vorige.antwoord.length, 1500);
  assert.equal(b.vorige.vraag, "septic tank");
  assert.equal(JSON.parse(K.chatBody("en de kosten?", { vraag: "x", antwoord: "a" })).vorige, undefined);
});

test("chat: status en foutsoorten", () => {
  assert.equal(K.chatAan({ ok: true, aan: true }), true);
  assert.equal(K.chatAan({ ok: true, aan: false }), false);
  assert.equal(K.chatAan(null), false);
  assert.equal(K.chatAan({ aan: true }), false);
  assert.equal(K.chatSoort(200, { ok: true }), "ok");
  assert.equal(K.chatSoort(429, { fout: "druk" }), "druk");
  assert.equal(K.chatSoort(503, { fout: "druk" }), "druk");
  assert.equal(K.chatSoort(503, { fout: "uit" }), "uit");
  assert.equal(K.chatSoort(403, { fout: "herkomst" }), "uit");
  assert.equal(K.chatSoort(502, { fout: "model" }), "fout");
  assert.equal(K.chatSoort(500, null), "fout");
  assert.equal(K.chatSoort(0, null), "fout");
});

test("chat: leesChat valideert bronnen en nlfr, lege lijst mag", () => {
  const l = K.leesChat({ ok: true, antwoord: " Ja [1]. ", bronnen: [
    { n: 1, id: 12, titel: "Septic tank", jaar: 2014 }, { n: 2, titel: "zonder id" }, { n: 3, id: 5 }, { n: 1, id: 9, titel: "dubbel" }, null, { n: 0, id: 1, titel: "nul" } ],
    nlfr: [ { titel: "Goed", jaar: 2020, antwoorden: 3, url: "https://www.nederlanders.fr/forum/topics/x" },
      { titel: "Elders", url: "https://evil.example/www.nederlanders.fr/" }, { titel: "Http", url: "http://www.nederlanders.fr/x" },
      { titel: "Leeg", url: "https://www.nederlanders.fr/" }, { titel: "Spatie", url: "https://www.nederlanders.fr/a b" } ] });
  assert.equal(l.antwoord, "Ja [1].");
  assert.deepEqual(l.bronnen, [{ n: 1, id: "12", titel: "Septic tank", jaar: 2014 }]);
  assert.deepEqual(l.nlfr.map(x => x.titel), ["Goed"]);
  assert.deepEqual(K.leesChat({ ok: true, antwoord: "x", bronnen: [] }).bronnen, []);
  assert.equal(K.leesChat({ ok: true, antwoord: "  " }), null);
  assert.equal(K.leesChat({ ok: false, antwoord: "x" }), null);
  assert.equal(K.leesChat(null), null);
  assert.equal(K.leesChat({ ok: true, antwoord: "x", bronnen: "nee", nlfr: 3 }).nlfr.length, 0);
});

test("chat: segmenten, onbekend nummer blijft tekst, HTML blijft tekst", () => {
  const bron = [{ n: 1, id: "12", titel: "A" }, { n: 2, id: "13", titel: "B" }];
  const s = K.chatSegmenten("Kan [1][2], maar [7] niet <img src=x onerror=alert(1)> en <b>vet</b>.", bron);
  assert.deepEqual(s.filter(x => x.bron).map(x => x.n), [1, 2]);
  const tekst = s.filter(x => !x.bron).map(x => x.t).join("");
  assert.ok(tekst.includes("[7]"));
  assert.ok(tekst.includes("<img src=x onerror=alert(1)>"));
  assert.ok(s.every(x => x.bron ? !("t" in x) : typeof x.t === "string"));
  assert.deepEqual(K.chatSegmenten("zie [1]", []), [{ t: "zie [1]" }]);
  assert.equal(K.chatAlineas("een [1]\n\ntwee", bron).length, 2);
});

test("chat: schil gebruikt geen innerHTML, geen opslag, geen hash; teksten kloppen", () => {
  const stuk = html.slice(html.indexOf("Vraag het archief (chat)"), html.indexOf("  kaOpen(m, from){"));
  assert.ok(stuk.length > 500);
  assert.equal(/innerHTML|localStorage|sessionStorage|pushState|location\.hash/.test(stuk), false);
  assert.ok(html.includes("data-ka-chat-waarschuwing"));
  assert.equal(K.CHAT_PRIVACY, "Uw vraag gaat naar Claude van Anthropic om het antwoord te schrijven. Vul geen namen of adressen in.");
  assert.equal(K.CHAT_DRUK, "Het archief krijgt nu veel vragen. Probeer het later opnieuw of zoek zelf hieronder.");
  assert.equal(K.CHAT_FOUT, "Het antwoord lukte niet. Zoek zelf hieronder of probeer het opnieuw.");
  assert.equal(K.CHAT_MAX_VRAGEN, 4);
  assert.equal(K.CHAT_TIMEOUT_MS, 45000);
  assert.equal(K.CHAT_STATUS_MS, 5000);
});
