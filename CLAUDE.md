# CLAUDE.md — Infofrankrijk Mobiel

Werkinstructies voor Claude Code in deze repo (`antonnoe/if-mobiel`). Lees dit vóór
elke wijziging. Statische mobiele webapp-schil voor Infofrankrijk.com (Nederlanders in
Frankrijk).

## Architectuur (tien regels)

1. Eén app, drie kernbestanden: `index.html`, `support.js`, `Bosbranden Mobiel.html`.
2. `index.html` is géén gewone pagina maar een **Design Component**: een `<x-dc>`-template
   met `{{ }}`-holes plus een logicaklasse `class Component extends DCLogic` in een
   `<script type="text/x-dc">`-blok.
3. `support.js` is de runtime (gegenereerd uit `dc-runtime/`, **niet met de hand bewerken**):
   het bindt de template aan de klasse via React onder de motorkap.
4. Eigen tags sturen de template: `<sc-if value="{{ }}">`, `<sc-for list="{{ }}" as="…">`
   en `<helmet>` voor `<head>`-inhoud. `{{ expr }}` vult tekst, attributen en handlers.
5. Toestand leeft in `state` van de klasse; `setState`/`forceUpdate` hertekenen. Eén scherm
   tegelijk via `state.screen` (`login`, `hub`, `dossier`, `fire`, `tool`, `energie`, `forum`,
   `modules`, `account`).
6. De modulecatalogus staat in de const `G`; het dossier in `SECTIONS`; de feed in `FEEDS`.
   De hub heeft drie weergaven (`variant` A/B/C): Dossiers, Tegels, Index.
7. `renderVals()` bouwt in één keer álle holes voor het actieve scherm; `enVals()` doet dat
   voor het energie-portaal.
8. Modules zijn óf een schil-sjabloon (`kind:"tool"`), óf echt uitgewerkt: brandrisico via
   iframe naar `Bosbranden Mobiel.html`, energie via de rekenmotor in `engine/`.
9. Geen buildstap, geen bundler, geen stylesheet: alle styling staat **inline**. Draaien met
   `npx serve .`; Vercel importeert de repo zonder instellingen.
10. Persistentie in `localStorage` (`fw_state`, `fw_feed`); feed via RSS met demo-fallback.

**Vecht dit patroon niet aan.** Niet naar React/Vue/Tailwind converteren, geen buildstap
introduceren, geen stylesheet toevoegen — zonder expliciete opdracht. Het werkt en het is
de bron van de ontwerpsessie.

## Huisstijl

- **Primaire kleur:** `#800000` (bordeaux), met transparante varianten `rgba(128,0,0,α)`,
  α tussen **0.04 en 0.80**, voor vlakken en accenten.
- **Koppen:** Poppins, gewicht **600**.
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
variant** `rgba(128,0,0,α)` — nooit een groot volvlak bordeaux.

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

- Hittargets minimaal **44px**; mobile-first (canvas ~412px breed).
- Styling inline houden; geen externe CSS/JS toevoegen (fonts via Google Fonts in `<helmet>`
  zijn de uitzondering).
- `support.js` niet met de hand bewerken — het is gegenereerd.
