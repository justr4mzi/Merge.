  // ---------- modes : apprendre, quiz, contrôle ----------
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  // Mauvaises propositions qui ressemblent à la bonne réponse (quiz avec les cartes, mode Apprendre, textes à trous déjà générés) :
  // même nature (nombre, formule, mot court, phrase), longueur proche, mots en commun, même unité, même terminaison.
  // Sinon un nombre se repérait tout seul au milieu de mots, ou une phrase longue au milieu de réponses d'un mot.
  function lookalikes(target, pool, n, key) {
    key = key || (x => x);
    const nz = t => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\$[^$]*\$/g, " formule ").replace(/[^a-z0-9]+/g, " ").trim();
    const kind = t => { const x = String(t || "").trim(), w = nz(x).split(" ").filter(Boolean).length; return /\$/.test(x) ? "tex" : /^[-+−]?[\d.,\s]+(\s*[a-zA-Zµ°%/·²³⁻¹Ω]{0,8})?$/.test(x) ? "num" : w <= 3 ? "mot" : w <= 10 ? "groupe" : "phrase"; };
    const words = t => new Set(nz(t).split(" ").filter(w => w.length >= 4));
    const unit = t => (String(t || "").match(/\d\s*([a-zA-Zµ°%Ω][a-zA-Z0-9µ°%Ω/·²³⁻¹]*)\s*$/) || [])[1] || "";
    const T = String(target || ""), tk = kind(T), tw = words(T), tl = Math.max(1, T.length), tn = nz(T), tu = unit(T);
    const seen = new Set([tn]), cand = [];
    for (const item of pool) {
      const v = String(key(item) || ""), vn = nz(v); if (!vn || seen.has(vn)) continue; seen.add(vn);
      const vw = words(v), inter = [...vw].filter(w => tw.has(w)).length, uni = new Set([...vw, ...tw]).size || 1;
      let sc = (kind(v) === tk ? 4 : 0) + 2 * Math.min(tl, v.length) / Math.max(tl, v.length) + 3 * inter / uni;
      if (tu && unit(v) === tu) sc += 1.5;
      if (tk === "mot" && vn.slice(-2) === tn.slice(-2)) sc += 0.5;
      if (/^[A-ZÀ-Ý]/.test(v.trim()) === /^[A-ZÀ-Ý]/.test(T.trim())) sc += 0.3;
      cand.push({ item, sc: sc + Math.random() * 0.8 });
    }
    return cand.sort((a, b) => b.sc - a.sc).slice(0, n).map(c => c.item);
  }
  window.__mergeLookalikes = lookalikes;
  async function chapterCards(id) {
    const local = () => cardsOf(id).filter(c => c.front).map(c => ({ id: c.id, front: c.front, back: c.back }));
    if (state.offline) return local();
    let r; try { r = await sb.from("cards").select("id,front,back").eq("chapter_id", id); } catch (e) { return local(); }
    if (r.error) { const l = local(); if (!l.length) fail(r.error, "Cartes non chargées"); return l; } return r.data || [];
  }
  // kind : "apprendre" (QCM, les erreurs reviennent), "quiz" (QCM ou rédigé, note), "controle" (complet, note sur 20), "blanc" (chronométré).
  // Quiz et contrôle sont écrits par l'IA à partir du cours (1 appel, gardé ensuite) ; sans IA, ils se font avec les cartes.
  let midQuiz = null;
  let freshAi = false;
  // Nouvelles cartes à partir du cours, sans refaire celles qui existent déjà.
  async function moreCards(id, btn, n) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) return;
    const label = btn ? btn.innerHTML : ""; if (btn) { btn.disabled = true; btn.textContent = "L'IA écrit de nouvelles cartes…"; }
    try {
      const text = await courseText(id); if (text.trim().length < 80) throw new Error("Importe d'abord ton cours dans ce chapitre.");
      const have = cardsOf(id), seen = new Set(have.map(c => norm(c.front)));
      const r = await ai({ action: "generate", text, n: n || 20, avoid: have.map(c => c.front).filter(Boolean).slice(-200) });
      const nt = norm(text), fresh = (r.cards || []).filter(c => c && c.front && c.back && !seen.has(norm(c.front)));
      if (!fresh.length) throw new Error("Ton cours est déjà entièrement couvert par tes cartes. Importe un autre cours ou un complément pour en créer d'autres.");
      const ins = await sb.from("cards").insert(fresh.map(c => ({ chapter_id: id, front: String(c.front).slice(0, 500), back: String(c.back).slice(0, 2000), source_quote: c.source_quote ? String(c.source_quote).slice(0, 400) : null, needs_check: !c.source_quote || !nt.includes(norm(c.source_quote).slice(0, 60)) })));
      if (ins.error) throw ins.error;
      await loadAll(); toast(plural(fresh.length, "nouvelle carte créée", "nouvelles cartes créées") + "."); location.hash = "#cartes-" + id;
    } catch (e) { if (btn) { btn.disabled = false; btn.innerHTML = label; } toast(e.code === "quota" ? QUOTA_MSG : (e.message || "Création impossible.")); }
  }
  async function screenQuestions(id, kind) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; app.innerHTML = `<p class="muted">Chargement…</p>`;
    const all = await chapterCards(id), back = "#chapitre-" + id, here = location.hash;
    const top = (t) => `<div class="row"><a class="iconbtn" href="${back}" aria-label="Fermer">${I.x}</a><div class="grow" style="text-align:center;font-weight:800">${t}</div><span style="width:44px"></span></div>`;
    if (kind === "controle" && mastery(cardsOf(id)) < 100) { app.innerHTML = top("Contrôle") + `<div class="card done"><div class="tutoicon">${I.lock}</div><h1>Pas encore débloqué</h1><p class="muted">Le contrôle s'ouvre quand tu atteins 100 % de maîtrise sur ce chapitre. Tu en es à ${mastery(cardsOf(id))} %.</p><div class="bar" style="width:100%"><i style="width:${mastery(cardsOf(id))}%"></i></div><a class="btn" href="#cartes-${id}">Réviser les cartes</a></div>`; return; }
    if (all.length < 4) { app.innerHTML = top(ch.name) + `<div class="card done"><p class="muted">Il faut au moins 4 cartes dans ce chapitre pour ce mode.</p><a class="btn" href="${back}">Retour</a></div>`; return; }
    const title = kind === "apprendre" ? "Apprendre" : kind === "quiz" ? "Quiz" : kind === "blanc" ? "Examen blanc" : "Contrôle";
    const S = { written: kind === "blanc", queue: [], total: 0, good: 0, missed: [], asked: [] };
    const okQ = q => q && q.q && (Array.isArray(q.choix) ? q.choix.length >= 2 && q.choix[+q.bonne] != null : !!q.ideal);
    const fromAi = (list, n, tag) => (list || []).filter(okQ).slice(0, n).map((q, k) => Array.isArray(q.choix) ? { id: tag + k, front: String(q.q), back: String(q.choix[+q.bonne]), opts: q.choix.map(String), expl: q.explication || "", ia: true } : { id: tag + k, front: String(q.q), back: String(q.ideal), ia: true });
    function begin(items) {
      S.queue = items || shuffle(all).slice(0, kind === "apprendre" ? 12 : kind === "quiz" ? 8 : 10); S.total = S.queue.length;
      if (kind === "blanc") { S.deadline = Date.now() + S.total * 60000; clearInterval(timerInt); timerInt = setInterval(() => { const el = $("qtimer"); if (!el) { if (!S.queue.length || !location.hash.startsWith("#blanc-")) clearInterval(timerInt); return; } const left = Math.max(0, Math.round((S.deadline - Date.now()) / 1000)); el.textContent = "Temps restant : " + Math.floor(left / 60) + " min " + String(left % 60).padStart(2, "0") + " s"; if (left <= 0) { clearInterval(timerInt); S.total = Math.max(1, S.asked.length + S.queue.length); S.queue.forEach(c => S.asked.push({ q: c.front, a: c.back, ok: false })); S.queue = []; end(); } }, 1000); }
      ask();
    }
    // Prépare (ou relit) le contenu IA puis lance ; en cas d'échec, propose la version avec les cartes.
    async function withAi(what, pick, fallback) {
      app.innerHTML = top(title) + `<div class="card done"><div class="spin" aria-hidden="true"></div><p class="muted" role="status">Merge prépare ${what === "quiz" ? "ton quiz" : "ton contrôle"} à partir de ton cours…</p></div>`;
      try { const fresh = freshAi; freshAi = false; const c = await study(id, what, fresh); if (location.hash !== here) return; const items = pick(c); if (!items.length) throw new Error("L'IA n'a pas renvoyé de questions utilisables."); begin(items); }
      catch (e) { if (location.hash !== here) return; app.innerHTML = top(title) + `<div class="card pad stack">${errHtml(e)}<button class="btn" id="fb2">${what === "quiz" ? "Faire le quiz avec mes cartes" : "Faire le contrôle avec mes cartes"}</button><a class="btn ghost" href="${back}">Retour au chapitre</a></div>`; $("fb2").onclick = fallback; }
    }
    if (kind === "quiz") {
      const cached = await getCached(id, "quiz"); if (location.hash !== here) return;
      app.innerHTML = top("Quiz") + `<div class="card pad stack"><h1>${mx(ch.name)}</h1><p class="muted">Un quiz d'entraînement écrit à partir de ton cours. Choisis comment répondre.</p><button class="btn" id="qcm">QCM · 8 questions</button><button class="btn ghost" id="ecrit">Réponse rédigée · 4 questions</button>
        <p class="note">${cached ? "Quiz déjà préparé et gardé : aucun appel IA." : "Première fois : 1 appel IA, puis le quiz est gardé."}</p><button class="linkbtn" id="nocall">Quiz rapide avec mes cartes, sans IA</button></div>`;
      $("qcm").onclick = () => withAi("quiz", c => shuffle(fromAi(c.qcm, 8, "q")), () => { S.written = false; begin(); });
      $("ecrit").onclick = () => withAi("quiz", c => fromAi(c.redige, 4, "r"), () => { S.written = true; begin(); });
      $("nocall").onclick = () => { S.written = false; begin(); };
    } else if (kind === "controle") {
      const cached = await getCached(id, "controle"); if (location.hash !== here) return;
      app.innerHTML = top("Contrôle") + `<div class="card pad stack"><span class="pill" style="align-self:flex-start">Débloqué · 100 % de maîtrise</span><h1>${mx(ch.name)}</h1><p class="muted">Une évaluation complète sur tout le chapitre, comme en classe : 10 QCM puis 6 questions rédigées, tirées uniquement de ton cours. Note sur 20.</p><button class="btn" id="cgo">Commencer le contrôle</button>
        <p class="note">${cached ? "Contrôle déjà préparé et gardé : aucun appel IA." : "Première fois : 1 appel IA, puis le contrôle est gardé."}</p><button class="linkbtn" id="nocall">Contrôle avec mes cartes, sans IA</button></div>`;
      $("cgo").onclick = () => withAi("controle", c => fromAi(c.qcm, 10, "q").concat(fromAi(c.redige, 6, "r")), () => { S.written = true; begin(); });
      $("nocall").onclick = () => { S.written = true; begin(); };
    } else begin();
    function next(ok, c, given) {
      ping(ok);
      S.asked.push({ q: c.front, a: c.back, ok });
      if (ok) S.good++; else { if (!S.missed.includes(c)) S.missed.push(c); logMistake(id, c.front, c.back, given || "", title.toLowerCase(), c.ia ? null : c.id); if (kind === "apprendre") S.queue.push(c); }
      S.queue.shift(); S.queue.length ? ask() : end();
    }
    function ask() {
      const c = S.queue[0], done = S.total - new Set(S.queue).size, head = top(title) + `<div class="bar"><i style="width:${done / S.total * 100}%"></i></div>${S.deadline ? '<p class="small muted" id="qtimer" role="timer"></p>' : ""}`;
      if (!c.opts && (S.written || c.ia)) {
        screenSession.key = null;
        app.innerHTML = head + `<div class="card pad stack"><p class="small muted">Question ${Math.min(S.asked.length + 1, S.total)} sur ${S.total} · réponse rédigée</p><h2 class="qtxt">${mx(c.front)}</h2><div class="field"><label for="ans">Ta réponse</label><textarea id="ans" style="min-height:110px"></textarea></div><button class="btn" id="check">Voir la réponse attendue</button><div id="fb"></div></div>`;
        $("check").onclick = () => { $("check").hidden = true; $("ans").readOnly = true; $("fb").innerHTML = `<div class="stack"><p class="label">Réponse idéale attendue</p><p class="expected">${mx(c.back)}</p><p class="note">Compare avec ta réponse et valide toi-même : c'est le sens qui compte, pas les mots exacts.</p><button class="linkbtn" id="aicmp">Demander à l'IA de comparer (1 appel)</button><div class="md" id="aiout"></div><div class="answers"><button class="btn bad" id="ko">${I.x}Faux</button><button class="btn good" id="okb">${I.check}Juste</button></div></div>`; $("ko").onclick = () => next(false, c, $("ans").value); $("okb").onclick = () => next(true, c);
          $("aicmp").onclick = async () => { $("aicmp").disabled = true; $("aiout").innerHTML = '<p class="muted">Comparaison…</p>'; try { const r = await ai({ action: "ask", text: "Question : " + c.front + "\nRéponse attendue d'après le cours : " + c.back, question: "La réponse de l'élève est : « " + $("ans").value.slice(0, 500) + " ». A-t-elle le même sens que la réponse attendue ? Commence par OUI ou NON, puis explique en une phrase ce qui manque ou ce qui est faux." }); if ($("aiout")) $("aiout").innerHTML = md(r.answer); } catch (e) { if ($("aiout")) { showErr($("aiout"), e); $("aicmp").disabled = false; } } }; };
        return;
      }
      const opts = c.opts ? shuffle(c.opts.map((t, k) => ({ id: t === c.back ? c.id : c.id + "x" + k, back: t }))) : shuffle([c, ...lookalikes(c.back, all.filter(x => x.id !== c.id && x.back !== c.back), 3, x => x.back)]);
      app.innerHTML = head + `<div class="card pad stack"><span class="pill ${S.missed.includes(c) ? "warn" : ""}" style="align-self:flex-start">${S.missed.includes(c) ? "Essayons à nouveau" : "Question " + Math.min(S.asked.length + 1, S.total) + " sur " + S.total}</span><h2 class="qtxt">${mx(c.front)}</h2><p class="fb" id="fb" role="status"></p><div class="opts">${opts.map((o, i) => `<button class="opt" data-i="${i}">${mx(o.back)}</button>`).join("")}</div><p class="note" id="expl" hidden></p><button class="btn" id="cont" hidden>Continuer</button></div>`;
      screenSession.key = (e) => { const n = "1234".indexOf(e.key); const bs = app.querySelectorAll(".opt"); if (n >= 0 && bs[n] && !bs[n].disabled) bs[n].click(); else if (e.key === "Enter" && $("cont") && !$("cont").hidden) $("cont").click(); };
      app.querySelectorAll(".opt").forEach(b => b.onclick = () => {
        const ok = opts[+b.dataset.i].id === c.id;
        app.querySelectorAll(".opt").forEach(x => { x.disabled = true; if (opts[+x.dataset.i].id === c.id) x.classList.add("good"); });
        if (!ok) b.classList.add("bad");
        $("fb").textContent = ok ? "Bon travail !" : "Pas encore. La bonne réponse est en vert."; $("fb").className = "fb " + (ok ? "ok" : "ko");
        if (c.expl) { $("expl").hidden = false; $("expl").textContent = "Dans ton cours : " + c.expl; }
        $("cont").hidden = false; $("cont").onclick = () => next(ok, c, opts[+b.dataset.i].back); $("cont").focus();
      });
    }
    async function end() {
      if (kind === "blanc") clearInterval(timerInt);
      screenSession.key = null;
      const first = S.asked.slice(0, S.total), good = kind === "apprendre" ? S.total - S.missed.length : first.filter(a => a.ok).length, note = Math.round(good / S.total * 20 * 2) / 2;
      if (note >= 15) setTimeout(() => confetti(), 300);
      let extra = "";
      if (kind === "quiz") { const qz = await sb.from("quizzes").insert({ chapter_id: id, questions: first }).select("id").single(); if (!qz.error) await sb.from("quiz_results").insert({ quiz_id: qz.data.id, score: note }); }
      if (kind === "controle") {
        const old = await sb.from("exams").select("id,best_score").eq("chapter_id", id).maybeSingle(), best = Math.max(note, (old.data && old.data.best_score) || 0);
        if (old.data) await sb.from("exams").update({ questions: first, best_score: best }).eq("id", old.data.id); else await sb.from("exams").insert({ chapter_id: id, questions: first, best_score: best });
        extra = `<p class="note">Meilleure note sur ce chapitre : ${String(best).replace(".", ",")} / 20.</p>`;
      }
      const resume = midQuiz === id; midQuiz = null;
      app.innerHTML = top(title) + `<div class="card done"><h1>${good === S.total ? "Bon travail !" : "C'est fini"}</h1>${kind === "apprendre" ? `<p class="muted">${plural(S.total, "notion vue", "notions vues")}, ${plural(S.missed.length, "à retravailler", "à retravailler")}.</p>` : `<div class="big">${String(note).replace(".", ",")} / 20</div><p class="muted">${good} bonnes réponses sur ${S.total}.</p>`}${extra}
        ${S.missed.length ? `<div class="stack" style="text-align:left;width:100%"><p class="label">À revoir</p>${S.missed.map(c => `<div class="term" style="padding:8px 0"><b>${mx(c.front)}</b><p>${mx(c.back)}</p></div>`).join("")}</div>` : ""}
        ${resume ? `<a class="btn" href="#cartes-${id}">Reprendre mes cartes</a>` : ""}<button class="btn${resume ? " ghost" : ""}" id="again">Recommencer</button>${kind === "quiz" || kind === "controle" ? `<button class="btn ghost" id="newai">${I.spark}${kind === "quiz" ? "Nouveau quiz, nouvelles questions" : "Nouveau contrôle, nouvelles questions"}</button>` : ""}${kind === "apprendre" ? `<button class="btn ghost" id="morec">${I.spark}Créer d'autres cartes</button>` : ""}<a class="btn ghost" href="${back}">Retour au chapitre</a></div>`;
      $("again").onclick = () => screenQuestions(id, kind);
      if ($("newai")) $("newai").onclick = () => { freshAi = true; screenQuestions(id, kind); };
      if ($("morec")) $("morec").onclick = () => moreCards(id, $("morec"));
    }
  }

  // ---------- mode associer ----------
  async function screenMatch(id) {
    tabs.hidden = true; app.innerHTML = `<p class="muted">Chargement…</p>`;
    const all = await chapterCards(id), back = "#chapitre-" + id;
    const head = `<div class="row"><a class="iconbtn" href="${back}" aria-label="Fermer">${I.x}</a><div class="grow" style="text-align:center;font-weight:800">Associer</div><span style="width:44px"></span></div>`;
    if (all.length < 3) { app.innerHTML = head + `<div class="card done"><p class="muted">Il faut au moins 3 cartes pour ce jeu.</p><a class="btn" href="${back}">Retour</a></div>`; return; }
    const pairs = shuffle(all).slice(0, 6), tiles = shuffle(pairs.flatMap(c => [{ k: c.id, t: c.front }, { k: c.id, t: c.back }])), t0 = Date.now();
    let first = null, left = pairs.length, errors = 0;
    app.innerHTML = head + `<p class="muted">Touche une question puis sa réponse.</p><div class="match">${tiles.map((t, i) => `<button class="card tilebtn" data-i="${i}">${mx(t.t)}</button>`).join("")}</div>`;
    app.querySelectorAll(".tilebtn").forEach(b => b.onclick = () => {
      if (b.classList.contains("sel")) { b.classList.remove("sel"); first = null; return; }
      if (!first) { first = b; b.classList.add("sel"); return; }
      const a = first; first = null; a.classList.remove("sel");
      if (tiles[+a.dataset.i].k === tiles[+b.dataset.i].k) {
        [a, b].forEach(x => { x.classList.add("gone"); x.disabled = true; });
        if (--left === 0) { const s = Math.round((Date.now() - t0) / 1000); app.innerHTML = head + `<div class="card done"><h1>Bon travail !</h1><div class="big">${s} s</div><p class="muted">${plural(pairs.length, "paire trouvée", "paires trouvées")}, ${plural(errors, "erreur", "erreurs")}.</p><button class="btn" id="again">Rejouer</button><a class="btn ghost" href="${back}">Retour au chapitre</a></div>`; $("again").onclick = () => screenMatch(id); }
      } else { errors++; [a, b].forEach(x => { x.classList.add("miss"); setTimeout(() => x.classList.remove("miss"), 500); }); }
    });
  }

  // ---------- mode écouter ----------
  async function screenListen(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; app.innerHTML = `<p class="muted">Chargement…</p>`;
    const back = "#chapitre-" + id, head = `<div class="row"><a class="iconbtn" href="${back}" aria-label="Fermer">${I.x}</a><div class="grow" style="text-align:center;font-weight:800">Écouter</div><span style="width:44px"></span></div>`;
    if (!("speechSynthesis" in window) && !neuralWanted()) { app.innerHTML = head + `<div class="card done"><p class="muted">Ton navigateur ne sait pas lire à voix haute.</p><a class="btn" href="${back}">Retour</a></div>`; return; }
    const [cards, sum, src] = await Promise.all([chapterCards(id), sb.from("summaries").select("markdown").eq("chapter_id", id).maybeSingle(), sb.from("sources").select("extracted_text").eq("chapter_id", id)]);
    const clean = s => String(s || "").replace(/[#*_>`]/g, "").replace(/\s+/g, " ").trim();
    const parts = { resume: sum.data ? String(sum.data.markdown).split(/\n+/).map(clean).filter(Boolean) : [], cartes: cards.flatMap(c => [clean(c.front), clean(c.back)]), cours: (src.data || []).map(x => x.extracted_text || "").join("\n").replace(/\[\[PAGE\]\]/g, "\n").split(/(?<=[.!?])\s+|\n+/).map(clean).filter(x => x.length > 2) };
    const L = { what: parts.resume.length ? "resume" : "cartes", i: 0, rate: voiceRate(), playing: false, sleep: 0, sleepAt: 0 };
    const saved = (safeGet("merge.ecoute." + id) || "").split(":"); if (parts[saved[0]] && +saved[1] < parts[saved[0]].length) { L.what = saved[0]; L.i = +saved[1] || 0; }
    const lang = (ch.lang || "fr").startsWith("fr") ? "fr-FR" : ch.lang;
    function speak() {
      const list = parts[L.what]; if (L.i >= list.length) { L.playing = false; L.i = 0; return draw(); }
      if (L.sleepAt && Date.now() > L.sleepAt) { L.playing = false; L.sleepAt = 0; L.sleep = 0; return draw(); }
      safeSet("merge.ecoute." + id, L.what + ":" + L.i);
      speakText(list[L.i], lang, () => { if (!L.playing) return; L.i++; speak(); }, L.rate); draw();
    }
    function draw() {
      const list = parts[L.what];
      app.innerHTML = head + `<h1>${esc(ch.name)}</h1>
        <div class="chips">${[["resume", "Le résumé"], ["cartes", "Les cartes"], ["cours", "Le cours complet"]].map(t => `<button class="chip" data-w="${t[0]}" aria-pressed="${L.what === t[0]}" ${parts[t[0]].length ? "" : "disabled"}>${t[1]}</button>`).join("")}</div>
        <div class="card pad stack"><p class="small muted">${list.length ? (L.i + 1) + " sur " + list.length : "Rien à lire"}</p><p class="qtxt" aria-live="polite">${esc(list[L.i] || "")}</p><div class="bar"><i style="width:${list.length ? (L.i / list.length * 100) : 0}%"></i></div>
          <div class="row" style="justify-content:center"><button class="btn ghost sm" id="prevp">Précédent</button><button class="btn" id="play">${L.playing ? "Pause" : "Lire"}</button><button class="btn ghost sm" id="nextp">Suivant</button></div></div>
        <div class="field"><span class="label">Vitesse</span><div class="chips">${[0.75, 1, 1.25, 1.5, 2].map(r => `<button class="chip" data-r="${r}" aria-pressed="${L.rate === r}">${String(r).replace(".", ",")}x</button>`).join("")}</div></div>
        <div class="field"><span class="label">Arrêt automatique</span><div class="chips">${[[0, "Jamais"], [15, "15 min"], [30, "30 min"]].map(t => `<button class="chip" data-sl="${t[0]}" aria-pressed="${L.sleep === t[0]}">${t[1]}</button>`).join("")}</div></div>
        <p class="note">${neuralWanted() ? "Lecture avec la voix Merge (la voix de ton appareil prend le relais hors ligne)." : "Lecture avec la voix de ton appareil."} Elle reprend là où tu t'es arrêté.</p>`;
      app.querySelectorAll("[data-sl]").forEach(b => b.onclick = () => { L.sleep = +b.dataset.sl; L.sleepAt = L.sleep ? Date.now() + L.sleep * 60000 : 0; draw(); });
      $("play").onclick = () => { L.playing = !L.playing; if (L.playing) speak(); else { stopSpeak(); draw(); } };
      $("prevp").onclick = () => { L.i = Math.max(0, L.i - 1); L.playing ? speak() : draw(); };
      $("nextp").onclick = () => { L.i = Math.min(Math.max(0, list.length - 1), L.i + 1); L.playing ? speak() : draw(); };
      app.querySelectorAll("[data-w]").forEach(b => b.onclick = () => { L.what = b.dataset.w; L.i = 0; L.playing = false; stopSpeak(); draw(); });
      app.querySelectorAll("[data-r]").forEach(b => b.onclick = () => { L.rate = +b.dataset.r; safeSet("merge.rate", String(L.rate)); if (spk.el && !spk.el.paused) { spk.el.defaultPlaybackRate = spk.el.playbackRate = L.rate; draw(); } else if (L.playing) speak(); else draw(); });
    }
    draw();
  }

  // ---------- badges ----------
  function badges() {
    const reviews = state.cards.reduce((s, c) => s + (c.right_count || 0) + (c.wrong_count || 0), 0), st = streak();
    const full = state.chapters.filter(c => { const cs = cardsOf(c.id); return cs.length && mastery(cs) >= 100; }).length;
    return [["Première carte", reviews >= 1], ["100 réponses", reviews >= 100], ["1 000 réponses", reviews >= 1000], ["3 jours d'affilée", st >= 3], ["7 jours d'affilée", st >= 7], ["30 jours d'affilée", st >= 30], ["Un chapitre à 100 %", full >= 1], ["5 chapitres à 100 %", full >= 5], ["100 cartes créées", state.cards.length >= 100]];
  }

  // ---------- mode vrai ou faux ----------
  async function screenTrueFalse(id) {
    tabs.hidden = true;
    const all = cardsOf(id), back = "#chapitre-" + id, head = `<div class="row"><a class="iconbtn" href="${back}" aria-label="Fermer">${I.x}</a><div class="grow" style="text-align:center;font-weight:800">Vrai ou faux</div><span style="width:44px"></span></div>`;
    if (all.length < 4) { app.innerHTML = head + `<div class="card done"><p class="muted">Il faut au moins 4 cartes pour ce mode.</p><a class="btn" href="${back}">Retour</a></div>`; return; }
    const qs = shuffle(all).slice(0, 10).map(c => { const truth = Math.random() < 0.5, other = lookalikes(c.back, shuffle(all.filter(x => x.id !== c.id && x.back !== c.back)), 2, x => x.back)[Math.random() < 0.7 ? 0 : 1] || all.find(x => x.id !== c.id && x.back !== c.back); return { c, truth: truth || !other, shown: truth || !other ? c.back : other.back }; });
    let i = 0, good = 0; const missed = [];
    function ask() {
      if (i >= qs.length) { app.innerHTML = head + `<div class="card done"><h1>${good === qs.length ? "Bon travail !" : "C'est fini"}</h1><div class="big">${good} / ${qs.length}</div>${missed.length ? `<div class="stack" style="text-align:left;width:100%"><p class="label">À revoir</p>${missed.map(c => `<div class="term" style="padding:8px 0"><b>${mx(c.front)}</b><p>${mx(c.back)}</p></div>`).join("")}</div>` : ""}<button class="btn" id="again">Rejouer</button><a class="btn ghost" href="${back}">Retour au chapitre</a></div>`; $("again").onclick = () => screenTrueFalse(id); return; }
      const q = qs[i];
      app.innerHTML = head + `<div class="bar"><i style="width:${i / qs.length * 100}%"></i></div><div class="card pad stack"><p class="small muted">Affirmation ${i + 1} sur ${qs.length}</p><h2 class="qtxt">${mx(q.c.front)}</h2><p class="expected" style="background:var(--accent-soft);color:var(--accent-ink)">${mx(q.shown)}</p><p class="fb" id="fb" role="status"></p><div class="answers"><button class="btn peach" id="faux">Faux</button><button class="btn" id="vrai">Vrai</button></div><button class="btn ghost" id="cont" hidden>Continuer</button></div>`;
      const pick = (v) => { const ok = v === q.truth; ping(ok); if (ok) good++; else missed.push(q.c); $("vrai").disabled = $("faux").disabled = true; $("fb").className = "fb " + (ok ? "ok" : "ko"); $("fb").textContent = ok ? "Bon travail !" : (q.truth ? "C'était vrai." : "C'était faux. La bonne réponse : " + q.c.back); $("cont").hidden = false; $("cont").onclick = () => { i++; ask(); }; $("cont").focus(); };
      $("vrai").onclick = () => pick(true); $("faux").onclick = () => pick(false);
      screenSession.key = (e) => { if ($("vrai") && !$("vrai").disabled) { if (e.key === "ArrowRight" || e.key.toLowerCase() === "v") pick(true); if (e.key === "ArrowLeft" || e.key.toLowerCase() === "f") pick(false); } else if (e.key === "Enter" && $("cont")) $("cont").click(); };
    }
    ask();
  }

  // ---------- fiche de révision à imprimer ----------
  async function screenSheet(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; app.innerHTML = `<p class="muted">Chargement…</p>`;
    const { data: sum } = await sb.from("summaries").select("markdown").eq("chapter_id", id).maybeSingle(), cards = cardsOf(id), s = state.subjects.find(x => x.id === ch.subject_id);
    app.innerHTML = `<div class="row between noprint"><a class="iconbtn" href="#chapitre-${id}" aria-label="Retour au chapitre">${I.back}</a><button class="btn sm" id="print">Imprimer ou enregistrer en PDF</button></div>
      <div class="sheet"><p class="small muted">${esc(s ? s.name : "")}</p><h1>${esc(ch.name)}</h1>
      ${sum ? `<div class="md">${md(sum.markdown)}</div>` : ""}
      ${ch.notes ? `<h2 style="margin-top:16px">Mes notes</h2><p style="white-space:pre-wrap">${esc(ch.notes)}</p>` : ""}
      <h2 style="margin-top:16px">${plural(cards.length, "carte", "cartes")}</h2><table class="sheettable"><tbody>${cards.map(c => `<tr><th scope="row">${esc(c.front)}</th><td>${esc(c.back)}</td></tr>`).join("")}</tbody></table></div>`;
    $("print").onclick = () => printDoc(app.querySelector(".sheet"), "Fiche " + ch.name);
  }

  // ---------- petits outils communs aux nouveaux modes ----------
  const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  function highlight(text, marks) {
    const low = text.toLowerCase(), spans = [];
    marks.forEach(m => { const e = String(m.t || "").trim(); if (e.length < 3) return; const k = low.indexOf(e.toLowerCase()); if (k >= 0) spans.push({ a: k, b: k + e.length, cls: m.cls, tip: m.tip }); });
    spans.sort((x, y) => x.a - y.a); let out = "", pos = 0;
    for (const s of spans) { if (s.a < pos) continue; out += esc(text.slice(pos, s.a)) + `<mark class="hl ${s.cls}"${s.tip ? ` title="${esc(s.tip)}"` : ""}>${esc(text.slice(s.a, s.b))}</mark>`; pos = s.b; }
    return out + esc(text.slice(pos));
  }
  const li = (arr) => (arr || []).filter(Boolean).map(x => `<li>${mx(typeof x === "string" ? x : JSON.stringify(x))}</li>`).join("");
  const emptyTool = (id, title, msg) => { app.innerHTML = toolHead(id, title) + `<div class="card done"><p class="muted">${msg}</p><a class="btn" href="#chapitre-${id}">Retour au chapitre</a></div>`; };
  // Voix : on prend la meilleure voix installée (voix « naturelles » ou Google d'abord), ou celle choisie dans Réglages.
  function voicesFor(lang) { if (!("speechSynthesis" in window)) return []; const p = (lang || "fr").slice(0, 2).toLowerCase(); return speechSynthesis.getVoices().filter(v => (v.lang || "").toLowerCase().startsWith(p)); }
  function voiceScore(v) { const n = v.name || ""; let k = 0; if (/natural|neural|online|premium|enhanced|améliorée|siri/i.test(n)) k += 100; if (/google/i.test(n)) k += 60; if (/hortense|julie|paul|compact|espeak/i.test(n)) k -= 30; if (!v.localService) k += 10; if (/fr[-_]FR/i.test(v.lang)) k += 5; return k; }
  function pickVoice(lang) { const vs = voicesFor(lang); if (!vs.length) return null; const want = (lang || "fr").slice(0, 2).toLowerCase() === "fr" ? safeGet("merge.voice") : null; return vs.find(v => v.voiceURI === want) || vs.slice().sort((a, b) => voiceScore(b) - voiceScore(a))[0]; }
  const voiceRate = () => Math.min(2, Math.max(0.5, parseFloat(safeGet("merge.rate")) || 1));
  function utter(t, lang, rate) { const u = new SpeechSynthesisUtterance(t); u.lang = lang || "fr-FR"; const v = pickVoice(u.lang); if (v) { u.voice = v; u.lang = v.lang; } u.rate = Math.min(2, rate || voiceRate()); return u; }
  if ("speechSynthesis" in window) { try { speechSynthesis.getVoices(); } catch (e) { /* voix chargées plus tard */ } }
  // Les longues phrases sont lues par morceaux : certaines voix en ligne se coupent après une quinzaine de secondes.
  // Lecture à voix haute. Voix Merge (Laomedeia, fonction `voix`, chaque phrase gardée sur le serveur) si elle est disponible,
  // sinon voix de l'appareil : hors ligne, API pas encore activée, ou quota gratuit du mois atteint.
  const spk = { el: null, token: 0, down: 0 };
  const neuralWanted = () => safeGet("merge.vengine") !== "appareil";
  const spkUrls = new Map();
  async function neuralUrl(text, lang) {
    const k = (lang || "fr") + "|" + text; if (spkUrls.has(k)) return spkUrls.get(k);
    const { data, error } = await sb.functions.invoke("voix", { body: { text, lang: (lang || "fr").slice(0, 2) } });
    if (error || !data || !(data.url || data.audio)) { spk.down = Date.now(); throw new Error("voix"); }
    const url = data.url || ("data:audio/mpeg;base64," + data.audio); spkUrls.set(k, url); return url;
  }
  function stopSpeak() { spk.token++; try { if ("speechSynthesis" in window) speechSynthesis.cancel(); } catch (e) { /* rien */ } if (spk.el) { spk.el.pause(); spk.el.onended = null; } }
  function speakTextDevice(t, lang, onend, rate) {
    if (!("speechSynthesis" in window)) { if (onend) onend(); return; }
    const bits = String(t).match(/[^.!?;:\n]+[.!?;:]*\s*/g) || [String(t)], chunks = []; let cur = "";
    bits.forEach(b => { if ((cur + b).length > 180 && cur.trim()) { chunks.push(cur); cur = ""; } cur += b; }); if (cur.trim()) chunks.push(cur);
    speechSynthesis.cancel(); let k = 0, over = false; const end = () => { if (!over) { over = true; if (onend) onend(); } };
    const next = () => { if (over) return; if (k >= chunks.length) return end(); const u = utter(chunks[k++], lang, rate); u.onend = next; u.onerror = end; speechSynthesis.speak(u); };
    next();
  }
  function speakText(t, lang, onend, rate) {
    stopSpeak(); const my = spk.token;
    t = /[$\\]/.test(String(t)) ? texPlain(t).replace(/\(([^()]*)\)\/\(([^()]*)\)/g, "$1 sur $2") : String(t);
    const useNeural = neuralWanted() && state.user && !state.offline && navigator.onLine !== false && Date.now() - spk.down > 600000;
    if (!useNeural) return speakTextDevice(t, lang, onend, rate);
    const bits = t.match(/[^.!?;:\n]+[.!?;:]*\s*/g) || [t], chunks = []; let cur = "";
    bits.forEach(b => { if ((cur + b).length > 900 && cur.trim()) { chunks.push(cur.trim()); cur = ""; } cur += b; }); if (cur.trim()) chunks.push(cur.trim());
    let k = 0, over = false; const end = () => { if (!over && my === spk.token) { over = true; if (onend) onend(); } };
    const fallback = () => { if (my !== spk.token) return; speakTextDevice(chunks.slice(k).join(" "), lang, end, rate); };
    const next = async () => {
      if (my !== spk.token) return; if (k >= chunks.length) return end();
      let url; try { url = await neuralUrl(chunks[k], lang); } catch (e) { return fallback(); }
      if (my !== spk.token) return; k++;
      if (k < chunks.length) neuralUrl(chunks[k], lang).catch(() => {});
      const a = spk.el || (spk.el = new Audio()); a.preservesPitch = true; a.defaultPlaybackRate = rate || voiceRate(); a.src = url; a.playbackRate = rate || voiceRate(); a.onended = next; a.onerror = () => { k--; fallback(); };
      const pr = a.play(); if (pr && pr.catch) pr.catch(() => { k--; fallback(); });
    };
    next();
  }
  const chLang = ch => (!ch.lang || ch.lang.startsWith("fr")) ? "fr-FR" : ch.lang;
  const getMnemo = c => c.mnemonic || safeGet("merge.mnemo." + c.id) || "";

  // ---------- chasse aux pièges : deviens le correcteur ----------
  function screenTraps(id) {
    toolGate(id, "pieges", "Chasse aux pièges", "Deviens le correcteur : Merge écrit une copie d'élève qui contient 2 ou 3 erreurs classiques. À toi de les repérer et de les corriger.", (data, ch, regen) => {
      const exos = (data.exercices || []).filter(e => e && e.copie && (e.erreurs || []).length); let i = 0, found = 0, total = 0;
      if (!exos.length) return emptyTool(id, "Chasse aux pièges", "Aucune copie n'a pu être préparée pour ce cours.");
      function show() {
        const e = exos[i], sents = (e.copie.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [e.copie]).map(x => x.trim()).filter(Boolean), sel = new Set();
        const bad = sents.map(st => e.erreurs.findIndex(er => norm(er.extrait).length > 3 && (norm(st).includes(norm(er.extrait)) || norm(er.extrait).includes(norm(st)))));
        app.innerHTML = toolHead(id, "Chasse aux pièges") + `<div class="bar"><i style="width:${i / exos.length * 100}%"></i></div>
          <div class="card pad stack"><span class="pill" style="align-self:flex-start">Copie ${i + 1} sur ${exos.length}</span><h2 class="qtxt">${mx(e.question)}</h2>
          <p class="note">Cette copie contient ${plural(e.erreurs.length, "erreur", "erreurs")}. Touche les phrases que tu penses fausses.</p>
          <div class="copie" id="copie">${sents.map((st, k) => `<button class="sent" data-k="${k}" aria-pressed="false">${mx(st)}</button>`).join(" ")}</div>
          <div class="field"><label for="fix">Ta correction (facultatif)</label><textarea id="fix" style="min-height:80px" placeholder="Écris ce qu'il aurait fallu dire"></textarea></div>
          <button class="btn" id="chk">Corriger la copie</button><div id="res" class="stack"></div></div>`;
        app.querySelectorAll(".sent").forEach(b => b.onclick = () => { const k = +b.dataset.k; sel.has(k) ? sel.delete(k) : sel.add(k); b.setAttribute("aria-pressed", sel.has(k)); });
        $("chk").onclick = () => {
          const hit = new Set(); let alarms = 0;
          app.querySelectorAll(".sent").forEach(b => { const k = +b.dataset.k; b.disabled = true; if (bad[k] >= 0) { b.classList.add(sel.has(k) ? "found" : "missed"); if (sel.has(k)) hit.add(bad[k]); } else if (sel.has(k)) { b.classList.add("alarm"); alarms++; } });
          found += hit.size; total += e.erreurs.length; ping(hit.size === e.erreurs.length && !alarms);
          e.erreurs.forEach((er, k) => { if (!hit.has(k)) logMistake(id, e.question, er.correction, er.extrait, "pièges"); });
          $("chk").hidden = true; $("fix").readOnly = true;
          $("res").innerHTML = `<p class="fb ${hit.size === e.erreurs.length ? "ok" : "ko"}">${hit.size} sur ${plural(e.erreurs.length, "erreur trouvée", "erreurs trouvées")}${alarms ? ", " + plural(alarms, "phrase juste accusée à tort", "phrases justes accusées à tort") : ""}.</p>
            ${e.erreurs.map(er => `<div class="fix"><p><s>${mx(er.extrait)}</s></p><p class="expected">${mx(er.correction)}</p>${er.explication ? `<p class="note">${mx(er.explication)}</p>` : ""}</div>`).join("")}
            <button class="btn" id="nx">${i < exos.length - 1 ? "Copie suivante" : "Terminer"}</button>`;
          $("nx").onclick = () => { i++; i < exos.length ? show() : end(); };
        };
      }
      function end() {
        app.innerHTML = toolHead(id, "Chasse aux pièges") + `<div class="card done"><h1>${found === total ? "Bon travail !" : "C'est fini"}</h1><div class="big">${found} / ${total}</div><p class="muted">erreurs repérées dans ${plural(exos.length, "copie", "copies")}.</p><button class="btn" id="again">Recommencer</button><a class="btn ghost" href="#chapitre-${id}">Retour au chapitre</a></div>${regenHtml}`;
        $("again").onclick = () => { i = 0; found = 0; total = 0; show(); }; wireRegen(regen);
      }
      show();
    });
  }

  // ---------- blurting : la feuille blanche ----------
  async function screenBlurting(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const T = "Feuille blanche", here = location.hash;
    const last = await getCached(id, "blurting"); if (location.hash !== here) return;
    function form(text) {
      app.innerHTML = toolHead(id, T) + `<h1>Écris tout ce dont tu te souviens</h1><p class="muted">Ferme ton cours. Écris sans notes tout ce que tu as retenu de « ${mx(ch.name)} », dans l'ordre qui te vient. Merge compare ensuite avec ton cours.</p>
        <div class="field"><label for="bl">Ta feuille blanche</label><textarea id="bl" style="min-height:42vh" placeholder="Je me souviens que…">${esc(text || "")}</textarea></div>
        <button class="btn" id="go">Corriger ma feuille</button><p class="note">1 appel IA par correction.</p><div id="msg"></div>
        ${last ? '<button class="linkbtn" id="lastb">Revoir ma dernière correction</button>' : ""}`;
      if ($("lastb")) $("lastb").onclick = () => result(last.recall, last.res);
      $("go").onclick = async () => {
        const recall = $("bl").value.trim(); if (recall.length < 20) return toast("Écris au moins quelques phrases.");
        $("go").disabled = true; $("msg").innerHTML = '<p class="muted" role="status">Merge compare ta feuille avec ton cours…</p>';
        try { const text = await courseText(id); if (text.trim().length < 80) throw new Error("Importe d'abord ton cours dans ce chapitre.");
          const r = await ai({ action: "blurting", text, recall }); await putCached(id, "blurting", { recall, res: r.content }); if (location.hash === here) result(recall, r.content);
        } catch (e) { if ($("go")) $("go").disabled = false; showErr($("msg"), e); }
      };
    }
    function result(recall, r) {
      r = r || {}; const cards = (r.cartes || []).filter(c => c && c.front && c.back).slice(0, 3);
      const marks = (r.acquis || []).map(t => ({ t, cls: "ok" })).concat((r.erreurs || []).map(e => ({ t: e.extrait, cls: "ko", tip: e.correction })));
      app.innerHTML = toolHead(id, T) + `<div class="row between"><h1>Ta correction</h1>${r.score != null ? `<span class="pill">${Math.round(+r.score || 0)} % du cours restitué</span>` : ""}</div>
        <div class="legend"><span><mark class="hl ok">Vert</mark> acquis</span><span><mark class="hl warn">Orange</mark> oublis</span><span><mark class="hl ko">Rouge</mark> erreurs</span></div>
        <div class="card pad"><p class="recall">${highlight(recall, marks)}</p></div>
        ${(r.erreurs || []).length ? `<div class="card pad stack"><h2>Erreurs à corriger</h2>${r.erreurs.map(e => `<div class="fix"><p><mark class="hl ko">${mx(e.extrait)}</mark></p><p class="expected">${mx(e.correction)}</p></div>`).join("")}</div>` : ""}
        ${(r.oublis || []).length ? `<div class="card pad stack"><h2>Ce que tu as oublié</h2><ul class="plain">${r.oublis.map(o => `<li><mark class="hl warn">${mx(o)}</mark></li>`).join("")}</ul></div>` : ""}
        ${cards.length ? `<div class="card pad stack"><h2>${plural(cards.length, "carte de renfort", "cartes de renfort")}</h2>${cards.map(c => `<div class="term" style="padding:6px 0"><b>${mx(c.front)}</b><p>${mx(c.back)}</p></div>`).join("")}<button class="btn sm" id="addc">Ajouter ces cartes au chapitre</button></div>` : ""}
        <button class="btn ghost" id="redo">Refaire une feuille blanche</button>`;
      $("redo").onclick = () => form("");
      if ($("addc")) $("addc").onclick = async () => {
        $("addc").disabled = true;
        const ins = await sb.from("cards").insert(cards.map(c => ({ chapter_id: id, front: String(c.front).slice(0, 500), back: String(c.back).slice(0, 2000), source_quote: c.source_quote ? String(c.source_quote).slice(0, 400) : null })));
        if (ins.error) { $("addc").disabled = false; return fail(ins.error, "Cartes non ajoutées"); }
        await loadAll(); $("addc").textContent = "Cartes ajoutées"; toast("Cartes de renfort ajoutées.");
      };
    }
    form("");
  }

  // ---------- méthode Feynman ----------
  function screenFeynman(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const T = "Méthode Feynman", here = location.hash, notions = cardsOf(id).map(c => c.front).slice(0, 40);
    function form(notion, expl) {
      app.innerHTML = toolHead(id, T) + `<h1>Explique-le à un enfant de 10 ans</h1><p class="muted">Si tu peux l'expliquer simplement, c'est que tu as compris. Pas de mots compliqués, des exemples, des phrases courtes.</p>
        <div class="field"><label for="fn">La notion à expliquer</label><input id="fn" type="text" maxlength="200" list="fnl" value="${esc(notion || "")}" placeholder="Ex. La mitose"><datalist id="fnl">${notions.map(n => `<option value="${esc(n)}"></option>`).join("")}</datalist></div>
        <div class="field"><label for="fe">Ton explication</label><textarea id="fe" style="min-height:32vh" placeholder="Imagine que…">${esc(expl || "")}</textarea></div>
        <button class="btn" id="go">Vérifier ma compréhension</button><p class="note">1 appel IA par vérification.</p><div id="msg"></div>`;
      $("go").onclick = async () => {
        const n = $("fn").value.trim(), e = $("fe").value.trim(); if (n.length < 2) return toast("Indique la notion."); if (e.length < 20) return toast("Écris ton explication.");
        $("go").disabled = true; $("msg").innerHTML = '<p class="muted" role="status">Merge relit ton explication…</p>';
        try { const text = await courseText(id); if (text.trim().length < 80) throw new Error("Importe d'abord ton cours dans ce chapitre.");
          const r = await ai({ action: "feynman", text, notion: n, explication: e }); if (location.hash === here) result(n, e, r.content || {});
        } catch (err) { if ($("go")) $("go").disabled = false; showErr($("msg"), err); }
      };
    }
    function result(n, e, r) {
      const note = Math.max(0, Math.min(5, Math.round(+r.note || 0))), sec = (t, arr, cls) => (arr || []).length ? `<div class="card pad stack"><h2>${t}</h2><ul class="plain ${cls || ""}">${li(arr)}</ul></div>` : "";
      app.innerHTML = toolHead(id, T) + `<div class="card done"><p class="small muted">${mx(n)}</p><div class="big">${note} / 5</div><div class="stars" role="img" aria-label="${note} sur 5">${[1, 2, 3, 4, 5].map(k => `<i class="${k <= note ? "on" : ""}"></i>`).join("")}</div><p>${mx(r.verdict || "")}</p></div>
        ${sec("Ce que tu as vraiment compris", r.compris)}${sec("Ce qui reste flou", r.flou)}${sec("Ce qui manque", r.manque)}
        ${(r.faux || []).length ? `<div class="card pad stack"><h2>À corriger</h2>${r.faux.map(f => `<div class="fix"><p><mark class="hl ko">${mx(f.dit)}</mark></p><p class="expected">${mx(f.correction)}</p></div>`).join("")}</div>` : ""}
        ${(r.jargon || []).length ? `<div class="card pad stack"><h2>Mots trop compliqués</h2><div class="chips">${r.jargon.map(j => `<span class="pill warn">${mx(j)}</span>`).join("")}</div></div>` : ""}
        ${r.conseil ? `<div class="banner"><div><h2>Conseil</h2><p class="small">${mx(r.conseil)}</p></div></div>` : ""}
        <button class="btn" id="retry">Améliorer mon explication</button><button class="btn ghost" id="other">Expliquer une autre notion</button>`;
      $("retry").onclick = () => form(n, e); $("other").onclick = () => form("", "");
    }
    form("", "");
  }

  // ---------- professeur IA + « Rends ça concret » ----------
  const threads = {};
  function screenAsk(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const th = threads[id] = threads[id] || [];
    const THEMES = [["pop", "Pop culture"], ["manga", "Mangas"], ["sport", "Sport"], ["quotidien", "Vie quotidienne"]];
    function draw(err) {
      app.innerHTML = toolHead(id, "Professeur IA") + `<h1>Pose tes questions sur ton cours</h1><p class="muted">Ton professeur IA répond uniquement avec ce qui est écrit dans « ${esc(ch.name)} ». Si la réponse n'y est pas, il te le dit.</p>
        <div class="stack" id="thread">${th.map((m, k) => m.role === "eleve" ? `<div class="bubble me">${esc(m.text)}</div>` : `<div class="bubble card"><div class="md">${md(m.text)}</div>${m.concret ? "" : `<div class="concret"><span class="small muted">Rends ça concret avec :</span><div class="chips">${THEMES.map(t => `<button class="chip sm" data-th="${t[0]}" data-k="${k}">${t[1]}</button>`).join("")}</div></div>`}</div>`).join("")}</div>
        <div id="amsg"></div>
        <div class="field"><label for="qq">Ta question</label><textarea id="qq" style="min-height:90px" placeholder="Ex. C'est quoi la différence entre période et fréquence ?"></textarea></div>
        <button class="btn" id="send">Demander</button><p class="note">1 appel IA par question ou par exemple concret.</p>`;
      if (err) showErr($("amsg"), err);
      const busy = (on, msg) => { app.querySelectorAll("#send,[data-th]").forEach(b => b.disabled = on); if (on) $("amsg").innerHTML = `<p class="muted" role="status">${msg}</p>`; };
      $("send").onclick = async () => {
        const q = $("qq").value.trim(); if (q.length < 3) return toast("Écris ta question.");
        busy(true, "Ton professeur cherche dans ton cours…");
        try { const text = await courseText(id); if (!text.trim()) throw new Error("Importe d'abord ton cours dans ce chapitre.");
          const r = await ai({ action: "prof", text, question: q, history: th.slice(-6).map(m => ({ role: m.role, text: m.text })) });
          th.push({ role: "eleve", text: q }, { role: "prof", text: r.answer || "" }); if ($("thread")) draw();
        } catch (e) { if ($("thread")) { busy(false); showErr($("amsg"), e); } }
      };
      app.querySelectorAll("[data-th]").forEach(b => b.onclick = async () => {
        const k = +b.dataset.k, q = th[k - 1] ? th[k - 1].text : "", label = THEMES.find(t => t[0] === b.dataset.th)[1];
        busy(true, "Merge cherche une comparaison…");
        try { const text = await courseText(id); const r = await ai({ action: "concret", text, notion: q, theme: b.dataset.th });
          th.push({ role: "eleve", text: "Rends ça concret (" + label.toLowerCase() + ") : " + q }, { role: "prof", text: r.answer || "", concret: true }); if ($("thread")) draw();
        } catch (e) { if ($("thread")) { busy(false); showErr($("amsg"), e); } }
      });
      if (th.length) { const last = $("thread").lastElementChild; if (last && last.scrollIntoView) last.scrollIntoView({ block: "nearest" }); }
    }
    draw();
  }

  // ---------- bilan de la semaine ----------
  function screenWeek() {
    drawTabs("progres");
    const d14 = lastDays(14, state.sessions), cur = d14.slice(7), prev = d14.slice(0, 7);
    const sum = (a, k) => a.reduce((x, y) => x + (y[k] || 0), 0), days = a => a.filter(x => x.seconds > 0 || x.cards_reviewed > 0).length;
    const mins = Math.round(sum(cur, "seconds") / 60), pmins = Math.round(sum(prev, "seconds") / 60), cards = sum(cur, "cards_reviewed"), pcards = sum(prev, "cards_reviewed"), nd = days(cur), pd = days(prev);
    const weak = state.chapters.map(c => ({ c, n: cardsOf(c.id).length, m: mastery(cardsOf(c.id)) })).filter(x => x.n).sort((a, b) => a.m - b.m)[0];
    const diff = (a, b) => a === b ? "comme la semaine d'avant" : (a > b ? "+" + (a - b) : "−" + (b - a)) + " par rapport à la semaine d'avant";
    const goal = Math.min(7, Math.max(3, nd + 1)), si = streakInfo();
    app.innerHTML = `<div class="row"><a class="iconbtn" href="#progres" aria-label="Retour">${I.back}</a><h1>Bilan de la semaine</h1></div>
      <p class="muted">Les 7 derniers jours, comparés aux 7 d'avant.</p>
      <div class="card stats"><div class="stat s1"><span class="sico">${I.cal}</span><div><b>${nd} / 7</b><span>jours révisés</span></div></div><div class="stat s2"><span class="sico">${I.cards}</span><div><b>${cards}</b><span>cartes révisées</span></div></div><div class="stat s3"><span class="sico">${I.clock}</span><div><b>${mins} min</b><span>de révision</span></div></div><div class="stat s4"><span class="sico">${I.bolt}</span><div><b>${si.n}</b><span>${si.n > 1 ? "jours d'affilée" : "jour d'affilée"}</span></div></div></div>
      <div class="card pad stack"><h2>Par rapport à la semaine d'avant</h2><div class="srow"><span>Jours révisés</span><b>${diff(nd, pd)}</b></div><div class="srow"><span>Cartes</span><b>${diff(cards, pcards)}</b></div><div class="srow"><span>Minutes</span><b>${diff(mins, pmins)}</b></div></div>
      <div class="card pad stack"><h2>Tes 7 derniers jours</h2><div class="wbars" style="height:120px">${cur.map(x => `<div><i class="${x.cards_reviewed || x.seconds ? "" : "zero"}" style="height:${Math.max(6, Math.round(Math.max(x.seconds, x.cards_reviewed * 20) / Math.max(300, ...cur.map(y => Math.max(y.seconds, y.cards_reviewed * 20))) * 100))}%"></i><span>${"DLMMJVS"[new Date(x.day + "T00:00:00").getDay()]}</span></div>`).join("")}</div></div>
      ${weak ? `<div class="banner"><div><h2>Ton chapitre le plus fragile</h2><p class="small">${esc(weak.c.name)} : ${weak.m} % de maîtrise.</p></div><a class="btn sm" href="#cartes-${weak.c.id}">Le réviser</a></div>` : ""}
      <div class="card pad stack"><h2>Objectif de la semaine prochaine</h2><p>${nd >= 7 ? "Tu as révisé tous les jours. Garde ce rythme." : "Réviser " + goal + " jours sur 7, même 5 minutes."}</p><p class="note">${si.frozen ? "Ton gel de série a sauvé un jour raté cette semaine." : "Gel de série : 1 jour raté par semaine ne casse pas ta série."}</p></div>`;
  }

  // ---------- statistiques d'un chapitre ----------
  function screenStats(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; recordHist([id], 0, null);
    const cs = cardsOf(id), m = mastery(cs), h = jget("merge.hist." + id, []), right = cs.reduce((a, c) => a + (c.right_count || 0), 0), wrong = cs.reduce((a, c) => a + (c.wrong_count || 0), 0), secs = parseInt(safeGet("merge.time." + id), 10) || 0;
    const worst = cs.filter(c => (c.wrong_count || 0) > 0).sort((a, b) => b.wrong_count - a.wrong_count).slice(0, 5);
    const pts = h.map((x, i) => [h.length > 1 ? 6 + i * 288 / (h.length - 1) : 150, 94 - x.m * 0.88]);
    app.innerHTML = toolHead(id, "Statistiques") + `<h1>${esc(ch.name)}</h1>
      <div class="card stats"><div class="stat s2"><span class="sico">${I.check}</span><div><b>${m} %</b><span>de maîtrise</span></div></div><div class="stat s1"><span class="sico">${I.cards}</span><div><b>${cs.filter(isMastered).length} / ${cs.length}</b><span>cartes maîtrisées</span></div></div><div class="stat s4"><span class="sico">${I.bolt}</span><div><b>${right + wrong ? Math.round(right / (right + wrong) * 100) + " %" : "–"}</b><span>de bonnes réponses sur ${right + wrong}</span></div></div><div class="stat s3"><span class="sico">${I.clock}</span><div><b>${Math.round(secs / 60)} min</b><span>passées sur les cartes</span></div></div></div>
      <div class="card pad stack"><h2>Ta maîtrise dans le temps</h2>${h.length > 1 ? `<svg class="curve" viewBox="0 0 300 100" preserveAspectRatio="none" role="img" aria-label="Courbe de maîtrise"><path d="M6 94H294M6 50H294M6 6H294" class="gl"/><polyline points="${pts.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")}"/>${pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.5"/>`).join("")}</svg><div class="row between small muted"><span>${esc(new Date(h[0].d + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" }))}</span><span>aujourd'hui</span></div>` : '<p class="muted">La courbe se dessine au fil des jours : reviens après ta prochaine session.</p>'}<p class="note">Suivi depuis le 13 novembre 2026, gardé sur cet appareil.</p></div>
      <div class="card pad stack"><h2>Les cartes que tu rates le plus</h2>${worst.length ? worst.map(c => `<div class="srow"><span>${esc(c.front)}</span><b class="r">${c.wrong_count} ×</b></div>`).join("") + `<a class="btn sm" href="#difficiles-${id}">Travailler ces cartes</a>` : '<p class="muted">Aucune carte ratée pour l\'instant.</p>'}</div>`;
  }

  // ---------- schémas à légender : l'élève cache des zones d'une page et s'entraîne à les retrouver ----------
  async function screenOccl(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const here = location.hash, key = "merge.occl." + id, data = jget(key, {}), urls = {}, dir = state.user.id + "/" + id;
    let pages = Object.keys(data), cur = null, mode = "edit", open = new Set();
    app.innerHTML = toolHead(id, "Schémas à légender") + '<p class="muted">Chargement…</p>';
    try { const r = await sb.storage.from("cours").list(dir, { limit: 200 }); (r.data || []).forEach(f => { const p = dir + "/" + f.name; if (/\.(jpe?g|png|webp)$/i.test(f.name) && !pages.includes(p)) pages.push(p); }); } catch (e) { /* liste indisponible */ }
    if (location.hash !== here) return;
    const urlOf = async (p) => { if (urls[p] !== undefined) return urls[p]; try { const { data: d, error } = await sb.storage.from("cours").createSignedUrl(p, 3600); urls[p] = !error && d ? d.signedUrl : null; } catch (e) { urls[p] = null; } return urls[p]; };
    const save = () => { Object.keys(data).forEach(k => { if (!data[k].length) delete data[k]; }); jset(key, data); };
    async function addImage(file) {
      try {
        const bmp = await createImageBitmap(file), k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k); cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
        const blob = await new Promise(r => cv.toBlob(r, "image/jpeg", 0.85)), path = dir + "/schema-" + Date.now() + ".jpg";
        const up = await sb.storage.from("cours").upload(path, blob, { contentType: "image/jpeg" }); if (up.error) throw up.error;
        urls[path] = URL.createObjectURL(blob); pages.unshift(path); cur = path; mode = "edit"; draw();
      } catch (e) { toast("Image non ajoutée : " + (e.message || "format non lu") + "."); }
    }
    async function draw() {
      if (location.hash !== here) return;
      if (!cur) {
        app.innerHTML = toolHead(id, "Schémas à légender") + `<h1>Schémas à légender</h1><p class="muted">Choisis une page de ton cours avec un schéma, cache les légendes, puis entraîne-toi à les retrouver.</p>
          <label class="btn sm" for="oadd">${I.plus}Ajouter une image</label><input id="oadd" type="file" accept="image/*" hidden>
          <div class="ogrid">${pages.length ? pages.map((p, i) => `<button class="card othumb" data-pg="${i}"><span class="oimg" data-th="${i}"></span><span class="small muted">${(data[p] || []).length ? plural(data[p].length, "cache", "caches") : "Aucun cache"}</span></button>`).join("") : `<div class="card empty"><span class="mico big">${I.grid}</span><b>Aucune page avec schéma dans ce chapitre</b><p class="small muted">Ajoute une photo ou une capture d'un schéma de ton cours.</p></div>`}</div>`;
        $("oadd").onchange = e => { if (e.target.files[0]) addImage(e.target.files[0]); };
        app.querySelectorAll("[data-pg]").forEach(b => b.onclick = () => { cur = pages[+b.dataset.pg]; mode = (data[cur] || []).length ? "train" : "edit"; open = new Set(); draw(); });
        pages.slice(0, 30).forEach(async (p, i) => { const u = await urlOf(p), el = app.querySelector(`[data-th="${i}"]`); if (el) el.innerHTML = u ? `<img src="${esc(u)}" alt="Page ${i + 1} du cours" loading="lazy">` : '<span class="small muted">Image indisponible</span>'; });
        return;
      }
      const u = await urlOf(cur), masks = data[cur] || (data[cur] = []); if (location.hash !== here) return;
      app.innerHTML = toolHead(id, "Schémas à légender") + `<div class="row between" style="flex-wrap:wrap"><button class="btn sm ghost" id="oback">${I.back}Toutes les pages</button><div class="seg" role="group" aria-label="Mode"><button data-om="edit" aria-pressed="${mode === "edit"}">Placer les caches</button><button data-om="train" aria-pressed="${mode === "train"}">S'entraîner</button></div></div>
        <p class="note" id="ohint">${mode === "edit" ? "Fais glisser ton doigt ou ta souris sur une légende pour la cacher. Touche un cache pour l'enlever." : masks.length ? "Devine ce qu'il y a sous chaque cache, puis touche-le pour vérifier." : "Place d'abord au moins un cache."}</p>
        ${u ? `<div class="occl ${mode}" id="occl"><img src="${esc(u)}" alt="Schéma du cours" draggable="false">${masks.map((k, i) => `<button class="omask${open.has(i) ? " open" : ""}" data-mk="${i}" style="left:${k.x}%;top:${k.y}%;width:${k.w}%;height:${k.h}%" aria-label="Cache ${i + 1}"><span>${i + 1}</span></button>`).join("")}</div>` : '<p class="err">Image indisponible. Vérifie ta connexion.</p>'}
        <div class="row" style="flex-wrap:wrap">${mode === "train" ? `<span class="pill" id="ocount">${open.size} / ${masks.length} découverts</span><button class="btn sm ghost" id="ohide">Tout recacher</button>` : `<span class="pill">${plural(masks.length, "cache", "caches")}</span><button class="btn sm ghost" id="oclear">Enlever tous les caches</button>`}</div>`;
      $("oback").onclick = () => { save(); cur = null; draw(); };
      app.querySelectorAll("[data-om]").forEach(b => b.onclick = () => { mode = b.dataset.om; open = new Set(); draw(); });
      if ($("ohide")) $("ohide").onclick = () => { open = new Set(); draw(); };
      if ($("oclear")) $("oclear").onclick = () => { data[cur] = []; save(); draw(); };
      const box = $("occl"); if (!box) return;
      box.querySelectorAll("[data-mk]").forEach(b => b.onclick = (e) => { e.stopPropagation(); const i = +b.dataset.mk; if (mode === "edit") { masks.splice(i, 1); save(); draw(); } else { open.has(i) ? open.delete(i) : open.add(i); b.classList.toggle("open", open.has(i)); $("ocount").textContent = open.size + " / " + masks.length + " découverts"; } });
      if (mode !== "edit") return;
      let st = null, ghost = null; const pos = e => { const r = box.getBoundingClientRect(); return [Math.min(100, Math.max(0, (e.clientX - r.left) / r.width * 100)), Math.min(100, Math.max(0, (e.clientY - r.top) / r.height * 100))]; };
      box.onpointerdown = e => { if (e.target.closest("[data-mk]")) return; e.preventDefault(); st = pos(e); ghost = document.createElement("div"); ghost.className = "omask ghost"; box.appendChild(ghost); try { box.setPointerCapture(e.pointerId); } catch (er) { /* sans capture */ } };
      box.onpointermove = e => { if (!st) return; const p = pos(e); ghost.style.cssText = `left:${Math.min(st[0], p[0])}%;top:${Math.min(st[1], p[1])}%;width:${Math.abs(p[0] - st[0])}%;height:${Math.abs(p[1] - st[1])}%`; };
      box.onpointerup = box.onpointercancel = e => { if (!st) return; const p = pos(e), k = { x: +Math.min(st[0], p[0]).toFixed(2), y: +Math.min(st[1], p[1]).toFixed(2), w: +Math.abs(p[0] - st[0]).toFixed(2), h: +Math.abs(p[1] - st[1]).toFixed(2) }; st = null; if (ghost) ghost.remove(); if (k.w >= 2 && k.h >= 1.5) { masks.push(k); save(); draw(); } };
    }
    draw();
  }

  // ---------- demande libre : l'élève écrit ce qu'il veut, l'IA le fabrique à partir du cours ----------
  function screenLibre(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const key = "merge.libre." + id; let hist = []; try { hist = JSON.parse(safeGet(key) || "[]") || []; } catch (e) { hist = []; }
    const IDEAS = ["Fais-moi un plan du chapitre en 5 points", "10 questions pièges avec les réponses", "Explique-moi ce chapitre comme si j'avais 10 ans", "Une histoire pour retenir les définitions", "Classe les notions de la plus importante à la moins importante", "Ce qui tombe le plus souvent en contrôle d'après ce cours"];
    let draft = "", busy = false;
    function draw(err) {
      app.innerHTML = toolHead(id, "Demande libre") + `<div class="libre"><div class="stack"><h1>Demande ce que tu veux</h1><p class="muted">Écris exactement ce que tu veux pour réviser « ${esc(ch.name)} ». L'IA le fabrique uniquement à partir de ton cours.</p>
        <div class="field"><label for="lq">Ta demande</label><textarea id="lq" style="min-height:110px" maxlength="1200" placeholder="Ex. Fais-moi 10 questions pièges avec les réponses">${esc(draft)}</textarea></div>
        <div class="chips">${IDEAS.map((t, i) => `<button class="chip sm" data-idea="${i}">${t}</button>`).join("")}</div>
        <button class="btn" id="lsend"${busy ? " disabled" : ""}>${I.spark}Créer</button><p class="note">1 appel IA par demande. Les réponses restent gardées sur cet appareil.</p><div id="lmsg">${busy ? '<div class="row"><div class="spin" aria-hidden="true"></div><p class="muted" role="status">L\'IA prépare ta demande à partir de ton cours…</p></div>' : ""}</div></div>
        <div class="stack" id="lout">${hist.length ? hist.map((h, k) => `<div class="card pad stack"><div class="row between"><b>${esc(h.q)}</b><button class="mini" data-ldel="${k}">Retirer</button></div><div class="md">${md(h.a)}</div></div>`).join("") : '<div class="card empty"><span class="mico big">' + I.spark + '</span><b>Tes créations apparaîtront ici</b><p class="small muted">Choisis une idée ou écris la tienne.</p></div>'}</div></div>`;
      if (err) showErr($("lmsg"), err);
      app.querySelectorAll("[data-idea]").forEach(b => b.onclick = () => { $("lq").value = IDEAS[+b.dataset.idea]; $("lq").focus(); });
      app.querySelectorAll("[data-ldel]").forEach(b => b.onclick = () => { draft = $("lq").value; hist.splice(+b.dataset.ldel, 1); safeSet(key, JSON.stringify(hist)); draw(); });
      $("lsend").onclick = async () => {
        const q = $("lq").value.trim(); if (q.length < 4) return toast("Écris ce que tu veux."); draft = q; busy = true; draw();
        try { const text = await courseText(id); if (text.trim().length < 80) throw new Error("Importe d'abord ton cours dans ce chapitre.");
          const r = await ai({ action: "libre", text, demande: q }, "studio"); hist.unshift({ q, a: r.answer || "" }); hist = hist.slice(0, 8); safeSet(key, JSON.stringify(hist)); draft = ""; busy = false; if ($("lout")) draw();
        } catch (e) { busy = false; if ($("lout")) draw(e); }
      };
    }
    draw();
  }

  // ---------- khôlle : interrogation orale au micro ----------
  function screenOral(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const T = "Khôlle", here = location.hash, all = cardsOf(id);
    if (!all.length) return emptyTool(id, T, "Il faut au moins une carte dans ce chapitre.");
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition, list = shuffle(all).slice(0, 5), notes = [];
    let i = 0, rec = null, recDone = Promise.resolve();
    // iPhone : Safari peut planter si un son démarre alors que la dictée (micro) n'est pas complètement arrêtée.
    // On attend donc la vraie fin de la dictée (au plus 1,5 s) puis un court délai avant de lire la question.
    const wait = ms => new Promise(r => setTimeout(r, ms));
    function speakSafe(t) {
      stopSpeak(); try { if (rec) rec.abort(); } catch (e) { /* déjà arrêtée */ }
      Promise.race([recDone, wait(1500)]).then(() => wait(rec ? 400 : 0)).then(() => { if (location.hash === here) speakText(t, chLang(ch)); });
    }
    const FILL = /\b(e+u+h+|h+e+u+|bah|ben|hum+|genre|du coup|en fait|tu vois)\b/gi;
    function ask() {
      const c = list[i]; let final = "", t0 = 0, secs = 0, on = false;
      app.innerHTML = toolHead(id, T) + `<div class="bar"><i style="width:${i / list.length * 100}%"></i></div>
        <div class="card pad stack"><span class="pill" style="align-self:flex-start">Question ${i + 1} sur ${list.length}</span><h2 class="qtxt">${mx(c.front)}</h2>
          ${"speechSynthesis" in window ? `<button class="linkbtn" id="hear" style="align-self:flex-start">${I.listen}Réécouter la question</button>` : ""}
          ${Rec ? `<button class="btn" id="mic">${I.mic}Répondre au micro</button><p class="transcript" id="tr" aria-live="polite"></p>` : `<p class="note">Ton navigateur ne gère pas la dictée vocale. Réponds à voix haute, puis écris ce que tu as dit.</p>`}
          <div class="field"${Rec ? " hidden" : ""} id="trf"><label for="trt">Ta réponse</label><textarea id="trt" style="min-height:100px"></textarea></div>
          <button class="btn ghost" id="done"${Rec ? " hidden" : ""}>Voir la correction</button><div id="fb" class="stack"></div></div>`;
      speakSafe(c.front);
      if ($("hear")) $("hear").onclick = () => { if (on) stop(); speakSafe(c.front); };
      const stop = () => { if (!on) return; on = false; secs = Math.max(1, Math.round((Date.now() - t0) / 1000)); try { rec.stop(); } catch (e) { /* déjà arrêté */ } if ($("mic")) { $("mic").innerHTML = I.mic + "Recommencer ma réponse"; $("mic").classList.remove("rec"); } if ($("trt")) { $("trt").value = final.trim(); $("trf").hidden = false; $("done").hidden = false; } };
      if (Rec) $("mic").onclick = () => {
        if (on) return stop();
        stopSpeak(); if (music.on) musicStop(); // pas de son pendant que le micro écoute (plantages de Safari sur iPhone)
        try {
          rec = new Rec(); rec.lang = chLang(ch); rec.continuous = true; rec.interimResults = true; final = "";
          let fin; recDone = new Promise(r => { fin = r; }); setTimeout(() => fin && fin(), 120000);
          rec.onresult = (ev) => { let interim = ""; for (let k = ev.resultIndex; k < ev.results.length; k++) { if (ev.results[k].isFinal) final += ev.results[k][0].transcript + " "; else interim += ev.results[k][0].transcript; } if ($("tr")) $("tr").innerHTML = esc(final) + `<i>${mx(interim)}</i>`; };
          rec.onerror = (ev) => { if ($("tr") && ev.error !== "aborted" && ev.error !== "no-speech") $("tr").textContent = ev.error === "not-allowed" ? "Micro refusé : autorise le micro pour ce site, ou écris ta réponse." : "La dictée s'est arrêtée (" + ev.error + "). Tu peux écrire ta réponse."; stop(); if ($("trf")) { $("trf").hidden = false; $("done").hidden = false; } };
          rec.onend = () => { stop(); fin(); };
          rec.start(); on = true; t0 = Date.now(); $("mic").innerHTML = I.x + "J'ai fini de répondre"; $("mic").classList.add("rec"); $("tr").textContent = "Je t'écoute…";
        } catch (e) { $("tr").textContent = "Impossible d'utiliser le micro. Écris ta réponse."; $("trf").hidden = false; $("done").hidden = false; }
      };
      $("done").onclick = () => {
        stop(); const said = $("trt").value.trim(), words = said ? said.split(/\s+/).length : 0, fill = (said.match(FILL) || []).length;
        $("done").hidden = true; if ($("mic")) $("mic").hidden = true; $("trt").readOnly = true;
        $("fb").innerHTML = `<p class="label">Réponse du cours</p><p class="expected">${mx(c.back)}</p>
          ${secs && words ? `<div class="tiles"><div class="tile"><b>${Math.round(words / secs * 60)}</b><span>mots par minute</span></div><div class="tile"><b>${fill}</b><span>${fill > 1 ? "hésitations" : "hésitation"} (euh, du coup…)</span></div></div>` : ""}
          <button class="linkbtn" id="aik">Correction détaillée par l'IA (1 appel)</button><div id="aiout"></div>
          <p class="note">C'est le sens qui compte, pas les mots exacts.</p><div class="answers"><button class="btn bad" id="ko">${I.x}Faux</button><button class="btn good" id="okb">${I.check}Juste</button></div>`;
        const next = (ok) => { ping(ok); notes.push({ c, ok }); if (!ok) logMistake(id, c.front, c.back, said, "khôlle", c.id); i++; i < list.length ? ask() : end(); };
        $("ko").onclick = () => next(false); $("okb").onclick = () => next(true);
        $("aik").onclick = async () => {
          if (said.length < 2) return toast("Je n'ai pas de réponse à corriger."); $("aik").disabled = true; $("aiout").innerHTML = '<p class="muted" role="status">Correction…</p>';
          try { const r = (await ai({ action: "khole", question: c.front, attendu: c.back, transcription: said })).content || {}; if (!$("aiout")) return;
            $("aiout").innerHTML = `<div class="card pad stack inner"><div class="row between"><b>Note de l'IA</b><span class="pill ${r.juste ? "" : "warn"}">${mx(String(r.note != null ? r.note : "?"))} / 20</span></div><p><b>Précision.</b> ${mx(r.precision || "")}</p><p><b>Aisance.</b> ${mx(r.aisance || "")}</p>${r.conseil ? `<p class="note">${mx(r.conseil)}</p>` : ""}</div>`;
          } catch (e) { if ($("aiout")) { showErr($("aiout"), e); $("aik").disabled = false; } }
        };
      };
    }
    function end() {
      if (location.hash !== here) return; const good = notes.filter(n => n.ok).length;
      app.innerHTML = toolHead(id, T) + `<div class="card done"><h1>${good === notes.length ? "Bon travail !" : "Khôlle terminée"}</h1><div class="big">${good} / ${notes.length}</div>${notes.some(n => !n.ok) ? `<div class="stack" style="text-align:left;width:100%"><p class="label">À revoir</p>${notes.filter(n => !n.ok).map(n => `<div class="term" style="padding:8px 0"><b>${mx(n.c.front)}</b><p>${mx(n.c.back)}</p></div>`).join("")}</div>` : ""}<button class="btn" id="again">Nouvelle khôlle</button><a class="btn ghost" href="#chapitre-${id}">Retour au chapitre</a></div>`;
      $("again").onclick = () => screenOral(id);
    }
    ask();
  }

  // ---------- combat de boss de fin de chapitre ----------
  function screenBoss(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const T = "Combat de boss", all = cardsOf(id);
    if (all.length < 4) return emptyTool(id, T, "Il faut au moins 4 cartes dans ce chapitre pour affronter le boss.");
    const B = { hp: 100, shields: 3, combo: 0, queue: shuffle(all), hits: 0, n: 0 };
    const bossSvg = (cls) => `<svg class="boss ${cls || ""}" viewBox="0 0 120 110" role="img" aria-label="Le boss du chapitre"><path d="M28 30 L18 6 L44 22 M92 30 L102 6 L76 22" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><rect x="14" y="20" width="92" height="80" rx="26" fill="currentColor"/><circle cx="44" cy="54" r="10" fill="#fff"/><circle cx="76" cy="54" r="10" fill="#fff"/><circle cx="${B.hp > 0 ? 46 : 44}" cy="56" r="4.500" fill="#14151c"/><circle cx="${B.hp > 0 ? 74 : 76}" cy="56" r="4.500" fill="#14151c"/><path d="${B.hp > 50 ? "M42 80 q18 -12 36 0" : B.hp > 0 ? "M44 80 h32" : "M42 76 q18 12 36 0"}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>`;
    const hud = (cls) => `<div class="bossbox">${bossSvg(cls)}<div class="grow stack" style="gap:8px"><div class="row between small"><b>Boss · ${mx(ch.name)}</b><span>${Math.max(0, B.hp)} PV</span></div><div class="bar hp" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.max(0, B.hp)}" aria-label="Points de vie du boss"><i style="width:${Math.max(0, B.hp)}%"></i></div>
      <div class="row between small"><span class="shields" role="img" aria-label="${plural(B.shields, "bouclier", "boucliers")}">${[0, 1, 2].map(k => `<i class="${k < B.shields ? "on" : ""}">${I.shield}</i>`).join("")}</span><span class="pill ${B.combo >= 3 ? "" : "ghostpill"}">Combo x${B.combo}</span></div></div></div>`;
    function ask() {
      if (B.hp <= 0 || B.shields <= 0) return end();
      if (!B.queue.length) B.queue = shuffle(all);
      const c = B.queue.shift(), opts = shuffle([c, ...lookalikes(c.back, all.filter(x => x.id !== c.id && x.back !== c.back), 3, x => x.back)]);
      app.innerHTML = toolHead(id, T) + hud() + `<div class="card pad stack"><h2 class="qtxt">${mx(c.front)}</h2><p class="fb" id="fb" role="status"></p><div class="opts">${opts.map((o, k) => `<button class="opt" data-i="${k}">${mx(o.back)}</button>`).join("")}</div><button class="btn" id="cont" hidden>Continuer</button></div>`;
      screenSession.key = (e) => { const n = "1234".indexOf(e.key), bs = app.querySelectorAll(".opt"); if (n >= 0 && bs[n] && !bs[n].disabled) bs[n].click(); else if (e.key === "Enter" && $("cont") && !$("cont").hidden) $("cont").click(); };
      app.querySelectorAll(".opt").forEach(b => b.onclick = () => {
        const ok = opts[+b.dataset.i].id === c.id; B.n++;
        app.querySelectorAll(".opt").forEach(x => { x.disabled = true; if (opts[+x.dataset.i].id === c.id) x.classList.add("good"); }); if (!ok) b.classList.add("bad");
        let dmg = 0; if (ok) { B.combo++; B.hits++; dmg = 12 + (B.combo >= 3 ? 6 : 0); B.hp -= dmg; } else { B.combo = 0; B.shields--; logMistake(id, c.front, c.back, opts[+b.dataset.i].back, "boss", c.id); }
        ping(ok); app.querySelector(".bossbox").outerHTML = hud(ok ? "hit" : "atk");
        $("fb").className = "fb " + (ok ? "ok" : "ko"); $("fb").textContent = ok ? "Touché ! " + dmg + " dégâts" + (B.combo >= 3 ? " (bonus de combo)" : "") + "." : "Raté : tu perds un bouclier.";
        $("cont").hidden = false; $("cont").onclick = ask; $("cont").focus();
      });
    }
    function end() {
      const win = B.hp <= 0; if (win) safeSet("merge.boss." + id, "1");
      app.innerHTML = toolHead(id, T) + `<div class="card done">${bossSvg(win ? "dead" : "")}<h1>${win ? "Boss vaincu !" : "Le boss a gagné"}</h1><p class="muted">${win ? "Tu as terminé « " + esc(ch.name) + " » avec " + plural(B.shields, "bouclier restant", "boucliers restants") + "." : "Il lui restait " + B.hp + " PV. Révise tes cartes et reviens le défier."}</p><p class="small muted">${B.hits} bonnes réponses sur ${B.n}.</p><button class="btn" id="again">${win ? "Rejouer" : "Retenter le combat"}</button><a class="btn ghost" href="#${win ? "chapitre" : "cartes"}-${id}">${win ? "Retour au chapitre" : "Réviser les cartes"}</a></div>`;
      if (win) confetti(Math.random() < 0.5 ? "feux" : "explosion");
      $("again").onclick = () => screenBoss(id);
    }
    app.innerHTML = toolHead(id, T) + `<div class="card done">${bossSvg()}<h1>Le boss de « ${mx(ch.name)} »</h1><p class="muted">Il a 100 PV. Chaque bonne réponse lui inflige 12 dégâts, 18 à partir de 3 bonnes réponses d'affilée. Chaque erreur te coûte un de tes 3 boucliers.</p><button class="btn" id="fight">Combattre</button></div>`;
    $("fight").onclick = ask;
  }

  // ---------- flash 60 secondes ----------
  function screenFlash(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const T = "Flash 60 secondes", all = cardsOf(id), bestKey = "merge.flash." + id;
    if (all.length < 4) return emptyTool(id, T, "Il faut au moins 4 cartes dans ce chapitre pour ce mode.");
    const S = { score: 0, combo: 0, good: 0, n: 0, end: 0, q: null, int: null, best: +(safeGet(bestKey) || 0) };
    const mult = () => Math.min(5, 1 + Math.floor(S.combo / 3));
    function nextQ() { const c = all[Math.floor(Math.random() * all.length)], truth = Math.random() < 0.5, other = lookalikes(c.back, shuffle(all.filter(x => x.id !== c.id && x.back !== c.back)), 2, x => x.back)[Math.random() < 0.7 ? 0 : 1] || all.find(x => x.id !== c.id && x.back !== c.back); S.q = { c, truth: truth || !other, shown: truth || !other ? c.back : other.back }; draw(); }
    function draw(flash) {
      const left = Math.max(0, Math.ceil((S.end - Date.now()) / 1000));
      app.innerHTML = toolHead(id, T) + `<div class="row between"><span class="big" id="fclock" role="timer">${left} s</span><div style="text-align:right"><div class="big">${S.score}</div><span class="pill ${mult() > 1 ? "" : "ghostpill"}">x${mult()}</span></div></div><div class="bar"><i id="fbar" style="width:${left / 60 * 100}%"></i></div>
        <div class="card pad stack flashq ${flash || ""}"><h2 class="qtxt">${mx(S.q.c.front)}</h2><p class="expected neutral">${mx(S.q.shown)}</p></div>
        <div class="answers"><button class="btn bad" id="faux">${I.x}Faux</button><button class="btn good" id="vrai">${I.check}Vrai</button></div><p class="note" style="text-align:center">La réponse affichée est-elle la bonne ? Au clavier : flèche gauche = faux, flèche droite = vrai.</p>`;
      $("vrai").onclick = () => pick(true); $("faux").onclick = () => pick(false);
    }
    function pick(v) {
      if (Date.now() >= S.end) return; const ok = v === S.q.truth; S.n++;
      if (ok) { S.score += 10 * mult(); S.combo++; S.good++; } else { S.combo = 0; logMistake(id, S.q.c.front, S.q.c.back, S.q.truth ? "" : S.q.shown, "flash", S.q.c.id); }
      ping(ok); const prev = ok ? "okflash" : "koflash"; nextQ(); const el = app.querySelector(".flashq"); if (el) el.classList.add(prev);
    }
    function finish() {
      clearInterval(S.int); screenSession.key = null; const rec = S.score > S.best; if (rec) safeSet(bestKey, String(S.score));
      app.innerHTML = toolHead(id, T) + `<div class="card done"><h1>${rec ? "Nouveau record !" : "Temps écoulé"}</h1><div class="big">${S.score} points</div><p class="muted">${S.good} bonnes réponses sur ${S.n}. Record : ${Math.max(S.best, S.score)} points.</p><button class="btn" id="again">Rejouer</button><a class="btn ghost" href="#chapitre-${id}">Retour au chapitre</a></div>`;
      $("again").onclick = () => screenFlash(id);
    }
    app.innerHTML = toolHead(id, T) + `<div class="card done"><div class="tutoicon">${I.bolt}</div><h1>60 secondes chrono</h1><p class="muted">Une question, une réponse affichée : vrai ou faux ? Réponds le plus vite possible. Toutes les 3 bonnes réponses d'affilée, ton multiplicateur monte (jusqu'à x5). Une erreur le remet à x1.</p>${S.best ? `<p class="small muted">Ton record : ${S.best} points.</p>` : ""}<button class="btn" id="go">C'est parti</button></div>`;
    $("go").onclick = () => {
      S.end = Date.now() + 60000;
      S.int = setInterval(() => { const el = $("fclock"); if (!el) return clearInterval(S.int); const left = Math.max(0, Math.ceil((S.end - Date.now()) / 1000)); el.textContent = left + " s"; $("fbar").style.width = left / 60 * 100 + "%"; if (left <= 0) finish(); }, 250);
      screenSession.key = (e) => { if (e.key === "ArrowRight" || e.key.toLowerCase() === "v") pick(true); if (e.key === "ArrowLeft" || e.key.toLowerCase() === "f") pick(false); };
      nextQ();
    };
  }

  // ---------- face-à-face : les notions qu'on confond ----------
  function screenVersus(id) {
    toolGate(id, "faceaface", "Face-à-face", "Merge repère dans ton cours les notions qu'on confond souvent (par exemple masse et poids, mitose et méiose), les compare dans un tableau, puis te teste.", (data, ch, regen) => {
      const pairs = (data.paires || []).filter(p => p && p.a && p.b); let k = 0;
      if (!pairs.length) { emptyTool(id, "Face-à-face", "Merge n'a pas trouvé de notions qui se confondent dans ce cours."); app.insertAdjacentHTML("beforeend", regenHtml); return wireRegen(regen); }
      function table() {
        const p = pairs[k], qs = (p.quiz || []).filter(q => q && q.affirmation && /^[ab]$/i.test(String(q.reponse)));
        app.innerHTML = toolHead(id, "Face-à-face") + (pairs.length > 1 ? `<div class="chips">${pairs.map((x, n) => `<button class="chip" data-p="${n}" aria-pressed="${n === k}">${mx(x.a)} / ${mx(x.b)}</button>`).join("")}</div>` : "") +
          `<div class="card pad stack"><div class="vshead"><b>${mx(p.a)}</b><span>VS</span><b>${mx(p.b)}</b></div><div class="scrollx"><table class="vs"><thead><tr><td></td><th scope="col">${mx(p.a)}</th><th scope="col">${mx(p.b)}</th></tr></thead><tbody>${(p.criteres || []).map(c => `<tr><th scope="row">${mx(c.critere)}</th><td>${mx(c.a)}</td><td>${mx(c.b)}</td></tr>`).join("")}</tbody></table></div></div>
          ${qs.length ? `<button class="btn" id="vq">Mini-quiz réflexe</button>` : ""}${regenHtml}`;
        app.querySelectorAll("[data-p]").forEach(b => b.onclick = () => { k = +b.dataset.p; table(); });
        if ($("vq")) $("vq").onclick = () => quiz(p, shuffle(qs)); wireRegen(regen);
      }
      function quiz(p, qs) {
        let n = 0, good = 0;
        (function ask() {
          if (n >= qs.length) { app.innerHTML = toolHead(id, "Face-à-face") + `<div class="card done"><h1>${good === qs.length ? "Bon travail !" : "C'est fini"}</h1><div class="big">${good} / ${qs.length}</div><button class="btn" id="bk">Revoir le tableau</button></div>`; $("bk").onclick = table; return; }
          const q = qs[n], rep = String(q.reponse).toLowerCase();
          app.innerHTML = toolHead(id, "Face-à-face") + `<div class="bar"><i style="width:${n / qs.length * 100}%"></i></div><div class="card pad stack"><p class="small muted">De quelle notion parle-t-on ?</p><h2 class="qtxt">${mx(q.affirmation)}</h2><p class="fb" id="fb" role="status"></p><div class="answers"><button class="btn ghost" data-r="a">${mx(p.a)}</button><button class="btn ghost" data-r="b">${mx(p.b)}</button></div><button class="btn" id="cont" hidden>Continuer</button></div>`;
          app.querySelectorAll("[data-r]").forEach(b => b.onclick = () => { const ok = b.dataset.r === rep; ping(ok); if (ok) good++; else logMistake(id, q.affirmation, rep === "a" ? p.a : p.b, b.dataset.r === "a" ? p.a : p.b, "face-à-face"); app.querySelectorAll("[data-r]").forEach(x => { x.disabled = true; if (x.dataset.r === rep) x.classList.add("goodsel"); }); $("fb").className = "fb " + (ok ? "ok" : "ko"); $("fb").textContent = ok ? "Bon réflexe !" : "C'était : " + (rep === "a" ? p.a : p.b) + "."; $("cont").hidden = false; $("cont").onclick = () => { n++; ask(); }; $("cont").focus(); });
        })();
      }
      table();
    });
  }

  // ---------- mains libres : lecteur audio question, pause, réponse ----------
  let busStop = null;
  function silentAudio() {
    const n = 8000, b = new Uint8Array(44 + n), v = new DataView(b.buffer), w = (o, s) => { for (let k = 0; k < s.length; k++) b[o + k] = s.charCodeAt(k); };
    w(0, "RIFF"); v.setUint32(4, 36 + n, true); w(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, "data"); v.setUint32(40, n, true); b.fill(128, 44);
    const a = new Audio(URL.createObjectURL(new Blob([b], { type: "audio/wav" }))); a.loop = true; return a;
  }
  function screenBus(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const T = "Mains libres", all = cardsOf(id);
    if (!all.length) return emptyTool(id, T, "Il faut au moins une carte dans ce chapitre.");
    if (!("speechSynthesis" in window)) return emptyTool(id, T, "Ton navigateur ne sait pas lire à voix haute.");
    const B = { list: all.slice(), i: 0, phase: "q", playing: false, pause: 4, timer: null, audio: null, token: 0 }, lang = chLang(ch), ms = "mediaSession" in navigator;
    const meta = () => { if (!ms) return; try { navigator.mediaSession.metadata = new MediaMetadata({ title: B.list[B.i].front.slice(0, 90), artist: ch.name, album: "Merge." }); navigator.mediaSession.playbackState = B.playing ? "playing" : "paused"; } catch (e) { /* non géré */ } };
    function step() {
      if (!B.playing) return; const my = ++B.token, c = B.list[B.i], live = () => B.playing && my === B.token;
      draw(); meta();
      if (B.phase === "q") speakText(c.front, lang, () => { if (!live()) return; B.phase = "p"; draw(); B.timer = setTimeout(() => { if (!live()) return; B.phase = "a"; step(); }, B.pause * 1000); });
      else speakText(c.back, lang, () => { if (!live()) return; B.timer = setTimeout(() => { if (!live()) return; B.i = (B.i + 1) % B.list.length; B.phase = "q"; if (B.i === 0) { pause(); return draw(); } step(); }, 1200); });
    }
    function play() { B.playing = true; try { B.audio = B.audio || silentAudio(); B.audio.play().catch(() => {}); } catch (e) { /* pas d'audio de fond */ } step(); }
    function pause() { B.playing = false; B.token++; clearTimeout(B.timer); stopSpeak(); if (B.audio) B.audio.pause(); meta(); }
    function move(d) { const was = B.playing; pause(); B.i = (B.i + d + B.list.length) % B.list.length; B.phase = "q"; was ? play() : draw(); }
    function draw() {
      if (!location.hash.startsWith("#bus-")) return; const c = B.list[B.i];
      app.innerHTML = toolHead(id, T) + `<h1>${mx(ch.name)}</h1><div class="card pad stack player"><p class="small muted">Carte ${B.i + 1} sur ${B.list.length} · ${B.phase === "q" ? "Question" : B.phase === "p" ? "Réfléchis…" : "Réponse"}</p><p class="qtxt" aria-live="polite">${mx(c.front)}</p><p class="expected${B.phase === "a" ? "" : " veiled"}">${B.phase === "a" ? esc(c.back) : "La réponse arrive après la pause."}</p><div class="bar"><i style="width:${(B.i + (B.phase === "a" ? 0.7 : 0.2)) / B.list.length * 100}%"></i></div>
        <div class="row" style="justify-content:center"><button class="iconbtn" id="bprev" aria-label="Carte précédente">${I.back}</button><button class="btn" id="bplay" style="min-width:140px">${B.playing ? "Pause" : "Lecture"}</button><button class="iconbtn" id="bnext" aria-label="Carte suivante" style="transform:scaleX(-1)">${I.back}</button></div></div>
        <div class="field"><span class="label">Temps de réflexion avant la réponse</span><div class="chips">${[2, 4, 6, 10].map(s => `<button class="chip" data-ps="${s}" aria-pressed="${B.pause === s}">${s} s</button>`).join("")}</div></div>
        <div class="row"><button class="chip" id="bshuf">Mélanger les cartes</button></div>
        <p class="note">Mets tes écouteurs et range ton téléphone : question, pause pour réfléchir, réponse, puis carte suivante. Les boutons lecture, pause et suivant de l'écran verrouillé ou des écouteurs fonctionnent quand le téléphone le permet.</p>`;
      $("bplay").onclick = () => { B.playing ? (pause(), draw()) : play(); };
      $("bprev").onclick = () => move(-1); $("bnext").onclick = () => move(1);
      $("bshuf").onclick = () => { pause(); B.list = shuffle(B.list); B.i = 0; B.phase = "q"; draw(); toast("Cartes mélangées."); };
      app.querySelectorAll("[data-ps]").forEach(b => b.onclick = () => { B.pause = +b.dataset.ps; draw(); });
    }
    if (ms) { try { const h = navigator.mediaSession; h.setActionHandler("play", play); h.setActionHandler("pause", () => { pause(); draw(); }); h.setActionHandler("nexttrack", () => move(1)); h.setActionHandler("previoustrack", () => move(-1)); } catch (e) { /* non géré */ } }
    busStop = () => { pause(); if (ms) { try { ["play", "pause", "nexttrack", "previoustrack"].forEach(a => navigator.mediaSession.setActionHandler(a, null)); navigator.mediaSession.metadata = null; } catch (e) { /* rien */ } } busStop = null; };
    draw();
  }

  // ---------- exercices guidés pas à pas ----------
  function screenExercises(id) {
    toolGate(id, "exercices", "Exercices guidés", "Trois exercices d'application construits avec les méthodes et les formules de ton cours. Tu avances seul, avec deux indices puis la solution rédigée si tu bloques.", (data, ch, regen) => {
      const exos = (data.exercices || []).filter(e => e && e.enonce); const open = exos.map(() => 0);
      if (!exos.length) return emptyTool(id, "Exercices guidés", "Aucun exercice n'a pu être préparé pour ce cours.");
      const LBL = ["Indice 1", "Indice 2", "Solution rédigée"];
      function draw() {
        app.innerHTML = toolHead(id, "Exercices guidés") + exos.map((e, k) => `<div class="card pad stack"><span class="pill" style="align-self:flex-start">Exercice ${k + 1}</span><h2>${mx(e.titre || "")}</h2><p class="enonce">${mx(e.enonce)}</p>
          ${open[k] >= 1 ? `<div class="hint"><b>Indice 1</b><p>${mx(e.indice1 || "")}</p></div>` : ""}${open[k] >= 2 ? `<div class="hint"><b>Indice 2</b><p>${mx(e.indice2 || "")}</p></div>` : ""}
          ${open[k] >= 3 ? `<div class="solution"><b>Solution rédigée</b>${(e.etapes || []).length ? `<ol>${li(e.etapes)}</ol>` : ""}<p>${mx(e.solution || "")}</p></div>` : `<button class="btn ghost sm" data-ex="${k}" style="align-self:flex-start">${open[k] === 0 ? "J'ai besoin d'un indice" : "Voir : " + LBL[open[k]]}</button>`}</div>`).join("") + regenHtml;
        app.querySelectorAll("[data-ex]").forEach(b => b.onclick = () => { open[+b.dataset.ex]++; const y = scrollY; draw(); scrollTo(0, y); }); wireRegen(regen);
      }
      draw();
    });
  }

