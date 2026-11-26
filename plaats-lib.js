// Plaats een bericht op het forum van Nederlanders.fr: de ingangen op de startpagina en op de tab Forum,
// en de tekst van het blad dat daarna opent. Gewone JavaScript, geen buildstap: index.html laadt dit bestand
// (window.IfPlaats), de tests laden het met require.
// De drie ingangen openen hetzelfde schrijfformulier: NING vult titel of rubriek niet vooraf in (niet getest),
// dus het verschil zit alleen in de kop en de tip op het blad. Belooft dus nergens een eigen formulier per soort.
(function (root) {
  const FORUM_NIEUW = "https://www.nederlanders.fr/profiles/blog/new";
  // Zelfde bestemming als de kolom BETAALD achter "Plaats bericht" op Nederlanders.fr (repo nlfr-menu, PLAATS_KOLOMMEN).
  const BETAALD = "https://www.nederlanders.fr/page/betaalpagina-berichten";

  const SOORTEN = [
    { id: "vraag", label: "Stel een vraag", kop: "Stel je vraag op het forum", tip: "zet je vraag in de titel, dan krijg je sneller antwoord." },
    { id: "ervaring", label: "Deel je ervaring", kop: "Deel je ervaring op het forum", tip: "vertel waar en wanneer het speelde, daar heeft een ander het meest aan." },
    { id: "verhaal", label: "Een leuk verhaal?", kop: "Vertel je verhaal op het forum", tip: "korte verhalen hebben op het forum een eigen rubriek." }
  ];
  const ALGEMEEN = { id: "algemeen", label: "Plaats een bericht", kop: "Plaats een bericht op het forum", tip: "een duidelijke titel helpt anderen je bericht te vinden." };

  const UITLEG = "Je schrijft je bericht op Nederlanders.fr. Daarvoor log je daar in, of je wordt gratis lid.";
  const BETAALD_ZIN = "Vacature, vastgoed of bedrijfsbericht? Dat is een betaalde advertentie.";
  const BETAALD_LINK = "Naar de betaalpagina";
  const KNOP = "Schrijf je bericht op Nederlanders.fr";

  function soort(id) {
    for (let i = 0; i < SOORTEN.length; i++) if (SOORTEN[i].id === id) return SOORTEN[i];
    return ALGEMEEN;
  }

  const api = { FORUM_NIEUW: FORUM_NIEUW, BETAALD: BETAALD, SOORTEN: SOORTEN, ALGEMEEN: ALGEMEEN, UITLEG: UITLEG, BETAALD_ZIN: BETAALD_ZIN, BETAALD_LINK: BETAALD_LINK, KNOP: KNOP, soort: soort };
  root.IfPlaats = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
