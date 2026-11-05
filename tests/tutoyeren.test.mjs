// Aanspreekvorm (besluit 5 november 2026): de app spreekt de lezer overal aan met je/jij/jouw, nergens met u/uw.
// Deze test scant alle zichtbare tekst en faalt zodra een u-vorm terugkomt. Code-identifiers (const u = new URL(...),
// {{ u.k }}, (u, o) => fetch(u, o)) worden niet gemeld: een los "u" telt alleen als het na een woord komt en niet door
// code-tekens (= ; ) . ( [ : ) wordt omringd. Externe bronnen (artikelen, kalender-API) vallen buiten deze test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lees = (f) => readFileSync(join(root, f), 'utf8');

const BESTANDEN = [
  'index.html', 'modules.json', 'piramide.json', 'sponsors.json', 'manifest.webmanifest', 'dossier.js',
  'data/dossier-demo.json', 'data/streek-verhalen.ts', 'kennispiramide.html', 'Bosbranden Mobiel.html',
  ...readdirSync(root).filter((f) => /-lib\.js$/.test(f)),
];
const CODEWOORDEN = new Set(['const', 'var', 'let', 'return', 'typeof', 'else', 'case', 'instanceof', 'delete', 'void', 'new']);

// Geeft de gevonden u-vormen (met regelnummer en context) in een bron, zonder commentaar.
export function uVormen(bron) {
  const zonder = bron.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' ')).replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const gevonden = [];
  zonder.split('\n').forEach((regel, n) => {
    const t = regel.trim();
    if (t.startsWith('//') || t.startsWith('*') || /^"_/.test(t)) return; // commentaar en _uitleg-velden
    const meld = (m, i) => gevonden.push(`${n + 1}: ${regel.slice(Math.max(0, i - 30), i + 40).trim()}`);
    // uw / uzelf / uwe (los woord, niet in een URL, bestandsnaam of identifier)
    for (const m of regel.matchAll(/(?<![\w\-./@#$:{])(?:[Uu]w[a-z]*|[Uu]zelf|úw|Úw)(?![\w\-/@])/g)) meld(m, m.index);
    // u na een woord of leesteken (maar niet "? u :" of "= u" uit code)
    for (const m of regel.matchAll(/([A-Za-zÀ-ÿ’'.,;!)"]) u(?![\w\-/@:=[(]|\.\w|\s*[=;)])/g)) {
      const vooraf = regel.slice(Math.max(0, m.index - 8), m.index + 1).match(/([A-Za-z]+)$/);
      if (vooraf && CODEWOORDEN.has(vooraf[1])) continue;
      meld(m, m.index);
    }
    // U aan het begin van een zin
    for (const m of regel.matchAll(/(^|[>"'`\s.!?:])U(?![\w\-/@:=[(.])(?= [a-zà-ÿ])/g)) meld(m, m.index);
  });
  return gevonden;
}

test('de zoeker vindt u-vormen en laat code met rust (zelftest)', () => {
  const fout = ['Zet op uw beginscherm', 'Waar woont u?', 'U kunt het doen', 'Ziet u deze opties niet', 'bij uw regio', 'Meld uzelf aan', 'wat u nodig heeft.'];
  fout.forEach((t) => assert.ok(uVormen(`"${t}"`).length > 0, t));
  const goed = ['const u = new URL(x);', 'return u.href;', 'F.zend((u, o) => fetch(u, o), v)', '{{ u.k }}', 'x ? u : ""', 'if (!u) return;', 'url: u, titel: t',
    'Zet op je beginscherm', 'Waar woon je?', 'Je kunt het doen', '// u kunt dit commentaar', 'https://www.nederlanders.fr/u/x'];
  goed.forEach((t) => assert.deepEqual(uVormen(t), [], t));
});

test('geen u-vorm in zichtbare tekst (app, bibliotheken, catalogus, voorbeeldgegevens)', () => {
  const fouten = [];
  for (const f of BESTANDEN) for (const g of uVormen(lees(f))) fouten.push(`${f}:${g}`);
  assert.deepEqual(fouten, [], `Aanspreekvorm is je, niet u:\n${fouten.join('\n')}`);
});

test('de kalender gebruikt de je-variant van de API-tekst met terugval op tekst_u en tekst', () => {
  const k = lees('kalender-lib.js');
  assert.ok(/i\.tekst_je \|\| i\.tekst_u \|\| i\.tekst/.test(k));
});
