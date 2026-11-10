// Nieuwe versie van InfoPoche: versiebalk op de hub en versieregel in Profiel (10-11-2026).
// Draaien: node --test tests/versie.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const V = require("../versie-lib.js");
const html = readFileSync(join(root, "index.html"), "utf8");
const sw = readFileSync(join(root, "sw.js"), "utf8");

function mockRes() {
  const headers = {};
  let body = "";
  const res = {
    statusCode: 0,
    setHeader(k, v) { headers[k.toLowerCase()] = v; },
    end(b) { body = b; }
  };
  return { res, headers, body: () => body };
}

test("versie-lib: datumNl, verschilt, profielRegel", () => {
  assert.equal(V.datumNl("2026-11-10T08:00:00Z"), "10-11-2026");
  assert.equal(V.datumNl(""), "");
  assert.equal(V.verschilt("abc123", "abc123"), false);
  assert.equal(V.verschilt("abc123", "def456"), true);
  assert.equal(V.verschilt("", "def456"), false);
  assert.equal(V.verschilt("abc123", ""), false);
  assert.equal(V.profielRegel("2026-11-10T08:00:00Z", false), "10-11-2026 · je hebt de nieuwste");
  assert.equal(V.profielRegel("2026-11-10T08:00:00Z", true), "10-11-2026 · er is een nieuwere versie");
  assert.equal(V.profielRegel("", false), "je hebt de nieuwste");
  assert.equal(V.profielRegel("", true), "er is een nieuwere versie");
});

test("/api/versie: geeft de commit uit VERCEL_GIT_COMMIT_SHA, no-store, alleen GET", async () => {
  delete require.cache[require.resolve("../api/versie.js")];
  const vorige = process.env.VERCEL_GIT_COMMIT_SHA;
  process.env.VERCEL_GIT_COMMIT_SHA = "abcdef1234567890";
  const handler = require("../api/versie.js");
  {
    const { res, headers, body } = mockRes();
    handler({ method: "GET" }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(headers["cache-control"], "no-store");
    const d = JSON.parse(body());
    assert.equal(d.commit, "abcdef1234567890");
    assert.equal(d.kort, "abcdef1");
  }
  {
    const { res, headers, body } = mockRes();
    handler({ method: "POST" }, res);
    assert.equal(res.statusCode, 405);
    assert.equal(headers["cache-control"], "no-store");
    assert.ok(JSON.parse(body()).fout);
  }
  delete process.env.VERCEL_GIT_COMMIT_SHA;
  delete require.cache[require.resolve("../api/versie.js")];
  {
    const handler2 = require("../api/versie.js");
    const { res, body } = mockRes();
    handler2({ method: "GET" }, res);
    assert.equal(res.statusCode, 200);
    const d = JSON.parse(body());
    assert.equal(d.commit, ""); assert.equal(d.kort, "");
  }
  if (vorige !== undefined) process.env.VERCEL_GIT_COMMIT_SHA = vorige;
});

test("versiebalk op de hub: role=status, kruisje met aria-label Later, teksten", () => {
  assert.match(html, /<div data-versiebalk="1" role="status"[^>]*>/);
  assert.ok(html.includes("Er is een nieuwe versie van InfoPoche."));
  assert.ok(html.includes("Tik om te vernieuwen"));
  assert.match(html, /aria-label="Later"/);
  assert.match(html, /versieHerlaad[\s\S]{0,80}location\.reload/);
});

test("versieregel in Profiel: boven Over ons, met Vernieuwen-knop en registration.update()", () => {
  const i = html.indexOf('data-versieprofiel="1"');
  const j = html.indexOf('Over ons →');
  assert.ok(i > 0 && j > i, "de versieregel moet boven de knop Over ons staan");
  assert.ok(html.includes("Versie van InfoPoche"));
  assert.ok(html.includes(">Vernieuwen<"));
  assert.ok(html.includes("Updates gaan vanzelf. Deze knop laadt InfoPoche opnieuw, voor als de app lang op de achtergrond openstond."));
  const m = html.match(/versieVernieuwKnop:\s*\(\)\s*=>\s*\{[\s\S]*?\n {4}\}/);
  assert.ok(m, "versieVernieuwKnop ontbreekt");
  assert.match(m[0], /registration\.update|reg && reg\.update/);
  assert.match(m[0], /location\.reload/);
});

test("detectie: ophalen bij start (nooit een balk) en bij terugkeer van de achtergrond, met registration.update()", () => {
  assert.match(html, /versieInit\(\)\{[\s\S]*?versieHaal\(/);
  assert.match(html, /versieControleer\(\)\{[\s\S]*?serviceWorker\.getRegistration[\s\S]*?versieHaal\(/);
  assert.match(html, /addEventListener\("visibilitychange"[\s\S]{0,120}versieTerug/);
  assert.match(html, /addEventListener\("pageshow",\s*this\._versieTerug\)/);
});

test("service worker kent versie-lib.js en de versie is opgehoogd", () => {
  assert.match(sw, /VERSIE = "2026-(10-(2[5-9]|3[01])|11-\d{2})-\d+"/);
  assert.ok(sw.includes('"./versie-lib.js"'));
  assert.match(html, /<script src="\.\/versie-lib\.js"><\/script>/);
});

test("geen liggende streepjes in de nieuwe teksten", () => {
  const balk = html.slice(html.indexOf('data-versiebalk="1"'), html.indexOf('</sc-if>', html.indexOf('data-versiebalk="1"')));
  const profiel = html.slice(html.indexOf('data-versieprofiel="1"'), html.indexOf('Over ons →'));
  assert.ok(!/[–—]/.test(balk + profiel));
});
