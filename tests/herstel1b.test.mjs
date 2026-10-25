// Herstelronde 1 (25-10-2026, bouwer): liggende streepjes, desktop, tab bij modules, procent-gecodeerde slugs, postcodeblad.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lees = (f) => readFileSync(join(root, f), 'utf8');
const req = createRequire(import.meta.url);
const L = req('../landing-lib.js'), H = req('../hub-lib.js'), A = req('../artikel-lib.js'), N = req('../nav-lib.js');
const DASH = /[—–]/;

// Haalt het Over ons-scherm (sc-if isOver ... tot de volgende schermkop) en commentaarregels uit een bron.
function zonderOverOns(src) {
  const i = src.indexOf('<!-- ============ OVER ONS');
  if (i < 0) return src;
  const j = src.indexOf('<!-- ============', i + 10);
  return src.slice(0, i) + (j > 0 ? src.slice(j) : '');
}
function zichtbaar(regel) {
  const t = regel.trim();
  return !(t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') || t.startsWith('<!--'));
}
// Een streepje tussen cijfers (1-3, 9-20 uur) is een bereik en mag. Alles daarbuiten niet.
const bereik = (r) => r.replace(/\d[–]\d/g, '').replace(/§\d+[–]\d+/g, '');

test('1. geen em- of en-dash in zichtbare teksten (index.html buiten Over ons, landing-lib.js, modules.json)', () => {
  const fouten = [];
  const scan = (naam, src) => src.split('\n').forEach((r, n) => {
    if (!zichtbaar(r)) return;
    if (/^\s*"_/.test(r)) return; // _uitleg-velden in modules.json zijn commentaar
    const x = bereik(r);
    if (DASH.test(x) && !/\{\s*soort\s*:/.test(x)) fouten.push(naam + ':' + (n + 1) + ' ' + r.trim().slice(0, 90));
  });
  scan('index.html', zonderOverOns(lees('index.html')));
  scan('landing-lib.js', lees('landing-lib.js'));
  scan('modules.json', lees('modules.json'));
  assert.deepEqual(fouten.filter(f => !/ — .*\/\*|catch \(e\)/.test(f)), [], fouten.join('\n'));
});

test('1b. de genoemde keuringsteksten zijn herschreven', () => {
  const h = lees('index.html');
  ['Later, ik vul het per keer in', 'Later, naar de gratis onderdelen', 'één app: u ziet'].forEach(t => assert.ok(h.includes(t), t));
  ['Later —', 'Nog niet beschikbaar —', 'Voorbeeldgegevens —', 'Geen uitkomst te tonen —'].forEach(t => assert.ok(!h.includes(t), t));
});

test('3. desktop: geen installatiebalk en geen automatisch blad', () => {
  assert.equal(L.isDesktopWeergave({ breed: true, fijn: true }), true);
  assert.equal(L.isDesktopWeergave({ breed: true, fijn: false }), false, 'brede tablet met touch is geen desktop');
  assert.equal(L.isDesktopWeergave({ breed: false, fijn: true }), false);
  assert.equal(L.isDesktopWeergave({ omgeving: 'desktop' }), true);
  assert.equal(L.toonBalk({ desktop: true }), false);
  assert.equal(L.toonBalk({}), true);
  assert.equal(L.toonAutoBlad({ nuttig: true, desktop: true }), false);
  assert.equal(L.toonAutoBlad({ nuttig: true }), true);
  const h = lees('index.html');
  assert.ok(h.includes('desktop:this.isDesktop()'), 'de app geeft desktop door aan toonBalk en toonAutoBlad');
  assert.ok(h.includes('"(min-width: 900px)"') && h.includes('"(pointer: fine)"'));
  assert.ok(/mnBeginscherm/.test(h) && /Scan met uw telefoon/.test(lees('landing-lib.js')), 'menukaart en QR blijven');
});

test('6. een open module hoort bij de tab Modules', () => {
  assert.equal(H.tabVan('tool'), 'mod');
  assert.equal(H.tabVan('mod'), 'mod');
  assert.equal(H.tabVan('hub'), 'hub');
});

test('5. de kopbalk toont geen intern schilveld', () => {
  assert.ok(!/st\.tool\.schil/.test(lees('index.html')));
});

test('7. slugs met procent-codes (woordenlijst ... %e2%87%84) openen in de app', () => {
  const u = 'https://infofrankrijk.com/woordenlijst-klussen-bouwen-nl-%e2%87%84-fr/';
  assert.equal(A.slugUitUrl(u), 'woordenlijst-klussen-bouwen-nl-%e2%87%84-fr');
  assert.equal(A.slugUitUrl('https://infofrankrijk.com/x-%E2%87%84-y/'), 'x-%e2%87%84-y');
  assert.equal(A.slugUitUrl('https://infofrankrijk.com/x-%zz/'), null);
  assert.equal(A.slugUitUrl('https://infofrankrijk.com/klussen/woordenlijst/'), null, 'buiten de app blijft buiten');
  assert.deepEqual(N.parseHash('#/artikel/woordenlijst-nl-%e2%87%84-fr'), { soort: 'artikel', slug: 'woordenlijst-nl-%e2%87%84-fr' });
  assert.deepEqual(N.parseHash('#/artikel/%E0%A4%A'), { soort: 'hub' });
  assert.ok(lees('index.html').includes('Op infofrankrijk.com \\u2197'), 'buiten de app staat zichtbaar in het resultaat');
});

test('2. postcodeblad opent niet vanzelf, wel via kaart of menu, sluit op buiten tikken en Escape', () => {
  const h = lees('index.html');
  assert.ok(!/vraagPostcode:\s*!pc && !pcLater/.test(h), 'geen automatisch blad bij de start');
  assert.ok(h.includes('pcBladSluit') && /Escape" && this\.state\.vraagPostcode/.test(h));
  assert.ok(h.includes('Uw postcode blijft op dit toestel en wordt alleen gebruikt om bij u in de buurt te zoeken.'));
  assert.ok(!h.includes('geo.api.gouv.fr, een dienst'), 'geen technische uitleg in het blad');
  assert.equal(H.regioLabel('', ''), 'Stel uw postcode in');
});

test('8. aanraakdoelen en de balk onder een blad', () => {
  const h = lees('index.html');
  assert.ok(/aria-label="Wissen" style="width:44px;height:44px/.test(h));
  assert.ok(/aria-label="Sluiten" style="flex:none;width:44px;height:44px/.test(h));
  assert.ok(!/weg:st\.balkWeg \? "1" : ""\}\) && !st\.installBlad/.test(h), 'de balk blijft onder het blad staan');
});
