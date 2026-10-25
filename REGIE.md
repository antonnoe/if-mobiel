# REGIE

## Ronde 20-10-2026

| Taak | Repo | Commit | Status |
|---|---|---|---|
| Alle reacties ophalen (paginering via slug uit redirect-URL) | nlfr-berichten | 747f14f | klaar, live getoetst (28/28, 44/44) |
| Foto's in berichten en reacties (velden `html`, `afbeeldingen`) | nlfr-berichten, if-mobiel | 747f14f, a961ed0 | klaar, live getoetst |
| HTML-entiteiten in namen (No&euml) | nlfr-berichten | 747f14f | klaar, live getoetst |
| Twee lege iframe-aanroepen bij opstarten | if-mobiel | a961ed0 | klaar, live getoetst |
| Briefhulp (Correspondentie) en TaalHulp als tegels in groep leven | if-mobiel | a961ed0 | klaar; prijs Correspondentie op gratis gezet, besluit opdrachtgever |
| Scrollen formulier op Android | financieel-kompas-ai | 0cecbf4 | klaar, getoetst op 390x700; nog niet op een echt toestel |
| infopoche.fr aan Vercel | DNS TransIP | n.v.t. | klaar, https live, www stuurt door |

## Open uit reiskeuring

- Foto's niet te vergroten; links in berichten niet aanklikbaar; draad heeft geen eigen URL.
- Dubbele tegels op Hub en Taal-tab.
- Briefhulp: AI-voorzin in de brief, Testmodus zichtbaar, grammaticafout in uitleg.
- Financieel Kompas: app zegt bedragen alleen met abonnement, tool toont ze gratis.
- Eenmalige CORS-fout bij eerste laadronde van /api/berichten, niet herhaald.
- Inloggen en reageren vanuit de app: geparkeerd tot NLFR V2 (besluit 21-10-2026). Geen NING-inlog bouwen; bij de overstap zet Infopoche de forumbron om naar V2 en logt in via account.infofrankrijk.com.

## Ronde 21-10-2026

| Taak | Commit | Status |
|---|---|---|
| Foto's met onderschrift op hun plek in de tekst, aanklikbare links | nlfr-berichten 42b40e3, if-mobiel 43c6109 | klaar, live getoetst |
| Actueel als eigen tab, redactieartikel in de app | if-mobiel 4453119 | klaar, live getoetst |
| DossierFrankrijk-tegel (knop, abonnee) | if-mobiel 4453119 | klaar |
| Elf gekozen tools plus Bosbranden-kaart in Veiligheid & natuur | if-mobiel d78317a | klaar |
| Moestuin laat infopoche.fr toe in frame-ancestors | moestuin-fr 6b38490 | klaar |
| Mijn modules (veld standaard, ifm_modules) plus elf extra tools standaard uit | if-mobiel 63d3ee5, ff52687 | klaar, live getoetst |
| Iframe vult exact de ruimte tussen kop en tabbalk | if-mobiel 63d3ee5 | klaar, getoetst 360x640 tot 390x844 |
| Disclaimer-modal Briefhulp scrolt in kader | briefhulp-fr ab1c849 | klaar, getoetst 360x640 |

Open: Dossier elektriciteit is nog redactie-exemplaar; Briefhulp toont AI-voorzin en Testmodus; Financieel Kompas tegenstrijdig over wat gratis is; dubbele tegels op Hub en Taal-tab; draad zonder eigen URL.

## Ronde 22-10-2026: hub met negen themategels

| Taak | Repo | Commit | Status |
|---|---|---|---|
| Hub 3x3, thema-indeling in modules.json, AI-tools, Mijn dossier met demodossier, Tom Polak taalarchief verwijderd | if-mobiel | c0c72dc | klaar, live |
| Wonen wordt La Maison, indeling uit la-maison.json | if-plek 3cb3250, if-mobiel 9470e83 | | klaar, live |
| Gezondheid: noodblok, Nu al regelen, zes fasen, tools, dossier live geladen | if-mobiel | a46760b | klaar, live; Zorglexicon In ontwikkeling |
| Nieuws: themategels, doorlopende pagina, nieuwsstrook | if-mobiel | a35476f | klaar, live |
| Thema zorg in de nieuwsstroom | nlfr-menu | e3e22b4 (branch zorg-thema) | NIET op main: repo-regel eist statuscheck "npm test"; merge via pull request is aan de opdrachtgever |

