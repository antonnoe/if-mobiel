// Controle van de waarden in de tool tegen peil/waarden.json, de kopie van de waarden uit Peil (het parameterregister van Communities Abroad).
// Draaien: node tests/peil.test.mjs (geen netwerk, geen afhankelijkheden). Faalt bij elke afwijking.
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const lees = (...p) => fs.readFileSync(path.join(root, ...p), "utf8");
const require = createRequire(import.meta.url);
const WAARDEN = JSON.parse(lees("peil", "waarden.json"));
const PIN = JSON.parse(lees("peil", "engine-hash.json"));
const index = lees("index.html");
const UITLEG_URL = "https://infofrankrijk.com/ons-manifest-hoe-wij-werken/";
const fouten = [];
const fout = (m) => fouten.push(m);
const gelijk = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const nl = (n) => String(n).replace(".", ",");

// ---- engine.js laden: de constanten staan als const, dus ze worden via een hulpregel zichtbaar gemaakt
const engineCode = lees("engine", "engine.js");
const ctx = { Intl, Math, Number, Object, console };
vm.createContext(ctx);
vm.runInContext(engineCode + "\n;this.__W = { PEIL_WAARDEN_STAND, PRIJS_INFO, PRICE_DEFAULTS_USER, KWH_CONVERSION, ENERGY_UNITS, PRIJS_UITLEG, APPARATEN_UITLEG, DEFAULT_APPLIANCES, U_PRESETS, U_UITLEG, computeResults };", ctx);
const W = ctx.__W;
const dpe = require(path.join(root, "engine", "dpe.js"));

// ---- het Peil-blok uit index.html (tussen de markeringen)
const blok = (index.match(/\/\/ PEIL-BLOK-BEGIN\n([\s\S]*?)\/\/ PEIL-BLOK-EIND/) || [])[1];
if (!blok) fout("index.html mist het Peil-blok tussen PEIL-BLOK-BEGIN en PEIL-BLOK-EIND.");
function laadPeil(code) {
  const c = { console };
  vm.createContext(c);
  vm.runInContext(code + "\n;this.__P = { PEIL_STAND, PEIL_LABEL_AAN, PEIL_UITLEG_URL, peilStandNl, peilStandKort, peilAria, peilVoetTekst };", c);
  return c.__P;
}
const P = laadPeil(blok || "");

// ---- 1. Datum en standen
if (!/^\d{4}-\d{2}-\d{2}$/.test(P.PEIL_STAND)) fout(`PEIL_STAND (${P.PEIL_STAND}) is geen datum als JJJJ-MM-DD.`);
if (WAARDEN.stand !== P.PEIL_STAND) fout(`stand in peil/waarden.json is ${WAARDEN.stand}, maar PEIL_STAND in het Peil-blok in index.html is ${P.PEIL_STAND}.`);
if (W.PEIL_WAARDEN_STAND !== WAARDEN.stand) fout(`PEIL_WAARDEN_STAND in engine.js is ${W.PEIL_WAARDEN_STAND}, peil/waarden.json heeft ${WAARDEN.stand}.`);
const perId = new Map((WAARDEN.parameters || []).map((p) => [p.id, p]));
const param = (id) => { const p = perId.get(id); if (!p) fout(`${id} staat niet in peil/waarden.json.`); return p || {}; };

