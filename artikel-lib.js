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
    // Eén tijdgrens (standaard 15 s) over het hele ophalen; daarna een afwijzing, zodat het scherm de foutmelding toont.
    var ms = typeof opt.timeout === "number" ? opt.timeout : 15000;
    var ctl = null, timer = null;
    try { ctl = new root.AbortController(); } catch (e) { ctl = null; }
    var tijd = new Promise(function (_, weiger) {
      timer = setTimeout(function () { try { if (ctl) ctl.abort(); } catch (e) {} weiger(new Error("time-out")); }, ms);
    });
    var probeer = function (soort) {
      return f(restUrl(slug, soort), ctl ? { credentials: "omit", signal: ctl.signal } : { credentials: "omit" }).then(function (r) {
        if (!r.ok) throw new Error("status " + r.status);
        return r.json();
      }).then(function (d) { var a = leesAntwoord(d); if (a) a.soort = soort; return a; });
    };
    var werk = probeer("posts").then(function (a) {
      return a || probeer("pages");
    }).then(function (a) {
      if (!a) throw new Error("niet gevonden");
      return a;
    });
    var klaar = function () { clearTimeout(timer); };
    var uitkomst = Promise.race([werk, tijd]);
    uitkomst.then(klaar, klaar);
    return uitkomst;
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

  // ---- Toolkaart: wat er van een iframe in een artikel overblijft ----------------------------------
  // Een iframe wordt nooit overgenomen. Er komt een kaart voor in de plaats: hoort de URL bij een module uit de
  // catalogus (zelfde host; bij github.io ook het eerste padsegment), dan opent de knop die module in de app
  // (data-tool = module-id, afgehandeld in index.html); anders opent de URL in een nieuw tabblad. Video-embeds
  // worden een kaart "Bekijk de video". Alleen https-URL's.
  var VIDEO = /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be|vimeo\.com|dailymotion\.com)$/i;
  function schoneHost(h) { return String(h || "").toLowerCase().replace(/^www\./, ""); }
  function hostSleutel(u) {
    var h = schoneHost(u.hostname);
    if (/\.github\.io$/.test(h)) { var seg = u.pathname.split("/").filter(Boolean)[0]; return h + (seg ? "/" + seg.toLowerCase() : ""); }
    return h;
  }
  // De module (uit de catalogus) die bij een URL hoort, of null.
  function moduleVoorUrl(url, modules) {
    var u = geldigeUrl(url);
    if (!u || u.protocol !== "https:" || !modules) return null;
    var sl = hostSleutel(u);
    for (var i = 0; i < modules.length; i++) {
      var m = modules[i];
      if (!m || !m.url || m.zichtbaar === false) continue;
      var mu = geldigeUrl(m.url);
      if (mu && mu.protocol === "https:" && hostSleutel(mu) === sl && !isIfHost(mu.hostname)) return m;
    }
    return null;
  }
  // Videolink (kijkpagina) uit een embed-URL; andere URL's blijven zoals ze zijn.
  function videoLink(u) {
    var h = schoneHost(u.hostname), m;
    if (/youtube(-nocookie)?\.com$/.test(h) && (m = /^\/embed\/([A-Za-z0-9_-]{6,})/.exec(u.pathname))) return "https://www.youtube.com/watch?v=" + m[1];
    if (h === "player.vimeo.com" && (m = /^\/video\/(\d+)/.exec(u.pathname))) return "https://vimeo.com/" + m[1];
    return u.href;
  }
  // {soort: "video" | "module" | "extern", href, module?, naam, label, knop} voor een iframe-src, of null (geen https).
  function toolKaartVoor(src, modules) {
    var u = geldigeUrl(src);
    if (!u || u.protocol !== "https:") return null;
    if (VIDEO.test(u.hostname)) return { soort: "video", href: videoLink(u), naam: "Video", label: "Video", knop: "Bekijk de video \u2197" };
    var m = moduleVoorUrl(u.href, modules);
    if (m) return { soort: "module", href: u.href, module: m.id, naam: m.naam || m.id, label: "Tool in de app", knop: "Open de tool" };
    return { soort: "extern", href: u.href, naam: schoneHost(u.hostname), label: "Interactieve tool", knop: "Open de tool \u2197" };
  }
  var KAART = {
    kaart: "margin:18px 0 0;padding:16px;border-radius:16px;background:rgba(128,0,0,.05);border:1px solid rgba(128,0,0,.16)",
    label: "font:700 12px Mulish,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#800000",
    naam: "margin:5px 0 0;font:600 16px Poppins,system-ui,sans-serif;line-height:1.3;color:" + KLEUR + ";overflow-wrap:anywhere",
    knop: "display:flex;align-items:center;justify-content:center;min-height:48px;margin-top:12px;border-radius:12px;background:#800000;color:#fff;font:700 14.5px Mulish,system-ui,sans-serif;text-decoration:none"
  };
  function maakKaart(doc, k) {
    var kaart = doc.createElement("div"); kaart.setAttribute("style", KAART.kaart); kaart.setAttribute("data-toolkaart", k.soort);
    var l = doc.createElement("div"); l.setAttribute("style", KAART.label); l.textContent = k.label; kaart.appendChild(l);
    var n = doc.createElement("div"); n.setAttribute("style", KAART.naam); n.textContent = k.naam; kaart.appendChild(n);
    var a = doc.createElement("a"); a.setAttribute("style", KAART.knop); a.setAttribute("href", k.href);
    a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener noreferrer");
    if (k.module) a.setAttribute("data-tool", k.module);
    a.textContent = k.knop; kaart.appendChild(a);
    return kaart;
  }

  // De REST-API geeft bij pagina's die met Divi gebouwd zijn de ruwe shortcodes mee ([et_pb_section ...] en [/et_pb_code]).
  // Die staan nooit in de lopende tekst: weg, de inhoud ertussen blijft.
  // Een Divi-tab ([et_pb_tab title="Zorg"]) wordt eerst een kop, zodat de titel niet als losse tekst achterblijft.
  var Q = "(?:\"|'|&quot;|&#8220;|&#8221;|&#8243;|&#8242;|\u201C|\u201D|\u2033)";
  var TAB_TITEL = new RegExp("\\[et_pb_tab\\s[^\\]]*?\\btitle=" + Q + "(.*?)" + Q + "(?=[\\s\\]])[^\\]]*\\]", "gi");
  function zonderDivi(html) {
    return String(html || "")
      .replace(TAB_TITEL, function (_, t) { return "<h3>" + String(t).replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</h3>"; })
      .replace(/\[\/?et_pb_[a-z0-9_]+(?:\s[^\]]*)?\]/gi, "");
  }

  // ---- Tabbladen ----------------------------------------------------------------------------------
  // Tabbladen werken niet in de app (geen CSS, geen scripts). Elke tab wordt een kop (h3) met de inhoud eronder, zodat het
  // artikel van boven naar beneden leesbaar loopt. Twee vormen: (1) tabs met radioknoppen en labels (input[type=radio] +
  // label[for], inhoud in een element met "tab-content" in de klasse, gekoppeld via id "content-x" bij "tab-x" of op volgorde),
  // (2) Divi's eigen weergave (.et_pb_tabs met .et_pb_tabs_controls en .et_pb_all_tabs > .et_pb_tab).
  function tabsNaarKoppen(doc, body) {
    function kop(titel) { var h = doc.createElement("h3"); h.textContent = titel; return h; }
    var radios = Array.prototype.slice.call(body.querySelectorAll("input[type=radio][id]"));
    var groepen = {};
    radios.forEach(function (r) {
      var lab = null, labels = body.querySelectorAll("label[for]");
      for (var i = 0; i < labels.length; i++) if (labels[i].getAttribute("for") === r.id) { lab = labels[i]; break; }
      if (!lab) return;
      var n = r.getAttribute("name") || "";
      (groepen[n] = groepen[n] || []).push({ radio: r, label: lab });
    });
    var inhoud = Array.prototype.slice.call(body.querySelectorAll("[class*='tab-content'], [class*='tab_content'], [class*='tabcontent']"));
    Object.keys(groepen).forEach(function (n) {
      var g = groepen[n];
      if (g.length < 2) return;
      var paren = g.map(function (x, i) {
        var id = x.radio.id, c = null;
        var kandidaten = [id.replace(/^tab/i, "content"), id.replace(/^tab/i, "tabcontent"), id.replace(/^tab/i, "tab-content"), id + "-content", "content-" + id];
        for (var k = 0; k < kandidaten.length && !c; k++) { var e = doc.getElementById(kandidaten[k]); if (e && e !== x.radio) c = e; }
        if (!c && inhoud.length === g.length) c = inhoud[i];
        return { titel: (x.label.textContent || "").replace(/\s+/g, " ").trim(), content: c, x: x };
      });
      paren.forEach(function (p) {
        if (p.content && p.content.parentNode && p.titel) p.content.parentNode.insertBefore(kop(p.titel), p.content);
        else if (p.titel && !p.content) return;
        if (p.x.label.parentNode) p.x.label.parentNode.removeChild(p.x.label);
        if (p.x.radio.parentNode) p.x.radio.parentNode.removeChild(p.x.radio);
      });
    });
    Array.prototype.slice.call(body.querySelectorAll(".et_pb_tabs")).forEach(function (t) {
      var titels = Array.prototype.slice.call(t.querySelectorAll(".et_pb_tabs_controls li")).map(function (li) { return (li.textContent || "").replace(/\s+/g, " ").trim(); });
      var tabs = Array.prototype.slice.call(t.querySelectorAll(".et_pb_all_tabs > .et_pb_tab"));
      if (!tabs.length) return;
      tabs.forEach(function (tab, i) { if (titels[i]) tab.parentNode.insertBefore(kop(titels[i]), tab); });
      var ctl = t.querySelector(".et_pb_tabs_controls"); if (ctl && ctl.parentNode) ctl.parentNode.removeChild(ctl);
    });
  }

  // Geeft een <body>-element uit een inert document. Scripts, styles, iframes, formulieren en alle
  // on*-attributen verdwijnen; alleen de lijst ATTR blijft over. Eigen inline opmaak (huisstijl).
  function schoon(html, opt) {
    opt = opt || {};
    var DP = opt.DOMParser || root.DOMParser;
    var doc = new DP().parseFromString("<!doctype html><body>" + zonderDivi(html), "text/html");
    var body = doc.body;
    tabsNaarKoppen(doc, body);
    // <pee> is wat Divi's codemodule van een <p> maakt; wij tonen het als alinea.
    Array.prototype.slice.call(body.querySelectorAll("pee")).forEach(function (el) {
      var nw = doc.createElement("p");
      while (el.firstChild) nw.appendChild(el.firstChild);
      el.parentNode.replaceChild(nw, el);
    });

    // Iframes: een plaatsmarkering (met tekst, zodat de lege-alinea-opruiming haar laat staan); de kaart komt er helemaal
    // aan het eind voor in de plaats, na het opschonen van attributen en het zetten van de opmaak.
    var kaarten = [];
    Array.prototype.slice.call(body.querySelectorAll("iframe")).forEach(function (fr) {
      var k = toolKaartVoor(fr.getAttribute("src") || fr.getAttribute("data-src") || fr.getAttribute("data-lazy-src"), opt.modules);
      if (!k || !fr.parentNode) return;
      var plek = doc.createElement("div"); plek.textContent = "tool";
      fr.parentNode.replaceChild(plek, fr);
      kaarten.push({ plek: plek, kaart: k });
    });

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
      // Een link zonder tekst of beeld (bv. alleen een <br>, een restje uit de WordPress-editor) is niet aan te tikken: weg ermee, inhoud blijft.
      if (!a.textContent.replace(/[\s\u00a0]+/g, "") && !a.querySelector("img")) { ontvouw(a); return; }
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
    kaarten.forEach(function (x) {
      if (x.plek.parentNode && body.contains(x.plek)) x.plek.parentNode.replaceChild(maakKaart(doc, x.kaart), x.plek);
    });
    // Tekst direct in een div zonder alinea (bv. een Divi-blok) blijft leesbaar: div's zelf krijgen geen stijl.
    if (toolAlleen(body)) maakToolPagina(doc, body);
    return body;
  }

  // Bestaat het artikel na opschonen vrijwel alleen uit een toolkaart (bv. het-zorglandschap), dan staat die kaart bovenaan,
  // groot, met een korte regel; niets blijft een leeg artikel. Geeft true als het artikel zo is omgebouwd.
  var TOOL_REGEL = "Dit onderdeel is een interactieve tool.";
  function toolAlleen(body) {
    if (!body || !body.querySelectorAll) return false;
    var kaarten = Array.prototype.slice.call(body.querySelectorAll("[data-toolkaart]"));
    if (!kaarten.length) return false;
    var klon = body.cloneNode(true);
    Array.prototype.slice.call(klon.querySelectorAll("[data-toolkaart]")).forEach(function (k) { k.parentNode.removeChild(k); });
    var rest = (klon.textContent || "").replace(/[\s\u00a0]+/g, "");
    return rest.length < 160 && !klon.querySelector("img");
  }
  function maakToolPagina(doc, body) {
    var kaarten = Array.prototype.slice.call(body.querySelectorAll("[data-toolkaart]"));
    var regel = doc.createElement("p"); regel.setAttribute("data-toolregel", "1");
    regel.setAttribute("style", STIJL.p); regel.textContent = TOOL_REGEL;
    body.insertBefore(regel, body.firstChild);
    kaarten.forEach(function (k, i) {
      body.insertBefore(k, i === 0 ? regel.nextSibling : kaarten[i - 1].nextSibling);
      k.setAttribute("style", KAART.kaart + ";padding:24px 20px");
      var kids = k.children;
      if (kids[1]) kids[1].setAttribute("style", KAART.naam + ";font-size:20px");
      if (kids[2]) kids[2].setAttribute("style", KAART.knop + ";min-height:56px;font-size:16px");
    });
    return true;
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
    schoon: schoon, tabsNaarKoppen: tabsNaarKoppen, zonderDivi: zonderDivi, moduleVoorUrl: moduleVoorUrl, toolKaartVoor: toolKaartVoor, tekstVan: tekstVan, inkorten: inkorten, eersteAlinea: eersteAlinea, forumTekst: forumTekst, datumNl: datumNl
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.IfArtikel = api;
})(typeof window !== "undefined" ? window : globalThis);
