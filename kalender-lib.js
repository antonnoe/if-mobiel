// Kalender Frankrijk in de app: pure logica zonder DOM (browser: window.IfKal; tests: require).
// Bron: de openbare API van Kalender Frankrijk, zonder sleutel, CORS *. De basis-URL staat op één plek: BASIS.
// De voorvoegselregels van de band op de hub ("Vandaag", "Morgen", "Nog N dagen", "Seizoen", "Nu", "Let op") staan op één plek: voorvoegsel().
// Alleen items met status "vastgesteld" en "infopoche" in toon_in komen door leesItems; al het andere valt weg, ook in tellingen.
(function (root) {
  var BASIS = "https://kalender-frankrijk.vercel.app";
  var TIMEOUT_MS = 8000, VENSTER_DAGEN = 120, TUSSENTIJD_MS = 10 * 60 * 1000, MAX_BAND = 3, REGEL_MAX = 120;
  var ISO = /^\d{4}-\d{2}-\d{2}$/;
  var ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;
  var HEXKLEUR = /^#[0-9a-fA-F]{6}$/;
  var WEEKDAGEN = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
  var MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
  var FOUT = "De kalender is nu niet bereikbaar.";
  var LEEG_DAG = "Niets op deze dag.";
  var TOON_ALLES = "Toon alles";
  var ABO_VRAAG = "Ook in je eigen agenda-app?";
  var ABO_KNOP = "Zet in je agenda \u2192";
  var WEG = "Dit item staat niet meer in de kalender.";
  var ABO_UITLEG = "Je agenda-app haalt de data zelf op en houdt ze bij, je hoeft er verder niets voor te doen.";
  var ABO_ALLES = "Hele kalender";
  var ABO_RUBRIEK = "Of alleen een rubriek:";
  // Korte namen voor de chips; de volledige naam blijft in de lijstrijen, de legenda en het itemscherm.
  var KORT = { fiscaal: "Fiscaal", uitkeringen: "Uitkeringen", feestdagen: "Feestdagen", school: "School", wonen: "Wonen", buiten: "Buiten", zorg: "Zorg", stemmen: "Stemmen", genieten: "Tradities", verenigingen: "Verenigingen", moestuin: "Moestuin" };
  var WEEK_NAMEN = ["MA", "DI", "WO", "DO", "VR", "ZA", "ZO"];

  function tekst(x) { return typeof x === "string" ? x : ""; }
  // Geen lange streepjes in zichtbare tekst: een omringd streepje wordt een komma, een los streepje een koppelteken.
  function schoon(x) {
    return tekst(x).replace(/\s+[\u2013\u2014]\s+/g, ", ").replace(/[\u2013\u2014]/g, "-").replace(/\s+/g, " ").trim();
  }
  function idSchoon(id) { return typeof id === "string" && ID.test(id) ? id : null; }
  function https(u) { var t = tekst(u).trim(); return /^https:\/\/[^\s\/?#:@]+([\/?#]\S*)?$/i.test(t) ? t : ""; }
  function hostnaam(u) { var m = /^https:\/\/([^\/?#:@\s]+)/i.exec(tekst(u).trim()); return m ? m[1].toLowerCase().replace(/^www\./, "") : ""; }

  // ---- datums (kalenderdagen als YYYY-MM-DD, rekenen in UTC zodat tijdzone en zomertijd niets verschuiven) ----
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function isoVan(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function utc(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tekst(iso));
    if (!m) return null;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? d : null;
  }
  function plusDagen(iso, n) {
    var d = utc(iso);
    if (!d) return "";
    d.setUTCDate(d.getUTCDate() + n);
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  }
  function dagMaand(iso, metJaar) {
    var d = utc(iso);
    return d ? d.getUTCDate() + " " + MAANDEN[d.getUTCMonth()] + (metJaar ? " " + d.getUTCFullYear() : "") : "";
  }
  function datumWoorden(iso, metJaar) {
    var d = utc(iso);
    return d ? WEEKDAGEN[d.getUTCDay()] + " " + dagMaand(iso, metJaar) : "";
  }
  // Datumkop in de lijst: "Vandaag", "Morgen" of "maandag 9 november".
  function datumKop(iso, vandaag) {
    if (iso === vandaag) return "Vandaag";
    if (iso === plusDagen(vandaag, 1)) return "Morgen";
    return datumWoorden(iso, false);
  }
  function ddmmjjjj(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(tekst(iso)); return m ? m[3] + "-" + m[2] + "-" + m[1] : ""; }

  // ---- URL's ----
  function vandaagUrl(datum) { return BASIS + "/api/vandaag?datum=" + encodeURIComponent(datum); }
  function itemsUrl(van, tot) { return BASIS + "/api/items?van=" + encodeURIComponent(van) + "&tot=" + encodeURIComponent(tot); }
  function rubriekenUrl() { return BASIS + "/api/rubrieken"; }
  function beeldUrl(rubriek) { return /^[a-z0-9-]{1,40}$/.test(tekst(rubriek)) ? BASIS + "/beeld/" + rubriek + ".png" : ""; }
  function icalUrl(rubriek) { return /^[a-z0-9-]{1,40}$/.test(tekst(rubriek)) ? BASIS + "/ical/" + rubriek + ".ics" : ""; }

  // ---- de band "Vandaag" op de hub ----
  // Voorvoegsel per soort. Eén plek voor alle regels hierover.
  function voorvoegsel(r) {
    var s = r && r.soort, kop = (r && r.kop) || "";
    if (s === "vandaag") return "Vandaag";
    if (s === "aftelling") {
      if (/^Morgen\b/i.test(kop)) return "Morgen";
      var m = /^Over\s+(\d+)\s+dag/i.exec(kop);
      if (m) { var n = parseInt(m[1], 10); return n === 0 ? "Vandaag" : n === 1 ? "Nog 1 dag" : "Nog " + n + " dagen"; }
      return "Let op";
    }
    if (s === "tip") return "Seizoen";
    if (s === "periode") return "Nu";
    return "Let op"; // mijlpaal en alles wat onbekend is
  }
  // "Over 14 dagen, maandag 16 november." -> "maandag 16 november"
  function datumUitKop(kop) {
    var m = /^[^,]+,\s*(.+?)\.?\s*$/.exec(tekst(kop));
    return m ? m[1] : "";
  }
  function afkappen(t, max) {
    if (t.length <= max) return t;
    var s = t.slice(0, max - 1), i = s.lastIndexOf(" ");
    if (i > 0) s = s.slice(0, i);
    return s.replace(/[\s,;:.]+$/, "") + "…";
  }
  // Eerste zin van een tekst, zonder stukken tussen haakjes, zonder slotpunt.
  function eersteZin(t) {
    var s = schoon(t).replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
    if (!s) return "";
    var m = /^(.+?[.!?])(?=\s+[A-ZÀ-Ý0-9]|$)/.exec(s);
    return (m ? m[1] : s).replace(/[.!?\s]+$/, "");
  }
  // Titel + ": " + eerste zin, samen hooguit REGEL_MAX tekens, afgekapt op een woordgrens met een beletselteken.
  function kortRegel(titel, tk) {
    var zin = eersteZin(tk), voor = titel + ": ", ruimte = REGEL_MAX - voor.length;
    if (!zin || ruimte < 12) return afkappen(titel, REGEL_MAX);
    return voor + afkappen(zin, ruimte);
  }
  function bandTekst(r) {
    var t = r.titel;
    if (r.soort === "vandaag") return t;
    if (r.soort === "aftelling") {
      var deadline = /uiterst|deadline|betaal|aangifte|inschrijv/i.test(t);
      var kaal = t.replace(/,\s*uiterste betaaldatum\s*$/i, "");
      var d = datumUitKop(r.kop);
      return d ? kaal + ", " + (deadline ? "uiterlijk " : "") + d : kaal;
    }
    return kortRegel(t, r.tekst);
  }
  // Antwoord van /api/vandaag naar hooguit drie regels: [{voor, tekst, id, feest}]. Geen regels: [] (dan is er geen band).
  function bandRegels(data) {
    if (!data || typeof data !== "object") return [];
    var lijst = Array.isArray(data.regels) ? data.regels : [], uit = [];
    var b = data.banner;
    if (b && typeof b === "object") {
      var nl = schoon(b.tekst_nl), fr = schoon(b.tekst_fr), feest = [nl, fr].filter(Boolean).join(" · ");
      if (feest) uit.push({ voor: "", tekst: feest, id: null, feest: true });
    }
    lijst.forEach(function (r) {
      if (!r || typeof r !== "object" || uit.length >= MAX_BAND) return;
      var titel = schoon(r.titel);
      if (!titel) return;
      var x = { soort: tekst(r.soort), kop: schoon(r.kop), titel: titel, tekst: tekst(r.tekst) };
      var t = bandTekst(x);
      if (!t) return;
      uit.push({ voor: voorvoegsel(x), tekst: t, id: idSchoon(r.id), feest: false });
    });
    return uit.slice(0, MAX_BAND);
  }

  // ---- rubrieken en items ----
  function leesRubrieken(data) {
    if (!Array.isArray(data)) return [];
    var uit = [], gezien = {};
    data.forEach(function (r) {
      if (!r || typeof r.id !== "string" || !/^[a-z0-9-]{1,40}$/.test(r.id) || gezien[r.id]) return;
      var naam = schoon(r.naam);
      if (!naam) return;
      gezien[r.id] = true;
      uit.push({ id: r.id, naam: naam, kleur: HEXKLEUR.test(tekst(r.kleur)) ? r.kleur : "#3D4346", tint: HEXKLEUR.test(tekst(r.tint)) ? r.tint : "#E8EAEB" });
    });
    return uit;
  }
  function gebiedTekst(g) {
    var l = (Array.isArray(g) ? g : [g]).map(schoon).filter(Boolean);
    return l.join(", ");
  }
  // Alleen vastgesteld en voor Infopoche. Null als het antwoord geen items-lijst heeft (dan is het een fout).
  function leesItems(data) {
    if (!data || typeof data !== "object" || !Array.isArray(data.items)) return null;
    var uit = [], gezien = {};
    data.items.forEach(function (i) {
      if (!i || typeof i !== "object" || i.status !== "vastgesteld") return;
      if (!Array.isArray(i.toon_in) || i.toon_in.indexOf("infopoche") < 0) return;
      var id = idSchoon(i.id), titel = schoon(i.titel);
      if (!id || !titel || gezien[id]) return;
      var vk = (Array.isArray(i.voorkomens) ? i.voorkomens : []).map(function (v) {
        return v && ISO.test(tekst(v.van)) && ISO.test(tekst(v.tot)) && v.van <= v.tot ? { van: v.van, tot: v.tot } : null;
      }).filter(Boolean).sort(function (a, b) { return a.van < b.van ? -1 : a.van > b.van ? 1 : 0; });
      if (!vk.length) return;
      gezien[id] = true;
      var bron = i.bron && typeof i.bron === "object" ? { url: https(i.bron.url), gecontroleerd: ISO.test(tekst(i.bron.gecontroleerd)) ? i.bron.gecontroleerd : "" } : { url: "", gecontroleerd: "" };
      var aanzet = i.forum_aanzet && typeof i.forum_aanzet === "object" ? { titel: schoon(i.forum_aanzet.titel), tekst: schoon(i.forum_aanzet.tekst) } : null;
      var wie = (Array.isArray(i.doelgroepen) ? i.doelgroepen : []).map(function (x) { return schoon(x).toLowerCase(); }).filter(Boolean);
      uit.push({
        id: id, titel: titel, rubriek: tekst(i.rubriek), rubriekNaam: schoon(i.rubriek_naam), doelgroepen: wie,
        gebied: gebiedTekst(i.gebied), tijd: schoon(i.tijd), tekst: schoon(i.tekst_je || i.tekst_u || i.tekst), link: https(i.link), bron: bron,
        gesprek: i.gesprek === true, aanzet: aanzet && (aanzet.titel || aanzet.tekst) ? aanzet : null, voorkomens: vk
      });
    });
    return uit;
  }

  // ---- filters ----
  function filterItems(items, rubriek) {
    return (items || []).filter(function (i) { return !rubriek || rubriek === "alles" || i.rubriek === rubriek; });
  }
  // Chips voor de rubrieken: alleen wat in de lijst voorkomt, in de volgorde van de API; onbekende rubrieken met de naam uit het item.
  function rubriekChips(items, rubrieken) {
    var aanwezig = {}, volgorde = [];
    (items || []).forEach(function (i) { if (i.rubriek && !aanwezig[i.rubriek]) { aanwezig[i.rubriek] = i.rubriekNaam || i.rubriek; volgorde.push(i.rubriek); } });
    var uit = [], gedaan = {};
    (rubrieken || []).forEach(function (r) { if (aanwezig[r.id]) { gedaan[r.id] = true; uit.push({ id: r.id, naam: r.naam, kleur: r.kleur, tint: r.tint }); } });
    volgorde.forEach(function (id) { if (!gedaan[id]) uit.push({ id: id, naam: aanwezig[id], kleur: "#3D4346", tint: "#E8EAEB" }); });
    return uit;
  }
  function wieNaam(id) { var t = String(id).replace(/-/g, " "); return t.charAt(0).toUpperCase() + t.slice(1); }
  // Korte naam voor een chip; een onbekende rubriek valt terug op de volledige naam.
  function korteNaam(id, naam) { return Object.prototype.hasOwnProperty.call(KORT, id) ? KORT[id] : naam; }
  function kleurVan(rubriek, rubrieken) {
    var r = (rubrieken || []).filter(function (x) { return x.id === rubriek; })[0];
    return r ? r.kleur : "#3D4346";
  }

  // ---- de kalender zelf: week, maand, stipjes, vensters ----
  function maandNaam(iso) { var d = utc(iso); return d ? MAANDEN[d.getUTCMonth()] : ""; }
  function hoofdletter(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : ""; }
  // Maandag van de week (ISO: de week begint op maandag).
  function weekStart(iso) {
    var d = utc(iso);
    if (!d) return "";
    return plusDagen(iso, -((d.getUTCDay() + 6) % 7));
  }
  function weekBereik(iso) { var v = weekStart(iso); return v ? { van: v, tot: plusDagen(v, 6) } : null; }
  function dagenInMaand(iso) {
    var d = utc(iso);
    return d ? new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate() : 0;
  }
  function maandBereik(iso) {
    var d = utc(iso);
    if (!d) return null;
    var m = iso.slice(0, 8);
    return { van: m + "01", tot: m + pad(dagenInMaand(iso)) };
  }
  // Raster van de maand: van de maandag voor de eerste tot de zondag na de laatste. [{iso, dag, buiten}]
  function maandRaster(iso) {
    var b = maandBereik(iso);
    if (!b) return [];
    var van = weekStart(b.van), tot = weekBereik(b.tot).tot, uit = [], n = 0, dag = van;
    while (dag <= tot && n < 42) {
      uit.push({ iso: dag, dag: parseInt(dag.slice(8), 10), buiten: dag < b.van || dag > b.tot });
      dag = plusDagen(dag, 1); n++;
    }
    return uit;
  }
  function bereikVan(weergave, iso) { return weergave === "maand" ? maandBereik(iso) : weekBereik(iso); }
  function maandPlus(iso, n) {
    var d = utc(iso);
    if (!d) return "";
    var y = d.getUTCFullYear(), m = d.getUTCMonth() + n;
    y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    return y + "-" + pad(m + 1) + "-01";
  }
  // Vorige (-1) of volgende (+1): een week of een maand verder. Valt vandaag in de nieuwe periode, dan is vandaag gekozen,
  // anders de eerste dag (maandag of de eerste van de maand).
  function verschuif(weergave, gekozen, richting, vandaag) {
    var nieuw = weergave === "maand" ? maandPlus(gekozen, richting) : plusDagen(weekStart(gekozen), 7 * richting);
    if (!nieuw) return gekozen;
    var b = bereikVan(weergave, nieuw);
    return vandaag && vandaag >= b.van && vandaag <= b.tot ? vandaag : nieuw;
  }
  // "16 tot 22 november", "26 oktober tot 1 november", "28 december 2026 tot 3 januari 2027"; maand: "november 2026".
  function periodeTitel(weergave, iso) {
    var d = utc(iso);
    if (!d) return "";
    if (weergave === "maand") return MAANDEN[d.getUTCMonth()] + " " + d.getUTCFullYear();
    var b = weekBereik(iso), v = utc(b.van), t = utc(b.tot);
    if (v.getUTCFullYear() !== t.getUTCFullYear()) return dagMaand(b.van, true) + " tot " + dagMaand(b.tot, true);
    if (v.getUTCMonth() !== t.getUTCMonth()) return dagMaand(b.van, false) + " tot " + dagMaand(b.tot, false);
    return v.getUTCDate() + " tot " + dagMaand(b.tot, false);
  }
  function kopDag(iso) { return hoofdletter(datumWoorden(iso, false)); }
  function tijdSleutel(t) { var m = /(\d{1,2})[:.](\d{2})/.exec(tekst(t)); return m ? pad(+m[1]) + ":" + m[2] : ""; }
  // Rijen per begindag binnen van-tot: {iso: [{item, van, tot}]}. Een voorkomen telt op zijn begindag (een periode ook: alleen daar).
  function perDag(items, van, tot) {
    var uit = {}, n = 0;
    (items || []).forEach(function (it) {
      it.voorkomens.forEach(function (v) {
        if (v.van < van || v.van > tot) return;
        (uit[v.van] = uit[v.van] || []).push({ item: it, van: v.van, tot: v.tot, n: n++ });
      });
    });
    Object.keys(uit).forEach(function (d) {
      uit[d].sort(function (a, b) { var x = tijdSleutel(a.item.tijd), y = tijdSleutel(b.item.tijd); return x < y ? -1 : x > y ? 1 : a.n - b.n; });
    });
    return uit;
  }
  // Perioden en seizoenen die voor het begin van de periode zijn begonnen en er nog lopen: "Loopt deze week/maand".
  // Wat in de periode zelf begint staat op zijn begindag.
  function loopt(items, van) {
    var uit = [], n = 0;
    (items || []).forEach(function (it) {
      it.voorkomens.forEach(function (v) {
        if (v.van < van && v.tot >= van && v.van < v.tot) uit.push({ item: it, van: v.van, tot: v.tot, n: n++ });
      });
    });
    return uit.sort(function (a, b) { return a.tot < b.tot ? -1 : a.tot > b.tot ? 1 : a.n - b.n; });
  }
  // Stipjes onder een dag: een per rubriek, hooguit drie, in de volgorde van de rubriekenlijst. [{rubriek, kleur}]
  function stippen(rijen, rubrieken, max) {
    var aanwezig = {}, uit = [];
    (rijen || []).forEach(function (r) { if (r.item.rubriek) aanwezig[r.item.rubriek] = true; });
    var volgorde = (rubrieken || []).map(function (r) { return r.id; });
    Object.keys(aanwezig).forEach(function (id) { if (volgorde.indexOf(id) < 0) volgorde.push(id); });
    volgorde.forEach(function (id) { if (aanwezig[id]) uit.push({ rubriek: id, kleur: kleurVan(id, rubrieken) }); });
    return uit.slice(0, max == null ? 3 : max);
  }
  // Rubrieken (in de volgorde van de lijst) waarvan er op de getoonde dagen een stip staat; voor de legenda.
  function legenda(perDagMap, rubrieken) {
    var aanwezig = {};
    Object.keys(perDagMap || {}).forEach(function (d) { perDagMap[d].forEach(function (r) { if (r.item.rubriek) aanwezig[r.item.rubriek] = r.item.rubriekNaam || r.item.rubriek; }); });
    var uit = [], gedaan = {};
    (rubrieken || []).forEach(function (r) { if (aanwezig[r.id]) { gedaan[r.id] = true; uit.push({ id: r.id, naam: r.naam, kleur: r.kleur }); } });
    Object.keys(aanwezig).forEach(function (id) { if (!gedaan[id]) uit.push({ id: id, naam: aanwezig[id], kleur: "#3D4346" }); });
    return uit;
  }
  function itemsTekst(n) { return n === 0 ? "geen items" : n === 1 ? "1 item" : n + " items"; }
  // "maandag 16 november, 2 items"
  function dagLabel(iso, aantal) { return datumWoorden(iso, false) + ", " + itemsTekst(aantal); }
  // Tekst bij een lege uitkomst. rubriekNaam: de naam van het actieve filter ("" zonder filter); periode: "week", "maand" of "dag".
  // lopend: aantal perioden dat deze week of maand al loopt (en dus alleen onder "Loopt deze week" staat). Zonder deze regel
  // zag een lezer bij een filter met alleen lopende perioden (Moestuin, 3 november 2026) een lege lijst zonder uitleg.
  function leegTekst(rubriekNaam, periode, lopend) {
    if (periode === "dag") return rubriekNaam ? "Niets in " + rubriekNaam + " op deze dag." : LEEG_DAG;
    if (lopend > 0) return "Niets begint deze " + periode + (rubriekNaam ? " in " + rubriekNaam : "") + "; wat al loopt staat onder \"Loopt deze " + periode + "\"." ;
    return rubriekNaam ? "Niets in " + rubriekNaam + " in deze " + periode + "." : "Niets in deze " + periode + ".";
  }
  // Voegt twee itemlijsten samen op id; de voorkomens van beide blijven (zonder dubbelen), op volgorde.
  function voegSamen(a, b) {
    var per = {}, volgorde = [];
    (a || []).concat(b || []).forEach(function (it) {
      var x = per[it.id];
      if (!x) { per[it.id] = Object.assign({}, it, { voorkomens: it.voorkomens.slice() }); volgorde.push(it.id); return; }
      it.voorkomens.forEach(function (v) { if (!x.voorkomens.some(function (w) { return w.van === v.van && w.tot === v.tot; })) x.voorkomens.push(v); });
      x.voorkomens.sort(function (p, q) { return p.van < q.van ? -1 : p.van > q.van ? 1 : 0; });
    });
    return volgorde.map(function (id) { return per[id]; });
  }
  // Is van-tot helemaal gedekt door de opgehaalde vensters (aan elkaar of overlappend)?
  function gedekt(vensters, van, tot) {
    var l = (vensters || []).slice().sort(function (a, b) { return a.van < b.van ? -1 : a.van > b.van ? 1 : 0; }), nodig = van;
    for (var i = 0; i < l.length; i++) {
      if (l[i].van > nodig) break;
      if (l[i].tot >= nodig) { nodig = plusDagen(l[i].tot, 1); if (nodig > tot) return true; }
    }
    return nodig > tot;
  }
  // Het venster dat voor een extra aanvraag wordt gebruikt: hele maanden rond van-tot.
  function ophaalVenster(van, tot) { return { van: maandBereik(van).van, tot: maandBereik(tot).tot }; }
  // Het eerste venster bij het openen: een week terug tot en met 120 dagen vooruit.
  function startVenster(vandaag) { return { van: plusDagen(vandaag, -7), tot: plusDagen(vandaag, VENSTER_DAGEN) }; }

  // ---- aanvulling bij een lege dag of week ----
  var AANV_MAX = 5;
  // Rijen (perDag-vorm) die in van-tot beginnen, op datum en tijd, zonder items die al gezien zijn (op id). gezien wordt aangevuld.
  function rijenIn(lijst, van, tot, gezien) {
    if (van > tot) return [];
    var pd = perDag(lijst, van, tot), uit = [];
    Object.keys(pd).sort().forEach(function (d) {
      pd[d].forEach(function (r) { if (!gezien[r.item.id]) { gezien[r.item.id] = true; uit.push(r); } });
    });
    return uit;
  }
  // "2 tot 6 december", "30 november tot 6 december"
  function kortBereik(van, tot) {
    var v = utc(van), t = utc(tot);
    if (v.getUTCMonth() !== t.getUTCMonth() || v.getUTCFullYear() !== t.getUTCFullYear()) return dagMaand(van, false) + " tot " + dagMaand(tot, false);
    return v.getUTCDate() + " tot " + dagMaand(tot, false);
  }
  // Wat staat er na een lege dag (maand) of een lege week? Twee blokken, zonder dubbelen en binnen het actieve filter:
  // 1. begint in de rest van de week (dag+1 tot zondag), anders in de week erna;
  // 2. begint in de rest van de maand na dat blok, anders in de maand erna.
  // weergave "week": de hele week is leeg, dus het anker is de zondag (rest van de week is leeg, dus de week erna).
  // Geeft {blokken:[{id:"week"|"maand", label, rijen (hooguit AANV_MAX), totaal, meer:null | {tekst, weergave, iso}}]}; een leeg blok ontbreekt.
  function aanvulling(items, gekozen, vandaag, rubriek, weergave) {
    var uit = { blokken: [] };
    if (!utc(gekozen)) return uit;
    var lijst = filterItems(items, rubriek), anker = weergave === "week" ? weekBereik(gekozen).tot : gekozen;
    var wk = weekBereik(anker), gezien = {};
    // Maand: de items van de gekozen dag staan al in de lijst erboven, dus komen ze niet nog eens in een blok.
    if (weergave !== "week") perDag(lijst, gekozen, gekozen)[gekozen] && perDag(lijst, gekozen, gekozen)[gekozen].forEach(function (r) { gezien[r.item.id] = true; });
    var dezeWeek = !!vandaag && weekStart(vandaag) === wk.van, dezeMaand = !!vandaag && vandaag.slice(0, 7) === anker.slice(0, 7);
    // blok 1
    var r1 = { van: plusDagen(anker, 1), tot: wk.tot }, rest1 = true, rijen1 = rijenIn(lijst, r1.van, r1.tot, gezien);
    if (!rijen1.length) {
      var nv = plusDagen(wk.tot, 1);
      r1 = { van: nv, tot: plusDagen(nv, 6) }; rest1 = false; rijen1 = rijenIn(lijst, r1.van, r1.tot, gezien);
    }
    function blok(id, label, rijen, doel, weergaveNaar) {
      if (!rijen.length) return;
      uit.blokken.push({
        id: id, label: label, rijen: rijen.slice(0, AANV_MAX), totaal: rijen.length,
        meer: rijen.length > AANV_MAX ? { tekst: "Bekijk alles in " + doel, weergave: weergaveNaar, iso: rijen[0].van } : null
      });
    }
    var label1 = rest1 ? (dezeWeek ? "Nog deze week" : "Rest van de week (" + kortBereik(r1.van, r1.tot) + ")") : (dezeWeek ? "Volgende week" : "Week van " + dagMaand(r1.van, false));
    var doel1 = rest1 ? (dezeWeek ? "deze week" : "de week van " + dagMaand(wk.van, false)) : (dezeWeek ? "volgende week" : "de week van " + dagMaand(r1.van, false));
    blok("week", label1, rijen1, doel1, "week");
    // blok 2: na het einde van de week die hierboven is bekeken
    var na = plusDagen(r1.tot, 1), eind = maandBereik(anker).tot, rest2 = true;
    var r2 = { van: na, tot: eind }, rijen2 = rijenIn(lijst, r2.van, r2.tot, gezien), nm = maandPlus(anker, 1);
    if (!rijen2.length) {
      var mb = maandBereik(nm);
      r2 = { van: mb.van > na ? mb.van : na, tot: mb.tot }; rest2 = false; rijen2 = rijenIn(lijst, r2.van, r2.tot, gezien);
    }
    var naam2 = rest2 ? maandNaam(anker) : maandNaam(nm);
    var label2 = rest2 ? (dezeMaand ? "Nog deze maand" : "Rest van " + naam2) : (dezeMaand ? "Volgende maand" : hoofdletter(naam2));
    var doel2 = rest2 ? (dezeMaand ? "deze maand" : naam2) : (dezeMaand ? "volgende maand" : naam2);
    blok("maand", label2, rijen2, doel2, "maand");
    return uit;
  }
  // Is het bereik dat aanvulling nodig heeft gedekt? van = begin van de getoonde periode, tot = einde van de maand erna.
  function aanvullingBereik(weergave, gekozen) {
    var b = bereikVan(weergave, gekozen);
    if (!b) return null;
    var anker = weergave === "week" ? b.tot : gekozen;
    return { van: b.van, tot: maandBereik(maandPlus(anker, 1)).tot };
  }
  // Titel voor de navigatiekop. Een weektitel die over een maand- of jaargrens loopt wordt kort ("28 dec tot 3 jan", zonder jaar),
  // zodat hij op een regel past, ook met Grotere tekst. De volledige titel blijft voor aria en tests in periodeTitel.
  function periodeTitelKop(weergave, iso) {
    var t = periodeTitel(weergave, iso);
    if (weergave === "maand" || t.length <= 18) return t;
    var b = weekBereik(iso), kort = function (x) { var d = utc(x); return d.getUTCDate() + " " + MAANDEN[d.getUTCMonth()].slice(0, 3); };
    return kort(b.van) + " tot " + kort(b.tot);
  }
  // Lettergrootte (px) voor de titel van de navigatiekop, zodat hij op een regel blijft: langere titel, kleinere letter.
  function titelGrootte(titel) {
    var n = String(titel || "").length;
    return n <= 14 ? 21 : n <= 18 ? 19 : 17;
  }

  // ---- weergave ----
  function tijdTekst(t) {
    var s = schoon(t);
    if (!s) return "";
    var m = /^(\d{1,2}[:.]\d{2})\s*-\s*(\d{1,2}[:.]\d{2})$/.exec(s);
    if (m) return m[1].replace(".", ":") + " tot " + m[2].replace(".", ":");
    if (/^\d{1,2}[:.]\d{2}$/.test(s)) return "om " + s.replace(".", ":");
    return s;
  }
  // Tweede regel van een rij: rubrieknaam, tijd als die er is, gebied als het niet heel Frankrijk is.
  function rijMeta(item) {
    var delen = [item.rubriekNaam];
    var t = tijdTekst(item.tijd);
    if (t) delen.push(t);
    if (item.gebied && item.gebied.toLowerCase() !== "heel frankrijk") delen.push(item.gebied);
    return delen.filter(Boolean).join(" · ");
  }
  function periodeTekst(v) {
    if (!v) return "";
    if (v.van === v.tot) return datumWoorden(v.van, true);
    return "Van " + dagMaand(v.van, v.van.slice(0, 4) !== v.tot.slice(0, 4)) + " tot en met " + dagMaand(v.tot, true);
  }
  // Het voorkomen dat bij het item hoort: het eerste dat nog loopt of komt, anders het laatste.
  function eerstVolgende(item, vandaag) {
    var l = item.voorkomens;
    for (var i = 0; i < l.length; i++) if (l[i].tot >= vandaag) return l[i];
    return l[l.length - 1];
  }
  // Regel bij het item: datum of periode in woorden, plus de tijd.
  function datumRegel(item, vandaag) {
    var v = eerstVolgende(item, vandaag), t = tijdTekst(item.tijd), p = periodeTekst(v);
    return t ? p + " · " + t : p;
  }
  // Latere dagen van een herhalend item ("Daarna ook op ..."), alleen losse dagen, hooguit vier.
  function laterRegel(item, vandaag) {
    var v = eerstVolgende(item, vandaag), rest = item.voorkomens.filter(function (x) { return x.van === x.tot && x.van > v.van && x.tot >= vandaag; });
    if (!rest.length || v.van !== v.tot) return "";
    var dagen = rest.slice(0, 4).map(function (x) { return datumWoorden(x.van, false); });
    return "Daarna ook op " + dagen.join(", ") + (rest.length > 4 ? " en later" : "");
  }
  function alineas(t) {
    return tekst(t).split(/\n{2,}/).map(schoon).filter(Boolean);
  }
  function wieTekst(item) { return item.doelgroepen.map(wieNaam); }
  function gebiedItem(item) { return item.gebied && item.gebied.toLowerCase() !== "heel frankrijk" ? item.gebied : ""; }
  // "Lees meer op <hostnaam> ↗"
  function leesMeerTekst(link) { var h = hostnaam(link); return h ? "Lees meer op " + h + " ↗" : ""; }
  function isInfofrankrijk(link) { var h = hostnaam(link); return h === "infofrankrijk.com"; }
  function bronRegel(item) { return item.bron && item.bron.gecontroleerd ? "Gecontroleerd op " + ddmmjjjj(item.bron.gecontroleerd) : ""; }
  // Tekst voor het forumblad: titel, korte samenvatting, link van het item of de bron.
  function forumDelen(item) {
    var a = item.aanzet;
    return { titel: (a && a.titel) || item.titel, samenvatting: (a && a.tekst) || eersteZin(item.tekst), link: item.link || (item.bron && item.bron.url) || "" };
  }
  // Abonnementen: per rubriek een link, en "Alles".
  function icalLijst(rubrieken, items) {
    var uit = [], gedaan = {};
    (rubrieken || []).forEach(function (r) { gedaan[r.id] = true; uit.push({ id: r.id, naam: r.naam, url: icalUrl(r.id) }); });
    (items || []).forEach(function (i) { if (i.rubriek && !gedaan[i.rubriek] && icalUrl(i.rubriek)) { gedaan[i.rubriek] = true; uit.push({ id: i.rubriek, naam: i.rubriekNaam || i.rubriek, url: icalUrl(i.rubriek) }); } });
    return [{ id: "alles", naam: "Alles", url: icalUrl("alles") }].concat(uit);
  }

  var api = {
    BASIS: BASIS, TIMEOUT_MS: TIMEOUT_MS, VENSTER_DAGEN: VENSTER_DAGEN, TUSSENTIJD_MS: TUSSENTIJD_MS, MAX_BAND: MAX_BAND, REGEL_MAX: REGEL_MAX,
    FOUT: FOUT, LEEG_DAG: LEEG_DAG, TOON_ALLES: TOON_ALLES, ABO_VRAAG: ABO_VRAAG, ABO_KNOP: ABO_KNOP, WEG: WEG, ABO_UITLEG: ABO_UITLEG, ABO_ALLES: ABO_ALLES,
    ABO_RUBRIEK: ABO_RUBRIEK, WEEK_NAMEN: WEEK_NAMEN, KORT: KORT, korteNaam: korteNaam,
    schoon: schoon, idSchoon: idSchoon, https: https, hostnaam: hostnaam, isoVan: isoVan, plusDagen: plusDagen, dagMaand: dagMaand, datumWoorden: datumWoorden,
    datumKop: datumKop, ddmmjjjj: ddmmjjjj, vandaagUrl: vandaagUrl, itemsUrl: itemsUrl, rubriekenUrl: rubriekenUrl, beeldUrl: beeldUrl, icalUrl: icalUrl,
    voorvoegsel: voorvoegsel, datumUitKop: datumUitKop, eersteZin: eersteZin, bandTekst: bandTekst, bandRegels: bandRegels,
    leesRubrieken: leesRubrieken, leesItems: leesItems, filterItems: filterItems, rubriekChips: rubriekChips, wieNaam: wieNaam, kleurVan: kleurVan,
    maandNaam: maandNaam, weekStart: weekStart, weekBereik: weekBereik, maandBereik: maandBereik, maandRaster: maandRaster, bereikVan: bereikVan,
    verschuif: verschuif, periodeTitel: periodeTitel, kopDag: kopDag, perDag: perDag, loopt: loopt, stippen: stippen, legenda: legenda,
    aanvulling: aanvulling, aanvullingBereik: aanvullingBereik, titelGrootte: titelGrootte, periodeTitelKop: periodeTitelKop, AANV_MAX: AANV_MAX, kortBereik: kortBereik,
    itemsTekst: itemsTekst, dagLabel: dagLabel, leegTekst: leegTekst, voegSamen: voegSamen, gedekt: gedekt, ophaalVenster: ophaalVenster, startVenster: startVenster,
    tijdTekst: tijdTekst, rijMeta: rijMeta, periodeTekst: periodeTekst,
    eerstVolgende: eerstVolgende, datumRegel: datumRegel, laterRegel: laterRegel, alineas: alineas, wieTekst: wieTekst, gebiedItem: gebiedItem,
    leesMeerTekst: leesMeerTekst, isInfofrankrijk: isInfofrankrijk, bronRegel: bronRegel, forumDelen: forumDelen, icalLijst: icalLijst
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.IfKal = api;
})(typeof window !== "undefined" ? window : globalThis);
