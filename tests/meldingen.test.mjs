import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const M = require('../meldingen-lib.js');

const item = (o) => ({ id: 'x', titel: 'Aangifte inkomstenbelasting', rubriek: 'fiscaal', soort: 'datum', gebied: 'heel Frankrijk', status: 'vastgesteld', toon_in: ['pagina', 'infopoche'], datum_zeker: true, voorkomens: [{ van: '2026-11-18', tot: '2026-11-18' }], ...o });
const abo = (o) => ({ rubrieken: ['fiscaal', 'verenigingen'], dagen: [7, 1], dep: '24', ...o });
const nietVerstuurd = () => false;
const kies = (a, items, vandaag = '2026-11-11', v = nietVerstuurd, r = 0) => M.kiesMeldingen(a, items, vandaag, v, r);

test('selectie: over 7 dagen, morgen en op de dag zelf volgens de gekozen dagen', () => {
  const i = item({});
  assert.equal(kies(abo(), [i], '2026-11-11').length, 1);          // 7 dagen
  assert.equal(kies(abo(), [i], '2026-11-17').length, 1);          // 1 dag
  assert.equal(kies(abo(), [i], '2026-11-18').length, 0);          // dag zelf niet gekozen
  assert.equal(kies(abo({ dagen: [0] }), [i], '2026-11-18').length, 1);
  assert.equal(kies(abo(), [i], '2026-11-12').length, 0);          // 6 dagen: geen moment
});

test('selectie: tekst per moment, periode begint', () => {
  assert.equal(kies(abo(), [item({})], '2026-11-11')[0].tekst, 'Over 7 dagen: Aangifte inkomstenbelasting');
  assert.equal(kies(abo(), [item({})], '2026-11-17')[0].tekst, 'Morgen: Aangifte inkomstenbelasting');
  assert.equal(kies(abo({ dagen: [0] }), [item({ soort: 'periode' })], '2026-11-18')[0].tekst, 'Vandaag begint: Aangifte inkomstenbelasting');
  assert.ok(!/[–—]/.test(kies(abo(), [item({ titel: 'A — B' })])[0].tekst));
});

test('selectie: alleen aangezette rubrieken', () => {
  assert.equal(kies(abo({ rubrieken: ['school'] }), [item({})]).length, 0);
});

test('selectie: alleen vastgesteld, infopoche in toon_in en een zekere datum', () => {
  assert.equal(kies(abo(), [item({ status: 'te_verifieren' })]).length, 0);
  assert.equal(kies(abo(), [item({ toon_in: ['pagina'] })]).length, 0);
  assert.equal(kies(abo(), [item({ datum_zeker: false })]).length, 0);
  assert.equal(kies(abo(), [item({ titel: 'Open dag (waarschijnlijke datum)' })]).length, 0);
});

test('departement: verenigingen alleen in het eigen departement', () => {
  const v = item({ rubriek: 'verenigingen', gebied: ['24'], id: 'v' });
  assert.equal(kies(abo({ dep: '24' }), [v]).length, 1);
  assert.equal(kies(abo({ dep: '33' }), [v]).length, 0);
  assert.equal(kies(abo({ dep: 'geen' }), [v]).length, 0);
  assert.equal(kies(abo({ dep: '24' }), [item({ rubriek: 'verenigingen', gebied: 'heel Frankrijk' })]).length, 0, 'onbekend gebied telt nooit');
});

test('gebied: landelijk telt, zone en streek niet', () => {
  assert.ok(M.gebiedPast(item({ gebied: 'heel Frankrijk' }), 'geen'));
  assert.ok(M.gebiedPast(item({ gebied: 'Nederland' }), 'geen'));
  assert.ok(M.gebiedPast(item({ gebied: ['Nederland', 'heel Frankrijk'] }), 'geen'));
  assert.ok(!M.gebiedPast(item({ gebied: ['zone A', 'zone B'] }), '24'));
  assert.ok(!M.gebiedPast(item({ gebied: 'Elzas-Moezel' }), '67'));
  assert.ok(M.gebiedPast(item({ gebied: ['75', '92'] }), '92'));
  assert.ok(!M.gebiedPast(item({ gebied: ['75'] }), '24'));
});

