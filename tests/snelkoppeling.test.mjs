import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const m = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(fs.readFileSync('nav-lib.js', 'utf8'), ctx);
const Nv = ctx.window.IfNav;

test('manifest: vier snelkoppelingen met bestaand pictogram en geldige route', () => {
  assert.equal(m.shortcuts.length, 4);
  for (const s of m.shortcuts) {
    assert.ok(s.name && s.short_name.length <= 12, s.name);
    assert.ok(fs.existsSync(s.icons[0].src), s.icons[0].src);
    const r = Nv.parseHash(s.url.replace(/^\.\//, ''));
    assert.equal(r.soort, 'scherm', s.url);
  }
});

test('route #/gemeente opent het scherm gemeente en terug', () => {
  assert.deepEqual({ ...Nv.parseHash('#/gemeente') }, { soort: 'scherm', scherm: 'gemeente' });
  assert.equal(Nv.bouwHash({ screen: 'gemeente' }), '#/gemeente');
  assert.ok(fs.readFileSync('index.html', 'utf8').includes('if (s === "gemeente") return this.gmOpen("hub");'));
});

test('schermafbeeldingen bestaan en geen verouderd label', () => {
  for (const s of m.screenshots) { assert.ok(fs.existsSync(s.src)); assert.ok(!/nieuws/i.test(s.label)); }
});
