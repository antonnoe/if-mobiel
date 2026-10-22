// Ondernemen: validatie van het JSON dat if-plek.vercel.app publiceert (zie themas[ondernemen].bron
// in modules.json). Gewone JavaScript, geen buildstap: index.html laadt dit bestand met een
// script-tag en de tests laden het met require. Geeft nooit een uitzondering: een onverwachte vorm
// levert {ok:false, fout:"..."} op, zodat de app een nette melding toont in plaats van een lege pagina.
(function (root) {
  var tekst = function (v) { return typeof v === "string" && v.trim().length > 0; };
  // Een pad is "/iets/": begint en eindigt met een schuine streep, geen protocol, geen dubbele streep.
  var padOk = function (p) { return typeof p === "string" && /^\/[^\s:?#]*\/$/.test(p) && p.indexOf("//") === -1; };
  var urlOk = function (u) { return typeof u === "string" && /^https:\/\/[^\s\/]+\.[^\s\/]+(\/\S*)?$/.test(u); };
  var idOk = function (v) { return typeof v === "string" && /^[a-z0-9_-]+$/.test(v); };

  function item(x) {
    if (!x || typeof x !== "object" || !tekst(x.titel)) return null;
    var ook = [];
    if (x.ook !== undefined) {
      if (!Array.isArray(x.ook)) return null;
      for (var i = 0; i < x.ook.length; i++) { if (!idOk(x.ook[i])) return null; ook.push(x.ook[i]); }
    }
    var uit = { titel: x.titel.trim(), soort: x.soort, pad: "", url: "", module: "", later: false, ook: ook };
    if (x.soort === "tool") {
      if (!idOk(x.module)) return null;
      uit.module = x.module;
      return uit;
    }
    if (x.soort !== "artikel") return null;
    if (x.later === true) { uit.later = true; return uit; }
    if (padOk(x.pad)) uit.pad = x.pad;
    else if (urlOk(x.url)) uit.url = x.url;
    else return null;
    return uit;
  }
  // d: het ruwe JSON. Resultaat {ok:true, stappen:[{nr,titel,items}]} of {ok:false, fout}.
  function ondernemenValideer(d) {
    if (!d || typeof d !== "object" || !Array.isArray(d.stappen) || d.stappen.length === 0) return { ok: false, fout: "stappen ontbreken" };
    var stappen = [];
    for (var j = 0; j < d.stappen.length; j++) {
      var s = d.stappen[j];
      if (!s || !tekst(s.titel) || !Array.isArray(s.items) || s.items.length === 0) return { ok: false, fout: "stap " + (j + 1) + " onbruikbaar" };
      var items = [];
      for (var k = 0; k < s.items.length; k++) {
        var it = item(s.items[k]);
        if (!it) return { ok: false, fout: "item " + (k + 1) + " in stap " + (j + 1) + " onbruikbaar" };
        items.push(it);
      }
      stappen.push({ nr: j + 1, titel: s.titel.trim(), items: items });
    }
    return { ok: true, stappen: stappen };
  }
  function ondernemenUrl(site, it) {
    if (!it) return "";
    if (it.url) return it.url;
    if (it.pad) return String(site || "").replace(/\/+$/, "") + it.pad;
    return "";
  }
  // Items die ook bij een ander thema horen (bijvoorbeeld "wonen"), uit een gevalideerde lijst stappen.
  function ondernemenOok(stappen, themaId) {
    var uit = [];
    (stappen || []).forEach(function (s) { s.items.forEach(function (it) { if (it.ook.indexOf(themaId) !== -1) uit.push(it); }); });
    return uit;
  }

  root.ondernemenValideer = ondernemenValideer;
  root.ondernemenUrl = ondernemenUrl;
  root.ondernemenOok = ondernemenOok;
  if (typeof module !== "undefined" && module.exports) module.exports = { ondernemenValideer: ondernemenValideer, ondernemenUrl: ondernemenUrl, ondernemenOok: ondernemenOok };
})(typeof window !== "undefined" ? window : globalThis);
