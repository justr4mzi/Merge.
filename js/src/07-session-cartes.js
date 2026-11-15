  // ---------- session de cartes ----------
  // Une carte marquée fausse revient dans la file jusqu'à ce qu'elle soit réussie. Chaque carte réussie fait monter la jauge.
  async function screenSession(scope, hard, subj) {
    tabs.hidden = true; app.innerHTML = `<p class="muted">Chargement…</p>`;
    // Révision combinée : tout un dossier (« g:<id> ») ou ce que l'élève a coché dans « Choisir quoi réviser » (« mixte »).
    let chIds = null, backX = null, training = false;
    if (scope === "mixte") { const v = jget("merge.mixsel", null); chIds = (v && Array.isArray(v.ids) ? v.ids : []); backX = "#perso"; }
    else if (scope.startsWith("g:")) { const gid = scope.slice(2); chIds = state.chapters.filter(c => c.group_id === gid).map(c => c.id); backX = state.groups.some(g => g.id === gid) ? "#dossier-" + gid : "#matieres"; }
    const backHref = backX || (scope === "jour" || scope === "melange" ? "#accueil" : subj ? "#matiere-" + scope : "#chapitre-" + scope);
    const pool = chIds ? state.cards.filter(c => chIds.includes(c.chapter_id)) : subj ? state.cards.filter(c => state.chapters.some(ch => ch.id === c.chapter_id && ch.subject_id === scope)) : cardsOf(scope);
    const single = scope !== "jour" && scope !== "melange" && !subj && !hard && !chIds;
    let meta = scope === "jour" ? dueCards(state.cards) : dueCards(pool);
    // Mélange choisi : les cartes à revoir d'abord, puis toutes les autres cartes de la sélection, mélangées.
    if (chIds && !hard) { const rest = shuffle(pool.filter(c => !meta.includes(c))); if (!meta.length) training = true; meta = meta.concat(rest); }
    // Révision mélangée : toutes les matières, les cartes à revoir et non maîtrisées d'abord, avec plus de poids pour les matières dont le contrôle approche.
    if (scope === "melange") {
      const subjOf = Object.fromEntries(state.chapters.map(ch => [ch.id, ch.subject_id])), w = {};
      state.subjects.forEach(x => { const d = x.exam_date ? daysUntil(x.exam_date) : null; w[x.id] = d != null && d >= 0 ? 1 + 6 / (1 + d) : 1; });
      const now = Date.now(), score = c => (w[subjOf[c.chapter_id]] || 1) * (new Date(c.due_at).getTime() <= now ? 3 : !isMastered(c) ? 2 : 0.6) * (0.6 + Math.random() * 0.8);
      meta = state.cards.slice().sort((a, b) => score(b) - score(a)).slice(0, 40);
      if (!meta.length) { location.hash = "#accueil"; return; }
    }
    if (hard) { meta = pool.filter(c => (c.wrong_count || 0) > 0).sort((a, b) => b.wrong_count - a.wrong_count).slice(0, 20); training = true; if (!meta.length) { toast("Aucune carte difficile pour l'instant : tu n'as encore rien raté ici."); location.hash = backHref; return; } }
    else if (single) { const todo = pool.filter(c => !isMastered(c)); if (todo.length) meta = meta.concat(shuffle(todo.filter(c => !meta.includes(c)))); else if (!meta.length) { meta = shuffle(pool); training = true; } }
    else if (!meta.length && scope !== "jour") { meta = shuffle(pool); training = true; }
    if (!meta.length) { location.hash = backHref; return; }
    meta = meta.slice(0, 60);
    const text = Object.fromEntries(meta.map(c => [c.id, c]));
    const S = { queue: meta.filter(c => text[c.id]).map(c => c.id), total: 0, known: 0, again: new Set(), flipped: false, start: Date.now(), reviews: 0, chapters: new Set(), allCh: new Set(), mine: "" };
    const typed = () => safeGet("merge.typed") === "1", noteOf = c => safeGet("merge.note." + c.id) || "";
    const backExtra = c => (typed() && S.mine.trim() ? `<p class="mnemo mine"><b>Ta réponse.</b> ${esc(S.mine)}</p>` : "") + (noteOf(c) ? `<p class="mnemo mynote"><b>Ta note.</b> ${esc(noteOf(c))}</p>` : "");
    S.total = S.queue.length;
    async function finish() {
      const secs = Math.min(3600, Math.round((Date.now() - S.start) / 1000)), day = localDay(); S.start = Date.now();
      const reviews = S.reviews; S.reviews = 0; if (!reviews && secs < 5) return;
      const cur = state.sessions.find(s => s.day === day);
      const prev = await sb.from("study_sessions").select("seconds,cards_reviewed,chapters_touched").eq("user_id", state.user.id).eq("day", day).maybeSingle();
      const p = prev.data || { seconds: 0, cards_reviewed: 0, chapters_touched: [] };
      const row = { user_id: state.user.id, day, seconds: p.seconds + secs, cards_reviewed: p.cards_reviewed + reviews, chapters_touched: [...new Set([...(p.chapters_touched || []), ...S.chapters])], updated_at: new Date().toISOString() };
      const up = await sb.from("study_sessions").upsert(row); if (up.error) console.error(up.error);
      if (cur) Object.assign(cur, row); else state.sessions.push(row);
    }
    function askMnemo(row) {
      if (row.mnemoAsked || getMnemo(row) || state.offline) return; row.mnemoAsked = true;
      ai({ action: "mnemo", front: row.front, back: row.back }).then(r => {
        if (!r || !r.mnemonic) return; row.mnemonic = r.mnemonic; safeSet("merge.mnemo." + row.id, r.mnemonic);
        if (!state.legacy) sb.from("cards").update({ mnemonic: r.mnemonic }).eq("id", row.id).then(() => {}, () => {});
        toast("Astuce mnémotechnique ajoutée à cette carte."); if (S.queue[0] === row.id && $("mnemo")) $("mnemo").innerHTML = mnemoHtml(row);
      }).catch(e => { if (e && e.code === "quota") toast("Limite d'IA atteinte : pas d'astuce pour cette carte aujourd'hui."); });
    }
    const mnemoHtml = c => getMnemo(c) ? `<p class="mnemo"><b>Astuce pour retenir.</b> ${esc(getMnemo(c))}</p>` : "";
    // Annuler : on garde l'état d'avant chaque réponse (20 au plus) pour pouvoir revenir en arrière si on s'est trompé de bouton.
    const UNDO_KEYS = ["due_at", "stability", "difficulty", "elapsed_days", "scheduled_days", "reps", "lapses", "state", "last_review", "right_count", "wrong_count", "mastered"];
    S.undo = [];
    async function undo() {
      const u = S.undo.pop(); if (!u) return;
      const row = state.cards.find(c => c.id === u.cid);
      if (row) {
        Object.assign(row, u.prev);
        const patch = Object.assign({}, u.prev); if (state.legacy) delete patch.mastered;
        sb.from("cards").update(patch).eq("id", u.cid).then(res => { if (res.error) queueReview(u.cid, patch); }, () => queueReview(u.cid, patch));
      }
      S.queue = u.queue; S.known = u.known; S.reviews = Math.max(0, S.reviews - 1); if (!u.again) S.again.delete(u.cid);
      S.flipped = true; S.mine = "";
      if (u.mistake) Promise.resolve(u.mistake).then(() => unlogMistake(u.chapter, u.front));
      toast("Réponse annulée. Choisis la bonne.");
      render();
    }
    async function answer(ok, rating) {
      { const r0 = state.cards.find(c => c.id === S.queue[0]); if (r0) { S.undo.push({ cid: r0.id, chapter: r0.chapter_id, front: r0.front, prev: Object.fromEntries(UNDO_KEYS.map(k => [k, r0[k] === undefined ? null : r0[k]])), queue: S.queue.slice(), known: S.known, again: S.again.has(r0.id), mistake: null }); if (S.undo.length > 20) S.undo.shift(); } }
      const cid = S.queue.shift(), row = state.cards.find(c => c.id === cid); if (!row) return render();
      const now = new Date(), r = fsrs.next(toFsrs(row), now, ok ? (rating || F.Rating.Good) : F.Rating.Again).card;
      const patch = { due_at: r.due.toISOString(), stability: r.stability, difficulty: r.difficulty, elapsed_days: r.elapsed_days, scheduled_days: r.scheduled_days, reps: r.reps, lapses: r.lapses, state: r.state, last_review: now.toISOString(), right_count: (row.right_count || 0) + (ok ? 1 : 0), wrong_count: (row.wrong_count || 0) + (ok ? 0 : 1) };
      if (!state.legacy) patch.mastered = ok;
      Object.assign(row, patch); row.mastered = ok; S.reviews++; S.chapters.add(row.chapter_id); S.allCh.add(row.chapter_id);
      sb.from("cards").update(patch).eq("id", cid).then(res => { if (res.error) queueReview(cid, patch); }, () => queueReview(cid, patch));
      ping(ok);
      if (ok) S.known++; else { S.again.add(cid); S.queue.push(cid); const lm = logMistake(row.chapter_id, row.front, row.back, "", "cartes", cid); if (S.undo.length) S.undo[S.undo.length - 1].mistake = lm; if (patch.wrong_count >= 2) askMnemo(row); }
      S.flipped = false; S.mine = "";
      if (S.queue.length) jset("merge.resume", { hash: location.hash, ch: single ? scope : null, name: single ? "" : "ta session", left: S.queue.length, total: S.total, at: Date.now() }); else safeSet("merge.resume", "null");
      render();
    }
    function render() {
      if (!S.queue.length) {
        const secsDone = Math.min(3600, Math.round((Date.now() - S.start) / 1000)); finish(); screenSession.key = null; safeSet("merge.resume", "null");
        recordHist([...S.allCh], secsDone, single ? scope : null); setTimeout(celebrate, 600); if (S.total >= 3 && S.known / S.total >= 0.8) setTimeout(() => confetti(), 250);
        const m = single ? mastery(cardsOf(scope)) : null;
        app.innerHTML = `<div class="row"><a class="iconbtn" href="${backHref}" aria-label="Fermer">${I.x}</a></div><div class="card done"><h1>Bon travail !</h1><p class="muted">${plural(S.total, "carte réussie", "cartes réussies")}. ${S.again.size ? plural(S.again.size, "carte est revenue", "cartes sont revenues") + " pendant la session jusqu'à ce que tu la réussisses." : "Aucune erreur."}</p>
          ${m != null ? `<div style="width:100%"><div class="row between small muted" style="margin-bottom:6px"><span>Maîtrise du chapitre</span><b>${m} %</b></div><div class="bar"><i style="width:${m}%"></i></div></div>${m >= 100 ? `<p class="fb ok">Contrôle débloqué !</p><a class="btn" href="#controle-${scope}">Passer le contrôle</a><a class="btn ghost" href="#boss-${scope}">Affronter le boss</a>` : ""}` : ""}
          ${m != null && m >= 100 && !state.offline ? `<button class="btn ghost" id="morec">${I.spark}Créer d'autres cartes</button>` : ""}<a class="btn${m != null && m >= 100 ? " ghost" : ""}" href="${backHref}">Terminer</a></div>`;
        if ($("morec")) $("morec").onclick = () => moreCards(scope, $("morec"));
        return;
      }
      if (!S.offered && single && !state.offline && S.total >= 4 && S.known >= Math.ceil(S.total / 2) && cardsOf(scope).length >= 4) {
        S.offered = true;
        app.innerHTML = `<div class="card done"><div class="tutoicon">${I.quiz}</div><h1>Tu es à la moitié</h1><p class="muted">${S.known} cartes réussies sur ${S.total}. C'est le bon moment pour un quiz intermédiaire : QCM ou réponse rédigée, à toi de choisir.</p><button class="btn" id="goquiz">Faire le quiz</button><button class="btn ghost" id="keep">Continuer les cartes</button></div>`;
        $("goquiz").onclick = () => { finish(); midQuiz = scope; location.hash = "#quiz-" + scope; }; $("keep").onclick = render; return;
      }
      const c = text[S.queue[0]], pct = Math.round(S.known / S.total * 100);
      app.innerHTML = `<div class="swrap"><div class="session"><div class="row"><a class="iconbtn" href="${backHref}" id="quit" aria-label="Fermer la session">${I.x}</a>${S.undo.length ? `<button class="iconbtn" id="undo" aria-label="Annuler ma dernière réponse" title="Annuler ma dernière réponse">${I.undo}</button>` : ""}<div class="grow" style="text-align:center;font-weight:800;font-variant-numeric:tabular-nums">${pct} % <span class="small muted">· ${S.known} / ${S.total}</span></div><span style="width:44px"></span></div>
        <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Progression de la session"><i style="width:${pct}%"></i></div>
        <div class="counters"><span class="counter no" aria-label="Cartes à revoir">${S.again.size}</span><span class="counter yes" aria-label="Cartes réussies">${S.known}</span></div>
        <div class="flipwrap" id="wrap"><button class="flip${S.flipped ? " back" : ""}" id="flip" aria-label="Retourner la carte">
          <div class="face"><header>${training ? "Entraînement" : S.again.has(c.id) ? "On la revoit" : "Question"}</header><div class="txt">${mx(c.front)}</div><footer>Touche la carte pour voir la réponse</footer></div>
          <div class="face b"><header>Réponse</header>${picHtml(c)}<div class="txt">${mx(c.back)}</div><div id="mnemo">${mnemoHtml(c)}</div><div id="extra" class="extra">${backExtra(c)}</div><footer>${c.source_quote ? "Dans ton cours : « " + esc(c.source_quote) + " »" : ""}</footer></div>
        </button></div>
        ${typed() ? `<div class="field typedbox"><label for="mine">Ta réponse, avant de retourner la carte</label><textarea id="mine" style="min-height:70px" placeholder="Écris ce que tu répondrais">${esc(S.mine)}</textarea></div>` : ""}
        <div class="answers"><button class="btn bad" id="no" aria-label="Faux, pas compris">${I.x}Faux</button><button class="btn good" id="yes">${I.check}Juste</button></div>
        <div class="row rate2"><button class="chip sm grow" id="hard">Juste, mais à revoir bientôt</button><button class="chip sm grow" id="easy">Trop facile</button></div>
        <details class="cmore"${safeGet("merge.cmore") === "1" ? " open" : ""}><summary>Plus d'options</summary><div class="row" style="justify-content:center;flex-wrap:wrap"><button class="switch" id="typedsw" role="switch" aria-checked="${typed()}"><i></i>Écrire ma réponse</button><button class="linkbtn" id="huh">Je ne comprends pas</button><button class="linkbtn" id="editc">Modifier la carte</button><button class="linkbtn" id="noteb">${noteOf(c) ? "Modifier ma note" : "Ajouter une note"}</button><button class="linkbtn" data-pomo>Pomodoro</button>${"speechSynthesis" in window ? '<button class="linkbtn" id="say">Lire à voix haute</button>' : ""}${c.image_path && !state.offline ? '<button class="linkbtn" id="see">Voir la page du cours</button>' : ""}</div></details><div id="pageimg"></div></div>
        <aside class="sside"><div class="card pad stack"><div class="ring" style="--p:${pct}"><b>${pct} %</b></div><div class="srow"><span>Réussies</span><b class="g">${S.known}</b></div><div class="srow"><span>À revoir</span><b class="r">${S.again.size}</b></div><div class="srow"><span>Restantes</span><b>${S.queue.length}</b></div></div>
          <div class="card pad stack"><h2>Raccourcis clavier</h2><div class="srow"><span>Retourner la carte</span><kbd>Espace</kbd></div><div class="srow"><span>Juste</span><kbd>→</kbd></div><div class="srow"><span>Faux</span><kbd>←</kbd></div><div class="srow"><span>Annuler ma réponse</span><kbd>Ctrl Z</kbd></div><div class="srow"><span>Trop facile</span><kbd>↑</kbd></div><div class="srow"><span>À revoir bientôt</span><kbd>↓</kbd></div></div>
          <p class="note">Une carte ratée revient jusqu'à ce que tu la réussisses.</p></aside></div>`;
      if ($("see")) $("see").onclick = () => showPage(c.image_path, $("pageimg"));
      if ($("say")) $("say").onclick = () => speakText(S.flipped ? c.back : c.front, "fr-FR");
      $("flip").onclick = () => { if ($("mine")) S.mine = $("mine").value; S.flipped = !S.flipped; $("flip").classList.toggle("back", S.flipped); $("extra").innerHTML = backExtra(c); };
      $("no").onclick = () => answer(false); $("yes").onclick = () => answer(true);
      if ($("undo")) $("undo").onclick = undo;
      $("editc").onclick = () => sheet(`<h1>Modifier la carte</h1><div class="field"><label for="ef">Question</label><textarea id="ef" style="min-height:80px" maxlength="500">${esc(c.front)}</textarea></div><div class="field"><label for="eb">Réponse</label><textarea id="eb" style="min-height:110px" maxlength="2000">${esc(c.back)}</textarea></div><p class="note" id="emsg"></p><div class="row"><button class="btn grow" id="eok">Enregistrer</button><button class="btn ghost" data-close>Annuler</button></div>`, el => { el.querySelector("#eok").onclick = async () => {
        const front = el.querySelector("#ef").value.trim(), back = el.querySelector("#eb").value.trim(); if (!front || !back) return toast("La question et la réponse ne peuvent pas être vides.");
        el.querySelector("#eok").disabled = true; const { error } = await sb.from("cards").update({ front, back, edited_by_user: true, needs_check: false, flagged: false }).eq("id", c.id);
        if (error) { el.querySelector("#eok").disabled = false; return showErr(el.querySelector("#emsg"), error); }
        Object.assign(c, { front, back, needs_check: false, flagged: false }); const row = state.cards.find(x => x.id === c.id); if (row) Object.assign(row, { front, back }); closeSheet(); toast("Carte modifiée."); render(); }; });
      app.querySelector(".cmore").ontoggle = e => safeSet("merge.cmore", e.target.open ? "1" : "0");
      $("huh").onclick = async () => {
        sheet(`<h1>Je ne comprends pas</h1><p class="muted small">${mx(c.front)}</p><div id="huhbox" class="md"><div class="row"><div class="spin" aria-hidden="true"></div><p class="muted" role="status">L'IA t'explique à partir de ton cours…</p></div></div><button class="btn ghost" data-close>Fermer</button>`);
        try { const text = await courseText(c.chapter_id); const r = await ai({ action: "pourquoi", text, question: c.front, attendu: c.back, donne: "" }); const b = $("huhbox"); if (b) b.innerHTML = md(r.answer || ""); }
        catch (e) { const b = $("huhbox"); if (b) showErr(b, e); }
      };
      $("hard").onclick = () => answer(true, F.Rating.Hard); $("easy").onclick = () => answer(true, F.Rating.Easy);
      $("typedsw").onclick = () => { if ($("mine")) S.mine = $("mine").value; safeSet("merge.typed", typed() ? "0" : "1"); render(); };
      $("noteb").onclick = () => sheet(`<h1>Ta note sur cette carte</h1><p class="muted small">${esc(c.front)}</p><div class="field"><label for="nt">Ton moyen de retenir, une remarque du prof…</label><textarea id="nt" style="min-height:110px" maxlength="600">${esc(noteOf(c))}</textarea></div><p class="note">Ta note s'affiche au dos de la carte. Elle est gardée sur cet appareil.</p><div class="row"><button class="btn grow" id="ntok">Enregistrer</button><button class="btn ghost" data-close>Annuler</button></div>`, el => { el.querySelector("#ntok").onclick = () => { const v = el.querySelector("#nt").value.trim(); if (v) safeSet("merge.note." + c.id, v); else safeSet("merge.note." + c.id, ""); closeSheet(); render(); }; });
      $("quit").onclick = () => { if (S.reviews) finish(); };
      let x0 = null; const w = $("wrap");
      w.onpointerdown = e => { x0 = e.clientX; };
      w.onpointerup = e => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 90) { e.preventDefault(); answer(dx > 0); } };
    }
    screenSession.key = (e) => {
      if (!S.queue.length || !$("flip")) return;
      if (e.key === " ") { e.preventDefault(); $("flip").click(); }
      if (e.key === "ArrowRight") answer(true);
      if (e.key === "ArrowLeft") answer(false);
      if (e.key === "ArrowUp") { e.preventDefault(); answer(true, F.Rating.Easy); }
      if (e.key === "ArrowDown") { e.preventDefault(); answer(true, F.Rating.Hard); }
      if ((e.key === "z" || e.key === "Z") && (e.ctrlKey || e.metaKey) || e.key === "Backspace" && !/INPUT|TEXTAREA/.test((e.target || {}).tagName || "")) { e.preventDefault(); undo(); }
    };
    render();
  }
  document.addEventListener("keydown", e => { if (screenSession.key && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) screenSession.key(e); });
  // Images ajoutées par l'élève sur ses cartes (stockage « cours », dossier de l'élève). Liens signés gardés 50 min.
  const picUrls = {};
  async function picUrl(path) { const c = picUrls[path]; if (c && c.t > Date.now()) return c.u; const { data, error } = await sb.storage.from("cours").createSignedUrl(path, 3600); if (error || !data) return null; picUrls[path] = { u: data.signedUrl, t: Date.now() + 3000000 }; return data.signedUrl; }
  function fillPics(root) { (root || document).querySelectorAll("img[data-pic]:not([src])").forEach(async im => { const u = await picUrl(im.dataset.pic); if (u) im.src = u; else im.remove(); }); }
  const picHtml = (c) => c && c.picture ? `<img class="cardpic" data-pic="${esc(c.picture)}" alt="Image de la carte">` : "";
  async function uploadCardPic(file, chapterId, cardId) {
    let bmp; try { bmp = await createImageBitmap(file); } catch (e) { if (!window.heic2any) await new Promise((ok, ko) => { const sc = document.createElement("script"); sc.src = "vendor/heic2any.min.js"; sc.onload = ok; sc.onerror = ko; document.head.appendChild(sc); }); const o = await window.heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 }); bmp = await createImageBitmap(Array.isArray(o) ? o[0] : o); }
    const k = Math.min(1, 1000 / Math.max(bmp.width, bmp.height)), cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k); cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
    const blob = await new Promise(r => cv.toBlob(r, "image/jpeg", 0.82)), path = state.user.id + "/" + chapterId + "/carte-" + cardId + "-" + Date.now() + ".jpg";
    const up = await sb.storage.from("cours").upload(path, blob, { contentType: "image/jpeg", upsert: true }); if (up.error) throw up.error;
    const r = await sb.from("cards").update({ picture: path, edited_by_user: true }).eq("id", cardId); if (r.error) throw r.error;
    const m = state.cards.find(x => x.id === cardId); if (m) m.picture = path; return path;
  }
  async function showPage(path, box) {
    if (!box) return; if (box.innerHTML) { box.innerHTML = ""; return; }
    box.innerHTML = '<p class="muted">Chargement de la page…</p>';
    const { data, error } = await sb.storage.from("cours").createSignedUrl(path, 3600);
    box.innerHTML = error || !data ? '<p class="err">Image indisponible.</p>' : `<img class="pageimg" src="${esc(data.signedUrl)}" alt="Page du cours d'où vient cette carte">`;
  }

