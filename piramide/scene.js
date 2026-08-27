/* Kennispiramide — 3D-ordeningsmodel voor het scherm "Over ons".
 *
 * Overgenomen uit de ontwerp-referentie (design_handoff_kennispiramide). De
 * reken- en tekenlogica is bewust ongewijzigd gebleven: geometrie, textuur-
 * generatie en camera-inpassing zijn precies afgeregeld en niet met CSS te
 * benaderen. Aangepast is alleen wat nodig was om dit in de app-schil te laten
 * leven in plaats van op een eigen pagina:
 *
 *  - alle redactionele tekst komt uit piramide.json (parameter C), niet uit code;
 *  - elementen worden binnen de meegegeven container gezocht (#pir-*), zodat het
 *    scherm geen id's deelt met de rest van de app;
 *  - start/stop: de app haalt een scherm bij navigatie uit de DOM. Zonder
 *    opruimen wijst de renderer daarna naar een losgekoppelde node en houdt elk
 *    bezoek zijn eigen WebGL-context vast. stop() legt de lus stil, haalt de
 *    window-listeners weg en geeft de GPU-bronnen vrij.
 *
 * three.js staat lokaal in deze map (zie THREE-LICENSE) en wordt lui geladen:
 * wie de piramide niet opent, haalt hem niet binnen.
 */
import * as THREE from './three.module.min.js';
import { OPMAAK } from './opmaak.js';

