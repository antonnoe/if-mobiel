# Bouwopdracht IF-Mobiel

## Ronde 3 — afgerond 25 augustus 2026

Aanleiding: op if-mobiel.vercel.app opende geen enkel item in de Actueel-tab.
Rechtermuisklik gaf `https://if-mobiel.vercel.app/#` — er werd geen URL in de
link gezet. De feed zelf werkte; dit was geen terugval.

**Oorzaak, en waar hij zat.** `/api/actueel` leverde de bron-URL alleen genest
in `bronnen[].url`. De app las `a.href || a.link || a.url` — geen van drieën
bestond — en viel terug op `"#"`. De fout zat dus in `nlfr-menu`, niet in de
app; de app maskeerde hem alleen.

**Wat er gewijzigd is:**

| Repo | Wat |
|---|---|
| `nlfr-menu` | Elk artikel krijgt een expliciete, absolute `url` (overheid, infofrankrijk, verenigingen: de eigen bron; perssynthese: de eerste bruikbare uit de bronnenlijst). Relatieve paden, lege strings en `javascript:`-URL's worden geweigerd en leveren `null`. 6 tests. |
| `nlfr-menu` | Allowlist laat nu subdomeinen van de eigen domeinen toe — `mobiel.nederlanders.fr` matchte niet op de vaste lijst. |
| `if-mobiel` | Actueel-items linken naar die `url`, in een nieuw tabblad met `rel="noopener"`. Zonder bruikbare URL: geen link, geen pijl, met uitleg. |
| `if-mobiel` | Nieuwe helper `veiligeUrl()`: absolute http(s)-URL of `null`. Elke plek die een adres uit externe data haalt loopt hier doorheen. |
| `if-mobiel` | Berichten-tab: `p.href` werd ongeguard gebruikt; leesknop en "Reageer op nederlanders.fr" verschijnen nu alleen bij een bruikbare URL. |
| `if-mobiel` | Alle knoppen zonder bestemming opgeruimd — zie de tabel hieronder. |
| `nlfr-berichten` | Dezelfde allowlist-fix, en de drie gedupliceerde kopieën samengetrokken tot `lib/cors.js`. 5 tests. |

**Knoppen zonder bestemming, en wat ze geworden zijn:**

| Was | Is geworden |
|---|---|
| 3× "Word abonnee" (dode `<button>`) | Anchor naar `https://www.infofrankrijk.com/abonnement/` — dezelfde bestemming die `financieel-kompas-ai` al gebruikt |
| "Aanmelden bij Nederlanders.fr" | Anchor naar `nederlanders.fr` |
| "Abonnement koppelen" | "Wat het abonnement biedt" → dezelfde abonnementspagina; de SSO-koppeling zelf is nog niet vastgesteld (§5) |
| "Vermelding aanvragen" (Nedergids) | Weg. Hoort in Nedergids v2, niet hier (§7) — nu een regel die uitlegt waar het straks gebeurt |
| "Zet op mijn beginscherm" | Weg als knop; dat is een handeling van de browser. Nu een aanwijzing naar het deelmenu |

**Al correct bevonden, ongewijzigd gelaten:** de alarmnummers in Zorg waren al
echte `tel:`-links, en alle 23 Nedergids-sites hadden al een `url`.

**Nog open uit deze ronde:** `nlfr-berichten/api/tellingen.js` staat op
`Access-Control-Allow-Origin: *`. Buiten de opdracht gelaten, apart te bespreken.

---

# Bouwopdracht IF-Mobiel — ronde 2

Repo: `antonnoe/if-mobiel`, branch `main`. Opgesteld 25 augustus 2026.
Dit bestand vervangt de eerste bouwopdracht van 23 augustus 2026. Wat daarin af is
staat hieronder onder "Wat al af is" en hoeft niet opnieuw.

**Lees eerst, volledig, in deze volgorde:** dit bestand · `CLAUDE.md` · `README.md` ·
`index.html` · `modules.json`. Pas daarna één regel wijzigen.

`CLAUDE.md` blijft gelden voor alles wat vorm is: bordeaux `#800000`, Poppins 600 voor
koppen, Mulish voor tekst, alles inline, geen buildstap, geen stylesheet, geen bundler,
alles direct naar `main`. **Behalve** de architectuurbeschrijving daarin — die is
achterhaald en jij gaat hem in §3 repareren.

