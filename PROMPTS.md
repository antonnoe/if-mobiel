# Prompts voor Claude Code

Kopieer één prompt per keer, in deze volgorde. Elke prompt is zelfstandig — Claude Code
hoeft niets van de ontwerpsessie te weten. Laat elke stap afronden en testen voordat je
de volgende geeft.

**Voor alle prompts geldt** (Claude Code leest dit uit `CLAUDE.md`, zie prompt 0):
huisstijl #800000 + transparante varianten, Poppins koppen / Mulish body, geen buildstap,
mobile-first, hittargets minimaal 44px, en: de rekenlogica van een tool wordt nooit
gedupliceerd — alleen de UI verschilt per platform.

---

## 0 — Repo leren kennen en CLAUDE.md schrijven

```
Dit is een statische mobiele webapp-schil voor Infofrankrijk.com (Nederlanders in
Frankrijk). Lees index.html, support.js, engine/ en README.md volledig door voordat je
iets wijzigt.

Belangrijk om te begrijpen: index.html is geen gewone HTML-pagina. Het is een
"Design Component" — een template met {{ }}-holes plus een logicaklasse
(class Component extends DCLogic) in een <script type="text/x-dc">-blok, uitgevoerd
door support.js. Styling staat inline, bewust: er is geen stylesheet en geen buildstap.
Vecht dit patroon niet aan en converteer het niet naar React/Vue/Tailwind zonder
expliciete opdracht — het werkt en het is de bron van de ontwerpsessie.

Schrijf daarna een CLAUDE.md met:
- de architectuur in tien regels
- de huisstijl: primair #800000 met transparante varianten (0.04–0.80) voor vlakken,
  Poppins 600 voor koppen, Mulish voor body, pagina-achtergrond #F4F1F0, witte kaarten
  met 1px rand rgba(21,24,26,.10) en radius 16px
- de regel: regelafstand 1.8em geldt voor lopende tekst, NIET voor UI-labels, knoppen,
  lijstitems of de tabbalk
- de regel: volvlak #800000 alleen op kleine elementen (knoppen, badges, logo);
  grote vlakken krijgen een transparante variant
- de regel: engine/ is overgenomen uit antonnoe/energieportaal en wordt hier nooit
  met de hand aangepast — alleen gesynchroniseerd
```

---

## 1 — Artikelenfeed aansluiten op Infofrankrijk.com

```
De app toont nu een demo-feed. Sluit hem aan op de echte WordPress-installatie van
infofrankrijk.com via de REST API — niet via RSS, want RSS levert geen excerpt en geen
featured image.

Endpoint:
  /wp-json/wp/v2/posts?categories=<ID van de verborgen categorie "IF Mobiel">
  &_embed&per_page=30&orderby=modified

Regels:
- De verborgen categorie bepaalt OF een artikel in de app komt.
- De gewone categorieën van het artikel bepalen WAAR het komt (de dossierindeling in
  de app: Veiligheid & natuur, Financiën, Wonen & vastgoed, Administratie, Gezondheid,
  Auto & verkeer, Taal & gemeenschap). Maak die mapping expliciet in één tabel bovenaan
  het bestand, zodat ik hem kan aanpassen zonder de code te lezen.
- Bouw een degradatieketen voor de tegelweergave, want de metadata is niet altijd
  compleet:
    korte titel = handmatig veld indien aanwezig
                → anders titel afgekapt vóór het eerste "(" of ":"
                → anders titel op 22 tekens met een echte ellips
    ondertitel  = excerpt (max 60 tekens)
                → anders niets
    beeld       = featured image
                → anders een gekleurd vlak met de dossiernaam
  Een artikel zonder excerpt EN zonder beeld hoort niet in de tegelweergave; toon het
  daar als compacte lijstrij tussen de tegels. Bouw dat, ga niet alsnog een lege tegel
  renderen.
- Cache de respons in localStorage met de wijzigingsdatum erbij, zodat de app offline
  bruikbaar blijft. Toon dan zichtbaar "offline — gegevens van <datum>".
- Faal zacht: bij een netwerkfout blijft de gecachte lijst staan, geen lege pagina,
  geen spinner die eeuwig draait.
```

---

## 2 — Authenticatie tegen Infofrankrijk

```
De tools en dossiers van Infofrankrijk zitten achter een abonnement. Een niet-ingelogde
aanvraag wordt doorgestuurd naar de verkooppagina "Inhoud abonnement" — de app moet dus
authenticeren, anders ziet de gebruiker die verkooppagina in een iframe.

Zoek eerst uit hoe de inlog technisch werkt (WordPress-sessiecookie, JWT-plugin, of iets
anders) en rapporteer dat aan mij VOORDAT je implementeert. Bouw niet op een aanname.

Bouw daarna:
- het inlogscherm in index.html tegen de echte inlog aan (nu is het een demo-knop die
  simpelweg naar de hub gaat)
- een tokenopslag die een herstart van de app overleeft
- een duidelijke staat voor "abonnement verlopen": geen doorverwijzing naar de
  verkooppagina binnen de app, maar een eigen scherm met één knop naar buiten
- "Verder kijken zonder account" blijft werken: alles wat vrij toegankelijk is blijft
  zichtbaar, betaalde modules krijgen een slotje met uitleg
```

