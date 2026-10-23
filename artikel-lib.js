// Artikelscherm: artikelen van infofrankrijk.com in de app, via de WordPress REST API.
// Gewone JavaScript, geen buildstap. Wordt in de browser geladen via <script src="artikel-lib.js">
// (window.IfArtikel) en in de tests via require. De inhoud van artikelen staat NIET in deze repo:
// ze wordt anoniem live opgehaald en alleen in het geheugen bewaard.
//
// Betaalmuurregel (zie CLAUDE.md): de app toont nooit meer dan infofrankrijk.com zelf aan een
// anonieme bezoeker geeft. Hij haalt alleen anoniem op (geen inlog, geen sleutel). Herkent hij in
// de inhoud de afschermingsmelding van de abonnementsplugin (Paid Member Subscriptions, klassen of
// tekst met "pms-"), dan blijft alleen de inleiding tot daar staan en komt het abonneeblok als muur.
(function (root) {
  var BASIS = "https://infofrankrijk.com";
  // Eerste padsegment dat nooit een artikel is: abonnement en inlog (bewust buiten de app), de
  // WordPress-systeempaden en de Klussen-site (eigen module).
  var GEEN_ARTIKEL = /^(abonnement|mijn-account|account|login|inloggen|registreren|wp-admin|wp-login\.php|wp-content|wp-json|wp-includes|feed|klussen|tag|category|author|search)$/i;

  var WEG = /^(script|style|iframe|object|embed|form|input|button|select|textarea|link|meta|base|template|noscript|svg|math|frame|frameset|applet|audio|video|source|canvas|dialog|footer|header|nav|aside)$/;
  var ATTR = /^(href|src|alt|title|colspan|rowspan|scope|loading|target|rel|data-art|referrerpolicy)$/;

  function geldigeUrl(u) {
    try { return new URL(String(u || "").trim(), BASIS + "/"); } catch (e) { return null; }
  }
  function isIfHost(h) { return /^(www\.)?infofrankrijk\.com$/i.test(h || ""); }

  // Slug uit het pad van de URL: het laatste niet-lege segment. null als het geen artikel kan zijn.
  function slugUitUrl(url) {
    var u = geldigeUrl(url);
    if (!u || !/^https?:$/.test(u.protocol) || !isIfHost(u.hostname)) return null;
    var seg = u.pathname.split("/").filter(Boolean);
    if (!seg.length) return null;
    if (GEEN_ARTIKEL.test(seg[0])) return null;
    var slug = seg[seg.length - 1];
    try { slug = decodeURIComponent(slug); } catch (e) { return null; }
    return /^[a-z0-9][a-z0-9_-]*$/i.test(slug) ? slug.toLowerCase() : null;
  }
  function isInApp(url) { return slugUitUrl(url) !== null; }
  function schoneUrl(url) { var s = slugUitUrl(url); return s ? BASIS + "/" + s + "/" : null; }
  function restUrl(slug, soort) {
    return BASIS + "/wp-json/wp/v2/" + (soort === "pages" ? "pages" : "posts") + "?slug=" + encodeURIComponent(slug) + "&_fields=title,content,date,link";
  }

  // ---- Betaalmuur --------------------------------------------------------------------------
  // Klassen of tekst van de afschermingsmelding van Paid Member Subscriptions: "pms-" gevolgd door
  // een naam (pms-restrict-message, pms-restriction-message, [pms-restrict]). "3PMSF" (sneeuwband)
  // en losse "PMS" in gewone tekst tellen niet.
  var MUUR_START = /class\s*=\s*["'](?:[^"']*\s)?pms-[a-z0-9_-]+|\[\/?pms-[a-z0-9_-]+|(?:^|[^a-z0-9])pms[-_]restrict/i;

  function heeftBetaalmuur(html) { return MUUR_START.test(String(html || "")); }

  // Knipt de HTML af vlak voor het element met de afschermingsmelding. De rest (en alles erna)
  // vervalt; de DOM-parser sluit open tags zelf. Geeft {html, muur}.
  function knipBijMuur(html) {
    html = String(html || "");
    var m = MUUR_START.exec(html);
    if (!m) return { html: html, muur: false };
    var tagStart = html.lastIndexOf("<", m.index);
    return { html: html.slice(0, tagStart >= 0 ? tagStart : m.index), muur: true };
  }

  // ---- Ophalen -----------------------------------------------------------------------------
  function leesAntwoord(d) {
    var it = d && d[0];
    if (!it || !it.content || typeof it.content.rendered !== "string") return null;
    return {
      titel: it.title && typeof it.title.rendered === "string" ? it.title.rendered : "",
      html: it.content.rendered,
      datum: typeof it.date === "string" ? it.date : "",
      link: typeof it.link === "string" ? it.link : ""
    };
  }

  // posts, dan pages. Geeft een belofte met {titel, html, datum, link, soort} of een afwijzing.
  function haalOp(slug, opt) {
    opt = opt || {};
    var f = opt.fetch || (root.fetch && root.fetch.bind(root));
    if (!f) return Promise.reject(new Error("geen fetch"));
    var probeer = function (soort) {
      return f(restUrl(slug, soort), { credentials: "omit" }).then(function (r) {
        if (!r.ok) throw new Error("status " + r.status);
        return r.json();
      }).then(function (d) { var a = leesAntwoord(d); if (a) a.soort = soort; return a; });
    };
    return probeer("posts").then(function (a) {
      return a || probeer("pages");
    }).then(function (a) {
      if (!a) throw new Error("niet gevonden");
      return a;
    });
  }

  // ---- Opschonen ---------------------------------------------------------------------------
  var KLEUR = "#15181A";
  var STIJL = {
    p: "margin:14px 0 0;font:400 16px Mulish,system-ui,sans-serif;line-height:1.8em;color:" + KLEUR + ";text-wrap:pretty",
    ul: "margin:14px 0 0;padding-left:22px", ol: "margin:14px 0 0;padding-left:22px",
    li: "margin:6px 0 0;font:400 16px Mulish,system-ui,sans-serif;line-height:1.8em;color:" + KLEUR,
    h2: "margin:26px 0 0;font:500 21px 'Source Serif 4',Georgia,serif;line-height:1.25;color:" + KLEUR,
    h3: "margin:22px 0 0;font:500 18px 'Source Serif 4',Georgia,serif;line-height:1.3;color:" + KLEUR,
    h4: "margin:18px 0 0;font:600 15px Poppins,system-ui,sans-serif;line-height:1.35;color:" + KLEUR,
    strong: "font-weight:700", b: "font-weight:700", em: "font-style:italic", i: "font-style:italic",
    small: "font-size:13px;color:#71787C",
    a: "color:#800000;text-decoration:underline;word-break:break-word",
    img: "display:block;max-width:100%;height:auto;border-radius:12px;margin:16px auto 0",
    figure: "margin:16px 0 0",
    figcaption: "margin:6px 0 0;font:500 13px Mulish,system-ui,sans-serif;line-height:1.6;color:#71787C",
    table: "border-collapse:collapse;min-width:100%;font:500 14px/1.5 Mulish,system-ui,sans-serif;color:#3D4346",
    th: "text-align:left;vertical-align:top;padding:8px 10px;background:rgba(128,0,0,.06);border:1px solid rgba(21,24,26,.10);font-weight:700;color:" + KLEUR,
    td: "vertical-align:top;padding:8px 10px;border:1px solid rgba(21,24,26,.10)",
    blockquote: "margin:16px 0 0;padding:6px 16px;border-left:3px solid rgba(128,0,0,.30);background:rgba(128,0,0,.04);border-radius:0 12px 12px 0",
    hr: "border:0;border-top:1px solid rgba(21,24,26,.10);margin:22px 0"
  };

  function ontvouw(el) {
    var p = el.parentNode;
    while (el.firstChild) p.insertBefore(el.firstChild, el);
    p.removeChild(el);
  }
  function tekstVan(html, DP) {
    var d = new (DP || root.DOMParser)().parseFromString("<!doctype html><body>" + String(html || ""), "text/html");
    return (d.body.textContent || "").replace(/\s+/g, " ").trim();
  }

  // Geeft een <body>-element uit een inert document. Scripts, styles, iframes, formulieren en alle
  // on*-attributen verdwijnen; alleen de lijst ATTR blijft over. Eigen inline opmaak (huisstijl).
  function schoon(html, opt) {
    opt = opt || {};
    var DP = opt.DOMParser || root.DOMParser;
    var doc = new DP().parseFromString("<!doctype html><body>" + String(html || ""), "text/html");
    var body = doc.body;

    var walker = doc.createTreeWalker(body, 128 /* SHOW_COMMENT */);
    var com = [], c;
    while ((c = walker.nextNode())) com.push(c);
    com.forEach(function (x) { x.parentNode.removeChild(x); });
    Array.prototype.slice.call(body.querySelectorAll("*")).forEach(function (el) {
      if (el.parentNode && WEG.test(el.tagName.toLowerCase())) el.parentNode.removeChild(el);
    });
    Array.prototype.slice.call(body.querySelectorAll("h1")).forEach(function (h) {
      var nw = doc.createElement("h2");
      while (h.firstChild) nw.appendChild(h.firstChild);
      h.parentNode.replaceChild(nw, h);
    });

    Array.prototype.slice.call(body.querySelectorAll("a")).forEach(function (a) {
      if (!a.parentNode) return;
      var href = a.getAttribute("href");
      var abs = null;
      if (href && !/^\s*#/.test(href)) { var u = geldigeUrl(href); abs = u ? u.href : null; }
      var ok = abs && /^(https?:|mailto:|tel:)/i.test(abs) && !/^\s*javascript:/i.test(href);
      if (!ok) { ontvouw(a); return; }
      a.setAttribute("href", abs);
      if (/^https?:/i.test(abs)) {
        if (isInApp(abs)) { a.setAttribute("data-art", "1"); }
        a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener noreferrer");
      }
    });
    Array.prototype.slice.call(body.querySelectorAll("img")).forEach(function (img) {
      var src = geldigeUrl(img.getAttribute("src") || img.getAttribute("data-src"));
      if (!src || src.protocol !== "https:") { img.parentNode.removeChild(img); return; }
      img.setAttribute("src", src.href); img.setAttribute("loading", "lazy");
      img.removeAttribute("srcset"); img.removeAttribute("sizes");
      img.removeAttribute("width"); img.removeAttribute("height");
      img.setAttribute("referrerpolicy", "no-referrer");
    });

    Array.prototype.slice.call(body.querySelectorAll("*")).forEach(function (el) {
      Array.prototype.slice.call(el.attributes).forEach(function (at) {
        var naam = at.name.toLowerCase();
        if (!ATTR.test(naam) || /^on/.test(naam)) el.removeAttribute(at.name);
      });
      var t = el.tagName.toLowerCase();
      if (t !== "a") { el.removeAttribute("href"); el.removeAttribute("target"); el.removeAttribute("rel"); el.removeAttribute("data-art"); }
      if (t !== "img") { el.removeAttribute("src"); el.removeAttribute("loading"); el.removeAttribute("referrerpolicy"); }
    });

    Array.prototype.slice.call(body.querySelectorAll("p, li")).forEach(function (el) {
      if (el.parentNode && !el.querySelector("img, table, ul, ol") && !el.textContent.replace(/[\s ]+/g, "")) el.parentNode.removeChild(el);
    });
    Array.prototype.slice.call(body.querySelectorAll("table")).forEach(function (tb) {
      var w = doc.createElement("div");
      w.setAttribute("style", "overflow-x:auto;-webkit-overflow-scrolling:touch;margin:16px 0 0;border-radius:12px");
      tb.parentNode.insertBefore(w, tb); w.appendChild(tb);
    });
    Array.prototype.slice.call(body.querySelectorAll("*")).forEach(function (el) {
      var s = STIJL[el.tagName.toLowerCase()];
      if (el.tagName === "TD" || el.tagName === "TH") s = STIJL[el.tagName.toLowerCase()];
      if (s) el.setAttribute("style", s);
    });
    // Tekst direct in een div zonder alinea (bv. een Divi-blok) blijft leesbaar: div's zelf krijgen geen stijl.
    return body;
  }

  // Eerste alinea van de opgeschoonde inhoud, ingekort op een woordgrens.
  function inkorten(tekst, max) {
    tekst = String(tekst || "").replace(/\s+/g, " ").trim();
    max = max || 280;
    if (tekst.length <= max) return tekst;
    var knip = tekst.slice(0, max);
    var sp = knip.lastIndexOf(" ");
    if (sp > max * 0.6) knip = knip.slice(0, sp);
    return knip.replace(/[\s,;:.\-–—]+$/, "") + "…";
  }
  function eersteAlinea(body) {
    if (!body || !body.querySelectorAll) return "";
    var ps = body.querySelectorAll("p");
    for (var i = 0; i < ps.length; i++) {
      var t = (ps[i].textContent || "").replace(/\s+/g, " ").trim();
      if (t.length >= 40) return t;
    }
    return "";
  }
  // Tekst voor het klembord bij "Bespreek op het forum": titel, korte samenvatting, link.
  function forumTekst(titel, samenvatting, link) {
    return [String(titel || "").trim(), inkorten(samenvatting, 280), String(link || "").trim()].filter(Boolean).join("\n\n");
  }

  var MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
  function datumNl(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
    if (!m) return "";
    var mnd = parseInt(m[2], 10);
    if (mnd < 1 || mnd > 12) return "";
    return parseInt(m[3], 10) + " " + MAANDEN[mnd - 1] + " " + m[1];
  }

  var api = {
    BASIS: BASIS, slugUitUrl: slugUitUrl, isInApp: isInApp, schoneUrl: schoneUrl, restUrl: restUrl,
    heeftBetaalmuur: heeftBetaalmuur, knipBijMuur: knipBijMuur, haalOp: haalOp, leesAntwoord: leesAntwoord,
    schoon: schoon, tekstVan: tekstVan, inkorten: inkorten, eersteAlinea: eersteAlinea, forumTekst: forumTekst, datumNl: datumNl
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.IfArtikel = api;
})(typeof window !== "undefined" ? window : globalThis);
