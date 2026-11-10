// Scherm Infofrankrijk: pure logica (url-bouwers, lijst lezen, samenvatting, leestijd, reeksen, tool-herkenning, media, chips, datum, entiteiten).
// Browser: window.IfInfo; tests: import.
(function (root) {
  var BASIS = "https://infofrankrijk.com";
  var PER_PAGINA = 20;
  var FOUT = "Infofrankrijk is nu niet bereikbaar.";
  var LAAD = "Artikelen worden opgehaald...";
  var BENAMD = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "...", ndash: "\u2013", mdash: "\u2014", lsquo: "‘", rsquo: "’",
    ldquo: "“", rdquo: "”", laquo: "«", raquo: "»", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç",
    euro: "€", deg: "°", middot: "·", times: "×" };

  // Titel uit de API (title.rendered, met HTML-entiteiten) naar platte tekst. Geen DOM, geen innerHTML.
  function decodeer(s) {
    var t = String(s == null ? "" : s).replace(/<[^>]*>/g, "");
    t = t.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, function (m, e) {
      var c = null;
      if (e.charAt(0) === "#") {
        var n = e.charAt(1).toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        if (n === 8230) return "...";
        if (n > 0 && n < 0x110000) { try { c = String.fromCodePoint(n); } catch (x) { c = null; } }
      } else if (Object.prototype.hasOwnProperty.call(BENAMD, e.toLowerCase())) c = BENAMD[e.toLowerCase()];
      return c == null ? m : c;
    });
    // Lange streepjes uit de bron: tussen cijfers een koppelteken (bereik), anders een komma.
    t = t.replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, "$1-$2").replace(/\s*[\u2013\u2014]\s*/g, ", ");
    return t.replace(/[\u00a0\s]+/g, " ").replace(/\s+,/g, ",").trim();
  }

  var MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
  // "2026-11-06T08:50:00" -> "06-11-2026" (zonder tijdzone-omrekening, de site rekent in eigen tijd).
  function datumNl(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
    return m ? m[3] + "-" + m[2] + "-" + m[1] : "";
  }
  // "2026-11-06T08:50:00" -> "6 november 2026".
  function datumVoluit(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
    if (!m) return "";
    var mnd = parseInt(m[2], 10);
    if (mnd < 1 || mnd > 12) return "";
    return parseInt(m[3], 10) + " " + MAANDEN[mnd - 1] + " " + m[1];
  }

  // Alleen https-links op infofrankrijk.com of www.infofrankrijk.com.
  function linkOk(u) {
    if (typeof u !== "string") return false;
    var m = /^https:\/\/(www\.)?infofrankrijk\.com(\/|$)/i.exec(u);
    return !!m && !/\s/.test(u);
  }
  function slugVan(u) {
    var m = /^https:\/\/(?:www\.)?infofrankrijk\.com\/([^/?#]+)\/?(?:[?#].*)?$/i.exec(String(u || ""));
    return m ? m[1].toLowerCase() : "";
  }

  var LIJST_VELDEN = "id,title,link,date,excerpt,categories,featured_media,yoast_head_json.description,yoast_head_json.twitter_misc";
  // Categorie-id's: alleen positieve gehele getallen.
  function ids(lijst) {
    return (Array.isArray(lijst) ? lijst : []).map(function (x) { return Number(x); })
      .filter(function (n) { return isFinite(n) && n > 0 && Math.floor(n) === n; });
  }
  // Lijst van artikelen: zonder categorieen de nieuwste, anders gefilterd. Een lege (ongeldige) opgave van categorieen geeft null.
  function lijstUrl(cats, pagina) {
    var p = Math.max(1, Math.floor(Number(pagina)) || 1), c = cats == null ? null : ids(cats);
    if (c && !c.length) return null;
    return BASIS + "/wp-json/wp/v2/posts?per_page=" + PER_PAGINA + (c ? "&categories=" + c.join(",") : "") + "&page=" + p + "&_fields=" + LIJST_VELDEN;
  }
  function nieuwsteUrl() { return lijstUrl(null, 1); }
  function rubriekUrl(cats, pagina) { return lijstUrl(cats || [], pagina); }
  // Afbeeldingen: tweede aanvraag, alleen de formaten (nooit og_image of _embed).
  function mediaUrl(lijst) {
    var i = ids(lijst);
    return i.length ? BASIS + "/wp-json/wp/v2/media?include=" + i.join(",") + "&per_page=" + Math.min(100, i.length) + "&_fields=id,media_details" : null;
  }
  // Subcategorieen van een categorie (chips) en de eigen link van een categorie (siteknop).
  function chipsUrl(parent) {
    var p = ids([parent]);
    return p.length ? BASIS + "/wp-json/wp/v2/categories?parent=" + p[0] + "&_fields=id,name,count,link&per_page=50" : null;
  }
  function categorieUrl(lijst) {
    var i = ids(lijst);
    return i.length ? BASIS + "/wp-json/wp/v2/categories?include=" + i.join(",") + "&_fields=id,name,link&per_page=" + Math.min(100, i.length) : null;
  }

  // Samenvatting: de Yoast-beschrijving, anders de excerpt, behalve een excerpt die met "1." begint (inhoudsopgave van een reeks).
  function kiesSamenvatting(x) {
    var y = x && x.yoast_head_json, d = decodeer(y && y.description);
    if (d) return d;
    var e = decodeer(x && x.excerpt && typeof x.excerpt === "object" ? x.excerpt.rendered : x && x.excerpt);
    if (/^1\./.test(e)) return "";
    return e.replace(/\s*\[\.\.\.\]$|\s*\.\.\.$/, "...");
  }
  // "12 min" uit twitter_misc["Geschatte leestijd"] -> "12 min lezen"; ontbreekt of onzin: "".
  function leestijd(x) {
    var y = x && x.yoast_head_json, t = y && y.twitter_misc && typeof y.twitter_misc === "object" ? y.twitter_misc["Geschatte leestijd"] : "";
    var n = parseInt(String(t || ""), 10);
    return isFinite(n) && n > 0 ? n + " min lezen" : "";
  }
  // Reekssleutel: de tekst tussen "1." en "2." in de excerpt (opgeschoond), of "".
  function reeksSleutel(x) {
    var e = decodeer(x && x.excerpt && typeof x.excerpt === "object" ? x.excerpt.rendered : "");
    var m = /^1\.\s*(.{8,60}?)\s+2\./.exec(e);
    return m ? m[1].replace(/[\s.]+$/, "").trim() : "";
  }

  // Lengte van de reeks volgens de genummerde inhoudsopgave in de excerpt (1., 2., 3. ... aaneengesloten), of 0.
  function reeksLengte(x) {
    var e = decodeer(x && x.excerpt && typeof x.excerpt === "object" ? x.excerpt.rendered : "");
    var k = 0;
    while (new RegExp("(^|\\s)" + (k + 1) + "\\.\\s").test(e)) k++;
    return k;
  }

  // Antwoord van /posts naar [{id, titel, url, slug, datum, datumVoluit, samenvatting, leestijd, media, reeks}].
  // Zonder titel of met een link buiten de site valt een rij af, dubbele links tellen eenmaal.
  function leesLijst(data) {
    if (!Array.isArray(data)) return [];
    var uit = [], gezien = {};
    data.forEach(function (x) {
      if (!x || !linkOk(x.link)) return;
      var titel = decodeer(x.title && typeof x.title === "object" ? x.title.rendered : x.title);
      if (!titel || gezien[x.link]) return;
      gezien[x.link] = true;
      uit.push({ id: Number(x.id) || 0, titel: titel, url: x.link, slug: slugVan(x.link), datum: datumNl(x.date), datumVoluit: datumVoluit(x.date),
        samenvatting: kiesSamenvatting(x), leestijd: leestijd(x), media: Number(x.featured_media) > 0 ? Number(x.featured_media) : 0, reeks: reeksSleutel(x), reeksLengte: reeksLengte(x) });
    });
    return uit;
  }

  // Reeksen samenvoegen: bij dezelfde sleutel en minstens 3 items in deze lijst een kaart (het item waarvan de titel gelijk is aan
  // de sleutel, anders het eerste) met n = het hoogste van het aantal getelde items en de lengte van de genummerde inhoudsopgave. Overige items en kleine reeksen blijven los staan.
  // Resultaat: [{item, n}] met n 1 voor een los item; reeks is dan ook gezet bij een echte reeks.
  function voegReeksenSamen(items) {
    var groepen = {}, volgorde = [];
    (items || []).forEach(function (it) {
      if (it.reeks) { (groepen[it.reeks] = groepen[it.reeks] || []).push(it); }
    });
    // Hoofdstukken zonder genummerde excerpt ("Hoofdstuk 3 van de Franse elektrische installatie") horen bij een reeks
    // als hun samenvatting "hoofdstuk" en de reeksnaam noemt (besluit 10-11-2026: het ontwerp had ze samengevoegd).
    (items || []).forEach(function (it) {
      if (it.reeks || !/hoofdstuk/i.test(it.samenvatting || "")) return;
      var sam = (it.samenvatting || "").toLowerCase();
      Object.keys(groepen).forEach(function (k) {
        if (!it.reeks && groepen[k].length >= 2 && k.length >= 8 && sam.indexOf(k.toLowerCase()) >= 0) { it.reeks = k; groepen[k].push(it); }
      });
    });
    var gedaan = {}, uit = [];
    (items || []).forEach(function (it) {
      var g = it.reeks ? groepen[it.reeks] : null;
      if (g && g.length >= 3) {
        if (gedaan[it.reeks]) return;
        gedaan[it.reeks] = true;
        var kop = g.filter(function (x) { return x.titel.replace(/[\s.]+$/, "") === it.reeks; })[0] || g[0];
        uit.push({ item: kop, n: Math.max(g.length, kop.reeksLengte || 0), reeks: it.reeks });
      } else uit.push({ item: it, n: 1, reeks: "" });
    });
    return uit;
  }

  // Slugs van artikelen die bij een tool in de app horen: het veld `artikel` van zichtbare modules, plus de kalender.
  function toolSlugs(modules, extra) {
    var s = {};
    (extra || ["kalender-frankrijk"]).forEach(function (x) { s[x] = true; });
    (Array.isArray(modules) ? modules : []).forEach(function (m) {
      if (m && m.artikel && m.zichtbaar !== false) { var g = slugVan(m.artikel); if (g) s[g] = true; }
    });
    return s;
  }
  function isTool(item, slugs) { return !!(item && item.slug && slugs && slugs[item.slug]); }

  // Antwoord van /media naar {id: https-url}: alleen sizes.thumbnail (terugval medium); geen sizes is geen afbeelding.
  function leesMedia(data) {
    var uit = {};
    (Array.isArray(data) ? data : []).forEach(function (m) {
      var s = m && m.media_details && m.media_details.sizes;
      if (!m || !s || typeof s !== "object") return;
      var t = (s.thumbnail && s.thumbnail.source_url) || (s.medium && s.medium.source_url) || "";
      if (typeof t === "string" && /^https:\/\/[^\s]+$/.test(t) && Number(m.id) > 0) uit[Number(m.id)] = t;
    });
    return uit;
  }

  // Chips: [{id, naam}] met alleen count > 0. Meerdere lijsten (een onderwerp met meer categorieen) worden samengevoegd.
  function leesChips(lijsten) {
    var uit = [], gezien = {};
    (Array.isArray(lijsten) ? lijsten : []).forEach(function (data) {
      (Array.isArray(data) ? data : []).forEach(function (c) {
        if (!c || !(Number(c.count) > 0) || !(Number(c.id) > 0) || gezien[c.id]) return;
        var naam = decodeer(c.name);
        if (!naam) return;
        gezien[c.id] = true;
        uit.push({ id: Number(c.id), naam: naam });
      });
    });
    return uit;
  }
  // De categoriepagina van het onderwerp (eerste geldige link op de site), of "".
  function leesCategorieLink(data) {
    var l = Array.isArray(data) ? data : [];
    for (var i = 0; i < l.length; i++) if (l[i] && linkOk(l[i].link)) return l[i].link;
    return "";
  }

  // Aantal pagina's uit de header X-WP-TotalPages; ontbreekt die, dan zegt een volle pagina dat er meer kan komen.
  function aantalPaginas(header, pagina, aantalRuw) {
    var n = parseInt(header, 10);
    if (isFinite(n) && n > 0) return n;
    return aantalRuw >= PER_PAGINA ? pagina + 1 : pagina;
  }

  var ICONEN_OK = /^[a-z][a-z0-9]{1,23}$/;
  function tekst(x) { return typeof x === "string" ? x.trim() : ""; }
  // Onderwerpen uit modules.json: titel verplicht, minstens een geldig categorie-id; regel, icoon, thema, tools optioneel.
  function leesOnderwerpen(cfg) {
    var l = cfg && Array.isArray(cfg.onderwerpen) ? cfg.onderwerpen : [];
    return l.map(function (o) {
      if (!o || !tekst(o.titel)) return null;
      var c = ids(o.categorieen);
      if (!c.length) return null;
      return { titel: tekst(o.titel), regel: tekst(o.regel), icoon: ICONEN_OK.test(tekst(o.icoon)) ? o.icoon : "", thema: tekst(o.thema), tools: tekst(o.tools), categorieen: c };
    }).filter(Boolean);
  }
  // Grote gidsen: titel verplicht, en een bestemming: scherm (lamaison, gezondheid-ouderen, kalender) of module.
  function leesGidsen(cfg) {
    var l = cfg && Array.isArray(cfg.gidsen) ? cfg.gidsen : [];
    return l.map(function (g) {
      if (!g || !tekst(g.titel) || !(tekst(g.scherm) || tekst(g.module))) return null;
      return { titel: tekst(g.titel), regel: tekst(g.regel), icoon: ICONEN_OK.test(tekst(g.icoon)) ? g.icoon : "", thema: tekst(g.thema), scherm: tekst(g.scherm), module: tekst(g.module) };
    }).filter(Boolean);
  }

  var api = { BASIS: BASIS, PER_PAGINA: PER_PAGINA, FOUT: FOUT, LAAD: LAAD, SITE_URL: BASIS + "/", decodeer: decodeer, datumNl: datumNl, datumVoluit: datumVoluit,
    linkOk: linkOk, slugVan: slugVan, lijstUrl: lijstUrl, nieuwsteUrl: nieuwsteUrl, rubriekUrl: rubriekUrl, mediaUrl: mediaUrl, chipsUrl: chipsUrl, categorieUrl: categorieUrl,
    ids: ids, kiesSamenvatting: kiesSamenvatting, leestijd: leestijd, reeksSleutel: reeksSleutel, leesLijst: leesLijst, voegReeksenSamen: voegReeksenSamen,
    toolSlugs: toolSlugs, isTool: isTool, leesMedia: leesMedia, leesChips: leesChips, leesCategorieLink: leesCategorieLink,
    aantalPaginas: aantalPaginas, leesOnderwerpen: leesOnderwerpen, leesGidsen: leesGidsen };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.IfInfo = api;
})(typeof window !== "undefined" ? window : globalThis);
