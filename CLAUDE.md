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
   tegelijk via `state.screen`: `hub`, `mod`, `zoek`, `gem`, `tool`, `acc`,
   `over`, plus de uitgewerkte eigen schillen `nedergids`, `vastgoed`, `zorg`, `ruyter`,
   `energie`, en sinds 22-10-2026 `thema` (generiek themascherm), `lamaison`, `ondernemen` (route van vier stappen uit if-plek `ondernemen.json`, `ondernemen-lib.js`), `gezondheid`,
   `nieuws`, `dossierdemo`, `sponsors` (Onze sponsors, hamburgermenu) en `tekoop` (Te koop in Frankrijk). De hub is een raster van negen themategels uit `themas` in
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
   `mod` (Alle modules) is een hoofdscherm achter de tab Modules (hash `#/modules`); Profiel (`acc`), Mijn modules (`keuze`) en Over ons (`over`) staan in het hamburgermenu.
7. `renderVals()` bouwt in één keer álle holes voor het actieve scherm; losse `*Vals()`-
   helpers leveren hun deel toe (bv. `enVals()` voor het energiescherm).
8. `kind` in `modules.json` bepaalt het scherm: `iframe`, `voorbeeld`, `info`,
   `forum`, `actueel`, `nedergids`, `vastgoed`, `zorg`, `ruyter`, `energie`, `advertenties`. Een nieuw type
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
    `ifm_last_visit`, `ifm_landing_tot` (vervallen sinds 25-10-2026, wordt niet meer gelezen; zie sessionStorage hieronder), `ifm_grote_tekst` (`"1"` = Grotere tekst aan, Profiel), `ifm_abo_vraag` (tijdstempel oproep), `ifm_plaats` (JSON `{postcode, plaats}`, plaatsnaam van
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
  (modules met thema gezondheid, Mijn modules telt mee; `hulpmiddelen.uitsluiten` laat `zorg` weg). De indeling staat in `modules.json` onder `gezondheid`:
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

## Ronde 24-10-2026: zes modules erbij, noodregel op de hub

- Zes modules in `modules.json`, alle `standaard: "uit"`, `gratis`, `weergave: "volledig"` (framing gecontroleerd met curl -sI: geen x-frame-options of frame-ancestors-beperking, bij twee hosts expliciet `ALLOWALL`), met veld `artikel`: `beroepenchecker`, `energieportaal` ("EnergiePortaal, volledige site"; de eigen schil `energie` is ongewijzigd), `vastgoedanalyse`, `klusforum`, `controletechnique`, `overhedenbuurt`. Toolkaarten in de zes artikelen tonen "Tool in de app". Tests: `tests/ronde4.test.mjs`.
- Noodregel onderaan de hub (alleen scherm `hub`, onder de favorieten): tekst uit `gezondheid.spoed.hubTekst`, knoppen uit `gezondheid.spoed.knoppen` via `spoedKnoppenLijst()` (ook gebruikt door het Gezondheid-scherm); rustig grijs vlak, tikvlak 44 px, geen alarmkleur.

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
- **Tabbalk:** vijf gelijke tabs, Home, Zoeken, Modules, Forum, Nieuws (`TABS` in `hub-lib.js`), labels 12,5 px (actief 700), balk ongeveer 74 px inclusief safe-area, tikvlak minstens 44 px. `HubLib.tabVan`: `mod` en `keuze` markeren Modules; `acc` en `over` markeren geen tab (lege tekst).
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
omdat contrast op afstand daar zwaarder weegt: de rode alarmkaart bovenaan Zorg. Die niet
"repareren". (Het "Groot tonen"-scherm van de Taalassistent is vervallen; het verhuist naar TaalHulp.)

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

## Ronde 24-10-2026 (2): Taal

- De ingebouwde Taalassistent (module `taal`, schermen `taal` en `lex`, de situatiedata, "Groot tonen", zoekhits SITUATIE, ZIN en situatiewoorden) en de module `zorglexicon` zijn verwijderd. Thema Taal heeft nu drie onderdelen die elkaar niet overlappen: TaalHulp (`taalhulp`, situaties), Woordenboek met uitleg (`woordenboek`, nieuw, iframe op taalhulp-fr.vercel.app/woordenboek, `volledig`, in ontwikkeling) en Correspondentie. Het woordenboek staat ook bij het Gezondheid-onderwerp "Woorden bij de dokter". "Later — naar de gratis onderdelen" op de Energie-muur opent nu het themascherm Taal. Tests: `tests/ronde5.test.mjs`.

## Ronde 25-10-2026: hamburgermenu, tabbalk, logo, lettergroottes

- **Hamburgermenu** (`menu` in state, `menuOpen/menuSluit/menuNaar/menuToets` in `index.html`): knop 46x46 uiterst rechts in de kopbalk op elk scherm (`#ifm-menuknop`, `aria-label="Menu"`, `aria-expanded`, een X als het open is). Het paneel hangt onder de kopbalk met een verduisterde achtergrond; tik op de achtergrond, X, een item, Escape of het terug-gebaar sluit het (het menu is een blad in de geschiedenis, blad `menu`). Achtergrondscroll staat vast (`scrollOverflow`), Tab loopt rond binnen paneel en knop. Items: Profiel, Mijn modules, Over ons, Grotere tekst (schakelaar op `ifm_grote_tekst`, menu blijft open), Postcode (waarde of "niet ingesteld", opent het bestaande postcodeblad), kaart "Zet op uw beginscherm" (weg bij `display-mode: standalone` of `navigator.standalone`; verwijst nu naar de uitleg onderaan Profiel, `#ifm-installeer`), en een uitlegregel over app sluiten. Er is bewust geen sluitknop: een web-app kan zichzelf niet betrouwbaar sluiten. De logica achter de kaart (Android installatievenster, installatieblad) komt in een aparte opdracht. Nieuwe localStorage-sleutels: geen.
- **Kopbalk**: logo (gouden Frankrijk-met-i, `icons/logo-goud.svg`, op navy #0E1A2E, 34x34) op schermen zonder Terug-knop; de badge GRATIS is weg, ABONNEMENT en VOORBEELD blijven naast het hamburgerknopje; de onderregel op de hub is "Departement NN, plaatsnaam" (alleen wat de data kent) of de tagline "Kennis en ervaring dans la poche", wordt omgebroken en nooit afgekapt; de titel krijgt ellipsis.
- **Lettergroottes**: geen zichtbare schilltekst onder 11,5 px; prijslabels en andere hoofdletterlabels 11,5 px, alle andere tekst die kleiner was dan 12 px is nu 12 px. `tests/ronde6.test.mjs` scant de bron.
- **Namen**: de module `klussen` heet "Klussen in Frankrijk" (`kort`: "Klussen"); de nieuwe module `lijstjes` ("Mijn lijstjes", iframe `infofrankrijk.com/klussen/lijstjes/`, zoekschil, volledig) staat direct erna in groep en thema Wonen. De lijstjes zelf staan in de localStorage-sleutel `kif-lijstjes-v1` op infofrankrijk.com (niet van de app).

## Ronde 25-10-2026 (2): sterk aansporen om te installeren, nooit blokkeren

Besluit Anton (optie B): "sterk mag en moet wel heel sterk zijn", maar de lezer kan altijd doorgaan in de browser. "Geinstalleerd" = `display-mode: standalone` of `navigator.standalone` (`alGeinstalleerd()` in de app, `isStandalone()` in het landingsscript, plus de gebeurtenis `appinstalled`); daar verschijnt niets van onderstaande aansporingen.

- **sessionStorage-sleutels** (alleen tot het einde van de browsersessie; constanten in `landing-lib.js`): `ifm_landing_sessie` (na "Verder in de browser" geen landing meer), `ifm_install_balk_weg` (balk weggeklikt), `ifm_install_blad_getoond` (het automatische installatieblad is deze sessie geweest). De oude localStorage-sleutel `ifm_landing_tot` wordt genegeerd en niet meer geschreven.
- **Landing** (script bovenin `index.html`): bij elke nieuwe browsersessie, niet bij een route-hash naar inhoud (`LandingLib.heeftInhoudHash`: alles behalve leeg, `#` en `#/`; gedeelde links breken niet), nooit standalone. `LandingLib.toonLanding({standalone, hash, sessie})` is de pure regel. "Verder in de browser" is een kleine tekstlink onderaan; de stappenkaart of de knop "Installeer" is primair. Het landingsscript zet `window.__ifmLandingOpen` en stuurt `ifm-landing-weg` bij sluiten.
- **Een bron voor de stappen**: `LandingLib.blokHtml({omgeving, browser, heeftEvent, afgebroken, status, palet})` bouwt het blok voor iOS Safari (genummerde stappen met deelicoon), iOS in Chrome/Firefox/Edge, in-app browsers ("Open Infopoche in Safari of Chrome" plus "Kopieer de link"), Android (met event: grote knop "Installeer"; zonder: handmatige stappen) en desktop (QR). Knoppen dragen `data-ifm-actie="installeer|kopieer"`. `LandingLib.installeer(ev, cb)` en `LandingLib.kopieer(nav, doc, cb)` zijn de gedeelde acties. Wie de stappen wil wijzigen doet dat alleen daar.
- **`beforeinstallprompt`** wordt vroeg gevangen in een klein script in `<head>` (voor de landing); het event staat op `window.__ifmInstallEv` (door landing en app gedeeld, gebruikt na een `prompt()`), `ifm-installevent` meldt een nieuw event.
- **Installatiebalk** (`data-installbalk`, tussen kopbalk en schermcontainer, dus nooit over kopbalk of tabbalk): bordeaux `#800000`, witte tekst "Installeer Infopoche op uw beginscherm", knop "Hoe?" en een sluitknop van 44 px (`ifm_install_balk_weg`). Bewuste uitzondering op regel 2 (geen groot volvlak bordeaux), op uitdrukkelijke wens van Anton. Weg onder de landing, in de geinstalleerde app, en zolang het installatieblad open staat.
- **Installatieblad** (`data-installblad`, state `installBlad`, onderrandblad tot 85 procent, scrollbaar; sluit met X, achtergrond, Escape, "Verder in de browser" en het terug-gebaar, blad `install` in de geschiedenis). Inhoud uit `LandingLib.blokHtml` met palet `licht`, gevuld in `vulInstall()`.
- **Automatisch blad**: `checkInstallAuto()` opent het blad eenmaal per sessie (kop "Fijn dat Infopoche u helpt. Zet hem op uw beginscherm.") na het eerste nuttige resultaat: een tooluitkomst (`opSoort()`, hetzelfde moment als het abonneeblad) of een klaar artikel; pure regel `LandingLib.toonAutoBlad`. Het installatieblad gaat voor het abonneeblad: `checkOproep` en zijn timer wachten zolang `installBlad` open staat of de installatietimer loopt; daarna volgt het abonneeblad (weekritme `ifm_abo_vraag` ongewijzigd). Nooit twee bladen tegelijk (ook geen postcode-, forum- of menublad).
- **Hamburgermenu**: de kaart "Zet op uw beginscherm" staat bovenaan, boven Profiel, en opent het installatieblad; in een geinstalleerde app staat daar alleen een rustige regel "App is geïnstalleerd" (geen kaart). De uitleg onderaan Profiel is een knop naar hetzelfde blad (weg bij geinstalleerd).
- **Iframe-rechten**: het tool-iframe (weergave volledig) heeft `allow="clipboard-write; web-share"`; het voorvertoning-iframe heeft geen `allow` en is ongewijzigd.
- Service worker `VERSIE` 2026-10-25-3. Tests: `tests/landing.test.mjs` (sessie, hash-uitzondering, standalone, balk, automatisch blad, blokHtml).

## Herstelronde 1 na keuring (25-10-2026)

- **Geen liggende streepjes** in zichtbare tekst (index.html buiten Over ons, `landing-lib.js`, `modules.json`): komma, dubbele punt of een nieuwe zin. Alleen een numeriek bereik (1-3, 9-20 uur, 1948-1974) en code of commentaar mogen een streepje houden. Titels van de WordPress-zoekAPI worden in `nav-lib.js` met een koppelteken getoond. `tests/herstel1b.test.mjs` bewaakt dit; `piramide.json` (Kennispiramide, bereikbaar via Over ons) is bewust niet aangeraakt en valt bij de Over ons-ronde.
- **Postcodeblad opent nooit vanzelf.** Er is geen automatisch blad bij de start meer (`vraagPostcode` start `false`); het blad opent alleen via de tegel op Home ("Stel uw postcode in", `openRegio`), het menu-item Postcode en de knoppen in Profiel, Nedergids en Veiligheid. Het sluit met de X (44x44), een tik buiten het blad (`pcBladSluit`), Escape en het terug-gebaar. De uitleg achter het i-knopje is één zin. `ifm_pc_later` blijft bestaan (knop "Later, ik vul het per keer in") maar stuurt niets meer aan. Het installatieblad na het eerste nuttige resultaat, de landing en de balk blijven.
- **Desktop**: `isDesktop()` in `index.html` (min-width 900 px en pointer fine, of `detecteerOmgeving` = desktop; pure regel `LandingLib.isDesktopWeergave`). Daar geen installatiebalk (`toonBalk({desktop})`) en geen automatisch installatieblad (`toonAutoBlad({desktop})`). Landing met QR en de menukaart "Zet op uw beginscherm" (blad met QR) blijven.
- **Installatiebalk blijft staan onder een open blad** (geen verspringende inhoud); de eerdere regel "weg zolang het installatieblad open staat" is vervallen.
- **App sluiten**: menu en onderaan Profiel dezelfde uitleg ("U hoeft de app niet af te sluiten...").
- **Kopbalk module**: toont alleen de themanaam, het interne veld `schil` (zoekschil, keuzeschil, ...) staat niet meer in de UI.
- **Tabbalk**: `HubLib.tabVan("tool")` is `mod`; een geopende module (iframe of schil) markeert Modules.
- **Zoekresultaten Infofrankrijk**: slugs met procent-codes (`woordenlijst-klussen-bouwen-nl-%e2%87%84-fr`) worden niet meer gedecodeerd en openen in de app (REST API accepteert beide vormen; getest). Treffers zonder leesbaar slug (bijv. onder `/klussen/`) tonen "SITE" en "Op infofrankrijk.com ↗" en openen in een nieuw tabblad.
- Aanraakdoelen: wis-kruisje in het zoekveld 44x44 (icoon 28), alle sluitkruisjes van bladen 44x44.

## Ronde 25-10-2026 (3): Onze sponsors en Te koop in Frankrijk

- **Onze sponsors** (`screen: sponsors`, `sponsors-lib.js` = `window.IfSponsors`, data in `sponsors.json`, beelden in `sponsors/`): menuregel tussen Mijn modules en Over ons (ster, 56 px), hash `#/sponsors`, geen tab (`tabVan` geeft ""), terugknop zoals Over ons. Elke opening schudt de volgorde (Fisher-Yates in `sponsorsOpen`), de rest van het bestand is bronvolgorde. `sponsors.json`: `[{id, naam, url, beelden:[bestandsnamen in sponsors/], breedte, hoogte, interval (ms, alleen bij meer dan 1 beeld), fade (ms)}]`. Een sponsor erbij of eraf is een regel in de JSON plus een bestand in `sponsors/` (en in `SCHIL` van `sw.js`). De beelden zijn eigen kopieen: de NING-opslag verdwijnt. Wisselende banners (NVLR 3 beelden 5 s fade 600 ms, Caderonne 5 beelden 5,5 s fade 1 s) staan als gestapelde `img`'s met opacity-overgang (dus voorgeladen); een ticker (`spTik`, 250 ms) zet `state.spNu` alleen als een beeld verandert, en stopt zodra `state.screen` niet meer `sponsors` is. Bij `prefers-reduced-motion` alleen het eerste beeld, geen ticker. Valt een beeld uit (`onError`), dan wordt het overgeslagen; vallen ze allemaal uit, dan toont de kaart de naam als tekst. Geen tellers, geen tracking. Kaart = `<a target=_blank rel=noopener>`; "Word ook sponsor" opent https://www.nederlanders.fr/page/sponsors.
- **Te koop in Frankrijk** (module `tekoop`, `kind: advertenties`, scherm `tekoop`, `advertenties-lib.js` = `window.IfAdv`): alleen lezen. Bron `GET https://if-plek.vercel.app/api/vastgoed` (`{bijgewerkt, bron, aantal, items:[{titel, url, prijsTekst, prijs, foto, plaats, omschrijving, datum, datumISO, exploitatie}]}`, nieuwste eerst; fout = status 502). `IfAdv.lees` valideert (item zonder titel of zonder https-url valt af, alleen https-foto's, `exploitatie` mag boolean of "ja" zijn). Anoniem (`credentials:"omit"`), 10 s time-out, `IfNav.maakTeller()`; een mislukte verversing laat een eerder geladen lijst staan. Kaart per advertentie is een link naar Nederlanders.fr in een nieuw tabblad (de app opent die pagina's niet zelf), foto 16:9 met grijs vlak en bij uitval de titel, label "Exploitatie mogelijk", prijs bordeaux, plaats boven titel, omschrijving max 3 regels, "Geplaatst: dd-mm-jjjj". Blokken van 20 met "Toon meer". Geen filters in deze ronde. Hash `#/tekoop`, tab Modules actief. Zoeken vindt de module ook op `zoekwoorden` (nieuw optioneel veld in `modules.json`, gaat mee in de zoekregel). In `lmVals` staat `tekoop` direct na `lijstjes`.
- Templatevalkuil: een `<img>` in een `<sc-for>` moet `loading="lazy"` hebben, anders laadt de browser de ruwe template-tekst `{{ b.src }}` en vuurt `onerror` met een ReferenceError in de console.
- Service worker `VERSIE` 2026-10-25-6. Tests: `tests/ronde7.test.mjs` (fixture `tests/fixture-vastgoed.json`).

## Herstelronde 1, sponsors en Te koop in Frankrijk (25-10-2026)

- Externe links zijn ook voor het oog herkenbaar: advertentiekaart eindigt met "Bekijk op Nederlanders.fr ↗", sponsorkaart toont onder het logo "Naar de site van <naam> ↗", knoppen "Word ook sponsor ↗", "Adverteren op Nederlanders.fr ↗" en "Open de advertenties op Nederlanders.fr ↗".
- Adverteren: geen knop "Hoe werkt dat?" meer maar twee zinnen uitleg en de knop naar https://www.nederlanders.fr/page/onroerend-goed. "Toon meer (nog N)". Prijs "k.k." wordt in de weergave "k.k. (kosten koper)" (`IfAdv.prijsWeergave`, bron ongewijzigd).
- Eén naam "Te koop in Frankrijk" (ook `kort`). De kopbalktitel breekt af op twee regels, nooit een ellipsis.
- Sponsors: label "SPONSOR · NAAM" op 12 px; veld `vertraging` (ms) in `sponsors.json`: NVLR start 2750 ms later zodat NVLR (5000) en Caderonne (5500) nooit gelijk wisselen (bij 2500 vallen ze elke 27,5 s samen). Voettekst "Volgorde wisselt bij elke opening. Tik op een sponsor om de site te openen." Service worker 2026-10-25-7.

## Nedergids-scherm vereenvoudigd (28-10-2026)

- Het scherm `nedergids` toont alleen label, kop, intro, de V2-regel, vier kaarten (sinds 29-10-2026: Nedergids.nl extern, Verenigingen, Franse overheden en de hygiënecontroles in de app; Adressenboek en overheden zijn één kaart) en een slotregel (alles in `index.html`, geen data in `modules.json`; het blok `nedergids` met categorieën, sites, aanmelden, uitgelicht en archiefnoot is weg). De kopbalk herhaalt de kop niet. Tests: `tests/nedergids.test.mjs`. Het Peil-label in Energie (`PEIL_LABEL_AAN`) blijft uit: zes parameters zijn raming en `standaardprijzen_invoer` heeft geen verificatiedatum.

## Hygiënecontroles (Alim'confiance, 29-10-2026)

- Scherm `hygiene` (kaart op het Nedergids-scherm, titel "Hygiënecontroles", geen tab, terug naar `nedergids`), logica in `hygiene-lib.js` (`window.IfHyg`) en `hyOpen/hyZoek/hyVals` in `index.html`. Bron: officiële API van het Ministerie van Landbouw (DGAL), Opendatasoft Explore v2.1, dataset `export_alimconfiance` (71.472 rijen, Licence Ouverte), `GET .../records?where=code_postal="NNNNN"&order_by=date_inspection desc&limit=20&offset=N`. Anoniem, `credentials:"omit"`, geen eigen headers (die falen in de preflight), bewust geen `select` (een verkeerde veldnaam geeft een 400). Zoeken kan alleen op postcode; een opgeslagen postcode wordt vooringevuld en direct gezocht. Per zaak blijft de nieuwste controle staan (`voegSamen`), "Toon meer" haalt blokken van 20 (offset + limit maximaal 10000). De uitkomst krijgt een Nederlandse omschrijving met het Franse origineel (`uitkomstTekst`); onbekende tekst blijft ongewijzigd, er is geen kleurcode of oordeel. Mislukt het ophalen: melding, "Opnieuw proberen" en de link naar alimconfiance.agriculture.gouv.fr. Tests: `tests/hygiene.test.mjs`.
- De download-URL's `/explore/dataset/.../download/` gaven bij een test een 503 en horen er niet in; de `/records`- en `/exports/`-eindpunten van de API werken.

## Locatie op verzoek en kaartlink bij hygiënecontroles (29-10-2026)

- **Locatie** (`geoVraag(waar, klaar)`, `geoMelding(waar)` in `index.html`; `HubLib.geoUrl`, `HubLib.postcodeUitGeo`): alleen na een tik op "Gebruik mijn locatie", nooit automatisch. `navigator.geolocation.getCurrentPosition` (grofweg, 10 s, `maximumAge` 5 min), daarna `geo.api.gouv.fr/communes?lat=..&lon=..` voor de eerste geldige postcode. De coördinaten gaan alleen naar die overheids-API en worden nergens bewaard. De knop staat in het postcodeblad (vult het veld, bewaren blijft een eigen tik) en op het scherm Hygiënecontroles (zoekt direct). Meldingen: geweigerd, buiten Frankrijk, te lang, niet beschikbaar, fout; altijd met de uitweg "vul de postcode zelf in". Bij een gemeente met meerdere postcodes (bv. Parijs) is dit de eerste: een grove aanduiding. Tests: `tests/geo.test.mjs`.
- **Kaartlink** per controle ("Toon op de kaart"): coördinaten `geores` van de bron, anders naam en adres, als Google Maps-zoeklink in een nieuw tabblad (opent op telefoons in de kaart-app).
- **Iframe-rechten per module** (veld `rechten` in `modules.json`, tekst zoals `geolocation`): het tool-iframe krijgt `allow="clipboard-write; web-share"` plus dit recht (`toolAllow`). Nu alleen `overhedenbuurt` (het dashboard heeft een eigen locatieknop; de browser vraagt nog steeds zelf om toestemming). Geen algemeen recht voor alle modules. De toegestane rechten staan in `IFRAME_RECHTEN` in `index.html` (nu alleen `geolocation`); een nieuw recht is een bewuste regel daar, plus een test. Gecontroleerd op 29-10-2026 (bron van alle 37 iframe-modules): alleen het dashboard roept `navigator.geolocation` aan; `moestuin` bevat alleen de standaardcode van MapLibre en gebruikt locatie zelf niet. **Nieuwe tool met locatie?** Bouw in de tool een knop "Gebruik mijn locatie" (alleen na een tik, adres of postcode via de Franse overheids-API, niets bewaren, altijd met de uitweg om zelf te typen), zet `"rechten": "geolocation"` bij de module en zet `allow="geolocation"` in het WordPress-blok.

## Mijn gemeente (Nedergids, 29-10-2026)

- Scherm `gemeente` (eerste in-app kaart op het Nedergids-scherm, titel "Mijn gemeente", geen tab, terug naar `nedergids`), logica in `gemeente-lib.js` (`window.IfGem`) en `gmOpen/gmZoek/gmKies/gmHaal/gmKaartenLijst/gmVals` in `index.html`. De gemeente komt uit een postcode (`geo.api.gouv.fr/communes?codePostal=`; bij meerdere gemeenten kiest de lezer, grootste eerst) of uit "Gebruik mijn locatie" (zelfde `geoVraag`, nu met gemeentecode en middelpunt). Opgeslagen postcode wordt vooringevuld en direct gezocht. Niets wordt bewaard; antwoorden staan alleen in het geheugen (`_gmCache`).
- **Elke kaart haalt zijn eigen bron op en meldt zijn eigen uitval** ("DVF-data momenteel niet beschikbaar.", "Risicodata momenteel niet beschikbaar.", enz.); de rest blijft werken. Geen gegevens gevonden is een andere melding dan een storing (`leeg` tegenover `fout`).
- **Bronnen** (allemaal anoniem, simpele GET, getest vanuit infopoche.fr op 29-10-2026, Bergerac 24037): Géorisques `georisques.gouv.fr/api/v1/` (`gaspar/risques`, `gaspar/catnat`, `radon`, `zonage_sismique`; het `resultats_rapport_risque`-eindpunt gaf serverfouten en wordt niet gebruikt; de lijst is per gemeente, niet per adres; Etalab 2.0); taxe foncière uit dataset `fiscalite-locale-des-particuliers` op data.economie.gouv.fr (alleen tarieven `taux_global_tfb/tfnb/th`, `taux_plein_teom`, per tarief het nieuwste gevulde jaar, nooit een bedrag; Licence Ouverte 2.0); mairie uit de Annuaire (`pivot LIKE "mairie" AND code_insee_commune`, dezelfde vraag als `dashboard-admin`; die vraag is vanuit infopoche.fr nog niet apart getest); DVF alleen een telling via `apidf-preprod.cerema.fr/dvf_opendata/mutations/` (preprod, kan wegvallen, daarom de eigen melding; geen prijzen, die staan op de officiële kaart).
- **Geen eigen cijfers, alleen een link naar de officiële kaart**: ARCEP (internet, mobiel: geen CORS, alleen bestanden) en DREES (huisartsen, APL: alleen bestanden). Afvalkalender en marktdag: geen landelijke bron gevonden, dus niet getoond. Een eigen tussenlaag op Vercel zou DVF-prijzen, ARCEP en DREES kunnen leveren; dat is een aparte stap.
- Tests: `tests/gemeente.test.mjs`.
- **Aanvulling 29-10-2026 (exact adres en belastingindicatie):** het zoekveld neemt een postcode (5 cijfers) of een adres (minstens 4 tekens, Géoplateforme `data.geopf.fr/geocodage/search?q=..&limit=5`, CORS `*`; bij meerdere treffers kiest de lezer). Met een adres of de locatie (exacte coördinaten van het toestel, "bij benadering") krijgt de kaart Risico's een tweede laag uit Géorisques per punt (`latlon=lon,lat`, allemaal CORS `*`, getest 29-10-2026): `rga` (kleigrond, `codeExposition` 1 tot 3, een leeg antwoord geeft geen regel), `gaspar/azi` en `gaspar/tri` (overstromingsatlas en risicogebied binnen 500 m), `mvt` (bodembewegingen binnen 500 m), `cavites` (holle ruimten binnen 500 m), `zonage_sismique?latlon`. Radon blijft per gemeente (`code_insee` verplicht). "Binnen 500 m" betekent nooit dat het pand zelf getroffen is; de tekst zegt dat. "Geen" wordt alleen getoond als de bron antwoordde met nul treffers (`aziOk`, `triOk`, `mvtOk`).
- **Belastingindicatie in euro** (`tfIndicatie`): de lezer vult de cadastrale huurwaarde (valeur locative cadastrale, staat op de aanslag taxe foncière) in; de grondslag is de helft daarvan (service-public.fr, fiche F59, gecontroleerd 29-10-2026), maal `taux_global_tfb`. Er is geen open bron voor die waarde per woning en een schatting uit de verkoopprijs is bewust niet gebouwd (schijnnauwkeurigheid). TEOM, vrijstellingen en toeslagen zijn niet meegerekend en dat staat erbij.
- De DREES-kaart (huisartsen) is verwijderd: zonder eigen gegevens was het alleen een doorverwijzing. Terugkeren kan met een bron die per gemeente opvraagbaar is (zie het voorstel in de sessie: data.ameli.fr, nog niet getest) of via een eigen tussenlaag.
- **DVF met prijzen (29-10-2026):** via `apidf-preprod.cerema.fr/dvf_opendata/mutations/` (preprod, CORS `*`; getest door Claude in Chrome en nagelopen met echte antwoorden voor 84054): filters `code_insee`, `anneemut_min`, `anneemut_max`, `codtypbien` (beginwaarde: 111 maison, 121 appartement; onbekende parameters en `libnatmut` worden zonder fout genegeerd), `page_size` maximaal 500, `page`; sorteren op datum werkt niet (`ordering` alleen op `valeurfonc` en `idmutation`), dus de app sorteert en filtert zelf (`libnatmut === "Vente"`). De eerste pagina bevat niet de nieuwste jaren: de app haalt alle pagina's op (maximaal `DVF_MAX_PAGINA`, 6) en zet "Op basis van een deel van de transacties" erbij als dat niet lukt of afgekapt is. Getoond: per type het aantal verkopen, de mediaan van de verkoopprijs (`valeurfonc`) en van de prijs per m² bebouwd (`sbati` minimaal 20 m²), plus de middelste helft; minder dan 5 verkopen geeft geen mediaan. Geen gemiddelde (uitschieters), geen taxatie. De `next`-link van de bron is http en wordt niet gebruikt. Valt de bron weg: "DVF-data momenteel niet beschikbaar." (het stabiele alternatief blijft een eigen tussenlaag).
- **Huisartsen (DREES, ameli):** `data.ameli.fr` (Opendatasoft, CORS open) heeft alleen departementale cijfers (dataset `demographie-effectifs-et-les-densites`: effectief en dichtheid per departement; de eenheid van `densite` is niet geverifieerd). Er is geen gemeentebron gevonden; een departementscijfer zegt weinig over een gemeente en komt niet in de app. Mogelijke bron voor de officiële "medische woestijn" per gemeente: het ARS-zonage voor huisartsen (zones sous-dotées), nog niet getest.
