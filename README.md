# Infofrankrijk Mobiel

Mobiele app-schil voor Infofrankrijk. Prototype.

**Eigenaar:** Anton Noë / Infofrankrijk.com / Communities Abroad

## Bestanden

| Bestand | Functie |
|---|---|
| `index.html` | De hele app: inlog, hub (3 weergaven), dossier, modules, account |
| `support.js` | Runtime (React-binding, template-engine) |
| `engine/` | Rekenmotor EnergiePortaal — ONGEWIJZIGD uit antonnoe/energieportaal |
| `Bosbranden Mobiel.html` | Brandrisico-module, ingesloten via iframe |

## Draaien

Statische bestanden, geen buildstap. Lokaal:

    npx serve .

Vercel: importeer de repo, geen instellingen nodig.

## Architectuur

De app is een schil. Twee soorten inhoud:

1. **Artikelen** — bedoeld om automatisch uit Infofrankrijk.com te komen
   (verborgen categorie voor inclusie, gewone categorieën voor de dossierindeling,
   excerpt + featured image voor de tegels). Nog niet aangesloten.
2. **Modules** — interactieve tools met een eigen mobiele vorm. De rekenlogica
   wordt hergebruikt, alleen de UI is per platform anders. Zie Energie-portaal.

## Energie-portaal

7 vragen → `applyArchetype()` vult de veertig velden met 3CL-DPE-forfaits →
`computeResults()` + `computeDPE()`. Eén rekenmotor, twee schillen: bij een
wijziging in de engine hoeft alleen `engine/` te worden bijgewerkt.

## Nog te doen

- Authenticatie tegen Infofrankrijk (tools zitten achter de paywall)
- Feed aansluiten (WP REST API, niet RSS — excerpt en featured image nodig)
- DossierFrankrijk-koppeling: de opslaan-URL is nu een aanname
- Belastinggids als tweede module
