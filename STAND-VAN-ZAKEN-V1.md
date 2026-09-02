# IF-Mobiel: stand van zaken en weg naar V1.0

Opgesteld 2 september 2026, op basis van `main` (laatste commit `b13a172`, 27 augustus 2026).
Leidend voor dit rapport: de code zelf, `modules.json`, `BOUWOPDRACHT.md` en een proefdraai van
de app in Chromium op 412, 360 en 320 pixels breed. Wat ik niet kon controleren staat expliciet
onder "Bronstatus" (§8).

---

## 0. Oordeel in het kort

De app staat verder dan de "Nog te doen"-lijst in de README doet vermoeden. Veertien modules in
vier groepen, negen daarvan gratis, de catalogus volledig in JSON, een energiemodule die echt
rekent met een motor die byte voor byte gelijk is aan de bronrepo, een leesbaar forum met
volledige draden, en een kennispiramide die netjes lui laadt. De drie inhoudsschillen (Een huis
kopen, Ouder worden & zorg, De Ruyter) zijn de maatstaf: bronlabel per punt, peildatum,
voorbehoud.

Wat V1.0 tegenhoudt is geen ontbrekende functie maar een reeks losse eindjes die samen het
verschil maken tussen "ontwerpsessie" en "product":

1. **De app hangt aan unpkg.com.** `support.js` haalt React bij het opstarten van een externe
   CDN. Valt die weg, dan blijft het scherm leeg, zonder melding. Dit is de enige echte
   single point of failure en hij is in een uur te verhelpen.
2. **Geen titel, geen `lang`, geen manifest, geen pictogram.** Wie de app op het beginscherm
   zet, krijgt de URL als naam. De tabbalk gebruikt `100vh` zonder `safe-area-inset`, wat op
   iPhone-Safari de onderste knoppen achter de browserbalk zet.
3. **Beloftes in de UI die niet waar zijn.** "15 situaties" (het zijn er vier), elf lijstitems
   die niets doen bij aantikken, "Offline beschikbaar: Ja" bij modules die niet eens bestaan,
   een postcodevraag die brandgevaar en verenigingen belooft die nergens worden getoond.
4. **Vier modules zonder inhoud staan gewoon in de catalogus** (Correspondentie, Erfrecht,
   Verenigingen, Auto). Een lege module in de hub is voor de lezer een kapotte module.
5. **De inbedding en de koppelingen zijn vanuit deze omgeving niet te verifiëren** (CORS op
   `nlfr-menu`, framing op `mobiel.nederlanders.fr`, het Ning-schrapen van `nlfr-berichten`).
   Dat moet op een echt toestel op het echte domein gebeuren, met een checklist (§6, fase 2).
6. **Abonnementsstatus is nog steeds onbeslist** (§5 van de bouwopdracht). Voor V1.0 is dat
   geen blokkade als V1.0 wordt gedefinieerd als "lees- en rekenapp zonder account".

**Advies voor de definitie van V1.0:** de negen gratis modules plus de twee abonnee-modules
die een eerlijke muur hebben (Energie, Financieel kompas), zonder inlog, op een eigen
subdomein, met de vier lege modules uit de hub gehaald. Alles wat een andere repo of een
redactionele beslissing nodig heeft schuift naar V1.1. De lijst in §6 is daarop gebouwd.

---

## 1. Inventaris

### 1.1 Bestanden

| Bestand | Omvang | Rol | Oordeel |
|---|---|---|---|
| `index.html` | 175 kB, 2.516 regels | de hele app: template plus logica | werkt; groot maar bewust één bestand |
| `support.js` | 69 kB | runtime, gegenereerd | laadt React van unpkg (§3, T1) |
| `modules.json` | 84 kB, 1.726 regels | catalogus plus alle inhoud van vastgoed, zorg, ruyter, nedergids | de kern van de redactie, netjes |
| `engine/` (3 bestanden) | 30 kB | rekenmotor EnergiePortaal | identiek aan bronrepo, zie §3 T8 |
| `piramide/` | 800 kB, waarvan 750 kB three.js | kennispiramide | lui geladen, alleen bij openen |
| `piramide.json` | 10 kB | tekst van de piramide | goed gescheiden |
| `kennispiramide.html` | 3 kB | deelbare losse pagina | dunne schil, geen tweede implementatie |
| `data/` | 196 kB | `feiten.json`, `streek-verhalen.ts` | door niets gelezen (§4 bouwopdracht, nog open) |
| `Bosbranden Mobiel.html` | 43 kB | oude brandrisico-module | niet aangesloten, wél publiek op Vercel |
| `vercel.json` | | alleen `Cache-Control` | geen `frame-ancestors`, geen beveiligingsheaders |
| `BOUWOPDRACHT.md`, `README.md`, `CLAUDE.md`, `PROMPTS.md` | | documentatie | actueel na ronde 2; `PROMPTS.md` is bewust v2-log |

### 1.2 Modules (uit `modules.json`)

