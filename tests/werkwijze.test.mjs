// Het scherm Zo werken wij (14 november 2026): twaalf dia's, data in data/werkwijze.json, logica in werkwijze-lib.js.
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

// Alle zichtbare teksten van de dia's, plat.
function teksten(v, uit = []) {
  if (typeof v === 'string') uit.push(v);
  else if (Array.isArray(v)) v.forEach((x) => teksten(x, uit));
  else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => { if (!/^_/.test(k) && !/^(url|id|soort|kleur|toon|stijl|vlak)$/.test(k)) teksten(x, uit); });
  return uit;
}

test('de data is geldig: twaalf dia\'s in de afgesproken volgorde, elk met titel en blokken', () => {
  assert.ok(data);
  assert.equal(data.dias.length, 12);
  assert.deepEqual(data.dias.map((d) => d.id), ['cover', 'basis', 'zandloper', 'kringloop', 'heen', 'terug', 'nieuw', 'keuring', 'kwaliteit', 'tools', 'ritme', 'slot']);
  data.dias.forEach((d) => { assert.ok(d.titel, d.id); assert.ok(d.blokken.length > 0, d.id); assert.ok(W.KLEUREN.includes(d.kleur), d.id); });
  assert.equal(ruw.dias.length, data.dias.length, 'geen dia of blok valt stil af bij het lezen');
  ruw.dias.forEach((d, i) => assert.equal(d.blokken.length, data.dias[i].blokken.length, d.id));
  assert.equal(data.stand, '14 november 2026');
  assert.match(data.dias[0].oog, /STAND 14 NOVEMBER 2026/);
});

