// Scherm Infofrankrijk: pure logica (url-bouwers, antwoord lezen, datum, entiteiten). Browser: window.IfInfo; tests: import.
(function (root) {
  var BASIS = "https://infofrankrijk.com";
  var PER_PAGINA = 20;
  var FOUT = "Infofrankrijk is nu niet bereikbaar.";
  var LAAD = "Artikelen worden opgehaald...";
  var BENAMD = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "...", ndash: "-", mdash: "-", lsquo: "‘", rsquo: "’",
    ldquo: "“", rdquo: "”", laquo: "«", raquo: "»", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç",
    euro: "€", deg: "°", middot: "·", times: "×" };

  // Titel uit de API (title.rendered, met HTML-entiteiten) naar platte tekst. Geen DOM, geen innerHTML.
  function decodeer(s) {
    var t = String(s == null ? "" : s).replace(/<[^>]*>/g, "");
    t = t.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, function (m, e) {
      var c = null;
      if (e.charAt(0) === "#") {
        var n = e.charAt(1).toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        if (n === 8211 || n === 8212) return "-";
        if (n === 8230) return "...";
        if (n > 0 && n < 0x110000) { try { c = String.fromCodePoint(n); } catch (x) { c = null; } }
      } else if (Object.prototype.hasOwnProperty.call(BENAMD, e.toLowerCase())) c = BENAMD[e.toLowerCase()];
      return c == null ? m : c;
    });
    return t.replace(/[ \s]+/g, " ").trim();
  }

  // "2026-11-06T08:50:00" -> "06-11-2026" (zonder tijdzone-omrekening, de site rekent in eigen tijd).
  function datumNl(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
    return m ? m[3] + "-" + m[2] + "-" + m[1] : "";
  }

  // Alleen https-links op infofrankrijk.com of www.infofrankrijk.com.
  function linkOk(u) {
    if (typeof u !== "string") return false;
    var m = /^https:\/\/(www\.)?infofrankrijk\.com(\/|$)/i.exec(u);
    return !!m && !/\s/.test(u);
  }

  function nieuwsteUrl() {
    return BASIS + "/wp-json/wp/v2/posts?per_page=5&_fields=title,date,link";
  }
  // Categorie-id's: alleen positieve gehele getallen.
  function ids(lijst) {
    return (Array.isArray(lijst) ? lijst : []).map(function (x) { return Number(x); })
      .filter(function (n) { return isFinite(n) && n > 0 && Math.floor(n) === n; });
  }
  function rubriekUrl(cats, pagina) {
    var c = ids(cats);
    if (!c.length) return null;
    var p = Math.max(1, Math.floor(Number(pagina)) || 1);
    return BASIS + "/wp-json/wp/v2/posts?categories=" + c.join(",") + "&per_page=" + PER_PAGINA + "&page=" + p + "&_fields=title,date,link";
  }

  // Antwoord van /posts naar [{titel, url, datum}]. Zonder titel of met een link buiten de site valt een rij af.
  function leesPosts(data) {
    if (!Array.isArray(data)) return [];
    var uit = [], gezien = {};
    data.forEach(function (x) {
      if (!x || !linkOk(x.link)) return;
      var titel = decodeer(x.title && typeof x.title === "object" ? x.title.rendered : x.title);
      if (!titel || gezien[x.link]) return;
      gezien[x.link] = true;
      uit.push({ titel: titel, url: x.link, datum: datumNl(x.date) });
    });
    return uit;
  }

  // Aantal pagina's uit de header X-WP-TotalPages; ontbreekt die, dan zegt een volle pagina dat er meer kan komen.
  function aantalPaginas(header, pagina, aantalRuw) {
    var n = parseInt(header, 10);
    if (isFinite(n) && n > 0) return n;
    return aantalRuw >= PER_PAGINA ? pagina + 1 : pagina;
  }

  // Onderwerpen uit modules.json: titel verplicht, minstens een geldig categorie-id.
  function leesOnderwerpen(cfg) {
    var l = cfg && Array.isArray(cfg.onderwerpen) ? cfg.onderwerpen : [];
    return l.map(function (o) {
      return o && typeof o.titel === "string" && o.titel.trim() ? { titel: o.titel.trim(), categorieen: ids(o.categorieen) } : null;
    }).filter(function (o) { return o && o.categorieen.length; });
  }

  var api = { BASIS: BASIS, PER_PAGINA: PER_PAGINA, FOUT: FOUT, LAAD: LAAD, SITE_URL: BASIS + "/", decodeer: decodeer, datumNl: datumNl, linkOk: linkOk,
    nieuwsteUrl: nieuwsteUrl, rubriekUrl: rubriekUrl, ids: ids, leesPosts: leesPosts, aantalPaginas: aantalPaginas, leesOnderwerpen: leesOnderwerpen };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.IfInfo = api;
})(typeof window !== "undefined" ? window : globalThis);
