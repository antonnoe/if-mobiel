# Infopoche (Infofrankrijk Mobiel)

Mobile-first web-app van Infofrankrijk.com en Nederlanders.fr — één app waarin de losse
tools, dossiers en het forum uit het netwerk van platforms samenkomen voor Nederlanders in
Frankrijk. Naam naar de lezer: **Infopoche**, domein infopoche.fr (vastgelegd 2 september
2026). Technisch een statische website met manifest, dus op het beginscherm te zetten
zonder app-winkel.

**Eigenaar:** Anton Noë / Infofrankrijk.com / Communities Abroad

## Bestanden

| Bestand | Functie |
|---|---|
| `index.html` | De hele app: hub, zoeken, forum, taalassistent, modules, account |
| `support.js` | Runtime (React-binding, template-engine), **gegenereerd, niet met de hand bewerken** |
| `vendor/` | React en ReactDOM 18.3.1 lokaal; `index.html` wijst `support.js` ernaar via `window.__resources`, zodat de app niet aan unpkg.com hangt. Zie `vendor/README.md` |
| `manifest.webmanifest`, `icons/` | Naam, kleuren en pictogrammen voor "zet op beginscherm". Bron van de pictogrammen: `icons/icon.svg` |
| `modules.json` | De modulecatalogus: negen `themas` (de indeling van de hub), de modules met elk een `thema`, en per-kind extra's (`vastgoed`, `zorg`, `ruyter`, `nedergids`, `departementen`, `gezondheid`). Nooit modulegegevens terug in de code zetten |
| `dossier.js`, `lamaison-lib.js`, `nieuws-lib.js` | Kleine gewone JS-bestanden zonder buildstap (ophalen en opschonen van het zorgdossier, validatie van `la-maison.json`, nieuwslogica); testbaar in Node |
| `data/dossier-demo.json` | Fictief demodossier voor Mijn dossier (statisch, geen echte personen) |
| `engine/` | Rekenmotor EnergiePortaal — ONGEWIJZIGD uit `antonnoe/energieportaal`, alleen gesynchroniseerd; bronrepo en commit staan in `engine/BRON.md` |
| `Bosbranden Mobiel.html` | Brandrisico-module (Leaflet-kaart met Météo-France, feux-foret.gouv.fr, NASA FIRMS, Copernicus). **Op dit moment niet aangesloten**: bij de v3-overzetting ging de module `veiligheid` naar de pagina op nederlanders.fr en bleef dit bestand achter. Weer aansluiten of weghalen is een redactiekeuze — zie "Nog te doen" |
| `kennispiramide.html` | Deelbare losse pagina voor de kennispiramide — een dunne schil die dezelfde module laadt als het scherm in de app, dus geen tweede implementatie |
| `piramide.json` | Alle redactionele tekst van de kennispiramide: zijden, banden, rubrieken, toelichtingen en de bronrangen. Nooit in de pagina zelf |
| `piramide/` | De kennispiramide: `scene.js` (3D-scene, `startPiramide()`/`stop()`), `opmaak.js` (opmaak, gescoopt onder `#pir-wrap`) en three.js lokaal gevendord (zie `THREE-LICENSE`). Alles wordt lui geladen — wie het model niet opent, haalt geen byte binnen |
| `data/` | Twee bestanden zonder actieve gebruiker (`feiten.json`, `streek-verhalen.ts`) — zie "Nog te doen" |
| `BOUWOPDRACHT.md` | De laatste bouwopdracht (ronde 2), leidend voor de openstaande punten hieronder |

## Een module toevoegen vanuit Vercel

Staat een tool op Vercel (of elders), dan is toevoegen één blok in `modules.json`, geen
code. Kopieer het blok van `klussen` en vul in:

```json
{
  "id": "mijn-tool",
  "groep": "wonen",
  "naam": "Mijn tool",
  "meta": "één regel die zegt wat hij doet",
  "prijs": "gratis",
  "schil": "rekenschil",
  "houdbaar": "per jaar",
  "status": "af",
  "kind": "iframe",
  "weergave": "volledig",
  "url": "https://mijn-tool.vercel.app/",
  "nagekeken": "2026-09-02",
  "over": "Twee of drie zinnen voor de lezer."
}
```

