// Nedergids-scherm (28-10-2026): vier kaarten, één V2-regel, geen filters, sitelijst of aanmeldblok. Draaien: node --test tests/nedergids.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const lees = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const html = lees("index.html"), cat = JSON.parse(lees("modules.json"));
const i = html.indexOf("<!-- ============ NEDERGIDS (kaartschil)");
const scherm = html.slice(i, html.indexOf("<!-- ============ MODULE (gratis", i));
const V2 = "(in de komende maanden zal een V2 worden uitgerold)";

test("scherm: label, kop, intro, V2-regel en slotregel precies één keer", () => {
  for (const t of ["Wegwijzer · gratis te lezen", ">Nedergids</h1>", "Vind particulieren en dienstverleners in Frankrijk.", V2, "Deze functies komen samen in Nedergids V2."])
    assert.equal(scherm.split(t).length - 1, 1, t);
  assert.ok(!/wegwijzer · gratis te lezen/.test(html.slice(html.indexOf("const subs ="), html.indexOf("const subs =") + 1500)), "kopbalk herhaalt het label niet");
});

test("scherm: drie kaarten, alleen nedergids.nl gaat naar buiten, de rest opent in de app", () => {
  const kaarten = [...scherm.matchAll(/<a href="([^"]+)" target="_blank" rel="noopener"/g)].map(m => m[1]);
  assert.deepEqual(kaarten, ["https://www.nedergids.nl"]);
  for (const h of ["ngVerenigingen", "ngOverheden"]) assert.ok(scherm.includes("onClick=\"{{ " + h + " }}\""), h);
  assert.match(html, /ngVerenigingen: \(\) => this\.route\(this\.vindModule\("verenigingen"\)\)/);
  assert.match(html, /ngOverheden: \(\) => this\.route\(this\.vindModule\("overhedenbuurt"\)\)/);
  assert.equal((scherm.match(/min-height:64px/g) || []).length, 3);
  assert.ok(!scherm.includes("Adressenboek"), "Adressenboek en overheden zijn één kaart");
});

test("scherm en data: geen filters, Uitgelicht, sitelijst, aanmeldblok, archiefnoot of postcoderegel meer", () => {
  assert.ok(!/ngCats|ngSites|ngAan|ngArchief|uitPlekken|uitKop|pcRegel|ngRegel|toolNagekeken|Deze plek is beschikbaar/.test(scherm));
  assert.ok(!/ngCats|ngSites|ngAan|ngArchief|uitPlekken|uitKop|pcRegel|ngRegel|ngCat\b/.test(html));
  assert.equal(cat.nedergids, undefined);
  const m = cat.modules.find(x => x.id === "nedergids");
  assert.equal(m.over, "Vind particulieren en dienstverleners in Frankrijk. " + V2);
});

test("kopbalk herhaalt de kop Nedergids niet", () => {
  assert.match(html, /st\.screen === "nedergids" \? "" : titles\[st\.screen\]/);
});