---

## Wat IF-Mobiel is

De mobiele ingang tot het hele Infofrankrijk-ecosysteem: één app waarin de losse
tools, dossiers en het forum samenkomen. Uit 114 repository's zijn **veertien modules**
gedestilleerd, verdeeld over **vier groepen** die de zijden van de kennispiramide
volgen: **Aankomen · Wonen · Geld · Leven**.

De doelgroep is Nederlandstalig, woont in Frankrijk of overweegt dat, en is gemiddeld
ouder dan de gemiddelde app-gebruiker. Dat stuurt drie dingen, en het zijn geen
vrijblijvende wensen: **grote aanraakvlakken, gewone taal, en nooit een getal zonder
bron.**

---

## Wat al af is (niet opnieuw doen)

| Onderdeel | Stand |
|---|---|
| v3 overzetten naar de repo | af — `index.html` leest `modules.json` bij het opstarten |
| Catalogus uit de code halen | af — veertien modules, vier groepen, alles in JSON |
| Klussen-adressen (§4 oud) | af — negen deep links per vak + `/dossiers` |
| Twee elektradossiers als één kaart | af — "Elektrische installatie", 2 secties |
| Vastgoed als zeven fases | af — 32 do's en don'ts, marktcontext, wetsartikelen |
| Zorg als noodschil | af — alarmnummers, 24u/7d/30d, voorleesknoppen |
| De Ruyter als keuzeschil | af |
| Postcodevraag bij eerste opening | af — met "Later" die zich onthoudt |
| Storingsmelding met laatst geladen gegevens | af |

Alles hieronder is nieuw of nog open. **De volgorde is de volgorde.** Doe §1 vóór §2,
§2 vóór §3, en meld je na elke paragraaf met wat je hebt gedaan en wat je hebt gezien.

---

# §1 — De energiemotor terugkoppelen (dit eerst)

## Wat er gebeurd is

In de repo staat `engine/` — de rekenmotor van EnergiePortaal, overgenomen uit
`antonnoe/energieportaal`: `archetypes.js` (intake → veertig velden met 3CL-DPE-forfaits),
`engine.js` (`computeResults`), `dpe.js` (`computeDPE`). Die motor werkte in de vorige
versie van de app: zeven vragen, en de gebruiker kreeg een échte uitkomst.

In v3 wordt hij **niet meer aangeroepen.** `loadEngine`, `computeResults` en
`applyArchetype` komen alleen nog voor in `CLAUDE.md`, `README.md`, `PROMPTS.md` en in
`engine/` zelf — niet in `index.html`. De module `energie` staat in `modules.json` als
`kind: "voorbeeld"` met vaste getallen: label E, 287 kWh EP/m², € 2.140, 31 kg CO₂/m².

**Dat is een regressie en het is de ergste soort.** De hele belofte van deze app is dat
elk getal een bron heeft. Hier staat een verzonnen bedrag op de plek waar eerst een
berekening stond. Dit is niet "nog niet gebouwd" — het is gebouwd geweest en
weggevallen bij de overzetting.

## Wat je bouwt

Een nieuw scherm `energie` (dus `kind: "energie"` in `modules.json`, niet `voorbeeld`),
dat de motor uit `engine/` lui laadt en echt rekent.

**Regels die niet ter discussie staan:**

1. **`engine/` wijzig je niet.** Geen enkele regel. Hij wordt alleen gesynchroniseerd
   uit `antonnoe/energieportaal`. Eén rekenmotor, twee schillen.
2. **Je dupliceert geen rekenlogica.** Geen tweede berekening, geen "even snel zelf
   uitrekenen", geen hardgecodeerde forfaits in `index.html`. Alles via
   `applyArchetype()`, `computeResults()`, `computeDPE()`.
3. **Lui laden met een guard**, zoals `loadEngine()` in de vorige versie deed: de drie
   scripts één keer, in de juiste volgorde (`archetypes.js`, `engine.js`, `dpe.js`),
   pas op het moment dat de gebruiker de module opent. Zet er geen tweede `<script src>`
   naast in `<helmet>`.
4. Lukt het laden niet, dan zegt het scherm dát — met de laatst berekende uitkomst als
   die er is. Nooit een spinner die blijft draaien, nooit een verzonnen terugval.

