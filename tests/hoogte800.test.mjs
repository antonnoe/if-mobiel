// De mobiele schil geeft de hoogte boven 800 m door aan de motor, zoals de desktopschil van energieportaal (app.js, gatherState).
// Bron: arrêté du 31 mars 2021 (DPE), grenzen voor woningen boven 800 m in de zones H1b, H1c en H2d; in de motor engine/dpe.js, dpeDrempels.
// De motorbestanden blijven een byte-identieke kopie; deze test laadt ze ongewijzigd en roept enCompute uit index.html aan.
// Draaien: node tests/hoogte800.test.mjs (geen netwerk, geen afhankelijkheden).
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const lees = (...p) => fs.readFileSync(path.join(root, ...p), "utf8");
const index = lees("index.html");

const ctx = { Intl, Math, Number, Object, JSON, console };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ["archetypes.js", "engine.js", "dpe.js"]) vm.runInContext(lees("engine", f), ctx, { filename: f });
const m = index.match(/\n  enCompute\(answers\)\{\n([\s\S]*?)\n  \}\n  enPick\(/);
if (!m) { console.log("FOUT enCompute niet gevonden in index.html"); process.exit(1); }
vm.runInContext(`this.__enCompute = function(answers){\n${m[1]}\n};`, ctx);
const enCompute = (a) => ctx.__enCompute.call({}, a);

const fouten = [];
let n = 0;
const is = (naam, echt, verwacht) => { n++; if (JSON.stringify(echt) !== JSON.stringify(verwacht)) fouten.push(`${naam}: kreeg ${JSON.stringify(echt)}, verwacht ${JSON.stringify(verwacht)}`); };

const basis = { zone: "mont", houseType: "longere", period: "pre1948", m2: 120, reno: [], heating: "fioul", usage: "permanent" };
const nee = enCompute({ ...basis, boven800m: "nee" });
const ja = enCompute({ ...basis, boven800m: "ja" });
const zonder = enCompute({ ...basis });
if (!nee || !ja || !zonder) { console.log("FOUT enCompute gaf geen uitkomst"); process.exit(1); }
is("nee: motor krijgt onder 800 m", nee.dpe.details.boven800m, false);
is("ja: motor krijgt boven 800 m", ja.dpe.details.boven800m, true);
is("niet beantwoord: onder 800 m", zonder.dpe.details.boven800m, false);
// Boven 800 m liggen de grenzen voor E en F hoger (motor: DPE_HOOG); de motor zelf is gekeurd in energieportaal.
is("ja: ruimere grens E (energie)", ja.dpe.details.drempels.ep[4] > nee.dpe.details.drempels.ep[4], true);
is("ja: ruimere grens F (energie)", ja.dpe.details.drempels.ep[5] > nee.dpe.details.drempels.ep[5], true);
// Verbruik en kosten veranderen niet door de hoogte, alleen de klassengrenzen.
is("zelfde primaire energie", ja.dpe.perM2.ep, nee.dpe.perM2.ep);
is("zelfde kosten", ja.res.totalCost, nee.res.totalCost);
// Voorbeeld waar de klasse verschilt: longère vóór 1948, warmtepomp, bergen, 120 m2, ongeveer 450 kWh EP per m2: G onder 800 m, F boven 800 m.
{
  const wp = { ...basis, heating: "hp" };
  is("warmtepomp onder 800 m: klasse G", enCompute({ ...wp, boven800m: "nee" }).dpe.classe, "G");
  is("warmtepomp boven 800 m: klasse F", enCompute({ ...wp, boven800m: "ja" }).dpe.classe, "F");
}
// De vraag staat in de schil, standaard Nee.
n++; if (!/grp\(2, "boven800m", "Hoogte", "Ligt de woning hoger dan 800 meter\?/.test(index)) fouten.push("de vraag over de hoogte ontbreekt in enVals");
n++; if ((index.match(/en:\{zone:"med", boven800m:"nee",/g) || []).length !== 2) fouten.push("de standaardwaarde Nee ontbreekt bij de begintoestand of bij opnieuw beginnen");

console.log(`     (voorbeeld longère vóór 1948, fioul, bergen, 120 m2: ${Math.floor(nee.dpe.perM2.ep)} kWh EP/m2, klasse ${nee.dpe.classe} onder 800 m, ${ja.dpe.classe} boven 800 m)`);
if (fouten.length) { console.log("Hoogte 800 m: FOUTEN"); fouten.forEach((f) => console.log("FOUT " + f)); process.exit(1); }
console.log(`Hoogte 800 m: alle ${n} controles kloppen.`);
