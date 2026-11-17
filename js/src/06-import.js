  // ---------- import ----------
  // ---------- import en tâche de fond : progression, estimation, notification ----------
  const IMPORTS = {};
  const STAGES = [["read", "Lecture et envoi", 0, 10], ["img", "Photos et schémas", 10, 60], ["gen", "Résumé et cartes", 60, 92], ["save", "Enregistrement", 92, 100]];
  function impProg(d, stage, frac) { const s = STAGES.find(x => x[0] === stage); d.stage = stage; d.target = Math.max(d.target || 0, s[2] + (s[3] - s[2]) * Math.max(0, Math.min(1, frac || 0))); }
  // Estimation du temps restant, d'après ce que fait vraiment le serveur (et non une simple règle de trois sur le %).
  // Photos : traitées par lots de 4, jusqu'à 5 lots en même temps ; un lot de cahier écrit à la main ≈ 95 s
  // (lecture + relecture + déchiffrage), une page imprimée va plus vite. Dès qu'un lot est fini, on prend son vrai temps.
  // Puis résumé et cartes ≈ 45 s, enregistrement ≈ 5 s.
  const ROUND_S = 95, GEN_S = 45, SAVE_S = 5;
  function impEstimate(d) {
    if (d.local || !d.busy) return;
    const now = Date.now(), m = /lus\s*:\s*(\d+)\s*sur\s*(\d+)/.exec(d.msg || "");
    let left = 0;
    if (d.stage === "img") {
      const done = m ? +m[1] : 0, total = m ? +m[2] : d.photos || 4;
      // Appli rouverte en plein milieu : on ne sait pas quand le lot a commencé, on garde l'estimation par défaut.
      if (!d.imgStart) { d.imgStart = now; d.imgDone = done; if (done) d.roundAt = now; }
      if (done > (d.imgDone || 0)) { if (!d.imgDone && !d.roundAt) d.roundS = Math.min(240, Math.max(25, (now - d.imgStart) / 1000)); d.imgDone = done; d.roundAt = now; }
      const per = d.roundS || ROUND_S, rounds = Math.ceil(Math.max(0, total - done) / 20);
      // Le lot en cours a déjà commencé : on retire le temps déjà passé dessus.
      const since = (now - (d.roundAt || d.imgStart)) / 1000;
      left = Math.max(rounds ? per * 0.25 : 0, rounds * per - (rounds ? since : 0)) + GEN_S + SAVE_S;
    } else if (d.stage === "gen") left = GEN_S + SAVE_S;
    else if (d.stage === "save") left = SAVE_S;
    else return;
    const at = now + left * 1000;
    // On ne fait pas sauter l'estimation à chaque relevé : seulement si elle change de plus de 15 s.
    if (!d.etaAt || Math.abs(at - d.etaAt) > 15000) d.etaAt = at;
  }
  function impEta(d) {
    if (d.etaAt && !d.local) {
      const r = (d.etaAt - Date.now()) / 1000;
      if (r < 8) return "presque fini…";
      const n = r < 60 ? Math.round(r / 5) * 5 : Math.round(r / 30) * 30;
      return "environ " + (n < 60 ? n + " s" : (n / 60).toString().replace(".", ",") + " min") + " restantes";
    }
    const el = (Date.now() - d.t0) / 1000; if ((d.shown || 0) < 8 || el < 4) return "estimation en cours…";
    const r = Math.max(3, el * (100 - d.shown) / d.shown), n = r < 60 ? Math.max(5, Math.round(r / 5) * 5) : Math.round(r / 30) * 30;
    return "environ " + (n < 60 ? n + " s" : (n / 60).toString().replace(".", ",") + " min") + " restantes";
  }
  function impBusyHtml(d, name) {
    const idx = STAGES.findIndex(x => x[0] === d.stage);
    return `<div class="center prog"><h1>Je prépare « ${esc(name)} »</h1>
      <div class="bar big"><i id="progbar" style="width:${(d.shown || 0).toFixed(1)}%"></i></div>
      <div class="row between small muted"><b id="progpct">${Math.round(d.shown || 0)} %</b><span id="progeta">${impEta(d)}</span></div>
      <ol class="steps">${STAGES.map((x, i) => `<li class="${i < idx ? "done" : i === idx ? "now" : ""}">${x[1]}</li>`).join("")}</ol>
      <p id="status" class="note" role="status">${esc(d.msg || "")}</p>
      <div class="card pad backsoon">${d.local ? `<b>Lecture de tes fichiers sur cet appareil</b><p class="small muted">Garde cet onglet ouvert encore quelques secondes, le temps d'envoyer ton cours. Ensuite tu pourras fermer Merge.</p>` : `<b>Tu peux fermer Merge.</b><p class="small muted">L'import continue sur nos serveurs, même si tu quittes la page ou verrouilles ton téléphone. ${pushOn ? "Nous t'envoyons une notification automatiquement dès que ton cours est prêt." : "Active les notifications pour être prévenu automatiquement dès que ton cours est prêt."}</p>`}${!pushOn && "Notification" in window && Notification.permission !== "denied" ? '<button class="btn sm ghost" id="askn">Me prévenir par notification</button>' : ""}</div>
      <a class="btn ghost" href="#accueil">Continuer à naviguer</a></div>`;
  }
  function impPaint(d) {
    const b = $("progbar"); if (b) {
      b.style.width = (d.shown || 0).toFixed(1) + "%"; $("progpct").textContent = Math.round(d.shown || 0) + " %"; $("progeta").textContent = impEta(d);
      const st = $("status"); if (st) st.textContent = d.msg || "";
      const idx = STAGES.findIndex(x => x[0] === d.stage); document.querySelectorAll(".steps li").forEach((li, i) => { li.className = i < idx ? "done" : i === idx ? "now" : ""; });
    }
    chipUpdate();
  }
  function impTimer(d) {
    clearInterval(d.timer);
    d.timer = setInterval(() => {
      const s = STAGES.find(x => x[0] === d.stage) || STAGES[0];
      if (d.shown < d.target) d.shown += Math.max(0.3, (d.target - d.shown) * 0.2); else if (d.shown < s[3] - 1) d.shown += Math.max(0.02, (s[3] - 1 - d.shown) * 0.012);
      impPaint(d);
    }, 250);
  }
  // Abonnement aux notifications de cet appareil : le serveur prévient quand un import est fini, même appli fermée.
  let pushOn = false;
  async function ensurePush(askUser) {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window) || Notification.permission === "denied") return false;
      if (Notification.permission !== "granted") { if (!askUser || (await Notification.requestPermission()) !== "granted") return false; }
      const reg = await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(() => r(null), 4000))]); if (!reg) return false;
      const raw = atob(C.VAPID_PUBLIC_KEY.replace(/-/g, "+").replace(/_/g, "/") + "="), key = Uint8Array.from(raw, ch => ch.charCodeAt(0));
      const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }), j = sub.toJSON();
      const { error } = await sb.from("push_subscriptions").upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris" });
      pushOn = !error; return pushOn;
    } catch (e) { return false; }
  }
  const newImp = (ch) => ({ tab: "files", files: [], shots: [], text: "", n: ch && cardsOf(ch.id).length ? 20 : (ch && ch.cards_target) || C.CARTES_PAR_DEFAUT, busy: false, cache: {} });
  // Nombre de cartes choisi par l'IA (activé par défaut) : autant que nécessaire pour couvrir tout le cours, 100 au plus.
  const autoN = () => safeGet("merge.autoN") !== "0";
  const onImport = (chId) => location.hash === "#import-" + chId;
  function jobDoneHtml(chId, res) {
    const ch = state.chapters.find(c => c.id === chId) || { name: "" }, notes = (res.notes || []).slice();
    if (res.bad) notes.push(plural(res.bad, "carte est marquée", "cartes sont marquées") + " « À vérifier ».");
    return `<div class="card done"><h1>Bon travail !</h1><p class="muted">${(() => { const tot = cardsOf(chId).length, n = res.cards || 0; return tot > n && n === 0 ? "Rien de nouveau à ajouter : ce que tu as envoyé était déjà dans « " + esc(ch.name) + " » (" + plural(tot, "carte", "cartes") + "). Aucune carte en double n'a été créée." : tot > n ? plural(n, "nouvelle carte ajoutée", "nouvelles cartes ajoutées") + " à « " + esc(ch.name) + " » : " + tot + " cartes au total, et le résumé est complété." : plural(n, "carte créée", "cartes créées") + " et un résumé pour « " + esc(ch.name) + " »."; })()}</p>${notes.map(n => `<p class="note">${esc(n)}</p>`).join("")}<a class="btn" href="#cartes-${chId}">Réviser maintenant</a><a class="btn ghost" href="#chapitre-${chId}">Voir le chapitre</a></div>`;
  }
  async function applyJob(chId, j, quiet) {
    const d = IMPORTS[chId]; if (!d || d.jobId !== j.id) return;
    const stale = j.status === "running" && Date.now() - Date.parse(j.updated_at) > 200000;
    // Import qui n'avance plus (étape coupée côté serveur) : on le relance tout seul, sans afficher d'erreur (2 fois au plus).
    if (stale && (d.autoRes || 0) < 2) {
      d.autoRes = (d.autoRes || 0) + 1; d.msg = "Reprise de l'import…"; impPaint(d);
      try { await ai({ action: "import_resume", job_id: d.jobId }, "studio"); return; } catch (e) { /* on affiche l'arrêt ci-dessous */ }
    }
    if (j.status === "running" && !stale) { d.stage = STAGES.some(x => x[0] === j.stage) ? j.stage : "gen"; d.target = Math.max(d.target || 0, j.progress || 0); d.msg = j.message || d.msg; impEstimate(d); return impPaint(d); }
    clearTimeout(d.poll); d.pollTok = null; clearInterval(d.timer); d.busy = false; d.local = false;
    if (j.status === "done") {
      d.shown = 100; d.ready = true; d.files = []; d.cache = {}; delete courseMemo[chId];
      try { await loadAll(); } catch (e) { /* les cartes arriveront au prochain chargement */ }
      d.doneHtml = jobDoneHtml(chId, j.result || {}); safeSet("merge.jobseen." + j.id, "1");
      const ch = state.chapters.find(c => c.id === chId);
      if (!quiet && !pushOn) impNotify("Merge.", "« " + (ch ? ch.name : "Ton cours") + " » est prêt : " + plural((j.result || {}).cards || 0, "carte créée", "cartes créées") + ".");
      if (onImport(chId)) screenImport(chId); else { if (!quiet) toast("« " + (ch ? ch.name : "Ton cours") + " » est prêt."); chipUpdate(); }
      return;
    }
    const e = new Error(stale ? "L'import s'est interrompu en route. Tu peux le reprendre : ce qui a déjà été lu est gardé." : j.error_code === "quota" ? QUOTA_MSG : (j.error || "L'import s'est arrêté.")); e.code = stale ? "stale" : j.error_code;
    d.failed = e; d.canResume = true;
    if (onImport(chId)) screenImport(chId); else chipUpdate();
  }
  function watchJob(chId) {
    const d = IMPORTS[chId]; clearTimeout(d.poll); let miss = 0, n = 0; const tok = d.pollTok = {};
    const tick = async () => {
      if (d.pollTok !== tok || !d.busy) return;
      const r = await sb.from("import_jobs").select("id,status,stage,progress,message,error,error_code,result,updated_at").eq("id", d.jobId).maybeSingle();
      if (d.pollTok !== tok) return;
      if (r.error || !r.data) { if (++miss > 40) { clearInterval(d.timer); d.busy = false; d.failed = new Error("Je n'arrive plus à suivre l'import. Il continue peut-être : recharge la page dans une minute."); if (onImport(chId)) screenImport(chId); else chipUpdate(); return; } }
      else { miss = 0; await applyJob(chId, r.data); }
      if (d.busy) d.poll = setTimeout(tick, ++n < 4 ? 700 : 1500);
    };
    d.poll = setTimeout(tick, 500);
  }
  // Au démarrage : retrouve les imports lancés avant de quitter (en cours, finis sans avoir été vus, ou arrêtés).
  async function resumeJobs() {
    try {
      ensurePush(false);
      const r = await sb.from("import_jobs").select("id,chapter_id,status,stage,progress,message,error,error_code,result,updated_at,created_at").eq("user_id", state.user.id).order("created_at", { ascending: false }).limit(6);
      for (const j of (r.data || [])) {
        const ch = state.chapters.find(c => c.id === j.chapter_id);
        if (!ch || IMPORTS[j.chapter_id] || (j.status !== "running" && safeGet("merge.jobseen." + j.id)) || Date.now() - Date.parse(j.created_at) > 3 * 86400000) continue;
        const d = IMPORTS[j.chapter_id] = newImp(ch); d.jobId = j.id; d.t0 = Date.parse(j.created_at); d.shown = j.progress || 0; d.target = d.shown; d.stage = "gen"; d.msg = j.message || "";
        if (j.status === "running") { d.busy = true; impTimer(d); watchJob(j.chapter_id); }
        await applyJob(j.chapter_id, j, true);
      }
      chipUpdate();
    } catch (e) { /* base sans la table des imports : rien à reprendre */ }
  }
  function chipUpdate() {
    let chip = document.getElementById("jobchip");
    // Un cours prêt ou un import arrêté passe avant les imports en cours (c'est ce qu'il faut ouvrir).
    const all = Object.entries(IMPORTS).filter(([k]) => location.hash !== "#import-" + k), hit = all.find(([, v]) => v.ready || v.failed) || all.find(([, v]) => v.busy), here = false;
    if (!hit || here) { if (chip) chip.hidden = true; return; }
    if (!chip) { chip = document.createElement("a"); chip.id = "jobchip"; chip.className = "jobchip"; document.body.appendChild(chip); }
    const [k, v] = hit; chip.hidden = false; chip.href = "#import-" + k;
    chip.classList.toggle("ok", !!v.ready); chip.classList.toggle("ko", !!v.failed);
    // Plusieurs imports en même temps (un par chapitre) : la pastille les compte et montre leur avancement moyen.
    const busy = Object.values(IMPORTS).filter(x => x.busy);
    chip.innerHTML = v.ready ? "Cours prêt · Ouvrir" : v.failed ? "Import interrompu · Voir" : busy.length > 1 ? `<span class="spin"></span>${busy.length} imports · ${Math.round(busy.reduce((a, x) => a + (x.shown || 0), 0) / busy.length)} %` : `<span class="spin"></span>Import ${Math.round(v.shown || 0)} %`;
  }
  function impNotify(title, body) {
    try {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(r => r.showNotification(title, { body, icon: "icons/icon.svg", tag: "merge-import" })).catch(() => new Notification(title, { body }));
      else new Notification(title, { body });
    } catch (e) { /* notification non disponible */ }
  }
  window.addEventListener("beforeunload", e => { if (Object.values(IMPORTS).some(v => v.busy && v.local)) { e.preventDefault(); e.returnValue = ""; } });
  window.addEventListener("hashchange", () => chipUpdate());

  // Lecture des fichiers de cours, partagée par l'import et le Prof (17 nov.) : PDF, PowerPoint (pptx, ppt), Word, LibreOffice,
  // texte, RTF et photos (HEIC compris). d = état de l'écran qui lit (progression), say = message de progression.
  function fileReaders(d, say) {
    async function imageToJpeg(file, scan) {
      let bmp;
      try { bmp = await createImageBitmap(file); }
      catch (e) {
        try {
          if (!window.heic2any) await new Promise((ok, ko) => { const sc = document.createElement("script"); sc.src = "vendor/heic2any.min.js"; sc.onload = ok; sc.onerror = ko; document.head.appendChild(sc); });
          const out = await window.heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 }); bmp = await createImageBitmap(Array.isArray(out) ? out[0] : out);
        } catch (e2) { throw new Error("Impossible de lire l'image « " + file.name + " ». Enregistre-la en JPEG ou en PNG puis réessaie."); }
      }
      if (scan && safeGet("merge.redresse") !== "0") { try { const fixed = scanPage(bmp); if (fixed) { bmp = fixed; d.scanned = (d.scanned || 0) + 1; } } catch (e) { /* photo gardée telle quelle */ } }
      const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height)), cv = document.createElement("canvas");
      cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k); cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
      return cv.toDataURL("image/jpeg", 0.8).split(",")[1];
    }
    // PDF lu page par page : texte seul = lu ici gratuitement ; scan, photo, schéma ou tableau = envoyé à l'IA.
    async function readPdf(file, segs, budget) {
      await needPdf(); const lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";
      const doc = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
      for (let i = 1; i <= doc.numPages; i++) {
        if (budget.pages >= (budget.max || C.PAGES_MAX_PAR_IMPORT)) { budget.cut = true; break; }
        budget.pages++; say("Lecture de « " + file.name + " » : page " + i + " sur " + doc.numPages + "…"); impProg(d, "read", 0.6 * ((d.fi || 0) + i / doc.numPages) / (d.fn || 1));
        const page = await doc.getPage(i);
        const txt = (await page.getTextContent()).items.map(t => t.str).join(" ").replace(/\s+/g, " ").trim();
        const ops = await page.getOperatorList(), O = lib.OPS;
        const hasImg = ops.fnArray.some(f => f === O.paintImageXObject || f === O.paintInlineImageXObject || f === O.paintJpegXObject);
        const paths = ops.fnArray.filter(f => f === O.constructPath).length;
        // Page sans image ni dessin : son texte est complet, on le garde tel quel. Sinon la page entière part en image pour ne rien perdre.
        if (!hasImg && paths < 60) { if (txt) segs.push({ text: txt }); continue; }
        const vp0 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: Math.min(2, 1400 / vp0.width) }), cv = document.createElement("canvas");
        cv.width = vp.width; cv.height = vp.height; await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
        segs.push({ img: cv.toDataURL("image/jpeg", 0.8).split(",")[1] });
      }
    }
    // ----- documents bureautiques : tout est converti en texte sur l'appareil, les images intégrées partent à l'IA -----
    const unxml = t => t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, "&");
    const tidy = t => t.replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    // XML d'Office (pptx, docx) : un paragraphe par ligne, texte dans les balises <x:t>.
    const ooText = (xml, ns) => tidy(unxml((xml.match(new RegExp("<" + ns + ":p[ >][\\s\\S]*?</" + ns + ":p>", "g")) || []).map(p => p.replace(new RegExp("<" + ns + ":(tab|br)[^>]*/>", "g"), " ").replace(new RegExp("<" + ns + ":t[^>]*>([^<]*)</" + ns + ":t>|<[^>]+>", "g"), (m, t) => t || "")).join("\n")));
    // XML d'OpenDocument (LibreOffice : odp, odt).
    const odText = xml => tidy(unxml(xml.replace(/<text:(tab|s)[^>]*\/>/g, " ").replace(/<text:line-break\/>/g, "\n").replace(/<\/(text:p|text:h|table:table-row)>/g, "\n").replace(/<[^>]+>/g, "")));
    const IMG_EXT = /\.(png|jpe?g|gif|bmp|webp)$/i;
    // Images intégrées : on ignore les petites (icônes, puces, logos) et celles que le navigateur ne sait pas lire.
    async function zipImages(zip, names, out, budget) {
      for (const n of names) {
        const f = zip.files[n]; if (!f || !IMG_EXT.test(n)) continue;
        if (budget.pages >= (budget.max || C.PAGES_MAX_PAR_IMPORT)) { budget.cut = true; return; }
        try { const blob = await f.async("blob"); if (blob.size < 20000) continue; const ext = n.split(".").pop().toLowerCase(); out.push({ img: await imageToJpeg(new File([blob], n.split("/").pop(), { type: "image/" + (ext === "jpg" ? "jpeg" : ext) })) }); budget.pages++; }
        catch (e) { /* image illisible : ignorée */ }
      }
    }
    const num = n => parseInt((n.match(/(\d+)\.xml/) || [0, 0])[1], 10);
    // PowerPoint .pptx : texte de chaque diapositive, notes de l'orateur, images de la diapositive.
    async function readPptx(file, segs, budget) {
      const zip = await (await needZip(), window.JSZip).loadAsync(await file.arrayBuffer());
      const names = Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => num(a) - num(b));
      const rels = {}, uses = {};
      for (const n of names) {
        const r = zip.files[n.replace("slides/", "slides/_rels/") + ".rels"], x = r ? await r.async("string") : "";
        rels[n] = [...x.matchAll(/Target="([^"]+)"/g)].map(m => m[1]);
        rels[n].filter(t => /media\//.test(t)).forEach(t => { uses[t] = (uses[t] || 0) + 1; });
      }
      const seen = new Set();
      for (const n of names) {
        let t = ooText(await zip.files[n].async("string"), "a");
        const note = rels[n].find(x => /notesSlide/.test(x)), nf = note && zip.files["ppt/notesSlides/" + note.split("/").pop()];
        if (nf) { const nt = ooText(await nf.async("string"), "a").replace(/^\d+$/gm, "").trim(); if (nt) t += "\nNotes : " + nt; }
        if (t.trim()) segs.push({ text: t.trim() });
        // Une image reprise sur plus de 3 diapositives est un décor du modèle, pas du cours.
        const imgs = rels[n].filter(x => /media\//.test(x) && uses[x] <= 3 && !seen.has(x)); imgs.forEach(x => seen.add(x));
        await zipImages(zip, imgs.map(x => "ppt/media/" + x.split("/").pop()), segs, budget);
      }
      if (!names.length) throw new Error("« " + file.name + " » ne contient aucune diapositive lisible.");
    }
    // Word .docx : texte du document, notes de bas de page, images.
    async function readDocx(file, segs, budget) {
      const zip = await (await needZip(), window.JSZip).loadAsync(await file.arrayBuffer()), doc = zip.files["word/document.xml"];
      if (!doc) throw new Error("« " + file.name + " » n'est pas un document Word lisible.");
      let t = ooText(await doc.async("string"), "w");
      for (const extra of ["word/footnotes.xml", "word/endnotes.xml"]) if (zip.files[extra]) { const x = ooText(await zip.files[extra].async("string"), "w"); if (x) t += "\n\n" + x; }
      for (let k = 0; k < t.length; k += 12000) segs.push({ text: t.slice(k, k + 12000) });
      await zipImages(zip, Object.keys(zip.files).filter(n => n.startsWith("word/media/")).sort(), segs, budget);
    }
    // LibreOffice / OpenDocument : .odp (diaporama), .odt (texte).
    async function readOdf(file, segs, budget) {
      const zip = await (await needZip(), window.JSZip).loadAsync(await file.arrayBuffer()), c = zip.files["content.xml"];
      if (!c) throw new Error("« " + file.name + " » n'est pas un document LibreOffice lisible.");
      const xml = await c.async("string"), pages = xml.split(/<draw:page[ >]/);
      if (pages.length > 1) pages.slice(1).forEach(pg => { const t = odText("<" + pg); if (t) segs.push({ text: t }); });
      else { const t = odText(xml.replace(/^[\s\S]*?<office:body>/, "")); for (let k = 0; k < t.length; k += 12000) segs.push({ text: t.slice(k, k + 12000) }); }
      await zipImages(zip, Object.keys(zip.files).filter(n => /^(Pictures|media)\//.test(n)).sort(), segs, budget);
    }
    // Ancien PowerPoint .ppt (binaire) : on récupère les blocs de texte des diapositives (TextCharsAtom, TextBytesAtom, CString).
    async function readPpt(file, segs) {
      const b = new Uint8Array(await file.arrayBuffer()), v = new DataView(b.buffer), out = [], u16 = new TextDecoder("utf-16le"), l1 = new TextDecoder("windows-1252");
      for (let i = 0; i + 8 < b.length; i++) {
        if (b[i + 3] !== 0x0f || (b[i + 2] !== 0xa0 && b[i + 2] !== 0xa8) || b[i] !== 0 || b[i + 1] !== 0) continue;
        const len = v.getUint32(i + 4, true); if (len < 2 || len > 200000 || i + 8 + len > b.length) continue;
        const raw = b.subarray(i + 8, i + 8 + len), t = (b[i + 2] === 0xa0 ? u16.decode(raw) : l1.decode(raw)).replace(/[\r\v]/g, "\n").replace(/[\u0000-\u0008\u000e-\u001f]/g, "").trim();
        if (t && /[A-Za-zÀ-ÿ]{2}/.test(t) && !/^(Cliquez|Click to|Modifiez le style)/.test(t)) out.push(t);
        i += 7 + len;
      }
      const t = tidy([...new Set(out)].join("\n"));
      if (t.length < 40) throw new Error("Je n'arrive pas à lire « " + file.name + " » (ancien format .ppt). Ouvre-le et enregistre-le en .pptx ou en PDF, puis réessaie.");
      for (let k = 0; k < t.length; k += 12000) segs.push({ text: t.slice(k, k + 12000) });
    }
    // RTF : on retire les commandes de mise en forme pour garder le texte.
    function rtfText(r) {
      let prev; do { prev = r; r = r.replace(/\{\\(\*|fonttbl|colortbl|stylesheet|info|pict|themedata|datastore|generator)[^{}]*\}/g, ""); } while (r !== prev && /\{\\(\*|fonttbl|colortbl|stylesheet|info|pict)/.test(r));
      const l1 = new TextDecoder("windows-1252");
      return tidy(r.replace(/\\par[d]?\b ?|\\line\b ?/g, "\n").replace(/\\tab\b ?/g, " ").replace(/\\u(-?\d+)\??/g, (_, n) => String.fromCharCode((+n + 65536) % 65536)).replace(/\\'([0-9a-f]{2})/gi, (_, h) => l1.decode(new Uint8Array([parseInt(h, 16)]))).replace(/\\[a-z]+-?\d* ?/gi, "").replace(/\\([{}\\])/g, "$1").replace(/[{}]/g, ""));
    }
    async function readText(file, segs, rtf) {
      let t = await file.text(); if (t.includes("�")) t = new TextDecoder("windows-1252").decode(await file.arrayBuffer());
      t = rtf ? rtfText(t) : t.trim();
      for (let k = 0; k < t.length; k += 12000) segs.push({ text: t.slice(k, k + 12000) });
    }
    // Un fichier, quel que soit son format : ajoute ses morceaux (texte ou image) dans fs. Renvoie false si le format n'est pas lu.
    async function readOne(f, fs, budget, notes, scan) {
      const name = f.name.toLowerCase();
      if (name.endsWith(".pdf") || f.type === "application/pdf") await readPdf(f, fs, budget);
      else if (/\.(pptx|ppsx|potx)$/.test(name)) { say("Lecture du diaporama « " + f.name + " »…"); await readPptx(f, fs, budget); }
      else if (/\.(docx|dotx)$/.test(name)) { say("Lecture de « " + f.name + " »…"); await readDocx(f, fs, budget); }
      else if (/\.(odp|odt|otp|ott)$/.test(name)) { say("Lecture de « " + f.name + " »…"); await readOdf(f, fs, budget); }
      else if (/\.(ppt|pps)$/.test(name)) { say("Lecture de « " + f.name + " »…"); await readPpt(f, fs); notes.push("« " + f.name + " » est un ancien PowerPoint : son texte est lu, pas ses images. Enregistre-le en .pptx pour tout garder."); }
      else if (/\.(txt|md|markdown|csv|tex|rtf)$/.test(name) || f.type.startsWith("text/")) { say("Lecture de « " + f.name + " »…"); await readText(f, fs, name.endsWith(".rtf")); }
      else if (/\.(doc|key|pages|odg|xlsx?|ods)$/.test(name)) { notes.push("« " + f.name + " » : ce format ne se lit pas directement. Exporte-le en PDF (Fichier, Exporter en PDF) et envoie le PDF."); return false; }
      else if (f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/.test(name)) { if (budget.pages >= (budget.max || C.PAGES_MAX_PAR_IMPORT)) { budget.cut = true; return true; } budget.pages++; say("Préparation de « " + f.name + " »…"); fs.push({ img: await imageToJpeg(f, scan) }); }
      else { notes.push("« " + f.name + " » n'est pas un format accepté. Exporte-le en PDF et envoie le PDF."); return false; }
      return true;
    }
    return { imageToJpeg, readPdf, readPptx, readDocx, readOdf, readPpt, readText, readOne };
  }
  const FILE_ACCEPT = ".pdf,.pptx,.ppsx,.ppt,.pps,.odp,.docx,.odt,.rtf,.txt,.md,.csv,image/*";
  function screenImport(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true;
    const d = IMPORTS[id] || (IMPORTS[id] = newImp(ch));
    function draw() {
      if (d.busy) { app.innerHTML = impBusyHtml(d, ch.name); chipUpdate(); if ($("askn")) $("askn").onclick = async () => { const ok = await ensurePush(true); if (!ok) toast("Notifications impossibles sur cet appareil ou refusées."); if (d.busy && onImport(id)) draw(); }; return; }
      if (d.doneHtml) { const h = d.doneHtml; d.doneHtml = null; d.ready = false; d.files = []; d.shots = []; app.innerHTML = h; chipUpdate(); confetti(); return; }
      app.innerHTML = `<div class="row"><a class="iconbtn" href="#chapitre-${id}" aria-label="Retour au chapitre">${I.back}</a><span class="small muted">${esc(ch.name)}</span></div>
        <h1>Importer un cours</h1>
        <div class="seg" role="group" aria-label="Type d'import"><button data-tab="files" aria-pressed="${d.tab === "files"}">Fichiers et photos</button><button data-tab="text" aria-pressed="${d.tab === "text"}">Texte</button></div>
        ${d.tab === "files" ? `<div class="drop" id="drop">${I.up}<p><b>Glisse tes fichiers ici</b></p><p class="small muted">PDF, photos de cahier (iPhone compris), PowerPoint (.pptx, .ppt), LibreOffice (.odp, .odt), Word (.docx), texte (.txt, .rtf). Ajoute autant de fichiers que tu veux : tout est converti et lu en entier, images des diapositives comprises. Un Genially ? Fais une capture d'écran de chaque page et ajoute-les ici : l'IA lit les textes et les schémas.</p>
          <div class="row" style="flex-wrap:wrap;justify-content:center"><label class="btn sm ghost" for="pick">Parcourir les fichiers</label><label class="btn sm ghost" for="cam">Prendre une photo</label></div>
          <button class="switch" id="redsw" role="switch" aria-checked="${safeGet("merge.redresse") !== "0"}" type="button"><i></i>Redresser et recadrer les photos de feuilles</button>
          <input id="pick" type="file" multiple accept=".pdf,.pptx,.ppsx,.ppt,.pps,.odp,.docx,.odt,.rtf,.txt,.md,.csv,image/*" hidden><input id="cam" type="file" accept="image/*" capture="environment" hidden></div>
          <div class="filelist">${d.files.map((f, i) => `<div><span>${esc(f.name)}</span><button class="mini" data-rm="${i}" aria-label="Retirer ${esc(f.name)}">Retirer</button></div>`).join("")}</div>`
          : `<div class="field"><label for="txt">Texte du cours</label><textarea id="txt" placeholder="Colle ton cours ici">${esc(d.text)}</textarea></div>${shotsHtml()}`}
        <div class="field"><label for="n">${cardsOf(id).length ? "Combien de nouvelles flashcards ajouter ?" : "Combien de flashcards ?"} <b id="nv">${autoN() ? "auto" : d.n}</b></label>${cardsOf(id).length ? `<p class="small muted">Tu as déjà ${plural(cardsOf(id).length, "carte", "cartes")} dans ce chapitre : les nouvelles s'ajoutent à elles, sans refaire celles que tu as déjà.</p>` : ""}<input id="n" type="range" min="10" max="${C.CARTES_MAX}" step="5" value="${d.n}"${autoN() ? " disabled" : ""}></div>
        <button class="switch" id="nauto" role="switch" aria-checked="${autoN()}" type="button"><i></i>Laisser l'IA choisir le nombre : juste ce qu'il faut pour couvrir tout le cours</button>
        <button class="btn" id="go">Créer le résumé et les cartes</button>
        <div id="status" class="note" role="status">Les cartes viennent uniquement de ton cours. Chaque carte garde la phrase du cours qui la justifie.</div>`;
      app.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { keep(); d.tab = b.dataset.tab; draw(); });
      app.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { d.files.splice(+b.dataset.rm, 1); draw(); });
      app.querySelectorAll("[data-rms]").forEach(b => b.onclick = () => { keep(); d.shots.splice(+b.dataset.rms, 1); draw(); });
      if ($("shotpick")) $("shotpick").onchange = e => { keep(); d.shots.push(...e.target.files); draw(); };
      $("n").oninput = () => { d.n = +$("n").value; $("nv").textContent = d.n; };
      $("nauto").onclick = () => { const on = !autoN(); safeSet("merge.autoN", on ? "1" : "0"); $("nauto").setAttribute("aria-checked", on); $("n").disabled = on; $("nv").textContent = on ? "auto" : d.n; };
      const add = (list) => { d.files.push(...list); draw(); };
      if ($("redsw")) $("redsw").onclick = () => { const on = safeGet("merge.redresse") === "0"; safeSet("merge.redresse", on ? "1" : "0"); $("redsw").setAttribute("aria-checked", on); };
      if ($("pick")) { $("pick").onchange = e => add([...e.target.files]); $("cam").onchange = e => add([...e.target.files]);
        const z = $("drop"); z.ondragover = e => { e.preventDefault(); }; z.ondrop = e => { e.preventDefault(); add([...e.dataTransfer.files]); }; }
      $("go").onclick = run;
      if (d.failed) {
        const s = $("status"), e = d.failed; showErr(s, e); d.failed = null; if (d.jobId) safeSet("merge.jobseen." + d.jobId, "1");
        if (d.jobId && d.canResume) { s.insertAdjacentHTML("beforeend", `<p class="note">${e.code === "quota" ? "Ce qui a déjà été lu est gardé : reprends l'import demain, sans rien renvoyer." : "Ce qui a déjà été lu est gardé."}</p><button class="btn sm" id="resume">Reprendre l'import</button>`);
          $("resume").onclick = async () => { $("resume").disabled = true; try { await ai({ action: "import_resume", job_id: d.jobId }, "studio"); d.busy = true; d.local = false; d.canResume = false; d.t0 = Date.now(); d.msg = "Reprise de l'import…"; impTimer(d); watchJob(id); draw(); } catch (er) { d.canResume = er.code === "quota"; showErr(s, er); } }; }
      }
      chipUpdate();
    }
    // Schémas et images : un texte collé ne donne que du texte. On y ajoute des captures d'écran,
    // lues par l'IA comme les photos (elle décrit chaque schéma), dans le même import.
    function shotsHtml() {
      return `<div class="card pad stack shots"><b>Schémas, images, tableaux</b><p class="small muted">Ton texte a des schémas à côté ? Ajoute des captures d'écran : l'IA les lit et décrit chaque schéma, comme pour une photo de cours.</p>
        ${d.shots.length ? `<div class="filelist">${d.shots.map((f, i) => `<div><span>${esc(f.name)}</span><button class="mini" data-rms="${i}" aria-label="Retirer ${esc(f.name)}">Retirer</button></div>`).join("")}</div>` : ""}
        <label class="btn sm ghost" for="shotpick" style="align-self:flex-start">Ajouter des captures</label><input id="shotpick" type="file" multiple accept="image/*,.pdf" hidden></div>`;
    }
    function keep() { if ($("txt")) d.text = $("txt").value; }
    const say = (m) => { d.msg = m; impPaint(d); };

    const R = fileReaders(d, say), { imageToJpeg, readPdf, readPptx, readDocx, readOdf, readPpt, readText } = R;
    async function run() {
      if (d.busy) return; keep();
      if (d.tab === "files" && !d.files.length) return toast("Ajoute au moins un fichier ou une photo.");
      if (d.tab === "text" && d.text.trim().length < 80) return toast("Colle un texte de cours plus long.");
      d.busy = true; d.local = true; d.ready = false; d.failed = null; d.canResume = false; d.jobId = null; d.shown = 0; d.target = 1; d.t0 = Date.now(); d.stage = "read"; d.msg = "Je démarre…";
      ensurePush(true).then(() => { if (d.busy && onImport(id)) draw(); });
      impTimer(d); draw();
      try {
        const segs = [], budget = { pages: 0, cut: false }, notes = [];
        if (d.tab === "text") segs.push({ text: d.text.trim() });
        const list = d.tab === "text" ? (d.shots || []) : d.files;
        for (const [fi, f] of list.entries()) {
          d.fi = fi; d.fn = list.length; impProg(d, "read", 0.6 * fi / d.fn);
          // Un fichier déjà lu (ou déjà transcrit par l'IA) n'est pas relu si l'import est relancé : aucun appel payé deux fois.
          const name = f.name.toLowerCase(), key = f.name + ":" + f.size + ":" + f.lastModified;
          if (d.cache[key]) { segs.push(...d.cache[key]); budget.pages += d.cache[key].length; continue; }
          const fs = [], before = budget.cut;
          if (name.endsWith(".pdf") || f.type === "application/pdf") await readPdf(f, fs, budget);
          else if (/\.(pptx|ppsx|potx)$/.test(name)) { say("Lecture du diaporama « " + f.name + " »…"); await readPptx(f, fs, budget); }
          else if (/\.(docx|dotx)$/.test(name)) { say("Lecture de « " + f.name + " »…"); await readDocx(f, fs, budget); }
          else if (/\.(odp|odt|otp|ott)$/.test(name)) { say("Lecture de « " + f.name + " »…"); await readOdf(f, fs, budget); }
          else if (/\.(ppt|pps)$/.test(name)) { say("Lecture de « " + f.name + " »…"); await readPpt(f, fs); notes.push("« " + f.name + " » est un ancien PowerPoint : son texte est lu, pas ses images. Enregistre-le en .pptx pour tout garder."); }
          else if (/\.(txt|md|markdown|csv|tex|rtf)$/.test(name) || f.type.startsWith("text/")) { say("Lecture de « " + f.name + " »…"); await readText(f, fs, name.endsWith(".rtf")); }
          else if (/\.(doc|key|pages|odg|xlsx?|ods)$/.test(name)) { notes.push("« " + f.name + " » : ce format ne se lit pas directement. Exporte-le en PDF (Fichier, Exporter en PDF) et importe le PDF."); continue; }
          else if (f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/.test(name)) { if (budget.pages >= (budget.max || C.PAGES_MAX_PAR_IMPORT)) { budget.cut = true; continue; } budget.pages++; say("Préparation de « " + f.name + " »…"); fs.push({ img: await imageToJpeg(f, true) }); }
          else { notes.push("« " + f.name + " » n'est pas un format accepté. Exporte-le en PDF et importe le PDF."); continue; }
          if (budget.cut === before) d.cache[key] = fs;
          segs.push(...fs); impProg(d, "read", 0.6 * (fi + 1) / d.fn);
        }
        if (budget.cut) notes.push("Seules les " + C.PAGES_MAX_PAR_IMPORT + " premières pages ont été lues. Refais un import pour la suite.");
        if (!segs.some(x => x.img || x.path || (x.text && x.text.trim()))) throw new Error(notes[0] || "Je n'ai pas trouvé assez de texte dans ce cours.");
        // Les pages à faire lire par l'IA sont envoyées dans l'espace privé de l'élève ; le serveur fait tout le reste.
        const todo = segs.filter(x => x.img && !x.path), stamp = Date.now(); let sent = 0, nextUp = 0; d.photos = todo.length;
        if (todo.length) {
          say("Envoi de " + plural(todo.length, "page", "pages") + " avec photos ou schémas…");
          const up = async () => {
            while (nextUp < todo.length) {
              const k = nextUp++, sg = todo[k], bin = atob(sg.img), arr = new Uint8Array(bin.length); for (let z = 0; z < bin.length; z++) arr[z] = bin.charCodeAt(z);
              const path = state.user.id + "/" + id + "/" + stamp + "-" + k + ".jpg", r = await sb.storage.from("cours").upload(path, new Blob([arr], { type: "image/jpeg" }), { contentType: "image/jpeg", upsert: true });
              if (r.error) throw new Error("Envoi d'une page impossible : " + (r.error.message || "réseau") + ". Vérifie ta connexion et réessaie.");
              sg.path = path; delete sg.img; sent++; impProg(d, "read", 0.6 + 0.4 * sent / todo.length);
            }
          };
          await Promise.all(Array.from({ length: Math.min(4, todo.length) }, up));
        }
        impProg(d, "read", 1); say("Envoi du cours au serveur…");
        const label = d.tab === "text" ? "Texte collé" : d.files.map(f => f.name).join(", ").slice(0, 300);
        const r = await ai({ action: "import_start", chapter_id: id, n: autoN() ? 0 : d.n, auto: autoN(), label, mime: d.tab === "text" ? "text/plain" : "mixte", pages: budget.pages || null, notes, avoid: cardsOf(id).map(c => c.front).filter(Boolean).slice(-200), segs: segs.map(x => x.path ? { path: x.path } : { text: x.text }) }, "studio");
        if (!r || !r.job_id) throw new Error("Le serveur n'a pas pris l'import. Réessaie dans un instant.");
        d.jobId = r.job_id; d.local = false; d.stage = segs.some(x => x.path) ? "img" : "gen"; d.target = Math.max(d.target, 12); d.msg = "C'est parti côté serveur…";
        if (onImport(id)) draw(); watchJob(id);
      } catch (e) {
        console.error(e); d.busy = false; d.local = false; clearInterval(d.timer); d.failed = e;
        if (onImport(id)) draw(); else chipUpdate();
      }
    }
    draw();
  }