// ---- 2. Primaire-energiefactor elektriciteit, datumafhankelijk
{
  const p = param("p.fr.dpe.primaire_energiefactor_elektriciteit");
  // De kopie bevat de waarde voor 2026 (1,9); de ingang per 1 januari 2027 (1,7) staat in het register als aangekondigde wijziging en niet in de kopie, dus die ligt hieronder vast.
  for (const dag of ["2026-01-01", "2026-12-31"]) if (dpe.dpePefElec(dag) !== p.waarde) fout(`DPE-factor op ${dag}: tool ${dpe.dpePefElec(dag)}, Peil ${p.waarde}.`);
  if (dpe.dpePefElec("2026-12-31") !== 1.9) fout("DPE-factor op 31 december 2026 moet 1,9 zijn.");
  if (dpe.dpePefElec("2027-01-01") !== 1.7) fout("DPE-factor op 1 januari 2027 moet 1,7 zijn.");
  if (p.waarde !== 1.9) fout("peil/waarden.json: de factor voor 2026 moet 1,9 zijn.");
  const huis = { zone: "paris", volume: 250, ach: 0.6, ventType: "natural", wallA: 120, wallU: 0.5, roofA: 100, roofU: 0.25, floorA: 100, floorU: 0.35, winA: 20, winU: 1.6, woonoppervlak: 100, mainType: "elec", dhwType: "elec" };
  const a = dpe.computeDPE({ ...huis, rekendatum: "2026-12-31" });
  const b = dpe.computeDPE({ ...huis, rekendatum: "2027-01-01" });
  // alleen elektriciteit: primaire energie = finale energie x factor
  if (Math.abs(a.energiePrimaire - a.energieFinale * 1.9) > 1e-6) fout("computeDPE op 31-12-2026 rekent niet met factor 1,9.");
  if (Math.abs(b.energiePrimaire - b.energieFinale * 1.7) > 1e-6) fout("computeDPE op 01-01-2027 rekent niet met factor 1,7.");
  if (a.details.pefElec !== 1.9 || b.details.pefElec !== 1.7) fout("details.pefElec toont niet de gebruikte factor.");
  const gas = dpe.computeDPE({ ...huis, mainType: "gas", dhwType: "gas", rekendatum: "2027-01-01" });
  const el = gas.details.finalByCar.elec, gs = gas.details.finalByCar.gas;
  if (Math.abs(gas.energiePrimaire - (el * 1.7 + gs * 1.0)) > 1e-6) fout("Overige energiedragers moeten met factor 1,0 meetellen.");
}

// ---- 3. Klassegrenzen
{
  const p = param("p.fr.dpe.klassegrenzen");
  const e = (p.waarde || {}).energie_kWh_ep_per_m2_per_jaar_bovengrens_exclusief || {};
  const c = (p.waarde || {}).co2_kg_per_m2_per_jaar_bovengrens_exclusief || {};
  for (const k of dpe.DPE_EP_CLASSES) if (k.letter !== "G" && k.max !== e[k.letter]) fout(`DPE-klasse ${k.letter} energie: tool ${k.max}, Peil ${e[k.letter]}.`);
  for (const k of dpe.DPE_GES_CLASSES) if (k.letter !== "G" && k.max !== c[k.letter]) fout(`DPE-klasse ${k.letter} CO2: tool ${k.max}, Peil ${c[k.letter]}.`);
}

// ---- 4. Elektriciteitsprijs (TRVE) overal gelijk aan Peil
{
  const p = param("p.fr.energie.prijs_elektriciteit_trve");
  const abx = (kva) => ((new RegExp(kva + " kVA (\\d+,\\d+)").exec(p.waarde_weergave || "") || [])[1]); // abonnement per jaar uit waarde_weergave, bijv. "3 kVA 145,76"
  const ab = { "3_kva": abx(3), "6_kva": abx(6) };
  if (!ab["3_kva"] || !ab["6_kva"]) fout("waarde_weergave van de elektriciteitsprijs noemt het abonnement voor 3 en 6 kVA niet.");
  if (p.status) fout("De elektriciteitsprijs moet in Peil vastgesteld zijn (geen status in de kopie), nu " + p.status + ".");
  if (W.PRIJS_INFO.elec.waarde !== p.waarde) fout(`Elektriciteitsprijs in PRIJS_INFO: ${W.PRIJS_INFO.elec.waarde}, Peil ${p.waarde}.`);
  if (W.PRICE_DEFAULTS_USER.elec !== p.waarde) fout(`PRICE_DEFAULTS_USER.elec: ${W.PRICE_DEFAULTS_USER.elec}, Peil ${p.waarde}.`);
  if (W.PRIJS_INFO.elec.status !== "vastgesteld") fout("Elektriciteitsprijs moet als vastgesteld zijn gemarkeerd.");
  const t = W.PRIJS_INFO.elec.toelichting;
  if (!t.includes(nl(ab["3_kva"])) || !t.includes(nl(ab["6_kva"]))) fout("De uitleg bij de elektriciteitsprijs noemt het abonnement niet met de bedragen uit Peil.");
  if (!/komt er los bij/.test(W.PRIJS_UITLEG + W.PRIJS_INFO.elec.toelichting)) fout("De uitleg moet zeggen dat het abonnement er los bij komt.");
  for (const k of Object.keys(W.PRIJS_INFO)) {
    if (W.PRICE_DEFAULTS_USER[k] !== W.PRIJS_INFO[k].waarde) fout(`PRICE_DEFAULTS_USER.${k} wijkt af van PRIJS_INFO.`);
  }
  if (/0\.25\b|0\.194\b/.test(W.PRIJS_UITLEG) || /elec:\s*0\.25\b/.test(engineCode)) fout("De oude elektriciteitsprijs (0,25 of 0,194) staat nog in de tool.");
}