**De intake:** zeven vragen, één per scherm of maximaal twee, met grote knoppen — geen
formulier met veertig velden. Lees de intakevragen van de vorige versie na in de
geschiedenis van `index.html` en in `engine/archetypes.js` (welke archetypen bestaan, en
welke antwoorden ze verwachten). Wijk daar niet van af zonder te melden waarom.

**De uitkomst:** energielabel, verbruik in kWh EP/m², jaarkosten, CO₂ — plus, en dit is
het belangrijkste deel, **waar die getallen vandaan komen.** De motor levert een
`debug`-object met UA, Hvent, HDD, rendementen en de elektra-audit inclusief een
`mismatch`-vlag. Gebruik dat: onder de uitkomst één opklapbare regel "hoe is dit
gerekend" met de vier of vijf getallen die het verschil maken, en de vermelding dat de
forfaits uit de 3CL-DPE-methode komen. Staat `mismatch` op `true`, dan zeg je dat de
elektrabalans niet sluit in plaats van de uitkomst gewoon te tonen.

**De freemium-knip** loopt hier net als bij het Financieel kompas *door de uitkomst
heen*, niet eromheen:

- **Gratis:** het voorbeeldhuis met zijn volledige uitkomst, de eigen zeven antwoorden
  invullen, en de *richting* van de eigen uitkomst — welk label ongeveer, en welke post
  het zwaarst weegt.
- **Met abonnement:** de eigen bedragen, de terugverdientijd per maatregel, de
  vergelijking met en zonder isolatie of warmtepomp, en bewaren in het dossier.

Wie niet betaalt ziet dus wél waar zijn huis staat en waaróm, maar niet met hoeveel
euro. Zet de tekst van die grens in `modules.json` onder `energie.knip`, in dezelfde
vorm als `kompas.knip` (`kop`, `gratis[]`, `abonnee[]`, `regel`).

## Klaar als

Zeven vragen, een echte uitkomst uit `engine/`, de herkomst van de getallen zichtbaar,
`engine/` ongewijzigd, geen enkel forfait in `index.html`, en het woord "voorbeeld"
verdwenen uit de module `energie` in `modules.json`.

---

# §2 — Eén CORS-regel in `nlfr-menu`

De Actueel-tab haalt `https://nlfr-menu.vercel.app/api/actueel` op. Die route stuurt
geen `Access-Control-Allow-Origin` mee — ik heb de hele repo gezocht, de header staat er
nergens. Cross-origin ophalen faalt dus altijd, en de app valt permanent terug op de
voorbeeldlijst. Dat wordt netjes gemeld in de app, maar een tab die uitlegt waarom hij
niet werkt is geen tab.

**Wat je doet:** in `antonnoe/nlfr-menu`, bestand `api/actueel.js`, een allowlist naar
het model dat `nlfr-berichten` al heeft — nederlanders.fr, infofrankrijk.com en de
eigen `*.vercel.app`-domeinen. Geen `*`: dit is een eigen route en de allowlist is
precies het verschil tussen "open voor ons" en "open voor iedereen".

**Welke oorsprong in de allowlist moet:** IF-Mobiel wordt straks als **iframe** ingebed
op `mobiel.nederlanders.fr` (voorlopig: het Vercel-domein van deze app). Bij een fetch
uit een iframe is de `Origin` het domein van de **iframe zelf** — dus van IF-Mobiel op
Vercel, niet dat van de omliggende pagina. Zet daarom beide in de allowlist: het
`*.vercel.app`-domein van IF-Mobiel én `nederlanders.fr` met de subdomeinen, zodat het
na de domeinverhuizing niet opnieuw stukloopt.

**Tweede kant van dezelfde inbedding:** IF-Mobiel moet ook *geframed mogen worden*. Dat
is een andere header, op de IF-Mobiel-kant: in `vercel.json` geen `X-Frame-Options:
DENY`, maar `Content-Security-Policy: frame-ancestors 'self' https://*.nederlanders.fr`.
Controleer wat er nu staat en rapporteer het; verander het pas als het inbedden er
daadwerkelijk op stukloopt.

**Let op de vorm van het antwoord:** `/api/actueel` levert **tegels met artikelen
erin**, geen platte lijst. De app leest dat al correct uit. Verander die mapping niet
zonder de route ernaast te leggen.

