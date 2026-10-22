import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const p = (f) => join(root, f);

const pngSize = (f) => {
  const b = readFileSync(p(f));
  assert.equal(b.subarray(1, 4).toString(), 'PNG');
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};

test('logobestanden bestaan', () => {
  for (const f of ['logo-goud.png', 'logo-brons.png', 'logo-goud.svg', 'logo-brons.svg', 'icon.svg'])
    assert.ok(existsSync(p('icons/' + f)), f);
  assert.ok(!existsSync(p('icons/FR-i-logo-2.png')));
  assert.ok(!existsSync(p('icons/FR-i-logo-3.png')));
});

for (const f of ['logo-goud.svg', 'logo-brons.svg', 'icon.svg']) {
  test('svg strak: ' + f, () => {
    const s = readFileSync(p('icons/' + f), 'utf8');
    assert.ok(statSync(p('icons/' + f)).size < 60 * 1024);
    assert.match(s, /^<svg [^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(s, /viewBox="[\d. ]+"/);
    assert.match(s, /<\/svg>\s*$/);
    assert.ok(!/<image|<text|<filter|Gradient|<style|href=/i.test(s));
    // gebalanceerde tags
    assert.equal((s.match(/<(?!\/|\?|!)[a-z]/gi) || []).length, (s.match(/\/>|<\/[a-z]+>/gi) || []).length);
  });
}

test('effen kleuren', () => {
  assert.match(readFileSync(p('icons/logo-goud.svg'), 'utf8'), /fill="#E8B04B"/);
  assert.match(readFileSync(p('icons/logo-brons.svg'), 'utf8'), /fill="#78500F"/);
});

test('app-iconen hebben de juiste afmetingen', () => {
  assert.deepEqual(pngSize('icons/icon-192.png'), [192, 192]);
  assert.deepEqual(pngSize('icons/icon-512.png'), [512, 512]);
  assert.deepEqual(pngSize('icons/icon-512-maskable.png'), [512, 512]);
  assert.deepEqual(pngSize('icons/apple-touch-icon.png'), [180, 180]);
});

test('app-iconen zonder transparantie (kleurtype RGB)', () => {
  for (const f of ['icon-192', 'icon-512', 'icon-512-maskable', 'apple-touch-icon'])
    assert.ok([0, 2].includes(readFileSync(p(`icons/${f}.png`))[25]), f);
});

test('manifest verwijst alleen naar bestaande bestanden', () => {
  const m = JSON.parse(readFileSync(p('manifest.webmanifest'), 'utf8'));
  assert.ok(m.icons.length >= 3);
  for (const i of m.icons) {
    assert.ok(existsSync(p(i.src)), i.src);
    const [w, h] = pngSize(i.src);
    assert.equal(i.sizes, `${w}x${h}`);
  }
});
