// Fonction `admin` de Merge : données du tableau de bord /admin. Protégée par un mot de passe dont seule l'empreinte SHA-256
// est stockée (table app_secrets, name = 'admin_pw_sha256'). Lecture, plus la gestion des cadeaux en vrai de la boutique
// (activer un compte : gift_access ; marquer un cadeau comme offert : gift_claims.given_at), et le transfert exceptionnel
// de chapitres d'un élève à un autre (chapters_of, transfer).
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-password",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
// deno-lint-ignore no-explicit-any
type Any = any;
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
async function sha256(t: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// Comparaison en temps constant.
function same(a: string, b: string) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "methode" }, 405);
  try {
    const pw = req.headers.get("x-admin-password") ?? "";
    const { data: sec } = await admin.from("app_secrets").select("value").eq("name", "admin_pw_sha256").maybeSingle();
    if (!sec?.value || !pw || !same(await sha256(pw), sec.value)) { await new Promise((r) => setTimeout(r, 600)); return json({ error: "mot_de_passe" }, 401); }

    const body: Any = await req.json().catch(() => ({}));
    if (body.action === "gift_access") {
      const uid = String(body.user ?? "");
      if (!/^[0-9a-f-]{36}$/.test(uid)) return json({ error: "requete" }, 400);
      const r = body.on ? await admin.from("gift_access").upsert({ user_id: uid }) : await admin.from("gift_access").delete().eq("user_id", uid);
      if (r.error) throw r.error;
      return json({ ok: true });
    }
    if (body.action === "gift_given") {
      const id = String(body.id ?? "");
      if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: "requete" }, 400);
      const r = await admin.from("gift_claims").update({ given_at: body.undo ? null : new Date().toISOString() }).eq("id", id);
      if (r.error) throw r.error;
      return json({ ok: true });
    }

    // Chapitres d'un élève (pour choisir quoi transférer).
    if (body.action === "chapters_of") {
      const uid = String(body.user ?? "");
      if (!/^[0-9a-f-]{36}$/.test(uid)) return json({ error: "requete" }, 400);
      const [ch, sj, cd] = await Promise.all([
        admin.from("chapters").select("id,name,subject_id,status").eq("user_id", uid).eq("archived", false).order("created_at"),
        admin.from("subjects").select("id,name").eq("user_id", uid),
        admin.from("cards").select("chapter_id").eq("user_id", uid),
      ]);
      if (ch.error) throw ch.error;
      const n: Record<string, number> = {}; (cd.data ?? []).forEach((r: Any) => (n[r.chapter_id] = (n[r.chapter_id] ?? 0) + 1));
      const sn: Record<string, string> = {}; (sj.data ?? []).forEach((r: Any) => (sn[r.id] = r.name));
      return json({ chapters: (ch.data ?? []).map((c: Any) => ({ id: c.id, name: c.name, subject: sn[c.subject_id] ?? "", cards: n[c.id] ?? 0 })) });
    }
    // Transfert exceptionnel de chapitres d'un élève à un autre (même cours, recopié proprement par l'un) : on COPIE le chapitre,
    // ses cartes (progression remise à zéro), le résumé, le texte du cours, les contenus IA déjà faits et les photos.
    // Aucun appel à l'IA. Le chapitre arrive dans la matière du même nom chez l'élève (créée si elle n'existe pas).
    if (body.action === "transfer") {
      const to = String(body.to ?? ""), ids = (Array.isArray(body.chapters) ? body.chapters : []).map(String).filter((x: string) => /^[0-9a-f-]{36}$/.test(x)).slice(0, 30);
      if (!/^[0-9a-f-]{36}$/.test(to) || !ids.length) return json({ error: "requete" }, 400);
      const norm = (t: unknown) => String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const { data: chs, error: ce } = await admin.from("chapters").select("*").in("id", ids);
      if (ce) throw ce;
      const { data: mine } = await admin.from("subjects").select("id,name").eq("user_id", to).eq("archived", false);
      const subs: Any[] = mine ?? [], done: Any[] = [];
      for (const c of (chs ?? []) as Any[]) {
        if (c.user_id === to) continue;
        const { data: src } = await admin.from("subjects").select("name,color").eq("id", c.subject_id).maybeSingle();
        let sub = subs.find((x) => norm(x.name) === norm(src?.name));
        if (!sub) {
          const r = await admin.from("subjects").insert({ user_id: to, name: src?.name || "Matière", color: src?.color || "#4b39c8" }).select("id,name").single();
          if (r.error) throw r.error; sub = r.data; subs.push(sub);
        }
        const nc = await admin.from("chapters").insert({ user_id: to, subject_id: sub.id, name: c.name, status: c.status || "ready", lang: c.lang || "fr", cards_target: c.cards_target, color: c.color ?? null, notes: c.notes ?? null }).select("id").single();
        if (nc.error) throw nc.error;
        const nid = nc.data.id;
        // Photos des pages (cartes de schéma, « voir la page ») : copiées dans le dossier de l'élève, sinon il ne pourrait pas les ouvrir.
        const paths = new Map<string, string>();
        const copyPic = async (p: string | null) => {
          if (!p) return null; if (paths.has(p)) return paths.get(p)!;
          const dst = `${to}/${nid}/${p.split("/").pop()}`;
          const r = await admin.storage.from("cours").copy(p, dst);
          const out = r.error ? null : dst; paths.set(p, out as string); return out;
        };
        const { data: cards } = await admin.from("cards").select("front,back,source_ref,source_quote,needs_check,flagged,edited_by_user,image_path,image_box,picture,mnemonic").eq("chapter_id", c.id);
        const rows = [];
        for (const k of (cards ?? []) as Any[]) rows.push({ ...k, user_id: to, chapter_id: nid, image_path: await copyPic(k.image_path), picture: await copyPic(k.picture), image_box: k.image_path ? k.image_box : null });
        for (let i = 0; i < rows.length; i += 200) { const r = await admin.from("cards").insert(rows.slice(i, i + 200)); if (r.error) throw r.error; }
        const [sm, so, ac] = await Promise.all([
          admin.from("summaries").select("markdown,edited_by_user").eq("chapter_id", c.id).maybeSingle(),
          admin.from("sources").select("filename,mime,pages,extracted_text").eq("chapter_id", c.id),
          admin.from("ai_cache").select("kind,content").eq("chapter_id", c.id),
        ]);
        if (sm.data) await admin.from("summaries").insert({ user_id: to, chapter_id: nid, markdown: sm.data.markdown, edited_by_user: sm.data.edited_by_user });
        if ((so.data ?? []).length) await admin.from("sources").insert((so.data as Any[]).map((x) => ({ ...x, user_id: to, chapter_id: nid })));
        if ((ac.data ?? []).length) await admin.from("ai_cache").insert((ac.data as Any[]).map((x) => ({ ...x, user_id: to, chapter_id: nid })));
        done.push({ name: c.name, subject: sub.name, cards: rows.length });
      }
      return json({ ok: true, done });
    }

    const today = new Date(); const iso = (d: Date) => d.toISOString().slice(0, 10);
    const day = iso(today);
    const wk = new Date(today); wk.setUTCDate(wk.getUTCDate() - ((wk.getUTCDay() + 6) % 7)); // lundi
    const mo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const users: Any[] = [];
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      users.push(...data.users);
      if (data.users.length < 200) break;
    }
    const [prof, st, tts, ga, gc, wk2] = await Promise.all([
      admin.from("profiles").select("user_id,display_name,classe,created_at,last_seen_at,last_seen_place"),
      admin.rpc("admin_user_stats", { p_day: day, p_week: iso(wk), p_month: iso(mo) }),
      admin.from("tts_usage").select("chars,files").eq("month", day.slice(0, 7)).maybeSingle(),
      admin.from("gift_access").select("user_id"),
      admin.from("gift_claims").select("id,user_id,gift,price,created_at,given_at").order("created_at", { ascending: false }).limit(200),
      // Boutique de chaque élève : résumé que l'appli enregistre elle-même (niveau, pièces, articles).
      admin.from("user_kv").select("user_id,value,updated_at").eq("key", "merge.wallet"),
    ]);
    if (st.error) throw st.error;
    const P: Record<string, Any> = {}; (prof.data ?? []).forEach((p: Any) => (P[p.user_id] = p));
    const S: Record<string, Any> = {}; (st.data ?? []).forEach((r: Any) => (S[r.user_id] = r));
    const W: Record<string, Any> = {}; (wk2.data ?? []).forEach((r: Any) => { try { const v = JSON.parse(r.value); if (v && typeof v === "object") W[r.user_id] = Object.assign(v, { updated_at: r.updated_at }); } catch (_e) { /* ignoré */ } });
    const out = users.map((u: Any) => {
      const p = P[u.id] ?? {}, r = S[u.id] ?? {}, n = (v: unknown) => Number(v) || 0;
      const t = { d: n(r.t_day), w: n(r.t_week), m: n(r.t_month), all: n(r.t_all) }, a = { all: n(r.ai_all), d: n(r.ai_day) };
      return {
        id: u.id, name: p.display_name || (u.user_metadata?.full_name ?? ""), email: u.email ?? "", classe: p.classe ?? "",
        created_at: u.created_at, last_seen_at: p.last_seen_at || u.last_sign_in_at || null, last_seen_place: p.last_seen_place || "",
        screen: t, ai: a, cards: n(r.cards), chapters: n(r.chapters),
        wallet: W[u.id] ?? null,
      };
    }).sort((x: Any, y: Any) => String(y.last_seen_at ?? "").localeCompare(String(x.last_seen_at ?? "")));
    return json({ users: out, gifts: { ready: !ga.error && !gc.error, access: (ga.data ?? []).map((r: Any) => r.user_id), claims: gc.data ?? [] }, voix: { chars: Number(tts.data?.chars ?? 0), files: Number(tts.data?.files ?? 0), limit: Number(Deno.env.get("TTS_MONTHLY_FREE") ?? "950000") }, generated_at: new Date().toISOString() });
  } catch (e) {
    console.error(e);
    return json({ error: "erreur", detail: String((e as Error).message).slice(0, 300) }, 500);
  }
});
