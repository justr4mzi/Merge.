// Fonction `diag` de Merge : tests réels (lecture des schémas, recherche de vrais sujets d'examen), sans toucher aux données d'un élève.
// Récupère des images par leur adresse (ex. pages de test du dépôt GitHub) et les envoie à `studio` (action `schema_test`).
// Protégée par le secret `cron` de la table app_secrets.
import { createClient } from "npm:@supabase/supabase-js@2";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  const { data } = await admin.from("app_secrets").select("value").eq("name", "cron").maybeSingle();
  if (!data?.value || req.headers.get("x-cron-secret") !== data.value) return new Response("interdit", { status: 401 });
  const body = await req.json();
  // Recherche d'un vrai sujet d'examen : { action: "bac_test", classe, matiere, annee }.
  if (body.action === "bac_test") {
    const r = await fetch(`${URL_}/functions/v1/studio`, { method: "POST", headers: { "Content-Type": "application/json", "x-cron-secret": data.value }, body: JSON.stringify(body) });
    return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
  }
  const images: string[] = [];
  for (const u of (body.urls ?? []).slice(0, 4)) {
    const r = await fetch(String(u));
    if (!r.ok) return new Response(JSON.stringify({ error: "image " + u + " : " + r.status }), { status: 400 });
    const b = new Uint8Array(await r.arrayBuffer());
    let s = "";
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
    images.push(btoa(s));
  }
  const r = await fetch(`${URL_}/functions/v1/studio`, { method: "POST", headers: { "Content-Type": "application/json", "x-cron-secret": data.value }, body: JSON.stringify({ action: "schema_test", images }) });
  return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
});
