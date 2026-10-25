// Advertenties (Te koop in Frankrijk): pure logica zonder DOM (browser: window.IfAdv; tests: require).
// Bron: GET https://if-plek.vercel.app/api/vastgoed, nieuwste eerst. De app leest alleen; een tik opent Nederlanders.fr.
(function (root) {
  var API = "https://if-plek.vercel.app/api/vastgoed";
  var STAP = 20;
  var ADVERTEREN_URL = "https://www.nederlanders.fr/page/onroerend-goed";
  var ALLE_URL = "https://www.nederlanders.fr/page/onroerend-goed";

  function https(u) { return typeof u === "string" && /^https:\/\/[^\s]+$/.test(u); }
  function tekst(x) { return typeof x === "string" ? x.replace(/\s+/g, " ").trim() : ""; }
  function waar(x) { return x === true || x === 1 || x === "1" || /^(true|ja|yes)$/i.test(String(x || "")); }

  function bedrag(n) {
    if (typeof n !== "number" || !isFinite(n) || n <= 0) return "";
    return "€ " + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  // Alleen de weergave: "k.k." (kosten koper) wordt voluit getoond, de bron blijft ongewijzigd.
  function prijsWeergave(t) {
    return tekst(t).replace(/(^|[^\p{L}])k\.?\s?k\.?(?![\p{L}])/giu, function (m, v) { return v + "k.k. (kosten koper)"; });
  }

  // "2026-10-12" of "2026-10-12T08:00:00Z" naar "12-10-2026"; anders de losse datumtekst van de bron.
  function datumTekst(it) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(it && it.datumISO || ""));
    if (m) return m[3] + "-" + m[2] + "-" + m[1];
    return tekst(it && it.datum);
  }

  // Antwoord van de functie naar {items, aantal} of null als de vorm niet klopt. Een advertentie zonder titel of
  // zonder https-link wordt overgeslagen (er is dan niets om te openen).
  function lees(data) {
    if (!data || typeof data !== "object" || !Array.isArray(data.items)) return null;
    var items = [];
    data.items.forEach(function (x) {
      if (!x || typeof x !== "object") return;
      var titel = tekst(x.titel);
      if (!titel || !https(x.url)) return;
      var datum = datumTekst(x);
      items.push({
        titel: titel, url: x.url,
        prijsTekst: prijsWeergave(tekst(x.prijsTekst) || bedrag(x.prijs)),
        foto: https(x.foto) ? x.foto : "",
        plaats: tekst(x.plaats),
        omschrijving: tekst(x.omschrijving),
        datum: datum, exploitatie: waar(x.exploitatie)
      });
    });
    return { items: items, aantal: items.length, bijgewerkt: tekst(data.bijgewerkt) };
  }

  function telTekst(n) { return n === 1 ? "1 advertentie" : n + " advertenties"; }
  function eerste(items, n) { return (items || []).slice(0, Math.max(0, n)); }
  function meer(n, totaal) { return Math.min(totaal, n + STAP); }

  var api = { prijsWeergave: prijsWeergave, API: API, STAP: STAP, ADVERTEREN_URL: ADVERTEREN_URL, ALLE_URL: ALLE_URL, https: https, bedrag: bedrag, datumTekst: datumTekst,
    lees: lees, telTekst: telTekst, eerste: eerste, meer: meer };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.IfAdv = api;
})(typeof window !== "undefined" ? window : globalThis);