| Module | Groep | Prijs | Kind | Status in JSON | Nagekeken | Wat de lezer werkelijk krijgt |
|---|---|---|---|---|---|---|
| Nedergids | Aankomen | gratis lezen | eigen schil | in bouw | 23 aug 2026 | lijst van 23 sites in 6 categorieën; kaart wacht op v2 |
| Correspondentie | Aankomen | abonnee | info | bron onbekend | 23 aug 2026 | leeg scherm met "nog niet beschikbaar" |
| Veiligheid & natuur | Wonen | gratis | iframe | deels af | 23 aug 2026 | voorvertoning plus knop naar nederlanders.fr/page/bosbranden |
| Klussen & verbouwen | Wonen | gratis | iframe | inhoud af | 23 aug 2026 | voorvertoning plus knop; negen deep links via zoeken |
| Vastgoed & huis kopen | Wonen | gratis | eigen schil | af | juni 2026 | zeven fases, 35 punten met bronlabel, 32 do's en don'ts, 7 valkuilen |
| Energie & verwarming | Wonen | abonnee | eigen schil | af | 25 aug 2026 | voorbeeldhuis echt berekend, zeven vragen, richting gratis, bedragen achter muur |
| Financieel kompas | Geld | abonnee | iframe | af | maart 2026 | voorvertoning, knip-uitleg, knop naar buiten |
| De Ruyter | Geld | gratis | eigen schil | af | aug 2026 | twee vragen, uitkomst met wetsartikel, tarieven, drie routes, modelbrief |
| Erfrecht & schenking | Geld | abonnee | voorbeeld | inhoud af | 23 aug 2026 | één voorbeeldtabel, twee intakevragen, muur met stippen (geen inhoud) |
| Vastgoed transactiekosten | Geld | abonnee | iframe | af | 13 aug 2026 | voorvertoning, knop naar github.io |
| Taalassistent | Leven | gratis | eigen schil | gebouwd | 23 aug 2026 | 4 situaties, 12 fases, 36 zinnen, 4 woordenlijsten; 11 situaties "in voorbereiding" |
| Ouder worden & zorg | Leven | gratis | eigen schil | af | juli 2026 | alarmkaart, 8 secties, APA-tabel, noodkaart, 5 voorleeszinnen |
| Verenigingen & agenda | Leven | gratis | info | te smeden | 23 aug 2026 | leeg scherm met onware regels (§3, T5) |
| Auto & mobiliteit | Leven | gratis | info | te smeden | 23 aug 2026 | idem |

Telling: 9 gratis, 5 abonnee. Van de 14 zijn er 8 volwaardig bruikbaar (Nedergids-lijst,
Vastgoed, Energie, De Ruyter, Taal, Zorg, en de twee iframe-modules Klussen en Veiligheid),
2 zijn een muur met uitleg naar een externe tool (Kompas, Transactiekosten), en 4 zijn leeg.

### 1.3 Schermen buiten de modules

Hub (met zoekbalk en strip), Alle modules (zelfde lijst als de hub zonder strip), Zoeken,
Forum met sub-tab Actueel, Discussie (draad), Taalassistent, Woordenlijsten (placeholder),
Account, Over ons, Kennispiramide. Persistentie: `ifm_favs`, `ifm_postcode`, `ifm_pc_later`,
`ifm_last_visit`.

---

## 2. Wat ik heb gedaan om dit vast te stellen

- `index.html`, `modules.json`, `support.js` (de laadlogica), `engine/`, `piramide/` en alle
  documentatie volledig gelezen; git-historie (23 commits sinds 30 juli 2026) doorgenomen.
- De app gedraaid in Chromium met een mobiele viewport van 412×880, daarna 360×740, 320×568
  en 1280×800; 45 schermopnames gemaakt; per scherm gemeten: aanraakvlakken onder 44 px,
  horizontale overloop, tekst onder 11 px, scrollhoogte.
- `engine/` vergeleken met `antonnoe/energieportaal` (commit `23226ce`, 23 juli 2026): de drie
  bestanden zijn identiek. De regressietest `tests/dpe-test.js` uit de bronrepo slaagt op deze
  kopie.
- De rekenmotor in Node gedraaid met precies de invoer die de mobiele schil geeft, om de
  getallen van het voorbeeldhuis te reproduceren (§3, T9).
- Het zoekveld doorgetest op de zes suggesties plus zes eigen termen.

Wat níet kon: deze omgeving heeft geen toegang tot unpkg.com, de Vercel-routes van
`nlfr-berichten` en `nlfr-menu`, nederlanders.fr en infofrankrijk.com. Alles wat live data,
iframes, CORS en framing betreft is dus niet door mij bevestigd (§8).

---

## 3. Bevindingen techniek

Ernst: **B** = blokkerend voor V1.0, **H** = hoog, **M** = middel, **L** = laag.

### T1 (B) React komt van unpkg.com; zonder die CDN blijft de app leeg

`support.js` regel 1143 tot 1148 laadt React, ReactDOM en Babel-standalone van
`https://unpkg.com/…` met SRI-hashes. Faalt die download (CDN-storing, bedrijfsnetwerk,
adblocker, de proxy van deze omgeving), dan blijft het scherm leeg: er staat geen tekst, geen
melding, alleen de achtergrondkleur. Ik heb dit gezien: de eerste proefdraai gaf een egaal
grijs vlak.

De runtime heeft hier zelf een haak voor: `cdnScriptFor()` (regel 1149) kijkt eerst in
`window.__resources[url]`. Oplossing zonder `support.js` aan te raken: de twee React-bestanden
(versie 18.3.1, samen 140 kB) in `vendor/` zetten en vóór de `<script src="./support.js">` één
regel plaatsen die `window.__resources` op de lokale paden zet. Daarnaast een kale
fallback-tekst in de `<body>` buiten `<x-dc>` ("De app kon niet starten, ververs de pagina")
die de runtime bij succes verwijdert. Babel-standalone is alleen nodig als de `text/x-dc`-code
niet als gewone JavaScript wordt uitgevoerd; controleren of die download in productie
überhaupt gebeurt en zo ja, ook lokaal zetten.

### T2 (B) Geen `<title>`, geen `lang`, geen manifest, geen pictogrammen

