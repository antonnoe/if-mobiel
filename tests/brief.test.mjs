import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const B = require("../brief-lib.js");
const N = require("../nav-lib.js");
const H = require("../hub-lib.js");
const html = readFileSync(join(root, "index.html"), "utf8");
const cat = JSON.parse(readFileSync(join(root, "modules.json"), "utf8"));

const goed = {
  ok: true, leesbaar: true, afzender: "Belastingdienst, SIP Bergerac", soort_nl: "verzoek om inlichtingen", soort_fr: "demande de renseignements",
  termijn: { nl: "binnen 30 dagen na ontvangst", citaat: "dans un délai de 30 jours" },
  punten: [{ nl: "Bewijs van je pensioen", citaat: "justificatifs de vos pensions" }, { nl: "Zonder citaat", citaat: "" }],
  zoekterm: "belasting"
};

test("antwoord: punt zonder citaat valt af, citaat blijft bij elk punt", () => {
  const l = B.leesAntwoord(goed);
  assert.equal(l.leesbaar, true);
  assert.equal(l.punten.length, 1);
  assert.equal(l.punten[0].citaat, "justificatifs de vos pensions");
  assert.equal(l.zoekterm, "belasting");
});

test("termijn: blijft zoals de brief hem noemt, nooit een uitgerekende datum", () => {
  assert.equal(B.leesAntwoord(goed).termijn.nl, "binnen 30 dagen na ontvangst");
  const verzonnen = Object.assign({}, goed, { termijn: { nl: "uiterlijk 12 december 2026", citaat: "dans un délai de 30 jours" } });
  assert.equal(B.leesAntwoord(verzonnen).termijn, null);
  const eigen = Object.assign({}, goed, { termijn: { nl: "uiterlijk 15 januari 2027", citaat: "avant le 15 janvier 2027" } });
  assert.equal(B.leesAntwoord(eigen).termijn.nl, "uiterlijk 15 januari 2027");
  const zonder = Object.assign({}, goed, { termijn: { nl: "binnen 30 dagen", citaat: "" } });
  assert.equal(B.leesAntwoord(zonder).termijn, null);
  assert.equal(B.leesAntwoord(Object.assign({}, goed, { termijn: null })).termijn, null);
});

test("antwoord: onleesbaar, fout, zoekterm buiten de lijst, lange streepjes, maximaal zes punten", () => {
  assert.deepEqual(B.leesAntwoord({ ok: true, leesbaar: false }), { leesbaar: false });
  assert.deepEqual(B.leesAntwoord(null), { leesbaar: false });
  assert.deepEqual(B.leesAntwoord({ ok: true, leesbaar: true, afzender: "", punten: [] }), { leesbaar: false });
  assert.equal(B.leesAntwoord(Object.assign({}, goed, { zoekterm: "iets anders" })).zoekterm, "");
  assert.equal(B.leesAntwoord(Object.assign({}, goed, { afzender: "Mairie — Bergerac" })).afzender, "Mairie , Bergerac");
  const veel = Object.assign({}, goed, { punten: Array.from({ length: 9 }, (_, i) => ({ nl: "punt " + i, citaat: "citaat nummer " + i })) });
  assert.equal(B.leesAntwoord(veel).punten.length, 6);
});

test("verkleinen: lange zijde hoogstens 1600, nooit vergroten, verhouding blijft", () => {
  assert.deepEqual(B.verkleinMaat(4000, 3000, 1600), { b: 1600, h: 1200 });
  assert.deepEqual(B.verkleinMaat(3000, 4000), { b: 1200, h: 1600 });
  assert.deepEqual(B.verkleinMaat(800, 600, 1600), { b: 800, h: 600 });
  assert.equal(B.verkleinMaat(0, 10), null);
  assert.equal(B.bytesVanBase64("QUJD"), 3);
  assert.equal(B.bytesVanBase64("QUI="), 2);
});

test("alleen beeld, geen PDF; fouten eerlijk", () => {
  assert.equal(B.isPdf("brief.PDF", ""), true);
  assert.equal(B.isPdf("x.jpg", "application/pdf"), true);
  assert.equal(B.isBeeld("x.jpg", "image/jpeg"), true);
  assert.equal(B.isBeeld("x.docx", "application/msword"), false);
  assert.equal(B.foutSoort(429, null), "druk");
  assert.equal(B.foutSoort(503, { fout: "uit" }), "uit");
  assert.equal(B.foutSoort(413, null), "groot");
  assert.equal(B.foutSoort(502, { fout: "model" }), "fout");
  assert.equal(B.foutSoort(0, null), "fout");
  assert.equal(JSON.parse(B.body("abc")).beeld, "abc");
});

test("teksten: eerlijke privacy, geen 'nergens bewaard', geen u-vorm, geen lange streepjes", () => {
  assert.match(B.PRIVACY, /Claude van Anthropic/);
  assert.match(B.PRIVACY, /bewaart de foto niet/);
  assert.doesNotMatch(B.PRIVACY, /nergens bewaard/);
  assert.match(B.PRIVACY, /fiscaal nummer/);
  assert.match(B.DISCLAIMER, /uitleg, geen advies|De brief zelf gaat altijd voor/);
  const alles = [B.UITLEG, B.PRIVACY, B.PDF_TEKST, B.DISCLAIMER_KOP, B.DISCLAIMER, B.ONLEESBAAR, ...Object.values(B.FOUTEN)].join(" ");
  assert.doesNotMatch(alles, /[–—]/);
  assert.doesNotMatch(alles, /\b(u|uw)\b/i);
});

test("module, sterrenkaart, route en schil", () => {
  const m = cat.modules.find(x => x.id === "briefuitleg");
  assert.equal(m.naam, "Brief uitleggen");
  assert.equal(m.ai, "tool"); assert.ok(m.ai_uitleg);
  assert.equal(m.thema, "overheid"); assert.equal(m.prijs, "gratis"); assert.equal(m.kind, "brief"); assert.equal(m.standaard, "aan");
  const pap = cat.sterrenkaart.onderwerpen.find(o => o.id === "papieren");
  assert.ok(pap.vragen.some(v => v.antwoorden.some(a => a.module === "briefuitleg")));
  assert.deepEqual(N.parseHash("#/brief"), { soort: "scherm", scherm: "brief" });
  assert.equal(H.tabVan("brief"), "mod");
  assert.match(html, /<script src="\.\/brief-lib\.js"><\/script>/);
  assert.match(readFileSync(join(root, "sw.js"), "utf8"), /\.\/brief-lib\.js/);
  assert.match(html, /accept="image\/\*" capture="environment"/);
  assert.match(html, /m\.kind === "brief"/);
});

test("niets van foto of uitkomst in opslag", () => {
  const stuk = html.slice(html.indexOf("// ---- Brief uitleggen"), html.indexOf("kaChatBron(b){"));
  assert.ok(stuk.length > 500);
  assert.doesNotMatch(stuk, /localStorage|sessionStorage|pushState|replaceState/);
  const lib = readFileSync(join(root, "brief-lib.js"), "utf8");
  assert.doesNotMatch(lib, /localStorage|sessionStorage/);
});
