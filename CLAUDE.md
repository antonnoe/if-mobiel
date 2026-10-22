# CLAUDE.md — Infofrankrijk Mobiel

Werkinstructies voor Claude Code in deze repo (`antonnoe/if-mobiel`). Lees dit vóór
elke wijziging. Statische mobiele webapp-schil voor Infofrankrijk.com (Nederlanders in
Frankrijk).

## Architectuur (v3, tien regels)

1. Eén web-app (mobile-first website die als app op het beginscherm staat; naam naar de
   lezer: **Infopoche**, domein infopoche.fr), kernbestanden: `index.html` (schil + logica),
   `support.js` (runtime, gegenereerd), `modules.json` (de catalogus — data, nooit logica),
   `vendor/` (React lokaal, zie regel 3) en `manifest.webmanifest` plus `icons/`. `Bosbranden Mobiel.html` staat er
   nog wel, maar is sinds de v3-overzetting **niet aangesloten**; de module `veiligheid`
   wijst naar de pagina op nederlanders.fr.
2. `index.html` is géén gewone pagina maar een **Design Component**: een `<x-dc>`-template
   met `{{ }}`-holes plus een logicaklasse `class Component extends DCLogic` in een
   `<script type="text/x-dc">`-blok.
3. `support.js` is de runtime (gegenereerd uit `dc-runtime/`, **niet met de hand bewerken**):
   het bindt de template aan de klasse via React onder de motorkap. React komt **niet** van
   unpkg maar uit `vendor/`, via `window.__resources` in de `<head>` van `index.html`; die
   regel en die map blijven, anders is de app leeg zodra de CDN wegvalt.
4. Eigen tags sturen de template: `<sc-if value="{{ }}">`, `<sc-for list="{{ }}" as="…">`
   en `<helmet>` voor `<head>`-inhoud. `{{ expr }}` vult tekst, attributen en handlers.
5. Toestand leeft in `state` van de klasse; `setState`/`forceUpdate` hertekenen. Eén scherm
   tegelijk via `state.screen`: `hub`, `mod`, `zoek`, `gem`, `taal`, `lex`, `tool`, `acc`,
   `over`, plus de uitgewerkte eigen schillen `nedergids`, `vastgoed`, `zorg`, `ruyter`,
   `energie`, en sinds 22-10-2026 `thema` (generiek themascherm), `lamaison`, `gezondheid`,
   `nieuws` en `dossierdemo`. De hub is een raster van negen themategels uit `themas` in
   `modules.json`; elke module heeft een `thema`. Er is geen `login`- of `dossier`-scherm — de app werkt zonder account; wat
   betaald is krijgt een uitleg en een muur, niet een aparte inlogroute (zie `knip` per
   module, en de openstaande vragen over abonnementsstatus in `BOUWOPDRACHT.md`).
6. De modulecatalogus staat in `modules.json` (`groepen`, `modules`, plus per-kind extra's
   zoals `vastgoed`, `zorg`, `ruyter`, `nedergids`, `departementen`) — **nooit** in de code.
   De hub toont van boven naar beneden: begroeting naar dagdeel (`begroeting()` in
   `hub-lib.js`), zoekbalk, negen themategels, twee halve tegels (AI-tools en Mijn dossier), de
   regiokaart en eventueel favorieten. De ontwerpprop `tabVariant` en de "Vandaag"-strip zijn
   vervallen. Schermen `aitools` (stub tot de AI-tools-bouwer het vervangt, `openAiTools()`)
   en `regio` (per departement: bosbrandkaart, verenigingen, palliatieve zorg, zoekers, alleen
   als de module aan staat). De tab-actief-markering komt uit `HubLib.tabVan(screen)`;
   `mod` (Alle modules), `keuze` en `over` zijn rijen in Profiel (scherm `acc`).
7. `renderVals()` bouwt in één keer álle holes voor het actieve scherm; losse `*Vals()`-
   helpers leveren hun deel toe (bv. `enVals()` voor het energiescherm).
