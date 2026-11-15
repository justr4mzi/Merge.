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
  const curConv = p => p.convs.find(c => c.id === p.cur);
  // Chapitres réellement envoyés : ceux cochés + tous ceux des matières liées (20 au plus).
  const ctxChapters = ctx => [...new Set(ctx.ch.concat(state.chapters.filter(c => ctx.s.includes(c.subject_id)).map(c => c.id)))].slice(0, 20);
  function ctxChips(ctx) {
    const subj = id => state.subjects.find(x => x.id === id) || {};
    return ctx.s.map(id => `<span class="pchip" style="--c:${esc(subj(id).color || "#9483ff")}"><span class="dot"></span>${esc(subj(id).name || "")} · toute la matière<button class="pchipx" data-unctx="s:${id}" aria-label="Retirer ${esc(subj(id).name || "")}">${I.x}</button></span>`).join("")
      + ctx.ch.map(id => { const c = state.chapters.find(x => x.id === id) || {}, s = subj(c.subject_id); return `<span class="pchip" style="--c:${esc(s.color || "#9483ff")}"><span class="dot"></span>${esc(c.name || "")}<button class="pchipx" data-unctx="c:${id}" aria-label="Retirer ${esc(c.name || "")}">${I.x}</button></span>`; }).join("");
  }
  function screenExos(arg) {
    drawTabs("exos");
    const p = profGet();
    // Ouvert depuis un chapitre (#exos-<id>) : on lie ce chapitre, dans une nouvelle discussion si la discussion en cours a déjà des messages.
    if (arg && state.chapters.some(c => c.id === arg) && !curConv(p).ctx.ch.includes(arg)) {
      let c = curConv(p); if (c.m.length) { c = newConv(); p.convs.unshift(c); p.cur = c.id; }
      c.ctx.ch.push(arg); c.at = Date.now(); profSave(p);
    }
    const conv = curConv(p), msgs = conv.m, linked = conv.ctx.ch.length + conv.ctx.s.length;
    app.innerHTML = `<div class="row profhead"><button class="iconbtn flat" id="phist" aria-label="Mes discussions" title="Mes discussions">${I.menu}</button><h1 class="grow ptitle">${esc(conv.t || "Prof")}</h1><button class="iconbtn flat" id="pnew" aria-label="Nouvelle discussion" title="Nouvelle discussion">${I.edit}</button></div>
      <div class="pctx">${ctxChips(conv.ctx)}<button class="pchip add" id="pctx">${I.book}${linked ? "Cours" : "Lier un cours"}</button></div>
      <div class="exthread" id="exth">${msgs.length ? msgs.map((m, i) => `<div class="exmsg ${m.r === "u" ? "me" : "ai"}">${m.r === "u" ? esc(m.t).replace(/\n/g, "<br>") + (m.img ? '<span class="small muted"> · photo envoyée</span>' : "") : md(m.t) + fieldsHtml(m, i)}</div>`).join("") : `<div class="pempty"><span class="pico">${I.ask}</span><b>Pose-moi n'importe quelle question</b><p class="small muted">${linked ? "Je m'appuie sur les cours liés en haut. " : "Pour que je m'appuie sur ton cours, touche « Lier un cours » : un ou plusieurs chapitres, ou des matières entières. "}Demande un exercice, une explication, ou envoie la photo de ta copie avec le bouton +.</p></div>`}</div>
      <div class="chips exquick">${EXO_QUICK.map((q, i) => `<button class="chip" data-q="${i}">${q[0]}</button>`).join("")}</div>
      <div class="pcomp"><div id="eximg" class="pimg" hidden></div><div class="pbar"><button class="iconbtn flat" id="pplus" aria-label="Ajouter une photo ou un cours">${I.plus}</button><textarea id="exq" rows="1" maxlength="2000" placeholder="Écris ton message…"></textarea>${canDictate() ? `<button class="iconbtn flat" id="exmic" aria-label="Dicter">${I.mic}</button>` : ""}<button class="iconbtn psend" id="exsend" aria-label="Envoyer">${I.send}</button></div>
      <input id="exphoto" type="file" accept="image/*" capture="environment" hidden><input id="exfile" type="file" accept="image/*" hidden></div>
      <p class="note">${linked ? "Le prof s'appuie sur les cours liés" : "Sans cours lié, le prof répond avec ses connaissances de lycée"} ; il peut se tromper sur un calcul. 1 message = 1 appel IA.</p>`;
    const save = () => { conv.at = Date.now(); profSave(p); };
    // Cours liés.
    app.querySelectorAll("[data-unctx]").forEach(b => b.onclick = () => { const [k, id] = b.dataset.unctx.split(":"); conv.ctx[k === "s" ? "s" : "ch"] = conv.ctx[k === "s" ? "s" : "ch"].filter(x => x !== id); save(); screenExos(); });
    $("pctx").onclick = () => ctxSheet(conv, () => { save(); screenExos(); });
    $("pnew").onclick = () => { if (!msgs.length && !linked) return toast("Tu es déjà dans une nouvelle discussion."); const c = newConv(); p.convs.unshift(c); p.cur = c.id; profSave(p); screenExos(); };
    $("phist").onclick = () => histDrawer(p);
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
    const th = $("exth"); th.scrollTop = th.scrollHeight;
    const q = $("exq"), grow = () => { q.style.height = "auto"; q.style.height = Math.min(160, q.scrollHeight) + "px"; };
    q.oninput = grow;
    q.onkeydown = e => { if (e.key === "Enter" && !e.shiftKey && matchMedia("(hover: hover)").matches) { e.preventDefault(); send(); } };
    // Photo jointe (bouton +) : aperçu au-dessus du champ, retirable.
    let img = null;
    const showImg = () => { const el = $("eximg"); el.hidden = !img; el.innerHTML = img ? `<img src="data:image/jpeg;base64,${img.data}" alt="Photo jointe"><span class="small">Photo prête</span><button class="iconbtn flat" id="pimgx" aria-label="Retirer la photo">${I.x}</button>` : ""; if (img) $("pimgx").onclick = () => { img = null; showImg(); }; };
    const onPhoto = async e => { const f = e.target.files[0]; e.target.value = ""; if (!f) return; try { img = await shrinkImage(f); showImg(); if (!q.value.trim()) q.value = "Voici ma copie : dis-moi ce qui est juste dans mon raisonnement et où je me suis trompé."; grow(); } catch (er) { toast("Photo illisible."); } };
    $("exphoto").onchange = onPhoto; $("exfile").onchange = onPhoto;
    $("pplus").onclick = () => sheet(`<h1>Ajouter</h1><div class="stack"><button class="btn ghost" id="pa-cam">${I.cam}Prendre une photo</button><button class="btn ghost" id="pa-img">${I.img}Choisir une photo</button><button class="btn ghost" id="pa-ctx">${I.book}Lier un cours</button></div>`, el => {
      el.querySelector("#pa-cam").onclick = () => { closeSheet(); $("exphoto").click(); };
      el.querySelector("#pa-img").onclick = () => { closeSheet(); $("exfile").click(); };
      el.querySelector("#pa-ctx").onclick = () => { closeSheet(); $("pctx").click(); };
    });
    if ($("exmic")) dictate($("exmic"), q, grow);
    app.querySelectorAll("[data-q]").forEach(b => b.onclick = () => { const x = EXO_QUICK[+b.dataset.q]; if (!x[1]) { $("pplus").click(); return; } q.value = x[1]; send(); });
    $("exsend").onclick = () => send();
    async function send() {
      const t = q.value.trim(); if (!t && !img) return toast("Écris ton message.");
      if (state.offline) return toast("Il faut être connecté à Internet pour l'IA.");
      const mine = { r: "u", t: t || "Voici ma copie.", img: !!img }; msgs.push(mine); if (!conv.t) conv.t = mine.t.slice(0, 60); save();
      $("exsend").disabled = true; q.value = ""; grow();
      const pe = th.querySelector(".pempty"); if (pe) pe.remove();
      th.insertAdjacentHTML("beforeend", `<div class="exmsg me">${esc(mine.t).replace(/\n/g, "<br>")}${img ? '<span class="small muted"> · photo envoyée</span>' : ""}</div><div class="exmsg ai wait"><span class="spin" aria-hidden="true"></span> Je réfléchis…</div>`); th.scrollTop = th.scrollHeight;
      const photo = img; img = null; showImg();
      try {
        const subjNames = conv.ctx.s.map(id => (state.subjects.find(x => x.id === id) || {}).name).filter(Boolean);
        const r = await ai({ action: "exochat", want_title: !conv.named, chapter_ids: ctxChapters(conv.ctx), matieres: subjNames, messages: msgs.slice(-12).map(m => ({ r: m.r, t: m.t })), image: photo }, "studio");
        if (!conv.named && r.title) { conv.t = String(r.title).slice(0, 60); conv.named = true; }
        msgs.push(Object.assign({ r: "a", t: String(r.answer || "").slice(0, 8000) }, Array.isArray(r.fields) && r.fields.length ? { f: r.fields.map(x => String(x).slice(0, 120)).slice(0, 6) } : {})); save();
        if (location.hash.startsWith("#exos")) screenExos();
      } catch (e) { const w = th.querySelector(".wait"); if (w) { w.classList.remove("wait"); w.textContent = e.message || "L'IA n'a pas répondu. Réessaie."; } $("exsend").disabled = false; }
    }
  }
  // Choisir les cours liés : des matières entières et/ou des chapitres, dans n'importe quelle matière.
  function ctxSheet(conv, done) {
    const ch = new Set(conv.ctx.ch), ss = new Set(conv.ctx.s);
    const list = state.subjects.map(s => ({ s, l: state.chapters.filter(c => c.subject_id === s.id) })).filter(x => x.l.length);
    sheet(`<h1>Cours liés</h1><p class="muted small">Le prof s'appuiera sur ces cours. Choisis autant de chapitres et de matières que tu veux.</p>
      ${list.map(({ s, l }) => `<div class="card pad stack pctxs" style="border-left:4px solid ${esc(s.color)}"><div class="row between"><b>${esc(s.name)}</b><button class="chip${ss.has(s.id) ? " on" : ""}" data-cs="${s.id}" aria-pressed="${ss.has(s.id)}">Toute la matière</button></div><div class="chips">${l.map(c => `<button class="chip${ch.has(c.id) || ss.has(s.id) ? " on" : ""}" data-cc="${c.id}" data-sid="${s.id}" aria-pressed="${ch.has(c.id)}"${ss.has(s.id) ? " disabled" : ""}>${esc(c.name)}</button>`).join("")}</div></div>`).join("") || '<p class="muted">Crée d\'abord un chapitre dans Matières.</p>'}
      <div class="row"><button class="btn ghost grow" id="pctxnone">Aucun cours</button><button class="btn grow" id="pctxok">Valider</button></div>`, el => {
      el.querySelectorAll("[data-cs]").forEach(b => b.onclick = () => {
        const id = b.dataset.cs, on = !ss.has(id); on ? ss.add(id) : ss.delete(id); b.classList.toggle("on", on); b.setAttribute("aria-pressed", on);
        el.querySelectorAll(`[data-sid="${id}"]`).forEach(c => { c.disabled = on; c.classList.toggle("on", on || ch.has(c.dataset.cc)); if (on) ch.delete(c.dataset.cc); });
      });
      el.querySelectorAll("[data-cc]").forEach(b => b.onclick = () => { const id = b.dataset.cc, on = !ch.has(id); on ? ch.add(id) : ch.delete(id); b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
      el.querySelector("#pctxnone").onclick = () => { conv.ctx = { ch: [], s: [] }; closeSheet(); done(); };
      el.querySelector("#pctxok").onclick = () => { conv.ctx = { ch: [...ch].filter(id => !ss.has((state.chapters.find(c => c.id === id) || {}).subject_id)), s: [...ss] }; closeSheet(); done(); };
    });
  }
  // Mes discussions : panneau qui glisse depuis la gauche (bouton ☰), comme dans une appli de chat. Nom donné automatiquement par l'IA.
  function histDrawer(p) {
    const list = p.convs.filter(c => c.m.length).sort((a, b) => b.at - a.at), today = localDay();
    const when = c => { const d = localDay(new Date(c.at)); if (d === today) return "Aujourd'hui"; const y = new Date(); y.setDate(y.getDate() - 1); if (d === localDay(y)) return "Hier"; return Date.now() - c.at < 7 * 864e5 ? "7 derniers jours" : "Plus ancien"; };
    const label = c => { const n = c.ctx.ch.length + c.ctx.s.length; return n ? plural(n, "cours lié", "cours liés") : "Discussion libre"; };
    let last = "", rows = "";
    list.forEach(c => { const g = when(c); if (g !== last) { rows += `<p class="label pdgrp">${g}</p>`; last = g; } rows += `<div class="pdrow${c.id === p.cur ? " on" : ""}"><button class="pdconv" data-conv="${c.id}"><b>${esc(c.t || "Discussion")}</b><span class="small muted">${label(c)}</span></button><button class="iconbtn flat" data-cdel="${c.id}" aria-label="Supprimer la discussion">${I.x}</button></div>`; });
    const old = document.getElementById("pdrawer"); if (old) old.remove();
    const el = document.createElement("div"); el.id = "pdrawer"; el.className = "pdwrap";
    el.innerHTML = `<div class="pdshade" data-pdclose></div><aside class="pdpanel" role="dialog" aria-label="Mes discussions"><div class="row"><h2 class="grow" style="margin:0">Discussions</h2><button class="iconbtn flat" data-pdclose aria-label="Fermer">${I.x}</button></div><button class="btn" id="pdnew">${I.plus}Nouvelle discussion</button><div class="pdlist">${rows || '<p class="muted">Aucune discussion pour l\'instant.</p>'}</div></aside>`;
    document.body.appendChild(el); requestAnimationFrame(() => el.classList.add("open"));
    const close = () => { el.classList.remove("open"); setTimeout(() => el.remove(), 200); };
    el.querySelectorAll("[data-pdclose]").forEach(b => b.onclick = close);
    el.querySelector("#pdnew").onclick = () => { el.remove(); $("pnew").click(); };
    el.querySelectorAll("[data-conv]").forEach(b => b.onclick = () => { p.cur = b.dataset.conv; profSave(p); el.remove(); screenExos(); });
    el.querySelectorAll("[data-cdel]").forEach(b => b.onclick = () => {
      if (b.dataset.ok !== "1") { b.dataset.ok = "1"; toast("Touche encore pour supprimer cette discussion."); return; }
      p.convs = p.convs.filter(c => c.id !== b.dataset.cdel); if (p.cur === b.dataset.cdel) p.cur = null; profSave(p); el.remove(); screenExos(); if (p.convs.some(c => c.m.length)) histDrawer(profGet());
    });
  }
  // Champs de réponse d'un message de l'IA : choix de la façon de répondre, cases à remplir, ou réponses déjà envoyées.
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
