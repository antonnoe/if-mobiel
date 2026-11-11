// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

// Dagelijkse run (pg_cron, 07:30 Europe/Paris): haalt de items van Kalender Frankrijk op, bepaalt per abonnement welke
// voorkomens over 7, 1 of 0 dagen beginnen en stuurt Web Push. Niet open aanroepbaar: alleen met het cron-token uit de Vault.
// Parameters (JSON): droog (telt alleen, verstuurt niets), alleen (endpoint-hash van een testabonnement), vandaag (alleen bij droog of alleen), force, init.

const KALENDER = "https://kalender-frankrijk.vercel.app";
const CONTACT = "mailto:info@communitiesabroad.com";

  // ---- selectie begin ----
  var MAX_PER_DAG = 3;
  var SOORT_VOLGORDE = { datum: 0, mijlpaal: 1, periode: 2, seizoen: 3 };
  function dagVerschil(vanIso, vandaagIso) {
    var a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(vanIso), b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(vandaagIso);
    if (!a || !b) return null;
    return Math.round((Date.UTC(+a[1], +a[2] - 1, +a[3]) - Date.UTC(+b[1], +b[2] - 1, +b[3])) / 86400000);
  }
  function gebiedLijst(g) { return (Array.isArray(g) ? g : [g]).map(function (x) { return String(x || "").trim(); }).filter(Boolean); }
  function isDep(x) { return /^(\d{2,3}|2[AB])$/.test(x); }
  // Een gebied met departementsnummers telt alleen bij dat departement. Zonder nummers telt alleen "heel Frankrijk" of
  // "Nederland"; een zone, een streek of een onbekend gebied nooit. Een vereniging zonder bruikbaar departement nooit.
  function gebiedPast(item, dep) {
    var lijst = gebiedLijst(item.gebied), deps = lijst.filter(isDep);
    if (deps.length) return dep !== "geen" && deps.indexOf(dep) >= 0;
    if (item.rubriek === "verenigingen") return false;
    return lijst.indexOf("heel Frankrijk") >= 0 || lijst.indexOf("Nederland") >= 0;
  }
  function meldingTekst(c) {
    var titel = String(c.titel || "").replace(/\s+[\u2013\u2014]\s+/g, ", ").replace(/[\u2013\u2014]/g, "-").replace(/\s+/g, " ").trim();
    if (titel.length > 140) titel = titel.slice(0, 139).replace(/\s+\S*$/, "") + "\u2026";
    var begint = c.soort === "periode" || c.soort === "seizoen" ? " begint" : "";
    var voor = c.dagen === 0 ? "Vandaag" + begint : c.dagen === 1 ? "Morgen" + begint : "Over " + c.dagen + " dagen" + begint;
    return voor + ": " + titel;
  }
  // abo: {rubrieken, dagen, dep}; items: ruwe API-items; reedsVerstuurd(itemId, voorkomenIso, dagen) -> bool; reedsVandaag: aantal al verstuurd.
  function kiesMeldingen(abo, items, vandaag, reedsVerstuurd, reedsVandaag) {
    var ruimte = MAX_PER_DAG - (reedsVandaag || 0), uit = [];
    if (ruimte <= 0) return uit;
    var dep = abo.dep || "geen";
    (items || []).forEach(function (i) {
      if (!i || i.status !== "vastgesteld" || !Array.isArray(i.toon_in) || i.toon_in.indexOf("infopoche") < 0) return;
      if (i.datum_zeker === false || i.datum_zeker === "nee" || /\(waarschijnlijke datum\)/i.test(String(i.titel || ""))) return;
      if (abo.rubrieken.indexOf(i.rubriek) < 0 || !gebiedPast(i, dep)) return;
      (Array.isArray(i.voorkomens) ? i.voorkomens : []).forEach(function (v) {
        var d = v ? dagVerschil(v.van, vandaag) : null;
        if (d === null || abo.dagen.indexOf(d) < 0) return;
        if (reedsVerstuurd(i.id, v.van, d)) return;
        uit.push({ item_id: i.id, voorkomen: v.van, dagen: d, titel: i.titel, soort: i.soort, rubriek: i.rubriek });
      });
    });
    uit.sort(function (a, b) {
      var sa = SOORT_VOLGORDE[a.soort], sb = SOORT_VOLGORDE[b.soort];
      sa = sa === undefined ? 9 : sa; sb = sb === undefined ? 9 : sb;
      return sa - sb || a.dagen - b.dagen || (a.titel < b.titel ? -1 : a.titel > b.titel ? 1 : 0);
    });
    return uit.slice(0, ruimte).map(function (c) { c.tekst = meldingTekst(c); return c; });
  }
  // ---- selectie eind ----