// ---- 5. Overige prijzen: aannames met bron en zichtbaar in de tool
{
  // Het register geeft de brandstofprijzen per kWh (hout en pellets per kWh PCI, gas per kWh PCS) of per liter (fioul); de tool rekent met een prijs per eenheid
  // (gas per m3, pellets per kg, hout per stère). De test rekent de toolwaarde terug met de omrekening die de tool zelf gebruikt (KWH_CONVERSION in de tool):
  // toolprijs per kWh = toolwaarde / KWH_CONVERSION[soort], en vergelijkt die met de registerwaarde. Voorbeeld pellets: tool 0,38 euro per kg / 4,6 kWh per kg = 0,0826 euro per kWh, register 0,083.
  // Afrondingsmarge: de tool toont ronde standaardprijzen en rondt de prijs per kWh af op 0,01 euro. De afwijking mag daarom hooguit een halve afrondstap zijn,
  // 0,005 euro per kWh (grens inbegrepen, met 1e-9 voor floating point). Binnen die marge is het een afronding, daarbuiten een echte afwijking die gemeld moet worden.
  // Fioul staat in het register per liter en in de tool ook per liter, zonder omrekening; dezelfde marge van 0,005 euro per liter.
  const MARGE = 0.005 + 1e-9;
  // Gas wordt in Frankrijk per kWh afgerekend. Een prijs per m3 vraagt een omrekenfactor die per netgebied en per maand verschilt; die factor hoort niet in de tool.
  // De prijs is per gefactureerde kWh (PCS); het verbruik rekent de motor in kWh PCI, dus 1 kWh PCS = 1/1,11 kWh PCI (3CL par. 13.2.1.4).
  if (W.ENERGY_UNITS.gas !== "€/kWh" || Math.abs(W.KWH_CONVERSION.gas - 1 / 1.11) > 1e-12) fout(`Gasprijs moet per kWh PCS zijn met omrekening 1/1,11 naar PCI (eenheid ${W.ENERGY_UNITS.gas}, omrekening ${W.KWH_CONVERSION.gas}).`);
  const soorten = {
    gas:    { id: "p.fr.energie.prijs_gas_prix_repere", status: undefined, eenheid: "per kWh PCS, tool ook per kWh", direct: true },
    fioul:  { id: "p.fr.energie.prijs_fioul",           status: undefined, eenheid: "per liter, tool per liter", direct: true },
    pellet: { id: "p.fr.energie.prijs_pellets",         status: undefined,   eenheid: "per kWh PCI, tool per kg" },
    wood:   { id: "p.fr.energie.prijs_hout",            status: "raming",   eenheid: "per kWh PCI, tool per stère" }
  };
  for (const [k, s] of Object.entries(soorten)) {
    const p = param(s.id), i = W.PRIJS_INFO[k];
    if (i.peilId !== s.id) fout(`PRIJS_INFO.${k}.peilId is ${i.peilId}, verwacht ${s.id}.`);
    if (typeof p.waarde !== "number") { fout(`${s.id}: Peil heeft geen getal als waarde (${p.waarde}).`); continue; }
    if (p.status !== s.status) fout(`${s.id}: status in Peil is ${p.status || "vastgesteld"}, verwacht ${s.status || "vastgesteld"}; bekijk of de tool dit nog juist toont.`);
    if (i.status !== "aanname") fout(`PRIJS_INFO.${k}: de tool toont dit als aanname (de omrekening en de afronding zijn van de tool), nu ${i.status}.`);
    if (!i.bron) fout(`PRIJS_INFO.${k} heeft geen bron.`);
    const inh = s.direct ? 1 : W.KWH_CONVERSION[k];
    const perKwh = i.waarde / inh;
    const ref = p.waarde;
    if (Math.abs(perKwh - ref) > MARGE) fout(`${s.id}: tool ${i.waarde} (= ${perKwh.toFixed(4)} ${s.direct ? "per liter" : "per kWh"} bij ${inh} ${s.direct ? "" : "kWh per eenheid"}), Peil ${ref} ${s.eenheid}; verschil groter dan de afrondingsmarge van 0,005.`);
  }
  // Propaan: in Peil vastgesteld per kWh PCI; de tool rekent per liter met 12,78 kWh PCI per kg en 0,51 kg per liter (aanname van de tool).
  {
    const id = "p.fr.energie.prijs_propaan", p = param(id), i = W.PRIJS_INFO.propaan;
    if (i.peilId !== id) fout(`PRIJS_INFO.propaan.peilId is ${i.peilId}, verwacht ${id}.`);
    if (p.status) fout(`${id}: Peil heeft status ${p.status}, verwacht vastgesteld.`);
    const perKwh = i.waarde / W.KWH_CONVERSION.propaan;
    if (Math.abs(perKwh - p.waarde) > MARGE) fout(`${id}: tool ${i.waarde} per liter (= ${perKwh.toFixed(4)} per kWh PCI), Peil ${p.waarde}; verschil groter dan 0,005.`);
    if (i.status !== "aanname" || !i.bron) fout("PRIJS_INFO.propaan moet een aanname met bron zijn.");
  }
  // Petroleum: in Peil een raming met bandbreedte (waarde_weergave "bandbreedte 1,75 tot 2,75 euro per liter"); de tool moet daarbinnen liggen.
  {
    const id = "p.fr.energie.prijs_petroleum", p = param(id), i = W.PRIJS_INFO.petroleum;
    if (i.peilId !== id) fout(`PRIJS_INFO.petroleum.peilId is ${i.peilId}, verwacht ${id}.`);
    if (p.status !== "raming") fout(`${id}: Peil heeft status ${p.status}, verwacht raming.`);
    const band = /bandbreedte ([\d,]+) tot ([\d,]+) euro per liter/.exec(p.waarde_weergave || "");
    if (!band) fout(`${id}: waarde_weergave noemt geen bandbreedte per liter.`);
    else { const lo = parseFloat(band[1].replace(",", ".")), hi = parseFloat(band[2].replace(",", ".")); if (i.waarde < lo || i.waarde > hi) fout(`${id}: tool ${i.waarde} per liter ligt buiten de bandbreedte ${lo} tot ${hi} van Peil.`); }
    if (i.status !== "aanname" || !i.bron) fout("PRIJS_INFO.petroleum moet een aanname met bron zijn.");
  }
  // Terugleververgoeding (vente du surplus), arrêté du 1er juin 2026.
  {
    const p = param("p.fr.elec.tarief_teruglevering_surplus");
    const eng = engineCode.match(/const TERUGLEVER_TARIEF\s*=\s*([0-9.]+)/);
    if (!eng || parseFloat(eng[1]) !== p.waarde) fout(`Terugleververgoeding: tool ${eng && eng[1]}, Peil ${p.waarde}.`);
  }
}

