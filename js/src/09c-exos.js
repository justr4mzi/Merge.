  // ---------- Prof : chat libre façon messagerie ----------
  // On peut parler de tout (cours, méthode, orientation…). Le bouton « Cours » lie à la discussion les chapitres et matières
  // qu'on veut : le prof s'appuie alors sur ces cours (lus côté serveur). Rien n'est obligatoire.
  // Discussions gardées dans merge.prof (synchronisée) : { cur, convs: [{ id, t, ctx: { ch: [], s: [] }, m: [messages], at }] }.
  // 1 message = 1 appel IA (fonction studio, action « exochat »).
  const PROF = "merge.prof", PROF_MAX = 20, MSG_MAX = 40;
  const EXO_QUICK = [["Fais-moi un exercice", "Fais-moi un exercice de niveau contrôle, sans la correction : je te donnerai ma réponse."], ["Un exercice facile", "Fais-moi un exercice facile pour démarrer, sans la correction."], ["Corrige ma copie", null], ["Explique la méthode", "Explique-moi la méthode pour réussir ce type d'exercice, étape par étape."], ["Donne-moi un indice", "Donne-moi juste un indice pour avancer, sans la solution."], ["La correction", "Donne-moi la correction complète et détaillée de l'exercice."]];
  const newConv = ctx => ({ id: "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: "", ctx: ctx || { ch: [], s: [] }, m: [], at: Date.now() });
  function profGet() {
    let p = jget(PROF, null);
    if (!p || !Array.isArray(p.convs)) {
      // Reprise des anciennes conversations par chapitre (merge.exo.<chapitre>).
      p = { cur: null, convs: [] };
      try { Object.keys(localStorage).filter(k => /^merge\.exo\./.test(k)).forEach(k => { const m = jget(k, []), ch = k.slice(10); if (Array.isArray(m) && m.length) { const c = newConv({ ch: [ch], s: [] }); c.m = m.slice(-MSG_MAX); c.t = String((m.find(x => x.r === "u") || {}).t || "").slice(0, 60); p.convs.push(c); } }); } catch (e) {}
    }
    p.convs = p.convs.filter(c => c && Array.isArray(c.m)).map(c => Object.assign(c, { ctx: { ch: (c.ctx && c.ctx.ch || []).filter(id => state.chapters.some(x => x.id === id)), s: (c.ctx && c.ctx.s || []).filter(id => state.subjects.some(x => x.id === id)) } }));
    let cur = p.convs.find(c => c.id === p.cur);
    if (!cur) { cur = p.convs.find(c => !c.m.length) || newConv(); if (!p.convs.includes(cur)) p.convs.unshift(cur); p.cur = cur.id; }
    return p;
  }
  function profSave(p) {
    p.convs = p.convs.filter(c => c.m.length || c.id === p.cur || c.ctx.ch.length || c.ctx.s.length).sort((a, b) => b.at - a.at).slice(0, PROF_MAX);
    p.convs.forEach(c => { if (c.m.length > MSG_MAX) c.m.splice(0, c.m.length - MSG_MAX); });
    let raw = JSON.stringify(p); while (raw.length > 900000 && p.convs.length > 1) { p.convs.pop(); raw = JSON.stringify(p); }
    safeSet(PROF, raw);
  }
  let profJustAnswered = false;
  const curConv = p => p.convs.find(c => c.id === p.cur);
  // Chapitres réellement envoyés : ceux cochés + tous ceux des matières liées (20 au plus).
  const ctxChapters = ctx => [...new Set(ctx.ch.concat(state.chapters.filter(c => ctx.s.includes(c.subject_id)).map(c => c.id)))].slice(0, 20);
  function ctxChips(ctx) {
    const subj = id => state.subjects.find(x => x.id === id) || {};
    return ctx.s.map(id => `<span class="pchip" style="--c:${esc(subj(id).color || "#9483ff")}"><span class="dot"></span>${esc(subj(id).name || "")} · toute la matière<button class="pchipx" data-unctx="s:${id}" aria-label="Retirer ${esc(subj(id).name || "")}">${I.x}</button></span>`).join("")
      + ctx.ch.map(id => { const c = state.chapters.find(x => x.id === id) || {}, s = subj(c.subject_id); return `<span class="pchip" style="--c:${esc(s.color || "#9483ff")}"><span class="dot"></span>${esc(c.name || "")}<button class="pchipx" data-unctx="c:${id}" aria-label="Retirer ${esc(c.name || "")}">${I.x}</button></span>`; }).join("");
  }
  // Comme dans les applis de chat : en rouvrant Merge (ou après 30 min ailleurs), l'onglet Prof s'ouvre sur une nouvelle
  // discussion ; les anciennes restent dans l'historique (☰).
  let profFresh = true, profHiddenAt = 0;
  // Retoucher l'onglet Prof quand on y est déjà : on repart sur une nouvelle discussion (comme rouvrir l'appli).
  document.addEventListener("merge:tabagain", e => { if (/^#exos/.test(e.detail)) profFresh = true; });
  document.addEventListener("visibilitychange", () => { if (document.hidden) profHiddenAt = Date.now(); else if (profHiddenAt && Date.now() - profHiddenAt > 30 * 60000) profFresh = true; });
  // Écran vide sans cours lié : les derniers chapitres travaillés, en un geste pour les lier.
  function recentChips() {
    const r = state.chapters.filter(c => cardsOf(c.id).length).slice(-3).reverse();
    if (!r.length) return "";
    return `<div class="precent"><span class="small muted">Tes derniers chapitres :</span><div class="chips">${r.map(c => { const s = state.subjects.find(x => x.id === c.subject_id) || {}; return `<button class="chip pchip" data-rch="${c.id}" style="--c:${esc(s.color || "#9483ff")}"><span class="rpill"><span class="dot"></span><span class="rct">${esc(c.name)}</span></span></button>`; }).join("")}</div></div>`;
  }
  function screenExos(arg) {
    drawTabs("exos");
    const p = profGet();
    if (profFresh) { profFresh = false; if (curConv(p).m.length) { const c = newConv(); p.convs.unshift(c); p.cur = c.id; profSave(p); } }
    // Ouvert depuis un chapitre (#exos-<id>) : on lie ce chapitre, dans une nouvelle discussion si la discussion en cours a déjà des messages.
    if (arg && state.chapters.some(c => c.id === arg) && !curConv(p).ctx.ch.includes(arg)) {
      let c = curConv(p); if (c.m.length) { c = newConv(); p.convs.unshift(c); p.cur = c.id; }
      c.ctx.ch.push(arg); c.at = Date.now(); profSave(p);
    }
    const conv = curConv(p), msgs = conv.m, linked = conv.ctx.ch.length + conv.ctx.s.length;
    const showTip = !linked && !msgs.length && !safeGet("merge.profTip");
    if (showTip) safeSet("merge.profTip", "1");
    app.classList.add("profmode");
    // Sur grand écran (PC) : historique toujours visible à gauche, conversation sur tout le reste.
    app.innerHTML = `<aside class="pside" aria-label="Mes discussions"><button class="btn" id="psnew">${I.plus}Nouvelle discussion</button><div class="pdlist">${histRows(p)}</div></aside><div class="pmain"><div class="row profhead"><button class="iconbtn flat" id="phist" aria-label="Mes discussions" title="Mes discussions">${I.menu}</button><h1 class="grow ptitle">${esc(conv.t || "Prof")}</h1><button class="iconbtn flat" id="pnew" aria-label="Nouvelle discussion" title="Nouvelle discussion">${I.edit}</button></div>
      <div class="pctx">${ctxChips(conv.ctx)}<button class="pchip add" id="pctx">${I.book}${linked ? "Modifier" : "Lier un cours"}</button></div>
      <div class="exthread" id="exth">${msgs.length ? msgs.map((m, i) => `<div class="exmsg ${m.r === "u" ? "me" : "ai"}">${m.r === "u" ? esc(m.t).replace(/\n/g, "<br>") + (m.img ? '<span class="small muted"> · photo envoyée</span>' : "") + (m.doc ? `<span class="small muted"> · ${esc(m.doc)}</span>` : "") : md(m.t) + qcmHtml(m, i) + fieldsHtml(m, i)}</div>`).join("") : `<div class="pempty"><span class="pico">${I.prof}</span><b>Pose-moi n'importe quelle question</b><p class="small muted">${linked ? "Je m'appuie sur tes cours liés." : "Un exercice, une explication ou un fichier joint avec +."}</p>${showTip ? `<div class="ptip" id="ptip"><span class="small grow">Lie un chapitre pour que le prof s'appuie sur ton cours.</span><button class="btn sm" id="ptipgo">Lier un cours</button><button class="iconbtn flat" id="ptipx" aria-label="Fermer">${I.x}</button></div>` : ""}${linked ? "" : recentChips()}</div>`}</div>
      <div class="pcomp"><div id="eximg" class="pimg" hidden></div><div class="pbar"><button class="iconbtn flat" id="pplus" aria-label="Ajouter une photo, un cours ou une demande rapide">${I.plus}</button><textarea id="exq" rows="1" maxlength="2000" placeholder="Écris ton message…"></textarea>${canDictate() ? `<button class="iconbtn flat" id="exmic" aria-label="Dicter">${I.mic}</button>` : ""}<button class="iconbtn psend" id="exsend" aria-label="Envoyer">${I.send}</button></div>
      <input id="exphoto" type="file" accept="image/*" capture="environment" hidden><input id="exfile" type="file" accept="${FILE_ACCEPT}" multiple hidden></div></div>`;
    const save = () => { conv.at = Date.now(); profSave(p); };
    // Cours liés.
    app.querySelectorAll("[data-unctx]").forEach(b => b.onclick = () => { const [k, id] = b.dataset.unctx.split(":"); conv.ctx[k === "s" ? "s" : "ch"] = conv.ctx[k === "s" ? "s" : "ch"].filter(x => x !== id); save(); screenExos(); });
    app.querySelectorAll("[data-rch]").forEach(b => b.onclick = () => { if (!conv.ctx.ch.includes(b.dataset.rch)) conv.ctx.ch.push(b.dataset.rch); save(); screenExos(); });
    $("pctx").onclick = () => ctxSheet(conv, () => { save(); screenExos(); });
    if ($("ptipgo")) $("ptipgo").onclick = () => { if ($("ptip")) $("ptip").remove(); $("pctx").click(); };
    if ($("ptipx")) $("ptipx").onclick = () => { if ($("ptip")) $("ptip").remove(); };
    $("pnew").onclick = () => { if (!msgs.length && !linked) return toast("Tu es déjà dans une nouvelle discussion."); const c = newConv(); p.convs.unshift(c); p.cur = c.id; profSave(p); screenExos(); };
    $("phist").onclick = () => histDrawer(p);
    $("psnew").onclick = () => $("pnew").click();
    histBind(app.querySelector(".pside"), p, what => { if (what === "del") screenExos(); });
    // Quiz interactif dans la bulle : on touche une réponse, elle est corrigée tout de suite avec l'explication.
    // (on ne redessine que le quiz, pour ne pas faire sauter la conversation).
    const wireQcm = () => app.querySelectorAll("[data-qa]").forEach(b => b.onclick = () => {
      const [i, k, c] = b.dataset.qa.split("-").map(Number), m = msgs[i]; if (!m || !m.q || !m.q[k] || m.q[k].a != null) return;
      m.q[k].a = c; save(); ping(c === m.q[k].b);
      const box = app.querySelector(`[data-qbox="${i}"]`); if (box) { box.outerHTML = qcmHtml(m, i); renderMath(app); wireQcm(); }
    });
    wireQcm();
    // Réponses dans la bulle : l'IA donne un exercice avec des champs à remplir.
    app.querySelectorAll("[data-fsend]").forEach(b => b.onclick = () => {
      const i = +b.dataset.fsend, m = msgs[i]; if (!m || !m.f) return;
      const vals = m.f.map((_, k) => (app.querySelector(`[data-fv="${i}-${k}"]`) || {}).value || "").map(v => v.trim());
      if (!vals.some(Boolean)) return toast("Écris au moins une réponse.");
      m.rep = vals; save();
      $("exq").value = "Mes réponses :\n" + m.f.map((l, k) => "- " + l + " : " + (vals[k] || "(pas répondu)")).join("\n") + "\nCorrige-moi : dis ce qui est juste et où je me trompe.";
      send();
    });
    // Façon de répondre : dans des cases ici, ou sur le cahier puis une photo de la copie.
    app.querySelectorAll("[data-fmode]").forEach(b => b.onclick = () => { const m = msgs[+b.dataset.fmode]; if (!m) return; m.ici = b.dataset.m === "ici"; m.cahier = !m.ici; save(); screenExos(); });
    app.querySelectorAll("[data-fphoto]").forEach(b => b.onclick = () => $("exphoto").click());
    // Défilement : on montre le début de la dernière réponse du prof (comme dans une appli de chat), sinon le bas.
    const th = $("exth"), lastAi = th.querySelector(".exmsg.ai:last-child");
    if (lastAi && profJustAnswered) th.scrollTop = Math.max(0, lastAi.offsetTop - th.offsetTop - 8); else th.scrollTop = th.scrollHeight;
    profJustAnswered = false;
    const q = $("exq"), grow = () => { q.style.height = "auto"; q.style.height = Math.min(160, q.scrollHeight) + "px"; };
    q.oninput = grow;
    q.addEventListener("focus", () => document.body.classList.add("typing"));
    q.addEventListener("blur", () => setTimeout(() => { if (document.activeElement !== q) document.body.classList.remove("typing"); }, 100));
    q.onkeydown = e => { if (e.key === "Enter" && !e.shiftKey && matchMedia("(hover: hover)").matches) { e.preventDefault(); send(); } };
    // Photo jointe (bouton +) : aperçu au-dessus du champ, retirable.
    let img = null, docImgs = []; // docImgs : pages en image du fichier joint, envoyées avec le prochain message (pas gardées sur l'appareil)
    const showImg = () => { const el = $("eximg"); el.hidden = !img; el.innerHTML = img ? `<img src="data:image/jpeg;base64,${img.data}" alt="Photo jointe"><span class="small">Photo prête</span><button class="iconbtn flat" id="pimgx" aria-label="Retirer la photo">${I.x}</button>` : ""; if (img) $("pimgx").onclick = () => { img = null; showImg(); }; };
    const onPhoto = async e => { const f = e.target.files[0]; e.target.value = ""; if (!f) return; try { img = await shrinkImage(f); showImg(); if (!q.value.trim()) q.value = "Voici ma copie : dis-moi ce qui est juste dans mon raisonnement et où je me suis trompé."; grow(); } catch (er) { toast("Photo illisible."); } };
    // Fichiers joints (17 nov.) : tous les formats de l'import (PDF, PowerPoint, Word, LibreOffice, texte, photos), lus sur
    // l'appareil avec les mêmes lecteurs. Le texte est gardé dans la discussion (le prof s'en sert à chaque message) ;
    // les pages en image (scans, schémas) partent avec le message suivant. Une seule photo = comme avant (copie à corriger).
    const showDoc = m => { const el = $("eximg"); el.hidden = !conv.doc && !m; el.innerHTML = m ? `<span class="spin" aria-hidden="true"></span><span class="small">${esc(m)}</span>` : conv.doc ? `<span class="mico">${I.book}</span><span class="small grow"><b>${esc(conv.doc.name)}</b><br>${docImgs.length ? plural(docImgs.length, "page en image", "pages en image") + " · " : ""}lu par le prof dans cette discussion</span><button class="iconbtn flat" id="pdocx" aria-label="Retirer le fichier">${I.x}</button>` : ""; if ($("pdocx")) $("pdocx").onclick = () => { delete conv.doc; docImgs = []; save(); showDoc(); }; };
    const onFiles = async e => {
      const files = [...e.target.files]; e.target.value = ""; if (!files.length) return;
      if (files.length === 1 && (files[0].type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(files[0].name))) return onPhoto({ target: { files, value: "" } });
      const fs = [], notes = [], budget = { pages: 0, max: 12, cut: false }, R = fileReaders({}, m => showDoc(m));
      try { for (const f of files) await R.readOne(f, fs, budget, notes, false); }
      catch (er) { showDoc(); return toast(er.message || "Fichier illisible."); }
      const text = fs.filter(x => x.text).map(x => x.text).join("\n\n").slice(0, 60000), pend = fs.filter(x => x.img).map(x => x.img).slice(0, 8);
      if (!text.trim() && !pend.length) { showDoc(); return toast(notes[0] || "Je n'ai rien trouvé à lire dans ce fichier."); }
      conv.doc = { name: files.map(f => f.name).join(", ").slice(0, 120), text, fresh: true }; docImgs = pend; save(); showDoc();
      if (budget.cut || notes.length) toast(budget.cut ? "Seules les 12 premières pages en image sont envoyées." : notes[0]);
      if (!q.value.trim()) { q.value = "Voici mon document : "; grow(); q.focus(); }
    };
    $("exphoto").onchange = onPhoto; $("exfile").onchange = onFiles;
    if (conv.doc) showDoc();
    $("pplus").onclick = () => sheet(`<h1>Ajouter</h1><div class="actgrid pact"><button class="actbtn" id="pa-cam">${I.cam}<span>Prendre une photo</span></button><button class="actbtn" id="pa-img">${I.up}<span>Joindre un fichier<small>PDF, PowerPoint, Word, photo…</small></span></button><button class="actbtn" id="pa-ctx">${I.book}<span>Lier un cours</span></button></div><span class="label">Demandes rapides</span><div class="pqchips">${EXO_QUICK.map((x, i) => x[1] ? `<button class="chip" data-pq="${i}">${x[0]}</button>` : "").join("")}</div>`, el => {
      el.querySelectorAll("[data-pq]").forEach(b => b.onclick = () => { closeSheet(); q.value = EXO_QUICK[+b.dataset.pq][1]; send(); });
      el.querySelector("#pa-cam").onclick = () => { closeSheet(); $("exphoto").click(); };
      el.querySelector("#pa-img").onclick = () => { closeSheet(); $("exfile").click(); };
      el.querySelector("#pa-ctx").onclick = () => { closeSheet(); $("pctx").click(); };
    });
    if ($("exmic")) dictate($("exmic"), q, grow);
    app.querySelectorAll("[data-q]").forEach(b => b.onclick = () => { const x = EXO_QUICK[+b.dataset.q]; if (!x[1]) { $("pplus").click(); return; } q.value = x[1]; send(); });
    $("exsend").onclick = () => send();
    async function send() {
      const t = q.value.trim(); if (!t && !img && !(conv.doc && conv.doc.fresh)) return toast("Écris ton message.");
      if (state.offline) return toast("Il faut être connecté à Internet pour l'IA.");
      const docNew = conv.doc && conv.doc.fresh ? conv.doc : null, mine = Object.assign({ r: "u", t: t || "Voici ma copie.", img: !!img }, docNew ? { doc: conv.doc.name } : {}); msgs.push(mine); if (!conv.t) conv.t = mine.t.slice(0, 60); save();
      $("exsend").disabled = true; q.value = ""; grow();
      const pe = th.querySelector(".pempty"); if (pe) pe.remove();
      th.insertAdjacentHTML("beforeend", `<div class="exmsg me">${esc(mine.t).replace(/\n/g, "<br>")}${img ? '<span class="small muted"> · photo envoyée</span>' : ""}</div><div class="exmsg ai wait"><span class="spin" aria-hidden="true"></span> Je réfléchis…</div>`); th.scrollTop = th.scrollHeight;
      const photo = img; img = null; showImg();
      try {
        const subjNames = conv.ctx.s.map(id => (state.subjects.find(x => x.id === id) || {}).name).filter(Boolean);
        const r = await ai({ action: "exochat", want_title: !conv.named, chapter_ids: ctxChapters(conv.ctx), matieres: subjNames, messages: msgs.slice(-12).map(m => ({ r: m.r, t: m.t })), image: photo, doc: conv.doc ? { name: conv.doc.name, text: conv.doc.text, images: docImgs } : undefined }, "studio");
        if (conv.doc && conv.doc.fresh) { delete conv.doc.fresh; docImgs = []; save(); showDoc(); }
        if (!conv.named && r.title) { conv.t = String(r.title).slice(0, 60); conv.named = true; }
        const qcm = cleanQcm(r.qcm);
        msgs.push(Object.assign({ r: "a", t: String(r.answer || "").slice(0, 8000) }, qcm.length ? { q: qcm } : Array.isArray(r.fields) && r.fields.length ? { f: r.fields.map(x => String(x).slice(0, 120)).slice(0, 6) } : {})); save();
        profJustAnswered = true; if (location.hash.startsWith("#exos")) screenExos();
      } catch (e) { const w = th.querySelector(".wait"); if (w) { w.classList.remove("wait"); w.textContent = e.message || "L'IA n'a pas répondu. Réessaie."; } $("exsend").disabled = false; }
    }
  }
  // Choisir les cours liés : des matières entières et/ou des chapitres, dans n'importe quelle matière.
  function ctxSheet(conv, done) {
    const ch = new Set(conv.ctx.ch), ss = new Set(conv.ctx.s);
    const list = state.subjects.map(s => ({ s, l: state.chapters.filter(c => c.subject_id === s.id) })).filter(x => x.l.length);
    const row = (c, s) => { const on = ss.has(s.id) || ch.has(c.id); return `<button type="button" class="ctxrow" data-cc="${c.id}" data-sid="${s.id}" aria-pressed="${on}"${ss.has(s.id) ? " disabled" : ""}><span class="ctxbox">${I.check}</span><span class="grow">${esc(c.name)}</span></button>`; };
    sheet(`<h1>Cours liés</h1><p class="muted small">Le prof s'appuiera sur ces cours. Coche des chapitres, ou toute une matière.</p>
      <div class="ctxlist">${list.map(({ s, l }) => `<div class="ctxsub" style="--c:${esc(s.color)}"><div class="ctxhead"><span class="dot"></span><b class="grow">${esc(s.name)}</b><button type="button" class="switch" role="switch" data-cs="${s.id}" aria-checked="${ss.has(s.id)}"><i></i><span>Toute la matière</span></button></div>${l.map(c => row(c, s)).join("")}</div>`).join("") || '<p class="muted">Crée d\'abord un chapitre dans Matières.</p>'}</div>
      <div class="sheetfoot"><button class="btn ghost" id="pctxnone">Aucun cours</button><button class="btn grow" id="pctxok">Valider</button></div>`, el => {
      el.querySelectorAll("[data-cs]").forEach(b => b.onclick = () => {
        const id = b.dataset.cs, on = !ss.has(id); on ? ss.add(id) : ss.delete(id); b.setAttribute("aria-checked", String(on));
        el.querySelectorAll(`[data-sid="${id}"]`).forEach(c => { c.disabled = on; if (on) ch.delete(c.dataset.cc); c.setAttribute("aria-pressed", String(on || ch.has(c.dataset.cc))); });
      });
      el.querySelectorAll("[data-cc]").forEach(b => b.onclick = () => { const id = b.dataset.cc, on = !ch.has(id); on ? ch.add(id) : ch.delete(id); b.setAttribute("aria-pressed", String(on)); });
      el.querySelector("#pctxnone").onclick = () => { conv.ctx = { ch: [], s: [] }; closeSheet(); done(); };
      el.querySelector("#pctxok").onclick = () => { conv.ctx = { ch: [...ch].filter(id => !ss.has((state.chapters.find(c => c.id === id) || {}).subject_id)), s: [...ss] }; closeSheet(); done(); };
    });
  }
  // Mes discussions : panneau qui glisse depuis la gauche (bouton ☰), comme dans une appli de chat. Nom donné automatiquement par l'IA.
  // Glisser le doigt vers la droite sur l'écran Prof ouvre l'historique (comme dans les applis de chat) ; vers la gauche le referme.
  (() => {
    let sx = 0, sy = 0, t0 = 0, okSwipe = false;
    // Bord gauche ou droit de l'écran : iPhone y lance le geste « retour en arrière » des sites web. Dans l'appli on le coupe
    // (sauf sur un bouton ou un champ, pour que les appuis marchent toujours) ; sur l'écran Prof ce geste ouvre l'historique.
    document.addEventListener("touchstart", e => { const t = e.touches[0]; if ((t.clientX < 22 || t.clientX > innerWidth - 22) && !(e.target.closest && e.target.closest("a,button,input,textarea,select,label,[role=button],.sheetwrap"))) e.preventDefault(); }, { passive: false });
    document.addEventListener("touchstart", e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; t0 = Date.now(); okSwipe = e.touches.length === 1 && !(e.target.closest && e.target.closest(".pctx,.chips,.pqchips,pre,.katex-display,textarea,input,.sheetwrap,table")); }, { passive: true });
    document.addEventListener("touchend", e => {
      if (!okSwipe) return; const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dy) > 60 || Math.abs(dx) < Math.abs(dy) * 1.5 || Date.now() - t0 > 800) return;
      const pd = document.getElementById("pdrawer");
      if (pd && dx < -60) { const c = pd.querySelector("[data-pdclose]"); if (c) c.click(); return; }
      if (!pd && dx > 70 && app.classList.contains("profmode") && !document.getElementById("sheet")) histDrawer(profGet());
    }, { passive: true });
  })();
  // Liste des discussions (panneau du téléphone et colonne fixe du PC).
  function histRows(p) {
    const list = p.convs.filter(c => c.m.length).sort((a, b) => b.at - a.at), today = localDay();
    const when = c => { const d = localDay(new Date(c.at)); if (d === today) return "Aujourd'hui"; const y = new Date(); y.setDate(y.getDate() - 1); if (d === localDay(y)) return "Hier"; return Date.now() - c.at < 7 * 864e5 ? "7 derniers jours" : "Plus ancien"; };
    const label = c => { const n = c.ctx.ch.length + c.ctx.s.length; return n ? plural(n, "cours lié", "cours liés") : "Discussion libre"; };
    let last = "", rows = "";
    list.forEach(c => { const g = when(c); if (g !== last) { rows += `<p class="label pdgrp">${g}</p>`; last = g; } rows += `<div class="pdrow${c.id === p.cur ? " on" : ""}"><button class="pdconv" data-conv="${c.id}"><b>${esc(c.t || "Discussion")}</b><span class="small muted">${label(c)}</span></button><button class="iconbtn flat" data-cdel="${c.id}" aria-label="Supprimer la discussion">${I.x}</button></div>`; });
    return rows || '<p class="muted small">Aucune discussion pour l\'instant.</p>';
  }
  // Ouvrir / supprimer une discussion. Supprimer : on demande confirmation, puis on reste dans l'historique
  // (la discussion ouverte ne change que si c'est elle qu'on supprime).
  function histBind(el, p, after) {
    el.querySelectorAll("[data-conv]").forEach(b => b.onclick = () => { p.cur = b.dataset.conv; profSave(p); after("open"); screenExos(); });
    el.querySelectorAll("[data-cdel]").forEach(b => b.onclick = async () => {
      const c = p.convs.find(x => x.id === b.dataset.cdel); if (!c) return;
      if (!(await askConfirm("Supprimer cette discussion ?", "« " + (c.t || "Discussion") + " » sera effacée. Tu ne pourras pas la récupérer."))) return;
      const wasCur = p.cur === c.id; p.convs = p.convs.filter(x => x.id !== c.id); if (wasCur) p.cur = null; profSave(p);
      after("del", wasCur); toast("Discussion supprimée.");
    });
  }
  function histDrawer(p) {
    const old = document.getElementById("pdrawer"); if (old) old.remove();
    const el = document.createElement("div"); el.id = "pdrawer"; el.className = "pdwrap";
    el.innerHTML = `<div class="pdshade" data-pdclose></div><aside class="pdpanel" role="dialog" aria-label="Mes discussions"><div class="row"><h2 class="grow" style="margin:0">Discussions</h2><button class="iconbtn flat" data-pdclose aria-label="Fermer">${I.x}</button></div><button class="btn" id="pdnew">${I.plus}Nouvelle discussion</button><div class="pdlist">${histRows(p)}</div></aside>`;
    document.body.appendChild(el); requestAnimationFrame(() => el.classList.add("open"));
    const close = () => { el.classList.remove("open"); setTimeout(() => el.remove(), 200); };
    el.querySelectorAll("[data-pdclose]").forEach(b => b.onclick = close);
    el.querySelector("#pdnew").onclick = () => { el.remove(); $("pnew").click(); };
    histBind(el, p, (what, wasCur) => {
      if (what === "open") { el.remove(); return; }
      if (wasCur) screenExos();
      el.remove(); histDrawer(profGet()); const nd = document.getElementById("pdrawer"); if (nd) nd.classList.add("open");
    });
  }
  // Champs de réponse d'un message de l'IA : choix de la façon de répondre, cases à remplir, ou réponses déjà envoyées.
  // Quiz rendu par le prof : [{ q, c: [choix], b: index de la bonne, e: explication, a: choix de l'élève }].
  function cleanQcm(x) {
    return (Array.isArray(x) ? x : []).map(o => ({ q: String(o && o.q || "").slice(0, 400), c: (Array.isArray(o && o.choix) ? o.choix : []).map(v => String(v).slice(0, 200)).slice(0, 5), b: Number(o && o.bonne), e: String(o && o.explication || "").slice(0, 600) })).filter(o => o.q && o.c.length >= 2 && o.b >= 0 && o.b < o.c.length).slice(0, 10);
  }
  function qcmHtml(m, i) {
    if (!Array.isArray(m.q) || !m.q.length) return "";
    const done = m.q.filter(o => o.a != null), ok = done.filter(o => o.a === o.b).length;
    return `<div class="pqcm" data-qbox="${i}">${m.q.map((o, k) => `<div class="pq${o.a != null ? (o.a === o.b ? " ok" : " ko") : ""}"><b>${k + 1}. ${mx(o.q)}</b><div class="pqc">${o.c.map((c, j) => `<button class="pqo${o.a != null && j === o.b ? " good" : ""}${o.a === j && j !== o.b ? " bad" : ""}" data-qa="${i}-${k}-${j}"${o.a != null ? " disabled" : ""}>${mx(c)}</button>`).join("")}</div>${o.a != null && o.e ? `<p class="small pqe">${mx(o.e)}</p>` : ""}</div>`).join("")}${done.length === m.q.length ? `<p class="pqscore"><b>${ok} / ${m.q.length}</b> ${ok === m.q.length ? "Parfait !" : ok >= m.q.length / 2 ? "Bien joué." : "Relis les explications, puis demande-moi un autre quiz."}</p>` : ""}</div>`;
  }
  function fieldsHtml(m, i) {
    if (!Array.isArray(m.f) || !m.f.length) return "";
    if (m.rep) return `<div class="exform done">${m.f.map((l, k) => `<div class="exf"><span class="small muted">${esc(l)}</span><b>${esc(m.rep[k] || "—")}</b></div>`).join("")}</div>`;
    if (m.cahier) return `<div class="exform"><p class="small muted">Fais l'exercice sur ton cahier, puis envoie la photo de ta copie : je te dis ce qui est juste et où ça coince.</p><div class="row" style="flex-wrap:wrap"><button class="btn sm" data-fphoto="${i}">${I.cam}Envoyer ma copie</button><button class="btn sm ghost" data-fmode="${i}" data-m="ici">Répondre ici plutôt</button></div></div>`;
    if (!m.ici) return `<div class="exform"><p class="small"><b>Comment veux-tu répondre ?</b></p><div class="row" style="flex-wrap:wrap"><button class="btn sm" data-fmode="${i}" data-m="ici">Ici, dans des cases</button><button class="btn sm ghost" data-fmode="${i}" data-m="cahier">Sur mon cahier, puis une photo</button></div></div>`;
    return `<div class="exform">${m.f.map((l, k) => `<label class="exf"><span class="small">${esc(l)}</span><textarea rows="1" data-fv="${i}-${k}" placeholder="Ta réponse"></textarea></label>`).join("")}<div class="row" style="flex-wrap:wrap"><button class="btn sm" data-fsend="${i}">Envoyer mes réponses</button><button class="btn sm ghost" data-fmode="${i}" data-m="cahier">Sur mon cahier</button></div></div>`;
  }
  // Photo de copie : réduite (1 600 px, JPEG) avant l'envoi.
  async function shrinkImage(f) {
    const bmp = await createImageBitmap(f), k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), cv = document.createElement("canvas");
    cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k); cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
    return { mime: "image/jpeg", data: cv.toDataURL("image/jpeg", 0.82).split(",")[1] };
  }
