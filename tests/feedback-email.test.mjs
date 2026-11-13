// Postzegel-ronde 13-11-2026, punt 7: optioneel e-mailveld in het feedbackformulier, nooit verplicht. Server-kant
// (Supabase-kolom email op public.infopoche_feedback en de Edge Function infopoche-feedback) staat los van deze repo
// en is apart uitgevoerd/geverifieerd, zie het eindrapport.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const F = createRequire(import.meta.url)("../feedback-lib.js");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("valideer: e-mail is nooit verplicht, alleen een duidelijk ongeldige vorm geeft een fout", () => {
  const basis = { naam: "Anton", onderdeel: "hub", bericht: "Zag een foutje", toestemming: true };
  assert.equal(F.valideer(Object.assign({}, basis, { email: "" })), null);
  assert.equal(F.valideer(Object.assign({}, basis)), null, "ontbrekend veld email is ook geldig");
  assert.equal(F.valideer(Object.assign({}, basis, { email: "test@example.com" })), null);
  assert.equal(F.valideer(Object.assign({}, basis, { email: "geen adres" })), "email");
  assert.equal(F.foutTekst("email"), "Dit e-mailadres klopt niet. Laat het veld leeg als je geen antwoord wilt.");
});

test("body: e-mail gaat alleen mee als die geldig is, afgekapt op lengte, nooit als die ontbreekt of kapot is", () => {
  const basis = { naam: "Anton", onderdeel: "hub", bericht: "x", toestemming: true };
  assert.equal(F.body(Object.assign({}, basis, { email: "test@example.com" })).email, "test@example.com");
  assert.equal(F.body(Object.assign({}, basis, { email: "" })).email, "");
  assert.equal(F.body(Object.assign({}, basis, { email: "kapot" })).email, "");
  assert.equal(F.body(Object.assign({}, basis)).email, "");
  assert.equal(F.body(Object.assign({}, basis, { email: "a@" + "b".repeat(200) + ".com" })).email.length, F.MAX.email);
});

test("index.html: het veld is nooit verplicht (geen 'required'), met de uitleg erbij", () => {
  const i = html.indexOf('id="fb-email"');
  assert.ok(i > 0, "het e-mailveld staat in het formulier");
  const veld = html.slice(i - 400, i + 300);
  assert.ok(veld.includes("Je e-mailadres, alleen als je antwoord wilt"));
  assert.ok(veld.includes("(niet verplicht)"));
  assert.ok(!/<input id="fb-email"[^>]*\brequired\b/.test(html));
  assert.match(html, /fbOnEmail: e => this\.setState\(\{fbEmail:e\.target\.value\}\),/);
  assert.match(html, /email:st\.fbEmail/);
});

test("geen liggende streepjes in de nieuwe teksten", () => {
  const i = html.indexOf("Je e-mailadres, alleen als je antwoord wilt");
  assert.ok(!/[–—]/.test(html.slice(i, i + 200)));
});
