// La Maison: validatie van het JSON dat if-plek.vercel.app publiceert (zie themas[wonen].bron in
// modules.json). Gewone JavaScript, geen buildstap: index.html laadt dit bestand met een script-tag
// en de tests laden het met require. Geeft nooit een uitzondering: een onverwachte vorm levert
// {ok:false, fout:"..."} op, zodat de app een nette melding toont in plaats van een lege pagina.
(function (root) {
  var IDS = ["kopen", "kosten", "verkopen", "wonen"];
  var tekst = function (v) { return typeof v === "string" && v.trim().length > 0; };
  // Een pad is "/iets/": begint en eindigt met een schuine streep, geen protocol, geen dubbele streep.
  var padOk = function (p) { return typeof p === "string" && /^\/[^\s:?#]*\/$/.test(p) && p.indexOf("//") === -1; };

  function artikel(a) {
    if (!a || typeof a !== "object" || !tekst(a.titel)) return null;
    if (a.later === true) return { titel: a.titel.trim(), later: true, pad: "" };
    if (!padOk(a.pad)) return null;
    return { titel: a.titel.trim(), later: false, pad: a.pad };
  }
  function artikelen(lijst) {
    if (!Array.isArray(lijst)) return null;
    var uit = [];
    for (var i = 0; i < lijst.length; i++) { var a = artikel(lijst[i]); if (!a) return null; uit.push(a); }
    return uit;
  }
  // d: het ruwe JSON. Resultaat {ok:true, delen:[{id,naam,fasen|null,artikelen|null}]} of {ok:false, fout}.
  function lamaisonValideer(d) {
    if (!Array.isArray(d)) return { ok: false, fout: "geen lijst" };
    var delen = [];
    for (var i = 0; i < IDS.length; i++) {
      var del = d.filter(function (x) { return x && x.id === IDS[i]; })[0];
      if (!del || !tekst(del.naam)) return { ok: false, fout: "deel ontbreekt: " + IDS[i] };
      if (IDS[i] === "kopen") {
        if (!Array.isArray(del.fasen) || del.fasen.length === 0) return { ok: false, fout: "fasen ontbreken" };
        var fasen = [];
        for (var j = 0; j < del.fasen.length; j++) {
          var f = del.fasen[j], arts = f && artikelen(f.artikelen);
          if (!f || typeof f.nr !== "number" || !tekst(f.titel) || !arts) return { ok: false, fout: "fase " + (j + 1) + " onbruikbaar" };
          fasen.push({ nr: f.nr, titel: f.titel.trim(), anker: (typeof f.anker === "string" && /^#[A-Za-z0-9_-]+$/.test(f.anker)) ? f.anker : "", artikelen: arts });
        }
        delen.push({ id: "kopen", naam: del.naam.trim(), fasen: fasen, artikelen: null });
      } else {
        var lijst = artikelen(del.artikelen);
        if (!lijst) return { ok: false, fout: "artikelen onbruikbaar in " + IDS[i] };
        delen.push({ id: IDS[i], naam: del.naam.trim(), fasen: null, artikelen: lijst });
      }
    }
    return { ok: true, delen: delen };
  }
  function lamaisonUrl(site, pad) { return String(site || "").replace(/\/+$/, "") + pad; }

  root.lamaisonValideer = lamaisonValideer;
  root.lamaisonUrl = lamaisonUrl;
  if (typeof module !== "undefined" && module.exports) module.exports = { lamaisonValideer: lamaisonValideer, lamaisonUrl: lamaisonUrl };
})(typeof window !== "undefined" ? window : globalThis);
