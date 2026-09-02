# vendor/

Lokale kopieën van de twee runtime-bibliotheken waar `support.js` om vraagt. `index.html`
zet ze in `window.__resources`, waardoor `support.js` niets meer van unpkg.com hoeft te
halen. Zonder deze map blijft de app leeg zodra unpkg onbereikbaar is.

| Bestand | Versie | Bron | SRI (moet gelijk zijn aan de hash in `support.js`) |
|---|---|---|---|
| `react.production.min.js` | 18.3.1 | npm-pakket `react`, map `umd/` | `sha384-DGyLxAyjq0f9SPpVevD6IgztCFlnMF6oW/XQGmfe+IsZ8TqEiDrcHkMLKI6fiB/Z` |
| `react-dom.production.min.js` | 18.3.1 | npm-pakket `react-dom`, map `umd/` | `sha384-gTGxhz21lVGYNMcdJOyq01Edg0jhn/c22nsx0kyqP0TxaV5WVdsSH1fSDUf5YJj1` |

Bij een nieuwe `support.js` die om een andere React-versie vraagt: de twee bestanden
vervangen door de `umd/`-bestanden uit het npm-pakket van precies die versie, en de
URL's in `window.__resources` in `index.html` gelijktrekken. Licentie: MIT, zie
`REACT-LICENSE`.