- `weergave`: `volledig` laat de site op volle hoogte in de app openen; dat werkt alleen als
  die site framing vanaf infopoche.fr toestaat (een `Content-Security-Policy` met
  `frame-ancestors`, zie `next.config.ts` van `klussen-in-frankrijk` als voorbeeld). Staat
  de site dat niet toe, kies dan `knop` (één knop naar een nieuw tabblad) of laat het veld
  weg voor de voorvertoning van 300 px.
- `zoekindex` (optioneel): publiceert de site een JSON met `artikelen` en/of `termen` (zie
  `_uitleg` in `modules.json` voor de vorm, en `app/zoekindex.json/route.ts` in
  `klussen-in-frankrijk` als voorbeeld), dan doorzoekt het zoekveld van de app die lijst en
  opent een treffer in de module. De tekst blijft op de site zelf.
- Commit naar `main`; Vercel deployt de app opnieuw en de module staat erin.

### Een module tijdelijk uitzetten

Twee velden in `modules.json`, allebei optioneel; er komt geen code aan te pas.

- `"zichtbaar": false` haalt de module overal weg: uit de hub, uit de modulelijst en uit
  het zoekveld. Het blok blijft ongewijzigd staan. `true` zet hem altijd aan en overrulet
  het seizoen hieronder. Ontbreekt het veld, dan is de module gewoon zichtbaar.
- `"seizoen": { "van": "06-01", "tot": "09-30" }` (dag-maand als `MM-DD`) laat de module
  vanzelf komen en gaan. Buiten die periode staat hij niet in de hub, maar blijft hij
  vindbaar via zoeken met de vermelding "buiten seizoen". Een periode over de jaarwisseling
  mag: `van "11-01" tot "03-31"`.
- `"reden"` is een aantekening voor de redactie; de app doet er niets mee.

Wijst een knop in de app rechtstreeks naar een module (de tegel Veiligheid & natuur en de
strook Nedergids op de hub, de knop "Naar de rekentool" in Een huis kopen), dan verdwijnt
die knop mee zodra de module niet zichtbaar is. Er blijft dus nooit een knop staan die
nergens heen gaat.

Zie `standaard: "uit"` per module voor wat standaard uit staat (aanzetten via Account → Mijn modules).
Geen enkele module heeft op dit moment een seizoen. Veiligheid & natuur staat het hele jaar
in de app, maar als rustige regel op de hub in plaats van een alarmtegel; wil je hem buiten
het brandseizoen toch uit de hub, zet er dan `"seizoen": { "van": "06-01", "tot": "09-30" }`
op.

## Draaien

Statische bestanden, geen buildstap. Lokaal:

    npx serve .

Vercel: importeer de repo, geen instellingen nodig.

## Architectuur

De app is een schil rond twee soorten inhoud:

1. **Artikelen en berichten** — Actueel is een eigen tab in de onderbalk. Die haalt
   thema-tegels op bij `nlfr-menu` (`/api/actueel`: pers, overheid, infofrankrijk,
   verenigingen); een tik op een item opent het redactieartikel in de app, met de tekst en
   bronnen uit `/api/actueel-tekst` (lui opgehaald, in het geheugen bewaard). Er worden
   bewust geen persfoto's getoond (auteursrecht). Het forum (tab Forum) komt van
   `nlfr-berichten`, met foto's en onderschriften op hun plek in de tekst. Beide vallen
   zacht terug op een voorbeeldlijst als het netwerk of de bron faalt.
2. **Modules** — interactieve tools met een eigen mobiele vorm, gedreven door
   `modules.json`. `kind` bepaalt het scherm (`iframe`, `voorbeeld`, `info`, `taal`, `lex`,
   `forum`, `actueel`, `nedergids`, `vastgoed`, `zorg`, `ruyter`, `energie`). De
   rekenlogica van een tool wordt nooit gedupliceerd — alleen de UI verschilt per
   platform. Zie Energie & verwarming.

Zie `CLAUDE.md` voor de volledige architectuur in tien regels, de huisstijl en de
werkregels.

## Energie & verwarming

