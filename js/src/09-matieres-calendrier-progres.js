  // ---------- outils d'un chapitre ----------
  // « Gérer le chapitre » : menu déroulant avec seulement la gestion du chapitre. Les modes (cartes difficiles, examen blanc) sont dans la liste des modes ;
  // créer ou ajouter des cartes se fait dans la section des cartes.
  function chapterToolsHtml(id) {
    return `<details class="card pad drop" id="tools"><summary><span class="mico">${I.gear}</span><b class="grow">Gérer le chapitre</b></summary><div class="stack"><div class="chips"><button class="chip" id="tNotes">Mes notes</button><button class="chip" id="tRename">Renommer</button><button class="chip" id="tColor">Couleur</button><button class="chip" id="tMove">Ranger dans un dossier</button><button class="chip" id="tShare">Partager</button><button class="chip" id="tExport">Exporter les cartes</button><button class="chip danger" id="tDel">Supprimer</button></div><div id="toolbox"></div></div></details>`;
  }
  function wireChapterTools(id, ch, cards) {
    if ($("tMore")) $("tMore").onclick = () => moreCards(id, $("tMore"));
    const box = $("toolbox"), s = state.subjects.find(x => x.id === ch.subject_id);
    $("tShare").onclick = async () => {
      box.innerHTML = '<p class="muted">Chargement…</p>';
      const link = t => location.origin + location.pathname + "#partage-" + t;
      const paint = (sh) => {
        box.innerHTML = sh && sh.active ? `<div class="stack"><p class="small">N'importe qui avec ce lien peut réviser ce chapitre (cartes, résumé et contenus déjà préparés), même sans compte. Personne ne peut le modifier, et l'invité n'utilise jamais d'IA.</p><input id="shl" readonly value="${esc(link(sh.token))}" aria-label="Lien de partage"><div class="row" style="flex-wrap:wrap"><button class="btn sm" id="shc">Copier le lien</button><button class="btn sm ghost" id="shr">Nouveau lien</button><button class="btn sm ghost" id="shd">Désactiver</button></div><p class="note">« Nouveau lien » rend l'ancien inutilisable.</p></div>`
          : `<div class="stack"><p class="small">Crée un lien pour qu'un ami révise ce chapitre, même sans compte. Tu pourras le désactiver ou le changer quand tu veux.</p><button class="btn sm" id="shn">Créer le lien</button></div>`;
        const mk = async (renew) => { const r = await sb.rpc("share_chapter", { p_chapter: id, p_renew: !!renew }); if (r.error) return fail(r.error, "Partage impossible"); paint({ token: r.data, active: true }); toast(renew ? "Nouveau lien créé. L'ancien ne marche plus." : "Lien créé."); };
        if ($("shn")) $("shn").onclick = () => mk(false);
        if ($("shr")) $("shr").onclick = () => mk(true);
        if ($("shd")) $("shd").onclick = async () => { const r = await sb.rpc("unshare_chapter", { p_chapter: id }); if (r.error) return fail(r.error, "Désactivation impossible"); paint(null); toast("Lien désactivé."); };
        if ($("shc")) $("shc").onclick = async () => { const v = $("shl").value; try { if (navigator.share && /Mobi/.test(navigator.userAgent)) await navigator.share({ title: ch.name, url: v }); else { await navigator.clipboard.writeText(v); toast("Lien copié."); } } catch (e) { $("shl").select(); } };
      };
      let sh = null; try { const r = await sb.from("chapter_shares").select("token,active").eq("chapter_id", id).maybeSingle(); sh = r.data; } catch (e) { sh = null; }
      paint(sh);
    };
    $("tColor").onclick = () => {
      box.innerHTML = `<div class="field"><span class="label">Couleur du chapitre</span><div id="ccol">${colorPick(okColor(ch.color) ? ch.color : (s && s.color))}</div></div>`;
      wireColor($("ccol"), async c => { const { error } = await sb.from("chapters").update({ color: c }).eq("id", id); if (error) return fail(error, "Couleur non enregistrée"); ch.color = c; toast("Couleur du chapitre enregistrée."); });
    };
    if ($("tAdd")) $("tAdd").onclick = () => {
      $("addbox").innerHTML = `<div class="stack"><div class="field"><label for="nf">Question</label><input id="nf" type="text" maxlength="500"></div><div class="field"><label for="nb">Réponse</label><textarea id="nb" style="min-height:90px"></textarea></div><button class="btn sm" id="nsave">Ajouter la carte</button></div>`;
      $("nsave").onclick = async () => { const front = $("nf").value.trim(), back = $("nb").value.trim(); if (!front || !back) return toast("Écris la question et la réponse.");
        const { error } = await sb.from("cards").insert({ chapter_id: id, front, back, edited_by_user: true }); if (error) return fail(error, "Carte non ajoutée");
        await sb.from("chapters").update({ status: "ready" }).eq("id", id); await loadAll(); toast("Carte ajoutée."); screenChapter(id); };
    };
    $("tNotes").onclick = () => {
      box.innerHTML = `<div class="stack"><div class="field"><label for="nt">Mes notes sur ce chapitre</label><textarea id="nt" placeholder="Ce que le prof a dit d'important, ce que je dois revoir…">${esc(ch.notes || "")}</textarea></div><button class="btn sm" id="ntsave">Enregistrer</button></div>`;
      $("ntsave").onclick = async () => { const notes = $("nt").value; const { error } = await sb.from("chapters").update({ notes }).eq("id", id); if (error) return fail(error, "Notes non enregistrées"); ch.notes = notes; toast("Notes enregistrées."); };
    };
    $("tMove").onclick = () => {
      const gs = state.groups.filter(x => x.subject_id === ch.subject_id);
      if (!gs.length) { box.innerHTML = `<p class="note">Cette matière n'a pas encore de dossier. Crée-en un avec le bouton + de la page de la matière.</p><a class="btn sm ghost" href="#matiere-${ch.subject_id}">Ouvrir la matière</a>`; return; }
      box.innerHTML = `<div class="stack"><div class="field"><label for="mvg">Dossier</label><select id="mvg"><option value="">Aucun dossier</option>${gs.map(x => `<option value="${x.id}"${x.id === ch.group_id ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</select></div><button class="btn sm" id="mvsave">Ranger</button></div>`;
      $("mvsave").onclick = async () => { const gid = $("mvg").value || null; const { error } = await sb.from("chapters").update({ group_id: gid }).eq("id", id); if (error) return fail(error, "Chapitre non rangé"); ch.group_id = gid; toast(gid ? "Chapitre rangé." : "Chapitre sorti du dossier."); screenChapter(id); };
    };
    $("tRename").onclick = () => {
      box.innerHTML = `<div class="stack"><div class="field"><label for="rn">Nom du chapitre</label><input id="rn" type="text" maxlength="80" value="${esc(ch.name)}"></div><button class="btn sm" id="rnsave">Renommer</button></div>`;
      $("rnsave").onclick = async () => { const name = $("rn").value.trim(); if (!name) return toast("Le nom ne peut pas être vide."); const { error } = await sb.from("chapters").update({ name, auto_name: false }).eq("id", id); if (error) return fail(error, "Nom non enregistré"); ch.name = name; ch.auto_name = false; screenChapter(id); };
    };
    $("tDel").onclick = async () => {
      if (!(await askConfirm("Supprimer ce chapitre ?", "« " + ch.name + " » et ses cartes vont dans la corbeille (récupérables pendant 30 jours)."))) return;
      await (async () => { const { error } = await trashRow("chapters", id); if (error) return fail(error, "Suppression impossible"); await loadAll(); state.cards = state.cards.filter(c => c.chapter_id !== id); location.hash = "#matiere-" + (s ? s.id : ""); })();
    };
    $("tExport").onclick = () => {
      if (!cards.length) return toast("Aucune carte à exporter.");
      const q = v => '"' + String(v || "").replace(/"/g, '""') + '"', csv = "Question;Réponse\n" + cards.map(c => q(c.front) + ";" + q(c.back)).join("\n");
      box.innerHTML = `<div class="stack"><p class="note">Copie ce texte, ou télécharge le fichier (il s'ouvre dans Excel).</p><textarea readonly style="min-height:120px">${esc(csv)}</textarea><a class="btn sm" id="dl" download="${esc(ch.name)}.csv">Télécharger le fichier</a></div>`;
      try { $("dl").href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })); } catch (e) { $("dl").hidden = true; }
    };
  }

  // ---------- choisir quoi réviser : matières, dossiers et chapitres combinés en une session de flashcards ----------
  function screenMix() {
    tabs.hidden = true;
    const withCards = state.chapters.filter(c => cardsOf(c.id).length), subs = state.subjects.filter(x => withCards.some(c => c.subject_id === x.id));
    const prev = jget("merge.mixsel", null), sel = new Set(((prev && prev.ids) || []).filter(x => withCards.some(c => c.id === x)));
    const all = ids => ids.length && ids.every(x => sel.has(x));
    const chip = (attr, id, name, color, ids, cls) => `<button type="button" class="chip${cls ? " " + cls : ""}" ${attr}="${id}" aria-pressed="${all(ids)}" style="--c:${esc(color)}"><span class="dot"></span>&nbsp;${esc(name)}</button>`;
    function draw() {
      const n = state.cards.filter(c => sel.has(c.chapter_id)).length;
      app.innerHTML = `<div class="row"><a class="iconbtn" href="#accueil" aria-label="Retour">${I.back}</a><h1 class="grow">Choisir quoi réviser</h1></div>
        <p class="muted">Touche des matières, des dossiers ou des chapitres : toutes leurs flashcards sont mélangées dans une seule session.</p>
        ${subs.length ? subs.map(x => { const chs = withCards.filter(c => c.subject_id === x.id), gs = state.groups.filter(g => g.subject_id === x.id && chs.some(c => c.group_id === g.id));
          return `<div class="card pad stack mixsub" style="--c:${esc(x.color)}">${chip("data-ms", x.id, x.name, x.color, chs.map(c => c.id), "big")}
            ${gs.length ? `<span class="label">Dossiers</span><div class="chips">${gs.map(g => chip("data-mg", g.id, g.name, okColor(g.color) ? g.color : x.color, chs.filter(c => c.group_id === g.id).map(c => c.id))).join("")}</div>` : ""}
            <span class="label">Chapitres</span><div class="chips">${chs.map(c => chip("data-mc", c.id, c.name, x.color, [c.id])).join("")}</div></div>`; }).join("") : '<p class="muted">Importe un cours dans un chapitre pour avoir des flashcards à réviser.</p>'}
        <div class="mixbar card pad row between"><span><b>${plural(n, "carte", "cartes")}</b><span class="small muted"> · ${plural(sel.size, "chapitre", "chapitres")}</span></span><div class="row">${sel.size ? '<button class="btn sm ghost" id="mxclr">Tout retirer</button>' : ""}<button class="btn sm" id="mxgo"${n ? "" : " disabled"}>${I.cards}Réviser</button></div></div>`;
      const flip = ids => { const on = all(ids); ids.forEach(x => on ? sel.delete(x) : sel.add(x)); draw(); };
      app.querySelectorAll("[data-ms]").forEach(b => b.onclick = () => flip(withCards.filter(c => c.subject_id === b.dataset.ms).map(c => c.id)));
      app.querySelectorAll("[data-mg]").forEach(b => b.onclick = () => flip(withCards.filter(c => c.group_id === b.dataset.mg).map(c => c.id)));
      app.querySelectorAll("[data-mc]").forEach(b => b.onclick = () => flip([b.dataset.mc]));
      if ($("mxclr")) $("mxclr").onclick = () => { sel.clear(); draw(); };
      $("mxgo").onclick = () => { if (!n) return; jset("merge.mixsel", { ids: [...sel] }); location.hash = "#mixte"; };
    }
    draw();
  }

  // ---------- outils d'une matière ----------
  function subjectToolsHtml(s, chs) {
    const only = examChs(s); if (only) chs = chs.filter(c => only.includes(c.id));
    const j = daysUntil(s.exam_date), weak = chs.map(c => ({ c, m: mastery(cardsOf(c.id)), n: cardsOf(c.id).length })).filter(x => x.n).sort((a, b) => a.m - b.m);
    return `${j != null && j >= 0 && weak.length ? `<div class="card pad stack"><h2>Plan de révision</h2><p class="muted">${j === 0 ? "Le contrôle est aujourd'hui." : "Il reste " + plural(j, "jour", "jours") + "."}${only ? " Seulement les chapitres du contrôle." : ""} Commence par les chapitres les moins maîtrisés.</p>${weak.slice(0, 5).map((x, i) => `<a class="row between" style="text-decoration:none;min-height:44px" href="#cartes-${x.c.id}"><span><b>${i + 1}.</b> ${esc(x.c.name)}</span><span class="pill ${x.m < 50 ? "warn" : ""}">${x.m} %</span></a>`).join("")}</div>` : ""}
`;
  }
  // Réglages de la matière (fenêtre ouverte par l'engrenage en haut à droite).
  function subjectSettingsHtml(s) {
    return `<div class="row"><span class="mico big">${I.gear}</span><h1>Réglages de la matière</h1></div><div class="field"><label for="sn">Nom</label><input id="sn" type="text" maxlength="60" value="${esc(s.name)}"></div>
        <div class="field"><span class="label">Couleur</span><div id="scol">${colorPick(s.color)}</div></div>
        <div class="row"><button class="btn sm" id="ssave">Enregistrer</button><button class="btn sm ghost" id="sdel">Supprimer la matière</button></div><div id="sbox"></div><button class="btn ghost" data-close>Fermer</button>`;
  }
  function wireSubjectTools(s) {
    let col = s.color;
    if (!$("ssave")) return;
    if ($("scol")) wireColor($("scol"), c => { col = c; });
    $("ssave").onclick = async () => { const name = $("sn").value.trim(); if (!name) return toast("Le nom ne peut pas être vide."); const { error } = await sb.from("subjects").update({ name, color: col }).eq("id", s.id); if (error) return fail(error, "Matière non enregistrée"); closeSheet(); await loadAll(); screenSubject(s.id); toast("Matière enregistrée."); };
    $("sdel").onclick = async () => {
      if (!(await askConfirm("Supprimer cette matière ?", "« " + s.name + " » et tous ses chapitres vont dans la corbeille (récupérables pendant 30 jours)."))) return;
      await (async () => { const { error } = await trashRow("subjects", s.id); if (error) return fail(error, "Suppression impossible"); await loadAll(); closeSheet(); location.hash = "#matieres"; })();
    };
  }

  // ---------- matières ----------
  function screenSubjects() {
    drawTabs("matieres");
    app.innerHTML = `<div class="row between" style="flex-wrap:wrap"><h1>Matières</h1><div class="row" style="flex-wrap:wrap"><button class="btn sm ghost" data-qs>Rechercher</button><a class="btn sm" href="#nouvelle-matiere">${I.plus}Ajouter</a></div></div>
      <div class="grid">${state.subjects.length ? state.subjects.map(s => { const chs = state.chapters.filter(c => c.subject_id === s.id); const cs = state.cards.filter(k => chs.some(c => c.id === k.chapter_id)); const m = mastery(cs), j = daysUntil(s.exam_date); return `<a class="card subject" style="--c:${esc(s.color)}" href="#matiere-${s.id}"><div class="row between"><div class="row"><span class="dot"></span><b>${esc(s.name)}</b></div>${j != null && j >= 0 ? `<span class="pill">J-${j}</span>` : ""}</div><p class="small muted">${plural(chs.length, "chapitre", "chapitres")} · ${plural(cs.length, "carte", "cartes")}</p><div class="row"><div class="bar grow"><i style="width:${m}%"></i></div><span class="small muted">${m} %</span></div></a>`; }).join("") : `<div class="card empty"><svg viewBox="0 0 120 90" aria-hidden="true"><rect x="14" y="22" width="58" height="50" rx="8" fill="var(--accent-soft)"/><rect x="34" y="12" width="58" height="50" rx="8" fill="var(--btn-bg)"/><path d="M48 30h30M48 40h22M48 50h26" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="98" cy="68" r="10" fill="var(--accent)"/><path d="M98 63v10M93 68h10" stroke="var(--accent-fg)" stroke-width="3" stroke-linecap="round"/></svg><b>Aucune matière. Ajoute ta première matière.</b><p class="small muted">Crée une matière, ajoute un chapitre, importe ton cours : tes cartes et ton résumé arrivent tout seuls.</p></div>`}</div>`;
  }

  // ---------- calendrier ----------
  // Vacances scolaires 2026-2027 par zone (arrêté du 22 octobre 2025). Premier et dernier jour inclus.
  // Mêmes dates que VACANCES_ZONES dans supabase/functions/remind/logic.mjs (un test vérifie qu'elles sont identiques).
  // Le calendrier affiche la zone A ; la zone choisie dans Réglages sert aux rappels.
  const VACANCES = VACANCES_ZONES.A;
  const vacOf = key => VACANCES.find(v => key >= v[1] && key <= v[2]);
  // Calendrier, vue du mois (le niveau le plus « dézoomé ») : toucher un jour ouvre sa journée en frise.
  function screenCalendar() {
    drawTabs("calendrier");
    const ref = jView().day ? dayOf(jView().day) : new Date(); ref.setDate(1); let picked = null;
    function draw() {
      const y = ref.getFullYear(), m = ref.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate(), today = localDay();
      const did = {}; state.sessions.forEach(x => { if (x.seconds > 0 || x.cards_reviewed > 0) did[x.day] = x; });
      const cells = []; for (let i = 0; i < first; i++) cells.push('<span class="pad"></span>');
      let daysDone = 0, secs = 0;
      for (let d = 1; d <= n; d++) {
        const key = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0"), ex = ctrls().filter(c => c.d === key).map(c => state.subjects.find(x => x.id === c.s)).filter(x => x && !isFree(x));
        if (did[key]) { daysDone++; secs += did[key].seconds || 0; }
        const vac = vacOf(key);
        cells.push(`<button type="button" class="day${key === today ? " now" : ""}${ex.length ? " has" : ""}${did[key] ? " did" : ""}${vac ? " hol" : ""}"${vac ? ` title="Vacances : ${vac[0]}"` : ""} data-day="${key}" aria-pressed="${picked === key}" aria-label="${d}${ex.length ? ", contrôle : " + esc(ex.map(x => x.name).join(", ")) : ""}${did[key] ? ", jour révisé" : ""}"><span class="dn">${d}</span><i>${ex.map(x => `<b style="background:${esc(x.color)}"></b>`).join("")}</i>${ex.slice(0, 2).map(x => `<em style="--c:${esc(x.color)}">${esc(x.name)}</em>`).join("")}</button>`);
      }
      const up = upCtrls(), free = state.subjects.filter(isFree), onDay = picked ? ctrls().filter(c => c.d === picked) : [];
      app.innerHTML = `<div class="jnav"><button class="linkbtn" id="calback">${I.back}Emploi du temps</button><span class="grow"></span><button class="btn sm" id="todayb">Aujourd'hui</button></div><h1 style="margin:0">Calendrier</h1>
        <div class="calwrap"><div class="card pad stack calcard"><div class="row between"><button class="iconbtn flat" id="prev" aria-label="Mois précédent">${I.back}</button><h2 class="calmonth">${ref.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</h2><button class="iconbtn flat" id="nextm" aria-label="Mois suivant" style="transform:scaleX(-1)">${I.back}</button></div>
          <div class="cal calx">${["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(x => `<span class="wd">${x}</span>`).join("")}${cells.join("")}</div>
          <div class="callegend"><span><i class="lg now"></i>Aujourd'hui</span><span><i class="lg did"></i>Jour révisé</span><span><i class="lg ex"></i>Contrôle</span><span><i class="lg hol"></i>Vacances (zone A)</span></div></div>
        <div class="stack calside">
          <div class="stack"><h2>Prochains contrôles</h2>${up.length ? up.map(({ c, s: x }) => `<a class="card exam" href="#matiere-${x.id}" style="--c:${esc(x.color)}"><span class="jx">${jx(c.d)}</span><span class="grow"><b>${esc(x.name)}</b><span class="small muted">${esc(fmtDate(c.d))} · ${daysUntil(c.d) === 0 ? "Aujourd'hui" : "Dans " + plural(daysUntil(c.d), "jour", "jours")}${c.ch ? " · " + plural(c.ch.length, "chapitre", "chapitres") : ""}</span></span></a>`).join("") : '<p class="muted">Aucune date pour l\'instant.</p>'}</div>
          ${(() => { const cur = vacOf(today), nx = VACANCES.find(v => v[1] > today); const fd = d => new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" }); return cur ? `<div class="card pad stack vaccard"><h2>Vacances de ${cur[0]}</h2><p class="small muted">Jusqu'au ${fd(cur[2])}. Le bon moment pour revoir les chapitres les plus fragiles.</p></div>` : nx ? `<div class="card pad stack vaccard"><h2>Prochaines vacances : ${nx[0]}</h2><p class="small muted">Du ${fd(nx[1])} au ${fd(nx[2])}, dans ${plural(daysUntil(nx[1]), "jour", "jours")}. Zone A.</p></div>` : ""; })()}
          ${(() => { const s0 = up[0] && up[0].s, pl = s0 ? planFor(s0) : []; return pl.length ? `<div class="card pad stack"><h2>Plan de révision : ${esc(s0.name)}</h2>${pl.filter(x => x.items.length || x.last).slice(0, 8).map(x => `<div class="srow"><span>${esc(new Date(x.day + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }))}</span><b>${esc(x.items.map(y => y.c.name).concat(x.last ? ["Révision générale"] : []).join(", "))}</b></div>`).join("")}<p class="note">Les chapitres les moins maîtrisés passent en premier. Le plan se recalcule chaque jour.</p></div>` : ""; })()}
          ${free.length ? `<div class="stack"><h2>En révision libre</h2><p class="small muted">En révision libre : ${free.map(x => esc(x.name)).join(", ")}.</p></div>` : ""}
          <div class="card stats two"><div class="stat s1"><span class="sico">${I.check}</span><div><b>${daysDone}</b><span>${daysDone > 1 ? "jours révisés ce mois" : "jour révisé ce mois"}</span></div></div><div class="stat s2"><span class="sico">${I.bolt}</span><div><b>${Math.round(secs / 60)} min</b><span>de révision ce mois</span></div></div></div>
        </div></div>`;
      $("todayb").onclick = () => { jGo("jour", localDay()); };
      $("calback").onclick = () => { jGo("jour"); };
      $("prev").onclick = () => { ref.setMonth(ref.getMonth() - 1); draw(); };
      $("nextm").onclick = () => { ref.setMonth(ref.getMonth() + 1); draw(); };
      app.querySelectorAll("[data-day]").forEach(b => b.onclick = () => jGo("jour", b.dataset.day));
    }
    draw();
  }

  // ---------- progrès ----------
  // « Ta semaine » sur l'accueil : une colonne par jour sur un fond toujours visible, hauteur rapportée à l'objectif du jour
  // (au moins 26 % dès qu'on a révisé, pour qu'un petit jour reste bien visible), coche si objectif atteint. Le nombre au-dessus
  // est celui qui fixe la hauteur : minutes si l'objectif est en minutes, sinon cartes (le détail complet s'affiche au survol).
  function weekHtml(week, p) {
    const byMin = p.daily_goal_kind === "minutes", goal = Math.max(1, +p.daily_goal_value || (byMin ? 15 : 20));
    const val = x => byMin ? x.seconds / 60 : x.cards_reviewed, today = localDay();
    const peak = Math.max(goal, ...week.map(val)), active = week.filter(x => x.seconds || x.cards_reviewed).length;
    const cards = week.reduce((a, x) => a + x.cards_reviewed, 0), mins = Math.round(week.reduce((a, x) => a + x.seconds, 0) / 60);
    const msg = active === 0 ? "Ta semaine commence ici : une petite session suffit pour lancer la série." : active === 1 ? "Un bon début. Vise 3 jours cette semaine, même courts." : active < 4 ? `${active} jours actifs. Encore ${4 - active} et tu tiens un vrai rythme.` : active < 7 ? `${active} jours sur 7, belle régularité.` : "7 jours sur 7, semaine parfaite.";
    const cols = week.map(x => {
      const v = val(x), on = !!(x.seconds || x.cards_reviewed), hit = v >= goal, isT = x.day === today, d = new Date(x.day + "T00:00:00");
      const h = on ? Math.max(26, Math.round(v / peak * 100)) : 0;
      return `<div class="wcol${isT ? " now" : ""}${hit ? " hit" : ""}" title="${esc(d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }))} : ${plural(x.cards_reviewed, "carte", "cartes")}, ${Math.round(x.seconds / 60)} min">
        <span class="wv">${on ? (hit ? I.check : "") + (byMin || !x.cards_reviewed ? Math.round(x.seconds / 60) + " min" : x.cards_reviewed) : ""}</span>
        <div class="wtrack"><i style="height:${h}%"></i>${on ? "" : "<b></b>"}</div><span class="wd">${isT ? "Auj." : "DLMMJVS"[d.getDay()]}</span></div>`;
    }).join("");
    return `<div class="card pad week"><div class="row between"><h2>Ta semaine</h2><span class="small muted">${plural(active, "jour actif", "jours actifs")} · ${plural(cards, "carte", "cartes")} · ${mins} min</span></div>
      <div class="wbars" role="img" aria-label="${esc(`Cette semaine : ${plural(active, "jour actif", "jours actifs")}, ${plural(cards, "carte", "cartes")}, ${mins} minutes`)}">${cols}</div>
      <p class="small muted wmsg">${msg} <span class="wgoal">Objectif : ${goal} ${byMin ? "min" : "cartes"} par jour.</span></p></div>`;
  }
  function lastDays(n, sessions) { const out = []; for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = localDay(d); out.push(Object.assign({ day: k, label: d.getDate(), seconds: 0, cards_reviewed: 0 }, sessions.find(s => s.day === k) || {})); } return out; }
  // Progrès et Duo : deux sous-onglets du même onglet (Duo a laissé sa place dans la barre du bas à Journée).
  const progSeg = cur => `<div class="seg" role="tablist" aria-label="Progrès"><a role="tab" href="#progres" aria-selected="${cur === "progres"}">Mes progrès</a><a role="tab" href="#duo" aria-selected="${cur === "duo"}">Duo</a></div>`;
  function screenProgress() {
    drawTabs("progres");
    const d14 = lastDays(14, state.sessions), d7 = d14.slice(7), max = Math.max(1, ...d14.map(d => d.cards_reviewed));
    const mins = Math.round(d7.reduce((s, d) => s + d.seconds, 0) / 60), cards7 = d7.reduce((s, d) => s + d.cards_reviewed, 0);
    const lv = xpInfo(), coins = coinsInfo().balance;
    const go = (h, ic, t, sub) => `<a class="card ptile" href="#${h}"><span class="mico">${I[ic]}</span><span class="grow" style="min-width:0"><b>${t}</b><span class="small muted">${sub}</span></span></a>`;
    app.innerHTML = `${progSeg("progres")}<h1>Progrès</h1>
      <div class="card pad stack prohero"><div class="level"><span class="lvl">Niveau ${lv.level}</span><div class="bar grow"><i style="width:${lv.pct}%"></i></div><span class="small muted">encore ${lv.left} pts</span></div>
        <a class="pshop" href="#boutique"><span class="mico">${I.coin}</span><span class="grow"><b>Boutique</b><span class="small">${plural(coins, "pièce", "pièces")} à dépenser</span></span><span class="pshopgo">Ouvrir</span></a>
        <p class="note">${lv.xp} points au total. 10 points par bonne réponse, 2 par erreur, 100 par chapitre maîtrisé à 100 %. ${streakInfo().left ? "Gel de série disponible : un jour raté cette semaine ne cassera pas ta série." : "Ton gel de série a déjà servi cette semaine."}</p></div>
      <div class="prgrid">${go("recompenses", "star", "Récompenses", "Coffres, cadeaux")}${go("bilan", "chart", "Bilan", "Ta semaine")}${go("erreurs", "trap", "Erreurs", "Cartes ratées")}</div>
      <div class="tiles"><div class="card tile"><b>${streak()}</b><span>jours d'affilée</span></div><div class="card tile"><b>${cards7}</b><span>cartes en 7 jours</span></div><div class="card tile"><b>${mins}</b><span>minutes en 7 jours</span></div><div class="card tile"><b>${mastery(state.cards)} %</b><span>maîtrise moyenne</span></div></div>
      <div class="card pad stack"><h2>Cartes révisées, 14 derniers jours</h2><div class="bars" role="img" aria-label="Cartes révisées par jour sur 14 jours">${d14.map(d => `<div><i style="height:${Math.max(3, d.cards_reviewed / max * 100)}%" class="${d.cards_reviewed ? "" : "zero"}" title="${d.cards_reviewed}"></i><span>${d.label}</span></div>`).join("")}</div></div>
      <div class="stack"><h2>Par matière</h2><div class="grid">${state.subjects.map(s => { const chs = state.chapters.filter(c => c.subject_id === s.id), cs = state.cards.filter(k => chs.some(c => c.id === k.chapter_id)), m = mastery(cs); return `<a class="card subject" style="--c:${esc(s.color)}" href="#matiere-${s.id}"><div class="row between"><div class="row"><span class="dot"></span><b>${esc(s.name)}</b></div><span class="small muted">${m} %</span></div><div class="bar"><i style="width:${m}%"></i></div></a>`; }).join("") || '<p class="muted">Aucune matière.</p>'}</div></div>
      <div class="card pad stack"><h2>Badges</h2><div class="chips">${badges().map(b => `<span class="badge ${b[1] ? "on" : ""}">${b[0]}</span>`).join("")}</div></div>
      <div class="card pad stack"><h2>Mes notes</h2><div id="notes"><p class="muted">Chargement…</p></div></div>`;
    Promise.all([sb.from("quiz_results").select("score,created_at").eq("user_id", state.user.id).order("created_at"), sb.from("exams").select("chapter_id,best_score").eq("user_id", state.user.id)]).then(([q, e]) => {
      if (!$("notes")) return; const qs = (q.data || []).slice(-12), ex = (e.data || []).filter(x => x.best_score != null);
      $("notes").innerHTML = (qs.length ? `<p class="label">Quiz (sur 20), du plus ancien au plus récent</p><div class="bars" style="height:110px" role="img" aria-label="Notes des derniers quiz">${qs.map(x => `<div><i style="height:${Math.max(4, x.score / 20 * 100)}%"></i><span>${String(x.score).replace(".", ",")}</span></div>`).join("")}</div>` : '<p class="muted">Aucun quiz pour l\'instant.</p>')
        + (ex.length ? `<p class="label" style="margin-top:12px">Contrôles : meilleure note</p>${ex.map(x => { const c = state.chapters.find(k => k.id === x.chapter_id); return `<div class="row between" style="min-height:36px"><span>${esc(c ? c.name : "Chapitre")}</span><b>${String(x.best_score).replace(".", ",")} / 20</b></div>`; }).join("")}` : "");
    });
  }

  // Copier un texte, même là où l'API presse-papiers est refusée (ancien Safari, page non sécurisée).
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) {
      const ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;left:-9999px;top:0"; document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, t.length);
      let ok = false; try { ok = document.execCommand("copy"); } catch (e2) { ok = false; } ta.remove(); return ok;
    }
  }
  const duoLink = code => location.origin + location.pathname + "#duo-" + encodeURIComponent(code);
  // ---------- duo (partage de statistiques à deux) ----------
  async function screenDuo() {
    drawTabs("progres"); app.innerHTML = `${progSeg("duo")}<h1>Duo</h1><p class="muted">Chargement…</p>`;
    const { data: partners, error } = await sb.rpc("share_partners");
    if (error) return fail(error, "Partage non chargé");
    const p = (partners || [])[0];
    if (p && safeGet("merge.duoin")) { safeSet("merge.duoin", ""); toast("Tu es déjà en duo : arrête ce partage pour en rejoindre un autre."); }
    if (!p) {
      const pending = safeGet("merge.duoin") || "";
      app.innerHTML = `${progSeg("duo")}<h1>Duo</h1>
        ${pending ? `<div class="card pad stack duoin"><h2>Invitation reçue</h2><p class="muted">Quelqu'un t'invite à réviser en duo. Rejoins-le pour voir vos statistiques côte à côte.</p><button class="btn" id="acceptLink">Rejoindre le duo</button><button class="btn ghost" id="dropLink">Pas maintenant</button></div>` : ""}
        <div class="card pad stack"><h2>Révisez à deux</h2><p class="muted">Invite une personne : vous verrez chacun les statistiques de l'autre (temps de révision, cartes révisées, série de jours, maîtrise, moyenne des quiz). Vos cours, résumés et cartes restent privés. Chacun peut arrêter le partage quand il veut.</p>
          <button class="btn" id="invite">Créer une invitation</button><p class="note" id="code" role="status"></p></div>
        <div class="card pad stack"><h2>J'ai reçu un code</h2><div class="field"><label for="incode">Code d'invitation</label><input id="incode" type="text" autocomplete="off" value="${esc(pending)}"></div><button class="btn ghost" id="accept">Rejoindre</button></div>`;
      $("invite").onclick = async () => {
        const r = await sb.rpc("create_share_invite"); if (r.error) return fail(r.error, "Invitation non créée");
        const code = String(r.data), link = duoLink(code);
        $("code").outerHTML = `<div class="duocode stack" id="code" role="status"><span class="small muted">Ton code d'invitation</span><b class="dcode">${esc(code)}</b>
          <div class="row wrap"><button class="btn grow" id="dshare">${I.share}Partager le lien</button><button class="btn ghost grow" id="dcopy">${I.copy}Copier le code</button></div>
          <p class="note">La personne touche le lien : Merge s'ouvre avec le code déjà rempli. Elle peut aussi coller le code dans son onglet Duo.</p></div>`;
        $("dcopy").onclick = async () => toast(await copyText(code) ? "Code copié." : "Copie impossible : sélectionne le code à la main.");
        $("dshare").onclick = async () => {
          const text = `Révise avec moi sur Merge : touche ce lien pour rejoindre mon duo (code ${code}).`;
          if (navigator.share) { try { await navigator.share({ title: "Merge. en duo", text, url: link }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
          toast(await copyText(link) ? "Lien copié : colle-le dans un message." : "Copie impossible.");
        };
      };
      const join = async c => { if (!c) return toast("Colle le code reçu."); const r = await sb.rpc("accept_share_invite", { code: c }); if (r.error) return toast("Ce code n'est pas valide ou a déjà servi."); safeSet("merge.duoin", ""); toast("C'est parti, vous révisez en duo."); screenDuo(); };
      $("accept").onclick = () => join($("incode").value.trim());
      if ($("acceptLink")) { $("acceptLink").onclick = () => join(pending); $("dropLink").onclick = () => { safeSet("merge.duoin", ""); screenDuo(); }; }
      return;
    }
    const since = new Date(); since.setDate(since.getDate() - 120);
    const { data: theirs } = await sb.from("study_sessions").select("day,seconds,cards_reviewed").eq("user_id", p.partner_id).gte("day", localDay(since));
    const stat = (ss) => { const d7 = lastDays(7, ss || []); const days = new Set((ss || []).filter(s => s.cards_reviewed > 0).map(s => s.day)); let st = 0; const d = new Date(); if (!days.has(localDay(d))) d.setDate(d.getDate() - 1); while (days.has(localDay(d))) { st++; d.setDate(d.getDate() - 1); } return { min: Math.round(d7.reduce((s, x) => s + x.seconds, 0) / 60), cards: d7.reduce((s, x) => s + x.cards_reviewed, 0), streak: st }; };
    const me = stat(state.sessions), them = stat(theirs), name = p.display_name || "Ton duo";
    const [ps, myq] = await Promise.all([sb.rpc("partner_stats", { partner: p.partner_id }), sb.from("quiz_results").select("score").eq("user_id", state.user.id)]);
    const theirsX = (ps.data && ps.data[0]) || { mastery: 0, quiz_avg: null }, mq = (myq.data || []).map(x => +x.score), myAvg = mq.length ? Math.round(mq.reduce((a, b) => a + b, 0) / mq.length * 10) / 10 : 0;
    const line = (label, a, b, unit) => `<tr><th scope="row">${label}</th><td class="${a >= b ? "win" : ""}">${a} ${unit}</td><td class="${b >= a ? "win" : ""}">${b} ${unit}</td></tr>`;
    app.innerHTML = `${progSeg("duo")}<h1>Duo</h1>
      <div class="card pad stack"><h2>Cette semaine</h2><table class="duo"><thead><tr><td></td><th scope="col">Toi</th><th scope="col">${esc(name)}</th></tr></thead><tbody>${line("Temps", me.min, them.min, "min")}${line("Cartes", me.cards, them.cards, "")}${line("Série", me.streak, them.streak, "j")}${line("Maîtrise", mastery(state.cards), theirsX.mastery || 0, "%")}${line("Moyenne des quiz", myAvg, +(theirsX.quiz_avg || 0), "/ 20")}</tbody></table></div>
      <div class="card pad stack"><h2>Ce qui est partagé</h2><p class="muted">${esc(name)} voit ton temps de révision, ton nombre de cartes révisées, ta série de jours, ta maîtrise et ta moyenne de quiz, et tu vois les siens. Vos cours, résumés et cartes restent privés.</p><button class="btn ghost" id="stop">Arrêter le partage</button></div>`;
    $("stop").onclick = async () => { const r = await sb.rpc("revoke_share", { link: p.link_id }); if (r.error) return fail(r.error, "Arrêt impossible"); toast("Partage arrêté."); screenDuo(); };
  }