test('de lezer wordt aangesproken met je, nergens met u; geen lange streepjes; geen communitiesabroad', () => {
  const alle = teksten(ruw.dias).join('\n');
  assert.ok(!/(^|[\s(])[Uu]($|[\s.,;:!?])/.test(alle), 'u-vorm');
  assert.ok(!/\b[Uu]w[a-z]*\b|\buzelf\b/i.test(alle), 'uw');
  assert.ok(!/[–—]/.test(lees('data/werkwijze.json')), 'lange streepjes');
  assert.ok(!/communitiesabroad/i.test(lees('data/werkwijze.json')), 'communitiesabroad');
  assert.ok(/Voor jou:/.test(alle) && /zie je:/.test(alle));
});

test('dia tools: de slotregel is vervangen en de mock-up-regel van dia 3 is kort', () => {
  const tools = data.dias.find((d) => d.id === 'tools');
  assert.ok(teksten(tools.blokken).includes('Per tool ligt van elk bedrag vast: de bron, de datum van controle en de volgende controle.'));
  const zl = data.dias.find((d) => d.id === 'zandloper'), reeks = zl.blokken.find((b) => b.soort === 'reeks');
  assert.equal(reeks.staart, 'en acht andere');
  assert.equal(reeks.items.length, 4);
});

test('links: abonneeknop uit modules.json, manifest en kwaliteitsdashboard, alles https', () => {
  const slot = data.dias[11], knoppen = slot.blokken.filter((b) => b.soort === 'knop');
  assert.equal(knoppen.length, 2);
  assert.equal(knoppen[0].url, '@abonnement'); assert.equal(knoppen[1].url, '@manifest');
  assert.equal(A.abonneeUrl(cat), cat.abonnement.url);
  assert.equal(data.manifestUrl, 'https://infofrankrijk.com/ons-manifest-hoe-wij-werken/');
  assert.equal(W.urlOk(data.manifestUrl), data.manifestUrl);
  const kw = data.dias.find((d) => d.id === 'kwaliteit').blokken.find((b) => b.soort === 'knop');
  assert.equal(kw.url, 'https://www.cafeclaude.fr/kwaliteit');
  assert.equal(W.urlOk('http://x.nl'), ''); assert.equal(W.urlOk('javascript:alert(1)'), '');
  // De abonneelink staat nergens als vaste tekst in de data of in de nieuwe code.
  assert.ok(!lees('data/werkwijze.json').includes(cat.abonnement.url));
});

test('hash-route #/zo-werken-wij, geen tab, terug verlaat het scherm', () => {
  assert.deepEqual(N.parseHash('#/zo-werken-wij'), { soort: 'scherm', scherm: 'werkwijze' });
  assert.equal(N.bouwHash({ screen: 'werkwijze' }), '#/zo-werken-wij');
  assert.equal(H.tabVan('werkwijze'), '');
  assert.match(html, /const SHOWBACK = \/[^\n]*\|werkwijze\|/);
  assert.match(html, /const KOP_H1 = \[[^\]]*"werkwijze"/);
  // Een dia is geen eigen geschiedenisregel: de dia staat niet in de navigatiesleutel.
  assert.ok(!/wkIdx/.test(lees('nav-lib.js')));
  assert.ok(!/wkIdx/.test(html.slice(html.indexOf('histToestand(){'), html.indexOf('histScroll(id, nul){'))));
  assert.match(lees('landing-lib.js'), /heeftInhoudHash/);
});

test('toegang: Over ons, zoeken en de planeet', () => {
  assert.match(html, /data-over-werkwijze="1" onClick="\{\{ overWerkwijze \}\}"/);
  assert.match(html, /overWerkwijze: \(\) => this\.wkOpen\("over"\)/);
  assert.ok(cat.werkwijzeZoek && /werkwijze/.test(cat.werkwijzeZoek.woorden) && cat.werkwijzeZoek.titel === 'Zo werken wij');
  assert.match(html, /wz\.titel && woorden\.every/);
  const it = cat.planeet.schermen.find((s) => s.id === 'werkwijze');
  assert.ok(it && it.doel === 'werkwijze' && cat.planeet.manen.some((m) => m.id === it.maan));
  assert.match(html, /case "werkwijze": this\.wkOpen\("zoek"\)/);
  // Geen tiende tegel op de hub: het aantal themategels blijft negen.
  assert.equal(cat.themas.length, 9);
});

test('bediening: tik links of rechts, vegen, grenzen, teller en segmenten', () => {
  assert.equal(W.tikRichting(10, 388), 'vorige'); assert.equal(W.tikRichting(300, 388), 'volgende'); assert.equal(W.tikRichting(194, 388), 'volgende');
  assert.equal(W.veegRichting(-80, 5), 'volgende'); assert.equal(W.veegRichting(80, -10), 'vorige');
  assert.equal(W.veegRichting(-30, 0), '', 'te kort');
  assert.equal(W.veegRichting(-60, 60), '', 'schuin is scrollen');
  assert.equal(W.stap(0, -1, 12), 0); assert.equal(W.stap(11, 1, 12), 11); assert.equal(W.stap(3, 1, 12), 4); assert.equal(W.stap(3, -1, 12), 2);
  assert.equal(W.teller(0, 12), '1 / 12'); assert.equal(W.teller(11, 12), '12 / 12');
  const s = W.segmenten(2, 12); assert.equal(s.length, 12); assert.equal(s.filter((x) => x.gevuld).length, 3);
  // De schil: niets speelt vanzelf (geen timer voor de dia's), knoppen van 48 px, geen tekst onder 11,5 px.
  const code = html.slice(html.indexOf('wkOpen(from){'), html.indexOf('// ---- Onze sponsors (sponsors.json'));
  assert.ok(!/setInterval|setTimeout\([^)]*wkStap/.test(code), 'geen automatische doorloop');
  const tpl = html.slice(html.indexOf('ZO WERKEN WIJ (twaalf'), html.indexOf('BRIEF UITLEGGEN (foto'));
  assert.match(tpl, /width:48px;height:48px/);
  for (const m of (tpl + code).matchAll(/font:(?:\d{3} )?(\d+(?:\.\d+)?)px/g)) assert.ok(Number(m[1]) >= 11.5, 'lettergrootte ' + m[1]);
  assert.match(tpl, /onTouchStart="\{\{ wkTouchStart \}\}" onTouchEnd="\{\{ wkTouchEnd \}\}"/);
  assert.ok(!/innerHTML/.test(code + tpl), 'tekst nooit via innerHTML');
});

test('service worker kent de nieuwe bestanden', () => {
  const sw = lees('sw.js');
  ['./werkwijze-lib.js', './data/werkwijze.json'].forEach((f) => assert.ok(sw.includes('"' + f + '"'), f));
  assert.match(sw, /VERSIE = "2026-11-14-\d+"/);
  assert.match(html, /<script src="\.\/werkwijze-lib\.js"><\/script>/);
});