Zeven vragen → `applyArchetype()` vult de veertig velden met 3CL-DPE-forfaits →
`computeResults()` + `computeDPE()`. Eén rekenmotor, twee schillen: bij een wijziging in
de engine hoeft alleen `engine/` te worden bijgewerkt (in de bronrepo, en vervolgens hier
gesynchroniseerd). Het voorbeeldhuis en de eigen zeven antwoorden zijn gratis; de
bedragen zelf horen bij het abonnement — de knip staat in `modules.json` onder
`energie.knip`.

## Stand van zaken en weg naar V1.0

Zie `STAND-VAN-ZAKEN-V1.md` (2 september 2026): inventaris, bevindingen, besluiten en de
gefaseerde lijst. Fase 0 daaruit is uitgevoerd: React lokaal, titel en manifest,
`100dvh` en safe-area, onware regels weg, aanraakvlakken, engine-bron vastgelegd.

## Nog te doen

- **Brandgevaar heeft geen bron.** De hub toonde een gevaarniveau uit een ontwerpprop
  (standaard "zeer hoog") met een vast tijdstip erbij — dus permanent alarm, ook buiten
  het seizoen. Dat is verwijderd; de hub toont nu alleen een ingang naar de module.
  Zodra Météo des forêts echt is aangesloten kan het niveau terug (`NIVEAUS` in
  `index.html` staat er nog, met toelichting).