Open: merge zorg-thema; Dossier DossierFrankrijk-repo is privé en niet geraadpleegd (demo-opbouw is eigen indeling); Taalassistent en TaalHulp staan op In ontwikkeling.

## Ronde 22-10-2026 (tweede)

| Taak | Repo | Commit | Status |
|---|---|---|---|
| Logo's vector en iconen | if-mobiel | dc5cbf4 | klaar, live |
| Landing, service worker, manifest, QR | if-mobiel | 44e3a4f | klaar, live; niet op echt toestel getest |
| Hub in kleur, begroeting, regiokaart, vijf tabs, Source Serif 4 | if-mobiel | a159079, 0f701ac | klaar, live |
| Ondernemen als route, veld ook, omschrijvingen | if-plek 47332c1, if-mobiel c264883 | | klaar, live |
| AI-tools-scherm, forum-leeslink, Klussen-zoekindex, demodossier Zorg | if-mobiel | 46d5f26, 0991805 | klaar, live |
| Thema door het model, zorg, reviewtool | nlfr-menu | PR 59, d486804 | gemerged; branches zorg-thema en thema-door-model niet te verwijderen (403) |

Open: branches in nlfr-menu handmatig verwijderen; Klussen-zoekindex wacht op CORS-header aan de WordPress-kant; de gouden vector is dezelfde geometrie als de bronzen.

## Ronde 23-10-2026

Bouwer 1 (besluiten 1, 5 en 6).

| Besluit | Wat | Status |
|---|---|---|
| 1 Gezondheid | Noodblok en "Nu al regelen" als brede tegels, zes fasen als tegels (2 kolommen), hulpmiddelen als kleine tegels; een tik opent de hoofdstukken als lijst (`gzLijst` in state, terugknop in de kop sluit de lijst). Indeling blijft uit `modules.json` (`gezondheid`) | klaar |
| 1 Ondernemen | Vier stappen als tegels met telling uit de data (artikelen, tools); een tik opent artikelen en tools als lijst (`onStap` in state) | klaar |
| 5 Postcode | [i]-knop (44px) in het postcodeblad; klapt de toepassingen en de privacyregel uit. Dit blad is de enige plek waar de app om de postcode vraagt (eerste start, Profiel, regio, Veiligheid & natuur). Nieuw: "Postcode wissen" in Profiel, want de tekst belooft wissen | klaar |
| 6 Over ons | Scherm volgens OverOns.dc.html. "Lees het volledige manifest" roept `openInfoArtikel(url)` aan; die opent nu een nieuw tabblad. Bouwer 2 hoeft alleen de inhoud van die ene functie te vervangen | klaar |

Afwijkingen van de mock-up: (a) de postcodetekst noemt alleen wat de app echt doet (Nedergids noemt het departement, regiokaart en zoekers zeggen welk departement u opzoekt; de app filtert niet); (b) Bronnen staat als kleine tegel bij de hulpmiddelen, omdat het een hoofdstuk is dat niet in de mock voorkomt; (c) Over ons houdt onder de mock-inhoud de Kennispiramide, de bronnenlijst en de disclaimer, zodat die niet onbereikbaar worden; (d) de functie heet `openInfoArtikel`, want `tests/nieuws.test.mjs` verbiedt de naam `openArtikel`.

Bouwer 2 (besluiten 3, 4, 7, 8 en 9).