function json(status: unknown, body: unknown) {
  return new Response(JSON.stringify(body), { status: typeof status === "number" ? status : 200, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
function gelijk(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function parijs(d = new Date()) {
  const f = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const p: Record<string, string> = {};
  f.forEach((x) => (p[x.type] = x.value));
  return { dag: p.year + "-" + p.month + "-" + p.day, uur: +p.hour };
}
function plusDagen(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}
async function hash(s: string) {
  const b = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
function b64url(buf: ArrayBuffer | Uint8Array) {
  const b = new Uint8Array(buf); let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { ok: false, fout: "methode" });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const token = (await db.rpc("push_geheim", { naam: "push_cron_token" })).data as string | null;
  if (!gelijk(req.headers.get("x-cron-token") || "", token || "")) return json(401, { ok: false, fout: "geen toegang" });
  let o: any = {};
  try { o = await req.json(); } catch { o = {}; }
  const droog = o.droog === true, force = o.force === true, alleen = typeof o.alleen === "string" ? o.alleen : "";

  // Sleutelpaar: wordt bij de eerste keer in de server gemaakt; de privésleutel gaat rechtstreeks de Vault in en komt nergens in beeld.
  let priv = (await db.rpc("push_geheim", { naam: "push_vapid_private" })).data as string | null;
  let pub = (await db.rpc("push_geheim", { naam: "push_vapid_public" })).data as string | null;
  if (!priv || !pub) {
    if (o.init !== true) return json(500, { ok: false, fout: "sleutelpaar ontbreekt" });
    const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const jwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
    const raw = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
    priv = jwk.d as string; pub = b64url(raw);
    await db.rpc("push_geheim_zet", { naam: "push_vapid_private", waarde: priv });
    await db.rpc("push_geheim_zet", { naam: "push_vapid_public", waarde: pub });
  }
  if (o.init === true) return json(200, { ok: true, publiek: pub });

  const nu = parijs();
  if (!droog && !alleen && !force && nu.uur !== 7) return json(200, { ok: true, overgeslagen: "geen 07:xx in Parijs" });
  const vandaag = (droog || alleen) && /^\d{4}-\d{2}-\d{2}$/.test(o.vandaag || "") ? o.vandaag : nu.dag;

  const run = await db.from("infopoche_push_runs").insert({ droog }).select("id").single();
  const runId = run.data?.id;
  const sluit = async (v: Record<string, unknown>) => { if (runId) await db.from("infopoche_push_runs").update({ klaar: new Date().toISOString(), ...v }).eq("id", runId); };

  try {
    const r = await fetch(KALENDER + "/api/items?van=" + vandaag + "&tot=" + plusDagen(vandaag, 8), { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error("kalender " + r.status);
    const data = await r.json();
    const items = Array.isArray(data) ? data : data?.items;
    if (!Array.isArray(items)) throw new Error("kalender: geen lijst");

    const subs: any[] = [];
    for (let van = 0; ; van += 1000) {
      const { data: rij, error } = await db.from("infopoche_push").select("endpoint,p256dh,auth,rubrieken,dagen,dep").order("id").range(van, van + 999);
      if (error) throw new Error("abonnementen: " + error.message);
      subs.push(...rij);
      if (rij.length < 1000) break;
    }
    const verstuurd = new Map<string, number>(), sleutels = new Set<string>();
    for (let van = 0; ; van += 1000) {
      const { data: rij, error } = await db.from("infopoche_push_verstuurd").select("endpoint_hash,item_id,voorkomen,dagen_vooraf,verstuurd").gte("verstuurd", new Date(Date.now() - 3 * 86400_000).toISOString()).range(van, van + 999);
      if (error) throw new Error("verstuurd: " + error.message);
      for (const x of rij) {
        sleutels.add(x.endpoint_hash + "|" + x.item_id + "|" + x.voorkomen + "|" + x.dagen_vooraf);
        if (parijs(new Date(x.verstuurd)).dag === vandaag) verstuurd.set(x.endpoint_hash, (verstuurd.get(x.endpoint_hash) || 0) + 1);
      }
      if (rij.length < 1000) break;
    }

    if (!droog) webpush.setVapidDetails(CONTACT, pub, priv);
    let meldingen = 0, verwijderd = 0, fouten = 0, metMelding = 0;
    for (const s of subs) {
      const h = await hash(s.endpoint);
      if (alleen && h !== alleen) continue;
      const keuze = kiesMeldingen(s, items, vandaag, (id: string, v: string, d: number) => sleutels.has(h + "|" + id + "|" + v + "|" + d), verstuurd.get(h) || 0);
      if (keuze.length) metMelding++;
      for (const c of keuze) {
        if (droog) { meldingen++; continue; }
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ b: c.tekst, id: c.item_id, tag: "kal-" + c.item_id + "-" + c.voorkomen }),
            { TTL: 86400, urgency: "normal" },
          );
          meldingen++;
          await db.from("infopoche_push_verstuurd").upsert({ endpoint_hash: h, item_id: c.item_id, voorkomen: c.voorkomen, dagen_vooraf: c.dagen }, { onConflict: "endpoint_hash,item_id,voorkomen,dagen_vooraf" });
        } catch (e: any) {
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await db.from("infopoche_push").delete().eq("endpoint", s.endpoint);
            verwijderd++;
            break;
          }
          fouten++;
        }
      }
    }
    if (!droog && !alleen) {
      await db.from("infopoche_push_verstuurd").delete().lt("verstuurd", new Date(Date.now() - 30 * 86400_000).toISOString());
      await db.from("infopoche_push").delete().lt("bijgewerkt", new Date(Date.now() - 395 * 86400_000).toISOString());
      await db.from("infopoche_push_runs").delete().lt("gestart", new Date(Date.now() - 400 * 86400_000).toISOString());
    }
    const uit = { ok: true, droog, vandaag, abonnementen: subs.length, metMelding, meldingen, verwijderd, fouten };
    await sluit({ ok: true, abonnementen: subs.length, meldingen, verwijderd, fout: fouten ? fouten + " verzendfouten" : null });
    return json(200, uit);
  } catch (e: any) {
    await sluit({ ok: false, fout: String(e?.message || e).slice(0, 300) });
    return json(502, { ok: false, fout: String(e?.message || e).slice(0, 300) });
  }
});
