// Feedback van testers (pilot): pure functies voor controleren, opbouwen en verzenden. Gewone JavaScript, geen buildstap:
// index.html laadt dit bestand (window.IfFb), de tests laden het met require.
// De reacties gaan naar een Supabase Edge Function (project communities-tools, tabel infopoche_feedback). De functie accepteert
// alleen verzoeken van infopoche.fr; vanaf een ander adres (bv. localhost) krijgt u een 403, dat is bedoeld.
(function (root) {
  var ENDPOINT = "https://mqkhfyvrizgmmmcbdkxh.supabase.co/functions/v1/infopoche-feedback";
  var CONTACT = "info@communitiesabroad.com";
  var MAANDEN = 3;
  var ONDERDELEN = [
    { id: "hub", label: "Startscherm" },
    { id: "zoeken", label: "Zoeken" },
    { id: "gemeente", label: "Mijn gemeente" },
    { id: "hygiene", label: "Hygiënecontroles" },
    { id: "artikelen", label: "Artikelen" },
    { id: "overig", label: "Anders" }
  ];
  var MAX = { naam: 80, bericht: 2000, toestel: 120 };
  var MIN_BERICHT = 5;

  function tekst(v) { return typeof v === "string" ? v.trim() : ""; }

  // Geeft de sleutel van de eerste fout, of null als alles klopt. Volgorde = volgorde op het scherm.
  function valideer(v) {
    v = v || {};
    if (!tekst(v.naam)) return "naam";
    if (!ONDERDELEN.some(function (o) { return o.id === v.onderdeel; })) return "onderdeel";
    if (tekst(v.bericht).length < MIN_BERICHT) return "bericht";
    if (v.toestemming !== true) return "toestemming";
    return null;
  }

  var FOUTEN = {
    naam: "Vul uw naam in.",
    onderdeel: "Kies waar uw opmerking over gaat.",
    bericht: "Schrijf kort wat u zag of wat er misging.",
    toestemming: "Zonder uw toestemming kunnen we de reactie niet bewaren.",
    druk: "Er komen nu veel reacties tegelijk binnen. Probeer het over een uur nog eens, uw tekst blijft staan.",
    netwerk: "Verzenden lukte niet. Uw tekst staat er nog, probeer het straks opnieuw.",
    server: "Verzenden lukte niet. Uw tekst staat er nog, probeer het straks opnieuw."
  };
  function foutTekst(sleutel) { return FOUTEN[sleutel] || FOUTEN.server; }

  // Alleen wat de functie nodig heeft, afgekapt op de toegestane lengte. Het verborgen vulveld `web` gaat mee zodat
  // de server een bot herkent.
  function body(v) {
    v = v || {};
    return {
      naam: tekst(v.naam).slice(0, MAX.naam),
      onderdeel: v.onderdeel,
      bericht: tekst(v.bericht).slice(0, MAX.bericht),
      toestel: tekst(v.toestel).slice(0, MAX.toestel),
      toestemming: v.toestemming === true,
      web: typeof v.web === "string" ? v.web : ""
    };
  }

  // Grove aanduiding voor het veld Toestel ("iPhone, Safari"). Nooit meer dan nodig om een fout na te kunnen bootsen.
  function toestelTekst(ua, platform) {
    ua = ua || ""; platform = platform || "";
    var os = /iPhone|iPad|iPod/.test(ua) || platform === "iPhone" ? "iPhone/iPad"
      : /Android/.test(ua) ? "Android"
      : /Windows/.test(ua) ? "Windows"
      : /Macintosh|Mac OS X/.test(ua) ? "Mac"
      : /Linux/.test(ua) ? "Linux" : "";
    var br = /CriOS|Chrome\//.test(ua) && !/Edg\//.test(ua) ? "Chrome"
      : /FxiOS|Firefox\//.test(ua) ? "Firefox"
      : /EdgiOS|Edg\//.test(ua) ? "Edge"
      : /Safari\//.test(ua) ? "Safari" : "";
    return [os, br].filter(Boolean).join(", ");
  }

  // Verzendt via de meegegeven fetch (testbaar). Geeft altijd {ok:true} of {ok:false, fout:<sleutel>}, gooit nooit.
  function zend(fetchFn, v, opties) {
    var fout = valideer(v);
    if (fout) return Promise.resolve({ ok: false, fout: fout });
    var ctl = null, timer = null;
    try { ctl = typeof AbortController === "function" ? new AbortController() : null; } catch (e) { ctl = null; }
    var ms = (opties && opties.timeout) || 12000;
    if (ctl) timer = setTimeout(function () { try { ctl.abort(); } catch (e) {} }, ms);
    var req = { method: "POST", credentials: "omit", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body(v)) };
    if (ctl) req.signal = ctl.signal;
    var p;
    try { p = fetchFn((opties && opties.url) || ENDPOINT, req); } catch (e) { if (timer) clearTimeout(timer); return Promise.resolve({ ok: false, fout: "netwerk" }); }
    return p.then(function (r) {
      if (timer) clearTimeout(timer);
      if (r && r.status === 429) return { ok: false, fout: "druk" };
      if (!r || !r.ok) return { ok: false, fout: "server" };
      return r.json().then(function (j) { return j && j.ok === true ? { ok: true } : { ok: false, fout: "server" }; },
        function () { return { ok: false, fout: "server" }; });
    }, function () { if (timer) clearTimeout(timer); return { ok: false, fout: "netwerk" }; });
  }

  var api = { ENDPOINT: ENDPOINT, CONTACT: CONTACT, MAANDEN: MAANDEN, ONDERDELEN: ONDERDELEN, MAX: MAX, valideer: valideer,
    foutTekst: foutTekst, body: body, toestelTekst: toestelTekst, zend: zend };
  if (typeof module === "object" && module.exports) module.exports = api; else root.IfFb = api;
})(typeof window !== "undefined" ? window : this);