test('maximum 3 per dag, deadlines (datum) eerst, dichtstbij eerst', () => {
  const lijst = ['a', 'b', 'c', 'd'].map((x, n) => item({ id: x, titel: 'T' + x, soort: n === 0 ? 'periode' : 'datum', voorkomens: [{ van: '2026-11-18', tot: '2026-11-18' }] }));
  const uit = kies(abo({ dagen: [0] }), lijst, '2026-11-18');
  assert.equal(uit.length, 3);
  assert.ok(uit.every((c) => c.soort === 'datum'), 'de periode valt als eerste af');
  assert.equal(kies(abo({ dagen: [0] }), lijst, '2026-11-18', nietVerstuurd, 2).length, 1, 'al twee gestuurd vandaag: nog een');
  assert.equal(kies(abo({ dagen: [0] }), lijst, '2026-11-18', nietVerstuurd, 3).length, 0);
});

test('ontdubbelen: een al verstuurde melding komt niet terug', () => {
  const verstuurd = (id, v, d) => id === 'x' && v === '2026-11-18' && d === 7;
  assert.equal(kies(abo(), [item({})], '2026-11-11', verstuurd).length, 0);
  assert.equal(kies(abo(), [item({})], '2026-11-17', verstuurd).length, 1, 'de herinnering van 1 dag vooraf is een andere melding');
});

test('voorkomens: jaarlijks terugkerend item, alleen het voorkomen dat nu aan de beurt is', () => {
  const i = item({ voorkomens: [{ van: '2026-11-18', tot: '2026-11-18' }, { van: '2027-11-18', tot: '2027-11-18' }] });
  const uit = kies(abo(), [i], '2027-11-11');
  assert.equal(uit.length, 1);
  assert.equal(uit[0].voorkomen, '2027-11-18');
});

test('staat: iPhone niet geinstalleerd, geen Push API, geweigerd, uit en aan', () => {
  assert.equal(M.staat({ ios: true, standalone: false, heeftPush: false }), 'ios-installeren');
  assert.equal(M.staat({ ios: true, standalone: false, heeftPush: true, permissie: 'granted', aangezet: true }), 'ios-installeren');
  assert.equal(M.staat({ ios: true, standalone: true, heeftPush: false }), 'geen-push');
  assert.equal(M.staat({ ios: false, heeftPush: false }), 'geen-push');
  assert.equal(M.staat({ ios: false, heeftPush: true, permissie: 'denied' }), 'geweigerd');
  assert.equal(M.staat({ ios: false, heeftPush: true, permissie: 'default' }), 'uit');
  assert.equal(M.staat({ ios: true, standalone: true, heeftPush: true, permissie: 'granted', aangezet: false }), 'uit');
  assert.equal(M.staat({ ios: false, heeftPush: true, permissie: 'granted', aangezet: true }), 'aan');
});

test('keuze lezen: standaard 7 en 1, onbekende rubrieken en rommel vallen weg', () => {
  assert.deepEqual(M.leesKeuze(null, ['fiscaal']), { aan: false, rubrieken: [], dagen: [7, 1] });
  const k = M.leesKeuze({ aan: true, rubrieken: ['fiscaal', 'nep', 'fiscaal', 5, '../x'], dagen: [0, 9] }, ['fiscaal', 'wonen']);
  assert.deepEqual(k, { aan: true, rubrieken: ['fiscaal'], dagen: [0] });
  assert.deepEqual(M.wisselDag([7], 7), [7], 'minstens een moment blijft staan');
  assert.deepEqual(M.wisselDag([7, 1], 0), [7, 1, 0]);
});

