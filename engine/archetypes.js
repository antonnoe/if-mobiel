/**
 * archetypes.js — EnergiePortaal v3
 * Basispakket-generator: intake-antwoorden → volledig, consistent waardenpakket.
 *
 * BRONNEN (forfaitaire waarden per bouwperiode):
 * - Méthode 3CL-DPE 2021, Annexe 1 arrêté 31-03-2021 (geconsolideerd):
 *   https://rt-re-batiment.developpement-durable.gouv.fr/IMG/pdf/consolide_annexe_1_arrete_du_31_03_2021_relatif_aux_methodes_et_procedures_applicables.pdf
 * - Notice DPE (arrêté 08-10-2021): Umur default ongeïsoleerd vóór 1975 = 2,5 W/m²K:
 *   https://www.ecologie.gouv.fr/sites/default/files/documents/notice_DPE.pdf
 * - Periodes ≥1975: opeenvolgende Franse thermische regelgeving (RT1974, RT1982,
 *   RT1988, RT2000, RT2005, RT2012) als indicatieve U-eis per periode.
 * De waarden zijn STARTWAARDEN voor het correctie-overzicht — de gebruiker
 * past aan; de berekening gebruikt altijd de zichtbare veldwaarden.
 */
(function (global) {
  'use strict';

  /* ── Bouwperiodes met forfaitaire startwaarden (ongerenoveerd) ── */
  var PERIODS = {
    // 3CL: ongeïsoleerde mur vóór 1975 → U=2,5 (notice DPE 2021). Enkel glas dominant.
    pre1948:  { label: 'Vóór 1948',        wallU: 2.5,  roofU: 2.5,  floorU: 2.0, winU: 4.5, ach: 1.0, ceiling: 2.7 },
    y48_74:   { label: '1948–1974',        wallU: 2.5,  roofU: 2.5,  floorU: 1.6, winU: 4.5, ach: 0.9, ceiling: 2.5 },
    // ≥1975: 3CL beschouwt wanden als (binnen)geïsoleerd; niveau per RT-generatie.
    y75_89:   { label: '1975–1989',        wallU: 1.0,  roofU: 0.8,  floorU: 1.0, winU: 3.5, ach: 0.7, ceiling: 2.5 },
    y90_05:   { label: '1990–2005',        wallU: 0.5,  roofU: 0.35, floorU: 0.5, winU: 2.6, ach: 0.6, ceiling: 2.5 },
    post2005: { label: 'Na 2005',          wallU: 0.35, roofU: 0.22, floorU: 0.3, winU: 1.6, ach: 0.5, ceiling: 2.5 }
  };

  /* ── Woningtypes: bepalen bouwlagen, plafondhoogte-hint, default-periode ── */
  var HOUSE_TYPES = {
    longere:    { label: 'Longère / fermette',        floors: 1,   defaultPeriod: 'pre1948',  ceiling: 2.5 },
    village:    { label: 'Dorpswoning (aaneengesloten)', floors: 2, defaultPeriod: 'pre1948',  ceiling: 2.7, terraced: true },
    maitre:     { label: 'Maison de maître / herenhuis', floors: 2, defaultPeriod: 'pre1948',  ceiling: 3.0 },
    pavillon:   { label: 'Pavillon (vrijstaand, naoorlogs)', floors: 1, defaultPeriod: 'y48_74', ceiling: 2.5 },
    modern:     { label: 'Moderne woning',            floors: 1.5, defaultPeriod: 'y90_05',   ceiling: 2.5 },
    appartement:{ label: 'Appartement',               floors: 1,   defaultPeriod: 'y48_74',   ceiling: 2.5, apartment: true }
  };

  /* ── Renovatie-overrides (per element, "goed gerenoveerd"-niveau = bestaande presets) ── */
  var RENO = {
    roof:  { roofU: 0.25 },              // ~20 cm minerale wol
    walls: { wallU: 0.40 },              // ~10 cm
    windows: { winU: 1.6 },              // modern HR dubbel glas
    floor: { floorU: 0.35 }
  };

  /* ── Verwarmingskeuze → veldwaarden ── */
  var HEATING = {
    hp:     { mainType: 'hp',    mainScop: 3.2, mainEta: 0.9  },
    elec:   { mainType: 'elec',  mainScop: 3.2, mainEta: 1.0  },
    gas:    { mainType: 'gas',   mainScop: 3.2, mainEta: 0.9  },
    fioul:  { mainType: 'fioul', mainScop: 3.2, mainEta: 0.85 },
    wood:   { mainType: 'wood',  mainScop: 3.2, mainEta: 0.6  },
    pellet: { mainType: 'pellet',mainScop: 3.2, mainEta: 0.85 }
  };

  /* ── Gebruiksprofiel → aanwezigheidsdagen (winter okt–apr max 212 / zomer mei–sep max 153) ── */
  var USAGE = {
    permanent: { label: 'Permanent',      winter: 200, summer: 145 },
    halftijds: { label: 'Halftijds',      winter: 120, summer: 80  },
    zomer:     { label: 'Zomervakantie',  winter: 30,  summer: 90  },
    winter:    { label: 'Winterverblijf', winter: 90,  summer: 30  }
  };

  /**
   * applyArchetype — intake-antwoorden → compleet veldenpakket.
   * answers: { zone, houseType, period, m2, floors?, renovations:[], heating, usage, persons? }
   * Retourneert { fields: {veldId: waarde}, summary: [regels] }.
   */
  function applyArchetype(a) {
    var ht = HOUSE_TYPES[a.houseType] || HOUSE_TYPES.pavillon;
    var per = PERIODS[a.period || ht.defaultPeriod] || PERIODS.y48_74;
    var floors = a.floors || ht.floors;
    var ceiling = ht.ceiling || per.ceiling;
    var m2 = Math.max(15, a.m2 || 100);

    /* Geometrie: footprint, omtrek (vierkante benadering), raam = 1/6 Shab (RT-vuistregel) */
    var fp = m2 / floors;
    var per4 = 4 * Math.sqrt(fp);
    var winA = Math.max(2, Math.round(m2 / 6));
    var wallGross = per4 * ceiling * floors;
    if (ht.terraced) wallGross *= 0.5;      // 2 gevels gedeeld
    if (ht.apartment) wallGross *= 0.4;     // 1-2 buitengevels
    var wallA = Math.max(10, Math.round((wallGross - winA) / 5) * 5);
    var r5 = function (x) { return Math.max(5, Math.round(x / 5) * 5); };
    var roofA = ht.apartment ? 0 : r5(fp * 1.1); // licht overstek/helling
    var floorA = ht.apartment ? 0 : r5(fp);

    /* Isolatie: periode-forfaits + renovatie-overrides */
    var u = { wallU: per.wallU, roofU: per.roofU, floorU: per.floorU, winU: per.winU };
    var reno = a.renovations || [];
    reno.forEach(function (r) {
      var o = RENO[r]; if (o) Object.keys(o).forEach(function (k) { u[k] = o[k]; });
    });

    var heat = HEATING[a.heating] || HEATING.elec;
    var usage = USAGE[a.usage] || USAGE.permanent;

    var fields = {
      zone: a.zone || 'centre',
      woonoppervlak: m2,
      ceilingH: ceiling,
      floors: String(floors),
      volume: Math.round(m2 * ceiling),
      ventType: 'natural',
      ach: per.ach,
      wallA: wallA, wallU: u.wallU,
      roofA: roofA, roofU: u.roofU,
      floorA: floorA, floorU: u.floorU,
      winA: winA, winU: u.winU,
      setpoint: 20, awaySetpoint: 12,
      presentDaysWinter: usage.winter, presentDaysSummer: usage.summer,
      mainType: heat.mainType, mainScop: heat.mainScop, mainEta: heat.mainEta,
      auxType: 'none',
      persons: a.persons || 2, showersPerPerson: 1, litersPer: 55,
      dhwType: heat.mainType === 'gas' ? 'gas' : 'elec', dhwScop: 2.5, dhwEta: 0.9
    };

    var renoLbl = { roof: 'dak', walls: 'muren', windows: 'ramen', floor: 'vloer' };
    var summary = [
      ht.label + ' · ' + per.label + ' · ' + m2 + ' m² · ' + floors + ' bouwla' + (floors === 1 ? 'ag' : 'gen'),
      reno.length ? 'Gerenoveerd: ' + reno.map(function (r) { return renoLbl[r] || r; }).join(', ') : 'Geen renovaties opgegeven — forfaitaire waarden per bouwperiode',
      'Verwarming: ' + heat.mainType + ' · Gebruik: ' + usage.label + ' (' + (usage.winter + usage.summer) + ' d/j)'
    ];

    return { fields: fields, summary: summary };
  }

  global.PERIODS = PERIODS;
  global.HOUSE_TYPES = HOUSE_TYPES;
  global.USAGE_PROFILES = USAGE;
  global.applyArchetype = applyArchetype;
})(typeof window !== 'undefined' ? window : globalThis);