Gemeten: `document.title` is leeg, `<html>` heeft geen `lang`, er is geen
`<link rel="manifest">`, geen favicon, geen `apple-touch-icon`, geen `meta description`.
Gevolgen: de browsertab toont de URL; "Zet op beginscherm" geeft het adres als naam en een
schermafdruk als icoon; schermlezers lezen Nederlands met Engelse uitspraakregels; deelbare
links tonen niets. Dit is een halve dag werk: `<title>Infofrankrijk</title>`, `lang="nl"`,
een `manifest.webmanifest` met naam, kleuren (`#800000`, `#F4F1F0`) en twee PNG-iconen,
`apple-touch-icon`, en `theme-color` (die staat er al).

### T3 (B) `100vh`, geen `safe-area-inset`, `user-scalable=no`

De buitenste container is `height:100vh`. Op iOS Safari en Android Chrome is 100vh de hoogte
mét ingeschoven adresbalk, zodat de tabbalk (70 px) deels achter de browserbalk valt zolang
de balk zichtbaar is. Oplossing: `height:100dvh` met `100vh` als terugval, en op de tabbalk
`padding-bottom: env(safe-area-inset-bottom)` plus `viewport-fit=cover` in de viewport-meta.

De viewport-meta zet `maximum-scale=1, user-scalable=no`. Voor een doelgroep die gemiddeld
ouder is dan de gemiddelde app-gebruiker is knijpzoomen geen luxe; het blokkeren ervan is
bovendien een harde WCAG-overtreding (1.4.4). Advies: weghalen; de app heeft er geen last
van, want de lay-out is toch al mobile-first.

### T4 (H) Aanraakvlakken en tekstgroottes

Gemeten met de app draaiend, per scherm. Onder de 44 px: de segmentknoppen Berichten/Actueel
en vous/tu (38 px hoog), de knop Vernieuwen (40 px). Alle andere knoppen en links zitten op
44 tot 56 px. Tekst: de tabbalk-labels staan op 9,5 px, de prijsbadges op 8,5 px, de
kickers op 9 tot 10,5 px. Op een telefoon van 5 jaar oud met een leesbril is 9,5 px voor de
enige permanente navigatie te klein; 11 px met een iets kleiner icoon past nog in 70 px.

De iconen in de tabbalk zijn Unicode-glyphs (⌂ ◍ ⌗ ◧ ◔) die uit het systeemlettertype komen.
In Chromium rendert het Account-icoon als een stipje; op Android verschilt het per fabrikant
en op oudere toestellen kan een glyph een leeg vierkant worden. Vijf inline-SVG-iconen van
20×20 zijn een uur werk en zien er overal hetzelfde uit.

### T5 (H) Onware regels in de UI

- `index.html` regel 1264 tot 1265: bij gratis modules van kind `info` (Verenigingen, Auto)
  staat hardgecodeerd "Offline beschikbaar: Ja" en "Laatst bijgewerkt: vandaag". Beide onwaar:
  er is geen offline-laag (geen service worker), en de modules bestaan niet.
- De strip op de hub zegt "15 situaties · van huisarts tot bouwmarkt". Gebouwd zijn er vier.
  De elf overige staan in de lijst "Alle situaties" met "in voorbereiding" en een lege
  klik-handler (regel 2425): elf items die eruitzien als knoppen en niets doen, precies wat
  ronde 3 elders heeft opgeruimd.
- De postcodevraag bij de eerste start belooft "het brandgevaar van uw departement tonen,
  verenigingen in de buurt vinden en de wegwijzer op uw omgeving richten". Wat de postcode nu
  doet: de departementsnaam in de kopregel en één zin in Nedergids. Bovendien is er na het
  dialoogvenster geen enkele plek om de postcode te wijzigen (`pcLabel` wordt berekend op regel
  2468 maar nergens in de template gebruikt).
- "Gekopieerd" en "Voorgelezen" verschijnen ook als kopiëren of voorlezen mislukt: de
  clipboard-promise wordt niet afgewacht en `speechSynthesis` zegt niets zonder Franse stem,
  maar de knop meldt succes.

### T6 (M) Vier lege modules in de catalogus

Correspondentie ("bron onbekend"), Verenigingen en Auto ("te smeden") tonen alleen een
statuskaart. Erfrecht & schenking is kind `voorbeeld` met een intake van twee vragen waarvan
de uitkomst uit stippen bestaat: een muur zonder dat er iets achter zit. De catalogus heeft
geen veld om een module te verbergen; een `zichtbaar: false` (of een filter op status) in
`modules.json` plus één regel in `groups` in `renderVals()` volstaat.

### T7 (M) Iframe-voorvertoningen laden de hele externe site

De vier iframe-modules tonen een 300 px hoog iframe met `pointer-events:none` en een
overlay-link. Dat laadt de volledige externe pagina (Kompas, Klussen, nederlanders.fr,
github.io) als plaatje. Kosten: data en tijd op een telefoon; en als de bron framing weigert
(`X-Frame-Options`), staat er een kapot icoon in plaats van een voorvertoning. Ik zag dat
kapotte icoon in mijn proefdraai omdat het netwerk geblokkeerd was; op het echte domein moet
per bron gecontroleerd worden of framing is toegestaan. Advies: één statische afbeelding per
module in `modules.json` (`beeld`), of gewoon de knop zonder voorvertoning.

### T8 (M) Rekenmotor: identiek, maar de schil dupliceert constanten en wijkt af in standaarden

`engine/` is byte voor byte gelijk aan de bronrepo en de upstream-test slaagt. Twee kanttekeningen:

- `index.html` regel 1874 tot 1880 herhaalt de prijstabel en de apparatenlijst die in
  `engine/engine.js` regel 16 tot 26 al staan (`PRICE_DEFAULTS_USER`, `DEFAULT_APPLIANCES`).
  Wijzigt de bronrepo een prijs, dan rekent de mobiele schil met de oude. De motor is een
  klassiek script: die constanten zijn in de browser als globalen bereikbaar, dus de schil kan
  ze rechtstreeks gebruiken.