- **`Bosbranden Mobiel.html` is losgeraakt** bij de v3-overzetting (commit `545794d`).
  Weer aansluiten als eigen schil, of laten vallen ten gunste van de pagina op
  nederlanders.fr — redactiekeuze. **Let op bij aansluiten:** de risicokleuren in dat
  bestand zijn niet echt. Regel 351 genereert ze met een hashfunctie ("deterministic
  July-like forecast until the real Météo-France endpoint is wired in"), en de pagina zegt
  dat zelf in een notitie. Aansluiten mag pas nadat er een echte bron per departement
  binnenkomt; anders staat er een verzonnen gevaarniveau in een veiligheidsmodule.
- **Locator Veiligheid & natuur.** De app leidt uit de postcode het departement af en zegt
  welk departement u op de kaart moet opzoeken. Meer kan hij niet: er is geen bron
  aangesloten die per departement of regio een gevaarniveau levert, dus de app beweert er
  geen. Zodra die er is, kan de regel op de hub het niveau van het eigen departement tonen
  en pas dán naar voren springen.

- **Inloggen en abonnementsstatus** — er staat nul aan authenticatie in `index.html`.
  Welk systeem de abonnementsstatus vasthoudt, cookie of token, en of er al een endpoint
  is dat "deze gebruiker is abonnee" beantwoordt, staat open. Zie `BOUWOPDRACHT.md` §5.
- **Drie actualiteitsbronnen samenvoegen** — naast `/api/actueel` liggen verkeersnieuws en
  `infofrankrijk-routecontrole` klaar; onderzocht of ze in één Actueel-scherm passen, nog
  geen implementatie. Zie `BOUWOPDRACHT.md` §2.
- **Adresanalyse zonder iframe** — `vastgoed-analyse` heeft vijf CORS-open endpoints
  (dvf, risques, cadastre, urbanisme, dpe); een eigen scherm in plaats van de huidige
  iframe onder "Zoeken" is onderzocht, nog niet gebouwd. Zie `BOUWOPDRACHT.md` §6.
- **`data/feiten.json` en `data/streek-verhalen.ts`** — ongebruikt in deze repo; horen
  vermoedelijk bij een toekomstige navigatie-assistent (module Auto & mobiliteit, nog "te
  smeden"), verwant aan `antonnoe/navigation`. Redactiebeslissing nog nodig. Zie
  `BOUWOPDRACHT.md` §4.
- **Nedergids v2** — module staat op `status: "in bouw"`, wacht op het adres van de
  gepubliceerde kaart (Supabase + registervalidatie moeten daar eerst staan).
- **Correspondentie** — wacht op toegang tot de private repo `briefhulp-fr`.
- **Verenigingen & agenda / Auto & mobiliteit** — nog uit losse repo's te smeden; de
  redactie moet de bronnen aanwijzen.
- **Zorg (uitgebreide versie)** — de noodschil is af; de uitgebreide versie wacht op een
  reporkeuze van de redactie.


## Hub met negen themategels (22-10-2026)

De hub is een raster van 3x3 tegels: Geld, Overheid, Gezondheid, Adressen, Nieuws, Ervaring, Ondernemen, Wonen, Taal. De indeling staat op één plek: `themas` en het veld `thema` per module in `modules.json`. Modules die standaard uit staan blijven uit, ook binnen hun tegel. Onder de tegels staan het blok AI-tools (alleen Café Claude) en Mijn dossier (demodossier uit `data/dossier-demo.json`, vaste balk naar de abonnementspagina).

- **Wonen** is La Maison: tabs en fasen komen live uit `https://if-plek.vercel.app/la-maison.json` (bron van waarheid is `public/la-maison.json` in `if-plek`, ook gebruikt door `plek.js` op Infofrankrijk). Artikelen openen in de browser, omdat infofrankrijk.com framing weigert.
- **Gezondheid** laadt de hoofdstukken van het dossier "Ouder worden in Frankrijk" live via de WP REST API (geen tekst in de repo); de indeling in fasen staat in `modules.json` onder `gezondheid`.
- **Nieuws** en de tab Actueel zijn hetzelfde scherm: themategels op aantal, een doorlopende leespagina per thema, en op de themaschermen een strook met de drie nieuwste berichten (koppeling in `themas[].nieuws`).
- Draaien van de tests: `node --test tests/*.test.mjs` (alleen de mapnaam werkt niet in Node 22).

Open: het nieuwsthema `zorg` (Zorg en gezondheid) staat klaar in `nlfr-menu` op de branch `zorg-thema`, maar main van die repo vraagt een groene statuscheck "npm test"; tot de merge toont de strook bij Gezondheid niets. Het Zorglexicon en de Zoekers per departement staan op "In ontwikkeling".


## Ronde 22-10-2026 (tweede): landing, kleur, route Ondernemen, AI-tools

- **Landing en installeren:** in een gewone browser (niet standalone) opent eerst een donkere landing (`landing-lib.js` detecteert Android, iPhone/iPad, in-app browsers en computer; 14 dagen uitstel in `ifm_landing_tot`). In de geïnstalleerde app nooit. QR-code: `icons/qr-infopoche.svg`.
- **Service worker** (`sw.js`): netwerk eerst voor HTML en JSON, de app-schil als terugval in de cache, `VERSIE` bovenaan verhogen bij een release die de schil verandert. Het is een terugval, geen offline-functie en de app belooft dat ook niet.
- **Logo:** `icons/logo-goud.svg` (landing) en `icons/logo-brons.svg` (app); de iconen zijn opnieuw gemaakt uit de bronzen versie. De gouden vector is dezelfde geometrie als de bronzen, in goud: de gouden PNG was niet strak te tracen.
- **Hub:** begroeting naar dagdeel (`hub-lib.js`), negen tegels in eigen kleur (`themas[].kleur`), twee halve tegels (AI-tools, Mijn dossier), regiokaart (`ifm_postcode`, `ifm_plaats`; plaatsnaam via geo.api.gouv.fr). Tabbalk: Home, Zoeken, Forum, Nieuws, Profiel.
- **Ondernemen** is een route van vier stappen uit `https://if-plek.vercel.app/ondernemen.json` (bron: `public/ondernemen.json` in if-plek). Artikelen zijn altijd zichtbaar, tools volgen Mijn modules. Het veld `ook` (module of item) zet iets ook in een tweede thema met de regel "hoort bij ...".
- **AI-tools:** alleen modules met `ai` in `modules.json`, met bewijs in `docs/ai-onderzoek.md`.
- **Klussen-zoekindex** staat uit (`zoekindex_wacht`) tot infofrankrijk.com een `Access-Control-Allow-Origin`-header op `/klussen/zoekindex.json` zet; hernoem het veld dan terug naar `zoekindex`.
- **Nieuws:** het thema van perspublicaties kiest nu het model in de bestaande synthese-aanroep (nlfr-menu PR 59), met keuzelijst in `/review`; trefwoordregels blijven als terugval. Thema `zorg` ("Zorg en gezondheid") verschijnt zodra er een zorgbericht is.
