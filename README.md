# Infofrankrijk Mobiel

Mobiele app-schil voor Infofrankrijk.com — één app waarin de losse tools, dossiers en het
forum van het Infofrankrijk-ecosysteem samenkomen voor Nederlanders in Frankrijk.

**Eigenaar:** Anton Noë / Infofrankrijk.com / Communities Abroad

## Bestanden

| Bestand | Functie |
|---|---|
| `index.html` | De hele app: hub, zoeken, forum, taalassistent, modules, account |
| `support.js` | Runtime (React-binding, template-engine), **gegenereerd, niet met de hand bewerken** |
| `modules.json` | De modulecatalogus: groepen, veertien modules, en per-kind extra's (`vastgoed`, `zorg`, `ruyter`, `nedergids`, `departementen`). Nooit modulegegevens terug in de code zetten |
| `engine/` | Rekenmotor EnergiePortaal — ONGEWIJZIGD uit `antonnoe/energieportaal`, alleen gesynchroniseerd |
| `Bosbranden Mobiel.html` | Brandrisico-module (Leaflet-kaart met Météo-France, feux-foret.gouv.fr, NASA FIRMS, Copernicus). **Op dit moment niet aangesloten**: bij de v3-overzetting ging de module `veiligheid` naar de pagina op nederlanders.fr en bleef dit bestand achter. Weer aansluiten of weghalen is een redactiekeuze — zie "Nog te doen" |
| `kennispiramide.html` | Deelbare losse pagina voor de kennispiramide — een dunne schil die dezelfde module laadt als het scherm in de app, dus geen tweede implementatie |
| `piramide.json` | Alle redactionele tekst van de kennispiramide: zijden, banden, rubrieken, toelichtingen en de bronrangen. Nooit in de pagina zelf |
| `piramide/` | De kennispiramide: `scene.js` (3D-scene, `startPiramide()`/`stop()`), `opmaak.js` (opmaak, gescoopt onder `#pir-wrap`) en three.js lokaal gevendord (zie `THREE-LICENSE`). Alles wordt lui geladen — wie het model niet opent, haalt geen byte binnen |
| `data/` | Twee bestanden zonder actieve gebruiker (`feiten.json`, `streek-verhalen.ts`) — zie "Nog te doen" |
| `BOUWOPDRACHT.md` | De laatste bouwopdracht (ronde 2), leidend voor de openstaande punten hieronder |

## Draaien

Statische bestanden, geen buildstap. Lokaal:

    npx serve .

Vercel: importeer de repo, geen instellingen nodig.

## Architectuur

De app is een schil rond twee soorten inhoud:

1. **Artikelen en berichten** — de Actueel-tab haalt thema-tegels op bij `nlfr-menu`
   (`/api/actueel`: pers, overheid, infofrankrijk, verenigingen) en het forum bij
   `nlfr-berichten`. Beide vallen zacht terug op een voorbeeldlijst als het netwerk of de
   bron faalt.
2. **Modules** — interactieve tools met een eigen mobiele vorm, gedreven door
   `modules.json`. `kind` bepaalt het scherm (`iframe`, `voorbeeld`, `info`, `taal`, `lex`,
   `forum`, `actueel`, `nedergids`, `vastgoed`, `zorg`, `ruyter`, `energie`). De
   rekenlogica van een tool wordt nooit gedupliceerd — alleen de UI verschilt per
   platform. Zie Energie & verwarming.

Zie `CLAUDE.md` voor de volledige architectuur in tien regels, de huisstijl en de
werkregels.

## Energie & verwarming

Zeven vragen → `applyArchetype()` vult de veertig velden met 3CL-DPE-forfaits →
`computeResults()` + `computeDPE()`. Eén rekenmotor, twee schillen: bij een wijziging in
de engine hoeft alleen `engine/` te worden bijgewerkt (in de bronrepo, en vervolgens hier
gesynchroniseerd). Het voorbeeldhuis en de eigen zeven antwoorden zijn gratis; de
bedragen zelf horen bij het abonnement — de knip staat in `modules.json` onder
`energie.knip`.

## Nog te doen

- **Brandgevaar heeft geen bron.** De hub toonde een gevaarniveau uit een ontwerpprop
  (standaard "zeer hoog") met een vast tijdstip erbij — dus permanent alarm, ook buiten
  het seizoen. Dat is verwijderd; de hub toont nu alleen een ingang naar de module.
  Zodra Météo des forêts echt is aangesloten kan het niveau terug (`NIVEAUS` in
  `index.html` staat er nog, met toelichting).
- **`Bosbranden Mobiel.html` is losgeraakt** bij de v3-overzetting (commit `545794d`).
  Weer aansluiten als eigen schil, of laten vallen ten gunste van de pagina op
  nederlanders.fr — redactiekeuze, niet urgent buiten het brandseizoen.

- **Inloggen en abonnementsstatus** — er staat nul aan authenticatie in `index.html`.
  Welk systeem de abonnementsstatus vasthoudt, cookie of token, en of er al een endpoint
  is dat "deze gebruiker is abonnee" beantwoordt, staat open. Zie `BOUWOPDRACHT.md` §5.
- **Drie actualiteitsbronnen samenvoegen** — naast `/api/actueel` liggen verkeersnieuws en
  `infofrankrijk-routecontrole` klaar; onderzocht of ze in één Actueel-scherm passen, nog
  geen implementatie. Zie `BOUWOPDRACHT.md` §2.
- **Adresanalyse zonder iframe** — `vastgoed-analyse` heeft vijf CORS-open endpoints
  (dvf, risques, cadastre, urbanisme, dpe); een eigen scherm in plaats van de huidige
  iframe onder "Zoeken" is onderzocht, nog niet gebouwd. Zie `BOUWOPDRACHT.md` §6.
- **`data/feiten.json` en `data/streek-verhalen.ts`** — ongebruikt in deze repo; horen
  vermoedelijk bij een toekomstige navigatie-assistent (module Auto & mobiliteit, nog "te
  smeden"), verwant aan `antonnoe/navigation`. Redactiebeslissing nog nodig. Zie
  `BOUWOPDRACHT.md` §4.
- **Nedergids v2** — module staat op `status: "in bouw"`, wacht op het adres van de
  gepubliceerde kaart (Supabase + registervalidatie moeten daar eerst staan).
- **Correspondentie** — wacht op toegang tot de private repo `briefhulp-fr`.
- **Verenigingen & agenda / Auto & mobiliteit** — nog uit losse repo's te smeden; de
  redactie moet de bronnen aanwijzen.
- **Zorg (uitgebreide versie)** — de noodschil is af; de uitgebreide versie wacht op een
  reporkeuze van de redactie.
