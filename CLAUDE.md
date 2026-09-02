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
   `over`, plus de uitgewerkte eigen schillen `nedergids`, `vastgoed`, `zorg`, `ruyter` en
   `energie`. Er is geen `login`- of `dossier`-scherm — de app werkt zonder account; wat
   betaald is krijgt een uitleg en een muur, niet een aparte inlogroute (zie `knip` per
   module, en de openstaande vragen over abonnementsstatus in `BOUWOPDRACHT.md`).
6. De modulecatalogus staat in `modules.json` (`groepen`, `modules`, plus per-kind extra's
   zoals `vastgoed`, `zorg`, `ruyter`, `nedergids`, `departementen`) — **nooit** in de code.
   De taakbalk heeft twee varianten (`tabVariant` A/B, een ontwerpprop): A toont een
   zoekbalk boven de hub, B een "Vandaag"-strip. Er zijn geen aparte hub-weergaven
   (Dossiers/Tegels/Index) meer.
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
9. Geen buildstap, geen bundler, geen stylesheet: alle styling staat **inline**. Draaien met
   `npx serve .`; Vercel importeert de repo zonder instellingen.
10. Persistentie in `localStorage`: `ifm_favs`, `ifm_postcode`, `ifm_pc_later`,
    `ifm_last_visit`. Actueel-tab via `nlfr-menu`'s `/api/actueel` (thema-tegels: pers,
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
- **Koppen:** Poppins, gewicht **600**.
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
