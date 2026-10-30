// Klusarchief: pure logica zonder DOM (browser: window.IfKa; tests: require).
// Bron: het oude klusforum van Infofrankrijk (2012 tot 2020, alle namen verzonnen), alleen lezen via een Supabase-functie.
// De basis-URL staat op één plek: BASIS. Alles hieronder bouwt daarop.
(function (root) {
  var BASIS = "https://mqkhfyvrizgmmmcbdkxh.supabase.co/functions/v1/klusarchief";
  var TERUGVAL_URL = "https://infofrankrijk.com/klussen/";
  var MAIL = "info@communitiesabroad.com";
  var MIN_TEKENS = 2, MAX_TEKENS = 120, PER_PAGINA = 10, TIMEOUT_MS = 10000;
  var PRIVACY = "Om privacyredenen zijn alle namen in dit archief verzonnen.";
  var WAARSCHUWING = "Advies uit 2012 tot 2020. Regels, bedragen en normen kunnen verouderd zijn, controleer ze bij de officiële bron.";
  var TIP_FRANS = "Tip: zoek ook op Franse woorden, bijvoorbeeld fosse septique of assainissement.";
  var LEEG_TIPS = ["Controleer de spelling.", "Probeer een korter of ander woord.", "Zoek ook op het Franse woord, bijvoorbeeld fosse septique."];
  var VOORBEELDEN = ["septic tank", "afvoer", "dak", "houtkachel", "elektra", "tuin"];

  function tekst(x) { return typeof x === "string" ? x : ""; }
  function schoon(x) { return tekst(x).replace(/\s+/g, " ").trim(); }

  // Zoekterm voor de aanvraag: spaties samengevoegd, op 120 tekens afgekapt. Korter dan 2 tekens geeft "".
  function termSchoon(q) {
    var t = schoon(q);
    if (t.length > MAX_TEKENS) t = t.slice(0, MAX_TEKENS).trim();
    return t.length >= MIN_TEKENS ? t : "";
  }
  function pagina(p) { var n = Math.floor(Number(p)); return isFinite(n) && n > 0 ? n : 0; }

  var BRONNEN = ["alles", "forum", "nlfr"];
  var NLFR_VOOR = "https://www.nederlanders.fr/";
  function bronSchoon(b) { return BRONNEN.indexOf(b) >= 0 ? b : "alles"; }
  function zoekUrl(q, p, bron) {
    var t = termSchoon(q);
    if (!t) return null;
    return BASIS + "?q=" + encodeURIComponent(t) + "&p=" + pagina(p) + "&bron=" + bronSchoon(bron);
  }
  // Een id is een getal of een korte veilige tekst; alles anders geeft null (nooit een vrije URL).
  function idSchoon(id) {
    if (typeof id === "number" && isFinite(id) && id >= 0 && Math.floor(id) === id) return String(id);
    if (typeof id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(id)) return id;
    return null;
  }
  function draadUrl(id) {
    var i = idSchoon(id);
    return i === null ? null : BASIS + "?id=" + encodeURIComponent(i);
  }
  // Lichaam van de melding. De reden is vast; er gaat niets van de lezer mee.
  function meldBody(id) {
    var i = idSchoon(id);
    return i === null ? null : JSON.stringify({ id: /^\d+$/.test(i) ? Number(i) : i, reden: "naam of persoonsgegeven" });
  }

  // Wat een antwoord betekent. status = HTTP-status (0 bij een netwerkfout), data = het JSON-antwoord of null.
  function soortAntwoord(status, data) {
    if (status === 404) return "weg";
    if (status === 429 || (data && data.fout === "druk")) return "druk";
    if (status === 400 || (data && data.fout === "kort")) return "kort";
    if (status >= 200 && status < 300 && data && data.ok === true) return "ok";
    return "fout";
  }

  function geheel(n, terugval) { var x = Number(n); return isFinite(x) && x >= 0 ? Math.floor(x) : terugval; }
  function jaarVan(j, datum) {
    var x = Number(j);
    if (isFinite(x) && x >= 1990 && x <= 2100) return Math.floor(x);
    var m = /^(\d{4})/.exec(tekst(datum));
    return m ? Number(m[1]) : null;
  }

  // Antwoord van de zoekactie naar {totaal, pagina, perPagina, resultaten} of null. Een resultaat zonder id of titel valt af.
  function leesZoek(data) {
    if (!data || typeof data !== "object" || data.ok !== true || !Array.isArray(data.resultaten)) return null;
    var res = [];
    data.resultaten.forEach(function (x) {
      if (!x || typeof x !== "object") return;
      var titel = schoon(x.titel);
      if (x.bron === "nlfr") {
        var url = tekst(x.url).trim();
        if (!titel || url.indexOf(NLFR_VOOR) !== 0 || url.length <= NLFR_VOOR.length || /\s/.test(url)) return;
        res.push({ bron: "nlfr", id: "nlfr:" + url, url: url, titel: titel, jaar: jaarVan(x.jaar, x.datum), forum: "Nederlanders.fr",
          antwoorden: geheel(x.antwoorden, 0), fragment: "" });
        return;
      }
      var id = idSchoon(x.id);
      if (id === null || !titel) return;
      res.push({ bron: "forum", id: id, titel: titel, jaar: jaarVan(x.jaar, x.datum), forum: schoon(x.forum),
        antwoorden: geheel(x.antwoorden, 0), fragment: tekst(x.fragment) });
    });
    var perPagina = geheel(data.perPagina, PER_PAGINA) || PER_PAGINA;
    return { totaal: Math.max(geheel(data.totaal, res.length), res.length), pagina: geheel(data.pagina, 0), perPagina: perPagina, resultaten: res };
  }

  // Antwoord van de draadactie naar een draad of null. Zonder id of titel bestaat de draad niet.
  function leesDraad(data) {
    if (!data || typeof data !== "object" || data.ok !== true || !data.draad || typeof data.draad !== "object") return null;
    var d = data.draad, id = idSchoon(d.id), titel = schoon(d.titel);
    if (id === null || !titel) return null;
    var reacties = [];
    (Array.isArray(d.antwoorden) ? d.antwoorden : []).forEach(function (a) {
      if (!a || typeof a !== "object") return;
      var t = tekst(a.tekst);
      if (!t.trim()) return;
      reacties.push({ datum: datumTekst(a.datum), tekst: t });
    });
    return { id: id, titel: titel, jaar: jaarVan(d.jaar, d.datum), datum: datumTekst(d.datum), forum: schoon(d.forum), tekst: tekst(d.tekst), antwoorden: reacties };
  }

  // Fragment met [[treffer]] naar segmenten [{t, vet}]. Alleen tekst: de aanroeper zet er nooit HTML van te maken.
  // Ontbrekende of ongebalanceerde haken: de haken verdwijnen, de tekst blijft. Een [[ zonder ]] maakt niets vet.
  function segmenten(fragment) {
    var s = schoon(fragment).replace(/\[\[(?![\s\S]*\]\])/g, "");  // [[ zonder sluithaken erna: weg
    var uit = [], i = 0, vet = false, buf = "";
    function leeg() { if (buf) { var l = uit[uit.length - 1]; if (l && l.vet === vet) l.t += buf; else uit.push({ t: buf, vet: vet }); buf = ""; } }
    while (i < s.length) {
      var twee = s.substr(i, 2);
      if (twee === "[[") { if (!vet) { leeg(); vet = true; } i += 2; continue; }   // een tweede [[ binnen een treffer verdwijnt
      if (twee === "]]") { if (vet) { leeg(); vet = false; } i += 2; continue; }   // ]] zonder [[ verdwijnt
      buf += s.charAt(i); i++;
    }
    leeg();
    return uit.filter(function (x) { return x.t; });
  }

  // "2014-03-05" of "2014-03-05T10:00:00Z" naar "05-03-2014"; iets anders geeft "".
  function datumTekst(d) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(tekst(d).trim());
    return m ? m[3] + "-" + m[2] + "-" + m[1] : "";
  }
  function reactiesTekst(n) {
    var x = geheel(n, 0);
    return x === 1 ? "1 reactie" : x + " reacties";
  }
  // Regel van een Nederlanders.fr-kaart: "2023 · 14 reacties"; bij 0 reacties alleen het jaar (of niets).
  function nlfrMeta(r) {
    var delen = [];
    if (r && r.jaar) delen.push(String(r.jaar));
    if (r && geheel(r.antwoorden, 0) > 0) delen.push(reactiesTekst(r.antwoorden));
    return delen.join(" · ");
  }
  // "2014 · 7 reacties" ("2014 · 1 reactie"); zonder jaar alleen het aantal.
  function metaRegel(r) {
    var delen = [];
    if (r && r.jaar) delen.push(String(r.jaar));
    delen.push(reactiesTekst(r ? r.antwoorden : 0));
    return delen.join(" · ");
  }
  // "2014 · Bouwen, verbouwen en klussen in Frankrijk"
  function jaarForum(d) {
    var delen = [];
    if (d && d.jaar) delen.push(String(d.jaar));
    if (d && d.forum) delen.push(d.forum);
    return delen.join(" · ");
  }
  // Platte tekst naar alinea's: op witregels gesplitst, enkele regeleinden blijven als regeleinde binnen de alinea (\n).
  function alineas(t) {
    return tekst(t).replace(/\r\n?/g, "\n").split(/\n\s*\n/).map(function (a) { return a.replace(/[ \t]+\n/g, "\n").trim(); }).filter(Boolean);
  }

  function nogOver(totaal, getoond) { return Math.max(0, geheel(totaal, 0) - geheel(getoond, 0)); }
  function meerTekst(totaal, getoond) { return "Toon meer (nog " + nogOver(totaal, getoond) + ")"; }
  // Regel boven de resultaten; alleen uit de data van het antwoord.
  // Met `getoond` (aantal kaarten onder de regel) en meer treffers dan kaarten: "35 draden gevonden, de eerste 10 hieronder".
  function telTekst(totaal, getoond) {
    var n = geheel(totaal, 0), g = getoond == null ? n : geheel(getoond, 0);
    var basis = n === 1 ? "1 resultaat gevonden" : n + " resultaten gevonden";
    return g > 0 && g < n ? basis + ", de eerste " + g + " hieronder" : basis;
  }
  // Kopje boven de reacties van een draad: "Reacties (7)".
  function reactiesKop(n) { return "Reacties (" + geheel(n, 0) + ")"; }
  // Hash van een geopende draad: alleen cijfers, anders null.
  function draadHashId(id) { var i = idSchoon(id); return i !== null && /^\d+$/.test(i) ? i : null; }

  // Voeg een volgende pagina aan de lijst toe; een id dat er al staat wordt overgeslagen.
  function voegToe(lijst, extra) {
    var gezien = {}, uit = [];
    (lijst || []).concat(extra || []).forEach(function (x) { if (x && !gezien[x.id]) { gezien[x.id] = true; uit.push(x); } });
    return uit;
  }

  // ---- Vraag het archief (chat): antwoord uitsluitend uit gevonden draden, met bron. Niets wordt bewaard. ----
  var CHAT_URL = BASIS + "-chat";
  var CHAT_MIN = 5, CHAT_MAX = 300, CHAT_ANTW_MAX = 1500, CHAT_MAX_VRAGEN = 4, CHAT_TIMEOUT_MS = 45000, CHAT_STATUS_MS = 5000;
  var CHAT_UITLEG = "Stel een vraag over klussen of verbouwen. Het antwoord komt alleen uit oude forumdraden van 2012 tot 2020, met bron, en kan verouderd zijn.";
  var CHAT_PRIVACY = "Uw vraag gaat naar Claude van Anthropic om het antwoord te schrijven. Vul geen namen of adressen in.";
  var CHAT_PLAATSHOUDER = "Bijvoorbeeld: mag ik zelf mijn septic tank vervangen?";
  var CHAT_DRUK = "Het archief krijgt nu veel vragen. Probeer het later opnieuw of zoek zelf hieronder.";
  var CHAT_FOUT = "Het antwoord lukte niet. Zoek zelf hieronder of probeer het opnieuw.";

  // Vraag voor de aanvraag: spaties samengevoegd, op 300 tekens afgekapt; korter dan 5 tekens geeft "".
  function chatVraagSchoon(v) {
    var t = schoon(v);
    if (t.length > CHAT_MAX) t = t.slice(0, CHAT_MAX).trim();
    return t.length >= CHAT_MIN ? t : "";
  }
  // POST-lichaam; vorige = {vraag, antwoord} van de laatste uitwisseling (antwoord op 1500 tekens). Zonder geldige vraag: null.
  function chatBody(vraag, vorige) {
    var v = chatVraagSchoon(vraag);
    if (!v) return null;
    var o = { vraag: v };
    if (vorige && typeof vorige === "object") {
      var vv = chatVraagSchoon(vorige.vraag), aa = tekst(vorige.antwoord).trim().slice(0, CHAT_ANTW_MAX);
      if (vv && aa) o.vorige = { vraag: vv, antwoord: aa };
    }
    o.web = "";
    return JSON.stringify(o);
  }
  // Status-antwoord (GET): alleen aan:true schakelt de chat in.
  function chatAan(data) { return !!data && typeof data === "object" && data.ok === true && data.aan === true; }
  // ok | druk | uit | fout. 403 en 503 "uit": de chat verbergt zich.
  function chatSoort(status, data) {
    var f = data && typeof data === "object" ? data.fout : "";
    if (status === 403 || f === "herkomst") return "uit";
    if (status === 503) return f === "uit" ? "uit" : "druk";
    if (status === 429 || f === "druk") return "druk";
    if (status >= 200 && status < 300 && data && data.ok === true) return "ok";
    return "fout";
  }
  function nlfrUrlGeldig(u) {
    var url = tekst(u).trim();
    return url.indexOf(NLFR_VOOR) === 0 && url.length > NLFR_VOOR.length && !/\s/.test(url) ? url : "";
  }
  // Antwoord (POST) naar {antwoord, bronnen:[{n,id,titel,jaar}], nlfr:[{titel,jaar,antwoorden,url}]} of null.
  // Bronnen zonder bruikbaar id of titel vallen af, nlfr alleen met een https-adres op www.nederlanders.fr.
  function leesChat(data) {
    if (!data || typeof data !== "object" || data.ok !== true) return null;
    var antwoord = tekst(data.antwoord).trim();
    if (!antwoord) return null;
    var bronnen = [], gezien = {};
    (Array.isArray(data.bronnen) ? data.bronnen : []).forEach(function (b) {
      if (!b || typeof b !== "object") return;
      var n = Number(b.n), id = idSchoon(b.id), titel = schoon(b.titel);
      if (!isFinite(n) || n < 1 || Math.floor(n) !== n || id === null || !titel || gezien[n]) return;
      gezien[n] = true;
      bronnen.push({ n: n, id: id, titel: titel, jaar: jaarVan(b.jaar, "") });
    });
    var nlfr = [];
    (Array.isArray(data.nlfr) ? data.nlfr : []).forEach(function (x) {
      if (!x || typeof x !== "object") return;
      var titel = schoon(x.titel), url = nlfrUrlGeldig(x.url);
      if (!titel || !url) return;
      nlfr.push({ titel: titel, jaar: jaarVan(x.jaar, ""), antwoorden: geheel(x.antwoorden, 0), url: url });
    });
    return { antwoord: antwoord, bronnen: bronnen, nlfr: nlfr };
  }
  // Tekst naar segmenten [{t}] en [{bron:true, n, id, titel}]. Een [n] zonder bron blijft kale tekst. Nooit HTML.
  function chatSegmenten(t, bronnen) {
    var per = {};
    (bronnen || []).forEach(function (b) { per[b.n] = b; });
    var delen = tekst(t).split(/(\[\d{1,3}\])/), uit = [];
    delen.forEach(function (d) {
      if (!d) return;
      var m = /^\[(\d{1,3})\]$/.exec(d), b = m ? per[Number(m[1])] : null;
      if (b) { uit.push({ bron: true, n: b.n, id: b.id, titel: b.titel }); return; }
      var l = uit[uit.length - 1];
      if (l && !l.bron) l.t += d; else uit.push({ t: d });
    });
    return uit;
  }
  // Antwoord in alinea's, elke alinea in segmenten.
  function chatAlineas(t, bronnen) {
    return alineas(t).map(function (a) { return chatSegmenten(a, bronnen); });
  }
  function chatTeller(n) { return geheel(n, 0) + " van " + CHAT_MAX; }

  var api = { BASIS: BASIS, TERUGVAL_URL: TERUGVAL_URL, MAIL: MAIL, MIN_TEKENS: MIN_TEKENS, MAX_TEKENS: MAX_TEKENS, PER_PAGINA: PER_PAGINA, TIMEOUT_MS: TIMEOUT_MS,
    PRIVACY: PRIVACY, TIP_FRANS: TIP_FRANS, LEEG_TIPS: LEEG_TIPS, reactiesKop: reactiesKop, draadHashId: draadHashId, WAARSCHUWING: WAARSCHUWING, VOORBEELDEN: VOORBEELDEN,
    BRONNEN: BRONNEN, bronSchoon: bronSchoon, nlfrMeta: nlfrMeta, NLFR_LABEL: "Nederlanders.fr", FORUM_LABEL: "Oud forum",
    termSchoon: termSchoon, zoekUrl: zoekUrl, idSchoon: idSchoon, draadUrl: draadUrl, meldBody: meldBody, soortAntwoord: soortAntwoord,
    leesZoek: leesZoek, leesDraad: leesDraad, segmenten: segmenten, datumTekst: datumTekst, reactiesTekst: reactiesTekst, metaRegel: metaRegel,
    CHAT_URL: CHAT_URL, CHAT_MIN: CHAT_MIN, CHAT_MAX: CHAT_MAX, CHAT_ANTW_MAX: CHAT_ANTW_MAX, CHAT_MAX_VRAGEN: CHAT_MAX_VRAGEN, CHAT_TIMEOUT_MS: CHAT_TIMEOUT_MS, CHAT_STATUS_MS: CHAT_STATUS_MS,
    CHAT_UITLEG: CHAT_UITLEG, CHAT_PRIVACY: CHAT_PRIVACY, CHAT_PLAATSHOUDER: CHAT_PLAATSHOUDER, CHAT_DRUK: CHAT_DRUK, CHAT_FOUT: CHAT_FOUT,
    chatVraagSchoon: chatVraagSchoon, chatBody: chatBody, chatAan: chatAan, chatSoort: chatSoort, leesChat: leesChat, chatSegmenten: chatSegmenten, chatAlineas: chatAlineas, chatTeller: chatTeller,
    jaarForum: jaarForum, alineas: alineas, nogOver: nogOver, meerTekst: meerTekst, telTekst: telTekst, voegToe: voegToe };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.IfKa = api;
})(typeof window !== "undefined" ? window : globalThis);
