// Het scherm Zo werken wij (16 november 2026): een scrollpagina, tekst in data/werkwijze.json, logica in werkwijze-lib.js.
// De cijfers (Peil-stand, toollijst) komen live van communitiesabroad.com en worden hier met fixtures getest.
// Draaien: node --test tests/werkwijze.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lees = (f) => readFileSync(join(root, f), 'utf8');
const req = createRequire(import.meta.url);
const W = req('../werkwijze-lib.js'), N = req('../nav-lib.js'), H = req('../hub-lib.js'), A = req('../abonnee-lib.js');
const ruw = JSON.parse(lees('data/werkwijze.json')), cat = JSON.parse(lees('modules.json')), html = lees('index.html');
const data = W.lees(ruw);

function teksten(v, uit = []) {
  if (typeof v === 'string') uit.push(v);
  else if (Array.isArray(v)) v.forEach((x) => teksten(x, uit));
  else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => { if (!/^_/.test(k) && !/url|Url|Basis|soort|stijl/.test(k)) teksten(x, uit); });
  return uit;
}

test('de data is geldig en volledig: zes onderdelen met de inhoud van de pagina op de site', () => {
  assert.ok(data);
  assert.equal(data.kop.titel, 'Zo controleren wij elk cijfer');
  assert.equal(data.stroom.bronnen.length, 3);
  assert.deepEqual(data.stroom.bronnen.map((b) => b.soort), ['aaa', 'aa', 'a']);
  assert.equal(data.heenTerug.heen.length, 5);
  assert.equal(data.heenTerug.terug.length, 3);
  assert.equal(data.onderAntwoord.lagen.length, 4);
  assert.deepEqual(data.onderAntwoord.lagen.map((l) => l.kop), ['Inhoud', 'Vorm', 'Bronnen', 'Peil-stempel']);
  assert.equal(data.ritme.momenten.length, 5);
  assert.equal(data.zelf.stappen.length, 3);
  assert.deepEqual(data.zelf.knoppen.map((k) => k.label), ['Zoek een bedrag in Peil', 'Toolkaarten', 'Kwaliteit van Café Claude', 'Ons manifest', 'Abonnee worden']);
  assert.equal(data.zelf.knoppen[0].url, 'https://communitiesabroad.com/peil#zoek');
  assert.equal(data.zelf.knoppen[2].url, 'https://www.cafeclaude.fr/kwaliteit');
});

test('geen aantallen of versies vast in de data (die komen live), geen lange streepjes', () => {
  const alle = teksten(ruw).join('\n');
  assert.ok(!/\b(292|149|332|167|653|300)\b/.test(alle), 'oude aantallen');
  assert.ok(!/\d+\.\d+\.\d+/.test(alle), 'versienummer');
  assert.ok(!/[–—]/.test(lees('data/werkwijze.json')), 'lange streepjes');
  assert.ok(!/(^|\W)\d{1,2} (januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december) 20\d\d/.test(alle), 'vaste datum');
  assert.ok(!/Café Claude[^.]*\b\d{3}\b/.test(alle), 'geen aantallen bij Café Claude');
});

