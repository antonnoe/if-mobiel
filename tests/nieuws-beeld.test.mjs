// Themabeeld van het nieuwsscherm (besluit 2) en de instelling Grotere tekst (besluit 10).
// Draaien: node --test tests/nieuws-beeld.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const req = createRequire(import.meta.url);
const N = req("../nieuws-lib.js");
const H = req("../hub-lib.js");
const cat = JSON.parse(fs.readFileSync(path.join(root, "modules.json"), "utf8"));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

// De thema's die /api/actueel van nlfr-menu op 23-10-2026 levert (archief telt niet mee).
const LIVE = ["verkeer", "zorg", "landelijk", "nl-nieuws", "regionaal", "geld-belasting", "praktisch", "ondernemen",
  "douane", "economie", "wetgeving", "natuur-milieu", "nl-overheid", "infofrankrijk", "verenigingen"];

test("elk live nieuwsthema heeft kleur en pictogram uit modules.json", () => {
  LIVE.forEach(id => {
    const b = N.beeldVoor(id, cat.nieuwsBeeld, cat.themas);
    assert.equal(b.bekend, true, id);
    assert.ok(N.ICONEN[b.icoon] && b.d === N.ICONEN[b.icoon], id);
    const t = cat.themas.find(x => x.id === b.themaId);
    assert.equal(b.kleur, t.kleur);
    assert.equal(b.tint, t.tint);
  });
});

test("elke koppeling in modules.json wijst naar een bestaand thema en pictogram", () => {
  Object.entries(cat.nieuwsBeeld).filter(([k]) => !k.startsWith("_")).forEach(([k, v]) => {
    assert.ok(cat.themas.some(t => t.id === v.thema), k + ": thema");
    assert.ok(N.ICONEN[v.icoon], k + ": icoon");
  });
});

test("onbekend thema of kapotte koppeling geeft het neutrale beeld", () => {
  [N.beeldVoor("bestaat-niet", cat.nieuwsBeeld, cat.themas), N.beeldVoor("zorg", undefined, cat.themas),
    N.beeldVoor("zorg", { zorg: { thema: "weg", icoon: "hart" } }, cat.themas),
    N.beeldVoor("zorg", { zorg: { thema: "geld", icoon: "bestaatniet" } }, cat.themas),
    N.beeldVoor("__proto__", cat.nieuwsBeeld, cat.themas)].forEach(b => {
    assert.equal(b.bekend, false);
    assert.equal(b.kleur, N.NEUTRAAL.kleur);
    assert.ok(b.d.length > 10);
  });
});

test("contrast: pictogram tegen tint minstens 3:1, kicker tegen wit en pagina minstens 4.5:1 (ook neutraal)", () => {
  const beelden = LIVE.map(id => N.beeldVoor(id, cat.nieuwsBeeld, cat.themas)).concat([N.beeldVoor("x", {}, [])]);
  beelden.forEach(b => {
    assert.ok(H.contrast(b.kleur, b.tint) >= 3, b.icoon + " icoon/tint " + H.contrast(b.kleur, b.tint));
    assert.ok(H.contrast(b.kleur, "#FFFFFF") >= 4.5, b.icoon + " kicker/wit");
    assert.ok(H.contrast(b.kleur, "#F4F1F0") >= 4.5, b.icoon + " kicker/pagina");
  });
});

const art = (id, datum, url) => ({ id, titel: "T" + id, datum, url, summary: "s", bronMeta: {} });
const tegels = [
  { id: "a", thema: "zorg", label: "Zorg", items: N.maakItems({ id: "a", thema: "zorg" }, [art("1", "2026-10-01"), art("2", "2026-10-05", "u2")]) },
  { id: "b", thema: "verkeer", label: "Verkeer", items: N.maakItems({ id: "b", thema: "verkeer" }, [art("3", "2026-10-09"), art("4", "2026-10-02", "u2")]) }
];

test("filterchips, nieuwste eerst, dubbele berichten een keer, begrenzing en terugval van een onbekend filter", () => {
  assert.deepEqual(N.chips(tegels).map(c => c.id), ["alles", "a", "b"]);
  const alles = N.lijstVoorFilter(tegels, "alles", 0);
  assert.deepEqual(alles.map(x => x.id), ["3", "2", "1"]);
  assert.equal(N.lijstVoorFilter(tegels, "alles", 2).length, 2);
  assert.deepEqual(N.lijstVoorFilter(tegels, "b", 0).map(x => x.id), ["3", "4"]);
  assert.equal(N.geldigFilter(tegels, "weg"), "alles");
  assert.equal(N.geldigFilter(tegels, "a"), "a");
});

test("SVG-id's zijn uniek per item", () => {
  const ids = [0, 1, 2, 3].map(i => N.patroonId("nwp", i));
  assert.equal(new Set(ids).size, 4);
  ids.forEach(id => assert.match(id, /^[a-z][a-z0-9-]*$/));
});

test("geen externe afbeelding in het nieuwsoverzicht", () => {
  const a = html.indexOf("NIEUWS (overzicht");
  const b = html.indexOf("<sc-if value=\"{{ nwLees }}\"");
  const blok = html.slice(a, b);
  assert.ok(!/<img\b/i.test(blok) && !/https?:\/\/[^"' ]+\.(png|jpe?g|webp|gif)/i.test(blok));
});

test("Grotere tekst: zoom op kop, scherm en tabbalk; sleutel en reduced-motion aanwezig", () => {
  assert.ok((html.match(/\{\{ zoomCss \}\}/g) || []).length >= 4);
  assert.ok(html.includes("ifm_grote_tekst"));
  assert.ok(html.includes("startViewTransition"));
  assert.ok(html.includes("prefers-reduced-motion"));
  assert.match(html, /const TEKST_ZOOM = 1\.1\d/);
});
