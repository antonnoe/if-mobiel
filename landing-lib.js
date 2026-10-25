// Pure functies van het landingsscherm van Infopoche. Geen DOM, geen netwerk.
// Werkt in de browser (window.LandingLib, gewone <script>) en in node (require/import).
(function (root, fabriek) {
  if (typeof module === "object" && module.exports) module.exports = fabriek();
  else root.LandingLib = fabriek();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var URL_APP = "https://infopoche.fr";

  // Apps met een eigen ingebouwde browser: daar kan een web-app niet op het beginscherm.
  var INAPP = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|WhatsApp|Messenger|LinkedInApp|Twitter|TwitterAndroid|TikTok|musical_ly|Bytedance|Snapchat|\bLine\/|GSA\/|Pinterest|MicroMessenger|; wv\)/i;

  function detecteerOmgeving(o) {
    o = o || {};
    var ua = String(o.ua || "");
    var platform = String(o.platform || "");
    var punten = Number(o.maxTouchPoints) || 0;
    var breedte = Number(o.breedte) || 0;

    if (o.standalone) return "standalone";
    if (INAPP.test(ua)) return "inapp";

    var ios = /iPhone|iPad|iPod/.test(ua) || (platform === "MacIntel" && punten > 1);
    if (ios) {
      // Een iOS-webview zonder Safari-kenmerk (en zonder Chrome/Firefox/Edge/Opera) is een in-app browser.
      if (!/Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) && /iPhone|iPad|iPod/.test(ua)) return "inapp";
      return "ios";
    }

    var mobiel = /Android|Mobi/i.test(ua) || (punten > 1 && breedte > 0 && breedte < 900);
    if (!mobiel) return "desktop";
    // Android of een andere mobiele browser; of de installatieknop er is, hangt van het event af.
    return "android";
  }

  function iosBrowser(ua) {
    ua = String(ua || "");
    if (/CriOS/.test(ua)) return "chrome";
    if (/FxiOS/.test(ua)) return "firefox";
    if (/EdgiOS/.test(ua)) return "edge";
    return "safari";
  }

  // Sleutels in sessionStorage (alleen tot het einde van de browsersessie). De oude localStorage-sleutel
  // ifm_landing_tot (14 dagen uitstel) wordt niet meer gelezen.
  var SLEUTEL_LANDING = "ifm_landing_sessie";
  var SLEUTEL_BALK = "ifm_install_balk_weg";
  var SLEUTEL_BLAD = "ifm_install_blad_getoond";

  // Wijst de hash naar inhoud (#/artikel/..., #/forum, ...)? Leeg, "#" en "#/" zijn de voordeur.
  function heeftInhoudHash(hash) {
    var h = String(hash === undefined || hash === null ? "" : hash);
    return !(h === "" || h === "#" || h === "#/");
  }

  // Landing tonen? Nooit in de geinstalleerde app, nooit bij een gedeelde link naar inhoud (hash), en niet meer
  // nadat de lezer in deze browsersessie "Verder in de browser" koos (sessie === "1").
  function toonLanding(o) {
    o = o || {};
    if (o.standalone) return false;
    if (heeftInhoudHash(o.hash)) return false;
    if (String(o.sessie === undefined || o.sessie === null ? "" : o.sessie) === "1") return false;
    return true;
  }

  // Installatiebalk onder de kopbalk: alleen in de browser, niet weggeklikt (sessie), niet onder het landingsscherm.
  function toonBalk(o) {
    o = o || {};
    return !o.standalone && !o.landingOpen && String(o.weg === undefined || o.weg === null ? "" : o.weg) !== "1";
  }

  // Opent het installatieblad nu vanzelf? Eenmaal per sessie, na een nuttig resultaat, nooit als er al een blad
  // open staat of de app al geinstalleerd is.
  function toonAutoBlad(o) {
    o = o || {};
    if (o.standalone || o.landingOpen || o.bladOpen || o.ander) return false;
    if (String(o.getoond === undefined || o.getoond === null ? "" : o.getoond) === "1") return false;
    return !!o.nuttig;
  }

  // ---- Gedeeld installatieblok (landingsscherm en installatieblad: een bron voor de stappen) ----------
  var PALETTEN = {
    donker: { accent: "#E8B04B", tekst: "#F6F1E7", demp: "#B9C2D0", knopBg: "#E8B04B", knopFg: "#0E1A2E", rand: "rgba(232,176,75,.45)", kaart: "rgba(246,241,231,.06)" },
    licht: { accent: "#800000", tekst: "#15181A", demp: "#3D4346", knopBg: "#800000", knopFg: "#ffffff", rand: "rgba(128,0,0,.28)", kaart: "rgba(128,0,0,.04)" }
  };
  var FONT = "Mulish,system-ui,sans-serif";

  function deelIcoon(kleur) {
    return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="' + kleur + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="de deelknop" role="img" style="vertical-align:-5px;margin:0 2px"><path d="M12 15V3"/><path d="M7.5 7.5L12 3l4.5 4.5"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
  }
  function stapHtml(n, html, p) {
    return '<li style="display:flex;gap:12px;align-items:flex-start;margin:0 0 14px;text-align:left"><span aria-hidden="true" style="flex:none;width:32px;height:32px;border-radius:50%;border:1.5px solid ' + p.accent + ';color:' + p.accent + ';font:800 16px/29px ' + FONT + ';text-align:center">' + n + '</span><span style="font:600 17px/1.5 ' + FONT + ';color:' + p.tekst + ';padding-top:3px">' + html + '</span></li>';
  }
  function knopStijl(p, primair) {
    return 'display:flex;align-items:center;justify-content:center;width:100%;min-height:54px;padding:0 20px;border-radius:14px;font:800 17px/1.2 ' + FONT + ';cursor:pointer;text-align:center;'
      + (primair ? 'border:0;background:' + p.knopBg + ';color:' + p.knopFg : 'border:1.5px solid ' + p.accent + ';background:transparent;color:' + p.accent);
  }
  // o: {omgeving, browser ("safari"|"chrome"|"firefox"|"edge"), heeftEvent, afgebroken, status (html), palet ("donker"|"licht")}
  // Knoppen dragen data-ifm-actie="installeer" of "kopieer"; wie het blok toont koppelt de handlers.
  function blokHtml(o) {
    o = o || {};
    var p = PALETTEN[o.palet] || PALETTEN.donker, omg = o.omgeving;
    var P = 'margin:0;font:500 15px/1.6 ' + FONT + ';color:' + p.demp;
    var kaart = 'text-align:left;border:1px solid ' + p.rand + ';border-radius:16px;padding:18px;background:' + p.kaart;
    if (omg === "inapp") {
      return '<div style="' + kaart + '">'
        + '<div style="font:700 20px/1.3 ' + FONT + ';color:' + p.accent + '">Open Infopoche in Safari of Chrome</div>'
        + '<p style="' + P + ';margin-top:8px">Op het beginscherm zetten kan niet vanuit deze app. Kopieer de link en plak hem in Safari of Chrome.</p>'
        + '<button type="button" data-ifm-actie="kopieer" style="' + knopStijl(p, true) + ';margin-top:14px">Kopieer de link</button>'
        + '<p role="status" aria-live="polite" style="' + P + ';margin-top:10px;color:' + p.tekst + '">' + (o.status || "") + '</p></div>';
    }
    if (omg === "ios") {
      var s = (o.browser || "safari") === "safari";
      return '<div style="' + kaart + '"><ol style="list-style:none;margin:0;padding:0">'
        + stapHtml(1, s ? 'Tik op ' + deelIcoon(p.accent) + ' onderaan in Safari' : 'Tik op ' + deelIcoon(p.accent) + ' (Delen) in de balk van uw browser', p)
        + stapHtml(2, "Kies 'Zet op beginscherm'", p)
        + stapHtml(3, "Tik op 'Voeg toe'", p) + '</ol>'
        + (s ? '' : '<p style="' + P + ';text-align:left">Ziet u \'Zet op beginscherm\' niet in het menu? Open deze pagina dan in Safari.</p>') + '</div>';
    }
    if (omg === "android") {
      if (o.heeftEvent) {
        return '<button type="button" data-ifm-actie="installeer" style="' + knopStijl(p, true) + ';min-height:58px;font-size:18px">Installeer</button>'
          + '<p style="' + P + ';margin-top:10px;text-align:center">Eén tik, uw toestel vraagt om bevestiging</p>';
      }
      return '<div style="' + kaart + '"><ol style="list-style:none;margin:0;padding:0">'
        + stapHtml(1, "Open het menu van uw browser (de drie puntjes)", p)
        + stapHtml(2, "Kies 'App installeren' of 'Toevoegen aan startscherm'", p)
        + stapHtml(3, "Bevestig met 'Installeren' of 'Toevoegen'", p) + '</ol>'
        + (o.afgebroken ? '<p style="' + P + '">Installeren is afgebroken. U kunt het opnieuw proberen via het menu van uw browser.</p>' : '<p style="' + P + '">Ziet u deze opties niet? Dan biedt uw browser installeren hier niet aan; open deze pagina dan in Chrome.</p>') + '</div>';
    }
    return '<div style="text-align:center"><div style="display:inline-block;background:#fff;border-radius:14px;padding:10px"><img src="./icons/qr-infopoche.svg" width="176" height="176" alt="QR-code naar ' + URL_APP + '" style="display:block"></div><p style="' + P + ';margin-top:12px;color:' + p.tekst + '">Scan met uw telefoon</p></div>';
  }

  // Het eigen installatievenster van het toestel starten. cb("accepted") of cb("afgebroken").
  function installeer(ev, cb) {
    if (!ev || typeof ev.prompt !== "function") { cb && cb("afgebroken"); return false; }
    try {
      ev.prompt();
      Promise.resolve(ev.userChoice).then(function (c) { cb && cb(c && c.outcome === "accepted" ? "accepted" : "afgebroken"); },
        function () { cb && cb("afgebroken"); });
    } catch (e) { cb && cb("afgebroken"); }
    return true;
  }
  // De app-link kopieren. cb(true|false); de tik is het gebruikersgebaar, dus eerst de synchrone weg.
  function kopieer(nav, doc, cb) {
    function terugval() {
      var ok = false;
      try {
        var ta = doc.createElement("textarea");
        ta.value = URL_APP; ta.setAttribute("readonly", "");
        ta.style.cssText = "position:fixed;left:0;top:0;opacity:0;font-size:16px";
        doc.body.appendChild(ta);
        ta.focus(); ta.select(); ta.setSelectionRange(0, ta.value.length);
        ok = !!doc.execCommand("copy");
        doc.body.removeChild(ta);
      } catch (e) { ok = false; }
      return ok;
    }
    try {
      if (nav && nav.clipboard && nav.clipboard.writeText) {
        nav.clipboard.writeText(URL_APP).then(function () { cb(true); }, function () { cb(terugval()); });
        return;
      }
    } catch (e) {}
    cb(terugval());
  }
  function kopieerStatus(ok) {
    return ok ? "Gekopieerd" : 'Kopiëren lukte niet, houd de link ingedrukt: <span style="user-select:all;-webkit-user-select:all;word-break:break-all;font-weight:700">' + URL_APP + '</span>';
  }

  return {
    SLEUTEL_LANDING: SLEUTEL_LANDING, SLEUTEL_BALK: SLEUTEL_BALK, SLEUTEL_BLAD: SLEUTEL_BLAD,
    URL_APP: URL_APP,
    detecteerOmgeving: detecteerOmgeving,
    iosBrowser: iosBrowser,
    heeftInhoudHash: heeftInhoudHash,
    toonLanding: toonLanding,
    toonBalk: toonBalk,
    toonAutoBlad: toonAutoBlad,
    blokHtml: blokHtml,
    installeer: installeer,
    kopieer: kopieer,
    kopieerStatus: kopieerStatus
  };
});