// ---- 6. U-waarden per bouwperiode (3CL), apparaatverbruik (ADEME)
{
  const u = param("p.fr.energie.u_waarden_isolatieniveau"), w = u.waarde || {};
  const vals = (o) => Object.values(o);
  if (!gelijk(vals(W.U_PRESETS.wall), w.muur)) fout(`Muur-U-waarden: tool ${JSON.stringify(vals(W.U_PRESETS.wall))}, Peil ${JSON.stringify(w.muur)}.`);
  if (!gelijk(vals(W.U_PRESETS.roof), w.dak)) fout(`Dak-U-waarden: tool ${JSON.stringify(vals(W.U_PRESETS.roof))}, Peil ${JSON.stringify(w.dak)}.`);
  if (!gelijk(vals(W.U_PRESETS.floor), w.vloer)) fout(`Vloer-U-waarden: tool ${JSON.stringify(vals(W.U_PRESETS.floor))}, Peil ${JSON.stringify(w.vloer)}.`);
  // Raam: het register noemt enkel glas (Uw 4,9, PVC-kozijn) in waarde_weergave; oud dubbelglas (2,8) en triple (1,0) zijn aannames van de tool en staan als zodanig in U_UITLEG.
  { const rw = (re) => parseFloat(((re.exec(u.waarde_weergave || "") || [])[1] || "").replace(",", "."));
    const w = vals(W.U_PRESETS.win);
    if (w[0] !== rw(/enkel glas Uw ([\d,]+)/)) fout(`Raam enkel glas: tool ${w[0]}, Peil ${rw(/enkel glas Uw ([\d,]+)/)}.`);
    // Dubbelglas: het register noemt geen vaste standaardwaarde (Uw volgt uit Ug en het kozijn); de 1,6 van de tool is de uitkomst bij Ug 1,4 in een PVC-kozijn en staat zo in U_UITLEG.
    if (!/geen vaste standaardwaarde/.test(u.waarde_weergave || "")) fout("Peil noemt niet meer dat voor dubbelglas geen vaste standaardwaarde bestaat; bekijk de raamwaarden van de tool.");
    if (w[2] !== 1.6 || !/Ug 1,4/.test(W.U_UITLEG) || !/geen vaste standaardwaarde/.test(W.U_UITLEG)) fout("U_UITLEG moet zeggen dat 1,6 hoort bij Ug 1,4 en dat er geen vaste standaardwaarde voor dubbelglas is.");
    if (!W.U_UITLEG.includes("2,8") || !W.U_UITLEG.includes("1,0")) fout("U_UITLEG noemt de aannames 2,8 (oud dubbelglas) en 1,0 (triple) niet."); }
  if (vals(W.U_PRESETS.roof).includes(3) || vals(W.U_PRESETS.win).includes(5.5)) fout("Dak 3,0 en raam 5,5 komen in de methode niet voor en moeten vervallen zijn.");
  if (!/aanname/.test(W.U_UITLEG) || !/1983/.test(W.U_UITLEG)) fout("U_UITLEG zegt niet dat de koppeling aan bouwperiodes een aanname is.");
  const a = param("p.fr.energie.apparaatverbruik_per_jaar"), aw = a.waarde || {};
  const kwh = Object.fromEntries(W.DEFAULT_APPLIANCES.map((x) => [x.key, x]));
  const koppel = { fridge: "koel_vriescombinatie", wash: "wasmachine_plus_droger", dish: "vaatwasser", tv: "televisie", lighting: "verlichting" };
  for (const [k, pk] of Object.entries(koppel)) {
    if (kwh[k].kwh !== aw[pk]) fout(`Apparaat ${k}: tool ${kwh[k].kwh} kWh, Peil ${aw[pk]} kWh.`);
    if (kwh[k].status !== "raming") fout(`Apparaat ${k} moet als raming zijn gemarkeerd.`);
  }
  for (const k of ["it", "small"]) if (kwh[k].status !== "aanname") fout(`Apparaat ${k} moet als aanname zijn gemarkeerd.`);
  if (a.status !== "raming") fout("apparaatverbruik_per_jaar moet in Peil raming zijn.");
  if (!/ADEME/.test(W.APPARATEN_UITLEG) || !/kan afwijken/.test(W.APPARATEN_UITLEG)) fout("APPARATEN_UITLEG zegt niet 'gemiddeld volgens ADEME, uw verbruik kan afwijken'.");
}

