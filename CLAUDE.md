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
   `forum`, `actueel`, `nedergids`, `vastgoed`, `zorg`, `ruyter`, `energie`, `advertenties`, `linklijst`, `klusarchief`. Een nieuw type
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
   `npx serve .`; Vercel importeert de repo zonder instellingen. Uitzondering sinds 29-10-2026: de map `api/` bevat één Vercel-functie (`api/gemeente.js`, gewone Node zonder build of package.json) als tussenlaag, zie "Tussenlaag" onderaan; `npx serve .` draait die niet, de app heeft er een terugval voor.
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
- **Géorisques weigert `gaspar/catnat` en `radon` vanuit een browser (29-10-2026):** met een browser-User-Agent geeft de server voor precies die twee eindpunten HTTP/2 INTERNAL_ERROR (curl-exit 92, in de browser `ERR_FAILED`); zonder die header, of voor `gaspar/risques`, `rga`, `gaspar/azi`, `gaspar/tri`, `mvt`, `cavites` en `zonage_sismique`, werkt het. Ook op een echte telefoon bevestigd. Een webpagina kan de User-Agent niet wijzigen en we omzeilen het filter van de bron niet. Opgelost met de tussenlaag `api/gemeente.js` (zie onderaan); valt die weg, dan meldt de kaart wat ontbreekt.

## Tussenlaag `api/gemeente.js` (29-10-2026)