test('je-vorm: nergens u of uw', () => {
  const alle = teksten(ruw).join('\n');
  assert.ok(!/(^|[\s(])[Uu]($|[\s.,;:!?])/.test(alle), 'u-vorm');
  assert.ok(!/\b[Uu]w[a-z]*\b|\buzelf\b/i.test(alle), 'uw');
  assert.ok(/Voor jou:/.test(alle) && /Je kunt het tot in detail controleren/.test(alle));
  assert.ok(!/\bdia'?s?\b/i.test(alle + html.slice(html.indexOf('ZO WERKEN WIJ ('), html.indexOf('BRIEF UITLEGGEN (foto'))), 'geen dia-taal meer');
});

test('lees weigert een kapot bestand en laat lege onderdelen vallen', () => {
  assert.equal(W.lees(null), null);
  assert.equal(W.lees({}), null);
  const kapot = JSON.parse(JSON.stringify(ruw)); kapot.heenTerug.heen = [{ kop: '', tekst: '' }];
  assert.equal(W.lees(kapot), null);
  const half = JSON.parse(JSON.stringify(ruw)); half.zelf.knoppen.push({ label: 'x', url: 'http://onveilig.nl' }, { label: 'y', url: 'javascript:alert(1)' });
  assert.equal(W.lees(half).zelf.knoppen.length, ruw.zelf.knoppen.length);
  assert.equal(W.urlOk('http://x.nl'), ''); assert.equal(W.urlOk('javascript:alert(1)'), '');
});

const standFixture = { versie: '1.18.3', versiedatum: '2026-11-15', peildatum: '2026-11-15', totaal: 342, vastgesteld: 300, te_verifieren: 19, raming: 15, vervallen: 8, rekenregels_totaal: 167, rekenregels_vastgesteld: 149 };
const toolsFixture = { stand: '2026-11-15', versie: '1.18.3', aantal: 4, tools: [
  { slug: 'briefhulp-fr', naam: 'Briefhulp FR', aantal_bedragen: 14 }, { slug: 'financieel-kompas', naam: 'Financieel Kompas', aantal_bedragen: 81 },
  { slug: 'leeg', naam: 'Zonder bedragen', aantal_bedragen: 0 }, { slug: 'Slecht Slug', naam: 'Kapot', aantal_bedragen: 3 },
  { slug: 'vastgoed', naam: 'Vastgoed', aantal_bedragen: 22 }, { slug: 'zonder-naam', naam: '', aantal_bedragen: 5 }] };

test('peil-stand.json wordt gelezen: versie, datum in woorden, aantallen', () => {
  const s = W.leesStand(standFixture);
  assert.deepEqual(s, { versie: '1.18.3', versiedatum: '15 november 2026', vastgesteld: 300, rekenregels: 149 });
  assert.equal(W.standRegel(data.kop.stand, s), 'Stand: Peil 1.18.3, 15 november 2026');
  assert.equal(W.datumLang('2026-01-05'), '5 januari 2026'); assert.equal(W.datumLang('2026-13-01'), ''); assert.equal(W.datumLang('vandaag'), '');
  assert.equal(W.getal(1234), '1.234'); assert.equal(W.getal(80), '80');
});

test('peil-stand.json: nul, ontbrekend of vreemd geeft nooit een lege tegel of kapotte regel', () => {
  assert.equal(W.leesStand(null), null);
  assert.equal(W.leesStand({}), null);
  assert.equal(W.leesStand({ vastgesteld: 0, rekenregels_vastgesteld: 0 }), null);
  const zonderRegels = W.leesStand({ versie: '1.0.0', versiedatum: '2026-01-01', vastgesteld: 12, rekenregels_vastgesteld: 0 });
  assert.equal(zonderRegels.rekenregels, null); assert.equal(zonderRegels.vastgesteld, 12);
  const slecht = W.leesStand({ versie: 'abc', versiedatum: 'x', vastgesteld: '300', rekenregels_vastgesteld: -2 });
  assert.equal(slecht, null);
  assert.equal(W.standRegel(data.kop.stand, W.leesStand({ versie: '1.0.0', versiedatum: 'kapot', vastgesteld: 3 })), '', 'geen regel zonder geldige datum');
  assert.equal(W.standRegel(data.kop.stand, null), '');
});

test('tools/index.json: gesorteerd op aantal, ongeldige tools vallen weg, link naar de toolkaart', () => {
  const t = W.leesTools(toolsFixture, data.toolKaartBasis);
  assert.deepEqual(t.map((x) => x.naam), ['Financieel Kompas', 'Vastgoed', 'Briefhulp FR']);
  assert.equal(t[0].url, 'https://communitiesabroad.com/manifest/tool/financieel-kompas');
  assert.equal(t[0].aantal, 81);
  assert.deepEqual(W.leesTools(null, data.toolKaartBasis), []);
  assert.deepEqual(W.leesTools({ tools: 'nee' }, data.toolKaartBasis), []);
  assert.deepEqual(W.leesTools(toolsFixture, 'http://onveilig.nl/'), [], 'zonder https-basis geen links');
});

test('schil: live ophalen anoniem met time-out en laadtoken, zacht falen, geen innerHTML, geen opslag', () => {
  const code = html.slice(html.indexOf('wkOpen(from){'), html.indexOf('// ---- Onze sponsors (sponsors.json'));
  const tpl = html.slice(html.indexOf('ZO WERKEN WIJ ('), html.indexOf('BRIEF UITLEGGEN (foto'));
  assert.match(code, /credentials:"omit"/);
  assert.match(code, /AbortController/);
  assert.match(code, /8000/);
  assert.match(code, /maakTeller\(\)/);
  assert.match(code, /peilStandUrl/); assert.match(code, /toolsUrl/);
  assert.ok(!/innerHTML/.test(code + tpl), 'tekst nooit via innerHTML');
  assert.ok(!/localStorage|sessionStorage/.test(code), 'alleen in het geheugen');
  assert.ok(!/setInterval/.test(code));
  // Eén h1 in de pagina zelf; het scherm staat dus niet meer in KOP_H1 (de kopbalktitel is dan geen tweede h1).
  assert.equal((tpl.match(/<h1\b/g) || []).length, 1);
  assert.ok(!/const KOP_H1 = \[[^\]]*"werkwijze"/.test(html));
  // Tikvlakken van minstens 44 px, geen tekst onder 11,5 px.
  for (const m of (tpl + code).matchAll(/font:(?:\d{3} )?(\d+(?:\.\d+)?)px/g)) assert.ok(Number(m[1]) >= 11.5, 'lettergrootte ' + m[1]);
  for (const m of code.matchAll(/min-height:(\d+)px/g)) assert.ok(Number(m[1]) >= 44, 'tikvlak ' + m[1]);
  // De dia-bediening is weg.
  assert.ok(!/wkVolgende|wkVorige|wkTouch|wkSegmenten|wkIdx/.test(code + tpl));
  // De terugval met link naar de site en de knop Opnieuw proberen.
  assert.match(tpl, /data-wk-terugval="1"/);
});

test('links: abonneeknop uit modules.json, manifest en kwaliteitsdashboard, alles https', () => {
  assert.equal(data.zelf.knoppen[4].url, '@abonnement'); assert.equal(data.zelf.knoppen[3].url, '@manifest');
  assert.equal(A.abonneeUrl(cat), cat.abonnement.url);
  assert.equal(data.manifestUrl, 'https://infofrankrijk.com/ons-manifest-hoe-wij-werken/');
  assert.equal(data.siteUrl, 'https://communitiesabroad.com/zo-controleren-wij');
  assert.equal(data.peilStandUrl, 'https://communitiesabroad.com/manifest/peil-stand.json');
  assert.equal(data.toolsUrl, 'https://communitiesabroad.com/manifest/tools/index.json');
  assert.ok(!lees('data/werkwijze.json').includes(cat.abonnement.url));
});

test('hash-route #/zo-werken-wij, geen tab, terug verlaat het scherm', () => {
  assert.deepEqual(N.parseHash('#/zo-werken-wij'), { soort: 'scherm', scherm: 'werkwijze' });
  assert.equal(N.bouwHash({ screen: 'werkwijze' }), '#/zo-werken-wij');
  assert.equal(H.tabVan('werkwijze'), '');
  assert.match(html, /const SHOWBACK = \/[^\n]*\|werkwijze\|/);
  assert.match(lees('landing-lib.js'), /heeftInhoudHash/);
});

test('toegang: Over ons, zoeken en de planeet; geen tiende tegel op de hub', () => {
  assert.match(html, /data-over-werkwijze="1" onClick="\{\{ overWerkwijze \}\}"/);
  assert.match(html, /Zo werken wij: lees hoe wij elk cijfer controleren/);
  assert.match(html, /overWerkwijze: \(\) => this\.wkOpen\("over"\)/);
  assert.ok(cat.werkwijzeZoek && /werkwijze/.test(cat.werkwijzeZoek.woorden) && cat.werkwijzeZoek.titel === 'Zo werken wij');
  assert.ok(!/\bdia/i.test(cat.werkwijzeZoek.regel));
  assert.match(html, /wz\.titel && woorden\.every/);
  const it = cat.planeet.schermen.find((s) => s.id === 'werkwijze');
  assert.ok(it && it.doel === 'werkwijze' && cat.planeet.manen.some((m) => m.id === it.maan) && !/\bdia/i.test(it.regel));
  assert.match(html, /case "werkwijze": this\.wkOpen\("zoek"\)/);
  assert.equal(cat.themas.length, 9);
});

test('service worker kent de bestanden en is opgehoogd', () => {
  const sw = lees('sw.js');
  ['./werkwijze-lib.js', './data/werkwijze.json'].forEach((f) => assert.ok(sw.includes('"' + f + '"'), f));
  assert.match(sw, /VERSIE = "2026-11-16-\d+"/);
  assert.match(html, /<script src="\.\/werkwijze-lib\.js"><\/script>/);
});