// ---- 7. Byte-identieke engines blijven gelijk (pin in peil/engine-hash.json, in beide repo's hetzelfde)
{
  const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, "engine", f))).digest("hex");
  for (const f of ["archetypes.js", "engine.js", "dpe.js"]) {
    if (sha(f) !== PIN.bestanden[f]) fout(`engine/${f} wijkt af van de vastgelegde versie in peil/engine-hash.json. Deze kopie moet byte-identiek blijven aan antonnoe/energieportaal: pas beide repo's samen aan en werk de hashes in beide bij.`);
  }
  // Het waardenblok (van "// ===== Waarden uit Peil" tot "// ===== Helpers") is vastgelegd; zo is de bewering in engine-hash.json toetsbaar.
  {
    const e = fs.readFileSync(path.join(root, "engine", "engine.js"), "utf8");
    const a = e.indexOf("// ===== Waarden uit Peil"), z = e.indexOf("// ===== Helpers");
    if (a < 0 || z < a) fout("engine.js mist de markeringen van het waardenblok.");
    else if (crypto.createHash("sha256").update(e.slice(a, z)).digest("hex") !== PIN.waardenblok) fout("Het waardenblok in engine/engine.js wijkt af van PIN.waardenblok in peil/engine-hash.json; werk de hash in beide repo's bij.");
  }
  // Lokaal ook rechtstreeks vergelijken met de zusterrepo als die ernaast staat
  const zus = path.join(root, "..", "if-mobiel", "engine");
  if (fs.existsSync(zus)) for (const f of ["archetypes.js", "engine.js", "dpe.js"]) if (!fs.readFileSync(path.join(zus, f)).equals(fs.readFileSync(path.join(root, "engine", f)))) fout(`engine/${f} verschilt van ../energieportaal/engine/${f}.`);
}

