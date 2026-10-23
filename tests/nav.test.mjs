// Navigatie: hash-routes, geschiedenis-sleutels, laadtoken en zoeken in artikelen. Draaien: node --test tests/nav.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const N = createRequire(import.meta.url)("../nav-lib.js");

test("parseHash: artikel, hoofdschermen, onbekend valt terug op de hub", () => {
  assert.deepEqual(N.parseHash("#/artikel/gite-beginnen"), { soort: "artikel", slug: "gite-beginnen" });
  assert.deepEqual(N.parseHash("#/artikel/Solvit"), { soort: "artikel", slug: "solvit" });
  assert.deepEqual(N.parseHash("#/nieuws"), { soort: "scherm", scherm: "nieuws" });
  assert.deepEqual(N.parseHash("#/forum"), { soort: "scherm", scherm: "gem" });
  assert.deepEqual(N.parseHash("#/profiel"), { soort: "scherm", scherm: "acc" });
  for (const h of ["", "#", "#/", "#/onbekend", "#/artikel", "#/artikel/", "#/artikel/a/b", "#/artikel/%E0%A4%A", "#/artikel/../x", "#/artikel/<script>", "#x", null, undefined, "#/constructor", "#/__proto__"])
    assert.deepEqual(N.parseHash(h), { soort: "hub" }, String(h));
});

test("bouwHash en deelUrl: rondreis en veilige slug", () => {
  assert.equal(N.bouwHash({ screen: "artikel", artSlug: "solvit" }), "#/artikel/solvit");
  assert.equal(N.bouwHash({ screen: "gem" }), "#/forum");
  assert.equal(N.bouwHash({ screen: "hub" }), "");
  assert.equal(N.bouwHash({ screen: "ruyter" }), "");
  assert.equal(N.bouwHash({ screen: "artikel", artSlug: "../x" }), "");
  assert.equal(N.deelUrl("https://infopoche.fr/", "solvit"), "https://infopoche.fr/#/artikel/solvit");
  assert.deepEqual(N.parseHash(N.bouwHash({ screen: "artikel", artSlug: "a-b_c" })), { soort: "artikel", slug: "a-b_c" });
});

test("navKey en isTop: sleutel verandert bij scherm, onderdeel of blad", () => {
  const a = { screen: "gezondheid", gzLijst: null }, b = { screen: "gezondheid", gzLijst: 2 };
  assert.notEqual(N.navKey(a), N.navKey(b));
  assert.notEqual(N.navKey(a), N.navKey({ ...a, blad: "forum" }));
  assert.equal(N.navKey(a), N.navKey({ ...a }));
  assert.ok(N.isTop({ screen: "hub" }) && N.isTop({ screen: "zoek" }) && N.isTop({ screen: "nieuws" }));
  assert.ok(!N.isTop({ screen: "nieuws", nwTegel: "x" }) && !N.isTop({ screen: "ruyter" }) && !N.isTop({ screen: "hub", blad: "pc" }));
});

test("laadtoken: alleen de laatste aanvraag is actueel, los van state", () => {
  const t = N.maakTeller();
  const een = t.volgende(), twee = t.volgende();
  assert.equal(t.actueel(een), false);
  assert.equal(t.actueel(twee), true);
  assert.equal(t.actueel(t.volgende()), true);
});

test("artikelZoekUrl: minimaal drie tekens, meerdere woorden, codering", () => {
  assert.equal(N.artikelZoekUrl("ab"), null);
  assert.equal(N.artikelZoekUrl("  "), null);
  const u = N.artikelZoekUrl("gîte  beginnen");
  assert.ok(u.startsWith("https://infofrankrijk.com/wp-json/wp/v2/search?search=g%C3%AEte%20beginnen&per_page=8&_fields=title,url,subtype"));
});

test("artikelTreffers: alleen berichten en pagina's, titels schoon, geen dubbelen", () => {
  const r = N.artikelTreffers([
    { title: "Gîte &amp; chambre d&#8217;hôtes", url: "https://infofrankrijk.com/gite/", subtype: "post" },
    { title: "Dubbel", url: "https://infofrankrijk.com/gite/", subtype: "post" },
    { title: "Categorie", url: "https://infofrankrijk.com/c/", subtype: "category" },
    { title: "<b>Solvit</b>", url: "https://infofrankrijk.com/solvit/", subtype: "page" },
    { title: "", url: "https://infofrankrijk.com/leeg/", subtype: "post" }, null, { title: "x" }
  ]);
  assert.deepEqual(r.map(x => x.titel), ["Gîte & chambre d’hôtes", "Solvit"]);
  assert.deepEqual(N.artikelTreffers({ code: "rest_error" }), []);
});