**Controleer daarna in de app zelf** — niet alleen met curl — dat de tab live gegevens
toont en dat de terugval nog steeds werkt als je het netwerk uitzet.

## Drie actualiteitsbronnen horen bij elkaar

Behalve `/api/actueel` liggen er nog twee bronnen klaar: **verkeersnieuws** en
**infofrankrijk-routecontrole**. Bouw daar **geen drie iframes** van. Onderzoek en
rapporteer: kunnen die drie in één Actueel-scherm samenkomen (overheid · pers ·
verkeer), met per bericht de bron en het tijdstip? Kom met een voorstel vóór je bouwt.

---

# §3 — De documentatie liegt tegen je opvolger

`README.md` en `CLAUDE.md` beschrijven de vórige app: inlog-scherm, hub met drie
weergaven A/B/C, `SECTIONS`, de catalogus in `const G`, `FEEDS`, `fw_state`, `fw_feed`,
schermen `login`/`dossier`/`fire`/`energie`. Dat bestaat niet meer. `main` is v3:
groepen, `modules.json`, `ifm_favs`, `ifm_postcode`, `ifm_pc_later`, `ifm_last_visit`.

**Dit is niet netheid, dit is de oorzaak van §1.** Wie een CLAUDE.md leest die een
andere app beschrijft, bouwt de verkeerde app. Repareer het:

1. **`CLAUDE.md`** — herschrijf de tien architectuurregels naar v3. De huisstijl,
   de regel over `line-height: 1.8em` alleen voor lopende tekst, de regel over volvlak
   versus transparant bordeaux, de regel dat `engine/` overgenomen is, de regel dat
   rekenlogica niet gedupliceerd wordt, en de regel dat alles direct naar `main` gaat
   blijven **exact zoals ze zijn**. Alleen de architectuurbeschrijving en de lijst
   schermen en `localStorage`-sleutels worden bijgewerkt. Voeg één regel toe: *de
   catalogus staat in `modules.json` en gaat nooit terug de code in.*
2. **`README.md`** — bestandstabel bijwerken (`modules.json` ontbreekt erin), de
   architectuurparagraaf naar v3, en "Nog te doen" opnieuw vullen met wat er nu open
   staat in plaats van wat in juni open stond.
3. **Dit bestand committen** als `BOUWOPDRACHT.md` in de repo, zodat de volgende sessie
   het vindt zonder dat iemand het opnieuw moet aanleveren.
4. **`PROMPTS.md`** — nalezen en de passages die naar de v2-structuur wijzen markeren of
   bijwerken.

---

# §4 — Twee bestanden die niemand leest

In `data/` staan:

- `feiten.json` — 146 kB
- `streek-verhalen.ts` — 50 kB

Geen van beide wordt ergens in de repo gelezen. `streek-verhalen.ts` is bovendien
TypeScript in een repo zonder buildstap: dat bestand kán niet draaien zoals het er ligt.

**Doe hier niets aan tot je gerapporteerd hebt.** Zoek uit waar ze vandaan komen, wat
erin zit, en of ze bedoeld waren voor deze app of hier per ongeluk zijn beland.
Dan drie mogelijkheden, en de redactie kiest:

- ze horen bij een module die nog moet komen → benoem welke, en zet ze in `data/` met
  een regel in de README wat ze zijn;
- ze horen bij een andere repo → verplaatsen;
- ze zijn overbodig → weghalen.

**Verzin er geen module bij om ze te gebruiken.** Een bestand van 146 kB is geen reden
om iets te bouwen; het is een reden om te vragen wat het is.

---

# §5 — Inloggen en abonnementsstatus

De app werkt zonder inloggen en dat blijft het uitgangspunt. Inloggen is **alleen**
nodig voor de betaalde modules van infofrankrijk.com. Voor het forum niet — zie de
paragraaf onderaan; daar is besloten dat er niet ingelogd wordt.

IF en NLFR zijn twee volledig gescheiden accountsystemen. Voeg ze niet samen en bouw
geen gedeelde inlog. De app heeft er maar één nodig.

**Er staat op dit moment nul aan authenticatie in `index.html`** — geen token, geen
cookie, geen statuscheck. Dat is bewust: dit wacht op het antwoord van de opdrachtgever
op drie vragen. Bouw niets op een aanname.

