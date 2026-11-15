  // ---------- connexion et inscription ----------
  function screenLogin(msg) {
    tabs.hidden = true;
    app.innerHTML = `<div class="center">
      <div class="logo" style="font-size:2.6em">${esc(C.NOM_APPLI)}<b>.</b></div>
      <div class="stack"><h1>Tes cours deviennent des résumés, des cartes et des quiz.</h1>
      <p class="muted">Importe un PDF ou une photo de ton cours. Merge prépare le reste, sans rien inventer.</p></div>
      ${msg ? `<p class="err">${esc(msg)}</p>` : ""}
      <button class="btn gbtn" id="google"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.700-6.700C35.600 2.500 30.200 0 24 0 14.600 0 6.500 5.400 2.600 13.200l7.800 6.100C12.300 13.600 17.700 9.500 24 9.500z"/><path fill="#4285F4" d="M46.500 24.500c0-1.600-.1-3.100-.4-4.500H24v9h12.700c-.6 3-2.300 5.500-4.800 7.200l7.500 5.800c4.400-4.100 7.100-10.100 7.100-17.500z"/><path fill="#FBBC05" d="M10.400 28.700c-.5-1.500-.8-3.100-.8-4.700s.3-3.200.8-4.700l-7.800-6.100C1 16.500 0 20.100 0 24s1 7.500 2.600 10.800l7.800-6.100z"/><path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.500-5.800c-2.100 1.400-4.800 2.300-8.400 2.300-6.300 0-11.700-4.100-13.600-9.900l-7.800 6.100C6.500 42.600 14.600 48 24 48z"/></svg>Continuer avec Google</button>
      <p class="note">Tes cours restent privés : toi seul peux les voir.</p></div>`;
    $("google").onclick = async () => {
      const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } });
      if (error) fail(error, "Connexion impossible");
    };
  }

  // Inscription en 4 étapes. Tout reste modifiable dans Réglages.
  function screenOnboarding() {
    tabs.hidden = true;
    const meta = state.user.user_metadata || {}, N = 4;
    const d = { step: 0, remind: false, rtime: "18:00", prenom: (meta.given_name || (meta.full_name || "").split(" ")[0] || ""), classe: "Terminale générale", matieres: new Set(["Maths", "Physique-chimie", "SVT"]), touched: false, extra: [], shared: [], sharedFor: null, exams: {}, cur: null, kind: "minutes", value: 15, theme: "system" };
    const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
    const props = () => { const out = matieresFor(d.classe).slice(); d.shared.concat(d.extra, [...d.matieres]).forEach(m => { if (!out.some(x => same(x, m))) out.push(m); }); return out; };
    function addOwn() {
      const el = $("newm"), v = (el ? el.value : "").trim().replace(/\s+/g, " ").slice(0, 40); if (v.length < 2) return toast("Écris le nom de la matière.");
      const known = props().find(x => same(x, v)) || v; if (known === v) d.extra.push(v);
      d.matieres.add(known); d.touched = true; draw(); const n = $("newm"); if (n) n.focus();
    }
    // Les matières déjà créées par d'autres élèves de la même classe sont proposées à tout le monde.
    function loadShared() {
      if (d.sharedFor === d.classe) return; d.sharedFor = d.classe; d.shared = [];
      Promise.resolve(sb.rpc("shared_subject_names", { p_classe: d.classe })).then(r => { const rows = (r && r.data) || []; if (!Array.isArray(rows) || !rows.length) return; d.shared = rows.map(x => String(x.name || "").trim()).filter(x => x.length >= 2 && x.length <= 40).slice(0, 30); if (d.step === 2) { keepNew(); draw(); } }).catch(() => { /* propositions de base seulement */ });
    }
    let draftNew = ""; const keepNew = () => { if ($("newm")) draftNew = $("newm").value; };
    function keep() {
      if ($("prenom")) d.prenom = $("prenom").value; if ($("classe")) { const v = classeVal(); if (v) d.classe = v; }
      if ($("val")) d.value = Math.min(500, Math.max(1, parseInt($("val").value, 10) || 15));
    }
    const xchips = (list) => list.map((m, i) => { const e = d.exams[m]; return `<button class="chip" data-x="${esc(m)}" aria-pressed="${m === d.cur}" style="--c:${colorFor(m, i)}"><span class="dot"></span>&nbsp;${esc(m)}${e && (e.free || e.date) ? `<span class="small muted">&nbsp;· ${e.free ? "libre" : new Date(e.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>` : ""}</button>`; }).join("");
    function draw() {
      let body = "";
      const list = [...d.matieres]; if (!list.includes(d.cur)) d.cur = list[0] || null;
      if (d.step === 0) body = `<h1>Bienvenue sur ${esc(C.NOM_APPLI)}<b class="dotc">.</b></h1>
        <p>Merge t'aide à réviser tes vrais cours, sans te prendre la tête.</p>
        <div class="welcome stack">
          <div class="row wl"><span class="mico">${I.up}</span><p><b>Tu importes ton cours</b><br><span class="muted">PDF, photos de ton cahier, diaporama… Merge en fait un résumé, des flashcards et des quiz, uniquement à partir de ce que ton prof a donné.</span></p></div>
          <div class="row wl"><span class="mico">${I.cal}</span><p><b>Il te dit quoi réviser chaque jour</b><br><span class="muted">Selon tes contrôles à venir et les cartes que tu connais moins bien.</span></p></div>
          <div class="row wl"><span class="mico">${I.cards}</span><p><b>Tu révises comme tu préfères</b><br><span class="muted">Cartes, interro écrite, jeux, à l'oral ou en écoutant, sur ton téléphone comme sur ton ordi.</span></p></div>
        </div>
        <div class="card pad stack soft"><h2>Pourquoi quelques questions ?</h2><p class="small">Ta classe sert à adapter les explications à ton niveau et à te proposer tes matières. Tes dates de contrôle servent à préparer ton plan de révision. Ça prend une minute, et rien n'est définitif.</p></div>`;
      if (d.step === 1) body = `<h1>On fait connaissance</h1><p class="muted">Pour que Merge te parle comme il faut.</p>
        <div class="field"><label for="prenom">Ton prénom</label><input id="prenom" type="text" autocomplete="given-name" value="${esc(d.prenom)}"></div>
        <div class="field"><label for="classe">Ta classe</label><select id="classe">${classOpts(d.classe)}</select>${classeFree()}</div>`;
      if (d.step === 2) body = `<h1>Tes matières</h1><p class="muted">Choisis celles que tu veux réviser. Chaque matière aura ses chapitres, ses cartes et son plan. Tu pourras en ajouter quand tu veux.</p>
        <div class="chips">${props().map(m => `<button class="chip" data-m="${esc(m)}" aria-pressed="${d.matieres.has(m)}">${esc(m)}</button>`).join("")}</div>
        <form class="field" id="ownf"><label for="newm">Il en manque une ? Ajoute-la</label><div class="row"><input id="newm" class="grow" type="text" maxlength="40" placeholder="Ex. Arts plastiques" value="${esc(draftNew)}"><button class="btn sm" id="addm">${I.plus}Ajouter</button></div></form>
        <p class="small muted">${plural(d.matieres.size, "matière choisie", "matières choisies")}. Les matières ajoutées par les élèves de ta classe sont proposées à tout le monde.</p>`;
      if (d.step === 3) body = `<h1>Tes prochains contrôles</h1><p class="muted">Si tu connais une date, Merge répartit tes révisions jusqu'au jour J. Choisis une matière, puis touche le jour dans le calendrier. Pas de date ? Aucun souci, passe en révision libre.</p>
        ${list.length ? `<div class="chips" id="xchips">${xchips(list)}</div><div id="pick"></div>` : '<p class="note">Tu n\'as choisi aucune matière : tu pourras en ajouter depuis l\'accueil.</p>'}`;
      if (d.step === 4) body = `<h1>Ton rythme</h1><p class="muted">Un petit objectif tenu chaque jour vaut mieux qu'une grosse séance la veille.</p>
        <div class="chips"><button class="chip" data-k="minutes" aria-pressed="${d.kind === "minutes"}">En minutes</button><button class="chip" data-k="cards" aria-pressed="${d.kind === "cards"}">En cartes</button></div>
        <div class="field"><label for="val">${d.kind === "minutes" ? "Minutes par jour" : "Cartes par jour"}</label><input id="val" type="number" inputmode="numeric" min="1" max="500" value="${d.value}"></div>
        <div class="card pad stack soft"><h2>Un petit rappel chaque jour ?</h2><p class="small">Merge t'envoie une notification à l'heure choisie, plus un rappel avant chaque contrôle. Tu peux l'arrêter quand tu veux dans Réglages.</p>
          <div class="row"><label class="small muted" for="rtime">Chaque jour à</label><input id="rtime" type="time" value="${esc(d.rtime)}" style="max-width:150px"></div><button class="btn" id="remon"${d.remind ? " disabled" : ""}>${d.remind ? "Rappels activés" : "Activer les rappels"}</button><p class="note" id="remmsg" role="status"></p></div>
        <div class="field"><span class="label">Apparence</span><div class="chips">${[["light", "Clair"], ["dark", "Sombre"], ["system", "Comme mon téléphone"]].map(t => `<button class="chip" data-t="${t[0]}" aria-pressed="${d.theme === t[0]}">${t[1]}</button>`).join("")}</div></div>`;
      app.innerHTML = `<div class="center">${d.step ? `<p class="small muted">Étape ${d.step} sur ${N}</p><div class="bar"><i style="width:${d.step / N * 100}%"></i></div>` : ""}${body}
        ${d.step ? '<p class="note">Tu pourras tout changer plus tard.</p>' : ""}
        <div class="row">${d.step > 0 ? '<button class="btn ghost" id="prev">Retour</button>' : ""}<button class="btn grow" id="next">${d.step === 0 ? "C'est parti" : d.step < N ? "Continuer" : "Commencer"}</button></div></div>`;
      if ($("rtime")) $("rtime").onchange = e => { d.rtime = e.target.value || "18:00"; };
      if ($("remon")) $("remon").onclick = async () => {
        const msg = $("remmsg"); d.rtime = $("rtime").value || "18:00";
        if (!("Notification" in window) || !("serviceWorker" in navigator)) { msg.textContent = "Ce navigateur ne gère pas les notifications. Sur iPhone, installe d'abord Merge sur l'écran d'accueil, puis active-les dans Réglages."; return; }
        const okp = await ensurePush(true);
        if (okp) { d.remind = true; keep(); draw(); } else msg.textContent = Notification.permission === "denied" ? "Notifications refusées : tu pourras les autoriser plus tard dans les réglages du navigateur." : "Impossible de les activer ici. Tu pourras réessayer dans Réglages.";
      };
      draftNew = "";
      app.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { keepNew(); const m = b.dataset.m; d.matieres.has(m) ? d.matieres.delete(m) : d.matieres.add(m); d.touched = true; draw(); });
      if ($("ownf")) { $("ownf").onsubmit = (e) => { e.preventDefault(); addOwn(); }; loadShared(); }
      const wireX = () => app.querySelectorAll("[data-x]").forEach(b => b.onclick = () => { d.cur = b.dataset.x; draw(); });
      wireX();
      if ($("pick") && d.cur) examPicker($("pick"), d.exams[d.cur] || {}, v => { d.exams[d.cur] = v; $("xchips").innerHTML = xchips(list); wireX(); });
      app.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { keep(); d.kind = b.dataset.k; d.value = d.kind === "minutes" ? 15 : 20; draw(); });
      wireClasse();
      app.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { keep(); d.theme = b.dataset.t; applyLook({ theme: d.theme }); draw(); });
      if ($("prev")) $("prev").onclick = () => { keep(); d.step--; draw(); };
      $("next").onclick = async () => {
        keep();
        if (d.step === 1 && !d.prenom.trim()) return toast("Écris ton prénom pour continuer.");
        if (d.step === 1 && !classeVal()) return toast("Écris le nom de ta formation.");
        if (d.step === 1 && !d.touched) d.matieres = new Set(matieresFor(d.classe).slice(0, 3));
        if (d.step === 2 && $("newm") && $("newm").value.trim().length >= 2) { const v = $("newm").value.trim().replace(/\s+/g, " ").slice(0, 40), known = props().find(x => same(x, v)) || v; if (known === v) d.extra.push(v); d.matieres.add(known); }
        if (d.step < N) { d.step++; return draw(); }
        $("next").disabled = true;
        const year = new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1;
        const up = await sb.from("profiles").upsert(Object.assign({ user_id: state.user.id, display_name: d.prenom.trim(), classe: d.classe, school_year: year, daily_goal_kind: d.kind, daily_goal_value: d.value, theme: d.theme, onboarded_at: new Date().toISOString() }, d.remind ? { reminder_time: d.rtime } : {}));
        if (up.error) { $("next").disabled = false; return fail(up.error, "Enregistrement impossible"); }
        const rows = [...d.matieres].map((m, i) => { const e = d.exams[m] || {}; return { name: m, color: colorFor(m, i), school_year: year, exam_date: e.free ? null : (e.date || null) }; });
        if (rows.length) {
          const ins = await sb.from("subjects").insert(rows).select("id,name"); if (ins.error) fail(ins.error, "Matières non créées");
          for (const s of (ins.data || [])) { const e = d.exams[s.name]; if (e && e.free) await saveExam(s.id, e); }
        }
        await loadAll(); tutorial();
      };
    }
    draw();
  }

  const TABS = [["accueil", "Accueil", "home"], ["matieres", "Matières", "subj"], ["calendrier", "Planning", "day"], ["exos", "Prof", "prof"], ["progres", "Progrès", "chart"], ["reglages", "Réglages", "gear"]];
  function drawTabs(current) {
    tabs.hidden = false;
    const due = state.cards ? dueCards(state.cards).length : 0, st = state.sessions ? streak() : 0;
    tabs.innerHTML = `<div class="logo side">${esc(C.NOM_APPLI)}<b>.</b></div>` + TABS.map(t => `<a href="#${t[0]}"${t[0] === current ? ' aria-current="page"' : ""}>${I[t[2]]}<span>${t[1]}</span></a>`).join("")
      + `<div class="sidefoot"><button class="sidemusic" data-qs>${I.search}<span>Rechercher</span><kbd>Ctrl K</kbd></button><button class="sidemusic" data-pomo>${I.clock}<span>Pomodoro</span></button>${LOFI.length ? `<button class="sidemusic${music.on ? " on" : ""}" data-music>${I.listen}<span>Musique de fond</span></button>` : ""}<div class="sidecard"><b>${due ? plural(due, "carte", "cartes") + " à revoir" : "Tu es à jour"}</b><span>${st ? plural(st, "jour", "jours") + " d'affilée" : "Commence ta série aujourd'hui"}</span>${due ? '<button class="btn sm" id="sidego">Réviser</button>' : ""}</div></div>`;
    const g = document.getElementById("sidego"); if (g) g.onclick = () => { location.hash = "#cartes-jour"; };
    // Pastille sur l'icône de l'appli installée : nombre de cartes à revoir.
    try { if (navigator.setAppBadge) { if (due) navigator.setAppBadge(due).catch(() => {}); else navigator.clearAppBadge().catch(() => {}); } } catch (e) { /* non géré */ }
  }
  // Musique de fond (lofi) : un seul lecteur pour toute l'appli, qui démarre à une minute tirée au hasard.
  // Musique de fond : un fichier par morceau. On démarre toujours au DÉBUT d'un morceau tiré au hasard, puis l'ordre est mélangé.
  const LOFI = (C.LOFI || []).filter(p => p && p.tracks && p.tracks.length);
  const music = { el: null, i: -1, on: false, err: "", order: [], pos: 0 };
  const trackOf = (i, k) => { const t = LOFI[i] && LOFI[i].tracks[k]; return t ? { f: "audio/" + t[0] + ".mp3", t: t[1] || "Lofi de Noël", a: t[2] || "" } : null; };
  const curTrack = () => music.order.length ? trackOf(music.i, music.order[music.pos]) : null;
  const nextTrack = () => music.order.length ? trackOf(music.i, music.order[(music.pos + 1) % music.order.length]) : null;
  function musicLoad() {
    const a = music.el, t = curTrack(); if (!t) return;
    a.src = t.f; music.err = "";
    try { if ("mediaSession" in navigator) { navigator.mediaSession.metadata = new MediaMetadata({ title: t.t, artist: t.a || LOFI[music.i].nom, album: LOFI[music.i].nom + " · Merge." }); } } catch (e) { /* pas de lecteur système */ }
  }
  function musicEl() {
    if (music.el) return music.el;
    const a = music.el = new Audio(); a.preload = "auto"; a.volume = Math.min(1, Math.max(0, parseFloat(safeGet("merge.lofivol")) || 0.4));
    a.onerror = () => { if (!music.on) return; music.fails = (music.fails || 0) + 1; if (music.fails < 3) return musicNext(); music.on = false; music.err = "Cette musique n'est pas disponible pour l'instant. Vérifie ta connexion."; musicPaint(); };
    a.onplaying = () => { music.fails = 0; };
    a.onended = () => { if (music.on) musicNext(); };
    a.ontimeupdate = () => { const b = document.getElementById("mprog"); if (b && isFinite(a.duration) && a.duration) b.style.width = (a.currentTime / a.duration * 100).toFixed(1) + "%"; };
    try { if ("mediaSession" in navigator) { navigator.mediaSession.setActionHandler("play", () => musicPlay(music.i)); navigator.mediaSession.setActionHandler("pause", musicStop); navigator.mediaSession.setActionHandler("nexttrack", musicNext); } } catch (e) { /* non géré */ }
    return a;
  }
  function musicGo() {
    const a = musicEl(); music.on = true; musicPaint();
    const pr = a.play(); if (pr && pr.then) pr.then(() => { safeSet("merge.lofi", String(music.i)); }).catch(() => { music.on = false; music.err = music.err || "Lecture impossible. Touche lecture encore une fois."; musicPaint(); });
  }
  // i : liste (Lofi, Christmas Lofi). Même liste et déjà chargée : reprend là où on s'était arrêté.
  function musicPlay(i) {
    if (!LOFI[i]) i = 0; if (!LOFI[i]) return; musicEl();
    if (music.i !== i || !music.order.length || !music.el.src) {
      music.i = i; music.order = shuffle(LOFI[i].tracks.map((_, k) => k)); music.pos = 0; musicLoad();
    }
    musicGo();
  }
  window.__mergeMusic = () => music.el ? { src: music.el.src, t: music.el.currentTime, on: music.on } : null;
  function musicNext() { if (!music.order.length) return musicPlay(music.i < 0 ? 0 : music.i); music.pos = (music.pos + 1) % music.order.length; musicLoad(); musicGo(); }
  function musicStop() { if (music.el) music.el.pause(); music.on = false; musicPaint(); }
  function musicPaint() {
    document.querySelectorAll("[data-music]").forEach(b => b.classList.toggle("on", music.on));
    const box = document.getElementById("musicbox"); if (!box) return;
    const sel = music.i >= 0 ? music.i : Math.max(0, Math.min(LOFI.length - 1, parseInt(safeGet("merge.lofi"), 10) || 0)), t = music.i === sel ? curTrack() : null, n = music.i === sel ? nextTrack() : null;
    box.innerHTML = `<div class="chips" role="group" aria-label="Ambiance">${LOFI.map((p, i) => `<button class="chip" data-pl="${i}" aria-pressed="${i === sel}">${esc(p.nom)}</button>`).join("")}</div>
      ${(() => { const im = LOFI[sel].images || [], k = music.order.length && music.i === sel ? music.order[music.pos] : 0; return im.length ? `<div class="np-art${music.on ? " on" : ""}" aria-hidden="true"><img src="images/lofi/${esc(im[k % im.length])}.jpg" alt="" decoding="async"></div>` : ""; })()}
      <div class="nowplay card pad stack"><span class="small muted">${music.on ? "En lecture" : t ? "En pause" : esc(LOFI[sel].nom) + " · " + plural(LOFI[sel].tracks.length, "morceau", "morceaux")}</span>
        <b class="np-t">${t ? esc(t.t) : "Un morceau au hasard"}</b><span class="muted np-a">${t ? esc(t.a || LOFI[sel].nom) : "Toujours depuis le début du morceau"}</span>
        <div class="np-bar"><i id="mprog" style="width:${t && music.el && music.el.duration ? (music.el.currentTime / music.el.duration * 100).toFixed(1) : 0}%"></i></div>
        <div class="row np-ctl"><button class="iconbtn big" id="mplay" aria-label="${music.on ? "Pause" : "Lecture"}">${music.on ? I.pause : I.play}</button><button class="iconbtn" id="mnext" aria-label="Morceau suivant">${I.next}</button>
        ${n ? `<p class="small muted grow np-n">Ensuite : ${esc(n.t)}${n.a ? " · " + esc(n.a) : ""}</p>` : ""}</div></div>`;
    box.querySelectorAll("[data-pl]").forEach(b => b.onclick = () => { const i = +b.dataset.pl; if (i !== music.i) { if (music.el) music.el.pause(); music.order = []; musicPlay(i); } });
    $("mplay").onclick = () => { if (music.on) musicStop(); else musicPlay(sel); };
    $("mnext").onclick = () => { if (music.i !== sel || !music.order.length) musicPlay(sel); else musicNext(); };
    const m = document.getElementById("musicmsg"); if (m) m.textContent = music.err || "";
  }
  function musicSheet() {
    sheet(`<div class="row"><span class="mico big">${I.listen}</span><h1>Musique de fond</h1></div><div class="stack" id="musicbox"></div><p class="note" id="musicmsg" role="status"></p><div class="row"><label class="small muted" for="mvol">Volume</label><input id="mvol" class="grow" type="range" min="0" max="1" step="0.05" value="${music.el ? music.el.volume : (parseFloat(safeGet("merge.lofivol")) || 0.4)}"></div><button class="btn ghost" data-close>Fermer</button>`,
      (el) => { musicPaint(); el.querySelector("#mvol").oninput = (e) => { safeSet("merge.lofivol", e.target.value); if (music.el) music.el.volume = +e.target.value; }; });
  }
  const musicBtn = () => LOFI.length ? `<button class="iconbtn flat musicbtn${music.on ? " on" : ""}" data-music aria-label="Musique de fond">${I.listen}</button>` : "";
  document.addEventListener("click", e => { if (e.target.closest && e.target.closest("[data-music]")) musicSheet(); });

  // Petite fenêtre par-dessus l'écran (explication d'un mode, etc.).
  function closeSheet() { const el = document.getElementById("sheet"); if (el) el.remove(); }
  function sheet(html, wire) {
    closeSheet(); const el = document.createElement("div"); el.className = "sheetwrap"; el.id = "sheet";
    // Bouton Fermer en haut à droite de chaque fenêtre (plus besoin de toucher à côté).
    el.innerHTML = `<div class="sheet card" role="dialog" aria-modal="true"><button class="iconbtn flat sheetx" data-close aria-label="Fermer">${I.x}</button>${html}</div>`;
    el.onclick = e => { if (e.target === el || e.target.closest("[data-close]")) closeSheet(); };
    document.body.appendChild(el); if (wire) wire(el); const f = el.querySelector("a.btn,button.btn"); if (f) f.focus();
  }
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); });

