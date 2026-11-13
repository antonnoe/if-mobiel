// Postzegel-ronde 13-11-2026, punt 6: installatietekst per browser, zonder de gebruiker iets te vragen. Elk blok
// begint met: infopoche.fr werkt als gewoon webadres, installeren is niet nodig. Android wordt opgesplitst in
// Chrome/Samsung Internet (echte installatie) en Firefox/Opera (een snelkoppeling, geen volledige app).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const L = createRequire(import.meta.url)("../landing-lib.js");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("androidBrowser: herkent Chrome, Samsung Internet, Firefox en Opera uit de user-agent", () => {
  assert.equal(L.androidBrowser("Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/91.0.4472.120 Mobile Safari/537.36"), "chrome");
  assert.equal(L.androidBrowser("Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36"), "samsung");
  assert.equal(L.androidBrowser("Mozilla/5.0 (Android 13; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0"), "firefox");
  assert.equal(L.androidBrowser("Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/91.0.4472.120 Mobile Safari/537.36 OPR/65.2.3381.61350"), "opera");
  assert.equal(L.androidBrowser(""), "chrome", "onbekend valt terug op chrome, de meest voorkomende");
});

test("androidSnelkoppeling: alleen Firefox en Opera, niet Chrome of Samsung Internet", () => {
  assert.equal(L.androidSnelkoppeling("firefox"), true);
  assert.equal(L.androidSnelkoppeling("opera"), true);
  assert.equal(L.androidSnelkoppeling("chrome"), false);
  assert.equal(L.androidSnelkoppeling("samsung"), false);
});

test("browserVoor: kiest de juiste detectiefunctie per omgeving, geen vraag aan de gebruiker", () => {
  assert.equal(L.browserVoor("ios", "Mozilla/5.0 (iPhone) CriOS/91.0"), "chrome");
  assert.equal(L.browserVoor("android", "Mozilla/5.0 (Android 13; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0"), "firefox");
  assert.equal(L.browserVoor("desktop", "iets"), "");
});

test("blokHtml: elk blok (ios, android, desktop) begint met de webadres-zin, installeren is nooit verplicht", () => {
  const zin = "InfoPoche werkt gewoon als infopoche.fr in je browser, installeren is niet nodig.";
  assert.ok(L.blokHtml({ omgeving: "ios", browser: "safari", palet: "licht" }).includes(zin));
  assert.ok(L.blokHtml({ omgeving: "android", browser: "chrome", heeftEvent: true, palet: "licht" }).includes(zin));
  assert.ok(L.blokHtml({ omgeving: "android", browser: "firefox", palet: "licht" }).includes(zin));
  assert.ok(L.blokHtml({ omgeving: "desktop", palet: "licht" }).includes(zin));
  // in-app browsers kunnen niet gewoon doorgaan als webadres (de in-app browser blokkeert dat zelf), dus geen belofte
  assert.ok(!L.blokHtml({ omgeving: "inapp", palet: "licht" }).includes(zin));
});

test("blokHtml android: Firefox en Opera krijgen de snelkoppeling-tekst, nooit 'Installeer'", () => {
  const firefox = L.blokHtml({ omgeving: "android", browser: "firefox", heeftEvent: false, palet: "licht" });
  const opera = L.blokHtml({ omgeving: "android", browser: "opera", heeftEvent: false, palet: "licht" });
  assert.ok(firefox.includes("snelkoppeling") && firefox.includes("Firefox"));
  assert.ok(opera.includes("snelkoppeling") && opera.includes("Opera"));
  assert.ok(!/data-ifm-actie="installeer"/.test(firefox));
  assert.ok(!/>Installeer</.test(firefox) && !/>Installeer</.test(opera));
  // zelfs met een (onverwacht) beforeinstallprompt-event blijft het de snelkoppeling-tekst: Firefox/Opera geven dat event niet uit
  const firefoxMetEvent = L.blokHtml({ omgeving: "android", browser: "firefox", heeftEvent: true, palet: "licht" });
  assert.ok(firefoxMetEvent.includes("snelkoppeling"));
});

test("blokHtml android: Chrome en Samsung Internet krijgen de installatie-tekst (event of de handmatige stappen)", () => {
  const chromeMetEvent = L.blokHtml({ omgeving: "android", browser: "chrome", heeftEvent: true, palet: "licht" });
  assert.ok(chromeMetEvent.includes('data-ifm-actie="installeer"') && chromeMetEvent.includes(">Installeer<"));
  const samsungZonderEvent = L.blokHtml({ omgeving: "android", browser: "samsung", heeftEvent: false, palet: "licht" });
  assert.ok(samsungZonderEvent.includes("App installeren") && !samsungZonderEvent.includes("snelkoppeling"));
});

test("index.html: beide aanroepen van blokHtml geven de juiste browser per omgeving door, nooit altijd iosBrowser", () => {
  assert.match(html, /L\.blokHtml\(\{omgeving:omgeving\(\),browser:L\.browserVoor\(omgeving\(\),nav\.userAgent\)/);
  assert.match(html, /L\.blokHtml\(\{omgeving:omg, browser:L\.browserVoor\(omg, nav\.userAgent\)/);
});

test("geen liggende streepjes in de nieuwe installatieteksten", () => {
  const alles = [
    L.blokHtml({ omgeving: "ios", browser: "safari", palet: "licht" }),
    L.blokHtml({ omgeving: "android", browser: "firefox", palet: "licht" }),
    L.blokHtml({ omgeving: "android", browser: "chrome", heeftEvent: true, palet: "licht" }),
    L.blokHtml({ omgeving: "desktop", palet: "licht" })
  ].join(" ");
  assert.ok(!/[–—]/.test(alles));
});
