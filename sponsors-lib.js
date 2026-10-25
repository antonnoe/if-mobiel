// Sponsors: pure logica zonder DOM (browser: window.IfSponsors; tests: require).
// De gegevens staan in sponsors.json, de beelden in sponsors/ (eigen kopie, de NING-opslag verdwijnt).
(function (root) {
  // Fisher-Yates op een kopie; rnd is een functie die [0,1) geeft (Math.random, in tests vast te zetten).
  function schud(rij, rnd) {
    var a = Array.isArray(rij) ? rij.slice() : [];
    var r = typeof rnd === "function" ? rnd : Math.random;
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1));
      if (j > i) j = i;
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Alleen https-sites en bestandsnamen zonder pad of vreemde tekens.
  function geldigeSponsor(s) {
    if (!s || typeof s !== "object") return false;
    if (typeof s.id !== "string" || !s.id || typeof s.naam !== "string" || !s.naam) return false;
    if (typeof s.url !== "string" || !/^https:\/\/[^\s]+$/.test(s.url)) return false;
    if (!Array.isArray(s.beelden) || s.beelden.length < 1) return false;
    if (!s.beelden.every(function (b) { return typeof b === "string" && /^[a-z0-9][a-z0-9._-]*\.(png|jpg|jpeg|webp|svg)$/i.test(b); })) return false;
    if (s.beelden.length > 1 && !(Number(s.interval) >= 1000)) return false;
    return true;
  }

  // sponsors.json (een lijst) naar alleen de geldige sponsors, in bronvolgorde.
  function leesSponsors(data) {
    var lijst = Array.isArray(data) ? data : (data && Array.isArray(data.sponsors) ? data.sponsors : []);
    return lijst.filter(geldigeSponsor);
  }

  // Welk beeld staat er nu? Vaste volgorde, elke `interval` ms naar het volgende; goede[] zijn de nog ladende indexen.
  function bannerIndex(t0, nu, interval, n) {
    if (!(n > 1) || !(interval > 0)) return 0;
    var d = Math.max(0, nu - t0);
    return Math.floor(d / interval) % n;
  }

  // Het getoonde beeld uit de beelden die niet falen. Geeft -1 als er geen enkel beeld meer is.
  function toonIndex(t0, nu, interval, aantal, kapot) {
    var ok = [];
    for (var i = 0; i < aantal; i++) if (!kapot || !kapot[i]) ok.push(i);
    if (!ok.length) return -1;
    return ok[bannerIndex(t0, nu, interval, ok.length)];
  }

  var api = { schud: schud, geldigeSponsor: geldigeSponsor, leesSponsors: leesSponsors, bannerIndex: bannerIndex, toonIndex: toonIndex };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.IfSponsors = api;
})(typeof window !== "undefined" ? window : globalThis);