test('server: body alleen met https-adres en sleutels; niets over naam of mail', () => {
  const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'p', auth: 'a' } };
  const b = M.serverBody(sub, { rubrieken: ['fiscaal'], dagen: [7] }, '24');
  assert.deepEqual(Object.keys(b).sort(), ['auth', 'dagen', 'dep', 'endpoint', 'p256dh', 'rubrieken']);
  assert.equal(M.serverBody({ endpoint: 'http://x', keys: { p256dh: 'p', auth: 'a' } }, { rubrieken: [], dagen: [] }, '24'), null);
  assert.equal(M.serverBody(null, {}, '24'), null);
});

test('VAPID: publieke sleutel is 65 bytes P-256 en de privesleutel staat nergens in de repo', () => {
  const bytes = M.sleutelBytes(M.VAPID_PUBLIEK);
  assert.equal(bytes.length, 65);
  assert.equal(bytes[0], 4);
  for (const f of ['meldingen-lib.js', 'index.html', 'sw.js', 'CLAUDE.md', 'supabase/functions/infopoche-push/index.ts', 'supabase/functions/infopoche-push-zend/index.ts']) {
    assert.ok(!/BEGIN (EC )?PRIVATE|"d":\s*"/.test(fs.readFileSync(f, 'utf8')), f);
  }
});

test('Edge Function: de selectie is letterlijk dezelfde als in de lib', () => {
  const blok = (t) => t.match(/\/\/ ---- selectie begin ----\n[\s\S]*?\/\/ ---- selectie eind ----\n/)[0];
  assert.equal(blok(fs.readFileSync('supabase/functions/infopoche-push-zend/index.ts', 'utf8')), blok(fs.readFileSync('meldingen-lib.js', 'utf8')));
});

test('Edge Function infopoche-push: herkomst, https en alleen bekende pushdiensten', () => {
  const t = fs.readFileSync('supabase/functions/infopoche-push/index.ts', 'utf8');
  assert.ok(t.includes('"https://infopoche.fr", "https://www.infopoche.fr"'));
  assert.ok(/PUSHDIENST/.test(t) && t.includes('^https:'));
});

test('app: route, menu, kalenderrij, service worker en geen tekst onder 11,5 px in het scherm', () => {
  const ctx = { window: {} }; const vm = require('node:vm'); vm.createContext(ctx); vm.runInContext(fs.readFileSync('nav-lib.js', 'utf8'), ctx);
  assert.deepEqual({ ...ctx.window.IfNav.parseHash('#/meldingen') }, { soort: 'scherm', scherm: 'meldingen' });
  assert.equal(ctx.window.IfNav.bouwHash({ screen: 'meldingen' }), '#/meldingen');
  const h = fs.readFileSync('index.html', 'utf8');
  assert.ok(h.includes('data-menu-meldingen') && h.includes('data-kal-meldingen') && h.includes('if (s === "meldingen") return this.mdOpen("hub");'));
  assert.ok(h.includes('<script src="./meldingen-lib.js"></script>'));
  const sw = fs.readFileSync('sw.js', 'utf8');
  assert.ok(sw.includes('addEventListener("push"') && sw.includes('addEventListener("notificationclick"') && sw.includes('"./meldingen-lib.js"'));
  const scherm = h.slice(h.indexOf('data-meldingen="1"'), h.indexOf('<sc-if value="{{ isSponsors }}"'));
  for (const m of scherm.matchAll(/font:\d+ (\d+(?:\.\d+)?)px/g)) assert.ok(+m[1] >= 12, 'te klein: ' + m[0]);
});

test('modules.json: korte uitleg per rubriek, zonder lange streepjes en zonder u-vorm', () => {
  const c = JSON.parse(fs.readFileSync('modules.json', 'utf8'));
  for (const [k, v] of Object.entries(c.meldingen.uitleg)) { assert.ok(v.length > 5 && v.length < 60, k); assert.ok(!/[–—]/.test(v)); }
});
