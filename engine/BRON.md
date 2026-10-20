# Bron van engine/

| | |
|---|---|
| Bronrepo | `antonnoe/energieportaal`, map `engine/` |
| Commit | `7209b02` (20 oktober 2026, "Peil-correctieronde") |
| Bestanden | `archetypes.js`, `engine.js`, `dpe.js` |
| Laatst vergeleken | 20 oktober 2026: alle drie byte voor byte gelijk; `tests/peil.test.mjs` bewaakt dit met de hashes in `peil/engine-hash.json` (in beide repo's gelijk) |
| Test | `node tests/dpe-test.js` uit de bronrepo slaagt op deze kopie; hier draait `node tests/peil.test.mjs` |

Deze bestanden worden hier nooit met de hand gewijzigd. Een wijziging in de rekenlogica
hoort in de bronrepo; daarna worden de drie bestanden hierheen gekopieerd en wordt deze
tabel bijgewerkt. De mobiele schil (`index.html`, `enCompute()`) leest de prijstabel en de
apparatenlijst rechtstreeks uit `engine.js` en gebruikt voor de velden die de intake niet
vraagt dezelfde standaardwaarden als de desktopschil (`app.js`, `gatherState()`).
