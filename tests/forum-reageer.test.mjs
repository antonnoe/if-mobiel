// Forum: knop "Reageer op dit bericht" in het draadscherm. Draaien: node --test tests/forum-reageer.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lees = (f) => readFileSync(join(root, f), 'utf8');
const F = createRequire(import.meta.url)('../forum-lib.js');
const html = lees('index.html'), sw = lees('sw.js');

test('reageerUrl: dubbele punten in het id blijven intact, anker erachter', () => {
  const u = F.reageerUrl({ id: '1382719', href: 'https://www.nederlanders.fr/xn/detail/3295325:BlogPost:1382719' });
  assert.equal(u, 'https://www.nederlanders.fr/xn/detail/3295325:BlogPost:1382719#add-comment');
});

test('reageerUrl: een bestaand anker of zoekstuk wordt vervangen, nooit verdubbeld', () => {
  const u = F.reageerUrl({ href: 'https://www.nederlanders.fr/xn/detail/3295325:BlogPost:1382719#comment-5' });
  assert.equal(u, 'https://www.nederlanders.fr/xn/detail/3295325:BlogPost:1382719#add-comment');
  assert.equal(F.reageerUrl({ href: 'https://nederlanders.fr/xn/detail/1:BlogPost:2?x=1' }),
    'https://www.nederlanders.fr/xn/detail/1:BlogPost:2#add-comment');
});

test('reageerUrl: zonder bruikbaar id geen knop', () => {
  for (const p of [null, undefined, {}, { href: '' }, { id: '1382719' },
    { href: 'https://www.nederlanders.fr/profiles/blogs/jachthond' },
    { href: 'https://evil.example/xn/detail/1:BlogPost:2' },
    { href: 'http://www.nederlanders.fr/xn/detail/1:BlogPost:2' },
    { href: 'https://www.nederlanders.fr/xn/detail/abc' }])
    assert.equal(F.reageerUrl(p), '');
});

test('schil: knop en tekstlink hangen aan reageerUrl, knoptekst en hulpregel kloppen', () => {
  assert.match(html, /<script src="\.\/forum-lib\.js"><\/script>/);
  assert.match(html, /window\.IfForum\.reageerUrl\(dp\)/);
  assert.match(html, />Reageer op dit bericht<\/a>/);
  assert.match(html, /Je reageert op Nederlanders\.fr\. Nog niet ingelogd\? Dan log je daar eerst in\./);
  assert.match(html, /min-height:48px[^"]*background:#800000;color:#fff[^"]*"[^>]*>Reageer op dit bericht|background:#800000;color:#fff[^"]*"[^>]*>Reageer op dit bericht/);
  assert.match(html, /draadHeeftReageer/);
  assert.match(html, />Reageer<\/a>/);
  assert.match(html, /Lezen kan zonder account, reageren doe je op Nederlanders\.fr\./);
});

test('sw.js: forum-lib.js in de schil', () => {
  assert.match(sw, /\.\/forum-lib\.js/);
});
