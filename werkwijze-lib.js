// Het scherm "Zo werken wij" (14 november 2026): pure functies voor de twaalf dia's. Gewone JavaScript, geen buildstap:
// index.html laadt dit bestand (window.IfWerkwijze), de tests laden het met require. De inhoud staat in data/werkwijze.json.
(function (root) {
  var TEKST = function (v) { return typeof v === "string" ? v.trim() : ""; };
  var KLEUREN = ["bordeaux", "wit", "licht"];
  var SOORTEN = ["tekst", "kaarten", "rijen", "lijst", "band", "peil", "reeks", "knop"];
  var SWIPE_MIN = 48;      // px horizontaal om als veeg te tellen
  var SWIPE_VERHOUDING = 1.4; // horizontaal moet duidelijk groter zijn dan verticaal, anders is het scrollen

  function lijstVan(v) { return Array.isArray(v) ? v : []; }

  // Valideert het JSON-bestand en geeft {stand, manifestUrl, dias} terug, of null bij een kapot bestand.
  // Een blok van een onbekende soort valt af; een dia zonder titel of zonder blokken telt niet mee.
  function lees(data) {
    if (!data || typeof data !== "object") return null;
    var stand = TEKST(data.stand);
    var dias = [];
    lijstVan(data.dias).forEach(function (d) {
      if (!d || typeof d !== "object" || !TEKST(d.titel)) return;
      var blokken = lijstVan(d.blokken).filter(function (b) { return b && SOORTEN.indexOf(b.soort) >= 0; });
      if (!blokken.length) return;
      dias.push({
        id: TEKST(d.id), kleur: KLEUREN.indexOf(d.kleur) >= 0 ? d.kleur : "licht", midden: !!d.midden, kleinTitel: !!d.kleinTitel,
        oog: TEKST(d.oog).replace("{stand}", stand.toUpperCase()), titel: TEKST(d.titel), blokken: blokken
      });
    });
    if (!dias.length) return null;
    return { stand: stand, manifestUrl: TEKST(data.manifestUrl), dias: dias };
  }

  // Alleen https-links gaan als link naar buiten; "@abonnement" en "@manifest" worden door de aanroeper ingevuld.
  function urlOk(u) { return typeof u === "string" && /^https:\/\/[^\s]+$/.test(u) ? u : ""; }

  function klem(i, n) { i = Math.floor(Number(i)); if (!(i >= 0)) i = 0; return n > 0 && i > n - 1 ? n - 1 : i; }
  // Volgende of vorige dia: blijft binnen 0..n-1 (op de laatste dia gebeurt er niets, "Opnieuw" gaat naar 0).
  function stap(i, delta, n) { return klem(klem(i, n) + (delta < 0 ? -1 : 1), n); }

  // Tik op de linkerhelft = vorige, rechterhelft = volgende. x en breedte zijn pixels binnen het kaartvlak.
  function tikRichting(x, breedte) {
    if (!(breedte > 0)) return "volgende";
    return x < breedte / 2 ? "vorige" : "volgende";
  }

  // Veeg: naar links = volgende dia, naar rechts = vorige; schuin of kort telt niet (dat is scrollen of een tik).
  function veegRichting(dx, dy) {
    var ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax < SWIPE_MIN || ax < ay * SWIPE_VERHOUDING) return "";
    return dx < 0 ? "volgende" : "vorige";
  }

  // De twaalf segmenten van de voortgangsbalk: gevuld tot en met de huidige dia.
  function segmenten(i, n) { var r = []; for (var k = 0; k < n; k++) r.push({ gevuld: k <= i }); return r; }

  function teller(i, n) { return (klem(i, n) + 1) + " / " + n; }

  var api = { lees: lees, urlOk: urlOk, klem: klem, stap: stap, tikRichting: tikRichting, veegRichting: veegRichting, segmenten: segmenten,
    teller: teller, SOORTEN: SOORTEN, KLEUREN: KLEUREN, SWIPE_MIN: SWIPE_MIN };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.IfWerkwijze = api;
})(typeof window !== "undefined" ? window : globalThis);
