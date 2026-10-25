import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const p = (f) => join(root, f);
const L = createRequire(import.meta.url)('../landing-lib.js');

const UA = {
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  chromeIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.153 Mobile/15E148 Safari/604.1',
  fb: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/450.0.0.38.108;]',
  fbAndroid: 'Mozilla/5.0 (Linux; Android 13; SM-G991B Build/TP1A) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0.0.38.108;]',
  insta: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0.20.113',
  wa: 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36 WhatsApp/2.24.10.80',
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
};
const env = (o) => L.detecteerOmgeving(o);

test('Android Chrome is android, met of zonder installatie-event', () => {
  assert.equal(env({ ua: UA.android, platform: 'Linux armv81', maxTouchPoints: 5, breedte: 390 }), 'android');
  assert.equal(env({ ua: UA.android, platform: 'Linux armv81', maxTouchPoints: 5, breedte: 390, heeftInstallEvent: true }), 'android');
});
test('iPhone Safari en iPad (Macintosh met touch) zijn ios', () => {
  assert.equal(env({ ua: UA.iphone, platform: 'iPhone', maxTouchPoints: 5, breedte: 390 }), 'ios');
  assert.equal(env({ ua: UA.ipad, platform: 'MacIntel', maxTouchPoints: 5, breedte: 820 }), 'ios');
  assert.equal(env({ ua: UA.chromeIos, platform: 'iPhone', maxTouchPoints: 5, breedte: 390 }), 'ios');
  assert.equal(L.iosBrowser(UA.chromeIos), 'chrome');
  assert.equal(L.iosBrowser(UA.iphone), 'safari');
});
test('echte Mac zonder touch is desktop', () => {
  assert.equal(env({ ua: UA.ipad, platform: 'MacIntel', maxTouchPoints: 0, breedte: 1440 }), 'desktop');
});
test('in-app browsers', () => {
  for (const k of ['fb', 'fbAndroid', 'insta', 'wa'])
    assert.equal(env({ ua: UA[k], platform: 'iPhone', maxTouchPoints: 5, breedte: 390 }), 'inapp', k);
  assert.equal(env({ ua: 'Mozilla/5.0 (Linux; Android 13; wv) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36', maxTouchPoints: 5, breedte: 390 }), 'inapp');
  // iOS-webview zonder Safari-kenmerk
  assert.equal(env({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148', platform: 'iPhone', maxTouchPoints: 5 }), 'inapp');
});
test('standalone wint, ook op iOS', () => {
  assert.equal(env({ ua: UA.android, standalone: true, maxTouchPoints: 5 }), 'standalone');
  assert.equal(env({ ua: UA.iphone, platform: 'iPhone', standalone: true, maxTouchPoints: 5 }), 'standalone');
});
test('desktop Chrome', () => {
  assert.equal(env({ ua: UA.desktop, platform: 'Win32', maxTouchPoints: 0, breedte: 1280 }), 'desktop');
});

test('toonLanding: sessie in plaats van 14 dagen', () => {
  assert.equal(L.toonLanding({}), true);
  assert.equal(L.toonLanding(), true);
  assert.equal(L.toonLanding({ sessie: null, hash: '' }), true);
  assert.equal(L.toonLanding({ sessie: '1' }), false); // na "Verder in de browser" tot het einde van de sessie
  assert.equal(L.toonLanding({ sessie: 'kapot' }), true);
  assert.equal(L.SLEUTEL_LANDING, 'ifm_landing_sessie');
  assert.equal(L.uitstelTot, undefined);
  assert.equal(L.DAGEN, undefined);
});
test('toonLanding: een gedeelde link met route-hash krijgt geen landing', () => {
  for (const h of ['#/artikel/dubbele-nationaliteit', '#/forum', '#/draad', '#/modules', '#iets'])
    assert.equal(L.toonLanding({ hash: h }), false, h);
  for (const h of ['', '#', '#/', undefined, null])
    assert.equal(L.toonLanding({ hash: h }), true, String(h));
});
test('standalone onderdrukt alles', () => {
  assert.equal(L.toonLanding({ standalone: true }), false);
  assert.equal(L.toonBalk({ standalone: true }), false);
  assert.equal(L.toonAutoBlad({ standalone: true, nuttig: true }), false);
  assert.equal(L.toonBalk({}), true);
});
test('installatiebalk: weg per sessie en niet onder de landing', () => {
  assert.equal(L.toonBalk({ weg: '1' }), false);
  assert.equal(L.toonBalk({ landingOpen: true }), false);
  assert.equal(L.SLEUTEL_BALK, 'ifm_install_balk_weg');
});
test('automatisch installatieblad: eenmaal per sessie, na een nuttig resultaat, nooit over een ander blad', () => {
  assert.equal(L.toonAutoBlad({ nuttig: true }), true);
  assert.equal(L.toonAutoBlad({ nuttig: false }), false);
  assert.equal(L.toonAutoBlad({ nuttig: true, getoond: '1' }), false);
  assert.equal(L.toonAutoBlad({ nuttig: true, bladOpen: true }), false);
  assert.equal(L.toonAutoBlad({ nuttig: true, ander: true }), false);
  assert.equal(L.toonAutoBlad({ nuttig: true, landingOpen: true }), false);
  assert.equal(L.SLEUTEL_BLAD, 'ifm_install_blad_getoond');
});
test('blokHtml: een bron voor alle omgevingen, geen em-dash of en-dash', () => {
  const ios = L.blokHtml({ omgeving: 'ios', browser: 'safari', palet: 'licht' });
  assert.match(ios, /Zet op beginscherm/); assert.match(ios, /de deelknop/);
  assert.match(L.blokHtml({ omgeving: 'ios', browser: 'chrome' }), /Open deze pagina dan in Safari/);
  const inapp = L.blokHtml({ omgeving: 'inapp' });
  assert.match(inapp, /Open Infopoche in Safari of Chrome/); assert.match(inapp, /data-ifm-actie="kopieer"/);
  assert.match(L.blokHtml({ omgeving: 'android', heeftEvent: true }), /data-ifm-actie="installeer"[^>]*>Installeer</);
  const man = L.blokHtml({ omgeving: 'android', heeftEvent: false });
  assert.ok(!/data-ifm-actie="installeer"/.test(man)); assert.match(man, /App installeren/); assert.match(man, /Toevoegen aan startscherm/);
  assert.match(L.blokHtml({ omgeving: 'desktop' }), /qr-infopoche\.svg/);
  for (const o of ['ios', 'inapp', 'android', 'desktop'])
    assert.ok(!/[\u2014\u2013]/.test(L.blokHtml({ omgeving: o })), o);
});

test('sw.js: VERSIE, geen cross-origin interceptie, geen offline-belofte', () => {
  const s = readFileSync(p('sw.js'), 'utf8');
  assert.match(s, /^[\s\S]*const VERSIE = "[^"]+";/);
  assert.match(s, /url\.origin !== self\.location\.origin\) return/);
  assert.ok(!/offline/i.test(s.replace(/\/\/.*$/gm, '')));
  assert.match(s, /skipWaiting/);
  assert.match(s, /clients\.claim/);
  assert.match(s, /caches\.delete/);
});

test('vercel.json: sw.js nooit lang gecachet', () => {
  const v = JSON.parse(readFileSync(p('vercel.json'), 'utf8'));
  const h = v.headers.find((x) => x.source === '/sw.js');
  assert.ok(h);
  assert.match(h.headers.find((x) => x.key === 'Cache-Control').value, /no-cache/);
  assert.ok(v.headers.find((x) => x.source === '/(.*)'));
});

test('manifest: id en bestaande screenshots', () => {
  const m = JSON.parse(readFileSync(p('manifest.webmanifest'), 'utf8'));
  assert.ok(m.id);
  assert.ok(m.screenshots.length >= 2);
  for (const s of m.screenshots) {
    assert.ok(existsSync(p(s.src)), s.src);
    assert.equal(s.form_factor, 'narrow');
    assert.ok(s.label);
  }
});

test('QR-svg bestaat en is geldige XML', () => {
  const s = readFileSync(p('icons/qr-infopoche.svg'), 'utf8');
  assert.match(s, /^<svg [^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(s, /<\/svg>\s*$/);
  assert.equal((s.match(/<(?!\/|\?|!)[a-z]/gi) || []).length, (s.match(/\/>|<\/[a-z]+>/gi) || []).length);
});

test('index.html laadt landing-lib en registreert de service worker', () => {
  const h = readFileSync(p('index.html'), 'utf8');
  assert.match(h, /<script src="\.\/landing-lib\.js"><\/script>/);
  assert.match(h, /serviceWorker\.register\("\.\/sw\.js"\)/);
  assert.match(h, /Kennis en ervaring dans la poche/);
});
