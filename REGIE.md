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

Open: installatievenster Tom Polak in kader; Dossier elektriciteit is nog redactie-exemplaar; Briefhulp toont AI-voorzin en Testmodus; Financieel Kompas tegenstrijdig over wat gratis is; dubbele tegels op Hub en Taal-tab; draad zonder eigen URL.
