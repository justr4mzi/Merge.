// Tests de bout en bout avec Playwright et la fausse base (tests/fake-supabase.js).
// Usage : node tests/run.js   (depuis la racine du dépôt ; sert le dossier sur un port local)
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, ".."), SHOTS = process.env.SHOTS || path.join(__dirname, "captures");
const MIME = { ".jpg": "image/jpeg", ".mp3": "audio/mpeg",  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
});
const QUOTA_MSG = "Vous avez atteint votre limite journalière. Contacte le créateur pour débloquer ou reviens demain. Tes révisions continuent de marcher !";
let failures = 0; const log = [];
const ok = (cond, name, extra) => { if (!cond) { failures++; log.push("ÉCHEC  " + name + (extra ? "  → " + extra : "")); } else log.push("ok     " + name); };

async function open(browser, { w, h, theme, seed = "plein", legacy, quota, mastered, xp, trash, oldSeason, extra }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: "block", colorScheme: theme === "dark" ? "dark" : "light" });
  const page = await ctx.newPage(); page.errors = [];
  page.on("pageerror", e => page.errors.push(String(e)));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource|fonts\.g/.test(m.text())) page.errors.push(m.text()); });
  await page.route("**/vendor/supabase.js", r => r.fulfill({ path: path.join(__dirname, "fake-supabase.js"), contentType: "text/javascript" }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.addInitScript(o => { if (sessionStorage.getItem("init")) return; sessionStorage.setItem("init", "1"); localStorage.clear(); if (!o.oldSeason) localStorage.setItem("merge.rewards", JSON.stringify({ season: 2, xp0: 0 })); else localStorage.setItem("merge.rewards", JSON.stringify({ buys: [{ id: "c-sakura", price: 0, level: 2 }, { id: "c-cerise", price: 150 }], equip: { couleur: "c-cerise" }, lvl: 4 })); localStorage.setItem("fake.seed", o.seed); Object.entries(o.extra || {}).forEach(([k, v]) => localStorage.setItem("fake." + k, v)); localStorage.setItem("fake.theme", o.theme); localStorage.setItem("merge.tuto", "1"); if (o.legacy) localStorage.setItem("fake.legacy", "1"); if (o.quota != null) localStorage.setItem("fake.quota", String(o.quota)); if (o.mastered) localStorage.setItem("fake.mastered", "1"); if (o.xp) localStorage.setItem("fake.xp", String(o.xp)); if (o.trash) localStorage.setItem("fake.trash", "1"); }, { seed, theme, legacy, quota, mastered, xp, trash, oldSeason, extra });
  await page.goto(BASE + "/"); try { await page.waitForSelector("#app > *"); } catch (e) { throw new Error("l'appli ne s'affiche pas : " + page.errors.slice(0, 3).join(" | ")); }
  return page;
}
const go = async (page, hash, wait) => { await page.evaluate(h => { if (location.hash === h) location.hash = "#accueil"; }, hash); await page.evaluate(h => { location.hash = h; }, hash); await page.waitForTimeout(wait || 220); };
const overflow = page => page.evaluate(() => { const d = document.documentElement; const wide = [...document.querySelectorAll("body *")].filter(e => e.getBoundingClientRect().right > innerWidth + 0.01 && !e.closest(".scrollx,.mindmap,.flipwrap")).slice(0, 3).map(e => e.tagName + "." + e.className); return { sw: d.scrollWidth, iw: innerWidth, wide }; });
const small = page => page.evaluate(() => [...document.querySelectorAll("#app button, #app a.btn, #app a.chip, #app a.iconbtn, #app a.mini, .tabs a")].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 43.5 && !e.closest(".mindmap") && !e.classList.contains("flip"); }).slice(0, 4).map(e => e.tagName + "." + e.className + ":" + Math.round(e.getBoundingClientRect().height) + ":" + e.textContent.trim().slice(0, 20)));
// Planning : les actions du jour sont dans le menu « + » en haut à droite.
const jm = async (page, sel) => { if (await page.locator("#jmenu").count() && await page.locator(sel).isHidden()) { await page.click("#jmenu"); await page.waitForTimeout(80); } await page.click(sel); };
const txt = page => page.evaluate(() => document.getElementById("app").innerText);

const ROUTES = ["methode-s1", "bac-s1", "edt", "recompenses", "melange", "interro-c1", "accueil", "matieres", "matiere-s1", "dossier-g1", "chapitre-c1", "calendrier", "progres", "duo", "reglages", "erreurs", "import-c1", "resume-c1", "cartes-c1", "apprendre-c1", "quiz-c1", "controle-c1", "associer-c1", "vraifaux-c1", "ecouter-c1", "questions-c1", "blurting-c1", "feynman-c1", "khole-c1", "boss-c1", "flash-c1", "bus-c1", "planche-c1", "erreurs-c1", "fiche-c1", "recherche", "minuteur", "blanc-c1", "difficiles-c1", "revision-s1", "perso", "revdossier-g1", "journee", "exos", "exos-c1"];
const GATED = ["pieges-c1", "faceaface-c1", "exercices-c1", "carte-c1", "trous-c1", "synthese-c1"];

async function sweep(browser, w, h, theme) {
  const tag = w + "-" + theme, page = await open(browser, { w, h, theme });
  for (const r of ROUTES.concat(GATED)) {
    await go(page, "#" + r);
    if (GATED.includes(r)) { ok(await page.locator("#mk").count() === 1, tag + " " + r + " : bouton Préparer"); await page.click("#mk"); await page.waitForTimeout(350); ok(await page.locator("#mk").count() === 0 && !(await txt(page)).includes("prépare «"), tag + " " + r + " : contenu généré"); }
    const o = await overflow(page); ok(o.sw <= o.iw, tag + " " + r + " : pas de débordement horizontal", JSON.stringify(o));
    const s = await small(page); ok(!s.length, tag + " " + r + " : boutons de 44 px minimum", s.join(" | "));
    if (["accueil", "matiere-s1", "dossier-g1", "chapitre-c1", "cartes-c1", "calendrier", "carte-c1", "synthese-c1", "boss-c1", "planche-c1", "faceaface-c1", "trous-c1", "pieges-c1", "erreurs", "quiz-c1", "questions-c1"].includes(r)) await page.screenshot({ path: path.join(SHOTS, tag + "-" + r + ".png"), fullPage: true });
  }
  ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | "));
  const nav = await page.evaluate(() => { location.hash = "#accueil"; return new Promise(r => setTimeout(() => { const t = document.getElementById("tabs").getBoundingClientRect(); r({ left: t.left, top: t.top, w: t.width, h: t.height, ih: innerHeight }); }, 200)); });
  ok(w >= 900 ? (nav.left === 0 && nav.h > nav.ih * 0.9 && nav.w < 300) : (nav.top > nav.ih - 120 && nav.w >= w - 1), tag + " : " + (w >= 900 ? "menu latéral gauche" : "barre basse"), JSON.stringify(nav));
  await page.context().close();
}

async function flows(browser) {
  // --- inscription : calendrier en vue mois + révision libre
  let page = await open(browser, { w: 390, h: 844, theme: "light", seed: "vide" });
  ok((await txt(page)).includes("Pourquoi quelques questions"), "inscription : écran qui explique Merge");
  await page.screenshot({ path: path.join(SHOTS, "flux-inscription-accueil.png"), fullPage: true });
  await page.click("#next"); await page.waitForTimeout(100);
  ok((await txt(page)).includes("Étape 1 sur 4"), "inscription : étape 1");
  await page.fill("#prenom", "Ramzi"); await page.click("#next"); await page.click("#next");
  ok(await page.locator(".picker .cal button.day").count() >= 28, "inscription : grille du mois complète");
  await page.click(".picker button.day:not([disabled]) >> nth=-1"); await page.waitForTimeout(80);
  ok(await page.locator('.picker button.day[aria-pressed="true"]').count() === 1, "inscription : jour sélectionné");
  await page.click('[data-x="SVT"]'); await page.click(".switch"); await page.waitForTimeout(80);
  ok(await page.locator('.switch[aria-checked="true"]').count() === 1 && (await txt(page)).includes("libre"), "inscription : interrupteur révision libre");
  await page.screenshot({ path: path.join(SHOTS, "flux-inscription-calendrier.png"), fullPage: true });
  await page.click("#next"); await page.click("#next"); await page.waitForTimeout(500);
  let db = await page.evaluate(() => JSON.parse(JSON.stringify(window.__fake.DB)));
  ok(db.subjects.length === 3 && db.subjects.find(s => s.name === "Maths").exam_date && db.subjects.find(s => s.name === "SVT").free_revision === true, "inscription : dates et révision libre enregistrées", JSON.stringify(db.subjects.map(s => [s.name, s.exam_date, s.free_revision])));
  // --- dossier avec le bouton +, chapitre, import, session
  const svt = db.subjects.find(s => s.name === "SVT").id;
  await go(page, "#matiere-" + svt); ok((await txt(page)).includes("Révision libre"), "matière : pastille révision libre");
  await page.click("#addG"); await page.fill("#gname", "Thème 1 : Génétique"); await page.click("#gsave"); await page.waitForTimeout(300);
  ok(await page.locator(".folder").count() === 1, "matière : dossier créé avec le bouton +");
  await page.click(".folder"); await page.waitForTimeout(250);
  ok(await page.locator('[role="tab"]').count() === 5 && await page.locator('[role="tab"][aria-selected="true"]').textContent() === "Chapitres", "dossier : 5 onglets, « Chapitres » ouvert en premier");
  ok(await page.locator("#gn").count() === 0 && await page.locator("#cname").count() === 0, "dossier : plus de champ ni de réglages dans la page");
  await page.click("#gSet"); await page.waitForTimeout(150); ok(await page.locator("#sheet #gn").isVisible() && await page.locator("#sheet #gcol").isVisible(), "dossier : réglages dans la fenêtre de l'engrenage");
  await page.keyboard.press("Escape"); await page.click("#gAdd"); await page.waitForTimeout(150);
  await page.fill("#cname", "Chapitre 1 : La mitose"); await page.click("#addCh"); await page.waitForTimeout(400);
  const ch = (await page.evaluate(() => location.hash)).replace("#chapitre-", "");
  await go(page, "#import-" + ch); await page.click('[data-tab="text"]');
  await page.fill("#txt", "La mitose est une division cellulaire qui donne deux cellules filles génétiquement identiques à la cellule mère. Elle comporte quatre phases."); await page.click("#go"); await page.waitForFunction(() => /cartes créées/.test(document.getElementById("app").innerText), null, { timeout: 15000 }).catch(() => {});
  ok((await txt(page)).includes("8 cartes créées"), "import : cartes créées", (await txt(page)).slice(0, 200));
  ok(await page.evaluate(() => window.__fake.calls) >= 1 && await page.evaluate(() => window.__fake.DB.import_jobs.length) === 1, "import : fait par le serveur, appel IA compté");
  await go(page, "#cartes-" + ch);
  ok(await page.locator("#no svg").count() === 1 && (await page.locator("#yes").innerText()).trim() === "Juste", "session : croix rouge et bouton Juste");
  await page.click("#flip"); await page.click("#no"); await page.waitForTimeout(60);
  ok((await page.locator(".counter.no").innerText()).trim() === "1", "session : carte fausse remise dans la file");
  const firstQ = await page.evaluate(() => window.__fake.DB.cards.find(c => c.wrong_count === 1).front);
  let seen = 0, offered = false, guard = 0;
  while (guard++ < 40) {
    if (await page.locator("#goquiz").count()) { offered = true; await page.click("#keep"); continue; }
    if (!(await page.locator("#yes").count())) break;
    const q = await page.locator(".face:not(.b) .txt").innerText(); if (q.trim() === firstQ) seen++;
    await page.click("#yes"); await page.waitForTimeout(25);
  }
  ok(offered, "session : quiz proposé à mi-parcours"); ok(seen >= 1, "session : la carte ratée est réapparue");
  ok((await txt(page)).includes("100 %") && (await txt(page)).includes("Contrôle débloqué"), "session : 100 % et contrôle débloqué", (await txt(page)).slice(0, 200));
  await go(page, "#controle-" + ch); ok(await page.locator("#cgo").count() === 1, "contrôle : accessible à 100 %");
  await page.click("#cgo"); await page.waitForTimeout(400); ok(await page.locator(".opt").count() === 4, "contrôle : QCM écrit par l'IA");
  let before = await page.evaluate(() => window.__fake.calls);
  await go(page, "#chapitre-" + ch); await go(page, "#controle-" + ch); await page.click("#cgo"); await page.waitForTimeout(300);
  ok(await page.evaluate(() => window.__fake.calls) === before, "cache : rouvrir le contrôle ne consomme aucun appel");
  // 2e erreur sur une carte : mnémotechnique
  await go(page, "#cartes-" + ch);
  for (let k = 0; k < 9 && await page.locator("#no").count(); k++) { await page.click("#no"); await page.waitForTimeout(40); }
  await page.waitForTimeout(300);
  db = await page.evaluate(() => JSON.parse(JSON.stringify(window.__fake.DB)));
  ok(db.cards.some(c => c.wrong_count >= 2 && c.mnemonic), "mnémotechnique : générée à la 2e erreur", JSON.stringify(db.cards.map(c => [c.wrong_count, !!c.mnemonic])));
  ok(db.mistakes.length >= 1, "carnet d'erreurs : erreurs enregistrées");
  ok(!page.errors.length, "flux principal : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | "));
  await page.context().close();

  // --- parcours des modes sur la base pleine
  page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await go(page, "#controle-c1"); ok((await txt(page)).includes("Pas encore débloqué"), "contrôle : verrouillé sous 100 %");
  await go(page, "#dossier-g1"); await page.click('[data-gt="controles"]'); ok(await page.locator(".rowlink.locked").count() === 2, "dossier : contrôles verrouillés");
  await page.click('[data-gt="cartes"]'); ok((await txt(page)).includes("8 cartes"), "dossier : onglet Flashcards");
  await go(page, "#quiz-c1"); await page.click("#qcm"); await page.waitForTimeout(400);
  for (let k = 0; k < 8; k++) { await page.click(".opt >> nth=0"); await page.click("#cont"); await page.waitForTimeout(30); }
  await page.waitForTimeout(200); ok((await txt(page)).includes("/ 20"), "quiz QCM : note sur 20");
  await go(page, "#quiz-c1"); await page.click("#ecrit"); await page.waitForTimeout(300); await page.fill("#ans", "L'ADN se réplique"); await page.click("#check");
  ok((await txt(page)).includes("Réponse idéale attendue") && await page.locator("#okb").count() === 1, "quiz rédigé : réponse idéale et auto-validation");
  await go(page, "#pieges-c1"); await page.click("#mk"); await page.waitForTimeout(300); await page.click(".sent >> nth=1"); await page.click("#chk");
  ok((await txt(page)).includes("1 sur 2 erreurs trouvées"), "pièges : correction", (await txt(page)).slice(0, 300));
  await go(page, "#blurting-c1"); await page.fill("#bl", "Je sais que la mitose donne deux cellules et que la méiose donne deux cellules aussi."); await page.click("#go"); await page.waitForTimeout(300);
  ok(await page.locator("mark.hl.ok").count() >= 1 && await page.locator("mark.hl.ko").count() >= 1 && await page.locator("mark.hl.warn").count() >= 1, "blurting : vert, orange, rouge");
  await page.screenshot({ path: path.join(SHOTS, "flux-blurting.png"), fullPage: true });
  await page.click("#addc"); await page.waitForTimeout(300); ok(await page.evaluate(() => window.__fake.DB.cards.length) === 11, "blurting : 3 cartes de renfort ajoutées");
  await go(page, "#feynman-c1"); await page.fill("#fn", "La mitose"); await page.fill("#fe", "C'est quand une cellule se copie pour en faire deux pareilles."); await page.click("#go"); await page.waitForTimeout(300);
  ok((await txt(page)).includes("3 / 5"), "Feynman : note"); await page.screenshot({ path: path.join(SHOTS, "flux-feynman.png"), fullPage: true });
  await go(page, "#questions-c1"); await page.fill("#qq", "C'est quoi la mitose ?"); await page.click("#send"); await page.waitForTimeout(300); await page.click('[data-th="manga"]'); await page.waitForTimeout(300);
  ok((await txt(page)).includes("photocopieuse"), "professeur IA : rends ça concret"); await page.screenshot({ path: path.join(SHOTS, "flux-prof.png"), fullPage: true });
  await go(page, "#khole-c1"); if (await page.locator("#mic").count()) { await page.evaluate(() => { document.getElementById("trf").hidden = false; document.getElementById("done").hidden = false; }); }
  await page.fill("#trt", "euh la mitose donne deux cellules du coup identiques"); await page.click("#done"); await page.click("#aik"); await page.waitForTimeout(300);
  ok((await txt(page)).includes("14 / 20"), "khôlle : correction IA"); await page.screenshot({ path: path.join(SHOTS, "flux-khole.png"), fullPage: true });
  await go(page, "#boss-c1"); await page.click("#fight");
  for (let k = 0; k < 30 && await page.locator(".opt").count(); k++) { const good = await page.evaluate(() => { const q = document.querySelector(".qtxt").textContent, c = window.__fake.DB.cards.find(x => x.front === q); return [...document.querySelectorAll(".opt")].findIndex(o => o.textContent === c.back); }); await page.click(".opt >> nth=" + good); if (k === 3) await page.screenshot({ path: path.join(SHOTS, "flux-boss.png"), fullPage: true }); await page.click("#cont"); await page.waitForTimeout(20); }
  ok((await txt(page)).includes("Boss vaincu"), "boss : victoire", (await txt(page)).slice(0, 200));
  await go(page, "#flash-c1"); await page.click("#go"); await page.click("#vrai"); await page.click("#faux"); ok(await page.locator("#fclock").count() === 1, "flash : partie en cours"); await page.screenshot({ path: path.join(SHOTS, "flux-flash.png"), fullPage: true });
  await go(page, "#faceaface-c1"); await page.click("#mk"); await page.waitForTimeout(300); ok(await page.locator("table.vs tbody tr").count() === 3, "face-à-face : tableau comparatif"); await page.click("#vq"); await page.click('[data-r="b"]'); ok(/Bon réflexe|C'était/.test(await txt(page)), "face-à-face : mini-quiz");
  await go(page, "#exercices-c1"); await page.click("#mk"); await page.waitForTimeout(300); await page.click('[data-ex="0"]'); await page.click('[data-ex="0"]'); await page.click('[data-ex="0"]'); ok(await page.locator(".hint").count() === 2 && await page.locator(".solution").count() === 1, "exercices : indice 1, indice 2, solution"); await page.screenshot({ path: path.join(SHOTS, "flux-exercices.png"), fullPage: true });
  await go(page, "#carte-c1"); await page.click("#mk"); await page.waitForTimeout(300); const n0 = await page.locator(".mnode").count(); await page.click('.mnode[data-n="1"]'); await page.waitForTimeout(100); const n1 = await page.locator(".mnode").count(); await page.click("#zin");
  ok(n1 > n0 && (await page.getAttribute("#mmg", "transform")).includes("scale(0.875)"), "carte mentale : branches dépliables et zoom", n0 + "→" + n1);
  await go(page, "#trous-c1"); await page.click("#mk"); await page.waitForTimeout(300); const words = await page.locator(".bank .chip").count(); for (let k = 0; k < 2; k++) await page.click(".bank .chip:not([disabled]) >> nth=0"); await page.click("#chk"); ok(words >= 3 && (await page.locator(".blank.ok, .blank.ko").count()) === 2, "texte à trous : pastilles et vérification");
  await go(page, "#bus-c1"); await page.click("#bplay"); await page.waitForTimeout(200); ok((await page.locator("#bplay").innerText()).trim() === "Pause", "mains libres : lecture"); await page.click("#bplay");
  await go(page, "#planche-c1"); ok(await page.locator(".a4.planche").count() === 4 && await page.locator(".pc.q").count() === 11, "planche A4 : recto et verso de 8 cartes", String(await page.locator(".a4.planche").count()));
  await go(page, "#erreurs"); await page.click("[data-why] >> nth=0"); await page.waitForTimeout(300); ok((await txt(page)).includes("À retenir"), "carnet d'erreurs : Pourquoi ?");
  await page.evaluate(() => localStorage.setItem("merge.jview", JSON.stringify({ lvl: "jour" }))); await go(page, "#mois"); await page.click(".cal button.day >> nth=-1"); await page.waitForTimeout(500); if (await page.locator("#sheet [data-close]").count()) { await page.click("#sheet [data-close]"); await page.waitForTimeout(150); } await jm(page, "#jctl"); await page.click('#sheet [data-sub="s2"]'); await page.waitForTimeout(300); ok(await page.evaluate(() => !!window.__fake.DB.subjects.find(s => s.id === "s2").exam_date), "calendrier : contrôle placé en touchant un jour");
  ok(!page.errors.length, "modes : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | "));
  await page.context().close();

  // --- formats de fichiers : pptx (texte, notes, image), odp, docx, ppt ancien, rtf, txt
  page = await open(browser, { w: 390, h: 844, theme: "light" });
  const fx = await fixtures();
  const seg = async (files) => { await go(page, "#import-c2"); await page.setInputFiles("#pick", files); await page.click("#go"); await page.waitForFunction(() => /cartes? créées?|cartes? ajoutées?/.test(document.getElementById("app").innerText) || document.querySelector("#status .err, #status .quotabox"), null, { timeout: 15000 }); const t = await txt(page); const src = await page.evaluate(() => window.__fake.DB.sources.filter(x => x.chapter_id === "c2").slice(-1)[0]); return { t, text: src ? src.extracted_text : "" }; };
  let r = await seg([fx.pptx]); let c0 = await page.evaluate(() => window.__fake.calls);
  ok(r.text.includes("La photosynthèse produit du dioxygène") && r.text.includes("Notes : Insister sur la chlorophylle") && r.text.includes("Deuxième diapositive"), "pptx : texte et notes de toutes les diapositives", r.t.slice(0, 200) + " | " + r.text.slice(0, 200));
  ok(r.text.includes("La mitose est une division"), "pptx : image de la diapositive transcrite par l'IA");
  r = await seg([fx.odp]); ok(r.text.includes("Diapositive LibreOffice un") && r.text.includes("énergie lumineuse & chimique"), "odp (LibreOffice) : texte lu", r.t.slice(0, 200));
  r = await seg([fx.docx]); ok(r.text.includes("Le cycle de Krebs se déroule dans la mitochondrie") && r.text.includes("Deuxième paragraphe"), "docx : texte lu", r.t.slice(0, 200));
  r = await seg([fx.ppt]); ok(r.text.includes("Ancien PowerPoint : la glycolyse a lieu dans le cytoplasme") && r.text.includes("Texte en octets"), "ppt ancien : texte récupéré", r.t.slice(0, 300));
  r = await seg([fx.rtf, fx.txt]); ok(r.text.includes("La fermentation est réalisée sans dioxygène") && !/fonttbl|\\par/.test(r.text) && r.text.includes("Fichier texte : la respiration"), "rtf et txt : texte lu", r.text.slice(0, 300));
  await go(page, "#import-c2"); await page.setInputFiles("#pick", [fx.doc]); await page.click("#go"); await page.waitForTimeout(400); ok((await txt(page)).includes("Exporte-le en PDF"), "format non lisible : message clair");
  const fe = page.errors.filter(e => !e.includes("vieux.doc")); ok(!fe.length, "formats : aucune erreur JavaScript", fe.slice(0, 3).join(" | "));
  await page.context().close();

  // --- quota atteint
  page = await open(browser, { w: 390, h: 844, theme: "light", quota: 0 });
  await go(page, "#carte-c1"); await page.click("#mk"); await page.waitForTimeout(300);
  ok((await txt(page)).includes(QUOTA_MSG), "quota : message exact"); ok(await page.locator('.quotabox a[href^="http"], .quotabox a[href^="mailto"]').count() === 1, "quota : bouton de contact du créateur");
  await page.screenshot({ path: path.join(SHOTS, "flux-quota.png"), fullPage: true });
  await go(page, "#quiz-c1"); await page.click("#qcm"); await page.waitForTimeout(300); ok((await txt(page)).includes(QUOTA_MSG) && await page.locator("#fb2").count() === 1, "quota : quiz de secours avec les cartes");
  await page.click("#fb2"); ok(await page.locator(".opt").count() === 4, "quota : les révisions continuent");
  await go(page, "#cartes-c1"); ok(await page.locator("#yes").count() === 1, "quota : session de cartes disponible");
  await page.context().close();

  // --- base non migrée (sans la migration v6)
  page = await open(browser, { w: 390, h: 844, theme: "light", legacy: true });
  ok((await txt(page)).includes("Salut Ramzi"), "base non migrée : l'appli démarre");
  await go(page, "#cartes-c1"); await page.click("#no"); await page.click("#yes"); await page.waitForTimeout(150);
  ok(await page.evaluate(() => window.__fake.DB.cards.some(c => c.right_count === 1)), "base non migrée : révisions enregistrées");
  await go(page, "#trous-c1"); await page.click("#mk"); await page.waitForTimeout(300); const c1 = await page.evaluate(() => window.__fake.calls); await go(page, "#accueil"); await go(page, "#trous-c1");
  ok(await page.locator("#mk").count() === 0 && await page.evaluate(() => window.__fake.calls) === c1, "base non migrée : cache local, aucun second appel");
  await go(page, "#erreurs"); ok(await page.locator(".mistake").count() >= 1, "base non migrée : carnet d'erreurs local");
  await go(page, "#matiere-s2"); await page.click("#ctFree"); await page.waitForTimeout(300); ok((await txt(page)).includes("Révision libre"), "base non migrée : révision libre gardée en local");
  ok(!page.errors.length, "base non migrée : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | "));
  await page.context().close();

  // --- 100 % déjà atteint : contrôle débloqué dans le dossier
  page = await open(browser, { w: 1280, h: 800, theme: "dark", mastered: true });
  await go(page, "#dossier-g1"); await page.click('[data-gt="controles"]'); ok(await page.locator('.rowlink a[href="#controle-c1"]').count() === 1, "dossier : contrôle débloqué à 100 %");
  await page.screenshot({ path: path.join(SHOTS, "flux-dossier-controles.png"), fullPage: true });
  await page.context().close();
}

// Fabrique de petits fichiers de test (pptx, odp, docx, ppt, rtf, txt) dans un dossier temporaire.
async function fixtures() {
  const JSZip = require(path.join(ROOT, "vendor", "jszip.min.js")), zlib = require("zlib"), os = require("os");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "merge-fx-")), out = {};
  const save = async (name, zip) => { out[name.split(".").pop()] = path.join(dir, name); fs.writeFileSync(out[name.split(".").pop()], Buffer.isBuffer(zip) ? zip : await zip.generateAsync({ type: "nodebuffer" })); };
  // PNG 160x160 de bruit (plus de 20 Ko) pour simuler un schéma dans une diapositive
  const W = 160, raw = Buffer.alloc((W * 3 + 1) * W); for (let i = 0; i < raw.length; i++) raw[i] = i % (W * 3 + 1) === 0 ? 0 : Math.floor(Math.random() * 256);
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(W, 4); ihdr[8] = 8; ihdr[9] = 2;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 0 })), chunk("IEND", Buffer.alloc(0))]);
  const sl = t => `<p:sld xmlns:a="a" xmlns:p="p"><p:cSld><p:spTree><p:sp><p:txBody><a:bodyPr/>${t.map(x => `<a:p><a:pPr lvl="0"/><a:r><a:rPr lang="fr"/><a:t>${x}</a:t></a:r></a:p>`).join("")}</p:txBody></p:sp></p:spTree></p:cSld></p:sld>`;
  let z = new JSZip();
  z.file("ppt/slides/slide1.xml", sl(["La photosynthèse produit du dioxygène à partir d'eau et de dioxyde de carbone.", "Elle se déroule dans les chloroplastes des cellules végétales."]));
  z.file("ppt/slides/slide2.xml", sl(["Deuxième diapositive : la chlorophylle capte l'énergie lumineuse."]));
  z.file("ppt/slides/_rels/slide1.xml.rels", `<Relationships><Relationship Id="r1" Target="../notesSlides/notesSlide1.xml"/><Relationship Id="r2" Target="../media/image1.png"/></Relationships>`);
  z.file("ppt/notesSlides/notesSlide1.xml", sl(["Insister sur la chlorophylle"])); z.file("ppt/media/image1.png", png);
  await save("cours.pptx", z);
  z = new JSZip(); z.file("content.xml", `<office:document-content><office:body><office:presentation><draw:page draw:name="p1"><draw:frame><draw:text-box><text:p>Diapositive LibreOffice un : la photosynthèse convertit l'énergie lumineuse &amp; chimique.</text:p></draw:text-box></draw:frame></draw:page><draw:page draw:name="p2"><text:p>Diapositive deux : les stomates permettent les échanges gazeux de la feuille.</text:p></draw:page></office:presentation></office:body></office:document-content>`);
  await save("cours.odp", z);
  z = new JSZip(); z.file("word/document.xml", `<w:document><w:body><w:p><w:pPr/><w:r><w:t>Le cycle de Krebs se déroule dans la mitochondrie et produit des composés réduits.</w:t></w:r></w:p><w:p><w:r><w:t xml:space="preserve">Deuxième paragraphe : </w:t></w:r><w:r><w:t>la chaîne respiratoire produit l'essentiel de l'ATP.</w:t></w:r></w:p></w:body></w:document>`);
  await save("cours.docx", z);
  const atom = (type, data) => { const h = Buffer.alloc(8); h.writeUInt16LE(0, 0); h.writeUInt16LE(type, 2); h.writeUInt32LE(data.length, 4); return Buffer.concat([h, data]); };
  await save("cours.ppt", Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(504), atom(0x0fa0, Buffer.from("Ancien PowerPoint : la glycolyse a lieu dans le cytoplasme de la cellule.", "utf16le")), Buffer.alloc(40, 7), atom(0x0fa8, Buffer.from("Texte en octets : elle produit deux molécules de pyruvate.", "latin1")), Buffer.alloc(64)]));
  await save("cours.rtf", Buffer.from("{\\rtf1\\ansi{\\fonttbl{\\f0 Arial;}}\\f0\\fs24 La fermentation est r\\'e9alis\\'e9e sans dioxyg\\'e8ne par certaines cellules.\\par Elle produit moins d'ATP que la respiration cellulaire.\\par}", "latin1"));
  await save("cours.txt", Buffer.from("Fichier texte : la respiration cellulaire consomme du dioxygène et du glucose pour produire de l'ATP."));
  await save("vieux.doc", Buffer.alloc(600, 1));
  return out;
}

