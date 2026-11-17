// Ronde 3, herstelronde 2 (app, 17-11-2026): Bij jou per zoekopdracht opnieuw, zoeken per kernwoord, label Dossier Frankrijk.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const N = require("../nav-lib.js");
const B = require("../bijjou-lib.js");
const V = require("../vraag-lib.js");
const cfg = JSON.parse(fs.readFileSync(new URL("../modules.json", import.meta.url), "utf8")).bijJou;
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("Bij jou: huisarts en daarna ziekenhuis geeft een nieuwe titel en een nieuwe sleutel", () => {
  const pc = "62170";
  const a = B.plan("huisarts", cfg, pc, null);
  assert.equal(a.actie, "laad");
  assert.match(a.o.titel, /huisartsen staan nog niet/);
  const huidig = { status: "klaar", sleutel: a.sleutel, o: a.o };
  const b = B.plan("ziekenhuis", cfg, pc, huidig);
  assert.equal(b.actie, "laad", "andere vraag, zelfde soort en anker: toch opnieuw bepalen");
  assert.equal(b.o.titel, "Ziekenhuizen bij jou");
  assert.notEqual(a.sleutel, b.sleutel);
  // en terug
  const c = B.plan("huisarts", cfg, pc, { status: "klaar", sleutel: b.sleutel, o: b.o });
  assert.equal(c.actie, "laad");
  assert.match(c.o.titel, /huisartsen/);
});
test("Bij jou: dezelfde vraag hergebruikt de staat, zonder onderwerp of postcode geen aanvraag", () => {
  const a = B.plan("ziekenhuis", cfg, "62170", null);
  assert.equal(B.plan("ziekenhuis in de buurt", cfg, "62170", { status: "klaar", sleutel: a.sleutel }).actie, "houd");
  assert.equal(B.plan("taxe foncière", cfg, "62170", { status: "klaar", sleutel: a.sleutel }).actie, "geen");
  assert.equal(B.plan("ziekenhuis", cfg, "", null).actie, "geenpc");
  assert.equal(B.plan("ziekenhuis", cfg, "62170", { status: "laden", sleutel: B.sleutel(a.o, "75001") }).actie, "laad");
});
test("index.html gebruikt IfBijJou.plan", () => {
  assert.match(html, /B\.plan\(v, cfg, st\.postcode/);
});

test("zoekTermen: per kernwoord, hooguit 3, langste eerst", () => {
  assert.deepEqual(N.zoekTermen("Moet ik een vergunning aanvragen voor een tuinhuisje?"), ["tuinhuisje", "vergunning", "aanvragen"]);
  assert.deepEqual(N.zoekTermen("huisarts"), ["huisarts"]);
  assert.deepEqual(N.zoekTermen("taxe foncière"), ["taxe foncière"]);
  assert.deepEqual(N.zoekTermen("hoe moet ik dat"), ["hoe moet ik dat"]);
  assert.deepEqual(N.zoekTermen("  "), []);
  assert.equal(N.zoekTermen("wat is de btw op een nieuwe keuken met plaatsing en levering").length, 3);
  assert.deepEqual(N.zoekTermen("wat is een zwembad"), ["zwembad"]);
  assert.equal(N.zoekSleutel("Moet ik een vergunning aanvragen voor een tuinhuisje?"), "tuinhuisje vergunning aanvragen");
});
test("voegSamen: volgorde van de termen, geen dubbelen", () => {
  const l1 = [{ url: "a" }, { url: "b" }], l2 = [{ url: "b" }, { url: "c" }], l3 = [{ url: "a" }, { url: "d" }];
  assert.deepEqual(N.voegSamen([l1, l2, l3], "url").map(x => x.url), ["a", "b", "c", "d"]);
  assert.deepEqual(N.voegSamen([[{ bron: "forum", id: 1 }], [{ bron: "forum", id: 1 }, { bron: "forum", id: 2 }]], x => x.bron + ":" + x.id).length, 2);
  assert.deepEqual(N.voegSamen([null, undefined, l1], "url").length, 2);
});
test("zoeken in index.html gebruikt zoekTermen en voegSamen", () => {
  assert.match(html, /Nv \? Nv\.zoekTermen\(q\)/);
  assert.match(html, /Nv\.voegSamen\(res\.map\(r => r\.x\), "url"\)/);
  assert.match(html, /Nv\.voegSamen\(res\.map\(r => r\.x\), it =>/);
  assert.match(html, /zoekSleutel\(st\.q\)/);
});

test("Dossier Frankrijk onder Meer heeft het label abonnee, zonder nu gratis", () => {
  assert.equal(V.LABEL_DOSSIER, "abonnee");
  assert.doesNotMatch(V.LABEL_DOSSIER, /gratis/);
  assert.match(html, /\{\{ dossierLabel \}\}/);
  assert.match(html, /dossierLabel: window\.IfVraag \? window\.IfVraag\.LABEL_DOSSIER/);
});