**Rapporteer eerst, met een voorstel per punt:**

1. Welk systeem houdt de abonnementsstatus vast — WordPress op infofrankrijk.com, een
   eigen tabel, iets anders?
2. Cookie of token, en op welk domein staat dat? Kan de app op een `*.vercel.app`-adres
   die status überhaupt zien, of is een eigen subdomein onder infofrankrijk.com nodig?
3. Is er een endpoint dat "deze gebruiker is abonnee" antwoordt, of moet dat gemaakt
   worden?

**Als het antwoord er is, dan gelden deze regels:**

- De "Word abonnee"-knop staat op **twee** plekken en nergens anders: op de muur bij de
  eigen uitkomst, en als één regel in Account.
- Betalen gebeurt buiten de app, in de browser. De app wijst de weg en haalt daarna de
  status op. Er komt **nooit** een verkooppagina ín de app.
- Een verlopen abonnement krijgt een eigen scherm met één knop naar buiten.
- Modules met status `te smeden`, `bron onbekend` of `in bouw` tonen **geen** koopknop,
  maar "Nog niet beschikbaar" met een verwijzing naar het forum.
- Veiligheid & natuur is en blijft gratis, ook zonder account. Met veiligheid spelen we
  geen spelletjes — dat is geen marketingregel maar een harde.
- Faalt de statuscheck, dan is de gebruiker **niet** ineens niet-abonnee: toon de
  laatst bekende status met een melding, en laat hem niet buiten zijn eigen dossier
  staan door een netwerkfout.

## Het forum: alleen lezen, geen inlog

**Besloten.** Het NLFR-forum draait op Ning 2.0. De Ning-API geeft blogposts, comments
en foto's vrij, maar **niet het forum** — discussies en topics staan expliciet op de
lijst van wat de API niet ontsluit. Reageren of topics starten kan langs die weg dus
niet. Ning kent bovendien geen echte SSO: een token krijg je alleen door de gebruiker
zijn NLFR-wachtwoord in deze app te laten typen, en dat willen we niet.

**Wat je bouwt:** een leesbaar mobiel forumscherm, alleen lezen. De mobiele weergave van
NLFR is de klacht; leesbaarheid is dus de hele opdracht. Een "reageer"-knop opent het
bericht op de site, in de browser, buiten de app. Geen inlogveld, geen wachtwoord, geen
conceptbeheer.

**Verifieer eerst wat er werkelijk vrijkomt.** De documentatie waarop dit besluit rust is
uit 2012. Controleer met het echte abonnement wat `external.ningapis.com` voor dit
netwerk teruggeeft, en rapporteer dat vóór je bouwt. Let op: de API wil de
Ning-subdomeinnaam, niet een eigen domein, en knijpt af boven 20 verzoeken per seconde.

**Sleutels nooit in de app.** Ning ondertekent met een consumer secret. Dat staat in een
kleine route op Vercel — hetzelfde patroon als `nlfr-menu` — nooit in code die de
browser kan lezen. Die route regelt tegelijk de CORS-header uit §2.

**Houd de verhoudingen in het oog:** het forum is één van veertien modules. Bouw hier
geen tweede app in. Eén lijstscherm en één leesscherm, in de bestaande schil, met de
bestaande navigatie.

---

# §6 — De adresanalyse kan zonder iframe

`antonnoe/vastgoed-analyse` draait op Vercel en zet in `vercel.json` op alle
`/api/*`-routes `Access-Control-Allow-Origin: *`. De vijf endpoints (`dvf`, `risques`,
`cadastre`, `urbanisme`, `dpe`) zijn dus rechtstreeks vanuit de app te bevragen, met
lat/lon uit de BAN-geocoder.

Nu staat de tool als iframe onder de fase "Zoeken". Onderzoek of een eigen scherm beter
werkt: één adresveld, daaronder vier kaarten — verkopen in de buurt · risico's · perceel
en PLU · energie en dekking. Dat scheelt een tweede navigatiepatroon en maakt "bewaar in
mijn dossier" mogelijk.