---

## 3 — DossierFrankrijk-koppeling echt maken

```
In de module Energie-portaal (index.html, zoek op enDossierUrl) staat nu een verzonnen
opslag-URL naar dossierfrankrijk.nl met parameters. Vervang die door de echte koppeling.

Zoek eerst uit hoe DossierFrankrijk.nl gegevens ontvangt en rapporteer dat aan mij
voordat je implementeert.

Eisen:
- Wat bewaard wordt is de UITKOMST plus de INVOER: label, kWh EP/m², kg CO2/m²,
  jaarkosten, én de zeven intake-antwoorden. Zonder de invoer is de uitkomst over een
  jaar niet meer te reproduceren of bij te werken.
- Zet er een versie- en datumstempel bij, en de naam van de rekenmotor, zodat een oude
  berekening herkenbaar oud is.
- Maak er een herbruikbare functie van (saveToDossier(payload)) en niet iets dat alleen
  in het Energie-portaal werkt — elke volgende module gaat dit gebruiken.
- Zorg dat de gebruiker ziet dát het gelukt is, en wat er misging als het mislukt.
```

---

## 4 — Rekenmotor synchroon houden met energieportaal

```
engine/archetypes.js, engine/engine.js en engine/dpe.js zijn ongewijzigde kopieën uit
github.com/antonnoe/energieportaal. Ze mogen hier nooit met de hand worden aangepast:
de desktopversie en de mobiele versie moeten dezelfde getallen geven.

Richt dat in:
- leg de bronrepo, branch en het gekopieerde commit vast in een bestand
- maak een script (npm run sync-engine) dat de drie bestanden opnieuw ophaalt en meldt
  wat er veranderd is
- laat tests/dpe-test.js uit de bronrepo meelopen na een sync, zodat een wijziging in de
  motor niet stil de mobiele uitkomsten verandert
- documenteer in CLAUDE.md dat een wijziging in de rekenlogica in energieportaal thuishoort,
  niet hier

Let op: engine/engine.js is een klassiek script dat op topniveau `const ZONES` declareert.
Als het twee keer wordt uitgevoerd, klapt de pagina met "Identifier 'ZONES' has already
been declared". Zorg dat het precies één keer wordt ingeladen — er zit in index.html een
loadEngine() met een guard; voeg er geen tweede <script src> naast.
```

---

## 5 — Belastinggids als tweede module

```
Bouw de belastinggids van Infofrankrijk als tweede interactieve module, naar het model van
het Energie-portaal. Bron:
https://infofrankrijk.com/belastingaangifte-2026-voor-het-jaar-2025/

Dat artikel heeft 25 genummerde secties, een situatiefilter met 12 vinkjes, zeven tabellen
en zes formulier-modals met PDF's. Neem het niet over als tekst — dat is op een telefoon
onleesbaar. Bouw dit:

- Het situatiefilter wordt de INGANG, niet iets halverwege de pagina. Twaalf vinkjes,
  één vraag per kaart, "toon mijn gids" eronder.
- Bewaar het gekozen profiel; het moet een herstart overleven en later ook door andere
  modules gebruikt kunnen worden (iemand met "pensioen uit Nederland" heeft ook elders
  andere informatie nodig).
- Alle tabellen worden actiekaarten, één per rij. De tabel met de vier paden op formulier
  2042 C PRO wordt een beslisboom met drie vragen, niet een tabel met vijf kolommen.
- De zes formulieren worden zes uitklapbare kaarten met de vakjes-uitleg en een
  downloadknop, niet modals.
- De inhoud van het artikel wordt NIET gewijzigd: geen samenvattingen, geen herformuleringen,
  geen weggelaten waarschuwingen. Alleen de vorm verandert. Waarschuwingsblokken blijven
  waarschuwingsblokken.
- Deadlines krijgen een aftelling ten opzichte van vandaag; een verstreken deadline is
  zichtbaar verstreken.
```

---

## 6 — Prestatie en gedrag op een echte telefoon

```
Test de app op een echte telefoon, niet alleen in een smalle browser, en los op wat je
tegenkomt. Let specifiek op:
- de eerste weergave: hoe snel staat er iets bruikbaars op het scherm
- de horizontale "vandaag"-strip: snapt hij netjes, of schuift hij uit uitlijning
- de tabbalk versus de systeembalk van iOS en Android (safe-area-inset)
- invoervelden die het toetsenbord opent: schuift de knop eronder weg
- de brandrisico-module in de iframe: werkt aanraakscrollen daarin
- de app als toegevoegd aan het beginscherm (manifest, pictogram, opstartscherm)

Rapporteer wat je vindt met een voorstel per punt voordat je grote dingen verbouwt.
```
