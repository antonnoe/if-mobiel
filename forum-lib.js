// Forum: de knop "Reageer op dit bericht" in het draadscherm (26 november 2026).
// Reageren gebeurt op Nederlanders.fr zelf; de app bouwt alleen de link naar het reactievak (anker #add-comment).
// Gewone JavaScript, geen buildstap; de tests laden dit met require. Draaien: node --test tests/forum-reageer.test.mjs
(function (root) {
  // Alleen de detailadressen van NING: /xn/detail/<netwerk-id>:BlogPost:<bericht-id>, met dubbele punten.
  var DETAIL = /^https:\/\/(?:www\.)?nederlanders\.fr\/xn\/detail\/(\d+:BlogPost:\d+)$/;

  // Geeft de detail-URL met #add-comment, of "" als er geen bruikbaar id is (dan komt er geen knop).
  function reageerUrl(post) {
    var href = post && typeof post.href === "string" ? post.href.trim() : "";
    if (!href) return "";
    var kaal = href.split("#")[0].split("?")[0];
    var m = DETAIL.exec(kaal);
    if (!m) return "";
    return "https://www.nederlanders.fr/xn/detail/" + m[1] + "#add-comment";
  }

  var api = { reageerUrl: reageerUrl, DETAIL: DETAIL };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.IfForum = api;
})(typeof window !== "undefined" ? window : globalThis);
