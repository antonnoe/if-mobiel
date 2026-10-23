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
   `energie`, en sinds 22-10-2026 `thema` (generiek themascherm), `lamaison`, `ondernemen` (route van vier stappen uit if-plek `ondernemen.json`, `ondernemen-lib.js`), `gezondheid`,
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
    `ifm_last_visit`, `ifm_landing_tot` (tijdstempel tot wanneer het landingsscherm na "Verder in de browser" wegblijft, 14 dagen), `ifm_grote_tekst` (`"1"` = Grotere tekst aan, Profiel), `ifm_abo_vraag` (tijdstempel oproep), `ifm_plaats` (JSON `{postcode, plaats}`, plaatsnaam van
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

## Artikelen in de app, betaalmuur, forumroute (ronde 23-10-2026)

- **Artikelscherm** (`screen: artikel`, `artikel-lib.js`): `openInfoArtikel(url)` is de ene ingang. Een artikel van
  infofrankrijk.com opent in de app via de WordPress REST API (`/wp/v2/posts?slug=..&_fields=title,content,date,link`, dan
  `/pages`), het slug komt uit het pad van de URL. De inhoud wordt opgeschoond tot DOM-knooppunten (geen scripts, styles,
  iframes, on*-attributen) en alleen in het geheugen bewaard, nooit in de repo. Links in rijen en artikelen openen in de app
  als ze `data-art="1"` hebben en `IfArtikel.isInApp(href)` waar is; de abonnementspagina, nederlanders.fr en tools in een
  frame blijven naar buiten gaan. Mislukt het ophalen, dan een melding met de knop naar de site, nooit een lege pagina.
- **Betaalmuurregel**: de app toont nooit meer dan infofrankrijk.com zelf aan een anonieme bezoeker geeft. Hij haalt alleen
  anoniem op (geen inlog, geen sleutel). Herkent `knipBijMuur` in de opgehaalde inhoud de afschermingsmelding van Paid Member
  Subscriptions (klasse of tekst `pms-...`, zoals `pms-restriction-message` of `[pms-restrict]`; losse "PMS" en "3PMSF" tellen
  niet), dan blijft alleen de inleiding tot dat punt staan, gevolgd door het abonneeblok als muur ("Lees verder als abonnee").
  Heeft de site de markup ooit anders, pas dan alleen `MUUR_START` in `artikel-lib.js` aan en voeg een geval toe aan
  `tests/artikel.test.mjs`.
- **Forumroute ("Bespreek op het forum")**: titel, korte samenvatting (eerste alinea, ingekort) en artikellink gaan naar het
  klembord (`kopieerSync` binnen het tikmoment, terugval `navigator.clipboard`), daarna opent
  https://www.nederlanders.fr/profiles/blog/new in een nieuw tabblad. "Tekst gekopieerd, plak hem in het bericht" staat er
  alleen als het kopiëren gelukt is; anders toont de app de tekst om zelf te kopiëren. Bij de overstap naar NLFR V2 wordt dit
  een vooraf ingevulde draad (alleen `artForum()` en `artForumUrl` aanpassen).
- **Abonneeblok en onderblad**: de abonnementslink staat op één plek, `abonnement.url` in `modules.json` (terugval
  `ABONNEE_URL` in `abonnee-lib.js`). Het vaste blok staat onder de uitkomst van De Ruyter en onder een artikel (bij
  een muur is het blok de muur). Het onderblad (oproep) komt hooguit eens per week (`localStorage` `ifm_abo_vraag`, alleen een
  tijdstempel) en eens per sessie, na een uitkomst van De Ruyter of na een berekening in Energie (tool met prijs abonnee); niet
  na een artikel (daar staat al het vaste blok); altijd te sluiten. Tekst staat in `index.html`; de regel in `IfAbonnee.moetOproep`.

## Terugknop, hash-routes, zoeken in artikelen, forumblad (herstelronde 1, 23-10-2026)

- **Geschiedenis en hash-routes** (`nav-lib.js`, `window.IfNav`; in `index.html` `histSync`, `histPop`, `terugStap`, `terugKnop`): elke schermwissel
  (scherm, fase- of stappenlijst, hoofdstuk, artikel, genest artikel) en elk onderblad (forumblad, abonneeblad, postcodeblad, groot tonen) is een
  `history.pushState`-regel; `popstate` doet dezelfde stap als de pijl linksboven (`terugStap`, die ook bladen eerst sluit). De pijl zelf roept
  `history.back()` aan zodra er een eerdere regel is. Hoofdschermen onderling (tabs) vervangen de regel in plaats van een nieuwe te maken. Routes:
  `#/artikel/<slug>`, `#/nieuws`, `#/forum`, `#/profiel`, `#/zoek`; elke andere hash valt terug op de hub, geen server-routes nodig. Een gedeelde
  artikellink slaat bij een eerste bezoek het postcodeblad over. Delen deelt `https://infopoche.fr/#/artikel/<slug>` plus de bron (`APP_URL`).
  Elk nieuw scherm opent bovenaan; terug herstelt de scrollstand (`_scr` per regel, bijgehouden via een scroll-luisteraar). Nieuwe schermen met
  eigen terugstap: voeg ze toe aan `terugStap` en, voor een eigen sleutel, aan `histToestand` en `navKey`.
- **Laadtoken**: `artLaad` en het zoeken gebruiken `IfNav.maakTeller()`, los van `state`; zo toont een mislukking die sneller komt dan de
  schermovergang (offline, geblokkeerde route, HTTP 500) altijd de foutmelding met "Opnieuw proberen" en de siteknop, nooit een eindeloze spinner.
  Updates na een asynchrone aanvraag lopen via een functionele `setState` die het token en het artikel (slug) controleert.
- **Zoeken in artikelen**: het zoekscherm heeft onder de modulezoek een sectie "Artikelen op Infofrankrijk" via
  `https://infofrankrijk.com/wp-json/wp/v2/search?search=<term>&per_page=8&_fields=title,url,subtype` (anoniem, `credentials:"omit"`, 350 ms
  debounce, minimaal 3 tekens, cache per term, zacht falen met een eerlijke regel). Treffers openen in het artikelscherm.
- **Forumblad** (`forumStart(tekst)`): "Bespreek op het forum" (artikelscherm en elke nieuwskaart: titel, samenvatting, bronlink) kopieert en opent een
  klein blad met uitleg; pas de tik op "Open Nederlanders.fr" opent https://www.nederlanders.fr/profiles/blog/new in een nieuw tabblad. Mislukt
  kopiëren, dan staat de tekst in het blad om zelf te selecteren. Het abonneeblad komt na een forumblad in dezelfde sessie niet meer (`_opSessie`).
- **Eerlijke teksten**: de app belooft alleen wat hij doet (de noodtegel zegt "Wat u vandaag kunt doen", de postcode laat de app uw departement
  noemen, hij filtert niet). Postcode wissen toont "Postcode gewist" met "Ongedaan maken" in het scherm, geen browser-confirm.

## Themabeeld, schermovergangen, grotere tekst (ronde 23-10-2026)

- **Themabeeld nieuws**: kleur en pictogram per nieuwsthema staan als data in `modules.json` (`nieuwsBeeld`, thema naar `themas`-kleur en pictogramsleutel); de pictogramlijnen en de neutrale terugval staan in `nieuws-lib.js` (`ICONEN`, `beeldVoor`). Een nieuw thema van de nieuwsroute: één regel in `nieuwsBeeld`. Inline SVG, geen foto's, patroon-id's uniek per item (`patroonId`). Tests: `tests/nieuws-beeld.test.mjs`.
- **Schermovergangen**: `Component.setState` wikkelt een wissel van `state.screen` in `document.startViewTransition` (180 ms vervagen van de schermcontainer); zonder de API of bij `prefers-reduced-motion` wisselt het scherm direct. Andere setState-aanroepen wachten tijdens de wissel in een rij. Bij reduced motion staan ook alle animaties en transities uit (CSS in `<helmet>`).
- **Grotere tekst**: Profiel-schakelaar, `localStorage` `ifm_grote_tekst`. Techniek: CSS `zoom` (`TEKST_ZOOM`, nu 1,18) op kopbalk, schermcontainer, tabbalk, dossierbalk en de twee bladen via de hole `zoomCss`. Nieuwe vaste elementen met tekst krijgen dezelfde hole. Rijen met twee kolommen krijgen `flex-wrap`, lange titels `overflow-wrap:anywhere`.

## Gezondheid in twee niveaus, toolkaart, veld `artikel` en `drempel` (bouwronde 2, 23-10-2026)

- **Gezondheid, eerste niveau** (`screen: gezondheid`, `state.gzOnd` = null): intro, spoedblok (`tel:15`, geverifieerd op service-public.gouv.fr F33954), zes onderwerptegels en de Hulpmiddelen
  (modules met thema gezondheid, Mijn modules telt mee; `hulpmiddelen.uitsluiten` laat `zorg` en `zorglexicon` weg). De indeling staat in `modules.json` onder `gezondheid`:
  `intro`, `spoed`, `onderwerpen: [{id, titel, regel, icoon, artikelen:[{url, titel}], modules:[id], scherm:"ouderen"}]`, `hulpmiddelen`. De titels in de data zijn de terugval; de app haalt
  de actuele titels per onderwerp live op (`gzLaadTitels`, posts met slug-lijst, 15 s, zacht falend). Pictogrammen: sleutels `gz...` in `THEMA_ICONS`. Een tik op een onderwerp opent een lijst
  met artikelen (`openInfoArtikel`) en eventuele modules; `scherm:"ouderen"` opent het bestaande dossierscherm (noodblok, Nu al regelen, zes fasen) ongewijzigd, een niveau dieper
  (`gzOnd === "ouderen"`). Terug: `terugStap` (hoofdstuk, lijst, onderwerp), `histToestand` en `IfNav.navKey` kennen `gzOnd`. Een nieuw onderwerp is een blok in de JSON en een icoon.
- **Toolkaart** (`artikel-lib.js`, `toolKaartVoor`, `moduleVoorUrl`): `schoon(html, {modules})` vervangt een iframe in een artikel door een kaart: hoort de URL bij een module (zelfde host, bij github.io ook
  het eerste padsegment) dan staat er de modulenaam en "Open de tool" (`a[data-tool]`, in `index.html` afgehandeld met `route(m)`); anders "Interactieve tool" met de hostnaam en een link naar een nieuw
  tabblad; YouTube, Vimeo en Dailymotion worden "Bekijk de video". Alleen https. `zonderDivi` haalt de ruwe Divi-shortcodes (`[et_pb_...]`) uit REST-inhoud, `<pee>` wordt een alinea.
- **Veld `artikel`** op een module: het Infofrankrijk-artikel waarvan de kern deze tool is. `openInfoArtikel(url, {tegel:true})` (data-art-links buiten een artikel, zoekresultaten) opent dan de module;
  in de module staat de rij "Lees de uitleg op Infofrankrijk" (`toolArtikelOpen`, opent altijd het artikel). Hash-routes en links binnen een artikel openen altijd het artikel.
- **Prijzen en `drempel`**: alle betaalmuren op Infofrankrijk zijn eruit; `prijs` staat voorlopig overal op `gratis`. Het veld `prijs`, de knip-haken en de abonnee-labels in de code blijven bestaan
  (terugzetten naar `abonnee` brengt label, knipblok en muur terug: `heeftKnip` en `enMuurOpen` volgen `prijs`). `drempel` (leeg) is de plek voor de latere regel; er hangt geen logica aan.
  Het vaste abonneeblok en het onderblad leunen op bekostiging en het forum, niet op exclusieve toegang.

## Herstelronde na bouwronde 2 (23-10-2026)

- **Geen exclusiviteit**: alle tools zijn gratis; zichtbare tekst belooft nergens iets alleen voor abonnees (uitzondering: Mijn dossier, DossierFrankrijk). Alle modules toont alleen het aantal; Over ons zegt dat het abonnement redactie en onderhoud bekostigt. Teksten die alleen bij `prijs: abonnee` verschijnen (haken) blijven staan.
- **Spoedblok Gezondheid**: `gezondheid.spoed.knoppen: [{label, tel}]` (Bel 15, Bel 112), twee knoppen naast elkaar van minimaal 48 px; terugval op de oude velden `knop`/`tel`.
- **Tabbladen in artikelen** (`tabsNaarKoppen` in `artikel-lib.js`): tabs met radioknoppen en labels, Divi's `.et_pb_tabs` en `[et_pb_tab title=..]` worden een h3 met de inhoud eronder.
- **Toolpagina**: een artikel dat na opschonen vrijwel alleen een toolkaart is (minder dan 160 tekens tekst) toont "Dit onderdeel is een interactieve tool." en de kaart groot bovenaan (`toolAlleen`); in lijsten krijgt zo'n item "Tool op Infofrankrijk" via `soort: "tool"` in de data of een eerder geopend artikel.
- **Zoeken**: volgorde modules en tools, artikelen op Infofrankrijk, zinnen/woorden/berichten; modules matchen als alle zoekwoorden voorkomen (niet per se naast elkaar).
- Correspondentie en Financieel kompas staan op `weergave: volledig` (briefhulp-fr.vercel.app en financieel-kompas-ai.vercel.app laten framing toe).

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
