// Controle van het scherm Gezondheid: indeling in modules.json, opschoonfunctie (dossier.js)
// en een live-test tegen de REST-API van Infofrankrijk (wordt overgeslagen zonder netwerk).
// Draaien: node --test tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const cat = JSON.parse(fs.readFileSync(path.join(root, "modules.json"), "utf8"));
const gz = cat.gezondheid;

test("zes fasen met de opgegeven hoofdstukken", () => {
  assert.deepEqual(gz.fasen.map(f => f.nummer), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(gz.fasen.map(f => f.hoofdstukken), [
    [27], [1, 2, 3, 4, 5, 6, 8, 21], [7, 9, 10], [11, 12, 13, 14, 31], [15, 16, 17, 18, 19, 20], [22, 23, 24, 25, 26, 29]]);
  gz.fasen.forEach(f => assert.ok(f.titel && f.titel.length > 3));
});

test("noodblok en nu al regelen", () => {
  assert.equal(gz.nood.module, "zorg");
  assert.deepEqual(gz.nood.hoofdstukken, [28, 30]);
  assert.deepEqual(gz.nuregelen.hoofdstukken, [22, 23, 24, 25]);
  assert.match(gz.nuregelen.verwijzing, /fase 5/);
  assert.ok(cat.modules.find(m => m.id === gz.nood.module));
});

test("alle 32 hoofdstukken zijn bereikbaar", () => {
  const alle = new Set([...gz.fasen.flatMap(f => f.hoofdstukken), ...gz.nood.hoofdstukken, ...gz.nuregelen.hoofdstukken, gz.bronnen.hoofdstuk]);
  for (let n = 1; n <= 32; n++) assert.ok(alle.has(n), "hoofdstuk " + n + " ontbreekt");
  assert.equal(alle.size, 32);
});

test("tools verwijzen naar bestaande modules in thema gezondheid", () => {
  assert.deepEqual(gz.tools.modules, ["zorgkompas", "zoekers", "palliatief"]);
  gz.tools.modules.forEach(id => { const m = cat.modules.find(x => x.id === id); assert.ok(m, id); assert.equal(m.thema, "gezondheid"); });
});

test("geen hoofdstuktekst in de repo: alleen nummers en labels", () => {
  const tekst = JSON.stringify(gz);
  assert.ok(tekst.length < 9000, "gezondheid in modules.json is verdacht groot: " + tekst.length);
  assert.ok(!/<[a-z]+[ >]/i.test(tekst));
  for (const f of fs.readdirSync(root)) {
    if (!/\.(html|js|json|md)$/.test(f) || f === "support.js") continue;
    assert.ok(!/beoordeling van verlies van zelfstandigheid, ASH en regie/.test(fs.readFileSync(path.join(root, f), "utf8")) , f);
  }
});

// Opschoonfunctie: heeft een DOM nodig; we draaien hem in headless Chromium (Playwright).
async function inBrowser(fn, arg) {
  let chromium;
  try { chromium = createRequire("/opt/node-tools/node_modules/")("playwright").chromium; }
  catch { try { chromium = createRequire(import.meta.url)("playwright").chromium; } catch { return undefined; } }
  let browser;
  try { browser = await chromium.launch(); } catch { return undefined; }
  try {
    const page = await browser.newPage();
    await page.setContent("<!doctype html><body></body>");
    await page.addScriptTag({ path: path.join(root, "dossier.js") });
    return await page.evaluate(fn, arg);
  } finally { await browser.close(); }
}

test("opschonen verwijdert script, onclick, javascript:-links en maakt links veilig", async t => {
  const html = '<p onclick="x()" style="color:red">Tekst <a href="javascript:alert(1)">slecht</a> <a href="/pad" onmouseover="y()">rel</a> <a href="#ifr-sec-7">sprong</a></p>' +
    '<script>alert(1)</script><iframe src="https://x.nl"></iframe><form><input name=a></form><img src="/a.png" onerror="z()"><table><tr><td>1</td></tr></table><pee>kapot</pee>';
  const uit = await inBrowser(h => window.IfDossier.schoon(h).innerHTML, html);
  if (uit === undefined) return t.skip("geen headless browser beschikbaar");
  assert.ok(!/<script|<iframe|<form|<input|onclick|onerror|onmouseover|javascript:|style="color:red"/i.test(uit), uit);
  assert.match(uit, /href="https:\/\/infofrankrijk\.com\/pad"/);
  assert.match(uit, /target="_blank"/);
  assert.match(uit, /rel="noopener noreferrer"/);
  assert.match(uit, /data-hfd="7"/);
  assert.match(uit, /src="https:\/\/infofrankrijk\.com\/a\.png"/);
  assert.match(uit, /loading="lazy"/);
  assert.match(uit, /overflow-x:auto/);
  assert.ok(!/<pee/.test(uit));
});

test("live: REST-aanroep levert 32 ankers en leesbare titels", async t => {
  let res;
  try { res = await fetch(gz.bron.rest, { headers: { Origin: "https://infopoche.fr" }, signal: AbortSignal.timeout(20000) }); }
  catch { return t.skip("geen netwerk"); }
  if (!res.ok) return t.skip("REST status " + res.status);
  const html = (await res.json())[0].content.rendered;
  for (let n = 1; n <= 32; n++) assert.ok(html.includes('id="ifr-sec-' + n + '"'), "anker " + n);
  const uit = await inBrowser(h => { const s = window.IfDossier.lees(h); return { aantal: s.aantal, titels: s.titels, h28: window.IfDossier.hoofdstuk(s, 28).textContent.length }; }, html);
  if (uit === undefined) return;
  assert.equal(uit.aantal, 32);
  for (let n = 1; n <= 32; n++) assert.ok(uit.titels[n] && uit.titels[n].length > 3, "titel " + n);
  assert.ok(uit.h28 > 200);
});
