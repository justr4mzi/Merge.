  // ---------- carte mentale interactive (SVG pur) ----------
  function screenMindmap(id) {
    toolGate(id, "mindmap", "Carte mentale", "Tout le chapitre sous forme d'arbre : les grandes idées, puis les notions. Tu peux zoomer, déplacer la carte et replier les branches.", (data, ch, regen) => {
      let uid = 0; const prep = (n, d) => ({ id: uid++, t: texPlain(String((n && n.titre) || "")).slice(0, 60), tt: String((n && n.titre) || ""), detail: (n && n.detail) || "", d, open: d < 1, kids: d >= 4 ? [] : ((n && n.enfants) || []).slice(0, 10).map(k => prep(k, d + 1)) });
      const root = prep(data, 0); if (!root.t) root.t = ch.name;
      const W = 184, H = 50, GX = 56, GY = 12, K0 = innerWidth < 600 ? 0.7 : 1, V = { x: 16, y: 16, k: K0 }; let sel = root, byId = {};
      const wrap = (t) => { const w = t.split(/\s+/), lines = [""]; w.forEach(x => { const l = lines[lines.length - 1]; if ((l + " " + x).trim().length <= 22 || !l) lines[lines.length - 1] = (l + " " + x).trim(); else lines.push(x); }); if (lines.length > 2) { lines.length = 2; lines[1] = lines[1].slice(0, 20) + "…"; } return lines; };
      function layout() { let y = 0; const nodes = [], links = []; byId = {}; (function walk(n) { n.x = n.d * (W + GX); const kids = n.open ? n.kids : []; if (!kids.length) { n.y = y; y += H + GY; } else { kids.forEach(k => { walk(k); links.push([n, k]); }); n.y = (kids[0].y + kids[kids.length - 1].y) / 2; } nodes.push(n); byId[n.id] = n; })(root); return { nodes, links }; }
      const setT = () => { const g = $("mmg"); if (g) g.setAttribute("transform", `translate(${V.x} ${V.y}) scale(${V.k})`); };
      function draw() {
        const L = layout();
        app.innerHTML = toolHead(id, "Carte mentale") + `<div class="row between"><div class="row"><button class="iconbtn" id="zin" aria-label="Zoomer">${I.plus}</button><button class="iconbtn" id="zout" aria-label="Dézoomer">${I.minus}</button></div><div class="row"><button class="chip" id="mall">Tout ouvrir</button><button class="chip" id="mfit">Recentrer</button></div></div>
          <svg id="mm" class="mindmap" role="group" aria-label="Carte mentale de ${esc(ch.name)}"><g id="mmg">${L.links.map(([a, b]) => `<path class="mlink" d="M${a.x + W} ${a.y + H / 2} C${a.x + W + GX / 2} ${a.y + H / 2} ${b.x - GX / 2} ${b.y + H / 2} ${b.x} ${b.y + H / 2}"/>`).join("")}${L.nodes.map(n => { const ls = wrap(n.t); return `<g class="mnode d${Math.min(n.d, 2)}${n === sel ? " sel" : ""}" data-n="${n.id}" tabindex="0" role="button" aria-label="${esc(n.t)}${n.kids.length ? (n.open ? ", branche ouverte" : ", branche repliée") : ""}" transform="translate(${n.x} ${n.y})"><rect width="${W}" height="${H}" rx="12"/><text x="${(W - (n.kids.length ? 22 : 0)) / 2}" y="${H / 2 - (ls.length - 1) * 8}" text-anchor="middle" dominant-baseline="central">${ls.map((l, k) => `<tspan x="${(W - (n.kids.length ? 22 : 0)) / 2}" dy="${k ? 16 : 0}">${esc(l)}</tspan>`).join("")}</text>${n.kids.length ? `<circle class="mtog" cx="${W - 16}" cy="${H / 2}" r="9"/><path class="mtogi" d="M${W - 20} ${H / 2}h8${n.open ? "" : `M${W - 16} ${H / 2 - 4}v8`}"/>` : ""}</g>`; }).join("")}</g></svg>
          <div class="card pad stack" aria-live="polite"><b>${mx(sel.tt || sel.t)}</b>${sel.detail ? `<p class="muted">${mx(sel.detail)}</p>` : ""}${sel.kids.length ? `<p class="small muted">${plural(sel.kids.length, "branche", "branches")} · touche la bulle pour ${sel.open ? "replier" : "déplier"}.</p>` : ""}</div>${regenHtml}`;
        setT(); wireRegen(regen);
        const svgEl = $("mm"), pts = new Map(); let moved = 0, pinch = 0;
        const toggle = (el) => { const n = byId[el.dataset.n]; if (!n) return; if (n.kids.length && (n === sel || !n.open)) n.open = !n.open; sel = n; draw(); };
        const zoom = (f, cx, cy) => { const k = Math.min(2.5, Math.max(0.35, V.k * f)); V.x = cx - (cx - V.x) * (k / V.k); V.y = cy - (cy - V.y) * (k / V.k); V.k = k; setT(); };
        svgEl.onpointerdown = e => { pts.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; pinch = 0; };
        svgEl.onpointermove = e => { if (!pts.has(e.pointerId)) return; const p = pts.get(e.pointerId), dx = e.clientX - p[0], dy = e.clientY - p[1]; pts.set(e.pointerId, [e.clientX, e.clientY]);
          if (pts.size === 2) { const [a, b] = [...pts.values()], dist = Math.hypot(a[0] - b[0], a[1] - b[1]), r = svgEl.getBoundingClientRect(); if (pinch) zoom(dist / pinch, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top); pinch = dist; moved = 99; return; }
          moved += Math.abs(dx) + Math.abs(dy); if (moved > 6) { try { svgEl.setPointerCapture(e.pointerId); } catch (er) { /* rien */ } V.x += dx; V.y += dy; setT(); } };
        svgEl.onpointerup = svgEl.onpointercancel = e => { pts.delete(e.pointerId); pinch = 0; if (moved <= 6 && e.type === "pointerup") { const el = e.target.closest && e.target.closest("[data-n]"); if (el) toggle(el); } };
        svgEl.onwheel = e => { e.preventDefault(); const r = svgEl.getBoundingClientRect(); zoom(e.deltaY < 0 ? 1.12 : 0.89, e.clientX - r.left, e.clientY - r.top); };
        svgEl.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { const el = e.target.closest("[data-n]"); if (el) { e.preventDefault(); const nid = el.dataset.n; toggle(el); const f = app.querySelector(`[data-n="${nid}"]`); if (f) f.focus(); } } };
        const mid = () => { const r = svgEl.getBoundingClientRect(); return [r.width / 2, r.height / 2]; };
        $("zin").onclick = () => zoom(1.25, ...mid()); $("zout").onclick = () => zoom(0.8, ...mid());
        $("mfit").onclick = () => { V.x = 16; V.y = 16; V.k = K0; setT(); };
        $("mall").onclick = () => { const anyClosed = L.nodes.some(n => n.kids.length && !n.open); (function all(n) { n.open = anyClosed || n.d < 1; n.kids.forEach(all); })(root); draw(); };
      }
      draw();
    });
  }

  // ---------- texte à trous ----------
  function screenCloze(id) {
    toolGate(id, "cloze", "Texte à trous", "Les phrases clés et les lois de ton cours, avec des mots à replacer. Touche une pastille pour remplir le trou suivant.", (data, ch, regen) => {
      // Leurres préparés par l'IA (« leurres » : mots de même nature que les bons) ; sinon, mots du chapitre qui ressemblent le plus.
      const items = (data.phrases || []).map(p => { const parts = String(typeof p === "string" ? p : (p && p.texte) || "").split(/\{\{(.+?)\}\}/); return { parts, words: parts.filter((_, k) => k % 2 === 1), lures: (p && Array.isArray(p.leurres) ? p.leurres : []).map(x => String(x).trim()).filter(Boolean) }; }).filter(x => x.words.length);
      if (!items.length) return emptyTool(id, "Texte à trous", "Aucune phrase à trous n'a pu être préparée pour ce cours.");
      const allWords = [...new Set(items.flatMap(x => x.words))]; let i = 0, good = 0, total = 0;
      function show() {
        const it = items[i], nLure = Math.min(3, Math.max(2, 5 - it.words.length)), lures = [];
        it.lures.forEach(w => { if (lures.length < nLure && !it.words.concat(lures).some(x => norm(x) === norm(w))) lures.push(w); });
        it.words.forEach((t, j) => { if (lures.length < nLure) lookalikes(t, allWords.filter(w => !it.words.concat(lures).some(x => norm(x) === norm(w))), Math.ceil((nLure - lures.length) / (it.words.length - j))).forEach(w => lures.push(w)); });
        const bank = shuffle([...it.words, ...lures.slice(0, nLure)]).map((w, k) => ({ w, k })), fill = it.words.map(() => null); let checked = false;
        function draw() {
          let b = -1;
          app.innerHTML = toolHead(id, "Texte à trous") + `<div class="bar"><i style="width:${i / items.length * 100}%"></i></div><div class="card pad stack"><span class="pill" style="align-self:flex-start">Phrase ${i + 1} sur ${items.length}</span>
            <p class="clozetxt">${it.parts.map((p, k) => { if (k % 2 === 0) return esc(p); b++; const f = fill[b], ok = checked && f && norm(f.w) === norm(it.words[b]); return `<button class="blank${f ? " full" : ""}${checked ? (ok ? " ok" : " ko") : ""}" data-b="${b}" ${checked ? "disabled" : ""} aria-label="Trou ${b + 1}${f ? " : " + esc(f.w) : ", vide"}">${f ? esc(f.w) : "&nbsp;"}</button>${checked && !ok ? ` <span class="fixw">${mx(it.words[b])}</span>` : ""}`; }).join("")}</p>
            ${checked ? "" : `<div class="chips bank">${bank.map(x => `<button class="chip pillw" data-w="${x.k}" ${fill.some(f => f && f.k === x.k) ? "disabled" : ""}>${mx(x.w)}</button>`).join("")}</div>`}
            <p class="fb" id="fb" role="status"></p><button class="btn" id="chk" ${!checked && fill.includes(null) ? "disabled" : ""}>${checked ? (i < items.length - 1 ? "Phrase suivante" : "Terminer") : "Vérifier"}</button></div>`;
          app.querySelectorAll("[data-w]").forEach(el => el.onclick = () => { const k = fill.indexOf(null); if (k < 0) return; fill[k] = bank.find(x => x.k === +el.dataset.w); draw(); });
          app.querySelectorAll("[data-b]").forEach(el => el.onclick = () => { fill[+el.dataset.b] = null; draw(); });
          $("chk").onclick = () => {
            if (checked) { i++; return i < items.length ? show() : end(); }
            checked = true; const n = fill.filter((f, k) => f && norm(f.w) === norm(it.words[k])).length; good += n; total += it.words.length; ping(n === it.words.length);
            if (n < it.words.length) logMistake(id, it.parts.map((p, k) => k % 2 ? "____" : p).join(""), it.words.join(", "), fill.map(f => f ? f.w : "").join(", "), "texte à trous");
            draw(); $("fb").className = "fb " + (n === it.words.length ? "ok" : "ko"); $("fb").textContent = n === it.words.length ? "Bon travail !" : "Pas encore. Les bons mots sont indiqués."; $("chk").focus();
          };
        }
        draw();
      }
      function end() { if (total && good === total) confetti("etoiles"); app.innerHTML = toolHead(id, "Texte à trous") + `<div class="card done"><h1>${good === total ? "Bon travail !" : "C'est fini"}</h1><div class="big">${good} / ${total}</div><p class="muted">mots bien placés.</p><button class="btn" id="again">Recommencer</button><a class="btn ghost" href="#chapitre-${id}">Retour au chapitre</a></div>${regenHtml}`; $("again").onclick = () => { i = 0; good = 0; total = 0; show(); }; wireRegen(regen); }
      show();
    });
  }

  // ---------- interro écrite : l'élève tape sa réponse, correction immédiate ----------
  // Nombre : comparé avec une tolérance ; mot et phrase : comparés sans accents ni casse, avec les variantes et une faute de frappe permise ;
  // justification (ou phrase non reconnue, sur demande) : corrigée par l'IA, 1 appel.
  function parseNum(t) {
    let x = String(t || "").replace(/\s| /g, "").replace(/\$/g, "").replace(/×|\\times|\*/g, "x").replace(/,/g, ".");
    x = x.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)").replace(/[{}]/g, "");
    const m = x.match(/^([-+]?\d*\.?\d+(?:e[-+]?\d+)?)(?:x10\^?\(?([-+]?\d+)\)?)?/i) || x.match(/^10\^\(?([-+]?\d+)\)?/);
    if (!m) { const f = x.match(/^\(?([-+]?\d*\.?\d+)\)?\/\(?([-+]?\d*\.?\d+)\)?/); return f && +f[2] ? +f[1] / +f[2] : NaN; }
    if (/^10\^/.test(x) && m.length === 2) return Math.pow(10, +m[1]);
    return parseFloat(m[1]) * (m[2] != null ? Math.pow(10, +m[2]) : 1);
  }
  function lev(a, b) { if (Math.abs(a.length - b.length) > 2) return 9; const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }
  const normW = t => norm(texPlain(t)).replace(/\b(le|la|les|l|un|une|des|du|de|d)\b/g, " ").replace(/\s+/g, " ").trim();
  function checkInterro(q, given) {
    const type = q.type || "phrase", want = [q.reponse].concat(q.variantes || []).filter(x => x != null && String(x).trim());
    if (type === "nombre") {
      const g = parseNum(given), tol = Math.max(0.001, Math.min(0.2, +q.tolerance || 0.01));
      return want.some(w => { const v = parseNum(w); return isFinite(v) && isFinite(g) && (v === 0 ? Math.abs(g) < 1e-9 : Math.abs(g - v) / Math.abs(v) <= tol); }) ? "ok" : "ko";
    }
    const gn = normW(given); if (!gn) return "ko";
    if (want.some(w => { const wn = normW(w); return wn === gn || (wn.length >= 5 && lev(wn, gn) <= 1); })) return "ok";
    if (type === "mot") return want.some(w => gn.split(" ").includes(normW(w)) && normW(w).length >= 4) ? "ok" : "ko";
    // phrase : assez de mots importants de la réponse attendue → juste ; sinon l'IA peut trancher.
    const keys = normW(q.reponse).split(" ").filter(w => w.length >= 4), have = new Set(gn.split(" "));
    const hit = keys.filter(w => have.has(w) || [...have].some(h => h.length >= 5 && lev(h, w) <= 1)).length;
    return keys.length && hit / keys.length >= 0.75 ? "ok" : "ia";
  }
  function screenInterro(id) {
    toolGate(id, "interro", "Interro écrite", "Une interro comme sur feuille : une question à la fois, tu tapes ta réponse (un nombre, un mot, une phrase ou une justification) et Merge te corrige tout de suite.", (data, ch, regen) => {
      const qs = (data.questions || []).filter(q => q && q.q && q.reponse != null).map(q => Object.assign({}, q, { type: ["nombre", "mot", "phrase", "justification"].includes(q.type) ? q.type : "phrase" }));
      if (!qs.length) return emptyTool(id, "Interro écrite", "Aucune question n'a pu être préparée pour ce cours.");
      const T = "Interro écrite", R = qs.map(() => null); let i = 0;
      const LBL = { nombre: "Un nombre", mot: "Un mot", phrase: "Une phrase", justification: "Justifie" };
      const pts = r => r ? (r.points != null ? r.points : r.v === "ok" ? 2 : 0) : 0;
      function draw(focus) {
        const q = qs[i], r = R[i], long = q.type === "justification" || q.type === "phrase";
        const fb = !r ? "" : r.v === "wait" ? `<p class="fb" role="status">L'IA corrige ta réponse…</p>` : r.v === "ia" ? `<div class="fb">Merge n'est pas sûr. <button class="linkbtn" id="iaok">Faire corriger par l'IA (1 appel)</button> ou <button class="linkbtn" id="selfok">J'avais juste</button></div><p class="small muted">Réponse attendue : ${mx(q.reponse)}</p>`
          : `<div class="fb ${r.v === "ok" ? "ok" : "ko"}" role="status"><b>${r.v === "ok" ? "Juste" : r.points ? "En partie juste" : "Pas tout à fait"}</b>${r.points != null ? ` · ${String(r.points).replace(".", ",")} / 2` : ""}</div>${r.comment ? `<p>${mx(r.comment)}</p>` : ""}${r.v !== "ok" || q.type === "justification" ? `<div class="solution"><b>Correction</b><p>${mx(r.correction || q.reponse)}${q.unite && q.type === "nombre" ? " " + mx(q.unite) : ""}</p></div>` : ""}`;
        app.innerHTML = toolHead(id, T) + `<div class="bar"><i style="width:${i / qs.length * 100}%"></i></div><div class="card pad stack interro">
          <div class="row between"><span class="pill">Question ${i + 1} sur ${qs.length}</span><span class="small muted">${LBL[q.type]}</span></div>
          <p class="qtxt">${mx(q.q)}</p>
          <div class="field"><label for="ians">Ta réponse${q.type === "nombre" && q.unite ? " (en " + esc(texPlain(q.unite)) + ")" : ""}</label>${long ? `<textarea id="ians" style="min-height:${q.type === "justification" ? 150 : 80}px" maxlength="3000" ${r ? "disabled" : ""}>${esc(r ? r.given : "")}</textarea>` : `<input id="ians" ${q.type === "nombre" ? 'inputmode="decimal"' : ""} autocomplete="off" maxlength="200" value="${esc(r ? r.given : "")}" ${r ? "disabled" : ""}>`}</div>
          ${fb}
          <div class="row">${i > 0 ? `<button class="btn ghost" id="iprev">Précédente</button>` : ""}${r && r.v !== "wait" && r.v !== "ia" ? `<button class="btn grow" id="inext">${i < qs.length - 1 ? "Question suivante" : "Voir ma note"}</button>` : !r ? `<button class="btn grow" id="ichk">Valider</button>` : ""}</div>
          ${!r ? `<p class="note">${q.type === "justification" ? "Corrigée par l'IA : 1 appel." : q.type === "nombre" ? "Virgule ou point, puissances acceptées (ex. 1,5 ou 3x10^4)." : "Les accents et les majuscules ne comptent pas."}</p>` : ""}</div>${regenHtml}`;
        wireRegen(regen);
        const inp = $("ians"); if (inp && !r && focus !== false) inp.focus();
        if (inp && !r && !long) inp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); $("ichk").click(); } };
        if ($("iprev")) $("iprev").onclick = () => { i--; draw(false); };
        if ($("inext")) $("inext").onclick = () => { if (i < qs.length - 1) { i++; draw(); } else end(); };
        if ($("ichk")) $("ichk").onclick = () => { const g = inp.value.trim(); if (!g) return toast("Écris ta réponse."); if (q.type === "justification") return correct(g); const v = checkInterro(q, g); R[i] = { given: g, v }; if (v !== "ia") done(v === "ok"); draw(false); };
        if ($("iaok")) $("iaok").onclick = () => correct(R[i].given);
        if ($("selfok")) $("selfok").onclick = () => { R[i].v = "ok"; done(true); draw(false); };
      }
      function done(okay) { const q = qs[i]; ping(okay); if (!okay) logMistake(id, q.q, q.reponse, R[i].given, "interro écrite"); }
      async function correct(g) {
        const k = i, q = qs[k], here = location.hash; R[k] = { given: g, v: "wait" }; draw(false);
        try {
          let text = ""; try { text = await courseText(id); } catch (e) { text = ""; }
          const r = await ai({ action: "interro", text, question: q.q, attendu: q.reponse, donne: g }); const c = (r && r.content) || {};
          const p = Math.max(0, Math.min(2, Math.round((+c.points || 0) * 2) / 2));
          R[k] = { given: g, v: p >= 1.5 ? "ok" : "ko", points: p, comment: c.commentaire || "", correction: c.correction || q.reponse };
          if (k === i) done(p >= 1.5); else ping(p >= 1.5);
        } catch (e) { R[k] = null; if (location.hash === here) { draw(false); toast(e.code === "quota" ? QUOTA_MSG : (e.message || "Correction impossible.")); } return; }
        if (location.hash === here && k === i) draw(false);
      }
      function end() {
        const total = qs.reduce((a, q, k) => a + pts(R[k]), 0), sur = qs.length * 2, n20 = Math.round(total / sur * 40) / 2;
        app.innerHTML = toolHead(id, T) + `<div class="card done"><h1>${n20 >= 14 ? "Très bien !" : n20 >= 10 ? "C'est la moyenne" : "On s'accroche"}</h1><div class="big">${String(n20).replace(".", ",")} / 20</div><p class="muted">${plural(R.filter(r => r && r.v === "ok").length, "réponse juste", "réponses justes")} sur ${qs.length}.</p>
          <div class="stack" style="text-align:left;width:100%">${qs.map((q, k) => `<details class="card pad"><summary><b>${R[k] && R[k].v === "ok" ? "Juste" : "À revoir"}</b> · ${mx(q.q)}</summary><p class="small">Ta réponse : ${esc(R[k] ? R[k].given : "(aucune)")}</p><p class="small">Attendu : ${mx(q.reponse)}</p></details>`).join("")}</div>
          <button class="btn" id="again">Recommencer</button><a class="btn ghost" href="#chapitre-${id}">Retour au chapitre</a></div>${regenHtml}`;
        if (n20 >= 14) confetti();
        $("again").onclick = () => { R.fill(null); i = 0; draw(); }; wireRegen(regen);
      }
      draw();
    });
  }

  // ---------- fiche de synthèse haute densité (1 page A4) ----------
  function screenSynth(id) {
    toolGate(id, "fiche", "Fiche de synthèse", "Une fiche très dense qui tient sur une page A4 : l'essentiel, les définitions, les formules, les pièges et des astuces pour retenir. Prête à imprimer.", (f, ch, regen) => {
      const s = state.subjects.find(x => x.id === ch.subject_id) || { name: "", color: "#4b39c8" };
      const box = (t, inner, cls, ic) => inner ? `<section class="${cls || ""}"><h2>${ic ? `<span class="sic">${ic}</span>` : ""}${t}</h2>${inner}</section>` : "";
      const nb = (f.essentiel || []).length, nd = (f.definitions || []).length, nf = (f.formules || []).length, done = mastery(cardsOf(id));
      app.innerHTML = `<div class="row between noprint"><a class="iconbtn" href="#chapitre-${id}" aria-label="Retour au chapitre">${I.back}</a><button class="btn sm" id="print">${I.print}Imprimer ou enregistrer en PDF</button></div>
        <div class="a4wrap"><article class="a4 synth" style="--c:${esc(s.color)}"><header class="sband"><div><span class="ssub">${esc(s.name)}</span><h1>${esc(ch.name)}</h1></div><div class="sbadges"><span>${nb} idées clés</span><span>${nd} définitions</span>${nf ? `<span>${nf} formules</span>` : ""}<span>Maîtrise ${done} %</span></div><span class="slogo">Merge<b>.</b></span></header>
          ${box("L'essentiel", nb ? `<ol class="kp">${f.essentiel.map(x => `<li>${mx(x)}</li>`).join("")}</ol>` : "", "wide key", I.bolt)}
          ${box("Définitions", nd ? `<div class="defs">${f.definitions.map(d => `<div class="def"><b>${mx(d.terme)}</b><span>${mx(d.definition)}</span></div>`).join("")}</div>` : "", "wide", I.book)}
          ${box("Formules et lois", nf ? `<div class="fgrid">${f.formules.map(d => `<div class="fcard"><span>${mx(d.nom)}</span><b>${mx(d.formule)}</b></div>`).join("")}</div>` : "", "wide formbox", I.spark)}
          ${box("Pièges à éviter", (f.pieges || []).length ? `<ul>${li(f.pieges)}</ul>` : "", "warn", I.trap)}
          ${box("Pour retenir", (f.mnemos || []).length ? `<div class="postits">${f.mnemos.map(x => `<p class="postit">${mx(x)}</p>`).join("")}</div>` : "", "memo", I.bulb)}
          <footer class="sfoot"><span>Relis cette fiche demain, puis dans 3 jours, puis dans une semaine.</span><span class="boxes">${["J+1", "J+3", "J+7", "J+14"].map(x => `<i>${x}</i>`).join("")}</span></footer>
        </article></div>${regenHtml}`;
      $("print").onclick = () => { fitA4(app.querySelector(".synth")); printDoc(app.querySelector(".a4wrap"), "Fiche de synthèse " + ch.name); }; wireRegen(regen);
    });
  }
  // Réduit la taille du texte jusqu'à ce que la fiche tienne sur une page A4 (281 mm utiles).
  // Imprimer. Dans l'appli installée sur l'écran d'accueil d'un iPhone, Safari ignore window.print() : on fabrique alors
  // un PDF (mise en page d'impression, A4, marges de 8 mm) et on ouvre le menu Partager, qui contient « Imprimer ».
  // Bibliothèques (html2canvas, jsPDF) chargées seulement à ce moment-là.
  const iosApp = () => (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) && (navigator.standalone === true || matchMedia("(display-mode: standalone)").matches);
  async function printDoc(root, name) {
    if (!root) return;
    if (!iosApp() && !window.__mergeForcePdf) return window.print();
    sheet(`<h1>Imprimer</h1><div class="row" id="pdfwait"><div class="spin" aria-hidden="true"></div><p class="muted" role="status">Merge prépare le PDF…</p></div><div class="stack" id="pdfready" hidden><p class="muted">Ton PDF est prêt. Dans le menu qui s'ouvre, choisis « Imprimer » ou « Enregistrer dans Fichiers ».</p><button class="btn" id="pdfshare">${I.print}Imprimer ou partager le PDF</button><a class="btn ghost" id="pdfopen" target="_blank" rel="noopener">Ouvrir le PDF</a></div><p class="err" id="pdferr" hidden></p><button class="btn ghost" data-close>Fermer</button>`);
    let ifr = null;
    try {
      await Promise.all([needLib("vendor/html2canvas-pro.min.js", () => !!window.html2canvas), needLib("vendor/jspdf.umd.min.js", () => !!(window.jspdf && window.jspdf.jsPDF))]);
      const css = (await (await fetch("css/app.css")).text()).replace(/@media\s+print/g, "@media all");
      ifr = document.createElement("iframe"); ifr.setAttribute("aria-hidden", "true"); ifr.tabIndex = -1;
      ifr.style.cssText = "position:fixed;left:-10000px;top:0;width:733px;height:1060px;border:0"; // 194 mm de large : A4 moins les marges
      document.body.appendChild(ifr);
      const d = ifr.contentDocument, rs = document.documentElement.getAttribute("style") || "";
      d.open(); d.write(`<!DOCTYPE html><html lang="fr" data-theme="light" style="${esc(rs)}"><head><meta charset="utf-8"><base href="${esc(location.href.split("#")[0])}"><link rel="stylesheet" href="vendor/katex/katex.min.css"><style>${css}</style><style>html,body{background:#fff!important;margin:0;padding:0!important}body::before,body::after,html::after{display:none!important}.noprint{display:none!important}*{animation:none!important;transition:none!important}</style></head><body><div class="app">${root.outerHTML}</div></body></html>`); d.close();
      await new Promise(r => { if (d.readyState === "complete") r(); else ifr.onload = r; setTimeout(r, 3000); });
      try { await d.fonts.ready; } catch (e) { /* polices système */ }
      await Promise.all([...d.images].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; setTimeout(r, 4000); })));
      const pdf = new window.jspdf.jsPDF({ unit: "mm", format: "a4" }), W = 194, H = 281;
      const pages = [...d.querySelectorAll(".a4")]; let first = true;
      const add = (cv, sy, sh) => { const c = document.createElement("canvas"); c.width = cv.width; c.height = sh; c.getContext("2d").fillStyle = "#fff"; c.getContext("2d").fillRect(0, 0, c.width, c.height); c.getContext("2d").drawImage(cv, 0, sy, cv.width, sh, 0, 0, cv.width, sh); let w = W, h = sh * W / cv.width; if (h > H) { w = w * H / h; h = H; } if (!first) pdf.addPage(); first = false; pdf.addImage(c.toDataURL("image/jpeg", 0.92), "JPEG", 8 + (W - w) / 2, 8, w, h); };
      const shot = el => window.html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false, windowWidth: 733 });
      if (pages.length) for (const pg of pages) { const cv = await shot(pg); add(cv, 0, cv.height); }
      else { const cv = await shot(d.querySelector(".app")), ph = Math.floor(cv.width * H / W); for (let y = 0; y < cv.height; y += ph) add(cv, y, Math.min(ph, cv.height - y)); }
      const blob = pdf.output("blob"), file = new File([blob], (name || "Merge").replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 80) + ".pdf", { type: "application/pdf" }), url = URL.createObjectURL(blob);
      window.__mergeLastPdf = { size: blob.size, pages: pdf.getNumberOfPages(), name: file.name, url };
      if (!$("pdfready")) return;
      $("pdfwait").hidden = true; $("pdfready").hidden = false; $("pdfopen").href = url; $("pdfopen").download = file.name;
      $("pdfshare").hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
      $("pdfshare").onclick = () => navigator.share({ files: [file], title: file.name }).catch(e => { if (e && e.name !== "AbortError") toast("Partage impossible : ouvre le PDF à la place."); });
    } catch (e) { console.error(e); if ($("pdferr")) { $("pdfwait").hidden = true; $("pdferr").hidden = false; $("pdferr").textContent = "Le PDF n'a pas pu être préparé. Vérifie ta connexion et réessaie."; } }
    finally { if (ifr) ifr.remove(); }
  }
  function fitA4(el) {
    if (!el) return; const maxH = 281 * 96 / 25.4 - 4; el.classList.add("fit");
    let pt = 9.5; el.style.setProperty("--pfs", pt + "pt");
    while (el.scrollHeight > maxH && pt > 6) { pt -= 0.25; el.style.setProperty("--pfs", pt + "pt"); }
    el.classList.remove("fit");
  }
  window.addEventListener("beforeprint", () => { const el = document.querySelector(".synth"); if (el && !el.style.getPropertyValue("--pfs")) fitA4(el); });

  // ---------- planche de flashcards A4 à imprimer ----------
  async function screenPrintCards(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const cards = cardsOf(id); let mode = "rv";
    if (!cards.length) return emptyTool(id, "Planche de cartes", "Il faut au moins une carte dans ce chapitre.");
    const size = t => t.length > 220 ? "xs" : t.length > 120 ? "s" : t.length > 60 ? "m" : "l";
    const cell = (t, cls, n) => `<div class="pc ${cls} ${size(String(t))}"><span class="pcn">${n}</span><p>${esc(t)}</p></div>`;
    function draw() {
      const pages = [];
      if (mode === "rv") for (let k = 0; k < cards.length; k += 8) {
        const g = cards.slice(k, k + 8); while (g.length < 8) g.push(null);
        pages.push(`<section class="a4 planche"><div class="pgrid">${g.map((c, n) => c ? cell(c.front, "q", k + n + 1) : '<div class="pc void"></div>').join("")}</div><footer>${esc(ch.name)} · questions · page ${k / 8 + 1}, recto</footer></section>`);
        const back = []; for (let r = 0; r < 8; r += 2) back.push(g[r + 1], g[r]);
        pages.push(`<section class="a4 planche"><div class="pgrid">${back.map((c) => c ? cell(c.back, "a", cards.indexOf(c) + 1) : '<div class="pc void"></div>').join("")}</div><footer>${esc(ch.name)} · réponses · page ${k / 8 + 1}, verso</footer></section>`);
      }
      else for (let k = 0; k < cards.length; k += 4) {
        const g = cards.slice(k, k + 4);
        pages.push(`<section class="a4 planche fold"><div class="pgrid">${g.map((c, n) => cell(c.front, "q", k + n + 1) + cell(c.back, "a", k + n + 1)).join("")}</div><footer>${esc(ch.name)} · plie le long du trait central, puis découpe</footer></section>`);
      }
      app.innerHTML = `<div class="row between noprint"><a class="iconbtn" href="#chapitre-${id}" aria-label="Retour au chapitre">${I.back}</a><button class="btn sm" id="print">${I.print}Imprimer</button></div>
        <div class="stack noprint"><h1>Planche de cartes</h1><div class="chips"><button class="chip" data-pm="rv" aria-pressed="${mode === "rv"}">Recto verso (8 cartes par feuille)</button><button class="chip" data-pm="pli" aria-pressed="${mode === "pli"}">À plier (4 cartes par feuille)</button></div>
          <p class="note">${mode === "rv" ? "Imprime en recto verso, retournement sur le bord long, sur du papier bristol. Les réponses tombent au dos des questions. Découpe le long des pointillés." : "Imprime en recto simple. Plie chaque feuille le long du trait central, colle, puis découpe le long des pointillés."} ${plural(cards.length, "carte", "cartes")}, ${plural(pages.length, "page", "pages")}.</p></div>
        <div class="a4wrap">${pages.join("")}</div>`;
      $("print").onclick = () => printDoc(app.querySelector(".a4wrap"), "Planche de cartes " + ch.name);
      app.querySelectorAll("[data-pm]").forEach(b => b.onclick = () => { mode = b.dataset.pm; draw(); });
    }
    draw();
  }

  // ---------- carnet d'erreurs et « Pourquoi ? » ----------
  async function screenMistakes(chId) {
    const ch = chId ? state.chapters.find(c => c.id === chId) : null; if (chId && !ch) { location.hash = "#accueil"; return; }
    if (ch) tabs.hidden = true; else drawTabs("progres");
    const head = ch ? toolHead(chId, "Carnet d'erreurs") : `<div class="row"><a class="iconbtn" href="#progres" aria-label="Retour">${I.back}</a><h1>Carnet d'erreurs</h1></div>`, here = location.hash;
    app.innerHTML = head + '<p class="muted">Chargement…</p>';
    let rows = [];
    try { if (!state.offline) { let q = sb.from("mistakes").select("*").eq("user_id", state.user.id); if (chId) q = q.eq("chapter_id", chId); const r = await q.order("updated_at", { ascending: false }).limit(200); if (!r.error) rows = r.data || []; } } catch (e) { /* carnet local seulement */ }
    rows = rows.concat(localMistakes().filter(m => !chId || m.chapter_id === chId)).filter(m => state.chapters.some(c => c.id === m.chapter_id));
    if (location.hash !== here) return;
    const patch = async (m, o) => { Object.assign(m, o); if (String(m.id).startsWith("local-")) { const l = localMistakes(), x = l.find(y => y.id === m.id); if (x) { Object.assign(x, o); safeSet(errKey(), JSON.stringify(l)); } } else await sb.from("mistakes").update(o).eq("id", m.id); };
    function draw() {
      app.innerHTML = head + (ch ? `<h1>${mx(ch.name)}</h1>` : "") + `<p class="muted">${rows.length ? plural(rows.length, "erreur gardée", "erreurs gardées") + ". Touche « Pourquoi ? » pour comprendre, puis retire l'erreur quand c'est acquis." : "Aucune erreur pour l'instant. Tes réponses fausses (cartes, quiz, jeux) viendront se ranger ici."}</p>
        <div class="stack" id="ml">${rows.map((m, k) => { const c = state.chapters.find(x => x.id === m.chapter_id); return `<div class="card pad stack mistake" data-k="${k}"><div class="row between"><span class="small muted">${mx(c ? c.name : "")} · ${mx(m.mode || "")}</span>${(m.times || 1) > 1 ? `<span class="pill warn">Ratée ${m.times} fois</span>` : ""}</div><b>${mx(m.question)}</b>${m.given ? `<p class="given"><span class="label">Ta réponse</span>${mx(m.given)}</p>` : ""}<p class="expected">${mx(m.expected)}</p><div class="why">${m.explanation ? `<div class="md">${md(m.explanation)}</div>` : ""}</div><div class="row" style="flex-wrap:wrap">${m.explanation ? "" : `<button class="btn sm" data-why="${k}">Pourquoi ?</button>`}<button class="btn sm ghost" data-rm="${k}">J'ai compris, retirer</button></div></div>`; }).join("")}</div>`;
      app.querySelectorAll("[data-why]").forEach(b => b.onclick = async () => {
        const m = rows[+b.dataset.why], box = b.closest(".mistake").querySelector(".why"); b.disabled = true; box.innerHTML = '<p class="muted" role="status">Merge prépare l\'explication…</p>';
        try { let text = ""; try { text = await courseText(m.chapter_id); } catch (e) { text = ""; }
          const r = await ai({ action: "pourquoi", text, question: m.question, attendu: m.expected, donne: m.given || "" }); await patch(m, { explanation: r.answer || "" });
          if (box.isConnected) { box.innerHTML = `<div class="md">${md(m.explanation)}</div>`; b.remove(); }
        } catch (e) { if (box.isConnected) { showErr(box, e); box.className = "why"; b.disabled = false; } }
      });
      app.querySelectorAll("[data-rm]").forEach(b => b.onclick = async () => {
        const m = rows[+b.dataset.rm];
        if (String(m.id).startsWith("local-")) safeSet(errKey(), JSON.stringify(localMistakes().filter(x => x.id !== m.id))); else { const r = await sb.from("mistakes").delete().eq("id", m.id); if (r.error) return fail(r.error, "Erreur non retirée"); }
        rows.splice(rows.indexOf(m), 1); draw();
      });
    }
    draw();
  }

