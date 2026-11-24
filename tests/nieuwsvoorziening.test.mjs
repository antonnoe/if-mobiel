// Berichten van nieuws.infofrankrijk.com in de Nieuws-tab (nieuwsvoorziening-lib.js): vorm van de API, filters,
// ontdubbelen, anoniem ophalen, time-out en uitval, en de plek in index.html. Fixture: tests/fixture-nieuwsvoorziening.json
// (de vorm komt uit de broncode van Nieuwsvoorziening; niet live getest toen dit werd gebouwd, de host was niet bereikbaar).
// Draaien: node --test tests/nieuwsvoorziening.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const Nv = createRequire(import.meta.url)("../nieuwsvoorziening-lib.js");
const fx = JSON.parse(fs.readFileSync(path.join(root, "tests", "fixture-nieuwsvoorziening.json"), "utf8"));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const antwoord = (d, ok = true) => () => Promise.resolve({ ok, status: ok ? 200 : 502, json: () => Promise.resolve(d) });

test("url: vaste host, limiet, categorie alleen uit de lijst, peil=1", () => {
  assert.equal(Nv.apiUrl(), "https://nieuws.infofrankrijk.com/api/nieuws?limiet=30");
  assert.equal(Nv.apiUrl({ peil: true }), "https://nieuws.infofrankrijk.com/api/nieuws?limiet=100&peil=1");
  assert.match(Nv.apiUrl({ categorie: "Reizen-en-verkeer" }), /categorie=reizen%20en%20verkeer/);
  assert.ok(!/categorie/.test(Nv.apiUrl({ categorie: "x&evil=1" })));
  assert.equal(Nv.berichtUrl("b1"), "https://nieuws.infofrankrijk.com/bericht/b1");
  assert.equal(Nv.berichtUrl("../x"), "");
});

test("lees: kaartvelden, nieuwste eerst, ongeldig id valt af, lange streepjes weg, peil herkend", () => {
  const items = Nv.lees(fx);
  assert.deepEqual(items.map(i => i.id), ["b2", "b1", "b3"]);
  const b1 = items.find(i => i.id === "b1");
  assert.equal(b1.titel, "Hogere tarieven voor de energiecheque");
  assert.equal(b1.categorie, "economie en ondernemen");
  assert.equal(b1.url, "https://nieuws.infofrankrijk.com/bericht/b1");
  assert.equal(b1.portemonnee, true);
  assert.deepEqual(b1.bronUrls, ["https://voorbeeld.gouv.fr/cheque"]);
  const b3 = items.find(i => i.id === "b3");
  assert.equal(b3.titel, "Storm langs de kust, code oranje");
  assert.deepEqual(b3.bronUrls, [], "http-bronnen tellen niet mee");
});

test("lees: onbruikbare vorm geeft null, een lege lijst is geldig", () => {
  assert.equal(Nv.lees(null), null);
  assert.equal(Nv.lees({ fout: "De opslag is niet beschikbaar." }), null);
  assert.equal(Nv.lees({ berichten: "nee" }), null);
  assert.deepEqual(Nv.lees({ aantal: 0, berichten: [] }), []);
  assert.deepEqual(Nv.lees({ berichten: [null, 3, { id: "a" }, { kop: "zonder id" }] }), []);
});

test("portemonnee: alleen berichten die PEIL raken, ook als de API ?peil=1 negeert", async () => {
  const items = await Nv.laad(antwoord(fx), { peil: true });
  assert.deepEqual(items.map(i => i.id), ["b1"]);
});

test("ontdubbelen: gelijke kop (hoofdletters en accenten maken niet uit) of gelijke url valt weg", () => {
  const items = Nv.lees(fx);
  const oud = [
    { titel: "STAKING bij de SNCF: dit moet je weten!", url: "https://elders.example/a" },
    { titel: "Heel iets anders", url: "https://voorbeeld.gouv.fr/cheque/" }
  ];
  assert.deepEqual(Nv.ontdubbel(items, oud).map(i => i.id), ["b3"]);
  assert.deepEqual(Nv.ontdubbel(items, []).length, 3);
  assert.equal(Nv.ontdubbel(items, [{ titel: "x", url: "https://nieuws.infofrankrijk.com/bericht/b3" }]).some(i => i.id === "b3"), false);
});

test("laden: anoniem, zonder eigen headers, met time-out-signaal", async () => {
  let opt;
  const items = await Nv.laad((u, o) => { opt = o; return antwoord(fx)(); });
  assert.equal(items.length, 3);
  assert.equal(opt.credentials, "omit");
  assert.equal(opt.headers, undefined);
  assert.ok(opt.signal, "AbortController-signaal aanwezig");
  assert.equal(Nv.TIJDSLIMIET_MS, 8000);
});

test("uitval: serverfout, netwerkfout, rare vorm en hangende aanvraag wijzen af (nooit een half antwoord)", async () => {
  await assert.rejects(Nv.laad(antwoord({ fout: "x" }, false)));
  await assert.rejects(Nv.laad(() => Promise.reject(new TypeError("Failed to fetch"))));
  await assert.rejects(Nv.laad(antwoord({ iets: 1 })));
  await assert.rejects(Nv.laad(() => { throw new Error("sync"); }));
  await assert.rejects(Nv.laad(null));
  // time-out: de aanvraag hangt tot hij wordt afgebroken
  const echteSetTimeout = global.setTimeout;
  global.setTimeout = (f) => echteSetTimeout(f, 5);
  try {
    await assert.rejects(Nv.laad((u, o) => new Promise((_, rej) => o.signal.addEventListener("abort", () => rej(new Error("abort"))))));
  } finally { global.setTimeout = echteSetTimeout; }
});

test("meldingen: gewone taal, zonder technische woorden en met je-vorm", () => {
  for (const m of [Nv.MELDING_UIT, Nv.MELDING_PEIL_UIT, Nv.MELDING_PEIL_LEEG]) {
    assert.ok(!/status|json|fetch|cors|error|\bu\b|\buw\b/i.test(m), m);
  }
  assert.match(Nv.MELDING_UIT, /blijft gewoon beschikbaar/);
});

test("index.html: script, service worker, kaart in nieuw tabblad met rel noopener, aparte keuze naast de oude", () => {
  assert.match(html, /<script src="\.\/nieuwsvoorziening-lib\.js"><\/script>/);
  assert.ok(sw.includes('"./nieuwsvoorziening-lib.js"'));
  const kaart = html.match(/<a data-nv-kaart="1"[^>]*>/)[0];
  assert.match(kaart, /target="_blank"/);
  assert.match(kaart, /rel="noopener"/);
  assert.match(kaart, /min-height:44px/);
  assert.match(html, /label:"Raakt je portemonnee"/);
  assert.match(html, /data-nv-opnieuw="1"[^>]*min-height:48px/);
  // de oude stroom is niet weggehaald of uitgezet
  assert.ok(html.includes('const NIEUWS_API = "https://nlfr-menu.vercel.app/api/actueel"'));
  assert.match(html, /loadNieuws\(\)\{/);
});

test("Word abonnee: alle knoppen wijzen naar de ene bestemming, en die is /registreren/", () => {
  const cat = JSON.parse(fs.readFileSync(path.join(root, "modules.json"), "utf8"));
  const A = createRequire(import.meta.url)("../abonnee-lib.js");
  assert.equal(cat.abonnement.url, "https://infofrankrijk.com/registreren/");
  assert.equal(A.ABONNEE_URL, "https://infofrankrijk.com/registreren/");
  assert.ok(!/infofrankrijk\.com\/registeren/.test(html));
});
