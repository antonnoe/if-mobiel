// Abonneeblok en onderblad: pure logica (geen DOM). Window.IfAbonnee in de browser, require in de tests.
// De abonnementslink staat op één plek: `abonnement.url` in modules.json, met ABONNEE_URL als terugval.
(function (root) {
  var ABONNEE_URL = "https://infofrankrijk.com/abonnement/";
  var WEEK_MS = 7 * 24 * 3600 * 1000;
  var SLEUTEL = "ifm_abo_vraag";

  function urlOk(u) { try { var x = new URL(String(u)); return /^https?:$/.test(x.protocol) ? x.href : null; } catch (e) { return null; } }
  // De bestemming uit de catalogus (cat.abonnement.url) of de terugval.
  function abonneeUrl(cat) { return urlOk(cat && cat.abonnement && cat.abonnement.url) || ABONNEE_URL; }

  // Namen van de eerste twee abonnee-tools uit de catalogus, voor "zoals het Financieel kompas en Erfrecht en testament".
  function voorbeeldTools(cat) {
    var mods = (cat && cat.modules) || [];
    var namen = mods.filter(function (m) { return m && m.prijs === "abonnee" && m.kind === "iframe" && m.naam && m.zichtbaar !== false; })
      .map(function (m) { return m.naam; });
    return namen.slice(0, 2);
  }
  function toolZin(namen) {
    if (!namen || !namen.length) return "";
    return ", zoals het " + (namen.length > 1 ? namen[0] + " en " + namen[1] : namen[0]);
  }

  // Mag het onderblad nu? soort: "uitkomst" of "abonneetool" (direct na succesvol gebruik van een tool met prijs abonnee).
  // Beide: hooguit eens per week (laatst = tijdstempel van de vorige keer, of null), en hooguit eens per sessie
  // (nodig als het toestel niets onthoudt). Een tijdstempel in de toekomst (klok verzet) telt als verlopen.
  function moetOproep(o) {
    o = o || {};
    if (o.soort !== "uitkomst" && o.soort !== "abonneetool") return false;
    if (o.sessieGetoond) return false;
    var nu = typeof o.nu === "number" ? o.nu : Date.now();
    var l = typeof o.laatst === "number" && isFinite(o.laatst) ? o.laatst : null;
    if (l === null) return true;
    if (l > nu) return true;
    return nu - l >= WEEK_MS;
  }
  function leesLaatst(opslag) {
    try { var v = parseInt(opslag.getItem(SLEUTEL), 10); return isFinite(v) ? v : null; } catch (e) { return null; }
  }
  function schrijfLaatst(opslag, nu) {
    try { opslag.setItem(SLEUTEL, String(typeof nu === "number" ? nu : Date.now())); return true; } catch (e) { return false; }
  }

  var api = { ABONNEE_URL: ABONNEE_URL, WEEK_MS: WEEK_MS, SLEUTEL: SLEUTEL, abonneeUrl: abonneeUrl, voorbeeldTools: voorbeeldTools,
    toolZin: toolZin, moetOproep: moetOproep, leesLaatst: leesLaatst, schrijfLaatst: schrijfLaatst };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.IfAbonnee = api;
})(typeof window !== "undefined" ? window : globalThis);
