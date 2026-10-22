// Pure functies van het landingsscherm van Infopoche. Geen DOM, geen netwerk.
// Werkt in de browser (window.LandingLib, gewone <script>) en in node (require/import).
(function (root, fabriek) {
  if (typeof module === "object" && module.exports) module.exports = fabriek();
  else root.LandingLib = fabriek();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var DAGEN = 14;
  var MS_DAG = 24 * 60 * 60 * 1000;
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

  // Landing tonen? Alleen niet als er een geldig uitstel is: een tijdstempel in de toekomst,
  // hoogstens 14 dagen vooruit. Leeg, kapot, verlopen of verder weg dan 14 dagen telt als geen uitstel.
  function toonLanding(waarde, nu) {
    nu = typeof nu === "number" ? nu : Date.now();
    if (waarde === null || waarde === undefined || waarde === "") return true;
    var t = Number(waarde);
    if (!isFinite(t) || t <= 0) return true;
    if (t <= nu) return true;
    if (t - nu > DAGEN * MS_DAG + 60000) return true;
    return false;
  }

  function uitstelTot(nu) {
    return (typeof nu === "number" ? nu : Date.now()) + DAGEN * MS_DAG;
  }

  return {
    DAGEN: DAGEN,
    URL_APP: URL_APP,
    detecteerOmgeving: detecteerOmgeving,
    iosBrowser: iosBrowser,
    toonLanding: toonLanding,
    uitstelTot: uitstelTot
  };
});
