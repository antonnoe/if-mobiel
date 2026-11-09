// Profiel belooft geen aanmelding die de app niet heeft (9 november 2026).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("geen schijnstatus of aanmeldknop op Profiel", () => {
  assert.doesNotMatch(html, /niet aangemeld/);
  assert.doesNotMatch(html, /niet gekoppeld/);
  assert.doesNotMatch(html, /Aanmelden bij Nederlanders\.fr/);
  assert.doesNotMatch(html, /Twee losse identiteiten/);
});

test("forum en abonnement als gewone links in het grijze blok", () => {
  const i = html.indexOf("data-profiel-links");
  assert.ok(i > 0);
  const blok = html.slice(i, html.indexOf("</div>", i));
  assert.match(blok, /Naar het forum op Nederlanders\.fr ↗/);
  assert.match(blok, /href="\{\{ abonneeUrl \}\}"/);
  assert.match(blok, /min-height:44px/);
});
