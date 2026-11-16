// Nedergids-scherm: zoekveld op de live Nedergids-API (16-11-2026), plus de bestaande kaarten
// als vaste sectie "Ook op Nedergids" onder de zoekresultaten. Draaien: node --test tests/nedergids.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const lees = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const html = lees("index.html"), cat = JSON.parse(lees("modules.json"));
const i = html.indexOf("<!-- ============ NEDERGIDS (zoekscherm");
const scherm = html.slice(i, html.indexOf("<!-- ============ MODULE (gratis", i));

test("scherm: label, kop, intro, slotregel en sectiekop precies één keer", () => {
  for (const t of ["Wegwijzer · gratis te lezen", ">Nedergids</h1>", "Vind particulieren, ondernemers en instanties voor Nederlanders in Frankrijk, op postcode.",
    "Later komen deze functies samen in één nieuwe Nedergids.", ">Ook op Nedergids<"])
    assert.equal(scherm.split(t).length - 1, 1, t);
  assert.ok(!/wegwijzer · gratis te lezen/.test(html.slice(html.indexOf("const subs ="), html.indexOf("const subs =") + 1500)), "kopbalk herhaalt het label niet");
});

test("zoekveld: postcode-invoer, knop, locatieknop en de drie uitkomststaten", () => {
  assert.match(scherm, /onSubmit="\{\{ ngVerstuur \}\}"/);
  assert.match(scherm, /value="\{\{ ngPc \}\}" onInput="\{\{ ngOnPc \}\}"/);
  assert.match(scherm, /onClick="\{\{ ngGeoKlik \}\}"/);
  for (const h of ["ngLaadt", "ngFout", "ngKlaar"]) assert.match(scherm, new RegExp('value="\\{\\{ ' + h + ' \\}\\}"'));
  assert.match(scherm, /De Nedergids is nu niet bereikbaar\./);
  assert.match(scherm, /onClick="\{\{ ngOpnieuw \}\}"/);
  assert.match(scherm, /href="\{\{ ngSiteUrl \}\}"/);
  assert.match(scherm, />Bij jou in de buurt</);
  assert.match(scherm, />Landelijk actief</);
  assert.match(scherm, /✓ Geverifieerd/);
});

test("logica: nedergids-lib.js geladen, ngOpen/ngZoek bestaan en de bestaande kaarten blijven staan onder ngVals()", () => {
  assert.match(html, /<script src="\.\/nedergids-lib\.js">/);
  assert.match(html, /ngOpen\(m, from\)\{/);
  assert.match(html, /ngZoek\(pcArg\)\{/);
  assert.match(html, /\.\.\.this\.ngVals\(\)/);
  assert.match(html, /if \(N\.lees\(d\)\)|const l = N\.lees\(d\);/);
});

test("scherm: vijf kaarten, alleen nedergids.nl gaat naar buiten, de rest opent in de app, de rest opent in de app", () => {
  const kaarten = [...scherm.matchAll(/<a href="([^"]+)" target="_blank" rel="noopener"/g)].map(m => m[1]);
  assert.deepEqual(kaarten, ["{{ ngSiteUrl }}", "https://www.nedergids.nl", "{{ x.url }}"], "plus de foutlink naar nedergids.nl en de vindpagina's die niet in de app werken (nedergidsLinks extern)");
  assert.ok(scherm.includes("Hygiënecontroles bij restaurants") && scherm.includes("Wat je bij Gault &amp; Millau en Michelin niet leest") && scherm.includes("fris, fruitig en hygiënisch"));
  for (const h of ["ngGemeente", "ngVerenigingen", "ngOverheden", "ngHygiene"]) assert.ok(scherm.includes("onClick=\"{{ " + h + " }}\""), h);
  assert.match(html, /ngVerenigingen: \(\) => this\.route\(this\.vindModule\("verenigingen"\)\)/);
  assert.match(html, /ngOverheden: \(\) => this\.route\(this\.vindModule\("overhedenbuurt"\)\)/);
  assert.equal((scherm.match(/min-height:64px/g) || []).length, 8, "vijf vaste kaarten plus de herhaalde kaarten uit ngExtra en ngLinks (twee varianten)");
  assert.ok(!scherm.includes("Adressenboek"), "Adressenboek en overheden zijn één kaart");
});

test("scherm en data: geen filters, Uitgelicht, sitelijst, aanmeldblok, archiefnoot of postcoderegel meer", () => {
  assert.ok(!/ngCats|ngSites|ngAan|ngArchief|uitPlekken|uitKop|pcRegel|ngRegel|toolNagekeken|Deze plek is beschikbaar/.test(scherm));
  assert.ok(!/ngCats|ngSites|ngAan|ngArchief|uitPlekken|uitKop|pcRegel|ngRegel|ngCat\b/.test(html));
  assert.equal(cat.nedergids, undefined);
  const m = cat.modules.find(x => x.id === "nedergids");
  assert.equal(m.over, "Vind particulieren en dienstverleners in Frankrijk.");
  assert.ok(!/V2|Nedergids 1\.0/.test(scherm), "geen versietaal");
});

test("kopbalk herhaalt de kop Nedergids niet", () => {
  assert.match(html, /st\.screen === "nedergids" \? "" : titles\[st\.screen\]/);
});

test("Nedergids toont ook de zoekers per buurt of departement, uit de data (ookNedergids)", () => {
  const extra = cat.modules.filter(m => m.ookNedergids === true).map(m => m.id).sort();
  assert.deepEqual(extra, ["controletechnique", "palliatief", "veiligheid", "zoekers"]);
  assert.ok(scherm.includes('<sc-for list="{{ ngExtra }}"'));
  assert.match(html, /ngExtra: this\.alleMods\(\)\.filter\(m => m\.ookNedergids === true/);
});

test("Nedergids: vindpagina's van Infofrankrijk uit modules.json", () => {
  const l = cat.nedergidsLinks;
  assert.equal(l.length, 4);
  for (const x of l) assert.match(x.url, /^https:\/\/infofrankrijk\.com\//);
  assert.equal(l[0].extern, true, "registers is een zoekpagina die in de app niet werkt");
  assert.match(html, /data-nglink="1"/);
});

test("bosbrandkaart staat in het brandseizoen bovenaan de hub (veld podium)", () => {
  const v = cat.modules.find(m => m.id === "veiligheid");
  assert.equal(v.podium.van, "06-01"); assert.equal(v.podium.tot, "09-30");
  assert.equal(v.podium.naam, "Bosbrandkaart");
  const iP = html.indexOf('data-podium="1"'), iV = html.indexOf(">Onze vier<");
  assert.ok(iP > 0 && iP < iV, "podiumkaart staat boven Onze vier");
  assert.match(html, /podiumVals\(\)\{[\s\S]{0,300}this\.inSeizoen\(\{seizoen: x\.podium\}\)/);
});
