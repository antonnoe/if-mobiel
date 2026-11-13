// Postzegel-ronde 13-11-2026, punt 5: deelknoppen op losse items. Artikel, kalenderitem en nieuwskaart hadden al een
// deelknop; nieuw zijn het Klusarchief (draad) en Mijn gemeente. Bronlinks (externe resultaten in de Klusarchief-zoek-
// kaart) zijn echte <a href> geworden. Wie voor het eerst via een gedeelde link binnenkomt (geen eerder bezoek) ziet
// onder het item een rustige regel naar de startpagina, zonder installatieverzoek. Live geverifieerd met Playwright
// op infopoche.fr (zie het eindrapport): #/kalender/knoflook-poten en #/gemeente/24000 openen InfoPoche bij dat item,
// de deelknoppen kopiëren de juiste link naar het klembord.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const lees = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const html = lees("index.html");
const Nv = createRequire(import.meta.url)("../nav-lib.js");

test("hash-route #/gemeente/<postcode>: alleen een geldige 5-cijferige postcode, anders de hub", () => {
  assert.deepEqual(Nv.parseHash("#/gemeente/24000"), { soort: "gemeentepc", pc: "24000" });
  assert.deepEqual(Nv.parseHash("#/gemeente/2400"), { soort: "hub" });
  assert.deepEqual(Nv.parseHash("#/gemeente/abcde"), { soort: "hub" });
  assert.deepEqual(Nv.parseHash("#/gemeente"), { soort: "scherm", scherm: "gemeente" });
});

test("routeToepassen: gemeentepc opent Mijn gemeente en zoekt direct op die postcode", () => {
  assert.match(html, /if \(r\.soort === "gemeentepc"\) \{ this\.gmOpen\("hub"\); this\.gmZoek\(r\.pc\); return; \}/);
});

test("Mijn gemeente: deelknop bovenaan, deelt de gemeentenaam en #/gemeente/<postcode> als die geldig is", () => {
  assert.ok(html.includes('data-gm-deel="1"'));
  assert.match(html, /gmDeel: \(\) => \{ if \(!c\) return; const pc = G && G\.postcodeOk\(gm\.pc\) \? gm\.pc : \(G && G\.postcodeOk\(gm\.zocht\) \? gm\.zocht : ""\); this\.deelStuk\("gm:" \+ c\.code, "Mijn gemeente: " \+ c\.nom, APP_URL \+ "\/#\/gemeente" \+ \(pc \? "\/" \+ pc : ""\)\); \},/);
});

test("Klusarchief-draad: deelknop met #/klusarchief/<id> (bestaande deep link)", () => {
  assert.ok(html.includes('data-ka-deel="1"'));
  assert.match(html, /kdDeel: \(\) => \{ if \(d\) this\.deelStuk\("ka:" \+ d\.id, \(dd \? dd\.titel : d\.titel\) \|\| "Klusarchief", APP_URL \+ "\/#\/klusarchief\/" \+ encodeURIComponent\(d\.id\)\); \},/);
});

test("Klusarchief-zoekkaart: externe bronnen (Nederlanders.fr, Infofrankrijk, officieel) zijn echte <a href>, alleen de forumdraad is een knop", () => {
  assert.match(html, /<a href="\{\{ r\.href \}\}" target="_blank" rel="noopener"[^>]*>\s*<span[^>]*>\{\{ r\.label \}\}<\/span>/);
  assert.match(html, /extern:true, intern:false, href:it\.url, open:null/);
  assert.match(html, /extern:false, intern:true, href:"", open:\(\) => this\.kaOpenDraad/);
});

test("eerste keer via een gedeelde link: rustige regel naar de startpagina, geen installatieverzoek, op alle vier de schermen", () => {
  assert.match(html, /viaDeelLinkEersteKeer = !lv && \["artikel", "klusdraad", "kalitem", "gemeentepc"\]\.indexOf\(route\.soort\) >= 0;/);
  assert.equal((html.match(/Dit komt uit InfoPoche\. <button onClick="\{\{ deelLinkNaarHub \}\}"/g) || []).length, 4);
  assert.ok(!/installBlad|installOpen/.test(html.slice(html.indexOf("deelLinkRegel: !!st.viaDeelLinkEersteKeer"), html.indexOf("deelLinkRegel: !!st.viaDeelLinkEersteKeer") + 200)));
});

test("geen liggende streepjes in de nieuwe teksten", () => {
  const i = html.indexOf("Dit komt uit InfoPoche.");
  assert.ok(i > 0);
  assert.ok(!/[–—]/.test(html.slice(i, i + 200)));
});