export function startPiramide(wortel, C) {
  let rafId = 0;
  let levend = true;
  const opruimers = [];
  // Listeners op window overleven het scherm en moeten expliciet weg. Listeners
  // op elementen binnen de container verdwijnen met de container zelf.
  const aan = (doel, type, fn, opt) => {
    doel.addEventListener(type, fn, opt);
    opruimers.push(() => doel.removeEventListener(type, fn, opt));
  };

  // Maat van het inhoudsvlak van de app-schil. De referentie ging uit van een
  // eigen pagina en rekende met innerWidth/innerHeight; hier moet het scherm
  // binnen de schil passen, met de tabbalk bereikbaar.
  const BW = () => Math.max(1, wortel.clientWidth);
  const BH = () => Math.max(1, wortel.clientHeight);

  // De scene brengt zijn eigen opmaak mee, zodat het scherm in de app en de
  // losse pagina er gelijk uitzien zonder dat de regels op twee plekken staan.
  // Eén keer per document; stop() haalt hem weg als niemand hem meer gebruikt.
  let stijl = document.getElementById('pir-opmaak');
  if (!stijl) {
    stijl = document.createElement('style');
    stijl.id = 'pir-opmaak';
    stijl.textContent = OPMAAK;
    document.head.appendChild(stijl);
  }


  const BORDEAUX = '#800000';
  const KOPFONT = '"Poppins", system-ui, sans-serif';
  const TEKSTFONT = '"Mulish", system-ui, sans-serif';

  /* ---------- kleurgereedschap: mengen en verzadigen ---------- */
  function rgbVan(hex) {
    const n = parseInt(String(hex).replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function meng(a, b, t) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }
  function verzadig(c, k) {                       // k = 1 volle kleur, 0 grijs
    const l = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
    return meng([l, l, l].map(Math.round), c, k);
  }
  const rgbTxt = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  /* ---------- afmetingen (iets slanker dan Egyptisch) ---------- */
  const HALF = 1.10;              // halve breedte grondvlak
  const HOOG = 2.40;              // totale hoogte
  const Y0 = -HOOG / 2;           // grondvlak
  const Y1 =  HOOG / 2;           // punt

  /* ---------- de drie banden, van boven naar beneden ---------- */
  const BANDEN = (C.BANDEN || []).slice(0, 3);
  const SOM = BANDEN.reduce((s, b) => s + (+b.procent || 0), 0) || 100;
  // f = hoogtefractie, 0 = grondvlak, 1 = punt
  let _f = 1;
  const BANDVAK = BANDEN.map(b => {
    const d = (+b.procent || 0) / SOM;
    const top = _f, bot = _f - d;
    _f = bot;
    return { band: b, fTop: top, fBot: Math.max(0, bot), deel: d };
  });
  // de zijdenaam met omschrijving staat in de middelste band; die is hoog
  // genoeg en breed genoeg, terwijl de onderste band een lage brede strook is
  const ZIJDEBAND = Math.min(1, BANDVAK.length - 1);
  /* twee leesniveaus: 0 = alleen de hiërarchie, 1 = met zijden en rubrieken */
  let NIVEAU = 0;
  const fracHalf = f => HALF * (1 - f);
  const fracY = f => Y0 + HOOG * f;

  /* ---------- scene ---------- */
  const host = wortel.querySelector('#pir-scene');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(BW(), BH());
  renderer.setClearColor('#F1EDE8', 1);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, BW() / BH(), 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xEFE9E1, 2.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(4, 6, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.9); fill.position.set(-5, 2, -4); scene.add(fill);
  const under = new THREE.DirectionalLight(0xffffff, 1.2); under.position.set(0, -6, 2); scene.add(under);

  const model = new THREE.Group(); model.name = 'kennispiramide'; scene.add(model);

  /* ---------- helpers voor tekst op canvas ---------- */
  function fitFont(g, text, weight, family, start, maxW) {
    let s = start;
    while (s > 12) { g.font = `${weight} ${s}px ${family}`; if (g.measureText(text).width <= maxW) break; s -= 2; }
    return s;
  }
  function wrap(g, text, maxW) {
    const words = String(text).split(/\s+/); const lines = []; let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function tex(canvas) {
    const t = new THREE.CanvasTexture(canvas);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function rgba(hex, a) {
    const n = parseInt(hex.replace('#', ''), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  /* ---------- textuur voor één band op één zijvlak ---------- */
  /* wb / wt = wereldbreedte onder- en bovenrand, h = wereldhoogte van de band */
  function bandTextuur(zijde, i, vak, b, niveau) {
    const wb = fracHalf(vak.fBot) * 2, wt = fracHalf(vak.fTop) * 2;
    const h = HOOG * vak.deel;
    const W = 900;
    const H = Math.max(150, Math.min(1500, Math.round(W * h / wb)));
    const r = wt / wb;                       // relatieve breedte van de bovenrand
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const acc = zijde.kleur || BORDEAUX;
    const sat = Math.max(0, Math.min(1, (b.verzadiging ?? 100) / 100));
    const eigen = verzadig(rgbVan(acc), sat);
    const linksBuur = verzadig(meng(rgbVan(acc), rgbVan((zijden[(i + 3) % 4] || zijde).kleur || acc), 0.5), sat);
    const rechtsBuur = verzadig(meng(rgbVan(acc), rgbVan((zijden[(i + 1) % 4] || zijde).kleur || acc), 0.5), sat);

    // dichtheid en rijkdom lopen op naar boven: ERVARING het volst, DATA het kaalst
    const dicht = [1.7, 1.0, 0.55][vak.idx] ?? 1;
    const rijk = [1.25, 0.9, 0.5][vak.idx] ?? 1;
    const ink = a => Math.min(0.5, a * dicht * rijk);
    const grond = 0.10 + 0.20 * sat;

    g.fillStyle = '#FAF7F3'; g.fillRect(0, 0, W, H);

    const p = new Path2D();
    p.moveTo(0, H); p.lineTo(W, H);
    p.lineTo(W / 2 + (W * r) / 2, 0); p.lineTo(W / 2 - (W * r) / 2, 0);
    p.closePath();
    g.save(); g.clip(p);

    // eigen kleur van de zijde, langs de ribben overlopend in de buren
    const gr = g.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0, rgbTxt(linksBuur, grond));
    gr.addColorStop(0.15, rgbTxt(eigen, grond));
    gr.addColorStop(0.85, rgbTxt(eigen, grond));
    gr.addColorStop(1, rgbTxt(rechtsBuur, grond));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);

    // breedte van het vlak op canvashoogte y
    const wAt = y => W * r + (W - W * r) * (y / H);

    // ---- oppervlaktebehandeling: elke zijde een eigen karakter ----
    if (i === 0) {                                   // fijne horizontale arcering
      g.strokeStyle = rgbTxt(eigen, ink(0.26)); g.lineWidth = 1.6;
      const st = 11 / dicht;
      for (let y = 6; y < H; y += st) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    } else if (i === 1) {                            // puntraster
      g.fillStyle = rgbTxt(eigen, ink(0.30));
      const st = 22 / dicht;
      for (let y = st / 2; y < H; y += st) for (let x = st / 2; x < W; x += st) {
        g.beginPath(); g.arc(x, y, 2.6, 0, 6.3); g.fill();
      }
    } else if (i === 2) {                            // diagonale arcering
      g.strokeStyle = rgbTxt(eigen, ink(0.26)); g.lineWidth = 2;
      const st = 40 / dicht;
      for (let x = -H; x < W + H; x += st) { g.beginPath(); g.moveTo(x, H); g.lineTo(x + H, 0); g.stroke(); }
    } else {                                         // verticale strepen
      g.strokeStyle = rgbTxt(eigen, ink(0.20)); g.lineWidth = 1.6;
      const st = 52 / dicht;
      for (let x = st / 2; x < W; x += st) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    }

    // ---- tekstblok: eerst meten, dan plaatsen, nooit over de rand ----
    const naam = (b.naam || '').toUpperCase();
    const merk = (b.merk || '').toUpperCase();
    const bron = b.bron || '';
    const toonBand = vak.deel >= 0.15 && !!naam;
    const draagtZijde = vak.idx === ZIJDEBAND && (niveau ?? NIVEAU) > 0;
    const zn = (zijde.naam || '').toUpperCase();
    const omsch = zijde.omschrijving || '';
    const marge = Math.max(10, H * 0.06);
    const spat = vak.idx === 0 ? 0 : 4;
    // maat van de bandnaam in WERELDmaat, niet in beeldpunten: elke band heeft
    // een eigen doekschaal, dus alleen zo staat ERVARING groter dan KENNIS en DATA
    const wereldNaam = [0.26, 0.13, 0.10][vak.idx] ?? 0.12;
    const pxPerWereld = H / h;

    g.textAlign = 'center'; g.textBaseline = 'top';

    function breed(fs, gewicht, font, txt, sp) {
      if (g.letterSpacing !== undefined) g.letterSpacing = (sp || 0) + 'px';
      g.font = `${gewicht} ${fs}px ${font}`;
      const w = g.measureText(txt).width;
      if (g.letterSpacing !== undefined) g.letterSpacing = '0px';
      return w;
    }

    // een poging: schaal van de letters, en hoeveel regels omschrijving mee mogen
    function poging(sch, maxRegels, extra) {
      const fs1 = Math.min(wereldNaam * pxPerWereld, H * 0.42) * sch;
      // op het vlak dat een domein draagt is het werkwoord de hoofdzaak: dan
      // wordt de bandnaam een klein kenmerk erboven en het werkwoord de kop
      const fsB = draagtZijde ? Math.max(fs1 * 0.40, 17) : fs1;
      const fs2 = draagtZijde ? Math.min(Math.max(fs1 * 1.02, 30), 104) : 0;
      const fs3 = Math.min(Math.max(fs1 * 0.30, 16), 30);
      const fsm = Math.min(Math.max(fsB * 0.26, 19), 34);
      const bar = Math.max(4, fsB * 0.07);
      const rij = [];
      if (draagtZijde) {
        if (toonBand) rij.push({ soort: 'kenmerk', fs: fsB, h: fsB * 1.5, txt: naam, sp: 5 });
        rij.push({ soort: 'zijde', fs: fs2, h: fs2 * 1.16, txt: zn, sp: 4 });
        rij.push({ soort: 'streep', fs: bar, h: bar + fs2 * 0.30 });
        if (maxRegels > 0 && omsch) {
          g.font = `400 ${fs3}px ${TEKSTFONT}`;
          const proef = wrap(g, omsch, wAt(H * 0.72) * 0.66).slice(0, maxRegels);
          proef.forEach(ln => rij.push({ soort: 'tekst', fs: fs3, h: fs3 * 1.34, txt: ln }));
        }
      } else if (toonBand) {
        rij.push({ soort: 'band', fs: fs1, h: fs1 * 1.06, txt: naam, sp: spat });
        if (extra && merk) rij.push({ soort: 'merk', fs: fsm, h: fsm * 1.75, txt: merk, sp: 3 });
        rij.push({ soort: 'streep', fs: bar, h: bar + fs1 * 0.34 });
      }
      if (extra && bron) {
        g.font = `600 ${fsm}px ${TEKSTFONT}`;
        const bl = wrap(g, bron, wAt(H * 0.86) * 0.60).slice(0, 2);
        if (bl.length) rij.push({ soort: 'lucht', fs: 0, h: fsm * 0.9 });
        bl.forEach(ln => rij.push({ soort: 'bron', fs: fsm, h: fsm * 1.4, txt: ln }));
      }
      if (!rij.length) return { rij: [], y0: 0 };

      const Hb = rij.reduce((t, e) => t + e.h, 0);
      // hoe hoger de band, hoe lager het blok mag zakken: daar is het vlak breed
      const anker = vak.idx === 0 ? 0.86 : 0.66;
      let y0 = Math.min(H - marge - Hb, Math.max(marge, H * anker - Hb / 2));

      // past het blok op deze hoogte binnen de werkelijke breedte van het vlak?
      const past = yy => {
        let y = yy;
        for (const e of rij) {
          if (e.txt) {
            const beschik = wAt(y) * (e.soort === 'band' || e.soort === 'zijde' ? 0.86 : e.soort === 'merk' || e.soort === 'bron' || e.soort === 'kenmerk' ? 0.70 : 0.72);
            const gew = e.soort === 'tekst' ? 400 : e.soort === 'kenmerk' ? 600 : 700;
            const font = e.soort === 'tekst' || e.soort === 'bron' ? TEKSTFONT : KOPFONT;
            if (breed(e.fs, gew, font, e.txt, e.sp) > beschik) return false;
          }
          y += e.h;
        }
        return true;
      };
      // liever laten zakken naar het brede deel dan de letters verkleinen
      while (!past(y0) && y0 + Hb < H - marge) y0 += H * 0.015;
      if (!past(y0)) return null;
      return { rij, y0 };
    }

    // de uitleg (merkregel en bronregel) weegt zwaarder dan de lettermaat:
    // eerst het hele maatbereik met uitleg proberen, pas daarna zonder
    let plan = null;
    for (const extra of [true, false]) {
      for (let sch = 1; sch >= 0.42 && !plan; sch -= 0.06) {
        for (const regels of [2, 1, 0]) {
          plan = poging(sch, regels, extra);
          if (plan) break;
        }
      }
      if (plan) break;
    }

    if (plan && plan.rij.length) {
      let y = plan.y0;
      for (const e of plan.rij) {
        if (e.soort === 'band') {
          if (g.letterSpacing !== undefined) g.letterSpacing = e.sp + 'px';
          g.font = `700 ${e.fs}px ${KOPFONT}`;
          g.fillStyle = vak.idx === 0 ? rgbTxt(verzadig(rgbVan(acc), 1), 1) : '#241F1C';
          g.fillText(e.txt, W / 2, y);
          if (g.letterSpacing !== undefined) g.letterSpacing = '0px';
        } else if (e.soort === 'merk') {
          if (g.letterSpacing !== undefined) g.letterSpacing = e.sp + 'px';
          g.font = `700 ${e.fs}px ${KOPFONT}`;
          g.fillStyle = rgbTxt(verzadig(rgbVan(acc), 1), 0.95);
          g.fillText(e.txt, W / 2, y);
          if (g.letterSpacing !== undefined) g.letterSpacing = '0px';
        } else if (e.soort === 'bron') {
          g.font = `600 ${e.fs}px ${TEKSTFONT}`;
          g.fillStyle = '#4A423C';
          g.fillText(e.txt, W / 2, y);
        } else if (e.soort === 'streep') {
          const aw = Math.min(wAt(y) * 0.42, e.fs * 26);
          g.fillStyle = rgbTxt(eigen, 0.95);
          g.fillRect(W / 2 - aw / 2, y, aw, e.fs);
        } else if (e.soort === 'zijde') {
          if (g.letterSpacing !== undefined) g.letterSpacing = e.sp + 'px';
          g.font = `700 ${e.fs}px ${KOPFONT}`;
          g.fillStyle = '#241F1C';
          g.fillText(e.txt, W / 2, y);
          if (g.letterSpacing !== undefined) g.letterSpacing = '0px';
        } else if (e.soort === 'kenmerk') {
          if (g.letterSpacing !== undefined) g.letterSpacing = e.sp + 'px';
          g.font = `600 ${e.fs}px ${KOPFONT}`;
          g.fillStyle = rgbTxt(verzadig(rgbVan(acc), 1), 0.9);
          g.fillText(e.txt, W / 2, y);
          if (g.letterSpacing !== undefined) g.letterSpacing = '0px';
        } else if (e.soort === 'tekst') {
          g.font = `400 ${e.fs}px ${TEKSTFONT}`;
          g.fillStyle = '#5C534B';
          g.fillText(e.txt, W / 2, y);
        }
        y += e.h;
      }
    }

    g.restore();

    // ---- scheidingslijn: doorlopende rand langs de bovenkant van de band ----
    g.strokeStyle = rgbTxt(eigen, 0.6); g.lineWidth = 4; g.stroke(p);
    if (vak.idx > 0) {
      g.strokeStyle = rgba('#2C2724', 0.55); g.lineWidth = 7;
      g.beginPath(); g.moveTo(W / 2 - (W * r) / 2, 3); g.lineTo(W / 2 + (W * r) / 2, 3); g.stroke();
    }

    return tex(c);
  }

  /* ---------- vier zijvlakken maal drie banden ---------- */
  const hoverbaar = [];
  const zijden = C.ZIJDEN.slice(0, 4);
  BANDVAK.forEach((v, k) => v.idx = k);

  function bandGeom(vak) {
    const hb = fracHalf(vak.fBot), ht = fracHalf(vak.fTop);
    const yb = fracY(vak.fBot), yt = fracY(vak.fTop);
    const r = ht / hb;
    const g = new THREE.BufferGeometry();
    const v = new Float32Array([
      -hb, yb, hb,   hb, yb, hb,   ht, yt, ht,
      -hb, yb, hb,   ht, yt, ht,  -ht, yt, ht
    ]);
    const uv = new Float32Array([
      0, 0, 1, 0, 0.5 + r / 2, 1,
      0, 0, 0.5 + r / 2, 1, 0.5 - r / 2, 1
    ]);
    g.setAttribute('position', new THREE.BufferAttribute(v, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }

  zijden.forEach((z, i) => {
    BANDVAK.forEach(vak => {
      const b = vak.band;
      const mat = new THREE.MeshStandardMaterial({
        map: bandTextuur(z, i, vak, b, NIVEAU), roughness: 0.88, metalness: 0.0,
        emissive: new THREE.Color(b.kleur || BORDEAUX), emissiveIntensity: 0
      });
      mat.name = 'zijde_' + 'ABCD'[i] + '_band_' + (vak.idx + 1);
      const m = new THREE.Mesh(bandGeom(vak), mat);
      m.name = 'vlak_' + 'ABCD'[i] + (vak.idx + 1);
      m.rotation.y = i * Math.PI / 2;
      m.userData = {
        naam: z.naam + ' — ' + b.naam,
        tekst: b.omschrijving,
        detail: (b.waarom ? b.waarom + '\n\n' : '') + b.omschrijving,
        soort: (b.merk ? b.merk + ' · ' : '') + 'band op zijvlak ' + z.naam,
        kleur: b.kleur || BORDEAUX,
        // de onderste band draagt de bronnenhi\u00ebrarchie: die vult hem
        // de bronnenrangorde heeft zijn eigen band; deze kaart blijft kort
        rangen: null,
        zijde: i, vak, mat
      };
      model.add(m); hoverbaar.push(m);
    });
  });

  function puntTextuur() {
    const W = 900, H = 240, c = document.createElement('canvas'); c.width = W; c.height = H;
    const gg = c.getContext('2d');
    gg.textAlign = 'center'; gg.textBaseline = 'middle';
    const naam = (C.PUNT.naam || '').toUpperCase();
    if (gg.letterSpacing !== undefined) gg.letterSpacing = '6px';
    fitFont(gg, naam, 600, KOPFONT, 104, W * 0.84);
    gg.fillStyle = C.PUNT.kleur || BORDEAUX;
    gg.fillText(naam, W / 2, H / 2);
    if (gg.letterSpacing !== undefined) gg.letterSpacing = '0px';
    return tex(c);
  }

  /* ---------- label bij de punt ---------- */
  (function () {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puntTextuur(), transparent: true, depthTest: true, depthWrite: false }));
    sp.name = 'punt_label';
    sp.scale.set(1.9, 0.51, 1); sp.position.set(0, Y1 + 0.32, 0);
    model.add(sp);
  })();

  /* ---------- grondvlak: twaalf rubrieken, drie per zijde ---------- */
  /* Elke zijde heeft een eigen strook langs zijn onderrand; de drie velden
     daarin zijn de rubrieken uit het menu van Infofrankrijk.com. De strook is
     precies zo diep dat de velden vierkant uitkomen. Alles wordt in het
     assenstelsel van zijde A uitgerekend en daarna met de zijde meegedraaid,
     zodat het van boven en van onderaf op dezelfde plek uitkomt. Het hart
     blijft vrij: daar staat de piramide zelf op. */

  function veldTextuur(label, kleur, neutraal, heeftLink, thema, verhouding) {
    const W = 700, H = Math.max(240, Math.round(W * (verhouding || 1)));
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const k = rgbVan(kleur || BORDEAUX);
    g.fillStyle = '#FBF9F6'; g.fillRect(0, 0, W, H);
    g.fillStyle = rgbTxt(k, neutraal ? 0.08 : 0.22); g.fillRect(0, 0, W, H);
    g.strokeStyle = rgbTxt(k, neutraal ? 0.45 : 0.6);
    g.lineWidth = 14; g.strokeRect(7, 7, W - 14, H - 14);

    // themabalk: laat zien bij welke zijde dit veld hoort
    const bh = 74;
    g.fillStyle = rgbTxt(k, neutraal ? 0.55 : 0.95);
    g.fillRect(0, 0, W, bh);
    if (thema) {
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (g.letterSpacing !== undefined) g.letterSpacing = '3px';
      const tf = fitFont(g, thema, 700, KOPFONT, 34, W * 0.84);
      g.font = `700 ${tf}px ${KOPFONT}`;
      g.fillStyle = '#FBF9F6';
      g.fillText(thema, W / 2, bh / 2 + 2);
      if (g.letterSpacing !== undefined) g.letterSpacing = '0px';
    }

    /* zo groot mogelijk zetten: liever meer regels dan kleinere letters */
    const mid = bh + (H - bh) / 2;
    const maxW = W * 0.80, maxH = (H - bh) * 0.70;
    let fs = 112, lijnen = [label];
    for (; fs >= 26; fs -= 2) {
      g.font = `700 ${fs}px ${TEKSTFONT}`;
      lijnen = wrap(g, label, maxW);
      const past = lijnen.every(ln => g.measureText(ln).width <= maxW);
      if (past && lijnen.length <= 5 && lijnen.length * fs * 1.2 <= maxH) break;
    }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const lh = fs * 1.2;
    // lichte achtergloed onder de tekst, precies om het blok heen
    g.font = `700 ${fs}px ${TEKSTFONT}`;
    const bw = Math.min(maxW + fs * 0.5, Math.max(...lijnen.map(ln => g.measureText(ln).width)) + fs * 0.5);
    g.fillStyle = 'rgba(251,249,246,.88)';
    g.fillRect(W / 2 - bw / 2, mid - lijnen.length * lh / 2 - fs * 0.24, bw, lijnen.length * lh + fs * 0.48);
    g.fillStyle = '#2E2924';
    g.font = `700 ${fs}px ${TEKSTFONT}`;
    lijnen.forEach((ln, n) => g.fillText(ln, W / 2, mid + (n - (lijnen.length - 1) / 2) * lh));

    /* aantikbaar: plusteken rechtsonder, pijl als er een verwijzing is */
    g.strokeStyle = neutraal ? rgba(BORDEAUX, 0.5) : rgbTxt(k, 0.62);
    g.lineWidth = 7; g.lineCap = 'butt';
    const cx = W - 62, cy = H - 62, a = 17;
    g.beginPath(); g.moveTo(cx - a, cy); g.lineTo(cx + a, cy);
    if (!heeftLink) { g.moveTo(cx, cy - a); g.lineTo(cx, cy + a); }
    else { g.moveTo(cx + a - 12, cy - 12); g.lineTo(cx + a, cy); g.lineTo(cx + a - 12, cy + 12); }
    g.stroke();
    return tex(c);
  }

  const veldMeshes = [];
  (function () {
    const G = C.GRONDVLAK || {};
    const T = C.TOELICHTING || {};
    // strookdiepte zo gekozen dat drie velden per zijde vierkant uitkomen:
    // 2H = 2D + 3D, dus D = 2H/5
    const DIEP = (HALF * 2) / 5;
    const BREED = HALF * 2 - DIEP * 2;

    function zet(label, data, kleur, neutraal, i, lx, lz, tw, th, sleutel, thema) {
      const a = i * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
      const t = T[label] || {};
      data = Object.assign({ detail: t.tekst || data.tekst, link: t.link || '', linktekst: t.linktekst || '' }, data);
      const geo = new THREE.PlaneGeometry(tw * 0.955, th * 0.955);
      geo.rotateX(Math.PI / 2);         // normaal naar beneden, tekst leest van onderaf
      const verh = th / tw;
      const mat = new THREE.MeshStandardMaterial({
        map: veldTextuur(label, kleur, neutraal, !!t.link, thema, verh), roughness: 0.9, metalness: 0,
        emissive: new THREE.Color(kleur || BORDEAUX), emissiveIntensity: 0
      });
      mat.name = 'veld_' + sleutel;
      const m = new THREE.Mesh(geo, mat);
      m.name = 'veld_' + sleutel;
      m.position.set(lx * ca + lz * sa, Y0 - 0.004, -lx * sa + lz * ca);
      m.visible = NIVEAU === 1;
      m.userData = Object.assign({ mat, label, kleur: kleur || BORDEAUX, neutraal: !!neutraal, heeftLink: !!t.link, thema, verh }, data);
      model.add(m); hoverbaar.push(m); veldMeshes.push(m);
    }

    zijden.forEach((z, i) => {
      const lijst = ((G.VELDEN || [])[i] || []);
      const n = lijst.length;
      if (!n) return;
      const tw = BREED / n, th = DIEP, lz = HALF - th / 2;
      lijst.forEach((label, j) => {
        zet(label, { naam: label, soort: 'Rubriek van ' + z.naam, tekst: z.omschrijving },
          z.kleur || BORDEAUX, false, i, -BREED / 2 + tw * (j + 0.5), lz, tw, th,
          'ABCD'[i] + (j + 1), (z.naam || '').toUpperCase());
      });
    });

    // vier domeinoverstijgende diensten: blok van twee bij twee in het hart
    const d = DIEP, plek = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    ((G.MIDDEN) || []).slice(0, 4).forEach((label, n) => {
      zet(label, { naam: label, soort: 'Domeinoverstijgende dienst', tekst: 'hoort bij alle vier de zijden' },
        '#6B6259', true, 0, plek[n][0] * d / 2, plek[n][1] * d / 2, d, d, 'midden' + (n + 1), 'ALLE VIER');
    });

    // dichte plaat net boven de tegels: van onderaf dekt hij alles af wat
    // hoger in het model staat, zodat het puntlabel niet door de kieren
    // tussen de tegels heen te zien is. Van bovenaf ligt hij onder de
    // piramide zelf en is hij dus onzichtbaar.
    const plaatGeo = new THREE.PlaneGeometry(HALF * 2, HALF * 2);
    plaatGeo.rotateX(Math.PI / 2);
    const plaat = new THREE.Mesh(plaatGeo, new THREE.MeshBasicMaterial({
      color: '#E7E1D9', side: THREE.DoubleSide, depthWrite: true
    }));
    plaat.name = 'grondvlak_plaat'; plaat.position.y = Y0 + 0.04; model.add(plaat);

    // dunne omranding van het grondvlak
    const e = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(HALF * 2, 0.001, HALF * 2)),
      new THREE.LineBasicMaterial({ color: 0x800000, transparent: true, opacity: 0.35 })
    );
    e.name = 'grondvlak_rand'; e.position.y = Y0 - 0.004; model.add(e);
  })();

  /* ---------- eigen draai- en kantelbesturing ---------- */
  const START = { theta: 0.62, phi: 1.18 };
  const DOEL = new THREE.Vector3(0, -0.40, 0);
  const cam = { theta: START.theta, phi: START.phi, radius: 9, doelY: -0.40 };
  let handmatig = false;      // heeft de gebruiker zelf gedraaid of gezoomd?
  let vT = 0, vP = 0;
  const MINR = 3.0, MAXR = 22, MINP = 0.09, MAXP = Math.PI - 0.09;

  /* ---------- het beeld meten in plaats van uitrekenen ----------
     De vrije rechthoek wordt afgelezen van de werkelijke schermelementen; de
     afstand volgt uit de éécht geprojecteerde omhullende van het model. Zo
     hoeft geen enkele wereldmaat te worden geraden en klopt de inpassing in
     elk aanzicht, ook van onderaf. */
  const MIDY = (Y0 + Y1) / 2;

  function vak(id) {
    const e = wortel.querySelector('#pir-' + id);
    if (!e) return null;
    const r = e.getBoundingClientRect(), w = wortel.getBoundingClientRect();
    // Alles binnen dit scherm rekent in container-coördinaten; de piramide vult
    // het inhoudsvlak van de app-schil, niet het hele venster.
    return { left: r.left - w.left, right: r.right - w.left, top: r.top - w.top,
             bottom: r.bottom - w.top, width: r.width, height: r.height };
  }

  function zones() {
    const bar = vak('balk'), kop = vak('kop'), pan = vak('uitlees');
    const liggend = !bar || bar.width > BW() * 0.5;
    const kopH = (kop ? kop.bottom : 90) + 18;
    const onder = liggend
      ? Math.max(26, BH() - Math.min(bar ? bar.top : BH(), pan ? pan.top : BH()) + 14)
      : 26;
    const links = liggend ? 12 : Math.max(bar ? bar.right : 0, pan ? pan.right : 0) + 18;
    return {
      x: links, y: kopH,
      w: Math.max(240, BW() - 16 - links),
      h: Math.max(150, BH() - kopH - onder)
    };
  }

  function zetCam(theta, phi, radius, doelY) {
    const sp = Math.sin(phi);
    const d = new THREE.Vector3(0, doelY, 0);
    camera.position.set(radius * sp * Math.sin(theta), radius * Math.cos(phi), radius * sp * Math.cos(theta));
    camera.position.add(d); camera.lookAt(d); camera.updateMatrixWorld(true);
  }

  function projVak(punten) {
    const v = new THREE.Vector3();
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of punten) {
      v.copy(p).project(camera);
      const px = (v.x * 0.5 + 0.5) * BW(), py = (-v.y * 0.5 + 0.5) * BH();
      x0 = Math.min(x0, px); x1 = Math.max(x1, px);
      y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
    return { w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0), cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }

  const P_BASIS = [
    new THREE.Vector3(-HALF, Y0, -HALF), new THREE.Vector3(HALF, Y0, -HALF),
    new THREE.Vector3(HALF, Y0, HALF), new THREE.Vector3(-HALF, Y0, HALF),
    new THREE.Vector3(0, Y1, 0)
  ];
  const P_GROND = P_BASIS.slice(0, 4);
  /* Op een smal scherm is het hele grondvlak in één beeld onleesbaar: twaalf
     velden op 390px geeft labels van een paar pixels. Daarom kan er per zijde
     ingezoomd worden — dezelfde bewering als het model zelf doet: elk domein
     heeft zijn eigen rubrieken. De veldtekst staat op alle vier de zijden in
     dezelfde richting, dus blijft de camerahoek gelijk aan die van het hele
     grondvlak; alleen het kader schuift naar de strook. */
  const SMAL = () => BW() < 761;
  const STROOK_D = (HALF * 2) / 5;
  function _rond(i, lx, lz) {
    const a = i * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
    return new THREE.Vector3(lx * ca + lz * sa, Y0, -lx * sa + lz * ca);
  }
  function P_STROOK(i) {
    const br = HALF * 2 - STROOK_D * 2, bi = HALF - STROOK_D;
    return [[-br / 2, bi], [br / 2, bi], [br / 2, HALF], [-br / 2, HALF]].map(p => _rond(i, p[0], p[1]));
  }
  function P_MIDDEN() {
    const d = STROOK_D;
    return [[-d, -d], [d, -d], [d, d], [-d, d]].map(p => _rond(0, p[0], p[1]));
  }
  function P_RING(v) {
    const hb = fracHalf(v.fBot), ht = Math.max(0.02, fracHalf(v.fTop));
    const yb = fracY(v.fBot), yt = fracY(v.fTop);
    const p = [];
    for (const s of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      p.push(new THREE.Vector3(s[0] * hb, yb, s[1] * hb));
      p.push(new THREE.Vector3(s[0] * ht, yt, s[1] * ht));
    }
    return p;
  }
  /* Waar we nu naar kijken. Zonder dit past het model bij elke hermeting terug
     op de hele piramide, en verdwijnt een ingezoomde strook uit beeld. */
  let kaderPunten = P_BASIS, kaderLabel = true;

  /* het label staat altijd naar de kijker: de hoeken liggen langs de camera-assen */
  function P_LABEL() {
    const r = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(0.95);
    const b = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).multiplyScalar(0.26);
    const c = new THREE.Vector3(0, Y1 + 0.32, 0);
    return [c.clone().add(r).add(b), c.clone().add(r).sub(b), c.clone().sub(r).add(b), c.clone().sub(r).sub(b)];
  }

  function pasIn(theta, phi, doelY, punten, metLabel) {
    camera.clearViewOffset(); camera.updateProjectionMatrix();
    const R = zones();
    const alles = () => (metLabel ? punten.concat(P_LABEL()) : punten);
    let r = cam.radius, b;
    for (let i = 0; i < 6; i++) {
      zetCam(theta, phi, r, doelY);
      b = projVak(alles());
      r = Math.min(MAXR, Math.max(MINR, r / Math.min(R.w / b.w, R.h / b.h) * 1.01));
    }
    zetCam(theta, phi, r, doelY);
    b = projVak(alles());
    return { r, dx: b.cx - (R.x + R.w / 2), dy: b.cy - (R.y + R.h / 2) };
  }

  function stelOffset(dx, dy) {
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2) camera.clearViewOffset();
    else camera.setViewOffset(BW(), BH(), dx, dy, BW(), BH());
    camera.updateProjectionMatrix();
  }

  /* naar een aanzicht toe: eerst meten, dan verschuiven, dan bewegen */
  function naar(theta, phi, punten, doelY = MIDY, metLabel = false) {
    handmatig = false;
    kaderPunten = punten; kaderLabel = metLabel;
    const k = pasIn(theta, phi, doelY, punten, metLabel);
    stelOffset(k.dx, k.dy);
    ga(theta, phi, k.r, doelY);
  }

  /* Zelfherstellend: zodra het venster of een schermelement van maat verandert
     wordt opnieuw ingepast, zolang de gebruiker niet zelf aan het beeld heeft
     gezeten. Zonder dit blijft een inpassing van het laadmoment staan. */
  let laatsteMaat = '', laatsteMeting = 0;
  function controleerKader(nu) {
    if (nu - laatsteMeting < 300) return;
    laatsteMeting = nu;
    const bar = vak('balk'), kop = vak('kop'), pan = vak('uitlees');
    const m = [BW(), BH(), bar && Math.round(bar.height), bar && Math.round(bar.top),
      kop && Math.round(kop.bottom), pan && Math.round(pan.height)].join('|');
    if (m === laatsteMaat) return;
    laatsteMaat = m;
    if (handmatig || tween) return;
    const k = pasIn(cam.theta, cam.phi, cam.doelY, kaderPunten, kaderLabel);
    cam.radius = k.r; stelOffset(k.dx, k.dy);
  }

  function plaatsCamera() {
    const sp = Math.sin(cam.phi);
    camera.position.set(
      cam.radius * sp * Math.sin(cam.theta),
      cam.radius * Math.cos(cam.phi),
      cam.radius * sp * Math.cos(cam.theta)
    );
    DOEL.y = cam.doelY;
    camera.position.add(DOEL);
    camera.lookAt(DOEL);
  }

  const el = renderer.domElement;
  const pointers = new Map();
  let dragging = false, last = null, pinch = 0, moved = 0;

  el.addEventListener('pointerdown', e => {
    el.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) { dragging = true; moved = 0; last = { x: e.clientX, y: e.clientY }; host.classList.add('dragging'); tween = null; }
    if (pointers.size === 2) { pinch = afstand(); dragging = false; }
  });
  el.addEventListener('pointermove', e => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const d = afstand();
      if (pinch > 0) { cam.radius = clamp(cam.radius * (pinch / d), MINR, MAXR); handmatig = true; }
      pinch = d; return;
    }
    if (dragging && last) {
      const dx = e.clientX - last.x, dy = e.clientY - last.y;
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 10) handmatig = true;
      vT = -dx * 0.0052; vP = -dy * 0.0052;
      cam.theta += vT; cam.phi = clamp(cam.phi + vP, MINP, MAXP);
      last = { x: e.clientX, y: e.clientY };
    } else {
      wijs(e.clientX, e.clientY);
    }
  });
  function eindig(e) {
    const was = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = 0;
    if (pointers.size === 0) {
      const tik = dragging && moved < 10 && was;
      dragging = false; last = null; host.classList.remove('dragging');
      if (tik) {
        wijs(e.clientX, e.clientY);
        if (actief) { opendetail(actief.userData); if (!NIVEAU) zetNiveau(1); }
        else sluitDetail();
      } else if (SMAL()) {
        // vrij draaien op een telefoon levert scheve, onleesbare standen op:
        // laat het beeld terugvallen op de dichtstbijzijnde zijde
        vT = 0;
        const s = Math.round(cam.theta / (Math.PI / 2)) * (Math.PI / 2);
        ga(s, cam.phi, cam.radius, cam.doelY, 420);
      }
    }
  }
  el.addEventListener('pointerup', eindig);
  el.addEventListener('pointercancel', eindig);
  el.addEventListener('pointerleave', e => { if (!dragging) verbergTip(); });
  el.addEventListener('wheel', e => {
    e.preventDefault(); tween = null; handmatig = true;
    cam.radius = clamp(cam.radius * Math.exp(e.deltaY * 0.0013), MINR, MAXR);
  }, { passive: false });

  function afstand() {
    const p = [...pointers.values()];
    return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  }
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- vloeiende overgang naar een vast gezicht ---------- */
  let tween = null;
  function ga(theta, phi, radius, doelY = MIDY, ms = 850) {
    let dt = theta - cam.theta;
    while (dt > Math.PI) dt -= Math.PI * 2;
    while (dt < -Math.PI) dt += Math.PI * 2;
    tween = { t0: performance.now(), ms, from: { ...cam }, to: { theta: cam.theta + dt, phi: clamp(phi, MINP, MAXP), radius: clamp(radius, MINR, MAXR), doelY } };
    vT = vP = 0;
  }
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  /* ---------- twee leesniveaus en het betoog van onder naar boven ---------- */
  let niveauKnop = null, opbouwKnop = null, opbouwStap = 0;
  const OPB = C.OPBOUW || {};
  const OPBOUW_ORDE = BANDVAK.slice().reverse();      // DATA eerst, ERVARING als laatste

  function hertekenBanden() {
    zijden.forEach((z, i) => BANDVAK.forEach(vak => {
      const m = model.getObjectByName('vlak_' + 'ABCD'[i] + (vak.idx + 1));
      if (!m) return;
      m.material.map.dispose();
      m.material.map = bandTextuur(z, i, vak, vak.band, NIVEAU);
      m.material.needsUpdate = true;
    }));
  }

  function zetNiveau(n) {
    n = n ? 1 : 0;
    if (n !== NIVEAU) {
      NIVEAU = n;
      hertekenBanden();
      veldMeshes.forEach(o => { o.visible = NIVEAU === 1; });
      if (actief && !actief.visible) { actief.userData.mat.emissiveIntensity = 0; actief = null; }
    }
    if (niveauKnop) niveauKnop.textContent = NIVEAU ? (C.NIVEAU_UIT || 'Alleen hiërarchie') : (C.NIVEAU_AAN || 'Detail erbij');
    RUST.tekst = NIVEAU ? (C.RUSTREGEL_DETAIL || '') : (C.RUSTREGEL_HIERARCHIE || '');
    if (!actief) toonUitlees(RUST);
  }

  function zetOpbouwKnop() {
    if (!opbouwKnop) return;
    opbouwKnop.textContent = opbouwStap === 0 ? (OPB.naam || 'Opbouw')
      : opbouwStap >= OPBOUW_ORDE.length ? (OPB.slot || 'Nu het detail')
      : (OPB.volgende || 'Volgende stap');
  }

  function stapOpbouw() {
    if (opbouwStap >= OPBOUW_ORDE.length) {
      opbouwStap = 0; zetOpbouwKnop(); sluitDetail(); zetNiveau(1);
      naar(START.theta, START.phi, P_BASIS, MIDY, true);
      return;
    }
    zetNiveau(0);
    const v = OPBOUW_ORDE[opbouwStap], b = v.band;
    naar(0.42, 1.46, P_RING(v), fracY((v.fTop + v.fBot) / 2));
    opendetail({
      naam: b.naam,
      soort: 'Stap ' + (opbouwStap + 1) + ' van ' + OPBOUW_ORDE.length + ' — ' + (OPB.kop || 'opbouw'),
      detail: (b.waarom || '') + (b.omschrijving ? '\n\n' + b.omschrijving : ''),
      kleur: BORDEAUX
    });
    opbouwStap++;
    zetOpbouwKnop();
  }

  /* ---------- knoppen ---------- */
  const balk = wortel.querySelector('#pir-balk');
  function knop(tekst, fn, klasse) {
    const b = document.createElement('button');
    b.textContent = tekst; if (klasse) b.className = klasse;
    b.addEventListener('click', fn); balk.appendChild(b); return b;
  }
  knop('Terugzetten', () => {
    opbouwStap = 0; zetOpbouwKnop(); grondStap = -1; zetGrondKnop();
    sluitDetail(); sluitBronnen(); zetNiveau(0);
    naar(START.theta, START.phi, P_BASIS, MIDY, true);
  }, 'terug');
  opbouwKnop = knop(OPB.naam || 'Opbouw', stapOpbouw, 'terug');
  /* Op een breed scherm blijft dit het hele grondvlak in één keer. Op een smal
     scherm stapt de knop door: zijde na zijde, dan de diensten, dan het geheel. */
  let grondStap = -1;
  const grondKnop = knop(C.GRONDVLAK_NAAM, () => {
    zetNiveau(1);
    if (!SMAL()) { grondStap = -1; zetGrondKnop(); naar(0, Math.PI - 0.14, P_GROND, Y0); return; }
    grondStap = grondStap + 1 > zijden.length ? -1 : grondStap + 1;
    if (grondStap === -1) naar(0, Math.PI - 0.14, P_GROND, Y0);
    else if (grondStap === zijden.length) naar(0, Math.PI - 0.14, P_MIDDEN(), Y0);
    else naar(0, Math.PI - 0.14, P_STROOK(grondStap), Y0);
    zetGrondKnop();
  });
  function zetGrondKnop() {
    const n = C.GRONDVLAK_NAAM;
    grondKnop.textContent = !SMAL() || grondStap === -1 ? n
      : grondStap === zijden.length ? n + ' \u00b7 diensten'
      : n + ' \u00b7 ' + zijden[grondStap].naam;
  }
  zetGrondKnop();
  aan(window, 'resize', zetGrondKnop);
  knop(C.PUNT.naam, () => naar(0.62, 0.40, P_RING(BANDVAK[0]), fracY(BANDVAK[0].fBot + BANDVAK[0].deel * 0.5), true));
  knop(C.BRONNEN_NAAM, () => {
    const v = BANDVAK[BANDVAK.length - 1];
    naar(0.42, 1.46, P_RING(v), fracY((v.fTop + v.fBot) / 2));
    sluitDetail(); openBronnen();
  });
  knop('Afbeelding opslaan', () => {
    renderer.render(scene, camera);
    const a = document.createElement('a');
    a.download = 'kennispiramide.png';
    a.href = renderer.domElement.toDataURL('image/png');
    a.click();
  });

  wortel.querySelector('#pir-kop-titel').textContent = C.TITEL;
  wortel.querySelector('#pir-kop-onder').textContent = C.ONDERTITEL;
  wortel.querySelector('#pir-kop-regel').textContent = C.PUNT.regel || '';

  /* ---------- aanwijzen: oplichten + label ---------- */
  const ray = new THREE.Raycaster(), muis = new THREE.Vector2();
  const tip = wortel.querySelector('#pir-tip');
  const uitNaam = wortel.querySelector('#pir-uit-naam');
  const uitTekst = wortel.querySelector('#pir-uit-tekst');
  const uitStip = wortel.querySelector('#pir-uit-stip');
  let actief = null;

  const RUST = { naam: C.TITEL, tekst: C.RUSTREGEL_HIERARCHIE || '', kleur: BORDEAUX };
  function toonUitlees(d) {
    uitNaam.textContent = d.naam; uitTekst.textContent = d.detail || d.tekst; uitStip.style.background = d.kleur;
  }
  toonUitlees(RUST);

  /* ---------- detailkaart bij aantikken ---------- */
  const detail = wortel.querySelector('#pir-detail');
  const detNaam = wortel.querySelector('#pir-det-naam');
  const detSoort = wortel.querySelector('#pir-det-soort');
  const detTekst = wortel.querySelector('#pir-det-tekst');
  const detStip = wortel.querySelector('#pir-det-stip');
  const detLink = wortel.querySelector('#pir-det-link');
  const detRangen = wortel.querySelector('#pir-det-rangen');

  /* de rangorde als lijstje in de detailkaart */
  function vulRangen(rangen) {
    detRangen.textContent = '';
    (rangen || []).forEach(r => {
      const box = document.createElement('div'); box.className = 'rang';
      const bij = (kl, tx) => { if (!tx) return; const e = document.createElement('div'); e.className = kl; e.textContent = tx; box.appendChild(e); };
      bij('code', r.code); bij('wat', r.naam); bij('waarom', r.uitleg);
      if (r.fr || r.nl) {
        const dl = document.createElement('dl');
        [['FR', r.fr], ['NL', r.nl]].forEach(([k, v]) => {
          if (!v) return;
          const dt = document.createElement('dt'); dt.textContent = k;
          const dd = document.createElement('dd'); dd.textContent = v;
          dl.appendChild(dt); dl.appendChild(dd);
        });
        box.appendChild(dl);
      }
      bij('regel', r.regel);
      detRangen.appendChild(box);
    });
  }

  function opendetail(d) {
    vulRangen(d.rangen);
    detNaam.textContent = d.naam || '';
    detSoort.textContent = d.soort || '';
    detSoort.hidden = !d.soort;
    detTekst.textContent = d.detail || d.tekst || '';
    detStip.style.background = d.kleur || BORDEAUX;
    if (d.link) { detLink.href = d.link; detLink.textContent = d.linktekst || 'Meer lezen'; detLink.hidden = false; }
    else detLink.hidden = true;
    detail.classList.add('open'); detail.setAttribute('aria-hidden', 'false');
  }
  function sluitDetail() { detail.classList.remove('open'); detail.setAttribute('aria-hidden', 'true'); }
  wortel.querySelector('#pir-det-sluit').addEventListener('click', sluitDetail);

  /* ---------- de bronnenband: hoofdrangen horizontaal, websites uitklapbaar ---------- */
  const bronnen = wortel.querySelector('#pir-bronnen');
  const broRij = wortel.querySelector('#pir-bro-rij');
  let bronnenGevuld = false;

  /* "service-public.fr (met varianten), legifrance.gouv.fr" → aanklikbare regels */
  function bronLijst(txt) {
    const ul = document.createElement('ul');
    String(txt || '').split(/,\s*/).forEach(deel => {
      const t = deel.trim();
      if (!t) return;
      const li = document.createElement('li');
      const m = t.match(/^([a-z0-9][a-z0-9.-]*\.[a-z]{2,})/i);
      if (m) {
        const a = document.createElement('a');
        a.href = 'https://' + m[1]; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = m[1];
        li.appendChild(a);
        const rest = t.slice(m[1].length);
        if (rest) li.appendChild(document.createTextNode(rest));
      } else li.textContent = t;
      ul.appendChild(li);
    });
    return ul;
  }

  function vulBronnen() {
    if (bronnenGevuld) return;
    bronnenGevuld = true;
    wortel.querySelector('#pir-bro-kop').textContent = C.BRONNEN_KOP || '';
    wortel.querySelector('#pir-bro-intro').textContent = C.BRONNEN_INTRO || '';
    (C.BRONRANGEN || []).forEach(r => {
      const k = document.createElement('div'); k.className = 'kaart';
      const bij = (kl, tx) => { if (!tx) return; const e = document.createElement('div'); e.className = kl; e.textContent = tx; k.appendChild(e); };
      bij('code', r.code); bij('wat', r.naam); bij('waarom', r.uitleg);
      [['Franse bronnen', r.fr], ['Nederlandse bronnen', r.nl]].forEach(([kop, lijst]) => {
        if (!lijst) return;
        const d = document.createElement('details');
        const s = document.createElement('summary');
        s.textContent = kop;
        d.appendChild(s); d.appendChild(bronLijst(lijst));
        k.appendChild(d);
      });
      bij('regel', r.regel);
      broRij.appendChild(k);
    });
  }

  function openBronnen() {
    vulBronnen();
    bronnen.classList.add('open'); bronnen.setAttribute('aria-hidden', 'false');
    broRij.scrollLeft = 0;
  }
  function sluitBronnen() { bronnen.classList.remove('open'); bronnen.setAttribute('aria-hidden', 'true'); }
  wortel.querySelector('#pir-bro-sluit').addEventListener('click', sluitBronnen);
  aan(window, 'keydown', e => { if (e.key === 'Escape') { sluitDetail(); sluitBronnen(); } });

  function wijs(cx, cy) {
    // matrices bijwerken: aanwijzen mag niet afhangen van een getekend beeld
    camera.updateMatrixWorld(); model.updateMatrixWorld(true);
    const w = wortel.getBoundingClientRect();
    muis.x = ((cx - w.left) / BW()) * 2 - 1;
    muis.y = -((cy - w.top) / BH()) * 2 + 1;
    ray.setFromCamera(muis, camera);
    const hit = ray.intersectObjects(hoverbaar.filter(o => o.visible), false)[0];
    const obj = hit ? hit.object : null;
    if (obj !== actief) {
      if (actief) actief.userData.mat.emissiveIntensity = 0;
      actief = obj;
      if (actief) {
        actief.userData.mat.emissiveIntensity = 0.34;
        toonUitlees(actief.userData);
      } else { toonUitlees(RUST); }
    }
    if (actief) {
      tip.textContent = actief.userData.naam;
      tip.style.left = cx + 'px'; tip.style.top = cy + 'px'; tip.style.opacity = '1';
    } else verbergTip();
  }
  function verbergTip() { tip.style.opacity = '0'; }

  /* ---------- lus ---------- */
  let laatsteTik = 0;
  function stap(now) {
    controleerKader(now);
    if (tween) {
      const t = clamp((now - tween.t0) / tween.ms, 0, 1), e = ease(t);
      cam.theta = tween.from.theta + (tween.to.theta - tween.from.theta) * e;
      cam.phi = tween.from.phi + (tween.to.phi - tween.from.phi) * e;
      cam.radius = tween.from.radius + (tween.to.radius - tween.from.radius) * e;
      cam.doelY = tween.from.doelY + (tween.to.doelY - tween.from.doelY) * e;
      if (t >= 1) tween = null;
    } else if (!dragging && (Math.abs(vT) > 1e-4 || Math.abs(vP) > 1e-4)) {
      vT *= 0.86; vP *= 0.86;
      if (Math.abs(vT) < 1e-4) vT = 0;
      if (Math.abs(vP) < 1e-4) vP = 0;
      cam.theta += vT; cam.phi = clamp(cam.phi + vP, MINP, MAXP);
    }
    plaatsCamera();
    renderer.render(scene, camera);
  }
  function lus(now) {
    if (!levend) return;                 // scherm verlaten: lus valt stil
    laatsteTik = now || performance.now();
    rafId = requestAnimationFrame(lus);
    stap(laatsteTik);
  }
  (function eersteBeeld() {
    const k = pasIn(START.theta, START.phi, MIDY, P_BASIS, true);
    cam.radius = k.r; cam.doelY = MIDY; stelOffset(k.dx, k.dy);
  })();
  plaatsCamera();
  rafId = requestAnimationFrame(lus);
  /* noodrem: waar de beeldlus stilstaat (verborgen tabblad, ingebed venster)
     toch met een lage frequentie tekenen, zodat er altijd beeld is */
  setInterval(() => {
    const nu = performance.now();
    if (nu - laatsteTik > 400) stap(nu);
  }, 120);

  aan(window, 'resize', () => {
    camera.aspect = BW() / BH(); camera.updateProjectionMatrix();
    renderer.setSize(BW(), BH());
    handmatig = false;
    if (!tween) {
      const k = pasIn(cam.theta, cam.phi, cam.doelY, kaderPunten, kaderLabel);
      cam.radius = k.r; stelOffset(k.dx, k.dy); plaatsCamera();
    }
  });

  /* lettertypen kunnen na de eerste tekening klaar zijn: dan opnieuw tekenen */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      zijden.forEach((z, i) => {
        BANDVAK.forEach(vak => {
          const m = model.getObjectByName('vlak_' + 'ABCD'[i] + (vak.idx + 1));
          if (m) { m.material.map.dispose(); m.material.map = bandTextuur(z, i, vak, vak.band, NIVEAU); m.material.needsUpdate = true; }
        });
      });
      model.traverse(o => {
        if (o.isMesh && o.name.startsWith('veld_') && o.userData.label) {
          const d = o.userData;
          o.material.map.dispose();
          o.material.map = veldTextuur(d.label, d.kleur, d.neutraal, d.heeftLink, d.thema, d.verh);
          o.material.needsUpdate = true;
        }
      });
      const sp = model.getObjectByName('punt_label');
      if (sp) { sp.material.map.dispose(); sp.material.map = puntTextuur(); sp.material.needsUpdate = true; }
    });
  }

  return {
    stop() {
      levend = false;
      if (rafId) cancelAnimationFrame(rafId);
      opruimers.forEach(f => { try { f(); } catch (e) {} });
      // Texturen, geometrie en materialen zijn GPU-bronnen; de garbage collector
      // ruimt die niet op. Zonder dit lekt elk bezoek aan de piramide geheugen.
      scene.traverse(o => {
        if (!o.isMesh && !o.isSprite) return;
        if (o.geometry) o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(m => { if (!m) return; if (m.map) m.map.dispose(); m.dispose(); });
      });
      renderer.dispose();
      if (stijl && stijl.parentNode) stijl.parentNode.removeChild(stijl);
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    }
  };
}
