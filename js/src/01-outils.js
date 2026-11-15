  // ---------- utilitaires ----------
  // Bibliothèques lourdes (PDF, fichiers Office) chargées seulement quand on en a besoin : démarrage plus rapide sur téléphone.
  const libP = {};
  function needLib(src, test) { if (test()) return Promise.resolve(); return libP[src] || (libP[src] = new Promise((ok, ko) => { const sc = document.createElement("script"); sc.src = src; sc.onload = ok; sc.onerror = () => { delete libP[src]; ko(new Error("Chargement impossible. Vérifie ta connexion.")); }; document.head.appendChild(sc); })); }
  const needPdf = () => needLib("vendor/pdf.min.js", () => !!window.pdfjsLib), needZip = () => needLib("vendor/jszip.min.js", () => !!window.JSZip);
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  let toastT;
  function toast(m) { toastEl.textContent = m; toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (toastEl.hidden = true), 3200); }
  function $(id) { return document.getElementById(id); }
  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  // Ces clés sont gardées sur l'appareil ET dans le compte (table user_kv) : on retrouve la même chose sur téléphone et sur PC.
  // Restent sur l'appareil seulement : kvts (horodatages), file (révisions en attente d'envoi), cache.* et gen.* (copies de la base), erreurs.* (copie de secours de la table mistakes). Le thème est dans le profil.
  const SYNC = /^merge\.(fav|typed|resume|pomomute|pomocfg|badges|level|voice|rate|lofivol|lofi|cmore|noinstall|tuto|note\..+|hl\..+|occl\..+|hist\..+|time\..+|libre\..+|examch\..+|mixsel|controles|boostnext|boostj|journee|exo\..+|prof|boss\..+|mnemo\..+|rewards|wallet|edt|vengine|redresse|methode\..+|bac\..+|ecoute\..+|flash\..+|jobseen\..+)$/;
  let kvTs = {}, kvQueue = {}, kvTimer = null, kvOff = false, kvAt = 0;
  try { kvTs = JSON.parse(localStorage.getItem("merge.kvts") || "{}") || {}; } catch (e) { kvTs = {}; }
  const kvSaveTs = () => { try { localStorage.setItem("merge.kvts", JSON.stringify(kvTs)); } catch (e) { /* rien */ } };
  function safeSet(k, v) {
    let same = false; try { same = localStorage.getItem(k) === String(v); localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ }
    if (SYNC.test(k) && !(same && kvTs[k])) { kvTs[k] = Date.now(); kvSaveTs(); kvQueue[k] = String(v); clearTimeout(kvTimer); kvTimer = setTimeout(kvFlush, 900); }
  }
  async function kvFlush() {
    clearTimeout(kvTimer); if (!state.user || kvOff) return;
    const rows = Object.entries(kvQueue).map(([key, value]) => ({ user_id: state.user.id, key, value: value.slice(0, 190000), updated_at: new Date(kvTs[key] || Date.now()).toISOString() })); kvQueue = {};
    if (!rows.length) return;
    try { const r = await sb.from("user_kv").upsert(rows); if (r.error) { if (/user_kv|schema cache|does not exist/i.test(r.error.message || "")) kvOff = true; else rows.forEach(x => { if (kvQueue[x.key] == null) kvQueue[x.key] = x.value; }); } }
    catch (e) { rows.forEach(x => { if (kvQueue[x.key] == null) kvQueue[x.key] = x.value; }); }
  }
  // Récupère ce que les autres appareils ont enregistré ; le plus récent gagne. Renvoie true si quelque chose a changé ici.
  async function kvPull() {
    if (!state.user || kvOff) return false; kvAt = Date.now();
    let r; try { r = await sb.from("user_kv").select("key,value,updated_at").eq("user_id", state.user.id); } catch (e) { return false; }
    if (r.error) { if (/user_kv|schema cache|does not exist/i.test(r.error.message || "")) kvOff = true; return false; }
    state.kvOk = true; let changed = false; const remote = {};
    (r.data || []).forEach(row => {
      const ts = Date.parse(row.updated_at) || 0; remote[row.key] = ts; if (!SYNC.test(row.key)) return;
      if (!kvTs[row.key] || ts > kvTs[row.key]) { try { if (localStorage.getItem(row.key) !== row.value) { localStorage.setItem(row.key, row.value); changed = true; } } catch (e) { /* rien */ } kvTs[row.key] = ts; }
    });
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!SYNC.test(k)) continue; if (remote[k] == null || (kvTs[k] || 0) > remote[k]) { if (!kvTs[k]) kvTs[k] = Date.now(); kvQueue[k] = localStorage.getItem(k); } } } catch (e) { /* rien */ }
    kvSaveTs(); kvFlush(); return changed;
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") return void kvFlush();
    if (state.user && state.profile && Date.now() - kvAt > 45000) kvPull().then(ch => { if (ch) applyRewards(); if (ch && /^#?(accueil|matieres|progres|calendrier|chapitre-.*|matiere-.*)?$/.test(location.hash)) route(); });
  });
  window.addEventListener("pagehide", () => { kvFlush(); });
  // Toutes les 2 minutes quand l'appli est ouverte : récupère ce qui a changé sur l'autre appareil.
  setInterval(() => { if (document.visibilityState === "visible" && state.user && state.profile && !state.offline && Date.now() - kvAt > 110000) kvPull().then(ch => { if (ch && /^#?(accueil|matieres|progres|calendrier)?$/.test(location.hash)) route(); }); }, 120000);
  window.addEventListener("online", () => { kvFlush(); });
  // Bouton retour flottant : quand on remonte dans une page longue, un petit bouton translucide apparaît en haut à gauche.
  const fback = document.createElement("button"); fback.className = "floatback"; fback.type = "button"; fback.setAttribute("aria-label", "Retour"); fback.innerHTML = I.back; document.body.appendChild(fback);
  let fbY = scrollY, fbT = null;
  const fbTarget = () => { const a = app.querySelector('a.iconbtn[href^="#"][aria-label^="Retour"], a.iconbtn[href^="#"][aria-label="Fermer"], a.iconbtn[href^="#"][aria-label^="Retour au"], button.iconbtn[aria-label^="Retour"]'); return a; };
  const fbHide = () => { fback.classList.remove("on"); document.documentElement.classList.remove("fbon"); };
  addEventListener("scroll", () => {
    const y = scrollY, up = y < fbY - 4, down = y > fbY + 4; if (up || down) fbY = y;
    if (y < 240 || down || !fbTarget()) fbHide(); else if (up) { fback.classList.add("on"); document.documentElement.classList.add("fbon"); clearTimeout(fbT); fbT = setTimeout(fbHide, 3500); }
  }, { passive: true });
  fback.onclick = () => { const a = fbTarget(); fbHide(); if (a) a.click(); };
  addEventListener("hashchange", fbHide);
  // Temps d'écran (tableau de bord /admin) : secondes passées appli ouverte et visible, envoyées par paquets d'une minute.
  const usage = { acc: 0, last: Date.now() };
  const usagePlace = () => { const ua = navigator.userAgent || ""; const dev = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? (/Mobile/.test(ua) ? "Téléphone Android" : "Tablette Android") : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "PC Windows" : /Linux/.test(ua) ? "PC Linux" : "Appareil"; const br = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Navigateur"; let tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { /* rien */ } return [dev, br + (isStandalone() ? " (appli)" : ""), tz].filter(Boolean).join(" · "); };
  function usageTick() { const now = Date.now(); if (document.visibilityState === "visible" && state.user) usage.acc += Math.min(60, Math.max(0, (now - usage.last) / 1000)); usage.last = now; }
  function usageFlush() { usageTick(); const s = Math.round(usage.acc); if (!state.user || s < 5 || state.offline) return; usage.acc -= s; Promise.resolve(sb.rpc("track_usage", { p_day: localDay(), p_seconds: Math.min(120, s), p_place: usagePlace() })).catch(() => { usage.acc += s; }); }
  setInterval(usageTick, 15000); setInterval(usageFlush, 60000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") usageFlush(); else usage.last = Date.now(); });
  window.__mergeUsage = usageFlush;
  window.__mergeSync = { pull: kvPull, flush: kvFlush, set: (k, v) => safeSet(k, v), synced: k => SYNC.test(k) };
  function applyLook(p) {
    const r = document.documentElement;
    const theme = (p && p.theme) || safeGet("merge.theme") || "system";
    if (theme === "system") r.removeAttribute("data-theme"); else r.dataset.theme = theme;
    r.dataset.size = (p && p.text_size) || "normal";
    safeSet("merge.theme", theme);
  }
  function localDay(d) { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function daysUntil(d) { if (!d) return null; const a = new Date(d + "T00:00:00"), b = new Date(); b.setHours(0, 0, 0, 0); return Math.round((a - b) / 86400000); }
  function colorFor(name, i) { return COULEUR_PAR_NOM[name.trim().toLowerCase()] || COULEURS[i % COULEURS.length]; }
  function fail(error, quoi) { console.error(quoi, error); toast(quoi + " : " + (error && error.message ? error.message : "erreur inconnue")); }
  function plural(n, un, des) { return n + " " + (n > 1 ? des : un); }
  // Formules : $…$ et $$…$$ (ou \(…\) et \[…\]) sont affichées comme en cours avec KaTeX (fractions posées, indices, symboles).
  const TEXSYM = { times: "×", cdot: "·", div: "÷", Omega: "Ω", omega: "ω", pi: "π", alpha: "α", beta: "β", lambda: "λ", mu: "µ", Delta: "Δ", delta: "δ", theta: "θ", rho: "ρ", sigma: "σ", phi: "φ", leq: "≤", geq: "≥", le: "≤", ge: "≥", neq: "≠", approx: "≈", infty: "∞", to: "→", rightarrow: "→", Rightarrow: "⇒", leftrightarrow: "↔", pm: "±", degree: "°", circ: "°", sqrt: "√" };
  function mathify(text, bold) {
    const out = [], re = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^$\n]+?)\$/g; let last = 0, m;
    const plain = t => esc(t.replace(/\\([A-Za-z]+)/g, (x, k) => TEXSYM[k] || x));
    while ((m = re.exec(text))) { out.push(plain(text.slice(last, m.index))); const tex = m[1] || m[2] || m[3] || m[4], disp = !!(m[1] || m[2]); out.push(`<span class="m${disp ? " md" : ""}" data-tex="${esc(tex)}">${esc(tex)}</span>`); last = re.lastIndex; }
    out.push(plain(text.slice(last))); const h = out.join(""); return bold ? h.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>") : h;
  }
  const mx = t => mathify(String(t == null ? "" : t), false);
  // Version texte d'une formule, pour les endroits où KaTeX ne peut pas s'afficher (bulles SVG, voix, titres).
  const texPlain = t => String(t == null ? "" : t).replace(/\$+/g, "").replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)").replace(/\\(?:text|mathrm|mathbf)\{([^{}]*)\}/g, "$1").replace(/\\([A-Za-z]+)/g, (x, k) => TEXSYM[k] || "").replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
  let katexP = null;
  function loadKatex() {
    if (window.katex) return Promise.resolve(); if (katexP) return katexP;
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "vendor/katex/katex.min.css"; document.head.appendChild(css);
    katexP = new Promise((ok, ko) => { const sc = document.createElement("script"); sc.src = "vendor/katex/katex.min.js"; sc.onload = ok; sc.onerror = () => { katexP = null; ko(); }; document.head.appendChild(sc); });
    return katexP;
  }
  function renderMath(root) {
    const els = (root || document).querySelectorAll("span.m:not([data-ok])"); if (!els.length) return;
    loadKatex().then(() => els.forEach(el => { if (el.dataset.ok) return; try { window.katex.render(el.dataset.tex, el, { displayMode: el.classList.contains("md"), throwOnError: false, strict: false, output: "html" }); } catch (e) { /* formule laissée en texte */ } el.dataset.ok = "1"; })).catch(() => {});
  }
  new MutationObserver(() => { renderMath(document.body); if (typeof fillPics === "function" && state.user) fillPics(document.body); }).observe(document.body, { childList: true, subtree: true });
  function md(text) {
    const out = []; let list = false;
    const inline = s => mathify(s, true);
    String(text || "").split(/\r?\n/).forEach(l => {
      const t = l.trim();
      if (/^[-*•]\s+/.test(t)) { if (!list) { out.push("<ul>"); list = true; } out.push("<li>" + inline(t.replace(/^[-*•]\s+/, "")) + "</li>"); return; }
      if (list) { out.push("</ul>"); list = false; }
      if (/^#{1,4}\s+/.test(t)) out.push("<h3>" + inline(t.replace(/^#{1,4}\s+/, "")) + "</h3>");
      else if (t) out.push("<p>" + inline(t) + "</p>");
    });
    if (list) out.push("</ul>");
    return out.join("");
  }

  // ---------- FSRS ----------
  function toFsrs(row) {
    if (!row.last_review) return F.createEmptyCard(new Date());
    return { due: new Date(row.due_at), stability: row.stability || 0, difficulty: row.difficulty || 0, elapsed_days: row.elapsed_days || 0, scheduled_days: row.scheduled_days || 0, reps: row.reps || 0, lapses: row.lapses || 0, learning_steps: 0, state: row.state || 0, last_review: new Date(row.last_review) };
  }
  // Maîtrise = part des cartes réussies : « Juste » la fait entrer dans la jauge, « Faux » l'en retire jusqu'à la prochaine réussite.
  // Sans la colonne cards.mastered (base pas encore migrée), on retombe sur l'état FSRS « en révision ».
  const isMastered = c => c.mastered != null ? !!c.mastered : c.state === 2;
  function mastery(cards) { if (!cards.length) return 0; return Math.floor(cards.filter(isMastered).length / cards.length * 100); }
  function cardsOf(chapterId) { return state.cards.filter(c => c.chapter_id === chapterId); }
  // Cartes à revoir = celles que la répétition espacée (FSRS) ramène aujourd'hui, PLUS, avant un contrôle proche, toutes les cartes
  // des chapitres du contrôle pas encore vues aujourd'hui (réglage « Avant un contrôle » : 7 jours par défaut, 0 = jamais).
  // Une de ces cartes « en plus » réussie ne touche pas à son calendrier FSRS (elle est juste notée vue aujourd'hui) ;
  // ratée, elle repasse par FSRS comme n'importe quelle carte oubliée.
  const boostDays = () => { const n = +jget("merge.boostj", 7); return [0, 3, 7, 14].includes(n) ? n : 7; };
  // Chapitres concernés → date du contrôle le plus proche qui les contient.
  function boostChapters() {
    const n = boostDays(); if (!n || !state.chapters) return null; const ids = new Map();
    upCtrls().forEach(({ c, s }) => { if (daysUntil(c.d) > n) return; (c.ch && c.ch.length ? c.ch : state.chapters.filter(x => x.subject_id === s.id).map(x => x.id)).forEach(i => { if (!ids.has(i) || c.d < ids.get(i)) ids.set(i, c.d); }); });
    return ids.size ? ids : null;
  }
  // Prochain passage de chaque carte en révision de contrôle (merge.boostnext, synchronisé) : « Trop facile » → après le contrôle,
  // « Juste » → dans 2 jours, « Juste, mais à revoir » → demain, « Faux » → aujourd'hui même.
  const boostNext = () => { const v = jget("merge.boostnext", null); return v && typeof v === "object" ? v : {}; };
  function setBoostNext(id, rating, prev) {
    const b = boostChapters(), row = state.cards.find(c => c.id === id); if (!b || !row || !b.has(row.chapter_id)) return;
    const m = boostNext(), t = new Date(localDay() + "T12:00:00"), plus = n => localDay(new Date(t.getTime() + n * 86400000));
    if (prev !== undefined) { if (prev === null) delete m[id]; else m[id] = prev; }
    else m[id] = rating === F.Rating.Easy ? plus(daysUntil(b.get(row.chapter_id)) + 1) : rating === F.Rating.Good ? plus(2) : rating === F.Rating.Hard ? plus(1) : localDay();
    const old = localDay(new Date(Date.now() - 30 * 86400000)); Object.keys(m).forEach(k => { if (m[k] < old) delete m[k]; });
    jset("merge.boostnext", m);
  }
  const fsrsDue = c => new Date(c.due_at).getTime() <= Date.now();
  function dueCards(list) { const b = boostChapters(), m = b ? boostNext() : null, today = localDay(); return list.filter(c => fsrsDue(c) || (b && b.has(c.chapter_id) && (!m[c.id] || m[c.id] <= today))); }
  const VACANCES_ZONES = {
    A: [["Toussaint", "2026-10-17", "2026-11-01"], ["Noël", "2026-12-19", "2027-01-03"], ["Hiver", "2027-02-13", "2027-02-28"], ["Printemps", "2027-04-10", "2027-04-25"], ["Été", "2027-07-03", "2027-08-31"]],
    B: [["Toussaint", "2026-10-17", "2026-11-01"], ["Noël", "2026-12-19", "2027-01-03"], ["Hiver", "2027-02-20", "2027-03-07"], ["Printemps", "2027-04-17", "2027-05-02"], ["Été", "2027-07-03", "2027-08-31"]],
    C: [["Toussaint", "2026-10-17", "2026-11-01"], ["Noël", "2026-12-19", "2027-01-03"], ["Hiver", "2027-02-06", "2027-02-21"], ["Printemps", "2027-04-03", "2027-04-18"], ["Été", "2027-07-03", "2027-08-31"]],
  };
  // Série de jours révisés. Gel de série : un jour raté par semaine (du lundi au dimanche) ne casse pas la série.
  function streakInfo() {
    const days = new Set(state.sessions.filter(s => s.cards_reviewed > 0).map(s => s.day)); let n = 0, frozen = 0; const d = new Date(), used = new Set();
    const week = x => { const m = new Date(x); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return localDay(m); }, thisWeek = week(d);
    if (!days.has(localDay(d))) d.setDate(d.getDate() - 1);
    for (;;) {
      if (days.has(localDay(d))) { n++; d.setDate(d.getDate() - 1); continue; }
      const before = new Date(d); before.setDate(before.getDate() - 1); const w = week(d);
      if (n > 0 && !used.has(w) && days.has(localDay(before))) { used.add(w); if (w === thisWeek) frozen++; d.setDate(d.getDate() - 1); continue; }
      break;
    }
    return { n, frozen, left: used.has(thisWeek) ? 0 : 1 };
  }
  function streak() { return streakInfo().n; }

