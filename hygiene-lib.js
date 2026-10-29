// Hygiënecontroles (Alim'confiance, Ministerie van Landbouw, DGAL): pure functies voor de aanvraag en het lezen van het antwoord.
// Gewone JavaScript, geen buildstap: index.html laadt dit bestand (window.IfHyg), de tests laden het met require.
// Bron: Opendatasoft Explore API v2.1, dataset export_alimconfiance, Licence Ouverte. Anoniem, alleen een simpele GET zonder
// eigen headers (een eigen header faalt in de preflight). Er is bewust geen `select`: een verkeerde veldnaam geeft dan een 400.
(function (root) {
  var BASIS = "https://dgal.opendatasoft.com/api/explore/v2.1/catalog/datasets/export_alimconfiance/records";
  var SITE_URL = "https://alimconfiance.agriculture.gouv.fr";
  var STAP = 20;
  var MAX_OFFSET = 9980; // limit + offset mag bij Opendatasoft niet boven 10000 komen

  function postcodeOk(pc) { return typeof pc === "string" && /^\d{5}$/.test(pc); }

  // Nieuwste controle bovenaan. De postcode staat in de API als tekst.
  function url(pc, offset, limit) {
    if (!postcodeOk(pc)) return "";
    var o = Math.max(0, Math.min(MAX_OFFSET, offset | 0)), l = Math.max(1, Math.min(100, limit || STAP));
    return BASIS + "?where=" + encodeURIComponent('code_postal="' + pc + '"') +
      "&order_by=" + encodeURIComponent("date_inspection desc") + "&limit=" + l + "&offset=" + o;
  }

  function tekst(v) { return typeof v === "string" ? v.trim() : ""; }
  function eerste(v) { return Array.isArray(v) ? tekst(v[0]) : tekst(v); }
  function titelCase(s) {
    // De bron levert veel namen en straten in hoofdletters; zo leest het rustiger.
    if (!s || s !== s.toUpperCase()) return s;
    return s.toLowerCase().replace(/(^|[\s'’\-\/(])([a-zàâäçéèêëîïôöùûüÿœ])/g, function (m, a, b) { return a + b.toUpperCase(); });
  }
  function datumNl(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(tekst(iso));
    return m ? m[3] + "-" + m[2] + "-" + m[1] : "";
  }

  // Een record uit `results`; zonder naam valt het af.
  function item(r) {
    if (!r || typeof r !== "object") return null;
    var naam = tekst(r.app_libelle_etablissement) || tekst(r.libelle_etablissement) || tekst(r.enseigne) || tekst(r.raison_sociale);
    if (!naam) return null;
    var pc = tekst(r.code_postal), plaats = tekst(r.libelle_commune) || tekst(r.com_name) || tekst(r.localite);
    var straat = tekst(r.adresse_activite) || tekst(r.adresse_2_ua);
    var sleutel = tekst(r.code_ua) || (tekst(r.siret) + "|" + straat);
    return {
      sleutel: sleutel || (naam + "|" + straat),
      naam: titelCase(naam),
      soort: eerste(r.app_libelle_activite_etablissement) || tekst(r.type_activite),
      adres: [titelCase(straat), [pc, titelCase(plaats)].filter(Boolean).join(" ")].filter(Boolean).join(", "),
      uitkomst: tekst(r.synthese_eval_sanit),
      datum: datumNl(r.date_inspection)
    };
  }

  // Antwoord van /records: {total_count, results:[...]}. Een onverwachte vorm geeft null (dan toont de app een melding).
  function lees(json) {
    if (!json || typeof json !== "object" || !Array.isArray(json.results)) return null;
    var items = json.results.map(item).filter(Boolean);
    return { totaal: typeof json.total_count === "number" ? json.total_count : items.length, aantalRuw: json.results.length, items: items };
  }

  // Dezelfde zaak komt bij meerdere controles terug: de nieuwste (de eerste) blijft staan.
  function voegSamen(bestaand, nieuw) {
    var gezien = {}, uit = [];
    (bestaand || []).concat(nieuw || []).forEach(function (i) { if (!gezien[i.sleutel]) { gezien[i.sleutel] = 1; uit.push(i); } });
    return uit;
  }

  // De vier niveaus van de bron met een Nederlandse omschrijving; onbekende tekst blijft ongewijzigd.
  var UITKOMST_NL = { "très satisfaisant": "Zeer tevredenstellend", "satisfaisant": "Tevredenstellend", "à améliorer": "Te verbeteren",
    "à corriger de manière urgente": "Dringend te corrigeren" };
  function uitkomstTekst(raw) {
    var t = tekst(raw); if (!t) return "";
    var nl = UITKOMST_NL[t.toLowerCase()];
    return nl ? nl + " (" + t + ")" : t;
  }

  function kanMeer(offset, aantalRuw, totaal) {
    var volgende = offset + aantalRuw;
    return aantalRuw > 0 && volgende < totaal && volgende <= MAX_OFFSET;
  }

  var api = { BASIS: BASIS, SITE_URL: SITE_URL, STAP: STAP, postcodeOk: postcodeOk, url: url, item: item, lees: lees,
    voegSamen: voegSamen, uitkomstTekst: uitkomstTekst, kanMeer: kanMeer, datumNl: datumNl, titelCase: titelCase };
  root.IfHyg = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
