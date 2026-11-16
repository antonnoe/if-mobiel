// nedergids-lib.js: pure functies voor de zoekaanvraag en het lezen van het antwoord van de Edge Function.
// Draaien: node --test tests/nedergids-lib.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const N = createRequire(import.meta.url)("../nedergids-lib.js");

test("postcodeOk en url", () => {
  assert.equal(N.postcodeOk("24100"), true);
  assert.equal(N.postcodeOk("2410"), false);
  assert.equal(N.postcodeOk("abcde"), false);
  assert.equal(N.postcodeOk(""), false);
  assert.equal(N.url("24100"), N.BASIS + "?postcode=24100");
  assert.equal(N.url("abc"), "");
});

test("lees: ongeldige vorm geeft null, nooit een halve lijst", () => {
  assert.equal(N.lees(null), null);
  assert.equal(N.lees({}), null);
  assert.equal(N.lees({ok:false, entries:[]}), null);
  assert.equal(N.lees({ok:true, entries:"geen array"}), null);
});

test("lees: groepeert lokaal/straal apart van landelijk, zonder naam valt een entry af", () => {
  const json = {ok:true, gemeente:"Bergerac", entries:[
    {id:"1", naam:"Loodgieter Dupont", werkgebied:"adres", plaats:"Bergerac", afstand_km:3.2, rubriek:"Bouw", reg_geverifieerd_op:"2026-11-01"},
    {id:"2", naam:"Boekhouder Janssen", werkgebied:"straal", straal_km:50, plaats:"Périgueux", afstand_km:30},
    {id:"3", naam:"Landelijke dienst", werkgebied:"landelijk"},
    {id:"4", werkgebied:"adres"} // geen naam
  ]};
  const l = N.lees(json);
  assert.equal(l.gemeente, "Bergerac");
  assert.equal(l.lokaal.length, 2);
  assert.equal(l.landelijk.length, 1);
  assert.equal(l.lokaal[0].id, "1");
  assert.equal(l.lokaal[0].geverifieerd, true);
  assert.equal(l.lokaal[1].geverifieerd, false);
  assert.equal(l.landelijk[0].naam, "Landelijke dienst");
});

test("werkgebiedLabel en plaatsLabel", () => {
  assert.equal(N.werkgebiedLabel({werkgebied:"landelijk"}), "Heel Frankrijk");
  assert.equal(N.werkgebiedLabel({werkgebied:"straal", straal_km:40}), "Straal 40 km");
  assert.equal(N.werkgebiedLabel({werkgebied:"straal"}), "Regionaal");
  assert.equal(N.werkgebiedLabel({werkgebied:"adres"}), "");
  assert.equal(N.plaatsLabel({plaats:"Bergerac", afstand_km:3.2}), "Bergerac · 3.2 km");
  assert.equal(N.plaatsLabel({plaats:"Bergerac"}), "Bergerac");
  assert.equal(N.plaatsLabel({}), "");
});

test("item: zonder naam valt de entry af, met naam blijven de velden veilig", () => {
  assert.equal(N.item({}), null);
  assert.equal(N.item(null), null);
  const it = N.item({id:"9", naam:"Tandarts Smit", beschrijving:"Nederlandstalige tandarts", werkgebied:"adres"});
  assert.equal(it.naam, "Tandarts Smit");
  assert.equal(it.beschrijving, "Nederlandstalige tandarts");
  assert.equal(it.landelijk, false);
});
