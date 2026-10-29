import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const F = createRequire(import.meta.url)('../feedback-lib.js');
const geldig = { naam: 'Jan', onderdeel: 'hub', bericht: 'De knop werkt niet', toestemming: true };

test('valideer: volgorde van de fouten volgt het scherm', () => {
  assert.equal(F.valideer({}), 'naam');
  assert.equal(F.valideer({ naam: ' ', onderdeel: 'hub' }), 'naam');
  assert.equal(F.valideer({ naam: 'J', onderdeel: 'x' }), 'onderdeel');
  assert.equal(F.valideer({ naam: 'J', onderdeel: 'hub', bericht: 'abc' }), 'bericht');
  assert.equal(F.valideer({ naam: 'J', onderdeel: 'hub', bericht: 'lang genoeg' }), 'toestemming');
  assert.equal(F.valideer({ naam: 'J', onderdeel: 'hub', bericht: 'lang genoeg', toestemming: 'true' }), 'toestemming');
  assert.equal(F.valideer(geldig), null);
});

test('de onderdelen komen overeen met de toegestane waarden van de Edge Function en de tabel', () => {
  assert.deepEqual(F.ONDERDELEN.map(o => o.id), ['hub', 'zoeken', 'gemeente', 'hygiene', 'artikelen', 'overig']);
});

test('body kapt af en stuurt het verborgen veld mee', () => {
  const b = F.body({ ...geldig, naam: 'x'.repeat(200), bericht: 'y'.repeat(5000), web: 'bot' });
  assert.equal(b.naam.length, 80);
  assert.equal(b.bericht.length, 2000);
  assert.equal(b.web, 'bot');
  assert.equal(b.toestemming, true);
});

test('toestelTekst blijft grof', () => {
  assert.equal(F.toestelTekst('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605 Version/17.5 Mobile/15E148 Safari/604.1', 'iPhone'), 'iPhone/iPad, Safari');
  assert.equal(F.toestelTekst('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36', 'Linux'), 'Android, Chrome');
  assert.equal(F.toestelTekst('', ''), '');
});

const resp = (status, json) => ({ ok: status >= 200 && status < 300, status, json: () => (json === undefined ? Promise.reject(new Error('x')) : Promise.resolve(json)) });

test('zend: ongeldige invoer gaat niet het net op', async () => {
  let aangeroepen = false;
  const r = await F.zend(() => { aangeroepen = true; return Promise.resolve(resp(200, { ok: true })); }, { naam: '' });
  assert.deepEqual(r, { ok: false, fout: 'naam' });
  assert.equal(aangeroepen, false);
});

test('zend: succes, POST naar het eindpunt zonder cookies', async () => {
  let url, req;
  const r = await F.zend((u, o) => { url = u; req = o; return Promise.resolve(resp(200, { ok: true })); }, geldig);
  assert.deepEqual(r, { ok: true });
  assert.equal(url, F.ENDPOINT);
  assert.equal(req.method, 'POST');
  assert.equal(req.credentials, 'omit');
  assert.equal(JSON.parse(req.body).naam, 'Jan');
});

test('zend: 429, serverfout, ongeldige JSON en netwerkfout geven elk een eerlijke uitkomst', async () => {
  assert.deepEqual(await F.zend(() => Promise.resolve(resp(429, {})), geldig), { ok: false, fout: 'druk' });
  assert.deepEqual(await F.zend(() => Promise.resolve(resp(500, {})), geldig), { ok: false, fout: 'server' });
  assert.deepEqual(await F.zend(() => Promise.resolve(resp(200)), geldig), { ok: false, fout: 'server' });
  assert.deepEqual(await F.zend(() => Promise.resolve(resp(200, { ok: false })), geldig), { ok: false, fout: 'server' });
  assert.deepEqual(await F.zend(() => Promise.reject(new Error('offline')), geldig), { ok: false, fout: 'netwerk' });
  assert.deepEqual(await F.zend(() => { throw new Error('sync'); }, geldig), { ok: false, fout: 'netwerk' });
});

test('elke fout heeft een Nederlandse tekst en de teksten bevatten geen liggend streepje', () => {
  for (const k of ['naam', 'onderdeel', 'bericht', 'toestemming', 'druk', 'netwerk', 'server', 'onbekend']) {
    const t = F.foutTekst(k);
    assert.ok(t && t.length > 5);
    assert.ok(!/[–—]/.test(t), k);
  }
});

test('de bron verwijst naar het AVG-adres en de bewaartermijn van drie maanden', () => {
  assert.equal(F.CONTACT, 'info@communitiesabroad.com');
  assert.equal(F.MAANDEN, 3);
  const src = readFileSync(join(root, 'feedback-lib.js'), 'utf8');
  assert.ok(!/[–—]/.test(src.replace(/\/\/.*$/gm, '')));
});

const html = readFileSync(join(root, 'index.html'), 'utf8');
const sw = readFileSync(join(root, 'sw.js'), 'utf8');

test('index.html: bibliotheek geladen, menu-item en blad aanwezig, sluiten via terugstap en Escape', () => {
  assert.match(html, /<script src="\.\/feedback-lib\.js"><\/script>/);
  assert.match(html, /data-menu-feedback="1"[\s\S]{0,400}>Feedback<\/span>/);
  assert.match(html, /data-fbblad="1"/);
  assert.match(html, /if \(st\.fbOpen\) \{ this\.fbSluit\(\); return true; \}/);
  assert.match(html, /ev\.key === "Escape" && this\.state\.fbOpen/);
  assert.match(html, /st\.fbOpen \? "feedback"/);
  assert.match(html, /\.\.\.this\.fbVals\(\)/);
});

test('de naam en reactie gaan nooit naar localStorage of sessionStorage', () => {
  const blok = html.slice(html.indexOf('// ---- Feedback van testers'), html.indexOf('menuNaar(update){')).replace(/protoSluit:.*\n/, '');
  assert.ok(blok.length > 500);
  assert.ok(!/localStorage|sessionStorage/.test(blok.replace(/\/\/.*$/gm, '')));
});

test('het blad vraagt expliciet toestemming en noemt contact en bewaartermijn', () => {
  assert.match(html, /Ik geef toestemming dat mijn naam en opmerkingen worden bewaard/);
  assert.match(html, /type="checkbox" checked="\{\{ fbAkkoord \}\}"/);
  assert.match(html, /\{\{ fbPrivacy \}\}/);
});

test('service worker kent het nieuwe bestand', () => {
  assert.match(sw, /"\.\/feedback-lib\.js"/);
});
