// Berichten van nieuws.infofrankrijk.com (Nieuwsvoorziening) in de Nieuws-tab van Infopoche. Alleen lezen,
// anoniem (geen cookies, geen sleutels, geen eigen headers). Werkt in de browser (window.IfNv) en in node.
// De bestaande stroom via nlfr-menu (nieuws-lib.js) blijft ongemoeid; dit is een aanvulling.
//
// Vorm van de openbare API (gelezen in Nieuwsvoorziening, app/api/nieuws en lib/motor/api.ts):
//   GET /api/nieuws?limiet=1..100[&categorie=<naam>][&peil=1]
//   -> { aantal, berichten: [{ id, kop, samenvatting, categorie, gepubliceerdOp (ISO), beeldUrl, beeldCredit,
//        bronnen: [{ naam, kop, datum, url }], peil: { raakt: [{ id, ... }] } }] }
//   Fout: { fout: "..." } met status 400, 502 of 503.
(function (root, fabriek) {
  if (typeof module === "object" && module.exports) module.exports = fabriek();
  else root.IfNv = fabriek();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var BASIS = "https://nieuws.infofrankrijk.com";
  var TIJDSLIMIET_MS = 8000;
  var MAX_ALLES = 30;
  var MAX_PEIL = 100;
  var CATEGORIEEN = ["algemeen", "politiek", "economie en ondernemen", "reizen en verkeer", "natuur en rampen", "toerisme en evenementen", "merkwaardig"];

  // Eén URL-bouwer: een onbekende categorie wordt genegeerd (nooit een vrije waarde in de aanvraag).
  function apiUrl(o) {
    o = o || {};
    var q = ["limiet=" + (o.peil ? MAX_PEIL : MAX_ALLES)];
    var c = String(o.categorie || "").trim().toLowerCase().replace(/-/g, " ");
    if (CATEGORIEEN.indexOf(c) >= 0) q.push("categorie=" + encodeURIComponent(c));
    if (o.peil) q.push("peil=1");
    return BASIS + "/api/nieuws?" + q.join("&");
  }

  function veiligId(id) {
    var s = String(id == null ? "" : id).trim();
    return /^[A-Za-z0-9_-]{1,80}$/.test(s) ? s : "";
  }
  function berichtUrl(id) {
    var s = veiligId(id);
    return s ? BASIS + "/bericht/" + s : "";
  }
  function httpsUrl(u) {
    try { var x = new URL(String(u || "").trim()); return x.protocol === "https:" ? x.href : ""; } catch (e) { return ""; }
  }
  // Lange streepjes uit externe tekst worden komma's (zoals bij de kalender).
  function schoon(t) { return String(t == null ? "" : t).replace(/\s+[—–]\s+/g, ", ").replace(/\s+/g, " ").trim(); }
  function sleutel(t) {
    return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  }
  function ink(t, n) { t = String(t || ""); return t.length <= n ? t : t.slice(0, n).replace(/\s+\S*$/, "") + "…"; }

  // Het antwoord naar kaartitems. null = onbruikbare vorm (dan de terugvalmelding); [] = geldig, maar leeg.
  // Een bericht zonder geldig id of zonder kop valt af; de rest blijft staan.
  function lees(d) {
    if (!d || typeof d !== "object" || !Array.isArray(d.berichten)) return null;
    var uit = [];
    d.berichten.forEach(function (b) {
      if (!b || typeof b !== "object") return;
      var id = veiligId(b.id), titel = schoon(b.kop);
      if (!id || !titel) return;
      var bronUrls = [];
      (Array.isArray(b.bronnen) ? b.bronnen : []).forEach(function (x) { var u = x && httpsUrl(x.url); if (u) bronUrls.push(u); });
      var raakt = b.peil && Array.isArray(b.peil.raakt) ? b.peil.raakt.length : 0;
      var t = Date.parse(b.gepubliceerdOp);
      uit.push({
        id: id, titel: titel, tekst: ink(schoon(b.samenvatting), 320), categorie: schoon(b.categorie),
        datum: isFinite(t) ? new Date(t).toISOString() : "", url: berichtUrl(id), bronUrls: bronUrls,
        portemonnee: raakt > 0 || b.portemonnee === true
      });
    });
    uit.sort(function (a, b) { return (Date.parse(b.datum) || 0) - (Date.parse(a.datum) || 0); });
    return uit;
  }

  // Veiligheidsnet voor de keuze "Raakt je portemonnee": ook als de API de parameter negeert,
  // blijven alleen berichten over die PEIL raken (of als portemonnee zijn gemarkeerd) staan.
  function alleenPortemonnee(items) { return (items || []).filter(function (i) { return i.portemonnee; }); }

  // Een bericht dat al in de oude stroom staat, valt hier weg. Gelijk = dezelfde kop (zonder hoofdletters,
  // accenten en leestekens), of een url van de oude stroom is de berichtlink of een van de bron-urls.
  // `oud` = items van nieuws-lib.js (titel, url).
  function ontdubbel(items, oud) {
    var titels = {}, urls = {};
    (oud || []).forEach(function (o) {
      if (!o) return;
      var k = sleutel(o.titel); if (k) titels[k] = true;
      var u = httpsUrl(o.url); if (u) urls[u.replace(/\/$/, "")] = true;
    });
    return (items || []).filter(function (i) {
      if (titels[sleutel(i.titel)]) return false;
      var eigen = [i.url].concat(i.bronUrls || []);
      return !eigen.some(function (u) { return u && urls[u.replace(/\/$/, "")]; });
    });
  }

  // Ophalen met time-out en zonder cookies of eigen headers. Geeft een belofte met de items, of een afwijzing.
  // `haal` is fetch (in tests een nepfunctie). De afwijzing heeft altijd een gewone reden, nooit een technisch bericht voor de lezer.
  function laad(haal, o) {
    if (typeof haal !== "function") return Promise.reject(new Error("geen netwerk"));
    var ctl = null, timer = null;
    try { ctl = new AbortController(); timer = setTimeout(function () { ctl.abort(); }, TIJDSLIMIET_MS); } catch (e) { ctl = null; }
    var opt = { credentials: "omit" };
    if (ctl) opt.signal = ctl.signal;
    var klaar = function () { if (timer) clearTimeout(timer); };
    return Promise.resolve().then(function () { return haal(apiUrl(o), opt); })
      .then(function (r) { if (!r || !r.ok) throw new Error("status"); return r.json(); })
      .then(function (d) {
        var items = lees(d);
        if (items === null) throw new Error("vorm");
        return o && o.peil ? alleenPortemonnee(items) : items;
      })
      .then(function (items) { klaar(); return items; }, function (e) { klaar(); throw e; });
  }

  var MELDING_UIT = "De nieuwste berichten van nieuws.infofrankrijk.com zijn nu niet te laden. Het nieuws hieronder blijft gewoon beschikbaar.";
  var MELDING_PEIL_UIT = "Berichten die je portemonnee raken zijn nu niet te laden. Probeer het zo nog eens; het andere nieuws blijft gewoon beschikbaar.";
  var MELDING_PEIL_LEEG = "Er is nu geen nieuws dat direct je portemonnee raakt.";

  return {
    BASIS: BASIS, TIJDSLIMIET_MS: TIJDSLIMIET_MS, MAX_ALLES: MAX_ALLES, MAX_PEIL: MAX_PEIL, CATEGORIEEN: CATEGORIEEN,
    apiUrl: apiUrl, berichtUrl: berichtUrl, lees: lees, alleenPortemonnee: alleenPortemonnee, ontdubbel: ontdubbel,
    laad: laad, sleutel: sleutel, ink: ink, MELDING_UIT: MELDING_UIT, MELDING_PEIL_UIT: MELDING_PEIL_UIT, MELDING_PEIL_LEEG: MELDING_PEIL_LEEG
  };
});
