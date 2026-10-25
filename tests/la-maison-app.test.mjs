// La Maison in de app: validatie van la-maison.json (lamaison-lib.js), de koppeling in modules.json
// en de verdrading van de stub. Geen verplicht netwerk; de live-test slaat vriendelijk over.
// Draaien: node --test tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { lamaisonValideer, lamaisonUrl } = require(path.join(root, "lamaison-lib.js"));
const cat = JSON.parse(fs.readFileSync(path.join(root, "modules.json"), "utf8"));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

const geldig = () => JSON.parse(JSON.stringify([
  {id:"kopen", naam:"Kopen", fasen:[
    {nr:1, titel:"Voorbereiding", anker:"#fase1", artikelen:[{titel:"Bankrekening", pad:"/bank/"}]},
    {nr:2, titel:"Zoeken", anker:"#fase2", artikelen:[{titel:"Lening", later:true}]}]},
  {id:"kosten", naam:"Kosten", artikelen:[{titel:"Notariskosten", pad:"/kosten/"}]},
  {id:"verkopen", naam:"Verkopen", artikelen:[]},
  {id:"wonen", naam:"Wonen", artikelen:[{titel:"Verwarming", later:true}, {titel:"Tuin", pad:"/a/b/"}]}]));

test("geldige vorm wordt aangenomen en genormaliseerd", () => {
  const v = lamaisonValideer(geldig());
  assert.equal(v.ok, true);
  assert.deepEqual(v.delen.map(d => d.id), ["kopen", "kosten", "verkopen", "wonen"]);
  assert.equal(v.delen[0].fasen.length, 2);
  assert.equal(v.delen[0].fasen[0].anker, "#fase1");
  assert.equal(v.delen[0].artikelen, null);
  assert.equal(v.delen[1].fasen, null);
});

test("later-regels: niet tikbaar, zonder pad", () => {
  const v = lamaisonValideer(geldig());
  const later = v.delen[3].artikelen[0];
  assert.equal(later.later, true);
  assert.equal(later.pad, "");
  assert.equal(v.delen[3].artikelen[1].later, false);
  assert.equal(v.delen[0].fasen[1].artikelen[0].later, true);
});

test("anker zonder geldige vorm vervalt (geen link naar de gids)", () => {
  const d = geldig(); d[0].fasen[0].anker = "fase1 x"; delete d[0].fasen[1].anker;
  const v = lamaisonValideer(d);
  assert.equal(v.ok, true);
  assert.equal(v.delen[0].fasen[0].anker, "");
  assert.equal(v.delen[0].fasen[1].anker, "");
});

test("ongeldige vormen geven ok:false en gooien nooit", () => {
  const slecht = [];
  slecht.push(null, undefined, {}, "x", 5, [], [{id:"kopen"}]);
  let d = geldig(); d.pop(); slecht.push(d);                                   // deel ontbreekt
  d = geldig(); d[0].fasen = []; slecht.push(d);                               // geen fasen
  d = geldig(); delete d[0].fasen; slecht.push(d);
  d = geldig(); d[0].fasen[0].nr = "1"; slecht.push(d);                        // nr geen getal
  d = geldig(); d[0].fasen[0].titel = ""; slecht.push(d);
  d = geldig(); d[0].fasen[0].artikelen = "x"; slecht.push(d);
  d = geldig(); d[1].artikelen = null; slecht.push(d);
  d = geldig(); d[1].artikelen[0].pad = "kosten/"; slecht.push(d);             // zonder beginslash
  d = geldig(); d[1].artikelen[0].pad = "/kosten"; slecht.push(d);             // zonder eindslash
  d = geldig(); d[1].artikelen[0].pad = "//evil.example/"; slecht.push(d);     // protocol-relatief
  d = geldig(); d[1].artikelen[0].pad = "/a:b/"; slecht.push(d);
  d = geldig(); delete d[1].artikelen[0].pad; slecht.push(d);                  // geen pad en geen later
  d = geldig(); d[1].artikelen[0] = {titel:"", pad:"/x/"}; slecht.push(d);
  d = geldig(); d[1].artikelen[0] = {titel:"T", later:"ja"}; slecht.push(d);   // later moet true zijn
  d = geldig(); d[2].naam = ""; slecht.push(d);
  for (const x of slecht) {
    const v = lamaisonValideer(x);
    assert.equal(v.ok, false, JSON.stringify(x));
    assert.ok(typeof v.fout === "string" && v.fout.length > 0);
  }
});

test("lamaisonUrl plakt site en pad aan elkaar", () => {
  assert.equal(lamaisonUrl("https://infofrankrijk.com", "/x/"), "https://infofrankrijk.com/x/");
  assert.equal(lamaisonUrl("https://infofrankrijk.com/", "/x/"), "https://infofrankrijk.com/x/");
});

test("modules.json: bron, site en gids staan bij het thema wonen; de code kent de URL niet", () => {
  const w = cat.themas.find(t => t.id === "wonen");
  assert.equal(w.scherm, "lamaison");
  assert.equal(w.bron, "https://if-plek.vercel.app/la-maison.json");
  assert.equal(w.gids, "https://infofrankrijk.com/la-maison/");
  assert.equal(html.includes("if-plek.vercel.app"), false);
});

test("index.html: lamaison is geen stub meer, lib wordt geladen, tools in vaste volgorde", () => {
  const stub = /STUB_SCHERMEN = \[([^\]]*)\]/.exec(html)[1];
  assert.equal(stub.includes("lamaison"), false);
  assert.match(html, /SCHERMEN_VOOR_THEMA = \{[^}]*lamaison:"lamaison"/);
  assert.match(html, /<script src="\.\/lamaison-lib\.js"><\/script>/);
  assert.ok(html.includes('strookVoorThema("wonen")') || /isThema \|\| st\.screen === "lamaison"/.test(html) || html.includes("HubLib.tabVan(st.screen)"));
  const rij = /const tools = (\[[^\]]+\])/.exec(html)[1];
  assert.deepEqual(JSON.parse(rij), ["klussen","lijstjes","tekoop","dossierelektra","veiligheid","internet","moestuin","woonplan","bouwgrond","devisdossier","huizenchecker","woningzoeker","vastgoed","energie","subsidieroute"]);
  const ids = new Set(cat.modules.map(m => m.id));
  JSON.parse(rij).forEach(id => assert.ok(ids.has(id), id));
});

test("live: het echte la-maison.json is geldig (slaat over zonder netwerk)", async t => {
  const w = cat.themas.find(x => x.id === "wonen");
  let d;
  try {
    const r = await fetch(w.bron, {signal: AbortSignal.timeout(10000)});
    if (!r.ok) return t.skip("status " + r.status);
    d = await r.json();
  } catch (e) { return t.skip("geen netwerk: " + (e && e.message)); }
  const v = lamaisonValideer(d);
  assert.equal(v.ok, true, v.fout);
  assert.equal(v.delen[0].fasen.length, 7);
});
