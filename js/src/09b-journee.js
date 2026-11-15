  // ---------- Journée : planning de révision en frise, façon « Structured » (onglet de la barre du bas) ----------
  // merge.journee (synchronisé) = { setup, blocks: { "AAAA-MM-JJ": [bloc] }, weekly: [bloc avec wd 0-6 = lundi-dimanche], off: { jour: true }, done: { "jour|id": true } }
  // bloc = { id, start "HH:MM", dur (min), s (matière), ch (chapitre ou null = choisi par Merge), act, title }
  const ACTS = [["cartes", "Flashcards", "cards"], ["quiz", "Quiz", "quiz"], ["resume", "Résumé", "book"], ["exos", "Exercices", "steps"], ["controle", "Contrôle blanc", "check"], ["pause", "Pause", "cup"], ["libre", "Autre", "spark"]];
  const actOf = k => ACTS.find(a => a[0] === k) || ACTS[6];
  const jGet = () => { const j = jget("merge.journee", null) || {}; return { setup: !!j.setup, blocks: j.blocks && typeof j.blocks === "object" ? j.blocks : {}, weekly: Array.isArray(j.weekly) ? j.weekly : [], off: j.off || {}, done: j.done || {} }; };
  function jSave(j) { const old = localDay(new Date(Date.now() - 60 * 86400000)); Object.keys(j.blocks).forEach(k => { if (k < old) delete j.blocks[k]; }); Object.keys(j.off).forEach(k => { if (k < old) delete j.off[k]; }); Object.keys(j.done).forEach(k => { if (k.slice(0, 10) < old) delete j.done[k]; }); jset("merge.journee", j); }
  const hm = m => String(Math.floor(m / 60) % 24).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  const mins = t => { const [h, m] = String(t || "0:0").split(":").map(Number); return (h || 0) * 60 + (m || 0); };
  const durTxt = d => d >= 60 ? Math.floor(d / 60) + " h" + (d % 60 ? " " + String(d % 60).padStart(2, "0") : "") : d + " min";
  const jid = () => "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const dayOf = k => new Date(k + "T12:00:00");
  // Blocs d'un jour : ceux du jour + les blocs répétés chaque semaine, triés par heure.
  function blocksOn(j, k) { const wd = (dayOf(k).getDay() + 6) % 7; return (j.blocks[k] || []).concat(j.weekly.filter(b => b.wd === wd).map(b => Object.assign({}, b, { weekly: true }))).sort((a, b) => mins(a.start) - mins(b.start)); }
  const isDone = (j, k, b) => !!j.done[k + "|" + b.id];
  // Cours du lycée ce jour-là (emploi du temps), sauf si « Pas cours ».
  const schoolOn = (j, k) => j.off[k] ? [] : slotsOn(dayOf(k));
  // Chapitre conseillé pour une matière : celui du contrôle le plus proche, sinon le plus de cartes à revoir, sinon le moins maîtrisé.
  function bestChapter(sid) {
    const chs = state.chapters.filter(c => c.subject_id === sid && cardsOf(c.id).length); if (!chs.length) return null;
    const s = state.subjects.find(x => x.id === sid), only = s ? examChs(s) : null, pool = only ? chs.filter(c => only.includes(c.id)) : chs;
    return (pool.length ? pool : chs).map(c => ({ c, due: dueCards(cardsOf(c.id)).length, m: mastery(cardsOf(c.id)) })).sort((a, b) => b.due - a.due || a.m - b.m)[0].c;
  }
  function blockTarget(b) {
    // Chapitre : celui choisi, ou celui que Merge choisit (b.auto) ; sans chapitre, on ouvre la matière.
    const ch = b.ch && state.chapters.some(c => c.id === b.ch) ? b.ch : b.s && b.auto ? (bestChapter(b.s) || {}).id : null;
    if (b.act === "cartes") return ch ? "#cartes-" + ch : b.s ? "#revision-" + b.s : "#cartes-jour";
    if (b.act === "quiz") return ch ? "#quiz-" + ch : null;
    if (b.act === "resume") return ch ? "#resume-" + ch : null;
    if (b.act === "exos") return ch ? "#exos-" + ch : "#exos";
    if (b.act === "controle") return ch ? "#controle-" + ch : null;
    return b.s ? "#matiere-" + b.s : null;
  }
  // Créneaux libres d'un jour, entre start et 22 h, hors cours et blocs déjà prévus.
  function freeSlots(j, k, from) {
    const busy = schoolOn(j, k).map(x => [mins(x.start), mins(x.end)]).concat(blocksOn(j, k).map(b => [mins(b.start), mins(b.start) + b.dur])).sort((a, b) => a[0] - b[0]);
    const out = []; let t = from;
    busy.forEach(([a, z]) => { if (a > t) out.push([t, a]); t = Math.max(t, z); });
    if (t < 22 * 60) out.push([t, 22 * 60]); return out.filter(([a, z]) => z - a >= 15);
  }
  // « Remplir ma journée » sans IA : 25 min de révision + 5 min de pause, matières du contrôle le plus proche puis cartes à revoir.
  function autoPlan(j, k) {
    const now = new Date(), isToday = k === localDay(), school = schoolOn(j, k);
    let from = isToday ? Math.ceil((now.getHours() * 60 + now.getMinutes() + 10) / 15) * 15 : (school.length ? Math.max(17 * 60, ...school.map(x => mins(x.end))) : 9 * 60);
    if (!isToday && school.length) from = Math.max(from, ...school.map(x => mins(x.end)) ) ;
    const subs = state.subjects.filter(s => state.chapters.some(c => c.subject_id === s.id && cardsOf(c.id).length));
    const score = s => { const c = nextCtrl(s), d = c ? daysUntil(c.d) : 99; return (d <= 14 ? 100 - d * 5 : 0) + dueCards(state.cards.filter(x => state.chapters.some(c2 => c2.id === x.chapter_id && c2.subject_id === s.id))).length; };
    const order = subs.sort((a, b) => score(b) - score(a)); if (!order.length) return [];
    const out = [], acts = ["cartes", "quiz", "cartes", "resume"]; let n = 0, budget = j.off[k] ? 240 : 90;
    for (const [a, z] of freeSlots(j, k, from)) {
      let t = a;
      while (budget >= 25 && t + 25 <= z && out.length < 12) {
        const s = order[n % order.length]; out.push({ id: jid(), start: hm(t), dur: 25, s: s.id, ch: null, auto: true, act: acts[Math.floor(n / order.length) % acts.length], title: "" }); t += 25; budget -= 25; n++;
        if (budget >= 25 && t + 30 <= z) { out.push({ id: jid(), start: hm(t), dur: 5, s: null, ch: null, act: "pause", title: "Pause" }); t += 5; }
      }
      if (budget < 25) break;
    }
    return out;
  }

  // Onglet Planning : on arrive sur l'emploi du temps (jour en frise, ou semaine), le calendrier du mois est le 2e sous-onglet (#mois).
  // Comme sur l'iPhone, « ‹ » remonte d'un niveau : jour → semaine → mois. Le niveau et le jour affichés sont gardés (merge.jview),
  // même si on quitte l'appli. hours = vue heure par heure du jour.
  const planSeg = cur => `<div class="seg" role="tablist" aria-label="Planning"><a role="tab" href="#calendrier" aria-selected="${cur === "edt"}">Emploi du temps</a><a role="tab" href="#mois" aria-selected="${cur === "mois"}">Calendrier</a></div>`;
  const jView = () => { const v = jget("merge.jview", null) || {}; return { lvl: ["mois", "semaine", "jour"].includes(v.lvl) ? v.lvl : "jour", day: /^\d{4}-\d{2}-\d{2}$/.test(v.day || "") ? v.day : localDay(), hours: !!v.hours }; };
  function jGo(lvl, day, hours) {
    const v = jView(), mois = lvl === "mois";
    jset("merge.jview", { lvl: mois ? (v.lvl === "mois" ? "jour" : v.lvl) : lvl, day: day || v.day, hours: hours === undefined ? v.hours : hours });
    const h = mois ? "#mois" : "#calendrier"; if (location.hash !== h) location.hash = h; else if (mois) screenCalendar(); else screenPlanning();
  }
  function screenPlanning() { const v = jView(); jDay = v.day; if (v.lvl === "semaine") screenSemaine(); else screenJournee(); }
  // Vue semaine : chaque jour en une ligne, avec ses contrôles, ses cours et ses révisions prévues.
  function screenSemaine() {
    drawTabs("calendrier"); const j = jGet(), mon = mondayOf(dayOf(jDay)), today = localDay();
    const days = [...Array(7)].map((_, i) => { const d = new Date(mon); d.setDate(d.getDate() + i); return localDay(d); });
    const subj = id => state.subjects.find(x => x.id === id), colorOf = blockColor;
    const end = dayOf(days[6]);
    app.innerHTML = `${planSeg("edt")}<div class="jnav"><button class="linkbtn" id="jup">${I.back}${esc(dayOf(jDay).toLocaleDateString("fr-FR", { month: "long" }).replace(/^./, c => c.toUpperCase()))}</button><span class="grow"></span><button class="btn sm ghost" id="wtoday">Aujourd'hui</button></div>
      <div class="row between"><button class="iconbtn flat" id="wprev" aria-label="Semaine précédente">${I.back}</button><h1 style="margin:0;text-align:center">Semaine du ${mon.getDate()}${mon.getMonth() !== end.getMonth() ? " " + mon.toLocaleDateString("fr-FR", { month: "short" }) : ""} au ${end.getDate()} ${end.toLocaleDateString("fr-FR", { month: "short" })}</h1><button class="iconbtn flat" id="wnext" aria-label="Semaine suivante" style="transform:scaleX(-1)">${I.back}</button></div>
      ${edtGet().ab && weekAB(mon) ? `<p class="small muted" style="text-align:center;margin:0">Semaine ${weekAB(mon)}</p>` : ""}
      <div class="wklist">${days.map(k => { const d = dayOf(k), bs = blocksOn(j, k), sc = schoolOn(j, k), cs = ctrls().filter(c => c.d === k).map(c => subj(c.s)).filter(Boolean), mins_ = bs.filter(b => b.act !== "pause").reduce((a, b) => a + b.dur, 0);
        return `<button class="wkday card${k === today ? " now" : ""}" data-wd="${k}"><span class="wkd"><span>${d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}</span><b>${d.getDate()}</b></span><span class="wkbody">${cs.map(x => `<span class="wkexam" style="--c:${esc(x.color)}">Contrôle de ${esc(x.name)}</span>`).join("")}<span class="wkpills">${bs.filter(b => b.act !== "pause").slice(0, 6).map(b => `<i style="background:${esc(colorOf(b))}">${esc(b.start)} ${esc((subj(b.s) || {}).name || actOf(b.act)[1])}</i>`).join("") || `<span class="small muted">${j.off[k] ? "Pas cours · " : sc.length ? plural(sc.length, "cours", "cours") + " · " : ""}rien de prévu</span>`}</span>${mins_ ? `<span class="small muted">${durTxt(mins_)} de révision${isDoneAll(j, k, bs) ? " · fait" : ""}</span>` : ""}</span></button>`; }).join("")}</div>`;
    $("jup").onclick = () => jGo("mois");
    $("wtoday").onclick = () => jGo("jour", today);
    $("wprev").onclick = () => { const d = dayOf(jDay); d.setDate(d.getDate() - 7); jGo("semaine", localDay(d)); };
    $("wnext").onclick = () => { const d = dayOf(jDay); d.setDate(d.getDate() + 7); jGo("semaine", localDay(d)); };
    app.querySelectorAll("[data-wd]").forEach(b => b.onclick = () => jGo("jour", b.dataset.wd));
  }
  const isDoneAll = (j, k, bs) => { const w = bs.filter(b => b.act !== "pause"); return w.length > 0 && w.every(b => isDone(j, k, b)); };
  let jDay = null;
  function screenJournee() {
    drawTabs("calendrier"); nowTaskTick();
    const j = jGet(); jDay = jView().day; const hours = jView().hours;
    // Première ouverture : on demande l'emploi du temps (PDF ou photo), puis la semaine A ou B.
    if (!j.setup && !edtGet().slots.length) { j.setup = true; jSave(j); setTimeout(() => edtSetupSheet(), 300); }
    const sel = dayOf(jDay), mon = mondayOf(sel), week = [...Array(7)].map((_, i) => { const d = new Date(mon); d.setDate(d.getDate() + i); return localDay(d); });
    const today = localDay(), list = blocksOn(j, jDay), school = schoolOn(j, jDay), ab = weekAB(sel);
    const subj = id => state.subjects.find(x => x.id === id), colorOf = blockColor;
    const ctrlToday = upCtrls().filter(x => x.c.d === jDay);
    const month = sel.toLocaleDateString("fr-FR", { month: "long" });
    // Frise : cours du lycée (gris) et blocs (couleur de la matière), avec les trous libres.
    const items = school.map(x => ({ school: true, start: x.start, dur: mins(x.end) - mins(x.start), x })).concat(list.map(b => ({ b, start: b.start, dur: b.dur }))).sort((a, b) => mins(a.start) - mins(b.start));
    let prevEnd = null; const rows = [];
    items.forEach(it => {
      const st = mins(it.start);
      if (prevEnd != null && st - prevEnd >= 30) rows.push(`<button class="jgap" data-gap="${hm(prevEnd)}"><span>${durTxt(st - prevEnd)} de libre</span>${I.plus}</button>`);
      if (it.school) { const sj = subjOfName(it.x.subject); rows.push(`<div class="jrow school"><span class="jpill" style="--c:${esc(sj ? sj.color : "#475569")};--h:${Math.min(96, Math.max(48, it.dur * .9))}px">${I.subj}</span><div class="jtxt"><span class="small muted">${esc(it.x.start)}–${esc(it.x.end)} (${durTxt(it.dur)})</span><b>Cours${sj ? " de " + esc(sj.name) : " : " + esc(it.x.subject)}</b>${it.x.room ? `<span class="small muted">Salle ${esc(it.x.room)}</span>` : ""}</div></div>`); }
      else { const b = it.b, done = isDone(j, jDay, b), s = subj(b.s), a = actOf(b.act), ch = b.ch && state.chapters.find(c => c.id === b.ch), auto = !b.ch && b.auto && b.s && bestChapter(b.s);
        const live = jDay === today && !done && mins(b.start) <= nowMin() && nowMin() < mins(b.start) + b.dur;
        rows.push(`<div class="jrow${done ? " done" : ""}${live ? " live" : ""}" ${live ? liveAttrs(b) + ` ` : ""}style="--c:${esc(colorOf(b))}${live ? ";--p:" + ((nowMin() - mins(b.start)) / b.dur * 100).toFixed(1) + "%" : ""}"><button class="jpill" data-go="${b.id}" style="--h:${Math.min(120, Math.max(48, b.dur * 1.1))}px" aria-label="Lancer : ${esc(b.title || a[1])}">${I[a[2]]}</button>
          <button class="jtxt" data-edit="${b.id}"><span class="small muted">${b.start}–${hm(mins(b.start) + b.dur)} (${durTxt(b.dur)})${b.weekly ? " · chaque semaine" : ""}</span><b>${esc(b.title || (b.act === "pause" ? "Pause" : a[1] + (s ? " · " + s.name : "")))}</b>${live ? `<span class="small lrem">${remTxt(mins(b.start) + b.dur - nowMin())}</span>` : ""}${ch || auto ? `<span class="small muted">${esc((ch || auto).name)}</span>` : ""}</button>
          <button class="jcheck" data-done="${b.id}" role="checkbox" aria-checked="${done}" aria-label="Fait"><span>${done ? I.check : ""}</span></button></div>`); }
      prevEnd = Math.max(prevEnd || 0, st + it.dur);
    });
    const dots = k => { const bs = blocksOn(j, k).filter(b => b.act !== "pause").slice(0, 4); return bs.map(b => `<i style="background:${esc(colorOf(b))}"></i>`).join(""); };
    app.innerHTML = `${planSeg("edt")}<div class="jnav"><button class="linkbtn" id="jup">${I.back}Semaine</button><span class="grow"></span><button class="btn sm ghost" id="jhours" aria-pressed="${hours}">${hours ? "Vue frise" : "Heure par heure"}</button></div><div class="jhead"><button class="jtitle" id="jtoday"><b>${sel.getDate()}. ${esc(month.charAt(0).toUpperCase() + month.slice(1))}</b> <span>${sel.getFullYear()}</span>${jDay !== today ? " ›" : ""}</button>${edtGet().ab && ab ? `<span class="pill">Semaine ${ab}</span>` : ""}</div>
      <div class="jweek"><button class="iconbtn flat" id="jprev" aria-label="Semaine précédente">${I.back}</button>${week.map(k => { const d = dayOf(k); return `<button class="jd${k === jDay ? " on" : ""}${k === today ? " now" : ""}" data-day="${k}"><span>${d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}</span><b>${d.getDate()}</b><span class="jdots">${dots(k)}</span></button>`; }).join("")}<button class="iconbtn flat" id="jnext" aria-label="Semaine suivante" style="transform:scaleX(-1)">${I.back}</button></div>
      <div class="jall"><button class="jround${j.off[jDay] ? " on" : ""}" id="joff" aria-pressed="${!!j.off[jDay]}"><span>${I.home}</span>Pas cours</button>${ctrlToday.map(x => `<a class="jround on" href="#matiere-${x.s.id}" style="--c:${esc(x.s.color)}"><span>${I.check}</span>Contrôle ${esc(x.s.name)}</a>`).join("")}<button class="jround" id="jctl"><span>${I.check}</span>Ajouter un contrôle</button><button class="jround" id="jauto"><span>${I.bolt}</span>Remplir ma journée</button><button class="jround" id="jai"><span>${I.spark}</span>IA</button></div>
      ${hours ? hoursHtml(j, jDay, school, list, colorOf) : ""}<div class="jline"${hours ? " hidden" : ""}>${rows.join("") || `<div class="card pad stack jempty"><b>Rien de prévu ${jDay === today ? "aujourd'hui" : "ce jour-là"}.</b><p class="small muted">Touche + pour ajouter une révision (par exemple « Maths, 30 min »), « Remplir ma journée » pour un plan tout fait, ou « IA » pour le demander avec tes mots.</p></div>`}</div>
      ${edtGet().slots.length ? "" : `<button class="linkbtn" id="jedt">${I.cal}Ajouter mon emploi du temps</button>`}
      <button class="jfab" id="jadd" aria-label="Ajouter une révision">${I.plus}</button>`;
    const re = () => screenJournee();
    $("jup").onclick = () => jGo("semaine");
    $("jhours").onclick = () => jGo("jour", jDay, !hours);
    app.querySelectorAll(".jweek [data-day]").forEach(b => b.onclick = () => jGo("jour", b.dataset.day));
    if ($("jprev")) $("jprev").onclick = () => { const d = dayOf(jDay); d.setDate(d.getDate() - 7); jGo("jour", localDay(d)); };
    if ($("jnext")) $("jnext").onclick = () => { const d = dayOf(jDay); d.setDate(d.getDate() + 7); jGo("jour", localDay(d)); };
    $("jtoday").onclick = () => jGo("jour", today);
    $("jctl").onclick = () => ctrlDaySheet(jDay, re);
    app.querySelectorAll("[data-hour]").forEach(b => b.onclick = () => blockSheet(null, b.dataset.hour));
    $("joff").onclick = () => { const x = jGet(); if (x.off[jDay]) delete x.off[jDay]; else x.off[jDay] = true; jSave(x); toast(x.off[jDay] ? "Pas cours ce jour-là : toute la journée est libre." : "Cours remis."); re(); };
    $("jadd").onclick = () => blockSheet(null);
    if ($("jedt")) $("jedt").onclick = () => edtSetupSheet();
    app.querySelectorAll("[data-gap]").forEach(b => b.onclick = () => blockSheet(null, b.dataset.gap));
    app.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => blockSheet(list.find(x => x.id === b.dataset.edit)));
    app.querySelectorAll("[data-done]").forEach(b => b.onclick = () => { const x = jGet(), key = jDay + "|" + b.dataset.done; if (x.done[key]) delete x.done[key]; else { x.done[key] = true; ping(true); } jSave(x); re(); });
    app.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { const bl = list.find(x => x.id === b.dataset.go), to = bl && blockTarget(bl); if (to) location.hash = to; else blockSheet(bl); });
    $("jauto").onclick = () => {
      const plan = autoPlan(jGet(), jDay); if (!plan.length) return toast(state.cards.length ? "Plus de place libre ce jour-là." : "Importe d'abord un cours pour avoir quelque chose à réviser.");
      previewSheet(plan, "Voici une proposition pour " + (jDay === today ? "aujourd'hui" : esc(fmtDate(jDay))) + ".");
    };
    $("jai").onclick = () => aiSheet();
  }
  // Ajouter ou modifier un bloc : activité, matière, chapitre (choisi par Merge par défaut), heure, durée, répétition.
  // Nom affiché d'un bloc.
  function blockName(b) { const s = state.subjects.find(x => x.id === b.s); return b.title || (b.act === "pause" ? "Pause" : actOf(b.act)[1] + (s ? " · " + s.name : "")); }
  // Tâche en cours : Merge connaît l'heure ; la couleur de la matière remplit le bloc au fil des minutes, avec le temps qui reste.
  const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; };
  function liveAttrs(b) { return `data-lstart="${mins(b.start)}" data-ldur="${b.dur}"`; }
  function remTxt(left) { const m = Math.max(1, Math.ceil(left)); return "il reste " + (m >= 60 ? durTxt(m) : m + " min"); }
  function nowTaskHtml() {
    const j = jGet(), k = localDay(), n = nowMin(), list = blocksOn(j, k).slice().sort((a, b) => mins(a.start) - mins(b.start));
    const cur = list.find(b => !isDone(j, k, b) && mins(b.start) <= n && n < mins(b.start) + b.dur);
    const nx = list.find(b => b !== cur && mins(b.start) > n && !isDone(j, k, b));
    if (!cur && !nx) return '<div id="nowtask"></div>';
    const p = cur ? Math.min(100, (n - mins(cur.start)) / cur.dur * 100) : 0;
    return `<div id="nowtask" class="stack">${cur ? `<a class="nowtask live" ${liveAttrs(cur)} href="${blockTarget(cur)}" style="--c:${esc(blockColor(cur))};--p:${p.toFixed(1)}%"><span class="ntfill"></span><span class="ntbody"><span class="small"><b>En cours</b> · <span class="lrem">${remTxt(mins(cur.start) + cur.dur - n)}</span></span><b class="ntname">${esc(blockName(cur))}</b><span class="small">${cur.start}–${hm(mins(cur.start) + cur.dur)}</span></span><span class="ntgo">${I.play}</span></a>` : ""}${nx ? `<a class="ntnext" href="#calendrier"><span class="dot" style="background:${esc(blockColor(nx))}"></span><span class="small">${cur ? "Ensuite" : "Prochaine tâche"} à <b>${nx.start}</b> : ${esc(blockName(nx))}</span></a>` : ""}</div>`;
  }
  // Toutes les 20 s : avance le remplissage et le temps restant (accueil et frise du jour), sans tout redessiner.
  let liveTimer = null;
  function nowTaskTick() {
    clearInterval(liveTimer);
    liveTimer = setInterval(() => {
      const box = $("nowtask"), lives = document.querySelectorAll("[data-lstart]");
      if (!box && !lives.length) { clearInterval(liveTimer); liveTimer = null; return; }
      const n = nowMin();
      if (box) { const t = document.createElement("div"); t.innerHTML = nowTaskHtml(); if (t.firstElementChild.outerHTML !== box.outerHTML) box.replaceWith(t.firstElementChild); }
      document.querySelectorAll(".jrow[data-lstart]").forEach(el => { const st = +el.dataset.lstart, d = +el.dataset.ldur; if (n >= st + d) { el.classList.remove("live"); el.removeAttribute("data-lstart"); const r = el.querySelector(".lrem"); if (r) r.remove(); return; } el.style.setProperty("--p", Math.min(100, (n - st) / d * 100).toFixed(1) + "%"); const r = el.querySelector(".lrem"); if (r) r.textContent = remTxt(st + d - n); });
    }, 20000);
  }
  // Couleur d'un bloc : celle choisie à la main, sinon celle de la matière (gris pour une pause).
  const BCOLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#9483ff", "#ec4899"];
  function blockColor(b) { return b.color || (b.act === "pause" ? "#6b7280" : (state.subjects.find(x => x.id === b.s) || {}).color || "#9483ff"); }
  // Dicter : la dictée du téléphone si elle existe ; sinon (iPhone en appli installée) on enregistre et l'IA transcrit (1 appel, action « transcrire »).
  const canDictate = () => !!(window.SpeechRecognition || window.webkitSpeechRecognition || (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder));
  function dictate(btn, field, after) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    let rec = null, mr = null, stopT = null;
    const put = t => { const base = field.value.trim(); field.value = (base ? base + " " : "") + t; if (after) after(); };
    btn.onclick = async () => {
      if (SR) {
        if (rec) { rec.stop(); return; }
        rec = new SR(); rec.lang = "fr-FR"; rec.interimResults = true; const base = field.value;
        rec.onresult = e => { field.value = (base ? base + " " : "") + [...e.results].map(r => r[0].transcript).join(""); if (after) after(); };
        rec.onend = () => { rec = null; btn.classList.remove("on"); };
        rec.onerror = () => { toast("Micro indisponible. Écris ta demande à la place."); };
        btn.classList.add("on"); rec.start(); return;
      }
      if (mr) { mr.stop(); return; }
      if (state.offline) return toast("Il faut être connecté à Internet pour dicter.");
      let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { return toast("Autorise le micro pour dicter."); }
      const chunks = []; mr = new MediaRecorder(stream); mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      mr.onstop = async () => {
        clearTimeout(stopT); stream.getTracks().forEach(t => t.stop()); btn.classList.remove("on"); const type = mr.mimeType || "audio/mp4"; mr = null;
        const blob = new Blob(chunks, { type }); if (blob.size < 2000) return toast("Je n'ai rien entendu.");
        btn.disabled = true; const ph = field.placeholder; field.placeholder = "J'écris ce que tu as dit…";
        try {
          const data = await new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = ko; r.readAsDataURL(blob); });
          const r = await ai({ action: "transcrire", audio: { mime: type.split(";")[0], data } }, "studio");
          if (r.text) put(String(r.text).slice(0, 2000)); else toast("Je n'ai rien compris, réessaie.");
        } catch (e) { toast(e.message || "La dictée n'a pas marché."); }
        btn.disabled = false; field.placeholder = ph;
      };
      btn.classList.add("on"); mr.start(); toast("Je t'écoute… touche encore le micro quand tu as fini."); stopT = setTimeout(() => { if (mr) mr.stop(); }, 60000);
    };
  }
  function blockSheet(b, at) {
    const j = jGet(), edit = !!b, v = Object.assign({ act: "cartes", s: (state.subjects[0] || {}).id || null, ch: null, start: at || hm(Math.max(mins("17:00"), Math.ceil((new Date().getHours() * 60 + new Date().getMinutes()) / 15) * 15)), dur: 30, title: "", weekly: false }, b || {});
    const durs = [15, 20, 30, 45, 60, 90, 120, 150, 180];
    if (b && b.auto) v.ch = "auto";
    const paint = el => {
      const chs = state.chapters.filter(c => c.subject_id === v.s), auto = v.s && bestChapter(v.s), noSubj = v.act === "pause";
      el.querySelector("#bacts").innerHTML = ACTS.map(a => `<button type="button" class="chip" data-ba="${a[0]}" aria-pressed="${v.act === a[0]}">${I[a[2]]}&nbsp;${a[1]}</button>`).join("");
      const optSubj = v.act === "libre";
      el.querySelector("#bsubj").innerHTML = noSubj ? "" : `<span class="label">Matière${optSubj ? " (facultatif)" : ""}</span><div class="chips">${optSubj ? `<button type="button" class="chip" data-bs="" aria-pressed="${!v.s}">Aucune</button>` : ""}${state.subjects.map(x => `<button type="button" class="chip" data-bs="${x.id}" aria-pressed="${v.s === x.id}" style="--c:${esc(x.color)}"><span class="dot"></span>&nbsp;${esc(x.name)}</button>`).join("") || '<span class="small muted">Ajoute d\'abord une matière.</span>'}</div>
        ${chs.length ? `<label class="label" for="bch">Chapitre (facultatif)</label><select id="bch"><option value="">Aucun chapitre en particulier</option>${auto ? `<option value="auto"${v.ch === "auto" ? " selected" : ""}>Choisi par Merge : ${esc(auto.name)}</option>` : ""}${chs.map(c => `<option value="${c.id}"${v.ch === c.id ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select>` : ""}`;
      el.querySelector("#bcols").innerHTML = `<button type="button" class="bcol auto" data-bc="" aria-pressed="${!v.color}" aria-label="Couleur de la matière" style="--c:${esc(blockColor(Object.assign({}, v, { color: null })))}"><i></i><span>Matière</span></button>` + BCOLORS.map(c => `<button type="button" class="bcol" data-bc="${c}" aria-pressed="${v.color === c}" aria-label="Couleur ${c}" style="--c:${c}"><i></i></button>`).join("");
      el.querySelectorAll("[data-bc]").forEach(x => x.onclick = () => { v.color = x.dataset.bc || null; paint(el); });
      el.querySelector("#bdurs").innerHTML = durs.map(d => `<button type="button" class="chip" data-bd="${d}" aria-pressed="${v.dur === d}">${durTxt(d)}</button>`).join("") + `<button type="button" class="chip" data-bd="libre" aria-pressed="${!durs.includes(v.dur)}">Autre</button>`;
      el.querySelector("#bfree").hidden = durs.includes(v.dur) && !v.free;
      el.querySelector("#bslide").value = v.dur; el.querySelector("#bslv").textContent = durTxt(v.dur);
      // « Autre » : n'importe quelle activité (sport, coloriage, devoir…), matière et chapitre facultatifs, aucune par défaut.
      el.querySelectorAll("[data-ba]").forEach(x => x.onclick = () => { const was = v.act; v.act = x.dataset.ba; if (v.act === "pause" && v.dur > 15) v.dur = 5; if (v.act === "libre" && was !== "libre") { v.s = null; v.ch = null; } else if (v.act !== "libre" && v.act !== "pause" && !v.s) v.s = (state.subjects[0] || {}).id || null; paint(el); });
      el.querySelectorAll("[data-bs]").forEach(x => x.onclick = () => { v.s = x.dataset.bs || null; v.ch = null; paint(el); });
      el.querySelectorAll("[data-bd]").forEach(x => x.onclick = () => { if (x.dataset.bd === "libre") { v.free = true; if (durs.includes(v.dur)) v.dur = Math.min(300, v.dur + 5); } else { v.free = false; v.dur = +x.dataset.bd; } paint(el); });
      if (el.querySelector("#bch")) el.querySelector("#bch").onchange = e => { v.ch = e.target.value || null; };
    };
    sheet(`<h1>${edit ? "Modifier" : "Ajouter une révision"}</h1><div class="chips" id="bacts"></div><div class="stack" id="bsubj"></div>
      <div class="row" style="flex-wrap:wrap;gap:12px"><div class="field"><label for="bstart">Début</label><input id="bstart" type="time" value="${esc(v.start)}"></div><div class="field grow"><span class="label">Durée</span><div class="chips" id="bdurs"></div><div class="bfree" id="bfree" hidden><input type="range" id="bslide" min="5" max="300" step="5" aria-label="Durée en minutes"><b id="bslv"></b></div></div></div>
      <div class="field"><span class="label">Couleur</span><div class="bcols" id="bcols"></div></div>
      <div class="field"><label for="btitle">Nom (facultatif)</label><input id="btitle" type="text" maxlength="60" value="${esc(v.title || "")}" placeholder="${"Ex. Fiche sur la mitose, Sport, Devoir de philo…"}"></div>
      ${edit && b.weekly ? '<p class="small muted">Ce bloc revient chaque semaine.</p>' : `<button type="button" class="switch" role="switch" id="bweek" aria-checked="false"><i></i><span>Répéter chaque semaine</span></button>`}
      <button class="btn" id="bok">${edit ? "Enregistrer" : "Ajouter"}</button>${edit ? '<button class="btn ghost" id="bdel">Supprimer</button>' : ""}`, el => {
      paint(el); let weekly = false;
      el.querySelector("#bslide").oninput = e => { v.dur = +e.target.value; v.free = true; el.querySelector("#bslv").textContent = durTxt(v.dur); el.querySelectorAll("[data-bd]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.bd === "libre" ? true : +x.dataset.bd === v.dur && false))); };
      if (el.querySelector("#bweek")) el.querySelector("#bweek").onclick = e => { weekly = !weekly; e.currentTarget.setAttribute("aria-checked", String(weekly)); };
      el.querySelector("#bok").onclick = () => {
        const x = jGet(), nb = { id: edit ? b.id : jid(), start: el.querySelector("#bstart").value || v.start, dur: v.dur, s: v.act === "pause" ? null : v.s, ch: v.act === "pause" || v.ch === "auto" ? null : v.ch, act: v.act, title: el.querySelector("#btitle").value.trim().slice(0, 60) }; if (v.color) nb.color = v.color; if (v.ch === "auto" && v.act !== "pause") nb.auto = true;
        if (v.act !== "pause" && !nb.s && v.act !== "libre") return toast("Choisis une matière.");
        if (v.act === "libre" && !nb.s && !nb.title) return toast("Donne un nom à ton activité.");
        if (edit && b.weekly) { const i = x.weekly.findIndex(y => y.id === b.id); if (i >= 0) x.weekly[i] = Object.assign(nb, { wd: b.wd }); }
        else if (!edit && weekly) x.weekly.push(Object.assign(nb, { wd: (dayOf(jDay).getDay() + 6) % 7 }));
        else { const l = x.blocks[jDay] || []; const i = l.findIndex(y => y.id === nb.id); if (i >= 0) l[i] = nb; else l.push(nb); x.blocks[jDay] = l; }
        jSave(x); closeSheet(); toast(edit ? "Modifié." : "Ajouté à ta journée."); screenJournee();
      };
      if (el.querySelector("#bdel")) el.querySelector("#bdel").onclick = () => { const x = jGet(); if (b.weekly) x.weekly = x.weekly.filter(y => y.id !== b.id); else x.blocks[jDay] = (x.blocks[jDay] || []).filter(y => y.id !== b.id); jSave(x); closeSheet(); toast("Supprimé."); screenJournee(); };
    });
  }
  // Aperçu d'un plan (fait par Merge ou par l'IA) avant de l'ajouter.
  function previewSheet(plan, intro, byDay) {
    const days = byDay || { [jDay]: plan }, all = Object.entries(days).filter(([, l]) => l.length);
    sheet(`<div class="row"><span class="mico big">${I.spark}</span><h1>Ton plan</h1></div><p class="muted">${intro}</p>
      ${all.map(([k, l]) => `${all.length > 1 || k !== jDay ? `<span class="label">${esc(fmtDate(k))}</span>` : ""}<div class="jprev">${l.map(b => { const s = state.subjects.find(x => x.id === b.s), a = actOf(b.act); return `<div class="row" style="--c:${esc(blockColor(b))}"><span class="jpill sm">${I[a[2]]}</span><span class="grow"><span class="small muted">${b.start} · ${durTxt(b.dur)}</span><br><b>${esc(b.title || (b.act === "pause" ? "Pause" : a[1] + (s ? " · " + s.name : "")))}</b></span></div>`; }).join("")}</div>`).join("")}
      <button class="btn" id="pok">Ajouter à ma journée</button><button class="btn ghost" data-close>Annuler</button>`, el => {
      el.querySelector("#pok").onclick = () => { const x = jGet(); all.forEach(([k, l]) => { x.blocks[k] = (x.blocks[k] || []).concat(l); }); jSave(x); closeSheet(); toast("Plan ajouté."); screenJournee(); };
    });
  }
  // Mode IA : on écrit (ou on dicte au micro) ce qu'on veut, l'IA range ça dans la journée (1 appel).
  function aiSheet() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    sheet(`<div class="row"><span class="mico big">${I.spark}</span><h1>Organise ma journée</h1></div><p class="muted">Dis ce que tu veux faire, avec tes mots. Exemple : « Ce soir 30 min de maths et un quiz de SVT, je finis à 18 h ».</p>
      <div class="field"><textarea id="aiq" rows="4" maxlength="600" placeholder="Qu'est-ce que tu veux prévoir ?"></textarea></div>
      <div class="row">${canDictate() ? `<button class="iconbtn" id="aimic" aria-label="Dicter">${I.mic}</button>` : ""}<span class="grow"></span><button class="btn" id="aigo">${I.spark}Générer</button></div><p class="note" id="aimsg" role="status"></p>`, el => {
      if (el.querySelector("#aimic")) dictate(el.querySelector("#aimic"), el.querySelector("#aiq"));
      el.querySelector("#aigo").onclick = async () => {
        const q = el.querySelector("#aiq").value.trim(); if (q.length < 4) return toast("Écris ce que tu veux prévoir.");
        if (state.offline) return toast("Il faut être connecté à Internet pour l'IA.");
        const msg = el.querySelector("#aimsg"); msg.textContent = "L'IA prépare ta journée…"; el.querySelector("#aigo").disabled = true;
        try {
          const j = jGet(), days = [...Array(7)].map((_, i) => { const d = dayOf(jDay); d.setDate(d.getDate() + i); return localDay(d); });
          const ctx = { aujourdhui: localDay(), heure: hm(new Date().getHours() * 60 + new Date().getMinutes()), jour_choisi: jDay,
            jours: days.map(k => ({ date: k, pas_cours: !!j.off[k], cours: schoolOn(j, k).map(x => x.start + "-" + x.end + " " + x.subject), deja: blocksOn(j, k).map(b => ({ id: b.id, debut: b.start, duree: b.dur, act: b.act, matiere: (state.subjects.find(x => x.id === b.s) || {}).name || "", fait: isDone(j, k, b) })) })),
            matieres: state.subjects.map(s => ({ id: s.id, nom: s.name, controle: (nextCtrl(s) || {}).d || null, chapitres: state.chapters.filter(c => c.subject_id === s.id && cardsOf(c.id).length).map(c => ({ id: c.id, nom: c.name, a_revoir: dueCards(cardsOf(c.id)).length, maitrise: mastery(cardsOf(c.id)) })) })) };
          const r = await ai({ action: "planjour", demande: q, contexte: ctx }, "studio");
          const ok = (r.blocks || []).map(b => ({ id: jid(), date: days.includes(b.date) ? b.date : jDay, start: /^([01]\d|2[0-3]):[0-5]\d$/.test(b.start || "") ? b.start : null, dur: Math.max(5, Math.min(240, Math.round(+b.dur || 0))), s: state.subjects.some(x => x.id === b.s) ? b.s : null, ch: state.chapters.some(c => c.id === b.ch && c.subject_id === b.s) ? b.ch : null, act: ACTS.some(a => a[0] === b.act) ? b.act : "libre", title: String(b.title || "").slice(0, 60) })).filter(b => b.start && b.dur);
          const moved = (r.deplacer || []).filter(m => m && m.id && days.includes(m.date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(m.start || ""));
          if (moved.length) { const x = jGet(); moved.forEach(m => { Object.keys(x.blocks).forEach(k => { const i = (x.blocks[k] || []).findIndex(b => b.id === m.id); if (i >= 0) { const [b] = x.blocks[k].splice(i, 1); b.start = m.start; (x.blocks[m.date] = x.blocks[m.date] || []).push(b); } }); }); jSave(x); }
          if (!ok.length && !moved.length) throw new Error(r.message || "L'IA n'a rien proposé. Précise ta demande.");
          const byDay = {}; ok.forEach(b => { (byDay[b.date] = byDay[b.date] || []).push(b); delete b.date; });
          if (!ok.length) { closeSheet(); toast(r.message || "C'est fait."); return screenJournee(); }
          previewSheet(ok, esc(r.message || "Voici ce que je te propose."), byDay);
        } catch (e) { showErr(msg, e); el.querySelector("#aigo").disabled = false; }
      };
      setTimeout(() => el.querySelector("#aiq").focus(), 100);
    });
  }
  // Première ouverture de Journée : envoyer son emploi du temps (PDF ou photo), puis dire si on est en semaine A ou B.
  function edtSetupSheet() {
    sheet(`<div class="row"><span class="mico big">${I.cal}</span><h1>Ton emploi du temps</h1></div><p class="muted">Envoie le PDF (ou une photo) de ton emploi du temps : tes cours s'affichent dans ta journée et tu vois tout de suite quand tu es libre pour réviser.</p>
      <label class="btn" for="sedt">${I.up}Envoyer mon emploi du temps</label><input id="sedt" type="file" accept="application/pdf,image/*" hidden><p class="note" id="sedtmsg" role="status"></p>
      <button class="btn ghost" data-close>Plus tard</button>`, el => {
      el.querySelector("#sedt").onchange = async ev => {
        const f = ev.target.files[0]; if (!f) return; const msg = el.querySelector("#sedtmsg");
        try {
          const got = await edtRead(f, t => { msg.textContent = t; }); if (!got.length) throw new Error("Je n'ai trouvé aucun cours. Essaie un fichier plus net.");
          const e = edtGet(); e.slots = got; e.ab = got.some(x => x.week); jset("merge.edt", e);
          toast(plural(got.length, "cours ajouté", "cours ajoutés") + ".");
          if (e.ab) abSheet(); else { closeSheet(); screenJournee(); }
        } catch (er) { showErr(msg, er); }
      };
    });
  }
  function abSheet() {
    sheet(`<h1>Semaine A ou B ?</h1><p class="muted">${abQuestion()} Merge alterne ensuite tout seul chaque lundi.</p><div class="row"><button class="btn grow" data-ab="A">Semaine A</button><button class="btn grow" data-ab="B">Semaine B</button></div>`, el => {
      el.querySelectorAll("[data-ab]").forEach(b => b.onclick = () => { const e = edtGet(); e.ab = true; e.ref = { monday: localDay(abMonday()), letter: b.dataset.ab }; jset("merge.edt", e); closeSheet(); toast("Semaine " + b.dataset.ab + " enregistrée."); screenJournee(); });
    });
  }

  // Vue heure par heure (le « zoom » maximum) : de 6 h à 23 h, chaque bloc à sa place ; toucher une heure vide pour y ajouter une révision.
  function hoursHtml(j, k, school, list, colorOf) {
    const H0 = 6 * 60, PX = 1.3, y = t => Math.max(0, (mins(t) - H0) * PX), now = new Date(), nowM = now.getHours() * 60 + now.getMinutes();
    const grid = [...Array(18)].map((_, i) => `<button class="hrow" data-hour="${hm(H0 + i * 60)}" style="top:${i * 60 * PX}px" aria-label="Ajouter à ${6 + i} h"><span>${String(6 + i).padStart(2, "0")}:00</span></button>`).join("");
    const sc = school.map(x => `<div class="hblk school" style="--c:${esc((subjOfName(x.subject) || {}).color || "#475569")};top:${y(x.start)}px;height:${Math.max(22, (mins(x.end) - mins(x.start)) * PX - 3)}px"><b>Cours · ${esc(x.subject)}</b><span>${esc(x.start)}–${esc(x.end)}</span></div>`).join("");
    const bl = list.map(b => `<div class="hblk hb${isDone(j, k, b) ? " done" : ""}" style="top:${y(b.start)}px;height:${Math.max(44, b.dur * PX - 3)}px;--c:${esc(colorOf(b))}"><button class="hedit" data-edit="${b.id}"><b>${esc(b.title || (b.act === "pause" ? "Pause" : actOf(b.act)[1] + ((state.subjects.find(x => x.id === b.s) || {}).name ? " · " + state.subjects.find(x => x.id === b.s).name : "")))}</b><span>${b.start}–${hm(mins(b.start) + b.dur)}</span></button><button class="jcheck hcheck" data-done="${b.id}" role="checkbox" aria-checked="${isDone(j, k, b)}" aria-label="Fait"><span>${isDone(j, k, b) ? I.check : ""}</span></button></div>`).join("");
    return `<div class="hgrid" style="height:${18 * 60 * PX}px">${grid}${sc}${bl}${k === localDay() && nowM >= H0 ? `<i class="hnow" style="top:${(nowM - H0) * PX}px"></i>` : ""}</div><div style="height:80px"></div>`;
  }
  // Contrôles d'un jour, depuis la frise : toucher une ou plusieurs matières, puis choisir les chapitres.
  function ctrlDaySheet(k, after) {
    const draw = el => {
      const onDay = ctrls().filter(c => c.d === k);
      el.querySelector("#cdchips").innerHTML = state.subjects.map(x => `<button class="chip" data-sub="${x.id}" aria-pressed="${onDay.some(c => c.s === x.id)}" style="--c:${esc(x.color)}"><span class="dot"></span>&nbsp;${esc(x.name)}</button>`).join("") || '<span class="muted">Ajoute d\'abord une matière.</span>';
      el.querySelectorAll("[data-sub]").forEach(b => b.onclick = async () => {
        const sub = state.subjects.find(x => x.id === b.dataset.sub), have = ctrls().find(c => c.s === sub.id && c.d === k);
        if (have) { await ctrlDel(have.id); toast("Contrôle de " + sub.name + " retiré."); return draw(el); }
        if (isFree(sub)) { const err = await saveExam(sub.id, { date: null, free: false }); if (err) return fail(err, "Date non enregistrée"); }
        const c = await ctrlAdd(sub.id, k); if (c) ctrlChSheet(c.id, after); else draw(el);
      });
    };
    sheet(`<div class="row"><span class="mico big">${I.check}</span><h1>Contrôles</h1></div><p class="muted">${esc(fmtDate(k))} : touche une ou plusieurs matières.</p><div class="chips" id="cdchips"></div><button class="btn ghost" id="cdok">Fermer</button>`, el => { draw(el); el.querySelector("#cdok").onclick = () => { closeSheet(); after(); }; });
  }
