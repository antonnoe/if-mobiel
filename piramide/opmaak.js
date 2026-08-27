/* Opmaak van de kennispiramide, gescoopt onder #pir-wrap.
 *
 * Staat hier als module en niet in een stylesheet of in index.html, om twee
 * redenen: de app heeft geen buildstap en geen stylesheets (zie CLAUDE.md), en
 * zowel het scherm in de app als de losse deelbare pagina heeft deze regels
 * nodig. Eén bron dus, in plaats van twee kopieën die uit de pas gaan lopen.
 *
 * Inline kan het niet: :hover, @media, toestandsklassen (.open) en
 * ::-webkit-scrollbar bestaan niet in een style-attribuut.
 */
export const OPMAAK = `
/* De app toont zijn eigen kopbalk; dan is de titel in het model dubbelop. */
#pir-wrap[data-kop="0"] #pir-kop { display: none; }
/* Kennispiramide — opmaak, overgenomen uit de ontwerp-referentie
   (design_handoff_kennispiramide/kennispiramide.html) en volledig gescoopt
   onder #pir-wrap, zodat niets van dit scherm de rest van de app raakt.
   Staat hier in plaats van inline omdat :hover, @media, toestandsklassen en
   ::-webkit-scrollbar niet in een style-attribuut kunnen. */
#pir-wrap #pir-scene { position: absolute; inset: 0; touch-action: none; cursor: grab; }
#pir-wrap #pir-scene.dragging { cursor: grabbing; }
#pir-wrap .ui { position: absolute; z-index: 5; }
#pir-wrap #pir-kolom { display: contents; }
#pir-wrap #pir-kop { top: 12px; left: 14px; right: 14px; pointer-events: none; }
#pir-wrap #pir-kop h1 {
    font-family: "Poppins", system-ui, sans-serif; font-weight: 600;
    font-size: 18px; line-height: 1.3em; letter-spacing: .01em;
    margin: 0; color: #800000;
  }
#pir-wrap #pir-kop p { margin: 1px 0 0; font-size: 11px; line-height: 1.6em; color: #6B6259; letter-spacing: .06em; text-transform: uppercase; }
#pir-wrap #pir-kop p#pir-kop-regel {
    margin: 7px 0 0; font-size: 12.5px; line-height: 1.5em; letter-spacing: 0;
    text-transform: none; color: #2C2724; font-weight: 600; max-width: 340px; text-wrap: pretty;
  }
#pir-wrap #pir-kop p#pir-kop-regel:empty { display: none; }
#pir-wrap #pir-uitlees {
    left: 14px; right: 14px; bottom: 74px;
    background: #FBF9F6; border: 1px solid rgba(128,0,0,.16);
    padding: 11px 13px 12px;
  }
#pir-wrap #pir-uitlees .kop {
    font-family: "Poppins", system-ui, sans-serif; font-weight: 600; font-size: 14px;
    line-height: 1.4em; margin: 0 0 3px; color: #2C2724;
    display: flex; align-items: flex-start; gap: 9px;
  }
#pir-wrap #pir-uitlees .stip { width: 9px; height: 9px; flex: 0 0 9px; margin-top: 5px; background: #800000; }
#pir-wrap #pir-uit-naam { flex: 1 1 auto; min-width: 0; }
#pir-wrap #pir-uitlees .tekst {
    font-size: 13px; line-height: 1.6em; color: #6B6259; margin: 0;
    display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden;
  }
#pir-wrap #pir-balk {
    left: 0; right: 0; bottom: 0;
    display: flex; gap: 6px; padding: 8px 14px calc(8px + env(safe-area-inset-bottom));
    overflow-x: auto; scrollbar-width: none;
    background: linear-gradient(to top, rgba(241,237,232,.96), rgba(241,237,232,0));
  }
#pir-wrap #pir-balk::-webkit-scrollbar { display: none; }
#pir-wrap button {
    font-family: "Mulish", system-ui, sans-serif; font-size: 12px; font-weight: 600;
    letter-spacing: .06em; text-transform: uppercase; line-height: 1;
    padding: 13px 14px; min-height: 46px; flex: 0 0 auto; white-space: nowrap;
    background: #FBF9F6; color: #4A423C;
    border: 1px solid rgba(128,0,0,.18); border-radius: 0;
    cursor: pointer; transition: background .15s, color .15s, border-color .15s;
  }
#pir-wrap button:hover { background: #800000; color: #FBF9F6; border-color: #800000; }
#pir-wrap button.terug { background: #800000; color: #FBF9F6; border-color: #800000; }
#pir-wrap button.terug:hover { background: #6A0000; }
#pir-wrap #pir-detail {
    position: absolute; z-index: 8; left: 0; right: 0; bottom: 0;
    background: #FBF9F6; border-top: 3px solid #800000;
    padding: 18px 18px calc(20px + env(safe-area-inset-bottom));
    transform: translateY(105%); transition: transform .26s cubic-bezier(.22,.7,.2,1);
    max-height: 72vh; overflow-y: auto;
    box-shadow: 0 -12px 40px rgba(44,39,36,.14);
  }
#pir-wrap #pir-detail.open { transform: translateY(0); }
#pir-wrap #pir-detail .rij { display: flex; align-items: flex-start; gap: 10px; }
#pir-wrap #pir-detail .stip { width: 11px; height: 11px; flex: 0 0 11px; margin-top: 7px; background: #800000; }
#pir-wrap #pir-detail h2 {
    font-family: "Poppins", system-ui, sans-serif; font-weight: 600;
    font-size: 19px; line-height: 1.35em; margin: 0; color: #2C2724; flex: 1 1 auto;
  }
#pir-wrap #pir-detail .soort {
    margin: 3px 0 0; font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; color: #9A9088;
  }
#pir-wrap #pir-detail p.body { font-size: 14.5px; line-height: 1.75em; color: #5C534B; margin: 12px 0 0; text-wrap: pretty; white-space: pre-line; }
#pir-wrap #pir-detail .rangen { display: grid; gap: 14px; margin: 16px 0 0; }
#pir-wrap #pir-detail .rangen:empty { display: none; }
#pir-wrap #pir-detail .rang { display: grid; gap: 4px; padding-left: 13px; border-left: 3px solid #800000; }
#pir-wrap #pir-detail .rang .code {
    font-family: "Poppins", system-ui, sans-serif; font-weight: 600; font-size: 15px;
    letter-spacing: .06em; color: #800000;
  }
#pir-wrap #pir-detail .rang .wat { font-size: 13.5px; font-weight: 600; line-height: 1.45em; color: #2C2724; }
#pir-wrap #pir-detail .rang .waarom { font-size: 13px; line-height: 1.6em; color: #6B6259; text-wrap: pretty; }
#pir-wrap #pir-detail .rang dl { display: grid; grid-template-columns: 26px 1fr; gap: 3px 8px; margin: 3px 0 0; }
#pir-wrap #pir-detail .rang dt {
    font-size: 10.5px; font-weight: 600; letter-spacing: .08em; color: #9A9088;
    text-transform: uppercase; padding-top: 3px;
  }
#pir-wrap #pir-detail .rang dd { margin: 0; font-size: 12.5px; line-height: 1.65em; color: #5C534B; word-break: break-word; }
#pir-wrap #pir-detail .rang .regel { font-size: 12.5px; line-height: 1.65em; color: #6B6259; text-wrap: pretty; }
#pir-wrap #pir-detail .acties {
    display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px;
  }
#pir-wrap #pir-detail a.meer {
    font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
    padding: 13px 16px; min-height: 46px; display: inline-flex; align-items: center;
    white-space: nowrap;
    background: #800000; color: #FBF9F6; text-decoration: none;
  }
#pir-wrap #pir-detail a.meer[hidden] { display: none; }
#pir-wrap #pir-detail a.meer:hover { background: #6A0000; color: #FBF9F6; }
#pir-wrap #pir-detail button.sluit { padding: 13px 16px; }
#pir-wrap a { color: #800000; }
#pir-wrap a:hover { color: #6A0000; }
#pir-wrap #pir-bronnen {
    position: absolute; z-index: 9; left: 0; right: 0; bottom: 0;
    display: flex; flex-direction: column; max-height: 58vh;
    background: #FBF9F6; border-top: 3px solid #800000;
    box-shadow: 0 -14px 44px rgba(44,39,36,.16);
    transform: translateY(101%); transition: transform .28s cubic-bezier(.22,.7,.2,1);
  }
#pir-wrap #pir-bronnen.open { transform: none; }
#pir-wrap #pir-bronnen:has(details[open]) { max-height: 82vh; }
#pir-wrap #pir-bronnen .bkop {
    display: flex; align-items: flex-start; gap: 14px;
    padding: 14px 16px 10px calc(16px + env(safe-area-inset-left));
  }
#pir-wrap #pir-bronnen .bkop > div { flex: 1 1 auto; min-width: 0; }
#pir-wrap #pir-bronnen h2 {
    font-family: "Poppins", system-ui, sans-serif; font-weight: 600;
    font-size: 17px; line-height: 1.35em; margin: 0; color: #2C2724;
  }
#pir-wrap #pir-bronnen .bkop p {
    margin: 4px 0 0; font-size: 12.5px; line-height: 1.65em;
    color: #6B6259; max-width: 78ch; text-wrap: pretty;
  }
#pir-wrap #pir-bronnen .rij {
    display: flex; gap: 12px; overflow-x: auto; overflow-y: hidden;
    padding: 0 16px calc(16px + env(safe-area-inset-bottom));
    scroll-snap-type: x proximity; scrollbar-width: thin;
  }
#pir-wrap #pir-bronnen .kaart {
    flex: 0 0 min(340px, 84vw); scroll-snap-align: start;
    display: flex; flex-direction: column; gap: 5px;
    background: #FFFDFB; border: 1px solid rgba(128,0,0,.18); border-top: 3px solid #800000;
    padding: 12px 15px 14px; overflow-y: auto;
  }
#pir-wrap #pir-bronnen .code {
    font-family: "Poppins", system-ui, sans-serif; font-weight: 600; font-size: 17px;
    letter-spacing: .06em; color: #800000;
  }
#pir-wrap #pir-bronnen .wat { font-size: 13.5px; font-weight: 600; line-height: 1.45em; color: #2C2724; }
#pir-wrap #pir-bronnen .waarom { font-size: 12.5px; line-height: 1.6em; color: #6B6259; text-wrap: pretty; }
#pir-wrap #pir-bronnen details { border-top: 1px solid rgba(128,0,0,.12); margin-top: 4px; }
#pir-wrap #pir-bronnen summary {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    cursor: pointer; list-style: none; min-height: 34px; padding: 4px 0;
    font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #800000;
  }
#pir-wrap #pir-bronnen summary::-webkit-details-marker { display: none; }
#pir-wrap #pir-bronnen summary::after { content: "+"; font-size: 15px; line-height: 1; color: #9A9088; }
#pir-wrap #pir-bronnen details[open] summary::after { content: "\\2212"; }
#pir-wrap #pir-bronnen ul { list-style: none; margin: 0 0 8px; padding: 0; display: grid; gap: 4px; }
#pir-wrap #pir-bronnen li { font-size: 12.5px; line-height: 1.6em; color: #5C534B; word-break: break-word; }
#pir-wrap #pir-bronnen li a { text-decoration: none; border-bottom: 1px solid rgba(128,0,0,.3); }
#pir-wrap #pir-bronnen .regel {
    font-size: 12px; line-height: 1.6em; color: #6B6259; text-wrap: pretty;
    border-top: 1px solid rgba(128,0,0,.12); padding-top: 8px; margin-top: 2px;
  }
#pir-wrap #pir-tip {
    position: absolute; z-index: 6; pointer-events: none; opacity: 0;
    transform: translate(-50%, -140%); transition: opacity .12s;
    background: #2C2724; color: #FBF9F6; padding: 6px 10px;
    font-size: 12px; line-height: 1.4em; letter-spacing: .04em; white-space: nowrap;
    max-width: 70vw; overflow: hidden; text-overflow: ellipsis;
  }
#pir-wrap #pir-uitlees .wenk { display: none; }
/* Brede indeling: kolom links, scene rechts.
   Stond op @media (min-width: 761px) — maar dat kijkt naar het VENSTER,
   terwijl dit scherm in de app in een schil van 412px zit. Op een breed
   scherm kreeg de piramide daardoor de bureaubladindeling in een telefoon-
   doos: een kolom van 288px over het model heen. De scene zet daarom zelf
   data-breed op de container, gemeten aan de container. */
#pir-wrap[data-breed="1"] #pir-kolom {
      display: flex; flex-direction: column; gap: 12px;
      position: absolute; z-index: 5; left: 24px; top: 22px; bottom: 24px; width: 288px;
      pointer-events: none;
    }
#pir-wrap[data-breed="1"] #pir-kolom > * { position: static; inset: auto; width: auto; max-width: none; pointer-events: auto; }
#pir-wrap[data-breed="1"] #pir-kop { pointer-events: none; }
#pir-wrap[data-breed="1"] #pir-kop { top: auto; left: auto; right: auto; }
#pir-wrap[data-breed="1"] #pir-kop h1 { font-size: 20px; }
#pir-wrap[data-breed="1"] #pir-kop p { font-size: 12.5px; letter-spacing: .04em; }
#pir-wrap[data-breed="1"] #pir-uitlees {
      flex: 0 1 auto; min-height: 0; overflow-y: auto; padding: 13px 15px 14px;
    }
#pir-wrap[data-breed="1"] #pir-uitlees .tekst { line-height: 1.7em; -webkit-line-clamp: 4; }
#pir-wrap[data-breed="1"] #pir-balk {
      margin-top: auto; transform: none; flex: 0 0 auto;
      display: grid; grid-template-columns: 1fr 1fr 1fr; align-content: end;
      gap: 5px; padding: 0; background: none;
    }
#pir-wrap[data-breed="1"] button {
      font-size: 9.5px; padding: 8px 7px; min-height: 38px; text-align: left;
      white-space: normal; line-height: 1.25; letter-spacing: .03em;
    }
#pir-wrap[data-breed="1"] #pir-detail {
      left: auto; right: 24px; bottom: 24px; width: 330px;
      border: 1px solid rgba(128,0,0,.18); border-top: 3px solid #800000;
      max-height: 62vh; padding: 18px 20px 20px;
      transform: translateY(calc(100% + 40px));
    }
#pir-wrap[data-breed="1"] #pir-detail.open { transform: translateY(0); }
#pir-wrap[data-breed="1"] #pir-bronnen {
      left: 24px; right: 24px; bottom: 24px; max-height: 52vh;
      border: 1px solid rgba(128,0,0,.18); border-top: 3px solid #800000;
      transform: translateY(calc(100% + 40px));
    }
#pir-wrap[data-breed="1"] #pir-bronnen.open { transform: none; }
#pir-wrap[data-breed="1"] #pir-bronnen:has(details[open]) { max-height: 76vh; }
#pir-wrap[data-breed="1"] #pir-bronnen .kaart { flex: 0 0 320px; }
#pir-wrap[data-breed="1"] #pir-uitlees .wenk {
      display: block; margin: 9px 0 0; padding-top: 9px;
      border-top: 1px solid rgba(128,0,0,.12);
      font-size: 11.5px; line-height: 1.7em; color: #8C837A; letter-spacing: .03em;
    }

`;
