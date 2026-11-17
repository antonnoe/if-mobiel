// "Kort antwoord met AI" op het zoekscherm (ronde 3, 17-11-2026): pure logica zonder DOM en zonder netwerk.
// Browser: window.IfVraag; tests: require. Hergebruikt klusarchief-lib.js (window.IfKa): antwoord valideren (leesChat),
// tekst naar blokken en segmenten (chatBlokken, nooit als HTML) en de lijst met toegestane officiële hosts.
// Niets van vraag of antwoord wordt bewaard (geen storage, geen URL): alles staat in het geheugen van de pagina.
(function (root) {
  var BASIS = "https://mqkhfyvrizgmmmcbdkxh.supabase.co/functions/v1/infopoche-vraag";
  var MIN = 5, MAX = 300, TIMEOUT_MS = 45000, STATUS_MS = 5000, PAUZE_MS = 1200;
  // Eén plek voor de abonnee-teksten rond Kort antwoord met AI (besluit 17-11-2026, herstelronde 1): het is premium, maar voorlopig voor iedereen open.
  var LABEL = "abonnee, nu gratis";
  var REGEL = "Kort antwoord met AI: voor abonnees, nu nog voor iedereen";
  var KOP = "Kort antwoord";
  var KNOP = "Kort antwoord met AI";
  var WACHT = "Antwoord zoeken in onze bronnen...";
  var PRIVACY = "Je vraag gaat naar Claude van Anthropic om het antwoord te schrijven. InfoPoche bewaart hem niet en schrijft hem nergens op. Anthropic kan zulke gegevens zelf een beperkte tijd bewaren. De zoektermen uit je vraag gaan naar infofrankrijk.com. Vul geen namen of adressen in.";
  var GEEN_BRON = "Hier vond ik geen bron voor. Kijk in de resultaten hieronder of stel je vraag op het forum.";

  function K() {
    if (root.IfKa) return root.IfKa;
    if (typeof require === "function") { try { return require("./klusarchief-lib.js"); } catch (e) {} }
    return null;
  }
  function schoon(t) {
    return typeof t === "string" ? t.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim() : "";
  }
  // Vraag voor de aanvraag: spaties samengevoegd, op 300 tekens afgekapt; korter dan 5 tekens geeft "".
  function vraagSchoon(v) {
    var t = schoon(v);
    if (t.length > MAX) t = t.slice(0, MAX).trim();
    return t.length >= MIN ? t : "";
  }
  function aantalWoorden(v) {
    var t = schoon(v);
    return t ? t.split(" ").length : 0;
  }
  // Automatisch starten bij 3 of meer woorden of een vraag die op ? eindigt; anders alleen via de knop.
  function metAuto(v) {
    var t = vraagSchoon(v);
    if (!t) return false;
    return aantalWoorden(t) >= 3 || /\?$/.test(t);
  }
  // Sleutel voor "dezelfde vraag": kleine letters, accenten weg, leestekens weg.
  function sleutel(v) {
    var s = vraagSchoon(v).toLowerCase();
    try { s = s.normalize("NFD").replace(/[̀-ͯ]/g, ""); } catch (e) {}
    return s.replace(/[^a-z0-9]+/g, " ").trim();
  }
  // POST-lichaam; zonder geldige vraag: null.
  function body(v) {
    var t = vraagSchoon(v);
    return t ? JSON.stringify({ vraag: t, web: "" }) : null;
  }
  function aan(data) { var k = K(); return !!k && k.chatAan(data); }
  // ok | druk | uit | fout (403 en 503 "uit" verbergen de kaart).
  function soort(status, data) { var k = K(); return k ? k.chatSoort(status, data) : "fout"; }
  // Antwoord (POST) naar {antwoord, bronnen, geenBron} of null. Bronnen: forum met id, artikel op infofrankrijk.com (https),
  // officieel op een host uit OFFICIEEL_HOSTS; al het andere valt af. Zonder (geldige) bron geldt het vaste antwoord.
  function lees(data) {
    var k = K();
    if (!k) return null;
    var l = k.leesChat(data);
    if (!l) return null;
    var bronnen = l.bronnen.filter(function (b) {
      if (b.soort === "forum") return typeof b.id === "number" || /^\d+$/.test(String(b.id));
      if (b.soort === "artikel") return /^https:\/\/(www\.)?infofrankrijk\.com\//i.test(b.url);
      if (b.soort === "officieel") return !!k.urlOpHost(b.url, k.OFFICIEEL_HOSTS);
      return false;
    });
    if (!bronnen.length) return { antwoord: GEEN_BRON, bronnen: [], geenBron: true };
    return { antwoord: l.antwoord, bronnen: bronnen, geenBron: false };
  }
  function blokken(antwoord, bronnen) { var k = K(); return k ? k.chatBlokken(antwoord, bronnen) : []; }
  function bronMeta(b) { var k = K(); return k ? k.bronMeta(b) : ""; }
  function verouderdTekst(jaar) { var k = K(); return k ? k.verouderdTekst(jaar) : ""; }
  function heeftForum(bronnen) { return (bronnen || []).some(function (b) { return b.soort === "forum"; }); }
  function waarschuwing() { var k = K(); return k ? k.CHAT_WAARSCHUWING : ""; }
  function samenvatting() { var k = K(); return k ? k.CHAT_SAMENVATTING : ""; }

  var api = {
    BASIS: BASIS, MIN: MIN, MAX: MAX, TIMEOUT_MS: TIMEOUT_MS, STATUS_MS: STATUS_MS, PAUZE_MS: PAUZE_MS,
    LABEL: LABEL, REGEL: REGEL, KOP: KOP, KNOP: KNOP, WACHT: WACHT, PRIVACY: PRIVACY, GEEN_BRON: GEEN_BRON,
    vraagSchoon: vraagSchoon, aantalWoorden: aantalWoorden, metAuto: metAuto, sleutel: sleutel, body: body, aan: aan, soort: soort,
    lees: lees, blokken: blokken, bronMeta: bronMeta, verouderdTekst: verouderdTekst, heeftForum: heeftForum, waarschuwing: waarschuwing, samenvatting: samenvatting
  };
  root.IfVraag = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