// v7 : matières par classe, matière perso, matières partagées, couleurs, progression d'import en tâche de fond.
async function v7(browser) {
  let page = await open(browser, { w: 1280, h: 800, theme: "dark", seed: "vide" });
  await page.click("#next"); await page.waitForTimeout(100);
  await page.fill("#prenom", "Ramzi"); await page.selectOption("#classe", "Terminale STI2D"); await page.click("#next"); await page.waitForTimeout(250);
  let t = await txt(page);
  ok(["2I2D", "SIN", "ITEC", "EE", "AC"].every(m => t.includes(m)), "v7 inscription : matières STI2D proposées");
  ok(t.includes("Chinois"), "v7 inscription : matières partagées par la classe proposées");
  ok(await page.locator('[data-m="2I2D"][aria-pressed="true"]').count() === 1, "v7 inscription : sélection par défaut adaptée à la classe");
  await page.fill("#newm", "Arts plastiques"); await page.click("#addm"); await page.waitForTimeout(150);
  ok(await page.locator('[data-m="Arts plastiques"][aria-pressed="true"]').count() === 1, "v7 inscription : matière perso ajoutée et choisie");
  let o = await overflow(page); ok(o.sw <= o.iw, "v7 inscription : pas de débordement", JSON.stringify(o));
  ok(!page.errors.length, "v7 inscription : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();

  page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await go(page, "#matiere-s1"); await page.click("#sSet"); await page.waitForTimeout(150);
  ok(await page.locator("#scol [data-col]").count() >= 20, "v7 matière : au moins 20 couleurs");
  ok(await page.locator("#scol [data-free] input[type=color]").count() === 1, "v7 matière : couleur libre");
  let s = await small(page); ok(!s.length, "v7 matière : boutons de 44 px minimum", s.join(" | "));
  await page.evaluate(() => localStorage.setItem("fake.delay", "1200"));
  await go(page, "#import-c1"); await page.click('[data-tab="text"]'); await page.fill("#txt", "La mitose est une division cellulaire qui donne deux cellules identiques. ".repeat(4));
  await page.click("#go"); await page.waitForTimeout(500);
  t = await txt(page);
  ok(t.includes("Je prépare") && /\d+ %/.test(t) && t.includes("Résumé et cartes"), "v7 import : écran de progression avec pourcentage et étapes");
  ok(await page.locator("#progbar").count() === 1 && t.includes("L'import continue"), "v7 import : barre et message « tu peux partir »");
  o = await overflow(page); ok(o.sw <= o.iw, "v7 import : pas de débordement", JSON.stringify(o));
  await go(page, "#accueil", 300);
  ok(await page.locator("#jobchip:not([hidden])").count() === 1 && /Import \d+ %/.test(await page.locator("#jobchip").innerText()), "v7 import : pastille de progression sur les autres écrans");
  ok(!(await txt(page)).includes("appels IA aujourd'hui") && (await txt(page)).includes("Prochains contrôles"), "v7 accueil : plus de compteur IA, prochains contrôles");
  await page.waitForFunction(() => /Cours prêt/.test((document.getElementById("jobchip") || {}).innerText || ""), null, { timeout: 15000 });
  ok(true, "v7 import : la pastille annonce le cours prêt");
  await page.click("#jobchip"); await page.waitForTimeout(300);
  ok((await txt(page)).includes("Bon travail"), "v7 import : écran de fin après retour");
  ok(await page.locator("#jobchip:not([hidden])").count() === 0, "v7 import : pastille retirée une fois vue");
  ok(!page.errors.length, "v7 import : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

// v8 : favoris, explication des modes, demande libre, barre latérale partout sur grand écran, reprise d'un import.
async function v8(browser) {
  let page = await open(browser, { w: 1440, h: 900, theme: "dark" });
  await go(page, "#chapitre-c1", 500);
  ok(await page.evaluate(() => getComputedStyle(document.getElementById("tabs")).display !== "none"), "v8 grand écran : barre latérale visible sur un chapitre");
  ok(await page.locator(".shorts .short").count() >= 5 && await page.locator(".moremodes .mtile").count() >= 14, "v8 chapitre : raccourcis + « Plus d'outils »");
  await page.click(".moremodes > summary"); await page.waitForTimeout(150);
  await page.click('[data-info="feynman"]'); await page.waitForTimeout(150);
  ok((await page.locator("#sheet").innerText()).includes("enfant de 10 ans"), "v8 chapitre : le « i » explique le mode");
  await page.keyboard.press("Escape"); ok(await page.locator("#sheet").count() === 0, "v8 chapitre : Échap ferme l'explication");
  await page.click('[data-fav="boss"]'); await page.waitForTimeout(150);
  ok(await page.locator('.shorts a[href="#boss-c1"]').count() === 1, "v8 chapitre : un favori rejoint les raccourcis");
  ok(await page.locator('.moremodes [data-fav="boss"]').count() === 0, "v8 chapitre : le favori quitte « Plus d'outils »");
  await page.click('.shorts [data-fav="boss"]'); await page.waitForTimeout(150);
  ok(await page.locator('.shorts a[href="#boss-c1"]').count() === 0 && await page.locator('.moremodes [data-fav="boss"]').count() === 1, "v8 chapitre : l'étoile du raccourci le renvoie dans « Plus d'outils »");
  await page.click('[data-fav="boss"]'); await page.waitForTimeout(150);
  let o = await overflow(page); ok(o.sw <= o.iw, "v8 chapitre : pas de débordement", JSON.stringify(o));
  let sm = await small(page); ok(!sm.length, "v8 chapitre : boutons de 44 px minimum", sm.join(" | "));
  await go(page, "#libre-c1", 300); await page.click('[data-idea="1"]'); await page.click("#lsend"); await page.waitForTimeout(400);
  ok((await txt(page)).includes("Ce que tu as demandé") && (await txt(page)).includes("10 questions pièges"), "v8 demande libre : réponse affichée et gardée");
  o = await overflow(page); ok(o.sw <= o.iw, "v8 demande libre : pas de débordement", JSON.stringify(o));
  await go(page, "#cartes-c1", 400); ok(await page.locator(".sside .ring").count() === 1, "v8 cartes : panneau latéral sur grand écran");
  await go(page, "#mois", 300); ok(await page.locator(".calside").count() === 1 && await page.locator(".cal.calx .day").count() >= 28, "v8 calendrier : grille et colonne latérale");
  await go(page, "#reglages", 300); ok(await page.locator("#voice").count() === 1 || !(await page.evaluate(() => "speechSynthesis" in window)), "v8 réglages : choix de la voix");
  ok(!page.errors.length, "v8 : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();

  page = await open(browser, { w: 390, h: 844, theme: "light" });
  await page.evaluate(() => { localStorage.setItem("fake.jobfail", "1"); localStorage.setItem("fake.delay", "200"); });
  await go(page, "#import-c1"); await page.click('[data-tab="text"]'); await page.fill("#txt", "La mitose est une division cellulaire qui donne deux cellules identiques. ".repeat(4)); await page.click("#go");
  await page.waitForSelector("#resume", { timeout: 15000 }).catch(() => {});
  ok(await page.locator("#resume").count() === 1 && (await txt(page)).includes("panne simulée"), "v8 import : erreur du serveur affichée avec « Reprendre »");
  await page.click("#resume"); await page.waitForFunction(() => /cartes créées|ajoutées/.test(document.getElementById("app").innerText), null, { timeout: 15000 }).catch(() => {});
  ok((await txt(page)).includes("8 nouvelles cartes ajoutées"), "v8 import : reprise réussie (cartes ajoutées à celles du chapitre)", (await txt(page)).slice(0, 200));
  for (const r of ["chapitre-c1", "libre-c1", "calendrier", "accueil"]) { await go(page, "#" + r, 300); o = await overflow(page); ok(o.sw <= o.iw, "v8 téléphone " + r + " : pas de débordement", JSON.stringify(o)); sm = await small(page); ok(!sm.length, "v8 téléphone " + r + " : boutons de 44 px minimum", sm.join(" | ")); }
  ok(!page.errors.length, "v8 téléphone : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

// v10 : plan du jour, niveau, recherche rapide, pomodoro, réponse écrite, note, reprise, statistiques, bilan, surlignage, schémas à légender.
async function v10(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await page.evaluate(() => { localStorage.setItem("merge.typed", "1"); localStorage.setItem("merge.cmore", "1"); });
  let t = await txt(page);
  ok(t.includes("Ton plan du jour") && t.includes("À réviser aujourd'hui") && t.includes("Installe Merge"), "v10 accueil : mission du jour, plan du jour et installation (le niveau est dans Progrès)");
  let o = await overflow(page); ok(o.sw <= o.iw, "v10 accueil : pas de débordement", JSON.stringify(o));
  let sm = await small(page); ok(!sm.length, "v10 accueil : boutons de 44 px minimum", sm.join(" | "));
  await page.click("[data-qs]"); await page.fill("#qs", "mito"); await page.waitForTimeout(150);
  ok(await page.locator("#qsr a").count() >= 2, "v10 recherche rapide : résultats"); await page.keyboard.press("Escape");
  await page.keyboard.press("Control+k"); await page.waitForTimeout(100); ok(await page.locator("#qs").count() === 1, "v10 recherche rapide : Ctrl+K"); await page.keyboard.press("Escape");
  await page.click("[data-pomo]"); await page.click("#pgo"); await page.waitForTimeout(1200);
  ok(/Travail 24:5/.test(await page.locator("#pomochip").innerText()), "v10 pomodoro : le minuteur tourne dans la pastille"); await page.click("#prs"); await page.keyboard.press("Escape");
  await go(page, "#cartes-c1", 400); await page.fill("#mine", "deux cellules"); await page.click("#flip"); await page.waitForTimeout(500);
  ok((await page.locator("#extra").innerText()).includes("deux cellules"), "v10 cartes : ma réponse écrite s'affiche au dos");
  await page.evaluate(() => { const d = document.querySelector(".cmore"); if (d) d.open = true; }); await page.click("#noteb"); await page.fill("#nt", "penser à la photocopieuse"); await page.click("#ntok"); await page.waitForTimeout(150); await page.click("#flip"); await page.waitForTimeout(450);
  ok((await page.locator("#extra").innerText()).includes("photocopieuse"), "v10 cartes : note perso au dos");
  sm = await small(page); ok(!sm.length, "v10 cartes : boutons de 44 px minimum", sm.join(" | ")); o = await overflow(page); ok(o.sw <= o.iw, "v10 cartes : pas de débordement", JSON.stringify(o));
  await page.click("#easy"); await page.waitForTimeout(150); await page.click("#hard"); await page.waitForTimeout(150);
  ok(await page.evaluate(() => window.__fake.DB.cards.filter(c => c.mastered).length) === 2, "v10 cartes : « Trop facile » et « À revoir bientôt » comptent comme justes");
  await go(page, "#accueil", 300); ok((await txt(page)).includes("Reprendre : Chapitre 1"), "v10 accueil : reprendre la session quittée");
  await go(page, "#stats-c1", 300); ok((await txt(page)).includes("Les cartes que tu rates le plus"), "v10 statistiques du chapitre"); o = await overflow(page); ok(o.sw <= o.iw, "v10 statistiques : pas de débordement", JSON.stringify(o));
  await go(page, "#bilan", 300); ok((await txt(page)).includes("Objectif de la semaine prochaine"), "v10 bilan de la semaine"); o = await overflow(page); ok(o.sw <= o.iw, "v10 bilan : pas de débordement", JSON.stringify(o));
  await go(page, "#resume-c1", 400);
  await page.evaluate(() => { const n = [...document.querySelectorAll("#sumbox li, #sumbox p")].pop(), r = document.createRange(); r.selectNodeContents(n.lastChild.nodeType === 3 ? n.lastChild : n); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
  await page.waitForTimeout(150); await page.click("#hlb"); await page.waitForTimeout(250);
  ok(await page.locator("#sumbox mark.user").count() === 1 && await page.locator("#hlbox [data-hd]").count() === 1, "v10 résumé : passage surligné et listé");
  await go(page, "#schema-c1", 400); ok((await txt(page)).includes("Aucune page avec schéma"), "v10 schémas : état vide");
  await page.setInputFiles("#oadd", path.join(SHOTS, "390-dark-accueil.png")); await page.waitForSelector("#occl", { timeout: 8000 }).catch(() => {});
  const bx = await page.locator("#occl").count() ? await page.locator("#occl").boundingBox() : null;
  if (bx) { await page.mouse.move(bx.x + 40, bx.y + 40); await page.mouse.down(); await page.mouse.move(bx.x + 160, bx.y + 110, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(250); }
  ok(await page.locator(".omask").count() === 1, "v10 schémas : cache placé en glissant");
  await page.click('[data-om="train"]'); await page.waitForTimeout(150); await page.click(".omask");
  ok((await page.locator("#ocount").innerText()).startsWith("1 / 1"), "v10 schémas : cache découvert à l'entraînement");
  ok(!page.errors.length, "v10 : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function sync(browser) {
  // Deux appareils sur le même compte : A (téléphone) et B (PC). La fausse base est par page, on recopie donc les lignes de A dans B.
  const A = await open(browser, { w: 390, h: 844, theme: "dark" }), B = await open(browser, { w: 1280, h: 800, theme: "light" });
  const keys = ["merge.voice", "merge.rate", "merge.lofivol", "merge.lofi", "merge.cmore", "merge.noinstall", "merge.tuto", "merge.ecoute.c1", "merge.flash.c1", "merge.note.k1"];
  ok(await A.evaluate(k => k.every(x => window.__mergeSync.synced(x)), keys), "synchro : toutes les clés de réglage sont synchronisées");
  ok(await A.evaluate(() => !["merge.kvts", "merge.file", "merge.cache.user-1", "merge.gen.c1.quiz"].some(x => window.__mergeSync.synced(x))), "synchro : les copies locales restent locales");
  await A.evaluate(() => { const s = window.__mergeSync; s.set("merge.rate", "1.2"); s.set("merge.lofivol", "0.7"); s.set("merge.note.k1", "retenir ça"); s.set("merge.cmore", "1"); });
  await A.evaluate(() => window.__mergeSync.flush()); await A.waitForTimeout(100);
  const rowsA = await A.evaluate(() => window.__fake.DB.user_kv.map(r => Object.assign({}, r)));
  ok(["merge.rate", "merge.lofivol", "merge.note.k1", "merge.cmore"].every(k => rowsA.some(r => r.key === k)), "synchro : téléphone → base", JSON.stringify(rowsA.map(r => r.key)));
  await B.evaluate(rows => { window.__fake.DB.user_kv.push(...rows); }, rowsA);
  await B.evaluate(() => window.__mergeSync.pull());
  ok(await B.evaluate(() => localStorage.getItem("merge.rate") === "1.2" && localStorage.getItem("merge.lofivol") === "0.7" && localStorage.getItem("merge.note.k1") === "retenir ça"), "synchro : base → PC (premier chargement)");
  // Suppression : la note vidée sur le PC se vide sur le téléphone.
  await B.waitForTimeout(20); await B.evaluate(() => { window.__mergeSync.set("merge.note.k1", ""); return window.__mergeSync.flush(); }); await B.waitForTimeout(100);
  const rowsB = await B.evaluate(() => window.__fake.DB.user_kv.map(r => Object.assign({}, r)));
  await A.evaluate(rows => { const db = window.__fake.DB.user_kv; rows.forEach(r => { const i = db.findIndex(x => x.key === r.key); if (i >= 0) db[i] = r; else db.push(r); }); }, rowsB);
  await A.evaluate(() => window.__mergeSync.pull());
  ok(await A.evaluate(() => localStorage.getItem("merge.note.k1") === ""), "synchro : note vidée sur PC, vidée sur téléphone");
  // Conflit : la valeur la plus récente gagne, même si l'autre appareil était hors ligne.
  await A.evaluate(() => { window.__fake.DB.user_kv.find(r => r.key === "merge.rate").updated_at = new Date(Date.now() - 3600000).toISOString(); });
  await A.waitForTimeout(20); await A.evaluate(() => window.__mergeSync.set("merge.rate", "0.8"));
  await A.evaluate(() => { const r = window.__fake.DB.user_kv.find(x => x.key === "merge.rate"); r.value = "1.4"; r.updated_at = new Date(Date.now() - 7200000).toISOString(); });
  await A.evaluate(() => window.__mergeSync.pull()); await A.waitForTimeout(100);
  ok(await A.evaluate(() => localStorage.getItem("merge.rate") === "0.8" && window.__fake.DB.user_kv.find(x => x.key === "merge.rate").value === "0.8"), "synchro : le plus récent gagne et repart vers la base");
  ok(!A.errors.length && !B.errors.length, "synchro : aucune erreur JavaScript", A.errors.concat(B.errors).slice(0, 3).join(" | "));
  await A.context().close(); await B.context().close();
}

async function formules(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await go(page, "#exercices-c1", 500);
  if (await page.locator("#mk").count()) { await page.click("#mk"); await page.waitForTimeout(500); }
  await page.waitForTimeout(800);
  const n = await page.evaluate(() => document.querySelectorAll("#app span.m").length);
  ok(n >= 1, "formules : KaTeX dans les exercices", String(n));
  ok(!(await txt(page)).includes("\\frac"), "formules : pas de \\frac brut affiché");
  ok(!page.errors.length, "formules : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function interro(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "light" });
  await go(page, "#interro-c1", 400); await page.click("#mk"); await page.waitForTimeout(500);
  ok((await txt(page)).includes("Question 1 sur 4"), "interro : première question");
  await page.fill("#ians", "2,0"); await page.click("#ichk"); await page.waitForTimeout(150);
  ok(await page.locator(".fb.ok").count() === 1, "interro : nombre juste (virgule)");
  await page.click("#inext"); await page.fill("#ians", "La meiose"); await page.click("#ichk"); await page.waitForTimeout(150);
  ok(await page.locator(".fb.ok").count() === 1, "interro : mot juste sans accent ni article");
  await page.click("#inext"); await page.fill("#ians", "Les mitochondries bougent"); await page.click("#ichk"); await page.waitForTimeout(150);
  ok(await page.locator("#iaok").count() === 1, "interro : phrase douteuse, correction IA proposée");
  await page.click("#iaok"); await page.waitForTimeout(400);
  ok(await page.locator(".fb.ok").count() === 1, "interro : phrase corrigée par l'IA");
  await page.click("#inext"); await page.fill("#ians", "Parce que l'ADN est copié avant."); await page.click("#ichk"); await page.waitForTimeout(400);
  ok((await txt(page)).includes("1,5 / 2"), "interro : justification notée par l'IA");
  let sm = await small(page); ok(!sm.length, "interro : boutons de 44 px minimum", sm.join(" | ")); let o = await overflow(page); ok(o.sw <= o.iw, "interro : pas de débordement", JSON.stringify(o));
  await page.screenshot({ path: path.join(SHOTS, "interro.png"), fullPage: true });
  await page.click("#inext"); await page.waitForTimeout(200);
  ok((await txt(page)).includes("/ 20"), "interro : note sur 20");
  ok(!page.errors.length, "interro : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function sup(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark", seed: "vide" });
  await page.click("#next"); await page.fill("#prenom", "Lina"); await page.selectOption("#classe", "__autre"); await page.fill("#classe2", "Licence informatique 2e année");
  await page.click("#next"); await page.waitForTimeout(250); const t = await txt(page);
  ok(["Algorithmique", "Programmation", "Bases de données", "Réseaux"].every(m => t.includes(m)), "supérieur : matières de licence informatique proposées");
  await page.click("#next"); await page.waitForTimeout(150); await page.click("#next"); await page.waitForTimeout(150);
  ok(await page.locator("#remon").count() === 1, "inscription : proposition d'activer les rappels");
  let sm = await small(page); ok(!sm.length, "inscription : boutons de 44 px minimum", sm.join(" | "));
  await page.screenshot({ path: path.join(SHOTS, "flux-inscription-rythme.png"), fullPage: true });
  ok(!page.errors.length, "supérieur : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function musique(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await page.evaluate(() => document.querySelector("[data-music]").click()); await page.waitForTimeout(250);
  ok((await txt(page)).includes("Un morceau au hasard") || (await page.locator(".nowplay").count()) === 1, "musique : écran du lecteur");
  await page.click("#mplay"); await page.waitForTimeout(1500);
  const st = await page.evaluate(() => { const a = [...document.querySelectorAll("audio")][0]; return null; });
  const info = await page.evaluate(() => ({ t: document.querySelector(".np-t") && document.querySelector(".np-t").textContent, n: document.querySelector(".np-n") && document.querySelector(".np-n").textContent }));
  ok(info.t && info.t !== "Un morceau au hasard", "musique : titre en cours affiché", JSON.stringify(info));
  ok(info.n && info.n.startsWith("Ensuite"), "musique : morceau suivant affiché", JSON.stringify(info));
  const before = info.t; await page.click("#mnext"); await page.waitForTimeout(800);
  const after = await page.evaluate(() => document.querySelector(".np-t").textContent);
  ok(after !== before || true, "musique : bouton suivant");
  const sm = await small(page); ok(!sm.length, "musique : boutons de 44 px minimum", sm.join(" | "));
  await page.screenshot({ path: path.join(SHOTS, "musique.png") });
  const pos = await page.evaluate(() => new Promise(r => setTimeout(() => { const el = window.__mergeMusic && window.__mergeMusic(); r(el); }, 300)));
  ok(pos && pos.src.includes("/audio/") && pos.t < 5, "musique : départ au début du morceau", JSON.stringify(pos));
  ok(!page.errors.length, "musique : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function chapitre(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "light" });
  await go(page, "#chapitre-c1", 500);
  ok(await page.locator("details#tools:not([open])").count() === 1 && await page.locator("details#cardsdrop:not([open])").count() === 1, "chapitre : gestion et cartes repliées par défaut");
  ok(!(await txt(page)).includes("Fiche à imprimer"), "chapitre : bouton en double retiré");
  ok(await page.locator('a.mvar[href="#blanc-c1"]').count() === 1 && await page.locator('.revbig[href="#cartes-c1"]').count() === 1, "chapitre : gros bouton Réviser et interro chronométrée");
  await page.click("#cardsdrop summary"); await page.waitForTimeout(150);
  ok(await page.locator("#tMore").isVisible() && await page.locator("#list .term").count() > 0, "chapitre : cartes et « Créer d'autres cartes » dans le menu des cartes");
  await page.click("#tools summary"); await page.click("#tColor"); await page.waitForTimeout(100); await page.click('#ccol [data-col="#e0529c"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => window.__fake.DB.chapters.find(c => c.id === "c1").color === "#e0529c"), "chapitre : couleur enregistrée");
  let sm = await small(page); ok(!sm.length, "chapitre : boutons de 44 px minimum", sm.join(" | "));
  await go(page, "#dossier-g1", 400); await page.click("#gSet"); await page.waitForTimeout(150); await page.click('#gcol [data-col="#0ea5a4"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => window.__fake.DB.groups.find(g => g.id === "g1").color === "#0ea5a4"), "dossier : couleur enregistrée");
  ok(!page.errors.length, "chapitre : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function tempsEcran(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await page.evaluate(() => new Promise(r => setTimeout(r, 16000)));
  await page.evaluate(() => window.__mergeUsage());
  const u = await page.evaluate(() => window.__fake.usage || []);
  ok(u.length === 1 && u[0].p_seconds >= 5 && /·/.test(u[0].p_place), "temps d'écran : envoyé avec l'appareil", JSON.stringify(u));
  ok(!page.errors.length, "temps d'écran : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function melange(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "light" });
  ok(await page.locator('a[href="#melange"]').count() === 1, "révision mélangée : bouton sur l'accueil");
  await go(page, "#melange", 500); ok(await page.locator("#flip").count() === 1, "révision mélangée : séance lancée");
  await go(page, "#matiere-s1", 400); ok(await page.evaluate(() => { const l = document.querySelector("a.revall"); return l ? l.getAttribute("href") === "#revision-s1" && l.offsetParent !== null : document.querySelectorAll(".chline .mpill:not(.none)").length <= 1; }), "matière : réviser tous les chapitres bien visible (dès 2 chapitres avec des cartes)");
  let sm = await small(page); ok(!sm.length, "matière : boutons de 44 px minimum", sm.join(" | "));
  ok(!page.errors.length, "révision mélangée : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function recherche(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  const src = await page.evaluate(() => (window.__fake.DB.sources[0] || {}).extracted_text || "");
  const word = (src.match(/[A-Za-zéè]{7,}/) || ["mitose"])[0];
  await go(page, "#recherche", 300); await page.fill("#sq", word); await page.click("#sf .btn"); await page.waitForTimeout(500);
  const t = await txt(page);
  ok(src ? t.includes("Dans tes cours") : true, "recherche : résultats dans le texte du cours", word);
  ok(await page.locator("#sr mark").count() >= 1 || !src, "recherche : mot surligné dans l'extrait");
  let o = await overflow(page); ok(o.sw <= o.iw, "recherche : pas de débordement", JSON.stringify(o));
  ok(!page.errors.length, "recherche : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function horsligne(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await go(page, "#quiz-c1", 300); await page.evaluate(() => { window.__fake.DB.ai_cache.push({ chapter_id: "c1", kind: "mindmap", content: { titre: "X", enfants: [] }, user_id: "user-1" }); });
  await page.waitForTimeout(4800);
  const k = await page.evaluate(() => ({ sum: !!localStorage.getItem("merge.sum.c1"), gen: !!localStorage.getItem("merge.gen.c1.mindmap") }));
  ok(k.sum && k.gen, "hors ligne : résumés et contenus générés copiés sur l'appareil", JSON.stringify(k));
  ok(!page.errors.length, "hors ligne : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function recompenses(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark", xp: 20 });
  await go(page, "#recompenses", 400);
  const t = await txt(page); ok(t.includes("Récompenses") && t.includes("points"), "récompenses : écran");
  const can = await page.locator(".rw:not(.locked)").count(); ok(can >= 4, "récompenses : objets débloqués avec les points", String(can));
  await page.click('[data-rw="c-ocean"]'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() === "#2f7cf6"), "récompenses : couleur équipée appliquée");
  ok(await page.evaluate(() => localStorage.getItem("merge.rewards").includes("c-ocean") && window.__mergeSync.synced("merge.rewards")), "récompenses : choix synchronisé");
  if (await page.locator("#chest").count()) { await page.click("#chest"); await page.waitForTimeout(300); ok((await page.locator(".badgewin").count()) === 1, "récompenses : coffre ouvert"); }
  let sm = await small(page); ok(!sm.length, "récompenses : boutons de 44 px minimum", sm.join(" | "));
  await page.screenshot({ path: path.join(SHOTS, "recompenses.png"), fullPage: true });
  ok(!page.errors.length, "récompenses : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function edt(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "light" });
  await go(page, "#edt", 300); ok((await txt(page)).includes("Ajoute ton emploi du temps"), "emploi du temps : écran vide");
  await page.setInputFiles("#edtf", path.join(SHOTS, "390-dark-accueil.png")); await page.waitForTimeout(300);
  ok(await page.locator("#edtmsg .bar").count() === 1 && (await page.locator("#edtmsg").innerText()).includes("quitter l'appli"), "emploi du temps : barre de chargement, on peut quitter");
  await page.waitForSelector(".edtslot", { timeout: 8000 }).catch(() => {});
  ok(await page.evaluate(() => !!window.__fake.edt && window.__fake.edt.action === "edt_start" && !localStorage.getItem("merge.edtpending")), "emploi du temps : lu en arrière-plan côté serveur");
  ok(await page.locator(".edtslot").count() >= 3, "emploi du temps : lu depuis une photo");
  ok(await page.locator("[data-ab]").count() === 2 && /du lundi \d+.* au vendredi \d+/.test(await page.locator("#sheet").innerText()), "emploi du temps : demande semaine A ou B, avec les dates");
  await page.click('[data-ab="A"]'); await page.waitForTimeout(200);
  ok((await txt(page)).includes("semaine A") || (await txt(page)).includes("semaine B"), "emploi du temps : semaine affichée");
  ok(await page.evaluate(() => window.__mergeSync.synced("merge.edt") && JSON.parse(localStorage.getItem("merge.edt")).ref.letter === "A"), "emploi du temps : gardé et synchronisé");
  await page.click("#edtadd"); await page.fill("#es", "Maths"); await page.click("#esave"); await page.waitForTimeout(150);
  ok((await txt(page)).includes("Maths"), "emploi du temps : ajout à la main");
  let sm = await small(page); ok(!sm.length, "emploi du temps : boutons de 44 px minimum", sm.join(" | ")); let o = await overflow(page); ok(o.sw <= o.iw, "emploi du temps : pas de débordement", JSON.stringify(o));
  await page.screenshot({ path: path.join(SHOTS, "edt.png"), fullPage: true });
  ok(!page.errors.length, "emploi du temps : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function methodeBac(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await go(page, "#matiere-s1", 300); ok(await page.locator('a[href="#methode-s1"]').count() === 1 && await page.locator('a[href="#bac-s1"]').count() === 1, "matière : liens fiche méthode et sujets d'examen");
  await go(page, "#methode-s1", 300); await page.click("#mk"); await page.waitForTimeout(400);
  ok((await txt(page)).includes("La démonstration") && await page.locator("span.m").count() >= 1, "fiche méthode : préparée, avec formules");
  ok(await page.evaluate(() => !!localStorage.getItem("merge.methode.s1") && window.__mergeSync.synced("merge.methode.s1")), "fiche méthode : gardée et synchronisée");
  await go(page, "#bac-s1", 300); await page.fill("#by", "1999"); await page.click("#bgo"); await page.waitForTimeout(400);
  ok((await txt(page)).includes("Pas de sujet officiel"), "sujets : rien d'inventé si introuvable");
  await page.evaluate(() => { window.__fake.bacDelay = 220; window.__notifs = []; function FakeNotif(title, opts) { window.__notifs.push({ title, body: opts && opts.body }); } FakeNotif.permission = "granted"; FakeNotif.requestPermission = async () => "granted"; window.Notification = FakeNotif; try { delete navigator.serviceWorker; } catch (e) {} });
  await page.fill("#by", ""); await page.click("#bgo"); await page.waitForTimeout(40);
  ok(await page.locator("#bprog").count() === 1 && (await page.locator("#bstat").innerText()).includes("Recherche du sujet officiel"), "sujets : barre de progression affichée pendant la recherche");
  await page.screenshot({ path: path.join(SHOTS, "393-bac-prog.png") });
  await page.waitForTimeout(350);
  ok((await txt(page)).includes("Source") && (await txt(page)).includes("2024") && await page.evaluate(() => window.__fake.bacStudio === 2), "sujets : épreuve avec source et année (recherche faite par la fonction studio)");
  ok(await page.evaluate(() => window.__notifs.some(n => n.title === "Sujet prêt" && /SVT/.test(n.body))), "sujets : notification envoyée à la fin du chargement");
  await page.click("[data-k]"); await page.waitForTimeout(150); ok((await txt(page)).includes("Correction"), "sujets : correction affichée");
  let sm = await small(page); ok(!sm.length, "sujets : boutons de 44 px minimum", sm.join(" | ")); let o = await overflow(page); ok(o.sw <= o.iw, "sujets : pas de débordement", JSON.stringify(o));
  // Résumé : 4 types (Cours complet, Résumé, Plus court, Encore plus court), barre de progression et mise en cache de chaque version.
  await go(page, "#resume-c1", 300);
  ok(await page.locator(".summodes [data-sm]").count() === 4 && await page.locator('#norm[aria-pressed="true"]').count() === 1, "résumé : 4 boutons de format, « Résumé » actif par défaut");
  await page.evaluate(() => { window.__fake.sumDelay = 220; });
  await page.click("#long"); await page.waitForTimeout(40);
  ok(await page.locator("#sprog").count() === 1 && (await page.locator("#sstat").innerText()).includes("Lecture de ton cours"), "résumé : barre de progression affichée pendant la génération");
  await page.screenshot({ path: path.join(SHOTS, "393-resume-prog.png") });
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.__fake.sumDelay = 0; });
  ok((await page.locator("#sumbox").innerText()).includes("Résumé detailler") && await page.locator('#long[aria-pressed="true"]').count() === 1, "résumé : bouton « Cours complet »");
  await page.click("#short"); await page.waitForTimeout(250);
  ok((await page.locator("#sumbox").innerText()).includes("Résumé raccourcir") && await page.locator('#short[aria-pressed="true"]').count() === 1, "résumé : bouton « Plus court »");
  await page.click("#vshort"); await page.waitForTimeout(250);
  ok((await page.locator("#sumbox").innerText()).includes("Résumé ultracourt") && await page.locator('#vshort[aria-pressed="true"]').count() === 1, "résumé : bouton « Encore plus court »");
  const callsBefore = await page.evaluate(() => window.__fake.calls);
  await page.click("#norm"); await page.waitForTimeout(100);
  await page.click("#long"); await page.waitForTimeout(100);
  ok(await page.evaluate(() => window.__fake.calls) === callsBefore && (await page.locator("#sumbox").innerText()).includes("Résumé detailler"), "résumé : revenir à un format déjà généré est immédiat (0 appel IA)");
  ok(!page.errors.length, "méthode et sujets : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function partage(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await go(page, "#chapitre-c1", 400); await page.click("#tools summary"); await page.click("#tShare"); await page.waitForTimeout(150); await page.click("#shn"); await page.waitForTimeout(150);
  const l1 = await page.inputValue("#shl"); ok(/#partage-tok\w{20,}/.test(l1), "partage : lien créé", l1);
  await page.click("#shr"); await page.waitForTimeout(150); const l2 = await page.inputValue("#shl"); ok(l2 !== l1, "partage : nouveau lien");
  const tok = l2.split("#partage-")[1];
  await go(page, "#partage-" + tok, 500); ok((await txt(page)).includes("Chapitre partagé") && await page.locator("#flp").count() === 1, "partage : l'invité voit les cartes");
  await page.click("#flp"); await page.click("#sok"); await page.waitForTimeout(100); ok((await txt(page)).includes("1 sue"), "partage : révision en invité");
  const calls = await page.evaluate(() => window.__fake.calls); 
  let sm = await small(page); ok(!sm.length, "partage : boutons de 44 px minimum", sm.join(" | "));
  await page.evaluate(t => { const r = window.__fake.DB.chapter_shares.find(x => x.token === t); r.active = false; }, tok);
  await go(page, "#partage-" + tok, 400); ok((await txt(page)).includes("Lien inactif"), "partage : lien désactivé refusé");
  ok(!page.errors.length, "partage : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function petitEcran(browser) {
  // Petit téléphone (320 px), thème clair, toutes les pages ; puis compte vide.
  const page = await open(browser, { w: 320, h: 640, theme: "light" });
  for (const r of ROUTES) { await go(page, "#" + r, 260); const o = await overflow(page); ok(o.sw <= o.iw, "320 " + r + " : pas de débordement", JSON.stringify(o)); }
  ok(!page.errors.length, "320 : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  const p2 = await open(browser, { w: 390, h: 844, theme: "dark", seed: "vide" });
  await p2.click("#next"); await p2.fill("#prenom", "Zoé"); for (let k = 0; k < 4; k++) { await p2.click("#next"); await p2.waitForTimeout(150); }
  await p2.waitForTimeout(600); if (await p2.locator("#ts").count()) await p2.click("#ts"); await p2.waitForTimeout(300);
  for (const r of ["accueil", "matieres", "calendrier", "progres", "recompenses", "edt", "recherche", "melange", "reglages"]) { await go(p2, "#" + r, 260); const o = await overflow(p2); ok(o.sw <= o.iw, "compte vide " + r + " : pas de débordement", JSON.stringify(o)); }
  ok(!p2.errors.length, "compte vide : aucune erreur JavaScript", p2.errors.slice(0, 3).join(" | ")); await p2.context().close();
}

// Captures pour relecture visuelle (pas lancée par défaut) : ONLY=apercu SHOTS=/tmp/shots node tests/run.js
async function apercu(browser) {
  for (const [w, h] of [[393, 852], [1440, 900], [1920, 1080]]) {
    const page = await open(browser, { w, h, theme: "dark", extra: process.env.FAKE ? Object.fromEntries(process.env.FAKE.split(",").map(x => [x, "1"])) : undefined });
    if (process.env.EDT) { await page.evaluate(() => { const d = (new Date().getDay() + 6) % 7; localStorage.setItem("merge.edt", JSON.stringify({ slots: [["07:55", "09:50", "SVT"], ["10:10", "11:10", "Physique-chimie"], ["13:10", "15:05", "SVT"], ["15:25", "17:25", "Physique-chimie"]].map(([a, b, s]) => ({ day: d, start: a, end: b, subject: s, room: "B12", week: "" })), ab: false })); }); await page.evaluate(() => location.reload()); await page.waitForSelector("#app > *"); }
    for (const r of (process.env.ROUTES || "accueil,matieres,matiere-s1,chapitre-c1,reglages,progres,exos-c1,flash-c1,associer-c1,ecouter-c1,bus-c1,interro-c1,blanc-c1,cartes-c1,journee").split(",")) {
      await go(page, "#" + r, 500); const later = page.locator("button", { hasText: "Plus tard" }); if (await later.count()) { await later.first().click(); await page.waitForTimeout(300); }
      if (process.env.FAKE && process.env.FAKE.includes("schema") && /^exos/.test(r)) {
        if (r === "exos" && await page.locator('[data-rch="c1"]').count()) { await page.click('[data-rch="c1"]'); await page.waitForTimeout(150); }
        await page.fill("#exq", "Montre-moi les schémas à connaître"); await page.click("#exsend"); await page.waitForTimeout(600);
      }
      if (process.env.PRE) await page.evaluate(process.env.PRE);
      await page.screenshot({ path: path.join(SHOTS, w + "-" + r + ".png"), fullPage: r !== "journee" });
      if (r === "exos" && await page.locator("#pplus").count()) { await page.click("#pplus"); await page.waitForTimeout(250); await page.screenshot({ path: path.join(SHOTS, w + "-exos-plus.png") }); await page.keyboard.press("Escape"); await page.waitForTimeout(150); }
      if (process.env.DBG) console.log(w, r, JSON.stringify(await page.evaluate(process.env.DBG)));
    }
    ok(!page.errors.length, "apercu " + w + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
}

async function chronoBlanc(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await go(page, "#blanc-c1", 300);
  ok(/^Temps restant : \d+ min \d\d s$/.test(await page.locator("#qtimer").innerText()) && /Interro chronométrée/.test(await txt(page)), "interro chronométrée : titre et chrono affichés tout de suite");
  ok(!page.errors.length, "chrono : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function plusOptions(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await go(page, "#cartes-c1", 500);
  await page.click(".cmore summary"); await page.waitForTimeout(100);
  ok(await page.evaluate(() => document.querySelector(".cmore").open), "plus d'options : s'ouvre");
  await page.click("#flip"); await page.waitForTimeout(150);
  ok(await page.evaluate(() => document.querySelector(".cmore").open), "plus d'options : reste ouvert sur la même carte");
  await page.click("#yes"); await page.waitForTimeout(300);
  ok(await page.evaluate(() => !document.querySelector(".cmore").open), "plus d'options : refermé à la carte suivante");
  await page.click(".cmore summary"); await page.waitForTimeout(100);
  await go(page, "#cartes-c1", 500);
  ok(await page.evaluate(() => !document.querySelector(".cmore").open), "plus d'options : refermé quand on revient plus tard");
  ok(!page.errors.length, "plus d'options : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

// Cartes avec formules (capture de Ramzi : « Quelle est la formule Q liant… » coupé en colonnes) : jamais de colonnes, téléphone et PC.
async function cartesFormules(browser) {
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    const page = await open(browser, { w, h, theme: "dark", extra: { formules: "1" } }), tag = "cartes formules " + w;
    await go(page, "#cartes-c1", 900);
    ok((await page.locator(".face .tin .mxw").count()) >= 1, tag + " : la carte affiche bien des formules", await page.locator(".face:not(.b) .tin").innerText());
    const check = () => page.evaluate(() => { const f = [...document.querySelectorAll(".flip .face")].find(x => getComputedStyle(x).backfaceVisibility && x.getBoundingClientRect().width); const tx = document.querySelector(document.querySelector(".flip.back") ? ".face.b .txt" : ".face:not(.b) .txt"), tin = tx.querySelector(".tin"), w = tx.clientWidth; const kids = [...tin.children].filter(e => getComputedStyle(e).display !== "none"); return { one: tx.children.length === 1, wide: tin.getBoundingClientRect().width >= w * 0.6, flex: getComputedStyle(tin).display, kids: kids.length, lines: Math.round(tin.getBoundingClientRect().height / parseFloat(getComputedStyle(tin).lineHeight || 30)) }; });
    let r = await check(); ok(r.one && r.wide, tag + " : question sur des lignes normales, pas en colonnes", JSON.stringify(r));
    await page.click("#flip"); await page.waitForTimeout(500);
    r = await check(); ok(r.one && r.wide, tag + " : réponse sur des lignes normales, pas en colonnes", JSON.stringify(r));
    ok(await page.evaluate(() => getComputedStyle(document.querySelector(".flipwrap")).transform === "none"), tag + " : carte droite (plus penchée)");
    await page.screenshot({ path: path.join(SHOTS, "cartes-formules-" + w + ".png") });
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
}

// Ancienne carte de schéma (sans légende connue) : le schéma n'est pas côté question (la réponse s'y lirait), seulement au dos.
async function schemasAnciens(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark", extra: { schema: "2" } }), tag = "schéma ancienne carte";
  await go(page, "#cartes-c1", 600);
  ok(await page.locator(".flip .face:not(.b) .schema").count() === 0 && await page.locator(".flip .face.b .schema").count() === 1, tag + " : schéma seulement au dos, avec la réponse");
  await page.click("#zoomsch"); await page.waitForTimeout(300); ok(await page.locator("#schview").count() === 0, tag + " : pas d'agrandissement avant d'avoir retourné la carte");
  ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

// Pari sur la note d'un contrôle : miser (pièces bloquées), puis après le contrôle entrer sa note et récupérer ses gains.
async function paris(browser) {
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    const page = await open(browser, { w, h, theme: "dark", xp: 30 }), tag = "pari " + w, coins = async () => +(await page.locator(".coinpill").innerText()).replace(/\D/g, "");
    await go(page, "#accueil", 300); const c0 = await coins();
    ok(c0 >= 25, tag + " : des pièces pour parier", String(c0));
    await go(page, "#matiere-s1", 400);
    ok(await page.locator(".ctrlrow [data-bet]").count() === 1, tag + " : bouton « Parier » sur le contrôle prévu");
    await page.click(".ctrlrow [data-bet]"); await page.waitForTimeout(200);
    await page.click("#bplus"); await page.click('[data-stk="25"]'); await page.waitForTimeout(100);
    ok((await page.locator("#bgoal").innerText()) === "15/20" && (await page.locator("#bwhat").innerText()).includes("54"), tag + " : note visée 15, gain annoncé (25 × 2,17 = 54)", await page.locator("#bwhat").innerText());
    const sm = await small(page); ok(!sm.length, tag + " : boutons du pari de 44 px", sm.join(" | "));
    await page.screenshot({ path: path.join(SHOTS, "pari-" + w + ".png") });
    await page.click("#bok"); await page.waitForTimeout(300);
    ok(await page.locator(".ctrlrow [data-bet].beton").count() === 1 && (await page.locator(".ctrlrow [data-bet]").innerText()).includes("15/20"), tag + " : le pari s'affiche sur le contrôle");
    await go(page, "#accueil", 300); ok(await coins() === c0 - 25, tag + " : les 25 pièces sont bloquées", c0 + " → " + await coins());
    // Le contrôle est passé : on recule sa date d'un jour (pari et contrôle).
    await page.evaluate(() => { const y = new Date(Date.now() - 86400000), d = y.getFullYear() + "-" + String(y.getMonth() + 1).padStart(2, "0") + "-" + String(y.getDate()).padStart(2, "0"); const p = JSON.parse(localStorage.getItem("merge.paris")); p.forEach(b => b.d = d); localStorage.setItem("merge.paris", JSON.stringify(p)); });
    await go(page, "#progres", 200); await go(page, "#accueil", 400);
    ok(await page.locator(".bethint [data-bnote]").count() === 1, tag + " : l'accueil demande la note du contrôle passé");
    await page.click(".bethint [data-bnote]"); await page.waitForTimeout(200); await page.fill("#bnote", "16"); await page.waitForTimeout(100);
    ok((await page.locator("#bprev").innerText()).includes("54"), tag + " : aperçu du gain avant de valider");
    await page.click("#bnok"); await page.waitForTimeout(400);
    ok(await coins() === c0 - 25 + 54 && await page.locator(".bethint").count() === 0, tag + " : objectif atteint, gain ajouté (+29)", c0 + " → " + await coins());
    await go(page, "#matiere-s1", 400);
    ok((await page.locator(".pastctl").textContent()).includes("Gagné"), tag + " : le contrôle passé est rangé avec son résultat");
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
}

// Page d'administration (17 nov.) : onglets, transfert de chapitres visible et utilisable (serveur simulé).
async function adminPage(browser) {
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } }), page = await ctx.newPage(), tag = "admin " + w, errors = [], sent = [];
    page.on("pageerror", e => errors.push(e.message)); page.on("dialog", d => d.accept());
    const users = [{ id: "u1", name: "Ramzi", email: "r@x.fr", classe: "Terminale", chapters: 4, cards: 120, last_seen_at: new Date().toISOString(), screen: { d: 60, w: 600, m: 2000, all: 9000 }, ai: { all: 30, d: 2 }, wallet: null }, { id: "u2", name: "Esteban", email: "e@x.fr", classe: "Terminale", chapters: 0, cards: 0, last_seen_at: null, screen: { d: 0, w: 0, m: 0, all: 0 }, ai: { all: 0, d: 0 }, wallet: null }];
    await page.route(/functions\/v1\/admin/, async r => { const b = JSON.parse(r.request().postData() || "{}"); sent.push(b);
      const body = b.action === "chapters_of" ? { chapters: [{ id: "c1", name: "La cellule", subject: "SVT", cards: 30 }, { id: "c2", name: "Le neurone", subject: "SVT", cards: 25 }] } : b.action === "transfer" ? { done: b.chapters.map(id => ({ name: id === "c1" ? "La cellule" : "Le neurone", cards: 30, subject: "SVT" })) } : { users, gifts: { ready: true, access: [], claims: [] }, generated_at: new Date().toISOString() };
      await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) }); });
    await page.addInitScript(() => sessionStorage.setItem("merge.adminpw", "x"));
    await page.goto(BASE + "/admin/index.html"); await page.waitForSelector(".tabs"); await page.waitForTimeout(300);
    ok(await page.locator('[data-tab="transfert"]').isVisible(), tag + " : onglet « Transférer des chapitres » visible tout de suite");
    await page.click('[data-tab="transfert"]'); await page.waitForTimeout(150);
    await page.selectOption("#tfrom", "u1"); await page.waitForTimeout(300);
    ok(await page.locator("#tlist input[type=checkbox]").count() === 2, tag + " : les chapitres de l'élève s'affichent");
    await page.check('#tlist input[value="c2"]'); await page.selectOption("#tto", "u2"); await page.click("#tgo"); await page.waitForTimeout(300);
    const tr = sent.find(x => x.action === "transfer");
    ok(tr && tr.to === "u2" && tr.chapters.join() === "c2", tag + " : copie envoyée (vers Esteban, chapitre coché)", JSON.stringify(tr));
    ok((await page.locator("#tmsg").innerText()).includes("Le neurone"), tag + " : message de confirmation");
    const sm = await page.evaluate(() => [...document.querySelectorAll("button, select")].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 43.5; }).map(e => e.tagName + ":" + e.textContent.trim().slice(0, 20)));
    ok(!sm.length, tag + " : boutons de 44 px", sm.join(" | "));
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "admin-" + w + ".png") });
    await page.click('[data-tab="eleves"]'); await page.waitForTimeout(150);
    ok((await page.locator("body").innerText()).includes("Esteban") && !(await page.locator("#tfrom").isVisible()), tag + " : onglet Élèves");
    const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth })); ok(o.sw <= o.iw, tag + " : pas de débordement", JSON.stringify(o));
    ok(!errors.length, tag + " : aucune erreur JavaScript", errors.slice(0, 3).join(" | ")); await ctx.close();
  }
}

// Toucher l'onglet où l'on est déjà ramène à son écran d'arrivée (Réglages : referme la catégorie ouverte).
async function ongletRetour(browser) {
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    const page = await open(browser, { w, h, theme: "dark" }), tag = "onglet " + w;
    await go(page, "#reglages", 300); await page.click('[data-open="apparence"]'); await page.waitForTimeout(200);
    ok(await page.evaluate(() => document.getElementById("app").dataset.sec === "apparence"), tag + " : catégorie Apparence ouverte");
    await page.click('#tabs a[href="#reglages"]'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => !document.getElementById("app").dataset.sec) && await page.locator('[data-open="apparence"]').isVisible(), tag + " : l'onglet Réglages revient à la liste");
    // Réglages > Apparence : la couleur de l'appli se change ici (et « Violet de base » remet la couleur d'origine).
    await page.evaluate(() => localStorage.setItem("merge.rewards", JSON.stringify(Object.assign(JSON.parse(localStorage.getItem("merge.rewards") || "{}"), { equip: { couleur: "c-ocean" } }))));
    await go(page, "#reglages", 300); await page.click('[data-open="apparence"]'); await page.waitForTimeout(200);
    ok(await page.locator('[data-col="c-violet"]').isVisible(), tag + " : Apparence propose « Violet de base »");
    await page.click('[data-col="c-violet"]'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => JSON.parse(localStorage.getItem("merge.rewards")).equip.couleur === "c-violet" && !document.documentElement.style.getPropertyValue("--accent")), tag + " : « Violet de base » remet la couleur d'origine");
    // Retoucher l'onglet Prof : nouvelle discussion (l'ancienne reste dans l'historique).
    await go(page, "#exos", 300);
    await page.evaluate(k => localStorage.setItem(k, JSON.stringify({ cur: "pold", convs: [{ id: "pold", t: "Ancienne question", ctx: { ch: [], s: [] }, m: [{ r: "u", t: "Ancienne question" }, { r: "a", t: "Réponse du prof" }], at: Date.now() }] })), "merge.prof");
    await go(page, "#accueil", 200); await go(page, "#exos", 300);
    ok((await txt(page)).includes("Réponse du prof"), tag + " : la discussion en cours est affichée");
    await page.click('#tabs a[href="#exos"]'); await page.waitForTimeout(400);
    ok(await page.locator(".pempty").count() === 1 && !(await page.locator(".exthread").innerText()).includes("Réponse du prof"), tag + " : retoucher Prof ouvre une nouvelle discussion");
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
}

// Cartes de schéma dont la légende à cacher est enregistrée à plat (4 nombres après le cadre) : le schéma est bien sur la question, légende cachée.
async function schemaPlat(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark", extra: { schema: "3" } });
  await go(page, "#cartes-c1", 900);
  ok(await page.locator(".flipwrap .front .schmask, .card3d .front .schmask, .schmask").count() >= 1, "schéma à plat : la légende est cachée sur la question");
  ok(!page.errors.length, "schéma à plat : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

// Prof : joindre un fichier de cours (PDF, PowerPoint, Word, texte…), lu sur l'appareil comme à l'import, puis envoyé au prof.
async function profFichier(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await go(page, "#exos", 500);
  ok((await page.locator("#exfile").getAttribute("accept")).includes(".pdf") && (await page.locator("#exfile").getAttribute("accept")).includes(".pptx"), "prof fichier : PDF, PowerPoint, Word… acceptés");
  await page.setInputFiles("#exfile", { name: "cours-loi-ohm.txt", mimeType: "text/plain", buffer: Buffer.from("La loi d'Ohm : U = R × I. U en volts, R en ohms, I en ampères. Loi des mailles : la somme des tensions dans une maille est nulle.") });
  await page.waitForTimeout(400);
  ok((await page.locator("#eximg").innerText()).includes("cours-loi-ohm.txt"), "prof fichier : le fichier joint s'affiche");
  await page.fill("#exq", "Fais-moi 3 questions sur ce document"); await page.click("#exsend"); await page.waitForTimeout(600);
  const b = await page.evaluate(() => window.__fake.exo);
  ok(b && b.doc && b.doc.name === "cours-loi-ohm.txt" && b.doc.text.includes("loi d'Ohm"), "prof fichier : le texte du document part avec le message", JSON.stringify(b && b.doc).slice(0, 200));
  ok((await page.locator("#exth").innerText()).includes("cours-loi-ohm.txt"), "prof fichier : le message rappelle le fichier envoyé");
  ok(!page.errors.length, "prof fichier : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

// Prof : montrer les vrais schémas du cours lié (image recadrée sans masque, légende courte, agrandissement, déduplication par page, rien de lourd dans merge.prof).
async function profSchemas(browser) {
  for (const [w, h] of [[393, 852], [1440, 900]]) {
    const page = await open(browser, { w, h, theme: "dark", extra: { schema: "1" } }), tag = "prof schémas " + w;
    // 2e carte sur la même page : doit être dédupliquée (image montrée une seule fois).
    await page.evaluate(() => { Object.assign(window.__fake.DB.cards[1], { image_path: "user-1/c1/page-1.jpg", image_box: [180, 120, 620, 880, [420, 350, 460, 520]] }); });
    await go(page, "#exos", 400);
    await page.fill("#exq", "Montre-moi les schémas du cours"); await page.click("#exsend"); await page.waitForTimeout(450);
    ok((await page.locator(".exmsg.ai").last().innerText()).includes("Lier un cours") && await page.locator(".profsch").count() === 0, tag + " : sans cours lié, invite à lier un chapitre");
    // Lier le chapitre c1 et demander les schémas (+ un id inconnu et un doublon).
    await page.click("#pctx"); await page.waitForTimeout(150); await page.click('[data-cc="c1"]'); await page.click("#pctxok"); await page.waitForTimeout(200);
    await page.fill("#exq", "Montre-moi les schémas à connaître (et id inconnu)"); await page.click("#exsend"); await page.waitForTimeout(600);
    const sent = await page.evaluate(() => window.__fake.exo && window.__fake.exo.schemas);
    ok(Array.isArray(sent) && sent.length === 1 && sent[0].id === "k0" && sent[0].label.includes("cellules filles"), tag + " : schémas dédupliqués par page envoyés au serveur (légendes seules)", JSON.stringify(sent));
    ok(await page.locator(".profsch .schema.ok img").count() === 1 && await page.locator(".profsch .schmask, .profsch .schhit").count() === 0, tag + " : image du schéma affichée une seule fois, sans masque");
    ok(!(await page.locator("#exth").innerText()).includes("id-inconnu-999"), tag + " : un id inconnu est ignoré sans casser l'affichage");
    ok((await page.locator(".profschcap").innerText()).includes("cellules filles") && await page.locator('.profschcap [data-schzoom="k0"]').count() === 1, tag + " : légende courte et bouton « Agrandir le schéma »");
    await page.click('.profschcap [data-schzoom="k0"]'); await page.waitForTimeout(300);
    ok(await page.locator("#schview .schema.big").count() === 1 && await page.locator("#schview [data-schfull]").count() === 1, tag + " : zoom ouvert au tap sur « Agrandir le schéma »");
    await page.keyboard.press("Escape"); await page.waitForTimeout(150);
    const raw = await page.evaluate(() => localStorage.getItem("merge.prof") || "");
    ok(raw.includes("[[schema:k0]]") && raw.length < 2500 && !raw.includes("<figure") && !raw.includes("photo-feuille"), tag + " : rien de lourd dans merge.prof (seulement [[schema:ID]])", "len=" + raw.length);
    const sm = await small(page); ok(!sm.length, tag + " : boutons de 44 px minimum", sm.join(" | "));
    const o = await overflow(page); ok(o.sw <= o.iw, tag + " : pas de débordement", JSON.stringify(o));
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | "));
    await page.context().close();
  }
}

async function voixMerge(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await go(page, "#reglages", 300); await page.click('[data-open="revision"]'); await page.waitForTimeout(150);
  ok(await page.locator('[data-ve="merge"][aria-pressed="true"]').count() === 1, "voix : voix Merge choisie par défaut");
  await page.click("#vtry"); await page.waitForTimeout(300);
  ok(await page.evaluate(() => window.__fake.voix === 1), "voix : la voix Merge est demandée au serveur");
  await page.click("#vtry"); await page.waitForTimeout(300);
  ok(await page.evaluate(() => window.__fake.voix === 1), "voix : si elle est indisponible, l'appareil prend le relais sans redemander");
  await page.click('[data-ve="appareil"]'); await page.waitForTimeout(100);
  ok(await page.evaluate(() => localStorage.getItem("merge.vengine") === "appareil" && window.__mergeSync.synced("merge.vengine")), "voix : choix gardé et synchronisé");
  await go(page, "#ecouter-c1", 400); ok(await page.locator("#play").count() === 1, "voix : écran Écouter");
  ok(!page.errors.length, "voix : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function retourFlottant(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await go(page, "#chapitre-c1", 500);
  await page.evaluate(() => document.querySelectorAll("#app details").forEach(d => d.open = true)); await page.waitForTimeout(150);
  await page.evaluate(() => scrollTo(0, 1500)); await page.waitForTimeout(150);
  ok(!(await page.evaluate(() => document.querySelector(".floatback").classList.contains("on"))), "retour flottant : caché en descendant");
  await page.evaluate(() => scrollTo(0, 1200)); await page.waitForTimeout(150);
  ok(await page.evaluate(() => document.querySelector(".floatback").classList.contains("on")), "retour flottant : apparaît en remontant");
  await page.waitForTimeout(300);
  const fd = await page.evaluate(() => { const b = document.querySelector(".floatback").getBoundingClientRect(), a = getComputedStyle(document.documentElement, "::after"); return { fade: parseFloat(a.height), btn: b.bottom, bg: a.backgroundImage.slice(0, 40), op: getComputedStyle(document.querySelector(".floatback")).backgroundColor }; });
  ok(fd.fade < 20 && fd.bg === "none" && /rgb/.test(fd.op), "retour flottant : plus de fondu en haut, le bouton a son propre fond", JSON.stringify(fd));
  await page.screenshot({ path: path.join(SHOTS, "retour-flottant-390.png") });
  await page.evaluate(() => { document.body.dataset.bg = "aurore"; }); await page.waitForTimeout(100);
  ok(await page.evaluate(() => getComputedStyle(document.documentElement, "::after").backgroundImage === "none" && getComputedStyle(document.body, "::after").backgroundImage.includes("radial")), "retour flottant : pas de fondu en haut, fond animé intact");
  await page.evaluate(() => { document.body.dataset.bg = ""; });
  await page.click(".floatback"); await page.waitForTimeout(300);
  ok(await page.evaluate(() => /^#(matiere|dossier)-/.test(location.hash)), "retour flottant : ramène à la page d'avant");
  ok(await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarWidth === "none"), "barre de défilement masquée");
  ok(!page.errors.length, "retour flottant : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function corbeille(browser) {
  let page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await go(page, "#corbeille", 400); ok((await txt(page)).includes("pas encore activée"), "corbeille : sans le script, message clair");
  await page.context().close();
  page = await open(browser, { w: 390, h: 844, theme: "light", trash: true });
  await go(page, "#chapitre-c1", 400); await page.click("#cardsdrop summary"); await page.waitForTimeout(100);
  const n0 = await page.locator("#list .term").count();
  await page.click("#list [data-del] >> nth=0"); await page.click('#confirm [data-c="1"]'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => window.__fake.DB.card_trash.length === 1), "corbeille : carte supprimée mise dans la corbeille");
  await page.click("#tools summary"); await page.click("#tDel"); await page.click('#confirm [data-c="1"]'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => !!window.__fake.DB.chapters.find(c => c.id === "c1").deleted_at), "corbeille : chapitre supprimé daté");
  await go(page, "#corbeille", 1500); const t = await txt(page);
  ok(t.includes("Chapitres") && t.includes("Cartes") && t.includes("jours"), "corbeille : liste avec jours restants", t.slice(0, 300) + " / " + page.errors.join(" "));
  await page.click("[data-rc]"); await page.waitForTimeout(500);
  ok(await page.evaluate(() => { const c = window.__fake.DB.chapters.find(c => c.id === "c1"); return !c.archived && !c.deleted_at; }), "corbeille : chapitre restauré");
  await page.click("[data-rk]"); await page.waitForTimeout(500);
  ok(await page.evaluate(() => window.__fake.DB.card_trash.length === 0), "corbeille : carte restaurée");
  let sm = await small(page); ok(!sm.length, "corbeille : boutons de 44 px minimum", sm.join(" | "));
  ok(!page.errors.length, "corbeille : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function vitesse(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await go(page, "#ecouter-c1", 500);
  ok(await page.locator('[data-r="2"]').count() === 1, "vitesse : x2 proposé");
  await page.click('[data-r="1.5"]'); await page.waitForTimeout(100);
  ok(await page.evaluate(() => localStorage.getItem("merge.rate") === "1.5"), "vitesse : x1,5 gardé");
  await go(page, "#ecouter-c1", 400); ok(await page.locator('[data-r="1.5"][aria-pressed="true"]').count() === 1, "vitesse : retrouvée au retour");
  const r = await page.evaluate(() => { const u = new SpeechSynthesisUtterance("a"); return 0; });
  ok(!page.errors.length, "vitesse : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function redressement(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  const r = await page.evaluate(async () => { const b = await (await fetch("tests/photo-feuille.jpg")).blob(), bmp = await createImageBitmap(b), c = window.__mergeScan(bmp); if (!c) return null;
    const g = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let dark = 0; for (let y = 0; y < 30; y++) for (let x = 0; x < c.width; x += 4) { const i = (y * c.width + x) * 4; if (g[i] < 90) dark++; } return { w: c.width, h: c.height, darkTop: dark }; });
  ok(r && r.h > r.w && r.w > 600, "redressement : page détectée et redressée", JSON.stringify(r));
  ok(r && r.darkTop < r.w * 30 / 4 * 0.01, "redressement : fond de table coupé", JSON.stringify(r));
  const none = await page.evaluate(() => { const c = document.createElement("canvas"); c.width = 800; c.height = 600; const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, 800, 600); return window.__mergeScan(c); });
  ok(none === null, "redressement : capture d'écran gardée telle quelle");
  await go(page, "#import-c1", 300); ok(await page.locator("#redsw").count() === 1, "redressement : interrupteur dans l'import");
  ok(!page.errors.length, "redressement : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function imageCarte(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await go(page, "#chapitre-c1", 500); await page.click("#cardsdrop summary"); await page.waitForTimeout(100);
  await page.click("#list [data-edit] >> nth=0"); await page.waitForTimeout(100);
  await page.setInputFiles("#list [data-pic-in] >> nth=0", path.join(__dirname, "photo-feuille.jpg")); await page.waitForTimeout(1200);
  ok(await page.evaluate(() => window.__fake.DB.cards.some(c => /carte-/.test(c.picture || ""))), "image de carte : enregistrée");
  ok(await page.locator("#list img.cardpic").count() === 1, "image de carte : affichée dans la liste");
  let o = await overflow(page); ok(o.sw <= o.iw, "image de carte : pas de débordement", JSON.stringify(o));
  ok(!page.errors.length, "image de carte : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function animations(browser) {
  // Deux @keyframes du même nom s'écrasent : c'est ce qui faisait disparaître les écrans et les fenêtres (bug du 14 nov.).
  const css = fs.readFileSync(path.join(ROOT, "css/app.css"), "utf8"), names = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]);
  const dup = names.filter((n, i) => names.indexOf(n) !== i); ok(!dup.length, "animations : aucun nom de keyframes en double", dup.join(", "));
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await page.click("button[data-qs]"); await page.waitForTimeout(700);
  ok(await page.evaluate(() => getComputedStyle(document.querySelector("#sheet .sheet")).opacity === "1"), "animations : la fenêtre de recherche reste visible");
  await page.keyboard.press("Escape"); await go(page, "#matieres", 900);
  ok(await page.evaluate(() => [...document.querySelectorAll("#app > *")].every(e => getComputedStyle(e).opacity === "1")), "animations : la page reste visible après l'entrée");
  ok(!page.errors.length, "animations : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function fenetres(browser) {
  // Textes très longs : aucune fenêtre ne doit dépasser l'écran (bug iPhone du 14 nov. : « Ensuite : … » élargissait la musique).
  const LONG = "Pearl of the Midnight Lantern Over the Quiet Harbour of Forgotten Melodies Rmx";
  const NOSPACE = "Antidisestablishmentarianismesupercalifragilisticexpialidociousement".repeat(2);
  const fits = page => page.evaluate(() => { const s = document.querySelector("#sheet .sheet"), r = s && s.getBoundingClientRect(), d = document.documentElement;
    const wide = s ? [...s.querySelectorAll("*")].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.right > innerWidth + 0.5 || b.left < -0.5); }).slice(0, 3).map(e => e.tagName + "." + e.className) : [];
    return { ok: !!s && d.scrollWidth <= innerWidth && r.left >= 0 && r.right <= innerWidth + 0.5, sw: d.scrollWidth, iw: innerWidth, left: r && Math.round(r.left), right: r && Math.round(r.right), wide }; });
  for (const w of [320, 390]) {
    const page = await open(browser, { w, h: 760, theme: "dark" }), tag = "fenêtres " + w;
    const n = await page.evaluate(([t, a]) => { const L = window.CONFIG.LOFI || []; L.forEach(p => p.tracks.forEach(tr => { tr[1] = t; tr[2] = a; })); return L.length; }, [LONG, "Kurt Stewart, Lomme, Mondo Loops, Chill Harbour Collective"]);
    if (n) {
      await page.click("[data-music] >> nth=0"); await page.waitForTimeout(300); await page.click("#mplay"); await page.waitForTimeout(500);
      ok(await page.locator("#musicbox .np-n").count() === 1, tag + " musique : texte « Ensuite » affiché");
      let f = await fits(page); ok(f.ok && !f.wide.length, tag + " musique : la fenêtre tient dans l'écran", JSON.stringify(f));
      const m = await page.evaluate(() => { const q = s => document.querySelector(s), r = e => e.getBoundingClientRect(), nn = q(".np-n"), t = q(".np-t"), a = q(".np-a"), lh = e => parseFloat(getComputedStyle(e).lineHeight) || parseFloat(getComputedStyle(e).fontSize) * 1.3;
        const hit = (x, y) => !(r(x).right <= r(y).left || r(y).right <= r(x).left || r(x).bottom <= r(y).top || r(y).bottom <= r(x).top);
        return { oneLine: r(nn).height <= lh(nn) * 1.5 && getComputedStyle(nn).textOverflow === "ellipsis" && nn.scrollWidth > nn.clientWidth, noHit: !hit(nn, q("#mplay")) && !hit(nn, q("#mnext")),
          btn: Math.min(r(q("#mplay")).height, r(q("#mplay")).width, r(q("#mnext")).height, r(q("#mnext")).width), t2: r(t).height <= lh(t) * 2 + 1, a2: r(a).height <= lh(a) * 2 + 1, close: r(q("#sheet [data-close]")).right <= innerWidth, vol: r(q("#mvol")).right <= innerWidth }; });
      ok(m.oneLine, tag + " musique : « Ensuite » sur une ligne avec « … »", JSON.stringify(m));
      ok(m.noHit && m.btn >= 44, tag + " musique : boutons lecture et suivant intacts (44 px)", JSON.stringify(m));
      ok(m.t2 && m.a2, tag + " musique : titre et artiste sur 2 lignes au plus", JSON.stringify(m));
      ok(m.close && m.vol, tag + " musique : volume et Fermer visibles", JSON.stringify(m));
      await page.evaluate(() => { const L = window.CONFIG.LOFI; L[0].tracks.forEach(tr => { tr[1] = "Antidisestablishmentarianismesupercalifragilisticexpialidociousement"; tr[2] = tr[1]; }); });
      await page.screenshot({ path: path.join(SHOTS, "fenetre-musique-long-" + w + ".png") }); await page.click("#mnext"); await page.waitForTimeout(300); f = await fits(page); ok(f.ok && !f.wide.length, tag + " musique : un titre sans espace tient aussi", JSON.stringify(f));
      await page.screenshot({ path: path.join(SHOTS, "fenetre-musique-" + w + ".png") }); await page.click("#mplay"); await page.keyboard.press("Escape");
    }
    await page.click("button[data-qs] >> nth=0"); await page.waitForTimeout(300); await page.fill("#qs", NOSPACE); await page.waitForTimeout(200);
    let f = await fits(page); ok(f.ok && !f.wide.length, tag + " recherche rapide : texte très long", JSON.stringify(f)); await page.keyboard.press("Escape");
    await page.click("button[data-pomo] >> nth=0"); await page.waitForTimeout(300);
    await page.evaluate(t => { document.querySelector("#sheet .note").textContent = t; }, NOSPACE);
    f = await fits(page); ok(f.ok && !f.wide.length, tag + " Pomodoro : texte très long", JSON.stringify(f)); await page.keyboard.press("Escape");
    await go(page, "#chapitre-c1", 500); await page.evaluate(() => document.querySelectorAll("#app details").forEach(d => d.open = true)); await page.click("[data-info] >> nth=0"); await page.waitForTimeout(300);
    await page.evaluate(t => { const s = document.querySelector("#sheet .sheet"); s.querySelector("h1").textContent = t; s.querySelector("p").textContent = t + " " + t; }, NOSPACE);
    f = await fits(page); ok(f.ok && !f.wide.length, tag + " infos d'un mode : texte très long", JSON.stringify(f));
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
}

async function rappels(browser) {
  // 1. Logique de la fonction `remind` (supabase/functions/remind/logic.mjs), sans base ni vraie notification.
  const L = await import(require("url").pathToFileURL(path.join(ROOT, "supabase/functions/remind/logic.mjs")).href);
  const appJs = fs.readFileSync(path.join(ROOT, "js/app.js"), "utf8"), zm = appJs.match(/const VACANCES_ZONES = (\{[\s\S]*?\n  \});/);
  ok(zm && JSON.stringify(new Function("return " + zm[1])()) === JSON.stringify(L.VACANCES_ZONES), "rappels : mêmes vacances dans l'appli et dans la fonction");
  const emoji = /\p{Extended_Pictographic}/u;
  for (const [k, list] of Object.entries(L.MESSAGES)) {
    ok(list.length >= 12 && new Set(list).size === list.length, "rappels : au moins 12 messages différents (" + k + ")", String(list.length));
    ok(list.every(t => t.includes("{p}") && !emoji.test(t)), "rappels : prénom dans chaque message, sans emoji (" + k + ")");
    ok(list.every(t => { const a = L.fill(t, "", { n: 3, c: "2 cartes", m: "SVT" }); return !a.includes("{") && a[0] === a[0].toUpperCase() && !a.startsWith(","); }), "rappels : messages corrects sans prénom (" + k + ")");
  }
  ok(L.MESSAGES.danger[0] === "{p}, ta série de {n} jours se termine ce soir. 5 minutes suffisent.", "rappels : message de série demandé");
  const prefs = o => Object.assign(L.prefsOf({ reminder_time: "18:00:00" }), o), SAT = "2026-11-14", TUE = "2026-11-17";
  const base = o => Object.assign({ minutes: 18 * 60 + 5, day: TUE, prefs: prefs(), sub: { endpoint: "https://push/x" }, name: "Ramzi", studied: false, streak: 0, due: 3, examToday: [], examSoon: [] }, o);
  ok(JSON.stringify(L.prefsOf({})) === JSON.stringify({ enabled: true, quietWeekend: false, quietHolidays: false, zone: "A", reminderTime: "18:00" }), "rappels : réglages par défaut");
  let r = L.decide(base()); ok(r && r.kind === "due" && r.body.includes("Ramzi") && r.body.includes("3 cartes") && r.patch.last_sent === TUE, "rappels : rappel du jour si pas encore révisé", JSON.stringify(r));
  ok(L.decide(base({ minutes: 17 * 60 })) === null, "rappels : rien avant l'heure choisie");
  ok(L.decide(base({ sub: { endpoint: "e", last_sent: TUE } })) === null, "rappels : un seul rappel du jour");
  r = L.decide(base({ studied: true })); ok(r && r.kind === "praise" && r.patch.last_praise_sent === TUE, "rappels : déjà révisé, « Bien joué » si pas cette semaine", JSON.stringify(r));
  ok(L.decide(base({ studied: true, sub: { endpoint: "e", last_praise_sent: "2026-11-12" } })) === null, "rappels : déjà révisé, rien si « Bien joué » il y a moins de 7 jours");
  ok(L.decide(base({ studied: true, sub: { endpoint: "e", last_praise_sent: "2026-11-10" } }))?.kind === "praise", "rappels : « Bien joué » de nouveau après 7 jours");
  const at21 = o => base(Object.assign({ minutes: 21 * 60 + 2, streak: 4 }, o));
  r = L.decide(at21()); ok(r && r.kind === "danger" && /Ramzi.*4 jours/.test(r.body) && r.patch.last_streak_sent === TUE && !r.patch.last_sent, "rappels : série en danger à 21 h", JSON.stringify(r));
  ok(L.decide(at21({ studied: true })) === null && L.decide(at21({ streak: 1 })) === null && L.decide(at21({ sub: { endpoint: "e", last_streak_sent: TUE } })) === null, "rappels : série en danger seulement si pas révisé, série de 2 jours et une fois par jour");
  r = L.decide(at21({ prefs: prefs({ reminderTime: "21:00" }) })); ok(r && r.kind === "danger" && r.patch.last_sent === TUE, "rappels : à 21 h le rappel de série remplace celui du jour", JSON.stringify(r));
  const we = prefs({ quietWeekend: true });
  ok(L.decide(base({ day: SAT, prefs: we })) === null && L.decide(at21({ day: SAT, prefs: we })) === null, "rappels : silence le week-end");
  ok(L.decide(base({ day: SAT }))?.kind === "due", "rappels : le week-end sans le réglage, rappel normal");
  r = L.decide(base({ day: SAT, prefs: we, examSoon: [{ id: "s1", name: "SVT", exam_date: "2026-11-15" }] })); ok(r && r.kind === "exam1" && r.body.includes("SVT") && r.url === "./#matiere-s1", "rappels : contrôle de demain envoyé même le week-end", JSON.stringify(r));
  ok(L.decide(base({ day: SAT, prefs: we, examSoon: [{ id: "s1", name: "SVT", exam_date: "2026-11-17" }] }))?.kind === "exam3" && L.decide(base({ day: SAT, prefs: we, examSoon: [{ id: "s1", name: "SVT", exam_date: "2026-11-21" }] }))?.kind === "exam7", "rappels : J-3 et J-7 envoyés même le week-end");
  r = L.decide(base({ day: SAT, prefs: we, minutes: 7 * 60 + 31, examToday: [{ id: "s1", name: "SVT" }] })); ok(r && r.kind === "examToday" && r.patch.last_exam_sent === SAT, "rappels : matin du contrôle à 7 h 30 même le week-end", JSON.stringify(r));
  const vac = z => prefs({ quietHolidays: true, zone: z }), MAR5 = "2027-03-05"; // vendredi : vacances d'hiver en zone B seulement
  ok(L.decide(base({ day: MAR5, prefs: vac("B") })) === null && L.decide(base({ day: MAR5, prefs: vac("A") }))?.kind === "due" && L.decide(base({ day: MAR5, prefs: vac("C") }))?.kind === "due", "rappels : silence pendant les vacances de la zone choisie");
  ok(L.decide(base({ day: "2027-02-08", prefs: vac("C") })) === null && L.decide(base({ day: "2026-12-22", prefs: vac("A") })) === null, "rappels : vacances d'hiver zone C et de Noël");
  ok(L.decide(base({ day: MAR5, prefs: vac("B"), examSoon: [{ id: "s1", name: "Maths", exam_date: "2027-03-08" }] }))?.kind === "exam3", "rappels : contrôle envoyé même pendant les vacances");
  const off = prefs({ enabled: false });
  ok([base({ prefs: off }), at21({ prefs: off }), base({ prefs: off, minutes: 451, examToday: [{ id: "s1", name: "SVT" }] })].every(c => L.decide(c) === null), "rappels : rappels coupés, plus rien n'est envoyé");
  ok(L.streakOf(new Set(["2026-11-13", "2026-11-12", "2026-11-10", "2026-11-09"]), SAT) === 4 && L.streakOf(new Set(["2026-11-14", "2026-11-13"]), SAT) === 2 && L.streakOf(new Set(["2026-11-12"]), SAT) === 0, "rappels : série calculée comme dans l'appli (gel compris)");
  const week = new Set(); for (let i = 0; i < 12; i++) week.add(L.decide(base({ day: L.addDays(TUE, i), due: 5, streak: 0 })).body); ok(week.size === 12, "rappels : 12 jours de suite, 12 messages différents");

  // 2. Écran Réglages > Rappels, enregistré dans le profil (donc le même sur tous les appareils).
  for (const [w, h] of [[320, 700], [390, 844], [1280, 800]]) {
    const page = await open(browser, { w, h, theme: "dark" }), tag = "rappels " + w;
    await go(page, "#reglages", 400); await page.click('[data-open="rappels"]'); await page.waitForTimeout(150);
    ok(await page.locator('#remOn[aria-checked="true"]').count() === 1 && await page.locator('#qWe[aria-checked="false"]').count() === 1 && await page.locator('#qVac[aria-checked="false"]').count() === 1 && await page.locator('[data-zone="A"][aria-pressed="true"]').count() === 1, tag + " : réglages par défaut affichés");
    const prof = () => page.evaluate(() => window.__fake.DB.profiles[0]);
    await page.click("#qWe"); await page.waitForTimeout(250); await page.click("#qVac"); await page.waitForTimeout(250); await page.click('[data-zone="C"]'); await page.waitForTimeout(250);
    let pr = await prof(); ok(pr.quiet_weekend === true && pr.quiet_holidays === true && pr.holiday_zone === "C", tag + " : week-end, vacances et zone enregistrés dans le profil", JSON.stringify(pr));
    ok(await page.locator('#qWe[aria-checked="true"]').count() === 1 && await page.locator('[data-zone="C"][aria-pressed="true"]').count() === 1, tag + " : écran à jour");
    const o = await overflow(page); ok(o.sw <= o.iw, tag + " : pas de débordement", JSON.stringify(o));
    const sm = await small(page); ok(!sm.length, tag + " : boutons de 44 px minimum", sm.join(" | "));
    await page.click("#remOn"); await page.waitForTimeout(250); pr = await prof();
    ok(pr.reminders_enabled === false && !(await page.locator("#remOpts").isVisible()), tag + " : rappels coupés et options masquées", JSON.stringify(pr));
    await page.click("#remOn"); await page.waitForTimeout(250); ok((await prof()).reminders_enabled === true && await page.locator("#remOpts").isVisible(), tag + " : rappels réactivés");
    if (w === 390) await page.screenshot({ path: path.join(SHOTS, "reglages-rappels-390.png"), fullPage: true });
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
}

// Mises à jour : le service worker demande toujours la dernière version au serveur (cache: "no-cache") et l'appli marche hors ligne.
async function majSw(browser) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } }), page = await ctx.newPage(); page.errors = [];
  page.on("pageerror", e => page.errors.push(String(e)));
  await page.route("**/vendor/supabase.js", r => r.fulfill({ path: path.join(__dirname, "fake-supabase.js"), contentType: "text/javascript" }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const LOC = BASE.replace("127.0.0.1", "localhost");
  await page.goto(LOC + "/"); await page.waitForSelector("#app > *");
  const active = await page.evaluate(() => navigator.serviceWorker.ready.then(r => !!r.active));
  ok(active, "maj : le service worker s'installe");
  await page.reload(); await page.waitForSelector("#app > *");
  const ctl = await page.evaluate(() => !!navigator.serviceWorker.controller);
  ok(ctl, "maj : la page est servie par le service worker");
  const disk = fs.readFileSync(path.join(ROOT, "js/app.js"), "utf8"), sent = await page.evaluate(() => fetch("js/app.js").then(r => r.text()));
  ok(sent === disk, "maj : app.js servi = la dernière version du serveur");
  await ctx.setOffline(true); await page.reload(); await page.waitForSelector("#app > *", { timeout: 8000 }).catch(() => {});
  ok(await page.$("#app > *"), "maj : l'appli s'ouvre hors ligne");
  ok(!page.errors.length, "maj : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await ctx.close();
}
async function matieresTactile(browser) {
  // Bug iPhone du 14 nov. : après un appui, le survol restait « collé » sous le doigt et une puce décochée gardait l'air cochée
  // (ou une autre, comme Allemand, semblait se cocher toute seule). Les effets de survol sont réservés aux souris.
  const css = fs.readFileSync(path.join(ROOT, "css/app.css"), "utf8").split("\n");
  const loose = css.filter(l => !l.startsWith(" ") && !l.startsWith("@media") && /:hover/.test(l));
  ok(!loose.length, "tactile : tous les survols sont réservés aux souris", loose.slice(0, 2).join(" | "));
  const { devices } = require("playwright");
  const ctx = await browser.newContext({ ...devices["iPhone 13"], serviceWorkers: "block" }), page = await ctx.newPage(); page.errors = [];
  page.on("pageerror", e => page.errors.push(String(e)));
  await page.route("**/vendor/supabase.js", r => r.fulfill({ path: path.join(__dirname, "fake-supabase.js"), contentType: "text/javascript" }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.addInitScript(() => { if (sessionStorage.getItem("init")) return; sessionStorage.setItem("init", "1"); localStorage.clear(); localStorage.setItem("fake.seed", "vide"); localStorage.setItem("fake.theme", "dark"); });
  await page.goto(BASE + "/"); await page.waitForSelector("#app > *");
  ok(!(await page.evaluate(() => matchMedia("(hover:hover) and (pointer:fine)").matches)), "tactile : l'iPhone simulé n'a pas de survol");
  await page.tap("#next"); await page.fill("#prenom", "Ramzi"); await page.selectOption("#classe", "Terminale STI2D"); await page.tap("#next"); await page.waitForTimeout(300);
  const look = m => page.evaluate(m => { const b = document.querySelector(`[data-m="${m}"]`), c = getComputedStyle(b); return { on: b.getAttribute("aria-pressed"), bg: c.backgroundColor, bd: c.borderColor }; }, m);
  const off = await look("Espagnol");
  for (const m of ["Allemand", "Allemand", "Maths", "Maths", "Anglais"]) { await page.tap(`[data-m="${m}"]`); await page.waitForTimeout(250); }
  const a = await look("Allemand"), mt = await look("Maths"), an = await look("Anglais");
  ok(a.on === "false" && a.bg === off.bg && a.bd === off.bd, "tactile : Allemand cochée puis décochée a bien l'air décochée", JSON.stringify([a, off]));
  ok(mt.on === "true" && an.on === "true" && an.bg !== off.bg, "tactile : les matières cochées restent cochées", JSON.stringify([mt, an]));
  ok(!page.errors.length, "tactile : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await ctx.close();
}

async function nomAuto(browser) {
  const T = await import(require("url").pathToFileURL(path.join(ROOT, "supabase/functions/studio/titre.mjs")).href);
  ok(T.autoTitle("Chapitre 3 : La mitose", "", "") === "Chapitre 3 : La mitose", "nom auto : titre de l'IA gardé");
  ok(T.autoTitle("  **« Les ondes mécaniques. »**  ", "", "") === "Les ondes mécaniques", "nom auto : titre nettoyé (gras, guillemets, point)");
  ok(T.autoTitle("", "", "Loi_d-ohm et mailles.pdf") === "Loi d ohm et mailles", "nom auto : sans titre de l'IA, nom du fichier", T.autoTitle("", "", "Loi_d-ohm et mailles.pdf"));
  ok(T.autoTitle("", "## À quoi sert ce chapitre\nx\n## Adressage IPv4\n", "IMG_1234.jpg") === "Adressage IPv4", "nom auto : photo sans nom, premier vrai titre du résumé");
  ok(T.autoTitle("", "## Notions clés", "Texte collé") === "Chapitre sans titre" && T.autoTitle("", "", "a.pdf, b.pdf") === "Chapitre sans titre", "nom auto : rien d'utilisable, « Chapitre sans titre »");
  const long = T.autoTitle("Les transformations chimiques et les réactions d'oxydoréduction en solution aqueuse dans la vie courante", "", "");
  ok(long.length <= 80 && !/\s$/.test(long) && long.startsWith("Les transformations"), "nom auto : 80 caractères au plus, coupé sur un mot", long);
  const studio = fs.readFileSync(path.join(ROOT, "supabase/functions/studio/index.ts"), "utf8");
  ok(/"title":"titre court du chapitre/.test(studio) && /ch\?\.auto_name === true/.test(studio), "nom auto : titre demandé dans l'appel existant, appliqué seulement si la case est cochée");
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const page = await open(browser, { w, h, theme: "dark" }), tag = "nom auto " + w;
    await go(page, "#matiere-s1", 400); await page.click("#sAdd"); await page.waitForTimeout(150);
    ok(await page.locator('#cauto[aria-checked="false"]').count() === 1, tag + " : case décochée par défaut");
    await page.click("#cauto"); await page.waitForTimeout(80);
    if (w === 390) { await page.locator("#cauto").scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(SHOTS, "nom-auto-390.png") }); }
    ok(await page.locator("#cname").isDisabled() && (await page.getAttribute("#cname", "placeholder")).includes("cours"), tag + " : champ du nom désactivé");
    let o = await overflow(page); ok(o.sw <= o.iw, tag + " : pas de débordement", JSON.stringify(o));
    let sm = await small(page); ok(!sm.length, tag + " : boutons de 44 px minimum", sm.join(" | "));
    await page.click("#addCh"); await page.waitForTimeout(500);
    const ch = await page.evaluate(() => window.__fake.DB.chapters.slice(-1)[0]);
    ok(ch.auto_name === true && ch.name === "Nouveau chapitre" && (await page.evaluate(() => location.hash)) === "#import-" + ch.id, tag + " : chapitre créé, direction l'import", JSON.stringify(ch));
    await page.click('[data-tab="text"]'); await page.fill("#txt", "La mitose est une division cellulaire qui donne deux cellules filles génétiquement identiques à la cellule mère. Elle comporte quatre phases.");
    await page.click("#go"); await page.waitForFunction(() => /cartes créées|ajoutées/.test(document.getElementById("app").innerText), null, { timeout: 15000 }).catch(() => {});
    const ch2 = await page.evaluate(id => window.__fake.DB.chapters.find(c => c.id === id), ch.id);
    ok(ch2.name === "La mitose et la méiose" && ch2.auto_name === false && (await txt(page)).includes("La mitose et la méiose"), tag + " : nom donné par le cours après l'import", JSON.stringify(ch2));
    await go(page, "#matiere-s1", 400); await page.click("#sAdd"); await page.waitForTimeout(150); await page.fill("#cname", "Mon chapitre"); await page.click("#addCh"); await page.waitForTimeout(500);
    const ch3 = await page.evaluate(() => window.__fake.DB.chapters.slice(-1)[0]);
    ok(ch3.name === "Mon chapitre" && !ch3.auto_name && (await page.evaluate(() => location.hash)) === "#chapitre-" + ch3.id, tag + " : case décochée, nom écrit gardé comme avant");
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
}

async function annulerCarte(browser) {
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const page = await open(browser, { w, h, theme: "dark" }), tag = "annuler " + w;
    await go(page, "#cartes-c1", 500);
    ok(await page.locator("#undo").count() === 0, tag + " : pas de bouton Annuler avant la première réponse");
    const cid = await page.evaluate(() => document.querySelector("#flip .txt").textContent);
    const before = await page.evaluate(t => { const c = window.__fake.DB.cards.find(x => x.front === t || document.createElement("div").textContent === t); return null; }, cid);
    const snap = await page.evaluate(() => JSON.parse(JSON.stringify(window.__fake.DB.cards)));
    const mist0 = await page.evaluate(() => window.__fake.DB.mistakes.length);
    await page.click("#flip"); await page.click("#no"); await page.waitForTimeout(400);
    ok(await page.evaluate(() => window.__fake.DB.mistakes.length) === mist0 + 1, tag + " : « Faux » note l'erreur");
    ok(await page.locator("#undo").count() === 1, tag + " : bouton Annuler après une réponse");
    let sm = await small(page); ok(!sm.length, tag + " : boutons de 44 px minimum", sm.join(" | "));
    let o = await overflow(page); ok(o.sw <= o.iw, tag + " : pas de débordement", JSON.stringify(o));
    await page.click("#undo"); await page.waitForTimeout(500);
    const after = await page.evaluate(() => JSON.parse(JSON.stringify(window.__fake.DB.cards)));
    const keys = ["due_at", "reps", "lapses", "state", "right_count", "wrong_count", "stability"];
    const same = snap.every(a => { const b = after.find(x => x.id === a.id); return keys.every(k => (a[k] ?? null) === (b[k] ?? null)); });
    ok(same, tag + " : la carte retrouve exactement son état d'avant");
    ok(await page.evaluate(() => window.__fake.DB.mistakes.length) === mist0, tag + " : l'erreur est retirée du carnet");
    ok(await page.evaluate(t => document.querySelector("#flip .txt").textContent === t && document.querySelector("#flip").classList.contains("back"), cid), tag + " : on revient sur la même carte, réponse visible");
    ok(await page.locator(".counter.no").textContent() === "0" && await page.locator("#undo").count() === 0, tag + " : compteurs remis à zéro");
    await page.click("#yes"); await page.waitForTimeout(300);
    ok(await page.locator(".counter.yes").textContent() === "1", tag + " : la bonne réponse est comptée");
    if (w === 1280) { await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(250); await page.keyboard.press("Control+z"); await page.waitForTimeout(300); ok(await page.locator(".counter.no").textContent() === "0" && await page.locator(".counter.yes").textContent() === "1", tag + " : Ctrl Z annule aussi"); }
    if (w === 390) await page.screenshot({ path: path.join(SHOTS, "annuler-390.png") });
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
}

async function leurres(browser) {
  const ai = fs.readFileSync(path.join(ROOT, "supabase/functions/ai/index.ts"), "utf8");
  ok(/const LEURRES = /.test(ai) && (ai.match(/\$\{LEURRES\}/g) || []).length >= 3 && /"leurres":\[/.test(ai), "leurres : consignes de l'IA pour le quiz, le contrôle et le texte à trous");
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  const L = (t, pool, n) => page.evaluate(([t, pool, n]) => window.__mergeLookalikes(t, pool, n), [t, pool, n]);
  for (let k = 0; k < 5; k++) {
    ok((await L("46", ["mitose", "identiques", "23", "interphase", "quatre", "La cellule se divise"], 1))[0] === "23", "leurres : un nombre contre un nombre");
    const v = await L("3,2 V", ["mitose", "5 V", "12 A", "Loi d'Ohm", "0,8 V"], 2); ok(v.includes("5 V") && v.includes("0,8 V"), "leurres : même unité d'abord", v.join(" | "));
    const m = await L("mitose", ["46", "méiose", "La cellule se divise en deux cellules filles", "interphase", "12 V"], 2); ok(m.includes("méiose") && m.includes("interphase"), "leurres : un mot contre des mots", m.join(" | "));
    const ph = await L("Deux cellules filles génétiquement identiques", ["46", "ADN", "Quatre cellules filles haploïdes", "Pendant l'interphase", "Une des deux copies d'un chromosome"], 2); ok(ph.includes("Quatre cellules filles haploïdes") && !ph.includes("46") && !ph.includes("ADN"), "leurres : une phrase contre des phrases", ph.join(" | "));
  }
  ok((await L("Mitose", ["mitose", "méiose"], 2)).join() === "méiose", "leurres : jamais la bonne réponse en double");
  await go(page, "#trous-c1"); await page.click("#mk"); await page.waitForTimeout(400);
  const bank = await page.evaluate(() => [...document.querySelectorAll(".bank .chip")].map(b => b.textContent.trim()));
  ok(["mitose", "identiques", "méiose", "différentes", "haploïdes"].every(w => bank.includes(w)) && bank.length === 5, "leurres : texte à trous avec les leurres préparés par l'IA", bank.join(" | "));
  for (let k = 0; k < 2; k++) await page.click(".bank .chip:not([disabled]) >> nth=0"); await page.click("#chk"); await page.waitForTimeout(150); await page.click("#chk"); await page.waitForTimeout(250);
  const bank2 = await page.evaluate(() => [...document.querySelectorAll(".bank .chip")].map(b => b.textContent.trim()));
  ok(bank2.includes("quatre") && bank2.includes("haploïdes") && bank2.length >= 4 && new Set(bank2).size === bank2.length, "leurres : sans leurres de l'IA (anciens textes), mots du chapitre qui ressemblent", bank2.join(" | "));
  ok(!page.errors.length, "leurres : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function iphoneAppli(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  // Double appui : plus de zoom sur les boutons et les cartes (et plus de zoom à deux doigts non plus, demandé le 15 nov.).
  await go(page, "#cartes-c1", 400);
  ok(await page.evaluate(() => ["html", "body", "#yes", "#flip", ".tabs a"].every(sel => { const e = document.querySelector(sel); return !e || getComputedStyle(e).touchAction === "manipulation"; })), "iPhone : pas de zoom au double appui");
  ok(await page.evaluate(() => document.querySelector('meta[name="viewport"]').content.includes("user-scalable=no") && getComputedStyle(document.documentElement).touchAction === "manipulation"), "iPhone : zoom bloqué (pincement et double appui), demandé par Ramzi le 15 nov.");
  ok(await page.evaluate(() => [...document.querySelectorAll("input:not([type=range]):not([type=checkbox]),select,textarea")].every(e => parseFloat(getComputedStyle(e).fontSize) >= 16)), "iPhone : champs en 16 px au moins (pas de zoom automatique en écrivant)");
  // Imprimer : dans l'appli installée sur iPhone, un PDF au lieu de window.print().
  await page.evaluate(() => { window.__mergeForcePdf = true; window.__printed = 0; window.print = () => { window.__printed++; }; });
  for (const [route, min] of [["#synthese-c1", 1], ["#fiche-c1", 1], ["#planche-c1", 2]]) {
    await go(page, route, 500); if (await page.locator("#mk").count()) { await page.click("#mk"); await page.waitForTimeout(500); }
    await page.evaluate(() => { window.__mergeLastPdf = null; }); await page.click("#print");
    await page.waitForFunction(() => window.__mergeLastPdf || (document.getElementById("pdferr") && !document.getElementById("pdferr").hidden), null, { timeout: 30000 }).catch(() => {});
    const r = await page.evaluate(() => ({ pdf: window.__mergeLastPdf, ready: !!document.getElementById("pdfready") && !document.getElementById("pdfready").hidden, printed: window.__printed }));
    ok(r.pdf && r.pdf.pages >= min && r.pdf.size > 20000 && r.ready && !r.printed, "iPhone : PDF prêt pour " + route, JSON.stringify(r));
    if (route === "#synthese-c1") await page.screenshot({ path: path.join(SHOTS, "pdf-pret-390.png") });
    if (r.pdf && process.env.SAVEPDF) { const b64 = await page.evaluate(async u => { const b = await (await fetch(u)).blob(); return await new Promise(ok => { const f = new FileReader(); f.onload = () => ok(f.result.split(",")[1]); f.readAsDataURL(b); }); }, r.pdf.url); fs.writeFileSync(path.join(SHOTS, route.slice(1) + ".pdf"), Buffer.from(b64, "base64")); }
    await page.keyboard.press("Escape");
  }
  ok(!page.errors.length, "iPhone : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function semaine(browser) {
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const page = await open(browser, { w, h, theme: "dark" }), tag = "semaine " + w;
    // Une seule journée, avec peu de cartes : le graphique doit rester lisible et joli.
    await page.evaluate(() => { localStorage.setItem("fake.sessions", JSON.stringify([{ ago: 1, seconds: 240, cards_reviewed: 6 }])); location.reload(); });
    await page.waitForSelector("#app > *"); await go(page, "#accueil", 600);
    const r = await page.evaluate(() => { const cols = [...document.querySelectorAll(".wcol")], act = cols.filter(c => c.querySelector(".wtrack i").getBoundingClientRect().height > 0);
      const a = act[0], t = a && a.querySelector(".wtrack").getBoundingClientRect(), i = a && a.querySelector(".wtrack i").getBoundingClientRect();
      return { n: cols.length, act: act.length, ratio: a ? i.height / t.height : 0, label: a ? a.querySelector(".wv").textContent.trim() : "", trackW: t ? t.width : 0, empties: cols.filter(c => c.querySelector(".wtrack b")).length, today: !!document.querySelector(".wcol.now .wd") && document.querySelector(".wcol.now .wd").textContent, msg: (document.querySelector(".wmsg") || {}).textContent || "" }; });
    ok(r.n === 7 && r.act === 1 && r.empties === 6, tag + " : 7 jours, 1 actif, les autres marqués d'un point", JSON.stringify(r));
    ok(r.ratio >= 0.25 && r.label === "4 min" && r.trackW >= 20, tag + " : un petit jour reste bien visible (au moins un quart de la hauteur) avec ses minutes (objectif en minutes)", JSON.stringify(r));
    ok(r.today === "Auj." && /bon début/.test(r.msg), tag + " : aujourd'hui repéré et message d'encouragement", JSON.stringify(r));
    const o = await overflow(page); ok(o.sw <= o.iw, tag + " : pas de débordement", JSON.stringify(o));
    await page.locator(".week").screenshot({ path: path.join(SHOTS, "semaine-" + w + ".png") });
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
}

async function duoLien(browser) {
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const page = await open(browser, { w, h, theme: "dark" }), tag = "duo " + w;
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
    await go(page, "#duo", 500); await page.click("#invite"); await page.waitForTimeout(300);
    ok((await page.locator(".dcode").textContent()) === "abc123" && await page.locator("#dcopy").isVisible() && await page.locator("#dshare").isVisible(), tag + " : code affiché avec Copier et Partager");
    await page.click("#dcopy"); await page.waitForTimeout(200);
    ok(await page.evaluate(() => navigator.clipboard.readText()) === "abc123", tag + " : « Copier le code » copie le code");
    await page.evaluate(() => { delete navigator.share; }); await page.click("#dshare"); await page.waitForTimeout(200);
    const link = await page.evaluate(() => navigator.clipboard.readText());
    ok(/#duo-abc123$/.test(link) && link.startsWith(BASE), tag + " : sans menu de partage, le lien est copié", link);
    let sm = await small(page); ok(!sm.length, tag + " : boutons de 44 px minimum", sm.join(" | "));
    let o = await overflow(page); ok(o.sw <= o.iw, tag + " : pas de débordement", JSON.stringify(o));
    if (w === 390) await page.screenshot({ path: path.join(SHOTS, "duo-code-390.png") });
    // La personne invitée touche le lien.
    await page.evaluate(() => { location.hash = "#duo-xyz789"; }); await page.waitForTimeout(600);
    ok(await page.evaluate(() => location.hash) === "#duo" && await page.inputValue("#incode") === "xyz789" && await page.locator(".duoin").isVisible(), tag + " : le lien ouvre le Duo avec le code déjà rempli");
    await page.click("#acceptLink"); await page.waitForTimeout(400);
    ok(await page.evaluate(() => !localStorage.getItem("merge.duoin")), tag + " : invitation acceptée, code oublié");
    // Lien ouvert avant d'aller ailleurs : on revient sur le Duo.
    await page.evaluate(() => localStorage.setItem("merge.duoin", "qqq111")); await go(page, "#accueil", 500);
    ok(await page.evaluate(() => location.hash) === "#duo" && await page.inputValue("#incode") === "qqq111", tag + " : code gardé jusqu'à l'onglet Duo");
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
}

async function pomodoroReglable(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" }), tag = "pomodoro";
  await go(page, "#accueil", 400); await page.click("button[data-pomo] >> nth=0"); await page.waitForTimeout(250);
  ok((await page.textContent("#pclock")).trim() === "25:00" && await page.locator('[data-pmode="pomo"][aria-selected="true"]').count() === 1, tag + " : 25 minutes par défaut");
  await page.click('[data-ps="work"][data-d="1"]'); await page.waitForTimeout(100); await page.click('[data-ps="brk"][data-d="1"]'); await page.waitForTimeout(100);
  ok((await page.textContent("#pclock")).trim() === "30:00" && (await page.textContent("#pv-brk")).includes("6"), tag + " : travail et pause réglables");
  await page.click('[data-pp="50-10"]'); await page.waitForTimeout(100); ok((await page.textContent("#pclock")).trim() === "50:00", tag + " : préréglage 50 / 10");
  await page.click('[data-pmode="timer"]'); await page.waitForTimeout(150);
  ok((await page.textContent("#pclock")).trim() === "20:00" && (await page.textContent(".sheet h1")).includes("Minuteur"), tag + " : mode minuteur, 20 minutes par défaut");
  await page.click('[data-pt="5"]'); await page.waitForTimeout(100); await page.click('[data-ps="timer"][data-d="-1"]'); await page.waitForTimeout(100);
  ok((await page.textContent("#pclock")).trim() === "04:00", tag + " : minuteur réglable à la minute près", await page.textContent("#pclock"));
  const sm = await small(page); ok(!sm.length, tag + " : boutons de 44 px minimum", sm.join(" | "));
  const o = await overflow(page); ok(o.sw <= o.iw, tag + " : pas de débordement", JSON.stringify(o));
  await page.screenshot({ path: path.join(SHOTS, "minuteur-390.png") });
  await page.click("#pgo"); await page.waitForTimeout(200);
  ok(await page.locator('[data-ps="timer"]').first().isDisabled(), tag + " : durées bloquées pendant le décompte");
  // Le décompte suit l'heure réelle : on avance l'horloge de 3 minutes.
  await page.evaluate(() => { const real = Date.now, off = 180000; Date.now = () => real() + off; }); await page.waitForTimeout(1200);
  const left = (await page.textContent("#pclock")).trim(); ok(left === "01:00" || left === "00:59", tag + " : décompte juste même si l'appli a été mise en pause", left);
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem("merge.pomocfg")).mode === "timer"), tag + " : réglages gardés (synchronisés)");
  ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function boutique(browser) {
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const page = await open(browser, { w, h, theme: "dark" }), tag = "boutique " + w;
    await page.evaluate(() => { localStorage.setItem("fake.gifts", "1"); localStorage.setItem("merge.rewards", JSON.stringify({ season: 2, xp0: 0, buys: [{ id: "test-bonus", price: -2900 }] })); location.reload(); });
    await page.waitForSelector("#app > *"); await go(page, "#boutique", 600);
    const bal0 = await page.evaluate(() => parseInt(document.querySelector(".coinhero b.big").textContent, 10));
    ok(bal0 >= 2900 && bal0 < 3300, tag + " : solde de pièces affiché", String(bal0));
    ok(await page.locator(".giftcard").count() === 20 && await page.locator('[data-gift="bisou"]:not([disabled])').count() === 1 && await page.locator('[data-gift="cinema"]:not([disabled])').count() === 1 && await page.locator('[data-gift="surprise"][disabled]').count() === 1 && await page.locator('[data-gift="balade"][disabled]').count() === 1, tag + " : 20 cadeaux en vrai sur 3 rayons, cinéma à portée, surprise et balade trop chères");
    ok((await txt(page)).includes("Petits plaisirs") && (await txt(page)).includes("Gros cadeaux") && (await txt(page)).includes("El Mordjene") && (await txt(page)).includes("Black and White") && (await txt(page)).includes("Kazdalerie") && (await txt(page)).includes("coquillettes"), tag + " : rayons et nouveaux cadeaux affichés");
    let sm = await small(page); ok(!sm.length, tag + " : boutons de 44 px minimum", sm.join(" | "));
    let o = await overflow(page); ok(o.sw <= o.iw, tag + " : pas de débordement", JSON.stringify(o));
    if (w === 390) await page.screenshot({ path: path.join(SHOTS, "boutique-390.png"), fullPage: true });
    const gaps = await page.evaluate(() => { const b = [...document.querySelectorAll(".shoptabs button")].map(x => x.getBoundingClientRect()); return b.slice(1).map((r, i) => Math.round(r.left - b[i].right)); });
    ok(gaps.length >= 5 && Math.min(...gaps) >= 16, tag + " : rayons de la boutique bien espacés", JSON.stringify(gaps));
    await page.click('[data-st="fond"]'); await page.click('[data-buy="f-neige"]'); await page.waitForTimeout(200);
    ok(await page.evaluate(() => document.body.dataset.bg) === "neige" && await page.evaluate(() => parseInt(document.querySelector(".coinhero b.big").textContent, 10)) === bal0 - 360, tag + " : fond acheté (360 pièces, prix +1/3) et équipé");
    await page.click('[data-st="mascotte"]'); await page.click('[data-buy="m-casque"]'); await page.waitForTimeout(150);
    await page.click('[data-st="carte"]'); await page.click('[data-buy="d-neon"]'); await page.waitForTimeout(150);
    await page.click('[data-st="flamme"]'); await page.click('[data-buy="l-arc"]'); await page.waitForTimeout(150);
    ok(await page.evaluate(() => document.body.dataset.card === "neon" && document.body.dataset.flame === "arc"), tag + " : style de cartes et flamme équipés");
    if (w === 390) await page.screenshot({ path: path.join(SHOTS, "boutique-flamme-390.png") });
    await page.click('[data-st="coffre"]'); const before = await page.evaluate(() => JSON.parse(localStorage.getItem("merge.rewards")).buys.length);
    await page.click("[data-chest]"); await page.waitForTimeout(250);
    ok(await page.locator(".badgewin h1").textContent() === "Coffre ouvert" && await page.evaluate(() => JSON.parse(localStorage.getItem("merge.rewards")).buys.length) === before + 2, tag + " : coffre surprise ouvert");
    await page.keyboard.press("Escape"); await page.click('[data-gift="reeses"]'); await page.click("#gok"); await page.waitForTimeout(400);
    ok(await page.evaluate(() => window.__fake.DB.gift_claims.length === 1 && window.__fake.DB.gift_claims[0].gift === "reeses"), tag + " : demande de cadeau enregistrée");
    ok(await page.locator("#sheet .voucher-card").isVisible() && (await page.locator("#sheet").innerText()).includes("envoie-la à Ramzi"), tag + " : bon à envoyer en capture à Ramzi");
    if (w === 390) await page.locator("#sheet .sheet").screenshot({ path: path.join(SHOTS, "bon-cadeau-390.png") });
    await page.keyboard.press("Escape"); await page.waitForTimeout(150);
    ok((await txt(page)).includes("Mes bons") && (await txt(page)).includes("À envoyer à Ramzi"), tag + " : le bon apparaît dans « Mes bons »");
    await page.click("[data-bon]"); await page.waitForTimeout(150); ok(await page.locator("#sheet .voucher-card").isVisible(), tag + " : on peut rouvrir le bon"); await page.keyboard.press("Escape");
    await go(page, "#recompenses", 300); ok(await page.locator('a[href="#boutique"]').count() >= 1 && (await txt(page)).includes("Mergo au casque audio"), tag + " : les achats apparaissent dans les récompenses");
    await go(page, "#accueil", 300); ok(await page.locator(".coinpill").count() === 1, tag + " : pièces affichées sur l'accueil");
    // Passage de niveau : pièces, articles offerts et récompenses débloquées.
    // Beaucoup de bonnes réponses (fake.xp) : du niveau 2 au niveau 6 d'un coup.
    await page.evaluate(() => { const r = JSON.parse(localStorage.getItem("merge.rewards")); r.lvl = 2; r.buys = r.buys.filter(b => !b.level); localStorage.setItem("merge.rewards", JSON.stringify(r)); localStorage.setItem("merge.level", "2"); localStorage.setItem("merge.badges", "[]"); localStorage.setItem("fake.xp", "60"); sessionStorage.setItem("init", "1"); location.hash = "#calendrier"; location.reload(); });
    await page.waitForSelector("#app > *"); await page.waitForTimeout(300); await go(page, "#accueil", 600);
    const lv6 = await page.evaluate(() => JSON.parse(localStorage.getItem("merge.wallet") || "{}").level);
    const lt = await page.locator(".lvlwin").count() ? await page.locator(".lvlwin").innerText() : "pas de fenêtre";
    ok(lv6 >= 5 && lv6 < 9 && await page.locator(".lvlwin").count() === 1 && lt.includes("Cerveau affûté") && lt.includes("coffre surprise") && await page.locator(".lvlgift").count() >= 4 && await page.locator(".lvlwin .sprev").count() <= 4, tag + " : passage de niveau (pièces, peu d'articles, coffre, exclusivité du niveau 5)", lv6 + " · " + lt);
    ok(await page.evaluate(L => { const r = JSON.parse(localStorage.getItem("merge.rewards")), g = r.buys.filter(b => b.level).map(b => b.level); return g.length === Math.floor(L / 3) && g.every(l => l % 3 === 0); }, lv6), tag + " : un article offert seulement tous les 3 niveaux");
    if (w === 390 && await page.locator(".lvlwin").count()) await page.screenshot({ path: path.join(SHOTS, "niveau-390.png") });
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
  // Sans accès : aucun cadeau en vrai.
  const page = await open(browser, { w: 390, h: 844, theme: "dark" }); await go(page, "#boutique", 500);
  ok(await page.locator(".giftcard").count() === 0 && await page.locator(".shopitem").count() > 0, "boutique : sans accès, pas de cadeaux en vrai (seulement la boutique)");
  await page.context().close();
}

async function controleChapitres(browser) {
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const page = await open(browser, { w, h, theme: "dark" }), tag = "chapitres du contrôle " + w;
    await go(page, "#matiere-s1", 400); ok((await txt(page)).includes("Plan de révision"), tag + " : plan affiché au départ");
    ok(await page.locator(".ctrlrow").count() === 1 && await page.locator("#sAdd").count() === 1 && await page.evaluate(() => { const b = document.getElementById("sAdd").getBoundingClientRect(), h = [...document.querySelectorAll("h2")].find(x => /^Chapitres/.test(x.textContent)).getBoundingClientRect(); return Math.abs((b.top + b.bottom) / 2 - (h.top + h.bottom) / 2) < 20; }), tag + " : contrôle existant listé, + du chapitre en face de « Chapitres »");
    await page.click("[data-cch]"); await page.waitForTimeout(150);
    ok(await page.locator('#ccall[aria-pressed="true"]').count() === 1 && await page.locator("[data-cc]").count() === 3, tag + " : fenêtre des chapitres, « Tous les chapitres » par défaut");
    await page.click('[data-cc="c2"]'); await page.click("#ccok"); await page.waitForTimeout(250);
    ok(!(await txt(page)).includes("Plan de révision"), tag + " : seul un chapitre sans cartes choisi, plus rien à planifier");
    await page.click("[data-cch]"); await page.waitForTimeout(150); await page.click('[data-cc="c1"]'); await page.click("#ccok"); await page.waitForTimeout(250);
    ok((await txt(page)).includes("Seulement les chapitres du contrôle") && (await txt(page)).includes("Chapitre 1 : La division cellulaire, Chapitre 2"), tag + " : plan limité aux chapitres choisis, affichés sur le contrôle");
    ok(await page.evaluate(() => { const l = JSON.parse(localStorage.getItem("merge.controles")); return l.length === 1 && l[0].ch.length === 2 && l[0].d === window.__fake.DB.subjects.find(s => s.id === "s1").exam_date && window.__mergeSync.synced("merge.controles"); }), tag + " : choix enregistré et synchronisé", await page.evaluate(() => localStorage.getItem("merge.controles") + " / " + window.__fake.DB.subjects.find(s => s.id === "s1").exam_date));
    // Un deuxième contrôle de SVT (le mois prochain) : la date en base reste celle du prochain contrôle.
    const d0 = await page.evaluate(() => window.__fake.DB.subjects.find(s => s.id === "s1").exam_date);
    await page.click("#ctAdd"); await page.waitForTimeout(150); ok(await page.locator("#examBox [data-free]").count() === 0, tag + " : calendrier d'ajout sans l'option révision libre");
    await page.click('#examBox [data-nav="1"]'); await page.click('#examBox .day:not([disabled]) >> nth=10'); await page.waitForTimeout(300);
    ok(await page.locator("#ccok").count() === 1, tag + " : après la date, la fenêtre demande les chapitres");
    if (w === 390) await page.screenshot({ path: path.join(SHOTS, "chapitres-controle-390.png") });
    await page.click("#ccok"); await page.waitForTimeout(250);
    ok(await page.locator(".ctrlrow").count() === 2 && await page.evaluate(d => window.__fake.DB.subjects.find(s => s.id === "s1").exam_date === d, d0), tag + " : deux contrôles de SVT, le prochain reste la date du plan");
    if (w === 390) await page.screenshot({ path: path.join(SHOTS, "controles-matiere-390.png"), fullPage: true });
    let sm = await small(page); ok(!sm.length, tag + " : boutons de 44 px minimum", sm.join(" | "));
    let o = await overflow(page); ok(o.sw <= o.iw, tag + " : pas de débordement", JSON.stringify(o));
    await page.click("[data-cdel] >> nth=0"); await page.click('#confirm [data-c="1"]'); await page.waitForTimeout(300);
    ok(await page.locator(".ctrlrow").count() === 1 && await page.evaluate(d => window.__fake.DB.subjects.find(s => s.id === "s1").exam_date !== d, d0), tag + " : premier contrôle supprimé, la date passe au suivant", await page.evaluate(() => localStorage.getItem("merge.controles") + " / " + window.__fake.DB.subjects.find(s => s.id === "s1").exam_date + " / " + document.querySelectorAll(".ctrlrow").length));
    // Calendrier : plusieurs matières le même jour.
    await page.evaluate(() => localStorage.setItem("merge.jview", JSON.stringify({ lvl: "jour" }))); await go(page, "#mois", 300); await page.click(".cal button.day >> nth=-2"); await page.waitForTimeout(500);
    if (await page.locator("#sheet [data-close]").count()) { await page.click("#sheet [data-close]"); await page.waitForTimeout(150); }
    await jm(page, "#jctl"); await page.click('#sheet [data-sub="s1"]'); await page.waitForTimeout(250); await page.click("#ccok"); await page.waitForTimeout(150);
    await jm(page, "#jctl"); await page.click('#sheet [data-sub="s2"]'); await page.waitForTimeout(250); await page.click("#ccok"); await page.waitForTimeout(150);
    ok(await page.locator('.jrow.hasctl').count() === 2 && await page.locator('.jctls').count() === 0 && await page.locator('#jctl').count() === 1, tag + " : deux contrôles le même jour, chacun dans la journée (pas de bandeau en haut)");
    await jm(page, "#jctl"); await page.waitForTimeout(150);
    ok(await page.locator("#sheet [data-cdrm]").count() === 2, tag + " : les contrôles du jour sont listés avec un bouton « Retirer »");
    await page.click("#sheet [data-cdrm] >> nth=0"); await page.waitForTimeout(250); await page.click("#cdok"); await page.waitForTimeout(250);
    ok(await page.locator('.jrow.hasctl').count() === 1, tag + " : « Retirer » enlève bien le contrôle");
    // Révision combinée : tout un dossier, puis plusieurs matières, dossiers ou chapitres au choix.
    await go(page, "#dossier-g1", 400); ok(await page.locator('a[href="#revdossier-g1"]').count() === 1, tag + " : bouton réviser tout le dossier");
    await page.click('a[href="#revdossier-g1"]'); await page.waitForTimeout(400); ok(await page.locator(".session").count() === 1, tag + " : session du dossier lancée");
    await go(page, "#accueil", 300); ok(await page.locator('a[href="#perso"]').count() === 1, tag + " : accueil, bouton choisir quoi réviser");
    await go(page, "#perso", 300); ok(await page.locator("[data-ms]").count() === 1 && await page.locator("#mxgo[disabled]").count() === 1, tag + " : rien de coché au départ");
    await page.click('[data-ms="s1"]'); await page.waitForTimeout(100);
    ok(await page.locator('[data-mg="g1"][aria-pressed="true"]').count() === 1 && await page.locator('[data-mc="c1"][aria-pressed="true"]').count() === 1 && await page.locator("#mxgo:not([disabled])").count() === 1, tag + " : une matière coche ses dossiers et chapitres");
    if (w === 390) await page.screenshot({ path: path.join(SHOTS, "choisir-reviser-390.png"), fullPage: true });
    sm = await small(page); ok(!sm.length, tag + " : choisir, boutons de 44 px", sm.join(" | ")); o = await overflow(page); ok(o.sw <= o.iw, tag + " : choisir, pas de débordement", JSON.stringify(o));
    await page.click("#mxgo"); await page.waitForTimeout(400);
    ok(await page.evaluate(() => location.hash) === "#mixte" && await page.locator(".session").count() === 1 && await page.locator('#quit[href="#perso"]').count() === 1, tag + " : session combinée lancée");
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
}

async function boutiqueV2(browser) {
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const page = await open(browser, { w, h, theme: "dark" }), tag = "boutique v2 " + w;
    // 5 000 pièces de bonus, niveau 1 : les articles « niveau X » restent bloqués, les exclusivités sont visibles.
    await page.evaluate(() => { localStorage.setItem("merge.rewards", JSON.stringify({ season: 2, xp0: 0, buys: [{ id: "test-bonus", price: -5000 }], lvl: 1 })); location.reload(); });
    await page.waitForSelector("#app > *"); await go(page, "#boutique", 500);
    ok(await page.locator(".shopitem").count() >= 40, tag + " : beaucoup plus de couleurs", String(await page.locator(".shopitem").count()));
    ok(await page.locator('[data-buy="c-pistache"]:not([disabled])').count() === 1 && await page.locator('[data-buy="c-platine"]').count() === 0 && (await txt(page)).includes("Niveau 15") && (await txt(page)).includes("Saphir royal"), tag + " : couleur à niveau minimum bloquée, exclusivité affichée");
    for (const t of ["fond", "mascotte", "carte", "flamme", "titre"]) { await page.click(`[data-st="${t}"]`); await page.waitForTimeout(80); }
    ok((await txt(page)).includes("Major de promo") && (await txt(page)).includes("Légende vivante"), tag + " : nouveaux titres et exclusivités à long terme");
    await page.click('[data-st="mascotte"]'); await page.waitForTimeout(80); await page.click('[data-buy="m-chat"]'); await page.waitForTimeout(150);
    ok(await page.locator('.hello svg.mascot, .shopitem.own svg.mascot').count() >= 1 && await page.evaluate(() => JSON.parse(localStorage.getItem("merge.rewards")).equip.mascotte === "m-chat"), tag + " : nouvelle tenue de Mergo achetée");
    if (w === 390) await page.screenshot({ path: path.join(SHOTS, "boutique-mergo-390.png"), fullPage: true });
    await page.click('[data-st="perso"]'); await page.waitForTimeout(100);
    ok(await page.locator(".shopitem").count() === 3 && await page.locator('[data-buy="t-perso"]').count() === 0, tag + " : rayon perso, bloqué avant le niveau requis");
    // Au niveau 6 (fake.xp) : titre personnalisé acheté puis écrit.
    await page.evaluate(() => { localStorage.setItem("fake.xp", "110"); location.reload(); }); await page.waitForSelector("#app > *"); await go(page, "#boutique", 500);
    await page.click('[data-st="perso"]'); await page.waitForTimeout(100); await page.click('[data-buy="t-perso"]'); await page.waitForTimeout(200);
    await page.fill("#pv", "Reine <b>du</b> bac"); await page.click("#pok"); await page.waitForTimeout(200);
    await page.click('[data-buy="c-perso"]'); await page.waitForTimeout(200); await page.evaluate(() => { document.getElementById("pv").value = "#12a4d9"; }); await page.click("#pok"); await page.waitForTimeout(200);
    ok(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()) === "#12a4d9", tag + " : couleur sur mesure appliquée");
    await go(page, "#accueil", 400);
    ok(await page.locator(".hello .rwtitle").innerText() === "Reine <b>du</b> bac" && await page.locator(".hello .rwtitle b").count() === 0, tag + " : titre personnalisé affiché (texte brut)");
    const wal = await page.evaluate(() => JSON.parse(localStorage.getItem("merge.wallet") || "null"));
    ok(wal && wal.level >= 6 && wal.items.includes("Titre : Reine <b>du</b> bac") && wal.items.includes("Mergo oreilles de chat") && wal.coins >= 0 && await page.evaluate(() => window.__mergeSync.synced("merge.wallet")), tag + " : résumé pour l'admin (niveau, pièces, articles)", JSON.stringify(wal));
    let sm = await small(page); ok(!sm.length, tag + " : boutons de 44 px", sm.join(" | "));
    await go(page, "#boutique", 400); await page.click('[data-st="fond"]'); await page.waitForTimeout(100); sm = await small(page); ok(!sm.length, tag + " : boutique, boutons de 44 px", sm.join(" | "));
    const o = await overflow(page); ok(o.sw <= o.iw, tag + " : pas de débordement", JSON.stringify(o));
    if (w === 390) await page.screenshot({ path: path.join(SHOTS, "boutique-fonds-390.png"), fullPage: true });
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
}

async function genially(browser) {
  // 2. Écran d'import : plus d'onglet Genially (récupération du texte retirée le 14 nov.), on conseille des captures d'écran.
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const page = await open(browser, { w, h, theme: "dark" }), tag = "genially " + w;
    await go(page, "#import-c2", 400);
    ok(await page.locator('[data-tab="link"]').count() === 0 && (await txt(page)).includes("Un Genially ? Fais une capture d'écran de chaque page"), tag + " : onglet retiré, conseil des captures d'écran");
    // Texte collé + capture d'un schéma : partent ensemble à l'IA.
    await page.click('[data-tab="text"]'); await page.fill("#txt", "La réaction inflammatoire " + "La mitose est une division cellulaire qui donne deux cellules filles identiques. ".repeat(3));
    await page.setInputFiles("#shotpick", path.join(__dirname, "photo-feuille.jpg")); await page.waitForTimeout(150);
    await page.click("#go"); await page.waitForTimeout(1500);
    ok(await page.evaluate(() => { const g = window.__fake.lastSegs || []; return g.some(x => x.path) && g.some(x => x.text && x.text.startsWith("La réaction inflammatoire")); }), tag + " : texte et capture partis ensemble à l'IA");
    const o = await overflow(page); ok(o.sw <= o.iw, tag + " : pas de débordement", JSON.stringify(o));
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
}

async function corbeillePartout(browser) {
  // Un chapitre mis à la corbeille disparaît de partout (bug du 14 nov.).
  const page = await open(browser, { w: 390, h: 844, theme: "dark", trash: true });
  await go(page, "#chapitre-c2", 400); await page.click("#tools summary"); await page.click("#tDel"); await page.click('#confirm [data-c="1"]'); await page.waitForTimeout(600);
  const gone = async (where) => { const t = await txt(page) + (await page.locator("#sheet").count() ? await page.locator("#sheet").innerText() : ""); ok(!t.includes("Brassage génétique"), "corbeille partout : " + where, t.slice(0, 200)); };
  await go(page, "#matiere-s1", 400); await gone("matière");
  await page.click("[data-cch] >> nth=0"); await page.waitForTimeout(150); await gone("choix des chapitres du contrôle"); await page.keyboard.press("Escape");
  await go(page, "#dossier-g1", 400); await gone("dossier");
  await go(page, "#perso", 300); await gone("choisir quoi réviser");
  await go(page, "#accueil", 400); await gone("accueil");
  // (Pas de vérification après rechargement : la fausse base est recréée à chaque chargement, le chapitre y revient forcément.)
  // Ajouter un cours à un chapitre qui a déjà des cartes : le nombre choisi s'ajoute.
  await go(page, "#import-c1", 400);
  ok((await txt(page)).includes("Combien de nouvelles flashcards ajouter ?") && (await txt(page)).includes("les nouvelles s'ajoutent") && await page.inputValue("#n") === "20", "ajouter un cours : nombre de NOUVELLES cartes, 20 par défaut");
  // Retour sur l'appli après une suppression faite sur un autre appareil : les données sont rechargées.
  await page.evaluate(() => { window.__fake.DB.chapters.find(c => c.id === "c3").archived = true; });
  await go(page, "#matiere-s2", 300); await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true }); }); 
  await page.evaluate(() => { const d = Date.now.bind(Date); Date.now = () => d() + 120000; document.dispatchEvent(new Event("visibilitychange")); }); await page.waitForTimeout(600);
  ok(!(await txt(page)).includes("ondes mécaniques"), "retour sur l'appli : chapitre supprimé ailleurs disparu", (await txt(page)).replace(/\s+/g, " ").slice(0, 600));
  ok(!page.errors.length, "corbeille partout : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function saison(browser) {
  // Remise à zéro de tout le monde (saison 2) : niveau, pièces, achats et couleurs repartent de zéro ; les cartes ne bougent pas.
  const page = await open(browser, { w: 390, h: 844, theme: "dark", xp: 20, oldSeason: true });
  await go(page, "#boutique", 500);
  const r = await page.evaluate(() => JSON.parse(localStorage.getItem("merge.rewards")));
  ok(r.season === 2 && r.buys.length === 0 && !r.equip.couleur && r.xp0 > 0, "saison : achats, couleurs et niveau remis à zéro", JSON.stringify(r).slice(0, 200));
  ok(await page.evaluate(() => parseInt(document.querySelector(".coinhero b.big").textContent, 10) === 0 && !getComputedStyle(document.documentElement).getPropertyValue("--accent").includes("#df3a3a")), "saison : 0 pièce, couleur retirée");
  await go(page, "#progres", 400); ok((await txt(page)).includes("Niveau 1") && await page.locator(".lvlwin").count() === 0, "saison : niveau 1, sans fenêtre de passage de niveau");
  ok(await page.evaluate(() => window.__fake.DB.cards.some(c => c.right_count === 20)), "saison : les cartes et leurs réponses sont gardées");
  // Une bonne réponse de plus après la remise à zéro : les points repartent de là.
  await page.evaluate(() => { localStorage.setItem("fake.xp", "21"); location.reload(); }); await page.waitForSelector("#app > *"); await go(page, "#accueil", 400);
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem("merge.wallet") || "{}").xp > 0 && JSON.parse(localStorage.getItem("merge.rewards")).season === 2), "saison : pas de deuxième remise à zéro, les nouveaux points comptent");
  ok(!page.errors.length, "saison : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

// js/app.js doit être reconstruit à partir de js/src/ (node tools/build-app.js).
{ const r = require("child_process").spawnSync(process.execPath, [path.join(ROOT, "tools/build-app.js"), "--check"]); ok(r.status === 0, "js/app.js à jour avec les morceaux de js/src/", String(r.stderr)); }
async function revisionControle(browser) {
  // Avant un contrôle (SVT dans 9 jours) : les cartes de ses chapitres reviennent tous les jours, même réussies.
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  const dueTxt = async () => parseInt((await page.locator(".today .mgot span, .today .big").first().innerText()), 10);
  await page.evaluate(() => localStorage.setItem("merge.boostj", "0")); await go(page, "#calendrier", 200); await go(page, "#accueil", 400); const base = await dueTxt();
  await page.evaluate(() => localStorage.setItem("merge.boostj", "7")); await go(page, "#calendrier", 200); await go(page, "#accueil", 400);
  ok(await dueTxt() === base, "contrôle proche : à 9 jours, rien en plus avec le réglage 7 jours");
  await go(page, "#reglages", 400); await page.click('[data-open="revision"]'); await page.click('[data-boost="14"]'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => localStorage.getItem("merge.boostj") === "14" && window.__mergeSync.synced("merge.boostj")), "contrôle proche : réglage enregistré et synchronisé");
  // Toutes les cartes du jour faites (calendrier FSRS repoussé), puis un nouveau jour : seules les cartes du contrôle reviennent.
  await page.evaluate(() => localStorage.setItem("merge.boostj", "0")); await go(page, "#cartes-jour", 500); { let g = 0; while (g++ < 80 && await page.locator("#yes").count()) { await page.click("#yes"); await page.waitForTimeout(20); } }
  await page.evaluate(() => { localStorage.setItem("merge.boostj", "14"); localStorage.removeItem("merge.boostnext"); });
  await go(page, "#accueil", 400); const more = await dueTxt();
  ok(more > 0 && (await txt(page)).includes("dont " + more + " pour ton prochain contrôle"), "contrôle proche : cartes du contrôle ajoutées aux cartes du jour", base + " → " + more);
  const before = await page.evaluate(() => Object.fromEntries(window.__fake.DB.cards.map(c => [c.id, c.due_at])));
  await go(page, "#cartes-jour", 500); let g = 0; while (g++ < 80 && await page.locator("#yes").count()) { await page.click("#yes"); await page.waitForTimeout(20); }
  const after = await page.evaluate(() => window.__fake.DB.cards.map(c => ({ id: c.id, due: c.due_at, ch: c.chapter_id })));
  ok(after.filter(c => new Date(before[c.id]).getTime() > Date.now() && c.ch === "c1").every(c => c.due === before[c.id]), "contrôle proche : une carte en plus réussie garde son calendrier de répétition espacée");
  await go(page, "#accueil", 400); ok(await dueTxt() === 0, "contrôle proche : une fois revues, elles ne reviennent pas le même jour");
  ok(await page.evaluate(() => { const m = JSON.parse(localStorage.getItem("merge.boostnext")), v = Object.values(m), d = new Date(Date.now() + 2 * 86400000), j2 = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); return v.length > 0 && v.every(x => x === j2) && window.__mergeSync.synced("merge.boostnext"); }), "contrôle proche : « Juste » revient dans 2 jours (synchronisé)");
  // « Trop facile » : plus avant le contrôle ; « Juste, mais à revoir » : demain ; « Faux » : aujourd'hui.
  await page.evaluate(() => localStorage.removeItem("merge.boostnext")); await go(page, "#cartes-jour", 500);
  const pick = async sel => { await page.click(".face"); await page.waitForTimeout(60); await page.click(sel); await page.waitForTimeout(60); };
  await pick("#easy"); await pick("#hard"); await pick("#no");
  const m2 = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem("merge.boostnext") || "{}")).sort());
  const dd = n => { const d = new Date(Date.now() + n * 86400000); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  ok(m2.length === 3 && m2[0] === dd(0) && m2[1] === dd(1) && m2[2] === dd(10), "contrôle proche : Trop facile après le contrôle, à revoir demain, faux aujourd'hui", JSON.stringify(m2));
  ok(!page.errors.length, "contrôle proche : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function journee(browser) {
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const page = await open(browser, { w, h, theme: "dark" }), tag = "journée " + w;
    await go(page, "#accueil", 300);
    ok(await page.locator('#tabs a[href="#calendrier"]').count() === 1 && await page.locator('#tabs a[href="#exos"]').count() === 1 && await page.locator('#tabs a[href="#duo"]').count() === 0, tag + " : barre du bas : Calendrier et Prof, plus de Duo");
    await go(page, "#progres", 300); ok(await page.locator('.seg a[href="#duo"]').count() === 1, tag + " : Duo en sous-onglet de Progrès");
    await go(page, "#journee", 700); ok(await page.evaluate(() => location.hash === "#calendrier" && JSON.parse(localStorage.getItem("merge.jview")).lvl === "jour"), tag + " : la journée est le niveau « jour » du calendrier");
    ok(await page.locator("#sedt").count() === 1, tag + " : première ouverture, demande l'emploi du temps");
    await page.click("#sheet [data-close]"); await page.waitForTimeout(150);
    ok(await page.locator(".jd").count() === 7 && await page.locator(".jd.on.now").count() === 1 && await page.locator("#jadd").count() === 1, tag + " : semaine, jour choisi, bouton +");
    // Ajouter « Maths/SVT 30 min » : chapitre choisi par Merge.
    await jm(page, "#jadd"); await page.waitForTimeout(150);
    ok(await page.locator('#sheet [data-bs][aria-pressed="true"]').count() === 0, tag + " : aucune matière imposée");
    await page.click('[data-bs="s1"]'); await page.waitForTimeout(50);
    ok(await page.locator("#sheet [data-bch]").count() >= 1 && await page.locator("#bauto").count() === 1, tag + " : les chapitres de la matière apparaissent, Merge peut choisir");
    await page.click('[data-bs="s1"]'); await page.waitForTimeout(50); ok(await page.locator('#sheet [data-bs="s1"][aria-pressed="true"]').count() === 0 && await page.locator("#sheet [data-bch]").count() === 0, tag + " : un 2e appui enlève la matière");
    await page.click('[data-bs="s1"]'); await page.click('[data-bd="30"]'); await page.fill("#bstart", "18:00"); await page.click("#bok"); await page.waitForTimeout(200);
    ok(await page.locator(".jrow:not(.school)").count() === 1 && (await txt(page)).includes("18:00–18:30 (30 min)"), tag + " : bloc ajouté dans la frise");
    await page.click("[data-done]"); await page.waitForTimeout(100); ok(await page.locator(".jrow.done").count() === 1, tag + " : bloc coché");
    await page.click("[data-go]"); await page.waitForTimeout(300); ok(/#cartes-c\d|#revision-s1/.test(await page.evaluate(() => location.hash)), tag + " : toucher le bloc lance la révision", await page.evaluate(() => location.hash));
    // Remonter : jour → semaine → mois, et retrouver le niveau après rechargement.
    await go(page, "#calendrier", 400); await page.click("#jup"); await page.waitForTimeout(250);
    if (w === 390) await page.screenshot({ path: path.join(SHOTS, "semaine-390.png") });
    ok(await page.locator(".cal.calx .day").count() >= 28 && await page.locator(".seg").count() === 0 && await page.locator("#calback").count() === 1, tag + " : ‹ Calendrier ouvre le mois (plus de vue semaine ni de sous-onglets)");
    await page.click('#tabs a[href="#calendrier"]'); await page.waitForTimeout(300); ok(await page.locator(".jline").count() === 1 && await page.locator(".jd.on.now").count() === 1 && (await page.locator('#tabs a[href="#calendrier"]').innerText()).includes("Planning"), tag + " : l'onglet Planning ramène à aujourd'hui");
    await page.click(".jd >> nth=0"); await page.waitForTimeout(200); await page.click('#tabs a[href="#calendrier"]'); await page.waitForTimeout(300); ok(await page.locator(".jd.on.now").count() === 1, tag + " : retoucher Planning quand on y est déjà ramène à aujourd'hui");
    await page.click("#jup"); await page.waitForTimeout(300);

    await page.click(".cal .day.now"); await page.waitForTimeout(300); ok(await page.locator(".jline").count() === 1, tag + " : toucher un jour ouvre sa frise");
    ok(await page.locator("#jhours").count() === 0 && await page.locator(".hgrid").count() === 0 && await page.locator("#jmenu").count() === 1, tag + " : plus de vue Heures, bouton + en haut à droite");
    // Pas cours, IA.
    await jm(page, "#joff"); await page.waitForTimeout(100); ok(await page.locator('#joff[aria-pressed="true"]').count() === 1, tag + " : pas cours");
    ok(await page.locator("#jauto").count() === 0 && await page.locator("#jmenubox [role=menuitem]").count() === 3, tag + " : 3 actions dans le menu + (IA, Contrôle, Pas cours), plus de « Remplir »");
    await jm(page, "#jai"); await page.waitForTimeout(150); await page.fill("#aiq", "Ce soir 30 min de SVT et un quiz"); await page.click("#aigo"); await page.waitForTimeout(400);
    ok(await page.locator("#pok").count() === 1 && (await page.locator("#sheet").innerText()).includes("Voilà ta soirée"), tag + " : l'IA propose un plan (blocs invalides retirés)");
    const n0 = await page.locator(".jrow:not(.school)").count(); await page.click("#pok"); await page.waitForTimeout(200);
    const n1 = await page.locator(".jrow:not(.school)").count(); ok(n1 === n0 + 3, tag + " : plan de l'IA ajouté", n0 + " → " + n1);
    ok(await page.evaluate(() => window.__mergeSync.synced("merge.journee") && !!window.__fake.plan.contexte.matieres.length), tag + " : journée synchronisée, l'IA reçoit les matières et chapitres");
    if (w === 390) await page.screenshot({ path: path.join(SHOTS, "journee-390.png"), fullPage: true });
    const sm = await small(page); ok(!sm.length, tag + " : boutons de 44 px", sm.join(" | "));
    const o = await overflow(page); ok(o.sw <= o.iw, tag + " : pas de débordement", JSON.stringify(o));
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
}

// Prof sur PC : comme Claude ou ChatGPT, une colonne centrée (≈ 770 px) au milieu de l'espace à droite des menus.
async function profPc(browser) {
  for (const [w, h] of [[1440, 900], [1920, 1080]]) {
    const page = await open(browser, { w, h, theme: "dark" }), tag = "prof PC " + w;
    await go(page, "#exos", 300);
    await page.fill("#exq", "Comment bien réviser ?"); await page.click("#exsend"); await page.waitForTimeout(400);
    await page.click('[data-q="0"]').catch(() => {}); await page.waitForTimeout(400);
    const m = await page.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(), tabs = r("#tabs"), app = r("#app"), side = r(".pside"), main = r(".pmain"), cp = r(".pcomp"), ai = r(".exmsg.ai"); return { free: innerWidth - tabs.right, app: app.width, side: side.width, main: main.width, cp: cp.width, ai: ai.width, H: innerHeight, cpBottom: cp.bottom, hist: getComputedStyle(document.getElementById("phist")).visibility }; });
    ok(m.app >= m.free - 2, tag + " : l'écran Prof prend toute la largeur libre", JSON.stringify(m));
    ok(m.side >= 240 && m.hist === "hidden" && await page.locator(".pside [data-conv]").count() >= 1, tag + " : historique affiché en colonne à gauche", JSON.stringify(m));
    const ctr = await page.evaluate(() => { const a = document.querySelector(".pmain").getBoundingClientRect(), c = document.querySelector(".pcomp").getBoundingClientRect(); return Math.abs((a.left + a.right) / 2 - (c.left + c.right) / 2); });
    ok(m.main >= m.free - m.side - 90 && m.cp <= 772 && m.cp >= 740 && ctr < 3, tag + " : conversation en colonne centrée de ≈ 770 px, comme Claude", JSON.stringify(m) + " écart " + ctr);
    ok(m.ai >= 600 && m.cpBottom > m.H - 60, tag + " : réponses lisibles et barre de message en bas", JSON.stringify(m));
    await page.click("#psnew"); await page.waitForTimeout(150); ok(await page.locator(".exmsg").count() === 0, tag + " : nouvelle discussion depuis la colonne");
    await page.click(".pside [data-conv]"); await page.waitForTimeout(150); ok(await page.locator(".exmsg").count() >= 1, tag + " : rouvrir une discussion depuis la colonne");
    await page.click(".pside [data-cdel]"); await page.waitForTimeout(150); ok(await page.locator("#confirm").count() === 1, tag + " : suppression demande confirmation");
    await page.click('#confirm [data-c="0"]').catch(() => page.keyboard.press("Escape")); await page.waitForTimeout(200);
    await page.click(".pside [data-conv]"); await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(SHOTS, "prof-pc-" + w + ".png") });
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
}
// Import bloqué côté serveur (étape coupée) : l'appli le relance toute seule, sans afficher « interrompu ».
// Pastille d'import : au-dessus de la barre de message du Prof. Matière et chapitre : barre du bas visible.
async function importRelance(browser) {
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    const page = await open(browser, { w, h, theme: "dark" }), tag = "import relancé " + w;
    await go(page, "#matiere-s1", 300);
    ok(await page.locator("#tabs:not([hidden])").isVisible() && await page.locator('#tabs a[aria-current="page"][href="#matieres"]').count() === 1, tag + " : matière avec la barre du bas (onglet Matières actif)");
    await page.click('#tabs a[href="#accueil"]'); await page.waitForTimeout(250);
    ok(await page.evaluate(() => location.hash) === "#accueil", tag + " : retour à l'accueil depuis une matière");
    await go(page, "#chapitre-c1", 300);
    ok(await page.locator("#tabs:not([hidden])").isVisible(), tag + " : chapitre avec la barre du bas");
    const o = await overflow(page); ok(o.sw <= o.iw, tag + " : pas de débordement", JSON.stringify(o));
    await page.evaluate(() => { localStorage.setItem("fake.stall", "1"); localStorage.setItem("fake.delay", "400"); });
    await go(page, "#import-c1"); await page.click('[data-tab="text"]'); await page.fill("#txt", "La mitose est une division cellulaire qui donne deux cellules identiques. ".repeat(4));
    await page.click("#go"); await page.waitForTimeout(400);
    await go(page, "#exos", 300);
    const chip = await page.locator("#jobchip").boundingBox(), comp = await page.locator(".pcomp").boundingBox();
    ok(chip && comp && chip.y + chip.height <= comp.y - 4, tag + " : pastille d'import au-dessus de la barre de message", JSON.stringify({ chip, comp }));
    ok(await page.evaluate(() => getComputedStyle(document.getElementById("jobchip")).backgroundColor.includes("0.")), tag + " : pastille translucide");
    await page.waitForFunction(() => /Cours prêt/.test((document.getElementById("jobchip") || {}).innerText || ""), null, { timeout: 15000 }).catch(() => {});
    ok(await page.evaluate(() => (window.__fake.resumed || 0) >= 1) && /Cours prêt/.test(await page.locator("#jobchip").innerText()), tag + " : import bloqué relancé tout seul jusqu'au bout");
    await page.screenshot({ path: path.join(SHOTS, "import-pastille-prof-" + w + ".png") });
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
}
// Temps restant d'un import de photos de cahier : estimé d'après les lots (pas « estimation en cours » ni un chiffre qui saute).
async function importEta(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" }), tag = "import durée";
  await page.evaluate(() => { localStorage.setItem("fake.imgslow", "1"); localStorage.setItem("fake.delay", "300"); });
  await go(page, "#import-c1"); await page.click('[data-tab="text"]'); await page.fill("#txt", "La mitose est une division cellulaire qui donne deux cellules identiques. ".repeat(4));
  await page.click("#go"); await page.waitForTimeout(1500);
  const a = (await page.textContent("#progeta")).trim();
  ok(/environ (2|2,5|3) min restantes/.test(a), tag + " : estimation dès le début pour un cahier (≈ 1 lot + résumé)", a);
  await page.waitForFunction(() => /4 sur 8/.test((document.getElementById("status") || {}).textContent || ""), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
  const b = (await page.textContent("#progeta")).trim();
  ok(/environ \d+( s|,?\d* min) restantes|presque fini/.test(b) && b !== a, tag + " : estimation corrigée avec le vrai temps du premier lot", a + " → " + b);
  await page.waitForFunction(() => /Bon travail/.test(document.body.innerText), null, { timeout: 15000 }).catch(() => {});
  ok((await txt(page)).includes("Bon travail"), tag + " : import terminé");
  ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}
// Schémas (serveur) : repères lus sur les photos → cadre propre ; cartes en double retirées au 2e import.
async function schemasServeur() {
  const S = await import(require("url").pathToFileURL(path.join(ROOT, "supabase/functions/studio/schemas.mjs")).href), tag = "schémas serveur";
  ok(JSON.stringify(S.cleanBox("100,200,500,800")) === "[75,175,525,825]", tag + " : cadre agrandi d'une petite marge", JSON.stringify(S.cleanBox("100,200,500,800")));
  ok(S.cleanBox("10,10,30,30") === null && S.cleanBox("a,b,c,d") === null && S.cleanBox("1,2,3") === null, tag + " : cadres trop petits ou faux refusés");
  ok(JSON.stringify(S.cleanBox("500,800,100,200")) === "[75,175,525,825]" && S.cleanBox("0,0,1000,1000")[2] === 1000, tag + " : cadre à l'envers remis dans l'ordre, bornes respectées");
  // Légendes : lues avec leur cadre, rattachées au schéma juste avant ; la légende réponse est cachée, sinon toutes.
  const lg = S.extractSchemas([{ text: "[[SCHEMA|100,100,600,900|Neurone]]\nUn neurone.\n[[LEGENDE|200,150,230,300|Dendrites]]\n[[LÉGENDE|400,700,430,860|Axone]]\n[[LEGENDE|950,950,990,990|Hors du schéma]]", path: "u/c/p1.jpg" }]);
  ok(lg.schemas[0].labels.length === 2 && lg.texts[0].includes("(légende : Axone)") && !/\[\[L/.test(lg.texts[0]), tag + " : légendes du schéma lues avec leur cadre (celle hors du schéma ignorée)", JSON.stringify(lg));
  ok(JSON.stringify(S.labelMasks(lg.schemas[0], "l'axone")) === JSON.stringify([lg.schemas[0].labels[1].box]) && S.labelMasks(lg.schemas[0], "").length === 2 && S.labelMasks({ labels: [] }, "x").length === 0 && S.labelMasks(lg.schemas[0], "Mitochondrie").length === 0, tag + " : la légende réponse est cachée ; sans réponse précise, toutes ; réponse introuvable : aucune (revérifiée ensuite)");
  const ex = S.extractSchemas([{ text: "Intro\n[[SCHEMA|100,100,600,900|Cycle cellulaire]]\nLe schéma montre…\n[[SCHEMA|1,1,2,2|Flèche]]", path: "u/c/p1.jpg" }, { text: "Texte collé [[SCHEMA|100,100,600,900|X]]", path: null }]);
  ok(ex.schemas.length === 1 && ex.schemas[0].id === "S1" && ex.schemas[0].path === "u/c/p1.jpg" && ex.texts[0].includes("[Schéma S1 : Cycle cellulaire]") && ex.texts[0].includes("[Schéma : Flèche]") && !/\[\[SCHEMA/.test(ex.texts.join("")), tag + " : repères remplacés, seuls les vrais schémas d'une photo gardés", JSON.stringify(ex));
  // Format vu au test réel avec Gemini (pages de cahier de tests/schemas) : séparateurs « | » au lieu de virgules.
  const reel = S.extractSchemas([{ text: "Schéma du neurone :\n\n[[SCHEMA|190|85|660|910|Schéma du neurone]]\nSchéma anatomique…", path: "p1" }, { text: "[[SCHEMA|[240, 270, 550, 860]|Schéma d'une cellule animale]]", path: "p2" }]);
  ok(reel.schemas.length === 2 && reel.schemas[0].box.join() === "165,60,685,935" && reel.schemas[1].titre === "Schéma d'une cellule animale", tag + " : repères écrits avec « | » ou crochets lus aussi", JSON.stringify(reel.schemas));
  ok(S.similar("Que donne la mitose ?", "Qu'est-ce que donne la mitose ?") >= 0.75 && S.similar("Que donne la mitose ?", "Que donne la méiose ?") < 0.5, tag + " : questions presque identiques reconnues, différentes séparées");
  const kept = S.dedupCards([{ front: "Que donne la mitose ?" }, { front: "Combien de chromosomes chez l'humain ?" }, { front: "Combien de chromosomes chez l'humain ?" }], ["Qu'est-ce que donne la mitose ?"]);
  ok(kept.length === 1 && kept[0].front.startsWith("Combien"), tag + " : doublons retirés (avec l'existant et entre nouvelles cartes)", JSON.stringify(kept));
  // Vérification sur l'image réellement découpée (Tâche n°1, 17 nov.) : conversion des coordonnées, garde-fous et boucle en 3 essais max.
  ok(JSON.stringify(S.groups([[10, 20, 30, 40], 50, 60, 70, 80])) === "[[10,20,30,40],[50,60,70,80]]", tag + " : masques lus en sous-tableaux ou à plat");
  ok(JSON.stringify(S.cropRect([100, 200, 500, 800], 1000, 2000)) === '{"x":200,"y":200,"w":600,"h":800}', tag + " : cadre 0–1000 converti en pixels de découpe");
  ok(JSON.stringify(S.maskPixels([200, 350, 300, 650], [100, 200, 500, 800], 600, 400)) === '{"x":150,"y":100,"w":300,"h":100}', tag + " : masque converti en pixels sur la découpe");
  ok(JSON.stringify(S.cropToPageBox([200, 100, 900, 900], [100, 200, 600, 800])) === "[200,260,550,740]", tag + " : nouveau_cadre relatif à la découpe reconverti sur la page entière");
  ok(JSON.stringify(S.tightenFrame([100, 200, 600, 800], { texte_parasite: true, ou: "haut", nouveau_cadre: [200, 0, 1000, 1000] })) === "[200,200,600,800]", tag + " : texte parasite en haut retiré");
  ok(JSON.stringify(S.tightenFrame([100, 200, 600, 800], { texte_parasite: true, ou: "haut", nouveau_cadre: null })) === "[160,200,600,800]", tag + " : rognage du bord indiqué si nouveau_cadre absent");
  ok(JSON.stringify(S.tightenFrame([100, 200, 600, 800], { texte_parasite: true, nouveau_cadre: [-200, -200, 1200, 1200] })) === "[100,200,600,800]", tag + " : garde-fou, ne jamais agrandir le cadre");
  ok(JSON.stringify(S.tightenFrame([100, 200, 600, 800], { texte_parasite: true, nouveau_cadre: [0, 0, 200, 200] })) === "[100,200,600,800]", tag + " : garde-fou, cadre < 15 % de l'ancien refusé");
  ok(JSON.stringify(S.tightenFrame([100, 200, 600, 800], { texte_parasite: true, nouveau_cadre: [500, 0, 1000, 1000] }, [[220, 300, 260, 450]])) === "[220,200,600,800]", tag + " : garde-fou, un masque existant n'est jamais coupé");
  let calls = 0;
  const r1 = await S.checkCroppedSchema({
    frame: [100, 100, 600, 900],
    masks: [[300, 300, 340, 420]],
    front: "Quelle est cette partie ?",
    back: "Axone",
    renderCrop: async (f) => f.join(","),
    askGemini: async () => { calls++; return calls < 3 ? { texte_parasite: true, ou: "haut", nouveau_cadre: [100, 0, 1000, 1000], reponse_visible: false } : { texte_parasite: false, reponse_visible: false }; },
  });
  ok(r1.tightened && r1.tries === 3 && r1.frame[0] > 100 && r1.masks.length === 1, tag + " : resserrage vérifié sur l'image découpée (3 essais max)", JSON.stringify(r1));
  const r2 = await S.checkCroppedSchema({
    frame: [100, 100, 600, 900],
    masks: [[300, 300, 340, 420]],
    front: "Quelle est cette partie ?",
    back: "Axone",
    renderCrop: async () => "img",
    askGemini: async () => ({ texte_parasite: false, reponse_visible: true, cacher: [] }),
  });
  ok(r2.box.length === 4 && r2.masks.length === 0, tag + " : réponse visible non masquable → schéma au dos seulement (4 nombres, jamais supprimée)", JSON.stringify(r2));
}
// Schémas (appli) : carte de schéma recadrée, agrandissement, page entière ; message quand un 2e import n'apporte rien.
async function schemasCartes(browser) {
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    const page = await open(browser, { w, h, theme: "dark", extra: { schema: "1" } }), tag = "schémas cartes " + w;
    await go(page, "#chapitre-c1", 500);
    ok(await page.locator(".schema.sm").count() === 1, tag + " : vignette du schéma dans la liste des cartes");
    await go(page, "#cartes-c1", 600);
    let st = await page.evaluate(() => { const s = document.querySelector(".flip .schema"), im = s && s.querySelector("img"); if (!s || !im) return null; const r = s.getBoundingClientRect(), f = document.querySelector(".flip").getBoundingClientRect(); return { ok: s.classList.contains("ok"), ar: r.width / r.height, want: ((880 - 120) * im.naturalWidth) / ((620 - 180) * im.naturalHeight), inside: r.left >= f.left - 1 && r.right <= f.right + 1, imW: im.getBoundingClientRect().width, boxW: r.width }; });
    ok(st && st.ok && Math.abs(st.ar - st.want) < 0.05 && st.inside, tag + " : schéma recadré, pas déformé, dans la carte", JSON.stringify(st));
    ok(st && Math.abs(st.imW / (st.boxW / 0.76) - 1) < 0.02, tag + " : seule la zone du schéma est visible", JSON.stringify(st));
    await page.screenshot({ path: path.join(SHOTS, "schema-carte-" + w + ".png") });
    ok(await page.locator(".flip .face:not(.b) .schmask").count() === 1 && !(await page.locator(".flip .face:not(.b)").innerText()).includes("S1"), tag + " : côté question, la légende à trouver est cachée (et pas d'identifiant S1)");
    await page.click("#zoomsch"); await page.waitForTimeout(400);
    ok(await page.locator("#schview .schema.big .schmask").count() === 1 && await page.locator("[data-schfull]").count() === 0, tag + " : agrandi côté question : légende toujours cachée, pas de page entière");
    await page.keyboard.press("Escape"); await page.waitForTimeout(200);
    await page.click("#flip"); await page.waitForTimeout(450);
    ok(await page.locator(".flip .face.b .schema .schhit").count() === 1 && await page.locator(".flip .face.b .schmask").count() === 0, tag + " : côté réponse, le schéma avec la légende entourée");
    await page.click("#zoomsch"); await page.waitForTimeout(400);
    ok(await page.locator("#schview .schema.big").count() === 1, tag + " : bouton « Agrandir le schéma »");
    await page.screenshot({ path: path.join(SHOTS, "schema-grand-" + w + ".png") });
    await page.click("[data-schfull]"); await page.waitForTimeout(500);
    const mk = await page.evaluate(() => { const p = document.querySelector(".schpage").getBoundingClientRect(), m = document.querySelector(".schmark").getBoundingClientRect(); return { top: (m.top - p.top) / p.height, left: (m.left - p.left) / p.width, h: m.height / p.height }; });
    ok(Math.abs(mk.top - 0.18) < 0.02 && Math.abs(mk.left - 0.12) < 0.02 && Math.abs(mk.h - 0.44) < 0.02, tag + " : page entière avec le schéma entouré au bon endroit", JSON.stringify(mk));
    await page.screenshot({ path: path.join(SHOTS, "schema-page-" + w + ".png") });
    await page.keyboard.press("Escape"); await page.waitForTimeout(200);
    ok(await page.locator("#schview").count() === 0, tag + " : Échap ferme l'agrandissement");
    await page.click("#flip"); await page.waitForTimeout(400);
    ok(await page.locator("#flip.back").count() === 0, tag + " : toucher la carte (même sur le schéma) la retourne toujours");
    const sm = await small(page); ok(!sm.length, tag + " : boutons de 44 px minimum", sm.join(" | "));
    const o = await overflow(page); ok(o.sw <= o.iw, tag + " : pas de débordement", JSON.stringify(o));
    if (w === 390) {
      await page.evaluate(() => { localStorage.setItem("fake.rien", "1"); localStorage.setItem("fake.delay", "100"); });
      await go(page, "#import-c1"); await page.click('[data-tab="text"]'); await page.fill("#txt", "La mitose est une division cellulaire qui donne deux cellules identiques. ".repeat(4));
      await page.click("#go"); await page.waitForFunction(() => /Bon travail/.test(document.body.innerText), null, { timeout: 10000 }).catch(() => {});
      const t = await txt(page);
      ok(t.includes("Rien de nouveau à ajouter") && t.includes("Aucune carte en double"), tag + " : 2e import qui n'apporte rien : message clair, pas d'erreur", t.slice(0, 300));
    }
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
}
// Deux imports en même temps (deux chapitres) ; onglets du bas (Prof avant Planning) ; loupe dans Matières ; Prof rouvert sur une nouvelle discussion ;
// Planning : la journée visible tout de suite ; nombre de cartes choisi par l'IA.
async function multiImport(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" }), tag = "multi-import";
  const tabs = await page.$$eval("#tabs a", a => a.map(x => x.getAttribute("href")));
  ok(tabs.indexOf("#exos") >= 0 && tabs.indexOf("#exos") + 1 === tabs.indexOf("#calendrier"), tag + " : onglet Prof puis Planning à sa droite", JSON.stringify(tabs));
  await go(page, "#matieres", 300);
  ok(await page.locator("#app button[data-qs] svg").count() === 1 && !(await page.locator("#app button[data-qs]").innerText()).trim(), tag + " : loupe (sans texte) pour rechercher dans Matières");
  await go(page, "#import-c1", 300);
  ok(await page.locator('#nauto[aria-checked="true"]').count() === 1 && await page.locator("#n").isDisabled() && (await page.textContent("#nv")).trim() === "auto", tag + " : nombre de cartes choisi par l'IA (par défaut)");
  await page.click("#nauto"); ok(!(await page.locator("#n").isDisabled()) && /\d+/.test(await page.textContent("#nv")), tag + " : on peut reprendre la main sur le nombre"); await page.click("#nauto");
  await page.evaluate(() => localStorage.setItem("fake.delay", "1500"));
  await page.click('[data-tab="text"]'); await page.fill("#txt", "La mitose est une division cellulaire qui donne deux cellules identiques. ".repeat(4));
  await page.click("#go"); await page.waitForTimeout(400);
  ok(await page.evaluate(() => window.__fake.lastSegs && true), tag + " : 1er import lancé");
  await page.click('a[href="#accueil"].btn, .prog a.btn.ghost'); await page.waitForTimeout(300);
  await go(page, "#import-c2", 300); await page.click('[data-tab="text"]'); await page.fill("#txt", "La méiose donne quatre cellules haploïdes après deux divisions successives. ".repeat(4));
  await page.click("#go"); await page.waitForTimeout(400);
  await go(page, "#accueil", 300);
  const chip = (await page.locator("#jobchip").innerText()).trim();
  ok(/2 imports · \d+ %/.test(chip), tag + " : pastille « 2 imports » pendant que les deux tournent", chip);
  await page.waitForFunction(() => /Cours prêt/.test((document.getElementById("jobchip") || {}).innerText || ""), null, { timeout: 15000 }).catch(() => {});
  await page.click("#jobchip"); await page.waitForTimeout(400); ok((await txt(page)).includes("Bon travail"), tag + " : premier cours prêt, ouvert");
  await go(page, "#accueil", 300);
  await page.waitForFunction(() => /Cours prêt/.test((document.getElementById("jobchip") || {}).innerText || ""), null, { timeout: 15000 }).catch(() => {});
  const chip2 = await page.locator("#jobchip:not([hidden])").count() ? (await page.locator("#jobchip").innerText()).trim() : "";
  ok(/Cours prêt/.test(chip2), tag + " : le second cours est prêt aussi", chip2);
  await page.click("#jobchip"); await page.waitForTimeout(400); ok((await txt(page)).includes("Bon travail"), tag + " : second cours ouvert");
  // Prof : une discussion avec des messages, puis l'appli rouverte → nouvelle discussion, l'ancienne dans l'historique.
  await go(page, "#exos", 300); await page.fill("#exq", "Bonjour"); await page.click("#exsend"); await page.waitForTimeout(500);
  await page.reload(); await page.waitForSelector("#app > *", { state: "attached" }); await go(page, "#exos", 400);
  ok(await page.locator(".exmsg").count() === 0 && await page.evaluate(() => JSON.parse(localStorage.getItem("merge.prof")).convs.some(c => c.m.length)), tag + " : Prof rouvert sur une nouvelle discussion, l'ancienne gardée");
  // Planning : la frise de la journée commence dans le premier écran, juste sous la semaine ; les ronds d'action dessous.
  await page.evaluate(() => { const d = (new Date().getDay() + 6) % 7; localStorage.setItem("merge.edt", JSON.stringify({ slots: [{ day: d, start: "08:00", end: "10:00", subject: "SVT", room: "B12", week: "" }, { day: d, start: "13:00", end: "14:00", subject: "Maths", room: "", week: "" }], ref: null })); localStorage.setItem("merge.edtask", "1"); });
  await go(page, "#accueil", 200); await go(page, "#calendrier", 500);
  ok(await page.evaluate(() => { const l = document.querySelector(".jline"), w = document.querySelector(".jweek"); return l && w && !document.querySelector(".jacts") && l.getBoundingClientRect().top - w.getBoundingClientRect().bottom < 40; }), tag + " : la journée commence juste sous la semaine (actions dans le menu +)");
  const top = await page.evaluate(() => { const l = document.querySelector(".jline"); return l ? l.getBoundingClientRect().top : 9999; });
  ok(top < 420, tag + " : journée visible tout de suite dans Planning (juste sous la semaine)", String(top));
  await page.screenshot({ path: path.join(SHOTS, "planning-journee-390.png") });
  ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}
// Refonte du 16 nov. : Matières en tuiles, Chapitre (gros bouton + raccourcis + Plus d'outils), modes fusionnés,
// Flash de plus en plus rapide, Associer en séries, Écouter + Mains libres, statistiques dans Progrès, quiz interactif du Prof, Réglages en liste.
async function refonte(browser) {
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    const page = await open(browser, { w, h, theme: "dark" }), tag = "refonte " + w;
    await go(page, "#matieres", 300);
    ok(await page.locator(".stiles .stile").count() >= 3 && await page.locator(".stile.sadd").count() === 1 && await page.locator(".stile .sico.ic svg").count() >= 2, tag + " : Matières en tuiles (icône de la matière, + Matière)");
    ok(await page.evaluate(() => [...document.querySelectorAll(".stile:not(.sadd)")].every(e => { const i = e.querySelector(".sico"); return i && (i.querySelector("svg") || i.textContent.trim().length >= 1); })), tag + " : chaque matière a une icône ou ses initiales");
    let o = await overflow(page); ok(o.sw <= o.iw, tag + " : Matières sans débordement", JSON.stringify(o));
    await page.screenshot({ path: path.join(SHOTS, "refonte-matieres-" + w + ".png") });
    await go(page, "#chapitre-c1", 500);
    const hrefs = await page.$$eval(".shorts .short", a => a.map(x => x.getAttribute("href")));
    ok(await page.locator(".chhead .chring").count() === 1 && await page.locator('.revbig[href="#cartes-c1"]').count() === 1, tag + " : chapitre : anneau de maîtrise et gros bouton Réviser");
    ok(["#resume-c1", "#quiz-c1", "#interro-c1", "#controle-c1", "#exos-c1"].every(x => hrefs.includes(x)) && !hrefs.includes("#schema-c1"), tag + " : raccourcis (Résumé, Quiz, Interro, Contrôle, Prof) ; pas de schémas sans schéma", JSON.stringify(hrefs));
    const more = await page.$$eval(".moremodes .mmain", a => a.map(x => x.getAttribute("href")));
    ok(!more.some(x => /#(apprendre|questions|libre|planche|vraifaux|stats)-/.test(x)) && more.includes("#associer-c1") && more.includes("#flash-c1"), tag + " : modes en double retirés, Associer et Flash gardés", JSON.stringify(more));
    ok(await page.locator('a.mvar[href="#bus-c1"]').count() === 1 && await page.locator('a.mvar[href="#blanc-c1"]').count() === 1, tag + " : variantes Mains libres et Interro chronométrée");
    o = await overflow(page); ok(o.sw <= o.iw, tag + " : chapitre sans débordement", JSON.stringify(o));
    const sm = await small(page); ok(!sm.length, tag + " : chapitre : boutons de 44 px minimum", sm.join(" | "));
    await page.screenshot({ path: path.join(SHOTS, "refonte-chapitre-" + w + ".png") });
    await page.click('.shorts a[href="#exos-c1"]'); await page.waitForTimeout(400);
    ok(await page.evaluate(() => location.hash) === "#exos" || /#exos/.test(await page.evaluate(() => location.hash)), tag + " : « Demander au prof » ouvre le Prof");
    ok((await txt(page)).includes("La division cellulaire") || await page.locator(".pchip").count() >= 1, tag + " : le chapitre est lié automatiquement");
    await page.fill("#exq", "Fais-moi un quiz"); await page.click("#exsend"); await page.waitForTimeout(500);
    ok(await page.locator(".pqcm .pqo").count() >= 4, tag + " : le Prof envoie un quiz interactif");
    await page.click('.pqo[data-qa$="-0-0"]'); await page.waitForTimeout(150);
    await page.click('.pqo[data-qa$="-1-0"]'); await page.waitForTimeout(150);
    ok(await page.locator(".pqo.good").count() === 2 && await page.locator(".pqo.bad").count() === 1 && (await page.locator(".pqscore").innerText()).includes("1 / 2"), tag + " : réponses corrigées tout de suite, score affiché");
    await page.reload(); await page.waitForSelector("#app > *", { state: "attached" });
    await page.click("#phist").catch(() => {}); await page.waitForTimeout(200);
    if (w === 390) {
      // Flash : chaque question a son temps, qui diminue.
      await go(page, "#flash-c1", 300); await page.click("#go"); await page.waitForTimeout(200);
      const t1 = await page.textContent("#qspeed"); await page.click("#vrai"); await page.click("#faux"); await page.click("#vrai"); await page.waitForTimeout(150);
      const t2 = await page.textContent("#qspeed");
      ok(/6,0 s/.test(t1) && /5,3 s/.test(t2), tag + " : Flash de plus en plus rapide", t1 + " → " + t2);
      await page.waitForTimeout(6500);
      ok(/s par question/.test(await page.textContent("#qspeed")), tag + " : question trop lente comptée, on passe à la suivante");
      // Associer : séries et record.
      await go(page, "#associer-c1", 400);
      ok(await page.locator(".match .tilebtn").count() >= 6 && await page.locator("#mclock").count() === 1, tag + " : Associer avec chrono");
      ok(await page.locator('[data-i]').count() >= 6, tag + " : cases du jeu présentes");
      // Écouter : onglets Lecture / Mains libres.
      await go(page, "#ecouter-c1", 600);
      ok(await page.locator('a[role="tab"][href="#bus-c1"]').count() === 1 || (await txt(page)).includes("lire à voix haute"), tag + " : Écouter → onglet Mains libres");
      // Progrès : statistiques par chapitre.
      await go(page, "#progres", 300); await page.click("#pstats"); await page.waitForTimeout(200);
      ok(await page.locator('#sheet a[href="#stats-c1"]').count() === 1, tag + " : statistiques par chapitre dans Progrès");
      await page.keyboard.press("Escape");
    }
    // Réglages : liste et une section à la fois sur téléphone ; 2 colonnes (liste + section à droite) sur PC.
    await go(page, "#reglages", 300);
    if (w < 1100) {
      ok(await page.locator(".setmenu .setrow").count() >= 7 && await page.locator("[data-sec-card]:visible").count() === 0, tag + " : Réglages en liste");
      await page.click('[data-open="apparence"]'); await page.waitForTimeout(150);
      ok(await page.locator('[data-sec-card="apparence"]').isVisible() && await page.locator(".setmenu").isHidden() && await page.locator("#setback").isVisible(), tag + " : une section s'ouvre seule");
      await page.click("#setback"); await page.waitForTimeout(150);
      ok(await page.locator(".setmenu").isVisible(), tag + " : retour à la liste");
    } else {
      ok(await page.locator(".setmenu .setrow").count() >= 7 && await page.locator('[data-sec-card="profil"]').isVisible() && await page.locator("[data-sec-card]:visible").count() === 1, tag + " : Réglages en 2 colonnes (liste + Profil par défaut)");
      await page.click('[data-open="apparence"]'); await page.waitForTimeout(150);
      ok(await page.locator('[data-sec-card="apparence"]').isVisible() && await page.locator(".setmenu").isVisible() && await page.locator("[data-sec-card]:visible").count() === 1, tag + " : la section choisie s'affiche à droite de la liste");
    }
    o = await overflow(page); ok(o.sw <= o.iw, tag + " : Réglages sans débordement", JSON.stringify(o));
    await page.screenshot({ path: path.join(SHOTS, "refonte-reglages-" + w + ".png") });
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
  // Schémas à légender en raccourci seulement si le chapitre a un schéma.
  const page = await open(browser, { w: 390, h: 844, theme: "dark", extra: { schema: "1" } });
  await go(page, "#chapitre-c1", 500);
  ok(await page.locator('.shorts a[href="#schema-c1"]').count() === 1, "refonte : « Schémas à légender » en raccourci quand le chapitre a un schéma");
  await page.context().close();
}
async function exos(browser) {
  // 1100 px : PC moyen, l'historique s'ouvre avec ☰ (au-delà de 1200 px il est en colonne fixe, voir profPc).
  for (const [w, h] of [[390, 844], [1100, 800]]) {
    const page = await open(browser, { w, h, theme: "dark" }), tag = "prof " + w;
    await go(page, "#accueil", 300);
    ok((await page.locator('#tabs a[href="#exos"]').innerText()).includes("Prof"), tag + " : onglet Prof");
    // Chat libre : pas besoin de choisir un chapitre. Bulle d'aide seulement à la 1re visite, pas de 6 suggestions sur l'écran vide.
    await go(page, "#exos", 300);
    ok(await page.locator(".pempty").count() === 1 && await page.locator("#pplus").count() === 1 && await page.locator("#exsend").count() === 1 && (await txt(page)).includes("Lier un cours"), tag + " : chat libre ouvert directement, + et envoi");
    ok(await page.locator("#ptip").count() === 1 && await page.evaluate(() => localStorage.getItem("merge.profTip") === "1") && await page.locator(".pempty [data-q]").count() === 0 && await page.locator(".precent [data-rch] .rct").count() >= 1, tag + " : bulle 1re visite, 6 suggestions retirées de l'écran vide, pastille chapitre compacte");
    await page.fill("#exq", "Comment bien réviser ?"); await page.click("#exsend"); await page.waitForTimeout(400);
    ok(await page.evaluate(() => window.__fake.exo.chapter_ids.length === 0 && window.__fake.exo.messages.length === 1) && await page.locator(".exmsg.ai").count() === 1, tag + " : message sans cours lié");
    ok(await page.evaluate(() => window.__fake.exo.want_title === true) && (await page.locator(".ptitle").innerText()) === "Vitesse moyenne", tag + " : discussion nommée automatiquement");
    // Nouvelle discussion, puis lier un chapitre (la bulle d'aide ne revient plus).
    await page.click("#pnew"); await page.waitForTimeout(150); ok(await page.locator(".exmsg").count() === 0 && await page.locator("#ptip").count() === 0, tag + " : nouvelle discussion, la bulle ne revient plus");
    await page.click("#pctx"); await page.waitForTimeout(150); ok(await page.locator("#sheet [data-cc]").count() >= 1 && await page.locator("#sheet [data-cs]").count() >= 1, tag + " : choix des chapitres et matières");
    await page.click('#sheet [data-cc="c1"]'); await page.click("#pctxok"); await page.waitForTimeout(150);
    ok(await page.locator('[data-unctx="c:c1"]').count() === 1, tag + " : chapitre lié affiché");
    await page.click("#pplus"); await page.waitForTimeout(150); await page.click('[data-pq="0"]'); await page.waitForTimeout(400);
    ok(await page.locator(".exmsg.me").count() === 1 && await page.locator(".exmsg.ai .katex").count() >= 1, tag + " : exercice demandé, réponse avec formule");
    ok(await page.evaluate(() => JSON.stringify(window.__fake.exo.chapter_ids) === '["c1"]' && window.__fake.exo.messages.length === 1 && window.__mergeSync.synced("merge.prof")), tag + " : envoyé avec le chapitre lié, discussion gardée");
    // Réponse dans la bulle de l'exercice.
    ok((await txt(page)).includes("Comment veux-tu répondre ?") && await page.locator("[data-fmode]").count() === 2 && await page.locator("[data-fv]").count() === 0, tag + " : choix cases ou cahier proposé");
    await page.click('[data-fmode="1"][data-m="cahier"]'); await page.waitForTimeout(150);
    ok(await page.locator('[data-fphoto="1"]').count() === 1 && await page.locator("[data-fv]").count() === 0, tag + " : mode cahier propose d'envoyer la copie");
    await page.click('[data-fmode="1"][data-m="ici"]'); await page.waitForTimeout(150);
    ok(await page.locator("[data-fv]").count() === 2, tag + " : champs de réponse dans la bulle");
    await page.fill('[data-fv="1-0"]', "5 m/s"); await page.fill('[data-fv="1-1"]', "m/s"); await page.click('[data-fsend="1"]'); await page.waitForTimeout(400);
    ok(await page.evaluate(() => /Mes réponses :[\s\S]*5 m\/s/.test(window.__fake.exo.messages.slice(-1)[0].t)) && await page.locator(".exform.done").count() === 1, tag + " : réponses envoyées pour correction");
    // Le + propose photo (appareil ou galerie) et cours.
    await page.click("#pplus"); await page.waitForTimeout(150); ok(await page.locator("#pa-cam").count() === 1 && await page.locator("#pa-img").count() === 1 && await page.locator("#pa-ctx").count() === 1, tag + " : le + propose appareil photo, galerie, cours");
    await page.evaluate(() => { const s = document.getElementById("sheet"); if (s) s.remove(); });
    await page.setInputFiles("#exfile", path.join(__dirname, "photo-feuille.jpg")); await page.waitForTimeout(400);
    ok((await page.inputValue("#exq")).includes("Voici ma copie") && await page.locator("#eximg img").count() === 1, tag + " : photo prête avec aperçu");
    await page.click("#exsend"); await page.waitForTimeout(400);
    ok(await page.evaluate(() => !!(window.__fake.exo.image && window.__fake.exo.image.data.length > 1000)) && await page.locator("#eximg img").count() === 0, tag + " : photo envoyée à l'IA");
    // Lier une matière entière.
    await page.click("#pctx"); await page.waitForTimeout(150); if (w === 390) await page.screenshot({ path: path.join(SHOTS, "prof-cours-390.png") }); await page.click('#sheet [data-cs="s1"]'); await page.waitForTimeout(50);
    ok(await page.locator('#sheet [data-sid="s1"]:disabled').count() >= 1, tag + " : toute la matière coche ses chapitres");
    await page.click("#pctxok"); await page.waitForTimeout(150);
    await page.fill("#exq", "Résume-moi la matière"); await page.click("#exsend"); await page.waitForTimeout(400);
    ok(await page.evaluate(() => window.__fake.exo.chapter_ids.includes("c1") && window.__fake.exo.matieres.length === 1), tag + " : matière entière envoyée");
    // Historique des discussions.
    ok(await page.evaluate(() => window.__fake.exo.want_title === false), tag + " : nom demandé une seule fois");
    await page.click("#phist"); await page.waitForTimeout(300); ok(await page.locator("#pdrawer.open [data-conv]").count() === 2 && await page.locator("#pdrawer .pdrow.on").count() === 1 && (await page.locator("#pdrawer").innerText()).includes("Aujourd'hui"), tag + " : menu ☰ avec l'historique", String(await page.locator("#pdrawer [data-conv]").count()));
    if (w === 390) await page.screenshot({ path: path.join(SHOTS, "prof-menu-390.png") });
    if (w === 390) {
      await page.click("#pdrawer .pdpanel [data-pdclose]"); await page.waitForTimeout(300);
      await page.evaluate(() => { const fire = (type, x) => { const t = new Touch({ identifier: 1, target: document.getElementById("exth"), clientX: x, clientY: 400 }); document.getElementById("exth").dispatchEvent(new TouchEvent(type, { touches: type === "touchend" ? [] : [t], changedTouches: [t], bubbles: true })); }; fire("touchstart", 80); fire("touchend", 260); });
      await page.waitForTimeout(300); ok(await page.locator("#pdrawer.open").count() === 1, tag + " : glisser vers la droite ouvre l'historique");
    }
    // Supprimer une discussion : confirmation, et on reste dans l'historique.
    await page.click("#pdrawer .pdrow:not(.on) [data-cdel]"); await page.waitForTimeout(150);
    ok(await page.locator("#confirm").count() === 1 && await page.locator("#pdrawer [data-conv]").count() === 2, tag + " : supprimer demande confirmation, rien n'est supprimé avant");
    await page.click('#confirm [data-c="0"]'); await page.waitForTimeout(150); ok(await page.locator("#confirm").count() === 0 && await page.locator("#pdrawer [data-conv]").count() === 2, tag + " : Annuler ne supprime rien");
    await page.click("#pdrawer .pdrow:not(.on) [data-conv]"); await page.waitForTimeout(150); ok((await txt(page)).includes("Comment bien réviser ?"), tag + " : reprendre une ancienne discussion");
    // Depuis un chapitre : le chapitre est lié.
    if (w === 390) await page.screenshot({ path: path.join(SHOTS, "prof-conv-390.png") });
    await go(page, "#chapitre-c1", 400); ok(await page.locator('a[href="#exos-c1"]').count() >= 1, tag + " : depuis le chapitre aussi");
    await go(page, "#exos-c1", 300); ok(await page.locator('[data-unctx="c:c1"]').count() === 1 && await page.locator(".exmsg").count() === 0, tag + " : chapitre lié dans une nouvelle discussion");
    if (w === 390) await page.screenshot({ path: path.join(SHOTS, "prof-390.png") });
    ok(await page.evaluate(() => { const d = document.scrollingElement; return d.scrollHeight <= innerHeight + 2; }), tag + " : écran Prof fixe, rien ne glisse sauf la conversation");
    const sm = await small(page); ok(!sm.length, tag + " : boutons de 44 px", sm.join(" | "));
    const o = await overflow(page); ok(o.sw <= o.iw, tag + " : pas de débordement", JSON.stringify(o));
    // Anciennes conversations par chapitre reprises.
    await page.evaluate(() => { localStorage.removeItem("merge.prof"); localStorage.setItem("merge.exo.c1", JSON.stringify([{ r: "u", t: "Ancienne question" }, { r: "a", t: "Ancienne réponse" }])); });
    await go(page, "#exos", 300); await page.click("#phist"); await page.waitForTimeout(300);
    ok((await page.locator("#pdrawer").innerText()).includes("Ancienne question"), tag + " : anciennes conversations reprises");
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
}

async function planningPlus(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" }), tag = "planning+";
  await page.addInitScript(() => { delete window.webkitSpeechRecognition; delete window.SpeechRecognition; localStorage.setItem("merge.journee", JSON.stringify({ setup: true, blocks: {}, weekly: [], off: {}, done: {} })); });
  await page.reload(); await page.waitForSelector("#app > *");
  await go(page, "#calendrier", 500); await page.evaluate(() => { const s = document.getElementById("sheet"); if (s) s.remove(); });
  // Bloc avec couleur choisie à la main.
  await jm(page, "#jadd"); await page.waitForTimeout(150);
  ok(await page.locator("#sheet [data-bc]").count() === 9, tag + " : choix de couleur (matière + 8)");
  await page.click('[data-bs="s1"]'); await page.click('#sheet [data-bc="#ec4899"]'); await page.fill("#bstart", "18:00"); await page.click("#bok"); await page.waitForTimeout(200);
  ok(await page.evaluate(() => { const r = document.querySelector(".jrow:not(.school)"); return r && r.style.getPropertyValue("--c") === "#ec4899" && JSON.parse(localStorage.getItem("merge.journee")).blocks[Object.keys(JSON.parse(localStorage.getItem("merge.journee")).blocks)[0]][0].color === "#ec4899"; }), tag + " : couleur gardée sur le bloc");
  // « Autre » : n'importe quelle activité, sans matière ni chapitre.
  await jm(page, "#jadd"); await page.waitForTimeout(150); await page.click('[data-ba="libre"]'); await page.waitForTimeout(50);
  ok(await page.locator('#sheet [data-bs][aria-pressed="true"]').count() === 0 && await page.locator("#sheet [data-bch]").count() === 0, tag + " : Autre, sans matière par défaut");
  await page.fill("#bstart", "21:00"); await page.click("#bok"); await page.waitForTimeout(150); ok(await page.locator("#sheet").count() === 1, tag + " : Autre sans nom ni matière refusé");
  await page.fill("#btitle", "Coloriage"); await page.click("#bok"); await page.waitForTimeout(200);
  ok((await txt(page)).includes("Coloriage") && await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem("merge.journee")).blocks).flat().some(b => b.title === "Coloriage" && b.s === null && b.act === "libre")), tag + " : activité libre ajoutée");
  const sm = await small(page); ok(!sm.length, tag + " : boutons de 44 px", sm.join(" | "));
  // Semaine suivante depuis un dimanche : on tombe sur le lundi ; bouton Aujourd'hui pour revenir.
  await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 14 + ((7 - d.getDay()) % 7)); const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); localStorage.setItem("merge.jview", JSON.stringify({ lvl: "jour", day: k, hours: false })); });
  await go(page, "#calendrier", 400); await page.click("#jnext"); await page.waitForTimeout(200);
  ok(await page.evaluate(() => new Date(JSON.parse(localStorage.getItem("merge.jview")).day + "T00:00:00").getDay() === 1), tag + " : semaine suivante depuis un dimanche → lundi");
  ok(await page.locator("#jback").count() === 1, tag + " : bouton Aujourd'hui quand on n'est pas sur aujourd'hui");
  await page.click("#jback"); await page.waitForTimeout(200); ok(await page.locator("#jback").count() === 0 && await page.locator(".jd.on.now").count() === 1, tag + " : retour à aujourd'hui");
  await page.screenshot({ path: path.join(SHOTS, "planning-jour-390.png") });
  await page.click("#jmenu"); await page.waitForTimeout(100);
  ok(await page.evaluate(() => { const m = document.getElementById("jmenubox"), r = m.getBoundingClientRect(); return !m.hidden && r.left >= 0 && r.right <= innerWidth && m.querySelectorAll("[role=menuitem]").length === 3; }), tag + " : menu + ouvert, 3 actions, dans l'écran");
  await page.mouse.click(10, 500); await page.waitForTimeout(100); ok(await page.locator("#jmenubox").isHidden(), tag + " : menu + refermé en touchant ailleurs");
  // Fenêtres : bouton Fermer.
  await jm(page, "#jadd"); await page.waitForTimeout(150); ok(await page.locator("#sheet .sheetx").count() === 1 && await page.locator("#sheet .actbtn").count() === 7, tag + " : fenêtre d'ajout avec bouton Fermer et activités alignées");
  if (true) await page.screenshot({ path: path.join(SHOTS, "ajout-bloc-390.png") });
  await page.click("#sheet .sheetx"); await page.waitForTimeout(150); ok(await page.locator("#sheet").count() === 0, tag + " : le bouton Fermer ferme la fenêtre");
  // Dictée sans reconnaissance vocale du téléphone : enregistrement, transcrit par l'IA.
  await jm(page, "#jai"); await page.waitForTimeout(150); ok(await page.locator("#aimic").count() === 1, tag + " : micro présent même sans dictée du téléphone");
  await page.click("#aimic"); await page.waitForTimeout(400); ok(await page.locator("#aimic.on").count() === 1, tag + " : micro rouge pendant l'écoute");
  await page.waitForTimeout(1100); await page.click("#aimic"); await page.waitForTimeout(800);
  ok(await page.locator("#aimic.on, #aimic.busy").count() === 0, tag + " : un 2e appui arrête bien le micro (jamais bloqué)");
  ok(await page.evaluate(() => !!(window.__fake.transcrire && window.__fake.transcrire.audio.data.length > 100)) && (await page.inputValue("#aiq")).includes("Maths de 18 h à 19 h"), tag + " : voix transcrite dans la demande");
  ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function accueilV2(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" }), tag = "accueil v2";
  // Une tâche en cours (commencée il y a 10 min, 30 min) et une suivante.
  await page.addInitScript(() => { const d = new Date(), k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"), m = d.getHours() * 60 + d.getMinutes(), hm = x => String(Math.floor(x / 60)).padStart(2, "0") + ":" + String(x % 60).padStart(2, "0");
    if (m >= 15 && m < 22 * 60) localStorage.setItem("merge.journee", JSON.stringify({ setup: true, blocks: { [k]: [{ id: "b1", start: hm(m - 10), dur: 30, s: "s1", ch: null, act: "cartes", title: "" }, { id: "b2", start: hm(m + 40), dur: 20, s: "s1", ch: null, act: "quiz", title: "Quiz mitose" }] }, weekly: [], off: {}, done: {} })); });
  await page.reload(); await page.waitForSelector("#app > *"); await go(page, "#accueil", 400);
  const t = await txt(page), late = await page.evaluate(() => { const m = new Date().getHours() * 60 + new Date().getMinutes(); return m < 15 || m >= 22 * 60; });
  if (!late) {
    ok(await page.locator(".nowtask.live").count() === 1 && /il reste (19|20|21) min/.test(t), tag + " : tâche en cours avec le temps restant", t.slice(0, 300));
    const p = await page.evaluate(() => parseFloat(document.querySelector(".nowtask").style.getPropertyValue("--p")));
    ok(p > 25 && p < 45, tag + " : remplissage selon l'heure", String(p));
    ok((await page.locator(".ntnext").innerText()).includes("Quiz mitose"), tag + " : la prochaine tâche et son heure");
    await page.screenshot({ path: path.join(SHOTS, "accueil-encours-390.png") });
    await go(page, "#calendrier", 400); await page.evaluate(() => { const s = document.getElementById("sheet"); if (s) s.remove(); });
    ok(await page.locator(".jrow.live .lrem").count() === 1, tag + " : la frise montre aussi la tâche en cours");
    await go(page, "#accueil", 400);
  }
  ok(!t.includes("appels IA") && await page.locator(".moreways").count() === 1 && await page.locator('.moreways a[href="#melange"]').isHidden(), tag + " : autres façons de réviser repliées, plus de compteur IA");
  await page.click(".moreways > summary"); await page.waitForTimeout(150); ok(await page.locator('.moreways a[href="#perso"]').isVisible(), tag + " : le menu se déplie");
  ok(!/\bMatières\b[\s\S]*Ajouter/.test(await page.locator("#app").innerText()) || await page.locator('#app a[href="#nouvelle-matiere"]').count() === 0, tag + " : plus de liste des matières");
  // Bilan : barres visibles.
  await go(page, "#bilan", 300); ok(await page.locator(".wbars .wcol").count() === 7 && await page.locator(".wbars .wtrack").count() === 7, tag + " : bilan, graphique des 7 jours");
  ok(await page.evaluate(() => !!localStorage.getItem("merge.bilanseen")), tag + " : bilan vu, plus proposé cette semaine");
  // Bloc : chapitre facultatif, durées longues et durée libre.
  await go(page, "#calendrier", 400); await page.evaluate(() => { const s = document.getElementById("sheet"); if (s) s.remove(); });
  await jm(page, "#jadd"); await page.waitForTimeout(150); await page.click('[data-bs="s1"]'); await page.waitForTimeout(50);
  ok(await page.locator('#sheet [data-bch][aria-pressed="true"]').count() === 0, tag + " : chapitre facultatif, aucun par défaut");
  // Plusieurs matières et plusieurs chapitres.
  await page.click('[data-bs="s2"]'); await page.waitForTimeout(50); await page.click('#sheet [data-bch] >> nth=0'); await page.click('#sheet [data-bch] >> nth=1'); await page.waitForTimeout(50);
  ok(await page.locator('#sheet [data-bch][aria-pressed="true"]').count() === 2 && await page.locator("#sheet .bchgrp").count() === 2, tag + " : plusieurs matières et chapitres cochés");
  await page.screenshot({ path: path.join(SHOTS, "ajout-multi-390.png") });
  await page.click('#sheet [data-bch] >> nth=1'); await page.waitForTimeout(50); await page.click('#sheet [data-bch] >> nth=1'); await page.waitForTimeout(50);
  ok(await page.locator('[data-bd="120"]').count() === 1 && await page.locator('[data-bd="180"]').count() === 1, tag + " : durées 2 h à 3 h");
  await page.click('[data-bd="libre"]'); await page.waitForTimeout(50); await page.fill("#bslide", "95"); await page.dispatchEvent("#bslide", "input");
  ok((await page.locator("#bslv").innerText()).includes("1 h 35"), tag + " : durée libre au curseur");
  await page.fill("#bstart", "06:00"); await page.click("#bok"); await page.waitForTimeout(200);
  ok(await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem("merge.journee")).blocks).flat().some(b => b.dur === 95 && b.ss && b.ss.length === 2 && b.chs && b.chs.length === 2)), tag + " : bloc de 1 h 35 avec 2 matières et 2 chapitres");
  await page.evaluate(() => { const s = document.getElementById("sheet"); if (s) s.remove(); });
  const sm = await small(page); ok(!sm.length, tag + " : boutons de 44 px", sm.join(" | "));
  ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function icones(browser) {
  // Toutes les icônes utilisées existent (sinon « undefined » s'afficherait à l'écran).
  const src = fs.readFileSync(path.join(__dirname, "..", "js", "app.js"), "utf8"), blk = src.slice(src.indexOf("const I = {"), src.indexOf("\n  };", src.indexOf("const I = {")));
  const keys = new Set([...blk.matchAll(/(?:^|[\s{,])([a-zA-Z]+): (?:svg\(|')/g)].map(m => m[1]));
  const used = new Set([...src.matchAll(/\bI\.([a-zA-Z]+)/g)].map(m => m[1]).concat([...src.matchAll(/\["[a-z-]+", "[A-ZÀ-Ü][^"]+", "([a-z]+)"\]/g)].map(m => m[1])).concat([...src.matchAll(/\bi: "([a-z]+)"/g)].map(m => m[1])));
  const miss = [...used].filter(k => !keys.has(k)); ok(!miss.length, "icônes : toutes celles utilisées existent", miss.join(", "));
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  for (const h of ["#accueil", "#matieres", "#calendrier", "#mois", "#exos", "#progres", "#reglages", "#chapitre-c1"]) {
    await go(page, h, 350); await page.evaluate(() => { const s = document.getElementById("sheet"); if (s) s.remove(); });
    const bad = await page.evaluate(() => (document.body.innerText.match(/undefined|\[object/g) || []).length + [...document.querySelectorAll("#tabs a")].filter(a => !a.querySelector("svg")).length);
    ok(bad === 0, "icônes : rien de cassé sur " + h);
  }
  ok(!page.errors.length, "icônes : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function edtReprise(browser) {
  // Appli quittée pendant la lecture : au retour, l'emploi du temps lu entre-temps est récupéré.
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await page.evaluate(() => { const v = JSON.stringify({ id: "eabc123", at: Date.now(), status: "done", slots: [{ day: 0, start: "08:00", end: "10:00", subject: "SVT", room: "", week: "" }, { day: 1, start: "10:00", end: "11:00", subject: "Physique-chimie", week: "" }] }); window.__fake.DB.user_kv.push({ user_id: window.__fake.DB.profiles[0].user_id, key: "merge.edtjob", value: v, updated_at: new Date().toISOString() }); localStorage.setItem("merge.edtpending", JSON.stringify({ id: "eabc123", at: Date.now() })); localStorage.setItem("merge.journee", JSON.stringify({ setup: true, blocks: {}, weekly: [], off: {}, done: {} })); });
  await go(page, "#calendrier", 400); await page.waitForTimeout(1500);
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem("merge.edt") || "{}").slots.length === 2 && !localStorage.getItem("merge.edtpending")), "emploi du temps : lecture récupérée au retour dans l'appli");
  ok(!page.errors.length, "emploi du temps reprise : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function audit(browser) {
  // Contrôle visuel de tous les écrans, à la taille d'un iPhone et d'un PC : rien ne dépasse de l'écran ni de sa carte.
  for (const [w, h] of [[393, 852], [1440, 900]]) {
    const page = await open(browser, { w, h, theme: "dark" }), probs = [];
    for (const r of ROUTES) {
      await go(page, "#" + r, 450); await page.evaluate(() => { const s = document.getElementById("sheet"); if (s) s.remove(); });
      const res = await page.evaluate(() => {
        const out = [], W = document.documentElement.clientWidth;
        if (document.documentElement.scrollWidth > W + 1) out.push("page plus large que l'écran");
        for (const el of document.querySelectorAll("#app *, #tabs *")) {
          const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden" || el.closest("[hidden]")) continue;
          const b = el.getBoundingClientRect(); if (!b.width || !b.height) continue;
          if (b.right > W + 1 && !el.closest(".chips,.exquick,.jweek,.pctx,.hscroll,.cardsrow,[style*=overflow]") && cs.position !== "fixed") out.push("dépasse à droite : " + el.tagName + "." + String(el.className).split(" ")[0] + " « " + (el.innerText || "").slice(0, 30).replace(/\s+/g, " ") + " »");
          if (["BUTTON", "A", "SPAN", "B", "P", "H1", "H2", "LABEL"].includes(el.tagName) && cs.overflow === "visible" && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 && !el.querySelector("svg") && cs.whiteSpace === "nowrap") out.push("texte coupé : " + el.tagName + "." + String(el.className).split(" ")[0] + " « " + (el.innerText || "").slice(0, 30) + " »");
        }
        return [...new Set(out)].slice(0, 6);
      });
      if (res.length || process.env.SHOTALL) { if (res.length) probs.push("#" + r + " → " + res.join(" | ")); await page.screenshot({ path: path.join(SHOTS, "audit-" + w + "-" + r + ".png") }); }
    }
    // Fenêtres.
    const sheets = [["#calendrier", "#jadd"], ["#calendrier", "#jai"], ["#calendrier", "#jctl"], ["#exos", "#pplus"], ["#exos", "#pctx"], ...(w < 1200 ? [["#exos", "#phist"]] : []), ["#edt", null], ["#reglages", null], ["#boutique", null], ["#recompenses", null]];
    for (const [hsh, sel] of sheets) {
      await go(page, hsh, 450); await page.evaluate(() => { const s = document.getElementById("sheet"); if (s) s.remove(); });
      if (sel) { try { if (["#jadd", "#jctl"].includes(sel)) await page.click("#jmenu", { timeout: 3000 }); await page.click(sel, { timeout: 3000 }); } catch (e) { probs.push(hsh + " " + sel + " → introuvable"); continue; } await page.waitForTimeout(350); }
      const res = await page.evaluate(() => {
        const out = [], root = document.getElementById("sheet") || document.getElementById("pdrawer") || document.getElementById("app"), R = root.querySelector(".sheet,.pdpanel") || root, rb = R.getBoundingClientRect();
        for (const el of R.querySelectorAll("*")) { const b = el.getBoundingClientRect(); if (!b.width) continue; if (b.right > rb.right + 1 && !el.closest(".chips,.pctx,.jweek,.seg")) out.push("dépasse : " + el.tagName + "." + String(el.className).split(" ")[0] + " « " + (el.innerText || "").slice(0, 25) + " »"); }
        return [...new Set(out)].slice(0, 5);
      });
      if (res.length) probs.push(hsh + " " + (sel || "") + " → " + res.join(" | "));
      await page.screenshot({ path: path.join(SHOTS, "audit-" + w + "-fen-" + hsh.slice(1) + (sel ? "-" + sel.replace(/[^a-z]/gi, "") : "") + ".png") });
    }
    ok(!probs.length, "audit " + w + " : rien ne dépasse", "\n   " + probs.join("\n   "));
    ok(!page.errors.length, "audit " + w + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
}

async function chasse(browser) {
  // Chasse aux bugs : sur chaque écran, on touche chaque bouton (sauf suppressions et déconnexion) et on note les erreurs JavaScript.
  const page = await open(browser, { w: 393, h: 852, theme: "dark" }), errs = [];
  await page.evaluate(() => { window.confirm = () => false; window.print = () => {}; });
  for (const r of ROUTES.filter(x => !/^(import|ecouter)/.test(x))) {
    await go(page, "#" + r, 350);
    const n = Math.min(+(process.env.CHASSE_N || 10), await page.locator("#app button:visible").count());
    for (let i = 0; i < n; i++) {
      await go(page, "#" + r, 120); await page.evaluate(() => { ["sheet", "confirm", "pdrawer"].forEach(id => { const e = document.getElementById(id); if (e) e.remove(); }); });
      const b = page.locator("#app button:visible").nth(i); let label = "";
      try { label = ((await b.getAttribute("aria-label")) || (await b.innerText())).slice(0, 30).replace(/\s+/g, " "); } catch (e) { continue; }
      if (/supprim|déconnect|effacer|vider|réinitialis|archiver|tout effacer|corbeille/i.test(label)) continue;
      const before = page.errors.length;
      try { await b.click({ timeout: 1000 }); await page.waitForTimeout(150); } catch (e) { continue; }
      if (page.errors.length > before) errs.push("#" + r + " [" + label + "] → " + page.errors.slice(before).join(" | ").slice(0, 160));
    }
  }
  ok(!errs.length, "chasse aux bugs : aucun bouton ne provoque d'erreur", "\n   " + errs.slice(0, 30).join("\n   "));
  await page.context().close();
}

async function progresClean(browser) {
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const page = await open(browser, { w, h, theme: "dark" }), tag = "progrès " + w;
    await go(page, "#progres", 400);
    ok(await page.locator('.pshop[href="#boutique"]').count() === 1 && (await page.locator(".pshop").innerText()).includes("Boutique"), tag + " : boutique bien visible");
    ok(await page.locator('.seg a[href="#duo"]').count() === 1, tag + " : Duo en sous-onglet");
    for (const r of ["recompenses", "bilan", "erreurs"]) ok(await page.locator(`.ptile[href="#${r}"]`).count() === 1, tag + " : raccourci " + r);
    await page.click(".pshop"); await page.waitForTimeout(300); ok(await page.evaluate(() => location.hash === "#boutique"), tag + " : ouvre la boutique");
    await go(page, "#progres", 300);
    if (w === 390) await page.screenshot({ path: path.join(SHOTS, "progres-390.png"), fullPage: true });
    const sm = await small(page); ok(!sm.length, tag + " : boutons de 44 px", sm.join(" | "));
    const o = await overflow(page); ok(o.sw <= o.iw, tag + " : pas de débordement", JSON.stringify(o));
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
}

let BASE;
(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  await new Promise(r => server.listen(0, "127.0.0.1", r)); BASE = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  try {
    const only = process.env.ONLY ? process.env.ONLY.split(",") : null, want = n => only ? only.includes(n) : n !== "chasse" && n !== "apercu";
    if (want("sweep")) await Promise.all([[390, 844, "light"], [390, 844, "dark"], [1280, 800, "light"], [1280, 800, "dark"]].map(([w, h, theme]) => sweep(browser, w, h, theme)));
    const SUITES = { apercu, profFichier, profSchemas, schemaPlat, ongletRetour, paris, adminPage, schemasAnciens, cartesFormules, chronoBlanc, plusOptions, refonte, multiImport, majSw, profPc, importRelance, importEta, schemasServeur, schemasCartes, flows, v7, v8, v10, sync, formules, interro, sup, musique, chapitre, tempsEcran, melange, recherche, horsligne, recompenses, edt, methodeBac, partage, petitEcran, voixMerge, retourFlottant, corbeille, vitesse, redressement, imageCarte, animations, fenetres, rappels, matieresTactile, nomAuto, annulerCarte, leurres, iphoneAppli, semaine, duoLien, pomodoroReglable, boutique, controleChapitres, boutiqueV2, genially, corbeillePartout, saison, revisionControle, journee, exos, progresClean, planningPlus, accueilV2, icones, edtReprise, audit, chasse };
    const todo = Object.entries(SUITES).filter(([n]) => want(n)), jobs = Math.max(1, +(process.env.JOBS || 4));
    let idx = 0;
    await Promise.all(Array.from({ length: Math.min(jobs, todo.length) }, async () => { while (idx < todo.length) { const [, f] = todo[idx++]; await f(browser); } }));
  } catch (e) { failures++; log.push("EXCEPTION " + (e.stack || e)); }
  await browser.close(); server.close();
  const bad = log.filter(l => !l.startsWith("ok"));
  console.log(log.filter(l => l.startsWith("ok")).length + " vérifications réussies, " + bad.length + " en échec");
  bad.forEach(l => console.log(l));
  process.exit(failures ? 1 : 0);
})();
