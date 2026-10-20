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
- Reageren vanuit de app: NING 2.0-API leeft (401 zonder sleutel), nieuwe sleutel "infopoche" nodig.
