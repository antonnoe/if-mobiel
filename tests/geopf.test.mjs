// Terugval van geo.api.gouv.fr naar de Géoplateforme (data.geopf.fr), echte antwoorden van 11-11-2026.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const H = createRequire(import.meta.url)('../hub-lib.js');
const G = createRequire(import.meta.url)('../gemeente-lib.js');
const lees = f => JSON.parse(fs.readFileSync('tests/' + f, 'utf8'));

test('postcode 62170: alle gemeenten in de vorm van geo.api.gouv.fr, grootste eerst', () => {
  const l = H.gemeentenUitGeopf(lees('fixture-geopf-62170.json'), '62170');
  assert.ok(l.length >= 20);
  const g = G.leesCommunes(l);
  assert.equal(g[0].nom, 'Montreuil-sur-Mer');
  assert.equal(g[0].code, '62588');
  assert.equal(g[0].dep, '62');
  assert.ok(typeof g[0].lat === 'number' && typeof g[0].lon === 'number');
  assert.equal(H.plaatsUitApi(l), 'Montreuil-sur-Mer');
});

test('Parijs: geen arrondissement, wel de stad', () => {
  const l = H.gemeentenUitGeopf(lees('fixture-geopf-75001.json'), '75001');
  assert.deepEqual(l.map(c => c.code), ['75056']);
});

test('andere postcode in het antwoord valt weg', () => {
  assert.equal(H.gemeentenUitGeopf(lees('fixture-geopf-62170.json'), '62180').length, 0);
  assert.deepEqual(H.gemeentenUitGeopf(null, '62170'), []);
});

test('locatie: adres bij het punt geeft postcode en gemeente', () => {
  const g = H.postcodeUitGeo(H.geoUitGeopf(lees('fixture-geopf-reverse.json')));
  assert.equal(g.postcode, '62170');
  assert.equal(g.code, '62588');
  assert.equal(g.plaats, 'Montreuil-sur-Mer');
  assert.equal(H.postcodeUitGeo(H.geoUitGeopf({ features: [] })), null);
});

test('urls alleen https op data.geopf.fr', () => {
  assert.match(H.gemeentenUrlGeopf('62170'), /^https:\/\/data\.geopf\.fr\/geocodage\/search\?q=62170&type=municipality/);
  assert.equal(H.gemeentenUrlGeopf('abc'), '');
  assert.match(H.geoUrlGeopf(50.46, 1.76), /^https:\/\/data\.geopf\.fr\/geocodage\/reverse\?lat=50\.46000&lon=1\.76000/);
});