- **Waarom:** Géorisques weigert `gaspar/catnat` en `radon` bij een browser-User-Agent (HTTP/2 INTERNAL_ERROR; ook op een echte telefoon bevestigd), en de DVF-bron van Cerema is een wisselvallige testomgeving. Een server stuurt een eerlijke eigen User-Agent (`Infopoche/1.0 (+https://infopoche.fr)`); er wordt niets omzeild. Zelfde adres als de app, dus geen CORS.
- **Wat:** `GET /api/gemeente?bron=catnat|radon|dvf&code=<INSEE>[&jaar=<jjjj>]`. Alleen een vaste lijst bronnen en gecontroleerde parameters, nooit een vrije URL (geen open proxy); de upstream-URL's bouwt `gemeente-lib.js` (`catnatUrl`, `radonUrl`, `dvfUrl`), de parsers zijn dezelfde als in de browser. `catnat`: alle pagina's samengevoegd, alleen `libelle_risque_jo`, `date_debut_evt`, `date_fin_evt`. `dvf`: alle pagina's in één antwoord (maximaal 6), alleen `libnatmut`, `codtypbien`, `valeurfonc`, `sbati`, `anneemut`, `datemut`, met `onvolledig`. Per upstream-aanvraag tot 3 pogingen (de DVF-bron geeft regelmatig zonder reden een 503) binnen een totaalbudget van 8,5 s (Vercel staat 10 s toe; geen `maxDuration` in `vercel.json`, een te hoge waarde zou de uitrol breken). Succes: `Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800`; fouten (`502`) en ongeldige invoer: `no-store`. De server ziet alleen de gemeentecode (en het jaar), nooit een adres of coördinaten; de hostingdienst bewaart technische logbestanden.
- **In de app:** `gmKies` vraagt catnat en radon alleen via `G.proxyUrl(...)` (zonder herhaling in de browser, de server herhaalt al); DVF eerst via de tussenlaag, bij een fout rechtstreeks bij Cerema (de oude route). De service worker laat `/api/` altijd door (nooit uit de cache). `vercel.json`: de algemene `Cache-Control: must-revalidate` geldt voor alles behalve `/api/`.
- **Overstroming is nooit alleen de risicolijst:** de lijst van de gemeente (`gaspar/risques`) kan overstroming missen terwijl de natuurrampbesluiten het wel tonen (Neuville-sous-Montreuil, 62610: lijst noemt alleen mouvement de terrain en transport de marchandises dangereuses, maar er zijn 14 besluiten "Inondations et/ou Coulées de Boue", laatste 2024, en de atlas "Vallée de la Canche" ligt binnen 1 km). `leesRisico` zet dan "Let op: overstroming" bovenaan (`vloedOntbreekt`), en toont de besluiten per soort met aantal en laatste jaar (`catnatPerRisico`).
- Tests: `tests/gemeente.test.mjs` (tussenlaag met nagebootste fetch: validatie, eerlijke User-Agent, samenvoegen van pagina's, herhaling bij 503, 502 en `no-store`).
- **Internetkaart in Mijn gemeente (29-10-2026):** de kaart "Internet en mobiel bereik" opent met een knop het bestaande hulpmiddel Internetverbinding (module `internet`, `internetverbinding.vercel.app`, volledig in de app); de ARCEP-kaarten blijven als aanvullende links. Sinds 29-10-2026 leest dat hulpmiddel `?adres=<tekst>` en optioneel `&lat=&lon=` (repo `antonnoe/internetverbinding`, blok "VOORINVULLEN"; alleen als tekst in het invoerveld, nooit als HTML; zonder parameters ongewijzigd). De app zet die parameters alleen als de lezer een adres of de locatie koos (`IfGem.internetQuery`, state `toolQuery`, alleen voor module `internet`, gewist bij elke volgende `route()`); bij alleen een gemeente blijft het veld leeg en vult de lezer zelf in. Bij dezelfde ronde is in dat hulpmiddel een fout hersteld: de keuzes DSL en Grijs gaven een fout omdat `makeLinks` een los object kreeg (Starlink).
- **Thema Adressen heet Verenigingen (29-10-2026):** op de hub en in het themascherm staat nu "Verenigingen" (id `adressen`, kleur paars en nieuwsstroom `verenigingen` ongewijzigd). Het themascherm toonde naast Verenigingen & evenementen ook de module Nedergids, die sinds "Onze vier" een eigen hoofdingang heeft; thema's kunnen daarom modules weglaten met `uitsluiten: [ids]` in `modules.json` (de module blijft vindbaar in Alle modules en bij zoeken). Verwijderen van de tegel (acht in plaats van negen) is bewust niet gedaan: het raster krijgt dan een gat en de nieuwsstrook van de verenigingen verdwijnt.

## Feedback van testers (pilot, 29-10-2026)

- Menu-item "Feedback" (hamburgermenu, na Onze sponsors) opent een onderblad (`fbOpen`, blad `feedback` in de geschiedenis, sluit met X, tik buiten, Escape en het terug-gebaar). Velden: naam (verplicht), onderdeel (chips: hub, zoeken, gemeente, hygiene, artikelen, overig), tekst (min. 5, max. 2000 tekens), toestel (vooraf ingevuld uit user-agent, aan te passen), een verborgen vulveld tegen bots en een toestemmingsvinkje (verplicht, elke keer opnieuw). Logica in `feedback-lib.js` (`window.IfFb`), UI en `fbOpenen/fbSluit/fbVerzend/fbVals` in `index.html`. Naam en tekst blijven alleen in het geheugen (nooit `localStorage`), ook als verzenden mislukt: de tekst blijft staan. "Bedankt" verschijnt pas na een bevestigde opslag.
- Opslag: Supabase-project `communities-tools`, tabel `public.infopoche_feedback` (RLS aan, bewust geen policies, anon en authenticated hebben geen rechten), ontvangst via Edge Function `infopoche-feedback` (zonder JWT, alleen herkomst `https://infopoche.fr` en `https://www.infopoche.fr`, daarom geeft localhost een 403; limiet 60 reacties per uur over alle verzenders, geen IP-adressen bewaard). Kolom `bewaren_tot` = aanmaak plus 3 maanden; de functie wist verlopen rijen bij elke nieuwe reactie. Is er na de pilot geen verkeer meer, dan blijven verlopen rijen staan tot ze handmatig gewist worden: `delete from public.infopoche_feedback where bewaren_tot < now();`. AVG: verantwoordelijke Communities Abroad, contact info@communitiesabroad.com, bewaartermijn 3 maanden (aanname van Anton op 29-10-2026; de tekst bij het vinkje staat in `fbPrivacy`, laat hem juridisch nalezen).
- Lezen: via het tabeloverzicht in Supabase, of laat Claude de tabel lezen en samenvatten (Supabase-koppeling, `select ... from public.infopoche_feedback order by aangemaakt desc`). Een eigen beschermde verslagpagina is bewust niet gebouwd: die vraagt een serversleutel in Vercel en een inlog, en een privé-artefact via Claude doet hetzelfde zonder extra infrastructuur.
- Service worker `VERSIE` 2026-10-29-20. Tests: `tests/feedback.test.mjs`.

## Ronde 29-10-2026 (4): prototypekaart, Klussen-blok, Nedergids-extra, geen themanieuws

- **Prototypekaart** op de hub (tussen zoekbalk en Onze vier, `data-proto`): "InfoPoche is nog een prototype. U bent van harte welkom om uw feedback, verbetervoorstellen en suggesties met ons te delen." met de knop "Geef uw feedback" (opent het feedbackblad) en een sluitkruis. Wegklikken geldt voor de sessie (`sessionStorage` `ifm_proto_weg`), de kaart komt dus bij elk nieuw bezoek terug zolang de pilot loopt. Verwijderen na de pilot: het blok `data-proto` en `protoWeg`/`protoOpen` in `fbVals`.
- **Klussen in Frankrijk heeft een eigen blok in Wonen** (`data-klusblok`, `lmKlus` in `lmVals`): klussen (nu `https://infofrankrijk.com/klussen/`), `dossierelektra` ("De Franse elektrische installatie", `.../klussen/dossiers/de-franse-elektrische-installatie/`, op de pagina zelf nog "in toetsing voor publicatie", daarom status "in ontwikkeling"), nieuw `elektrabuiten` ("Elektra buiten het huis", `.../klussen/dossiers/elektra-buiten-het-huis/`) en `lijstjes`. Alle drie de pagina's laten framing op infopoche.fr toe (frame-ancestors gecontroleerd 29-10-2026). Het oude redactie-exemplaar `dossier-elektriciteit-if.vercel.app` is vervangen; `dossierelektra` staat niet meer standaard uit. De overige tools staan onder "Tools bij wonen". Mijn lijstjes heeft een nieuwe uitleg (persoonlijke woordenlijst, niets met DossierFrankrijk te maken).
- **Nedergids krijgt extra kaarten uit de data**: een module met `ookNedergids: true` verschijnt als kaart op het Nedergids-scherm (`ngExtra`) en blijft ook in zijn eigen thema staan. Nu: `controletechnique`, `palliatief`, `zoekers`. De kaart Franse overheden bij u in de buurt stond er al.
- **Geen nieuwsstroken meer op de themaschermen** (veld `nieuws` uit alle `themas` gehaald): de berichten uit de stromen (bv. Rijksoverheid, vie-publique) hadden niets met het thema te maken. Het scherm en de tab Nieuws blijven. Terugzetten per thema kan door `nieuws: [stroom-id]` terug te zetten in `modules.json`; de code (`nieuwsIdsVoorThema`) is ongewijzigd.
- **Over ons**: Nederlanders.fr en "Een gemodereerde gemeenschap" zijn één kaart. De Peil-sectie heeft twee links: "Peil: bekijk wat we per tool controleren" en "Lees hoe wij werken" (manifest op infofrankrijk.com).
- Service worker `VERSIE` 2026-10-29-21. Tests: `tests/ronde9.test.mjs`.

## Ronde 30-10-2026: kaartjes in artikelen, keuzelijst met tools in het feedbackblad

- **Kaartjes in artikelen worden tegels** (`artikel-lib.js`, `vindKaartDivs`, `maakKaartTegels`): een `div` met eigen rand, afronding en opvulling in de inline stijl van het artikel (zoals de vijf regelingen in het subsidie-artikel op Infofrankrijk) verloor bij het opschonen al zijn opmaak en werd een kale regel tekst zonder ruimte. Nu krijgt hij de tegelstijl van de app (wit, 1px rand, 16px afronding, titel in Poppins 600, tekst Mulish 14px) en staan aaneengesloten kaartjes in één raster van twee kolommen (`data-tegels`); een oneven laatste tegel loopt over beide kolommen. De eerste kind-div met vetgedrukte stijl is de titel. De oorspronkelijke stijl wordt voor het wissen onthouden (`__stijlOrigineel`). Test: `tests/artikel.test.mjs` (draait in headless Chromium).
- **Feedbackblad: keuzelijst "Gaat het over een bepaalde tool?"** (`fbTool`, `fbTools` uit `modules.json`, alle zichtbare modules op naam, de eerste optie is "Nee, over de app in het algemeen"). Het veld `tool` (module-id, alleen `[a-z0-9_-]`, anders leeg) gaat mee naar de Edge Function en staat in de nieuwe kolom `public.infopoche_feedback.tool` (optioneel; de tabel heeft een check op de vorm). De functie negeert een ongeldige waarde zonder fout. Service worker `VERSIE` 2026-10-30-1.

## Linklijst en Verenigingsbeheer (30-10-2026)

- **Nieuw kind `linklijst`** (`screen: linklijst`, `llVals()` in `index.html`): een module met `links: [{titel, regel, url, extern}]` toont een rij tegels zoals de Nedergids-kaarten. Een link naar een artikel van Infofrankrijk (`IfArtikel.isInApp`) opent in de app (`openInfoArtikel`); `extern: true` of een andere site is een gewone `<a target="_blank" rel="noopener">` met de regel "Opent op de site zelf". Alleen https-links met titel komen mee. Terugknop via `SHOWBACK`, tab Modules (`HubLib.tabVan`), kop en subkop uit de module en het thema. Een nieuwe lijst is een blok in `modules.json`, geen code.
- **Verenigingsbeheer** (`verenigingsbeheer`, thema Verenigingen): vier tegels, in deze volgorde: Vereniging oprichten in Frankrijk, Een vereniging besturen in Frankrijk, Enquête NL Verenigingen 2021 (alle drie artikelen op Infofrankrijk, titels en regels uit de WordPress-gegevens van die artikelen) en vereniging.fr (extern, de regel komt uit de metabeschrijving van die site). Tests: `tests/ronde10.test.mjs`. Service worker `VERSIE` 2026-10-30-2.

- **Opmaaktabellen met kaartcellen worden tegels (30-10-2026, waardekwadrant in de enquête-NL-verenigingen)** (`zetKaartTabellenOm` in `artikel-lib.js`): een tabel met twee of meer cellen in kaartstijl (rand, afronding en opvulling) wordt een rij kaartjes in leesvolgorde (rij voor rij), die als raster van twee kolommen naast elkaar staan; zo is een kwadrant weer een kwadrant. Overige cellen (zoals de zijlabels van de assen) vervallen, de uitleg van de assen staat in het artikel. `onthoudOpmaak` en `pasOpmaakToe` bewaren alleen `text-align` (midden of rechts) en geven een label met rand, afronding en inline-block de chipstijl van de app (`CHIP`). In een tegel is elk vetgedrukt kind de titel en zijn de regels compact (`TEGEL.item`). Een gewone gegevenstabel (minder dan twee kaartcellen) blijft een tabel in een scrollbare wrapper. Test: `tests/artikel.test.mjs`.

## Tegels op themaschermen en in Wonen (30-10-2026)

- **Themascherm** (`data-themategels`, `themaMods`): de modules staan als tegels naast elkaar (raster van twee kolommen, `minmax(0,1fr)`, 10 px tussenruimte) in plaats van rijen in één kaart: naam in Poppins 600, de korte regel eronder, onderin het prijslabel en de favorietenster (48x48 tikvlak, de tegel zelf is de knop naar de module; het label heeft `pointer-events:none`). "In ontwikkeling" en "hoort bij" staan in de tegel. De Café Claude-regel is een eigen kaart onder het raster.
- **Wonen** (La Maison): de blokken "Klussen in Frankrijk" (`data-klusblok`) en "Tools bij wonen" (`data-toolsblok`) hebben dezelfde tegels, met de `meta` van de module als regel. Nog rijen: Alle modules, Mijn modules, Gezondheid (Hulpmiddelen) en de lijsten bij Ondernemen.
- Service worker `VERSIE` 2026-10-30-4.

## Mijn modules bovenaan, stand en terug naar de standaard (30-10-2026)

- Op Alle modules staat "Mijn modules: kies wat u hier ziet" nu **bovenaan** (`data-modkeuze`), met eronder de stand ("U ziet N van M modules", plus "Dat volgt uit uw keuzes in Mijn modules" zodra er eigen keuzes zijn) en de knop "Terug naar de standaard". Onderaan blijft alleen de gratis-regel.
- `resetKeuze()` wist alle eigen keuzes (`ifm_modules` wordt `{aan:[], uit:[]}`), waarna `standaard` in `modules.json` weer geldt. De knop staat ook in Mijn modules, onder Alles aan en Alleen favorieten. Reden: wie veel modules uit zette ziet lege onderwerpen (bv. Ervaring zonder Forum) en een korte lijst Alle modules, en had geen directe weg terug naar wat de catalogus als standaard heeft.
- Let op: "Alles aan" zet ook de modules aan die `standaard: "uit"` hebben; "Terug naar de standaard" doet dat niet. Service worker `VERSIE` 2026-10-30-5.

## Klusarchief (30-10-2026)

- **Wat:** de module `klusforum` (id gehouden, naam en `kort` "Klusarchief", `kind: klusarchief`, thema Wonen, `standaard: aan`, gratis, geen `url`) is een eigen scherm om het oude Infofrankrijk-forum (2012 tot 2020, geanonimiseerd, alle namen verzonnen) te doorzoeken en te lezen. De nepchatbox en het iframe naar infofrankrijk-klussen-archief.vercel.app zijn weg. Staat in het blok Klussen in Frankrijk direct na `klussen` (`klusIds` in `lmVals`); het veld `artikel` is gebleven. Zoekwoorden staan in `modules.json`.
- **Bron en API:** Supabase Edge Function `https://mqkhfyvrizgmmmcbdkxh.supabase.co/functions/v1/klusarchief` (project communities-tools); de URL staat op één plek, `BASIS` in `klusarchief-lib.js` (`window.IfKa`). Alleen anoniem lezen (`credentials:"omit"`, time-out 10 s, geen eigen headers): `?q=<2 tot 120 tekens>&p=<pagina vanaf 0>` geeft `{ok, totaal, pagina, perPagina:10, resultaten:[{id,titel,jaar,forum,antwoorden,fragment}]}` met treffers als `[[...]]` in `fragment`; `?id=<id>` geeft `{ok, draad:{id,titel,jaar,datum,forum,tekst,antwoorden:[{datum,tekst}]}}` (404 bij onbekend of verborgen); fouten 400 `kort`, 429 `druk`, 500. Melden: `POST` met `{id, reden}` (JSON, Content-Type) haalt de draad meteen uit het archief; de functie staat dat alleen toe vanaf https://infopoche.fr (vanaf localhost een 403, dat is bedoeld). CORS: infopoche.fr en localhost 3000, 5000 en 8080.
- **Besluiten van Anton (niet van afwijken, ook in REGIE.md):** (1) alle namen zijn fictief en dat staat op het zoekscherm en bovenaan elke draad ("Om privacyredenen zijn alle namen in dit archief verzonnen."); (2) elke draad toont jaar en de waarschuwing "Advies uit 2012 tot 2020. Regels, bedragen en normen kunnen verouderd zijn, controleer ze bij de officiële bron."; (3) AI alleen als chat "Vraag het archief" die uitsluitend uit gevonden draden antwoordt, met bron (besluit 30-10-2026, zie onder); geen nepchat; (4) een lezer kan een draad melden; (5) geen account en niets van de zoekterm op het toestel (alles in het geheugen, geen `localStorage` of `sessionStorage`).
- **Scherm** (`screen: klusarchief`, `kaOpen/kaZoek/kaOpenDraad/kaMeldDoe/kaVals` in `index.html`, pure logica en tests in `klusarchief-lib.js` en `tests/klusarchief.test.mjs`): zoekscherm met twee zinnen uitleg, de privacyregel, een zoekveld met "Zoek" (Enter werkt, minimaal 2 tekens) en voorbeeldwoorden; zonder zoekterm geen lijst en geen aantallen. Resultaten als kaarten (titel in Source Serif 4, "2014 · 7 reacties", fragment met vetgedrukte treffers als echte `<b>`-elementen uit `IfKa.segmenten`, nooit via innerHTML), "Toon meer (nog N)" per pagina van 10. Leeg: "Niets gevonden...". Fout, druk of time-out: eerlijke melding met "Opnieuw proberen" en een link naar infofrankrijk.com/klussen/, nooit een lege pagina; laadtokens via `IfNav.maakTeller` (`_kaTeller` voor zoeken, `_kaDTeller` voor een draad). Draad = sub-staat `kaDraad` ({id, titel, jaar, forum, status, data}) van hetzelfde scherm: titel, "jaar · forum", de twee waarschuwingen als rustige banner, openingstekst in alinea's (witregels, `white-space:pre-line`), reacties elk in een eigen kaart met datum dd-mm-jjjj, onderaan "Terug naar de resultaten" en de kleine knop "Meld dit bericht".
- **Navigatie:** hash `#/klusarchief` (`IfNav` TOP en NAAR_HASH; tab Modules via `HubLib.tabVan`), `SHOWBACK`, `histToestand` (veld `kaDraad`, blad `melden`) en `navKey` (`kaDraad`). Een draad openen is een extra geschiedenisregel; terug (pijl of gebaar) sluit eerst het meldpaneel (niet tijdens het versturen), dan de draad, en herstelt de scrollstand van de resultaten (`_kaY`) met de zoekterm en lijst in het geheugen.
- **Melden:** "Meld dit bericht" opent in het scherm een paneel ("Bevat dit bericht een naam of persoonsgegeven?...", geen browser-confirm), pas "Ja, meld dit bericht" doet de POST. Gelukt: terug naar de resultaten met "Gemeld, het bericht is uit het archief gehaald" (de draad verdwijnt ook uit de lijst op het toestel). Mislukt: "Melden is niet gelukt..." met de uitweg info@communitiesabroad.com en "Opnieuw proberen".
- **Een draad herstellen na een melding:** in Supabase, project communities-tools: `update public.klusarchief set verborgen=false where id=...;`. Meldingen staan in `public.klusarchief_meldingen`; daar staat geen persoonsgegeven van de melder in.
- **Uitval van de functie:** de rest van de app blijft werken; het scherm toont de eerlijke melding en de link naar infofrankrijk.com/klussen/. Lokaal is geen sleutel nodig (de functie is publiek leesbaar). Service worker `VERSIE` 2026-10-30-6.

### Klusarchief, herstelronde 1 na keuring (30-10-2026)

- **Vindbaarheid:** het zoekscherm (ook via de zoekbalk op Home) toont bij een zoekterm van minimaal 3 tekens, onder de modulehits, de kaart "Zoek ook in het Klusarchief: <term>" (`data-zoek-klusarchief`, alleen als `mods()` de module `klusforum` bevat, dus Mijn modules en seizoen tellen mee). Een tik doet `kaOpenMet(term)`: scherm open, term vooringevuld, direct gezocht. Geen netwerkaanroep vanuit het hoofdzoekveld; de term blijft in het geheugen.
- **Melden:** de knop onderaan heet "Meld deze draad"; in de privacybanner bovenaan staat de link "Staat hier een naam of persoonsgegeven? Meld deze draad" (44 px, alleen als de draad geladen is). Het meldpaneel staat direct onder die banner, scrolt bij openen in beeld en krijgt focus (`kaMeldOpen`). Tekst spreekt van "deze draad".
- **Teller:** "N draden gevonden, de eerste X hieronder" zolang er meer treffers zijn dan kaarten (`IfKa.telTekst(totaal, getoond)`).
- **Lege uitkomst en hulp:** drie tips bij "Niets gevonden" (`LEEG_TIPS`), een tipregel op het zoekscherm (`TIP_FRANS`); melding bij 1 teken: "Typ minstens 2 letters."
- **Deep link:** `#/klusarchief/<cijfers>` per draad (`IfNav.parseHash` geeft `{soort:"klusdraad", id}`, `bouwHash` leest `kaDraad`); `routeToepassen` roept `kaOpenId`. Rechtstreeks geopend: terug gaat naar het zoekscherm; bij 404 "Dit bericht staat niet meer in het archief." met "Naar het zoekscherm". Niet-numerieke id's geven de hub, `#/klusarchief` blijft het zoekscherm.
- **Reacties:** kopje "Reacties (N)", elke reactie een kaart met brede bordeaux linkerrand, datumkop 13 px met scheidingslijn. Service worker `VERSIE` 2026-10-30-7. Tests: `tests/klusarchief.test.mjs`.

### Klusarchief met Nederlanders.fr-index (30-10-2026)

- **Index met link, geen kopie:** de API kent `&bron=alles|forum|nlfr` (zonder parameter alleen het oude forum). De app zoekt standaard met `bron=alles`. Een NLFR-resultaat (`{bron:"nlfr", titel, jaar, antwoorden (reacties), url}`) heeft bewust geen fragment en geen id; `IfKa.leesZoek` laat zo'n item vallen zonder titel of met een url die niet met `https://www.nederlanders.fr/` begint (interne sleutel `nlfr:<url>`). Een forumresultaat krijgt `bron: "forum"`.
- **Scherm:** onder het zoekveld drie keuzechips (Alles, Oud forum, Nederlanders.fr, 44 px, `data-ka-chips`, `state.kaBron`, alleen in het geheugen). Een tik met een lopende zoekterm start een nieuwe zoekopdracht met die bron. De NLFR-kaart (`data-ka-nlfr`) is een gewone `<a target="_blank" rel="noopener">` met label "Nederlanders.fr", titel, "2023 · 14 reacties" (`IfKa.nlfrMeta`, bij 0 reacties alleen het jaar) en "Opent op Nederlanders.fr ↗"; de forumkaart krijgt het label "Oud forum" en opent het draadscherm zoals voorheen. Telzin: "N resultaten gevonden". De uitleg noemt beide delen; de privacyregel staat als "Oud forum: Om privacyredenen zijn alle namen in dit archief verzonnen." en geldt alleen voor het oude forum. De Home-zoekkaart opent met bron alles. Service worker `VERSIE` 2026-10-30-8. Tests: `tests/klusarchief.test.mjs`.

### Klusarchief, chat "Vraag het archief" (30-10-2026)

- **Besluit van Anton** (vervangt besluit 3 "geen AI en geen nepchat"): de chat antwoordt uitsluitend uit gevonden draden van het oude forum, met bronvermelding, en verwijst voor Nederlanders.fr naar de berichten daar. Zonder bron geen antwoord. Niets van vraag of antwoord wordt bewaard (geen `localStorage`, geen `sessionStorage`, niet in URL of geschiedenis); alles staat in het geheugen (`kaChat*` in `state`). De server gebruikt model Sonnet.
- **Backend** (niet aanpassen vanuit deze repo): Supabase Edge Function `klusarchief-chat` (`IfKa.CHAT_URL` = `BASIS + "-chat"`). `GET` geeft `{ok, aan}`; `POST {vraag (5 tot 300), vorige?:{vraag, antwoord}, web:""}` geeft `{ok, antwoord, bronnen:[{n,id,titel,jaar}], nlfr:[{titel,jaar,antwoorden,url}]}`. Fouten: 400 `kort`, 403 `herkomst`, 429 `druk`, 503 `uit` of `druk`, 502 `model`, 500. POST werkt alleen vanaf https://infopoche.fr (localhost geeft 403, test dus met een mock via `page.route`).
- **Zichtbaarheid:** alleen bij `aan:true`. `kaChatCheck()` vraagt de status een keer per sessie op bij het openen van het scherm (anoniem, `credentials:"omit"`, time-out 5 s, resultaat in `this._kaChatAan`); bij fout of time-out blijft de chat verborgen, zonder melding. Een 403 of 503 `uit` bij een vraag verbergt de chat ook.
- **UI** (kaart boven het zoekveld en de chips): uitleg, meerregelig veld (max 300 met teller), knop "Vraag", privacyregel over Claude van Anthropic. Wachten: "Zoeken in het archief..." (laadtoken `_kaCTeller`, time-out 45 s). Antwoord in Mulish 1.8em; elke `[n]` met een bekende bron is een bolletje met 44 px tikvlak dat de draad opent (`kaChatBron` naar `kaOpenDraad`, dus de gewone draadroute en terug naar het antwoord); een `[n]` zonder bron blijft kale tekst. Daaronder Bronnen, "Ook op Nederlanders.fr" (alleen https://www.nederlanders.fr/, `target=_blank`) en altijd de waarschuwing over 2012 tot 2020. Vervolgvraag stuurt `vorige` mee (antwoord op 1500 tekens); "Nieuwe vraag" wist alles; na 4 vragen "Begin een nieuwe vraag". Fouten: druk "Het archief krijgt nu veel vragen..." en overig "Het antwoord lukte niet..." met "Opnieuw proberen"; de gewone zoekfunctie blijft altijd werken.
- **Techniek:** pure logica in `klusarchief-lib.js` (`chatBody`, `chatAan`, `chatSoort`, `leesChat`, `chatSegmenten`, `chatAlineas`); tekst gaat nooit door innerHTML. Tests: `tests/klusarchief.test.mjs`. Service worker `VERSIE` 2026-10-30-9.

### Klusarchief, twee delen: "Uit de fora" en "Kennis van nu" (31-10-2026)

- **Besluit van Anton** (vervangt "alleen oud forum" en de twee chips Oud forum en Nederlanders.fr): het Klusarchief bundelt **Uit de fora** (oud Infofrankrijk-forum en Nederlanders.fr, de laatste alleen als index met link) en **Kennis van nu** (artikelen van Infofrankrijk.com en officiële Franse bronnen met open licentie, nu Service Public / DILA). Artikelen van voor 2025 mogen mee met "Dit artikel is van <jaar> en kan verouderde informatie bevatten." (rustige regel, geen alarmkleur). Bronvermelding Service Public: "Bron: Service Public / DILA, bijgewerkt dd-mm-jjjj" met link naar de fiche; geen logo's en nooit suggereren dat de overheid de app goedkeurt.
- **Zoeken:** `IfKa.zoekUrl` bouwt `?q=&p=&v=2&bron=alles|fora|kennis` (onbekende of oude waarden worden `alles`). Drie chips (`kaBron`, alleen geheugen). Vier resultaatsoorten in `IfKa.leesZoek`: `forum` (draadscherm), `nlfr` (extern), `artikel` (alleen https op infofrankrijk.com of www; opent in de app via `openInfoArtikel(url)`), `officieel` (alleen https op een host uit `OFFICIEEL_HOSTS`: service-public.gouv.fr, www.service-public.gouv.fr, service-public.fr, www.service-public.fr, www.ecologie.gouv.fr, www.eaufrance.fr, www.georisques.gouv.fr; de hele kaart is een `<a target=_blank>`, met label "Franse tekst", "Bijgewerkt: dd-mm-jjjj" en de bronregel). Een onbekende `bron`, een item zonder titel of met een url op een andere host valt af. Label bovenaan elke kaart via `IfKa.kaartLabel` (Poppins 600, 11,5 px). Een nieuwe toegestane host is een regel in `OFFICIEEL_HOSTS` plus een test.
- **Chat:** antwoord `{antwoord, bronnen:[{n, soort: artikel|officieel|forum, titel, jaar, datum, url, bronnaam, id, verouderd}], nlfr}`. `leesChat` valideert per soort (forum: id en titel; artikel en officieel: titel en url op een toegestane host; anders valt de bron af en wordt het bolletje kale tekst). `chatBlokken` zet de Markdown-achtige tekst om in kop (`##` of regel geheel `**..**`), alinea en lijst (`- `), met `**vet**` en `[n]`, zonder innerHTML. Het bolletje opent: forum het draadscherm, artikel het artikel in de app, officieel een nieuw tabblad. Onder het antwoord de bronnen gegroepeerd (`chatGroepen`: Kennis van nu, Uit de fora) met naam, datum of jaar en eventueel de verouderd-regel, daaronder "Samenvatting door de app op basis van de bronnen hierboven. Franse bronnen zijn vertaald." en de forumwaarschuwing (`CHAT_WAARSCHUWING`). De draadwaarschuwing (`WAARSCHUWING`) blijft bovenaan een draad.
- **Bronnenlink (31-10-2026):** onder de bronregel op het zoekscherm staat altijd de link "Waar komt dit vandaan? Bekijk de bronnen en verder zoeken ↗" (`data-ka-bronnenlink`, 44 px, `<a target=_blank rel=noopener>`), URL in `IfKa.BRONNEN_URL` (https, infofrankrijk.com, `#bronnen`). Geen netwerk nodig.
- Service worker `VERSIE` 2026-10-31-2. Tests: `tests/klusarchief.test.mjs`.
