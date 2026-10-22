// Forum: de leeslink hangt af van het totaal (aantalReacties), niet van de reacties uit de activiteitenfeed.
// Draaien: node --test tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const grab = re => { const m = html.match(re); assert.ok(m, "niet gevonden: " + re); return m[0]; };
const ctx = {};
vm.runInNewContext(
  grab(/const draad = [^\n]*\n/) + grab(/const aantalReacties = [^\n]*\n/) + "this.aantalReacties = aantalReacties;", ctx);
const n = ctx.aantalReacties;

test("aantal: reactieTotaal wint, anders de geladen reacties", () => {
  assert.equal(n({ reactieTotaal: 5, reacties: [] }), 5);
  assert.equal(n({ reacties: [{}, {}] }), 2);
  assert.equal(n({}), 0);
  assert.equal(n({ reactieTotaal: 0, reacties: [{}] }), 0);
});

test("leeslink gaat af op het totaal, ook zonder reacties uit de feed", () => {
  assert.match(html, /heeftReacties: n > 0,/);
  assert.doesNotMatch(html, /heeftReacties: rs\.length/);
  assert.ok(n({ reactieTotaal: 5, reacties: [] }) > 0);
  assert.ok(!(n({ reactieTotaal: 0, reacties: [] }) > 0));
});
