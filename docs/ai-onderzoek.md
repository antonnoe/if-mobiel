# AI-onderzoek per module (22-10-2026)

Dit bestand is geen onderdeel van de app. Het legt vast waarom een module in het scherm AI-tools staat (veld `ai` in `modules.json`) en waarom niet. Methode: de live HTML en de gekoppelde scripts van elke tool zijn opgehaald (curl) en doorzocht op aanroepen van `/api/chat`, `/api/generate-*`, anthropic, openai, gemini, "AI", "Claude", "gegenereerd door", streaming; daarnaast is gelezen wat de tool over zichzelf zegt. Waar de bronrepo privé is, is alleen de live site gebruikt.

Regel: alleen vastgesteld AI komt erin. Kon het niet worden vastgesteld, dan staat de tool er niet in.

## Erin

### cafeclaude (tool)
- URL: https://cafeclaude.fr/app
- Bewijs: titel "Café Claude — AI voor Nederlandstaligen in Frankrijk"; script bevat `/api/chat`, AI SDK met streaming (`text/event-stream`) en de tekst "Dit antwoord is gegenereerd door AI en vervangt geen professioneel advies (expert-comptable, notaris of advocaat)."
- Indeling: tool (geeft zelf antwoord).

### correspondentie (ondersteuning, schrijven)
- URL: https://infofrankrijk.com/correspondentie-assistent/ (iframe naar https://briefhulp-fr.vercel.app/)
- Bewijs: `app.js` roept `fetch("/api/generate-brief")` aan en toont "Geverifieerde template, de AI vult alleen uw gegevens in, de juridische structuur staat vast" en "Gesloten artikelenset, de AI mag alleen de onderstaande wetsartikelen gebruiken". De pagina op infofrankrijk.com roept `/api/generate-summary` (if-tools-api) aan voor "AI samenvatting" van Franse websites.
- Indeling: ondersteuning (schrijven); de brief staat deels vast, de AI vult in. De uitleg zegt dat de gebruiker de brief zelf nalees.

### kompas (ondersteuning, uitleg)
- URL: https://financieel-kompas-ai.vercel.app/
- Bewijs: de pagina heeft de knop "AI-Toelichter" en een widget (`embed/cc-embed.js`, "cc-embed.js v3, AI-Toelichter Widget") met `apiUrl: /api/chat`. Zonder abonneetoken geeft `POST /api/chat` HTTP 401 "Deze functie is beschikbaar voor abonnees van Infofrankrijk.com" (reason missing_token). Tekst op de pagina: "Gratis: de berekening en de uitkomst. Voor abonnees: opslaan in DossierFrankrijk, PDF en de AI-Toelichter".
- Indeling: ondersteuning (toelichting op een uitkomst die de tool zelf berekent). De uitleg noemt dat de Toelichter voor abonnees is. Niet zelf gebruikt (geen abonnee); het bestaan van het eindpunt en de afscherming is vastgesteld, de inhoud van antwoorden niet.

### nlfrzoek (ondersteuning, zoeken en samenvatten; staat standaard uit)
- URL: https://nlfr-if-zoek.vercel.app
- Bewijs: titel "AI Zoek, Nederlanders.fr & Infofrankrijk.com"; bundel bevat `/api/search` en de tekst "Deze AI-zoek doorzoekt het forum van Nederlanders.fr en de kennisbank van Infofrankrijk.com en vat de best passende bronnen samen. Controleer bij geld- en overheidszaken altijd de datum van de bron." en "De AI-samenvatting is een voordeel voor leden van Nederlanders.fr".
- Indeling: ondersteuning.

### Nieuws (thema `nieuws`, ondersteuning, samenvatten)
- Bron: /api/actueel van nlfr-menu; code in `lib/synthese.js` van nlfr-menu ("AI-synthese van een hot cluster via de Anthropic API"); het label is "Redactie NLFR, automatisch samengesteld, bronnen onderaan" (`REDACTIE_LABEL` in `lib/config.js`). De bronnenlijst wordt uit de echte clusterdata gebouwd, niet uit de modeltekst. Een synthese is eerst een concept in een reviewtool.
- Indeling: ondersteuning (samenvatten). De uitleg zegt "deels met AI samengevat", dat het erbij staat en dat de bronnen onderaan staan; er wordt geen onfeilbaarheid of menselijke controle per bericht beloofd. Dit staat op het thema, niet op een module, omdat Nieuws geen module is.

