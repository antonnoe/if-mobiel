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

Open: branches in nlfr-menu handmatig verwijderen; Klussen-zoekindex wacht op CORS-header aan de WordPress-kant; zzpplatform roept Gemini vanuit de browser aan met een sleutel (nakijken); de gouden vector is dezelfde geometrie als de bronzen.

## Ronde 23-10-2026

Bouwer 1 (besluiten 1, 5 en 6).

| Besluit | Wat | Status |
|---|---|---|
| 1 Gezondheid | Noodblok en "Nu al regelen" als brede tegels, zes fasen als tegels (2 kolommen), hulpmiddelen als kleine tegels; een tik opent de hoofdstukken als lijst (`gzLijst` in state, terugknop in de kop sluit de lijst). Indeling blijft uit `modules.json` (`gezondheid`) | klaar |
| 1 Ondernemen | Vier stappen als tegels met telling uit de data (artikelen, tools); een tik opent artikelen en tools als lijst (`onStap` in state) | klaar |
| 5 Postcode | [i]-knop (44px) in het postcodeblad; klapt de toepassingen en de privacyregel uit. Dit blad is de enige plek waar de app om de postcode vraagt (eerste start, Profiel, regio, Veiligheid & natuur). Nieuw: "Postcode wissen" in Profiel, want de tekst belooft wissen | klaar |
| 6 Over ons | Scherm volgens OverOns.dc.html. "Lees het volledige manifest" roept `openInfoArtikel(url)` aan; die opent nu een nieuw tabblad. Bouwer 2 hoeft alleen de inhoud van die ene functie te vervangen | klaar |

Afwijkingen van de mock-up: (a) de postcodetekst noemt alleen wat de app echt doet (Nedergids noemt het departement, regiokaart en zoekers zeggen welk departement u opzoekt; de app filtert niet); (b) Bronnen staat als kleine tegel bij de hulpmiddelen, omdat het een hoofdstuk is dat niet in de mock voorkomt; (c) Over ons houdt onder de mock-inhoud de Kennispiramide, de bronnenlijst en de disclaimer, zodat die niet onbereikbaar worden; (d) de functie heet `openInfoArtikel`, want `tests/nieuws.test.mjs` verbiedt de naam `openArtikel`.