| Besluit | Wat | Status |
|---|---|---|
| 7 Artikelscherm | `openInfoArtikel(url)` opent infofrankrijk.com-artikelen in de app (`artikel-lib.js`, REST posts dan pages, opgeschoonde DOM, terugstapel, delen, "Op infofrankrijk.com", zacht falen met nieuwe poging). Rijen in Ondernemen en La Maison en nieuwsbronnen met een infofrankrijk.com-link openen in de app (`data-art`, pijltje wordt ›) | klaar |
| 8 Betaalmuur | `knipBijMuur`: bij `pms-`-klassen of -tekst alleen de inleiding plus het abonneeblok als muur; vastgelegd in CLAUDE.md, getest | klaar |
| 9 Forumknop | titel, samenvatting en link naar het klembord, dan nederlanders.fr/profiles/blog/new; melding alleen bij gelukt kopiëren, anders de tekst om zelf te kopiëren | klaar |
| 3 Abonneeblok | vast blok onder de uitkomst van De Ruyter en onder een gelezen artikel; link uit `modules.json` (`abonnement.url`) | klaar |
| 4 Onderblad | tekst letterlijk, hooguit eens per week (`ifm_abo_vraag`) en eens per sessie, "Niet nu" en kruisje, na De Ruyter-uitkomst, Energie-berekening of einde artikel | klaar |

Afwijkingen: (a) kop van het artikelscherm zegt "Artikel / Van Infofrankrijk" en er is geen themaregel boven de titel, omdat de REST-velden geen rubriek geven; (b) de forumtekst in de mock ("staan al klaar") is eerlijker gemaakt: ze worden gekopieerd en u plakt ze; (c) het vaste blok staat niet onder Zorg (noodschil), Vastgoed (stappenschil, geen uitkomst) en Energie (heeft al een eigen abonnee-muur met knop); (d) iframe-tools (Financieel kompas e.d.) kunnen niets terugmelden, daar komt geen blok of onderblad; (e) de week- en sessieregel gelden ook voor abonnee-tools, omdat de voetregel "hooguit eens per week" anders niet klopt; (f) in artikelen zonder muur staat het abonneeblok onder het delen-blok, niet ertussen.

Open: de echte markup van de afschermingsmelding van Paid Member Subscriptions is niet te zien zonder een afgeschermd artikel; de herkenning (`pms-`) is getest op voorbeelden. Controleer één afgeschermd artikel live.

Bouwer 3 (besluiten 2 en 10).

| Besluit | Wat | Status |
|---|---|---|
| 2 Nieuws met themabeeld | Overzicht volgens Nieuws.dc.html: filterchips per tegel, eerste bericht groot met banner, rest als lijst met beeld van 76 px (nieuwste 25 bij Alles). Koppeling thema naar kleur en pictogram als data (`nieuwsBeeld` in modules.json), neutrale terugval, uniek patroon-id per item | klaar |
| 10 Schermovergangen | `document.startViewTransition` rond schermwissels (180 ms), terugval zonder API getest | klaar |
| 10 Beweging | `prefers-reduced-motion`: geen overgangen, geen animaties | klaar |
| 10 Grotere tekst | Schakelaar in Profiel (`ifm_grote_tekst`), CSS zoom 1,18 op kop, scherm, tabbalk en bladen | klaar |
| 10 Grote systeemtekst | Getest op 390x844 met alle tekst x2 (hub, nieuws, lezen, Profiel), met en zonder Grotere tekst: geen horizontaal scrollen; Profielrijen kregen flex-wrap, titels overflow-wrap | klaar |

Afwijkingen: (a) de chips zijn 44 px hoog aangeklikt (zichtbaar 36 px), vanwege de regel hittargets; (b) de tegelkoppen "Kies een onderwerp" zijn vervangen door "Tik op een bericht...", omdat de oude tegels er niet meer zijn; (c) tik op een bericht opent de doorlopende leespagina van zijn onderwerp op dat bericht; (d) onderwerp-tegels en hun aantallen zijn vervangen door chips; (e) op 195 px breedte (200% paginazoom) is de app niet getest als in-bereik: de app is ontworpen op 390 px.

## Herstelronde 1 (23-10-2026)

Bouwer herstelronde 1, naar aanleiding van de bevindingen van de keurders. Details in CLAUDE.md, sectie "Terugknop, hash-routes, zoeken in artikelen, forumblad".