8. `kind` in `modules.json` bepaalt het scherm: `iframe`, `voorbeeld`, `info`, `taal`, `lex`,
   `forum`, `actueel`, `nedergids`, `vastgoed`, `zorg`, `ruyter`, `energie`. Een nieuw type
   toevoegen is: een `kind` verzinnen, een blok in de JSON, en één `sc-if`-scherm in de
   template — bestaande modules van vorm veranderen gaat zonder code. Bij `iframe` kiest
   `weergave` de vorm: `voorvertoning` (standaard), `volledig` (de site op volle hoogte in
   de app; alleen voor sites die framing toestaan via `frame-ancestors`) of `knop` (één
   knop naar een nieuw tabblad). Een module met `zoekindex` (URL van een JSON dat de site
   zelf publiceert) wordt door het zoekveld doorzocht; treffers openen in de module. Per
   groep kan `cafe: {domein, tekst}` staan: een regel "Vraag het Café Claude" met een deep
   link, opgebouwd uit de `url` van de module `cafeclaude`. Prijswaarden: `gratis`,
   `gratis-lezen`, `gratis-eerste`, `abonnee`.
   Mijn modules: per module bepaalt `standaard` (`aan` | `uit`, ontbreekt = `aan`) of hij op
   hub en modulelijst staat zolang de lezer niets koos. In het scherm Mijn modules (Profiel →
   Mijn modules) zet de lezer modules aan of uit; dat staat alleen op het toestel in
   `localStorage` `ifm_modules` = `{aan:[ids], uit:[ids]}` (uitsluitend eigen keuzes) en wint
   van `standaard`. Uit = weg van hub en modulelijst (en uit knoppen die ernaar wijzen), wel
   vindbaar via zoeken met "uit in Mijn modules" en een tik zet hem aan. `zichtbaar: false`
   blijft overal weg en staat niet in het keuzescherm; het seizoen werkt naast de keuze.
   Bij weergave `volledig` vult het iframe exact de ruimte tussen kop en tabbalk (de
   schermcontainer scrolt dan niet); de knop "In browser" staat in de kopbalk.
   Zichtbaarheid staat ook in de JSON: `zichtbaar: false` haalt een module overal weg
   (hub, modulelijst én zoekveld) zonder iets te verwijderen, `zichtbaar: true` toont hem
   altijd, en `seizoen: {van, tot}` (dag-maand als `MM-DD`, jaarwisseling toegestaan) laat
   hem vanzelf komen en gaan; buiten het seizoen blijft hij vindbaar via zoeken met de
   vermelding "buiten seizoen". Knoppen die rechtstreeks naar één module wijzen (de regel
   Veiligheid & natuur en de strook Nedergids op de hub, "Naar de rekentool" in Een huis
   kopen) verdwijnen mee — geen knop zonder bestemming. Veiligheid & natuur staat het hele
   jaar in de app, maar als rustige regel, niet als alarmtegel: de app heeft geen bron voor
   een gevaarniveau en beweert er dus geen. Wel toont hij, uit de postcode, welk departement
   de lezer op de kaart moet opzoeken.
9. Geen buildstap, geen bundler, geen stylesheet: alle styling staat **inline**. Draaien met
   `npx serve .`; Vercel importeert de repo zonder instellingen.
10. Persistentie in `localStorage`: `ifm_favs`, `ifm_postcode`, `ifm_pc_later`,
    `ifm_last_visit`, `ifm_landing_tot` (tijdstempel tot wanneer het landingsscherm na "Verder in de browser" wegblijft, 14 dagen), `ifm_plaats` (JSON `{postcode, plaats}`, plaatsnaam van
    geo.api.gouv.fr, zacht falend, alleen geldig bij dezelfde postcode). Actueel-tab via `nlfr-menu`'s `/api/actueel` (thema-tegels: pers,
    overheid, infofrankrijk, verenigingen) met een voorbeeldlijst-terugval; het forum via
    `nlfr-berichten` met een demo-terugval. Beide falen zacht: nooit een lege pagina.

**De catalogus staat in `modules.json` en gaat nooit terug de code in** — ontbreekt een
veld, voeg het toe aan de JSON en lees het uit met een veilige terugval, zie regel 6/8.

**De knip blijft, ook zonder abonnement.** V1.0 heeft geen inlog en geen abonnementscheck,
maar `prijs` en `knip` per module en de muur bij een eigen uitkomst zijn de haken voor de
betaalde laag. Die worden niet "opgeruimd"; een latere statuscheck haalt alleen de muur weg.

**Geen regel in de UI die iets belooft wat de app niet doet.** Geen "offline beschikbaar",
geen aantallen die niet uit de data komen, geen knop of lijstitem zonder bestemming, geen
"Gekopieerd" als het kopiëren niet gelukt is.

**Vecht dit patroon niet aan.** Niet naar React/Vue/Tailwind converteren, geen buildstap
introduceren, geen stylesheet toevoegen — zonder expliciete opdracht. Het werkt en het is
de bron van de ontwerpsessie.

