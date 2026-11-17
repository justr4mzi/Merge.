// Fonction `diag` de Merge : tests réels (lecture des schémas, recherche de vrais sujets d'examen) et réparations ponctuelles.
// Protégée par le secret `cron` de la table app_secrets.
//  - { urls: [...] } : récupère des images (ex. pages de test du dépôt GitHub) et les envoie à `studio` (action `schema_test`).
//  - { action: "bac_test", ... } : transmis à `studio`.
//  - { action: "schema_add", chapters: [ids], only: n, dry?: true } : ajoute des cartes « légende cachée » à des chapitres déjà faits.
//  - { action: "schema_fix", only: 0, dry?: true } (17 nov.) : répare les cartes de schéma faites avant les légendes (image_box à 4 nombres,
//    rien de caché). Chaque page est relue une fois par Gemini : légendes du schéma + celle(s) qui donnent la réponse de chaque carte.
//    Seules ces légendes sont cachées ; si aucune ne correspond, la carte reste telle quelle (schéma montré au verso seulement).
import { createClient } from "npm:@supabase/supabase-js@2";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.8-flash";
const LOCATION = Deno.env.get("GEMINI_LOCATION") ?? "global";
// deno-lint-ignore no-explicit-any
type Any = any;
const J = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

function b64url(input: ArrayBuffer | string) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
async function accessToken(sa: Any) {
  const now = Math.floor(Date.now() / 1000), aud = sa.token_uri ?? "https://oauth2.googleapis.com/token";
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/cloud-platform", aud, iat: now, exp: now + 3600 }));
  const der = Uint8Array.from(atob(sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claim}`));
  const res = await fetch(aud, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claim}.${b64url(sig)}` }) });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error("google_auth: " + JSON.stringify(data).slice(0, 300));
  return data.access_token as string;
}
async function geminiJson(sa: Any, token: string, parts: Any[]) {
  const host = LOCATION === "global" ? "aiplatform.googleapis.com" : `${LOCATION}-aiplatform.googleapis.com`;
  const res = await fetch(`https://${host}/v1/projects/${sa.project_id}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: "Tu aides un élève français à réviser avec des schémas de son cours. Tu ne réponds qu'à partir de ce qui est visible sur la photo." }] }, contents: [{ role: "user", parts }], generationConfig: { temperature: 0, responseMimeType: "application/json", thinkingConfig: { thinkingLevel: "high" } } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error("vertex: " + JSON.stringify(data).slice(0, 300));
  const t = (data.candidates?.[0]?.content?.parts ?? []).map((p: Any) => p.text ?? "").join("").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
  return JSON.parse(t);
}
// Mêmes règles que studio/schemas.mjs (cadre d'une légende, mots comparés).
function cleanLabelBox(raw: unknown) {
  const n = (Array.isArray(raw) ? raw : String(raw ?? "").split(/[,;\s]+/)).filter((x) => x !== "").map(Number);
  if (n.length !== 4 || n.some((x) => !Number.isFinite(x))) return null;
  let [y0, x0, y1, x1] = n.map((x) => Math.max(0, Math.min(1000, x)));
  if (y1 < y0) [y0, y1] = [y1, y0];
  if (x1 < x0) [x0, x1] = [x1, x0];
  if (y1 - y0 < 4 || x1 - x0 < 6 || (y1 - y0) * (x1 - x0) > 120000) return null;
  return [Math.max(0, y0 - 8), Math.max(0, x0 - 8), Math.min(1000, y1 + 8), Math.min(1000, x1 + 8)].map(Math.round);
}
const STOP = new Set("les des une un le la de du et en est que qui quoi quel quelle quels quelles dans pour par sur avec son sa ses au aux ce cette ces comment pourquoi quand il elle on se ne pas plus a d l".split(" "));
const words = (t: unknown) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w.length > 1 && !STOP.has(w));
const same = (a: string, b: string) => { const A = words(a).join(" "), B = words(b).join(" "); return !!A && !!B && (A === B || A.includes(B) || B.includes(A)); };

async function schemaFix(dry: boolean, only: number) {
  const { data: rows } = await admin.from("cards").select("id,front,back,image_path,image_box").not("image_box", "is", null).limit(500);
  const todo = ((rows ?? []) as Any[]).filter((c) => Array.isArray(c.image_box) && c.image_box.length === 4 && c.image_path);
  const byPage = new Map<string, Any[]>();
  for (const c of todo) { if (!byPage.has(c.image_path)) byPage.set(c.image_path, []); byPage.get(c.image_path)!.push(c); }
  const raw = Deno.env.get("GCP_SERVICE_ACCOUNT_JSON");
  if (!raw) return { error: "GCP_SERVICE_ACCOUNT_JSON absent" };
  const sa = JSON.parse(raw), token = await accessToken(sa), out: Any[] = [];
  // Une page par appel (only = numéro de la page, 0 = la première) : la relecture fine prend ~1 min par page.
  await Promise.all([...byPage].sort((a, b) => a[0].localeCompare(b[0])).filter((_, i) => only < 0 || i === only).map(async ([path, cs]) => {
    try {
      const dl = await admin.storage.from("cours").download(path);
      if (dl.error || !dl.data) return void out.push({ path, error: "image introuvable" });
      const list = cs.map((c, i) => `${i + 1}. cadre du schéma ${c.image_box.join(",")} | question : ${String(c.front).replace(/\s+/g, " ")} | réponse : ${String(c.back).replace(/\s+/g, " ")}`).join("\n");
      const j = await geminiJson(sa, token, [{ text: "Voici la photo d'une page de cours et des cartes de révision sur des schémas de cette page. Chaque carte donne le cadre de son schéma (ymin,xmin,ymax,xmax de 0 à 1000 sur la page entière, 0,0 = coin en haut à gauche).\nPour CHAQUE carte :\n1) « legendes » : toutes les légendes écrites DANS ce cadre (mot, groupe de mots ou symbole relié à une partie du dessin, pas les titres ni les phrases du cours), chacune avec le cadre SERRÉ autour de son texte seulement, de 0 à 1000 sur la page entière ;\n2) « masque » : la ou les légendes (recopiées exactement, séparées par « ; ») qu'on lit sur le schéma et qui DONNENT la réponse à la question, donc à cacher pour que la question fasse travailler l'élève. Si aucune légende ne donne la réponse, \"\".\nJSON : {\"cartes\":[{\"n\":1,\"legendes\":[{\"box\":[0,0,0,0],\"texte\":\"...\"}],\"masque\":\"...\"}]}\n\nCartes :\n" + list }, { inlineData: { mimeType: "image/jpeg", data: b64(new Uint8Array(await dl.data.arrayBuffer())) } }]);
      for (const x of (j.cartes ?? []) as Any[]) {
        const c = cs[(+x.n || 0) - 1]; if (!c) continue;
        const f = c.image_box as number[];
        const labels = ((x.legendes ?? []) as Any[]).map((l) => ({ box: cleanLabelBox(l.box), text: String(l.texte ?? "").trim() }))
          .filter((l) => l.box && l.text && l.box[0] >= f[0] - 30 && l.box[1] >= f[1] - 30 && l.box[2] <= f[2] + 30 && l.box[3] <= f[3] + 30).slice(0, 20) as { box: number[]; text: string }[];
        const want = String(x.masque ?? "").split(";").map((m) => m.trim()).filter(Boolean);
        const hide = labels.filter((l) => want.some((m) => same(l.text, m)));
        // Tout cacher n'aide pas (on ne voit plus le schéma) : seulement si le schéma n'a qu'une légende.
        const ok = hide.length > 0 && (hide.length < labels.length || labels.length === 1);
        if (ok && !dry) await admin.from("cards").update({ image_box: [...f, ...hide.map((l) => l.box)] }).eq("id", c.id);
        out.push({ id: c.id, legendes: labels.map((l) => l.text), masque: x.masque ?? "", cachees: ok ? hide.map((l) => l.text) : [] });
      }
    } catch (e) { out.push({ path, error: String((e as Error).message).slice(0, 300) }); }
  }));
  return { pages: byPage.size, cartes: todo.length, dry, out };
}

// Ajout de cartes de schéma à des chapitres déjà faits (17 nov., chapitres de SVT faits avant les schémas).
// { action: "schema_add", chapters: [ids], only: n } : n = numéro de la page parmi toutes les photos de ces chapitres (une page par appel).
// L'IA repère les vrais schémas légendés de la page et écrit 1 ou 2 cartes « légende cachée » par schéma. Une page déjà traitée est sautée.
async function schemaAdd(ids: string[], only: number, dry: boolean) {
  const { data: chs } = await admin.from("chapters").select("id,user_id,name").in("id", ids.slice(0, 20));
  const pages: { ch: Any; path: string }[] = [];
  for (const ch of (chs ?? []) as Any[]) {
    const { data: files } = await admin.storage.from("cours").list(`${ch.user_id}/${ch.id}`, { limit: 200, sortBy: { column: "name", order: "asc" } });
    for (const f of (files ?? []) as Any[]) if (/\.(jpe?g|png|webp)$/i.test(f.name)) pages.push({ ch, path: `${ch.user_id}/${ch.id}/${f.name}` });
  }
  pages.sort((a, b) => a.path.localeCompare(b.path));
  if (only < 0 || only >= pages.length) return { pages: pages.length };
  const { ch, path } = pages[only];
  const { count } = await admin.from("cards").select("id", { count: "exact", head: true }).eq("image_path", path).not("image_box", "is", null);
  if (count) return { pages: pages.length, path, skip: "déjà des cartes de schéma sur cette page" };
  const raw = Deno.env.get("GCP_SERVICE_ACCOUNT_JSON");
  if (!raw) return { error: "GCP_SERVICE_ACCOUNT_JSON absent" };
  const sa = JSON.parse(raw), token = await accessToken(sa);
  const dl = await admin.storage.from("cours").download(path);
  if (dl.error || !dl.data) return { path, error: "image introuvable" };
  const j = await geminiJson(sa, token, [{ text: `Voici la photo d'une page du cours « ${ch.name} ».\nRepère les VRAIS schémas légendés de cette page : dessin, schéma ou graphique avec des légendes écrites reliées à ses parties. PAS un tableau, PAS un encadré de texte, PAS une photo ou un dessin sans légende, PAS un exercice. Souvent il n'y en a aucun : réponds alors {"schemas":[]}.\nPour chaque schéma (3 au plus) :\n- "box" : cadre qui entoure tout le schéma avec ses légendes, [ymin,xmin,ymax,xmax] de 0 à 1000 sur la page (0,0 = coin en haut à gauche) ;\n- "titre" : titre court de ce qu'il représente ;\n- "legendes" : chaque légende écrite sur le schéma, avec "box" = cadre SERRÉ autour du texte de la légende seulement (même repère) et "texte" = texte exact ;\n- "cartes" : 1 ou 2 cartes de révision dont la réponse est UNE légende importante du schéma, qui sera cachée sur l'image : "front" = question qui nomme le sujet du schéma (ex. « Sur ce schéma de la fleur, comment s'appelle la partie cachée qui produit le pollen ? »), "back" = réponse courte (la légende, avec au besoin quelques mots d'explication tirés de la page), "masque" = texte exact de la légende cachée.\nRien d'inventé : seulement ce qui est écrit sur la page.\nJSON : {"schemas":[{"box":[0,0,0,0],"titre":"...","legendes":[{"box":[0,0,0,0],"texte":"..."}],"cartes":[{"front":"...","back":"...","masque":"..."}]}]}` }, { inlineData: { mimeType: "image/jpeg", data: b64(new Uint8Array(await dl.data.arrayBuffer())) } }]);
  const rows: Any[] = [], made: Any[] = [];
  for (const sc of ((j.schemas ?? []) as Any[]).slice(0, 3)) {
    const f = cleanFrame(sc.box); if (!f) continue;
    const labels = ((sc.legendes ?? []) as Any[]).map((l) => ({ box: cleanLabelBox(l.box), text: String(l.texte ?? "").trim() }))
      .filter((l) => l.box && l.text && l.box[0] >= f[0] - 30 && l.box[1] >= f[1] - 30 && l.box[2] <= f[2] + 30 && l.box[3] <= f[3] + 30).slice(0, 20) as { box: number[]; text: string }[];
    if (labels.length < 2) continue; // un schéma sans vraies légendes ne fait pas de bonne carte « légende cachée »
    for (const c of ((sc.cartes ?? []) as Any[]).slice(0, 2)) {
      const hide = labels.filter((l) => same(l.text, String(c.masque ?? "")));
      if (!c.front || !c.back || !hide.length || hide.length >= labels.length) continue;
      rows.push({ user_id: ch.user_id, chapter_id: ch.id, front: String(c.front).slice(0, 500), back: String(c.back).slice(0, 2000), source_quote: ("Schéma : " + String(sc.titre ?? "")).slice(0, 400), needs_check: false, image_path: path, image_box: [...f, ...hide.map((l) => l.box)] });
      made.push({ titre: sc.titre, front: c.front, cachee: hide.map((l) => l.text) });
    }
  }
  if (rows.length && !dry) { const ins = await admin.from("cards").insert(rows); if (ins.error) return { path, error: ins.error.message }; }
  return { pages: pages.length, path, chapitre: ch.name, cartes: made };
}
// Cadre d'un schéma (mêmes règles que studio/schemas.mjs : assez grand, marge de 2,5 %).
function cleanFrame(raw: unknown) {
  const n = (Array.isArray(raw) ? raw : String(raw ?? "").split(/[,;\s]+/)).filter((x) => x !== "").map(Number);
  if (n.length !== 4 || n.some((x) => !Number.isFinite(x))) return null;
  let [y0, x0, y1, x1] = n.map((x) => Math.max(0, Math.min(1000, x)));
  if (y1 < y0) [y0, y1] = [y1, y0];
  if (x1 < x0) [x0, x1] = [x1, x0];
  if (y1 - y0 < 60 || x1 - x0 < 60 || ((y1 - y0) * (x1 - x0)) / 1e6 < 0.015) return null;
  return [Math.max(0, y0 - 25), Math.max(0, x0 - 25), Math.min(1000, y1 + 25), Math.min(1000, x1 + 25)].map(Math.round);
}

Deno.serve(async (req) => {
  const { data } = await admin.from("app_secrets").select("value").eq("name", "cron").maybeSingle();
  if (!data?.value || req.headers.get("x-cron-secret") !== data.value) return new Response("interdit", { status: 401 });
  const body = await req.json();
  if (body.action === "schema_add") { const r = await schemaAdd((body.chapters ?? []).map(String), Number.isInteger(body.only) ? body.only : -1, !!body.dry); console.log("schema_add " + JSON.stringify(r)); return J(r); }
  if (body.action === "schema_fix") { const r = await schemaFix(!!body.dry, Number.isInteger(body.only) ? body.only : -1); console.log("schema_fix " + JSON.stringify(r)); return J(r); }
  // Recherche d'un vrai sujet d'examen : { action: "bac_test", classe, matiere, annee }.
  if (body.action === "bac_test") {
    const r = await fetch(`${URL_}/functions/v1/studio`, { method: "POST", headers: { "Content-Type": "application/json", "x-cron-secret": data.value }, body: JSON.stringify(body) });
    return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
  }
  const images: string[] = [];
  for (const u of (body.urls ?? []).slice(0, 4)) {
    const r = await fetch(String(u));
    if (!r.ok) return J({ error: "image " + u + " : " + r.status }, 400);
    images.push(b64(new Uint8Array(await r.arrayBuffer())));
  }
  const r = await fetch(`${URL_}/functions/v1/studio`, { method: "POST", headers: { "Content-Type": "application/json", "x-cron-secret": data.value }, body: JSON.stringify({ action: "schema_test", images }) });
  return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
});
