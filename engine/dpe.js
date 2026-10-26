// engine/dpe.js — indicatieve DPE-berekening (conventioneel), UI-onafhankelijk.
//
// KRITISCH: de DPE beoordeelt het GEBOUW, niet de bewoner. Deze berekening
// rekent daarom CONVENTIONEEL en negeert het persoonlijke gebruik:
//   • 365 dagen bezetting (geen aanwezigheidsdagen)
//   • binnentemperatuur 19 °C (geen persoonlijk setpoint, geen afwezig-setpoint)
//   • conventioneel tapwaterverbruik op basis van surface habitable
// Zo krijgt een vakantiehuis dat 60 dagen bewoond wordt geen kunstmatig A-label.
//
// Bestaand rekenwerk in engine/engine.js blijft ongewijzigd; dit bestand staat
// er los van en draait ook zelfstandig in Node (voor tests/dpe-test.js).
//
// ── GERAADPLEEGDE BRONNEN (VERIFICATIEPLICHT) ──────────────────────────────
// De officiële primaire bronnen (legifrance.gouv.fr, ecologie.gouv.fr,
// rt-re-batiment.developpement-durable.gouv.fr) waren vanuit deze omgeving niet
// rechtstreeks op te halen (egress-policy blokkeerde *.gouv.fr met HTTP 403).
// Onderstaande waarden zijn daarom geverifieerd via meerdere onafhankelijke
// weergaven van de officiële teksten. Zie de bron-URL's per constante hieronder
// en het eindrapport voor de verificatiestatus.

