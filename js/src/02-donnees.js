  // ---------- données ----------
  function queueReview(id, patch) { try { const q = JSON.parse(safeGet("merge.file") || "[]"); q.push({ id, patch }); safeSet("merge.file", JSON.stringify(q)); } catch (e) { /* file indisponible */ } }
  async function flushQueue() {
    let q = []; try { q = JSON.parse(safeGet("merge.file") || "[]"); } catch (e) { q = []; }
    if (!q.length) return;
    const rest = [];
    for (const it of q) { try { const r = await sb.from("cards").update(it.patch).eq("id", it.id); if (r.error) rest.push(it); } catch (e) { rest.push(it); } }
    safeSet("merge.file", JSON.stringify(rest));
  }
  async function loadAll() {
    state.loadedAt = Date.now();
    await flushQueue();
    const uid = state.user.id; const since = new Date(); since.setDate(since.getDate() - 120);
    const allCards = async (cols) => { const out = []; for (let from = 0; ; from += 1000) { const r = await sb.from("cards").select(cols).eq("user_id", uid).order("created_at").range(from, from + 999); if (r.error) return r; out.push(...(r.data || [])); if ((r.data || []).length < 1000) return { data: out, error: null }; } };
    let [p, s, c, k, ss, g] = await Promise.all([
      sb.from("profiles").select("*").eq("user_id", uid).maybeSingle(),
      sb.from("subjects").select("*").eq("archived", false).eq("user_id", uid).order("created_at"),
      sb.from("chapters").select("id,name,status,subject_id,group_id,cards_target,lang,notes,color,created_at").eq("archived", false).eq("user_id", uid).order("created_at"),
      allCards(CARD_META + ",mastered,mnemonic,picture,image_box"),
      sb.from("study_sessions").select("day,seconds,cards_reviewed").eq("user_id", uid).gte("day", localDay(since)),
      sb.from("groups").select("id,name,subject_id,color,created_at").eq("user_id", uid).order("created_at")
    ]);
    state.legacy = false;
    // Bases plus anciennes : sans image_box (cadre des schémas), puis sans image, puis sans les colonnes v6.
    if (k.error) k = await allCards(CARD_META + ",mastered,mnemonic,picture");
    if (k.error) { k = await allCards(CARD_META + ",mastered,mnemonic"); if (k.error) { k = await allCards(CARD_META); state.legacy = true; } }
    for (const r of [p, s, c, k, ss]) if (r.error) throw r.error;
    state.profile = p.data; state.subjects = s.data || []; state.chapters = c.data || []; state.sessions = ss.data || []; state.groups = g.error ? [] : (g.data || []);
    state.chapters = state.chapters.filter(c => state.subjects.some(x => x.id === c.subject_id));
    state.cards = (k.data || []).filter(c => state.chapters.some(x => x.id === c.chapter_id));
    state.offline = false;
    try { await kvPull(); } catch (e) { /* synchronisation au prochain passage */ }
    try { await ctrlSync(true); } catch (e) { /* refait au prochain chargement */ }
    try { seasonReset(); } catch (e) { /* refait au prochain chargement */ }
    safeSet("merge.cache." + uid, JSON.stringify({ profile: state.profile, subjects: state.subjects, groups: state.groups, chapters: state.chapters, cards: state.cards, sessions: state.sessions, legacy: state.legacy }));
    applyLook(state.profile); applyRewards();
    setTimeout(prefetchOffline, 4000);
  }
  // Retour sur l'appli (autre onglet, appli rouverte sur le téléphone) : on recharge les données si elles ont plus d'une minute,
  // pour qu'un chapitre ou une matière mis à la corbeille sur un autre appareil disparaisse partout ici aussi.
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState !== "visible" || !state.user || !state.profile || state.offline || Date.now() - (state.loadedAt || 0) < 60000) return;
    // Seulement sur les écrans de listes : jamais pendant une session de cartes, un quiz, un import ou un minuteur.
    const LIST = /^#?(accueil|matieres|calendrier|progres|perso|matiere-.*|dossier-.*|chapitre-.*)?$/, h = location.hash;
    if (!LIST.test(h) || Object.values(IMPORTS).some(d => d.busy) || document.getElementById("sheet")) return;
    try { await loadAll(); } catch (e) { return; }
    if (location.hash === h) route();
  });
  // Pas de zoom (pincement ou double appui) : l'appli est faite pour l'écran du téléphone. Safari iOS ignore user-scalable=no, d'où ces gestes bloqués.
  ["gesturestart", "gesturechange"].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
  document.addEventListener("touchmove", e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  // Double appui : bloqué par touch-action: manipulation (css), sans gêner deux appuis rapides sur deux boutons différents.
  // Hors ligne complet : résumés et contenus déjà générés (quiz, fiche, carte mentale…) copiés sur l'appareil, au plus toutes les 30 min.
  function offlineKeep(k, v) { const t = JSON.stringify(v); try { if (localStorage.getItem(k) !== t) localStorage.setItem(k, t); return true; } catch (e) { return false; } }
  let prefetchAt = 0;
  async function prefetchOffline() {
    if (!state.user || state.offline || Date.now() - prefetchAt < 1800000) return; prefetchAt = Date.now();
    const ids = state.chapters.map(c => c.id); if (!ids.length) return;
    try {
      for (let i = 0; i < ids.length; i += 50) {
        const part = ids.slice(i, i + 50);
        const [sr, gr] = await Promise.all([sb.from("summaries").select("chapter_id,markdown,edited_by_user").in("chapter_id", part), sb.from("ai_cache").select("chapter_id,kind,content").in("chapter_id", part)]);
        for (const x of (sr.data || [])) if (!offlineKeep("merge.sum." + x.chapter_id, x)) return;
        for (const x of (gr.data || [])) if (x.content && !offlineKeep(genKey(x.chapter_id, x.kind), x.content)) return;
      }
    } catch (e) { /* on réessaiera plus tard */ }
  }
  function loadCache() {
    try { const c = JSON.parse(safeGet("merge.cache." + state.user.id) || "null"); if (!c || !c.profile) return false; Object.assign(state, { groups: [] }, c, { offline: true }); applyLook(state.profile); return true; } catch (e) { return false; }
  }
  async function ai(body, fn) {
    const { data, error } = await sb.functions.invoke(fn || "ai", { body });
    if (!error) return data;
    let j = null; try { j = await error.context.json(); } catch (e) { /* pas de détail */ }
    const code = j && j.error;
    const msg = code === "quota" ? QUOTA_MSG
      : code === "config" ? "L'IA n'est pas encore branchée : la clé Google manque dans Supabase."
      : code === "ia_indisponible" ? "L'IA est coupée pour l'instant (plafond du mois ou accès Google). Tes révisions continuent de marcher."
      : code === "requete" ? j.detail
      : "L'IA n'a pas répondu" + (j && j.detail ? " : " + j.detail : ". Réessaie dans un instant.");
    const e = new Error(msg); e.code = code; throw e;
  }

  // ---------- quota, erreurs IA et cache des contenus générés ----------
  const QUOTA_MSG = "Vous avez atteint votre limite journalière. Contacte le créateur pour débloquer ou reviens demain. Tes révisions continuent de marcher !";
  function errHtml(e) {
    if (e && e.code === "quota") return `<div class="quotabox" role="alert"><p>${esc(QUOTA_MSG)}</p><a class="btn sm" href="${esc(C.CONTACT_CREATEUR)}" target="_blank" rel="noopener">${I.mail}Contacter le créateur</a></div>`;
    return `<p class="err" role="alert">${esc((e && e.message) || "Une erreur est survenue.")}</p>`;
  }
  function showErr(el, e) { if (!el) return; el.className = ""; el.innerHTML = errHtml(e); }
  // Tout contenu généré est gardé (mémoire, stockage local, table ai_cache) : jamais deux appels pour le même chapitre.
  const mem = {}, courseMemo = {};
  const genKey = (ch, kind) => "merge.gen." + ch + "." + kind;
  async function getCached(ch, kind) {
    const k = ch + "." + kind; if (mem[k]) return mem[k];
    try { const l = JSON.parse(safeGet(genKey(ch, kind)) || "null"); if (l) return (mem[k] = l); } catch (e) { /* cache local illisible */ }
    if (state.offline) return null;
    try { const r = await sb.from("ai_cache").select("content").eq("chapter_id", ch).eq("kind", kind).maybeSingle(); if (r.data && r.data.content) { mem[k] = r.data.content; safeSet(genKey(ch, kind), JSON.stringify(mem[k])); return mem[k]; } } catch (e) { /* table absente : cache local seulement */ }
    return null;
  }
  async function putCached(ch, kind, content) {
    mem[ch + "." + kind] = content; safeSet(genKey(ch, kind), JSON.stringify(content));
    try { await sb.from("ai_cache").upsert({ chapter_id: ch, kind, content }); } catch (e) { /* gardé en local */ }
  }
  async function courseText(id) {
    if (courseMemo[id] != null) return courseMemo[id];
    const { data, error } = await sb.from("sources").select("extracted_text").eq("chapter_id", id);
    if (error) throw new Error("Impossible de relire ton cours. Vérifie ta connexion.");
    return (courseMemo[id] = (data || []).map(x => x.extracted_text || "").join("\n\n"));
  }
  async function study(ch, kind, force) {
    if (!force) { const c = await getCached(ch, kind); if (c) return c; }
    const text = await courseText(ch); if (text.trim().length < 80) throw new Error("Importe d'abord ton cours dans ce chapitre.");
    const r = await ai({ action: "study", kind, text });
    if (!r || !r.content) throw new Error("L'IA n'a rien renvoyé. Réessaie.");
    await putCached(ch, kind, r.content); return r.content;
  }
  const toolHead = (id, title) => `<div class="row noprint"><a class="iconbtn" href="#chapitre-${id}" aria-label="Retour au chapitre">${I.x}</a><div class="grow" style="text-align:center;font-weight:800">${esc(title)}</div><span style="width:44px"></span></div>`;
  // Écran d'un outil généré par l'IA : affiche le contenu gardé, sinon propose de le préparer (1 appel).
  async function toolGate(id, kind, title, desc, render) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; app.innerHTML = toolHead(id, title) + `<p class="muted">Chargement…</p>`;
    const here = location.hash, regen = () => make(true);
    async function make(force) {
      app.innerHTML = toolHead(id, title) + `<div class="card done"><div class="spin" aria-hidden="true"></div><p class="muted" role="status">Merge prépare « ${esc(title)} » à partir de ton cours…</p></div>`;
      try { const c = await study(id, kind, force); if (location.hash === here) render(c, ch, regen); }
      catch (e) { if (location.hash !== here) return; app.innerHTML = toolHead(id, title) + `<div class="card pad stack"><h1>${esc(title)}</h1>${errHtml(e)}<a class="btn ghost" href="#chapitre-${id}">Retour au chapitre</a></div>`; }
    }
    const c = await getCached(id, kind); if (location.hash !== here) return;
    if (c) return render(c, ch, regen);
    app.innerHTML = toolHead(id, title) + `<div class="card pad stack"><h1>${esc(title)}</h1><p class="muted">${desc}</p><button class="btn" id="mk">Préparer avec l'IA</button><p class="note">1 appel IA, puis c'est gardé : tu pourras rouvrir cet outil autant de fois que tu veux. Tout vient uniquement de ton cours.</p></div>`;
    $("mk").onclick = () => make(false);
  }
  const regenHtml = `<p class="note noprint" style="text-align:center"><button class="linkbtn" id="regen">Refaire avec l'IA (1 appel)</button></p>`;
  function wireRegen(regen) { const b = $("regen"); if (b) b.onclick = () => { if (b.dataset.ok !== "1") { b.dataset.ok = "1"; b.textContent = "Confirmer : remplacer ce contenu (1 appel)"; return; } regen(); }; }

  // ---------- carnet d'erreurs ----------
  const errKey = () => "merge.erreurs." + (state.user ? state.user.id : "");
  function localMistakes() { try { return JSON.parse(safeGet(errKey()) || "[]"); } catch (e) { return []; } }
  // Annule une erreur notée par erreur (bouton « Annuler » des cartes) : une fois de moins, ou supprimée si c'était la première.
  async function unlogMistake(chapterId, q) {
    const question = String(q).slice(0, 600);
    try {
      if (state.offline) throw new Error("hors ligne");
      const old = await sb.from("mistakes").select("id,times").eq("chapter_id", chapterId).eq("question", question).maybeSingle();
      if (old.error) throw old.error; if (!old.data) throw new Error("pas en base");
      if ((old.data.times || 1) > 1) await sb.from("mistakes").update({ times: old.data.times - 1 }).eq("id", old.data.id); else await sb.from("mistakes").delete().eq("id", old.data.id);
    } catch (e) {
      const l = localMistakes(), o = l.find(x => x.chapter_id === chapterId && x.question === question); if (!o) return;
      safeSet(errKey(), JSON.stringify((o.times || 1) > 1 ? (o.times--, l) : l.filter(x => x !== o)));
    }
  }
  async function logMistake(chapterId, q, expected, given, mode, cardId) {
    const row = { chapter_id: chapterId, card_id: cardId || null, mode, question: String(q).slice(0, 600), expected: String(expected).slice(0, 2000), given: given ? String(given).slice(0, 1500) : null };
    try {
      if (state.offline) throw new Error("hors ligne");
      const old = await sb.from("mistakes").select("id,times").eq("chapter_id", chapterId).eq("question", row.question).maybeSingle();
      if (old.error) throw old.error;
      const r = old.data ? await sb.from("mistakes").update({ times: (old.data.times || 1) + 1, given: row.given, mode, updated_at: new Date().toISOString() }).eq("id", old.data.id) : await sb.from("mistakes").insert(row);
      if (r.error) throw r.error;
    } catch (e) {
      const l = localMistakes(), o = l.find(x => x.chapter_id === chapterId && x.question === row.question);
      if (o) { o.times = (o.times || 1) + 1; o.given = row.given; o.updated_at = new Date().toISOString(); } else l.unshift(Object.assign(row, { id: "local-" + Date.now() + "-" + Math.round(Math.random() * 1e6), times: 1, updated_at: new Date().toISOString() }));
      safeSet(errKey(), JSON.stringify(l.slice(0, 300)));
    }
  }

  // ---------- date du contrôle : calendrier en vue mois + révision libre ----------
  const fmtDate = d => new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const isFree = s => !!s.free_revision || safeGet("merge.libre." + s.id) === "1";
  function examPicker(box, val, onChange, noFree) {
    const v = { date: val.date || null, free: !!val.free }, ref = new Date((v.date || localDay()) + "T00:00:00"); ref.setDate(1);
    function draw() {
      const y = ref.getFullYear(), m = ref.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate(), today = localDay();
      let cells = ""; for (let i = 0; i < first; i++) cells += "<span></span>";
      for (let d = 1; d <= n; d++) { const key = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0"); cells += `<button type="button" class="day${key === today ? " now" : ""}" data-day="${key}" aria-pressed="${v.date === key}"${key < today || v.free ? " disabled" : ""}>${d}</button>`; }
      box.innerHTML = `<div class="picker card pad stack${v.free ? " off" : ""}"><div class="row between"><button type="button" class="iconbtn flat" data-nav="-1" aria-label="Mois précédent">${I.back}</button><b style="text-transform:capitalize">${ref.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</b><button type="button" class="iconbtn flat" data-nav="1" aria-label="Mois suivant" style="transform:scaleX(-1)">${I.back}</button></div>
        <div class="cal">${["L", "M", "M", "J", "V", "S", "D"].map(x => `<span class="wd">${x}</span>`).join("")}${cells}</div>
        <p class="small muted" aria-live="polite">${v.free ? "Révision libre : pas de date, tu avances à ton rythme." : v.date ? "Contrôle le " + fmtDate(v.date) + "." : "Touche le jour de ton contrôle."}</p>
        ${noFree ? "" : `<button type="button" class="switch" role="switch" aria-checked="${v.free}" data-free><i></i><span>Pas de contrôle prévu, révision libre</span></button>`}</div>`;
      box.querySelectorAll("[data-nav]").forEach(b => b.onclick = () => { ref.setMonth(ref.getMonth() + (+b.dataset.nav)); draw(); });
      box.querySelectorAll("[data-day]").forEach(b => b.onclick = () => { v.date = v.date === b.dataset.day ? null : b.dataset.day; draw(); onChange({ date: v.date, free: false }); });
      if (box.querySelector("[data-free]")) box.querySelector("[data-free]").onclick = () => { v.free = !v.free; if (v.free) v.date = null; draw(); onChange({ date: v.date, free: v.free }); };
    }
    draw();
  }
  async function saveExam(id, v) {
    const date = v.free ? null : (v.date || null), sub0 = state.subjects.find(x => x.id === id), old = sub0 && sub0.exam_date;
    let r = await sb.from("subjects").update({ exam_date: date, free_revision: !!v.free }).eq("id", id);
    if (r.error) { r = await sb.from("subjects").update({ exam_date: date }).eq("id", id); if (r.error) return r.error; }
    safeSet("merge.libre." + id, v.free ? "1" : "");
    // Chapitres choisis pour le contrôle : ils suivent la date si on la décale ; un nouveau contrôle (l'ancien est passé) repart de zéro.
    const sel = jget("merge.examch." + id, null); if (sel && date && sel.d === old && old >= localDay()) jset("merge.examch." + id, Object.assign(sel, { d: date }));
    const s = state.subjects.find(x => x.id === id); if (s) { s.exam_date = date; s.free_revision = !!v.free; }
    return null;
  }

  // ---------- contrôles : plusieurs par matière (user_kv « merge.controles »), avec les chapitres de chacun ----------
  // { id, s: matière, d: "AAAA-MM-JJ", ch: [chapitres] ou null (= tous) }. subjects.exam_date garde la date du PROCHAIN contrôle
  // de la matière : c'est elle qu'utilisent le plan, l'accueil et les rappels (qui lisent aussi cette liste côté serveur).
  const ctrls = () => (jget("merge.controles", null) || []).filter(c => c && c.id && c.s && /^\d{4}-\d{2}-\d{2}$/.test(c.d));
  const ctrlSave = l => jset("merge.controles", l);
  const ctrlsOf = sid => ctrls().filter(c => c.s === sid).sort((a, b) => a.d.localeCompare(b.d));
  const nextCtrl = s => s && !isFree(s) ? ctrlsOf(s.id).find(c => c.d >= localDay()) || null : null;
  const upCtrls = () => ctrls().filter(c => c.d >= localDay()).map(c => ({ c, s: state.subjects.find(x => x.id === c.s) })).filter(x => x.s && !isFree(x.s)).sort((a, b) => a.c.d.localeCompare(b.c.d));
  const jx = d => { const j = daysUntil(d); return j === 0 ? "Auj." : "J-" + j; };
  async function ctrlSync(migrate) {
    let l = ctrls(), changed = false;
    // Dates déjà en base (avant cette version, ou mises à l'inscription) : elles deviennent des contrôles, avec l'ancien choix de chapitres.
    if (migrate) state.subjects.forEach(s => { if (s.exam_date && !isFree(s) && s.exam_date >= localDay() && !l.some(c => c.s === s.id && c.d === s.exam_date)) { const v = jget("merge.examch." + s.id, null); l.push({ id: "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), s: s.id, d: s.exam_date, ch: v && v.on && v.d === s.exam_date && Array.isArray(v.ids) && v.ids.length ? v.ids : null }); changed = true; } });
    const seen = new Set(), old = localDay(new Date(Date.now() - 60 * 86400000));
    const l2 = l.filter(c => { const k = c.s + c.d; if (seen.has(k) || c.d < old) return false; seen.add(k); return true; });
    if (l2.length !== l.length || changed) ctrlSave(l2);
    if (state.offline) return;
    for (const s of state.subjects) { if (isFree(s)) continue; const nx = nextCtrl(s), want = nx ? nx.d : null; if ((s.exam_date || null) !== want && (want || (s.exam_date && s.exam_date >= localDay()))) await saveExam(s.id, { date: want, free: false }); }
  }
  async function ctrlAdd(sid, d) {
    const l = ctrls(); if (l.some(c => c.s === sid && c.d === d)) return null;
    const c = { id: "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), s: sid, d, ch: null }; l.push(c); ctrlSave(l); await ctrlSync(); return c;
  }
  async function ctrlDel(cid) { ctrlSave(ctrls().filter(c => c.id !== cid)); await ctrlSync(); }
  // Fenêtre « Quels chapitres tombent ? » : ouverte juste après avoir placé un contrôle, et depuis le bouton « Chapitres ».
  function ctrlChSheet(cid, after) {
    const c = ctrls().find(x => x.id === cid), s = c && state.subjects.find(x => x.id === c.s); if (!s) return;
    const chs = state.chapters.filter(x => x.subject_id === s.id), sel = new Set((c.ch || []).filter(x => chs.some(y => y.id === x)));
    const paint = el => {
      el.querySelector("#cchs").innerHTML = chs.map(x => `<button type="button" class="chip" data-cc="${x.id}" aria-pressed="${sel.has(x.id)}" style="--c:${esc(s.color)}"><span class="dot"></span>&nbsp;${esc(x.name)}</button>`).join("");
      el.querySelector("#ccall").setAttribute("aria-pressed", String(!sel.size));
      el.querySelector("#ccnote").textContent = sel.size ? "Ton plan de révision ne gardera que " + (sel.size > 1 ? "ces " + sel.size + " chapitres." : "ce chapitre.") : "Tous les chapitres de la matière sont au programme.";
      el.querySelectorAll("[data-cc]").forEach(b => b.onclick = () => { sel.has(b.dataset.cc) ? sel.delete(b.dataset.cc) : sel.add(b.dataset.cc); paint(el); });
    };
    sheet(`<div class="row"><span class="mico big">${I.cal}</span><h1>Contrôle de ${esc(s.name)}</h1></div><p class="muted">${esc(fmtDate(c.d))}</p><h2>Quels chapitres tombent ?</h2>
      ${chs.length ? `<button type="button" class="chip big" id="ccall" aria-pressed="true">Tous les chapitres</button><span class="label">Ou seulement :</span><div class="chips" id="cchs"></div><p class="small muted" id="ccnote" aria-live="polite"></p>` : '<p class="small muted">Pas encore de chapitre dans cette matière : le contrôle porte sur toute la matière. Tu pourras choisir les chapitres plus tard.</p><span id="ccall" hidden></span><span id="cchs" hidden></span><span id="ccnote" hidden></span>'}
      <button class="btn" id="ccok">Valider</button>`, el => {
      paint(el);
      el.querySelector("#ccall").onclick = () => { sel.clear(); paint(el); };
      el.querySelector("#ccok").onclick = () => { const l = ctrls(), x = l.find(y => y.id === cid); if (x) { x.ch = sel.size ? [...sel] : null; ctrlSave(l); } closeSheet(); toast(sel.size ? "Contrôle enregistré avec " + plural(sel.size, "chapitre", "chapitres") + "." : "Contrôle enregistré."); if (after) after(); };
    });
  }

