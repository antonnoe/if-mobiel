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

test('14-dagenregel', () => {
  const nu = Date.UTC(2026, 9, 22);
  const dag = 86400000;
  assert.equal(L.toonLanding(null, nu), true);
  assert.equal(L.toonLanding('', nu), true);
  assert.equal(L.toonLanding('kapot', nu), true);
  assert.equal(L.toonLanding('0', nu), true);
  assert.equal(L.toonLanding(String(nu - dag), nu), true);
  assert.equal(L.toonLanding(String(L.uitstelTot(nu)), nu), false);
  assert.equal(L.toonLanding(String(nu + 13 * dag), nu), false);
  assert.equal(L.toonLanding(String(nu + 15 * dag), nu), true); // toekomst buiten bereik: kapotte klok
  assert.equal(L.toonLanding(String(L.uitstelTot(nu)), nu + 15 * dag), true); // na 15 dagen terug
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
