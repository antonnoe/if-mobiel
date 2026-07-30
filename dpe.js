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
  var DPE_ZONES = {
    med:    { hdd: 1400, Tref: 12 },
    ouest:  { hdd: 1900, Tref: 10 },
    paris:  { hdd: 2200, Tref: 7  },
    centre: { hdd: 2500, Tref: 6  },
    est:    { hdd: 2800, Tref: 5  },
    mont:   { hdd: 3400, Tref: 2  }
  };

  // ── Conventionele rekenparameters ──────────────────────────────────────────
  var DPE_SETPOINT  = 19;   // °C — conventionele binnentemperatuur (ADEME/3CL)
  var DPE_HDD_BASE  = 18;   // interieur-referentie van de HDD-tabel hierboven
  var DPE_DHW_L     = 56;   // L/dag per conventionele bewoner @ 40 °C (ordegrootte ADEME)
  var DPE_DHW_TCOLD = 12;   // °C koudwater
  var DPE_DHW_THOT  = 40;   // °C tapwater
  var DPE_CP_WATER  = 4.186; // kJ/kg·K
  var DPE_AUX_LIGHT_PER_M2 = 3.0; // kWh EF/m²/jaar — forfait hulpenergie + verlichting (indicatief)
  var DPE_SOLAR_COVERAGE   = 0.6; // conventionele zonneboiler-dekking (rest = elektrische bijverwarming)

  // ── Primaire-energiefactoren (kWh EP / kWh EF) ─────────────────────────────
  // Elektriciteit: 1,9 — geldig per 1 januari 2026 (arrêté du 13 août 2025),
  //   verlaagd van 2,3 → 1,9 en afgestemd op de Europese waarde.
  //   Bron: https://www.ecologie.gouv.fr/presse/evolution-du-calcul-du-dpe-1er-janvier-2026-favoriser-lelectrification-du-chauffage
  //         https://www.economie.gouv.fr/actualites/un-nouveau-dpe-au-1er-janvier-2026-pour-favoriser-le-chauffage-electrique
  // Overige energiedragers: 1,0.
  var DPE_PEF_ELEC  = 1.9;
  var DPE_PEF_OTHER = 1.0;

  // ── CO2-emissiefactoren per energiedrager (kg CO2eq / kWh énergie finale) ───
  // Bron: Méthode 3CL-DPE 2021, Annexe (arrêté du 31 mars 2021 relatif aux
  //   méthodes et procédures applicables au DPE — JORFTEXT000043353381).
  //   Waarden gecorroboreerd via ADEME Base Carbone / vakpers:
  //   elektriciteit 0,079 · gaz naturel 0,227 · fioul 0,324 · GPL/propane 0,272
  //   · bois bûches 0,030 · bois granulés 0,030.
  //   (petroleum ≈ fioul; indicatief, zie eindrapport.)
  var DPE_GES = {
    elec: 0.079, gas: 0.227, fioul: 0.324, propaan: 0.272,
    pellet: 0.030, wood: 0.030, petroleum: 0.324
  };

  // ── Klassedrempels logements métropole ─────────────────────────────────────
  // Dubbele drempel: de eindklasse is de SLECHTSTE van de energie- en de
  // GES-schaal (arrêté du 31 mars 2021, art. 4).
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

  function classIndex(value, table) {
    for (var i = 0; i < table.length; i++) {
      if (value <= table[i].max) return i;
    }
    return table.length - 1;
  }

  // ── Rendement + energiedrager per installatie ──────────────────────────────
  function heatEff(s) {
    if (s.mainType === 'hp')   return Math.max(1, s.mainScop || 3.2);
    if (s.mainType === 'elec') return 1;
    return Math.max(0.5, s.mainEta || 0.9); // gas, fioul, pellet, wood
  }
  function heatCarrier(s) {
    return ({ elec: 'elec', hp: 'elec', gas: 'gas', fioul: 'fioul', pellet: 'pellet', wood: 'wood' })[s.mainType] || 'elec';
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
    var heatFinal = heatThermal / heatEff(s);           // kWh finale energie
    var heatCar = heatCarrier(s);

    // Conventioneel tapwater: op basis van surface habitable (3CL Nmax-benadering).
    var Nmax = shab < 30 ? 1 : (shab < 70 ? 1.75 - 0.01875 * (70 - shab) : 0.025 * shab);
    var dhwThermal = (Nmax * DPE_DHW_L * 365 * (DPE_DHW_THOT - DPE_DHW_TCOLD) * DPE_CP_WATER) / 3600;
    var solarCov = s.dhwType === 'solar' ? DPE_SOLAR_COVERAGE : 0;
    var dhwFinal = (dhwThermal * (1 - solarCov)) / dhwEff(s);
    var dhwCar = dhwCarrier(s);

    // Forfait hulpenergie (ventilatie, pompen) + verlichting — elektrisch.
    var auxFinal = DPE_AUX_LIGHT_PER_M2 * shab;

    // Aggregatie per energiedrager → finale, primaire energie en GES.
    var finalByCar = {};
    function add(car, kwh) { finalByCar[car] = (finalByCar[car] || 0) + kwh; }
    add(heatCar, heatFinal);
    add(dhwCar, dhwFinal);
    add('elec', auxFinal);

    var epTotal = 0, gesTotal = 0, efTotal = 0;
    Object.keys(finalByCar).forEach(function (car) {
      var ef = finalByCar[car];
      efTotal  += ef;
      epTotal  += ef * (car === 'elec' ? DPE_PEF_ELEC : DPE_PEF_OTHER);
      gesTotal += ef * (DPE_GES[car] != null ? DPE_GES[car] : DPE_GES.elec);
    });

    var epM2 = epTotal / shab;
    var gesM2 = gesTotal / shab;

    // Dubbele drempel → slechtste klasse.
    var epIdx = classIndex(epM2, DPE_EP_CLASSES);
    var gesIdx = classIndex(gesM2, DPE_GES_CLASSES);
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
        shab: shab, Nmax: Nmax,
        UA: UA, Hvent: Hvent, HventEff: HventEff, H: H, hdd19: hdd19,
        heatThermal: heatThermal, heatFinal: heatFinal, heatCarrier: heatCar, heatEff: heatEff(s),
        dhwThermal: dhwThermal, dhwFinal: dhwFinal, dhwCarrier: dhwCar, solarCoverage: solarCov,
        auxFinal: auxFinal, finalByCar: finalByCar,
        epClasse: DPE_EP_CLASSES[epIdx].letter, epClasseIndex: epIdx,
        gesClasse: DPE_GES_CLASSES[gesIdx].letter, gesClasseIndex: gesIdx,
        classeIndex: worst, kleur: DPE_EP_CLASSES[worst].kleur,
        drivenBy: gesIdx > epIdx ? 'ges' : (epIdx > gesIdx ? 'energie' : 'gelijk')
      }
    };
  }

  // ── Export (browser + Node) ────────────────────────────────────────────────
  global.computeDPE = computeDPE;
  global.DPE_EP_CLASSES = DPE_EP_CLASSES;
  global.DPE_GES_CLASSES = DPE_GES_CLASSES;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      computeDPE: computeDPE,
      DPE_EP_CLASSES: DPE_EP_CLASSES,
      DPE_GES_CLASSES: DPE_GES_CLASSES,
      DPE_ZONES: DPE_ZONES,
      DPE_PEF_ELEC: DPE_PEF_ELEC,
      DPE_GES: DPE_GES
    };
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