// ---- 8. Het Peil-label: stempel en voettekstalinea, identiek aan het goedgekeurde ontwerp
{
  const nlD = P.peilStandNl();
  if (P.PEIL_UITLEG_URL !== UITLEG_URL) fout("PEIL_UITLEG_URL wijst niet naar het manifest.");
  // Het label staat sinds 26-10-2026 bewust uit (PEIL_LABEL_AAN false) tot de ijking in Peil; de template toont het via peilAan.
  if (typeof P.PEIL_LABEL_AAN !== "boolean") fout("PEIL_LABEL_AAN moet true of false zijn.");
  if (!/peilAan: PEIL_LABEL_AAN/.test(index)) fout("renderVals geeft de schakelaar PEIL_LABEL_AAN niet door.");
  { const enA = index.slice(index.indexOf("enAannames(engineKlaar){"), index.indexOf("enGrootstePost(costs){"));
    if (/2024 en 2025/.test(enA) || !/PRIJS_INFO\[k\]\.periode/.test(enA)) fout("De prijstekst (enAannames) noemt de perioden van de prijzen niet uit PRIJS_INFO."); }
  if (P.peilAria() !== `Bedragen gecontroleerd tegen Peil, stand ${nlD}, lees hoe wij werken`) fout("De aria-label van de stempel klopt niet.");
  const verwacht = `Alle wettelijke tarieven, bedragen en grenzen komen uit Peil, het register waarin wij deze gegevens bijhouden. Elk daarvan is gecontroleerd bij de officiële bron, de laatste controle was op ${nlD}. Waar de tool met een aanname of schatting rekent, staat dat bij de uitkomst.`;
  if (P.peilVoetTekst() !== verwacht) fout("De voettekstalinea wijkt af van het goedgekeurde ontwerp.");
  if (!index.includes('<strong style="color:#15181A">Over de bedragen in deze tool.</strong> {{ peilVoetTekst }} <a href="{{ peilHref }}" target="_blank" rel="noopener"')) fout("De template mist de kop 'Over de bedragen in deze tool.' met de tekst en de link naar het manifest.");
  if (!index.includes("Lees in ons manifest hoe wij werken</a>")) fout("De template mist de link 'Lees in ons manifest hoe wij werken'.");
  if (!/<a href="\{\{ peilHref \}\}" target="_blank" rel="noopener" aria-label="\{\{ peilAria \}\}"/.test(index)) fout("De stempel is niet één link naar het manifest met target _blank, rel noopener en aria-label.");
  if (!index.includes("Gecontroleerd tegen Peil</span>") || !index.includes('stand {{ peilKort }}<span aria-hidden="true"') || !index.includes("&#8599;")) fout("De stempel mist de twee korte regels of het pijltje.");
  if (!index.includes('<circle cx="20" cy="20" r="18.5" fill="#fff" stroke="#800000" stroke-width="1.6"/><circle cx="20" cy="20" r="14.5" fill="none" stroke="#800000" stroke-width="1"/><path d="M13.5 20.5 L18 25 L26.5 15.5"')) fout("De stempel wijkt af van het goedgekeurde ontwerp (variant B, #800000).");
  if (!/peilKort: peilStandKort\(\)/.test(index) || !/peilVoetTekst: peilVoetTekst\(\)/.test(index)) fout("De stempel haalt de datum niet uit PEIL_STAND.");
  if (/(19|20) oktober 2026/.test(index.replace(/const PEIL_STAND = [^\n]*/, ""))) fout("Er staat een vaste peildatum buiten PEIL_STAND; de datum mag alleen uit PEIL_STAND komen.");
  if (/antonnoe\.github\.io\/peil-nl-fr/.test(index)) fout("De app verwijst naar de openbare Peil-site.");
  const iL = index.indexOf("{{ enLet }}"), iA = index.indexOf("{{ enAannames }}"), iS = index.indexOf('aria-label="{{ peilAria }}"'), iV = index.indexOf("Over de bedragen in deze tool.");
  if (!(iL > 0 && iL < iA && iA < iS && iS < iV)) fout("Volgorde bij de uitkomst moet zijn: disclaimer, aannames, stempel, voettekstalinea.");
  if (!/enAannames:\s*en\.enAannames/.test(index)) fout("renderVals geeft enAannames niet door.");
}

if (fouten.length) {
  console.log(`${fouten.length} afwijking(en) tussen de tool en peil/waarden.json:`);
  fouten.forEach((m) => console.log("FOUT " + m));
  process.exit(1);
}
console.log(`Alle Peil-controles geslaagd (stand ${P.PEIL_STAND}, ${perId.size} parameters in peil/waarden.json).`);