## Er niet in (geen AI vastgesteld)

| Module | URL | Bevinding |
|---|---|---|
| nedergids | in de app | statische gids uit `modules.json` |
| emigreren | https://antonnoe.github.io/emigreren-naar-frankrijk-beslisboom/ | statische beslisboom, geen fetch |
| veiligheid | https://bosbranden.vercel.app | geen AI-aanroep in de bundel; kaart en gevaarniveaus |
| klussen | https://infofrankrijk.com/klussen/ | artikelen en zoekindex, geen AI; alleen een link naar Café Claude |
| vastgoed, energie, ruyter, zorg | in de app | rekenmotor en vaste inhoud in `index.html` en `engine/` |
| woonplan | https://franse-zoekhulp.vercel.app | pagina zegt zelf: "De AI-assistent komt in V2.0"; nog niet aanwezig |
| internet | https://internetverbinding.vercel.app | alleen geocodering (data.geopf.fr) |
| subsidieroute | https://antonnoe.github.io/energiebesparing-subsidie-en-fiscale-regelingen/ | statisch |
| moestuin | https://moestuin-fr.vercel.app | alleen een verwijzing naar Café Claude |
| erfrecht | https://antonnoe.github.io/erfrecht-en-testament/ | statisch |
| transactiekosten | https://antonnoe.github.io/Vastgoedtransactie/ | statische rekenschil, geen fetch |
| efacturatie | https://e-facturatie-frankrijk.vercel.app | geen `/api/` of AI-tekst |
| taal (Taalassistent) | in de app | vaste zinnen en situaties in `index.html`; geen modelaanroep |
| taalhulp | https://taalhulp-fr.vercel.app | geen enkele fetch; vaste scenario's, fonetiek en begrippen; verwijst alleen naar Café Claude |
| verenigingen | https://antonnoe.github.io/verenigingen-kalender/ | leest JSON-bestanden |
| dossierfrankrijk | https://dossierfrankrijk.nl | opent op een inlogpagina; inhoud niet in te zien en repo is privé: niet vastgesteld, dus er niet in |
| auto | https://fr-auto-import-tool.vercel.app | geen AI-aanroep |
| zorgkompas | https://zorgkompas-frankrijk.vercel.app | geen fetch; alleen een knop naar Café Claude |
| palliatief | https://antonnoe.github.io/Soins-Palliatifs-USP-beschikbaar/ | statisch |
| frankrijklegal | https://frankrijk-legal.vercel.app | geen AI-aanroep |
| plusvalue | https://plus-value-calculator.vercel.app | `/api/generate-pdf` is een pdf, geen model; adres-opzoeking via api-adresse.data.gouv.fr |
| bouwgrond | https://bouwgrond-frankrijk-check.vercel.app | `/api/analyze` geeft Géorisques-gegevens (gecontroleerd met een testaanroep), geen model |
| devisdossier | https://devisdossier-frankrijk.vercel.app | geen fetch, geen AI-tekst |
| huizenchecker | https://franse-huizen-checker.vercel.app | geen AI-tekst |
| gitekompas | https://gitekompas-fr.vercel.app | geen AI-tekst |
| woningzoeker | https://woningzoeker-frankrijk.vercel.app | maakt een tekst ("AI-prompt") om zelf in ChatGPT of Claude te plakken; de tool zelf roept geen model aan |
| dossierelektra | https://dossier-elektriciteit-if.vercel.app | schrijft naar Supabase, geen model |
| zoekers | https://ouderenzorg.vercel.app | geen AI-aanroep |
| zorglexicon | https://antonnoe.github.io/zorglexicon-frankrijk/ | statisch |
| forum | in de app | berichten van nlfr-berichten, geen model |

## Niet vastgesteld
- dossierfrankrijk: zie boven (inlog, privérepo). Staat er niet in.
- kompas: alleen het eindpunt en de afscherming zijn vastgesteld, niet de kwaliteit van de antwoorden.