- De UI-standaardwaarden voor velden die de intake niet vraagt verschillen van de desktop:
  `hrvEta` 0,8 tegenover 0,75, `auxScop` 3 tegenover 3,2, `auxEta` 0,9 tegenover 0,85,
  `pvExportMode` "none" tegenover "nvt". Met bijverwarming "geen" en 0 kWp zonnepanelen heeft
  dat nu geen effect op de uitkomst, maar het is precies de drift die regel 4 van `CLAUDE.md`
  wil voorkomen.
- Het synchronisatiescript en het vastleggen van bronrepo plus commit (prompt 4 in
  `PROMPTS.md`) zijn nog niet gebouwd. Een bestand `engine/BRON.md` met "antonnoe/energieportaal
  · 23226ce · 23 juli 2026" is het minimum.

### T9 (M) Het voorbeeldhuis geeft label G en € 10.385 per jaar

Uit de motor, gereproduceerd in Node met dezelfde invoer als de schil (pavillon, 1948-1974,
120 m², Hérault, elektrisch, permanent, niets gerenoveerd):

| Uitkomst | Waarde |
|---|---|
| Energielabel | G |
| Primaire energie | 611 kWh EP/m² per jaar |
| CO₂ | 25,4 kg/m² per jaar |
| Jaarkosten | € 10.385 (€ 865 per maand) |
| Grootste post | verwarming, € 9.768 |

Ter vergelijking, zelfde huis met andere antwoorden: gebouwd na 2005 geeft C en € 2.511;
met warmtepomp D en € 3.670; volledig gerenoveerd D en € 3.095. Het getal heeft een bron en
de "hoe is dit gerekend"-regel toont UA (832 W/K), Hvent, graaddagen en rendement. Maar als
eerste getal dat elke bezoeker ziet is een G-label met tienduizend euro stookkosten een
uitkomst die eerder wantrouwen wekt dan vertrouwen, zeker in de Hérault. Dat is een
redactionele keuze, geen fout: of het voorbeeldhuis wordt een herkenbaarder geval (bijv.
hetzelfde huis met dak en ramen gedaan), of er komt een regel bij die uitlegt waarom een
ongeïsoleerd elektrisch verwarmd huis zo uitkomt. Wat wel weg moet: de oude ontwerpwaarden
(E, 287 kWh, € 2.140) staan nog in de dode constante `PREVIEW` in `index.html` regel 1557.

### T10 (L) Dode code en losse bestanden

`PREVIEW`, `CAT`, `NIVEAUS` en `TODO` in `index.html` worden niet of nauwelijks gebruikt;
`brandNiveau` is nog een ontwerpprop. `data/` (196 kB) wordt door niets gelezen;
`streek-verhalen.ts` kan niet draaien in een repo zonder buildstap. `Bosbranden Mobiel.html`
laadt Leaflet van unpkg en staat als `/Bosbranden Mobiel` publiek op Vercel zonder dat er
een link naartoe is. Bij elke start vraagt de browser bovendien `/{{ toolUrl }}` op (404),
omdat de ruwe template een `<iframe src="{{ toolUrl }}">` bevat die de browser al parst
voordat de runtime hem vervangt. Onschuldig, maar het vervuilt de logs.

### T11 (L) Vercel-configuratie

`vercel.json` zet alleen `Cache-Control: max-age=0, must-revalidate` op alles, ook op de
750 kB three.js die nooit verandert. `frame-ancestors` (nodig voor de inbedding op
`mobiel.nederlanders.fr`) ontbreekt, net als `X-Content-Type-Options` en
`Referrer-Policy`. Advies: `immutable`-caching voor `piramide/three.*` en `vendor/`, en de
CSP-regel uit §2 van de bouwopdracht zodra het domein vaststaat.

### T12 (goed) Zachte terugval werkt

Met alle externe bronnen geblokkeerd toont de app overal iets: demo-berichten met een
zichtbare melding, de voorbeeldlijst in Actueel, een nette uitleg bij een draad zonder id,
een foutkaart bij de piramide zonder WebGL. Geen enkele spinner blijft draaien. Dit is in
orde en hoeft niet opnieuw.

---

## 4. Bevindingen UI/UX, per scherm

### Hub en Alle modules

De hub is rustig en leesbaar: zoekbalk, strip met drie tegels, Nedergids-banner, de vier
groepen als lijsten, favorieten. Drie punten:

- **Hub en Alle modules zijn hetzelfde scherm.** De tab Modules toont exact de lijst die de
  hub al toont, alleen zonder strip. Een tab die niets toevoegt kost een vijfde van de
  navigatie. Advies: de tab Modules vervangen door Zoeken (dat is variant B zonder de
  "Vandaag"-lijst), en de hub inkorten tot strip, favorieten en de groepen.
- **De Nedergids staat drie keer** op het eerste scherm: als banner, als eerste regel onder
  Aankomen, en in de kopregel via de postcode. Eén plek is genoeg; de banner is de beste.
- **De kopregel zegt "voorbeeldgegevens"** als het forum niet live is. Dat is ontwikkelaarstaal
  op de meest zichtbare regel van de app. "Berichten niet bijgewerkt" zegt hetzelfde in
  gewone taal.

### Postcodevraag

Komt één keer, "Later" onthoudt zich (gecontroleerd via `localStorage`). Maar de vraag komt
vóórdat de lezer iets van de app heeft gezien, en belooft drie dingen waarvan er nul zijn
gebouwd (T5). Advies: de vraag uitstellen tot het moment dat een module hem nodig heeft
(Nedergids, straks Veiligheid), en de tekst inkorten tot wat nu waar is. Plus een regel in
Account om hem te wijzigen.

