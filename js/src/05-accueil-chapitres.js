  // ---------- accueil ----------
  let homeQuota = null, homeQuotaAt = 0;
  function screenHome() {
    drawTabs("accueil");
    const p = state.profile, due = dueCards(state.cards).length, st = streak();
    const today = state.sessions.find(s => s.day === localDay()) || { seconds: 0, cards_reviewed: 0 };
    const doneVal = p.daily_goal_kind === "minutes" ? Math.floor(today.seconds / 60) : today.cards_reviewed;
    const unit = p.daily_goal_kind === "minutes" ? "min" : "cartes";
    const week = lastDays(7, state.sessions);
    const ups = upCtrls();
    const yearNow = new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1, newYear = p.school_year && p.school_year < yearNow;
    app.innerHTML = `<div class="row between"><div class="logo">${esc(C.NOM_APPLI)}<b>.</b></div><span class="grow"></span><span class="homemusic"><button class="iconbtn flat" data-qs aria-label="Recherche rapide">${I.search}</button><button class="iconbtn flat" data-pomo aria-label="Pomodoro">${I.clock}</button>${musicBtn()}</span><a class="coinpill" href="#boutique" aria-label="${plural(coinsInfo().balance, "pièce", "pièces")} : ouvrir la boutique">${I.coin}${coinsInfo().balance}</a>${state.offline ? '<span class="pill warn">Hors ligne</span>' : st ? `<span class="streak" title="${plural(st, "jour", "jours")} d'affilée">${plural(st, "jour", "jours")}<span class="stl">&nbsp;d'affilée</span></span>` : `<span class="pill">${esc(p.classe || "")}</span>`}</div>
      <div class="hello"><div class="row">${MASCOT((rwEquipped("mascotte") || {}).v || "")}<h1 class="grow">Salut ${esc(p.display_name || "")}${rwEquipped("titre") && rwEquipped("titre").id !== "t-novice" && rwName(rwEquipped("titre")) ? ` <span class="rwtitle">${esc(rwName(rwEquipped("titre")))}</span>` : ""}</h1>${!state.offline && st ? `<span class="streak hstreak" title="${plural(st, "jour", "jours")} d'affilée">${plural(st, "jour", "jours")}</span>` : ""}</div></div>
      <div class="dash dash2">${missionHtml(due, doneVal, unit, st)}${nextCtrlHtml(ups)}</div>
      <div class="hintlist">${betsToSettle().map(b => `<div class="banner bethint"><div><h2>Ta note en ${esc(b.sname)} ?</h2><p class="small">Contrôle du ${esc(fmtDate(b.d))} : entre ta note pour régler ton pari (${plural(b.stake, "pièce", "pièces")}).</p></div><button class="btn sm" data-bnote="${b.id}">Entrer ma note</button></div>`).join("")}${(() => { const tn = new Date().getHours() >= 15 ? tonightSuggestion() : null; return tn ? `<div class="banner"><div><h2>Ce soir</h2><p class="small">Demain tu as ${tn.subs.map(x => esc(x.name)).join(", ")}. Un petit tour avant ?</p></div><a class="btn sm" href="#revision-${tn.subs[0].id}">Réviser ${esc(tn.subs[0].name)}</a></div>` : ""; })()}${resumeHtml()}${nowTaskHtml()}${[0, 1].includes(new Date().getDay()) && state.sessions.length && safeGet("merge.bilanseen") !== localDay(mondayOf(new Date())) ? `<div class="banner"><div><h2>Ton bilan de la semaine est prêt</h2><p class="small">Ce que tu as fait, et ton objectif pour la suite.</p></div><a class="btn sm" href="#bilan">Voir</a></div>` : ""}${newYear ? `<div class="banner"><div><h2>Nouvelle année scolaire</h2><p class="small">Tu passes en quelle classe ? Mets ta classe à jour dans Réglages.</p></div><a class="btn sm" href="#reglages">Mettre à jour</a></div>` : ""}</div>
      ${homeSubjectsHtml()}
      ${weekHtml(week, p)}
      ${planTodayHtml()}${installHtml()}
      ${state.subjects.length ? "" : `<div class="card pad stack"><h2>Commence par une matière</h2><p class="small muted">Crée ta première matière, puis importe ton cours pour avoir tes cartes.</p><a class="btn" href="#nouvelle-matiere">Ajouter une matière</a></div>`}`;
    app.querySelectorAll("[data-bnote]").forEach(b => b.onclick = () => betNoteSheet(b.dataset.bnote, screenHome));
    if ($("insb")) { $("insb").onclick = installSheet; $("insno").onclick = () => { safeSet("merge.noinstall", "1"); screenHome(); }; }
    celebrate();
    nowTaskTick();
  }

  // Accueil, design A « Mission du jour » (16 nov.) : l'objectif du jour en anneau, la série, un seul gros bouton pour continuer,
  // le prochain contrôle avec « Prêt à N % », puis les matières en tuiles. Le reste (semaine, plan du jour…) en dessous.
  function missionHtml(due, doneVal, unit, st) {
    const p = state.profile, goal = Math.max(1, +p.daily_goal_value || 1), pct = Math.min(100, Math.round(doneVal / goal * 100));
    const extra = due - state.cards.filter(fsrsDue).length, mins = Math.max(1, Math.round(due * 0.5));
    return `<div class="card today mission"><div class="mtop"><div class="ring mring" style="--p:${pct}"><b>${doneVal}/${goal}</b></div><div class="grow"><h2>${pct >= 100 ? "Objectif du jour atteint" : "À réviser aujourd'hui"}</h2><p class="small muted">${pct >= 100 ? "Objectif atteint, bravo." : `${doneVal} ${unit} sur ${goal}`}</p><p class="mstreak${st ? " on" : ""}">${I.bolt}${st ? plural(st, "jour", "jours") + " d'affilée" : "Révise aujourd'hui pour lancer ta série"}</p></div></div>
      ${due ? `<a class="btn mgo" href="#cartes-jour">${I.play}<span class="mgot"><b>Réviser</b><span>${plural(due, "carte", "cartes")} · environ ${mins} min</span></span></a>${extra > 0 ? `<p class="small muted">dont ${extra} pour ton prochain contrôle</p>` : ""}`
        : `<p class="small muted"><span class="big">0 carte</span> à revoir : ${state.cards.length ? "tu es à jour." : "importe un cours pour avoir tes cartes."}</p>`}
      ${state.cards.length > 3 ? `<details class="moreways"><summary class="btn ghost">${due ? "Autres façons de réviser" : "Réviser quand même"}</summary><div class="stack"><a class="btn ghost mixbtn" href="#melange">Révision mélangée<span class="small">${state.subjects.some(x => x.exam_date && daysUntil(x.exam_date) >= 0) ? "priorité aux contrôles proches" : "toutes tes matières"}</span></a><a class="btn ghost mixbtn" href="#perso">Choisir quoi réviser<span class="small">matières, dossiers ou chapitres au choix</span></a></div></details>` : ""}</div>`;
  }
  // Prochain contrôle : la matière, J-x, et « Prêt à N % » (maîtrise des chapitres du contrôle, ou de toute la matière).
  function nextCtrlHtml(ups) {
    const head = `<div class="row between"><span class="small muted">Prochains contrôles</span><a class="linkbtn" href="#mois">Calendrier</a></div>`;
    if (!ups.length) return `<div class="card pad stack upnext">${head}<p class="muted small">Aucun contrôle prévu. Place une date dans le calendrier pour avoir un plan de révision.</p></div>`;
    const { c, s: x } = ups[0], ids = c.ch && c.ch.length ? c.ch : state.chapters.filter(k => k.subject_id === x.id).map(k => k.id);
    const ready = mastery(state.cards.filter(k => ids.includes(k.chapter_id))), ic = subjIcon(x.name);
    return `<div class="card pad stack upnext">${head}
      <a class="nexam" href="#matiere-${x.id}" style="--c:${esc(x.color)}"><span class="hsico">${ic || esc(x.name.slice(0, 2).toUpperCase())}</span><span class="grow"><b>${esc(x.name)}</b><span class="small muted">${esc(fmtDate(c.d))}${c.ch && c.ch.length ? " · " + plural(c.ch.length, "chapitre", "chapitres") : ""}</span></span><span class="jx">${jx(c.d)}</span></a>
      <div class="row"><div class="bar grow"><i style="width:${ready}%"></i></div><span class="small"><b>${ready ? `Prêt à ${ready} %` : "À commencer"}</b></span></div>
      <a class="btn ghost" href="#revision-${x.id}">Réviser ce contrôle</a>
      ${ups.slice(1, 4).map(({ c: c2, s: y }) => `<a class="exam" href="#matiere-${y.id}" style="--c:${esc(y.color)}"><span class="jx">${jx(c2.d)}</span><span class="grow"><b>${esc(y.name)}</b><span class="small muted">${esc(fmtDate(c2.d))}</span></span></a>`).join("")}</div>`;
  }
  // Matières en tuiles : icône (ou initiales), nom, maîtrise. 6 au plus, puis « Toutes les matières ».
  function homeSubjectsHtml() {
    const subs = state.subjects.filter(x => !x.archived);
    if (!subs.length) return "";
    const tile = x => { const ids = state.chapters.filter(k => k.subject_id === x.id).map(k => k.id), m = mastery(state.cards.filter(k => ids.includes(k.chapter_id))), ic = subjIcon(x.name); return `<a class="hsub" href="#matiere-${x.id}" style="--c:${esc(x.color)}"><span class="hsico">${ic || esc(x.name.slice(0, 2).toUpperCase())}</span><b>${esc(x.name)}</b><span class="small muted">${m} %</span></a>`; };
    return `<div class="stack"><div class="row between"><h2>Mes matières</h2>${subs.length > 6 ? `<a class="linkbtn" href="#matieres">Tout voir</a>` : ""}</div><div class="hsubs">${subs.slice(0, 6).map(tile).join("")}</div></div>`;
  }

  function formSubject() {
    tabs.hidden = true;
    const ex = { date: null, free: false };
    app.innerHTML = `<div class="row"><button class="iconbtn" id="fsback" aria-label="Retour">${I.back}</button></div><h1>Nouvelle matière</h1>
      <div class="field"><label for="sname">Nom</label><input id="sname" type="text" maxlength="60" placeholder="Ex. SVT" list="snames"><datalist id="snames">${matieresFor((state.profile || {}).classe).filter(m => !state.subjects.some(x => x.name.toLowerCase() === m.toLowerCase())).map(m => `<option value="${esc(m)}">`).join("")}</datalist></div>
      <div class="field"><span class="label">Couleur</span><div id="fcol">${colorPick(null)}</div></div>
      <div class="field"><span class="label">Date du prochain contrôle</span><div id="pick"></div></div>
      <button class="btn" id="save">Créer la matière</button>`;
    examPicker($("pick"), ex, v => Object.assign(ex, v));
    $("fsback").onclick = () => { if (history.length > 1) history.back(); else location.hash = "#matieres"; };
    let fcol = null; wireColor($("fcol"), c => { fcol = c; });
    $("save").onclick = async () => {
      const name = $("sname").value.trim(); if (!name) return toast("Donne un nom à la matière.");
      $("save").disabled = true;
      const { data, error } = await sb.from("subjects").insert({ name, color: fcol || colorFor(name, state.subjects.length), exam_date: ex.free ? null : ex.date }).select("id").single();
      if (error) { $("save").disabled = false; return fail(error, "Création impossible"); }
      if (ex.free && data) await saveExam(data.id, ex);
      await loadAll(); location.hash = data ? "#matiere-" + data.id : "#matieres";
    };
  }

  function examPill(s) { const j = daysUntil(s.exam_date); return isFree(s) ? '<span class="pill">Révision libre</span>' : j != null && j >= 0 ? `<span class="pill">${j === 0 ? "Contrôle aujourd'hui" : "Contrôle dans " + plural(j, "jour", "jours")}</span>` : '<span class="pill ghostpill">Aucune date</span>'; }
  function chapterRow(c, color) { const cs = cardsOf(c.id); return `<a class="card subject" style="--c:${esc(okColor(c.color) ? c.color : color)}" href="#chapitre-${c.id}"><div class="row between"><b>${esc(c.name)}${c.auto_name ? '<span class="small muted" style="display:block;font-weight:600">Le nom viendra de ton cours</span>' : ""}</b><span class="pill">${cs.length ? plural(cs.length, "carte", "cartes") : "À importer"}</span></div>${cs.length ? `<div class="row"><div class="bar grow"><i style="width:${mastery(cs)}%"></i></div><span class="small muted">${mastery(cs)} %</span></div>` : ""}</a>`; }
  // Champ « Nouveau chapitre » avec la case « Nom choisi automatiquement » (le nom vient du cours importé, voir studio/titre.mjs).
  const AUTO_NAME = "Nouveau chapitre";
  // Fenêtre claire (16 nov.) : le nom, la case « nom automatique », puis UN gros bouton « Créer le chapitre » (avant, un petit « + »
  // à côté du champ qu'on ne voyait pas). Les dossiers, peu utilisés, sont un simple lien discret en dessous.
  const chapterField = (label, ph) => `<div class="field"><label for="cname">${label}</label><input id="cname" type="text" maxlength="80" placeholder="${ph}" enterkeyhint="done"></div>
      <button type="button" class="switch" role="switch" id="cauto" aria-checked="false"><i></i><span>Nom choisi automatiquement d'après le cours</span></button>
      <button class="btn big" id="addCh">${I.plus}<span id="addChTxt">Créer le chapitre</span></button>`;
  function wireChapterField(subjectId, groupId) {
    const inp = $("cname"), sw = $("cauto"), ph = inp.placeholder;
    sw.onclick = () => { const on = sw.getAttribute("aria-checked") !== "true"; sw.setAttribute("aria-checked", on); inp.disabled = on; if (on) inp.value = ""; inp.placeholder = on ? "Le nom viendra de ton cours" : ph; $("addChTxt").textContent = on ? "Créer et importer mon cours" : "Créer le chapitre"; if (!on) inp.focus(); };
    $("addCh").onclick = () => addChapter(inp.value.trim(), subjectId, groupId, sw.getAttribute("aria-checked") === "true");
    inp.onkeydown = e => { if (e.key === "Enter") $("addCh").click(); };
  }
  async function addChapter(name, subjectId, groupId, auto) {
    if (!name && !auto) { toast("Donne un nom au chapitre, ou coche « Nom choisi automatiquement »."); return; }
    const row = { name: auto ? AUTO_NAME : name, subject_id: subjectId, cards_target: C.CARTES_PAR_DEFAUT }; if (groupId) row.group_id = groupId; if (auto) row.auto_name = true;
    const { data, error } = await sb.from("chapters").insert(row).select("id").single();
    if (error) return fail(error, "Chapitre non créé");
    // Nom automatique : on va directement à l'import, puisque le nom vient du cours.
    await loadAll(); location.hash = (auto ? "#import-" : "#chapitre-") + data.id;
  }

  function screenSubject(id, openPicker) {
    const s = state.subjects.find(x => x.id === id); if (!s) { location.hash = "#accueil"; return; }
    drawTabs("matieres"); // barre du bas visible : on peut revenir à l'accueil d'un geste
    const chs = state.chapters.filter(c => c.subject_id === id), groups = state.groups.filter(g => g.subject_id === id), loose = chs.filter(c => !groups.some(g => g.id === c.group_id));
    // Matière, design E « Plan de révision » (choisi par Ramzi, 17 nov.) : en haut ce qu'il faut réviser aujourd'hui (le chapitre
    // le moins maîtrisé qui a des cartes à revoir) avec un gros bouton « Réviser » ; les contrôles en lignes compactes ; les chapitres
    // du moins au plus maîtrisé juste après ; puis 4 tuiles égales (toute la matière, dossiers, méthode, vrais sujets) ; les contrôles
    // en petit tout en bas (on les ajoute surtout depuis le calendrier ou le planning). Revu le 17 nov. à la demande de Ramzi.
    const ups = isFree(s) ? [] : ctrlsOf(id).filter(c => c.d >= localDay()), ic = subjIcon(s.name);
    const info = chs.map(c => { const cs = cardsOf(c.id); return { c, n: cs.length, m: cs.length ? mastery(cs) : -1, due: cs.filter(fsrsDue).length }; });
    const todo = info.filter(x => x.n && x.due).sort((x, y) => x.m - y.m || y.due - x.due)[0] || info.filter(x => x.n && x.m < 100).sort((x, y) => x.m - y.m)[0];
    const sorted = info.slice().sort((x, y) => (x.n ? x.m : 1000) - (y.n ? y.m : 1000));
    const tone = m => m < 0 ? "none" : m < 30 ? "low" : m < 70 ? "mid" : "high";
    const gname = c => { const g = groups.find(x => x.id === c.group_id); return g ? g.name : ""; };
    const head = isFree(s) ? "Révision libre" : ups.length ? (daysUntil(ups[0].d) === 0 ? "Contrôle aujourd'hui" : `Contrôle dans ${plural(daysUntil(ups[0].d), "jour", "jours")}`) : "Pas de contrôle prévu";
    app.innerHTML = `<div class="row"><a class="iconbtn" href="#matieres" aria-label="Retour aux matières">${I.back}</a><span class="grow"></span><button class="iconbtn flat" id="sSet" aria-label="Réglages et outils de la matière" title="Réglages">${I.gear}</button></div>
      <div class="subhead" style="--c:${esc(s.color)}"><span class="hsico big">${ic || esc(s.name.slice(0, 2).toUpperCase())}</span><div class="grow" style="min-width:0"><h1>${esc(s.name)}</h1><p class="small muted">${head} · ${plural(chs.length, "chapitre", "chapitres")}</p></div></div>
      ${todo ? `<div class="card todaycard"><span class="small">À réviser aujourd'hui</span><b>${esc(todo.c.name)}</b><span class="small">${todo.due ? plural(todo.due, "carte à revoir", "cartes à revoir") : "Entraînement"} · ${Math.max(0, todo.m)} % maîtrisé</span><a class="btn todogo" href="#cartes-${todo.c.id}">${I.play}<b>Réviser</b></a>${chs.filter(c => cardsOf(c.id).length).length > 1 ? `<a class="revall" href="#revision-${id}">${I.cards}Ou réviser toute la matière (${chs.filter(c => cardsOf(c.id).length).length} chapitres)</a>` : ""}</div>` : ""}
      <div class="stack"><div class="row between"><h2>Chapitres</h2><span class="row" style="gap:8px"><button class="btn sm ghost" id="addG" aria-expanded="false" title="Ranger les chapitres dans des dossiers">${I.folder}<span class="hidexs">Dossiers</span></button><button class="btn sm" id="sAdd" aria-label="Ajouter un chapitre" title="Ajouter un chapitre">${I.plus}Nouveau</button></span></div>
        ${sorted.length ? `<p class="small muted" style="margin:0">Du moins au plus maîtrisé : commence par le haut.</p><div class="chlist">${sorted.map(x => `<a class="chline" href="#chapitre-${x.c.id}"><span class="mpill ${tone(x.m)}">${x.n ? x.m + " %" : "–"}</span><span class="grow" style="min-width:0"><b>${esc(x.c.name)}</b><span class="small muted">${x.n ? plural(x.n, "carte", "cartes") : x.c.auto_name ? "Le nom viendra de ton cours" : "Cours à importer"}${gname(x.c) ? " · " + esc(gname(x.c)) : ""}</span></span>${x.due ? `<span class="pill">${x.due} à revoir</span>` : ""}<span class="chev">${I.back}</span></a>`).join("")}</div>` : `<p class="muted">Aucun chapitre pour l'instant.</p>`}
        ${sorted.length ? "" : `<button class="addline" id="sAdd2">${I.plus}Nouveau chapitre</button>`}
        </div>
      ${groups.length ? `<div class="foldline">${groups.map(g => { const gc = chs.filter(c => c.group_id === g.id); return `<a class="folder" style="--c:${esc(okColor(g.color) ? g.color : s.color)}" href="#dossier-${g.id}">${I.folder}${esc(g.name)} · ${gc.length}</a>`; }).join("")}</div>` : ""}
      <div id="gform"></div>
      <div class="stack"><h3 class="chsec">Pour l'examen</h3><div class="exlist">
        <a class="exline" href="#methode-${id}"><span class="mico">${I.steps}</span><span class="grow"><b>Fiche méthode</b><span class="small muted">Comment on réussit un devoir de ${esc(plainName(s.name))}</span></span><span class="chev">${I.back}</span></a>
        <a class="exline" href="#bac-${id}"><span class="mico">${I.book}</span><span class="grow"><b>Vrais sujets d'examen</b><span class="small muted">Annales officielles, corrigées</span></span><span class="chev">${I.back}</span></a>
      </div></div>
      <div class="stack ctrlbox small2" style="--c:${esc(s.color)}"><div class="row between"><h3>Contrôles</h3><button class="linkbtn" id="ctAdd" aria-expanded="${!!openPicker}">${I.plus}Ajouter un contrôle</button></div><div id="examBox"></div>
        ${isFree(s) ? '<p class="small muted">Révision libre : pas de contrôle prévu, tu avances à ton rythme.</p>' : ups.length ? ups.map(c => `<div class="ctrlrow"><span class="jx">${jx(c.d)}</span><span class="grow" style="min-width:0"><b class="ctdate">${esc(fmtDate(c.d))}</b><span class="small muted ctsub">${c.ch && c.ch.length ? esc(chs.filter(y => c.ch.includes(y.id)).map(y => y.name).join(", ")) : "Tous les chapitres"}</span></span><button class="btn sm ghost${betOf(c.id) ? " beton" : ""}" data-bet="${c.id}" aria-label="${betOf(c.id) ? "Ton pari : " + noteTxt(betOf(c.id).goal) + " sur 20, " + betOf(c.id).stake + " pièces" : "Parier des pièces sur ta note"}">${I.coin}${betOf(c.id) ? noteTxt(betOf(c.id).goal) + "/20" : '<span class="hidesm">Parier</span>'}</button><button class="btn sm ghost" data-cch="${c.id}" aria-label="Chapitres du contrôle">${I.book}<span class="hidesm">Chapitres</span></button><button class="btn sm ghost softdel" data-cdel="${c.id}" aria-label="Retirer le contrôle du ${esc(fmtDate(c.d))}">${I.trash}<span class="hidesm">Retirer</span></button></div>`).join("") : ''}
        ${(() => { const past = bets().filter(b => b.s === id && b.d < localDay()).sort((a, b) => b.d.localeCompare(a.d)).slice(0, 6); return past.length ? `<details class="pastctl"${past.some(b => b.note == null) ? " open" : ""}><summary>Contrôles passés${past.some(b => b.note == null) ? ` · <b>${past.filter(b => b.note == null).length} note à entrer</b>` : ""}</summary>${past.map(b => `<div class="ctrlrow past"><span class="grow" style="min-width:0"><b>${esc(fmtDate(b.d))}</b><span class="small muted">Visé ${noteTxt(b.goal)}/20 · ${plural(b.stake, "pièce", "pièces")} misées${b.note != null ? ` · eu ${noteTxt(b.note)} → ${betBack(b, b.note) - b.stake >= 0 ? "+" : ""}${betBack(b, b.note) - b.stake} pièces` : ""}</span></span>${b.note == null ? `<button class="btn sm" data-bnote="${b.id}">Entrer ma note</button>` : `<span class="pill ${b.note >= b.goal ? "ok" : ""}">${b.note >= b.goal ? "Gagné" : "Raté"}</span>`}</div>`).join("")}</details>` : ""; })()}
        ${ups.length ? "" : `<button type="button" class="switch sm" role="switch" aria-checked="${isFree(s)}" id="ctFree"><i></i><span>${isFree(s) ? "Révision libre (pas de contrôle)" : "Aucun contrôle prévu · révision libre"}</span></button>`}</div>
      <div id="stools">${subjectToolsHtml(s, chs)}</div>`;
    // Contrôles : « Ajouter un contrôle » ouvre le calendrier ; un jour touché crée le contrôle puis demande ses chapitres.
    const openExam = () => { examPicker($("examBox"), { date: null, free: false }, async v => { if (!v.date) return; const c = await ctrlAdd(id, v.date); $("examBox").innerHTML = ""; if (!c) return toast("Il y a déjà un contrôle ce jour-là."); screenSubject(id); ctrlChSheet(c.id, () => screenSubject(id)); }, true); };
    if (openPicker) openExam();
    $("ctAdd").onclick = () => { if ($("examBox").innerHTML) { $("examBox").innerHTML = ""; $("ctAdd").setAttribute("aria-expanded", "false"); } else { openExam(); $("ctAdd").setAttribute("aria-expanded", "true"); } };
    app.querySelectorAll("[data-cch]").forEach(b => b.onclick = () => ctrlChSheet(b.dataset.cch, () => screenSubject(id)));
    app.querySelectorAll("[data-bet]").forEach(b => b.onclick = () => betSheet(b.dataset.bet, () => screenSubject(id)));
    app.querySelectorAll("[data-bnote]").forEach(b => b.onclick = () => betNoteSheet(b.dataset.bnote, () => screenSubject(id)));
    app.querySelectorAll("[data-cdel]").forEach(b => b.onclick = async () => { if (!(await askConfirm("Supprimer ce contrôle ?", "Il disparaîtra du calendrier et du planning."))) return; await ctrlDel(b.dataset.cdel); toast("Contrôle supprimé."); screenSubject(id); });
    if ($("ctFree")) $("ctFree").onclick = async () => { const err = await saveExam(id, { date: null, free: !isFree(s) }); if (err) return fail(err, "Réglage non enregistré"); await ctrlSync(); toast(isFree(s) ? "Révision libre activée." : "Révision libre désactivée."); screenSubject(id); };
    $("addG").onclick = () => {
      if ($("gform").innerHTML) { $("gform").innerHTML = ""; $("addG").setAttribute("aria-expanded", "false"); return; }
      $("addG").setAttribute("aria-expanded", "true");
      $("gform").innerHTML = `<div class="field"><label for="gname">Nom du dossier</label><div class="row"><input id="gname" type="text" maxlength="80" placeholder="Ex. Thème 1 : Génétique"><button class="btn" id="gsave">Créer</button></div></div>`;
      $("gname").focus();
      $("gsave").onclick = async () => {
        const name = $("gname").value.trim(); if (!name) return toast("Donne un nom au dossier.");
        const { error } = await sb.from("groups").insert({ name, subject_id: id }); if (error) return fail(error, "Dossier non créé");
        await loadAll(); screenSubject(id); toast("Dossier créé.");
      };
    };
    $("sAdd").onclick = () => sheet(`<div class="row"><span class="mico big">${I.plus}</span><h1>Nouveau chapitre</h1></div>${chapterField("Nom du chapitre", "Ex. Les ondes mécaniques")}<button class="linkbtn addfolder" id="sAddG">${I.folder || I.plus}Ou créer un dossier pour ranger tes chapitres</button>`, () => {
      wireChapterField(id, null); setTimeout(() => { const c = $("cname"); if (c && matchMedia("(pointer:fine)").matches) c.focus(); }, 50);
      $("sAddG").onclick = () => { closeSheet(); $("addG").click(); $("gform").scrollIntoView({ block: "center", behavior: "smooth" }); };
    });
    $("sSet").onclick = () => sheet(subjectSettingsHtml(s), () => wireSubjectTools(s));
    if ($("sAdd2")) $("sAdd2").onclick = () => $("sAdd").click();
  }

  // ---------- dossier (sous-catégorie) : onglets Résumés, Flashcards, Quiz, Contrôles ----------
  let groupTab = "chapitres"; // onglet ouvert en arrivant dans un dossier : la liste des chapitres
  async function screenGroup(id) {
    const g = state.groups.find(x => x.id === id); if (!g) { location.hash = "#matieres"; return; }
    drawTabs("matieres"); // barre du bas visible : on peut revenir à l'accueil d'un geste
    const s = state.subjects.find(x => x.id === g.subject_id) || { id: "", name: "", color: "#888" }, here = location.hash;
    const chs = state.chapters.filter(c => c.group_id === id), sums = new Set();
    if (chs.length && !state.offline) { try { const r = await sb.from("summaries").select("chapter_id").in("chapter_id", chs.map(c => c.id)); (r.data || []).forEach(x => sums.add(x.chapter_id)); } catch (e) { /* liste sans résumés */ } }
    if (location.hash !== here) return;
    const TABS_G = [["chapitres", "Chapitres"], ["resumes", "Résumés"], ["cartes", "Flashcards"], ["quiz", "Quiz"], ["controles", "Contrôles"]];
    const row = (href, icon, title, sub, c, locked) => `<div class="card rowlink${locked ? " locked" : ""}">${locked ? `<div class="main">${icon}<span><b>${esc(title)}</b><span class="small muted">${sub}</span></span></div>` : `<a class="main" href="${href}">${icon}<span><b>${esc(title)}</b><span class="small muted">${sub}</span></span></a>`}<a class="mini" href="#chapitre-${c.id}" aria-label="Ouvrir le chapitre ${esc(c.name)}">Chapitre</a></div>`;
    function list() {
      if (!chs.length) return '<p class="muted">Ce dossier est vide. Ajoute ton premier chapitre juste en dessous.</p>';
      return chs.map((c, i) => {
        const cs = cardsOf(c.id), m = mastery(cs), n = i + 1;
        if (groupTab === "chapitres") return chapterRow(c, okColor(g.color) ? g.color : s.color);
        if (groupTab === "resumes") return sums.has(c.id) ? row("#resume-" + c.id, I.sum, "Résumé · " + c.name, "Chapitre " + n, c) : row("#import-" + c.id, I.up, "Résumé · " + c.name, "Importe le cours pour créer le résumé", c);
        if (groupTab === "cartes") return cs.length ? row("#cartes-" + c.id, I.cards, c.name, `${plural(cs.length, "carte", "cartes")} · ${m} % de maîtrise<span class="bar"><i style="width:${m}%"></i></span>`, c) : row("#import-" + c.id, I.up, c.name, "Importe le cours pour créer les cartes", c);
        if (groupTab === "quiz") return cs.length >= 4 ? row("#quiz-" + c.id, I.quiz, "Quiz · " + c.name, "QCM ou réponse rédigée", c) : row("", I.quiz, "Quiz · " + c.name, "Il faut au moins 4 cartes", c, true);
        return m >= 100 ? row("#controle-" + c.id, I.check, "Contrôle · " + c.name, "Débloqué", c) : row("", I.lock, "Contrôle · " + c.name, `Débloqué à 100 % de maîtrise · tu es à ${m} %`, c, true);
      }).join("");
    }
    const loose = state.chapters.filter(c => c.subject_id === g.subject_id && !state.groups.some(x => x.id === c.group_id));
    function draw() {
      const cs = state.cards.filter(k => chs.some(c => c.id === k.chapter_id)), m = mastery(cs);
      app.innerHTML = `<div class="row"><a class="iconbtn" href="#matiere-${s.id}" aria-label="Retour à la matière">${I.back}</a><span class="row small muted" style="--c:${esc(s.color)}"><span class="dot"></span>${esc(s.name)}</span><span class="grow"></span><button class="iconbtn flat" id="gAdd" aria-label="Ajouter un chapitre dans ce dossier" title="Ajouter un chapitre">${I.plus}</button><button class="iconbtn flat" id="gSet" aria-label="Réglages du dossier" title="Réglages du dossier">${I.gear}</button></div>
        <div class="stack" style="--c:${esc(s.color)}"><h1>${esc(g.name)}</h1><div class="row"><div class="bar grow"><i style="width:${m}%;background:var(--c)"></i></div><span class="small muted">${plural(chs.length, "chapitre", "chapitres")} · ${m} %</span></div></div>
        ${cs.length ? `<a class="btn revall" href="#revdossier-${id}">${I.cards}Réviser toutes les flashcards du dossier</a>` : ""}
        <div class="seg" role="tablist" aria-label="Contenu du dossier">${TABS_G.map(t => `<button role="tab" data-gt="${t[0]}" aria-selected="${groupTab === t[0]}">${t[1]}</button>`).join("")}</div>
        <div class="stack" role="tabpanel">${list()}</div>
`;
      app.querySelectorAll("[data-gt]").forEach(b => b.onclick = () => { groupTab = b.dataset.gt; draw(); });
      $("gAdd").onclick = () => sheet(`<div class="row"><span class="mico big">${I.plus}</span><h1>Nouveau chapitre</h1></div>${chapterField("Nom du chapitre (dans ce dossier)", "Ex. Chapitre 1 : La mitose")}
          ${loose.length ? `<div class="field"><label for="mv">Ou ranger un chapitre existant ici</label><div class="row"><select id="mv">${loose.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select><button class="btn sm" id="mvgo">Ranger</button></div></div>` : ""}`, () => {
        wireChapterField(g.subject_id, id); setTimeout(() => { const c = $("cname"); if (c && matchMedia("(pointer:fine)").matches) c.focus(); }, 50);
        if ($("mvgo")) $("mvgo").onclick = async () => { const r = await sb.from("chapters").update({ group_id: id }).eq("id", $("mv").value); if (r.error) return fail(r.error, "Chapitre non rangé"); closeSheet(); await loadAll(); screenGroup(id); toast("Chapitre rangé dans le dossier."); };
      });
      $("gSet").onclick = () => sheet(`<div class="row"><span class="mico big">${I.gear}</span><h1>Réglages du dossier</h1></div>
          <div class="field"><label for="gn">Nom du dossier</label><div class="row"><input id="gn" type="text" maxlength="80" value="${esc(g.name)}"><button class="btn sm" id="gren">Renommer</button></div></div>
          <div class="field"><span class="label">Couleur du dossier</span><div id="gcol">${colorPick(okColor(g.color) ? g.color : s.color)}</div></div>
          <button class="btn sm ghost" id="gdel" style="align-self:flex-start">Supprimer le dossier</button><p class="note">Supprimer le dossier ne supprime pas ses chapitres : ils reviennent dans la matière.</p><button class="btn ghost" data-close>Fermer</button>`, () => {
      wireColor($("gcol"), async c => { const r = await sb.from("groups").update({ color: c }).eq("id", id); if (r.error) return fail(r.error, "Couleur non enregistrée"); g.color = c; toast("Couleur du dossier enregistrée."); });
      $("gren").onclick = async () => { const name = $("gn").value.trim(); if (!name) return toast("Le nom ne peut pas être vide."); const r = await sb.from("groups").update({ name }).eq("id", id); if (r.error) return fail(r.error, "Nom non enregistré"); g.name = name; draw(); toast("Dossier renommé."); };
      $("gdel").onclick = async () => {
        if (!(await askConfirm("Supprimer ce dossier ?", "Ses chapitres ne sont pas supprimés : ils reviennent dans la matière."))) return;
        const r1 = await sb.from("chapters").update({ group_id: null }).eq("group_id", id); if (r1.error) return fail(r1.error, "Suppression impossible");
        const r2 = await sb.from("groups").delete().eq("id", id); if (r2.error) return fail(r2.error, "Suppression impossible");
        await loadAll(); location.hash = "#matiere-" + s.id;
      };
      });
    }
    draw();
  }

  // ---------- chapitre ----------
  // Tous les modes de révision d'un chapitre. ia : 0 = sans IA, 1 = un appel la première fois puis gardé, 2 = un appel à chaque utilisation.
  // Modes d'un chapitre (16 nov.) : 6 en avant, le reste dans « Plus d'outils ». Fusionnés : les 4 façons de parler à l'IA
  // (Professeur IA, Exercices et questions, Demande libre) → « Demander au prof » (onglet Prof, chapitre lié) ;
  // Apprendre et Examen blanc → Interro écrite (variante « Chronométrée ») ; Cartes difficiles → variante des Flashcards ;
  // Mains libres → variante d'Écouter ; Vrai ou faux → Flash 60 secondes. Retirés : Planche de cartes ; Statistiques → onglet Progrès.
  // Les anciennes adresses (#apprendre-, #blanc-, #difficiles-, #bus-…) marchent toujours.
  const MODES = {
    prof: { i: "prof", n: "Demander au prof", s: "Explication, exercice, quiz… tout", ia: 2, a: "Ouvre le Prof avec ce chapitre déjà lié : pose une question, demande un exercice, un quiz interactif, un plan, une fiche, un moyen de retenir… Il s'adapte à ce que tu demandes et s'appuie sur ton cours." },
    cartes: { i: "cards", n: "Flashcards", s: "Question d'un côté, réponse de l'autre", ia: 0, a: "Tu lis la question, tu réponds dans ta tête, puis tu retournes la carte. « Juste » : la carte est acquise. « Faux » : elle revient dans la file jusqu'à ce que tu la réussisses. À la moitié, un quiz t'est proposé. À 100 %, le contrôle se débloque." },
    resume: { i: "sum", n: "Résumé", s: "L'essentiel du chapitre", ia: 0, a: "Le but du chapitre, les définitions et les notions clés, tirés de ton cours. Tu peux le raccourcir, le détailler ou le corriger à la main." },
    quiz: { i: "quiz", n: "Quiz", s: "QCM ou réponse rédigée", ia: 1, a: "Un quiz d'entraînement écrit à partir de ton cours : QCM ou réponses rédigées, avec la correction et l'explication." },
    controle: { i: "lock", n: "Contrôle", s: "À 100 % de maîtrise", ia: 1, a: "Un contrôle complet, noté, comme en classe. Il se débloque quand tu maîtrises 100 % des cartes du chapitre." },
    blurting: { i: "blank", n: "Feuille blanche", s: "Écris tout de mémoire", ia: 2, a: "Tu écris tout ce dont tu te souviens, sans regarder. L'IA te montre ce qui est juste, faux ou oublié, et ajoute 3 cartes sur tes trous." },
    feynman: { i: "bulb", n: "Méthode Feynman", s: "Explique comme à un enfant", ia: 2, a: "Tu expliques une notion comme à un enfant de 10 ans. L'IA te dit si tu as vraiment compris ou seulement récité, et ce qui manque." },
    pieges: { i: "trap", n: "Chasse aux pièges", s: "Deviens le correcteur", ia: 1, a: "Une copie d'élève contient des erreurs classiques. À toi de les repérer. Tu apprends en corrigeant." },
    faceaface: { i: "vs", n: "Face-à-face", s: "Les notions qu'on confond", ia: 1, a: "Les notions qui se ressemblent, comparées côte à côte, puis un mini quiz pour ne plus les mélanger." },
    exercices: { i: "steps", n: "Exercices guidés", s: "Indices pas à pas", ia: 1, a: "Trois exercices de difficulté croissante. Deux indices si tu bloques, puis la solution rédigée comme sur une copie." },
    interro: { i: "learn", n: "Interro écrite", s: "Tape ta réponse, correction immédiate", ia: 1, a: "Une question à la fois, comme une interro sur feuille. Tu tapes ta réponse : un nombre, un mot ou une phrase est corrigé tout de suite par Merge, une justification est corrigée par l'IA (1 appel par justification). « Refaire » prépare une nouvelle interro." },
    trous: { i: "cloze", n: "Texte à trous", s: "Complète les phrases clés", ia: 1, a: "Les phrases importantes du cours avec des mots manquants. Tu complètes, Merge corrige." },
    carte: { i: "map", n: "Carte mentale", s: "Le chapitre en un schéma", ia: 1, a: "Tout le chapitre en arbre : les grandes idées, puis les notions. Tu peux zoomer et replier les branches." },
    boss: { i: "shield", n: "Combat de boss", s: "Bats le boss du chapitre", ia: 0, a: "Chaque bonne réponse retire des points de vie au boss, chaque erreur t'en coûte. À faire quand tu te sens prêt." },
    flash: { i: "bolt", n: "Flash 60 secondes", s: "Vrai ou faux contre la montre", ia: 0, a: "60 secondes, un maximum de bonnes réponses, des combos si tu enchaînes." },
    associer: { i: "match", n: "Associer", s: "Relie questions et réponses", ia: 0, a: "Retrouve les paires question-réponse le plus vite possible." },
    khole: { i: "mic", n: "Khôlle", s: "Réponds à l'oral, au micro", ia: 2, a: "Merge pose une question, tu réponds à voix haute. L'IA note la précision de ta réponse et ton aisance à l'oral." },
    ecouter: { i: "listen", n: "Écouter", s: "Tes cartes lues à voix haute", ia: 0, a: "Tes cartes ou ton résumé lus à voix haute, à la vitesse que tu veux." },
    synthese: { i: "sum", n: "Fiche de synthèse", s: "Une page A4 à imprimer", ia: 1, a: "L'essentiel, les définitions, les formules, les pièges et des astuces pour retenir, sur une seule page." },
    schema: { i: "grid", n: "Schémas à légender", s: "Cache les légendes et retrouve-les", ia: 0, a: "Tu prends une page de ton cours avec un schéma, tu caches les légendes avec ton doigt, puis tu t'entraînes à les retrouver. Tu peux aussi ajouter ta propre photo." },
    erreurs: { i: "book", n: "Carnet d'erreurs", s: "Tes erreurs, expliquées", ia: 0, a: "Toutes les questions que tu as ratées dans ce chapitre. Le bouton « Pourquoi ? » t'explique chaque erreur (1 appel IA)." },
  };
  const MODE_MAIN = ["cartes", "resume", "quiz", "interro", "controle", "prof"];
  // Variante d'un mode, en petit bouton dans sa tuile : [clé, libellé, adresse].
  const MODE_VAR = { cartes: ["difficiles", "Seulement les difficiles"], interro: ["blanc", "Chronométrée"], ecouter: ["bus", "Mains libres"] };
  const MODE_CATS = [["Comprendre", ["blurting", "feynman", "trous", "faceaface", "pieges", "exercices", "carte"]], ["Fiches", ["synthese", "erreurs"]], ["Oral et audio", ["khole", "ecouter"]], ["Jouer", ["boss", "flash", "associer"]]];
  const IA_NOTE = ["Sans IA : gratuit et illimité.", "1 appel IA la première fois, puis c'est gardé : tu le rouvres autant que tu veux.", "1 appel IA à chaque utilisation."];
  const favs = () => { try { const f = JSON.parse(safeGet("merge.fav") || "[]"); return Array.isArray(f) ? f.filter(k => MODES[k]) : []; } catch (e) { return []; } };

  async function screenChapter(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    drawTabs("matieres"); // barre du bas visible : on peut revenir à l'accueil d'un geste
    const s = state.subjects.find(x => x.id === ch.subject_id) || { name: "", color: "#888", id: "" }, grp = state.groups.find(x => x.id === ch.group_id), here = location.hash;
    app.innerHTML = `<p class="muted">Chargement…</p>`;
    let [cr, sr] = state.offline ? [{ error: { message: "hors ligne" } }, { error: true }] : await Promise.all([
      sb.from("cards").select("id,front,back,source_quote,needs_check,flagged,state,image_path,picture").eq("chapter_id", id).order("created_at"),
      sb.from("summaries").select("chapter_id").eq("chapter_id", id).maybeSingle()
    ]).catch(() => [{ error: { message: "hors ligne" } }, { error: true }]);
    // Hors ligne : cartes de la copie locale, résumé s'il a été enregistré sur l'appareil.
    if (cr.error) cr = { data: cardsOf(id).filter(c => c.front).map(c => Object.assign({ needs_check: false, flagged: false }, c)) };
    else (cr.data || []).forEach(c => { const m = state.cards.find(x => x.id === c.id); if (m && m.image_box) c.image_box = m.image_box; }); // cadre des schémas
    if (sr.error) sr = { data: safeGet("merge.sum." + id) ? { chapter_id: id } : null };
    if (location.hash !== here) return;
    const cards = cr.data || [], meta = cardsOf(id), m = mastery(meta), due = dueCards(meta).length, hasSum = !!(sr.data);
    // Cartes difficiles : celles déjà ratées au moins une fois (comme la séance « difficiles »).
    const hard = meta.filter(c => (c.wrong_count || 0) > 0).length;
    // Schémas à légender : en avant seulement si le chapitre a un schéma (carte recadrée ou schéma déjà préparé).
    const hasSchema = meta.some(c => c.image_box) || Object.keys(jget("merge.occl." + id, {})).length > 0;
    const tile = (k) => {
      const M = MODES[k], fav = favs().includes(k), V = MODE_VAR[k]; let sub = M.s, icon = I[M.i], href = k === "prof" ? "#exos-" + id : "#" + k + "-" + id;
      if (k === "cartes") sub = m + " % de maîtrise"; if (k === "resume" && !hasSum) { href = "#import-" + id; sub = "Importe ton cours"; }
      if (k === "controle") { icon = m >= 100 ? I.check : I.lock; sub = m >= 100 ? "Débloqué" : "À 100 % de maîtrise"; } if (k === "boss" && safeGet("merge.boss." + id)) sub = "Vaincu";
      return `<div class="mtile${fav ? " isfav" : ""}"><a class="mmain" href="${href}"><span class="mico">${icon}</span><span class="mtxt"><b>${M.n}</b><span class="small">${sub}</span></span></a><button class="mbtn" data-info="${k}" aria-label="Comment marche ${M.n} ?">${I.info}</button><button class="mbtn star" data-fav="${k}" aria-pressed="${fav}" aria-label="${fav ? "Retirer des favoris" : "Mettre en favori"} : ${M.n}">${I.star}</button>${V && (V[0] !== "difficiles" || hard) ? `<a class="mvar" href="#${V[0]}-${id}">${V[0] === "difficiles" ? I.bolt : V[0] === "blanc" ? I.clock : I.bus}${V[1]}${V[0] === "difficiles" ? " · " + hard : ""}</a>` : ""}</div>`;
    };
    const sect = (t, keys, cls) => `<div class="stack${cls ? " " + cls : ""}"><h2>${t}</h2><div class="mgrid">${keys.map(tile).join("")}</div></div>`;
    // Design A (16 nov.) : en-tête avec l'anneau de maîtrise, un gros bouton « Réviser maintenant », 4 à 6 raccourcis,
    // puis « Plus d'outils » replié. Toujours le « i » et l'étoile dans « Plus d'outils » ; les favoris rejoignent les raccourcis.
    const nc = nextCtrl(s), ctl = nc && (!nc.ch || !nc.ch.length || nc.ch.includes(id));
    const chHead = () => `<div class="chhead" style="--c:${esc(s.color)}"><div class="chring" style="--p:${m}" role="img" aria-label="Maîtrise ${m} %"><b>${m}%</b></div><div class="grow"><h1>${esc(ch.name)}</h1><p class="small muted">${cards.length ? plural(cards.length, "carte", "cartes") + (due ? " · " + plural(due, "à revoir", "à revoir") : "") : "Pas encore de cartes"}${ctl ? " · contrôle " + (jx(nc.d) === "Auj." ? "aujourd'hui" : jx(nc.d)) : ""}</p></div></div>`;
    const short = (k, odd) => {
      const M = MODES[k]; let sub = M.s, icon = I[M.i], href = k === "prof" ? "#exos-" + id : "#" + k + "-" + id;
      if (k === "resume" && !hasSum) { href = "#import-" + id; sub = "Importe ton cours"; }
      if (k === "resume" && hasSum) sub = "L'essentiel";
      if (k === "quiz") sub = "QCM"; if (k === "interro") sub = "Tu écris, il corrige"; if (k === "prof") sub = "Une question, un exercice, un quiz… ce que tu veux";
      if (k === "controle") { icon = m >= 100 ? I.check : I.lock; sub = m >= 100 ? "Débloqué" : "À 100 %"; }
      const fv = !MODE_MAIN.includes(k) && k !== "schema" && favs().includes(k);
      const a = `<a class="short${k === "prof" && odd ? " wide" : ""}" href="${href}" data-k="${k}"><span class="mico">${icon}</span><span class="mtxt"><b>${M.n}</b><span class="small">${sub}</span></span></a>`;
      // Favori ajouté depuis « Plus d'outils » : il vit ici, avec une étoile pour le renvoyer dans « Plus d'outils ».
      return fv ? `<div class="shortw${k === "prof" && odd ? " wide" : ""}">${a}<button class="mbtn star sfav" data-fav="${k}" aria-pressed="true" aria-label="Retirer des favoris : ${M.n}">${I.star}</button></div>` : a;
    };
    const revMin = Math.max(1, Math.round((due || Math.min(20, meta.length)) * 0.5));
    // Raccourcis : sur téléphone 2 colonnes (« Demander au prof » en large s'il est seul sur sa ligne) ; sur PC, une grille
    // sans trou : 5 raccourcis sur une ligne, 6 en 3 × 2, plus en 4 colonnes.
    const shortKeys = () => ["resume", "quiz", "interro", "controle"].concat(hasSchema ? ["schema"] : [], favs().filter(k => !MODE_MAIN.includes(k) && k !== "schema"), ["prof"]);
    const shortsHtml = () => { const keys = shortKeys(), odd = keys.length % 2 === 1, pcCols = keys.length <= 5 ? keys.length : keys.length === 6 ? 3 : 4; return `<div class="shorts" style="--pccols:${pcCols}">${keys.map(k => short(k, odd)).join("")}</div>`; };
    const modesHtml = () => `<a class="revbig" href="#cartes-${id}"><span class="grow"><b>Réviser maintenant</b><span class="small">${due ? plural(due, "carte à revoir", "cartes à revoir") : "Entraînement sur tes cartes"} · environ ${revMin} min</span></span><span class="revgo" aria-hidden="true">${I.play}</span></a>`
      + (hard ? `<a class="mvar solo" href="#difficiles-${id}">${I.bolt}Seulement les difficiles · ${hard}</a>` : "")
      + shortsHtml()
      + `<a class="mvar solo" href="#blanc-${id}">${I.clock}Interro chronométrée, comme le jour J</a>`
      + `<details class="moremodes"${safeGet("merge.moremodes") === "1" ? " open" : ""}><summary><span class="mico big">${I.grid}</span><span class="grow mtxt"><b>Plus d'outils</b><span class="small">${MODE_CATS.reduce((a, c) => a + c[1].filter(k => !favs().includes(k)).length, 0)} façons de réviser : fiches, jeux, oral, examen blanc…</span></span></summary><div class="stack modesbox">${MODE_CATS.map(c => [c[0], c[1].filter(k => !favs().includes(k))]).filter(c => c[1].length).map(c => sect(c[0], c[1])).join("")}</div></details>`;
    function wireModes() {
      const mm = app.querySelector(".moremodes"); if (mm) mm.ontoggle = () => safeSet("merge.moremodes", mm.open ? "1" : "0");
      app.querySelectorAll("[data-fav]").forEach(b => b.onclick = () => { const k = b.dataset.fav, f = favs(), i = f.indexOf(k); if (i >= 0) f.splice(i, 1); else f.unshift(k); safeSet("merge.fav", JSON.stringify(f.slice(0, 12))); $("modesbox").innerHTML = modesHtml(); wireModes();
        // Le favori monte dans les raccourcis en haut (et quitte « Plus d'outils ») : on le montre.
        if (i < 0) { const t = app.querySelector(`.short[data-k="${k}"]`); if (t) { t.scrollIntoView({ behavior: "smooth", block: "center" }); t.classList.add("justfav"); setTimeout(() => t.classList.remove("justfav"), 1600); } }
        toast(i >= 0 ? MODES[k].n + " est retourné dans « Plus d'outils »." : MODES[k].n + " est maintenant dans tes raccourcis, en haut."); });
      app.querySelectorAll("[data-info]").forEach(b => b.onclick = () => { const k = b.dataset.info, M = MODES[k], t = b.parentElement.querySelector(".mmain");
        sheet(`<div class="row"><span class="mico big">${I[M.i]}</span><h1>${M.n}</h1></div><p>${M.a}</p><p class="note">${IA_NOTE[M.ia]} Tout vient uniquement de ton cours.</p><div class="row"><a class="btn grow" href="${t.getAttribute("href")}" data-close>Commencer</a><button class="btn ghost" data-close>Fermer</button></div>`); });
    }
    app.innerHTML = `<div class="row"><a class="iconbtn" href="${grp ? "#dossier-" + grp.id : "#matiere-" + s.id}" aria-label="${grp ? "Retour au dossier" : "Retour à la matière"}">${I.back}</a><span class="row small muted" style="--c:${esc(s.color)}"><span class="dot"></span>${esc(s.name)}${grp ? " · " + esc(grp.name) : ""}</span></div>
      ${chHead()}
      ${cards.length ? `<div id="modesbox" class="stack modesbox">${modesHtml()}</div>` : ""}
      ${cards.length ? `<h3 class="chsec">Le chapitre</h3>` : ""}
      ${cards.length ? `<a class="card pad addcourse" href="#import-${id}"><span class="mico">${I.up}</span><b class="grow">Ajouter un cours</b><span class="small muted">PDF, photos…</span></a>` : `<div class="banner"><div><h2>Importe ton cours</h2><p class="small">PDF, photos, PowerPoint ou texte, autant de fichiers que tu veux. Merge prépare le résumé et les cartes à partir de ton cours, sans rien inventer.</p></div><a class="btn sm" href="#import-${id}">Importer</a></div>`}
      ${chapterToolsHtml(id)}
      <details class="card pad drop" id="cardsdrop"><summary><span class="mico">${I.cards}</span><b class="grow">${cards.length ? "Les " + plural(cards.length, "carte", "cartes") + " du chapitre" : "Cartes du chapitre"}</b></summary><div class="stack"><div class="row" style="flex-wrap:wrap"><button class="btn sm" id="tMore">Créer d'autres cartes avec l'IA</button><button class="btn sm ghost" id="tAdd">Ajouter une carte</button></div><div id="addbox"></div><div class="stack" id="list"></div></div></details>`;
    wireChapterTools(id, ch, cards); wireModes();
    if (!cards.length) return;
    const list = $("list");
    const drawCard = (c) => `<div class="card term" data-id="${c.id}">${picHtml(c)}<div class="row between"><b>${cfront(c, true)}</b>${c.needs_check ? '<span class="pill warn">À vérifier</span>' : ""}${c.flagged ? '<span class="pill warn">Signalée</span>' : ""}</div><p>${mx(c.back)}</p>${c.source_quote ? `<p class="quote">${esc(c.source_quote)}</p>` : ""}<div class="pagebox"></div><div class="tools">${c.image_path ? `<button class="mini" data-img="${c.id}">Voir la page</button>` : ""}<button class="mini" data-edit="${c.id}">Modifier</button><button class="mini" data-flag="${c.id}">${c.flagged ? "Retirer le signalement" : "Signaler"}</button><button class="mini" data-del="${c.id}">Supprimer</button></div></div>`;
    list.innerHTML = cards.map(drawCard).join("");
    list.onchange = async (e) => {
      const inp = e.target.closest("[data-pic-in]"); if (!inp || !inp.files[0]) return; const cid = inp.dataset.picIn, c = cards.find(x => x.id === cid); if (!c) return;
      toast("Envoi de l'image…"); try { c.picture = await uploadCardPic(inp.files[0], id, cid); list.querySelector(`[data-id="${cid}"]`).outerHTML = drawCard(c); toast("Image ajoutée à la carte."); } catch (er) { fail(er, "Image non ajoutée"); }
    };
    list.onclick = async (e) => {
      const pd = e.target.closest("[data-picdel]"); if (pd) { const c = cards.find(x => x.id === pd.dataset.picdel); const r = await sb.from("cards").update({ picture: null }).eq("id", c.id); if (r.error) return fail(r.error, "Image non retirée"); c.picture = null; const m = state.cards.find(x => x.id === c.id); if (m) m.picture = null; list.querySelector(`[data-id="${c.id}"]`).outerHTML = drawCard(c); return toast("Image retirée."); }
      const b = e.target.closest("button"); if (!b) return;
      const cid = b.dataset.edit || b.dataset.flag || b.dataset.save || b.dataset.cancel || b.dataset.del || b.dataset.delyes || b.dataset.img; const c = cards.find(x => x.id === cid); if (!c) return;
      const box = list.querySelector(`[data-id="${cid}"]`);
      if (b.dataset.img) return showPage(c.image_path, box.querySelector(".pagebox"));
      if (b.dataset.del) { if (await askConfirm("Supprimer cette carte ?", "« " + String(c.front).slice(0, 80) + " »")) { const db = document.createElement("button"); db.dataset.delyes = cid; b.replaceWith(db); db.click(); } return; }
      if (b.dataset.delyes) { const { error } = await trashCard(Object.assign({ chapter_id: id }, state.cards.find(x => x.id === cid) || {}, c)); if (error) return fail(error, "Carte non supprimée"); state.cards = state.cards.filter(x => x.id !== cid); cards.splice(cards.indexOf(c), 1); box.remove(); return toast("Carte supprimée."); }
      if (b.dataset.flag) {
        const { error } = await sb.from("cards").update({ flagged: !c.flagged }).eq("id", cid); if (error) return fail(error, "Signalement impossible");
        c.flagged = !c.flagged; box.outerHTML = drawCard(c); toast(c.flagged ? "Carte signalée. Tu peux la corriger avec Modifier." : "Signalement retiré.");
      } else if (b.dataset.edit) {
        box.innerHTML = `<div class="stack"><div class="field"><label for="f${cid}">Question</label><input id="f${cid}" type="text" value="${esc(c.front)}"></div><div class="field"><label for="b${cid}">Réponse</label><textarea id="b${cid}" style="min-height:100px">${esc(c.back)}</textarea></div><div class="field"><span class="label">Image (schéma, photo, carte…)</span><div class="row" style="flex-wrap:wrap"><label class="btn sm ghost" for="p${cid}">${c.picture ? "Changer l'image" : "Ajouter une image"}</label><input id="p${cid}" type="file" accept="image/*" hidden data-pic-in="${cid}">${c.picture ? `<button class="btn sm ghost" data-picdel="${cid}">Retirer l'image</button>` : ""}</div></div><div class="row"><button class="btn sm" data-save="${cid}">Enregistrer</button><button class="btn sm ghost" data-cancel="${cid}">Annuler</button></div></div>`;
      } else if (b.dataset.cancel) { box.outerHTML = drawCard(c);
      } else if (b.dataset.save) {
        const front = $("f" + cid).value.trim(), back = $("b" + cid).value.trim(); if (!front || !back) return toast("La question et la réponse ne peuvent pas être vides.");
        const { error } = await sb.from("cards").update({ front, back, edited_by_user: true, needs_check: false, flagged: false }).eq("id", cid); if (error) return fail(error, "Carte non enregistrée");
        Object.assign(c, { front, back, needs_check: false, flagged: false }); box.outerHTML = drawCard(c); toast("Carte enregistrée.");
      }
    };
  }

  // ---------- résumé ----------
  const SUM_MODES = [
    ["detailler", "Cours complet", "long", "Tout le cours développé avec explications et exemples"],
    ["normal", "Résumé", "norm", "L'essentiel du chapitre, écrit uniquement à partir de ton cours"],
    ["raccourcir", "Plus court", "short", "Résumé plus court : le but du chapitre, les définitions et les notions clés"],
    ["ultracourt", "Encore plus court", "vshort", "Résumé très court : uniquement les points indispensables à retenir"],
  ];
  async function screenSummary(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; app.innerHTML = `<p class="muted">Chargement…</p>`;
    let sum = null, error = null;
    try { const r = state.offline ? { error: { message: "hors ligne" } } : await sb.from("summaries").select("*").eq("chapter_id", id).maybeSingle(); sum = r.data; error = r.error; } catch (e) { error = e; }
    if (sum) offlineKeep("merge.sum." + id, sum); else if (error) { try { sum = JSON.parse(safeGet("merge.sum." + id) || "null"); } catch (e) { sum = null; } if (sum) toast("Hors ligne : résumé enregistré sur cet appareil."); }
    if (!sum) { location.hash = "#chapitre-" + id; return; }
    const vk = "merge.sumv." + id; let vers = jget(vk, null) || {};
    if (!SUM_MODES.some(m => vers[m[0]])) { vers = { active: "normal", normal: sum.markdown }; jset(vk, vers); }
    let curMode = SUM_MODES.some(m => m[0] === vers.active) ? vers.active : "normal";
    if (!vers[curMode]) { vers[curMode] = sum.markdown; jset(vk, vers); }
    function view() {
      const mInfo = SUM_MODES.find(m => m[0] === curMode) || SUM_MODES[1];
      app.innerHTML = `<div class="row between"><a class="iconbtn" href="#chapitre-${id}" aria-label="Retour au chapitre">${I.back}</a><button class="btn sm ghost" id="edit">Modifier</button></div>
        <h1>${esc(ch.name)}</h1><p class="small muted">${esc(mInfo[3])}${sum.edited_by_user ? ", modifié par toi" : ""}.</p>
        <div class="summodes" role="group" aria-label="Type de résumé">${SUM_MODES.map(m => `<button class="btn sm ${curMode === m[0] ? "" : "ghost"}" id="${m[2]}" data-sm="${m[0]}" aria-pressed="${curMode === m[0]}">${m[1]}</button>`).join("")}</div>
        <div id="msg" class="note"></div>
        <div class="card pad md" id="sumbox">${md(sum.markdown)}</div>
        <div class="row" style="flex-wrap:wrap"><button class="btn sm" id="hlb">Surligner la sélection</button><span class="small muted">Sélectionne un passage du résumé, puis touche ce bouton.</span></div>
        <div class="card pad stack" id="hlbox"></div>`;
      $("edit").onclick = edit;
      const hk = "merge.hl." + id; let hls = jget(hk, []), lastSel = "";
      const wrap = (t) => { const w = document.createTreeWalker($("sumbox"), NodeFilter.SHOW_TEXT), nodes = []; while (w.nextNode()) nodes.push(w.currentNode); for (const n of nodes) { if (n.parentElement.closest("mark")) continue; const i = n.nodeValue.indexOf(t); if (i < 0) continue; const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + t.length); const mk = document.createElement("mark"); mk.className = "hl user"; r.surroundContents(mk); return true; } return false; };
      const paintHl = () => { hls = hls.filter(t => wrap(t)); $("hlbox").innerHTML = `<h2>Mes passages importants</h2>` + (hls.length ? hls.map((t, k) => `<div class="row between"><span class="grow">${esc(t)}</span><button class="mini" data-hd="${k}">Retirer</button></div>`).join("") : '<p class="muted small">Aucun passage surligné pour l\'instant.</p>'); $("hlbox").querySelectorAll("[data-hd]").forEach(b => b.onclick = () => { hls.splice(+b.dataset.hd, 1); jset(hk, hls); view(); }); };
      paintHl();
      document.onselectionchange = () => { const sel = document.getSelection(), box = $("sumbox"); if (box && sel && sel.rangeCount && !sel.isCollapsed && box.contains(sel.anchorNode)) lastSel = sel.toString(); };
      $("hlb").onmousedown = e => e.preventDefault();
      $("hlb").onclick = () => { const parts = lastSel.split(/\n+/).map(x => x.trim()).filter(x => x.length >= 3); if (!parts.length) return toast("Sélectionne d'abord un passage du résumé."); let n = 0; parts.forEach(t => { if (!hls.includes(t) && wrap(t)) { hls.push(t); n++; } }); lastSel = ""; try { document.getSelection().removeAllRanges(); } catch (e) { /* rien */ } if (!n) return toast("Sélectionne un passage sans mise en forme au milieu (pas de gras)."); jset(hk, hls.slice(-40)); view(); };
      const setBtns = (dis) => app.querySelectorAll("[data-sm]").forEach(b => { b.disabled = dis; });
      const regen = async (mode) => {
        if (vers[mode] && !sum.edited_by_user) {
          if (curMode === mode) return;
          curMode = mode; vers.active = mode; sum.markdown = vers[mode]; jset(vk, vers); offlineKeep("merge.sum." + id, sum);
          if (!state.offline) sb.from("summaries").update({ markdown: sum.markdown, updated_at: new Date().toISOString() }).eq("chapter_id", id);
          view(); return;
        }
        if (sum.edited_by_user && $("msg").dataset.ok !== mode) { $("msg").dataset.ok = mode; $("msg").className = "note"; $("msg").textContent = "Tu as modifié ce résumé. Appuie encore une fois pour le remplacer."; return; }
        setBtns(true);
        const stepTxt = (p) => p < 35 ? "Lecture de ton cours…" : p < 75 ? (mode === "detailler" ? "Rédaction du cours complet…" : mode === "ultracourt" ? "Sélection des points essentiels…" : "Rédaction du résumé…") : "Mise en forme finale…";
        $("msg").className = "card pad stack";
        $("msg").innerHTML = `<div class="bar big"><i id="sprog" style="width:8%"></i></div><div class="row between small muted"><span id="sstat" role="status">${stepTxt(8)}</span><b id="spct">8 %</b></div>`;
        const t0 = Date.now(), tau = mode === "detailler" ? 10000 : 6000;
        const timer = setInterval(() => {
          const p = Math.min(94, Math.round(8 + 86 * (1 - Math.exp(-(Date.now() - t0) / tau))));
          if ($("sprog")) $("sprog").style.width = p + "%";
          if ($("spct")) $("spct").textContent = p + " %";
          if ($("sstat")) $("sstat").textContent = stepTxt(p);
        }, 250);
        try {
          const text = await courseText(id); if (!text.trim()) throw new Error("Le texte du cours n'est plus disponible.");
          const r = await ai({ action: "summary", mode, text });
          clearInterval(timer);
          if ($("sprog")) { $("sprog").style.width = "100%"; if ($("spct")) $("spct").textContent = "100 %"; }
          const up = await sb.from("summaries").update({ markdown: r.summary, edited_by_user: false, updated_at: new Date().toISOString() }).eq("chapter_id", id); if (up.error) throw up.error;
          sum.markdown = r.summary; sum.edited_by_user = false; curMode = mode; vers[mode] = r.summary; vers.active = mode; jset(vk, vers); offlineKeep("merge.sum." + id, sum); view();
        } catch (e) { clearInterval(timer); $("msg").className = "note"; showErr($("msg"), e); setBtns(false); }
      };
      app.querySelectorAll("[data-sm]").forEach(b => b.onclick = () => regen(b.dataset.sm));
    }
    function edit() {
      app.innerHTML = `<h1>Modifier le résumé</h1><div class="field"><label for="mdtxt">Texte (## pour un titre, - pour une liste)</label><textarea id="mdtxt" style="min-height:50vh">${esc(sum.markdown)}</textarea></div>
        <div class="row"><button class="btn grow" id="save">Enregistrer</button><button class="btn ghost" id="cancel">Annuler</button></div>`;
      $("cancel").onclick = view;
      $("save").onclick = async () => {
        const t = $("mdtxt").value.trim(); if (!t) return toast("Le résumé ne peut pas être vide.");
        const { error } = await sb.from("summaries").update({ markdown: t, edited_by_user: true, updated_at: new Date().toISOString() }).eq("chapter_id", id); if (error) return fail(error, "Résumé non enregistré");
        sum.markdown = t; sum.edited_by_user = true; vers[curMode] = t; vers.active = curMode; jset(vk, vers); offlineKeep("merge.sum." + id, sum); view(); toast("Résumé enregistré.");
      };
    }
    view();
  }