Neem de drie beperkingen uit de README **letterlijk** over en toon ze **vóór** de
uitkomst: DVF is dun in landelijke gebieden, niet elke gemeente ontsluit haar PLU via de
API, en het DPE toont gebouwen in de buurt — niet per se het pand zelf.

Kom met een voorstel voordat je bouwt; dit is de enige paragraaf waar de iframe die er
nu staat acceptabel is als eindtoestand.

---

# §7 — Nedergids v2

`nedergids` staat op `status: "in bouw"` en heeft geen `url`. De app toont nu de
lijstkant: officiële loketten, registers en nuttige websites per categorie, met "VAN ONS"
op de eigen bronnen en de archiefnoot over Nedergids 1.0.

Wacht op het adres van v2. Zodra dat er is: `url` erin en `kind` op `iframe` of, als de
kaart rechtstreeks te bevragen is, een eigen kaartschil — dat laatste is de bedoeling,
maar niet voordat Supabase en de registervalidatie er staan.

**Wat je in de tussentijd niet doet:** de €1-aanmeldflow bouwen. Die hoort in Nedergids
v2 zelf, niet in de app. De app legt uit dat lezen gratis is en dat een nieuwe
vermelding eenmalig €1 kost om bots tegen te houden; de betaling gebeurt daar.

---

# Vier regels die overal gelden

## 1. Nooit een getal zonder bron

De belangrijkste regel van de hele opdracht. **Vul geen getal in dat je niet uit een
bron kunt aanwijzen.** Komt er een bedrag, percentage of termijn in de app, dan komt het
uit `modules.json` met een bronlabel, of uit een rekentool die zijn eigen bron toont.
Een leeg veld met uitleg is beter dan een plausibel getal.

De norm staat er al: **Vastgoed transactiekosten** toont per post het toegepaste
wetsartikel, de bron en de peildatum, leest de DMTO-tarieven uit `dmto.json` in plaats
van uit code, en laat een bedrag dat de gebruiker niet kent buiten de berekening met de
melding dat de uitkomst onvolledig is. Neem dat patroon over in elke rekenmodule.

Wat nu bewust gemarkeerd is en niet zonder verificatie mag worden opgepoetst:

- De gefaseerde invoeringsdata van de audit énergétique dragen het label NOG NIET
  GECONTROLEERD (uit het IF-dossier, niet tegen de primaire bron nagelezen).
- Eén inhoudelijke tegenspraak voor de redactie: het IF-artikel zegt dat de tien dagen
  bedenktijd lopen "na ontvangst" van de compromis; de app houdt de preciezere lezing
  van art. L271-1 CCH aan — vanaf de dag ná de **eerste aanbieding** van de aangetekende
  brief. Wijzig de app niet, maar meld het.

## 2. `modules.json` is de enige plek voor modulegegevens

Zet **nooit** modulegegevens terug in `index.html`. Mis je een veld, voeg het toe aan de
JSON en lees het uit met een veilige terugval. Faalt het ophalen, dan toont de app de
laatst geladen gegevens met een donkere strip erboven. `nagekeken` staat zichtbaar in
elke module; loopt die meer dan een jaar achter, maak dat zichtbaar in plaats van het te
verbergen.

Velden per module: `id`, `naam`, `meta`, `groep`, `prijs` (`gratis` · `gratis-lezen` ·
`abonnee`), `schil`, `kind`, `url` (alleen bij `iframe`), `status`, `houdbaar`,
`nagekeken`, `over`, `let`, `knip`, `voorbeeld`.

`kind` bepaalt het scherm: `iframe` · `voorbeeld` · `info` · `taal` · `lex` · `forum` ·
`actueel` · `nedergids` · `vastgoed` · `zorg` · `ruyter`, en na §1 ook `energie`. Een
nieuw type toevoegen is: een `kind` verzinnen, een blok in de JSON, en één `sc-if`-scherm
in de template. Bestaande modules van vorm veranderen gaat zonder code.

**Navigatie-invariant:** `go()` wist `tool` en `muur`. Dat is geen detail — laat je
`tool` staan, dan blijft de prijsbadge in de kopbalk hangen op de vorige module. Elke
nieuwe route volgt dezelfde regel.

## 3. Toegankelijkheid is hier geen bijzaak

- **Geen enkel aanraakvlak onder 44px.** De app zit nu op 46 tot 50. Dat is
  gecontroleerd en gerepareerd; laat het niet terugglijden.