### Zoeken

Het sterkste scherm van de app. "bedenktijd" geeft drie regels uit de vastgoedgids met
wetsartikel en fase; "notaris" geeft vier modules en veertien regels; "isolatie" geeft een
regel plus een deep link naar Klussen. Twee gaten:

- De inhoud van Zorg, De Ruyter, Nedergids en de knip-teksten zit niet in de index. "CSG" of
  "APA" levert niets of alleen een toevallige vastgoedregel op, terwijl De Ruyter er een
  complete module over heeft. Alles staat al in `modules.json`; het is één extra lus in
  `search()`.
- De suggestie "brandrisico" matcht alleen op de demo-berichten. Met live berichten geeft die
  chip waarschijnlijk "Niets gevonden".

### Forum, Actueel en Discussie

Lezen werkt goed en de draad-terugval is eerlijk (samenvatting met melding, "niet alle
reacties", "geen draad op te halen"). Kanttekeningen:

- **Actueel is verstopt** als sub-tab onder Forum, terwijl het redactie-, overheids- en
  persnieuws is. Voor de lezer is dat een andere soort informatie dan forumberichten. Als
  Zoeken in de tabbalk komt, is er ruimte om Actueel op de hub een eigen tegel te geven.
- De naam "Forum" dekt Ning-blogberichten met reacties, geen forumtopics (het Ning-forum is
  volgens §5 van de bouwopdracht juist niet ontsloten). "Berichten" of "Gemeenschap" is
  eerlijker.
- Filterchip "4 met reacties" en de segmentknoppen zijn te laag (T4).

### Taalassistent

De vier gebouwde situaties zijn goed: fases als chips, vous/tu, "Groot tonen" als volledig
bordeaux scherm met de zin in 33 px, dat is precies het juiste gebaar voor een balie. De
problemen zijn de belofte van vijftien en de elf dode regels (T5), plus het scherm
"Woordenlijsten" achter de prominente knop "Alle lexicons in één index": dat scherm is een
placeholder met vijf keer "te doen" en een voorstel aan de redactie. Advies voor V1.0: de
elf niet-gebouwde situaties en de lexicon-knop weghalen; "4 situaties" op de strip; de
lexicon-index terug zodra er twee lijsten zijn omgezet.

### Een huis kopen, Ouder worden & zorg, De Ruyter

Dit is het niveau waar de hele app naartoe moet: kop, bronlabel per punt, peildatum,
"waar dit vandaan komt", voorbehoud. Drie opmerkingen die voor alle drie gelden:

- **Lengte.** Scrollhoogte bij 880 px viewport: De Ruyter 4.796 px, Een huis kopen 4.152 px,
  Nedergids 3.238 px, Zorg 3.164 px. De chip-strip met fases of secties scrolt mee naar boven
  en is na twee schermen weg. Maak die strip `position: sticky` onder de kopbalk; dan blijft
  de navigatie binnen de module altijd bereikbaar.
- **De marktcontext in Een huis kopen** (onderhandelingsmarge −5,3% in Q1 2026, verkooptermijn
  boven 100 dagen, DPE-decote 10 tot 20%, rente rond 3%) heeft geen bronlabel per regel; de
  bron staat alleen generiek onderaan (IF-dossier). Dat is de enige plek in de drie schillen
  waar een getal zonder eigen label staat. Ik heb deze cijfers niet tegen een primaire bron
  nagelezen; ze verdienen óf een label óf een "indicatie"-regel.
- **Zorg** heeft de rode alarmkaart bovenaan als groot volvlak (`#8A1414`), en het
  "Groot tonen"-scherm van Taal is een volledig bordeaux vlak. Beide schenden regel 2 van
  `CLAUDE.md` letterlijk en zijn allebei terecht: het zijn de twee momenten waarop contrast op
  afstand belangrijker is dan huisstijl. Leg ze als bewuste uitzondering vast in `CLAUDE.md`,
  anders "repareert" een volgende sessie ze.

### Energie & verwarming

De opzet is goed: voorbeeldhuis met echte uitkomst, "hoe is dit gerekend", zeven vragen als
pillen, de knip als eerlijke lijst gratis tegenover abonnement, één knop naar buiten. De
knop "Bereken mijn energieprestatie" staat onderaan een lange pagina en de uitkomst
verschijnt daaronder; op een telefoon zie je na het tikken niet meteen dat er iets gebeurd
is. Advies: na berekenen naar de uitkomst scrollen, of de uitkomstkaart boven de vragen
zetten en bij elke wijziging bijwerken. En de voorbeeldhuis-keuze uit T9.

### Iframe-modules (Veiligheid, Klussen, Kompas, Transactiekosten)

Zie T7. Inhoudelijk: de knip-uitleg bij Kompas is goed geschreven en de status-kaart
"Laatst nagekeken in maart 2026" is de oudste peildatum in de app; die module verdient een
check vóór V1.0. De regel "De weg terug staat linksboven" klopt niet: de module opent in een
nieuw tabblad, de weg terug is het tabbladoverzicht van de browser.

### Nedergids

Als lijst goed: categoriechips, VAN ONS en ARCHIEF als labels, uitleg over €1 en de
registercontrole. Het blok "Uitgelicht · BETAALD" met "Deze plek is beschikbaar" is een
advertentieplaceholder; in V1.0 zonder sponsor is dat een lege etalage bovenaan een
wegwijzer. Advies: verbergen tot er een sponsor is (veld `plekken` leeg laten en het blok
daarop conditioneel maken).

### Account en Over ons

"Account" is een scherm zonder account. De primaire bordeaux knop "Aanmelden bij
Nederlanders.fr" stuurt de lezer naar buiten om in te loggen op iets wat de app nergens
gebruikt (het forum is bewust alleen-lezen). Advies: het scherm "Meer" of "Instellingen"
noemen, met de postcode als eerste regel (wijzigbaar), dan "Wat het abonnement biedt" als
gewone link, dan Over ons, versie en peildatum van de catalogus (`bijgewerkt` uit
`modules.json` staat er al maar wordt nergens getoond).

Over ons en de kennispiramide zijn af. De piramide rendert (gecontroleerd met WebGL), de
tekst zit in `piramide.json`, de terugval zonder WebGL is netjes. De 750 kB komen alleen
binnen bij wie het model opent.

### Consistentie met de huisstijl

Bordeaux als volvlak alleen op knoppen, badges en het logo; grote vlakken transparant;
Poppins 600 op koppen; Mulish op tekst; 1,8 regelafstand op lopende tekst en compact op
labels; kaarten wit met 16 px radius. Dat klopt overal, gecontroleerd in de opnames. De twee
bewuste uitzonderingen staan hierboven. Op 320 px breed valt niets uit elkaar; op 1280 px
staat de app als 412 px-kolom in het midden, wat voor een mobiele schil in een iframe de
bedoeling is.

---

## 5. Beslissingen voor de redactie (met advies)

| # | Vraag | A | B | Advies |
|---|---|---|---|---|
| 1 | Abonnementsstatus (bouwopdracht §5) | V1.0 zonder statuscheck: muur plus link naar buiten, zoals nu | SSO of token bouwen vóór V1.0 | **A.** De drie vragen uit §5 zijn nog onbeantwoord en de muur is eerlijk. V1.1. |
| 2 | Lege modules (Correspondentie, Verenigingen, Auto, Erfrecht) | uit de hub halen via een veld in `modules.json` | laten staan met "nog niet beschikbaar" | **A** voor de drie info-modules; Erfrecht wordt `info` met de voorbeeldtabel als tekst tot er inhoud is. |
| 3 | Voorbeeldhuis energie (T9) | ander voorbeeldhuis met herkenbare uitkomst | huidig huis met uitlegregel | **A**, na een check op de desktop dat dezelfde invoer daar hetzelfde geeft. |
| 4 | Veiligheid & natuur | `Bosbranden Mobiel.html` weer aansluiten als eigen schil | iframe naar de NLFR-pagina houden | **B** voor V1.0 (buiten seizoen), **A** vóór juni 2027. |
| 5 | Tabbalk | Hub · Forum · Taal · Modules · Account (nu) | Hub · Zoeken · Berichten · Taal · Meer | **B.** Modules is een dubbel scherm; Zoeken is het beste scherm van de app. |
| 6 | Domein | iframe op `mobiel.nederlanders.fr` | eigen subdomein, bijv. `app.infofrankrijk.com` | **B.** Manifest, beginscherm, cookies en CORS werken alleen fatsoenlijk op een eigen host. Inbedding kan daarnaast. |
| 7 | `data/` | verplaatsen naar `antonnoe/navigation` | weghalen | **A**, of weghalen als die repo ze al heeft. Niets bouwen. |

Geen van deze zeven blokkeert het werk in fase 0 en 1 hieronder.

### Besluiten van de opdrachtgever, 2 september 2026

| # | Besluit | Gevolg voor de bouw |
|---|---|---|
| 1 | **V1.0 zonder abonnement**, met de haken voor premium erin | `prijs` en `knip` blijven per module; de muur linkt naar buiten. Een latere statuscheck haalt alleen de muur weg. Vastleggen in `CLAUDE.md` zodat de knip niet wordt "opgeruimd". |
| 4 | **Bosbranden uit** buiten het seizoen, in het seizoen weer aan; **Franse verkiezingen** als tijdelijke module | Velden `zichtbaar` (handmatig) en `seizoen` (begin- en einddatum, automatisch, handmatig te overrulen) in `modules.json`. Verborgen modules blijven vindbaar via zoeken met de vermelding "buiten seizoen". |
| 6 | **Eigen domein: infopoche.fr**, vastgelegd op 2 september 2026. App-naam "Infopoche"; Infofrankrijk en Nederlanders.fr als afzenders in Over ons en het manifest. savoirfrance.fr (en france-en-poche.fr als hij vrij is) alleen als doorverwijzing. | Titel, kopbalk, manifest en pictogram op "Infopoche" (fase 0.2). infopoche.fr in de CORS-allowlists van `nlfr-menu` en `nlfr-berichten`. Nog te controleren door de opdrachtgever: merkregister INPI en de houders van infopoche.com en .nl. |
| nieuw | **Modules eenvoudig toevoegen vanuit Vercel** | Voorbeeldblok plus handleiding in de README; veld `weergave` met "voorvertoning" (nu) of "volledig" (echte iframe op volle hoogte, alleen voor tools die mobiel werken en framing toestaan). Per tool controleren in fase 2. |
| nieuw | **Doorontwikkeling naar UK/US** op termijn | Geldt voor de schil, niet voor de inhoud (vastgoedgids, De Ruyter, Zorg zijn Nederlands-Frans). De teksten van de schil staan verspreid in de template; die naar één taalbestand halen is een V1.1-klus. |

Besloten en gebouwd op 2 september 2026 (PR's #3 in deze repo en #74 in `klussen-in-frankrijk`):

- **Klussen in Frankrijk** opent volledig in de app (`weergave: "volledig"`); de site staat
  framing toe voor infopoche.fr, if-mobiel.vercel.app, infofrankrijk.com en nederlanders.fr
  (dus ook voor een pagina op de IF-website). De site publiceert `/zoekindex.json` met de
  107 artikelen en 430 gepubliceerde bouwtermen; het zoekveld van de app doorzoekt dat en
  opent een treffer in de module. Geen kopie van de tekst.
- **Café Claude** als module onder Aankomen met prijs "1e antwoord gratis" en één knop naar
  een nieuw tabblad (de site weigert framing op de hoofdroute), plus onder elke groep een
  regel "Vraag het Café Claude" met een deep link naar het bijpassende domein.
- **Modules toevoegen vanuit Vercel**: veld `weergave` (voorvertoning, volledig, knop) en
  `zoekindex`, met een handleiding en voorbeeldblok in de README.

Nog open: welke verkiezing en of daar al een bron voor is; of Veiligheid & natuur helemaal
uit gaat of alleen het brandgevaar; het label van Financieel kompas (de tool is zelf
freemium: basis gratis, premium-velden op slot; het badge "ABONNEE" klopt dus niet, en
`?access=premium` in die repo ontgrendelt alles zonder token).

---

## 6. Weg naar V1.0

Inspanning: **S** = een uur tot een dagdeel, **M** = een tot twee dagen, **L** = meer.

### Fase 0: blokkerend, in deze repo, geen redactiebeslissing nodig

| Stap | Wat | Inspanning |
|---|---|---|
| 0.1 | React en ReactDOM 18.3.1 lokaal in `vendor/`, `window.__resources` vóór `support.js`, fallback-tekst buiten `<x-dc>` (T1) | S |
| 0.2 | `<title>Infopoche</title>`, `lang="nl"`, `manifest.webmanifest` met naam Infopoche, twee iconen, `apple-touch-icon`, `meta description` (T2) | S |
| 0.3 | `100dvh` met terugval, `safe-area-inset-bottom` op de tabbalk, `viewport-fit=cover`, `user-scalable=no` weg (T3) | S |
| 0.4 | Onware regels weg: "Offline beschikbaar", "Laatst bijgewerkt: vandaag", "15 situaties", elf dode situaties, postcode-belofte, "De weg terug staat linksboven" (T5) | S |
| 0.5 | Segmentknoppen en Vernieuwen naar 44 px; tabbalk-labels naar 11 px; vijf inline-SVG-iconen (T4) | S |
| 0.6 | "Gekopieerd"/"Voorgelezen" alleen bij succes (T5) | S |
| 0.7 | `engine/BRON.md` met repo, commit en datum; prijstabel en apparatenlijst uit de motor lezen in plaats van kopiëren (T8) | S |

### Fase 0: uitgevoerd op 2 september 2026 (commit op de werkbranch)

Alle zeven stappen staan in de code; gecontroleerd met een nieuwe proefdraai: geen enkel verzoek
meer naar unpkg.com, titel "Infopoche", `lang="nl"`, manifest en pictogrammen aanwezig, geen
aanraakvlak meer onder 44 px, tabbalk-labels 11 px met SVG-iconen, "Gekopieerd" alleen bij
succes, voorlezen meldt eerlijk "Geen Franse stem gevonden" als die ontbreekt, de postcode is
bij Account te wijzigen, en het voorbeeldhuis geeft met de motor-constanten en de
desktop-standaardwaarden nog exact dezelfde uitkomst (G, € 10.385). Het pictogram in `icons/`
is een tijdelijke "iP" op een telefoonsilhouet; een echt logo is een redactiekeuze.

### Fase 1: afronding, in deze repo, met de beslissingen uit §5

| Stap | Wat | Inspanning |
|---|---|---|
| 1.1 | Velden `zichtbaar` en `seizoen` in `modules.json`, filter in de hub, "buiten seizoen" in zoeken; vier lege modules en Bosbranden verbergen (beslissingen 2 en 4) | S |
| 1.1b | ~~Voorbeeldblok en handleiding "module toevoegen" in de README; veld `weergave` (voorvertoning of volledig) voor iframe-modules~~ gedaan op 2 september 2026 (PR #3), plus `zoekindex` | S |
| 1.1c | Domein infopoche.fr koppelen aan Vercel; "Infopoche" in kopbalk, manifest en pictogram; infopoche.fr in de CORS-allowlists van `nlfr-menu` en `nlfr-berichten` (andere repo's) | S |
| 1.2 | Tabbalk naar variant met Zoeken; Modules-tab weg; hub inkorten (beslissing 5) | M |
| 1.3 | Scherm Account wordt Meer: postcode wijzigen, abonnement als link, Over ons, catalogusdatum | S |
| 1.4 | Zoekindex uitbreiden met zorg, ruyter, nedergids en knip-teksten | S |
| 1.5 | Chip-strips sticky in Vastgoed, Zorg, De Ruyter, Nedergids, Energie | S |
| 1.6 | Energie: na berekenen naar de uitkomst; voorbeeldhuis volgens beslissing 3; `PREVIEW` weg | S |
| 1.7 | Iframe-voorvertoning vervangen door beeld of knop; per bron framing controleren (T7). KiF staat op `volledig`, Café Claude op `knop`; Veiligheid, Kompas en Transactiekosten nog te kiezen | M |
| 1.8 | Marktcontext-cijfers in Vastgoed voorzien van bronlabel of indicatieregel | S (redactie) |
| 1.9 | Nedergids: Uitgelicht-blok verbergen zonder sponsor | S |
| 1.10 | Dode constanten weg (`CAT`, `NIVEAUS` bewaren met toelichting, `TODO`, `PREVIEW`); `Bosbranden Mobiel.html` naar `archief/` of weg; `data/` volgens beslissing 7 | S |
| 1.11 | `vercel.json`: `immutable` op `piramide/three.*` en `vendor/`, `frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy` | S |
| 1.12 | README en CLAUDE.md bijwerken: tabbalk, `zichtbaar`, de twee huisstijl-uitzonderingen, `vendor/` | S |

### Fase 2: verificatie op het echte domein en een echt toestel (niet vanuit deze omgeving te doen)

Checklist, per punt een ja/nee met schermopname:

1. `/api/berichten` en `/api/actueel` leveren live data op het productiedomein (CORS-allowlist
   bevat dat domein); de terugval werkt nog met vliegtuigmodus aan.
2. `/api/reacties` levert het volledige bericht plus alle reacties voor drie echte berichten
   (het HTML-schrapen uit ronde 4 is nooit tegen de echte site getest).
3. De vier iframe-bronnen staan framing toe, of de voorvertoning is vervangen (1.7).
4. iPhone Safari: tabbalk boven de systeembalk, ook met adresbalk zichtbaar; toevoegen aan
   beginscherm geeft naam en icoon; opstarten zonder browserbalk.
5. Android Chrome: idem, plus installatieprompt.
6. Voorleesknoppen in Zorg spreken Frans op iOS en Android; zonder stem blijft de zin staan.
7. Energie-intake: zeven vragen en uitkomst op een toestel van vijf jaar oud, eerste weergave
   binnen drie seconden op 4G.
8. Kennispiramide: opent en sluit zonder dat de app daarna traag wordt (renderer gestopt).
9. Postcodevraag: één keer, "Later" onthoudt zich, wijzigen via Meer werkt.
10. Alle uitgaande knoppen openen de juiste bestemming (abonnement, nederlanders.fr, de vier
    externe tools, de 23 Nedergids-sites).

### Fase 3: na V1.0

Abonnementsstatus (§5), Nedergids v2-kaart, Bosbranden als eigen schil vóór het seizoen,
lexicons omzetten naar JSON, situaties 5 tot 15 van de taalassistent, offline-laag met
service worker (pas dan mag "offline beschikbaar" ergens staan), Correspondentie zodra
`briefhulp-fr` toegankelijk is, drie actualiteitsbronnen in één scherm, adresanalyse zonder
iframe (§6 bouwopdracht).

---

## 7. Definitie van klaar voor V1.0

- De app start zonder enige externe JavaScript-bron; alleen fonts komen van buiten en hun
  terugval is systeem-sans.
- Titel, taal, manifest en iconen aanwezig; toevoegen aan beginscherm getest op iOS en Android.
- Geen enkele regel in de UI belooft iets wat de app niet doet; geen enkel element dat eruitziet
  als knop doet niets.
- Geen aanraakvlak onder 44 px; geen navigatietekst onder 11 px.
- Elke module in de hub heeft inhoud of een eerlijke muur; lege modules zijn onzichtbaar.
- Elk getal in een eigen schil heeft een bronlabel; peildatums ouder dan een half jaar zijn
  nagekeken (Kompas: maart 2026).
- `engine/` identiek aan de bronrepo, met commit vastgelegd; de upstream-test slaagt.
- De checklist uit fase 2 is afgevinkt met opnames.
- `main` bevat de eindtoestand; geen open branches.

---

## 8. Bronstatus

**Zelf gemeten of gecontroleerd:** alle bestandsomvangen, regelnummers en tellingen; de
schermopnames en metingen van aanraakvlakken, tekstgroottes en scrollhoogtes; de gelijkheid
van `engine/` met `antonnoe/energieportaal` op commit `23226ce`; de uitkomst van de
upstream-test; de rekenuitkomsten van het voorbeeldhuis en de varianten (in Node, met de
motor uit deze repo); het gedrag van het zoekveld; de `localStorage`-sleutels.

**Niet gecontroleerd, wel gerapporteerd:** de wetsartikelen, tarieven, termijnen en
marktcijfers in `modules.json` (De Ruyter, Vastgoed, Zorg). Die staan met hun bronvermelding
in het bestand en zijn volgens `BOUWOPDRACHT.md` in eerdere rondes nagelezen; ik heb ze niet
opnieuw tegen Légifrance of DGFiP gelegd. De marktcontext in Vastgoed heeft geen label per
regel en staat daarom in §4 als aandachtspunt.

**Niet te controleren vanuit deze omgeving:** alles wat unpkg.com, de Vercel-routes,
nederlanders.fr, infofrankrijk.com en github.io raakt. Dat betreft: live berichten en
actueel, de draadroute, de CORS-allowlist, framing van de vier externe tools, en het gedrag
op een echte iPhone of Android. Daarvoor is fase 2.

---

## 9. Aannames

- V1.0 betekent: publiek bruikbaar zonder account, met eerlijke muren bij betaalde inhoud.
  Een V1.0 mét abonnementskoppeling vereist eerst de antwoorden uit §5 van de bouwopdracht.
- De doelgroep-eisen uit de bouwopdracht (grote aanraakvlakken, gewone taal, nooit een getal
  zonder bron) gelden als toetssteen; waar ze botsen met de huisstijl wint de doelgroep.
- Het patroon (Design Component, één bestand, geen buildstap) staat niet ter discussie;
  geen enkele aanbeveling hierboven vereist een bundler of een framework-migratie.
- Dit rapport en fase 0 staan op de werkbranch `claude/if-mobiel-state-report-pe92ei`; volgens
  regel 5 van `CLAUDE.md` horen ze naar `main`, dat is de enige merge-stap die overblijft.
- Terminologie: technisch is dit een mobile-first web-app (statische site met manifest, geen
  app-winkel); naar de lezer heet het gewoon "de app".
