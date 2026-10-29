// Tussenlaag voor "Mijn gemeente" (Vercel-functie, zelfde adres als de app, dus geen CORS).
// Waarom: sommige bronnen laten zich niet vanuit een browser opvragen. Géorisques geeft voor `gaspar/catnat` en `radon` een serverfout bij een
// browser-User-Agent (HTTP/2 INTERNAL_ERROR); de DVF-API van Cerema is een testomgeving die we hier één keer per gemeente per dag ophalen
// in plaats van zes pagina's per bezoeker. Een server stuurt een eerlijke eigen User-Agent; er wordt niets omzeild.
// Veiligheid: geen vrije URL maar een vaste lijst bronnen (`bron`), parameters worden gecontroleerd, de upstream-URL bouwt de gedeelde
// bibliotheek. Alleen GET. Er wordt niets opgeslagen; de hostingdienst bewaart technische logbestanden.
const G = require("../gemeente-lib.js");

const UA = "Infopoche/1.0 (+https://infopoche.fr)";
const BUDGET = 8500;   // totale tijd per aanvraag, ruim binnen de 10 seconden van Vercel
const POGING = 3500;   // maximale tijd per poging
const POGINGEN = 3;    // de DVF-bron geeft zonder reden regelmatig een 503; een nieuwe poging lukt meestal
const CACHE = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
const GEEN_CACHE = "no-store";
const VELDEN_CATNAT = ["libelle_risque_jo", "date_debut_evt", "date_fin_evt"];
const VELDEN_DVF = ["libnatmut", "codtypbien", "valeurfonc", "sbati", "anneemut", "datemut"];

function maak(haal) {
  // Met herhaling: tot POGINGEN pogingen met korte pauze, nooit langer dan het budget (deadline).
  async function json(url, deadline) {
    let laatste;
    for (let i = 0; i < POGINGEN; i++) {
      const rest = deadline - Date.now();
      if (rest < 400) break;
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), Math.min(POGING, rest));
      try {
        const r = await haal(url, { headers: { "User-Agent": UA, "Accept": "application/json" }, signal: ctl.signal });
        if (!r.ok) throw new Error("status " + r.status);
        return await r.json();
      } catch (e) { laatste = e; }
      finally { clearTimeout(t); }
      if (i < POGINGEN - 1) await new Promise(k => setTimeout(k, 250));
    }
    throw laatste || new Error("tijd op");
  }
  const kies = (o, velden) => { const u = {}; velden.forEach(v => { u[v] = o ? o[v] : undefined; }); return u; };

  const bronnen = {
    // alle natuurrampbesluiten van een gemeente (meerdere pagina's), alleen de velden die de app gebruikt
    async catnat(p, dl) {
      if (!G.codeOk(p.code)) return null;
      const eerste = await json(G.catnatUrl(p.code, 1, 100), dl);
      let data = Array.isArray(eerste.data) ? eerste.data.slice() : [];
      const paginas = Math.min(Number(eerste.total_pages) || 1, 5);
      if (paginas > 1) {
        const rest = await Promise.all(Array.from({ length: paginas - 1 }, (_, i) => json(G.catnatUrl(p.code, i + 2, 100), dl).catch(() => null)));
        rest.forEach(r => { if (r && Array.isArray(r.data)) data = data.concat(r.data); });
      }
      return { results: typeof eerste.results === "number" ? eerste.results : data.length, data: data.map(d => kies(d, VELDEN_CATNAT)) };
    },
    async radon(p, dl) { return G.codeOk(p.code) ? json(G.radonUrl(p.code), dl) : null; },
    // DVF: alle pagina's in één antwoord, alleen de velden voor de mediaan
    async dvf(p, dl) {
      const jaar = parseInt(p.jaar, 10);
      if (!G.codeOk(p.code) || !(jaar >= 2015 && jaar <= 2100)) return null;
      const eerste = await json(G.dvfUrl(p.code, jaar, 1), dl);
      if (!eerste || typeof eerste.count !== "number" || !Array.isArray(eerste.results)) throw new Error("vorm");
      const paginas = Math.min(G.DVF_MAX_PAGINA, Math.ceil(eerste.count / G.DVF_PAGE));
      const rest = await Promise.all(Array.from({ length: Math.max(0, paginas - 1) }, (_, i) => json(G.dvfUrl(p.code, jaar, i + 2), dl).catch(() => null)));
      let results = eerste.results.slice();
      rest.forEach(r => { if (r && Array.isArray(r.results)) results = results.concat(r.results); });
      const onvolledig = rest.some(r => !r) || eerste.count > paginas * G.DVF_PAGE;
      return { count: eerste.count, onvolledig, results: results.map(r => kies(r, VELDEN_DVF)) };
    }
  };

  return async function handler(req, res) {
    const stuur = (status, body, cache) => {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", cache || GEEN_CACHE);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.end(JSON.stringify(body));
    };
    if (req.method !== "GET") { res.setHeader("Allow", "GET"); return stuur(405, { fout: "alleen GET" }); }
    let p;
    try { p = Object.fromEntries(new URL(req.url, "https://x.invalid").searchParams); } catch (e) { return stuur(400, { fout: "ongeldige aanvraag" }); }
    const bron = Object.prototype.hasOwnProperty.call(bronnen, p.bron) ? bronnen[p.bron] : null;
    if (!bron) return stuur(400, { fout: "onbekende bron" });
    try {
      const uit = await bron(p, Date.now() + BUDGET);
      if (uit === null) return stuur(400, { fout: "ongeldige parameters" });
      return stuur(200, uit, CACHE);
    } catch (e) {
      return stuur(502, { fout: "bron niet beschikbaar" });
    }
  };
}

module.exports = maak(globalThis.fetch);
module.exports.maak = maak;