| Punt | Wat | Status |
|---|---|---|
| 1 Eindeloze spinner | oorzaak: de `.catch` in `artLaad` las `this.state` voordat de `setState` van `openInfoArtikel` (View Transition-wachtrij) verwerkt was. Nu laadtoken (`IfNav.maakTeller`) plus functionele `setState`. Getest in Playwright: `route.abort`, HTTP 500 en offline, alle drie direct na openen | klaar |
| 2 Terugknop en hash-routes | `pushState` per schermwissel en blad, `popstate` doet de stap van de pijl; `#/artikel/<slug>`, `#/nieuws`, `#/forum`, `#/profiel`, `#/zoek`; onbekend valt terug op de hub; delen deelt de infopoche-link plus bron | klaar |
| 3 Zoeken in artikelen | sectie "Artikelen op Infofrankrijk" via de WordPress zoek-API, debounce, zacht falen | klaar |
| 4 Forumknop | blad met uitleg, aparte knop "Open Nederlanders.fr", terugval met zelf te selecteren tekst; ook op nieuwskaarten; geen abonneeblad in dezelfde sessie | klaar |
| 5 Beloftes | noodtegel zonder "en wie u belt"; hubregel "Met uw postcode noemt de app uw departement" | klaar |
| 6 Scroll | nieuw scherm bovenaan, terug herstelt de stand | klaar |
| 7 Postcode | voorbeeld "bijv. 24200" lichter, "Postcode wissen" donkerder (#3D4346) met "Postcode gewist" en "Ongedaan maken" | klaar |

Tests: `tests/nav.test.mjs` (hash-route, sleutels, laadtoken, zoek-URL en treffers); `tests/artikel.test.mjs` aangepast aan de nieuwe forumtekst. Gecontroleerd met headless Chromium op 390x844 en 360x640.

## Herstelronde 2 (23-10-2026)

| Punt | Wat | Status |
|---|---|---|
| 1 Time-out | `haalOp` (artikel-lib.js) heeft een tijdgrens van 15 s (AbortController plus race, `opt.timeout` voor tests); daarna de bestaande foutmelding met "Opnieuw proberen" en siteknop. Artikelzoeken (wp/v2/search) kreeg dezelfde 15 s. Test in `tests/artikel.test.mjs` | klaar |
| 2 Postcodeblad | opent de app met een blad (eerste start), dan is geschiedenisregel 0 de hub zonder blad en regel 1 het postcodeblad; terug sluit het blad en de hub blijft | klaar |
| 3 Consolefouten | oorzaak: een `<path d="{{ }}">` in de template wordt bij het parsen van de pagina als echt SVG-pad gelezen. Het themabeeld op het nieuwsscherm is nu een achtergrondafbeelding (data-URI-SVG, zelfde tekening) via `nwHero.bgGroot` en `r.bgKlein`; geen consolefout meer | klaar |

Gecontroleerd met headless Chromium op 390x844: hangend verzoek geeft na ca. 15 s de foutmelding, eerste bezoek plus terug sluit het postcodeblad, geen consolefouten bij hub en nieuws (alleen de CORS-melding van de externe berichten-API op localhost).

## Ronde 2 (23-10-2026)

Bouwer bouwronde 2, naar de opdracht van de opdrachtgever. Details in CLAUDE.md, sectie "Gezondheid in twee niveaus, toolkaart, veld artikel en drempel".

| Onderdeel | Wat | Status |
|---|---|---|
| A Gezondheid breder | Eerste niveau met intro, spoedblok (`tel:15`), zes onderwerptegels en Hulpmiddelen; lijst per onderwerp met artikelen in de app en modules; Ouder worden en zorg opent het bestaande dossierscherm een niveau dieper; terug via geschiedenis | klaar |
| B1 Toolkaart | iframe in een artikel wordt een kaart (module in de app, externe tool of video), alleen https; Divi-shortcodes uit REST-inhoud gehaald | klaar |
| B2 Veld `artikel` | zeven modules gevuld; tegel of rij naar het artikel opent de tool, de tool heeft de rij "Lees de uitleg op Infofrankrijk" | klaar (zeven van veertien: zie afwijkingen) |
| B3 Framing | plus-value-calculator staat op weergave `knop` (nieuw tabblad) | klaar |
| C Abonnee-labels | vijf modules op `gratis`, veld `drempel` in de catalogus en `_uitleg`, alinea 3 van het onderblad weg, vaste abonneeblok zonder exclusieve toegang | klaar |

Afwijkingen: (a) zeven van de veertien tool-hosts hebben geen module in `modules.json` (dashboard-admin-beige-ten, werk-in-frankrijk-platform-v02, energieportaal-pbuv, briefhulp-fr, vastgoed-analyse-v84x, infofrankrijk-klussen-archief, controle-technique-zoeker); er is geen module bijgemaakt, hun iframe wordt een externe toolkaart; (b) de module `correspondentie` wijst met zijn url naar het artikel zelf, dus is er geen `artikel`-veld gezet (dat zou een kring geven); (c) het knipblok "Wat er gratis is" en de muur om de eigen uitkomst in Energie volgen nu `prijs` en zijn bij `gratis` weg, anders beloven ze een abonnement dat niet meer nodig is; Café Claude is niet aangeraakt; (d) het onderblad na een berekening in Energie blijft bestaan (`abonneetool`), omdat de regel in `IfAbonnee` blijft; (e) de Hulpmiddelen op het eerste niveau laten `zorg` en `zorglexicon` weg (data: `hulpmiddelen.uitsluiten`).



## Herstelronde ronde 2 (23-10-2026)

Negen punten na bouwronde 2: exclusiviteitsteksten weg, Bel 112 naast Bel 15, onderblad niet meer na een artikel, tabbladen in artikelen naar koppen, toolpagina voor artikelen die alleen een tool zijn, correspondentie (briefhulp) en financieel kompas volledig in de app, forumblok op een regel, zoekvolgorde modules, artikelen, taal. Tests: tests/herstel3.test.mjs plus aangepaste ronde2 en themas. Gecontroleerd met headless Chromium op 390x844 en 360x640 tegen een lokale server.

## Laatste herstel ronde 2 (23-10-2026)

Forumblok onder een artikel is één knop "Bespreek dit op het forum Nederlanders.fr" (geen kaart meer); tekst bij Energie belooft geen bedragen meer voor abonnees. Keuring na 5ae3762: 7 van 9 geslaagd, deze twee hersteld.

## Ronde 24-10-2026

Zes modules erbij en een noodregel op de hub. Details in CLAUDE.md, sectie "Ronde 24-10-2026".

| Onderdeel | Wat | Status |
|---|---|---|
| 1 Zes modules | Beroepenchecker, EnergiePortaal (volledige site), Vastgoed-analyse per adres, Uit het klusforum, Controle technique-zoeker, Franse overheden bij u in de buurt; standaard uit, gratis, veld `artikel`, omschrijvingen uit de live tools | klaar |
| 2 Noodregel hub | "Spoed? Bel 15 (Samu) of 112" met Bel 15 en Bel 112 (tel:, 44 px), uit `gezondheid.spoed` | klaar |

Framing: alle zes staan het toe (geen beperkende headers; energieportaal en controle-technique-zoeker sturen `frame-ancestors *` en `ALLOWALL`), dus `volledig`. Het klusforum vraagt inloggen met Google; daarvoor staat een `let`-regel in de module. Gecontroleerd met headless Chromium op 390x844 en 360x640: noodregel zichtbaar met twee knoppen van 44 px, Mijn modules toont de zes, aanzetten werkt, alle zes artikelen tonen "Tool in de app", een zoekresultaat opent de tool. Bestaande tests ronde2 en themas aangepast aan de nieuwe modules.

Klusforum op weergave knop: de tool vraagt Google-inlog, dat werkt niet betrouwbaar in een iframe.

## Ronde 24-10-2026 (2): Taal

Besluit opdrachtgever: Taalassistent en Zorglexicon vervallen; thema Taal heeft drie onderdelen die elkaar niet overlappen.

| Onderdeel | Wat | Status |
|---|---|---|
| 1 Export | Inhoud Taalassistent als JSON buiten de repo (4 situaties, 12 fases, 36 zinnen, 23 woorden, 12 tips) als kandidaat-materiaal voor het woordenboek | klaar |
| 2 Catalogus | Modules `taal` en `zorglexicon` weg; `woordenboek` ("Woordenboek met uitleg", iframe `volledig`, in ontwikkeling) erbij en gekoppeld aan Gezondheid, onderwerp "Woorden bij de dokter" | klaar |
| 3 Code | Schermen `taal` en `lex`, situatiedata, Groot tonen, zoekhits (situatie, zin, situatiewoorden), kopteksten, strip-regels, terugstap/histToestand-sleutels weggehaald | klaar |
| 4 Tests | Alle tests groen (141); nieuw `tests/ronde5.test.mjs`; headless Chromium 390 px: hub, Taal (drie onderdelen), Woordenboek-iframe, Forum, Nieuws, Zoeken, Gezondheid, geen pageerror, geen horizontale scroll | klaar |

Afwijkingen: de Taalassistent-subtab in Forum en de elf niet-gebouwde situatietitels stonden al niet meer in de code (geen dode regels meer te verwijderen). De knop "Later, naar de gratis onderdelen" op de Energie-muur opende het taalscherm en opent nu het themascherm Taal. Zoektekst noemt geen "zinnen" meer.

## Ronde 25-10-2026: menu, tabbalk, logo, letters, Mijn lijstjes

Besluiten van Anton (elk is een eis):

1. Tabbalk wordt Home, Zoeken, Modules, Forum, Nieuws; Profiel zit in het hamburgermenu; Modules opent Alle modules (`mod`); `tabVan`: `mod` en `keuze` markeren Modules, `acc` en `over` geen tab.
2. Hamburgermenu rechts in de kopbalk op elk scherm, 46x46, `aria-label="Menu"`, `aria-expanded`, X als open; paneel onder de kopbalk met verduisterde achtergrond; sluit via achtergrond, X, item, terug-gebaar of Escape; achtergrondscroll vast; focus blijft in het paneel; rijen minstens 54 px (nu 56), icoon bordeaux, tekst 16 px; items Profiel, Mijn modules, Over ons, Grotere tekst, Postcode, kaart "Zet op uw beginscherm" (weg als al geinstalleerd), uitlegregel over app sluiten; geen sluitknop. Het hamburgerknopje staat uiterst rechts, de rest schuift ervan af; op 320 px loopt niets over.
3. Het blokje FR wordt het logo: gouden Frankrijk-met-i op navy #0E1A2E, 34x34 (bestaand `icons/logo-goud.svg`); op schermen met Terug-knop blijft de Terug-knop.
4. De badge GRATIS verdwijnt uit de kopbalk; ABONNEMENT en VOORBEELD blijven.
5. Onderregel hub: "Departement NN, plaatsnaam" of "Kennis en ervaring dans la poche"; geen meldingen over berichten in de kopbalk.
6. Tabbalklabels 12,5 px (actief 700); alle schiltekst onder 12 px is minstens 12 px, prijslabels 11,5 px; geen tekst onder 11,5 px.
7. Tabbalk-iconen in dezelfde lijnstijl, Modules een raster van vier vierkantjes; balk ongeveer 74 px; tikvlak minstens 44 px.
8. Module `klussen` heet "Klussen in Frankrijk"; `kort` "Klussen"; geen "KIF" of "Klussen & verbouwen" in zichtbare velden.
9. Nieuwe module "Mijn lijstjes" (`lijstjes`) direct na Klussen, in Wonen, Alle modules, Mijn modules, zoeken en favorieten.
10. Niet in deze ronde: Over ons (apart), installatie-aansporing (volgende bouwer), AI-samenvatting, Mijn dossier-wijzigingen.

Stand: alle negen punten gebouwd en getest met headless Chromium op 390x844 en 320x640 (hub, menu open, Profiel, Alle modules, Mijn modules, Taal, thema's, tool met Terug en In browser); `node --test tests/*.test.mjs` 150 van 150 (nieuw: `tests/ronde6.test.mjs`). Opslagtest Klussen en Mijn lijstjes: zie terugmelding in de bouwlog (zelfde partitie bevestigd). Service worker `VERSIE` 2026-10-25-1.

Afwijkingen: (a) `mod` heeft geen Terug-knop meer maar het logo, omdat het nu een tab is; (b) `piramide` (via Over ons) markeert geen tab meer; (c) hash-route `#/modules` erbij; (d) de iframe-inhoud van Mijn lijstjes toont zelf nog "KIF-lijstjes" (site infofrankrijk.com, buiten de app); (e) op 320 px wordt de titel bij tools met "In browser" afgekapt met ellipsis ("Mijn lijs...").

## Ronde 25-10-2026 (2): sterk aansporen om te installeren

Besluit van Anton (optie B): sterk, ja, "heel sterk", maar nooit blokkerend; de lezer kan altijd doorgaan in de browser. Kern: geinstalleerd = standalone, dan verschijnt niets van de aansporingen.

| Punt | Besluit | Status |
|---|---|---|
| 1 Startscherm | Landing bij elke nieuwe browsersessie (sessionStorage `ifm_landing_sessie`), niet meer 14 dagen weg; "Verder in de browser" is een kleine tekstlink; oude `ifm_landing_tot` genegeerd | klaar |
| 2 Gedeelde links | Route-hash naar inhoud: geen landing, wel de balk | klaar |
| 3 Balk | Bordeaux balk onder de kopbalk met "Hoe?" en sluitknop 44 px (`ifm_install_balk_weg`) | klaar |
| 4 Installatieblad | Per toestel, een gedeelde bron in `landing-lib.js` (`blokHtml`), `window.__ifmInstallEv` vroeg gevangen | klaar |
| 5 Automatisch | Eenmaal per sessie na het eerste nuttige resultaat (`ifm_install_blad_getoond`), gaat voor het abonneeblad | klaar |
| 6 Hamburger | Kaart bovenaan, opent het blad; geinstalleerd: regel "App is geïnstalleerd" | klaar |
| 7 Iframe | `allow="clipboard-write; web-share"` | klaar |
| 8 Geen blokkade | Alles sluitbaar | klaar |
| 9 Service worker | VERSIE 2026-10-25-2 | klaar |

Afwijkingen: (a) de opdracht zegt voor geinstalleerd zowel "het hamburgerkaartje wordt App is geïnstalleerd" als "geen kaart"; gekozen is een rustige regel zonder kaartopmaak; (b) de bordeaux balk is een groot volvlak, een bewuste uitzondering op de huisstijlregel; (c) het voorvertoning-iframe heeft geen `allow` en is niet aangepast.

## Herstelronde 1 na keuring (25-10-2026)

| Punt | Besluit | Status |
|---|---|---|
| 1 Streepjes | Alle em- en en-dashes uit zichtbare tekst (index.html buiten Over ons, modules.json, landing-lib.js); test in `tests/herstel1b.test.mjs`; `piramide.json` blijft bij de Over ons-ronde | klaar |
| 2 Postcodeblad | Niet meer automatisch; via tegel op Home en menu; sluit met X (44), buiten tikken, Escape; uitleg een zin | klaar |
| 3 Desktop | Geen balk en geen automatisch blad bij min-width 900 en pointer fine; landing met QR en menukaart blijven | klaar |
| 4 App sluiten | Nieuwe uitleg in menu en onderaan Profiel | klaar |
| 5 zoekschil | Kopbalk toont alleen de themanaam | klaar |
| 6 Tab actief | `tabVan("tool")` is Modules | klaar |
| 7 Artikelresultaten | Procent-gecodeerde slugs openen in de app; zonder slug "Op infofrankrijk.com ↗" in het resultaat, nieuw tabblad | klaar |
| 8 Kleine dingen | Wis-kruisje en bladkruisjes 44x44; balk blijft onder open blad | klaar |

Service worker VERSIE 2026-10-25-3.

## 25-10-2026: ZZP-boekhoudplatform verwijderd (derde partij)
De module `zzpplatform` (financieel-kompas.vercel.app) is volledig uit de catalogus, tests en notities gehaald. Die site is niet van Anton: de code zegt "Onderdeel van Spectux IT Solutions" (spectux.com) en Anton heeft er geen rechten op. Regel voor de catalogus: een module komt er alleen in als Anton bevestigt dat de tool van hem is of dat hij een licentie heeft; de URL of de naam van een Vercel-project is daarvoor geen bewijs.
