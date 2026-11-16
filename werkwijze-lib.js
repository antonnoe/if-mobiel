// Het scherm "Zo werken wij" (16 november 2026): een scrollpagina naar het voorbeeld van "Zo controleren wij elk cijfer"
// op communitiesabroad.com. Pure functies: de inhoud staat in data/werkwijze.json, de cijfers (Peil-stand, toollijst)
// haalt index.html live op en laat ze door deze functies lezen. Gewone JavaScript, geen buildstap; de tests laden dit met require.
(function (root) {
  var TEKST = function (v) { return typeof v === "string" ? v.trim() : ""; };
  var lijstVan = function (v) { return Array.isArray(v) ? v : []; };
  var MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
  var SOORTEN = ["aaa", "aa", "a"];
  var STIJLEN = ["vol", "rand"];

  // Alleen https gaat als link naar buiten.
  function urlOk(u) { return typeof u === "string" && /^https:\/\/[^\s]+$/.test(u) ? u : ""; }
  function pos(n) { return typeof n === "number" && isFinite(n) && n > 0 && Math.floor(n) === n; }

  function paren(v) {
    return lijstVan(v).map(function (x) { return x && typeof x === "object" ? { kop: TEKST(x.kop), tekst: TEKST(x.tekst) } : null; })
      .filter(function (x) { return x && x.kop && x.tekst; });
  }

  // Valideert het JSON-bestand. Geeft de genormaliseerde pagina terug, of null bij een kapot bestand.
  // Onderdelen zonder inhoud vallen af; een ontbrekende kop of een sectie zonder items maakt het bestand onbruikbaar.
  function lees(data) {
    if (!data || typeof data !== "object") return null;
    var k = data.kop || {}, s = data.stroom || {}, h = data.heenTerug || {}, o = data.onderAntwoord || {}, r = data.ritme || {}, z = data.zelf || {}, t = data.terugval || {};
    var bronnen = lijstVan(s.bronnen).map(function (b) {
      return b && typeof b === "object" && TEKST(b.chip) && TEKST(b.tekst) ? { chip: TEKST(b.chip), soort: SOORTEN.indexOf(b.soort) >= 0 ? b.soort : "a", tekst: TEKST(b.tekst) } : null;
    }).filter(Boolean);
    var lagen = lijstVan(o.lagen).map(function (l) {
      return l && typeof l === "object" && TEKST(l.kop) && TEKST(l.tekst) ? { kop: TEKST(l.kop), vraag: TEKST(l.vraag), tekst: TEKST(l.tekst) } : null;
    }).filter(Boolean);
    var knoppen = lijstVan(z.knoppen).map(function (b) {
      if (!b || typeof b !== "object" || !TEKST(b.label)) return null;
      var u = TEKST(b.url);
      if (u !== "@abonnement" && u !== "@manifest") u = urlOk(u);
      return u ? { label: TEKST(b.label), url: u, stijl: STIJLEN.indexOf(b.stijl) >= 0 ? b.stijl : "rand" } : null;
    }).filter(Boolean);
    var out = {
      siteUrl: urlOk(TEKST(data.siteUrl)), peilStandUrl: urlOk(TEKST(data.peilStandUrl)), toolsUrl: urlOk(TEKST(data.toolsUrl)),
      toolKaartBasis: urlOk(TEKST(data.toolKaartBasis)), toolsPaginaUrl: urlOk(TEKST(data.toolsPaginaUrl)), manifestUrl: urlOk(TEKST(data.manifestUrl)),
      kop: { bovenregel: TEKST(k.bovenregel), titel: TEKST(k.titel), tekst: TEKST(k.tekst), stand: TEKST(k.stand) },
      stroom: {
        bovenregel: TEKST(s.bovenregel), titel: TEKST(s.titel), tekst: TEKST(s.tekst), bronnen: bronnen,
        zwarteLijstKop: TEKST(s.zwarteLijstKop), zwarteLijst: TEKST(s.zwarteLijst), peilOnder: TEKST(s.peilOnder),
        waarden: TEKST(s.waarden), rekenregels: TEKST(s.rekenregels), dubbel: TEKST(s.dubbel), dubbelTekst: TEKST(s.dubbelTekst), ritmeRegel: TEKST(s.ritmeRegel),
        voorJouKop: TEKST(s.voorJouKop), voorJou: TEKST(s.voorJou), bedragen: TEKST(s.bedragen) || "bedragen",
        cafeNaam: TEKST(s.cafeNaam), cafeTekst: TEKST(s.cafeTekst), cafeUrl: urlOk(TEKST(s.cafeUrl)), verder: TEKST(s.verder), toolsOnbereikbaar: TEKST(s.toolsOnbereikbaar)
      },
      heenTerug: { bovenregel: TEKST(h.bovenregel), titel: TEKST(h.titel), heenTitel: TEKST(h.heenTitel), heen: paren(h.heen), terugTitel: TEKST(h.terugTitel), terug: paren(h.terug) },
      onderAntwoord: { bovenregel: TEKST(o.bovenregel), titel: TEKST(o.titel), tekst: TEKST(o.tekst), lagen: lagen },
      ritme: { bovenregel: TEKST(r.bovenregel), titel: TEKST(r.titel), momenten: paren(r.momenten) },
      zelf: { titel: TEKST(z.titel), tekst: TEKST(z.tekst), stappen: lijstVan(z.stappen).map(TEKST).filter(Boolean), knoppen: knoppen },
      terugval: { tekst: TEKST(t.tekst), link: TEKST(t.link) }
    };
    if (!out.kop.titel || !out.kop.tekst || !out.stroom.titel || !out.stroom.bronnen.length || !out.heenTerug.heen.length || !out.heenTerug.terug.length ||
        !out.onderAntwoord.lagen.length || !out.ritme.momenten.length || !out.zelf.titel || !out.zelf.knoppen.length) return null;
    return out;
  }

  // "2026-11-15" -> "15 november 2026"; ongeldig geeft "".
  function datumLang(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof iso === "string" ? iso : "");
    if (!m) return "";
    var mnd = Number(m[2]), dag = Number(m[3]);
    if (mnd < 1 || mnd > 12 || dag < 1 || dag > 31) return "";
    return dag + " " + MAANDEN[mnd - 1] + " " + m[1];
  }

  // Leest peil-stand.json (velden versie, versiedatum, vastgesteld, rekenregels_vastgesteld).
  // Geeft {versie, versiedatum, vastgesteld, rekenregels} terug; een veld dat niet klopt is null (en dus niet getoond).
  // Is er niets bruikbaars, dan null: de pagina toont dan het blok zonder getallen.
  function leesStand(d) {
    if (!d || typeof d !== "object") return null;
    var versie = /^\d+(\.\d+){1,3}$/.test(TEKST(d.versie)) ? TEKST(d.versie) : "";
    var datum = datumLang(TEKST(d.versiedatum));
    var res = { versie: versie, versiedatum: versie ? datum : "", vastgesteld: pos(d.vastgesteld) ? d.vastgesteld : null, rekenregels: pos(d.rekenregels_vastgesteld) ? d.rekenregels_vastgesteld : null };
    return res.versie || res.vastgesteld || res.rekenregels ? res : null;
  }

  // "Stand: Peil {versie}, {versiedatum}" -> ingevuld; zonder versie of datum geen regel.
  function standRegel(sjabloon, stand) {
    if (!stand || !stand.versie || !stand.versiedatum || !TEKST(sjabloon)) return "";
    return TEKST(sjabloon).replace("{versie}", stand.versie).replace("{versiedatum}", stand.versiedatum);
  }

  // Getal met Nederlandse duizendtallen, voor het geval de aantallen groeien.
  function getal(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }

  // Leest tools/index.json (tools[].slug, naam, aantal_bedragen). Een tool zonder naam, slug of positief aantal telt niet mee
  // (nooit een lege of nul-tegel). Sortering: meeste bedragen eerst, dan op naam. Geen bruikbare tool: lege lijst.
  function leesTools(d, basis) {
    if (!d || typeof d !== "object") return [];
    var b = urlOk(basis);
    return lijstVan(d.tools).map(function (t) {
      if (!t || typeof t !== "object") return null;
      var slug = TEKST(t.slug), naam = TEKST(t.naam);
      if (!naam || !/^[a-z0-9][a-z0-9-]*$/.test(slug) || !pos(t.aantal_bedragen) || !b) return null;
      return { slug: slug, naam: naam, aantal: t.aantal_bedragen, url: b + slug };
    }).filter(Boolean).sort(function (x, y) { return y.aantal - x.aantal || x.naam.localeCompare(y.naam, "nl"); });
  }

  var api = { lees: lees, urlOk: urlOk, datumLang: datumLang, leesStand: leesStand, standRegel: standRegel, leesTools: leesTools, getal: getal, SOORTEN: SOORTEN };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.IfWerkwijze = api;
})(typeof window !== "undefined" ? window : globalThis);
