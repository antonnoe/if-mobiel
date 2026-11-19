// Nedergids V2 (gelaagd geo-adresboek): pure functies voor de aanvraag en het lezen van het antwoord.
// Gewone JavaScript, geen buildstap: index.html laadt dit bestand (window.IfNg), de tests laden het met require.
// Bron: eigen Edge Function `nedergids` op Supabase-project communities-tools. Anoniem, alleen een simpele GET.
(function (root) {
  var BASIS = "https://mqkhfyvrizgmmmcbdkxh.supabase.co/functions/v1/nedergids";
  var SITE_URL = "https://nedergids.nl";

  function postcodeOk(pc) { return typeof pc === "string" && /^\d{5}$/.test(pc); }

  function url(pc) {
    if (!postcodeOk(pc)) return "";
    return BASIS + "?postcode=" + encodeURIComponent(pc);
  }

  // Zoekscherm op nedergids.nl (keuze A, 19-11-2026: elke Nedergids-ingang in de app opent nedergids.nl met de postcode).
  function zoekUrl(pc) {
    return postcodeOk(pc) ? SITE_URL + "/zoek?postcode=" + pc : SITE_URL + "/zoek";
  }

  function tekst(v) { return typeof v === "string" ? v.trim() : ""; }

  function werkgebiedLabel(r) {
    var w = tekst(r.werkgebied);
    if (w === "landelijk") return "Heel Frankrijk";
    if (w === "straal") {
      var km = typeof r.straal_km === "number" ? r.straal_km : parseInt(r.straal_km, 10);
      return isFinite(km) && km > 0 ? "Straal " + km + " km" : "Regionaal";
    }
    return "";
  }

  function plaatsLabel(r) {
    var p = tekst(r.plaats);
    var a = typeof r.afstand_km === "number" && isFinite(r.afstand_km) ? r.afstand_km : null;
    if (p && a !== null) return p + " · " + a + " km";
    if (p) return p;
    if (a !== null) return a + " km";
    return "";
  }

  // Een entry uit `entries`; zonder naam valt hij af.
  function item(r) {
    if (!r || typeof r !== "object") return null;
    var naam = tekst(r.naam);
    if (!naam) return null;
    var werkgebied = tekst(r.werkgebied) || "adres";
    return {
      id: tekst(r.id),
      naam: naam,
      beschrijving: tekst(r.beschrijving),
      rubriek: tekst(r.rubriek),
      plaatsLabel: plaatsLabel(r),
      werkgebiedLabel: werkgebiedLabel(r),
      werkgebied: werkgebied,
      landelijk: werkgebied === "landelijk",
      geverifieerd: !!tekst(r.reg_geverifieerd_op)
    };
  }

  // Antwoord van de Edge Function: {ok, gemeente, entries:[...]}. Een onverwachte vorm geeft null.
  function lees(json) {
    if (!json || typeof json !== "object" || json.ok !== true || !Array.isArray(json.entries)) return null;
    var lokaal = [], landelijk = [];
    json.entries.forEach(function (r) {
      var it = item(r);
      if (!it) return;
      (it.landelijk ? landelijk : lokaal).push(it);
    });
    return { gemeente: tekst(json.gemeente), lokaal: lokaal, landelijk: landelijk };
  }

  var api = { BASIS: BASIS, SITE_URL: SITE_URL, postcodeOk: postcodeOk, url: url, zoekUrl: zoekUrl, item: item, lees: lees,
    werkgebiedLabel: werkgebiedLabel, plaatsLabel: plaatsLabel };
  root.IfNg = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
