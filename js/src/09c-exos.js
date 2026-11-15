  // ---------- Exercices : un chat relié à un chapitre (questions, exercices, correction d'une copie en photo) ----------
  // Conversation gardée par chapitre (merge.exo.<chapitre>, synchronisée, 40 messages, texte seulement).
  // Chaque message part à la fonction studio (action « exochat », 1 appel IA) avec le cours du chapitre, lu côté serveur.
  const exoKey = ch => "merge.exo." + ch;
  const exoGet = ch => { const v = jget(exoKey(ch), null); return Array.isArray(v) ? v : []; };
  const EXO_QUICK = [["Fais-moi un exercice", "Fais-moi un exercice sur ce chapitre, de niveau contrôle, sans la correction : je te donnerai ma réponse."], ["Un exercice facile", "Fais-moi un exercice facile pour démarrer, sans la correction."], ["Corrige ma copie", null], ["Explique la méthode", "Explique-moi la méthode pour réussir les exercices de ce chapitre, étape par étape."], ["Donne-moi un indice", "Donne-moi juste un indice pour avancer, sans la solution."], ["La correction", "Donne-moi la correction complète et détaillée de l'exercice."]];
  let exoCh = null;
  function screenExos(arg) {
    drawTabs("exos");
    const withCours = state.chapters.filter(c => c.status === "ready" || cardsOf(c.id).length);
    if (arg && state.chapters.some(c => c.id === arg)) exoCh = arg;
    if (exoCh && !state.chapters.some(c => c.id === exoCh)) exoCh = null;
    if (!exoCh) exoCh = safeGet("merge.exolast") || null;
    if (exoCh && !withCours.some(c => c.id === exoCh)) exoCh = null;
    const ch = exoCh && state.chapters.find(c => c.id === exoCh), s = ch && state.subjects.find(x => x.id === ch.subject_id);
    if (!ch) {
      app.innerHTML = `<h1>Prof</h1><p class="muted">Ton prof perso, relié à tes cours. Choisis un chapitre : pose tes questions, demande un exercice à faire ici même, ou envoie la photo de ta copie pour savoir où tu t'es trompé.</p>
        ${state.subjects.map(x => { const l = withCours.filter(c => c.subject_id === x.id); return l.length ? `<div class="card pad stack" style="border-left:4px solid ${esc(x.color)}"><b>${esc(x.name)}</b><div class="chips">${l.map(c => `<button class="chip" data-exo="${c.id}" style="--c:${esc(x.color)}"><span class="dot"></span>&nbsp;${esc(c.name)}</button>`).join("")}</div></div>` : ""; }).join("") || '<p class="muted">Importe d\'abord un cours dans un chapitre.</p>'}`;
      app.querySelectorAll("[data-exo]").forEach(b => b.onclick = () => { exoCh = b.dataset.exo; safeSet("merge.exolast", exoCh); screenExos(); });
      return;
    }
    safeSet("merge.exolast", ch.id);
    const msgs = exoGet(ch.id);
    app.innerHTML = `<div class="row"><button class="iconbtn" id="exback" aria-label="Changer de chapitre">${I.back}</button><div class="grow" style="min-width:0"><h1 style="margin:0">Prof</h1><button class="linkbtn" id="exch"><span class="dot" style="background:${esc(s ? s.color : "#9483ff")}"></span>&nbsp;${esc(ch.name)}</button></div>${msgs.length ? `<button class="iconbtn flat" id="exclear" aria-label="Nouvelle conversation" title="Nouvelle conversation">${I.x}</button>` : ""}</div>
      <div class="exthread" id="exth">${msgs.length ? msgs.map((m, i) => `<div class="exmsg ${m.r === "u" ? "me" : "ai"}">${m.r === "u" ? esc(m.t).replace(/\n/g, "<br>") + (m.img ? '<span class="small muted"> · photo envoyée</span>' : "") : md(m.t) + fieldsHtml(m, i)}</div>`).join("") : `<div class="card pad stack"><b>Pose ta question sur « ${esc(ch.name)} »</b><p class="small muted">Exemples : « Fais-moi un exercice », « J'ai trouvé 12 N, c'est bon ? », ou envoie la photo de ta copie : je te dis ce qui est juste dans ton raisonnement et où ça coince.</p></div>`}</div>
      <div class="chips exquick">${EXO_QUICK.map((q, i) => `<button class="chip" data-q="${i}">${q[0]}</button>`).join("")}</div>
      <div class="excompose card"><textarea id="exq" rows="2" maxlength="2000" placeholder="Ta question ou ta réponse…"></textarea><div class="row"><label class="iconbtn flat" for="exphoto" aria-label="Envoyer une photo de ta copie" title="Photo de ta copie">${I.up}</label><input id="exphoto" type="file" accept="image/*" capture="environment" hidden>${(window.SpeechRecognition || window.webkitSpeechRecognition) ? `<button class="iconbtn flat" id="exmic" aria-label="Dicter">${I.mic}</button>` : ""}<span class="small muted grow" id="eximg"></span><button class="btn sm" id="exsend">Envoyer</button></div></div>
      <p class="note">L'IA s'appuie sur ton cours ; elle peut se tromper sur un calcul : vérifie avec ton prof en cas de doute. 1 message = 1 appel IA.</p>`;
    // Réponses dans la bulle : l'IA donne un exercice avec des champs à remplir, on répond directement dedans.
    app.querySelectorAll("[data-fsend]").forEach(b => b.onclick = () => {
      const i = +b.dataset.fsend, h = exoGet(ch.id), m = h[i]; if (!m || !m.f) return;
      const vals = m.f.map((_, k) => (app.querySelector(`[data-fv="${i}-${k}"]`) || {}).value || "").map(v => v.trim());
      if (!vals.some(Boolean)) return toast("Écris au moins une réponse.");
      m.rep = vals; jset(exoKey(ch.id), h);
      $("exq").value = "Mes réponses :\n" + m.f.map((l, k) => "- " + l + " : " + (vals[k] || "(pas répondu)")).join("\n") + "\nCorrige-moi : dis ce qui est juste et où je me trompe.";
      send();
    });
    // Choix de la façon de répondre : dans des cases ici, ou sur le cahier puis une photo de la copie.
    app.querySelectorAll("[data-fmode]").forEach(b => b.onclick = () => { const h = exoGet(ch.id), m = h[+b.dataset.fmode]; if (!m) return; m.ici = b.dataset.m === "ici"; m.cahier = !m.ici; jset(exoKey(ch.id), h); screenExos(); });
    app.querySelectorAll("[data-fphoto]").forEach(b => b.onclick = () => $("exphoto").click());
    const th = $("exth"); th.scrollTop = th.scrollHeight; if (msgs.length) setTimeout(() => $("exq").scrollIntoView({ block: "nearest" }), 50);
    let img = null;
    $("exback").onclick = $("exch").onclick = () => { exoCh = null; safeSet("merge.exolast", ""); screenExos(); };
    if ($("exclear")) $("exclear").onclick = () => { if ($("exclear").dataset.ok !== "1") { $("exclear").dataset.ok = "1"; toast("Touche encore pour effacer la conversation."); return; } jset(exoKey(ch.id), []); screenExos(); };
    $("exphoto").onchange = async e => { const f = e.target.files[0]; if (!f) return; try { img = await shrinkImage(f); $("eximg").textContent = "Photo prête"; if (!$("exq").value.trim()) $("exq").value = "Voici ma copie : dis-moi ce qui est juste dans mon raisonnement et où je me suis trompé."; } catch (er) { toast("Photo illisible."); } };
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if ($("exmic")) { let rec = null; $("exmic").onclick = () => { if (rec) { rec.stop(); return; } rec = new SR(); rec.lang = "fr-FR"; rec.interimResults = true; const base = $("exq").value; rec.onresult = e => { $("exq").value = (base ? base + " " : "") + [...e.results].map(r => r[0].transcript).join(""); }; rec.onend = () => { rec = null; $("exmic").classList.remove("on"); }; rec.onerror = () => toast("Micro indisponible."); $("exmic").classList.add("on"); rec.start(); }; }
    app.querySelectorAll("[data-q]").forEach(b => b.onclick = () => { const q = EXO_QUICK[+b.dataset.q]; if (!q[1]) { $("exphoto").click(); return; } $("exq").value = q[1]; send(); });
    $("exsend").onclick = () => send();
    async function send() {
      const t = $("exq").value.trim(); if (!t && !img) return toast("Écris ta question.");
      if (state.offline) return toast("Il faut être connecté à Internet pour l'IA.");
      const hist = exoGet(ch.id), mine = { r: "u", t: t || "Voici ma copie.", img: !!img }; hist.push(mine); jset(exoKey(ch.id), hist.slice(-40));
      $("exsend").disabled = true; $("exq").value = "";
      th.insertAdjacentHTML("beforeend", `<div class="exmsg me">${esc(mine.t).replace(/\n/g, "<br>")}${img ? '<span class="small muted"> · photo envoyée</span>' : ""}</div><div class="exmsg ai wait"><span class="spin" aria-hidden="true"></span> Je réfléchis…</div>`); th.scrollTop = th.scrollHeight;
      try {
        const r = await ai({ action: "exochat", chapter_id: ch.id, messages: hist.slice(-12).map(m => ({ r: m.r, t: m.t })), image: img }, "studio");
        const h2 = exoGet(ch.id); h2.push(Object.assign({ r: "a", t: String(r.answer || "") }, Array.isArray(r.fields) && r.fields.length ? { f: r.fields.map(x => String(x).slice(0, 120)).slice(0, 6) } : {})); jset(exoKey(ch.id), h2.slice(-40)); img = null;
        if (location.hash.startsWith("#exos")) screenExos();
      } catch (e) { const w = th.querySelector(".wait"); if (w) { w.classList.remove("wait"); w.textContent = e.message || "L'IA n'a pas répondu. Réessaie."; } $("exsend").disabled = false; }
    }
  }
  // Champs de réponse d'un message de l'IA : à remplir (dernier exercice), ou réponses déjà envoyées.
  function fieldsHtml(m, i) {
    if (!Array.isArray(m.f) || !m.f.length) return "";
    if (m.rep) return `<div class="exform done">${m.f.map((l, k) => `<div class="exf"><span class="small muted">${esc(l)}</span><b>${esc(m.rep[k] || "—")}</b></div>`).join("")}</div>`;
    if (m.cahier) return `<div class="exform"><p class="small muted">Fais l'exercice sur ton cahier, puis envoie la photo de ta copie : je te dis ce qui est juste et où ça coince.</p><div class="row" style="flex-wrap:wrap"><button class="btn sm" data-fphoto="${i}">${I.up}Envoyer ma copie</button><button class="btn sm ghost" data-fmode="${i}" data-m="ici">Répondre ici plutôt</button></div></div>`;
    if (!m.ici) return `<div class="exform"><p class="small"><b>Comment veux-tu répondre ?</b></p><div class="row" style="flex-wrap:wrap"><button class="btn sm" data-fmode="${i}" data-m="ici">Ici, dans des cases</button><button class="btn sm ghost" data-fmode="${i}" data-m="cahier">Sur mon cahier, puis une photo</button></div></div>`;
    return `<div class="exform">${m.f.map((l, k) => `<label class="exf"><span class="small">${esc(l)}</span><textarea rows="1" data-fv="${i}-${k}" placeholder="Ta réponse"></textarea></label>`).join("")}<div class="row" style="flex-wrap:wrap"><button class="btn sm" data-fsend="${i}">Envoyer mes réponses</button><button class="btn sm ghost" data-fmode="${i}" data-m="cahier">Sur mon cahier</button></div></div>`;
  }
  // Photo de copie : réduite (1 600 px, JPEG) avant l'envoi.
  async function shrinkImage(f) {
    const bmp = await createImageBitmap(f), k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), cv = document.createElement("canvas");
    cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k); cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
    return { mime: "image/jpeg", data: cv.toDataURL("image/jpeg", 0.82).split(",")[1] };
  }