(function (global) {
  'use strict';

  // ── Klimaatzones: HDD-basis (18 °C interieurreferentie) + Tref per zone ────
  // Zelfde waarden als engine/engine.js (Météo France klimaatnormalen), hier
  // ingebed zodat dit bestand onafhankelijk (ook in Node) werkt.
  // nh: uren verlichting per jaar uit de méthode 3CL-DPE 2021, par. 16.1 (H3 1.506, H2b 1.531, H1a 1.500, H1c 1.476, H1b 1.445);
  // de koppeling van de zones van de tool aan de 3CL-zones is een aanname van de tool. cdd: zelfde koeldagen als engine/engine.js.
  var DPE_ZONES = {
    med:    { hdd: 1400, Tref: 12, nh: 1506, cdd: 700 },
    ouest:  { hdd: 1900, Tref: 10, nh: 1531, cdd: 350 },
    paris:  { hdd: 2200, Tref: 7,  nh: 1500, cdd: 250 },
    centre: { hdd: 2500, Tref: 6,  nh: 1476, cdd: 200 },
    est:    { hdd: 2800, Tref: 5,  nh: 1445, cdd: 150 },
    mont:   { hdd: 3400, Tref: 2,  nh: 1476, cdd: 50  }
  };

  // ── Conventionele rekenparameters ──────────────────────────────────────────
  var DPE_SETPOINT  = 19;   // °C — conventionele binnentemperatuur (ADEME/3CL)
  var DPE_HDD_BASE  = 18;   // interieur-referentie van de HDD-tabel hierboven
  // Warm water: méthode 3CL-DPE 2021, par. 11.1: Becs = 1,163 x Nadeq x 56 x (40 - Tefs) x 358 dagen (Wh).
  // Koudwater: de methode gebruikt een maandwaarde per zone; de tool rekent vereenvoudigd met 12 °C.
  var DPE_DHW_L     = 56;   // L/dag per adulte équivalent @ 40 °C (3CL par. 11.1)
  var DPE_DHW_TCOLD = 12;   // °C koudwater (vereenvoudiging van de tool)
  var DPE_DHW_THOT  = 40;   // °C tapwater
  var DPE_DHW_WH_PER_L_K = 1.163; // Wh per liter per graad (3CL par. 11.1)
  var DPE_DHW_DAGEN = 358;  // bewoonde dagen (3CL par. 11.1)
  // Verlichting: 3CL par. 16.1, Cecl = C x Pecl x Nh / 1000 per m², met C = 0,9 (interrupteur) en Pecl = 1,4 W/m².
  var DPE_LIGHT_C = 0.9, DPE_LIGHT_P = 1.4;
  // Hulpenergie ventilatie: 3CL par. 5, Caux = 8760 x Pventmoy / 1000, maison individuelle, installatie tot en met 2012
  // (simple flux autoréglable 65 W, double flux 80 W); natuurlijke ventilatie 0. Hulpenergie van pompen en ketels telt de tool niet mee.
  var DPE_VENT_PMOY = { natural: 0, mech: 65, hrv: 80 };
  var DPE_SOLAR_COVERAGE   = 0.6; // conventionele zonneboiler-dekking (rest = elektrische bijverwarming)
  // Koeling: zelfde vuistregel als engine/engine.js (0,6 x H x koeldagen), conventioneel over het hele zomerseizoen.
  var DPE_COOL_K = 0.6;

  // Zichtbare benaderingszin: de DPE-indicatie is geen officiële DPE.
  var DPE_BENADERING = 'Deze DPE-indicatie is een benadering en geen officiële DPE. De tool rekent de verwarming vereenvoudigd (zonder interne en zonnewinsten en koudebruggen, met eigen graaddagen per zone) en telt eigen zonnestroom en de hulpenergie van pompen en ketels niet mee. Alleen een gecertificeerde diagnostiqueur kan een DPE opstellen.';

  // ── Primaire-energiefactoren (kWh EP / kWh EF) ─────────────────────────────
  // Elektriciteit, datumafhankelijk (Peil: p.fr.dpe.primaire_energiefactor_elektriciteit, vastgesteld):
  //   1,9 van 1 januari 2026 tot en met 31 december 2026: arrêté du 13 août 2025 (NOR ATDL2519132A),
  //       https://www.legifrance.gouv.fr/eli/arrete/2025/8/13/ATDL2519132A/jo/texte
  //   1,7 vanaf 1 januari 2027: arrêté du 19 août 2026 (NOR VLOL2617030A), dat 1,9 in annexe 3
  //       van de arrêté van 31 maart 2021 vervangt door 1,7.
  // De factor hangt af van de rekendatum (s.rekendatum, anders vandaag). Overige energiedragers: 1,0.
  var DPE_PEF_ELEC_PERIODES = [
    { vanaf: '2026-01-01', factor: 1.9 },
    { vanaf: '2027-01-01', factor: 1.7 }
  ];
  var DPE_PEF_OTHER = 1.0;
  function dpeDatumIso(d) {
    if (!d) return new Date().toISOString().slice(0, 10);
    if (typeof d === 'string') return d.slice(0, 10);
    return new Date(d).toISOString().slice(0, 10);
  }
  // Voor 1 januari 2026 geldt hier de eerste periode (de tool rekent met actuele regels).
  function dpePefElec(datum) {
    var iso = dpeDatumIso(datum), f = DPE_PEF_ELEC_PERIODES[0].factor;
    for (var i = 0; i < DPE_PEF_ELEC_PERIODES.length; i++) {
      if (iso >= DPE_PEF_ELEC_PERIODES[i].vanaf) f = DPE_PEF_ELEC_PERIODES[i].factor;
    }
    return f;
  }

  // ── CO2-emissiefactoren per energiedrager (kg CO2eq / kWh énergie finale) ───
  // Bron: Méthode 3CL-DPE 2021, Annexe (arrêté du 31 mars 2021 relatif aux
  //   méthodes et procédures applicables au DPE — JORFTEXT000043353381).
  //   Waarden gecorroboreerd via ADEME Base Carbone / vakpers:
  //   elektriciteit 0,079 · gaz naturel 0,227 · fioul 0,324 · GPL/propane 0,272
  //   · bois bûches 0,030 · bois granulés 0,030.
  //   (petroleum ≈ fioul; indicatief, zie eindrapport.)
  //   Elektriciteit per gebruik (arrêté du 31 mars 2021 modifiant diverses dispositions relatives au DPE, NOR LOGL2107220A,
  //   JO 13-04-2021, art. 1, 9°): verwarming 0,079, warm water 0,065, koeling 0,064, verlichting 0,069, hulpapparatuur 0,064.
  var DPE_GES = {
    elec: 0.079, gas: 0.227, fioul: 0.324, propaan: 0.272,
    pellet: 0.030, wood: 0.030, petroleum: 0.324
  };
  var DPE_GES_ELEC = { verwarming: 0.079, warmwater: 0.065, koeling: 0.064, verlichting: 0.069, hulp: 0.064 };

  // ── Klassedrempels logements métropole ─────────────────────────────────────
  // Dubbele drempel: de eindklasse is de SLECHTSTE van de energie- en de
  // GES-schaal (arrêté du 31 mars 2021, annexe 5 in de versie van de arrêté du 25 mars 2024, par. 1.2):
  // klasse X als CEP < CEP_x en EGES < EGES_x, met CEP en EGES eerst naar beneden afgerond op een geheel getal.
  // De tabellen hieronder gelden voor woningen boven 40 m² onder 800 m hoogte; zie DPE_KLEIN en DPE_HOOG voor de andere gevallen.
  //   Bron: https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000051759600
  // Kleuren = officiële DPE-palet (identiek aan de bestaande UI).
  var DPE_EP_CLASSES = [   // kWh EP/m²/jaar
    { letter: 'A', max: 70,       kleur: '#009B4D' },
    { letter: 'B', max: 110,      kleur: '#52B74B' },
    { letter: 'C', max: 180,      kleur: '#C8D400' },
    { letter: 'D', max: 250,      kleur: '#FFED00' },
    { letter: 'E', max: 330,      kleur: '#F5A623' },
    { letter: 'F', max: 420,      kleur: '#E95D0F' },
    { letter: 'G', max: Infinity, kleur: '#E3001B' }
  ];
  var DPE_GES_CLASSES = [  // kg CO2eq/m²/jaar
    { letter: 'A', max: 6,        kleur: '#009B4D' },
    { letter: 'B', max: 11,       kleur: '#52B74B' },
    { letter: 'C', max: 30,       kleur: '#C8D400' },
    { letter: 'D', max: 50,       kleur: '#FFED00' },
    { letter: 'E', max: 70,       kleur: '#F5A623' },
    { letter: 'F', max: 100,      kleur: '#E95D0F' },
    { letter: 'G', max: Infinity, kleur: '#E3001B' }
  ];

  // Woningen tot en met 40 m² onder 800 m (annexe 5, par. 1.2.2.1): [Sref, CEP_a, EGES_a, CEP_b, EGES_b, ..., CEP_f, EGES_f],
  // tussenliggende oppervlakken lineair geïnterpoleerd, 8 m² of minder als 8 m².
  var DPE_KLEIN = [
    [8, 146, 11, 186, 16, 386, 44, 505, 68, 622, 90, 739, 122],
    [9, 134, 11, 174, 16, 355, 42, 464, 65, 574, 87, 685, 118],
    [10, 124, 10, 164, 15, 329, 40, 428, 62, 533, 84, 640, 115],
    [11, 117, 10, 157, 15, 311, 39, 403, 61, 503, 82, 607, 113],
    [12, 112, 9, 152, 14, 296, 38, 381, 59, 478, 81, 578, 111],
    [13, 108, 9, 148, 14, 283, 37, 363, 58, 456, 79, 554, 110],
    [14, 104, 9, 144, 14, 273, 37, 348, 58, 437, 78, 532, 108],
    [15, 100, 8, 140, 13, 263, 36, 333, 56, 421, 76, 514, 107],
    [16, 97, 8, 137, 13, 255, 35, 325, 55, 412, 76, 504, 106],
    [17, 95, 8, 135, 13, 248, 35, 318, 55, 404, 75, 496, 105],
    [18, 92, 8, 132, 13, 241, 34, 311, 54, 397, 75, 489, 105],
    [19, 90, 8, 130, 13, 235, 34, 305, 54, 390, 74, 482, 105],
    [20, 88, 8, 128, 13, 230, 34, 300, 54, 385, 74, 476, 104],
    [21, 87, 8, 127, 13, 225, 33, 295, 53, 380, 74, 471, 104],
    [22, 85, 7, 125, 12, 221, 33, 291, 53, 375, 73, 466, 103],
    [23, 84, 7, 124, 12, 217, 33, 287, 53, 371, 73, 462, 103],
    [24, 82, 7, 122, 12, 214, 33, 284, 53, 367, 73, 458, 103],
    [25, 81, 7, 121, 12, 210, 32, 280, 52, 363, 73, 454, 103],
    [26, 80, 7, 120, 12, 207, 32, 277, 52, 360, 72, 451, 103],
    [27, 79, 7, 119, 12, 204, 32, 274, 52, 357, 72, 447, 102],
    [28, 78, 7, 118, 12, 202, 32, 272, 52, 354, 72, 444, 102],
    [29, 77, 7, 117, 12, 199, 32, 269, 52, 351, 72, 442, 102],
    [30, 76, 7, 116, 12, 197, 32, 267, 52, 349, 72, 439, 102],
    [31, 76, 7, 116, 12, 195, 31, 265, 51, 346, 72, 437, 102],
    [32, 75, 7, 115, 12, 193, 31, 263, 51, 344, 71, 434, 101],
    [33, 74, 7, 114, 12, 191, 31, 261, 51, 342, 71, 432, 101],
    [34, 74, 7, 114, 12, 189, 31, 259, 51, 340, 71, 430, 101],
    [35, 73, 7, 113, 12, 188, 31, 258, 51, 338, 71, 428, 101],
    [36, 72, 7, 112, 12, 186, 31, 256, 51, 337, 71, 427, 101],
    [37, 72, 7, 112, 12, 185, 31, 255, 51, 335, 71, 425, 101],
    [38, 71, 7, 111, 12, 183, 31, 253, 51, 333, 71, 423, 101],
    [39, 71, 7, 111, 12, 182, 31, 252, 51, 332, 71, 422, 101],
    [40, 70, 6, 110, 11, 180, 30, 250, 50, 330, 70, 420, 100]
  ];
  // Boven 800 m in de zones H1b, H1c en H2d: E en F wijken af. Boven 40 m² (par. 1.2.1.2): [CEP_e, EGES_e, CEP_f, EGES_f];
  // tot en met 40 m² (par. 1.2.2.2): [Sref, CEP_e, EGES_e, CEP_f, EGES_f], lineair geïnterpoleerd.
  var DPE_HOOG = [390, 80, 500, 110];
  var DPE_HOOG_KLEIN = [
    [8, 682, 100, 819, 132],
    [9, 634, 97, 765, 128],
    [10, 593, 94, 720, 125],
    [11, 563, 92, 687, 123],
    [12, 538, 91, 658, 121],
    [13, 516, 89, 634, 120],
    [14, 497, 88, 612, 118],
    [15, 481, 86, 594, 117],
    [16, 472, 86, 584, 116],
    [17, 464, 85, 576, 115],
    [18, 457, 85, 569, 115],
    [19, 450, 84, 562, 115],
    [20, 445, 84, 556, 114],
    [21, 440, 84, 551, 114],
    [22, 435, 83, 546, 113],
    [23, 431, 83, 542, 113],
    [24, 427, 83, 538, 113],
    [25, 423, 83, 534, 113],
    [26, 420, 82, 531, 113],
    [27, 417, 82, 527, 112],
    [28, 414, 82, 524, 112],
    [29, 411, 82, 522, 112],
    [30, 409, 82, 519, 112],
    [31, 406, 82, 517, 112],
    [32, 404, 81, 514, 111],
    [33, 402, 81, 512, 111],
    [34, 400, 81, 510, 111],
    [35, 398, 81, 508, 111],
    [36, 397, 81, 507, 111],
    [37, 395, 81, 505, 111],
    [38, 393, 81, 503, 111],
    [39, 392, 81, 502, 111],
    [40, 390, 80, 500, 110]
  ];

  function interpoleer(tabel, sref) {
    var s = Math.max(8, Math.min(40, sref));
    for (var i = 0; i < tabel.length - 1; i++) {
      var a = tabel[i], b = tabel[i + 1];
      if (s >= a[0] && s <= b[0]) {
        var f = (s - a[0]) / (b[0] - a[0]);
        return a.slice(1).map(function (v, j) { return v + f * (b[j + 1] - v); });
      }
    }
    return tabel[tabel.length - 1].slice(1);
  }

  // Bovengrenzen (exclusief) voor A tot en met F, per indicator, voor deze woning.
  function dpeDrempels(sref, boven800m) {
    var ep = DPE_EP_CLASSES.slice(0, 6).map(function (k) { return k.max; });
    var ges = DPE_GES_CLASSES.slice(0, 6).map(function (k) { return k.max; });
    if (sref <= 40) {
      var r = interpoleer(DPE_KLEIN, sref);
      for (var i = 0; i < 6; i++) { ep[i] = r[2 * i]; ges[i] = r[2 * i + 1]; }
    }
    if (boven800m) {
      var h = sref <= 40 ? interpoleer(DPE_HOOG_KLEIN, sref) : DPE_HOOG;
      ep[4] = h[0]; ges[4] = h[1]; ep[5] = h[2]; ges[5] = h[3];
    }
    return { ep: ep, ges: ges };
  }

  function classIndex(value, grenzen) {
    var v = Math.floor(value);
    for (var i = 0; i < grenzen.length; i++) {
      if (v < grenzen[i]) return i;
    }
    return grenzen.length; // G
  }

  // ── Rendement + energiedrager per installatie ──────────────────────────────
  function heatEff(s) {
    if (s.mainType === 'hp')   return Math.max(1, s.mainScop || 3.2);
    if (s.mainType === 'elec') return 1;
    return Math.max(0.5, s.mainEta || 0.9); // gas, fioul, pellet, wood
  }
  function heatCarrier(s) {
    return ({ elec: 'elec', hp: 'elec', gas: 'gas', propaan: 'propaan', fioul: 'fioul', pellet: 'pellet', wood: 'wood' })[s.mainType] || 'elec';
  }
  // Bijverwarming: zelfde rendement en aandeel als in engine/engine.js (aandeel hooguit 90 procent).
  function auxEffOf(s) {
    if (s.auxType === 'inverter') return Math.max(1, s.auxScop || 3.2);
    if (s.auxType === 'elec') return 1;
    return Math.max(0.5, s.auxEta || 0.85); // pellet, wood, petroleum
  }
  function auxCarrier(s) {
    return ({ inverter: 'elec', elec: 'elec', pellet: 'pellet', wood: 'wood', petroleum: 'petroleum' })[s.auxType] || null;
  }
  function auxFracOf(s) {
    if (!s.auxType || s.auxType === 'none' || !auxCarrier(s)) return 0;
    var pct = s.auxSharePreset === 'custom' ? +s.auxShareCustom : +s.auxSharePreset;
    if (!isFinite(pct)) pct = 0;
    return Math.min(0.9, Math.max(0, pct / 100));
  }
  function dhwEff(s) {
    if (s.dhwType === 'hp')  return Math.max(1, s.dhwScop || 2.5);
    if (s.dhwType === 'gas') return Math.max(0.5, s.dhwEta || 0.9);
    return 1; // elec, solar (bijverwarming), overig
  }
  function dhwCarrier(s) {
    return ({ elec: 'elec', gas: 'gas', hp: 'elec', solar: 'elec' })[s.dhwType] || 'elec';
  }

  /**
   * computeDPE(state) → indicatieve, conventionele DPE.
   * Verwacht dezelfde gebouwparameters als computeResults + het veld
   * `woonoppervlak` (surface habitable in m²).
   */
  function computeDPE(s) {
    s = s || {};
    var shab = Math.max(10, +s.woonoppervlak || +s.floorA || 100);

    // Warmteverliescoëfficiënt H (identieke methode als engine/engine.js).
    var UA = (s.wallA || 0) * (s.wallU || 0) + (s.roofA || 0) * (s.roofU || 0)
           + (s.floorA || 0) * (s.floorU || 0) + (s.winA || 0) * (s.winU || 0);
    var Hvent = 0.34 * (s.volume || 0) * (s.ach || 0);
    var etaHRV = s.ventType === 'hrv' ? Math.min(0.95, Math.max(0, s.hrvEta || 0)) : 0;
    var HventEff = s.ventType === 'hrv' ? Hvent * (1 - etaHRV) : Hvent;
    var H = UA + HventEff;

    // Conventionele verwarming: 365 dagen, 19 °C, geen afwezigheidsreductie.
    var z = DPE_ZONES[s.zone] || DPE_ZONES.paris;
    var hdd19 = z.hdd * (DPE_SETPOINT - z.Tref) / (DPE_HDD_BASE - z.Tref);
    var heatThermal = H * hdd19 * 24 / 1000;            // kWh warmtevraag/jaar
    var auxFrac = auxFracOf(s);
    var heatFinal = heatThermal * (1 - auxFrac) / heatEff(s); // kWh finale energie hoofdverwarming
    var heatCar = heatCarrier(s);
    var heatAuxFinal = auxFrac > 0 ? heatThermal * auxFrac / auxEffOf(s) : 0;
    var heatAuxCar = auxFrac > 0 ? auxCarrier(s) : null;

    // Conventioneel tapwater: 3CL par. 11.1, Nmax uit de oppervlakte (maison individuelle), daarna Nadeq.
    var Nmax = shab < 30 ? 1 : (shab < 70 ? 1.75 - 0.01875 * (70 - shab) : 0.025 * shab);
    var Nadeq = Nmax < 1.75 ? Nmax : 1.75 + 0.3 * (Nmax - 1.75);
    var dhwThermal = DPE_DHW_WH_PER_L_K * Nadeq * DPE_DHW_L * (DPE_DHW_THOT - DPE_DHW_TCOLD) * DPE_DHW_DAGEN / 1000;
    var solarCov = s.dhwType === 'solar' ? DPE_SOLAR_COVERAGE : 0;
    var dhwFinal = (dhwThermal * (1 - solarCov)) / dhwEff(s);
    var dhwCar = dhwCarrier(s);

    // Verlichting (3CL par. 16.1) en hulpenergie van de ventilatie (3CL par. 5), elektrisch.
    var lightFinal = DPE_LIGHT_C * DPE_LIGHT_P * z.nh / 1000 * shab;
    var ventFinal = 8760 * (DPE_VENT_PMOY[s.ventType] || 0) / 1000;
    var auxFinal = lightFinal + ventFinal;

    // Koeling (alleen als de woning airco heeft).
    var coolFinal = s.acOn ? DPE_COOL_K * H * z.cdd * 24 / 1000 / Math.max(2.5, s.seer || 4) : 0;

    // Aggregatie per energiedrager en per gebruik → finale, primaire energie en GES.
    var posten = [
      { car: heatCar, gebruik: 'verwarming', kwh: heatFinal },
      { car: heatAuxCar, gebruik: 'verwarming', kwh: heatAuxFinal },
      { car: dhwCar, gebruik: 'warmwater', kwh: dhwFinal },
      { car: 'elec', gebruik: 'verlichting', kwh: lightFinal },
      { car: 'elec', gebruik: 'hulp', kwh: ventFinal },
      { car: 'elec', gebruik: 'koeling', kwh: coolFinal }
    ];
    var finalByCar = {};
    var pefElec = dpePefElec(s.rekendatum);
    var epTotal = 0, gesTotal = 0, efTotal = 0;
    posten.forEach(function (p) {
      if (!p.car || !(p.kwh > 0)) return;
      finalByCar[p.car] = (finalByCar[p.car] || 0) + p.kwh;
      efTotal  += p.kwh;
      epTotal  += p.kwh * (p.car === 'elec' ? pefElec : DPE_PEF_OTHER);
      gesTotal += p.kwh * (p.car === 'elec' ? DPE_GES_ELEC[p.gebruik] : (DPE_GES[p.car] != null ? DPE_GES[p.car] : DPE_GES.elec));
    });
    if (!finalByCar.elec) finalByCar.elec = 0;

    var epM2 = epTotal / shab;
    var gesM2 = gesTotal / shab;

    // Dubbele drempel → slechtste klasse, met de grenzen voor deze oppervlakte en hoogte.
    // Hoogte: s.boven800m (true of false); niet opgegeven = onder 800 m.
    var boven800m = s.boven800m === true || s.boven800m === 'true';
    var drempels = dpeDrempels(shab, boven800m);
    var epIdx = classIndex(epM2, drempels.ep);
    var gesIdx = classIndex(gesM2, drempels.ges);
    var worst = Math.max(epIdx, gesIdx);
    var classe = DPE_EP_CLASSES[worst].letter;

    return {
      classe: classe,
      energiePrimaire: epTotal,   // kWh EP/jaar
      energieFinale: efTotal,     // kWh EF/jaar
      ges: gesTotal,              // kg CO2eq/jaar
      perM2: {
        ep: epM2,                 // kWh EP/m²/jaar
        ges: gesM2,               // kg CO2eq/m²/jaar
        ef: efTotal / shab        // kWh EF/m²/jaar
      },
      details: {
        shab: shab, Nmax: Nmax, Nadeq: Nadeq, boven800m: boven800m, drempels: drempels, pefElec: pefElec, rekendatum: dpeDatumIso(s.rekendatum),
        UA: UA, Hvent: Hvent, HventEff: HventEff, H: H, hdd19: hdd19,
        heatThermal: heatThermal, heatFinal: heatFinal, heatCarrier: heatCar, heatEff: heatEff(s),
        dhwThermal: dhwThermal, dhwFinal: dhwFinal, dhwCarrier: dhwCar, solarCoverage: solarCov,
        auxFinal: auxFinal, lightFinal: lightFinal, ventFinal: ventFinal, coolFinal: coolFinal,
        heatAuxFinal: heatAuxFinal, heatAuxCarrier: heatAuxCar, auxFrac: auxFrac, finalByCar: finalByCar,
        epClasse: DPE_EP_CLASSES[epIdx].letter, epClasseIndex: epIdx,
        gesClasse: DPE_GES_CLASSES[gesIdx].letter, gesClasseIndex: gesIdx,
        classeIndex: worst, kleur: DPE_EP_CLASSES[worst].kleur,
        drivenBy: gesIdx > epIdx ? 'ges' : (epIdx > gesIdx ? 'energie' : 'gelijk')
      }
    };
  }

  // Klasse uit energie en CO2 voor een gegeven oppervlakte en hoogte (dubbele drempel, slechtste klasse).
  function dpeKlasse(ep, ges, sref, boven800m) {
    var d = dpeDrempels(sref, !!boven800m);
    var i = Math.max(classIndex(ep, d.ep), classIndex(ges, d.ges));
    return DPE_EP_CLASSES[i].letter;
  }

  // Afstand tot de eerstvolgende betere eindklasse, op beide assen. Per indicator moet de naar beneden afgeronde
  // waarde onder de grens van de doelklasse komen (annexe 5, par. 1.2); 0 betekent dat die indicator al goed genoeg is.
  function dpeAfstand(d) {
    var idx = d && d.details ? d.details.classeIndex : 0;
    if (!(idx > 0) || !d.details.drempels) return null;
    var doel = idx - 1;
    var grensEp = d.details.drempels.ep[doel], grensGes = d.details.drempels.ges[doel];
    var ep = Math.max(0, Math.floor(d.perM2.ep) - Math.floor(grensEp) + 1);
    var ges = Math.max(0, Math.floor(d.perM2.ges) - Math.floor(grensGes) + 1);
    var delen = [];
    if (ep > 0) delen.push('nog minstens ' + ep + ' kWh EP/m² minder energie (grens ' + Math.round(grensEp) + ')');
    if (ges > 0) delen.push('nog minstens ' + ges + ' kg CO₂/m² minder uitstoot (grens ' + Math.round(grensGes) + ')');
    return { doel: DPE_EP_CLASSES[doel].letter, ep: ep, ges: ges, grensEp: grensEp, grensGes: grensGes, tekst: delen.join(' en ') };
  }

  // ── Export (browser + Node) ────────────────────────────────────────────────
  global.computeDPE = computeDPE;
  global.dpePefElec = dpePefElec;
  global.DPE_EP_CLASSES = DPE_EP_CLASSES;
  global.DPE_GES_CLASSES = DPE_GES_CLASSES;
  global.dpeDrempels = dpeDrempels;
  global.dpeKlasse = dpeKlasse;
  global.dpeAfstand = dpeAfstand;
  global.DPE_BENADERING = DPE_BENADERING;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      computeDPE: computeDPE,
      DPE_EP_CLASSES: DPE_EP_CLASSES,
      DPE_GES_CLASSES: DPE_GES_CLASSES,
      DPE_ZONES: DPE_ZONES,
      dpePefElec: dpePefElec,
      DPE_PEF_ELEC_PERIODES: DPE_PEF_ELEC_PERIODES,
      DPE_GES: DPE_GES,
      DPE_GES_ELEC: DPE_GES_ELEC,
      dpeDrempels: dpeDrempels,
      dpeKlasse: dpeKlasse,
      dpeAfstand: dpeAfstand,
      DPE_BENADERING: DPE_BENADERING
    };
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
