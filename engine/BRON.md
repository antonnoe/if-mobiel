# Bron van engine/

| | |
|---|---|
| Bronrepo | `antonnoe/energieportaal`, map `engine/` |
| Commit | `23226ce` (23 juli 2026, "feat(v3): profile-first") |
| Bestanden | `archetypes.js`, `engine.js`, `dpe.js` |
| Laatst vergeleken | 2 september 2026: alle drie byte voor byte gelijk |
| Test | `node tests/dpe-test.js` uit de bronrepo slaagt op deze kopie |

Deze bestanden worden hier nooit met de hand gewijzigd. Een wijziging in de rekenlogica
hoort in de bronrepo; daarna worden de drie bestanden hierheen gekopieerd en wordt deze
tabel bijgewerkt. De mobiele schil (`index.html`, `enCompute()`) leest de prijstabel en de
apparatenlijst rechtstreeks uit `engine.js` en gebruikt voor de velden die de intake niet
vraagt dezelfde standaardwaarden als de desktopschil (`app.js`, `gatherState()`).