- De zorgmodule is de maatstaf: voorleesknoppen van 48px waarmee iemand zijn telefoon
  aan een arts kan laten horen, en alarmnummers als echte `tel:`-links.
- Gewone taal, geen jargon, geen machinevelden in beeld: "2026-03" is fout, "in maart
  2026" is goed.
- Elke lange kop moet kunnen afbreken. Geen vaste kolombreedte naast een lang woord.
- `text-wrap: pretty` op lopende tekst, `line-height: 1.8em` alleen daar — niet op
  labels, knoppen, lijstitems of de tabbalk.

## 4. Testen op een echt toestel

Niet in een smalle browser. Rapporteer per punt wat je ziet:

- iframe-modules: werkt aanraakscrollen langs het paneel heen (er ligt bewust een
  transparante laag overheen)
- tabbalk versus de systeembalk van iOS en Android (`safe-area-inset`)
- de postcodevraag: verschijnt hij één keer, en onthoudt "Later" zich echt
- toevoegen aan het beginscherm: manifest, pictogram, opstartscherm
- de voorleesknoppen in Zorg: werkt `speechSynthesis` met `fr-FR`, en blijft de zin
  leesbaar als er geen stem is
- de energie-intake na §1: zeven vragen achter elkaar op een telefoon van 5 jaar oud

---

## De veertien modules

**Aankomen** — Nedergids (in bouw) · Correspondentie (bron onbekend)
**Wonen** — Veiligheid & natuur (deels af) · Klussen & verbouwen (inhoud af) ·
Vastgoed & huis kopen (af) · Energie & verwarming (**motor af, schil ontbreekt — §1**)
**Geld** — Financieel kompas (af) · Sociale heffingen De Ruyter (af) ·
Erfrecht & schenking (inhoud af) · Vastgoed transactiekosten (af)
**Leven** — Taalassistent (gebouwd) · Ouder worden & zorg (af) ·
Verenigingen & agenda (te smeden) · Auto & mobiliteit (te smeden)

Wat níét gebouwd hoeft te worden:

- **Notariskosten** is vervallen; `Vastgoedtransactie` doet hetzelfde en meer.
- **Correspondentie** wacht op toegang tot de private repo `briefhulp-fr`.
- **Verenigingen & agenda** en **Auto & mobiliteit** worden nog uit losse repo's
  gesmeed; laat ze `info` tot de redactie de bronnen aanwijst.
- **Zorg** heeft nog een reporkeuze nodig van de redactie voor de uitgebreide versie;
  de noodschil die er staat is af.

Nog niet ingedeeld en dus geen werk voor nu: Plus-Value-Calculator, de technische checks
(asbest, put, recht van overpad) en de makelaardijglossary — die laatste wordt
vermoedelijk een hoofdstuk in de Taalassistent, niet een eigen module.

---

## Klaar is deze ronde als

1. Energie rekent echt, uit `engine/`, met de herkomst van de getallen zichtbaar, en
   `engine/` is ongewijzigd.
2. `/api/actueel` levert live gegevens met een allowlist-CORS-header, en de terugval
   werkt nog.
3. `CLAUDE.md`, `README.md` en `PROMPTS.md` beschrijven de app die er staat, en
   `BOUWOPDRACHT.md` staat in de repo.
4. Over `data/feiten.json` en `data/streek-verhalen.ts` ligt een rapport, geen
   improvisatie.
5. Het forum is een leesscherm zonder inlog, en er ligt een rapport over wat de
   Ning-API werkelijk vrijgeeft. Over de abonnementsstatus (§5) en de adresanalyse (§6)
   liggen voorstellen, geen implementaties op aanname.
6. Geen aanraakvlak onder 44px, geen machinedatum in beeld, geen getal zonder bron.
7. `main` bevat de eindtoestand. Geen open branches, geen merge-stappen voor de
   opdrachtgever.

## En tot slot: waar je moet stoppen en vragen

Bij twijfel over inhoud — een bedrag, een termijn, een wetsartikel, welk repo de bron is
— stop en vraag. Deze app wordt gelezen door mensen die op grond van een getal een huis
kopen of hun zorg regelen. Een eerlijk "dit weten we nog niet" is hier altijd beter dan
een goed geraden antwoord.
