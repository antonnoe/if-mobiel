// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

// Ontvangt en beheert pushabonnementen van InfoPoche (https://infopoche.fr). Zonder JWT, want de app heeft geen inlog;
// de beveiliging zit in de herkomstcontrole, de validatie hieronder en de tabel zelf (RLS aan, geen policies).
// Bewaard wordt alleen: het push-adres van het toestel, de sleutels daarvoor, de gekozen rubrieken en dagen en het departement.

const TOEGESTAAN = ["https://infopoche.fr", "https://www.infopoche.fr"];
// Alleen de bekende pushdiensten (Chrome/Android, Firefox, Safari/iOS, Edge): de zendfunctie belt dit adres, dus geen willekeurige host.
const PUSHDIENST = /^https:\/\/([a-z0-9-]+\.)*(googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)\//i;
const B64URL = /^[A-Za-z0-9_-]+$/;
const RUBRIEK = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const MAX_NIEUW_PER_UUR = 300;

function kop(origin: string | null) {
  const h: Record<string, string> = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Vary": "Origin" };
  if (origin && TOEGESTAAN.includes(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "POST, DELETE, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type";
    h["Access-Control-Max-Age"] = "86400";
  }
  return h;
}
function antwoord(status: number, body: unknown, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: kop(origin) });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: kop(origin) });
  if (req.method !== "POST" && req.method !== "DELETE") return antwoord(405, { ok: false, fout: "methode" }, origin);
  if (!origin || !TOEGESTAAN.includes(origin)) return antwoord(403, { ok: false, fout: "herkomst" }, origin);

  let b: any;
  try { b = await req.json(); } catch { return antwoord(400, { ok: false, fout: "ongeldig" }, origin); }
  if (!b || typeof b !== "object") return antwoord(400, { ok: false, fout: "ongeldig" }, origin);

  const endpoint = typeof b.endpoint === "string" ? b.endpoint.trim() : "";
  if (endpoint.length < 20 || endpoint.length > 1000 || !PUSHDIENST.test(endpoint)) return antwoord(400, { ok: false, fout: "endpoint" }, origin);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  if (req.method === "DELETE") {
    const { error } = await db.from("infopoche_push").delete().eq("endpoint", endpoint);
    if (error) return antwoord(500, { ok: false, fout: "opslag" }, origin);
    return antwoord(200, { ok: true }, origin);
  }

  const p256dh = typeof b.p256dh === "string" ? b.p256dh.trim() : "";
  const auth = typeof b.auth === "string" ? b.auth.trim() : "";
  if (p256dh.length < 20 || p256dh.length > 200 || !B64URL.test(p256dh)) return antwoord(400, { ok: false, fout: "sleutel" }, origin);
  if (auth.length < 10 || auth.length > 100 || !B64URL.test(auth)) return antwoord(400, { ok: false, fout: "sleutel" }, origin);
  if (!Array.isArray(b.rubrieken) || b.rubrieken.length > 20 || !b.rubrieken.every((r: unknown) => typeof r === "string" && RUBRIEK.test(r))) return antwoord(400, { ok: false, fout: "rubrieken" }, origin);
  const rubrieken = [...new Set(b.rubrieken as string[])];
  if (!Array.isArray(b.dagen) || b.dagen.length < 1 || b.dagen.length > 3 || !b.dagen.every((d: unknown) => d === 0 || d === 1 || d === 7)) return antwoord(400, { ok: false, fout: "dagen" }, origin);
  const dagen = [...new Set(b.dagen as number[])];
  const dep = typeof b.dep === "string" ? b.dep : "geen";
  if (!/^(geen|[0-9]{2,3}|2[AB])$/.test(dep)) return antwoord(400, { ok: false, fout: "dep" }, origin);

  // Eenvoudige limiet op nieuwe abonnementen over alle verzenders samen; geen IP-adressen bewaard.
  const bestaand = await db.from("infopoche_push").select("id", { head: true, count: "exact" }).eq("endpoint", endpoint);
  if ((bestaand.count ?? 0) === 0) {
    const sinds = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await db.from("infopoche_push").select("id", { count: "exact", head: true }).gte("aangemaakt", sinds);
    if ((count ?? 0) >= MAX_NIEUW_PER_UUR) return antwoord(429, { ok: false, fout: "druk" }, origin);
  }

  const { error } = await db.from("infopoche_push").upsert(
    { endpoint, p256dh, auth, rubrieken, dagen, dep, bijgewerkt: new Date().toISOString() },
    { onConflict: "endpoint" },
  );
  if (error) return antwoord(500, { ok: false, fout: "opslag" }, origin);

  // Bewaartermijn: een abonnement zonder bijwerken verdwijnt na 13 maanden.
  await db.from("infopoche_push").delete().lt("bijgewerkt", new Date(Date.now() - 395 * 86400_000).toISOString());
  return antwoord(200, { ok: true }, origin);
});
