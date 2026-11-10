// Nieuwe versie van InfoPoche: pure functies voor de versiebalk en de versieregel in Profiel.
// Gewone JavaScript, geen buildstap: index.html laadt dit bestand (window.IfVersie), de tests laden het met require.
(function (root) {
  function tekst(v) { return typeof v === "string" ? v.trim() : ""; }

  // dd-mm-jjjj uit een ISO-datum (zelfde vorm als elders in de app).
  function datumNl(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(tekst(iso));
    return m ? m[3] + "-" + m[2] + "-" + m[1] : "";
  }

  // Is de commit die de server nu geeft anders dan de geladen commit? Beide moeten een echte waarde zijn:
  // zonder commit (lokaal, zonder Vercel) is er niets te vergelijken en blijft de balk uit.
  function verschilt(geladen, nieuw) {
    return !!tekst(geladen) && !!tekst(nieuw) && tekst(geladen) !== tekst(nieuw);
  }

  // Regel onder de titel in Profiel: datum plus status, of alleen de status als de datum nog onbekend is.
  function profielRegel(datum, nieuwer) {
    const d = tekst(datum) ? datumNl(datum) : "";
    const status = nieuwer ? "er is een nieuwere versie" : "je hebt de nieuwste";
    return d ? d + " · " + status : status;
  }

  const api = { datumNl: datumNl, verschilt: verschilt, profielRegel: profielRegel };
  root.IfVersie = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
