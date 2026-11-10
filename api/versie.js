// Versiebron voor de versiebalk en Profiel (Vercel-functie, zelfde adres als de app, dus geen CORS).
// VERCEL_GIT_COMMIT_SHA zet Vercel bij elke build vanzelf, zonder handmatige stap. Een betrouwbare
// commitdatum is daar niet bij; die zou een extra aanroep bij GitHub vragen (netwerk, snelheidslimiet,
// een extra afhankelijkheid die een deploy kan laten vastlopen) voor iets wat de app ook zonder kan: het
// toestel onthoudt zelf wanneer het een nieuwe commit voor het eerst zag. Daarom geeft deze functie alleen
// de commit terug. Altijd no-store: de uitkomst mag nooit uit een cache komen.
module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.statusCode = 405;
    return res.end(JSON.stringify({ fout: "alleen GET" }));
  }
  const sha = typeof process.env.VERCEL_GIT_COMMIT_SHA === "string" ? process.env.VERCEL_GIT_COMMIT_SHA : "";
  res.statusCode = 200;
  res.end(JSON.stringify({ commit: sha, kort: sha ? sha.slice(0, 7) : "" }));
};
