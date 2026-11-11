// Meldingen bij deadlines: pure logica zonder DOM (browser: window.IfMeld; tests: require).
// De selectie (tussen de markeringen "selectie begin" en "selectie eind") staat letterlijk ook in de Edge Function
// supabase/functions/infopoche-push-zend/index.ts; tests/meldingen.test.mjs bewaakt dat beide gelijk blijven.
(function (root) {
  // De publieke VAPID-sleutel staat op deze ene plek. De privésleutel staat alleen in de Supabase Vault (zie CLAUDE.md).
  var VAPID_PUBLIEK = "BBVbnDG6SrUE7HFTKY9kIRI5FW-Lwl8fISPn7Fek9PhRRrD8eZ_lv3oH1dXXIMrR9NhYPrhGk8J6VO0TO4Q-miA";
  var PUSH_URL = "https://mqkhfyvrizgmmmcbdkxh.supabase.co/functions/v1/infopoche-push";
  var SLEUTEL = "ifm_meldingen";
  var DAGEN_ALLE = [7, 1, 0];
  var DAGEN_STANDAARD = [7, 1];
  var TIMEOUT_MS = 10000;
  var ID = /^[a-z0-9][a-z0-9_-]{0,39}$/;

  // ---- selectie begin ----
  var MAX_PER_DAG = 3;
  var SOORT_VOLGORDE = { datum: 0, mijlpaal: 1, periode: 2, seizoen: 3 };
  function dagVerschil(vanIso, vandaagIso) {
    var a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(vanIso), b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(vandaagIso);
    if (!a || !b) return null;
    return Math.round((Date.UTC(+a[1], +a[2] - 1, +a[3]) - Date.UTC(+b[1], +b[2] - 1, +b[3])) / 86400000);
  }
  function gebiedLijst(g) { return (Array.isArray(g) ? g : [g]).map(function (x) { return String(x || "").trim(); }).filter(Boolean); }
  function isDep(x) { return /^(\d{2,3}|2[AB])$/.test(x); }
  // Een gebied met departementsnummers telt alleen bij dat departement. Zonder nummers telt alleen "heel Frankrijk" of
  // "Nederland"; een zone, een streek of een onbekend gebied nooit. Een vereniging zonder bruikbaar departement nooit.
  function gebiedPast(item, dep) {
    var lijst = gebiedLijst(item.gebied), deps = lijst.filter(isDep);
    if (deps.length) return dep !== "geen" && deps.indexOf(dep) >= 0;
    if (item.rubriek === "verenigingen") return false;
    return lijst.indexOf("heel Frankrijk") >= 0 || lijst.indexOf("Nederland") >= 0;
  }
  function meldingTekst(c) {
    var titel = String(c.titel || "").replace(/\s+[\u2013\u2014]\s+/g, ", ").replace(/[\u2013\u2014]/g, "-").replace(/\s+/g, " ").trim();
    if (titel.length > 140) titel = titel.slice(0, 139).replace(/\s+\S*$/, "") + "\u2026";
    var begint = c.soort === "periode" || c.soort === "seizoen" ? " begint" : "";
    var voor = c.dagen === 0 ? "Vandaag" + begint : c.dagen === 1 ? "Morgen" + begint : "Over " + c.dagen + " dagen" + begint;
    return voor + ": " + titel;
  }
  // abo: {rubrieken, dagen, dep}; items: ruwe API-items; reedsVerstuurd(itemId, voorkomenIso, dagen) -> bool; reedsVandaag: aantal al verstuurd.
  function kiesMeldingen(abo, items, vandaag, reedsVerstuurd, reedsVandaag) {
    var ruimte = MAX_PER_DAG - (reedsVandaag || 0), uit = [];
    if (ruimte <= 0) return uit;
    var dep = abo.dep || "geen";
    (items || []).forEach(function (i) {
      if (!i || i.status !== "vastgesteld" || !Array.isArray(i.toon_in) || i.toon_in.indexOf("infopoche") < 0) return;
      if (i.datum_zeker === false || i.datum_zeker === "nee" || /\(waarschijnlijke datum\)/i.test(String(i.titel || ""))) return;
      if (abo.rubrieken.indexOf(i.rubriek) < 0 || !gebiedPast(i, dep)) return;
      (Array.isArray(i.voorkomens) ? i.voorkomens : []).forEach(function (v) {
        var d = v ? dagVerschil(v.van, vandaag) : null;
        if (d === null || abo.dagen.indexOf(d) < 0) return;
        if (reedsVerstuurd(i.id, v.van, d)) return;
        uit.push({ item_id: i.id, voorkomen: v.van, dagen: d, titel: i.titel, soort: i.soort, rubriek: i.rubriek });
      });
    });
    uit.sort(function (a, b) {
      var sa = SOORT_VOLGORDE[a.soort], sb = SOORT_VOLGORDE[b.soort];
      sa = sa === undefined ? 9 : sa; sb = sb === undefined ? 9 : sb;
      return sa - sb || a.dagen - b.dagen || (a.titel < b.titel ? -1 : a.titel > b.titel ? 1 : 0);
    });
    return uit.slice(0, ruimte).map(function (c) { c.tekst = meldingTekst(c); return c; });
  }
  // ---- selectie eind ----

  function tekst(x) { return typeof x === "string" ? x : ""; }

  // ---- keuzes (alleen keuzes, nooit het push-adres) ----
  function leesKeuze(ruw, rubriekIds) {
    var k = { aan: false, rubrieken: [], dagen: DAGEN_STANDAARD.slice() };
    if (ruw && typeof ruw === "object") {
      k.aan = ruw.aan === true;
      if (Array.isArray(ruw.rubrieken)) k.rubrieken = ruw.rubrieken.filter(function (r, i, a) { return typeof r === "string" && ID.test(r) && a.indexOf(r) === i && (!rubriekIds || rubriekIds.indexOf(r) >= 0); });
      if (Array.isArray(ruw.dagen)) {
        var d = DAGEN_ALLE.filter(function (x) { return ruw.dagen.indexOf(x) >= 0; });
        if (d.length) k.dagen = d;
      }
    }
    return k;
  }
  function wissel(lijst, x) { return lijst.indexOf(x) >= 0 ? lijst.filter(function (y) { return y !== x; }) : lijst.concat([x]); }
  function wisselDag(dagen, dag) {
    var n = wissel(dagen, dag);
    return n.length ? DAGEN_ALLE.filter(function (x) { return n.indexOf(x) >= 0; }) : dagen; // minstens een moment blijft staan
  }
  // Lijst voor de schakelaars: naam uit de API, uitleg uit de vaste lijst in modules.json (meldingen.uitleg).
  function rijen(rubrieken, uitleg, keuze) {
    return (rubrieken || []).filter(function (r) { return r && ID.test(String(r.id)) && tekst(r.naam); }).map(function (r) {
      return { id: r.id, naam: tekst(r.naam), uitleg: tekst(uitleg && uitleg[r.id]), aan: keuze.rubrieken.indexOf(r.id) >= 0 };
    });
  }

  // ---- staat van het toestel ----
  // o: {ios, standalone, heeftPush, permissie ("default"|"granted"|"denied"), aangezet}
  function staat(o) {
    o = o || {};
    if (o.ios && !o.standalone) return "ios-installeren";
    if (!o.heeftPush) return "geen-push";
    if (o.permissie === "denied") return "geweigerd";
    if (o.permissie === "granted" && o.aangezet) return "aan";
    return "uit";
  }

  // ---- abonnement naar de server ----
  function b64url(buf) {
    var b = new Uint8Array(buf), s = "";
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function sleutelBytes(b64) {
    var p = b64.replace(/-/g, "+").replace(/_/g, "/"); while (p.length % 4) p += "=";
    var raw = atob(p), u = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) u[i] = raw.charCodeAt(i);
    return u;
  }
  // sub: de uitkomst van PushSubscription.toJSON(); geeft de body voor de server of null.
  function serverBody(sub, keuze, dep) {
    if (!sub || typeof sub.endpoint !== "string" || !/^https:\/\//.test(sub.endpoint) || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) return null;
    return { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, rubrieken: keuze.rubrieken.slice(), dagen: keuze.dagen.slice(), dep: dep || "geen" };
  }

  var api = {
    VAPID_PUBLIEK: VAPID_PUBLIEK, PUSH_URL: PUSH_URL, SLEUTEL: SLEUTEL, DAGEN_ALLE: DAGEN_ALLE, DAGEN_STANDAARD: DAGEN_STANDAARD, TIMEOUT_MS: TIMEOUT_MS, MAX_PER_DAG: MAX_PER_DAG,
    dagVerschil: dagVerschil, gebiedPast: gebiedPast, meldingTekst: meldingTekst, kiesMeldingen: kiesMeldingen,
    leesKeuze: leesKeuze, wissel: wissel, wisselDag: wisselDag, rijen: rijen, staat: staat,
    b64url: b64url, sleutelBytes: sleutelBytes, serverBody: serverBody
  };
  root.IfMeld = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : this);
