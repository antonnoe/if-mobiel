// Dossier "Ouder worden in Frankrijk" laden en veilig tonen. Gewone JavaScript, geen buildstap.
// De tekst staat NIET in deze repo: hij wordt live opgehaald bij Infofrankrijk en alleen in het
// geheugen bewaard. Dit bestand bevat alleen de ophaal-, zoek- en opschoonlogica.
// Wordt in de browser geladen via <script src="dossier.js"> (window.IfDossier) en in de tests
// via een headless browser (zie tests/gezondheid.test.mjs).
(function (root) {
  var BASIS = "https://infofrankrijk.com";
  var PAGINA = BASIS + "/ouderenzorg-frankrijk/";
  var REST = BASIS + "/wp-json/wp/v2/posts?slug=ouderenzorg-frankrijk&_fields=id,content";
  var AANTAL = 32;

  var WEG = /^(script|style|iframe|object|embed|form|input|button|select|textarea|link|meta|base|template|noscript|svg|math|frame|frameset|applet|audio|video|source|canvas|dialog|footer|header|nav)$/;
  var ATTR = /^(href|src|alt|title|colspan|rowspan|scope|loading|target|rel|data-hfd)$/;

  // Alle styling inline (huisstijl); lopende tekst met regelafstand 1.8em, rest compact.
  var STIJL = {
    p: "margin:0 0 12px;font:500 14.5px/1.8em Mulish,system-ui,sans-serif;color:#3D4346;text-wrap:pretty",
    ul: "margin:0 0 12px;padding-left:22px", ol: "margin:0 0 12px;padding-left:22px",
    li: "margin:0 0 6px;font:500 14.5px/1.8em Mulish,system-ui,sans-serif;color:#3D4346",
    h2: "font-family:Poppins,system-ui,sans-serif;font-weight:600;font-size:19px;line-height:1.25;margin:22px 0 8px;color:#15181A",
    h3: "font-family:Poppins,system-ui,sans-serif;font-weight:600;font-size:16.5px;line-height:1.3;margin:20px 0 6px;color:#15181A",
    h4: "font-family:Poppins,system-ui,sans-serif;font-weight:600;font-size:15px;line-height:1.3;margin:16px 0 6px;color:#15181A",
    strong: "font-weight:700;color:#15181A", b: "font-weight:700;color:#15181A", em: "font-style:italic",
    small: "font-size:12.5px;color:#71787C",
    a: "color:#800000;text-decoration:underline;word-break:break-word",
    img: "display:block;max-width:100%;height:auto;border-radius:12px;margin:12px auto",
    table: "border-collapse:collapse;min-width:100%;font:500 13px/1.45 Mulish,system-ui,sans-serif;color:#3D4346",
    th: "text-align:left;vertical-align:top;padding:8px 10px;background:rgba(128,0,0,.06);border:1px solid rgba(21,24,26,.10);font-weight:700;color:#15181A",
    td: "vertical-align:top;padding:8px 10px;border:1px solid rgba(21,24,26,.10)",
    blockquote: "margin:12px 0;padding:8px 14px;border-left:3px solid rgba(128,0,0,.30);background:rgba(128,0,0,.04)",
    hr: "border:0;border-top:1px solid rgba(21,24,26,.10);margin:18px 0"
  };

  function absolutUrl(w, basis) {
    try { return new URL(String(w || "").trim(), basis || BASIS + "/").href; } catch (e) { return null; }
  }

  // Leest een hoofdstuknummer uit een link naar het dossier ("#ifr-sec-7" of de volledige URL met anker).
  function hoofdstukUitLink(href) {
    var m = /^(?:https?:\/\/(?:www\.)?infofrankrijk\.com\/ouderenzorg-frankrijk\/?)?#ifr-sec-(\d{1,2})$/.exec(String(href || "").trim());
    var n = m ? parseInt(m[1], 10) : 0;
    return n >= 1 && n <= AANTAL ? n : 0;
  }

  function haalOp(zonderRest) {
    var rest = function () {
      return fetch(REST).then(function (r) { if (!r.ok) throw new Error("status " + r.status); return r.json(); })
        .then(function (d) {
          var h = d && d[0] && d[0].content && d[0].content.rendered;
          if (typeof h !== "string" || h.length < 1000) throw new Error("vorm");
          return h;
        });
    };
    var pagina = function () {
      return fetch(PAGINA).then(function (r) { if (!r.ok) throw new Error("status " + r.status); return r.text(); });
    };
    return (zonderRest ? pagina() : rest().catch(pagina)).then(function (h) {
      var set = lees(h);
      if (set.aantal < AANTAL) throw new Error("hoofdstukken ontbreken: " + set.aantal);
      return set;
    });
  }

  // Zet de ruwe HTML om naar { doc, aantal, titels }. Sectie N is het element #ifr-sec-N.
  // Valt een anker uit de boom (kapotte nesting), dan zoeken we het anker alsnog als tekst
  // en nemen de knooppunten tot het volgende anker.
  function lees(html, DP) {
    var doc = new (DP || root.DOMParser)().parseFromString(String(html), "text/html");
    var titels = {}, aantal = 0;
    for (var n = 1; n <= AANTAL; n++) {
      var el = doc.getElementById("ifr-sec-" + n);
      if (!el) continue;
      aantal++;
      var h = el.querySelector("h2, h3, h1");
      var t = h ? h.textContent.replace(/\s+/g, " ").trim().replace(/^\d+\.\s*/, "") : "";
      if (t) titels[n] = t;
    }
    return { doc: doc, aantal: aantal, titels: titels };
  }

  // Geeft het opgeschoonde hoofdstuk als <body>-element terug (of null). Titel (eerste kop)
  // laten we weg: de schil toont die zelf.
  function hoofdstuk(set, n) {
    var el = set && set.doc && set.doc.getElementById("ifr-sec-" + n);
    if (!el) return null;
    return schoon(el.innerHTML, { zonderEersteKop: true });
  }

  // Veilig opschonen. Geeft een <body>-element uit een eigen, inerte document.
  function schoon(html, opt) {
    opt = opt || {};
    var DP = opt.DOMParser || root.DOMParser;
    var doc = new DP().parseFromString("<!doctype html><body>" + String(html), "text/html");
    var body = doc.body;

    // 1. Opmerkingen en gevaarlijke elementen eruit (met inhoud).
    var walker = doc.createTreeWalker(body, 128 /* SHOW_COMMENT */);
    var com = [], c;
    while ((c = walker.nextNode())) com.push(c);
    com.forEach(function (x) { x.parentNode.removeChild(x); });
    Array.prototype.slice.call(body.querySelectorAll("*")).forEach(function (el) {
      if (!el.parentNode) return;
      if (WEG.test(el.tagName.toLowerCase()) || /(^|\s)ifr-section-actions(\s|$)/.test(el.getAttribute("class") || "")) el.parentNode.removeChild(el);
    });

    if (opt.zonderEersteKop) {
      var k = body.querySelector("h1, h2");
      if (k && k.parentNode) k.parentNode.removeChild(k);
    }

    // 2. <pee> (kapotte <p> uit de bron) wordt <p>; onbekende elementen blijven als tekst staan.
    Array.prototype.slice.call(body.querySelectorAll("*")).forEach(function (el) {
      if (!el.parentNode) return;
      var t = el.tagName.toLowerCase();
      if (t === "pee") vervang(doc, el, "p");
    });

    // 3. Links en afbeeldingen.
    Array.prototype.slice.call(body.querySelectorAll("a")).forEach(function (a) {
      if (!a.parentNode) return;
      var href = a.getAttribute("href");
      var n = hoofdstukUitLink(href);
      if (n) { a.setAttribute("href", "#ifr-sec-" + n); a.setAttribute("data-hfd", String(n)); return; }
      var abs = href ? absolutUrl(href) : null;
      var ok = abs && /^(https?:|mailto:|tel:)/i.test(abs) && !/^\s*javascript:/i.test(href);
      if (!ok) { ontvouw(a); return; }
      a.setAttribute("href", abs);
      if (/^https?:/i.test(abs)) { a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener noreferrer"); }
    });
    Array.prototype.slice.call(body.querySelectorAll("img")).forEach(function (img) {
      var src = absolutUrl(img.getAttribute("src") || img.getAttribute("data-src"));
      if (!src || !/^https:/i.test(src)) { img.parentNode.removeChild(img); return; }
      img.setAttribute("src", src); img.setAttribute("loading", "lazy");
      img.removeAttribute("srcset"); img.removeAttribute("sizes");
      img.setAttribute("referrerpolicy", "no-referrer");
    });

    // 4. Attributen: alleen de lijst; on*, style, class, enz. vallen weg.
    Array.prototype.slice.call(body.querySelectorAll("*")).forEach(function (el) {
      Array.prototype.slice.call(el.attributes).forEach(function (at) {
        var naam = at.name.toLowerCase();
        if (!ATTR.test(naam) || /^on/.test(naam)) el.removeAttribute(at.name);
      });
      var t = el.tagName.toLowerCase();
      if (t !== "a") { el.removeAttribute("href"); el.removeAttribute("target"); el.removeAttribute("rel"); }
      if (t !== "img") { el.removeAttribute("src"); el.removeAttribute("loading"); }
    });

    // 5. Lege alinea's weg; tabellen scrollbaar; eigen inline opmaak.
    Array.prototype.slice.call(body.querySelectorAll("p, div, span, li")).forEach(function (el) {
      if (el.parentNode && !el.querySelector("img, table, ul, ol") && !el.textContent.replace(/\s+/g, "")) el.parentNode.removeChild(el);
    });
    Array.prototype.slice.call(body.querySelectorAll("table")).forEach(function (tb) {
      var w = doc.createElement("div");
      w.setAttribute("style", "overflow-x:auto;-webkit-overflow-scrolling:touch;margin:12px 0;border-radius:12px");
      tb.parentNode.insertBefore(w, tb); w.appendChild(tb);
    });
    Array.prototype.slice.call(body.querySelectorAll("*")).forEach(function (el) {
      var s = STIJL[el.tagName.toLowerCase()];
      if (s) el.setAttribute("style", s);
      if (el.tagName === "A" && el.getAttribute("data-hfd")) el.setAttribute("style", STIJL.a + ";cursor:pointer");
    });
    return body;
  }

  function vervang(doc, el, tag) {
    var nw = doc.createElement(tag);
    while (el.firstChild) nw.appendChild(el.firstChild);
    el.parentNode.replaceChild(nw, el);
    return nw;
  }
  function ontvouw(el) {
    var p = el.parentNode;
    while (el.firstChild) p.insertBefore(el.firstChild, el);
    p.removeChild(el);
  }

  var api = { BASIS: BASIS, PAGINA: PAGINA, REST: REST, AANTAL: AANTAL, haalOp: haalOp, lees: lees, hoofdstuk: hoofdstuk, schoon: schoon, hoofdstukUitLink: hoofdstukUitLink };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.IfDossier = api;
})(typeof window !== "undefined" ? window : globalThis);
