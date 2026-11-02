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
  var UITLEG = "Data die ertoe doen voor Nederlanders en Belgen in Frankrijk. Alleen wat we tegen de bron hebben gecontroleerd.";
  var FOUT = "De kalender is nu niet bereikbaar.";
  var LEEG = "Niets in deze keuze de komende 120 dagen.";
  var WEG = "Dit item staat niet meer in de kalender.";
  var ABO_UITLEG = "Zet de kalender in uw eigen agenda-app: kies een rubriek of alles. Uw agenda haalt de data zelf op en houdt ze bij.";
  var VOLGORDE_WIE = ["iedereen", "particulier", "ondernemer", "gepensioneerde", "huiseigenaar", "huurder", "gezin", "automobilist", "pas-verhuisd"];

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
        gebied: gebiedTekst(i.gebied), tijd: schoon(i.tijd), tekst: schoon(i.tekst_u || i.tekst), link: https(i.link), bron: bron,
        gesprek: i.gesprek === true, aanzet: aanzet && (aanzet.titel || aanzet.tekst) ? aanzet : null, voorkomens: vk
      });
    });
    return uit;
  }

  // ---- filters ----
  function wieOk(item, wie) {
    if (!wie || !wie.length) return true;
    var g = item.doelgroepen;
    if (!g.length || g.indexOf("iedereen") >= 0) return true;
    return g.some(function (x) { return wie.indexOf(x) >= 0; });
  }
  function filterItems(items, rubriek, wie) {
    return (items || []).filter(function (i) { return (!rubriek || rubriek === "alles" || i.rubriek === rubriek) && wieOk(i, wie); });
  }
  // Items die (deels) in het venster van vandaag tot en met 120 dagen vooruit vallen.
  function inVenster(items, vandaag, dagen) {
    var eind = plusDagen(vandaag, dagen == null ? VENSTER_DAGEN : dagen);
    return (items || []).filter(function (i) { return i.voorkomens.some(function (v) { return v.tot >= vandaag && v.van <= eind; }); });
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
  function wieChips(items) {
    var aanwezig = {};
    (items || []).forEach(function (i) { i.doelgroepen.forEach(function (g) { aanwezig[g] = true; }); });
    var ids = Object.keys(aanwezig), eerst = VOLGORDE_WIE.filter(function (g) { return aanwezig[g]; });
    var rest = ids.filter(function (g) { return VOLGORDE_WIE.indexOf(g) < 0; }).sort();
    return eerst.concat(rest).map(function (g) { return { id: g, naam: wieNaam(g) }; });
  }
  function zetWie(wie, id) {
    var l = (wie || []).slice(), i = l.indexOf(id);
    if (i >= 0) l.splice(i, 1); else l.push(id);
    return l;
  }

  // ---- groeperen per dag ----
  function tijdSleutel(t) { var m = /(\d{1,2})[:.](\d{2})/.exec(tekst(t)); return m ? pad(+m[1]) + ":" + m[2] : ""; }
  // Voorkomen op een enkele dag, of een periode die vandaag of later begint: onder de beginner-dag.
  // Een periode of seizoen die al loopt: onder "Loopt nu". Wat voor het venster of erna valt, blijft weg.
  function groepeer(items, vandaag, dagen) {
    var eind = plusDagen(vandaag, dagen == null ? VENSTER_DAGEN : dagen), lopend = [], perDag = {}, volgnr = 0;
    (items || []).forEach(function (it) {
      it.voorkomens.forEach(function (v) {
        if (v.tot < vandaag || v.van > eind) return;
        var rij = { item: it, van: v.van, tot: v.tot, n: volgnr++ };
        if (v.van === v.tot || v.van >= vandaag) (perDag[v.van] = perDag[v.van] || []).push(rij);
        else lopend.push(rij);
      });
    });
    lopend.sort(function (a, b) { return a.tot < b.tot ? -1 : a.tot > b.tot ? 1 : a.n - b.n; });
    var dagenLijst = Object.keys(perDag).sort().map(function (d) {
      perDag[d].sort(function (a, b) { var x = tijdSleutel(a.item.tijd), y = tijdSleutel(b.item.tijd); return x < y ? -1 : x > y ? 1 : a.n - b.n; });
      return { datum: d, kop: datumKop(d, vandaag), rijen: perDag[d] };
    });
    return { lopend: lopend, dagen: dagenLijst };
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
    UITLEG: UITLEG, FOUT: FOUT, LEEG: LEEG, WEG: WEG, ABO_UITLEG: ABO_UITLEG,
    schoon: schoon, idSchoon: idSchoon, https: https, hostnaam: hostnaam, isoVan: isoVan, plusDagen: plusDagen, dagMaand: dagMaand, datumWoorden: datumWoorden,
    datumKop: datumKop, ddmmjjjj: ddmmjjjj, vandaagUrl: vandaagUrl, itemsUrl: itemsUrl, rubriekenUrl: rubriekenUrl, beeldUrl: beeldUrl, icalUrl: icalUrl,
    voorvoegsel: voorvoegsel, datumUitKop: datumUitKop, eersteZin: eersteZin, bandTekst: bandTekst, bandRegels: bandRegels,
    leesRubrieken: leesRubrieken, leesItems: leesItems, wieOk: wieOk, filterItems: filterItems, inVenster: inVenster, rubriekChips: rubriekChips,
    wieChips: wieChips, wieNaam: wieNaam, zetWie: zetWie, groepeer: groepeer, tijdTekst: tijdTekst, rijMeta: rijMeta, periodeTekst: periodeTekst,
    eerstVolgende: eerstVolgende, datumRegel: datumRegel, laterRegel: laterRegel, alineas: alineas, wieTekst: wieTekst, gebiedItem: gebiedItem,
    leesMeerTekst: leesMeerTekst, isInfofrankrijk: isInfofrankrijk, bronRegel: bronRegel, forumDelen: forumDelen, icalLijst: icalLijst
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.IfKal = api;
})(typeof window !== "undefined" ? window : globalThis);
