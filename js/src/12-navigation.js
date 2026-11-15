  // ---------- navigation ----------
  let enterT = null;
  function route() {
    app.classList.remove("enter"); void app.offsetWidth; app.classList.add("enter"); clearTimeout(enterT); enterT = setTimeout(() => app.classList.remove("enter"), 700);
    document.body.classList.remove("nav"); app.classList.toggle("profmode", /^#exos/.test(location.hash));
    const pd = document.getElementById("pdrawer"); if (pd) pd.remove(); document.body.classList.remove("typing");
    if (location.hash.startsWith("#partage-")) return screenShared(location.hash.slice(9));
    // Lien d'invitation Duo (#duo-CODE) : on garde le code, même s'il faut d'abord se connecter, puis on ouvre l'onglet Duo.
    if (/^#duo-./.test(location.hash)) { const c = decodeURIComponent(location.hash.slice(5)).trim().slice(0, 64); if (c) safeSet("merge.duoin", c); history.replaceState(null, "", location.pathname + location.search + "#duo"); }
    if (!state.user) return screenLogin();
    if (!state.profile || !state.profile.onboarded_at) return screenOnboarding();
    if (safeGet("merge.duoin") && location.hash !== "#duo") { location.hash = "#duo"; return; }
    const h = location.hash.replace("#", ""), arg = h.slice(h.indexOf("-") + 1);
    document.body.classList.add("nav"); closeSheet();
    drawTabs(/^(progres|calendrier|reglages)$/.test(h) ? h : h === "duo" ? "progres" : h === "journee" || h === "edt" || h === "mois" ? "calendrier" : /^exos/.test(h) ? "exos" : h === "corbeille" ? "reglages" : h === "bilan" || h === "minuteur" || h === "recompenses" || h === "boutique" ? "progres" : !h || h === "accueil" || h === "cartes-jour" || h === "melange" || h === "perso" || h === "mixte" ? "accueil" : "matieres");
    screenSession.key = null;
    if (busStop) busStop();
    stopSpeak();
    if (h === "matieres") screenSubjects();
    else if (h === "erreurs") screenMistakes(null);
    else if (h.startsWith("erreurs-")) screenMistakes(arg);
    else if (h.startsWith("dossier-")) screenGroup(arg);
    else if (h.startsWith("pieges-")) screenTraps(arg);
    else if (h.startsWith("blurting-")) screenBlurting(arg);
    else if (h.startsWith("feynman-")) screenFeynman(arg);
    else if (h.startsWith("khole-")) screenOral(arg);
    else if (h.startsWith("boss-")) screenBoss(arg);
    else if (h.startsWith("flash-")) screenFlash(arg);
    else if (h.startsWith("faceaface-")) screenVersus(arg);
    else if (h.startsWith("bus-")) screenBus(arg);
    else if (h.startsWith("exercices-")) screenExercises(arg);
    else if (h.startsWith("carte-")) screenMindmap(arg);
    else if (h.startsWith("trous-")) screenCloze(arg);
    else if (h.startsWith("interro-")) screenInterro(arg);
    else if (h.startsWith("synthese-")) screenSynth(arg);
    else if (h.startsWith("planche-")) screenPrintCards(arg);
    else if (h === "calendrier") screenPlanning();
    else if (h === "progres") screenProgress();
    else if (h === "duo") screenDuo();
    else if (h === "journee") jGo("jour");
    else if (h === "mois") screenCalendar();
    else if (h === "exos") screenExos();
    else if (h.startsWith("exos-")) screenExos(arg);
    else if (h.startsWith("apprendre-")) screenQuestions(arg, "apprendre");
    else if (h.startsWith("quiz-")) screenQuestions(arg, "quiz");
    else if (h.startsWith("controle-")) screenQuestions(arg, "controle");
    else if (h.startsWith("associer-")) screenMatch(arg);
    else if (h.startsWith("ecouter-")) screenListen(arg);
    else if (h.startsWith("questions-")) screenAsk(arg);
    else if (h.startsWith("libre-")) screenLibre(arg);
    else if (h.startsWith("schema-")) screenOccl(arg);
    else if (h.startsWith("stats-")) screenStats(arg);
    else if (h === "bilan") screenWeek();
    else if (h.startsWith("difficiles-")) screenSession(arg, true);
    else if (h.startsWith("revision-")) screenSession(arg, false, true);
    else if (h === "melange") screenSession("melange");
    else if (h === "perso") screenMix();
    else if (h === "mixte") screenSession("mixte");
    else if (h.startsWith("revdossier-")) screenSession("g:" + arg);
    else if (h === "recompenses") screenRewards();
    else if (h === "boutique") screenShop();
    else if (h === "edt") screenEdt();
    else if (h === "corbeille") screenTrash();
    else if (h.startsWith("methode-")) screenMethode(arg);
    else if (h.startsWith("bac-")) screenBac(arg);
    else if (h.startsWith("vraifaux-")) screenTrueFalse(arg);
    else if (h.startsWith("fiche-")) screenSheet(arg);
    else if (h.startsWith("blanc-")) screenQuestions(arg, "blanc");
    else if (h === "recherche") screenSearch();
    else if (h === "nouvelle-matiere") formSubject();
    else if (h === "minuteur") screenTimer();
    else if (h.startsWith("matiere-")) screenSubject(arg);
    else if (h.startsWith("chapitre-")) screenChapter(arg);
    else if (h.startsWith("import-")) screenImport(arg);
    else if (h.startsWith("resume-")) screenSummary(arg);
    else if (h.startsWith("cartes-")) screenSession(arg);
    else if (h === "reglages") screenSettings();
    else screenHome();
    scrollTo(0, 0);
  }

  async function start() {
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) throw error;
      state.user = data.session ? data.session.user : null;
      if (state.user) await loadAll();
      route();
      if (state.user && state.profile && state.profile.onboarded_at) resumeJobs();
    } catch (e) {
      console.error(e);
      if (!state.user) return screenLogin("Connexion impossible : " + (e.message || "erreur"));
      if (loadCache()) { route(); return toast("Tu es hors ligne : tu peux réviser tes cartes, elles seront enregistrées au retour du réseau."); }
      app.innerHTML = `<div class="center"><p class="err">Impossible de charger tes données : ${mx(e.message || "erreur")}. Vérifie ta connexion puis réessaie.</p><button class="btn" id="retry">Réessayer</button></div>`;
      $("retry").onclick = start;
    }
  }

  applyLook(null);
  addEventListener("hashchange", route);
  sb.auth.onAuthStateChange((evt) => { if (evt === "SIGNED_OUT") { state.user = null; state.profile = null; screenLogin(); } });
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) navigator.serviceWorker.register("sw.js").catch(() => {});
  start();
})();
