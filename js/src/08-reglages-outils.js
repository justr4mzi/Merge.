  // ---------- réglages ----------
  // Vacances en cours ou à venir dans la zone choisie (affichées sous le choix de zone).
  function remindVac(p) {
    const zone = ["A", "B", "C"].includes(p.holiday_zone) ? p.holiday_zone : "A", today = localDay(), list = VACANCES_ZONES[zone];
    const v = list.find(x => today >= x[1] && today <= x[2]) || list.find(x => x[1] > today); if (!v) return null;
    const fd = d => new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    return { zone, label: (v[0] === "Été" ? "été, à partir du " + fd(v[1]) : v[0] + ", du " + fd(v[1]) + " au " + fd(v[2])) };
  }
  function screenSettings() {
    drawTabs("reglages");
    const p = state.profile;
    const chips = (name, list, cur) => `<div class="chips">${list.map(t => `<button class="chip" data-${name}="${t[0]}" aria-pressed="${cur === t[0]}">${t[1]}</button>`).join("")}</div>`;
    // Design A (16 nov.) : liste façon iPhone. Chaque ligne ouvre sa section (les sections restent dans la page, une seule
    // est montrée à la fois, avec « ‹ Réglages » pour revenir à la liste).
    const goalTxt = p.daily_goal_kind === "cards" ? p.daily_goal_value + " cartes/jour" : p.daily_goal_value + " min/jour";
    const row = (sec, ic, col, label, val, href) => `<${href ? `a href="${href}"` : `button type="button" data-open="${sec}"`} class="setrow"><span class="setico" style="background:${col}">${I[ic]}</span><span class="grow">${label}</span>${val ? `<span class="setval">${val}</span>` : ""}<span class="chev">${I.back}</span></${href ? "a" : "button"}>`;
    const menu = `<div class="setmenu stack">
      <button type="button" class="setprof" data-open="profil"><span class="setav">${esc((p.display_name || "?").trim().slice(0, 1).toUpperCase())}</span><span class="grow"><b>${esc(p.display_name || "Ton profil")}</b><span class="small muted">${esc(p.classe || "Classe")} · objectif ${goalTxt}</span></span><span class="chev">${I.back}</span></button>
      <p class="setgrp">Révision</p><div class="setlist">${row("revision", "cards", "#7f77dd", "Révision et voix", "")}${row("rappels", "bell", "#1d9e75", "Rappels", p.reminders_enabled === false ? "Coupés" : esc((p.reminder_time || "").slice(0, 5)))}${row("", "cal", "#378add", "Emploi du temps", "", "#edt")}</div>
      <p class="setgrp">Appli</p><div class="setlist">${row("apparence", "moon", "#5f5e5a", "Apparence", { light: "Clair", dark: "Sombre", system: "Auto" }[p.theme] || "")}${row("ia", "spark", "#d4537e", "IA", "")}${row("partage", "duo", "#0ea5a4", "Ce qui est partagé", "")}</div>
      <p class="setgrp">Compte</p><div class="setlist">${row("archives", "folder", "#a16207", "Archives", "")}${row("donnees", "trash", "#e5484d", "Supprimer mes données", "")}</div>
      <button class="btn ghost" id="logout">Se déconnecter</button>
      <p class="note">${esc(state.user.email || "")}</p></div>
      <button type="button" class="linkbtn setback" id="setback">${I.back}Réglages</button>`;
    app.innerHTML = `<h1>Réglages</h1>${menu}
      <div class="card pad stack" data-sec-card="profil"><h2>Ton profil</h2>
        <div class="field"><label for="prenom">Prénom</label><input id="prenom" type="text" value="${esc(p.display_name || "")}"></div>
        <div class="field"><label for="classe">Classe</label><select id="classe">${classOpts(p.classe)}</select>${classeFree()}</div>
        <div class="field"><span class="label">Objectif par jour</span>${chips("k", [["minutes", "En minutes"], ["cards", "En cartes"]], p.daily_goal_kind)}<input id="val" type="number" inputmode="numeric" min="1" max="500" value="${p.daily_goal_value}" aria-label="Valeur de l'objectif"></div>
        <button class="btn" id="saveP">Enregistrer</button></div>
      <div class="card pad stack" data-sec-card="apparence"><h2>Apparence</h2>
        <div class="field"><span class="label">Thème</span>${chips("t", [["light", "Clair"], ["dark", "Sombre"], ["system", "Comme mon téléphone"]], p.theme)}</div>
        <div class="field"><span class="label">Taille du texte</span>${chips("s", [["small", "Petit"], ["normal", "Normal"], ["large", "Grand"]], p.text_size)}</div></div>
      <div class="card pad stack" data-sec-card="revision"><h2>Révision</h2>
        <div class="field"><span class="label">Avant un contrôle, revoir les cartes de ses chapitres tous les jours</span>${chips("boost", [["0", "Jamais"], ["3", "3 jours avant"], ["7", "7 jours avant"], ["14", "14 jours avant"]], String(boostDays()))}<p class="small muted">Ces cartes reviennent chaque jour, même réussies, jusqu'au contrôle. Les autres suivent la répétition espacée normale.</p></div>
        <div class="field"><span class="label">Sons et vibrations</span>${chips("snd", [["1", "Activés"], ["0", "Coupés"]], p.sounds === false ? "0" : "1")}</div>
        <div class="field"><span class="label">Voix qui lit tes cartes</span><div class="chips"><button class="chip" data-ve="merge" aria-pressed="${neuralWanted()}">Voix Merge</button><button class="chip" data-ve="appareil" aria-pressed="${!neuralWanted()}">Voix de mon appareil</button></div><div class="row"><button class="btn sm ghost" id="vtry">Écouter un exemple</button></div><p class="note">La voix Merge est plus naturelle. Sans réseau, c'est la voix de ton appareil qui prend le relais.</p></div>
        ${"speechSynthesis" in window ? `<div class="field"><label for="voice">Voix de l'appareil</label><select id="voice"><option value="">Chargement des voix…</option></select><div class="row"><label class="small muted" for="vrate">Vitesse</label><input id="vrate" class="grow" type="range" min="0.5" max="2" step="0.05" value="${voiceRate()}"><button class="btn sm ghost" id="vtest">Écouter</button></div><p class="note">Les voix viennent de ton appareil et de ton navigateur. Merge choisit la plus naturelle. Sur PC, Microsoft Edge en propose de bien meilleures que Chrome.</p></div>` : ""}
        <button class="btn sm ghost" id="tuto">Revoir le tutoriel</button></div>
      <div class="card pad stack" data-sec-card="rappels" id="rappels"><h2>Rappels</h2>
        <button type="button" class="switch" role="switch" id="remOn" aria-checked="${p.reminders_enabled !== false}"><i></i><span>Recevoir les rappels</span></button>
        <div class="stack" id="remOpts"${p.reminders_enabled === false ? ' style="display:none"' : ""}>
          <div class="field"><label for="rem">Heure du rappel quotidien</label><input id="rem" type="time" value="${esc((p.reminder_time || "").slice(0, 5))}"><p class="note">Seulement si tu n'as pas encore révisé ce jour-là. À 21 h, un dernier rappel si ta série est en danger.</p></div>
          <button type="button" class="switch" role="switch" id="qWe" aria-checked="${p.quiet_weekend === true}"><i></i><span>Silence le week-end</span></button>
          <button type="button" class="switch" role="switch" id="qVac" aria-checked="${p.quiet_holidays === true}"><i></i><span>Silence pendant les vacances scolaires</span></button>
          <div class="field"><span class="label">Ta zone de vacances</span>${chips("zone", [["A", "Zone A"], ["B", "Zone B"], ["C", "Zone C"]], ["A", "B", "C"].includes(p.holiday_zone) ? p.holiday_zone : "A")}<p class="note">Zone A : Lyon, Bordeaux, Grenoble… Zone B : Lille, Marseille, Nantes… Zone C : Paris, Créteil, Versailles, Montpellier, Toulouse.${(() => { const v = remindVac(p); return v ? " Prochaines vacances (zone " + v.zone + ") : " + v.label + "." : ""; })()}</p></div>
          <p class="note">Les rappels de contrôle (une semaine avant, 3 jours avant, la veille et le matin à 7 h 30) arrivent même le week-end et pendant les vacances.</p>
          <button class="btn sm" id="pushon">Activer les rappels sur cet appareil</button><p class="note" id="pushmsg">Sur iPhone, ajoute d'abord Merge à l'écran d'accueil (Partager, puis « Sur l'écran d'accueil »).</p>
        </div>
        <p class="note">Ces réglages sont les mêmes sur ton téléphone et ton ordinateur.</p></div>
      <div class="card pad stack" data-sec-card="ia"><h2>IA</h2><p class="muted" id="quota">Appels IA aujourd'hui : …</p><p class="note">Tout ce que l'IA prépare (résumés, quiz, fiches, cartes mentales…) est gardé : rouvrir un contenu ne coûte aucun appel.</p><a class="btn sm ghost" href="${esc(C.CONTACT_CREATEUR)}" target="_blank" rel="noopener" style="align-self:flex-start">${I.mail}Contacter le créateur</a></div>
      <div class="card pad stack" data-sec-card="partage"><h2>Ce qui est partagé</h2><p class="muted">Tes cours, résumés et cartes restent toujours privés. Le partage de statistiques à deux se règle dans l'onglet Duo.</p><a class="btn sm ghost" href="#duo">Ouvrir Duo</a></div>
      <div class="card pad stack" data-sec-card="archives"><h2>Archives</h2><p class="muted">En fin d'année, range tes anciennes matières. Elles restent consultables et tu peux les restaurer.</p><div class="row" style="flex-wrap:wrap"><button class="btn sm ghost" id="archShow">Voir mes archives</button><a class="btn sm ghost" href="#corbeille">Corbeille</a><button class="btn sm ghost" id="archAll">Archiver toutes mes matières</button></div><div id="archBox" class="stack"></div></div>
      <div class="card pad stack" data-sec-card="donnees"><h2>Supprimer mes données</h2><p class="muted">Efface définitivement tes matières, chapitres, cartes, résumés, notes et statistiques. Impossible à annuler.</p><div class="field"><label for="delw">Écris SUPPRIMER pour confirmer</label><input id="delw" type="text" autocomplete="off"></div><button class="btn sm peach" id="delall">Supprimer toutes mes données</button></div>
`;
    // Grand écran (17 nov.) : la liste à gauche, la section à droite (Profil par défaut), comme les réglages d'un ordinateur.
    const wide = () => matchMedia("(min-width:1100px)").matches;
    const mark = k => { app.querySelectorAll("[data-sec-card]").forEach(c => c.classList.toggle("on", c.dataset.secCard === k)); app.querySelectorAll(".setmenu [data-open]").forEach(b => b.classList.toggle("cur", b.dataset.open === k)); };
    const openSec = (k, keep) => { if (k) app.dataset.sec = k; else app.removeAttribute("data-sec"); mark(k || (wide() ? "profil" : null)); if (!keep && !wide()) window.scrollTo(0, 0); };
    // Un réglage changé redessine l'écran : la section ouverte reste ouverte, à la même hauteur.
    if (app.dataset.sec) openSec(app.dataset.sec, true); else mark(wide() ? "profil" : null);
    app.querySelectorAll("[data-open]").forEach(b => b.onclick = () => openSec(b.dataset.open));
    $("setback").onclick = () => openSec(null);
    let kind = p.daily_goal_kind;
    const patch = async (o, msg) => { const { error } = await sb.from("profiles").update(o).eq("user_id", state.user.id); if (error) return fail(error, "Réglage non enregistré"); Object.assign(state.profile, o); applyLook(state.profile); screenSettings(); if (msg) toast(msg); };
    app.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { kind = b.dataset.k; app.querySelectorAll("[data-k]").forEach(x => x.setAttribute("aria-pressed", x === b)); });
    app.querySelectorAll("[data-t]").forEach(b => b.onclick = () => patch({ theme: b.dataset.t }));
    app.querySelectorAll("[data-s]").forEach(b => b.onclick = () => patch({ text_size: b.dataset.s }));
    app.querySelectorAll("[data-snd]").forEach(b => b.onclick = () => patch({ sounds: b.dataset.snd === "1" }));
    $("rem").onchange = () => patch({ reminder_time: $("rem").value || null }, "Heure enregistrée.");
    $("remOn").onclick = () => { const on = p.reminders_enabled === false; patch({ reminders_enabled: on }, on ? "Rappels activés." : "Rappels coupés. Plus aucune notification."); };
    $("qWe").onclick = () => { const on = p.quiet_weekend !== true; patch({ quiet_weekend: on }, on ? "Pas de rappel le samedi et le dimanche." : "Rappels aussi le week-end."); };
    $("qVac").onclick = () => { const on = p.quiet_holidays !== true; patch({ quiet_holidays: on }, on ? "Pas de rappel pendant les vacances." : "Rappels aussi pendant les vacances."); };
    app.querySelectorAll("[data-boost]").forEach(b => b.onclick = () => { jset("merge.boostj", +b.dataset.boost); toast(+b.dataset.boost ? "Cartes du contrôle tous les jours, " + b.dataset.boost + " jours avant." : "Répétition espacée seule."); screenSettings(); });
    app.querySelectorAll("[data-zone]").forEach(b => b.onclick = () => patch({ holiday_zone: b.dataset.zone }, "Zone " + b.dataset.zone + " enregistrée."));
    $("tuto").onclick = tutorial; wireClasse();
    if ($("voice")) {
      const fill = () => { const sel = $("voice"); if (!sel) return; const vs = voicesFor("fr").sort((a, b) => voiceScore(b) - voiceScore(a)), cur = pickVoice("fr"); sel.innerHTML = vs.length ? vs.map((v, i) => `<option value="${esc(v.voiceURI)}"${cur && v.voiceURI === cur.voiceURI ? " selected" : ""}>${esc(v.name.replace(/^Microsoft |^Google /, m => m))}${i === 0 ? " (recommandée)" : ""}</option>`).join("") : '<option value="">Aucune voix française sur cet appareil</option>'; };
      fill(); try { speechSynthesis.onvoiceschanged = fill; } catch (e) { /* liste fixe */ }
      $("voice").onchange = () => { safeSet("merge.voice", $("voice").value); speakText("Voici la voix qui lira tes cartes.", "fr-FR"); };
      $("vrate").onchange = () => safeSet("merge.rate", $("vrate").value);
      $("vtest").onclick = () => speakText("La mitose donne deux cellules filles génétiquement identiques.", "fr-FR");
    }
    {
      app.querySelectorAll("[data-ve]").forEach(b => b.onclick = () => { safeSet("merge.vengine", b.dataset.ve); app.querySelectorAll("[data-ve]").forEach(x => x.setAttribute("aria-pressed", x === b)); speakText("Voici la voix qui lira tes cartes.", "fr-FR"); });
      if ($("vtry")) $("vtry").onclick = () => speakText("La mitose donne deux cellules filles génétiquement identiques à la cellule mère.", "fr-FR");
    }
    $("pushon").onclick = async () => {
      const msg = $("pushmsg");
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) throw new Error("Cet appareil ou ce navigateur ne gère pas les notifications. Sur iPhone, ouvre Merge depuis l'écran d'accueil.");
        if (!p.reminder_time) throw new Error("Choisis d'abord une heure de rappel juste au-dessus.");
        if ((await Notification.requestPermission()) !== "granted") throw new Error("Tu as refusé les notifications. Autorise-les dans les réglages du navigateur.");
        const reg = await navigator.serviceWorker.ready, raw = atob(C.VAPID_PUBLIC_KEY.replace(/-/g, "+").replace(/_/g, "/") + "="), key = Uint8Array.from(raw, ch => ch.charCodeAt(0));
        const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }), j = sub.toJSON();
        const { error } = await sb.from("push_subscriptions").upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris" });
        if (error) throw error;
        msg.className = "note"; msg.textContent = "Rappels activés sur cet appareil, chaque jour vers " + String(p.reminder_time).slice(0, 5) + ".";
      } catch (e) { msg.className = "err"; msg.textContent = e.message || "Activation impossible."; }
    };
    $("archShow").onclick = async () => {
      let { data, error } = await sb.from("subjects").select("*").eq("archived", true).eq("user_id", state.user.id); if (error) return fail(error, "Archives non chargées"); data = (data || []).filter(x => !x.deleted_at);
      $("archBox").innerHTML = (data || []).length ? data.map(a => `<div class="row between"><span>${esc(a.name)}${a.school_year ? " · " + a.school_year + "-" + (a.school_year + 1) : ""}</span><button class="mini" data-rest="${a.id}">Restaurer</button></div>`).join("") : '<p class="muted">Aucune matière archivée.</p>';
      $("archBox").querySelectorAll("[data-rest]").forEach(b => b.onclick = async () => { const r = await sb.from("subjects").update({ archived: false }).eq("id", b.dataset.rest); if (r.error) return fail(r.error, "Restauration impossible"); await loadAll(); toast("Matière restaurée."); $("archShow").click(); });
    };
    $("archAll").onclick = async () => {
      if ($("archAll").dataset.ok !== "1") { $("archAll").dataset.ok = "1"; $("archAll").textContent = "Confirmer l'archivage"; return; }
      const r = await sb.from("subjects").update({ archived: true }).eq("user_id", state.user.id).eq("archived", false); if (r.error) return fail(r.error, "Archivage impossible");
      await loadAll(); toast("Matières archivées."); screenSettings();
    };
    $("delall").onclick = async () => {
      if ($("delw").value.trim() !== "SUPPRIMER") return toast("Écris SUPPRIMER en majuscules pour confirmer.");
      const r = await sb.rpc("delete_my_data"); if (r.error) return fail(r.error, "Suppression impossible");
      safeSet("merge.cache." + state.user.id, ""); await sb.auth.signOut(); state.user = null; state.profile = null; screenLogin("Tes données ont été supprimées.");
    };
    $("saveP").onclick = () => {
      const name = $("prenom").value.trim(); if (!name) return toast("Le prénom ne peut pas être vide.");
      const o = { display_name: name, daily_goal_kind: kind, daily_goal_value: Math.min(500, Math.max(1, parseInt($("val").value, 10) || 15)) };
      o.school_year = new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1;
      const cv = classeVal(); if (!cv) return toast("Écris le nom de ta formation."); if (cv !== p.classe) { o.classe = cv; o.classe_updated_at = new Date().toISOString(); }
      patch(o, "Profil enregistré.");
    };
    $("logout").onclick = async () => { await sb.auth.signOut(); state.user = null; screenLogin(); };
    ai({ action: "quota" }).then(q => { if ($("quota")) $("quota").textContent = "Appels IA aujourd'hui : " + q.calls + "." + (q.calls >= q.quota ? " " + QUOTA_MSG : ""); }).catch(() => {});
  }

  // ---------- petits sons (désactivables dans Réglages) ----------
  let actx = null;
  function ping(ok) {
    if (!state.profile || state.profile.sounds === false) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain(); o.connect(g); g.connect(actx.destination);
      const pack = (rwEquipped("son") || {}).v || "doux", t0 = actx.currentTime;
      o.type = pack === "arcade" ? "square" : pack === "cristal" ? "triangle" : "sine";
      o.frequency.setValueAtTime(ok ? (pack === "cristal" ? 1046 : 660) : 220, t0); if (ok && pack !== "doux") o.frequency.setValueAtTime(pack === "arcade" ? 990 : 1568, t0 + 0.08);
      g.gain.setValueAtTime(pack === "arcade" ? 0.035 : 0.06, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + (pack === "doux" ? 0.18 : 0.26));
      o.start(); o.stop(t0 + 0.28);
      if (navigator.vibrate) navigator.vibrate(ok ? 10 : [20, 40, 20]);
    } catch (e) { /* son indisponible */ }
  }

  // ---------- tutoriel (3 écrans) ----------
  function tutorial() {
    tabs.hidden = true; let i = 0;
    const steps = [[I.up, "Commence par un cours", "Ouvre une matière, crée un chapitre et importe ton cours : un PDF, des photos de ton cahier, un diaporama ou du texte. Merge lit tout, même les schémas et l'écriture à la main, et prépare un résumé et des cartes."], [I.cards, "Révise un peu chaque jour", "L'accueil te montre les cartes du jour et ton plan avant les contrôles. Une carte ratée revient jusqu'à ce que tu la réussisses. Pas besoin de tout faire d'un coup : quelques minutes suffisent."], [I.listen, "Choisis ta façon de réviser", "Interro écrite, quiz, jeux, khôlle à l'oral, écoute dans le bus, ou des questions à ton professeur IA. Tout vient de ton cours, rien n'est inventé. Et tout te suit du téléphone à l'ordi."]];
    function draw() {
      const s = steps[i];
      app.innerHTML = `<div class="center" style="text-align:center;align-items:center"><div class="tutoicon">${s[0]}</div><h1>${s[1]}</h1><p class="muted">${s[2]}</p><div class="row">${steps.map((_, k) => `<span class="dot" style="--c:${k === i ? "var(--accent)" : "var(--track)"}"></span>`).join("")}</div><button class="btn" id="tn" style="align-self:stretch">${i < 2 ? "Suivant" : "C'est parti"}</button>${i < 2 ? '<button class="linkbtn" id="ts">Passer</button>' : ""}</div>`;
      const done = () => { safeSet("merge.tuto", "1"); location.hash = "#accueil"; route(); };
      $("tn").onclick = () => { if (i < 2) { i++; draw(); } else done(); };
      if ($("ts")) $("ts").onclick = done;
    }
    draw();
  }

  // ---------- recherche dans les cartes ----------
  // Recherche dans les cartes, les résumés et le texte complet des cours importés.
  let searchPending = "";
  function screenSearch() {
    drawTabs("matieres");
    app.innerHTML = `<div class="row"><a class="iconbtn" href="#matieres" aria-label="Retour">${I.back}</a><h1>Recherche</h1></div>
      <form id="sf" class="row"><input id="sq" type="search" class="grow" placeholder="Un mot du cours, une notion…" aria-label="Rechercher dans mes cours et mes cartes" value="${esc(searchPending)}"><button class="btn" type="submit">Chercher</button></form><p class="small muted">Cherche dans tes cartes, tes résumés et le texte complet de tes cours.</p><div class="stack" id="sr"></div>`;
    const snip = (text, q) => { const t = String(text || ""), n = norm(t), k = n.indexOf(norm(q)); if (k < 0) return null; const a = Math.max(0, k - 90), b = Math.min(t.length, k + q.length + 140); const raw = (a ? "…" : "") + t.slice(a, b).replace(/\s+/g, " ") + (b < t.length ? "…" : ""); const re = new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig"); return esc(raw).replace(re, "<mark>$1</mark>"); };
    const count = (text, q) => { const n = norm(text), m = norm(q); let c = 0, i = 0; while ((i = n.indexOf(m, i)) >= 0) { c++; i += m.length; } return c; };
    async function run(q) {
      $("sr").innerHTML = '<p class="muted">Recherche…</p>';
      const qq = q.replace(/[%,()*\\]/g, " ").trim();
      const [cr, sr, tr] = await Promise.all([
        sb.from("cards").select("id,front,back,chapter_id").or(`front.ilike.%${qq}%,back.ilike.%${qq}%`).limit(40),
        sb.from("summaries").select("chapter_id,markdown").ilike("markdown", `%${qq}%`).limit(20),
        sb.from("sources").select("chapter_id,filename,extracted_text").ilike("extracted_text", `%${qq}%`).limit(20)
      ]);
      if (cr.error && sr.error && tr.error) return fail(cr.error, "Recherche impossible");
      const chName = id => { const ch = state.chapters.find(x => x.id === id); return ch ? ch.name : ""; }, mine = id => state.chapters.some(x => x.id === id);
      const course = (tr.data || []).filter(x => mine(x.chapter_id)).map(x => ({ x, s: snip(x.extracted_text, qq), n: count(x.extracted_text, qq) })).filter(o => o.s);
      const sums = (sr.data || []).filter(x => mine(x.chapter_id)).map(x => ({ x, s: snip(x.markdown, qq) })).filter(o => o.s);
      const cards = (cr.data || []).filter(c => mine(c.chapter_id));
      const sec = (t, n, body) => n ? `<h2>${t} <span class="small muted">(${n})</span></h2>${body}` : "";
      $("sr").innerHTML = (sec("Dans tes cours", course.length, course.map(o => `<a class="card term" style="text-decoration:none" href="#resume-${o.x.chapter_id}"><span class="small muted">${esc(chName(o.x.chapter_id))} · ${esc(o.x.filename || "Cours")} · ${plural(o.n, "fois", "fois")}</span><p class="snip">${o.s}</p></a>`).join(""))
        + sec("Dans tes résumés", sums.length, sums.map(o => `<a class="card term" style="text-decoration:none" href="#resume-${o.x.chapter_id}"><span class="small muted">${esc(chName(o.x.chapter_id))}</span><p class="snip">${o.s}</p></a>`).join(""))
        + sec("Dans tes cartes", cards.length, cards.map(c => `<a class="card term" style="text-decoration:none" href="#chapitre-${c.chapter_id}"><span class="small muted">${esc(chName(c.chapter_id))}</span><b>${cfront(c, true)}</b><p>${mx(c.back)}</p></a>`).join("")))
        || '<p class="muted">Rien trouvé dans tes cours, tes résumés ni tes cartes. Essaie un autre mot.</p>';
    }
    $("sf").onsubmit = (e) => { e.preventDefault(); const q = $("sq").value.trim(); if (q.length < 2) return toast("Écris au moins 2 lettres."); searchPending = q; run(q); };
    if (searchPending.length >= 2) run(searchPending);
    $("sq").focus();
  }


  // ---------- emploi du temps : saisie, photo ou PDF (lu par l'IA), semaines A et B, suggestion du soir ----------
  const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const edtGet = () => { const e = jget("merge.edt", null) || {}; return { slots: Array.isArray(e.slots) ? e.slots : [], ab: !!e.ab, ref: e.ref || null }; };
  const mondayOf = (d) => { const m = new Date(d); m.setHours(0, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m; };
  // Semaine A ou B : l'élève dit une fois laquelle est la semaine en cours, ensuite on alterne chaque lundi.
  // Le samedi et le dimanche, on parle de la semaine qui arrive (lundi prochain), avec les dates, pour que ce soit clair.
  function abMonday() { const n = new Date(), m = mondayOf(n); if (n.getDay() === 6 || n.getDay() === 0) m.setDate(m.getDate() + 7); return m; }
  function abQuestion() { const m = abMonday(), f = new Date(m); f.setDate(f.getDate() + 4); const we = [0, 6].includes(new Date().getDay()); return `${we ? "La semaine qui arrive" : "Cette semaine"}, du lundi ${m.getDate()}${m.getMonth() !== f.getMonth() ? " " + m.toLocaleDateString("fr-FR", { month: "long" }) : ""} au vendredi ${f.getDate()} ${f.toLocaleDateString("fr-FR", { month: "long" })}, c'est une semaine A ou une semaine B ?`; }
  function weekAB(d) { const e = edtGet(); if (!e.ab || !e.ref) return ""; const w = Math.round((mondayOf(d) - new Date(e.ref.monday + "T00:00:00")) / 604800000); return (Math.abs(w) % 2 === 0) === (e.ref.letter === "A") ? "A" : "B"; }
  function slotsOn(d) { const e = edtGet(), wd = (d.getDay() + 6) % 7, ab = weekAB(d); return e.slots.filter(x => +x.day === wd && (!x.week || !ab || x.week === ab)).sort((a, b) => String(a.start).localeCompare(b.start)); }
  const subjOfName = (n) => { const k = norm(n); return state.subjects.find(x => norm(x.name) === k) || state.subjects.find(x => k && (norm(x.name).includes(k) || k.includes(norm(x.name)))); };
  // Ce soir : les matières qu'on a demain, celles dont le contrôle approche d'abord.
  function tonightSuggestion() {
    const e = edtGet(); if (!e.slots.length) return null;
    const tm = new Date(); tm.setDate(tm.getDate() + 1); const names = [...new Set(slotsOn(tm).map(x => x.subject))];
    const subs = names.map(subjOfName).filter((x, i, a) => x && a.indexOf(x) === i && state.chapters.some(c => c.subject_id === x.id && cardsOf(c.id).length));
    if (!subs.length) return null;
    subs.sort((a, b) => (a.exam_date ? daysUntil(a.exam_date) : 999) - (b.exam_date ? daysUntil(b.exam_date) : 999));
    return { tomorrow: tm, subs: subs.slice(0, 3) };
  }
  // Lit une photo ou un PDF d'emploi du temps avec l'IA (1 appel) : renvoie la liste des cours. Utilisé par l'emploi du temps et l'onglet Journée.
  // Lecture de l'emploi du temps par l'IA, côté serveur et en arrière-plan : on peut quitter l'appli pendant la lecture.
  // Le serveur range le résultat dans user_kv (merge.edtjob) ; l'appli le récupère, même après avoir été fermée (merge.edtpending).
  const edtNorm = slots => (slots || []).filter(x => x && x.subject && x.day >= 0 && x.day <= 5).map(x => ({ day: +x.day, start: String(x.start || "08:00").slice(0, 5), end: String(x.end || "09:00").slice(0, 5), subject: String(x.subject).slice(0, 60), room: String(x.room || "").slice(0, 30), week: x.week === "A" || x.week === "B" ? x.week : "" }));
  // Barre de progression (estimée : une lecture prend en général 10 à 30 s).
  function edtBar(el) {
    if (!el) return { say() {}, stop() {} };
    const t0 = Date.now(); el.className = "edtprog"; el.innerHTML = `<span class="small" data-t>Envoi…</span><div class="bar"><i style="width:4%"></i></div><span class="small muted">Tu peux quitter l'appli, la lecture continue.</span>`;
    const tick = setInterval(() => { const i = el.querySelector(".bar i"); if (!i) return clearInterval(tick); i.style.width = Math.min(94, 4 + 90 * (1 - Math.exp(-(Date.now() - t0) / 14000))).toFixed(0) + "%"; }, 400);
    return { say(t) { const x = el.querySelector("[data-t]"); if (x) x.textContent = t; }, stop(ok) { clearInterval(tick); const i = el.querySelector(".bar i"); if (i && ok) i.style.width = "100%"; } };
  }
  let edtPolling = null;
  function edtWait(id) {
    if (edtPolling && edtPolling.id === id) return edtPolling.p;
    const p = new Promise((ok, ko) => {
      const t0 = Date.now();
      const step = async () => {
        let v = null; try { const r = await sb.from("user_kv").select("value").eq("key", "merge.edtjob").maybeSingle(); v = r.data ? JSON.parse(r.data.value) : null; } catch (e) { v = null; }
        if (v && v.id === id && v.status === "done") { safeSet("merge.edtpending", ""); return ok(edtNorm(v.slots)); }
        if (v && v.id === id && v.status === "error") { safeSet("merge.edtpending", ""); return ko(new Error(v.error === "quota" ? QUOTA_MSG : v.error)); }
        // Rien côté serveur au bout de 25 s : l'envoi a été coupé (appli quittée pendant l'envoi).
        if ((!v || v.id !== id) && Date.now() - t0 > 25000) { safeSet("merge.edtpending", ""); return ko(new Error("L'envoi a été coupé avant la fin. Renvoie ton emploi du temps et laisse l'appli ouverte quelques secondes.")); }
        if (Date.now() - t0 > 240000) { safeSet("merge.edtpending", ""); return ko(new Error("La lecture prend trop de temps. Réessaie.")); }
        setTimeout(step, 1500);
      };
      step();
    });
    edtPolling = { id, p }; p.catch(() => {}).then(() => { if (edtPolling && edtPolling.id === id) edtPolling = null; });
    return p;
  }
  async function edtRead(f, msgEl) {
    const bar = edtBar(msgEl);
    let cv = document.createElement("canvas");
    if (/pdf/i.test(f.type) || /\.pdf$/i.test(f.name)) { await needPdf(); const lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js"; const doc = await lib.getDocument({ data: await f.arrayBuffer() }).promise, pg = await doc.getPage(1), vp = pg.getViewport({ scale: 2 }); cv.width = vp.width; cv.height = vp.height; await pg.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise; }
    else { let bmp; try { bmp = await createImageBitmap(f); } catch (er) { if (!window.heic2any) await new Promise((ok, ko) => { const sc = document.createElement("script"); sc.src = "vendor/heic2any.min.js"; sc.onload = ok; sc.onerror = ko; document.head.appendChild(sc); }); const o = await window.heic2any({ blob: f, toType: "image/jpeg", quality: 0.85 }); bmp = await createImageBitmap(Array.isArray(o) ? o[0] : o); } const kk = Math.min(1, 1800 / Math.max(bmp.width, bmp.height)); cv.width = Math.round(bmp.width * kk); cv.height = Math.round(bmp.height * kk); cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height); }
    if (state.offline) { bar.stop(); throw new Error("Il faut être connecté à Internet pour lire ton emploi du temps."); }
    const id = "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    safeSet("merge.edtpending", JSON.stringify({ id, at: Date.now() }));
    try { await ai({ action: "edt_start", job_id: id, image: { data: cv.toDataURL("image/jpeg", 0.85).split(",")[1] }, matieres: state.subjects.map(x => x.name) }, "studio"); }
    catch (e) { if (e.code) { safeSet("merge.edtpending", ""); bar.stop(); throw e; } }
    bar.say("L'IA lit ton emploi du temps…");
    try { const got = await edtWait(id); bar.stop(true); return got; } catch (e) { bar.stop(); throw e; }
  }
  // Applique des cours lus (au retour dans l'appli si elle avait été fermée pendant la lecture).
  function edtApply(got) {
    const e = edtGet(); e.slots = got; if (got.some(x => x.week)) e.ab = true; jset("merge.edt", e);
    toast(plural(got.length, "cours ajouté", "cours ajoutés") + ". Vérifie et corrige si besoin.");
    return e;
  }
  function edtResume(after) {
    let p = null; try { p = JSON.parse(safeGet("merge.edtpending") || "null"); } catch (e) { p = null; }
    if (!p || !p.id || Date.now() - p.at > 10 * 60000 || (edtPolling && edtPolling.id === p.id)) return;
    edtWait(p.id).then(got => { if (!got.length) return toast("Je n'ai trouvé aucun cours sur ton emploi du temps."); const e = edtApply(got); if (after) after(e); }).catch(er => toast(er.message));
  }
  function screenEdt() {
    drawTabs("calendrier"); let e = edtGet(), view = "semaine", editing = null;
    const save = () => { jset("merge.edt", e); };
    const opts = () => state.subjects.map(x => `<option>${esc(x.name)}</option>`).join("");
    function draw() {
      const now = new Date(), ab = weekAB(now), today = (now.getDay() + 6) % 7;
      const days = JOURS.filter((_, i) => i < 5 || e.slots.some(x => +x.day === i));
      const cell = (x, i) => { const sj = subjOfName(x.subject); return `<button class="edtslot" data-ed="${e.slots.indexOf(x)}" style="--c:${esc(sj ? sj.color : "#64748b")}"><b>${esc(x.subject)}</b><span>${esc(x.start)}–${esc(x.end)}${x.room ? " · " + esc(x.room) : ""}${x.week ? " · sem. " + x.week : ""}</span></button>`; };
      const tn = tonightSuggestion();
      app.innerHTML = `<div class="row"><a class="iconbtn" href="#calendrier" aria-label="Retour">${I.back}</a><h1 class="grow">Emploi du temps</h1></div>
        ${e.ab ? `<div class="card pad row between"><span>Cette semaine : <b>semaine ${ab || "?"}</b></span><button class="btn sm ghost" id="swab">Ce n'est pas la bonne</button></div>` : ""}
        ${tn ? `<div class="banner"><div><h2>Ce soir</h2><p class="small">Demain tu as ${tn.subs.map(x => esc(x.name)).join(", ")}. Un petit tour sur ${tn.subs.length > 1 ? "ces matières" : "cette matière"} ?</p></div><a class="btn sm" href="#revision-${tn.subs[0].id}">Réviser ${esc(tn.subs[0].name)}</a></div>` : ""}
        ${e.slots.length ? `<div class="edtgrid">${days.map(d => { const i = JOURS.indexOf(d), list = e.slots.filter(x => +x.day === i && (!x.week || !ab || x.week === ab)).sort((a, b) => String(a.start).localeCompare(b.start)); return `<div class="edtday${i === today ? " now" : ""}"><h3>${d}</h3>${list.map(cell).join("") || '<p class="small muted">Rien</p>'}</div>`; }).join("")}</div>`
          : `<div class="card pad stack"><h2>Ajoute ton emploi du temps</h2><p class="muted">Envoie une photo ou le PDF de ton emploi du temps (1 appel IA), ou ajoute tes cours un par un. Merge s'en sert pour te proposer quoi réviser le soir.</p></div>`}
        <div class="card pad stack"><h2>Ajouter</h2>
          <div class="row" style="flex-wrap:wrap"><label class="btn" for="edtf">Photo ou PDF</label><input id="edtf" type="file" accept="image/*,application/pdf" hidden><button class="btn ghost" id="edtadd">Ajouter un cours à la main</button></div>
          <p class="note" id="edtmsg" role="status"></p><div id="edtform"></div>
          <button class="switch" id="absw" role="switch" aria-checked="${e.ab}"><i></i>Mon emploi du temps change une semaine sur deux (A et B)</button>
          ${e.slots.length ? '<button class="linkbtn" id="edtclear">Tout effacer</button>' : ""}</div>`;
      $("absw").onclick = () => { e.ab = !e.ab; if (e.ab && !e.ref) return askAB(); save(); draw(); };
      if ($("swab")) $("swab").onclick = () => { const cur = weekAB(new Date()); e.ref = { monday: localDay(mondayOf(new Date())), letter: cur === "A" ? "B" : "A" }; save(); draw(); };
      if ($("edtclear")) $("edtclear").onclick = async () => { if (!(await askConfirm("Effacer tout l'emploi du temps ?", "Tous tes cours seront retirés. Tu pourras le renvoyer en photo ou en PDF."))) return; e.slots = []; save(); draw(); };
      $("edtadd").onclick = () => form(null);
      app.querySelectorAll("[data-ed]").forEach(b => b.onclick = () => form(+b.dataset.ed));
      $("edtf").onchange = ev => { const f = ev.target.files[0]; if (f) fromFile(f); };
    }
    function askAB() {
      sheet(`<h1>Semaine A ou B ?</h1><p class="muted">${abQuestion()}</p><div class="row"><button class="btn grow" data-ab="A">Semaine A</button><button class="btn grow" data-ab="B">Semaine B</button></div>`, el => el.querySelectorAll("[data-ab]").forEach(b => b.onclick = () => { e.ab = true; e.ref = { monday: localDay(abMonday()), letter: b.dataset.ab }; save(); closeSheet(); draw(); }));
    }
    function form(k) {
      const x = k != null ? e.slots[k] : { day: Math.min(4, (new Date().getDay() + 6) % 7), start: "08:00", end: "09:00", subject: (state.subjects[0] || {}).name || "", week: "", room: "" };
      $("edtform").innerHTML = `<div class="stack"><div class="field"><label for="es">Matière</label><input id="es" list="esl" value="${esc(x.subject)}" maxlength="60"><datalist id="esl">${opts()}</datalist></div>
        <div class="row" style="flex-wrap:wrap"><div class="field grow"><label for="ed">Jour</label><select id="ed">${JOURS.map((d, i) => `<option value="${i}"${+x.day === i ? " selected" : ""}>${d}</option>`).join("")}</select></div><div class="field"><label for="e1">Début</label><input id="e1" type="time" value="${esc(x.start)}"></div><div class="field"><label for="e2">Fin</label><input id="e2" type="time" value="${esc(x.end)}"></div></div>
        <div class="row" style="flex-wrap:wrap"><div class="field grow"><label for="er">Salle (facultatif)</label><input id="er" value="${esc(x.room || "")}" maxlength="30"></div>${e.ab ? `<div class="field"><label for="ew">Semaine</label><select id="ew"><option value="">Toutes</option><option${x.week === "A" ? " selected" : ""}>A</option><option${x.week === "B" ? " selected" : ""}>B</option></select></div>` : ""}</div>
        <div class="row"><button class="btn" id="esave">${k != null ? "Enregistrer" : "Ajouter"}</button>${k != null ? '<button class="btn ghost" id="edel">Supprimer</button>' : ""}</div></div>`;
      $("esave").onclick = () => { const y = { day: +$("ed").value, start: $("e1").value || "08:00", end: $("e2").value || "09:00", subject: $("es").value.trim().slice(0, 60), room: $("er").value.trim(), week: $("ew") ? $("ew").value : "" }; if (!y.subject) return toast("Écris la matière."); if (k != null) e.slots[k] = y; else e.slots.push(y); save(); draw(); toast(k != null ? "Cours modifié." : "Cours ajouté."); };
      if ($("edel")) $("edel").onclick = async () => { if (!(await askConfirm("Supprimer ce cours ?", e.slots[k].subject + " · " + e.slots[k].start + "–" + e.slots[k].end))) return; e.slots.splice(k, 1); save(); draw(); };
      $("es").focus();
    }
    async function fromFile(f) {
      try {
        const got = await edtRead(f, $("edtmsg"));
        if (!got.length) throw new Error("Je n'ai trouvé aucun cours sur cette image. Essaie une photo plus nette, ou ajoute tes cours à la main.");
        e.slots = got; if (got.some(x => x.week)) e.ab = true; save(); draw(); toast(plural(got.length, "cours ajouté", "cours ajoutés") + ". Vérifie et corrige si besoin.");
        if (e.ab && !e.ref) askAB();
      } catch (er) { showErr($("edtmsg"), er); }
    }
    draw();
    edtResume(ne => { if (!location.hash.startsWith("#edt")) return; e = ne; draw(); if (e.ab && !e.ref) askAB(); });
  }

  // ---------- fiche méthode par matière (IA, 1 appel, gardée et synchronisée) ----------
  async function screenMethode(id) {
    const s = state.subjects.find(x => x.id === id); if (!s) { location.hash = "#matieres"; return; }
    tabs.hidden = true; const key = "merge.methode." + id, head = `<div class="row noprint"><a class="iconbtn" href="#matiere-${id}" aria-label="Retour">${I.back}</a><h1 class="grow">Fiche méthode</h1></div>`;
    const show = (f) => {
      const sec = (t, arr) => (arr || []).length ? `<div class="card pad stack"><h2>${t}</h2><ul>${arr.map(x => `<li>${mx(x)}</li>`).join("")}</ul></div>` : "";
      app.innerHTML = head + `<p class="muted">${esc(s.name)} · ${esc((state.profile || {}).classe || "")}</p>
        ${(f.exercices || []).map(ex => `<div class="card pad stack"><h2>${mx(ex.nom)}</h2>${ex.quand ? `<p class="small muted">${mx(ex.quand)}</p>` : ""}<ol>${(ex.etapes || []).map(x => `<li>${mx(x)}</li>`).join("")}</ol>${(ex.conseils || []).length ? `<div class="hint"><b>Conseils</b><ul>${ex.conseils.map(x => `<li>${mx(x)}</li>`).join("")}</ul></div>` : ""}</div>`).join("")}
        ${sec("Erreurs à éviter", f.erreurs)}${sec("Mots et formules utiles", f.outils)}
        <p class="note">Méthode générale de la matière, écrite par l'IA (pas tirée de ton cours) : demande confirmation à ton prof en cas de doute.</p>
        <div class="row noprint"><button class="btn ghost" onclick="print()">${I.print}Imprimer</button><button class="linkbtn" id="regen">Refaire avec l'IA (1 appel)</button></div>`;
      $("regen").onclick = () => make();
    };
    async function make() {
      app.innerHTML = head + `<div class="card done"><div class="spin" aria-hidden="true"></div><p class="muted" role="status">Merge prépare la fiche méthode de ${esc(s.name)}…</p></div>`;
      try { const r = await ai({ action: "methode", matiere: s.name }); const f = r && r.content; if (!f || !(f.exercices || []).length) throw new Error("La fiche n'a pas pu être préparée. Réessaie."); jset(key, f); if (location.hash === "#methode-" + id) show(f); }
      catch (e) { app.innerHTML = head + `<div class="card pad stack">${errHtml(e)}<a class="btn ghost" href="#matiere-${id}">Retour</a></div>`; }
    }
    const f = jget(key, null); if (f) return show(f);
    app.innerHTML = head + `<div class="card pad stack"><h2>${esc(s.name)}</h2><p class="muted">Les méthodes attendues dans cette matière à ton niveau (dissertation, démonstration, commentaire, analyse d'un système, étude de document…), étape par étape, avec les erreurs à éviter.</p><button class="btn" id="mk">Préparer avec l'IA</button><p class="note">1 appel IA, puis c'est gardé sur tous tes appareils.</p></div>`;
    $("mk").onclick = make;
  }

  // ---------- vrais sujets de bac : l'IA cherche le sujet officiel sur le web (seulement quand l'élève clique) ----------
  const BAC_JOBS = {};
  async function screenBac(id) {
    const s = state.subjects.find(x => x.id === id); if (!s) { location.hash = "#matieres"; return; }
    tabs.hidden = true; const key = "merge.bac." + id, head = `<div class="row"><a class="iconbtn" href="#matiere-${id}" aria-label="Retour">${I.back}</a><h1 class="grow">Sujets d'examen</h1></div>`;
    let list = jget(key, []), cur = null;
    const progHtml = (pct) => {
      const p = Math.max(6, Math.min(100, Math.round(pct || 6)));
      const st = p < 38 ? "Recherche du sujet officiel sur le web…" : p < 72 ? "Lecture de l'énoncé et du barème…" : "Préparation des questions et des corrections…";
      return `<div class="stack" style="margin-top:8px"><div class="bar big"><i id="bprog" style="width:${p}%"></i></div><div class="row between small muted"><span id="bstat" role="status">${st}</span><b id="bpct">${p} %</b></div><p class="small muted">Jusqu'à 2 minutes. Une notification te préviendra dès que le sujet est prêt.</p></div>`;
    };
    const paintProg = () => {
      const j = BAC_JOBS[id]; if (!j || location.hash !== "#bac-" + id) return;
      const p = Math.min(94, Math.round(6 + 88 * (1 - Math.exp(-(Date.now() - j.t0) / 22000))));
      const b = $("bprog"), st = $("bstat"), pct = $("bpct");
      if (b) b.style.width = p + "%";
      if (pct) pct.textContent = p + " %";
      if (st) st.textContent = p < 38 ? "Recherche du sujet officiel sur le web…" : p < 72 ? "Lecture de l'énoncé et du barème…" : "Préparation des questions et des corrections…";
    };
    function home(msg) {
      const busy = !!BAC_JOBS[id];
      list = jget(key, []);
      app.innerHTML = head + `<p class="muted">${esc(s.name)} · ${esc((state.profile || {}).classe || "")}</p>
        <div class="card pad stack"><h2>Chercher un vrai sujet</h2><p class="small muted">L'IA cherche sur le web un sujet officiel des années précédentes (ta filière, ta matière), le transforme en épreuve interactive avec barème et correction, et cite la source. Si elle ne trouve pas de sujet officiel, elle le dit : rien n'est inventé.</p>
          <div class="field"><label for="by">Année (facultatif)</label><input id="by" inputmode="numeric" maxlength="4" placeholder="Ex. 2024" value="${esc(busy ? BAC_JOBS[id].y : "")}"></div><button class="btn" id="bgo"${busy ? " disabled" : ""}>Chercher (1 appel IA)</button><div id="bmsg">${busy ? progHtml(6 + 88 * (1 - Math.exp(-(Date.now() - BAC_JOBS[id].t0) / 22000))) : (msg || "")}</div></div>
        ${list.length ? `<div class="stack"><h2>Tes sujets</h2>${list.map((x, k) => `<button class="card rowlink tilebtn" data-bs="${k}" style="text-align:left"><b>${esc(x.epreuve || s.name)} · ${esc(x.annee || "")}</b><span class="small muted">${esc(x.session || "")} · ${esc(x.source_nom || "")}</span></button>`).join("")}</div>` : ""}`;
      $("bgo").onclick = find; app.querySelectorAll("[data-bs]").forEach(b => b.onclick = () => { cur = list[+b.dataset.bs]; exam(); });
    }
    async function find() {
      if (BAC_JOBS[id]) return;
      const y = $("by").value.trim(), annee = /^\d{4}$/.test(y) ? y : "";
      $("bgo").disabled = true; $("bmsg").innerHTML = progHtml(6);
      ensurePush(true).catch(() => {});
      const job = BAC_JOBS[id] = { t0: Date.now(), y, timer: setInterval(paintProg, 300) };
      try {
        const r = await ai({ action: "bac", matiere: s.name, subject_id: id, annee }, "studio"); const c = (r && r.content) || {};
        clearInterval(job.timer); delete BAC_JOBS[id];
        if ($("bprog")) { $("bprog").style.width = "100%"; if ($("bpct")) $("bpct").textContent = "100 %"; }
        if (!c.trouve || !(c.exercices || []).length) {
          const m = c.message || "Je n'ai pas trouvé de sujet officiel pour ta filière et ta matière. Je préfère ne rien inventer.";
          if (!pushOn) impNotify("Recherche terminée", m);
          if (location.hash === "#bac-" + id) home(`<p class="note" role="status">${esc(m)}</p>`); else toast(m);
          return;
        }
        let l = jget(key, []); l.unshift(c); l = l.slice(0, 10); jset(key, l); list = l;
        const doneMsg = "Le sujet officiel de " + s.name + (c.annee ? " (" + c.annee + ")" : "") + " est prêt.";
        if (!pushOn) impNotify("Sujet prêt", doneMsg);
        if (location.hash === "#bac-" + id) { cur = c; exam(); } else toast(doneMsg);
      } catch (e) {
        clearInterval(job.timer); delete BAC_JOBS[id];
        if (location.hash === "#bac-" + id) { $("bgo").disabled = false; showErr($("bmsg"), e); } else toast(e.message || "Erreur pendant la recherche du sujet.");
      }
    }
    function exam() {
      const c = cur, open = new Set();
      const draw = () => {
        const tot = (c.exercices || []).reduce((a, ex) => a + (ex.questions || []).reduce((b, q) => b + (+q.points || 0), 0), 0);
        app.innerHTML = head + `<div class="card pad stack"><h2>${esc(c.epreuve || s.name)}</h2><p class="small">${esc([c.session, c.annee, c.filiere].filter(Boolean).join(" · "))}${tot ? " · barème sur " + tot : ""}</p>${c.avertissement ? `<p class="small muted">${esc(c.avertissement)}</p>` : ""}<p class="note">Énoncé officiel ; les corrections sont écrites par l'IA. Pour les questions sur les documents du sujet, ouvre la source pour les voir en entier.</p><p class="small">Source : ${c.source_url ? `<a href="${esc(c.source_url)}" target="_blank" rel="noopener">${esc(c.source_nom || c.source_url)}</a>` : esc(c.source_nom || "non précisée")}</p>${(c.sources || []).length ? `<p class="small muted">Pages consultées : ${c.sources.slice(0, 4).map(x => `<a href="${esc(x.uri)}" target="_blank" rel="noopener">${esc(x.title || "lien")}</a>`).join(" · ")}</p>` : ""}${c.avertissement ? `<p class="note">${esc(c.avertissement)}</p>` : ""}</div>
          ${(c.exercices || []).map((ex, i) => `<div class="card pad stack"><h2>${mx(ex.titre || "Exercice " + (i + 1))}</h2>${ex.enonce ? `<p class="enonce">${mx(ex.enonce)}</p>` : ""}${(ex.questions || []).map((q, j) => { const k = i + "-" + j; return `<div class="stack bacq"><p><b>${j + 1}.</b> ${mx(q.q)} <span class="pill">${q.points || "?"} pt</span></p><textarea aria-label="Ta réponse" placeholder="Ta réponse…" style="min-height:70px"></textarea>${open.has(k) ? `<div class="solution"><b>Correction</b><p>${mx(q.correction || "")}</p></div>` : `<button class="btn sm ghost" data-k="${k}" style="align-self:flex-start">Voir la correction</button>`}</div>`; }).join("")}</div>`).join("")}
          <button class="btn ghost" id="bback">Autres sujets</button>`;
        app.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { const vals = [...app.querySelectorAll(".bacq textarea")].map(t => t.value); open.add(b.dataset.k); const y = scrollY; draw(); [...app.querySelectorAll(".bacq textarea")].forEach((t, n) => { t.value = vals[n] || ""; }); scrollTo(0, y); });
        $("bback").onclick = () => home();
      };
      draw();
    }
    home();
  }

  // ---------- chapitre partagé : un invité révise sans compte, avec ce qui existe déjà (aucune IA) ----------
  async function screenShared(token) {
    tabs.hidden = true; document.body.classList.remove("nav");
    app.innerHTML = `<p class="muted">Chargement du chapitre partagé…</p>`;
    let d = null; try { const r = await sb.rpc("get_shared_chapter", { p_token: token }); d = r.data; } catch (e) { d = null; }
    const top = `<div class="row between"><div class="logo">${esc(C.NOM_APPLI)}<b>.</b></div>${state.user ? '<a class="btn sm ghost" href="#accueil">Mon accueil</a>' : '<a class="btn sm" href="#">Créer mon compte</a>'}</div>`;
    if (!d) { app.innerHTML = top + `<div class="card done"><h1>Lien inactif</h1><p class="muted">Ce lien de partage n'existe pas ou a été désactivé par son auteur.</p></div>`; return; }
    const cards = (d.cards || []).filter(c => c.front && c.back), ct = d.content || {}; let tab = cards.length ? "cartes" : "resume", i = 0, flipped = false, order = shuffle(cards.map((_, k) => k)), good = 0;
    const TABS_S = [["cartes", "Cartes", cards.length], ["resume", "Résumé", d.summary], ["quiz", "Quiz", ct.quiz && (ct.quiz.qcm || []).length], ["fiche", "Fiche", ct.fiche]].filter(t => t[2]);
    function draw() {
      let body = "";
      if (tab === "cartes") { const c = cards[order[i % order.length]]; body = `<p class="small muted">Carte ${i % order.length + 1} sur ${cards.length} · ${good} sue${good > 1 ? "s" : ""}</p><button class="card pad flipcard" id="flp" style="min-height:200px;text-align:left;font:inherit;color:inherit;width:100%"><span class="small muted">${flipped ? "Réponse" : "Question"}</span><p style="font-size:1.15em;font-weight:700">${mx(flipped ? c.back : c.front)}</p>${flipped ? "" : '<span class="small muted">Touche pour voir la réponse</span>'}</button>${flipped ? '<div class="row"><button class="btn ghost grow" id="sko">À revoir</button><button class="btn grow" id="sok">Je savais</button></div>' : ""}`; }
      if (tab === "resume") body = `<div class="card pad md">${md(d.summary || "")}</div>`;
      if (tab === "quiz") body = (ct.quiz.qcm || []).map((q, k) => `<div class="card pad stack"><b>${k + 1}. ${mx(q.q)}</b>${(q.choix || []).map((o, j) => `<button class="opt" data-q="${k}" data-j="${j}">${mx(o)}</button>`).join("")}<p class="small" id="qe${k}"></p></div>`).join("");
      if (tab === "fiche") { const f = ct.fiche; body = `<div class="card pad stack">${(f.essentiel || []).length ? `<h2>L'essentiel</h2><ul>${f.essentiel.map(x => `<li>${mx(x)}</li>`).join("")}</ul>` : ""}${(f.definitions || []).length ? `<h2>Définitions</h2><dl>${f.definitions.map(x => `<div><dt>${mx(x.terme)}</dt><dd>${mx(x.definition)}</dd></div>`).join("")}</dl>` : ""}${(f.formules || []).length ? `<h2>Formules</h2><ul>${f.formules.map(x => `<li><b>${mx(x.nom)}</b> : ${mx(x.formule)}</li>`).join("")}</ul>` : ""}</div>`; }
      app.innerHTML = top + `<div class="stack"><p class="small muted">Chapitre partagé${d.subject ? " · " + esc(d.subject) : ""}</p><h1>${esc(d.name)}</h1></div>
        <div class="seg" role="tablist">${TABS_S.map(t => `<button role="tab" data-st="${t[0]}" aria-selected="${tab === t[0]}">${t[1]}</button>`).join("")}</div>${body}
        <p class="note">Révision en invité : rien n'est enregistré. Crée ton compte Merge pour importer tes propres cours.</p>`;
      app.querySelectorAll("[data-st]").forEach(b => b.onclick = () => { tab = b.dataset.st; draw(); });
      if ($("flp")) $("flp").onclick = () => { flipped = !flipped; draw(); };
      if ($("sok")) $("sok").onclick = () => { good++; ping(true); i++; flipped = false; if (i % order.length === 0) confetti(); draw(); };
      if ($("sko")) $("sko").onclick = () => { ping(false); order.push(order[i % order.length]); i++; flipped = false; draw(); };
      app.querySelectorAll("[data-q]").forEach(b => b.onclick = () => { const q = ct.quiz.qcm[+b.dataset.q], okk = +b.dataset.j === +q.bonne; b.classList.add(okk ? "ok" : "ko"); const e = $("qe" + b.dataset.q); e.innerHTML = (okk ? "<b>Juste.</b> " : "<b>Non.</b> Réponse : " + mx(q.choix[+q.bonne]) + ". ") + mx(q.explication || ""); });
    }
    draw();
  }

  // ---------- corbeille 30 jours (matières, chapitres, cartes) ----------
  // Active seulement si le script supabase/optional/v16_corbeille.sql a été lancé ; sinon on garde l'ancien comportement (archivage simple).
  let trashOk = null;
  async function trashReady() { if (trashOk != null) return trashOk; try { const r = await sb.from("card_trash").select("id").limit(1); trashOk = !r.error; } catch (e) { trashOk = false; } return trashOk; }
  const nowIso = () => new Date().toISOString();
  async function trashRow(table, id) { const patch = { archived: true }; if (await trashReady()) patch.deleted_at = nowIso(); return sb.from(table).update(patch).eq("id", id); }
  async function trashCard(c) {
    if (await trashReady()) { const payload = Object.assign({}, c); const r = await sb.from("card_trash").insert({ card_id: c.id, chapter_id: c.chapter_id, payload, deleted_at: nowIso() }); if (r.error) return r; }
    return sb.from("cards").delete().eq("id", c.id);
  }
  async function screenTrash() {
    drawTabs("reglages"); const head = `<div class="row"><a class="iconbtn" href="#reglages" aria-label="Retour">${I.back}</a><h1>Corbeille</h1></div>`;
    app.innerHTML = head + '<p class="muted">Chargement…</p>';
    if (!(await trashReady())) { app.innerHTML = head + `<div class="card pad stack"><p>La corbeille n'est pas encore activée.</p><p class="small muted">En attendant, une matière ou un chapitre supprimé est seulement masqué : rien n'est perdu.</p></div>`; return; }
    try { await sb.rpc("purge_my_trash"); } catch (e) { /* on videra plus tard */ }
    const lim = Date.now() - 30 * 86400000, uid = state.user.id, keep = x => x.deleted_at && Date.parse(x.deleted_at) > lim;
    const [sr, cr, kr] = await Promise.all([sb.from("subjects").select("id,name,color,deleted_at,archived").eq("user_id", uid).eq("archived", true), sb.from("chapters").select("id,name,subject_id,deleted_at,archived").eq("user_id", uid).eq("archived", true), sb.from("card_trash").select("id,card_id,chapter_id,payload,deleted_at").eq("user_id", uid)]);
    const subs = (sr.data || []).filter(keep), chs = (cr.data || []).filter(keep), cards = (kr.data || []).filter(keep);
    const left = d => { const n = Math.max(0, 30 - Math.floor((Date.now() - Date.parse(d)) / 86400000)); return n <= 1 ? "supprimé définitivement demain" : "encore " + n + " jours"; };
    const row = (t, sub, attr) => `<div class="card pad row between"><div class="grow" style="min-width:0"><b>${t}</b><span class="small muted" style="display:block">${sub}</span></div><button class="btn sm ghost" ${attr}>Restaurer</button></div>`;
    app.innerHTML = head + `<p class="small muted">Ce que tu supprimes reste ici 30 jours, puis disparaît pour de bon.</p>
      ${subs.length ? `<h2>Matières</h2>${subs.map(x => row(esc(x.name), left(x.deleted_at), `data-rs="${x.id}"`)).join("")}` : ""}
      ${chs.length ? `<h2>Chapitres</h2>${chs.map(x => row(esc(x.name), left(x.deleted_at), `data-rc="${x.id}"`)).join("")}` : ""}
      ${cards.length ? `<h2>Cartes</h2>${cards.map(x => row(mx((x.payload || {}).front || ""), left(x.deleted_at), `data-rk="${x.id}"`)).join("")}` : ""}
      ${subs.length || chs.length || cards.length ? "" : '<div class="card done"><p class="muted">La corbeille est vide.</p></div>'}`;
    const done = async (msg) => { await loadAll(); toast(msg); screenTrash(); };
    app.querySelectorAll("[data-rs]").forEach(b => b.onclick = async () => { const r = await sb.from("subjects").update({ archived: false, deleted_at: null }).eq("id", b.dataset.rs); if (r.error) return fail(r.error, "Restauration impossible"); done("Matière restaurée."); });
    app.querySelectorAll("[data-rc]").forEach(b => b.onclick = async () => { const c = chs.find(x => x.id === b.dataset.rc); const r = await sb.from("chapters").update({ archived: false, deleted_at: null }).eq("id", c.id); if (r.error) return fail(r.error, "Restauration impossible"); const ps = (sr.data || []).find(x => x.id === c.subject_id); if (ps) await sb.from("subjects").update({ archived: false, deleted_at: null }).eq("id", ps.id); done("Chapitre restauré."); });
    app.querySelectorAll("[data-rk]").forEach(b => b.onclick = async () => { const x = cards.find(y => y.id === b.dataset.rk), p = Object.assign({}, x.payload); delete p.user_id; const r = await sb.from("cards").insert(p); if (r.error) return fail(r.error, "Restauration impossible"); await sb.from("card_trash").delete().eq("id", x.id); done("Carte restaurée."); });
  }

  // ---------- photo de cours : page détectée, redressée et recadrée automatiquement (sans bibliothèque) ----------
  // 1. image réduite en gris ; 2. seuil d'Otsu (la feuille est plus claire que le fond) ; 3. plus grande zone claire ;
  // 4. ses 4 coins ; 5. redressement par homographie ; 6. contraste légèrement renforcé. Si la détection n'est pas sûre, on garde la photo telle quelle.
  function scanPage(src) {
    const W0 = src.width, H0 = src.height, k = 320 / Math.max(W0, H0), w = Math.max(8, Math.round(W0 * k)), h = Math.max(8, Math.round(H0 * k));
    const sm = document.createElement("canvas"); sm.width = w; sm.height = h; const sx = sm.getContext("2d", { willReadFrequently: true }); sx.drawImage(src, 0, 0, w, h);
    const px = sx.getImageData(0, 0, w, h).data, g = new Float32Array(w * h), hist = new Array(256).fill(0);
    for (let i = 0; i < w * h; i++) { const v = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]; g[i] = v; hist[v | 0]++; }
    let sum = 0, sumB = 0, wB = 0, best = 0, th = 128; for (let i = 0; i < 256; i++) sum += i * hist[i];
    for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = w * h - wB; if (!wF) break; sumB += t * hist[t]; const mB = sumB / wB, mF = (sum - sumB) / wF, v = wB * wF * (mB - mF) * (mB - mF); if (v > best) { best = v; th = t; } }
    const lab = new Int32Array(w * h).fill(-1); let bestN = 0, bestL = -1;
    for (let i = 0; i < w * h; i++) { if (lab[i] !== -1 || g[i] <= th) continue; const st = [i]; lab[i] = i; let n = 0; while (st.length) { const p = st.pop(); n++; const x = p % w, y = (p / w) | 0; for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) if (q >= 0 && lab[q] === -1 && g[q] > th) { lab[q] = i; st.push(q); } } if (n > bestN) { bestN = n; bestL = i; } }
    const ratio = bestN / (w * h); if (ratio < 0.18 || ratio > 0.97) return null;
    let tl = [0, 0, 1e9], br = [0, 0, -1e9], tr = [0, 0, -1e9], bl = [0, 0, 1e9];
    for (let i = 0; i < w * h; i++) { if (lab[i] !== bestL) continue; const x = i % w, y = (i / w) | 0, a = x + y, b = x - y; if (a < tl[2]) tl = [x, y, a]; if (a > br[2]) br = [x, y, a]; if (b > tr[2]) tr = [x, y, b]; if (b < bl[2]) bl = [x, y, b]; }
    const cx0 = (tl[0] + tr[0] + br[0] + bl[0]) / 4, cy0 = (tl[1] + tr[1] + br[1] + bl[1]) / 4;
    // Coins rapprochés de 1,5 % vers le centre : on coupe le liseré de table qui reste au bord.
    const Q = [tl, tr, br, bl].map(p => [(p[0] + (cx0 - p[0]) * 0.015) / k, (p[1] + (cy0 - p[1]) * 0.015) / k]), d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const area = Math.abs(Q.reduce((s2, p, i) => { const q = Q[(i + 1) % 4]; return s2 + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
    if (area < 0.15 * W0 * H0 || area > 0.92 * W0 * H0 || Math.min(d(Q[0], Q[1]), d(Q[1], Q[2]), d(Q[2], Q[3]), d(Q[3], Q[0])) < 0.2 * Math.min(W0, H0)) return null;
    let ow = Math.max(d(Q[0], Q[1]), d(Q[3], Q[2])), oh = Math.max(d(Q[0], Q[3]), d(Q[1], Q[2])); const f = Math.min(1, 1600 / Math.max(ow, oh)); ow = Math.round(ow * f); oh = Math.round(oh * f);
    // Homographie du rectangle de sortie vers le quadrilatère de la photo (8 inconnues, élimination de Gauss).
    const D = [[0, 0], [ow, 0], [ow, oh], [0, oh]], A = [], B = [];
    for (let i = 0; i < 4; i++) { const [x, y] = D[i], [u, v] = Q[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); B.push(v); }
    for (let c = 0; c < 8; c++) { let m = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[m][c])) m = r; [A[c], A[m]] = [A[m], A[c]]; [B[c], B[m]] = [B[m], B[c]]; if (Math.abs(A[c][c]) < 1e-9) return null; for (let r = 0; r < 8; r++) if (r !== c) { const t = A[r][c] / A[c][c]; for (let j = c; j < 8; j++) A[r][j] -= t * A[c][j]; B[r] -= t * B[c]; } }
    const H = B.map((b, i) => b / A[i][i]);
    const full = document.createElement("canvas"); full.width = W0; full.height = H0; const fx = full.getContext("2d", { willReadFrequently: true }); fx.drawImage(src, 0, 0); const sp = fx.getImageData(0, 0, W0, H0).data;
    const out = document.createElement("canvas"); out.width = ow; out.height = oh; const ox = out.getContext("2d"), od = ox.createImageData(ow, oh), dp = od.data;
    let lo = 255, hi = 0; const lum = new Uint8Array(256);
    for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
      const z = H[6] * x + H[7] * y + 1, u = Math.min(W0 - 1, Math.max(0, (H[0] * x + H[1] * y + H[2]) / z)) | 0, v = Math.min(H0 - 1, Math.max(0, (H[3] * x + H[4] * y + H[5]) / z)) | 0, si = (v * W0 + u) * 4, di = (y * ow + x) * 4;
      dp[di] = sp[si]; dp[di + 1] = sp[si + 1]; dp[di + 2] = sp[si + 2]; dp[di + 3] = 255; lum[(sp[si] + sp[si + 1] + sp[si + 2]) / 3 | 0]++;
    }
    let acc = 0; const tot = ow * oh; for (let i = 0; i < 256; i++) { acc += lum[i]; if (acc > tot * 0.02 && lo === 255) lo = i; if (acc > tot * 0.97) { hi = i; break; } }
    if (hi - lo > 40) { const sc = 255 / (hi - lo); for (let i = 0; i < dp.length; i += 4) for (let c = 0; c < 3; c++) dp[i + c] = Math.max(0, Math.min(255, (dp[i + c] - lo) * sc)); }
    ox.putImageData(od, 0, 0); return out;
  }
  window.__mergeScan = scanPage;
  // ---------- minuteur de concentration ----------
  let timerInt = null;
  function screenTimer() {
    drawTabs("progres");
    const T = { total: 25 * 60, left: 25 * 60, on: false, counted: 0 };
    const fmt = s => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
    async function save() {
      const secs = T.counted; T.counted = 0; if (secs < 30) return;
      const day = localDay(), prev = await sb.from("study_sessions").select("seconds,cards_reviewed,chapters_touched").eq("user_id", state.user.id).eq("day", day).maybeSingle();
      const p = prev.data || { seconds: 0, cards_reviewed: 0, chapters_touched: [] }, row = { user_id: state.user.id, day, seconds: p.seconds + secs, cards_reviewed: p.cards_reviewed, chapters_touched: p.chapters_touched || [], updated_at: new Date().toISOString() };
      const up = await sb.from("study_sessions").upsert(row); if (up.error) return;
      const cur = state.sessions.find(s => s.day === day); if (cur) Object.assign(cur, row); else state.sessions.push(row);
    }
    function draw() {
      app.innerHTML = `<div class="row"><a class="iconbtn" href="#progres" aria-label="Retour">${I.back}</a><h1>Minuteur</h1></div>
        <div class="card done"><div class="big" id="clock" style="font-size:3.4em">${fmt(T.left)}</div><div class="bar" style="width:100%"><i id="tbar" style="width:${(1 - T.left / T.total) * 100}%"></i></div>
          <div class="chips" style="justify-content:center">${[15, 25, 45].map(m => `<button class="chip" data-m="${m}" aria-pressed="${T.total === m * 60}">${m} min</button>`).join("")}</div>
          <div class="row"><button class="btn" id="tgo">${T.on ? "Pause" : "Démarrer"}</button><button class="btn ghost" id="trs">Remettre à zéro</button></div>
          <p class="note">Pose ton téléphone et travaille jusqu'à la sonnerie. Le temps compte dans ton objectif du jour.</p></div>`;
      app.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { stop(); T.total = T.left = +b.dataset.m * 60; draw(); });
      $("tgo").onclick = () => { T.on ? stop() : go(); draw(); };
      $("trs").onclick = () => { stop(); T.left = T.total; draw(); };
    }
    function stop() { T.on = false; clearInterval(timerInt); timerInt = null; save(); }
    function go() {
      T.on = true; clearInterval(timerInt);
      timerInt = setInterval(() => {
        if (!$("clock")) { stop(); return; }
        T.left--; T.counted++; $("clock").textContent = fmt(Math.max(0, T.left)); $("tbar").style.width = (1 - T.left / T.total) * 100 + "%";
        if (T.left <= 0) { stop(); ping(true); setTimeout(() => ping(true), 300); T.left = T.total; draw(); toast("Bravo, séance terminée. Fais une pause."); }
      }, 1000);
    }
    draw();
  }

