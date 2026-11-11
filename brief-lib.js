// Brief uitleggen: pure logica zonder DOM (browser: window.IfBrief; tests: require).
// Een foto van een Franse brief gaat naar de Edge Function infopoche-brief (Claude van Anthropic leest hem).
// Niets van foto of uitkomst wordt bewaard (niet in de opslag van de browser, niet in de URL en niet in de geschiedenis).
(function (root) {
  var URL_BRIEF = "https://mqkhfyvrizgmmmcbdkxh.supabase.co/functions/v1/infopoche-brief";
  var TIMEOUT_MS = 45000;
  var MAX_LANG = 1600;          // lange zijde in pixels na het verkleinen
  var MAX_BYTES = 1500000;      // wat de functie hoogstens aanneemt
  var DOEL_BYTES = 1300000;     // waar de app onder wil blijven
  var MAX_PUNTEN = 6;
  var ZOEKTERMEN = ["belasting", "pensioen", "ziektekosten", "verzekering", "huur", "energie", "gemeente", "boete", "auto", "bank", "vastgoed", "werk", "uitkering", "erfenis", "afval"];

  var UITLEG = "Maak een foto van een Franse brief. Je krijgt in gewoon Nederlands wie hem stuurt, wat ze vragen en voor wanneer.";
  var PRIVACY = "De foto gaat naar Claude van Anthropic om gelezen te worden. InfoPoche bewaart de foto niet en schrijft hem nergens op. Anthropic kan zulke gegevens zelf een beperkte tijd bewaren. Dek gerust je fiscaal nummer af, dat is voor de uitleg niet nodig.";
  var PDF_TEKST = "Dit werkt alleen met een foto of een afbeelding van de brief, niet met een PDF. Maak een foto van het papier, of zet de pagina van de PDF als afbeelding op je toestel.";
  var DISCLAIMER_KOP = "Dit is een uitleg, geen advies";
  var DISCLAIMER = "De uitleg is gemaakt door AI. De brief zelf gaat altijd voor. Staat er een termijn, controleer die in de brief. Bij een aanmaning, een boete of een rechtbank: zoek hulp bij een professional.";
  var ONLEESBAAR_KOP = "Niet goed leesbaar";
  var ONLEESBAAR = "De foto is wazig of scheef. Leg de brief plat in goed licht en probeer het opnieuw.";
  var FOUTEN = {
    druk: "De uitleg is nu druk. Probeer het over een paar minuten opnieuw.",
    groot: "De foto is te groot. Probeer een kleinere foto.",
    uit: "Brief uitleggen is nu niet beschikbaar. Probeer het later opnieuw.",
    beeld: "Deze afbeelding kan de app niet openen. Probeer een foto in JPEG of PNG.",
    fout: "De uitleg lukte niet. Controleer je verbinding en probeer het opnieuw."
  };

  function tekst(x) { return typeof x === "string" ? x : ""; }
  // Liggende streepjes worden een komma, witruimte netjes.
  function schoon(x, max) {
    var t = tekst(x).replace(/[–—]/g, ",").replace(/\s+/g, " ").trim();
    return max && t.length > max ? t.slice(0, max).trim() : t;
  }
  function getallen(s) { return tekst(s).match(/\d+/g) || []; }

  // Elk getal in de Nederlandse termijn moet in het Franse citaat staan: zo rekent de app nooit een datum uit.
  function termijnTrouw(nl, citaat) {
    var c = getallen(citaat);
    return getallen(nl).every(function (g) { return c.indexOf(g) >= 0; });
  }

  // Valideert het antwoord van de functie. Een punt zonder citaat valt af, een termijn zonder citaat of met een getal dat
  // niet in het citaat staat valt af. Geeft {leesbaar:false} of {leesbaar:true, afzender, soortNl, soortFr, termijn, punten, zoekterm}.
  function leesAntwoord(d) {
    if (!d || d.ok !== true || d.leesbaar !== true) return { leesbaar: false };
    var afzender = schoon(d.afzender, 160), soortNl = schoon(d.soort_nl, 160);
    var punten = [];
    (Array.isArray(d.punten) ? d.punten : []).forEach(function (p) {
      if (!p || punten.length >= MAX_PUNTEN) return;
      var nl = schoon(p.nl, 300), cit = schoon(p.citaat, 400);
      if (nl && cit.length >= 6) punten.push({ nl: nl, citaat: cit });
    });
    var termijn = null;
    if (d.termijn && typeof d.termijn === "object") {
      var tnl = schoon(d.termijn.nl, 200), tc = schoon(d.termijn.citaat, 400);
      if (tnl && tc.length >= 6 && termijnTrouw(tnl, tc)) termijn = { nl: tnl, citaat: tc };
    }
    if (!afzender || (!soortNl && !punten.length)) return { leesbaar: false };
    var zoekterm = ZOEKTERMEN.indexOf(d.zoekterm) >= 0 ? d.zoekterm : "";
    return { leesbaar: true, afzender: afzender, soortNl: soortNl, soortFr: schoon(d.soort_fr, 160), termijn: termijn, punten: punten, zoekterm: zoekterm };
  }

  // Afmetingen na het verkleinen: lange zijde hoogstens max, nooit vergroten, geheel getal, minstens 1.
  function verkleinMaat(w, h, max) {
    max = max || MAX_LANG;
    w = Number(w); h = Number(h);
    if (!isFinite(w) || !isFinite(h) || w < 1 || h < 1) return null;
    var lang = Math.max(w, h);
    if (lang <= max) return { b: Math.round(w), h: Math.round(h) };
    var f = max / lang;
    return { b: Math.max(1, Math.round(w * f)), h: Math.max(1, Math.round(h * f)) };
  }
  // Aantal bytes van een base64-tekst (zonder data:-voorvoegsel).
  function bytesVanBase64(b64) {
    var s = tekst(b64); var pad = (s.match(/=+$/) || [""])[0].length;
    return Math.max(0, Math.floor(s.length * 3 / 4) - pad);
  }
  // Alleen beeld: PDF en andere bestanden niet.
  function isPdf(naam, type) { return /pdf/i.test(tekst(type)) || /\.pdf$/i.test(tekst(naam)); }
  function isBeeld(naam, type) { return /^image\//i.test(tekst(type)) || (!tekst(type) && /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(tekst(naam))); }
  // Soort fout uit de HTTP-status en het veld "fout" van het antwoord: druk, groot, uit of fout.
  function foutSoort(status, data) {
    var f = data && typeof data.fout === "string" ? data.fout : "";
    if (status === 429 || f === "druk") return "druk";
    if (status === 413 || f === "groot") return "groot";
    if (f === "uit") return "uit";
    return "fout";
  }
  function foutTekst(soort) { return FOUTEN[soort] || FOUTEN.fout; }
  function body(b64) { return JSON.stringify({ beeld: b64 }); }

  var api = {
    URL: URL_BRIEF, TIMEOUT_MS: TIMEOUT_MS, MAX_LANG: MAX_LANG, MAX_BYTES: MAX_BYTES, DOEL_BYTES: DOEL_BYTES, MAX_PUNTEN: MAX_PUNTEN, ZOEKTERMEN: ZOEKTERMEN,
    UITLEG: UITLEG, PRIVACY: PRIVACY, PDF_TEKST: PDF_TEKST, DISCLAIMER_KOP: DISCLAIMER_KOP, DISCLAIMER: DISCLAIMER, ONLEESBAAR_KOP: ONLEESBAAR_KOP, ONLEESBAAR: ONLEESBAAR, FOUTEN: FOUTEN,
    leesAntwoord: leesAntwoord, termijnTrouw: termijnTrouw, verkleinMaat: verkleinMaat, bytesVanBase64: bytesVanBase64, isPdf: isPdf, isBeeld: isBeeld, foutSoort: foutSoort, foutTekst: foutTekst, body: body
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.IfBrief = api;
})(typeof window !== "undefined" ? window : this);