## Huisstijl

- **Primaire kleur:** `#800000` (bordeaux), met transparante varianten `rgba(128,0,0,α)`,
  α tussen **0.04 en 0.80**, voor vlakken en accenten.
- **Grote koppen** (begroeting op de hub, schermtitels, artikeltitels): Source Serif 4, gewicht
  **500** (Google Fonts in `<helmet>`, ook gewicht 600 geladen). **Kleine koppen en UI-labels:**
  Poppins, gewicht **600**.
- **Themakleuren:** elk van de negen thema's heeft in `modules.json` (`themas[].kleur` en
  `tint`) een eigen kleur: Geld groen, Overheid blauw, Gezondheid rood, Adressen paars, Nieuws
  oranje, Ervaring oker, Ondernemen petrol, Wonen bordeaux, Taal grijsblauw. De kleur (donker)
  kleurt het icoon en het accent in de kop van het themascherm, de tint is de cirkel erachter.
  Terugval in `hub-lib.js`; `tests/hub.test.mjs` bewaakt WCAG AA (icoon tegen tint >= 3:1,
  accent tegen pagina >= 4.5:1).
- **Tabbalk:** vijf tabs, Home, Zoeken, Forum, Nieuws, Profiel (`TABS` in `hub-lib.js`).
- **Lopende tekst (body):** Mulish.
- **Pagina-achtergrond:** `#F4F1F0`.
- **Kaarten:** wit, `1px` rand `rgba(21,24,26,.10)`, `border-radius: 16px`.
- Tekstkleur body `#15181A`; secundaire tekst rond `#71787C`/`#3D4346`.

## Regels

### 1. Regelafstand
`line-height: 1.8em` geldt **alleen voor lopende tekst** (paragrafen, dossier- en
introteksten). **Niet** voor UI-labels, knoppen, lijstitems of de tabbalk — die blijven
compact (strakke `line-height`, rond 1.1–1.35) zodat ze niet uit elkaar vallen.

### 2. Volvlak versus transparant
Volvlak `#800000` **alleen op kleine elementen**: knoppen, badges, het logo, kleine chips.
**Grote vlakken** (panelen, banners, achtergronden, secties) krijgen een **transparante
variant** `rgba(128,0,0,α)` — nooit een groot volvlak bordeaux. Twee bewuste uitzonderingen,
omdat contrast op afstand daar zwaarder weegt: de rode alarmkaart bovenaan Zorg en het
"Groot tonen"-scherm van de Taalassistent. Die niet "repareren".

### 3. `engine/` is overgenomen, niet eigen
`engine/` is de rekenmotor van **EnergiePortaal**, overgenomen uit
`antonnoe/energieportaal`. Hij wordt hier **nooit met de hand aangepast** — alleen
**gesynchroniseerd** vanuit de bronrepo. Eén rekenmotor, twee schillen: bij een wijziging
in de logica update je de bronrepo en sync je `engine/` hierheen; de mobiele UI in
`index.html` blijft de enige plek waar je de mobiele vorm aanpast. `index.html` laadt de
motor lui via `loadEngine()` (`engine/archetypes.js`, `engine/engine.js`, `engine/dpe.js`)
en roept `applyArchetype()`, `computeResults()` en `computeDPE()` aan.

### 4. Rekenlogica niet dupliceren
De rekenlogica van een tool wordt nooit gedupliceerd — alleen de UI verschilt per platform.
Hergebruik de engine; bouw geen tweede berekening in de schil.

### 5. Alles direct naar `main`
Elk afgerond werk wordt **direct naar `main` gemerged** (of direct op `main` gecommit).
Er blijven **geen open branches en geen merge-stappen** voor de opdrachtgever liggen. Rond
een taak af, commit met een heldere boodschap, en zorg dat `main` de eindtoestand bevat.

## Praktisch

- Hittargets minimaal **44px**; mobile-first (canvas ~412px breed). Hoogte via `100dvh`
  met `100vh` als terugval; de tabbalk heeft `env(safe-area-inset-bottom)`; de viewport
  laat zoomen toe (geen `user-scalable=no`).
- Tabbalk-iconen zijn SVG-maskers (`ICONS` in `index.html`), geen Unicode-glyphs.
- Styling inline houden; geen externe CSS/JS toevoegen (fonts via Google Fonts in `<helmet>`
  zijn de uitzondering).
- `support.js` niet met de hand bewerken — het is gegenereerd.
