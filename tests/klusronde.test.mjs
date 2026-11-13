// Klusronde 9 november 2026: forum zonder voorbeeldberichten, delen, vindbaarheid, toegankelijkheid, houdbaarheid, teksten.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
const lees = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const html = lees("index.html"), sw = lees("sw.js"), cat = JSON.parse(lees("modules.json")), vj = JSON.parse(lees("vercel.json"));

test("forum: geen voorbeeldberichten meer, wel een eerlijke foutmelding met link", () => {
  assert.ok(!/const DEMO\b|posts:DEMO/.test(html));
  assert.ok(html.includes("Het forum is nu niet bereikbaar.") && html.includes("Open Nederlanders.fr ↗"));
  assert.ok(!/Voorbeeldgegevens, live zodra/.test(html));
});
test("delen: kalenderitem en nieuwskaart", () => {
  assert.match(html, /APP_URL \+ "\/#\/kalender\/"/);
  assert.ok(html.includes('data-kal-deel="1"') && html.includes('data-nw-deel="1"'));
  assert.ok(html.includes('"Link gekopieerd"') && html.includes("Delen en kopiëren lukt op dit toestel niet"));
});
test("vindbaarheid: Open Graph, robots.txt, titel per scherm", () => {
  for (const t of ['og:title" content="InfoPoche"', 'og:url" content="https://infopoche.fr/"', 'og:type" content="website"', 'og:image" content="https://infopoche.fr/icons/icon-512.png"']) assert.ok(html.includes(t), t);
  assert.ok(existsSync(new URL("../icons/icon-512.png", import.meta.url)));
  assert.equal(lees("robots.txt"), "User-agent: *\nAllow: /\n");
  assert.match(html, /zetDocTitel\(\)/);
});
test("toegankelijkheid: secundaire tekstkleur, band, chips, main, h1 in de kopbalk", () => {
  assert.ok(!/#71787C/i.test(html) && !/#71787C/i.test(lees("artikel-lib.js")));
  assert.ok(html.includes("color:#DCE8DF") && !html.includes("rgba(255,255,255,.72)\">Vandaag"));
  assert.match(html, /id="ifm-scroll" role="main"/);
  assert.match(html, /const KOP_H1 = \[[^\]]*"mod"[^\]]*"gemeente"/);
});
test("houdbaarheid: schil, offline-regel, koppen", () => {
  assert.ok(sw.includes('"./hub-lib.js"') && sw.includes('"./ondernemen-lib.js"'));
  assert.ok(html.includes("Je bent offline. Je ziet de laatst bekende stand."));
  const h = vj.headers.find(x => x.source === "/(.*)").headers.map(x => x.key + ":" + x.value);
  assert.deepEqual(h, ["Referrer-Policy:strict-origin-when-cross-origin", "X-Content-Type-Options:nosniff"]);
  assert.ok(!JSON.stringify(vj).includes("Permissions-Policy") && !JSON.stringify(vj).includes("Content-Security"));
});
test("teksten en ordening", () => {
  assert.ok(!html.includes("helpt je ook") && html.includes("Met een abonnement help je ook"));
  assert.ok(html.includes("De Franse gemeentedienst antwoordt nu niet. Probeer het zo nog eens."));
  assert.ok(!/Infopoche/.test(html.slice(html.indexOf('aria-label="Feedback op'), html.indexOf('aria-label="Feedback op') + 6000)));
  assert.match(html, /\|\| ""\;\s*\}/);
  const m = id => cat.modules.find(x => x.id === id);
  assert.equal(m("klusforum").ai, "tool");
  assert.equal(m("devisdossier").thema, "ondernemen");
  assert.equal(m("transactiekosten").weergave, "volledig");
});
test("herstelronde: deelknop 44 px, datum in de gedeelde tekst, devisdossier niet meer vast bij wonen", () => {
  assert.match(html, /data-nw-deel="1"[^>]*min-height:48px;min-width:44px/);
  assert.match(html, /it\.titel \+ ", " \+ Kl\.datumRegel\(it, vandaag\)/);
  assert.ok(!/"bouwgrond","devisdossier"/.test(html));
});

test("zoekveld op de hub (Compleet-stand): 54 px, bordeaux icoon, een echt typbaar veld (10-11-2026, herstel 13-11-2026)", () => {
  const h = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const blok = h.slice(h.indexOf('data-hubzoek="1"'), h.indexOf('data-hubzoek="1"') + 700);
  assert.match(blok, /min-height:54px/);
  assert.match(blok, /placeholder="Zoek in InfoPoche"/);
  assert.match(blok, /<input id="hubq2" value="\{\{ q \}\}" onInput="\{\{ onHubQ \}\}" onKeyDown="\{\{ onHubQEnter \}\}"/);
  assert.ok(!/<button[^>]*data-hubzoek/.test(h), "geen knop meer, een echt veld");
  assert.match(h, /width:22px;height:22px;color:#800000/);
});

test("forumkaart: foto over de volle breedte, lui geladen, alleen bij een foto; naam, tijd en vaste onderregel", () => {
  const src = lees("index.html");
  const tag = /<img data-forumbeeld="1"[^>]*>/.exec(src);
  assert.ok(tag, "beeld in de forumkaart");
  assert.match(tag[0], /loading="lazy"/);
  assert.match(tag[0], /width:100%;height:200px/);
  assert.match(src, /data-forumkaart="1"/);
  assert.ok(!src.includes('kicker:"NEDERLANDERS.FR"'), "geen label Nederlanders.fr boven elk bericht");
  assert.match(src, /aria-label="Vernieuwen"/);
  assert.match(src, /heeftBeeld: !!eersteBeeld\(p\)/);
});

test("systeemkleur wit: Androids navigatieknoppen blijven zichtbaar (melding tester, Motorola G75, Android 16)", () => {
  const src = lees("index.html");
  assert.ok(!src.includes('name="theme-color" content="#800000"'));
  assert.match(src, /name="theme-color" content="#FFFFFF"/);
  assert.match(lees("manifest.webmanifest"), /"theme_color": "#FFFFFF"/);
});
