// Merge. : appli de révision. FICHIER GÉNÉRÉ : on modifie les morceaux de js/src/ puis « node tools/build-app.js ». Tout le code est dans une seule IIFE : un écran = une fonction screenXxx, la navigation se fait par le hash (route()).
(function () {
  "use strict";
  const C = window.CONFIG;
  const sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_PUBLISHABLE_KEY);
  const F = window.FSRS;
  const fsrs = F.fsrs({ enable_fuzz: true });
  const app = document.getElementById("app");
  const tabs = document.getElementById("tabs");
  const toastEl = document.getElementById("toast");
  const state = { user: null, profile: null, subjects: [], groups: [], chapters: [], cards: [], sessions: [], legacy: false };

  const CLASSES = ["Terminale générale", "Terminale STI2D", "PASS (1re année de médecine)", "Médecine 2e année", "Médecine 3e année"];
  // Une classe choisie avant la réduction de la liste reste proposée à celui qui l'a.
  const classOpts = (cur) => (cur && !CLASSES.includes(cur) ? [cur] : []).concat(CLASSES).map(c => `<option${c === cur ? " selected" : ""}>${esc(c)}</option>`).join("") + '<option value="__autre">Autre formation (à écrire)…</option>';
  // Classe : liste + champ libre si « Autre formation » est choisi.
  const classeVal = () => { const sel = $("classe"); if (!sel) return null; if (sel.value !== "__autre") return sel.value; const t = ($("classe2") ? $("classe2").value : "").trim().replace(/\s+/g, " ").slice(0, 60); return t || null; };
  const classeFree = () => `<input id="classe2" type="text" maxlength="60" placeholder="Ex. Licence informatique 2e année" hidden style="margin-top:8px">`;
  function wireClasse(onChange) { const sel = $("classe"), t = $("classe2"); if (!sel || !t) return; const sync = () => { t.hidden = sel.value !== "__autre"; if (!t.hidden) t.focus(); if (onChange) onChange(); }; sel.addEventListener("change", sync); t.addEventListener("input", () => { if (onChange) onChange(); }); }
  const COULEURS = ["#3b82f6", "#18ae79", "#f08c3a", "#e0529c", "#8b5cf6", "#0ea5a4", "#e5484d", "#a16207", "#6366f1", "#06b6d4", "#84cc16", "#eab308", "#f97316", "#f43f5e", "#d946ef", "#a855f7", "#14b8a6", "#22c55e", "#64748b", "#b45309", "#be123c", "#1d4ed8", "#0f766e", "#7c3aed"];
  const TRONC = ["Philosophie", "Histoire-géo", "Anglais", "Espagnol", "Allemand", "EPS"];
  const MATIERES = {
    "Seconde": ["Maths", "Physique-chimie", "SVT", "Français", "Histoire-géo", "SES", "SNT", "Anglais", "Espagnol", "Allemand", "EPS"],
    "Première générale": ["Maths", "Physique-chimie", "SVT", "Français", "Histoire-géo", "SES", "NSI", "HGGSP", "HLP", "LLCE", "SI", "Enseignement scientifique", "Anglais", "Espagnol", "Allemand", "EPS"],
    "Première technologique": ["Maths", "Physique-chimie", "Français", "Innovation technologique", "I2D", "Sciences de gestion", "Droit-économie", "Management", "Histoire-géo", "Anglais", "Espagnol", "ETLV", "EPS"],
    "Terminale générale": ["Maths", "Physique-chimie", "SVT", "Philosophie", "Histoire-géo", "SES", "NSI", "HGGSP", "HLP", "LLCE", "SI", "Enseignement scientifique", "Maths expertes", "Anglais", "Espagnol", "Allemand", "Grand oral", "EPS"],
    "Terminale STI2D": ["Maths", "Physique-chimie", "2I2D", "SIN", "ITEC", "EE", "AC", "ETLV", "Grand oral"].concat(TRONC),
    "Terminale STMG": ["Maths", "Management, sciences de gestion et numérique", "Droit-économie", "Gestion-finance", "Mercatique", "Ressources humaines", "SIG", "ETLV", "Grand oral"].concat(TRONC),
    "Terminale ST2S": ["Maths", "STSS", "BPH", "Chimie", "Physique-chimie pour la santé", "ETLV", "Grand oral"].concat(TRONC),
    "Terminale STL": ["Maths", "Physique-chimie", "Biochimie-biologie", "Biotechnologies", "SPCL", "ETLV", "Grand oral"].concat(TRONC),
  };
  const MED = ["Sémiologie", "Cardiologie", "Pneumologie", "Appareil digestif", "Neurologie", "Néphrologie", "Hématologie", "Immunologie", "Bactériologie-virologie", "Pharmacologie", "Anatomie pathologique", "Génétique", "Endocrinologie-nutrition", "Anglais médical"];
  MATIERES["PASS (1re année de médecine)"] = ["Chimie-biochimie", "Biologie cellulaire", "Biophysique", "Histologie-embryologie", "Anatomie", "Physiologie", "Biostatistiques", "Pharmacologie", "Santé publique et SHS", "Anglais", "Mineure"];
  MATIERES["Médecine 2e année"] = MED; MATIERES["Médecine 3e année"] = MED;
  // Formations du supérieur écrites à la main (« Autre formation ») : matières proposées selon les mots de l'intitulé.
  const SUP = [
    [/\b(mpsi|pcsi|mp2i|ptsi|tsi|mp\*?|pc\*?|psi\*?|pt\*?)\b|pr[eé]pa (scientifique|maths?|physique)|cpge/i, ["Mathématiques", "Physique", "Chimie", "Sciences de l'ingénieur", "Informatique", "Français-philosophie", "Anglais", "LV2"]],
    [/\b(ecg|ect|hec)\b|pr[eé]pa (commerce|eco|éco)/i, ["Mathématiques appliquées", "Mathématiques approfondies", "ESH", "HGGMC", "Culture générale", "Anglais", "LV2"]],
    [/\bbcpst\b|pr[eé]pa (bio|agro|v[eé]to)/i, ["Mathématiques", "Physique-chimie", "Biologie", "Géologie", "Informatique", "Français-philosophie", "Anglais"]],
    [/\b(a\/l|khâgne|khagne|hypokh[aâ]gne)\b|pr[eé]pa litt/i, ["Lettres", "Philosophie", "Histoire", "Géographie", "Langues anciennes", "Anglais", "LV2"]],
    [/informatique|\binfo\b|\bmiage\b|\bsio\b|\bciel\b|d[eé]veloppe|\bdev\b|cyber|num[eé]rique|\bnsi\b|data|\bia\b|intelligence artificielle/i, ["Algorithmique", "Programmation", "Bases de données", "Réseaux", "Systèmes d'exploitation", "Mathématiques discrètes", "Architecture des ordinateurs", "Génie logiciel", "Développement web", "Analyse", "Algèbre linéaire", "Probabilités et statistiques", "Anglais", "Communication"]],
    [/math/i, ["Analyse", "Algèbre", "Algèbre linéaire", "Probabilités", "Statistiques", "Géométrie", "Topologie", "Calcul différentiel", "Informatique", "Anglais"]],
    [/physique|chimie|\bpc\b/i, ["Mécanique", "Électromagnétisme", "Thermodynamique", "Optique", "Physique quantique", "Chimie générale", "Chimie organique", "Mathématiques pour la physique", "Anglais"]],
    [/pharma/i, ["Chimie analytique", "Chimie organique", "Biochimie", "Pharmacologie", "Galénique", "Microbiologie", "Physiologie", "Toxicologie", "Botanique", "Anglais"]],
    [/infirmi|ifsi|soins/i, ["Sciences humaines", "Biologie fondamentale", "Processus traumatiques", "Processus infectieux", "Pharmacologie et thérapeutiques", "Soins infirmiers", "Législation et éthique", "Santé publique", "Anglais"]],
    [/kin[eé]|masso/i, ["Anatomie", "Physiologie", "Biomécanique", "Kinésithérapie musculo-squelettique", "Neurologie", "Cardio-respiratoire", "Sciences humaines", "Anglais"]],
    [/m[eé]decin|sant[eé]|las\b|pass\b|dentaire|sage-femme|ma[iï]eutique/i, ["Anatomie", "Physiologie", "Biologie cellulaire", "Biochimie", "Biophysique", "Histologie", "Pharmacologie", "Santé publique", "Anglais"]],
    [/droit|juri|\bcapa\b/i, ["Introduction au droit", "Droit civil", "Droit constitutionnel", "Droit administratif", "Droit pénal", "Droit des obligations", "Histoire du droit", "Institutions européennes", "Anglais juridique"]],
    [/[eé]co(nomie)?\b|gestion|commerce|\baes\b|\bgea\b|\btc\b|management|finance|compta|\bmco\b|\bndrc\b|marketing|business/i, ["Microéconomie", "Macroéconomie", "Comptabilité", "Finance", "Marketing", "Management", "Statistiques", "Mathématiques", "Droit des affaires", "Anglais"]],
    [/psycho/i, ["Psychologie cognitive", "Psychologie sociale", "Psychologie du développement", "Psychologie clinique", "Neurosciences", "Statistiques", "Méthodologie", "Anglais"]],
    [/bio|svt|vie|environnement|agro/i, ["Biologie cellulaire", "Biochimie", "Génétique", "Physiologie", "Écologie", "Microbiologie", "Chimie", "Statistiques", "Anglais"]],
    [/staps|sport/i, ["Anatomie", "Physiologie de l'effort", "Biomécanique", "Psychologie du sport", "Sociologie du sport", "Entraînement", "Pratiques sportives", "Anglais"]],
    [/histoire|g[eé]o/i, ["Histoire ancienne", "Histoire médiévale", "Histoire moderne", "Histoire contemporaine", "Géographie", "Méthodologie", "Anglais"]],
    [/lettres|lit+[eé]rature|\blla\b|\bllcer\b|\blea\b|langues?/i, ["Littérature française", "Littérature comparée", "Grammaire et linguistique", "Langue vivante 1", "Langue vivante 2", "Civilisation", "Traduction", "Méthodologie"]],
    [/socio|anthropo|sciences? po|politi/i, ["Sociologie", "Science politique", "Histoire", "Économie", "Droit public", "Statistiques", "Culture générale", "Anglais"]],
    [/[eé]lectr|geii|m[eé]ca|g[eé]nie|ing[eé]nieur|industri|\bcrsa\b|\bcira\b|automat/i, ["Mathématiques", "Électronique", "Électrotechnique", "Automatisme", "Mécanique", "Informatique industrielle", "Physique", "Anglais", "Communication"]],
  ];
  const SUP_DEFAUT = ["Mathématiques", "Méthodologie", "Culture générale", "Anglais", "Communication", "Projet"];
  const matieresFor = (classe) => {
    if (MATIERES[classe]) return MATIERES[classe];
    const c = String(classe || ""); for (const [re, list] of SUP) if (re.test(c)) return list;
    return /licence|\bl[123]\b|master|\bm[12]\b|bts|\bbut\b|dut|iut|pr[eé]pa|[eé]cole|universit|\bfac\b|bachelor|dipl[oô]me|formation/i.test(c) ? SUP_DEFAUT : MATIERES["Terminale générale"];
  };
  const okColor = (c) => /^#[0-9a-f]{6}$/i.test(c || "");
  function colorPick(cur) {
    const free = okColor(cur) && !COULEURS.includes(cur);
    return `<div class="chips swatches">${COULEURS.map(c => `<button type="button" class="chip swatch" data-col="${c}" aria-pressed="${cur === c}" aria-label="Couleur ${c}" style="--c:${c}"><span class="dot"></span></button>`).join("")}<label class="chip swatch free" aria-label="Choisir une autre couleur" data-free aria-pressed="${free}" style="--c:${free ? cur : "transparent"}"><span class="dot"></span><input type="color" value="${okColor(cur) ? cur : "#4b39c8"}"></label></div>`;
  }
  function wireColor(root, onPick) {
    const all = () => root.querySelectorAll("[data-col],[data-free]"), fr = root.querySelector("[data-free]");
    root.querySelectorAll("[data-col]").forEach(b => b.onclick = () => { all().forEach(x => x.setAttribute("aria-pressed", x === b)); onPick(b.dataset.col); });
    if (fr) fr.querySelector("input").oninput = (e) => { const v = e.target.value; if (!okColor(v)) return; all().forEach(x => x.setAttribute("aria-pressed", x === fr)); fr.style.setProperty("--c", v); onPick(v); };
  }
  // Phrase d'accueil : une nouvelle à chaque ouverture de l'appli (jamais deux fois la même d'affilée).
  const PEPS = ["Un peu chaque jour vaut mieux que tout la veille.", "Dix minutes maintenant, c'est ça de moins avant le contrôle.", "Ce que tu révises aujourd'hui, tu le sais encore dans un mois.", "Une carte après l'autre : c'est comme ça que ça rentre.", "Se tromper sur une carte, c'est déjà apprendre.", "Régulier bat intense. Toujours.", "Le plus dur, c'est d'ouvrir l'appli. C'est fait.", "Commence petit : une seule carte, et on verra.", "Ce qui est révisé ce soir n'est plus à apprendre demain.", "Tu n'as pas besoin d'être motivé, juste de commencer.", "Cinq minutes comptent aussi.", "Mieux vaut comprendre une notion que survoler tout le chapitre.", "Chaque carte réussie, c'est un point de plus le jour J.", "Pas besoin d'être parfait, juste un peu meilleur qu'hier.", "Révise maintenant, profite plus tard.", "Le cerveau retient mieux en petites doses.", "Une erreur repérée aujourd'hui, c'est une erreur en moins au contrôle.", "Tu avances, même quand ça ne se voit pas.", "Un chapitre à la fois.", "Revoir au bon moment, c'est la moitié du travail.", "La régularité fait plus que les longues soirées.", "Ferme les autres onglets, ouvre tes cartes.", "Explique-le avec tes mots : si tu y arrives, tu l'as compris.", "Les notes suivent le travail, pas l'inverse.", "Petit effort aujourd'hui, grande différence en juin.", "Chaque jour révisé compte pour ta série.", "Ce que tu sais déjà ira plus vite : profites-en.", "Un quiz rapide, et tu sais où tu en es.", "La meilleure révision, c'est celle que tu fais.", "Tu connais plus de choses que tu ne le crois.", "Une pause, puis on s'y remet.", "Moins de stress au contrôle, c'est maintenant que ça se joue.", "Pose ton téléphone… juste après tes cartes.", "Revenir demain sur ce que tu as raté, c'est comme ça qu'on progresse.", "Mieux vaut 20 minutes concentré qu'une heure distrait.", "Ton futur toi te remerciera.", "Fais-le pour toi, pas pour la note.", "On ne retient pas en relisant, on retient en se testant.", "Aujourd'hui, une notion de plus que tu maîtrises.", "Le contrôle sera plus facile que tu ne le penses si tu révises un peu chaque jour."];
  const PEP = (() => { let last = -1; try { last = +localStorage.getItem("merge.peplast"); } catch (e) {} let i = Math.floor(Math.random() * PEPS.length); if (i === last) i = (i + 1) % PEPS.length; try { localStorage.setItem("merge.peplast", String(i)); } catch (e) {} return PEPS[i]; })();
  // Animations de réussite : 5 styles tirés au hasard (pluie de confettis, explosion, feu d'artifice, étoiles, serpentins).
  function confetti(kind) {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    const K = ["pluie", "explosion", "feux", "etoiles", "serpentins"], fav = (typeof rwEquipped === "function" && state.user && (rwEquipped("confettis") || {}).v) || "";
    const k = K.includes(kind) ? kind : K.includes(fav) ? fav : K[Math.floor(Math.random() * K.length)];
    const box = document.createElement("div"); box.className = "confetti c-" + k; box.setAttribute("aria-hidden", "true");
    const r = (a, b) => a + Math.random() * (b - a), col = i => COULEURS[i % COULEURS.length];
    const add = (css) => { const el = document.createElement("i"); el.style.cssText = css; box.appendChild(el); };
    if (k === "pluie") for (let i = 0; i < 40; i++) add(`left:${r(0, 100)}%;background:${col(i)};animation-delay:${r(0, .5).toFixed(2)}s;animation-duration:${r(1.6, 2.8).toFixed(2)}s;transform:rotate(${Math.round(r(0, 360))}deg)`);
    if (k === "explosion") for (let i = 0; i < 48; i++) { const t = r(0, Math.PI * 2), d = r(120, 320); add(`left:50%;top:45%;background:${col(i)};--dx:${Math.cos(t) * d}px;--dy:${Math.sin(t) * d - 80}px;animation-delay:${r(0, .12).toFixed(2)}s`); }
    if (k === "feux") for (let f = 0; f < 3; f++) { const x = r(20, 80), y = r(18, 45), c = f * 5; for (let i = 0; i < 22; i++) { const t = i / 22 * Math.PI * 2, d = r(60, 120); add(`left:${x}%;top:${y}%;background:${col(c + (i % 3))};--dx:${Math.cos(t) * d}px;--dy:${Math.sin(t) * d}px;animation-delay:${(f * .35).toFixed(2)}s`); } }
    if (k === "etoiles") for (let i = 0; i < 26; i++) add(`left:${r(5, 95)}%;--c:${col(i)};animation-delay:${r(0, .8).toFixed(2)}s;animation-duration:${r(1.6, 2.6).toFixed(2)}s;--s:${r(.7, 1.4).toFixed(2)}`);
    if (k === "serpentins") for (let i = 0; i < 18; i++) add(`left:${r(0, 100)}%;background:${col(i)};animation-delay:${r(0, .6).toFixed(2)}s;animation-duration:${r(2, 3).toFixed(2)}s`);
    document.body.appendChild(box); setTimeout(() => box.remove(), 3800);
  }
  // SVT en vert, physique en bleu, puis une couleur par matière courante.
  const COULEUR_PAR_NOM = { "svt": "#18ae79", "physique-chimie": "#3b82f6", "physique": "#3b82f6", "chimie": "#0ea5a4", "maths": "#f08c3a", "mathématiques": "#f08c3a", "français": "#e0529c", "philosophie": "#8b5cf6", "histoire-géo": "#a16207", "anglais": "#0ea5a4", "espagnol": "#e5484d", "ses": "#8b5cf6", "nsi": "#e0529c" };
  const CARD_META = "id,chapter_id,due_at,state,stability,difficulty,elapsed_days,scheduled_days,reps,lapses,last_review,right_count,wrong_count,front,back,source_quote,image_path";

  const svg = (d, extra) => `<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra || ""}>${d}</svg>`;
  const I = {
    back: svg('<path d="M15 6l-6 6 6 6"/>'), undo: svg('<path d="M9 7L4.5 11.5 9 16"/><path d="M5 11.5h9.5a5 5 0 010 10H12"/>'), search: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'), clock: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 3h5"/>'), star: svg('<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z"/>'), info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'), spark: svg('<path d="M12 3.5c.7 4.3 3.2 6.8 7.5 7.5-4.3.7-6.8 3.2-7.5 7.5-.7-4.3-3.2-6.8-7.5-7.5 4.3-.7 6.8-3.2 7.5-7.5z"/>'), x: svg('<path d="M6 6l12 12M18 6L6 18"/>'), plus: svg('<path d="M12 5v14M5 12h14"/>'), menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'), edit: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'), prof: svg('<path d="M21.4 10.9a1 1 0 0 0 0-1.8l-8.6-3.9a2 2 0 0 0-1.7 0L2.6 9.1a1 1 0 0 0 0 1.8l8.6 3.9a2 2 0 0 0 1.7 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>'), send: svg('<path d="M12 19V5M6 11l6-6 6 6"/>'), cam: svg('<path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'), img: svg('<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5"/>'),
    play: svg('<path d="M8 5.5v13l10.5-6.5z"/>'), pause: svg('<path d="M8.5 5.5v13M15.5 5.5v13"/>'), next: svg('<path d="M6 6v12l8.5-6zM18 6v12"/>'),
    home: svg('<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>'),
    bell: svg('<path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 004 0"/>'), moon: svg('<path d="M19.5 14.5A8 8 0 019.5 4.5a8 8 0 1010 10z"/>'), trash: svg('<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5"/>'),
    gear: svg('<g transform="translate(12 12) scale(.82) translate(-12 -12)" stroke-width="2.2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></g>'),
    cards: svg('<rect x="2" y="7" width="15" height="13" rx="2.5"/><path d="M7 4h12.5A2.5 2.5 0 0 1 22 6.5V16"/>'),
    learn: svg('<path d="M20 12a8 8 0 11-3-6.2"/><path d="M20 4v4h-4"/>'),
    quiz: svg('<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h5"/>'),
    match: svg('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><path d="M14 6.5h2.5a2 2 0 0 1 2 2V11"/><path d="M10 17.5H7.5a2 2 0 0 1-2-2V13"/>'),
    listen: svg('<path d="M4 14v-2a8 8 0 0116 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>'),
    sum: svg('<path d="M5 6h14M5 11h14M5 16h9"/>'),
    lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
    up: svg('<path d="M12 16V5M7 10l5-5 5 5M5 19h14"/>'),
    cal: svg('<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10.5h16M8.5 4v3.5M15.5 4v3.5"/>'),
    chart: svg('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 16v-3M12 16V8M15.5 16v-5"/>'),
    copy: svg('<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>'), share: svg('<path d="M12 15V4M8 8l4-4 4 4"/><path d="M6 12v6a2 2 0 002 2h8a2 2 0 002-2v-6"/>'),
    coin: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><path d="M12 9.5v5"/>'), gift: svg('<rect x="3.5" y="9" width="17" height="11" rx="2"/><path d="M12 9v11M3.5 13h17M12 9c-2.5 0-5-1-5-3s3-2 5 3c2-5 5-5 5-3s-2.5 3-5 3"/>'), shop: svg('<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9h16v2a2.7 2.7 0 01-5.3 0 2.7 2.7 0 01-5.4 0A2.7 2.7 0 014 11z"/><path d="M5.5 13.5V20h13v-6.5"/>'),
    cup: svg('<path d="M5 9h11v4.5a5.5 5.5 0 01-5.5 5.5h0A5.5 5.5 0 015 13.5V9zM16 10.5h1.5a2.5 2.5 0 010 5H16M8.5 3.5v2.5M12 3v3"/>'),
    day: svg('<path d="M21 9V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4"/><path d="M16 2v4M8 2v4M3 10h6"/><circle cx="16.5" cy="16.5" r="5.5"/><path d="M16.5 14v2.5l1.5 1"/>'),
    duo: svg('<circle cx="9" cy="8" r="3.6"/><circle cx="16.5" cy="8.6" r="2.9"/><path d="M3.5 20a5.5 5.5 0 0111 0M14.5 15.3A4.6 4.6 0 0120.5 20"/>'),
    ask: svg('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>'),
    subj: svg('<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>'),
    check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'), minus: svg('<path d="M5 12h14"/>'),
    mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 7l8 6 8-6"/>'),
    folder: svg('<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>'),
    mic: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>'),
    shield: svg('<path d="M12 3l7 3v5c0 4.500-3 8-7 10-4-2-7-5.500-7-10V6z"/>'),
    bolt: svg('<path d="M13 3L5 13h6l-1 8 8-10h-6z"/>'),
    print: svg('<path d="M7 8V4h10v4M7 17H5a2 2 0 01-2-2v-4a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><rect x="7" y="14" width="10" height="6" rx="1"/>'),
    trap: svg('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.500-4.500M9 9l4 4M13 9l-4 4"/>'),
    blank: svg('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>'),
    bulb: svg('<path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.500c.7.700 1 1.500 1 2.500h6c0-1 .3-1.800 1-2.500A6 6 0 0012 3z"/>'),
    vs: svg('<path d="M3 7l4 10 4-10M20 8c-1-1.300-5-1.500-5 1.500s5 2 5 5-4 3.200-5.500 1.500"/>'),
    bus: svg('<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14M8 17v3M16 17v3"/><path d="M8.500 14h.01M15.500 14h.01"/>'),
    steps: svg('<path d="M12 20h9"/><path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
    map: svg('<circle cx="5" cy="12" r="2.200"/><circle cx="18" cy="5" r="2.200"/><circle cx="18" cy="12" r="2.200"/><circle cx="18" cy="19" r="2.200"/><path d="M7.200 12h8.600M7 11c4 0 4-6 8.800-6M7 13c4 0 4 6 8.800 6"/>'),
    cloze: svg('<path d="M3 8h6M3 16h4M19 8h2M17 16h4"/><rect x="11" y="5" width="6" height="6" rx="1.500"/><rect x="9" y="13" width="6" height="6" rx="1.500"/>'),
    book: svg('<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z"/><path d="M5 17a3 3 0 013-3h11M12 7.500v3M12 12.500v.1"/>'),
    grid: svg('<rect x="4" y="3" width="16" height="18" rx="1.500"/><path d="M12 3v18M4 9h16M4 15h16"/>')
  };
  // Icônes des matières (dessinées pour Merge, même trait que les autres). subjIcon(nom) choisit l'icône d'après le nom
  // de la matière ; matière inconnue → null, et l'écran affiche les initiales à la place.
  const SUBJ_IC = {
    maths: '<path d="M17 5H6.5l6 7-6 7H17"/>',
    atome: '<circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(-60 12 12)"/>',
    fiole: '<path d="M9 3h6M10 3v6.5L5 18a2 2 0 001.8 3h10.4A2 2 0 0019 18l-5-8.5V3"/><path d="M7.5 15h9"/>',
    adn: '<path d="M7 3c0 4.5 10 4.5 10 9s-10 4.5-10 9M17 3c0 4.5-10 4.5-10 9s10 4.5 10 9"/><path d="M8.5 6.5h7M8.5 17.5h7M10 12h4"/>',
    micro: '<path d="M5 21h14M8 18h8M12 18a6.5 6.5 0 006.5-6.5"/><path d="M9 3.5l4 1.5-2.6 7-4-1.5zM9.4 12.3l-1 2.6"/><circle cx="12.5" cy="14.5" r="1.5"/>',
    puce: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx=".5"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
    code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
    cle: '<path d="M14.7 6.3a4 4 0 015.2 4.9l-2.2-2.2-2.1.6-.6 2.1 2.2 2.2a4 4 0 01-4.9-5.2L5.5 15.5a2 2 0 102.8 2.8l6.2-6.2"/>',
    eclair: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
    batiment: '<path d="M3 21h18M5 21V8l7-4 7 4v13"/><path d="M9.5 10.5h1.5M13 10.5h1.5M9.5 14.5h1.5M13 14.5h1.5M10.5 21v-3h3v3"/>',
    ampoule: '<path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0012 3z"/>',
    livre: '<path d="M3 5.5c2-1 5.5-1 9 1 3.5-2 7-2 9-1V19c-2-1-5.5-1-9 1-3.5-2-7-2-9-1z"/><path d="M12 6.5V20"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.5 3.5 5.5 3.5 9s-1.1 6.5-3.5 9c-2.4-2.5-3.5-5.5-3.5-9S9.6 5.5 12 3z"/>',
    temple: '<path d="M3 21h18M4 9.5h16M12 3l8.5 5H3.5z"/><path d="M6.5 9.5v8.5M10 9.5v8.5M14 9.5v8.5M17.5 9.5v8.5M4 18h16"/>',
    bulle: '<path d="M4 5h16v11H10l-5 4v-4H4z"/><path d="M8 9h8M8 12.5h5"/>',
    courbe: '<path d="M4 4v16h16"/><path d="M7.5 15l4-4.5 3 3 5-6"/><path d="M16 7.5h3.5V11"/>',
    balance: '<path d="M12 4v16M8 20h8M5 7h14"/><path d="M5 7l-2.5 6a2.8 2.8 0 005 0zM19 7l-2.5 6a2.8 2.8 0 005 0z"/>',
    drapeau: '<path d="M5 21V4"/><path d="M5 4.5h11l-2 4 2 4H5"/>',
    haltere: '<path d="M6.5 7.5v9M3.5 9.5v5M17.5 7.5v9M20.5 9.5v5M6.5 12h11"/>',
    palette: '<path d="M12 3a9 9 0 000 18c1.4 0 2-.9 2-1.8 0-1.2-1-1.5-1-2.6 0-1 .8-1.6 1.8-1.6H17a4 4 0 004-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.1"/><circle cx="10" cy="7" r="1.1"/><circle cx="15" cy="7.5" r="1.1"/>',
    note: '<circle cx="7" cy="18" r="2.5"/><circle cx="17" cy="16" r="2.5"/><path d="M9.5 18V6l10-2v12"/>',
    clap: '<rect x="3" y="9" width="18" height="11.5" rx="1.5"/><path d="M3 9l1.6-4.8 15.8 2.2L19.5 9M8.5 4.8l-.8 4.2M14 5.6l-.8 3.4"/>',
    coeur: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7.2a4.3 4.3 0 017.5 2.6C19.5 15.4 12 20 12 20z"/><path d="M12 10.5v4M10 12.5h4"/>',
    feuille: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14zM5 19l7-7"/>',
    oral: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21M9 21h6"/>',
  };
  // Ordre important : la première règle qui correspond l'emporte (ex. « éducation physique » est du sport, pas de la physique).
  const SUBJ_RULES = [
    [/\beps\b|sport|education physique|activites physiques/, "haltere"],
    [/enseignement scientifique|^sciences?$|^sciences (et|de la vie)? ?$|\bes\b/, "micro"],
    [/\bnsi\b|informatique|\bsnt\b|programmation|algorithm/, "code"],
    [/droit|juridique/, "balance"],
    [/\bses\b|econom|gestion|management|mercatique|marketing|finance|compta|\bmsgn\b|\brhc\b|\bsig\b/, "courbe"],
    [/\bsin\b|systemes? d.information|numerique/, "puce"],
    [/\bsvt\b|vie et de la terre|biolog|biotech|geolog|ecolog/, "adn"],
    [/physique|\bpc\b|\bphy\b|\bpcm\b/, "atome"],
    [/chimie/, "fiole"],
    [/math|algebre|\bmaths?\b|\bmath expert|statist/, "maths"],
    [/philo/, "ampoule"],
    [/latin|grec|\blca\b|antiquit/, "temple"],
    [/histoire des arts/, "palette"],
    [/grand oral|\boral\b|eloquence/, "oral"],
    [/hggsp|geopolit|histoire|geograph|\bhg\b|\bh-?g\b/, "globe"],
    [/\bemc\b|civique|citoyen/, "drapeau"],
    [/anglais|espagnol|allemand|italien|arabe|chinois|japonais|portugais|russe|coreen|turc|hebreu|neerlandais|polonais|\blv ?\d|\blva\b|\blvb\b|\bllcer|\bamc\b|langue|english|spanish/, "bulle"],
    [/francais|litterature|lettres|\bhlp\b|humanites|\bfrancais\b/, "livre"],
    [/musique|music|chant/, "note"],
    [/cinema|audiovisuel|theatre|danse|\bcav\b/, "clap"],
    [/\barts?\b|plastique|dessin|design|histoire des arts|\bdaac\b/, "palette"],
    [/itec|\bsi\b|sciences de l.ingenieur|2i2d|ingenieri|technolog|mecaniq|innovation/, "cle"],
    [/\bee\b|energie|electri|electron/, "eclair"],
    [/\bac\b|architecture|construction|batiment|urbanis/, "batiment"],
    [/sante|social|st2s|medic|soin|psycho/, "coeur"],
    [/agro|agricult|environnement|\bsdd\b|developpement durable/, "feuille"],
  ];
  const plainName = n => String(n || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  function subjIcon(name) { const n = plainName(name); const r = n && SUBJ_RULES.find(x => x[0].test(n)); return r ? svg(SUBJ_IC[r[1]]) : null; }

  // ---------- utilitaires ----------
  // Bibliothèques lourdes (PDF, fichiers Office) chargées seulement quand on en a besoin : démarrage plus rapide sur téléphone.
  const libP = {};
  function needLib(src, test) { if (test()) return Promise.resolve(); return libP[src] || (libP[src] = new Promise((ok, ko) => { const sc = document.createElement("script"); sc.src = src; sc.onload = ok; sc.onerror = () => { delete libP[src]; ko(new Error("Chargement impossible. Vérifie ta connexion.")); }; document.head.appendChild(sc); })); }
  const needPdf = () => needLib("vendor/pdf.min.js", () => !!window.pdfjsLib), needZip = () => needLib("vendor/jszip.min.js", () => !!window.JSZip);
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  let toastT;
  function toast(m) { toastEl.textContent = m; toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (toastEl.hidden = true), 3200); }
  function $(id) { return document.getElementById(id); }
  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  // Ces clés sont gardées sur l'appareil ET dans le compte (table user_kv) : on retrouve la même chose sur téléphone et sur PC.
  // Restent sur l'appareil seulement : kvts (horodatages), file (révisions en attente d'envoi), cache.* et gen.* (copies de la base), erreurs.* (copie de secours de la table mistakes). Le thème est dans le profil.
  const SYNC = /^merge\.(paris|fav|typed|resume|pomomute|pomocfg|badges|level|voice|rate|lofivol|lofi|cmore|noinstall|tuto|profTip|note\..+|hl\..+|occl\..+|hist\..+|time\..+|libre\..+|examch\..+|mixsel|controles|boostnext|boostj|journee|exo\..+|prof|boss\..+|mnemo\..+|rewards|wallet|edt|vengine|redresse|methode\..+|bac\..+|sumv\..+|ecoute\..+|flash\..+|jobseen\..+)$/;
  let kvTs = {}, kvQueue = {}, kvTimer = null, kvOff = false, kvAt = 0;
  try { kvTs = JSON.parse(localStorage.getItem("merge.kvts") || "{}") || {}; } catch (e) { kvTs = {}; }
  const kvSaveTs = () => { try { localStorage.setItem("merge.kvts", JSON.stringify(kvTs)); } catch (e) { /* rien */ } };
  function safeSet(k, v) {
    let same = false; try { same = localStorage.getItem(k) === String(v); localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ }
    if (SYNC.test(k) && !(same && kvTs[k])) { kvTs[k] = Date.now(); kvSaveTs(); kvQueue[k] = String(v); clearTimeout(kvTimer); kvTimer = setTimeout(kvFlush, 900); }
  }
  async function kvFlush() {
    clearTimeout(kvTimer); if (!state.user || kvOff) return;
    const rows = Object.entries(kvQueue).map(([key, value]) => ({ user_id: state.user.id, key, value: value.slice(0, 190000), updated_at: new Date(kvTs[key] || Date.now()).toISOString() })); kvQueue = {};
    if (!rows.length) return;
    try { const r = await sb.from("user_kv").upsert(rows); if (r.error) { if (/user_kv|schema cache|does not exist/i.test(r.error.message || "")) kvOff = true; else rows.forEach(x => { if (kvQueue[x.key] == null) kvQueue[x.key] = x.value; }); } }
    catch (e) { rows.forEach(x => { if (kvQueue[x.key] == null) kvQueue[x.key] = x.value; }); }
  }
  // Récupère ce que les autres appareils ont enregistré ; le plus récent gagne. Renvoie true si quelque chose a changé ici.
  async function kvPull() {
    if (!state.user || kvOff) return false; kvAt = Date.now();
    let r; try { r = await sb.from("user_kv").select("key,value,updated_at").eq("user_id", state.user.id); } catch (e) { return false; }
    if (r.error) { if (/user_kv|schema cache|does not exist/i.test(r.error.message || "")) kvOff = true; return false; }
    state.kvOk = true; let changed = false; const remote = {};
    (r.data || []).forEach(row => {
      const ts = Date.parse(row.updated_at) || 0; remote[row.key] = ts; if (!SYNC.test(row.key)) return;
      if (!kvTs[row.key] || ts > kvTs[row.key]) { try { if (localStorage.getItem(row.key) !== row.value) { localStorage.setItem(row.key, row.value); changed = true; } } catch (e) { /* rien */ } kvTs[row.key] = ts; }
    });
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!SYNC.test(k)) continue; if (remote[k] == null || (kvTs[k] || 0) > remote[k]) { if (!kvTs[k]) kvTs[k] = Date.now(); kvQueue[k] = localStorage.getItem(k); } } } catch (e) { /* rien */ }
    kvSaveTs(); kvFlush(); return changed;
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") return void kvFlush();
    if (state.user && state.profile && Date.now() - kvAt > 45000) kvPull().then(ch => { if (ch) applyRewards(); if (ch && /^#?(accueil|matieres|progres|calendrier|chapitre-.*|matiere-.*)?$/.test(location.hash)) route(); });
  });
  window.addEventListener("pagehide", () => { kvFlush(); });
  // Toutes les 2 minutes quand l'appli est ouverte : récupère ce qui a changé sur l'autre appareil.
  setInterval(() => { if (document.visibilityState === "visible" && state.user && state.profile && !state.offline && Date.now() - kvAt > 110000) kvPull().then(ch => { if (ch && /^#?(accueil|matieres|progres|calendrier)?$/.test(location.hash)) route(); }); }, 120000);
  window.addEventListener("online", () => { kvFlush(); });
  // Bouton retour flottant : quand on remonte dans une page longue, un petit bouton translucide apparaît en haut à gauche.
  const fback = document.createElement("button"); fback.className = "floatback"; fback.type = "button"; fback.setAttribute("aria-label", "Retour"); fback.innerHTML = I.back; document.body.appendChild(fback);
  let fbY = scrollY, fbT = null;
  const fbTarget = () => { const a = app.querySelector('a.iconbtn[href^="#"][aria-label^="Retour"], a.iconbtn[href^="#"][aria-label="Fermer"], a.iconbtn[href^="#"][aria-label^="Retour au"], button.iconbtn[aria-label^="Retour"]'); return a; };
  const fbHide = () => { fback.classList.remove("on"); document.documentElement.classList.remove("fbon"); };
  addEventListener("scroll", () => {
    const y = scrollY, up = y < fbY - 4, down = y > fbY + 4; if (up || down) fbY = y;
    if (y < 240 || down || !fbTarget()) fbHide(); else if (up) { fback.classList.add("on"); document.documentElement.classList.add("fbon"); clearTimeout(fbT); fbT = setTimeout(fbHide, 3500); }
  }, { passive: true });
  fback.onclick = () => { const a = fbTarget(); fbHide(); if (a) a.click(); };
  addEventListener("hashchange", fbHide);
  // Temps d'écran (tableau de bord /admin) : secondes passées appli ouverte et visible, envoyées par paquets d'une minute.
  const usage = { acc: 0, last: Date.now() };
  const usagePlace = () => { const ua = navigator.userAgent || ""; const dev = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? (/Mobile/.test(ua) ? "Téléphone Android" : "Tablette Android") : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "PC Windows" : /Linux/.test(ua) ? "PC Linux" : "Appareil"; const br = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Navigateur"; let tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { /* rien */ } return [dev, br + (isStandalone() ? " (appli)" : ""), tz].filter(Boolean).join(" · "); };
  function usageTick() { const now = Date.now(); if (document.visibilityState === "visible" && state.user) usage.acc += Math.min(60, Math.max(0, (now - usage.last) / 1000)); usage.last = now; }
  function usageFlush() { usageTick(); const s = Math.round(usage.acc); if (!state.user || s < 5 || state.offline) return; usage.acc -= s; Promise.resolve(sb.rpc("track_usage", { p_day: localDay(), p_seconds: Math.min(120, s), p_place: usagePlace() })).catch(() => { usage.acc += s; }); }
  setInterval(usageTick, 15000); setInterval(usageFlush, 60000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") usageFlush(); else usage.last = Date.now(); });
  window.__mergeUsage = usageFlush;
  window.__mergeSync = { pull: kvPull, flush: kvFlush, set: (k, v) => safeSet(k, v), synced: k => SYNC.test(k) };
  function applyLook(p) {
    const r = document.documentElement;
    const theme = (p && p.theme) || safeGet("merge.theme") || "system";
    if (theme === "system") r.removeAttribute("data-theme"); else r.dataset.theme = theme;
    r.dataset.size = (p && p.text_size) || "normal";
    safeSet("merge.theme", theme);
  }
  function localDay(d) { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function daysUntil(d) { if (!d) return null; const a = new Date(d + "T00:00:00"), b = new Date(); b.setHours(0, 0, 0, 0); return Math.round((a - b) / 86400000); }
  function colorFor(name, i) { return COULEUR_PAR_NOM[name.trim().toLowerCase()] || COULEURS[i % COULEURS.length]; }
  function fail(error, quoi) { console.error(quoi, error); toast(quoi + " : " + (error && error.message ? error.message : "erreur inconnue")); }
  function plural(n, un, des) { return n + " " + (n > 1 ? des : un); }
  // Formules : $…$ et $$…$$ (ou \(…\) et \[…\]) sont affichées comme en cours avec KaTeX (fractions posées, indices, symboles).
  const TEXSYM = { times: "×", cdot: "·", div: "÷", Omega: "Ω", omega: "ω", pi: "π", alpha: "α", beta: "β", lambda: "λ", mu: "µ", Delta: "Δ", delta: "δ", theta: "θ", rho: "ρ", sigma: "σ", phi: "φ", leq: "≤", geq: "≥", le: "≤", ge: "≥", neq: "≠", approx: "≈", infty: "∞", to: "→", rightarrow: "→", Rightarrow: "⇒", leftrightarrow: "↔", pm: "±", degree: "°", circ: "°", sqrt: "√" };
  function mathify(text, bold) {
    const out = [], re = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^$\n]+?)\$/g; let last = 0, m;
    const plain = t => esc(t.replace(/\\([A-Za-z]+)/g, (x, k) => TEXSYM[k] || x));
    while ((m = re.exec(text))) { out.push(plain(text.slice(last, m.index))); const tex = m[1] || m[2] || m[3] || m[4], disp = !!(m[1] || m[2]); out.push(`<span class="m${disp ? " md" : ""}" data-tex="${esc(tex)}">${esc(tex)}</span>`); last = re.lastIndex; }
    out.push(plain(text.slice(last))); let h = out.join(""); if (bold) h = h.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
    // Texte avec formule : un seul élément, sinon un parent en « flex » mettrait chaque mot et chaque formule en colonne.
    return out.length > 1 ? `<span class="mxw">${h}</span>` : h;
  }
  const mx = t => mathify(String(t == null ? "" : t), false);
  // Version texte d'une formule, pour les endroits où KaTeX ne peut pas s'afficher (bulles SVG, voix, titres).
  const texPlain = t => String(t == null ? "" : t).replace(/\$+/g, "").replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)").replace(/\\(?:text|mathrm|mathbf)\{([^{}]*)\}/g, "$1").replace(/\\([A-Za-z]+)/g, (x, k) => TEXSYM[k] || "").replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
  let katexP = null;
  function loadKatex() {
    if (window.katex) return Promise.resolve(); if (katexP) return katexP;
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "vendor/katex/katex.min.css"; document.head.appendChild(css);
    katexP = new Promise((ok, ko) => { const sc = document.createElement("script"); sc.src = "vendor/katex/katex.min.js"; sc.onload = ok; sc.onerror = () => { katexP = null; ko(); }; document.head.appendChild(sc); });
    return katexP;
  }
  function renderMath(root) {
    const els = (root || document).querySelectorAll("span.m:not([data-ok])"); if (!els.length) return;
    loadKatex().then(() => els.forEach(el => { if (el.dataset.ok) return; try { window.katex.render(el.dataset.tex, el, { displayMode: el.classList.contains("md"), throwOnError: false, strict: false, output: "html" }); } catch (e) { /* formule laissée en texte */ } el.dataset.ok = "1"; })).catch(() => {});
  }
  new MutationObserver(() => { renderMath(document.body); if (typeof fillPics === "function" && state.user) fillPics(document.body); }).observe(document.body, { childList: true, subtree: true });
  function md(text) {
    const out = []; let list = false;
    const inline = s => mathify(s, true);
    String(text || "").split(/\r?\n/).forEach(l => {
      const t = l.trim();
      if (/^[-*•]\s+/.test(t)) { if (!list) { out.push("<ul>"); list = true; } out.push("<li>" + inline(t.replace(/^[-*•]\s+/, "")) + "</li>"); return; }
      if (list) { out.push("</ul>"); list = false; }
      if (/^#{1,4}\s+/.test(t)) out.push("<h3>" + inline(t.replace(/^#{1,4}\s+/, "")) + "</h3>");
      else if (t) out.push("<p>" + inline(t) + "</p>");
    });
    if (list) out.push("</ul>");
    return out.join("");
  }

  // ---------- FSRS ----------
  function toFsrs(row) {
    if (!row.last_review) return F.createEmptyCard(new Date());
    return { due: new Date(row.due_at), stability: row.stability || 0, difficulty: row.difficulty || 0, elapsed_days: row.elapsed_days || 0, scheduled_days: row.scheduled_days || 0, reps: row.reps || 0, lapses: row.lapses || 0, learning_steps: 0, state: row.state || 0, last_review: new Date(row.last_review) };
  }
  // Maîtrise = part des cartes réussies : « Juste » la fait entrer dans la jauge, « Faux » l'en retire jusqu'à la prochaine réussite.
  // Sans la colonne cards.mastered (base pas encore migrée), on retombe sur l'état FSRS « en révision ».
  const isMastered = c => c.mastered != null ? !!c.mastered : c.state === 2;
  function mastery(cards) { if (!cards.length) return 0; return Math.floor(cards.filter(isMastered).length / cards.length * 100); }
  function cardsOf(chapterId) { return state.cards.filter(c => c.chapter_id === chapterId); }
  // Cartes à revoir = celles que la répétition espacée (FSRS) ramène aujourd'hui, PLUS, avant un contrôle proche, toutes les cartes
  // des chapitres du contrôle pas encore vues aujourd'hui (réglage « Avant un contrôle » : 7 jours par défaut, 0 = jamais).
  // Une de ces cartes « en plus » réussie ne touche pas à son calendrier FSRS (elle est juste notée vue aujourd'hui) ;
  // ratée, elle repasse par FSRS comme n'importe quelle carte oubliée.
  const boostDays = () => { const n = +jget("merge.boostj", 7); return [0, 3, 7, 14].includes(n) ? n : 7; };
  // Chapitres concernés → date du contrôle le plus proche qui les contient.
  function boostChapters() {
    const n = boostDays(); if (!n || !state.chapters) return null; const ids = new Map();
    upCtrls().forEach(({ c, s }) => { if (daysUntil(c.d) > n) return; (c.ch && c.ch.length ? c.ch : state.chapters.filter(x => x.subject_id === s.id).map(x => x.id)).forEach(i => { if (!ids.has(i) || c.d < ids.get(i)) ids.set(i, c.d); }); });
    return ids.size ? ids : null;
  }
  // Prochain passage de chaque carte en révision de contrôle (merge.boostnext, synchronisé) : « Trop facile » → après le contrôle,
  // « Juste » → dans 2 jours, « Juste, mais à revoir » → demain, « Faux » → aujourd'hui même.
  const boostNext = () => { const v = jget("merge.boostnext", null); return v && typeof v === "object" ? v : {}; };
  function setBoostNext(id, rating, prev) {
    const b = boostChapters(), row = state.cards.find(c => c.id === id); if (!b || !row || !b.has(row.chapter_id)) return;
    const m = boostNext(), t = new Date(localDay() + "T12:00:00"), plus = n => localDay(new Date(t.getTime() + n * 86400000));
    if (prev !== undefined) { if (prev === null) delete m[id]; else m[id] = prev; }
    else m[id] = rating === F.Rating.Easy ? plus(daysUntil(b.get(row.chapter_id)) + 1) : rating === F.Rating.Good ? plus(2) : rating === F.Rating.Hard ? plus(1) : localDay();
    const old = localDay(new Date(Date.now() - 30 * 86400000)); Object.keys(m).forEach(k => { if (m[k] < old) delete m[k]; });
    jset("merge.boostnext", m);
  }
  const fsrsDue = c => new Date(c.due_at).getTime() <= Date.now();
  // keep = true : on garde aussi les chapitres « au repos » (révision lancée exprès depuis le chapitre ou la matière).
  function dueCards(list, keep) { const b = boostChapters(), m = b ? boostNext() : null, today = localDay(), r = keep ? null : restedChapters(); return list.filter(c => (!r || !r.has(c.chapter_id)) && (fsrsDue(c) || (b && b.has(c.chapter_id) && (!m[c.id] || m[c.id] <= today)))); }
  // Chapitres « au repos » (22 nov.) : leur contrôle est passé, ils ne reviennent plus dans la révision du jour.
  // Automatique : chapitre coché dans un contrôle dont la date est passée, et dans aucun contrôle à venir (ni contrôle à venir
  // de toute la matière). À la main : merge.chrest = { idChapitre: "off" (retiré) | "on" (remis) }, qui l'emporte toujours.
  function restedChapters() {
    const today = localDay(), man = (() => { try { return JSON.parse(localStorage.getItem("merge.chrest") || "{}") || {}; } catch (_) { return {}; } })(), out = new Set();
    let l = []; try { l = typeof ctrls === "function" ? ctrls() : []; } catch (_) { l = []; }
    const future = l.filter(c => c.d >= today), subjOf = id => (state.chapters.find(c => c.id === id) || {}).subject_id;
    for (const c of l) if (c.d < today && Array.isArray(c.ch)) for (const id of c.ch) if (!future.some(f => (Array.isArray(f.ch) ? f.ch.includes(id) : f.s === subjOf(id)))) out.add(id);
    for (const [id, v] of Object.entries(man)) { if (v === "off") out.add(id); else if (v === "on") out.delete(id); }
    return out;
  }
  function restWhy(id) { const v = (() => { try { return (JSON.parse(localStorage.getItem("merge.chrest") || "{}") || {})[id]; } catch (_) { return null; } })(); return v === "off" ? "main" : restedChapters().has(id) ? "auto" : null; }
  function setRest(id, v) { let m = {}; try { m = JSON.parse(localStorage.getItem("merge.chrest") || "{}") || {}; } catch (_) {} m[id] = v; try { localStorage.setItem("merge.chrest", JSON.stringify(m)); } catch (_) {} }
  const VACANCES_ZONES = {
    A: [["Toussaint", "2026-10-17", "2026-11-01"], ["Noël", "2026-12-19", "2027-01-03"], ["Hiver", "2027-02-13", "2027-02-28"], ["Printemps", "2027-04-10", "2027-04-25"], ["Été", "2027-07-03", "2027-08-31"]],
    B: [["Toussaint", "2026-10-17", "2026-11-01"], ["Noël", "2026-12-19", "2027-01-03"], ["Hiver", "2027-02-20", "2027-03-07"], ["Printemps", "2027-04-17", "2027-05-02"], ["Été", "2027-07-03", "2027-08-31"]],
    C: [["Toussaint", "2026-10-17", "2026-11-01"], ["Noël", "2026-12-19", "2027-01-03"], ["Hiver", "2027-02-06", "2027-02-21"], ["Printemps", "2027-04-03", "2027-04-18"], ["Été", "2027-07-03", "2027-08-31"]],
  };
  // Série de jours révisés. Gel de série : un jour raté par semaine (du lundi au dimanche) ne casse pas la série.
  function streakInfo() {
    const days = new Set(state.sessions.filter(s => s.cards_reviewed > 0).map(s => s.day)); let n = 0, frozen = 0; const d = new Date(), used = new Set();
    const week = x => { const m = new Date(x); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return localDay(m); }, thisWeek = week(d);
    if (!days.has(localDay(d))) d.setDate(d.getDate() - 1);
    for (;;) {
      if (days.has(localDay(d))) { n++; d.setDate(d.getDate() - 1); continue; }
      const before = new Date(d); before.setDate(before.getDate() - 1); const w = week(d);
      if (n > 0 && !used.has(w) && days.has(localDay(before))) { used.add(w); if (w === thisWeek) frozen++; d.setDate(d.getDate() - 1); continue; }
      break;
    }
    return { n, frozen, left: used.has(thisWeek) ? 0 : 1 };
  }
  function streak() { return streakInfo().n; }

  // ---------- données ----------
  function queueReview(id, patch) { try { const q = JSON.parse(safeGet("merge.file") || "[]"); q.push({ id, patch }); safeSet("merge.file", JSON.stringify(q)); } catch (e) { /* file indisponible */ } }
  async function flushQueue() {
    let q = []; try { q = JSON.parse(safeGet("merge.file") || "[]"); } catch (e) { q = []; }
    if (!q.length) return;
    const rest = [];
    for (const it of q) { try { const r = await sb.from("cards").update(it.patch).eq("id", it.id); if (r.error) rest.push(it); } catch (e) { rest.push(it); } }
    safeSet("merge.file", JSON.stringify(rest));
  }
  async function loadAll() {
    state.loadedAt = Date.now();
    await flushQueue();
    const uid = state.user.id; const since = new Date(); since.setDate(since.getDate() - 120);
    const allCards = async (cols) => { const out = []; for (let from = 0; ; from += 1000) { const r = await sb.from("cards").select(cols).eq("user_id", uid).order("created_at").range(from, from + 999); if (r.error) return r; out.push(...(r.data || [])); if ((r.data || []).length < 1000) return { data: out, error: null }; } };
    let [p, s, c, k, ss, g] = await Promise.all([
      sb.from("profiles").select("*").eq("user_id", uid).maybeSingle(),
      sb.from("subjects").select("*").eq("archived", false).eq("user_id", uid).order("created_at"),
      sb.from("chapters").select("id,name,status,subject_id,group_id,cards_target,lang,notes,color,created_at").eq("archived", false).eq("user_id", uid).order("created_at"),
      allCards(CARD_META + ",mastered,mnemonic,picture,image_box"),
      sb.from("study_sessions").select("day,seconds,cards_reviewed").eq("user_id", uid).gte("day", localDay(since)),
      sb.from("groups").select("id,name,subject_id,color,created_at").eq("user_id", uid).order("created_at")
    ]);
    state.legacy = false;
    // Bases plus anciennes : sans image_box (cadre des schémas), puis sans image, puis sans les colonnes v6.
    if (k.error) k = await allCards(CARD_META + ",mastered,mnemonic,picture");
    if (k.error) { k = await allCards(CARD_META + ",mastered,mnemonic"); if (k.error) { k = await allCards(CARD_META); state.legacy = true; } }
    for (const r of [p, s, c, k, ss]) if (r.error) throw r.error;
    state.profile = p.data; state.subjects = s.data || []; state.chapters = c.data || []; state.sessions = ss.data || []; state.groups = g.error ? [] : (g.data || []);
    state.chapters = state.chapters.filter(c => state.subjects.some(x => x.id === c.subject_id));
    state.cards = (k.data || []).filter(c => state.chapters.some(x => x.id === c.chapter_id));
    state.offline = false;
    try { await kvPull(); } catch (e) { /* synchronisation au prochain passage */ }
    try { await ctrlSync(true); } catch (e) { /* refait au prochain chargement */ }
    try { seasonReset(); } catch (e) { /* refait au prochain chargement */ }
    safeSet("merge.cache." + uid, JSON.stringify({ profile: state.profile, subjects: state.subjects, groups: state.groups, chapters: state.chapters, cards: state.cards, sessions: state.sessions, legacy: state.legacy }));
    applyLook(state.profile); applyRewards();
    setTimeout(prefetchOffline, 4000);
  }
  // Retour sur l'appli (autre onglet, appli rouverte sur le téléphone) : on recharge les données si elles ont plus d'une minute,
  // pour qu'un chapitre ou une matière mis à la corbeille sur un autre appareil disparaisse partout ici aussi.
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState !== "visible" || !state.user || !state.profile || state.offline || Date.now() - (state.loadedAt || 0) < 60000) return;
    // Seulement sur les écrans de listes : jamais pendant une session de cartes, un quiz, un import ou un minuteur.
    const LIST = /^#?(accueil|matieres|calendrier|progres|perso|matiere-.*|dossier-.*|chapitre-.*)?$/, h = location.hash;
    if (!LIST.test(h) || Object.values(IMPORTS).some(d => d.busy) || document.getElementById("sheet")) return;
    try { await loadAll(); } catch (e) { return; }
    if (location.hash === h) route();
  });
  // Pas de zoom (pincement ou double appui) : l'appli est faite pour l'écran du téléphone. Safari iOS ignore user-scalable=no, d'où ces gestes bloqués.
  ["gesturestart", "gesturechange"].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
  document.addEventListener("touchmove", e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  // Double appui : bloqué par touch-action: manipulation (css), sans gêner deux appuis rapides sur deux boutons différents.
  // Hors ligne complet : résumés et contenus déjà générés (quiz, fiche, carte mentale…) copiés sur l'appareil, au plus toutes les 30 min.
  function offlineKeep(k, v) { const t = JSON.stringify(v); try { if (localStorage.getItem(k) !== t) localStorage.setItem(k, t); return true; } catch (e) { return false; } }
  let prefetchAt = 0;
  async function prefetchOffline() {
    if (!state.user || state.offline || Date.now() - prefetchAt < 1800000) return; prefetchAt = Date.now();
    const ids = state.chapters.map(c => c.id); if (!ids.length) return;
    try {
      for (let i = 0; i < ids.length; i += 50) {
        const part = ids.slice(i, i + 50);
        const [sr, gr] = await Promise.all([sb.from("summaries").select("chapter_id,markdown,edited_by_user").in("chapter_id", part), sb.from("ai_cache").select("chapter_id,kind,content").in("chapter_id", part)]);
        for (const x of (sr.data || [])) if (!offlineKeep("merge.sum." + x.chapter_id, x)) return;
        for (const x of (gr.data || [])) if (x.content && !offlineKeep(genKey(x.chapter_id, x.kind), x.content)) return;
      }
    } catch (e) { /* on réessaiera plus tard */ }
  }
  function loadCache() {
    try { const c = JSON.parse(safeGet("merge.cache." + state.user.id) || "null"); if (!c || !c.profile) return false; Object.assign(state, { groups: [] }, c, { offline: true }); applyLook(state.profile); return true; } catch (e) { return false; }
  }
  async function ai(body, fn) {
    const { data, error } = await sb.functions.invoke(fn || "ai", { body });
    if (!error) return data;
    let j = null; try { j = await error.context.json(); } catch (e) { /* pas de détail */ }
    const code = j && j.error;
    const msg = code === "quota" ? QUOTA_MSG
      : code === "config" ? "L'IA n'est pas encore branchée : la clé Google manque dans Supabase."
      : code === "ia_indisponible" ? "L'IA est coupée pour l'instant (plafond du mois ou accès Google). Tes révisions continuent de marcher."
      : code === "requete" ? j.detail
      : "L'IA n'a pas répondu" + (j && j.detail ? " : " + j.detail : ". Réessaie dans un instant.");
    const e = new Error(msg); e.code = code; throw e;
  }

  // ---------- quota, erreurs IA et cache des contenus générés ----------
  const QUOTA_MSG = "Vous avez atteint votre limite journalière. Contacte le créateur pour débloquer ou reviens demain. Tes révisions continuent de marcher !";
  function errHtml(e) {
    if (e && e.code === "quota") return `<div class="quotabox" role="alert"><p>${esc(QUOTA_MSG)}</p><a class="btn sm" href="${esc(C.CONTACT_CREATEUR)}" target="_blank" rel="noopener">${I.mail}Contacter le créateur</a></div>`;
    return `<p class="err" role="alert">${esc((e && e.message) || "Une erreur est survenue.")}</p>`;
  }
  function showErr(el, e) { if (!el) return; el.className = ""; el.innerHTML = errHtml(e); }
  // Tout contenu généré est gardé (mémoire, stockage local, table ai_cache) : jamais deux appels pour le même chapitre.
  const mem = {}, courseMemo = {};
  const genKey = (ch, kind) => "merge.gen." + ch + "." + kind;
  async function getCached(ch, kind) {
    const k = ch + "." + kind; if (mem[k]) return mem[k];
    try { const l = JSON.parse(safeGet(genKey(ch, kind)) || "null"); if (l) return (mem[k] = l); } catch (e) { /* cache local illisible */ }
    if (state.offline) return null;
    try { const r = await sb.from("ai_cache").select("content").eq("chapter_id", ch).eq("kind", kind).maybeSingle(); if (r.data && r.data.content) { mem[k] = r.data.content; safeSet(genKey(ch, kind), JSON.stringify(mem[k])); return mem[k]; } } catch (e) { /* table absente : cache local seulement */ }
    return null;
  }
  async function putCached(ch, kind, content) {
    mem[ch + "." + kind] = content; safeSet(genKey(ch, kind), JSON.stringify(content));
    try { await sb.from("ai_cache").upsert({ chapter_id: ch, kind, content }); } catch (e) { /* gardé en local */ }
  }
  async function courseText(id) {
    if (courseMemo[id] != null) return courseMemo[id];
    const { data, error } = await sb.from("sources").select("extracted_text").eq("chapter_id", id);
    if (error) throw new Error("Impossible de relire ton cours. Vérifie ta connexion.");
    return (courseMemo[id] = (data || []).map(x => x.extracted_text || "").join("\n\n"));
  }
  async function study(ch, kind, force) {
    if (!force) { const c = await getCached(ch, kind); if (c) return c; }
    const text = await courseText(ch); if (text.trim().length < 80) throw new Error("Importe d'abord ton cours dans ce chapitre.");
    const r = await ai({ action: "study", kind, text });
    if (!r || !r.content) throw new Error("L'IA n'a rien renvoyé. Réessaie.");
    await putCached(ch, kind, r.content); return r.content;
  }
  const toolHead = (id, title) => `<div class="row noprint"><a class="iconbtn" href="#chapitre-${id}" aria-label="Retour au chapitre">${I.x}</a><div class="grow" style="text-align:center;font-weight:800">${esc(title)}</div><span style="width:44px"></span></div>`;
  // Écran d'un outil généré par l'IA : affiche le contenu gardé, sinon propose de le préparer (1 appel).
  async function toolGate(id, kind, title, desc, render) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; app.innerHTML = toolHead(id, title) + `<p class="muted">Chargement…</p>`;
    const here = location.hash, regen = () => make(true);
    async function make(force) {
      app.innerHTML = toolHead(id, title) + `<div class="card done"><div class="spin" aria-hidden="true"></div><p class="muted" role="status">Merge prépare « ${esc(title)} » à partir de ton cours…</p></div>`;
      try { const c = await study(id, kind, force); if (location.hash === here) render(c, ch, regen); }
      catch (e) { if (location.hash !== here) return; app.innerHTML = toolHead(id, title) + `<div class="card pad stack"><h1>${esc(title)}</h1>${errHtml(e)}<a class="btn ghost" href="#chapitre-${id}">Retour au chapitre</a></div>`; }
    }
    const c = await getCached(id, kind); if (location.hash !== here) return;
    if (c) return render(c, ch, regen);
    app.innerHTML = toolHead(id, title) + `<div class="card pad stack"><h1>${esc(title)}</h1><p class="muted">${desc}</p><button class="btn" id="mk">Préparer avec l'IA</button><p class="note">1 appel IA, puis c'est gardé : tu pourras rouvrir cet outil autant de fois que tu veux. Tout vient uniquement de ton cours.</p></div>`;
    $("mk").onclick = () => make(false);
  }
  const regenHtml = `<p class="note noprint" style="text-align:center"><button class="linkbtn" id="regen">Refaire avec l'IA (1 appel)</button></p>`;
  function wireRegen(regen) { const b = $("regen"); if (b) b.onclick = () => { if (b.dataset.ok !== "1") { b.dataset.ok = "1"; b.textContent = "Confirmer : remplacer ce contenu (1 appel)"; return; } regen(); }; }

  // ---------- carnet d'erreurs ----------
  const errKey = () => "merge.erreurs." + (state.user ? state.user.id : "");
  function localMistakes() { try { return JSON.parse(safeGet(errKey()) || "[]"); } catch (e) { return []; } }
  // Annule une erreur notée par erreur (bouton « Annuler » des cartes) : une fois de moins, ou supprimée si c'était la première.
  async function unlogMistake(chapterId, q) {
    const question = String(q).slice(0, 600);
    try {
      if (state.offline) throw new Error("hors ligne");
      const old = await sb.from("mistakes").select("id,times").eq("chapter_id", chapterId).eq("question", question).maybeSingle();
      if (old.error) throw old.error; if (!old.data) throw new Error("pas en base");
      if ((old.data.times || 1) > 1) await sb.from("mistakes").update({ times: old.data.times - 1 }).eq("id", old.data.id); else await sb.from("mistakes").delete().eq("id", old.data.id);
    } catch (e) {
      const l = localMistakes(), o = l.find(x => x.chapter_id === chapterId && x.question === question); if (!o) return;
      safeSet(errKey(), JSON.stringify((o.times || 1) > 1 ? (o.times--, l) : l.filter(x => x !== o)));
    }
  }
  async function logMistake(chapterId, q, expected, given, mode, cardId) {
    const row = { chapter_id: chapterId, card_id: cardId || null, mode, question: String(q).slice(0, 600), expected: String(expected).slice(0, 2000), given: given ? String(given).slice(0, 1500) : null };
    try {
      if (state.offline) throw new Error("hors ligne");
      const old = await sb.from("mistakes").select("id,times").eq("chapter_id", chapterId).eq("question", row.question).maybeSingle();
      if (old.error) throw old.error;
      const r = old.data ? await sb.from("mistakes").update({ times: (old.data.times || 1) + 1, given: row.given, mode, updated_at: new Date().toISOString() }).eq("id", old.data.id) : await sb.from("mistakes").insert(row);
      if (r.error) throw r.error;
    } catch (e) {
      const l = localMistakes(), o = l.find(x => x.chapter_id === chapterId && x.question === row.question);
      if (o) { o.times = (o.times || 1) + 1; o.given = row.given; o.updated_at = new Date().toISOString(); } else l.unshift(Object.assign(row, { id: "local-" + Date.now() + "-" + Math.round(Math.random() * 1e6), times: 1, updated_at: new Date().toISOString() }));
      safeSet(errKey(), JSON.stringify(l.slice(0, 300)));
    }
  }

  // ---------- date du contrôle : calendrier en vue mois + révision libre ----------
  const fmtDate = d => new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const isFree = s => !!s.free_revision || safeGet("merge.libre." + s.id) === "1";
  function examPicker(box, val, onChange, noFree) {
    const v = { date: val.date || null, free: !!val.free }, ref = new Date((v.date || localDay()) + "T00:00:00"); ref.setDate(1);
    function draw() {
      const y = ref.getFullYear(), m = ref.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate(), today = localDay();
      let cells = ""; for (let i = 0; i < first; i++) cells += "<span></span>";
      for (let d = 1; d <= n; d++) { const key = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0"); cells += `<button type="button" class="day${key === today ? " now" : ""}" data-day="${key}" aria-pressed="${v.date === key}"${key < today || v.free ? " disabled" : ""}>${d}</button>`; }
      box.innerHTML = `<div class="picker card pad stack${v.free ? " off" : ""}"><div class="row between"><button type="button" class="iconbtn flat" data-nav="-1" aria-label="Mois précédent">${I.back}</button><b style="text-transform:capitalize">${ref.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</b><button type="button" class="iconbtn flat" data-nav="1" aria-label="Mois suivant" style="transform:scaleX(-1)">${I.back}</button></div>
        <div class="cal">${["L", "M", "M", "J", "V", "S", "D"].map(x => `<span class="wd">${x}</span>`).join("")}${cells}</div>
        <p class="small muted" aria-live="polite">${v.free ? "Révision libre : pas de date, tu avances à ton rythme." : v.date ? "Contrôle le " + fmtDate(v.date) + "." : "Touche le jour de ton contrôle."}</p>
        ${noFree ? "" : `<button type="button" class="switch" role="switch" aria-checked="${v.free}" data-free><i></i><span>Pas de contrôle prévu, révision libre</span></button>`}</div>`;
      box.querySelectorAll("[data-nav]").forEach(b => b.onclick = () => { ref.setMonth(ref.getMonth() + (+b.dataset.nav)); draw(); });
      box.querySelectorAll("[data-day]").forEach(b => b.onclick = () => { v.date = v.date === b.dataset.day ? null : b.dataset.day; draw(); onChange({ date: v.date, free: false }); });
      if (box.querySelector("[data-free]")) box.querySelector("[data-free]").onclick = () => { v.free = !v.free; if (v.free) v.date = null; draw(); onChange({ date: v.date, free: v.free }); };
    }
    draw();
  }
  async function saveExam(id, v) {
    const date = v.free ? null : (v.date || null), sub0 = state.subjects.find(x => x.id === id), old = sub0 && sub0.exam_date;
    let r = await sb.from("subjects").update({ exam_date: date, free_revision: !!v.free }).eq("id", id);
    if (r.error) { r = await sb.from("subjects").update({ exam_date: date }).eq("id", id); if (r.error) return r.error; }
    safeSet("merge.libre." + id, v.free ? "1" : "");
    // Chapitres choisis pour le contrôle : ils suivent la date si on la décale ; un nouveau contrôle (l'ancien est passé) repart de zéro.
    const sel = jget("merge.examch." + id, null); if (sel && date && sel.d === old && old >= localDay()) jset("merge.examch." + id, Object.assign(sel, { d: date }));
    const s = state.subjects.find(x => x.id === id); if (s) { s.exam_date = date; s.free_revision = !!v.free; }
    return null;
  }

  // ---------- contrôles : plusieurs par matière (user_kv « merge.controles »), avec les chapitres de chacun ----------
  // { id, s: matière, d: "AAAA-MM-JJ", ch: [chapitres] ou null (= tous) }. subjects.exam_date garde la date du PROCHAIN contrôle
  // de la matière : c'est elle qu'utilisent le plan, l'accueil et les rappels (qui lisent aussi cette liste côté serveur).
  const ctrls = () => (jget("merge.controles", null) || []).filter(c => c && c.id && c.s && /^\d{4}-\d{2}-\d{2}$/.test(c.d));
  const ctrlSave = l => jset("merge.controles", l);
  const ctrlsOf = sid => ctrls().filter(c => c.s === sid).sort((a, b) => a.d.localeCompare(b.d));
  const nextCtrl = s => s && !isFree(s) ? ctrlsOf(s.id).find(c => c.d >= localDay()) || null : null;
  const upCtrls = () => ctrls().filter(c => c.d >= localDay()).map(c => ({ c, s: state.subjects.find(x => x.id === c.s) })).filter(x => x.s && !isFree(x.s)).sort((a, b) => a.c.d.localeCompare(b.c.d));
  const jx = d => { const j = daysUntil(d); return j === 0 ? "Auj." : "J-" + j; };
  async function ctrlSync(migrate) {
    let l = ctrls(), changed = false;
    // Dates déjà en base (avant cette version, ou mises à l'inscription) : elles deviennent des contrôles, avec l'ancien choix de chapitres.
    if (migrate) state.subjects.forEach(s => { if (s.exam_date && !isFree(s) && s.exam_date >= localDay() && !l.some(c => c.s === s.id && c.d === s.exam_date)) { const v = jget("merge.examch." + s.id, null); l.push({ id: "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), s: s.id, d: s.exam_date, ch: v && v.on && v.d === s.exam_date && Array.isArray(v.ids) && v.ids.length ? v.ids : null }); changed = true; } });
    const seen = new Set(), old = localDay(new Date(Date.now() - 60 * 86400000));
    const l2 = l.filter(c => { const k = c.s + c.d; if (seen.has(k) || c.d < old) return false; seen.add(k); return true; });
    if (l2.length !== l.length || changed) ctrlSave(l2);
    if (state.offline) return;
    for (const s of state.subjects) { if (isFree(s)) continue; const nx = nextCtrl(s), want = nx ? nx.d : null; if ((s.exam_date || null) !== want && (want || (s.exam_date && s.exam_date >= localDay()))) await saveExam(s.id, { date: want, free: false }); }
  }
  async function ctrlAdd(sid, d) {
    const l = ctrls(); if (l.some(c => c.s === sid && c.d === d)) return null;
    const c = { id: "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), s: sid, d, ch: null }; l.push(c); ctrlSave(l); await ctrlSync(); return c;
  }
  async function ctrlDel(cid) { ctrlSave(ctrls().filter(c => c.id !== cid)); betSave(bets().filter(b => !(b.cid === cid && b.note == null))); await ctrlSync(); }
  // ---------- pari sur la note d'un contrôle (17 nov.) ----------
  // On vise une note et on mise des pièces : elles sont bloquées jusqu'à ce qu'on entre sa vraie note après le contrôle.
  // Note atteinte : on récupère mise × (1 + (note visée - 8) / 6) → ×1,33 pour 10, ×2 pour 14, ×3 pour 20 (plus c'est ambitieux, plus ça rapporte).
  // À 1 point près : on récupère la moitié. En dessous : la mise est perdue. Rangé à part (merge.paris) pour survivre à l'effacement des vieux contrôles.
  const bets = () => (jget("merge.paris", null) || []).filter(b => b && b.id && b.cid && b.goal >= 1 && b.stake > 0);
  const betSave = l => jset("merge.paris", l);
  const betOf = cid => bets().find(b => b.cid === cid);
  const betMult = goal => 1 + (Math.max(8, Math.min(20, goal)) - 8) / 6;
  const betBack = (b, note) => note >= b.goal ? Math.round(b.stake * betMult(b.goal)) : note >= b.goal - 1 ? Math.round(b.stake / 2) : 0;
  // Pour le solde : toutes les mises sont « dépensées », les gains des paris terminés sont « gagnés ».
  function betCoins() { const l = bets(); return { staked: l.reduce((a, b) => a + b.stake, 0), back: l.filter(b => b.note != null).reduce((a, b) => a + betBack(b, b.note), 0), locked: l.filter(b => b.note == null).reduce((a, b) => a + b.stake, 0) }; }
  const betsToSettle = () => bets().filter(b => b.note == null && b.d < localDay());
  const noteTxt = n => String(n).replace(".", ",");
  function betSheet(cid, after) {
    const c = ctrls().find(x => x.id === cid), s = c && state.subjects.find(x => x.id === c.s); if (!s) return;
    const have = betOf(cid), bal = coinsInfo().balance + (have ? have.stake : 0);
    let goal = have ? have.goal : 14, stake = have ? have.stake : Math.min(50, Math.max(10, Math.floor(bal / 2 / 5) * 5));
    const paint = el => {
      const win = Math.round(stake * betMult(goal));
      el.querySelector("#bgoal").textContent = noteTxt(goal) + "/20";
      el.querySelector("#bmult").textContent = "×" + betMult(goal).toFixed(2).replace(".", ",").replace(/,?0+$/, "");
      el.querySelectorAll("[data-stk]").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.stk === stake)));
      el.querySelector("#bstake").textContent = plural(stake, "pièce", "pièces");
      el.querySelector("#bwhat").innerHTML = `<li><b>${noteTxt(goal)} ou plus</b> : tu récupères <b>${win}</b> pièces (+${win - stake})</li><li><b>${noteTxt(goal - 1)}</b> : tu récupères ${Math.round(stake / 2)} pièces</li><li><b>Moins</b> : tu perds tes ${stake} pièces</li>`;
      el.querySelector("#bok").textContent = (have ? "Modifier le pari · " : "Miser ") + plural(stake, "pièce", "pièces");
    };
    if (bal < 10) return sheet(`<div class="row"><span class="mico big">${I.coin}</span><h1>Parier sur ta note</h1></div><p>Il faut au moins 10 pièces pour parier. Tu en gagnes en révisant : 1 pièce tous les ${COIN_PTS} points.</p><button class="btn" data-close>J'ai compris</button>`);
    const stakes = [10, 25, 50, 100, 200].filter(x => x <= bal);
    sheet(`<div class="row"><span class="mico big">${I.coin}</span><h1>Parier sur ta note</h1></div><p class="muted">Contrôle de ${esc(s.name)} · ${esc(fmtDate(c.d))}. Vise une note, mise des pièces : elles restent bloquées jusqu'à ce que tu entres ta vraie note.</p>
      <div class="betrow"><span class="label">Note visée</span><div class="row"><button class="iconbtn" id="bminus" aria-label="Note visée plus basse">−</button><b class="betgoal" id="bgoal"></b><button class="iconbtn" id="bplus" aria-label="Note visée plus haute">${I.plus}</button><span class="pill" id="bmult"></span></div></div>
      <div class="betrow"><span class="label">Mise · <span id="bstake"></span> <span class="muted">(tu as ${plural(bal, "pièce", "pièces")})</span></span><div class="chips">${stakes.map(x => `<button class="chip" data-stk="${x}">${x}</button>`).join("")}${bal > 200 || !stakes.includes(bal) ? `<button class="chip" data-stk="${bal}">Tout (${bal})</button>` : ""}</div></div>
      <ul class="betwhat" id="bwhat"></ul>
      <button class="btn big" id="bok"></button>${have ? `<button class="btn ghost" id="bcancel">Annuler le pari (pièces rendues)</button>` : `<button class="btn ghost" data-close>Pas de pari</button>`}`, el => {
      paint(el);
      el.querySelector("#bminus").onclick = () => { goal = Math.max(10, goal - 1); paint(el); };
      el.querySelector("#bplus").onclick = () => { goal = Math.min(20, goal + 1); paint(el); };
      el.querySelectorAll("[data-stk]").forEach(b => b.onclick = () => { stake = +b.dataset.stk; paint(el); });
      el.querySelector("#bok").onclick = () => {
        const l = bets().filter(b => b.cid !== cid); l.push({ id: have ? have.id : "p" + Date.now().toString(36), cid, s: s.id, sname: s.name, d: c.d, goal, stake, at: Date.now(), note: null }); betSave(l); walletSync();
        closeSheet(); toast(`Pari enregistré : ${noteTxt(goal)}/20 en ${s.name}, ${plural(stake, "pièce", "pièces")} en jeu.`); if (after) after();
      };
      if (el.querySelector("#bcancel")) el.querySelector("#bcancel").onclick = () => { betSave(bets().filter(b => b.cid !== cid)); walletSync(); closeSheet(); toast("Pari annulé, tes pièces sont rendues."); if (after) after(); };
    });
  }
  // Après le contrôle : on entre sa note, le pari se règle.
  function betNoteSheet(bid, after) {
    const b = bets().find(x => x.id === bid); if (!b) return;
    sheet(`<div class="row"><span class="mico big">${I.check}</span><h1>Ta note en ${esc(b.sname)}</h1></div><p class="muted">Contrôle du ${esc(fmtDate(b.d))} · tu visais ${noteTxt(b.goal)}/20 avec ${plural(b.stake, "pièce", "pièces")} en jeu.</p>
      <div class="field"><label for="bnote">Ta note sur 20</label><input id="bnote" type="number" inputmode="decimal" min="0" max="20" step="0.25" placeholder="Ex. 14,5"></div><p class="small" id="bprev" aria-live="polite"></p>
      <button class="btn big" id="bnok">Valider ma note</button><button class="btn ghost" data-close>Plus tard</button>`, el => {
      const inp = el.querySelector("#bnote"), read = () => { const v = parseFloat(String(inp.value).replace(",", ".")); return Number.isFinite(v) && v >= 0 && v <= 20 ? v : null; };
      inp.oninput = () => { const v = read(); el.querySelector("#bprev").textContent = v == null ? "" : v >= b.goal ? `Objectif atteint : tu récupères ${betBack(b, v)} pièces.` : v >= b.goal - 1 ? `À un point près : tu récupères ${betBack(b, v)} pièces.` : `Objectif raté : tu perds tes ${b.stake} pièces.`; };
      el.querySelector("#bnok").onclick = () => {
        const v = read(); if (v == null) return toast("Entre une note entre 0 et 20.");
        const l = bets(), x = l.find(y => y.id === bid); x.note = v; x.settled = Date.now(); betSave(l); walletSync();
        const back = betBack(x, v); closeSheet();
        if (v >= x.goal && typeof confetti === "function") try { confetti(); } catch (e) { /* rien */ }
        toast(v >= x.goal ? `Bravo ! +${back - x.stake} pièces (${back} récupérées).` : back ? `Presque ! ${back} pièces récupérées.` : `Raté de peu ou de beaucoup : ${x.stake} pièces perdues. La prochaine fois !`);
        if (after) after();
      };
    });
  }
  // Fenêtre « Quels chapitres tombent ? » : ouverte juste après avoir placé un contrôle, et depuis le bouton « Chapitres ».
  function ctrlChSheet(cid, after) {
    const c = ctrls().find(x => x.id === cid), s = c && state.subjects.find(x => x.id === c.s); if (!s) return;
    const chs = state.chapters.filter(x => x.subject_id === s.id), sel = new Set((c.ch || []).filter(x => chs.some(y => y.id === x)));
    const paint = el => {
      el.querySelector("#cchs").innerHTML = chs.map(x => `<button type="button" class="chip" data-cc="${x.id}" aria-pressed="${sel.has(x.id)}" style="--c:${esc(s.color)}"><span class="dot" style="flex:none"></span><span>${esc(x.name)}</span></button>`).join("");
      el.querySelector("#ccall").setAttribute("aria-pressed", String(!sel.size));
      el.querySelector("#ccnote").textContent = sel.size ? "Ton plan de révision ne gardera que " + (sel.size > 1 ? "ces " + sel.size + " chapitres." : "ce chapitre.") : "Tous les chapitres de la matière sont au programme.";
      el.querySelectorAll("[data-cc]").forEach(b => b.onclick = () => { sel.has(b.dataset.cc) ? sel.delete(b.dataset.cc) : sel.add(b.dataset.cc); paint(el); });
    };
    sheet(`<div class="row"><span class="mico big">${I.cal}</span><h1>Contrôle de ${esc(s.name)}</h1></div><p class="muted">${esc(fmtDate(c.d))}</p><h2>Quels chapitres tombent ?</h2>
      ${chs.length ? `<button type="button" class="chip big" id="ccall" aria-pressed="true">Tous les chapitres</button><span class="label">Ou seulement :</span><div class="chips" id="cchs"></div><p class="small muted" id="ccnote" aria-live="polite"></p>` : '<p class="small muted">Pas encore de chapitre dans cette matière : le contrôle porte sur toute la matière. Tu pourras choisir les chapitres plus tard.</p><span id="ccall" hidden></span><span id="cchs" hidden></span><span id="ccnote" hidden></span>'}
      <button class="btn" id="ccok">Valider</button>${!betOf(cid) && c.d >= localDay() ? `<button class="btn ghost" id="ccbet">${I.coin}Valider et parier sur ma note</button>` : ""}`, el => {
      paint(el);
      el.querySelector("#ccall").onclick = () => { sel.clear(); paint(el); };
      const save = () => { const l = ctrls(), x = l.find(y => y.id === cid); if (x) { x.ch = sel.size ? [...sel] : null; ctrlSave(l); } };
      el.querySelector("#ccok").onclick = () => { save(); closeSheet(); toast(sel.size ? "Contrôle enregistré avec " + plural(sel.size, "chapitre", "chapitres") + "." : "Contrôle enregistré."); if (after) after(); };
      if (el.querySelector("#ccbet")) el.querySelector("#ccbet").onclick = () => { save(); closeSheet(); if (after) after(); setTimeout(() => betSheet(cid, after), 260); };
    });
  }

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

  const TABS = [["accueil", "Accueil", "home"], ["matieres", "Matières", "subj"], ["exos", "Prof", "prof"], ["calendrier", "Planning", "day"], ["progres", "Progrès", "chart"], ["reglages", "Réglages", "gear"]];
  function drawTabs(current) {
    tabs.hidden = false;
    const due = state.cards ? dueCards(state.cards).length : 0, st = state.sessions ? streak() : 0;
    tabs.innerHTML = `<div class="logo side">${esc(C.NOM_APPLI)}<b>.</b></div>` + TABS.map(t => `<a href="#${t[0]}"${t[0] === current ? ' aria-current="page"' : ""}>${I[t[2]]}<span>${t[1]}</span></a>`).join("")
      + `<div class="sidefoot"><button class="sidemusic" data-qs>${I.search}<span>Rechercher</span><kbd>Ctrl K</kbd></button><button class="sidemusic" data-pomo>${I.clock}<span>Pomodoro</span></button>${LOFI.length ? `<button class="sidemusic${music.on ? " on" : ""}" data-music>${I.listen}<span>Musique de fond</span></button>` : ""}<div class="sidecard"><b>${due ? plural(due, "carte", "cartes") + " à revoir" : "Tu es à jour"}</b><span>${st ? plural(st, "jour", "jours") + " d'affilée" : "Commence ta série aujourd'hui"}</span>${due ? '<button class="btn sm" id="sidego">Réviser</button>' : ""}</div></div>`;
    const g = document.getElementById("sidego"); if (g) g.onclick = () => { location.hash = "#cartes-jour"; };
    // Toucher un onglet ramène à son écran d'arrivée, même si on y est déjà (Planning : aujourd'hui, en frise).
    tabs.querySelectorAll("a[href^='#']").forEach(a => a.addEventListener("click", e => {
      const h = a.getAttribute("href");
      if (h === "#calendrier") jset("merge.jview", { lvl: "jour", day: localDay(), hours: false });
      // (Réglages : ferme la catégorie ouverte et revient à la liste.)
      if (location.hash === h) { e.preventDefault(); app.removeAttribute("data-sec"); document.dispatchEvent(new CustomEvent("merge:tabagain", { detail: h })); route(); window.scrollTo(0, 0); }
    }));
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
  // Confirmation avant de supprimer : une petite fenêtre « Tu es sûr ? » par-dessus tout le reste (fenêtre ou menu ouverts).
  function askConfirm(title, text, ok = "Supprimer") {
    return new Promise(res => {
      const old = document.getElementById("confirm"); if (old) old.remove();
      const el = document.createElement("div"); el.className = "sheetwrap confirmwrap"; el.id = "confirm";
      el.innerHTML = `<div class="sheet card confirmbox" role="alertdialog" aria-modal="true" aria-labelledby="cftitle"><h2 id="cftitle">${esc(title)}</h2>${text ? `<p class="muted">${esc(text)}</p>` : ""}<div class="row"><button class="btn ghost grow" data-c="0">Annuler</button><button class="btn danger grow" data-c="1">${esc(ok)}</button></div></div>`;
      const done = v => { el.remove(); res(v); };
      el.onclick = e => { if (e.target === el) return done(false); const b = e.target.closest("[data-c]"); if (b) done(b.dataset.c === "1"); };
      el.done = done; document.body.appendChild(el); el.querySelector('[data-c="0"]').focus();
    });
  }
  document.addEventListener("keydown", e => { if (e.key !== "Escape") return; const c = document.getElementById("confirm"); if (c) return c.done(false); closeSheet(); });

  // ---------- v10 : niveau, badges, plan de révision, reprise, installation, recherche rapide, pomodoro ----------
  const jget = (k, d) => { try { const v = JSON.parse(safeGet(k) || "null"); return v == null ? d : v; } catch (e) { return d; } };
  const jset = (k, v) => safeSet(k, JSON.stringify(v));
  const fmtT = s => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  // Points bruts (tout l'historique). Les points de jeu partent de zéro à chaque remise à zéro (saison) : xp0 = points bruts à ce moment-là.
  function rawXp() {
    return state.cards.reduce((a, c) => a + (c.right_count || 0) * 10 + (c.wrong_count || 0) * 2, 0) + state.chapters.filter(c => { const cs = cardsOf(c.id); return cs.length && mastery(cs) >= 100; }).length * 100;
  }
  function xpInfo() {
    const d = jget("merge.rewards", null) || {}, xp = Math.max(0, rawXp() - (+d.xp0 || 0));
    const level = levelOfXp(xp), base = lvlStart(level), next = base + lvlStep(level);
    return { xp, level, rank: rankOf(level), pct: Math.round((xp - base) / (next - base) * 100), left: next - xp };
  }
  // Niveaux (saison 2, 14 nov. 2026) : chaque niveau coûte 150 × niveau + 40 × (niveau − 1)² points, de plus en plus cher.
  // Niveau 2 à 150 points, 5 à 2 060, 10 à ~15 000, 20 à ~113 000, 30 à ~374 000, 50 à ~1,7 million : de quoi tenir des années.
  const lvlStep = L => 150 * L + 40 * (L - 1) * (L - 1);
  const lvlStart = L => { let t = 0; for (let l = 1; l < L; l++) t += lvlStep(l); return t; };
  const levelOfXp = xp => { if (!isFinite(xp)) return 999; let L = 1, t = 0; while (L < 999 && t + lvlStep(L) <= xp) { t += lvlStep(L); L++; } return L; };
  const RANKS = [[1, "Bronze"], [10, "Argent"], [20, "Or"], [30, "Platine"], [40, "Diamant"], [50, "Légende"]];
  const rankOf = L => RANKS.filter(r => L >= r[0]).pop()[1];

  // ---------- récompenses : débloquées avec les points (rien à dépenser), équipées sur tous les appareils ----------
  const REWARDS = [
    { id: "t-novice", type: "titre", n: "Apprenti", pts: 0 }, { id: "t-regulier", type: "titre", n: "Régulier", pts: 1200 }, { id: "t-studieux", type: "titre", n: "Studieux", pts: 3200 }, { id: "t-acharne", type: "titre", n: "Acharné", pts: 8000 }, { id: "t-maitre", type: "titre", n: "Maître des fiches", pts: 16000 }, { id: "t-legende", type: "titre", n: "Légende de Merge", pts: 32000 },
    { id: "c-violet", type: "couleur", n: "Violet Merge", pts: 0, v: "" }, { id: "c-ocean", type: "couleur", n: "Océan", pts: 800, v: "#2f7cf6" }, { id: "c-menthe", type: "couleur", n: "Menthe", pts: 2000, v: "#14a37f" }, { id: "c-corail", type: "couleur", n: "Corail", pts: 4000, v: "#f0605a" }, { id: "c-or", type: "couleur", n: "Or", pts: 10000, v: "#d99a0b" }, { id: "c-rose", type: "couleur", n: "Rose néon", pts: 0, chest: true, v: "#e0409c" }, { id: "c-lagon", type: "couleur", n: "Lagon", pts: 0, chest: true, v: "#0ea5b7" },
    { id: "f-aucun", type: "fond", n: "Sans fond animé", pts: 0, v: "" }, { id: "f-aurore", type: "fond", n: "Aurore", pts: 1600, v: "aurore" }, { id: "f-etoiles", type: "fond", n: "Ciel étoilé", pts: 4800, v: "etoiles" }, { id: "f-vagues", type: "fond", n: "Vagues", pts: 0, chest: true, v: "vagues" },
    { id: "s-doux", type: "son", n: "Sons doux", pts: 0, v: "doux" }, { id: "s-arcade", type: "son", n: "Sons arcade", pts: 2400, v: "arcade" }, { id: "s-cristal", type: "son", n: "Sons cristal", pts: 0, chest: true, v: "cristal" },
    { id: "m-aucune", type: "mascotte", n: "Pas de mascotte", pts: 0, v: "" }, { id: "m-mergo", type: "mascotte", n: "Mergo", pts: 600, v: "mergo" }, { id: "m-mergo-lunettes", type: "mascotte", n: "Mergo à lunettes", pts: 6000, v: "lunettes" }, { id: "m-mergo-couronne", type: "mascotte", n: "Mergo couronné", pts: 0, chest: true, v: "couronne" },
    { id: "k-hasard", type: "confettis", n: "Animations au hasard", pts: 0, v: "" }, { id: "k-feux", type: "confettis", n: "Toujours le feu d'artifice", pts: 2800, v: "feux" }, { id: "k-etoiles", type: "confettis", n: "Toujours les étoiles", pts: 0, chest: true, v: "etoiles" },
  ];
  // ---------- boutique : articles achetés avec les pièces (gagnées en révisant) ----------
  // price = prix en pièces. Les cadeaux en vrai (type « cadeau ») n'apparaissent que sur les comptes activés dans /admin.
  const SHOP = [
    { id: "c-sakura", type: "couleur", n: "Sakura", price: 100, v: "#e0609f" }, { id: "c-lagon", type: "couleur", n: "Lagon", price: 100, v: "#0aa5bd" }, { id: "c-citron", type: "couleur", n: "Citron vert", price: 130, v: "#4f9e22" },
    { id: "c-framboise", type: "couleur", n: "Framboise", price: 130, v: "#d23369" }, { id: "c-ardoise", type: "couleur", n: "Ardoise", price: 130, v: "#55657d" }, { id: "c-ambre", type: "couleur", n: "Ambre", price: 170, v: "#d9801a" },
    { id: "c-nuit", type: "couleur", n: "Nuit bleue", price: 170, v: "#3949c9" }, { id: "c-turquoise", type: "couleur", n: "Turquoise", price: 170, v: "#0f9f90" }, { id: "c-prune", type: "couleur", n: "Prune", price: 200, v: "#8e44ad" }, { id: "c-cerise", type: "couleur", n: "Cerise", price: 200, v: "#df3a3a" },
    { id: "f-nuages", type: "fond", n: "Nuages", price: 230, v: "nuages" }, { id: "f-neige", type: "fond", n: "Neige", price: 270, v: "neige" }, { id: "f-bulles", type: "fond", n: "Bulles", price: 270, v: "bulles" }, { id: "f-pluie", type: "fond", n: "Pluie", price: 300, v: "pluie" },
    { id: "f-lucioles", type: "fond", n: "Lucioles", price: 330, v: "lucioles" }, { id: "f-sakura", type: "fond", n: "Pétales de sakura", price: 400, v: "sakura" }, { id: "f-coucher", type: "fond", n: "Coucher de soleil", price: 430, v: "coucher" }, { id: "f-galaxie", type: "fond", n: "Galaxie", price: 530, v: "galaxie" },
    { id: "m-noeud", type: "mascotte", n: "Mergo nœud papillon", price: 130, v: "noeud" }, { id: "m-fleur", type: "mascotte", n: "Mergo à la fleur", price: 170, v: "fleur" }, { id: "m-casquette", type: "mascotte", n: "Mergo casquette", price: 170, v: "casquette" },
    { id: "m-casque", type: "mascotte", n: "Mergo au casque audio", price: 200, v: "casque" }, { id: "m-bonnet", type: "mascotte", n: "Mergo de Noël", price: 230, v: "bonnet" }, { id: "m-soleil", type: "mascotte", n: "Mergo lunettes de soleil", price: 270, v: "soleil" },
    { id: "m-chapeau", type: "mascotte", n: "Mergo haut-de-forme", price: 330, v: "chapeau" }, { id: "m-sorcier", type: "mascotte", n: "Mergo sorcier", price: 400, v: "sorcier" }, { id: "m-aureole", type: "mascotte", n: "Mergo l'ange", price: 470, v: "aureole" },
    { id: "d-papier", type: "carte", n: "Cartes papier", price: 200, v: "papier" }, { id: "d-bonbon", type: "carte", n: "Cartes bonbon", price: 230, v: "bonbon" }, { id: "d-tableau", type: "carte", n: "Cartes tableau noir", price: 270, v: "tableau" },
    { id: "d-coucher", type: "carte", n: "Cartes coucher de soleil", price: 300, v: "coucher" }, { id: "d-neon", type: "carte", n: "Cartes néon", price: 330, v: "neon" }, { id: "d-galaxie", type: "carte", n: "Cartes galaxie", price: 470, v: "galaxie" },
    { id: "l-bleue", type: "flamme", n: "Flamme bleue", price: 170, v: "bleue" }, { id: "l-verte", type: "flamme", n: "Flamme verte", price: 170, v: "verte" }, { id: "l-rose", type: "flamme", n: "Flamme rose", price: 200, v: "rose" },
    { id: "l-or", type: "flamme", n: "Flamme dorée", price: 330, v: "or" }, { id: "l-arc", type: "flamme", n: "Flamme arc-en-ciel", price: 530, v: "arc" },
    { id: "t-feu", type: "titre", n: "Cerveau en feu", price: 100 }, { id: "t-turbo", type: "titre", n: "Mode turbo", price: 130 }, { id: "t-machine", type: "titre", n: "Machine à réviser", price: 170 },
    { id: "t-prof", type: "titre", n: "Prof en herbe", price: 200 }, { id: "t-ninja", type: "titre", n: "Ninja des flashcards", price: 230 }, { id: "t-reine", type: "titre", n: "Reine des fiches", price: 270 },
    { id: "t-roi", type: "titre", n: "Roi des fiches", price: 270 }, { id: "t-zero", type: "titre", n: "Zéro oubli", price: 400 }, { id: "t-legende", type: "titre", n: "Légende du bac", price: 600 },
    { id: "k-pluie", type: "confettis", n: "Toujours la pluie de confettis", price: 130, v: "pluie" }, { id: "k-serpentins", type: "confettis", n: "Toujours les serpentins", price: 170, v: "serpentins" }, { id: "k-explosion", type: "confettis", n: "Toujours l'explosion", price: 200, v: "explosion" },
    // Grosse mise à jour de la boutique : need = niveau minimum pour acheter (de quoi viser loin).
    ...[["pistache", "Pistache", 100, "#6fa315"], ["lavande", "Lavande", 100, "#7c6cf0"], ["peche", "Pêche", 100, "#ee7a5f"], ["ciel", "Bleu ciel", 100, "#2f96dd"], ["chewing", "Chewing-gum", 130, "#e4569f"],
      ["foret", "Forêt", 130, "#2f8f4e"], ["cuivre", "Cuivre", 170, "#c2662d"], ["indigo", "Indigo", 170, "#4f46e5"], ["sable", "Sable", 170, "#a8824c"], ["olive", "Olive", 200, "#6b8e23"],
      ["chocolat", "Chocolat", 200, "#8b5a2b"], ["glacier", "Glacier", 200, "#1ea7b5"], ["magenta", "Magenta", 200, "#c026d3"], ["acier", "Bleu acier", 230, "#4a6fa5"], ["emeraude", "Émeraude", 230, "#059669"],
      ["rubis", "Rubis", 230, "#be123c"], ["saphir", "Saphir", 230, "#1d4ed8"], ["mangue", "Mangue", 270, "#e08a00", 5], ["orchidee", "Orchidée", 270, "#a855f7", 5], ["fuchsia", "Fuchsia", 270, "#e11d74", 5],
      ["jade", "Jade", 300, "#0e9a78", 6], ["grenat", "Grenat", 300, "#9f1239", 6], ["cobalt", "Cobalt", 330, "#2457d6", 7], ["aubergine", "Aubergine", 330, "#6b21a8", 7], ["corailvif", "Corail vif", 370, "#f2463a", 8],
      ["tropical", "Tropical", 400, "#00a884", 9], ["flamant", "Flamant rose", 400, "#f05a95", 9], ["ultraviolet", "Ultraviolet", 470, "#7b2ff7", 10], ["minuit", "Minuit", 530, "#312e81", 12], ["platine", "Platine", 670, "#6b7a90", 15]]
      .map(([k, n, price, v, need]) => ({ id: "c-" + k, type: "couleur", n, price, v, need })),
    ...[["pois", "Pois", 300], ["grille", "Cahier quadrillé", 330], ["rayures", "Rayures", 370, 4], ["coeurs", "Petits cœurs", 430, 5], ["braises", "Braises", 470, 6], ["ocean", "Fond de l'océan", 500, 7], ["arcenciel", "Arc-en-ciel", 600, 8], ["matrice", "Matrice", 670, 10]]
      .map(([v, n, price, need]) => ({ id: "f-" + v, type: "fond", n, price, v, need })),
    ...[["moustache", "Mergo moustachu", 130], ["chat", "Mergo oreilles de chat", 200], ["lapin", "Mergo oreilles de lapin", 200], ["toque", "Mergo cuisinier", 200], ["echarpe", "Mergo à l'écharpe", 230], ["etoile", "Mergo la star", 270],
      ["diplome", "Mergo diplômé", 300, 4], ["masque", "Mergo super-héros", 330, 5], ["viking", "Mergo viking", 370, 6], ["pirate", "Mergo pirate", 400, 7]]
      .map(([v, n, price, need]) => ({ id: "m-" + v, type: "mascotte", n, price, v, need })),
    // Collection kawaii : Mergo princesse, licorne, nœud rose…, couleurs et fonds tout doux.
    ...[["princesse", "Mergo princesse", 230], ["noeudrose", "Mergo nœud rose", 170], ["kawaii", "Mergo kawaii", 170], ["couronnefleurs", "Mergo couronne de fleurs", 230], ["fraise", "Mergo fraise", 200], ["licorne", "Mergo licorne", 330, 4], ["chaton", "Mergo chaton rose", 270], ["magique", "Mergo baguette magique", 370, 5]]
      .map(([v, n, price, need]) => ({ id: "m-" + v, type: "mascotte", n, price, v, need })),
    ...[["rosebonbon", "Rose bonbon", 130, "#f472b6"], ["lilas", "Lilas", 130, "#b18cf2"], ["barbe", "Barbe à papa", 170, "#ec7ab8"], ["peche2", "Pêche douce", 170, "#f59e7b"], ["menthe2", "Menthe glacée", 170, "#34c2a2"]]
      .map(([k, n, price, v, need]) => ({ id: "c-" + k, type: "couleur", n, price, v, need })),
    ...[["paillettes", "Paillettes", 300], ["barbe", "Barbe à papa", 330], ["etoilesk", "Étoiles kawaii", 370, 4]].map(([v, n, price, need]) => ({ id: "f-" + v, type: "fond", n, price, v, need })),
    ...[["licorne", "Cartes licorne", 300], ["fraise", "Cartes fraise", 270], ["nuage", "Cartes nuage rose", 270]].map(([v, n, price, need]) => ({ id: "d-" + v, type: "carte", n, price, v, need })),
    ...[["bonbon", "Flamme bonbon", 200]].map(([v, n, price, need]) => ({ id: "l-" + v, type: "flamme", n, price, v, need })),
    ...[["princesse", "Princesse des révisions", 200], ["kawaii", "Kawaii mais efficace", 170], ["licorne", "Licorne du bac", 270], ["reine", "Reine du planning", 230], ["paillettes", "Paillettes et flashcards", 200]].map(([k, n, price, need]) => ({ id: "t-k" + k, type: "titre", n, price, need })),
    ...[["pastel", "Cartes pastel", 200], ["kraft", "Cartes kraft", 230], ["foret", "Cartes forêt", 270], ["bois", "Cartes bois", 270], ["ocean", "Cartes océan", 300], ["glace", "Cartes de glace", 330, 5], ["lave", "Cartes de lave", 400, 6], ["minuit", "Cartes minuit", 430, 7]]
      .map(([v, n, price, need]) => ({ id: "d-" + v, type: "carte", n, price, v, need })),
    ...[["violette", "Flamme violette", 200], ["menthe", "Flamme menthe", 200], ["glace", "Flamme de glace", 270], ["lave", "Flamme de lave", 330, 5], ["neon", "Flamme néon", 400, 6], ["galaxie", "Flamme galaxie", 600, 9]]
      .map(([v, n, price, need]) => ({ id: "l-" + v, type: "flamme", n, price, v, need })),
    ...[["genie", "Petit génie", 100], ["fiche", "Fiche après fiche", 100], ["zen", "Zéro stress", 130], ["cafe", "Café et flashcards", 130], ["chill", "Chill mais efficace", 170], ["parcoeur", "Pro du par cœur", 170],
      ["elephant", "Mémoire d'éléphant", 200], ["nuit", "Couche-tard studieux", 230], ["matin", "Lève-tôt motivé", 230], ["qcm", "As du QCM", 270], ["stop", "Inarrêtable", 200, 4], ["xxl", "Cerveau XXL", 270, 5],
      ["boss", "Boss final", 330, 6], ["mention", "Mention très bien", 400, 7], ["sansfaute", "Sans faute", 400, 7], ["guerre", "Machine de guerre", 500, 8], ["orchestre", "Chef d'orchestre", 470, 8], ["profprof", "Prof de mes profs", 530, 9],
      ["encyclo", "Encyclopédie vivante", 600, 10], ["bac", "Bac en poche", 670, 10], ["phenix", "Phénix", 800, 12], ["prodige", "Prodige", 1000, 14], ["absolu", "Génie absolu", 1330, 18], ["major", "Major de promo", 1670, 20]]
      .map(([k, n, price, need]) => ({ id: "t-" + k, type: "titre", n, price, need })),
    // Articles personnalisés : on écrit ou on choisit soi-même (rayon « Perso »).
    { id: "t-perso", type: "titre", n: "Titre personnalisé", price: 800, need: 5, perso: "titre" }, { id: "c-perso", type: "couleur", n: "Couleur sur mesure", price: 1000, need: 6, perso: "couleur" },
    { id: "p-phrase", type: "phrase", n: "Ta phrase d'accueil", price: 530, need: 4, perso: "phrase" },
  ];
  // Tous les prix de la boutique augmentés d'un tiers (15 nov.), arrondis à 10 pièces. Ce qui est déjà acheté reste acquis.
  SHOP.forEach(x => { if (x.price > 0) x.price = Math.round(x.price * 4 / 3 / 10) * 10; });
  // Exclusivités de niveau : impossibles à acheter, offertes en atteignant le niveau (objectifs à long terme).
  const LEVEL_ITEMS = [
    { id: "t-affute", type: "titre", n: "Cerveau affûté", lv: 5 }, { id: "c-saphirroyal", type: "couleur", n: "Saphir royal", v: "#2337b8", lv: 8 },
    { id: "m-couronneor", type: "mascotte", n: "Mergo couronne d'or", v: "couronneor", lv: 10 }, { id: "d-or", type: "carte", n: "Cartes en or", v: "or", lv: 12 },
    { id: "l-cosmique", type: "flamme", n: "Flamme cosmique", v: "cosmique", lv: 15 }, { id: "f-filantes", type: "fond", n: "Étoiles filantes", v: "filantes", lv: 20 },
    { id: "t-immortel", type: "titre", n: "Immortel des révisions", lv: 25 }, { id: "m-dragon", type: "mascotte", n: "Mergo dragon", v: "dragon", lv: 30 },
    { id: "d-diamant", type: "carte", n: "Cartes diamant", v: "diamant", lv: 40 }, { id: "t-legendevivante", type: "titre", n: "Légende vivante", lv: 50 },
  ];
  // Cadeaux en vrai (comptes activés dans /admin) : du petit plaisir au gros cadeau, 1 pièce ≈ 1 bonne réponse.
  // À échanger avec Ramzi : le bon affiché sert de capture d'écran à lui envoyer, et la demande apparaît dans /admin.
  const GIFT_GIVER = "Ramzi";
  const GIFTS = [
    { id: "bisou", n: "Un gros bisou", d: "Le plus doux des cadeaux. À réclamer quand tu veux.", price: 200 },
    { id: "milkyway", n: "Un Milky Way", d: "Une petite pause sucrée bien méritée.", price: 350 },
    { id: "kinder", n: "Des Kinder", d: "Un paquet de Kinder rien que pour toi.", price: 350 },
    { id: "reeses", n: "Des Reese's", d: "Un paquet de Reese's, puisque je sais que t'aimes ça.", price: 350 },
    { id: "icedtea", n: "Un Ice Tea", d: "Pour une pause rafraîchissante.", price: 350 },
    { id: "cocazero", n: "Un Coca Zéro", d: "Bien frais.", price: 350 },
    { id: "redbull", n: "Une Red Bull pêche", d: "(T'inquiète, ça fait du bien.)", price: 400 },
    { id: "bretznature", n: "Des chips Bretz crêpe nature", d: "Le paquet de chips Bretz saveur crêpe nature.", price: 500 },
    { id: "bretzpesto", n: "Des chips Bretz pesto mozzarella", d: "Le paquet de chips Bretz pesto mozzarella.", price: 500 },
    { id: "crepes", n: "Des crêpes maison à l'El Mordjene", d: "Faites maison par Ramzi (ou Siryne), avec de l'El Mordjene.", price: 550 },
    { id: "gout", n: "Ramzi goûte un truc qu'il n'aime pas", d: "Tu choisis le truc, je goûte. (S'il te plaît, pas un truc que je déteste.)", price: 650 },
    { id: "massage", n: "Un massage", d: "Avec les finitions en option.", price: 650 },
    { id: "tacoscoq", n: "Un tacos aux coquillettes", d: "Puisque je sais que t'adores ça.", price: 800 },
    { id: "kazdal", n: "Un repas à la Kazdalerie", d: "(Je vais te le chercher, car tu ne peux pas aller à la Guillotière.)", price: 1000 },
    { id: "tasty", n: "Un Tasty Crousty", d: "Sucré, bien sûr, car tu n'aimes pas le piquant.", price: 1000 },
    { id: "pizza", n: "Une pizza lyonnaise à la Tasty Pizza", d: "Une bonne pizza de chez Tasty Pizza.", price: 1000 },
    { id: "blackwhite", n: "Un Black and White", d: "Un repas au Black and White, offert.", price: 1350 },
    { id: "cinema", n: "Une place de cinéma", d: "Le film de ton choix, sur grand écran. (Et on pourra bien se câliner.)", price: 1350 },
    { id: "surprise", n: "La surprise", d: "Le plus gros palier. On ne dit rien : c'est une surprise.", price: 3350 },
    { id: "balade", n: "Une balade en voiture", d: "(Quand j'aurai le permis.) Je t'emmène où tu veux.", price: 9999999 },
  ];
  // Prix des cadeaux en vrai augmentés d'un tiers (15 nov.), arrondis à 10 pièces.
  GIFTS.forEach(x => { if (x.price > 0) x.price = Math.round(x.price * 4 / 3 / 10) * 10; });
  const GIFT_SHELVES = [["Petits plaisirs", 0, 649], ["Cadeaux", 650, 1349], ["Gros cadeaux", 1350, Infinity]];
  // Bon à envoyer en capture d'écran : nom du cadeau, prénom, date, numéro du bon.
  function voucherHtml(c, g) {
    const who = String((state.profile && state.profile.display_name) || "").trim();
    return `<div class="voucher-card"><span class="vtop">Merge<b>.</b> · Bon cadeau</span><span class="mico big">${I.gift}</span><b class="vname">${esc(g.n)}</b>
      <span class="vfor">${who ? "Pour " + esc(who) + " · " : ""}${esc(fmtDate(String(c.created_at || "").slice(0, 10) || localDay()))}</span><span class="vcode">N° ${esc(String(c.id || "").slice(0, 8).toUpperCase())}</span>
      <span class="vstate${c.given_at ? " ok" : ""}">${c.given_at ? "Offert" : "Gagné avec " + c.price + " pièces"}</span></div>
      ${c.given_at ? "" : `<p class="vsend">Fais une capture de ce bon et envoie-la à ${GIFT_GIVER} pour qu'il te le fasse.</p>`}`;
  }
  const CHEST_PRICE = 170;
  SHOP.forEach(x => REWARDS.push(x)); LEVEL_ITEMS.forEach(x => REWARDS.push(x));
  REWARDS.push({ id: "d-classique", type: "carte", n: "Cartes classiques", pts: 0, v: "" }, { id: "l-classique", type: "flamme", n: "Flamme classique", pts: 0, v: "" });
  const RTYPES = [["titre", "Titres"], ["couleur", "Couleurs"], ["fond", "Fonds animés"], ["mascotte", "Mascotte"], ["carte", "Style des flashcards"], ["flamme", "Flamme de série"], ["son", "Sons"], ["confettis", "Animations de réussite"]];
  const CHEST_EVERY = 3000;
  const rwState = () => { const d = jget("merge.rewards", null) || {}; return { equip: d.equip || {}, chest: d.chest || [], opened: d.opened || 0, buys: d.buys || [], lvl: d.lvl == null ? null : d.lvl, freeChests: d.freeChests || 0, custom: d.custom || {}, xp0: +d.xp0 || 0, season: d.season || 0 }; };
  // Remise à zéro pour tout le monde (saison 2, 14 nov. 2026, demandée par Ramzi) : niveau, pièces, achats, couleurs, titres et coffres repartent de zéro.
  // Les cartes et leur progression ne changent pas ; seuls les points de jeu repartent de zéro (xp0). Les bons cadeaux déjà demandés restent dans « Mes bons ».
  const SEASON = 2;
  function seasonReset() {
    // Seulement après avoir lu la sauvegarde du compte (sinon un appareil sans réseau effacerait les progrès faits ailleurs).
    if (!state.kvOk && !kvOff) return false;
    const d = jget("merge.rewards", null) || {}; if ((+d.season || 0) >= SEASON || !state.cards) return false;
    jset("merge.rewards", { season: SEASON, xp0: rawXp(), equip: {}, chest: [], opened: 0, buys: [], lvl: 1, freeChests: 0, custom: {} });
    jset("merge.level", 1); applyRewards(); walletSync(); return true;
  }
  // Pièces (saison 2) : 1 pièce pour 25 points (≈ 1 pour 2 à 3 bonnes réponses, 4 par chapitre maîtrisé), plus 10 × niveau à chaque niveau passé ;
  // moins ce qui a été dépensé. Exemple : ~100 bonnes réponses par jour ≈ 40 pièces par jour, un bisou en une semaine, le cinéma en ~2 mois.
  const COIN_PTS = 25;
  const levelBonus = L => { let t = 0; for (let l = 2; l <= L; l++) t += 10 * l; return t; };
  // Pièces : gagnées (points, niveaux, paris gagnés) moins dépensées (boutique, mises des paris). « locked » = mises en attente d'une note.
  function coinsInfo() { const x = xpInfo(), st = rwState(), bc = betCoins(), earned = Math.floor(x.xp / COIN_PTS) + levelBonus(x.level) + bc.back, spent = st.buys.reduce((a, b) => a + (+b.price || 0), 0) + bc.staked; return { earned, spent, balance: Math.max(0, earned - spent), locked: bc.locked }; }
  const rwSave = (st) => { jset("merge.rewards", st); walletSync(); };
  const rwOwned = (r, xp, st) => r.lv ? levelOfXp(xp) >= r.lv : r.price ? st.buys.some(b => b.id === r.id) || st.chest.includes(r.id) : r.chest ? st.chest.includes(r.id) : xp >= r.pts;
  // Valeurs des articles personnalisés (titre écrit, couleur choisie).
  const rwName = r => r && r.perso === "titre" ? (rwState().custom.titre || "") : r ? r.n : "";
  const rwColor = r => r && r.perso === "couleur" ? (/^#[0-9a-f]{6}$/i.test(rwState().custom.couleur || "") ? rwState().custom.couleur : "") : r ? r.v : "";
  // Résumé envoyé dans user_kv (merge.wallet) : niveau, pièces et articles, visibles dans /admin.
  function walletSync() {
    try {
      if (!state.user) return; const x = xpInfo(), c = coinsInfo(), st = rwState();
      const items = REWARDS.filter(r => (r.price || r.lv || r.chest) && rwOwned(r, x.xp, st)).map(r => r.perso === "titre" && st.custom.titre ? "Titre : " + st.custom.titre : r.n);
      const eq = Object.values(st.equip).map(id => REWARDS.find(r => r.id === id)).filter(Boolean).map(r => r.n);
      const w = JSON.stringify({ level: x.level, rank: x.rank, xp: x.xp, coins: c.balance, earned: c.earned, spent: c.spent, items, equip: eq, chests: st.freeChests || 0 });
      if (safeGet("merge.wallet") !== w) safeSet("merge.wallet", w);
    } catch (e) { /* rien */ }
  }
  const rwEquipped = (type) => { const st = rwState(), id = st.equip[type], r = REWARDS.find(x => x.id === id && x.type === type); return r && rwOwned(r, xpInfo().xp, st) ? r : null; };
  const MASCOT_WEAR = {
    casque: '<path d="M11 34a21 21 0 0142 0" stroke="#2b2d42" stroke-width="4" fill="none"/><rect x="6" y="30" width="9" height="14" rx="3.5" fill="#ef476f"/><rect x="49" y="30" width="9" height="14" rx="3.5" fill="#ef476f"/>',
    bonnet: '<path d="M15 23q15-24 35-7l-2 8H17z" fill="#e03b3b"/><rect x="13" y="21" width="38" height="6" rx="3" fill="#fff"/><circle cx="51" cy="14" r="4.2" fill="#fff"/>',
    casquette: '<path d="M16 23a16 13 0 0132 0z" fill="#3b82f6"/><path d="M45 21h14a3 3 0 01-3 4H45z" fill="#1d4ed8"/><circle cx="32" cy="11" r="1.8" fill="#1d4ed8"/>',
    sorcier: '<path d="M18 23L34 1 46 23z" fill="#4b2a8a"/><rect x="11" y="20" width="42" height="5" rx="2.5" fill="#4b2a8a"/><path d="M28 13l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.3 1.3.4-2.6-1.9-1.8 2.6-.4z" fill="#f5c542"/>',
    noeud: '<path d="M23 53l9 4.5-9 4.5zM41 53l-9 4.5 9 4.5z" fill="#e0529c"/><circle cx="32" cy="57.5" r="2.4" fill="#b02a73"/>',
    soleil: '<g fill="#1a1d28"><rect x="14" y="28.5" width="17" height="11" rx="4.5"/><rect x="33" y="28.5" width="17" height="11" rx="4.5"/><rect x="29" y="31" width="6" height="2.4" rx="1"/></g><path d="M17 31l4 0" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>',
    aureole: '<ellipse cx="32" cy="9" rx="14" ry="3.6" fill="none" stroke="#f5c542" stroke-width="2.6"/>',
    chapeau: '<rect x="22" y="3" width="20" height="17" rx="2" fill="#1a1d28"/><rect x="15" y="18" width="34" height="4.5" rx="2.2" fill="#1a1d28"/><rect x="22" y="14" width="20" height="3.2" fill="#e03b3b"/>',
    moustache: '<path d="M22 44q5-4 10 0q5-4 10 0q-5 4-10 1q-5 3-10-1z" fill="#3a2414"/>',
    chat: '<path d="M13 24l3-16 11 9zM51 24l-3-16-11 9z" fill="var(--accent)"/><path d="M16 21l1.5-8 5.5 4.5zM48 21l-1.5-8-5.5 4.5z" fill="#f9a8d4"/>',
    lapin: '<g fill="#fff"><ellipse cx="22" cy="8" rx="5" ry="13"/><ellipse cx="42" cy="8" rx="5" ry="13"/></g><g fill="#f9a8d4"><ellipse cx="22" cy="8" rx="2.4" ry="9"/><ellipse cx="42" cy="8" rx="2.4" ry="9"/></g>',
    toque: '<path d="M19 22c-6-1-7-11 1-12 2-6 10-7 13-2 4-5 12-2 12 4 7 1 6 11 0 10z" fill="#fff" stroke="#d6d6e0" stroke-width="1.2"/><rect x="19" y="18" width="26" height="6" rx="2" fill="#fff" stroke="#d6d6e0" stroke-width="1.2"/>',
    echarpe: '<path d="M14 50q18 9 36 0l1 5q-19 9-38 0z" fill="#e03b3b"/><path d="M40 53l4 10h-6l-2-9z" fill="#c42f2f"/>',
    etoile: '<path d="M32 2l3.2 6.6 7.2 1-5.2 5 1.3 7.2L32 18.4l-6.5 3.4 1.3-7.2-5.2-5 7.2-1z" fill="#f5c542" stroke="#b8860b" stroke-width="1"/>',
    diplome: '<path d="M10 16l22-9 22 9-22 9z" fill="#1a1d28"/><path d="M20 20v6q12 6 24 0v-6l-12 5z" fill="#2b2d42"/><path d="M52 16v11" stroke="#f5c542" stroke-width="1.6"/><circle cx="52" cy="28" r="2" fill="#f5c542"/>',
    masque: '<path d="M12 30q20-7 40 0l-2 10q-8 2-12-3h-12q-4 5-12 3z" fill="#e03b3b"/><circle cx="24" cy="35" r="4.2" fill="#fff"/><circle cx="40" cy="35" r="4.2" fill="#fff"/><circle cx="25" cy="35" r="2.2" fill="#1a1d28"/><circle cx="41" cy="35" r="2.2" fill="#1a1d28"/>',
    viking: '<path d="M16 24a16 14 0 0132 0z" fill="#8a8f98"/><path d="M16 22q-9-4-9-16 6 6 12 10zM48 22q9-4 9-16-6 6-12 10z" fill="#f2ecd9" stroke="#b8a77a" stroke-width="1"/><rect x="15" y="21" width="34" height="4" rx="2" fill="#6b5a3a"/>',
    pirate: '<path d="M14 24q18-14 36 0z" fill="#1a1d28"/><circle cx="32" cy="17" r="2.6" fill="#fff"/><path d="M15 27l34 3" stroke="#1a1d28" stroke-width="1.6"/><circle cx="40" cy="34" r="7" fill="#1a1d28"/>',
    couronneor: '<path d="M17 22l3-14 7 8 5-11 5 11 7-8 3 14z" fill="#f5c542" stroke="#b8860b" stroke-width="1.2"/><circle cx="32" cy="16" r="2.4" fill="#e03b3b"/><circle cx="23" cy="18" r="1.8" fill="#3b82f6"/><circle cx="41" cy="18" r="1.8" fill="#22c55e"/>',
    dragon: '<path d="M14 26l2-14 6 8M50 26l-2-14-6 8" fill="#f59e0b"/><path d="M8 40q-8-6-4-16 4 8 10 8zM56 40q8-6 4-16-4 8-10 8z" fill="#16a34a"/><path d="M26 46l2 3 2-3M34 46l2 3 2-3" fill="#fff"/>',
    princesse: '<path d="M18 23l3-11 6 6 5-9 5 9 6-6 3 11z" fill="#f9c4dd" stroke="#e879b4" stroke-width="1.2"/><circle cx="32" cy="17" r="2.6" fill="#ec4899"/><circle cx="23" cy="19" r="1.5" fill="#fff"/><circle cx="41" cy="19" r="1.5" fill="#fff"/><ellipse cx="18" cy="42" rx="4" ry="2.4" fill="#f9a8d4" opacity=".85"/><ellipse cx="46" cy="42" rx="4" ry="2.4" fill="#f9a8d4" opacity=".85"/>',
    noeudrose: '<path d="M32 18l-13-8v16zM32 18l13-8v16z" fill="#f472b6"/><circle cx="32" cy="18" r="3.4" fill="#db2777"/>',
    kawaii: '<ellipse cx="17" cy="42" rx="4.5" ry="2.6" fill="#f9a8d4"/><ellipse cx="47" cy="42" rx="4.5" ry="2.6" fill="#f9a8d4"/><circle cx="23" cy="33" r="1.4" fill="#fff"/><circle cx="39" cy="33" r="1.4" fill="#fff"/><path d="M53 14l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2zM10 12l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9z" fill="#fde68a"/>',
    couronnefleurs: '<path d="M15 23q17-9 34 0" stroke="#4ade80" stroke-width="2.4" fill="none"/><g fill="#f9a8d4"><circle cx="18" cy="21" r="3.2"/><circle cx="32" cy="16" r="3.4"/><circle cx="46" cy="21" r="3.2"/></g><g fill="#c4b5fd"><circle cx="25" cy="18" r="2.8"/><circle cx="39" cy="18" r="2.8"/></g><g fill="#fde68a"><circle cx="18" cy="21" r="1.2"/><circle cx="32" cy="16" r="1.2"/><circle cx="46" cy="21" r="1.2"/></g>',
    fraise: '<path d="M17 24q15-20 30 0z" fill="#ef4444"/><path d="M27 8q5-3 10 0-5 5-10 0z" fill="#22c55e"/><g fill="#fde68a"><circle cx="24" cy="18" r="1"/><circle cx="31" cy="15" r="1"/><circle cx="38" cy="19" r="1"/><circle cx="29" cy="21" r="1"/><circle cx="36" cy="13" r="1"/></g>',
    licorne: '<path d="M32 2l-4 18h8z" fill="#fde68a" stroke="#eab308" stroke-width="1"/><path d="M29 9l6 2M28.5 13l7 2M28 17l8 2" stroke="#eab308" stroke-width="1"/><path d="M14 26q-2-10 8-12-3 6 0 10zM50 26q2-10-8-12 3 6 0 10z" fill="#c4b5fd"/><path d="M12 30q-3-8 4-12-1 6 2 9z" fill="#f9a8d4"/>',
    chaton: '<path d="M13 24l3-16 11 9zM51 24l-3-16-11 9z" fill="#f9a8d4"/><path d="M16 21l1.5-8 5.5 4.5zM48 21l-1.5-8-5.5 4.5z" fill="#fff"/><path d="M8 40h10M8 44h10M46 40h10M46 44h10" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/><ellipse cx="17" cy="42" rx="3.4" ry="2" fill="#f9a8d4"/><ellipse cx="47" cy="42" rx="3.4" ry="2" fill="#f9a8d4"/>',
    magique: '<path d="M50 52l10-20" stroke="#c4b5fd" stroke-width="2.6" stroke-linecap="round"/><path d="M60 22l2 4.5 4.8.7-3.5 3.4.8 4.8-4.1-2.2-4.3 2.2.8-4.8-3.5-3.4 4.8-.7z" fill="#fde68a" stroke="#eab308" stroke-width=".8" transform="translate(-3 3) scale(.92)"/><circle cx="12" cy="14" r="1.4" fill="#f9a8d4"/><circle cx="20" cy="8" r="1" fill="#c4b5fd"/>',
    fleur: '<g transform="translate(47 21)"><circle r="3.4" cy="-4.2" fill="#f9a8d4"/><circle r="3.4" cx="4.2" fill="#f9a8d4"/><circle r="3.4" cy="4.2" fill="#f9a8d4"/><circle r="3.4" cx="-4.2" fill="#f9a8d4"/><circle r="2.6" fill="#f5c542"/></g>',
  };
  const MASCOT = (v) => !v ? "" : `<svg class="mascot" viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="38" rx="22" ry="20" fill="var(--accent)"/><circle cx="24" cy="34" r="6" fill="#fff"/><circle cx="40" cy="34" r="6" fill="#fff"/><circle cx="25" cy="35" r="2.6" fill="#1a1d28"/><circle cx="41" cy="35" r="2.6" fill="#1a1d28"/><path d="M27 46q5 4 10 0" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M14 26l5-12 7 9M50 26l-5-12-7 9" fill="var(--accent)"/>${v === "lunettes" ? '<g fill="none" stroke="#1a1d28" stroke-width="2.2"><circle cx="24" cy="34" r="8"/><circle cx="40" cy="34" r="8"/><path d="M32 34h0"/></g>' : ""}${v === "couronne" ? '<path d="M20 14l4 8 8-10 8 10 4-8 2 14H18z" fill="#f5c542" stroke="#b8860b" stroke-width="1.2"/>' : ""}${MASCOT_WEAR[v] || ""}</svg>`;
  function applyRewards() {
    const r = document.documentElement, col = rwEquipped("couleur"), bg = rwEquipped("fond"), cv = rwColor(col);
    if (cv) { r.style.setProperty("--accent", cv); r.style.setProperty("--btn-bg", cv); r.style.setProperty("--today-bg", cv); } else { ["--accent", "--btn-bg", "--today-bg"].forEach(k => r.style.removeProperty(k)); }
    document.body.dataset.bg = bg && bg.v ? bg.v : "";
    const card = rwEquipped("carte"), fl = rwEquipped("flamme");
    document.body.dataset.card = card && card.v ? card.v : ""; document.body.dataset.flame = fl && fl.v ? fl.v : "";
  }
  function screenRewards() {
    drawTabs("progres"); const xp = xpInfo().xp, st = rwState(), chests = Math.floor(xp / CHEST_EVERY) - st.opened;
    const next = REWARDS.filter(r => !r.chest && r.pts > xp).sort((a, b) => a.pts - b.pts)[0];
    app.innerHTML = `<div class="row"><a class="iconbtn" href="#progres" aria-label="Retour">${I.back}</a><h1 class="grow">Récompenses</h1><a class="btn sm" href="#boutique">${I.shop}Boutique</a></div>
      <a class="card pad coinbar" href="#boutique"><span class="mico">${I.coin}</span><span class="grow"><b>${coinsInfo().balance} pièces</b><span class="small muted">À dépenser dans la boutique : thèmes, fonds, tenues de Mergo, styles de cartes…</span></span>${I.next}</a>
      <div class="card pad stack rwtop"><div class="row">${MASCOT((rwEquipped("mascotte") || {}).v || "mergo")}<div class="grow"><b class="big">${xp} points</b><p class="small muted">${next ? "Prochaine récompense : " + esc(next.n) + " à " + next.pts + " points" : "Tu as tout débloqué avec les points !"}</p></div></div>
        <div class="row chestrow"><span class="mico">${I.star}</span><p class="grow small">${chests > 0 ? plural(chests, "coffre surprise à ouvrir", "coffres surprise à ouvrir") : "Un coffre surprise tous les " + CHEST_EVERY + " points. Prochain à " + (Math.floor(xp / CHEST_EVERY) + 1) * CHEST_EVERY + "."}</p>${chests > 0 ? '<button class="btn sm" id="chest">Ouvrir</button>' : ""}</div></div>
      <p class="small muted">Les points viennent de tes révisions : 10 par bonne réponse, 2 par erreur, 100 par chapitre maîtrisé à 100 %. Rien à dépenser : ce que tu débloques reste à toi, sur tous tes appareils.</p>
      ${RTYPES.map(([t, label]) => `<div class="stack"><h2>${label}</h2><div class="rwgrid">${REWARDS.filter(r => r.type === t && (!r.price || rwOwned(r, xp, st))).map(r => { const own = rwOwned(r, xp, st), on = (st.equip[t] || REWARDS.find(x => x.type === t).id) === r.id; return `<button class="rw${own ? "" : " locked"}" data-rw="${r.id}" aria-pressed="${on}" ${own ? "" : "disabled"}>${t === "couleur" ? `<span class="rwdot" style="--c:${esc(rwColor(r) || r.v || "#4b39c8")}"></span>` : t === "mascotte" && r.v ? MASCOT(r.v) : ""}<b>${esc(r.n)}</b><span class="small">${own ? (on ? "Équipé" : "Équiper") : r.chest ? "Dans un coffre" : r.lv ? "Niveau " + r.lv : r.pts + " points"}</span></button>`; }).join("")}</div></div>`).join("")}`;
    app.querySelectorAll("[data-rw]").forEach(b => b.onclick = () => { const r = REWARDS.find(x => x.id === b.dataset.rw), s2 = rwState(); s2.equip[r.type] = r.id; rwSave(s2); applyRewards(); if (r.type === "son") ping(true); if (r.type === "confettis") confetti(r.v || undefined); screenRewards(); });
    if ($("chest")) $("chest").onclick = () => {
      const s2 = rwState(), left = REWARDS.filter(r => r.chest && !s2.chest.includes(r.id)); s2.opened++;
      const got = left.length ? left[Math.floor(Math.random() * left.length)] : null; if (got) s2.chest.push(got.id); rwSave(s2); confetti("explosion");
      sheet(`<div class="badgewin">${MASCOT("couronne")}<h1>Coffre ouvert</h1><p>${got ? "Tu gagnes : <b>" + esc(got.n) + "</b>" : "Tu as déjà tout ce que contiennent les coffres. Bravo !"}</p><button class="btn" data-close>Super</button></div>`); screenRewards();
    };
  }
  // ---------- boutique ----------
  const STYPES = [["couleur", "Thèmes"], ["fond", "Fonds"], ["mascotte", "Mergo"], ["carte", "Cartes"], ["flamme", "Flamme"], ["titre", "Titres"], ["perso", "Perso"], ["confettis", "Animations"], ["coffre", "Coffres"]];
  let shopTab = "couleur";
  function shopPreview(r) {
    if (r.perso === "couleur") return `<span class="swatch" style="background:${esc(rwColor(r)) || "conic-gradient(#ef4444,#f59e0b,#22c55e,#3b82f6,#a855f7,#ef4444)"}"></span>`;
    if (r.perso === "titre") return `<span class="rwtitle">${esc(rwName(r) || "Ton titre")}</span>`;
    if (r.perso === "phrase") return `<span class="mico">${I.spark}</span>`;
    if (r.type === "couleur") return `<span class="swatch" style="background:${esc(r.v)}"></span>`;
    if (r.type === "fond") return `<span class="bgprev bg-${esc(r.v)}"></span>`;
    if (r.type === "mascotte") return MASCOT(r.v || "mergo");
    if (r.type === "carte") return `<span class="cardprev" data-cardprev="${esc(r.v)}"><span class="face"><span class="txt">Aa</span></span></span>`;
    if (r.type === "flamme") return `<span class="streak flameprev" data-flameprev="${esc(r.v)}">12 jours</span>`;
    if (r.type === "titre") return `<span class="rwtitle">${esc(r.n)}</span>`;
    return `<span class="mico">${I.star}</span>`;
  }
  async function screenShop() {
    drawTabs("progres");
    const here = location.hash;
    let access = false, claims = [];
    if (!state.offline) {
      try { const a = await sb.from("gift_access").select("user_id").maybeSingle(); access = !a.error && !!a.data; } catch (e) { access = false; }
      if (access) { try { const c = await sb.from("gift_claims").select("*").order("created_at", { ascending: false }); claims = c.data || []; } catch (e) { claims = []; } }
    }
    if (location.hash !== here) return;
    function draw() {
      const st = rwState(), xp = xpInfo().xp, co = coinsInfo(), bal = co.balance, lv = xpInfo().level;
      const nextGift = GIFTS.find(g => g.price > bal);
      const order = (a, b) => (a.lv || 0) - (b.lv || 0) || (a.need || 0) - (b.need || 0) || (a.price || 0) - (b.price || 0);
      const items = shopTab === "coffre" ? [] : shopTab === "perso" ? SHOP.filter(r => r.perso) : SHOP.filter(r => r.type === shopTab && !r.perso).sort(order).concat(LEVEL_ITEMS.filter(r => r.type === shopTab));
      const card = r => { const own = rwOwned(r, xp, st), on = st.equip[r.type] === r.id, locked = !own && r.need && lv < r.need, can = !locked && bal >= r.price;
        const act = own ? (r.perso ? `<button class="btn sm" data-perso="${r.id}">${r.perso === "phrase" || on || r.type === "phrase" ? "Modifier" : "Modifier et équiper"}</button>` : `<button class="btn sm${on ? " ghost" : ""}" data-eq="${r.id}" ${on ? "disabled" : ""}>${on ? "Équipé" : "Équiper"}</button>`)
          : r.lv ? `<button class="btn sm ghost" disabled>${I.lock}Niveau ${r.lv}</button>` : locked ? `<button class="btn sm ghost" disabled>${I.lock}Niveau ${r.need}</button>` : `<button class="btn sm${can ? "" : " ghost"}" data-buy="${r.id}" ${can ? "" : "disabled"}>${I.coin}${r.price}</button>`;
        return `<div class="shopitem${own ? " own" : ""}${r.lv ? " excl" : ""}"><div class="sprev">${shopPreview(r)}</div><b>${esc(r.n)}</b>${r.lv && !own ? '<span class="small muted">Exclusif, offert au niveau ' + r.lv + "</span>" : locked ? `<span class="small muted">${r.price} pièces</span>` : ""}${act}</div>`; };
      app.innerHTML = `<div class="row"><a class="iconbtn" href="#recompenses" aria-label="Retour aux récompenses">${I.back}</a><h1 class="grow">Boutique</h1></div>
        <div class="card pad stack coinhero"><div class="row"><span class="mico big">${I.coin}</span><div class="grow"><b class="big">${bal} pièces</b><p class="small muted">Gagnées en révisant : 1 pièce tous les ${COIN_PTS} points (environ 1 pour 2 ou 3 bonnes réponses), et ${10 * (lv + 1)} en bonus au niveau ${lv + 1}.</p></div></div>
          ${access && nextGift ? `<div class="stack"><div class="row between small"><span>Prochain cadeau : <b>${esc(nextGift.n)}</b></span><span class="muted">${bal} / ${nextGift.price}</span></div><div class="bar"><i style="width:${Math.min(100, bal / nextGift.price * 100)}%"></i></div></div>` : ""}</div>
        ${access ? `<div class="stack"><h2>${I.gift}Cadeaux en vrai</h2>
          ${claims.length ? `<div class="card pad stack"><h3>Mes bons</h3>${claims.map(c => { const g = GIFTS.find(x => x.id === c.gift) || { n: c.gift }; return `<button class="row between voucher" data-bon="${esc(c.id)}"><span><b>${esc(g.n)}</b><span class="small muted"> · ${esc(fmtDate(String(c.created_at).slice(0, 10)))}</span></span><span class="pill${c.given_at ? "" : " warn"}">${c.given_at ? "Offert" : "À envoyer à " + GIFT_GIVER}</span></button>`; }).join("")}</div>` : ""}
          ${GIFT_SHELVES.map(([title, lo, hi], si) => `<h3>${title}</h3><div class="giftgrid">${GIFTS.filter(g => g.price >= lo && g.price <= hi).map(g => { const can = bal >= g.price; return `<div class="giftcard s${si + 1}${can ? " ready" : ""}"><b>${esc(g.n)}</b><span class="small">${esc(g.d)}</span><div class="bar"><i style="width:${Math.min(100, bal / g.price * 100)}%"></i></div><button class="btn sm" data-gift="${g.id}" ${can ? "" : "disabled"}>${can ? "Échanger " + g.price + " pièces" : "Encore " + (g.price - bal) + " pièces"}</button></div>`; }).join("")}</div>`).join("")}</div>` : ""}
        <div class="seg shoptabs" role="tablist" aria-label="Rayons de la boutique">${STYPES.map(t => `<button role="tab" data-st="${t[0]}" aria-selected="${shopTab === t[0]}">${t[1]}</button>`).join("")}</div>
        ${shopTab === "coffre" ? `<div class="card pad stack chestshop"><div class="row"><span class="mico big">${I.star}</span><div class="grow"><b>Coffre surprise</b><p class="small muted">Un article de la boutique au hasard, que tu n'as pas encore. Parfois une très bonne affaire.</p></div></div>
            <button class="btn" data-chest ${bal >= CHEST_PRICE || st.freeChests ? "" : "disabled"}>${st.freeChests ? "Ouvrir un coffre offert (" + st.freeChests + ")" : I.coin + CHEST_PRICE + " pièces"}</button><p class="note">Un coffre offert tous les 5 niveaux.</p></div>`
          : `${shopTab === "perso" ? '<p class="small muted">Écris ton propre titre, choisis ta couleur exacte ou ta phrase d\'accueil. Tu peux les changer quand tu veux après l\'achat.</p>' : ""}<div class="shopgrid">${items.map(card).join("")}</div>`}
        <p class="note">Ce que tu achètes reste à toi, sur tous tes appareils. Plus tu révises, plus tu gagnes de pièces.</p>`;
      app.querySelectorAll("[data-st]").forEach(b => b.onclick = () => { shopTab = b.dataset.st; draw(); });
      app.querySelectorAll("[data-eq]").forEach(b => b.onclick = () => { const r = REWARDS.find(x => x.id === b.dataset.eq), s2 = rwState(); s2.equip[r.type] = r.id; rwSave(s2); applyRewards(); if (r.type === "confettis") confetti(r.v); toast(r.n + " équipé."); draw(); });
      app.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => {
        const r = SHOP.find(x => x.id === b.dataset.buy), s2 = rwState(); if (!r || rwOwned(r, xpInfo().xp, s2)) return;
        if (coinsInfo().balance < r.price) return toast("Pas encore assez de pièces.");
        if (r.need && xpInfo().level < r.need) return toast("Disponible au niveau " + r.need + ".");
        s2.buys.push({ id: r.id, price: r.price, at: Date.now() }); if (!r.perso) s2.equip[r.type] = r.id; rwSave(s2); applyRewards(); ping(true); confetti(r.type === "confettis" ? r.v : "etoiles"); draw();
        if (r.perso) persoSheet(r); else toast(r.n + " acheté et équipé.");
      });
      // Articles personnalisés : on écrit son titre ou sa phrase, on choisit sa couleur.
      function persoSheet(r) {
        const c = rwState().custom, field = r.perso === "couleur" ? `<input id="pv" type="color" value="${esc(rwColor(r) || "#4b39c8")}" style="width:100%;min-height:56px" aria-label="Ta couleur">`
          : `<input id="pv" type="text" maxlength="${r.perso === "titre" ? 28 : 80}" value="${esc(c[r.perso] || "")}" placeholder="${r.perso === "titre" ? "Ex. Reine des révisions" : "Ex. Aujourd'hui je gère tout"}" aria-label="${esc(r.n)}">`;
        sheet(`<div class="row"><span class="mico big">${I.spark}</span><h1>${esc(r.n)}</h1></div><div class="field">${field}</div><p class="small muted">${r.perso === "phrase" ? "Elle s'affiche sur ton accueil, sous ton prénom." : r.perso === "titre" ? "Il s'affiche à côté de ton prénom sur l'accueil." : "Toute l'appli prend ta couleur."}</p><button class="btn" id="pok">Enregistrer</button><button class="btn ghost" data-close>Fermer</button>`, el => {
          el.querySelector("#pok").onclick = () => { const v = el.querySelector("#pv").value.trim().replace(/\s+/g, " "); if (r.perso === "couleur" && !/^#[0-9a-f]{6}$/i.test(v)) return; const s3 = rwState(); s3.custom[r.perso] = v; if (r.type !== "phrase") s3.equip[r.type] = r.id; rwSave(s3); applyRewards(); closeSheet(); toast("Enregistré."); draw(); };
        });
      }
      app.querySelectorAll("[data-perso]").forEach(b => b.onclick = () => persoSheet(SHOP.find(x => x.id === b.dataset.perso)));
      const chest = app.querySelector("[data-chest]");
      if (chest) chest.onclick = () => {
        const s2 = rwState(), free = s2.freeChests > 0; if (!free && coinsInfo().balance < CHEST_PRICE) return;
        const left = SHOP.filter(r => !r.perso && !rwOwned(r, xpInfo().xp, s2)); if (!left.length) return toast("Tu as déjà tout ce que contient la boutique !");
        const got = left[Math.floor(Math.random() * left.length)];
        if (free) s2.freeChests--; else s2.buys.push({ id: "coffre", price: CHEST_PRICE, at: Date.now() });
        s2.buys.push({ id: got.id, price: 0, at: Date.now(), chest: true }); rwSave(s2); confetti("explosion");
        sheet(`<div class="badgewin">${MASCOT("couronne")}<h1>Coffre ouvert</h1><div class="sprev big">${shopPreview(got)}</div><p>Tu gagnes : <b>${esc(got.n)}</b>${got.price > CHEST_PRICE ? " (vaut " + got.price + " pièces !)" : ""}</p><button class="btn" id="cheq">Équiper</button><button class="btn ghost" data-close>Plus tard</button></div>`, el => { el.querySelector("#cheq").onclick = () => { const s3 = rwState(); s3.equip[got.type] = got.id; rwSave(s3); applyRewards(); closeSheet(); draw(); }; });
        draw();
      };
      app.querySelectorAll("[data-bon]").forEach(b => b.onclick = () => { const c = claims.find(x => x.id === b.dataset.bon), g = c && (GIFTS.find(x => x.id === c.gift) || { n: c.gift }); if (c) sheet(`<div class="badgewin voucherwin">${voucherHtml(c, g)}<button class="btn" data-close>Fermer</button></div>`); });
      app.querySelectorAll("[data-gift]").forEach(b => b.onclick = () => {
        const g = GIFTS.find(x => x.id === b.dataset.gift); if (!g || coinsInfo().balance < g.price) return;
        sheet(`<div class="badgewin"><span class="mico big">${I.gift}</span><h1>${esc(g.n)}</h1><p>Échanger <b>${g.price} pièces</b> contre ce cadeau ? Tu reçois un bon à envoyer en capture d'écran à ${GIFT_GIVER}, et il le voit aussi de son côté.</p><button class="btn" id="gok">Oui, je le veux</button><button class="btn ghost" data-close>Pas maintenant</button></div>`, el => {
          el.querySelector("#gok").onclick = async () => {
            const r = await sb.from("gift_claims").insert({ gift: g.id, price: g.price }).select("*").single();
            if (r.error) return fail(r.error, "Demande non envoyée");
            const s2 = rwState(); s2.buys.push({ id: "cadeau-" + g.id, price: g.price, at: Date.now(), claim: r.data.id }); rwSave(s2);
            claims.unshift(r.data); confetti("feux");
            sheet(`<div class="badgewin voucherwin"><h1>Bravo, tu l'as mérité</h1>${voucherHtml(r.data, g)}<button class="btn" data-close>Fermer</button></div>`); draw();
          };
        });
      });
    }
    draw();
  }
  // Cadeaux de niveau : à chaque niveau passé, un article de la boutique offert (en plus du bonus de pièces), et un coffre tous les 5 niveaux.
  function levelGifts(lvl) {
    const st = rwState(); if (st.lvl == null) { st.lvl = lvl; rwSave(st); return null; }
    if (lvl <= st.lvl) return null;
    // Rééquilibré (nov. 2026) : des pièces à chaque niveau, un article offert seulement tous les 3 niveaux (une couleur au plus une fois sur deux),
    // un coffre tous les 5 niveaux et une exclusivité aux grands paliers. Ce qui a déjà été offert reste acquis.
    const out = { coins: 0, items: [], chests: 0, excl: [], from: st.lvl, to: lvl };
    for (let l = st.lvl + 1; l <= lvl; l++) {
      out.coins += 10 * l;
      if (l % 3 === 0) {
        const lastCol = st.buys.filter(b => b.level).slice(-1).some(b => /^c-/.test(b.id));
        const pool = SHOP.filter(r => !r.perso && !rwOwned(r, Infinity, st) && r.price <= 100 + 40 * l && (!r.need || r.need <= l) && !(lastCol && r.type === "couleur"));
        if (pool.length) { const got = pool[Math.floor(Math.random() * pool.length)]; st.buys.push({ id: got.id, price: 0, at: Date.now(), level: l }); out.items.push(got); }
      }
      if (l % 5 === 0) { st.freeChests++; out.chests++; }
      LEVEL_ITEMS.filter(r => r.lv === l).forEach(r => out.excl.push(r));
    }
    st.lvl = lvl; rwSave(st); return out;
  }
  // Fête un badge ou un niveau gagné depuis la dernière fois (jamais au tout premier passage).
  function celebrate() {
    const got = badges().filter(b => b[1]).map(b => b[0]), seen = jget("merge.badges", null), lvl = xpInfo().level, old = jget("merge.level", null);
    jset("merge.badges", got); jset("merge.level", lvl); walletSync(); if (!seen || old == null) { levelGifts(lvl); return; }
    const fresh = got.filter(b => !seen.includes(b));
    const gifts = levelGifts(lvl);
    if (gifts && (gifts.items.length || gifts.coins)) {
      const unlocked = REWARDS.filter(r => !r.price && !r.chest && r.pts > 0 && r.pts <= xpInfo().xp && r.pts > lvlStart(gifts.from));
      sheet(`<div class="badgewin lvlwin">${MASCOT((rwEquipped("mascotte") || {}).v || "mergo")}<h1>Niveau ${lvl} !</h1><p class="muted">Rang ${esc(rankOf(lvl))}. Voilà ce que tu gagnes :</p>
        <div class="lvlgifts"><div class="lvlgift"><span class="mico">${I.coin}</span><b>+${gifts.coins} pièces</b></div>
        ${gifts.items.map(r => `<div class="lvlgift"><span class="sprev">${shopPreview(r)}</span><b>${esc(r.n)}</b><span class="small muted">offert</span></div>`).join("")}
        ${gifts.excl.map(r => `<div class="lvlgift excl"><span class="sprev">${shopPreview(r)}</span><b>${esc(r.n)}</b><span class="small muted">exclusivité de niveau</span></div>`).join("")}
        ${unlocked.map(r => `<div class="lvlgift"><span class="mico">${I.star}</span><b>${esc(r.n)}</b><span class="small muted">débloqué</span></div>`).join("")}
        ${gifts.chests ? `<div class="lvlgift"><span class="mico">${I.gift}</span><b>${plural(gifts.chests, "coffre surprise", "coffres surprise")}</b><span class="small muted">à ouvrir dans la boutique</span></div>` : ""}</div>
        ${fresh.length ? `<div class="chips">${fresh.map(b => `<span class="badge on">${esc(b)}</span>`).join("")}</div>` : ""}
        <a class="btn" href="#boutique" data-close>Voir la boutique</a><button class="btn ghost" data-close>Plus tard</button></div>`); confetti("feux"); return;
    }
    if (!fresh.length && lvl <= old) return;
    sheet(`<div class="badgewin"><span class="mico big">${I.star}</span><h1>${fresh.length ? (fresh.length > 1 ? "Nouveaux badges" : "Nouveau badge") : "Niveau " + lvl}</h1>${fresh.length ? `<div class="chips">${fresh.map(b => `<span class="badge on">${esc(b)}</span>`).join("")}</div>` : ""}<p class="muted">${lvl > old ? "Tu passes au niveau " + lvl + ". " : "Tu es niveau " + lvl + ". "}Continue comme ça.</p><button class="btn" data-close>Super</button></div>`); confetti();
  }
  // Chapitres au programme du contrôle (option « Choisir les chapitres ») : null = tous les chapitres de la matière.
  function examChs(s) {
    const c = nextCtrl(s); if (!c || !Array.isArray(c.ch)) return null;
    const ids = c.ch.filter(x => state.chapters.some(c => c.id === x && c.subject_id === s.id)); return ids.length ? ids : null;
  }
  // Plan de révision : les chapitres de la matière (ou ceux choisis pour le contrôle) répartis sur les jours qui restent, les moins maîtrisés d'abord.
  function planFor(s) {
    const j = daysUntil(s.exam_date); if (j == null || j < 0 || isFree(s)) return [];
    const only = examChs(s);
    let chs = state.chapters.filter(c => c.subject_id === s.id && cardsOf(c.id).length && (!only || only.includes(c.id))).map(c => ({ c, m: mastery(cardsOf(c.id)) })).sort((a, b) => a.m - b.m);
    if (!chs.length) return [];
    const todo = chs.filter(x => x.m < 100); if (todo.length) chs = todo;
    const n = Math.max(1, Math.min(j, 30)), days = Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return { day: localDay(d), items: [], last: false }; });
    chs.forEach((x, k) => days[Math.min(n - 1, Math.floor(k * n / chs.length))].items.push(x));
    if (j >= 1 && j <= 30) days[n - 1].last = true;
    return days;
  }
  function planTodayHtml() {
    const rows = [];
    state.subjects.forEach(s => { const pl = planFor(s); if (!pl.length) return; const j = daysUntil(s.exam_date), t = pl[0];
      t.items.forEach(x => rows.push(`<a class="exam" href="#cartes-${x.c.id}" style="--c:${esc(s.color)}"><span class="jx">${j === 0 ? "Auj." : "J-" + j}</span><span class="grow"><b>${esc(x.c.name)}</b><span class="small muted">${esc(s.name)} · maîtrise ${x.m} %</span></span></a>`));
      if (t.last || j === 0) rows.push(`<a class="exam" href="#revision-${s.id}" style="--c:${esc(s.color)}"><span class="jx">${j === 0 ? "Auj." : "J-" + j}</span><span class="grow"><b>Révision générale</b><span class="small muted">${esc(s.name)} · toutes les cartes à revoir</span></span></a>`); });
    return rows.length ? `<div class="card pad stack plan"><div class="row between"><h2>Ton plan du jour</h2><a class="linkbtn" href="#calendrier">Voir le plan</a></div>${rows.slice(0, 5).join("")}</div>` : "";
  }
  function resumeHtml() {
    const r = jget("merge.resume", null); if (!r || !r.hash || !r.left || Date.now() - r.at > 7 * 86400000) return "";
    const ch = state.chapters.find(c => c.id === r.ch); if (r.ch && (!ch || !cardsOf(ch.id).some(c => !isMastered(c)))) return "";
    return `<div class="banner resume"><div><h2>Reprendre : ${esc(ch ? ch.name : r.name || "ta session")}</h2><p class="small">Tu t'es arrêté à la carte ${r.total - r.left + 1} sur ${r.total}. Il t'en reste ${r.left}.</p></div><a class="btn sm" href="${esc(r.hash)}">Reprendre</a></div>`;
  }
  // Installation sur l'écran d'accueil.
  let deferredInstall = null; window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredInstall = e; });
  const isStandalone = () => (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  function installSheet() {
    sheet(`<div class="row"><span class="mico big">${I.home}</span><h1>Installer ${esc(C.NOM_APPLI)}.</h1></div><p class="muted">Merge s'ouvre alors comme une vraie appli, en plein écran, et tes cartes restent révisables sans réseau.</p>
      ${deferredInstall ? '<button class="btn" id="insgo">Installer maintenant</button>' : ""}
      <div class="stack"><b>Sur iPhone (Safari)</b><ul class="plain"><li>Touche le bouton Partager, en bas de l'écran.</li><li>Choisis « Sur l'écran d'accueil ».</li><li>Touche « Ajouter ».</li></ul></div>
      <div class="stack"><b>Sur Android (Chrome)</b><ul class="plain"><li>Touche les trois points, en haut à droite.</li><li>Choisis « Installer l'application » ou « Ajouter à l'écran d'accueil ».</li></ul></div>
      <div class="stack"><b>Sur PC (Chrome ou Edge)</b><ul class="plain"><li>Clique sur l'icône d'installation à droite de la barre d'adresse.</li></ul></div>
      <button class="btn ghost" data-close>Fermer</button>`, el => { const b = el.querySelector("#insgo"); if (b) b.onclick = async () => { try { deferredInstall.prompt(); await deferredInstall.userChoice; } catch (e) { /* refusé */ } deferredInstall = null; closeSheet(); }; });
  }
  const installHtml = () => isStandalone() || safeGet("merge.noinstall") ? "" : `<div class="banner install"><div><h2>Installe Merge sur ton téléphone</h2><p class="small">Plein écran, plus rapide, et tes cartes marchent sans réseau.</p></div><div class="row"><button class="btn sm" id="insb">Voir comment</button><button class="btn sm ghost" id="insno">Plus tard</button></div></div>`;
  // Recherche rapide : Ctrl+K sur PC, loupe sur téléphone.
  function quickSearch() {
    sheet(`<div class="field"><label for="qs">Recherche rapide</label><input id="qs" type="text" placeholder="Matière, chapitre, carte, mode…" autocomplete="off" enterkeyhint="go"></div><div id="qsr" class="qsr"></div><p class="note">Entrée ouvre le premier résultat. Échap ferme.</p>`, el => {
      const inp = el.querySelector("#qs"), out = el.querySelector("#qsr");
      const row = (href, icon, t, sub) => `<a class="exam" href="${href}" data-close><span class="mico">${icon}</span><span class="grow"><b>${esc(t)}</b><span class="small muted">${esc(sub)}</span></span></a>`;
      const run = () => {
        const q = norm(inp.value), res = [], lastCh = state.chapters.filter(c => cardsOf(c.id).length).slice(-1)[0];
        if (!q) { const due = dueCards(state.cards).length; if (due) res.push(row("#cartes-jour", I.cards, "Réviser maintenant", plural(due, "carte", "cartes") + " à revoir")); state.chapters.filter(c => cardsOf(c.id).length).slice(-4).reverse().forEach(c => res.push(row("#chapitre-" + c.id, I.book, c.name, "Chapitre récent"))); }
        else {
          TABS.forEach(t => { if (norm(t[1]).includes(q)) res.push(row("#" + t[0], I[t[2]], t[1], "Page")); });
          state.subjects.forEach(s => { if (norm(s.name).includes(q)) res.push(row("#matiere-" + s.id, I.subj, s.name, "Matière")); });
          state.chapters.forEach(c => { if (norm(c.name).includes(q)) { const s = state.subjects.find(x => x.id === c.subject_id); res.push(row("#chapitre-" + c.id, I.book, c.name, "Chapitre" + (s ? " · " + s.name : ""))); } });
          if (lastCh) Object.keys(MODES).forEach(k => { if (norm(MODES[k].n).includes(q)) res.push(row("#" + k + "-" + lastCh.id, I[MODES[k].i], MODES[k].n, "Mode · " + lastCh.name)); });
          state.cards.forEach(c => { if (res.length < 14 && c.front && (norm(c.front).includes(q) || norm(c.back).includes(q))) { const ch = state.chapters.find(x => x.id === c.chapter_id); res.push(row("#chapitre-" + c.chapter_id, I.cards, c.front, "Carte" + (ch ? " · " + ch.name : ""))); } });
        }
        if (q.length >= 2) res.splice(Math.min(res.length, 13), 0, `<a class="exam" href="#recherche" data-close data-full="1"><span class="mico">${I.search}</span><span class="grow"><b>Chercher « ${esc(inp.value.trim())} » dans le texte de mes cours</b><span class="small muted">Cours importés, résumés et cartes</span></span></a>`);
        out.innerHTML = res.slice(0, 14).join("") || '<p class="muted">Rien trouvé. Essaie un autre mot.</p>';
        const full = out.querySelector("[data-full]"); if (full) full.onclick = () => { searchPending = inp.value.trim(); if (location.hash === "#recherche") setTimeout(screenSearch, 0); };
      };
      inp.oninput = run; inp.onkeydown = e => { if (e.key === "Enter") { const a = out.querySelector("a"); if (a) { location.hash = a.getAttribute("href"); closeSheet(); } } };
      run(); setTimeout(() => inp.focus(), 40);
    });
  }
  document.addEventListener("keydown", e => { if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey) && state.profile && state.profile.onboarded_at) { e.preventDefault(); quickSearch(); } });
  // Pomodoro : 25 minutes de travail, 5 de pause, affiché dans une pastille pendant que tu révises.
  // Pomodoro réglable (durées de travail et de pause) ou minuteur libre. Réglages synchronisés (merge.pomocfg).
  // Le décompte part de l'heure de fin (endAt) : il reste juste même si l'iPhone met l'appli en pause en arrière-plan.
  const POMO_DEF = { mode: "pomo", work: 25, brk: 5, timer: 20 };
  const pomoCfg = () => { const c = Object.assign({}, POMO_DEF, jget("merge.pomocfg", {})); c.mode = c.mode === "timer" ? "timer" : "pomo"; c.work = Math.min(90, Math.max(5, +c.work || 25)); c.brk = Math.min(30, Math.max(1, +c.brk || 5)); c.timer = Math.min(180, Math.max(1, +c.timer || 20)); return c; };
  const pomoFull = () => { const c = pomoCfg(); return (c.mode === "timer" ? c.timer : pomo.phase === "pause" ? c.brk : c.work) * 60; };
  const pomo = { on: false, phase: "work", left: 1500, int: null, wasMusic: false, endAt: 0 };
  pomo.left = pomoFull();
  function pomoPaint() {
    const c = pomoCfg(), full = pomoFull();
    let chip = document.getElementById("pomochip"); const show = pomo.on || pomo.left !== full || pomo.phase !== "work";
    if (!chip && show) { chip = document.createElement("button"); chip.id = "pomochip"; chip.className = "pomochip"; chip.setAttribute("data-pomo", ""); document.body.appendChild(chip); }
    document.body.classList.toggle("pomo", show);
    const label = c.mode === "timer" ? "Minuteur " : pomo.phase === "work" ? "Travail " : "Pause ";
    if (chip) { chip.hidden = !show; chip.classList.toggle("pause", pomo.phase === "pause"); chip.innerHTML = I.clock + "<span>" + label + fmtT(pomo.left) + (pomo.on ? "" : " (arrêté)") + "</span>"; }
    const k = document.getElementById("pclock");
    if (k) {
      k.textContent = fmtT(pomo.left);
      const ring = document.getElementById("pring"); if (ring) { ring.style.setProperty("--p", ((1 - pomo.left / full) * 100).toFixed(1) + "%"); ring.classList.toggle("pause", pomo.phase === "pause" && c.mode !== "timer"); document.getElementById("pringl").textContent = c.mode === "timer" ? "Minuteur" : pomo.phase === "pause" ? "Pause" : "Travail"; }
      document.getElementById("pphase").textContent = c.mode === "timer" ? `Minuteur de ${c.timer} minute${c.timer > 1 ? "s" : ""}.` : pomo.phase === "work" ? `Travail : ${c.work} minutes sans distraction.` : `Pause : ${c.brk} minute${c.brk > 1 ? "s" : ""}. Lève-toi, bois un verre d'eau.`;
      document.getElementById("pgo").textContent = pomo.on ? "Mettre en pause" : pomo.left < full ? "Reprendre" : "Démarrer";
      document.querySelectorAll("#pomoset button").forEach(b => { b.disabled = pomo.on; });
    }
  }
  function pomoStop() { clearInterval(pomo.int); pomo.int = null; pomo.on = false; }
  function pomoTick() {
    pomo.left = Math.max(0, Math.ceil((pomo.endAt - Date.now()) / 1000));
    if (pomo.left <= 0) {
      const c = pomoCfg();
      if (c.mode === "timer") { pomoStop(); pomo.left = pomoFull(); toast("Minuteur terminé."); impNotify("Merge.", `Ton minuteur de ${c.timer} minute${c.timer > 1 ? "s" : ""} est terminé.`); }
      else {
        const toBreak = pomo.phase === "work"; pomo.phase = toBreak ? "pause" : "work"; pomo.left = pomoFull(); pomo.endAt = Date.now() + pomo.left * 1000;
        toast(toBreak ? `Pause de ${c.brk} minute${c.brk > 1 ? "s" : ""}. Tu l'as méritée.` : `C'est reparti pour ${c.work} minutes.`); impNotify("Merge.", toBreak ? `Pause de ${c.brk} minute${c.brk > 1 ? "s" : ""}.` : `La pause est finie : ${c.work} minutes de travail.`);
        if (jget("merge.pomomute", true)) { if (toBreak && music.on) { pomo.wasMusic = true; musicStop(); } else if (!toBreak && pomo.wasMusic) { pomo.wasMusic = false; musicPlay(music.i); } }
      }
    }
    pomoPaint();
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && pomo.on) pomoTick(); });
  function pomoSheet() {
    const c = pomoCfg();
    const step = (id, label, v, unit) => `<div class="pstep"><span>${label}</span><button class="iconbtn" data-ps="${id}" data-d="-1" aria-label="${label} : moins">${I.minus}</button><b id="pv-${id}">${v} ${unit}</b><button class="iconbtn" data-ps="${id}" data-d="1" aria-label="${label} : plus">${I.plus}</button></div>`;
    const presets = c.mode === "timer" ? [[5, "5 min"], [10, "10 min"], [15, "15 min"], [30, "30 min"], [45, "45 min"], [60, "1 h"]].map(p => `<button class="chip" data-pt="${p[0]}" aria-pressed="${c.timer === p[0]}">${p[1]}</button>`).join("")
      : [[25, 5, "25 / 5"], [50, 10, "50 / 10"], [15, 3, "15 / 3"], [45, 15, "45 / 15"]].map(p => `<button class="chip" data-pp="${p[0]}-${p[1]}" aria-pressed="${c.work === p[0] && c.brk === p[1]}">${p[2]}</button>`).join("");
    sheet(`<div class="row"><span class="mico big">${I.clock}</span><h1>${c.mode === "timer" ? "Minuteur" : "Pomodoro"}</h1></div>
      <div class="seg" role="tablist" aria-label="Type de minuteur"><button role="tab" data-pmode="pomo" aria-selected="${c.mode === "pomo"}">Pomodoro</button><button role="tab" data-pmode="timer" aria-selected="${c.mode === "timer"}">Minuteur</button></div>
      <div class="pring" id="pring" style="--p:${((1 - pomo.left / pomoFull()) * 100).toFixed(1)}%"><div class="pringin"><div class="big pclock" id="pclock">${fmtT(pomo.left)}</div><span class="small muted" id="pringl">${c.mode === "timer" ? "Minuteur" : pomo.phase === "pause" ? "Pause" : "Travail"}</span></div></div><p class="muted" id="pphase"></p>
      <div class="row"><button class="btn grow" id="pgo">Démarrer</button><button class="btn ghost" id="prs">Remettre à zéro</button></div>
      <div class="stack" id="pomoset">${c.mode === "timer" ? step("timer", "Durée", c.timer, "min") : step("work", "Travail", c.work, "min") + step("brk", "Pause", c.brk, "min")}<div class="chips">${presets}</div></div>
      ${c.mode === "pomo" ? `<button class="switch" id="pmute" role="switch" aria-checked="${jget("merge.pomomute", true)}"><i></i>Couper la musique pendant la pause</button>` : ""}
      <p class="note">${c.mode === "timer" ? "Choisis une durée : Merge te prévient quand c'est fini. Le minuteur reste affiché pendant que tu révises." : `${c.work} minutes de travail, ${c.brk} de pause, et ça recommence. Le minuteur reste affiché pendant que tu révises.`} Les durées se règlent quand le minuteur est arrêté.</p><button class="btn ghost" data-close>Fermer</button>`, el => {
      const save = patch => { jset("merge.pomocfg", Object.assign(pomoCfg(), patch)); if (!pomo.on) { pomo.phase = "work"; pomo.left = pomoFull(); } pomoSheet(); };
      el.querySelector("#pgo").onclick = () => {
        if (pomo.on) { pomo.left = Math.max(1, Math.ceil((pomo.endAt - Date.now()) / 1000)); pomoStop(); }
        else { pomo.on = true; pomo.endAt = Date.now() + pomo.left * 1000; pomo.int = setInterval(pomoTick, 1000); try { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); } catch (e) { /* facultatif */ } }
        pomoPaint();
      };
      el.querySelector("#prs").onclick = () => { pomoStop(); pomo.phase = "work"; pomo.left = pomoFull(); pomoPaint(); };
      el.querySelectorAll("[data-pmode]").forEach(b => b.onclick = () => { if (b.dataset.pmode === pomoCfg().mode) return; pomoStop(); save({ mode: b.dataset.pmode }); });
      el.querySelectorAll("[data-ps]").forEach(b => b.onclick = () => { const k = b.dataset.ps, cur = pomoCfg()[k], d = +b.dataset.d, inc = k === "brk" ? 1 : k === "timer" && (cur < 10 || (cur === 10 && d < 0)) ? 1 : 5; save({ [k]: cur + d * inc }); });
      el.querySelectorAll("[data-pt]").forEach(b => b.onclick = () => save({ timer: +b.dataset.pt }));
      el.querySelectorAll("[data-pp]").forEach(b => b.onclick = () => { const [w, p] = b.dataset.pp.split("-").map(Number); save({ work: w, brk: p }); });
      const m = el.querySelector("#pmute"); if (m) m.onclick = (e) => { const b = e.currentTarget, v = b.getAttribute("aria-checked") !== "true"; b.setAttribute("aria-checked", v); jset("merge.pomomute", v); };
      pomoPaint();
    });
  }
  document.addEventListener("click", e => { const t = e.target.closest && e.target.closest("[data-pomo],[data-qs]"); if (!t) return; if (t.hasAttribute("data-pomo")) pomoSheet(); else quickSearch(); });
  // Historique de maîtrise et temps passé par chapitre (gardés sur l'appareil).
  function recordHist(chIds, secs, single) {
    chIds.forEach(id => { const cs = cardsOf(id); if (!cs.length) return; const h = jget("merge.hist." + id, []), d = localDay(), m = mastery(cs); const last = h[h.length - 1]; if (last && last.d === d) last.m = m; else h.push({ d, m }); jset("merge.hist." + id, h.slice(-60)); });
    if (single && secs > 0) safeSet("merge.time." + single, String((parseInt(safeGet("merge.time." + single), 10) || 0) + secs));
  }

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
    app.innerHTML = `<div class="row between"><div class="logo">${esc(C.NOM_APPLI)}<b>.</b></div><span class="grow"></span><span class="homemusic"><button class="iconbtn flat" data-qs aria-label="Recherche rapide">${I.search}</button><button class="iconbtn flat" data-pomo aria-label="Pomodoro">${I.clock}</button>${musicBtn()}</span><a class="coinpill" href="#boutique" aria-label="${plural(coinsInfo().balance, "pièce", "pièces")} : ouvrir la boutique">${I.coin}${coinsInfo().balance}</a>${state.offline ? '<span class="pill warn">Hors ligne</span>' : st ? `<span class="streak" title="${plural(st, "jour", "jours")} d'affilée"><svg class="stf" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 3.5 5 6 5 11a5 5 0 0 1-10 0c0-2.4 1.3-4 2.5-5 .2 1.6 1 2.6 2 3 0-3.2-.6-6 .5-9z" fill="currentColor"/></svg><span class="stn">${st}</span><span class="stw">&nbsp;${st > 1 ? "jours" : "jour"}<span class="stl">&nbsp;d'affilée</span></span></span>` : `<span class="pill">${esc(p.classe || "")}</span>`}</div>
      <div class="hello"><div class="row">${MASCOT((rwEquipped("mascotte") || {}).v || "")}<h1 class="grow">Salut ${esc(p.display_name || "")}${rwEquipped("titre") && rwEquipped("titre").id !== "t-novice" && rwName(rwEquipped("titre")) ? ` <span class="rwtitle">${esc(rwName(rwEquipped("titre")))}</span>` : ""}</h1></div></div>
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
    const rst = restedChapters(), extra = due - state.cards.filter(c => fsrsDue(c) && !rst.has(c.chapter_id)).length, mins = Math.max(1, Math.round(due * 0.5));
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
    const rst2 = restedChapters(), info = chs.map(c => { const cs = cardsOf(c.id); return { c, n: cs.length, m: cs.length ? mastery(cs) : -1, due: rst2.has(c.id) ? 0 : cs.filter(fsrsDue).length }; });
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
    const cards = cr.data || [], meta = cardsOf(id), m = mastery(meta), due = dueCards(meta, true).length, hasSum = !!(sr.data), rest = restWhy(id);
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
      ${cards.length ? (rest ? `<div class="card pad restbox"><span class="mico">${I.check}</span><span class="grow"><b>Pas dans la révision du jour</b><span class="small muted">${rest === "auto" ? "Le contrôle de ce chapitre est passé : ses cartes ne reviennent plus chaque jour." : "Tu l'as retiré de la révision du jour."} Tu peux toujours le réviser ici.</span></span><button class="btn sm ghost" id="restoff">Le remettre</button></div>` : `<button class="card pad restbox restask" id="reston"><span class="mico">${I.check}</span><span class="grow"><b>Contrôle passé ?</b><span class="small muted">Retirer ce chapitre de la révision du jour</span></span></button>`) : ""}
      ${cards.length ? `<a class="card pad addcourse" href="#import-${id}"><span class="mico">${I.up}</span><b class="grow">Ajouter un cours</b><span class="small muted">PDF, photos…</span></a>` : `<div class="banner"><div><h2>Importe ton cours</h2><p class="small">PDF, photos, PowerPoint ou texte, autant de fichiers que tu veux. Merge prépare le résumé et les cartes à partir de ton cours, sans rien inventer.</p></div><a class="btn sm" href="#import-${id}">Importer</a></div>`}
      ${chapterToolsHtml(id)}
      <details class="card pad drop" id="cardsdrop"><summary><span class="mico">${I.cards}</span><b class="grow">${cards.length ? "Les " + plural(cards.length, "carte", "cartes") + " du chapitre" : "Cartes du chapitre"}</b></summary><div class="stack"><div class="row" style="flex-wrap:wrap"><button class="btn sm" id="tMore">Créer d'autres cartes avec l'IA</button><button class="btn sm ghost" id="tAdd">Ajouter une carte</button></div><div id="addbox"></div><div class="stack" id="list"></div></div></details>`;
    wireChapterTools(id, ch, cards); wireModes();
    if ($("reston")) $("reston").onclick = () => { setRest(id, "off"); toast("Ce chapitre ne revient plus dans la révision du jour."); screenChapter(id); };
    if ($("restoff")) $("restoff").onclick = () => { setRest(id, "on"); toast("Ce chapitre revient dans la révision du jour."); screenChapter(id); };
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
  let hlRe = null; // replace la petite barre de surlignage quand on fait défiler la page
  addEventListener("scroll", () => { if (hlRe) hlRe(); }, { passive: true }); addEventListener("resize", () => { if (hlRe) hlRe(); });
  addEventListener("hashchange", () => { const t = document.getElementById("hltool"); if (t) t.hidden = true; hlRe = null; });
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
        <p class="small muted">Sélectionne un mot ou un passage : une petite barre apparaît à côté pour choisir la couleur, mettre en gras ou retirer. Touche un passage surligné pour le modifier.</p>
        <div class="card pad stack" id="hlbox"></div>
        <div class="card pad stack" id="audbox"><h2>Résumé audio du cours</h2><p class="small muted">Un prof t'explique tout ton cours à voix haute, notion par notion, avec des exemples : ce n'est pas une simple lecture.</p><button class="btn" id="audsum">Écouter le cours expliqué</button></div>`;
      $("edit").onclick = edit;
      const hk = "merge.hl." + id;
      // Surlignages : { t: texte, s, e: position dans le texte du résumé, c: couleur (y g b p o) ou "", b: gras, m: format du résumé }.
      // Les anciens surlignages (simple texte) restent lisibles : jaune, retrouvés par leur texte.
      const HLC = [["y", "jaune", "#f5b400"], ["g", "vert", "#22c55e"], ["b", "bleu", "#3b82f6"], ["p", "rose", "#ec4899"], ["o", "orange", "#f97316"]];
      let hls = jget(hk, []).map(x => typeof x === "string" ? { t: x, c: "y" } : x).filter(x => x && typeof x.t === "string" && x.t);
      const hlSave = () => { hls = hls.slice(-80); jset(hk, hls); };
      const sbox = () => $("sumbox");
      // Texte du résumé sans les formules (elles s'affichent après coup) : les positions restent stables.
      const plainOf = () => { const out = []; let pos = 0; const w = document.createTreeWalker(sbox(), NodeFilter.SHOW_TEXT); while (w.nextNode()) { const n = w.currentNode; if (n.parentElement && n.parentElement.closest(".m,.katex")) continue; out.push({ n, a: pos, b: pos + n.nodeValue.length }); pos += n.nodeValue.length; } return { nodes: out, text: out.map(x => x.n.nodeValue).join("") }; };
      const bound = (nodes, container, off) => { const r0 = document.createRange(); r0.setStart(sbox(), 0); r0.setEnd(container, off); let pos = 0; for (const x of nodes) { if (x.n === container) return x.a + Math.min(off, x.n.nodeValue.length); if (r0.comparePoint(x.n, x.n.nodeValue.length) <= 0) pos = x.b; else break; } return pos; };
      const locate = (h, text) => { if (Number.isInteger(h.s) && Number.isInteger(h.e) && text.slice(h.s, h.e) === h.t) return [h.s, h.e]; const i = text.indexOf(h.t); return i < 0 ? null : [i, i + h.t.length]; };
      const wrapSpan = (a, b, cls, k) => { const { nodes } = plainOf(); for (const x of nodes) { const lo = Math.max(a, x.a), hi = Math.min(b, x.b); if (hi <= lo || !x.n.nodeValue.slice(lo - x.a, hi - x.a).trim()) continue; const r = document.createRange(); r.setStart(x.n, lo - x.a); r.setEnd(x.n, hi - x.a); const mk = document.createElement("mark"); mk.className = cls; mk.dataset.hi = k; r.surroundContents(mk); } };
      const shown = h => !h.m || h.m === curMode;
      const overlapIdx = (s, e) => { const { text } = plainOf(); return hls.map((h, k) => ({ k, loc: shown(h) ? locate(h, text) : null })).filter(x => x.loc && x.loc[0] < e && x.loc[1] > s).map(x => x.k); };
      const listHl = () => {
        const rows = hls.map((h, k) => ({ h, k })).filter(x => shown(x.h));
        $("hlbox").innerHTML = `<h2>Mes passages importants</h2>` + (rows.length ? rows.map(({ h, k }) => `<div class="row between hlrow"><span class="hldot${h.c ? "" : " none"}" style="--c:${esc((HLC.find(x => x[0] === h.c) || [])[2] || "transparent")}"></span><span class="grow hltxt${h.b ? " ub" : ""}">${esc(h.t.length > 110 ? h.t.slice(0, 107) + "…" : h.t)}</span><button class="mini" data-hd="${k}">Retirer</button></div>`).join("") + (rows.length > 1 ? '<button class="linkbtn" id="hlclear" style="align-self:flex-start">Tout retirer</button>' : "") : '<p class="muted small">Aucun passage surligné pour l\'instant.</p>');
        $("hlbox").querySelectorAll("[data-hd]").forEach(b => b.onclick = () => { hls.splice(+b.dataset.hd, 1); hlSave(); repaintHl(); });
        if ($("hlclear")) $("hlclear").onclick = async () => { if (!(await askConfirm("Retirer tous les surlignages ?", "Tes surlignages et tes mots en gras de ce résumé seront retirés. Le texte du résumé ne change pas.", "Tout retirer"))) return; hls = hls.filter(h => !shown(h)); hlSave(); repaintHl(); };
      };
      const repaintHl = () => {
        sbox().querySelectorAll("mark.user").forEach(m => m.replaceWith(...m.childNodes)); sbox().normalize();
        const { text } = plainOf();
        hls.forEach((h, k) => { if (!shown(h)) return; const loc = locate(h, text); if (loc) wrapSpan(loc[0], loc[1], "hl user" + (h.c ? " hc-" + h.c : "") + (h.b ? " ub" : ""), k); });
        listHl();
      };
      // Petite barre à côté du mot ou du passage choisi : 5 couleurs, gras, retirer.
      let tool = $("hltool");
      if (!tool) {
        tool = document.createElement("div"); tool.id = "hltool"; tool.className = "hltool"; tool.hidden = true; tool.setAttribute("role", "toolbar"); tool.setAttribute("aria-label", "Surligner");
        tool.innerHTML = HLC.map(c => `<button type="button" class="hlc" data-hc="${c[0]}" aria-label="Surligner en ${c[1]}" style="--c:${c[2]}"></button>`).join("") + `<button type="button" class="hlg" data-hb aria-label="Mettre en gras"><b>G</b></button><button type="button" class="hlx" data-hx aria-label="Retirer le surlignage">${I.x}</button>`;
        document.body.appendChild(tool); ["pointerdown", "mousedown"].forEach(ev => tool.addEventListener(ev, e => e.preventDefault()));
      }
      let cur = null; // { s, e, hi } : le passage choisi (hi = numéro du surlignage touché, sinon null)
      const hideTool = () => { tool.hidden = true; cur = null; hlRe = null; };
      const refreshTool = () => {
        const hit = cur ? (cur.hi != null ? [cur.hi] : overlapIdx(cur.s, cur.e)) : [], one = cur && cur.hi != null ? hls[cur.hi] : null;
        tool.querySelectorAll("[data-hc]").forEach(b => b.setAttribute("aria-pressed", String(!!one && one.c === b.dataset.hc)));
        tool.querySelector("[data-hb]").setAttribute("aria-pressed", String(!!one && !!one.b));
        tool.querySelector("[data-hx]").disabled = !hit.length;
      };
      const placeTool = rect => { tool.hidden = false; const w = tool.offsetWidth, h = tool.offsetHeight; let top = rect.bottom + 10; if (top + h > innerHeight - 8) top = Math.max(8, rect.top - h - 10); tool.style.top = top + "px"; tool.style.left = Math.max(8, Math.min(innerWidth - w - 8, rect.left + rect.width / 2 - w / 2)) + "px"; };
      const selTarget = () => {
        const sel = document.getSelection(); if (!sel || !sel.rangeCount || sel.isCollapsed || !sbox()) return null;
        const rg = sel.getRangeAt(0); if (!sbox().contains(rg.commonAncestorContainer)) return null;
        const { nodes, text } = plainOf(); let s = bound(nodes, rg.startContainer, rg.startOffset), e = bound(nodes, rg.endContainer, rg.endOffset);
        while (s < e && /\s/.test(text[s])) s++; while (e > s && /\s/.test(text[e - 1])) e--;
        return e - s >= 1 ? { s, e, rect: rg.getBoundingClientRect() } : null;
      };
      const showSel = () => { const t = selTarget(); if (!t) return false; cur = { s: t.s, e: t.e, hi: null }; hlRe = () => { const u = selTarget(); if (u) placeTool(u.rect); else hideTool(); }; placeTool(t.rect); refreshTool(); return true; };
      let selT = null;
      document.onselectionchange = () => { clearTimeout(selT); selT = setTimeout(() => { if (!sbox()) return hideTool(); if (!showSel() && (!cur || cur.hi == null)) hideTool(); }, 160); };
      sbox().onclick = e => {
        const m = e.target.closest && e.target.closest("mark.user"), sel = document.getSelection();
        if (m && (!sel || sel.isCollapsed)) { const k = +m.dataset.hi; cur = { s: 0, e: 0, hi: k }; hlRe = () => { const mm = sbox() && sbox().querySelector(`mark.user[data-hi="${k}"]`); if (mm) placeTool(mm.getBoundingClientRect()); else hideTool(); }; placeTool(m.getBoundingClientRect()); refreshTool(); }
        else if (!m && cur && cur.hi != null) hideTool();
      };
      app.onclick = e => { if (cur && cur.hi != null && !(e.target.closest && e.target.closest("mark.user, #hltool"))) hideTool(); };
      const actHl = (kind, c) => {
        if (!cur) return; const { text } = plainOf();
        if (cur.hi != null) {
          const h = hls[cur.hi]; if (!h) return hideTool();
          if (kind === "x") hls.splice(cur.hi, 1);
          else { if (kind === "c") h.c = c; else h.b = !h.b; if (!h.c && !h.b) hls.splice(cur.hi, 1); }
        } else if (kind === "x") {
          const ids = overlapIdx(cur.s, cur.e); if (!ids.length) return;
          hls = hls.filter((_, k) => !ids.includes(k));
        } else {
          const inside = overlapIdx(cur.s, cur.e).filter(k => { const loc = locate(hls[k], text); return loc && loc[0] >= cur.s && loc[1] <= cur.e; });
          const keepBold = kind === "c" && inside.some(k => hls[k].b);
          if (kind === "c") hls = hls.filter((_, k) => !inside.includes(k));
          hls.push({ s: cur.s, e: cur.e, t: text.slice(cur.s, cur.e), c: kind === "c" ? c : "", b: kind === "b" || keepBold, m: curMode });
        }
        hlSave(); try { document.getSelection().removeAllRanges(); } catch (er) { /* rien */ }
        hideTool(); repaintHl();
      };
      tool.querySelectorAll("[data-hc]").forEach(b => b.onclick = () => actHl("c", b.dataset.hc));
      tool.querySelector("[data-hb]").onclick = () => actHl("b");
      tool.querySelector("[data-hx]").onclick = () => actHl("x");
      hideTool(); repaintHl();
      $("audsum").onclick = () => { listenWant = "expl"; location.hash = "#ecouter-" + id; };
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
      <a class="btn ghost" href="#accueil">Continuer à naviguer</a>${d.jobId && !d.local ? `<button class="linkbtn impcancel" id="impcancel">Annuler l'import</button>` : ""}</div>`;
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
      d.shown = 100; d.ready = true; d.files = []; d.cache = {}; delete courseMemo[chId]; safeSet("merge.sumv." + chId, "");
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
      if (navigator.serviceWorker && navigator.serviceWorker.controller && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(r => r.showNotification(title, { body, icon: "icons/icon.svg", tag: "merge-import" })).catch(() => new Notification(title, { body }));
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
      if (d.busy) { app.innerHTML = impBusyHtml(d, ch.name); chipUpdate();
        // Annuler un import (bloqué, mauvais fichier…) : rien n'est ajouté au chapitre, on peut relancer tout de suite.
        if ($("impcancel")) $("impcancel").onclick = () => sheet(`<h1>Annuler l'import ?</h1><p class="muted">Rien ne sera ajouté à « ${esc(ch.name)} ». Tu pourras renvoyer ton cours juste après.</p><div class="row"><button class="btn ghost grow" data-close>Continuer l'import</button><button class="btn danger grow" id="impcancelok">Annuler l'import</button></div>`, el => {
          el.querySelector("#impcancelok").onclick = async () => { el.querySelector("#impcancelok").disabled = true;
            try { await ai({ action: "import_cancel", job_id: d.jobId }, "studio"); } catch (e) { toast("Impossible d'annuler pour l'instant. Réessaie."); el.querySelector("#impcancelok").disabled = false; return; }
            safeSet("merge.jobseen." + d.jobId, "1"); clearTimeout(d.poll); d.pollTok = null; clearInterval(d.timer);
            d.busy = false; d.local = false; d.failed = null; d.canResume = false; d.jobId = null; d.shown = 0; d.files = []; d.shots = [];
            el.querySelector("[data-close]").click(); toast("Import annulé. Tu peux renvoyer ton cours."); if (onImport(id)) draw(); else chipUpdate(); };
        }); if ($("askn")) $("askn").onclick = async () => { const ok = await ensurePush(true); if (!ok) toast("Notifications impossibles sur cet appareil ou refusées."); if (d.busy && onImport(id)) draw(); }; return; }
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

  // ---------- session de cartes ----------
  // Une carte marquée fausse revient dans la file jusqu'à ce qu'elle soit réussie. Chaque carte réussie fait monter la jauge.
  async function screenSession(scope, hard, subj) {
    tabs.hidden = true; app.innerHTML = `<p class="muted">Chargement…</p>`;
    // Révision combinée : tout un dossier (« g:<id> ») ou ce que l'élève a coché dans « Choisir quoi réviser » (« mixte »).
    let chIds = null, backX = null, training = false;
    if (scope === "mixte") { const v = jget("merge.mixsel", null); chIds = (v && Array.isArray(v.ids) ? v.ids : []); backX = "#perso"; }
    else if (scope.startsWith("g:")) { const gid = scope.slice(2); chIds = state.chapters.filter(c => c.group_id === gid).map(c => c.id); backX = state.groups.some(g => g.id === gid) ? "#dossier-" + gid : "#matieres"; }
    const backHref = backX || (scope === "jour" || scope === "melange" ? "#accueil" : subj ? "#matiere-" + scope : "#chapitre-" + scope);
    const pool = chIds ? state.cards.filter(c => chIds.includes(c.chapter_id)) : subj ? state.cards.filter(c => state.chapters.some(ch => ch.id === c.chapter_id && ch.subject_id === scope)) : cardsOf(scope);
    const single = scope !== "jour" && scope !== "melange" && !subj && !hard && !chIds;
    let meta = scope === "jour" ? dueCards(state.cards) : dueCards(pool, true);
    // Mélange choisi : les cartes à revoir d'abord, puis toutes les autres cartes de la sélection, mélangées.
    if (chIds && !hard) { const rest = shuffle(pool.filter(c => !meta.includes(c))); if (!meta.length) training = true; meta = meta.concat(rest); }
    // Révision mélangée : toutes les matières, les cartes à revoir et non maîtrisées d'abord, avec plus de poids pour les matières dont le contrôle approche.
    if (scope === "melange") {
      const subjOf = Object.fromEntries(state.chapters.map(ch => [ch.id, ch.subject_id])), w = {};
      state.subjects.forEach(x => { const d = x.exam_date ? daysUntil(x.exam_date) : null; w[x.id] = d != null && d >= 0 ? 1 + 6 / (1 + d) : 1; });
      const now = Date.now(), score = c => (w[subjOf[c.chapter_id]] || 1) * (new Date(c.due_at).getTime() <= now ? 3 : !isMastered(c) ? 2 : 0.6) * (0.6 + Math.random() * 0.8);
      meta = state.cards.slice().sort((a, b) => score(b) - score(a)).slice(0, 40);
      if (!meta.length) { location.hash = "#accueil"; return; }
    }
    if (hard) { meta = pool.filter(c => (c.wrong_count || 0) > 0).sort((a, b) => b.wrong_count - a.wrong_count).slice(0, 20); training = true; if (!meta.length) { toast("Aucune carte difficile pour l'instant : tu n'as encore rien raté ici."); location.hash = backHref; return; } }
    else if (single) { const todo = pool.filter(c => !isMastered(c)); if (todo.length) meta = meta.concat(shuffle(todo.filter(c => !meta.includes(c)))); else if (!meta.length) { meta = shuffle(pool); training = true; } }
    else if (!meta.length && scope !== "jour") { meta = shuffle(pool); training = true; }
    if (!meta.length) { location.hash = backHref; return; }
    meta = meta.slice(0, 60);
    const text = Object.fromEntries(meta.map(c => [c.id, c]));
    const S = { queue: meta.filter(c => text[c.id]).map(c => c.id), total: 0, known: 0, again: new Set(), flipped: false, start: Date.now(), reviews: 0, chapters: new Set(), allCh: new Set(), mine: "" };
    const typed = () => safeGet("merge.typed") === "1", noteOf = c => safeGet("merge.note." + c.id) || "";
    const backExtra = c => (typed() && S.mine.trim() ? `<p class="mnemo mine"><b>Ta réponse.</b> ${esc(S.mine)}</p>` : "") + (noteOf(c) ? `<p class="mnemo mynote"><b>Ta note.</b> ${esc(noteOf(c))}</p>` : "");
    S.total = S.queue.length;
    async function finish() {
      const secs = Math.min(3600, Math.round((Date.now() - S.start) / 1000)), day = localDay(); S.start = Date.now();
      const reviews = S.reviews; S.reviews = 0; if (!reviews && secs < 5) return;
      const cur = state.sessions.find(s => s.day === day);
      const prev = await sb.from("study_sessions").select("seconds,cards_reviewed,chapters_touched").eq("user_id", state.user.id).eq("day", day).maybeSingle();
      const p = prev.data || { seconds: 0, cards_reviewed: 0, chapters_touched: [] };
      const row = { user_id: state.user.id, day, seconds: p.seconds + secs, cards_reviewed: p.cards_reviewed + reviews, chapters_touched: [...new Set([...(p.chapters_touched || []), ...S.chapters])], updated_at: new Date().toISOString() };
      const up = await sb.from("study_sessions").upsert(row); if (up.error) console.error(up.error);
      if (cur) Object.assign(cur, row); else state.sessions.push(row);
    }
    function askMnemo(row) {
      if (row.mnemoAsked || getMnemo(row) || state.offline) return; row.mnemoAsked = true;
      ai({ action: "mnemo", front: row.front, back: row.back }).then(r => {
        if (!r || !r.mnemonic) return; row.mnemonic = r.mnemonic; safeSet("merge.mnemo." + row.id, r.mnemonic);
        if (!state.legacy) sb.from("cards").update({ mnemonic: r.mnemonic }).eq("id", row.id).then(() => {}, () => {});
        toast("Astuce mnémotechnique ajoutée à cette carte."); if (S.queue[0] === row.id && $("mnemo")) $("mnemo").innerHTML = mnemoHtml(row);
      }).catch(e => { if (e && e.code === "quota") toast("Limite d'IA atteinte : pas d'astuce pour cette carte aujourd'hui."); });
    }
    const mnemoHtml = c => getMnemo(c) ? `<p class="mnemo"><b>Astuce pour retenir.</b> ${esc(getMnemo(c))}</p>` : "";
    // Annuler : on garde l'état d'avant chaque réponse (20 au plus) pour pouvoir revenir en arrière si on s'est trompé de bouton.
    const UNDO_KEYS = ["due_at", "stability", "difficulty", "elapsed_days", "scheduled_days", "reps", "lapses", "state", "last_review", "right_count", "wrong_count", "mastered"];
    S.undo = [];
    async function undo() {
      const u = S.undo.pop(); if (!u) return;
      const row = state.cards.find(c => c.id === u.cid);
      if (row) {
        Object.assign(row, u.prev);
        const patch = Object.assign({}, u.prev); if (state.legacy) delete patch.mastered;
        sb.from("cards").update(patch).eq("id", u.cid).then(res => { if (res.error) queueReview(u.cid, patch); }, () => queueReview(u.cid, patch));
      }
      if (u.boost !== undefined) setBoostNext(u.cid, null, u.boost);
      S.queue = u.queue; S.known = u.known; S.reviews = Math.max(0, S.reviews - 1); if (!u.again) S.again.delete(u.cid);
      S.flipped = true; S.mine = "";
      if (u.mistake) Promise.resolve(u.mistake).then(() => unlogMistake(u.chapter, u.front));
      toast("Réponse annulée. Choisis la bonne.");
      render();
    }
    async function answer(ok, rating) {
      { const r0 = state.cards.find(c => c.id === S.queue[0]); if (r0) { S.undo.push({ cid: r0.id, chapter: r0.chapter_id, front: r0.front, prev: Object.fromEntries(UNDO_KEYS.map(k => [k, r0[k] === undefined ? null : r0[k]])), queue: S.queue.slice(), known: S.known, again: S.again.has(r0.id), mistake: null }); if (S.undo.length > 20) S.undo.shift(); } }
      const cid = S.queue.shift(), row = state.cards.find(c => c.id === cid); if (!row) return render();
      const now = new Date(), bonus = ok && !fsrsDue(row) && row.last_review, bn = boostNext()[cid];
      setBoostNext(cid, ok ? (rating || F.Rating.Good) : F.Rating.Again); if (S.undo.length) S.undo[S.undo.length - 1].boost = bn === undefined ? null : bn;
      const r = bonus ? null : fsrs.next(toFsrs(row), now, ok ? (rating || F.Rating.Good) : F.Rating.Again).card;
      const patch = bonus ? { right_count: (row.right_count || 0) + 1 } : { due_at: r.due.toISOString(), stability: r.stability, difficulty: r.difficulty, elapsed_days: r.elapsed_days, scheduled_days: r.scheduled_days, reps: r.reps, lapses: r.lapses, state: r.state, last_review: now.toISOString(), right_count: (row.right_count || 0) + (ok ? 1 : 0), wrong_count: (row.wrong_count || 0) + (ok ? 0 : 1) };
      if (!state.legacy) patch.mastered = ok;
      Object.assign(row, patch); row.mastered = ok; S.reviews++; S.chapters.add(row.chapter_id); S.allCh.add(row.chapter_id);
      sb.from("cards").update(patch).eq("id", cid).then(res => { if (res.error) queueReview(cid, patch); }, () => queueReview(cid, patch));
      ping(ok);
      if (ok) S.known++; else { S.again.add(cid); S.queue.push(cid); const lm = logMistake(row.chapter_id, row.front, row.back, "", "cartes", cid); if (S.undo.length) S.undo[S.undo.length - 1].mistake = lm; if (patch.wrong_count >= 2) askMnemo(row); }
      S.flipped = false; S.mine = "";
      if (S.queue.length) jset("merge.resume", { hash: location.hash, ch: single ? scope : null, name: single ? "" : "ta session", left: S.queue.length, total: S.total, at: Date.now() }); else safeSet("merge.resume", "null");
      render();
    }
    function render() {
      if (!S.queue.length) {
        const secsDone = Math.min(3600, Math.round((Date.now() - S.start) / 1000)); finish(); screenSession.key = null; safeSet("merge.resume", "null");
        recordHist([...S.allCh], secsDone, single ? scope : null); setTimeout(celebrate, 600); if (S.total >= 3 && S.known / S.total >= 0.8) setTimeout(() => confetti(), 250);
        const m = single ? mastery(cardsOf(scope)) : null;
        app.innerHTML = `<div class="row"><a class="iconbtn" href="${backHref}" aria-label="Fermer">${I.x}</a></div><div class="card done"><h1>Bon travail !</h1><p class="muted">${plural(S.total, "carte réussie", "cartes réussies")}. ${S.again.size ? plural(S.again.size, "carte est revenue", "cartes sont revenues") + " pendant la session jusqu'à ce que tu la réussisses." : "Aucune erreur."}</p>
          ${m != null ? `<div style="width:100%"><div class="row between small muted" style="margin-bottom:6px"><span>Maîtrise du chapitre</span><b>${m} %</b></div><div class="bar"><i style="width:${m}%"></i></div></div>${m >= 100 ? `<p class="fb ok">Contrôle débloqué !</p><a class="btn" href="#controle-${scope}">Passer le contrôle</a><a class="btn ghost" href="#boss-${scope}">Affronter le boss</a>` : ""}` : ""}
          ${m != null && m >= 100 && !state.offline ? `<button class="btn ghost" id="morec">${I.spark}Créer d'autres cartes</button>` : ""}<a class="btn${m != null && m >= 100 ? " ghost" : ""}" href="${backHref}">Terminer</a></div>`;
        if ($("morec")) $("morec").onclick = () => moreCards(scope, $("morec"));
        return;
      }
      if (!S.offered && single && !state.offline && S.total >= 4 && S.known >= Math.ceil(S.total / 2) && cardsOf(scope).length >= 4) {
        S.offered = true;
        app.innerHTML = `<div class="card done"><div class="tutoicon">${I.quiz}</div><h1>Tu es à la moitié</h1><p class="muted">${S.known} cartes réussies sur ${S.total}. C'est le bon moment pour un quiz intermédiaire : QCM ou réponse rédigée, à toi de choisir.</p><button class="btn" id="goquiz">Faire le quiz</button><button class="btn ghost" id="keep">Continuer les cartes</button></div>`;
        $("goquiz").onclick = () => { finish(); midQuiz = scope; location.hash = "#quiz-" + scope; }; $("keep").onclick = render; return;
      }
      const c = text[S.queue[0]], pct = Math.round(S.known / S.total * 100);
      app.innerHTML = `<div class="swrap"><div class="session"><div class="row"><a class="iconbtn" href="${backHref}" id="quit" aria-label="Fermer la session">${I.x}</a>${S.undo.length ? `<button class="iconbtn" id="undo" aria-label="Annuler ma dernière réponse" title="Annuler ma dernière réponse">${I.undo}</button>` : ""}<div class="grow" style="text-align:center;font-weight:800;font-variant-numeric:tabular-nums">${pct} % <span class="small muted">· ${S.known} / ${S.total}</span></div><span style="width:44px"></span></div>
        <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Progression de la session"><i style="width:${pct}%"></i></div>
        <div class="counters"><span class="counter no" aria-label="Cartes à revoir">${S.again.size}</span><span class="counter yes" aria-label="Cartes réussies">${S.known}</span></div>
        <div class="flipwrap" id="wrap"><button class="flip${S.flipped ? " back" : ""}" id="flip" aria-label="Retourner la carte">
          <div class="face"><header>${training ? "Entraînement" : S.again.has(c.id) ? "On la revoit" : "Question"}</header><div class="txt"><div class="tin">${cfront(c)}</div></div><footer>Touche la carte pour voir la réponse</footer></div>
          <div class="face b"><header>Réponse</header>${picHtml(c)}<div class="txt"><div class="tin">${schBox(c) ? schemaHtml(c, false, "show") : ""}${mx(c.back)}</div></div><div id="mnemo">${mnemoHtml(c)}</div><div id="extra" class="extra">${backExtra(c)}</div><footer>${c.source_quote ? "Dans ton cours : « " + esc(c.source_quote) + " »" : ""}</footer></div>
        </button></div>
        ${schBox(c) ? `<button class="chip sm schbtn" id="zoomsch">${I.search}Agrandir le schéma</button>` : ""}
        ${typed() ? `<div class="field typedbox"><label for="mine">Ta réponse, avant de retourner la carte</label><textarea id="mine" style="min-height:70px" placeholder="Écris ce que tu répondrais">${esc(S.mine)}</textarea></div>` : ""}
        <div class="answers"><button class="btn bad" id="no" aria-label="Faux, pas compris">${I.x}Faux</button><button class="btn good" id="yes">${I.check}Juste</button></div>
        <div class="row rate2"><button class="chip sm grow" id="hard">Juste, mais à revoir bientôt</button><button class="chip sm grow" id="easy">Trop facile</button></div>
        <details class="cmore"${S.cmoreFor === c.id ? " open" : ""}><summary>Plus d'options</summary><div class="row" style="justify-content:center;flex-wrap:wrap"><button class="switch" id="typedsw" role="switch" aria-checked="${typed()}"><i></i>Écrire ma réponse</button><button class="linkbtn" id="huh">Je ne comprends pas</button><button class="linkbtn" id="editc">Modifier la carte</button><button class="linkbtn" id="noteb">${noteOf(c) ? "Modifier ma note" : "Ajouter une note"}</button><button class="linkbtn" data-pomo>Pomodoro</button>${"speechSynthesis" in window ? '<button class="linkbtn" id="say">Lire à voix haute</button>' : ""}${c.image_path && !state.offline ? '<button class="linkbtn" id="see">Voir la page du cours</button>' : ""}</div></details><div id="pageimg"></div></div>
        <aside class="sside"><div class="card pad stack"><div class="ring" style="--p:${pct}"><b>${pct} %</b></div><div class="srow"><span>Réussies</span><b class="g">${S.known}</b></div><div class="srow"><span>À revoir</span><b class="r">${S.again.size}</b></div><div class="srow"><span>Restantes</span><b>${S.queue.length}</b></div></div>
          <div class="card pad stack"><h2>Raccourcis clavier</h2><div class="srow"><span>Retourner la carte</span><kbd>Espace</kbd></div><div class="srow"><span>Juste</span><kbd>→</kbd></div><div class="srow"><span>Faux</span><kbd>←</kbd></div><div class="srow"><span>Annuler ma réponse</span><kbd>Ctrl Z</kbd></div><div class="srow"><span>Trop facile</span><kbd>↑</kbd></div><div class="srow"><span>À revoir bientôt</span><kbd>↓</kbd></div></div>
          <p class="note">Une carte ratée revient jusqu'à ce que tu la réussisses.</p></aside></div>`;
      if ($("see")) $("see").onclick = () => showPage(c.image_path, $("pageimg"));
      if ($("zoomsch")) $("zoomsch").onclick = () => S.flipped ? openSchema(c, "show") : schOnFront(c) ? openSchema(c, "hide") : toast("Retourne la carte : le schéma est avec la réponse.");
      if ($("say")) $("say").onclick = () => speakText(S.flipped ? c.back : c.front, "fr-FR");
      $("flip").onclick = () => { if ($("mine")) S.mine = $("mine").value; S.flipped = !S.flipped; $("flip").classList.toggle("back", S.flipped); $("extra").innerHTML = backExtra(c); };
      $("no").onclick = () => answer(false); $("yes").onclick = () => answer(true);
      if ($("undo")) $("undo").onclick = undo;
      $("editc").onclick = () => sheet(`<h1>Modifier la carte</h1><div class="field"><label for="ef">Question</label><textarea id="ef" style="min-height:80px" maxlength="500">${esc(c.front)}</textarea></div><div class="field"><label for="eb">Réponse</label><textarea id="eb" style="min-height:110px" maxlength="2000">${esc(c.back)}</textarea></div><p class="note" id="emsg"></p><div class="row"><button class="btn grow" id="eok">Enregistrer</button><button class="btn ghost" data-close>Annuler</button></div>`, el => { el.querySelector("#eok").onclick = async () => {
        const front = el.querySelector("#ef").value.trim(), back = el.querySelector("#eb").value.trim(); if (!front || !back) return toast("La question et la réponse ne peuvent pas être vides.");
        el.querySelector("#eok").disabled = true; const { error } = await sb.from("cards").update({ front, back, edited_by_user: true, needs_check: false, flagged: false }).eq("id", c.id);
        if (error) { el.querySelector("#eok").disabled = false; return showErr(el.querySelector("#emsg"), error); }
        Object.assign(c, { front, back, needs_check: false, flagged: false }); const row = state.cards.find(x => x.id === c.id); if (row) Object.assign(row, { front, back }); closeSheet(); toast("Carte modifiée."); render(); }; });
      // « Plus d'options » reste ouvert sur la carte en cours (ex. après avoir activé « Écrire ma réponse »), puis se referme à la carte suivante et à chaque nouvelle session.
      app.querySelector(".cmore").ontoggle = e => { S.cmoreFor = e.target.open ? c.id : null; };
      $("huh").onclick = async () => {
        sheet(`<h1>Je ne comprends pas</h1><p class="muted small">${cfront(c)}</p><div id="huhbox" class="md"><div class="row"><div class="spin" aria-hidden="true"></div><p class="muted" role="status">L'IA t'explique à partir de ton cours…</p></div></div><button class="btn ghost" data-close>Fermer</button>`);
        try { const text = await courseText(c.chapter_id); const r = await ai({ action: "pourquoi", text, question: c.front, attendu: c.back, donne: "" }); const b = $("huhbox"); if (b) b.innerHTML = md(r.answer || ""); }
        catch (e) { const b = $("huhbox"); if (b) showErr(b, e); }
      };
      $("hard").onclick = () => answer(true, F.Rating.Hard); $("easy").onclick = () => answer(true, F.Rating.Easy);
      $("typedsw").onclick = () => { if ($("mine")) S.mine = $("mine").value; safeSet("merge.typed", typed() ? "0" : "1"); render(); };
      $("noteb").onclick = () => sheet(`<h1>Ta note sur cette carte</h1><p class="muted small">${esc(c.front)}</p><div class="field"><label for="nt">Ton moyen de retenir, une remarque du prof…</label><textarea id="nt" style="min-height:110px" maxlength="600">${esc(noteOf(c))}</textarea></div><p class="note">Ta note s'affiche au dos de la carte. Elle est gardée sur cet appareil.</p><div class="row"><button class="btn grow" id="ntok">Enregistrer</button><button class="btn ghost" data-close>Annuler</button></div>`, el => { el.querySelector("#ntok").onclick = () => { const v = el.querySelector("#nt").value.trim(); if (v) safeSet("merge.note." + c.id, v); else safeSet("merge.note." + c.id, ""); closeSheet(); render(); }; });
      $("quit").onclick = () => { if (S.reviews) finish(); };
      let x0 = null; const w = $("wrap");
      w.onpointerdown = e => { x0 = e.clientX; };
      w.onpointerup = e => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 90) { e.preventDefault(); answer(dx > 0); } };
    }
    screenSession.key = (e) => {
      if (!S.queue.length || !$("flip")) return;
      if (e.key === " ") { e.preventDefault(); $("flip").click(); }
      if (e.key === "ArrowRight") answer(true);
      if (e.key === "ArrowLeft") answer(false);
      if (e.key === "ArrowUp") { e.preventDefault(); answer(true, F.Rating.Easy); }
      if (e.key === "ArrowDown") { e.preventDefault(); answer(true, F.Rating.Hard); }
      if ((e.key === "z" || e.key === "Z") && (e.ctrlKey || e.metaKey) || e.key === "Backspace" && !/INPUT|TEXTAREA/.test((e.target || {}).tagName || "")) { e.preventDefault(); undo(); }
    };
    render();
  }
  document.addEventListener("keydown", e => { if (screenSession.key && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) screenSession.key(e); });
  // Images ajoutées par l'élève sur ses cartes (stockage « cours », dossier de l'élève). Liens signés gardés 50 min.
  const picUrls = {};
  async function picUrl(path) { const c = picUrls[path]; if (c && c.t > Date.now()) return c.u; const { data, error } = await sb.storage.from("cours").createSignedUrl(path, 3600); if (error || !data) return null; picUrls[path] = { u: data.signedUrl, t: Date.now() + 3000000 }; return data.signedUrl; }
  function fillPics(root) { (root || document).querySelectorAll("img[data-pic]:not([src])").forEach(async im => { const u = await picUrl(im.dataset.pic); if (u) im.src = u; else im.remove(); }); }
  const picHtml = (c) => c && c.picture ? `<img class="cardpic" data-pic="${esc(c.picture)}" alt="Image de la carte">` : "";
  // ---------- schémas du cours sur les cartes ----------
  // Une carte de schéma garde la photo de la page (image_path) et le cadre du schéma (image_box : [haut, gauche, bas, droite] de 0 à 1000).
  // On n'affiche que le schéma : l'image entière est placée dans un cadre qui cache le reste (aucune copie d'image en plus).
  // image_box = [ymin, xmin, ymax, xmax] du schéma sur la page (0 à 1000), puis éventuellement les cadres des légendes
  // à cacher côté question : [..., [y0, x0, y1, x1], [y0, x0, y1, x1]…] (ajoutés à la lecture des photos, studio v19).
  function schBox(c) {
    const b = c && c.image_path && Array.isArray(c.image_box) ? c.image_box.slice(0, 4).map(Number) : null;
    return b && b.length === 4 && b.every(Number.isFinite) && b[2] > b[0] && b[3] > b[1] ? b : null;
  }
  // Les cadres à cacher arrivent en groupes [y0, x0, y1, x1] (studio) ou à plat, 4 nombres par légende (réparations du 17 nov.) : on accepte les deux.
  function schMasks(c) {
    if (!schBox(c)) return [];
    const rest = c.image_box.slice(4), out = [];
    for (let i = 0; i < rest.length; i++) {
      if (Array.isArray(rest[i])) out.push(rest[i]);
      else if (i + 3 < rest.length && !rest.slice(i, i + 4).some(Array.isArray)) { out.push(rest.slice(i, i + 4)); i += 3; }
    }
    return out.filter(m => m.length === 4 && m.map(Number).every(Number.isFinite)).map(m => m.map(Number));
  }
  // Rapport largeur / hauteur du schéma : la photo est supposée en 3:4 jusqu'à son chargement, puis on prend sa vraie taille.
  const schRatio = (b, w, h) => ((b[3] - b[1]) * (w || 3)) / ((b[2] - b[0]) * (h || 4));
  // mode : "hide" = légendes à trouver cachées (question), "show" = légendes visibles et entourées (réponse), sinon schéma brut.
  function schemaHtml(c, small, mode) {
    const b = schBox(c); if (!b) return "";
    const bw = (b[3] - b[1]) / 1000, bh = (b[2] - b[0]) / 1000, pc = x => (x * 100).toFixed(3) + "%";
    const masks = mode ? schMasks(c) : [], rel = m => `left:${pc((m[1] - b[1]) / 1000 / bw)};top:${pc((m[0] - b[0]) / 1000 / bh)};width:${pc((m[3] - m[1]) / 1000 / bw)};height:${pc((m[2] - m[0]) / 1000 / bh)}`;
    return `<span class="schema${small ? " sm" : ""}" data-sch="${esc(c.id)}" data-mode="${mode || ""}" role="img" aria-label="Schéma du cours" style="--ar:${schRatio(b).toFixed(4)}">`
      + `<img class="schimg" data-pic="${esc(c.image_path)}" alt="" draggable="false" style="width:${pc(1 / bw)};height:${pc(1 / bh)};left:${pc(-b[1] / 1000 / bw)};top:${pc(-b[0] / 1000 / bh)}">`
      + masks.map(m => `<i class="${mode === "hide" ? "schmask" : "schhit"}" style="${rel(m)}">${mode === "hide" ? "?" : ""}</i>`).join("")
      + (small ? "" : `<i class="schzoom" aria-hidden="true">${I.search}</i>`) + `</span>`;
  }
  // Question d'une carte de schéma : les légendes à trouver sont cachées. Sans légende connue (cartes créées avant studio v19),
  // le schéma ne s'affiche qu'au dos, avec la réponse : sinon la réponse se lirait sur l'image.
  const schOnFront = c => schMasks(c).length > 0;
  // « Sur ce schéma S1 de… » : l'identifiant interne S1 n'a rien à faire dans la question.
  const cleanFront = t => String(t == null ? "" : t).replace(/(sch[ée]mas?)\s+S\d+\b/gi, "$1");
  // Question d'une carte : son schéma (s'il y en a un) puis le texte. small = petite vignette dans les listes.
  // Carte de schéma sans légende à cacher : le schéma n'est qu'au dos. La question ne doit donc pas dire « sur ce schéma »
  // (on aurait cherché un schéma absent) : on retire ce bout de phrase, le schéma arrive avec la réponse.
  const noSchRef = t => { const o = String(t || ""), r = o.replace(/^\s*(sur|d'après|d’après|dans|selon|d'apr[eè]s)\s+(ce|le|cet)\s+(sch[ée]ma|document|dessin|illustration)\s*,?\s*/i, "").replace(/\s*,?\s*(sur|dans|d'après|d’après)\s+(ce|le)\s+sch[ée]ma(\s+ci-dessus|\s+ci-dessous)?/gi, ""); return r === o || r.length < 6 ? o : r.charAt(0).toUpperCase() + r.slice(1); };
  function cfront(c, small) { return schOnFront(c) ? schemaHtml(c, small, "hide") + mx(cleanFront(c.front)) : mx(cleanFront(schBox(c) ? noSchRef(c.front) : c.front)); }
  // Vraie taille de la photo connue : on corrige le rapport du cadre pour que le schéma ne soit pas déformé.
  document.addEventListener("load", e => {
    const im = e.target; if (!im || !im.classList) return;
    if (im.parentElement && im.parentElement.classList.contains("schpage") && im.naturalWidth) return im.parentElement.style.setProperty("--par", (im.naturalWidth / im.naturalHeight).toFixed(4));
    if (!im.classList.contains("schimg")) return;
    const box = im.closest(".schema"), c = box && (state.cards || []).find(x => x.id === box.dataset.sch) || null, b = schBox(c) || schBox(box && box._c);
    if (b && im.naturalWidth) box.style.setProperty("--ar", schRatio(b, im.naturalWidth, im.naturalHeight).toFixed(4));
    if (box) box.classList.add("ok");
  }, true);
  // Agrandir un schéma : en grand, avec « Voir la page entière » (le schéma y est entouré).
  function openSchema(c, mode) {
    const b = schBox(c); if (!b) return;
    const old = document.getElementById("schview"); if (old) old.remove();
    const el = document.createElement("div"); el.id = "schview"; el.className = "schview"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Schéma du cours");
    const pc = x => (x / 10).toFixed(2) + "%";
    const draw = (full) => {
      el.innerHTML = `<div class="schviewbar"><button class="iconbtn flat" data-schx aria-label="Fermer">${I.x}</button>${mode === "hide" ? "" : `<button class="btn sm ghost" data-schfull>${full ? "Voir le schéma seul" : "Voir la page entière"}</button>`}</div>`
        + `<div class="schviewbody">${full ? `<span class="schpage"><img class="pageimg" data-pic="${esc(c.image_path)}" alt="Page du cours"><i class="schmark" style="top:${pc(b[0])};left:${pc(b[1])};height:${pc(b[2] - b[0])};width:${pc(b[3] - b[1])}"></i></span>` : schemaHtml(c, false, mode).replace('class="schema"', 'class="schema big"')}</div>`;
      el.querySelector("[data-schx]").onclick = close;
      if (el.querySelector("[data-schfull]")) el.querySelector("[data-schfull]").onclick = () => draw(!full);
      const box = el.querySelector(".schema"); if (box) box._c = c;
      fillPics(el);
    };
    const close = () => { el.remove(); document.removeEventListener("keydown", esc_); };
    const esc_ = e => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", esc_);
    el.addEventListener("click", e => { if (e.target === el || e.target.classList.contains("schviewbody")) close(); });
    document.body.appendChild(el); draw(false);
  }
  // Toucher un schéma l'agrandit (sauf dans un bouton ou un lien : la carte se retourne, le lien s'ouvre).
  document.addEventListener("click", e => {
    const z = e.target.closest && e.target.closest("[data-schzoom]");
    if (z) { const c = (state.cards || []).find(x => String(x.id) === z.dataset.schzoom); if (c) { e.preventDefault(); openSchema(c, ""); } return; }
    const f = e.target.closest && e.target.closest(".schema[data-sch]");
    if (!f || f.closest("button,a,#schview")) return;
    const c = (state.cards || []).find(x => x.id === f.dataset.sch); if (c) { e.preventDefault(); openSchema(c, f.dataset.mode || ""); }
  });
  async function uploadCardPic(file, chapterId, cardId) {
    let bmp; try { bmp = await createImageBitmap(file); } catch (e) { if (!window.heic2any) await new Promise((ok, ko) => { const sc = document.createElement("script"); sc.src = "vendor/heic2any.min.js"; sc.onload = ok; sc.onerror = ko; document.head.appendChild(sc); }); const o = await window.heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 }); bmp = await createImageBitmap(Array.isArray(o) ? o[0] : o); }
    const k = Math.min(1, 1000 / Math.max(bmp.width, bmp.height)), cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k); cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
    const blob = await new Promise(r => cv.toBlob(r, "image/jpeg", 0.82)), path = state.user.id + "/" + chapterId + "/carte-" + cardId + "-" + Date.now() + ".jpg";
    const up = await sb.storage.from("cours").upload(path, blob, { contentType: "image/jpeg", upsert: true }); if (up.error) throw up.error;
    const r = await sb.from("cards").update({ picture: path, edited_by_user: true }).eq("id", cardId); if (r.error) throw r.error;
    const m = state.cards.find(x => x.id === cardId); if (m) m.picture = path; return path;
  }
  async function showPage(path, box) {
    if (!box) return; if (box.innerHTML) { box.innerHTML = ""; return; }
    box.innerHTML = '<p class="muted">Chargement de la page…</p>';
    const { data, error } = await sb.storage.from("cours").createSignedUrl(path, 3600);
    box.innerHTML = error || !data ? '<p class="err">Image indisponible.</p>' : `<img class="pageimg" src="${esc(data.signedUrl)}" alt="Page du cours d'où vient cette carte">`;
  }

  // ---------- réglages ----------
  // Vacances en cours ou à venir dans la zone choisie (affichées sous le choix de zone).
  function remindVac(p) {
    const zone = ["A", "B", "C"].includes(p.holiday_zone) ? p.holiday_zone : "A", today = localDay(), list = VACANCES_ZONES[zone];
    const v = list.find(x => today >= x[1] && today <= x[2]) || list.find(x => x[1] > today); if (!v) return null;
    const fd = d => new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    return { zone, label: (v[0] === "Été" ? "été, à partir du " + fd(v[1]) : v[0] + ", du " + fd(v[1]) + " au " + fd(v[2])) };
  }
  function colorField() {
    const st = rwState(), xp = xpInfo().xp, cur = (rwEquipped("couleur") || {}).id || "c-violet";
    const own = REWARDS.filter(r => r.type === "couleur" && !r.perso && (r.id === "c-violet" || rwOwned(r, xp, st)));
    return `<div class="field"><span class="label">Couleur de l'appli</span><div class="chips colchips">${own.map(r => `<button class="chip${r.id === cur ? " on" : ""}" data-col="${r.id}" aria-pressed="${r.id === cur}"><span class="dot" style="background:${esc(r.v || "#4b39c8")}"></span>${esc(r.id === "c-violet" ? "Violet de base" : r.n)}</button>`).join("")}</div><span class="small muted">D'autres couleurs se gagnent ou s'achètent dans la boutique.</span></div>`;
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
        <div class="field"><span class="label">Taille du texte</span>${chips("s", [["small", "Petit"], ["normal", "Normal"], ["large", "Grand"]], p.text_size)}</div>
        ${colorField()}</div>
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
    // Couleur de l'appli (19 nov.) : choisir parmi les couleurs que l'on possède, ou revenir au violet de base. Avant, seul
    // l'écran des récompenses (difficile à trouver) permettait de changer une couleur équipée.
    app.querySelectorAll("[data-col]").forEach(b => b.onclick = () => { const s2 = rwState(); s2.equip.couleur = b.dataset.col; rwSave(s2); applyRewards(); screenSettings(); toast("Couleur changée."); });
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
  // Matières, design A (16 nov.) : grille de tuiles. Pastille de couleur avec l'icône de la matière (ou ses initiales si elle est inconnue), nom, chapitres et cartes,
  // prochain contrôle, barre de maîtrise. Une tuile en pointillés pour ajouter une matière.
  const subjInitials = n => { const t = String(n || "").trim(); if (t.length <= 4 && /^[A-Z0-9]+$/.test(t)) return t; const w = t.split(/[\s\-–]+/).filter(Boolean); return w.length > 1 ? (w[0][0] + w[1][0]).toUpperCase() : t.slice(0, 2).replace(/^./, c => c.toUpperCase()); };
  function screenSubjects() {
    drawTabs("matieres");
    const tile = s => {
      const chs = state.chapters.filter(c => c.subject_id === s.id), cs = state.cards.filter(k => chs.some(c => c.id === k.chapter_id)), m = mastery(cs), nc = nextCtrl(s);
      return `<a class="stile" style="--c:${esc(s.color)}" href="#matiere-${s.id}"><span class="sico${subjIcon(s.name) ? " ic" : ""}">${subjIcon(s.name) || esc(subjInitials(s.name))}</span><b>${esc(s.name)}</b><span class="small muted">${chs.length} chap. · ${plural(cs.length, "carte", "cartes")}</span>${nc ? `<span class="spill">${jx(nc.d) === "Auj." ? "Contrôle aujourd'hui" : "Contrôle " + jx(nc.d)}</span>` : ""}<span class="srow"><span class="bar grow"><i style="width:${m}%"></i></span><span class="small muted">${m} %</span></span></a>`;
    };
    app.innerHTML = `<div class="row between"><h1>Matières</h1><div class="row"><button class="iconbtn flat" data-qs aria-label="Recherche rapide">${I.search}</button><a class="iconbtn addround" href="#nouvelle-matiere" aria-label="Ajouter une matière">${I.plus}</a></div></div>
      ${state.subjects.length ? `<div class="stiles">${state.subjects.map(tile).join("")}<a class="stile sadd" href="#nouvelle-matiere"><span>${I.plus}Matière</span></a></div>` : `<div class="card empty"><svg viewBox="0 0 120 90" aria-hidden="true"><rect x="14" y="22" width="58" height="50" rx="8" fill="var(--accent-soft)"/><rect x="34" y="12" width="58" height="50" rx="8" fill="var(--btn-bg)"/><path d="M48 30h30M48 40h22M48 50h26" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="98" cy="68" r="10" fill="var(--accent)"/><path d="M98 63v10M93 68h10" stroke="var(--accent-fg)" stroke-width="3" stroke-linecap="round"/></svg><b>Aucune matière. Ajoute ta première matière.</b><p class="small muted">Crée une matière, ajoute un chapitre, importe ton cours : tes cartes et ton résumé arrivent tout seuls.</p><a class="btn" href="#nouvelle-matiere">${I.plus}Ajouter une matière</a></div>`}`;
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
    // Progrès, design C « Parcours et récompenses » (16 nov.) : le niveau et ce qu'il rapporte, le chemin des prochains niveaux,
    // les badges les plus proches avec leur progression, puis la boutique, Duo et les autres pages, et les chiffres en dessous.
    const nl = lv.level + 1, gift = L => L % 5 === 0 ? "un coffre, des pièces et un cadeau" : "des pièces et un cadeau de la boutique";
    const node = (L, kind) => `<span class="pnode ${kind}"><span class="pdot">${kind === "done" ? I.check : kind === "now" ? I.star : L % 5 === 0 ? I.gift : I.coin}</span><span class="small">Niv. ${L}</span></span>`;
    const path = [lv.level > 1 ? node(lv.level - 1, "done") : "", node(lv.level, "now"), node(nl, "next"), node(nl + 1, "far"), node(Math.ceil((nl + 2) / 5) * 5, "far")].filter(Boolean).join('<i class="pline"></i>');
    const bp = badgeProgress().filter(b => b.cur < b.goal).sort((x, y) => y.cur / y.goal - x.cur / x.goal).slice(0, 3), won = badges().filter(b => b[1]);
    app.innerHTML = `${progSeg("progres")}<h1>Progrès</h1>
      <div class="card pathcard"><div class="row between"><b class="plvl">Niveau ${lv.level} <span class="small">${esc(lv.rank)}</span></b><span class="small">${lv.left} pts avant le niveau ${nl}</span></div>
        <div class="bar"><i style="width:${lv.pct}%"></i></div>
        <p class="pgift">${I.gift}<span>Au niveau ${nl} : ${gift(nl)}</span></p>
        <div class="ppath">${path}</div>
        <p class="small pnote">${lv.xp} points. 10 par bonne réponse, 2 par erreur, 100 par chapitre maîtrisé. ${streakInfo().left ? "Gel de série dispo cette semaine." : "Gel de série déjà utilisé cette semaine."}</p></div>
      ${bp.length ? `<div class="card pad stack"><h2>Prochains badges</h2>${bp.map(b => `<div class="pbadge"><div class="row between"><span>${esc(b.name)}</span><span class="small muted">${b.label}</span></div><div class="bar"><i style="width:${Math.round(Math.min(1, b.cur / b.goal) * 100)}%"></i></div></div>`).join("")}${won.length ? `<p class="small muted">Déjà gagnés : ${won.map(b => esc(b[0])).join(" · ")}</p>` : ""}</div>` : `<div class="card pad"><b>Tous les badges sont à toi.</b></div>`}
      <div class="pgrid6"><a class="card ptile pshop" href="#boutique"><span class="mico">${I.coin}</span><span class="grow" style="min-width:0"><b>Boutique</b><span class="small muted">${plural(coins, "pièce", "pièces")}${coinsInfo().locked ? " · " + coinsInfo().locked + " en jeu" : ""}</span></span></a>${go("duo", "duo", "Duo", "Réviser à deux")}${go("recompenses", "star", "Récompenses", "Coffres, cadeaux")}${go("bilan", "chart", "Bilan", "Ta semaine")}${go("erreurs", "trap", "Erreurs", "Cartes ratées")}<button class="card ptile" id="pstats"><span class="mico">${I.chart}</span><span class="grow" style="min-width:0"><b>Par chapitre</b><span class="small muted">Statistiques</span></span></button></div>
      <div class="tiles"><div class="card tile"><b>${streak()}</b><span>${streak() === 0 ? "révise aujourd'hui pour lancer ta série" : streak() === 1 ? "jour d'affilée" : "jours d'affilée"}</span></div><div class="card tile"><b>${cards7}</b><span>cartes en 7 jours</span></div><div class="card tile"><b>${mins}</b><span>minutes en 7 jours</span></div><div class="card tile"><b>${mastery(state.cards)} %</b><span>maîtrise moyenne</span></div></div>
      <div class="card pad stack"><h2>Cartes révisées, 14 derniers jours</h2><div class="bars" role="img" aria-label="Cartes révisées par jour sur 14 jours">${d14.map(d => `<div><i style="height:${Math.max(3, d.cards_reviewed / max * 100)}%" class="${d.cards_reviewed ? "" : "zero"}" title="${d.cards_reviewed}"></i><span>${d.label}</span></div>`).join("")}</div></div>
      <div class="stack"><h2>Par matière</h2><div class="grid">${state.subjects.map(s => { const chs = state.chapters.filter(c => c.subject_id === s.id), cs = state.cards.filter(k => chs.some(c => c.id === k.chapter_id)), m = mastery(cs); return `<a class="card subject" style="--c:${esc(s.color)}" href="#matiere-${s.id}"><div class="row between"><div class="row"><span class="dot"></span><b>${esc(s.name)}</b></div><span class="small muted">${m} %</span></div><div class="bar"><i style="width:${m}%"></i></div></a>`; }).join("") || '<p class="muted">Aucune matière.</p>'}</div></div>
      <div class="card pad stack"><h2>Mes notes</h2><div id="notes"><p class="muted">Chargement…</p></div></div>`;
    // Statistiques d'un chapitre (avant dans chaque chapitre, maintenant ici) : on choisit le chapitre.
    if ($("pstats")) $("pstats").onclick = () => {
      const list = state.chapters.filter(c => cardsOf(c.id).length).map(c => { const su = state.subjects.find(x => x.id === c.subject_id) || {}; return `<a class="ctxrow" href="#stats-${c.id}" data-close style="--c:${esc(su.color || "#9483ff")}"><span class="dot"></span><span class="grow"><b>${esc(c.name)}</b><span class="small muted">${esc(su.name || "")} · ${mastery(cardsOf(c.id))} %</span></span><span class="chev">${I.back}</span></a>`; }).join("");
      sheet(`<h1>Statistiques par chapitre</h1>${list || '<p class="muted">Importe un cours pour voir ses statistiques.</p>'}`);
    };
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

  // ---------- Journée : planning de révision en frise, façon « Structured » (onglet de la barre du bas) ----------
  // merge.journee (synchronisé) = { setup, blocks: { "AAAA-MM-JJ": [bloc] }, weekly: [bloc avec wd 0-6 = lundi-dimanche], off: { jour: true }, done: { "jour|id": true } }
  // bloc = { id, start "HH:MM", dur (min), s (matière), ch (chapitre ou null = choisi par Merge), act, title }
  // Icônes au choix pour un bloc (surtout « Autre ») ; l'IA choisit aussi dans cette liste.
  const BICONS = [["play", "Vidéo"], ["book", "Lecture"], ["steps", "Devoirs"], ["sum", "Fiche"], ["listen", "Écoute"], ["bolt", "Sport"], ["cup", "Repas"], ["bulb", "Projet"], ["duo", "À plusieurs"], ["map", "Sortie"], ["home", "Maison"], ["star", "Perso"]];
  const bIcon = b => (b.ic && BICONS.some(x => x[0] === b.ic) ? I[b.ic] : I[actOf(b.act)[2]]);
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
  // Un bloc peut viser plusieurs matières (b.ss) et plusieurs chapitres (b.chs) ; b.s et b.ch gardent le premier (anciens blocs).
  const bSubs = b => (Array.isArray(b.ss) && b.ss.length ? b.ss : b.s ? [b.s] : []).filter(id => state.subjects.some(x => x.id === id));
  const bChs = b => (Array.isArray(b.chs) && b.chs.length ? b.chs : b.ch ? [b.ch] : []).filter(id => state.chapters.some(c => c.id === id));
  // Lancer un bloc : plusieurs chapitres ou matières en flashcards = révision mélangée de tout ça.
  function goBlock(b) {
    const chs = bChs(b), subs = bSubs(b);
    if (b.act === "cartes" && (chs.length > 1 || (!chs.length && subs.length > 1))) {
      const ids = chs.length ? chs : state.chapters.filter(c => subs.includes(c.subject_id) && cardsOf(c.id).length).map(c => c.id);
      jset("merge.mixsel", { ids }); location.hash = "#mixte"; return true;
    }
    const to = blockTarget(b); if (to) { location.hash = to; return true; } return false;
  }
  document.addEventListener("click", e => { const a = e.target.closest && e.target.closest("[data-blkgo]"); if (!a) return; e.preventDefault(); const bl = blocksOn(jGet(), localDay()).find(x => x.id === a.dataset.blkgo); if (bl) goBlock(bl); });
  function blockTarget(b) {
    // Chapitre : celui choisi, ou celui que Merge choisit (b.auto) ; sans chapitre, on ouvre la matière.
    const ch = bChs(b)[0] || (b.s && b.auto ? (bestChapter(b.s) || {}).id : null);
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
  function screenPlanning() {
    const v = jView(); jDay = v.day; screenJournee();
    // Emploi du temps envoyé puis appli quittée : on récupère la lecture faite entre-temps.
    edtResume(e => { closeSheet(); if (e.ab && !e.ref) abSheet(); else if (location.hash === "#calendrier") screenPlanning(); });
  }
  // Vue semaine : chaque jour en une ligne, avec ses contrôles, ses cours et ses révisions prévues.
  function screenSemaine() {
    drawTabs("calendrier"); const j = jGet(), mon = mondayOf(dayOf(jDay)), today = localDay();
    const days = [...Array(7)].map((_, i) => { const d = new Date(mon); d.setDate(d.getDate() + i); return localDay(d); });
    const subj = id => state.subjects.find(x => x.id === id), colorOf = blockColor;
    const end = dayOf(days[6]);
    // Une ligne par jour : date, petite frise de la journée (7 h – 21 h : cours en couleur pâle, révisions en couleur pleine), résumé.
    const H0 = 7 * 60, H1 = 21 * 60, pos = (st, du) => { const a = Math.max(H0, st), z = Math.min(H1, st + du); return z <= a ? null : `left:${((a - H0) / (H1 - H0) * 100).toFixed(2)}%;width:${Math.max(1.2, (z - a) / (H1 - H0) * 100).toFixed(2)}%`; };
    const range = `${mon.getDate()}${mon.getMonth() !== end.getMonth() ? " " + mon.toLocaleDateString("fr-FR", { month: "short" }) : ""} – ${end.getDate()} ${end.toLocaleDateString("fr-FR", { month: "short" })}`;
    app.innerHTML = `${planSeg("edt")}<div class="jnav"><button class="linkbtn" id="jup">${I.back}${esc(dayOf(jDay).toLocaleDateString("fr-FR", { month: "long" }).replace(/^./, c => c.toUpperCase()))}</button><span class="grow"></span>${days.includes(today) ? "" : `<button class="btn sm" id="wtoday">Aujourd'hui</button>`}</div>
      <div class="wkhead"><button class="iconbtn flat" id="wprev" aria-label="Semaine précédente">${I.back}</button><div class="wktitle"><b>${esc(range)}</b>${edtGet().ab && weekAB(mon) ? `<span class="small muted">Semaine ${weekAB(mon)}</span>` : ""}</div><button class="iconbtn flat" id="wnext" aria-label="Semaine suivante" style="transform:scaleX(-1)">${I.back}</button></div>
      <div class="wklist card">${days.map(k => { const d = dayOf(k), bs = blocksOn(j, k), sc = schoolOn(j, k), cs = ctrls().filter(c => c.d === k).map(c => subj(c.s)).filter(Boolean), work = bs.filter(b => b.act !== "pause"), mins_ = work.reduce((a, b) => a + b.dur, 0), done = isDoneAll(j, k, bs);
        const segs = sc.map(x => { const p2 = pos(mins(x.start), mins(x.end) - mins(x.start)); return p2 ? `<i class="sc" style="${p2};--c:${esc((subjOfName(x.subject) || {}).color || "#64748b")}"></i>` : ""; }).join("") + work.map(b => { const p2 = pos(mins(b.start), b.dur); return p2 ? `<i style="${p2};--c:${esc(colorOf(b))}"></i>` : ""; }).join("");
        const meta = [j.off[k] ? "Pas cours" : sc.length ? plural(sc.length, "cours", "cours") : "", mins_ ? durTxt(mins_) + " de révision" : ""].filter(Boolean).join(" · ") || "Rien de prévu";
        return `<button class="wkrow${k === today ? " now" : ""}${!sc.length && !work.length && !cs.length ? " empty" : ""}" data-wd="${k}"><span class="wkdate"><span>${d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}</span><b>${d.getDate()}</b></span><span class="wkmain">${cs.length ? `<span class="wkexams">${cs.map(x => `<span class="wkexam" style="--c:${esc(x.color)}"><span class="dot"></span>Contrôle de ${esc(x.name)}</span>`).join("")}</span>` : ""}<span class="wkbar" aria-hidden="true">${segs}</span><span class="wkmeta small">${esc(meta)}${done ? ` <span class="wkdone">${I.check}fait</span>` : ""}</span></span><span class="wkgo" aria-hidden="true">${I.back}</span></button>`; }).join("")}</div>
      <p class="small muted wklegend"><i class="lg sc"></i>cours <i class="lg"></i>révisions · de 7 h à 21 h</p>`;
    $("jup").onclick = () => jGo("mois");
    if ($("wtoday")) $("wtoday").onclick = () => jGo("semaine", today);
    $("wprev").onclick = () => { const d = dayOf(jDay); d.setDate(d.getDate() - 7); jGo("semaine", localDay(d)); };
    $("wnext").onclick = () => { const d = dayOf(jDay); d.setDate(d.getDate() + 7); jGo("semaine", localDay(d)); };
    app.querySelectorAll("[data-wd]").forEach(b => b.onclick = () => jGo("jour", b.dataset.wd));
  }
  const isDoneAll = (j, k, bs) => { const w = bs.filter(b => b.act !== "pause"); return w.length > 0 && w.every(b => isDone(j, k, b)); };
  let jDay = null;
  // Grand écran (17 nov.) : une colonne à droite de la journée, pour ne pas laisser la moitié de l'écran vide :
  // le résumé du jour, les cartes à revoir et les prochains contrôles. Cachée sur téléphone (tout est déjà ailleurs).
  function jSide(j, list, school, freeMin) {
    const rev = list.filter(b => b.act !== "pause"), done = rev.filter(b => isDone(j, jDay, b)).length;
    const schoolMin = school.reduce((t, x) => t + mins(x.end) - mins(x.start), 0), due = state.cards ? dueCards(state.cards).length : 0;
    const ups = upCtrls().filter(x => x.c.d >= jDay).slice(0, 4);
    const line = (ic, b, t) => `<div class="jsl"><span class="jsi">${ic}</span><span><b>${b}</b><span class="small muted">${t}</span></span></div>`;
    return `<aside class="jside" aria-label="Résumé"><div class="card pad stack"><h3>${jDay === localDay() ? "Ta journée" : "Ce jour-là"}</h3>
      ${line(I.subj, school.length ? plural(school.length, "cours", "cours") : "Pas cours", school.length ? durTxt(schoolMin) + " au lycée" : "Journée libre")}
      ${line(I.clock, rev.length ? plural(rev.length, "révision", "révisions") : "Aucune révision", rev.length ? done + " faite" + (done > 1 ? "s" : "") + " sur " + rev.length : "Touche + pour en ajouter")}
      ${freeMin ? line(I.home, durTxt(freeMin) + " de libre", "Entre les cours et les révisions") : ""}
      ${due ? `<a class="btn" href="#cartes-jour">Réviser ${plural(due, "carte", "cartes")}</a>` : ""}</div>
      <div class="card pad stack"><h3>Prochains contrôles</h3>${ups.length ? ups.map(x => `<a class="jsctl" href="#matiere-${x.s.id}" style="--c:${esc(x.s.color)}"><span class="dot"></span><span class="grow"><b>${esc(x.s.name)}</b><span class="small muted">${dayOf(x.c.d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</span></span><span class="chev">${I.back}</span></a>`).join("") : `<p class="small muted">Aucun contrôle prévu. Ajoute-les avec le +, le planning de révision s'organise autour.</p>`}</div></aside>`;
  }
  function screenJournee() {
    drawTabs("calendrier"); nowTaskTick();
    const j = jGet(); jDay = jView().day;
    // Première ouverture : on demande l'emploi du temps (PDF ou photo), puis la semaine A ou B.
    if (!j.setup && !edtGet().slots.length) { j.setup = true; jSave(j); setTimeout(() => edtSetupSheet(), 300); }
    const sel = dayOf(jDay), mon = mondayOf(sel), week = [...Array(7)].map((_, i) => { const d = new Date(mon); d.setDate(d.getDate() + i); return localDay(d); });
    const today = localDay(), list = blocksOn(j, jDay), school = schoolOn(j, jDay), ab = weekAB(sel);
    const subj = id => state.subjects.find(x => x.id === id), colorOf = blockColor;
    const ctrlToday = upCtrls().filter(x => x.c.d === jDay), ctrlShown = new Set();
    const month = sel.toLocaleDateString("fr-FR", { month: "long" });
    // Frise : cours du lycée (gris) et blocs (couleur de la matière), avec les trous libres.
    const items = school.map(x => ({ school: true, start: x.start, dur: mins(x.end) - mins(x.start), x })).concat(list.map(b => ({ b, start: b.start, dur: b.dur }))).sort((a, b) => mins(a.start) - mins(b.start));
    let prevEnd = null, freeMin = 0; const rows = [];
    items.forEach(it => {
      const st = mins(it.start);
      if (prevEnd != null && st - prevEnd >= 30) freeMin += st - prevEnd;
      if (prevEnd != null && st - prevEnd >= 30) rows.push(`<button class="jgap" data-gap="${hm(prevEnd)}"><span>${durTxt(st - prevEnd)} de libre</span>${I.plus}</button>`);
      if (it.school) { const sj = subjOfName(it.x.subject), ct = sj && ctrlToday.find(x => x.s.id === sj.id && !ctrlShown.has(x)); if (ct) ctrlShown.add(ct); rows.push(`<div class="jrow school${ct ? " hasctl" : ""}"><span class="jpill" style="--c:${esc(sj ? sj.color : "#475569")};--h:${Math.min(96, Math.max(48, it.dur * .9))}px">${ct ? I.check : I.subj}</span><div class="jtxt"><span class="small muted">${esc(it.x.start)}–${esc(it.x.end)} (${durTxt(it.dur)})</span><b>${ct ? "Contrôle de " + esc(sj.name) : "Cours" + (sj ? " de " + esc(sj.name) : " : " + esc(it.x.subject))}</b>${ct ? `<a class="jctlink" href="#matiere-${sj.id}">${ct.c.ch && ct.c.ch.length ? plural(ct.c.ch.length, "chapitre", "chapitres") + " · " : ""}Réviser</a>` : ""}${it.x.room ? `<span class="small muted">Salle ${esc(it.x.room)}</span>` : ""}</div></div>`); }
      else { const b = it.b, done = isDone(j, jDay, b), s = subj(b.s), a = actOf(b.act), ch = b.ch && state.chapters.find(c => c.id === b.ch), auto = !b.ch && b.auto && b.s && bestChapter(b.s);
        const live = jDay === today && !done && mins(b.start) <= nowMin() && nowMin() < mins(b.start) + b.dur;
        rows.push(`<div class="jrow${done ? " done" : ""}${live ? " live" : ""}" ${live ? liveAttrs(b) + ` ` : ""}style="--c:${esc(colorOf(b))}${live ? ";--p:" + ((nowMin() - mins(b.start)) / b.dur * 100).toFixed(1) + "%" : ""}"><button class="jpill" data-go="${b.id}" style="--h:${Math.min(120, Math.max(48, b.dur * 1.1))}px" aria-label="Lancer : ${esc(b.title || a[1])}">${bIcon(b)}</button>
          <button class="jtxt" data-edit="${b.id}"><span class="small muted">${b.start}–${hm(mins(b.start) + b.dur)} (${durTxt(b.dur)})${b.weekly ? " · chaque semaine" : ""}</span><b>${esc(blockName(b))}</b>${live ? `<span class="small lrem">${remTxt(mins(b.start) + b.dur - nowMin())}</span>` : ""}${(() => { const cl = bChs(b).map(id => state.chapters.find(c => c.id === id).name); return cl.length ? `<span class="small muted">${esc(cl[0])}${cl.length > 1 ? " + " + (cl.length - 1) : ""}</span>` : auto ? `<span class="small muted">${esc(auto.name)}</span>` : ""; })()}</button>
          <button class="jcheck" data-done="${b.id}" role="checkbox" aria-checked="${done}" aria-label="Fait"><span>${done ? I.check : ""}</span></button></div>`); }
      prevEnd = Math.max(prevEnd || 0, st + it.dur);
    });
    // Contrôle d'une matière qui n'a pas d'heure de cours ce jour-là (ou pas d'emploi du temps) : une ligne en fin de journée.
    ctrlToday.filter(x => !ctrlShown.has(x)).forEach(x => rows.push(`<div class="jrow school hasctl"><span class="jpill" style="--c:${esc(x.s.color)};--h:48px">${I.check}</span><div class="jtxt"><b>Contrôle de ${esc(x.s.name)}</b><a class="jctlink" href="#matiere-${x.s.id}">${x.c.ch && x.c.ch.length ? plural(x.c.ch.length, "chapitre", "chapitres") + " · " : ""}Réviser</a></div></div>`));
    const dots = k => { const bs = blocksOn(j, k).filter(b => b.act !== "pause").slice(0, 4); return bs.map(b => `<i style="background:${esc(colorOf(b))}"></i>`).join(""); };
    app.innerHTML = `<div class="jnav"><button class="linkbtn" id="jup">${I.back}Calendrier</button><span class="grow"></span>${jDay !== today ? `<button class="btn sm" id="jback">Aujourd'hui</button>` : ""}<button class="btn sm ghost jai" id="jai" aria-label="Demander à l'IA d'organiser ta journée">${I.spark}IA</button><div class="jmwrap"><button class="iconbtn jmbtn" id="jmenu" aria-label="Ajouter" aria-haspopup="menu" aria-expanded="false">${I.plus}</button><div class="jmenu" id="jmenubox" role="menu" hidden><button role="menuitem" id="jadd">${I.clock}<span>Ajouter une révision</span></button><button role="menuitem" id="jctl">${I.check}<span>Ajouter un contrôle</span></button><button role="menuitem" id="joff" aria-pressed="${!!j.off[jDay]}">${I.home}<span>${j.off[jDay] ? "Remettre les cours" : "Pas cours ce jour-là"}</span></button></div></div></div><div class="jhead"><button class="jtitle" id="jtoday"><b>${sel.getDate()} ${esc(month)}</b> <span>${sel.getFullYear()}</span></button>${edtGet().ab && ab ? `<span class="pill">Sem. ${ab}</span>` : ""}</div>
      <div class="jweek"><button class="iconbtn flat" id="jprev" aria-label="Semaine précédente">${I.back}</button>${week.map(k => { const d = dayOf(k); return `<button class="jd${k === jDay ? " on" : ""}${k === today ? " now" : ""}" data-day="${k}"><span>${d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}</span><b>${d.getDate()}</b><span class="jdots">${dots(k)}</span></button>`; }).join("")}<button class="iconbtn flat" id="jnext" aria-label="Semaine suivante" style="transform:scaleX(-1)">${I.back}</button></div>
      <div class="jline">${rows.join("") || `<div class="card pad stack jempty"><b>Rien de prévu ${jDay === today ? "aujourd'hui" : "ce jour-là"}.</b><p class="small muted">Touche + en haut pour ajouter une révision ou un contrôle, ou « IA » pour l'organiser avec tes mots.</p></div>`}</div>
      ${edtGet().slots.length ? "" : `<button class="linkbtn" id="jedt">${I.cal}Ajouter mon emploi du temps</button>`}${jSide(j, list, school, freeMin)}`;
    const re = () => screenJournee();
    $("jup").onclick = () => jGo("mois");
    // En haut à droite (17 nov.) : « IA » (organiser la journée avec ses mots) et un seul « + » qui ouvre Ajouter une révision,
    // Ajouter un contrôle, Pas cours. Plus de bouton rond en bas : deux « + » qui ne faisaient pas la même chose, ce n'était pas clair.
    const mb = $("jmenubox"), closeM = () => { mb.hidden = true; $("jmenu").setAttribute("aria-expanded", "false"); document.removeEventListener("pointerdown", outM, true); };
    const outM = e => { if (!e.target.closest(".jmwrap")) closeM(); };
    $("jmenu").onclick = () => { if (!mb.hidden) return closeM(); mb.hidden = false; $("jmenu").setAttribute("aria-expanded", "true"); document.addEventListener("pointerdown", outM, true); };
    mb.querySelectorAll("button").forEach(b => b.addEventListener("click", closeM));
    app.querySelectorAll(".jweek [data-day]").forEach(b => b.onclick = () => jGo("jour", b.dataset.day));
    // Semaine précédente / suivante : on se place sur le lundi (ou sur aujourd'hui si c'est la semaine en cours).
    const weekJump = n => { const d = mondayOf(dayOf(jDay)); d.setDate(d.getDate() + 7 * n); const k = localDay(d); jGo("jour", localDay(mondayOf(new Date())) === k ? today : k); };
    if ($("jprev")) $("jprev").onclick = () => weekJump(-1);
    if ($("jnext")) $("jnext").onclick = () => weekJump(1);
    $("jtoday").onclick = () => jGo("jour", today);
    if ($("jback")) $("jback").onclick = () => jGo("jour", today);
    $("jctl").onclick = () => ctrlDaySheet(jDay, re);
    $("joff").onclick = () => { const x = jGet(); if (x.off[jDay]) delete x.off[jDay]; else x.off[jDay] = true; jSave(x); toast(x.off[jDay] ? "Pas cours ce jour-là : toute la journée est libre." : "Cours remis."); re(); };
    $("jadd").onclick = () => blockSheet(null);
    if ($("jedt")) $("jedt").onclick = () => edtSetupSheet();
    app.querySelectorAll("[data-gap]").forEach(b => b.onclick = () => blockSheet(null, b.dataset.gap));
    app.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => blockSheet(list.find(x => x.id === b.dataset.edit)));
    app.querySelectorAll("[data-done]").forEach(b => b.onclick = () => { const x = jGet(), key = jDay + "|" + b.dataset.done; if (x.done[key]) delete x.done[key]; else { x.done[key] = true; ping(true); } jSave(x); re(); });
    app.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { const bl = list.find(x => x.id === b.dataset.go); if (!(bl && goBlock(bl))) blockSheet(bl); });
    $("jai").onclick = () => aiSheet();
  }
  // Ajouter ou modifier un bloc : activité, matière, chapitre (choisi par Merge par défaut), heure, durée, répétition.
  // Nom affiché d'un bloc.
  function blockName(b) { const n = bSubs(b).map(id => state.subjects.find(x => x.id === id).name); return b.title || (b.act === "pause" ? "Pause" : actOf(b.act)[1] + (n.length ? " · " + n.join(" + ") : "")); }
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
    return `<div id="nowtask" class="stack">${cur ? `<a class="nowtask live" ${liveAttrs(cur)} href="#calendrier" data-blkgo="${cur.id}" style="--c:${esc(blockColor(cur))};--p:${p.toFixed(1)}%"><span class="ntfill"></span><span class="ntbody"><span class="small"><b>En cours</b> · <span class="lrem">${remTxt(mins(cur.start) + cur.dur - n)}</span></span><b class="ntname">${esc(blockName(cur))}</b><span class="small">${cur.start}–${hm(mins(cur.start) + cur.dur)}</span></span><span class="ntgo">${I.play}</span></a>` : ""}${nx ? `<a class="ntnext" href="#calendrier"><span class="dot" style="background:${esc(blockColor(nx))}"></span><span class="small">${cur ? "Ensuite" : "Prochaine tâche"} à <b>${nx.start}</b> : ${esc(blockName(nx))}</span></a>` : ""}</div>`;
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
  // Dicter : on enregistre la voix puis l'IA écrit ce qui a été dit (même résultat sur iPhone et sur PC, comprend « 14 h 15 »…).
  // Un appui = démarrer (bouton rouge), un appui = arrêter ; jamais bloqué : chaque étape a une limite de temps.
  // Si l'enregistrement n'existe pas sur l'appareil, on se rabat sur la dictée du navigateur.
  const canDictate = () => !!((navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder) || window.SpeechRecognition || window.webkitSpeechRecognition);
  function dictate(btn, field, after) {
    let st = "idle", mr = null, stream = null, stopT = null, rec = null;
    const set = s2 => { st = s2; btn.classList.toggle("on", s2 === "rec"); btn.classList.toggle("busy", s2 === "busy"); btn.setAttribute("aria-label", s2 === "rec" ? "Arrêter et écrire" : "Dicter"); btn.setAttribute("aria-pressed", String(s2 === "rec")); };
    const put = t => { const base = field.value.trim(); field.value = (base ? base + " " : "") + t; if (after) after(); field.dispatchEvent(new Event("input")); };
    const release = () => { clearTimeout(stopT); if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; };
    const canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
    btn.onclick = async () => {
      if (st === "busy") return;
      if (st === "rec") { if (mr && mr.state !== "inactive") { try { mr.stop(); } catch (e) { release(); set("idle"); } } else if (rec) { try { rec.stop(); } catch (e) {} set("idle"); } else { release(); set("idle"); } return; }
      if (!canRecord) {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return toast("La dictée n'est pas disponible ici.");
        rec = new SR(); rec.lang = "fr-FR"; rec.interimResults = true; const base = field.value;
        rec.onresult = e => { field.value = (base ? base + " " : "") + [...e.results].map(r => r[0].transcript).join(""); if (after) after(); };
        rec.onend = () => { rec = null; set("idle"); }; rec.onerror = () => { rec = null; set("idle"); };
        set("rec"); try { rec.start(); } catch (e) { rec = null; set("idle"); } return;
      }
      if (state.offline) return toast("Il faut être connecté à Internet pour dicter.");
      set("rec");
      try { stream = await Promise.race([navigator.mediaDevices.getUserMedia({ audio: true }), new Promise((_, ko) => setTimeout(() => ko(new Error("t")), 10000))]); }
      catch (e) { release(); set("idle"); return toast("Autorise le micro pour dicter (Réglages du téléphone > Merge ou Safari > Micro)."); }
      if (st !== "rec") { release(); return; }
      const chunks = [];
      try { mr = new MediaRecorder(stream); } catch (e) { release(); set("idle"); return toast("Le micro ne marche pas ici."); }
      mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      mr.onstop = async () => {
        const type = (mr && mr.mimeType) || "audio/mp4"; mr = null; release();
        const blob = new Blob(chunks, { type }); if (blob.size < 1500) { set("idle"); return toast("Je n'ai rien entendu. Garde le doigt loin du micro et parle normalement."); }
        set("busy"); const ph = field.placeholder; field.placeholder = "J'écris ce que tu as dit…";
        try {
          const data = await new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = ko; r.readAsDataURL(blob); });
          const r = await Promise.race([ai({ action: "transcrire", audio: { mime: type.split(";")[0], data } }, "studio"), new Promise((_, ko) => setTimeout(() => ko(new Error("La dictée a mis trop de temps. Réessaie.")), 30000))]);
          if (r && r.text) put(String(r.text).slice(0, 2000)); else toast("Je n'ai rien compris, réessaie.");
        } catch (e) { toast(e.message || "La dictée n'a pas marché."); }
        field.placeholder = ph; set("idle");
      };
      mr.start(250); stopT = setTimeout(() => { if (mr && mr.state !== "inactive") mr.stop(); }, 60000);
      toast("Je t'écoute… touche encore le micro quand tu as fini.");
    };
  }
  function blockSheet(b, at) {
    const j = jGet(), edit = !!b, v = Object.assign({ act: "cartes", s: null, ch: null, start: at || hm(Math.max(mins("17:00"), Math.ceil((new Date().getHours() * 60 + new Date().getMinutes()) / 15) * 15)), dur: 30, title: "", weekly: false }, b || {});
    const durs = [15, 20, 30, 45, 60, 90, 120, 150, 180];
    // Matières et chapitres : plusieurs possibles, tout est facultatif ; un 2e appui enlève.
    const ss = new Set(b ? bSubs(b) : []), cc = new Set(b ? bChs(b) : []); let autoCh = !!(b && b.auto);
    const paint = el => {
      const noSubj = v.act === "pause";
      el.querySelector("#bacts").innerHTML = ACTS.map(a => `<button type="button" class="actbtn" data-ba="${a[0]}" aria-pressed="${v.act === a[0]}">${I[a[2]]}<span>${a[1]}</span></button>`).join("");
      const sel = state.subjects.filter(x => ss.has(x.id)), one = sel.length === 1 ? bestChapter(sel[0].id) : null;
      el.querySelector("#bsubj").innerHTML = noSubj ? "" : `<span class="label">Matières (facultatif, plusieurs possibles)</span><div class="chips">${state.subjects.map(x => `<button type="button" class="chip" data-bs="${x.id}" aria-pressed="${ss.has(x.id)}" style="--c:${esc(x.color)}"><span class="dot"></span>${esc(x.name)}</button>`).join("") || '<span class="small muted">Ajoute d\'abord une matière.</span>'}</div>
        ${sel.map(x => { const l = state.chapters.filter(c => c.subject_id === x.id); return l.length ? `<div class="bchgrp" style="--c:${esc(x.color)}"><span class="small muted"><span class="dot"></span>Chapitres de ${esc(x.name)} (facultatif)</span><div class="chips">${l.map(c => `<button type="button" class="chip bchip" data-bch="${c.id}" aria-pressed="${cc.has(c.id)}">${cc.has(c.id) ? I.check : ""}${esc(c.name)}</button>`).join("")}</div></div>` : ""; }).join("")}
        ${one && ![...cc].some(id => (state.chapters.find(c => c.id === id) || {}).subject_id === sel[0].id) ? `<button type="button" class="switch" role="switch" id="bauto" aria-checked="${autoCh}"><i></i><span>Laisser Merge choisir le chapitre (${esc(one.name)})</span></button>` : ""}`;
      el.querySelector("#bcols").innerHTML = `<button type="button" class="bcol auto" data-bc="" aria-pressed="${!v.color}" aria-label="Couleur de la matière" style="--c:${esc(blockColor({ act: v.act, s: state.subjects.filter(x => ss.has(x.id)).map(x => x.id)[0] || null }))}"><i></i><span>Matière</span></button>` + BCOLORS.map(c => `<button type="button" class="bcol" data-bc="${c}" aria-pressed="${v.color === c}" aria-label="Couleur ${c}" style="--c:${c}"><i></i></button>`).join("");
      el.querySelectorAll("[data-bc]").forEach(x => x.onclick = () => { v.color = x.dataset.bc || null; paint(el); });
      el.querySelector("#bicwrap").hidden = v.act === "pause";
      el.querySelector("#bicons").innerHTML = `<button type="button" class="bic" data-bic="" aria-pressed="${!v.ic}" aria-label="Icône de l'activité">${I[actOf(v.act)[2]]}</button>` + BICONS.map(x => `<button type="button" class="bic" data-bic="${x[0]}" aria-pressed="${v.ic === x[0]}" aria-label="${x[1]}" title="${x[1]}">${I[x[0]]}</button>`).join("");
      el.querySelectorAll("[data-bic]").forEach(x => x.onclick = () => { v.ic = x.dataset.bic || null; paint(el); });
      el.querySelector("#bdurs").innerHTML = durs.map(d => `<button type="button" class="chip" data-bd="${d}" aria-pressed="${v.dur === d}">${durTxt(d)}</button>`).join("") + `<button type="button" class="chip" data-bd="libre" aria-pressed="${!durs.includes(v.dur)}">Autre</button>`;
      el.querySelector("#bfree").hidden = durs.includes(v.dur) && !v.free;
      el.querySelector("#bslide").value = v.dur; el.querySelector("#bslv").textContent = durTxt(v.dur);
      // « Autre » : n'importe quelle activité (sport, coloriage, devoir…), matière et chapitre facultatifs, aucune par défaut.
      el.querySelectorAll("[data-ba]").forEach(x => x.onclick = () => { v.act = x.dataset.ba; if (v.act === "pause" && v.dur > 15) v.dur = 5; paint(el); });
      el.querySelectorAll("[data-bs]").forEach(x => x.onclick = () => { const id = x.dataset.bs; if (ss.has(id)) { ss.delete(id); state.chapters.filter(c => c.subject_id === id).forEach(c => cc.delete(c.id)); } else ss.add(id); paint(el); });
      el.querySelectorAll("[data-bch]").forEach(x => x.onclick = () => { const id = x.dataset.bch; cc.has(id) ? cc.delete(id) : cc.add(id); paint(el); });
      if (el.querySelector("#bauto")) el.querySelector("#bauto").onclick = () => { autoCh = !autoCh; paint(el); };
      el.querySelectorAll("[data-bd]").forEach(x => x.onclick = () => { if (x.dataset.bd === "libre") { v.free = true; if (durs.includes(v.dur)) v.dur = Math.min(300, v.dur + 5); } else { v.free = false; v.dur = +x.dataset.bd; } paint(el); });
    };
    sheet(`<h1>${edit ? "Modifier" : "Ajouter au planning"}</h1>
      <div class="bsec"><span class="label">Activité</span><div class="actgrid" id="bacts"></div></div>
      <div class="bsec" id="bsubj"></div>
      <div class="bsec"><label class="label" for="bstart">Début</label><input id="bstart" class="btime" type="time" value="${esc(v.start)}"></div>
      <div class="bsec"><span class="label">Durée</span><div class="chips" id="bdurs"></div><div class="bfree" id="bfree" hidden><input type="range" id="bslide" min="5" max="300" step="5" aria-label="Durée en minutes"><b id="bslv"></b></div></div>
      <div class="bsec" id="bicwrap"><span class="label">Icône</span><div class="bicons" id="bicons"></div></div>
      <div class="bsec"><span class="label">Couleur</span><div class="bcols" id="bcols"></div></div>
      <div class="bsec"><label class="label" for="btitle">Nom (facultatif)</label><input id="btitle" type="text" maxlength="60" value="${esc(v.title || "")}" placeholder="${"Ex. Fiche sur la mitose, Sport, Devoir de philo…"}"></div>
      ${edit && b.weekly ? '<p class="small muted">Ce bloc revient chaque semaine.</p>' : `<button type="button" class="switch" role="switch" id="bweek" aria-checked="false"><i></i><span>Répéter chaque semaine</span></button>`}
      <div class="sheetfoot">${edit ? '<button class="btn ghost" id="bdel">Supprimer</button>' : ""}<button class="btn grow" id="bok">${edit ? "Enregistrer" : "Ajouter"}</button></div>`, el => {
      paint(el); let weekly = false;
      el.querySelector("#bslide").oninput = e => { v.dur = +e.target.value; v.free = true; el.querySelector("#bslv").textContent = durTxt(v.dur); el.querySelectorAll("[data-bd]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.bd === "libre" ? true : +x.dataset.bd === v.dur && false))); };
      if (el.querySelector("#bweek")) el.querySelector("#bweek").onclick = e => { weekly = !weekly; e.currentTarget.setAttribute("aria-checked", String(weekly)); };
      el.querySelector("#bok").onclick = () => {
        const pause = v.act === "pause", subs = pause ? [] : state.subjects.filter(x => ss.has(x.id)).map(x => x.id), chs = pause ? [] : [...cc].filter(id => subs.includes((state.chapters.find(c => c.id === id) || {}).subject_id));
        const x = jGet(), nb = { id: edit ? b.id : jid(), start: el.querySelector("#bstart").value || v.start, dur: v.dur, s: subs[0] || null, ch: chs[0] || null, act: v.act, title: el.querySelector("#btitle").value.trim().slice(0, 60) };
        if (subs.length > 1) nb.ss = subs; if (chs.length > 1) nb.chs = chs; if (v.color) nb.color = v.color; if (v.ic && v.act !== "pause") nb.ic = v.ic; if (autoCh && subs.length === 1 && !chs.length) nb.auto = true;
        if (v.act === "libre" && !nb.s && !nb.title) return toast("Donne un nom à ton activité.");
        if (edit && b.weekly) { const i = x.weekly.findIndex(y => y.id === b.id); if (i >= 0) x.weekly[i] = Object.assign(nb, { wd: b.wd }); }
        else if (!edit && weekly) x.weekly.push(Object.assign(nb, { wd: (dayOf(jDay).getDay() + 6) % 7 }));
        else { const l = x.blocks[jDay] || []; const i = l.findIndex(y => y.id === nb.id); if (i >= 0) l[i] = nb; else l.push(nb); x.blocks[jDay] = l; }
        jSave(x); closeSheet(); toast(edit ? "Modifié." : "Ajouté à ta journée."); screenJournee();
      };
      if (el.querySelector("#bdel")) el.querySelector("#bdel").onclick = async () => { if (!(await askConfirm("Supprimer ce bloc ?", (b.weekly ? "Il revient chaque semaine : il sera supprimé de toutes les semaines. " : "") + "« " + blockName(b) + " » sera retiré de ton planning."))) return; const x = jGet(); if (b.weekly) x.weekly = x.weekly.filter(y => y.id !== b.id); else x.blocks[jDay] = (x.blocks[jDay] || []).filter(y => y.id !== b.id); jSave(x); closeSheet(); toast("Supprimé."); screenJournee(); };
    });
  }
  // Aperçu d'un plan (fait par Merge ou par l'IA) avant de l'ajouter.
  function previewSheet(plan, intro, byDay) {
    const days = byDay || { [jDay]: plan }, all = Object.entries(days).filter(([, l]) => l.length);
    sheet(`<div class="row"><span class="mico big">${I.spark}</span><h1>Ton plan</h1></div><p class="muted">${intro}</p>
      ${all.map(([k, l]) => `${all.length > 1 || k !== jDay ? `<span class="label">${esc(fmtDate(k))}</span>` : ""}<div class="jprev">${l.map(b => { const s = state.subjects.find(x => x.id === b.s), a = actOf(b.act); return `<div class="row" style="--c:${esc(blockColor(b))}"><span class="jpill sm">${bIcon(b)}</span><span class="grow"><span class="small muted">${b.start} · ${durTxt(b.dur)}</span><br><b>${esc(blockName(b))}</b></span></div>`; }).join("")}</div>`).join("")}
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
          const ok = (r.blocks || []).map(b => ({ id: jid(), date: days.includes(b.date) ? b.date : jDay, start: /^([01]\d|2[0-3]):[0-5]\d$/.test(b.start || "") ? b.start : null, dur: Math.max(5, Math.min(240, Math.round(+b.dur || 0))), s: state.subjects.some(x => x.id === b.s) ? b.s : null, ch: state.chapters.some(c => c.id === b.ch && c.subject_id === b.s) ? b.ch : null, act: ACTS.some(a => a[0] === b.act) ? b.act : "libre", title: String(b.title || "").slice(0, 60), ...(BICONS.some(x => x[0] === b.ic) ? { ic: b.ic } : {}) })).filter(b => b.start && b.dur);
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
          const got = await edtRead(f, msg); if (!got.length) throw new Error("Je n'ai trouvé aucun cours. Essaie un fichier plus net.");
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

  // Contrôles d'un jour, depuis la frise : toucher une ou plusieurs matières, puis choisir les chapitres.
  function ctrlDaySheet(k, after) {
    const draw = el => {
      const onDay = ctrls().filter(c => c.d === k);
      // Contrôles déjà prévus ce jour : une ligne chacun avec un vrai bouton « Retirer » (avant : il fallait retoucher la matière).
      el.querySelector("#cdlist").innerHTML = onDay.map(c => { const x = state.subjects.find(y => y.id === c.s) || {}; return `<div class="cdrow" style="--c:${esc(x.color || "#9483ff")}"><span class="dot"></span><b class="grow">${esc(x.name || "Matière")}</b><button class="btn sm ghost softdel" data-cdrm="${c.id}">${I.trash}Retirer</button></div>`; }).join("");
      el.querySelectorAll("[data-cdrm]").forEach(b => b.onclick = async () => { const c = ctrls().find(x => x.id === b.dataset.cdrm), x = c && state.subjects.find(y => y.id === c.s); await ctrlDel(b.dataset.cdrm); toast("Contrôle" + (x ? " de " + x.name : "") + " retiré."); draw(el); });
      el.querySelector("#cdchips").innerHTML = state.subjects.filter(x => !onDay.some(c => c.s === x.id)).map(x => `<button class="chip" data-sub="${x.id}" aria-pressed="false" style="--c:${esc(x.color)}"><span class="dot"></span>&nbsp;${esc(x.name)}</button>`).join("") || (state.subjects.length ? '<span class="muted small">Toutes tes matières ont un contrôle ce jour-là.</span>' : '<span class="muted">Ajoute d\'abord une matière.</span>');
      el.querySelectorAll("[data-sub]").forEach(b => b.onclick = async () => {
        const sub = state.subjects.find(x => x.id === b.dataset.sub), have = ctrls().find(c => c.s === sub.id && c.d === k);
        if (have) { await ctrlDel(have.id); toast("Contrôle de " + sub.name + " retiré."); return draw(el); }
        if (isFree(sub)) { const err = await saveExam(sub.id, { date: null, free: false }); if (err) return fail(err, "Date non enregistrée"); }
        const c = await ctrlAdd(sub.id, k); if (c) ctrlChSheet(c.id, after); else draw(el);
      });
    };
    sheet(`<div class="row"><span class="mico big">${I.check}</span><h1>Contrôles</h1></div><p class="muted">${esc(fmtDate(k))}</p><div class="stack" id="cdlist"></div><p class="label">Ajouter un contrôle de</p><div class="chips" id="cdchips"></div><button class="btn ghost" id="cdok">Terminé</button>`, el => { draw(el); el.querySelector("#cdok").onclick = () => { closeSheet(); after(); }; });
  }
  // ---------- Prof : chat libre façon messagerie ----------
  // On peut parler de tout (cours, méthode, orientation…). Le bouton « Cours » lie à la discussion les chapitres et matières
  // qu'on veut : le prof s'appuie alors sur ces cours (lus côté serveur). Rien n'est obligatoire.
  // Discussions gardées dans merge.prof (synchronisée) : { cur, convs: [{ id, t, ctx: { ch: [], s: [] }, m: [messages], at }] }.
  // 1 message = 1 appel IA (fonction studio, action « exochat »).
  const PROF = "merge.prof", PROF_MAX = 20, MSG_MAX = 40;
  const EXO_QUICK = [["Fais-moi un exercice", "Fais-moi un exercice de niveau contrôle, sans la correction : je te donnerai ma réponse."], ["Un exercice facile", "Fais-moi un exercice facile pour démarrer, sans la correction."], ["Corrige ma copie", null], ["Explique la méthode", "Explique-moi la méthode pour réussir ce type d'exercice, étape par étape."], ["Donne-moi un indice", "Donne-moi juste un indice pour avancer, sans la solution."], ["La correction", "Donne-moi la correction complète et détaillée de l'exercice."]];
  const newConv = ctx => ({ id: "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: "", ctx: ctx || { ch: [], s: [] }, m: [], at: Date.now() });
  function profGet() {
    let p = jget(PROF, null);
    if (!p || !Array.isArray(p.convs)) {
      // Reprise des anciennes conversations par chapitre (merge.exo.<chapitre>).
      p = { cur: null, convs: [] };
      try { Object.keys(localStorage).filter(k => /^merge\.exo\./.test(k)).forEach(k => { const m = jget(k, []), ch = k.slice(10); if (Array.isArray(m) && m.length) { const c = newConv({ ch: [ch], s: [] }); c.m = m.slice(-MSG_MAX); c.t = String((m.find(x => x.r === "u") || {}).t || "").slice(0, 60); p.convs.push(c); } }); } catch (e) {}
    }
    p.convs = p.convs.filter(c => c && Array.isArray(c.m)).map(c => Object.assign(c, { ctx: { ch: (c.ctx && c.ctx.ch || []).filter(id => state.chapters.some(x => x.id === id)), s: (c.ctx && c.ctx.s || []).filter(id => state.subjects.some(x => x.id === id)) } }));
    let cur = p.convs.find(c => c.id === p.cur);
    if (!cur) { cur = p.convs.find(c => !c.m.length) || newConv(); if (!p.convs.includes(cur)) p.convs.unshift(cur); p.cur = cur.id; }
    return p;
  }
  function profSave(p) {
    p.convs = p.convs.filter(c => c.m.length || c.id === p.cur || c.ctx.ch.length || c.ctx.s.length).sort((a, b) => b.at - a.at).slice(0, PROF_MAX);
    p.convs.forEach(c => { if (c.m.length > MSG_MAX) c.m.splice(0, c.m.length - MSG_MAX); });
    let raw = JSON.stringify(p); while (raw.length > 900000 && p.convs.length > 1) { p.convs.pop(); raw = JSON.stringify(p); }
    safeSet(PROF, raw);
  }
  let profJustAnswered = false;
  const curConv = p => p.convs.find(c => c.id === p.cur);
  // Chapitres réellement envoyés : ceux cochés + tous ceux des matières liées (20 au plus).
  const ctxChapters = ctx => [...new Set(ctx.ch.concat(state.chapters.filter(c => ctx.s.includes(c.subject_id)).map(c => c.id)))].slice(0, 20);
  // Deux cartes de schéma de la même page dont les cadres se recoupent montrent le même schéma : on ne l'envoie et ne l'affiche qu'une fois.
  function sameSch(a, b) {
    if (!a || !b || a.image_path !== b.image_path) return false;
    const ba = schBox(a), bb = schBox(b); if (!ba || !bb) return false;
    const iy = Math.max(0, Math.min(ba[2], bb[2]) - Math.max(ba[0], bb[0])), ix = Math.max(0, Math.min(ba[3], bb[3]) - Math.max(ba[1], bb[1]));
    const inter = iy * ix, minA = Math.min((ba[2] - ba[0]) * (ba[3] - ba[1]), (bb[2] - bb[0]) * (bb[3] - bb[1]));
    return minA > 0 && inter / minA >= 0.3;
  }
  function schCaption(c) {
    const all = (state.cards || []).filter(x => x.chapter_id === c.chapter_id && sameSch(c, x));
    const backs = [...new Set([c, ...all].map(x => String(x.back || "").replace(/\s+/g, " ").replace(/\.$/, "").trim()).filter(Boolean))];
    const txt = backs.slice(0, 3).join(" · ");
    return txt.length > 130 ? txt.slice(0, 127) + "…" : (txt || "Schéma du cours");
  }
  function ctxSchemas(ctx) {
    const chIds = new Set(ctxChapters(ctx)), kept = [], out = [];
    for (const c of (state.cards || [])) {
      if (!chIds.has(c.chapter_id) || !schBox(c)) continue;
      if (kept.some(x => sameSch(x, c))) continue;
      kept.push(c);
      const ch = state.chapters.find(x => x.id === c.chapter_id);
      out.push({ id: String(c.id), chap: ch ? ch.name : "", label: schCaption(c) });
      if (out.length >= 40) break;
    }
    return out;
  }
  function profMd(text) {
    const parts = String(text || "").split(/\[\[\s*schema\s*:\s*([^\]]+?)\s*\]\]/gi), shown = [];
    let html = "";
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) { if (parts[i].trim()) html += md(parts[i]); continue; }
      const sid = parts[i].trim(), c = (state.cards || []).find(x => String(x.id) === sid);
      if (!c || !schBox(c) || shown.some(x => sameSch(x, c))) continue;
      shown.push(c);
      html += `<figure class="profsch" data-psch="${esc(c.id)}">${schemaHtml(c, false, "")}<figcaption class="profschcap"><span class="small muted">${mx(schCaption(c))}</span><button type="button" class="chip sm schbtn" data-schzoom="${esc(c.id)}">${I.search}Agrandir le schéma</button></figcaption></figure>`;
    }
    return html;
  }
  function ctxChips(ctx) {
    const subj = id => state.subjects.find(x => x.id === id) || {};
    return ctx.s.map(id => `<span class="pchip" style="--c:${esc(subj(id).color || "#9483ff")}"><span class="dot"></span><span class="pcn">${esc(subj(id).name || "")} · toute la matière</span><button class="pchipx" data-unctx="s:${id}" aria-label="Retirer ${esc(subj(id).name || "")}">${I.x}</button></span>`).join("")
      + ctx.ch.map(id => { const c = state.chapters.find(x => x.id === id) || {}, s = subj(c.subject_id); return `<span class="pchip" style="--c:${esc(s.color || "#9483ff")}"><span class="dot"></span><span class="pcn">${esc(c.name || "")}</span><button class="pchipx" data-unctx="c:${id}" aria-label="Retirer ${esc(c.name || "")}">${I.x}</button></span>`; }).join("");
  }
  // Comme dans les applis de chat : en rouvrant Merge (ou après 30 min ailleurs), l'onglet Prof s'ouvre sur une nouvelle
  // discussion ; les anciennes restent dans l'historique (☰).
  let profFresh = true, profHiddenAt = 0;
  // Retoucher l'onglet Prof quand on y est déjà : on repart sur une nouvelle discussion (comme rouvrir l'appli).
  document.addEventListener("merge:tabagain", e => { if (/^#exos/.test(e.detail)) profFresh = true; });
  document.addEventListener("visibilitychange", () => { if (document.hidden) profHiddenAt = Date.now(); else if (profHiddenAt && Date.now() - profHiddenAt > 30 * 60000) profFresh = true; });
  // Écran vide sans cours lié : les derniers chapitres travaillés, en un geste pour les lier.
  function recentChips() {
    const r = state.chapters.filter(c => cardsOf(c.id).length).slice(-3).reverse();
    if (!r.length) return "";
    return `<div class="precent"><span class="small muted">Tes derniers chapitres :</span><div class="chips">${r.map(c => { const s = state.subjects.find(x => x.id === c.subject_id) || {}; return `<button class="chip pchip" data-rch="${c.id}" style="--c:${esc(s.color || "#9483ff")}"><span class="rpill"><span class="dot"></span><span class="rct">${esc(c.name)}</span></span></button>`; }).join("")}</div></div>`;
  }
  function screenExos(arg) {
    drawTabs("exos");
    const p = profGet();
    if (profFresh) { profFresh = false; if (curConv(p).m.length) { const c = newConv(); p.convs.unshift(c); p.cur = c.id; profSave(p); } }
    // Ouvert depuis un chapitre (#exos-<id>) : on lie ce chapitre, dans une nouvelle discussion si la discussion en cours a déjà des messages.
    if (arg && state.chapters.some(c => c.id === arg) && !curConv(p).ctx.ch.includes(arg)) {
      let c = curConv(p); if (c.m.length) { c = newConv(); p.convs.unshift(c); p.cur = c.id; }
      c.ctx.ch.push(arg); c.at = Date.now(); profSave(p);
    }
    const conv = curConv(p), msgs = conv.m, linked = conv.ctx.ch.length + conv.ctx.s.length;
    const showTip = !linked && !msgs.length && !safeGet("merge.profTip");
    if (showTip) safeSet("merge.profTip", "1");
    app.classList.add("profmode");
    // Sur grand écran (PC) : historique toujours visible à gauche, conversation sur tout le reste.
    app.innerHTML = `<aside class="pside" aria-label="Mes discussions"><button class="btn" id="psnew">${I.plus}Nouvelle discussion</button><div class="pdlist">${histRows(p)}</div></aside><div class="pmain"><div class="row profhead"><button class="iconbtn flat" id="phist" aria-label="Mes discussions" title="Mes discussions">${I.menu}</button><h1 class="grow ptitle">${esc(conv.t || "Prof")}</h1><button class="iconbtn flat" id="pnew" aria-label="Nouvelle discussion" title="Nouvelle discussion">${I.edit}</button></div>
      <div class="pctx">${ctxChips(conv.ctx)}<button class="pchip add" id="pctx">${I.book}${linked ? "Modifier" : "Lier un cours"}</button></div>
      <div class="exthread" id="exth">${msgs.length ? msgs.map((m, i) => `<div class="exmsg ${m.r === "u" ? "me" : "ai"}">${m.r === "u" ? esc(m.t).replace(/\n/g, "<br>") + (m.img ? '<span class="small muted"> · photo envoyée</span>' : "") + (m.doc ? `<span class="small muted"> · ${esc(m.doc)}</span>` : "") : profMd(m.t) + qcmHtml(m, i) + fieldsHtml(m, i)}</div>`).join("") : `<div class="pempty"><span class="pico">${I.prof}</span><b>Pose-moi n'importe quelle question</b><p class="small muted">${linked ? "Je m'appuie sur tes cours liés." : "Un exercice, une explication ou un fichier joint avec +."}</p>${showTip ? `<div class="ptip" id="ptip"><span class="small grow">Lie un chapitre pour que le prof s'appuie sur ton cours.</span><button class="btn sm" id="ptipgo">Lier un cours</button><button class="iconbtn flat" id="ptipx" aria-label="Fermer">${I.x}</button></div>` : ""}${linked ? "" : recentChips()}</div>`}</div>
      <div class="pcomp"><div id="eximg" class="pimg" hidden></div><div class="pbar"><button class="iconbtn flat" id="pplus" aria-label="Ajouter une photo, un cours ou une demande rapide">${I.plus}</button><textarea id="exq" rows="1" maxlength="2000" placeholder="Écris ton message…"></textarea>${canDictate() ? `<button class="iconbtn flat" id="exmic" aria-label="Dicter">${I.mic}</button>` : ""}<button class="iconbtn psend" id="exsend" aria-label="Envoyer">${I.send}</button></div>
      <input id="exphoto" type="file" accept="image/*" capture="environment" hidden><input id="exfile" type="file" accept="${FILE_ACCEPT}" multiple hidden></div></div>`;
    const save = () => { conv.at = Date.now(); profSave(p); };
    // Cours liés.
    app.querySelectorAll("[data-unctx]").forEach(b => b.onclick = () => { const [k, id] = b.dataset.unctx.split(":"); conv.ctx[k === "s" ? "s" : "ch"] = conv.ctx[k === "s" ? "s" : "ch"].filter(x => x !== id); save(); screenExos(); });
    app.querySelectorAll("[data-rch]").forEach(b => b.onclick = () => { if (!conv.ctx.ch.includes(b.dataset.rch)) conv.ctx.ch.push(b.dataset.rch); save(); screenExos(); });
    $("pctx").onclick = () => ctxSheet(conv, () => { save(); screenExos(); });
    if ($("ptipgo")) $("ptipgo").onclick = () => { if ($("ptip")) $("ptip").remove(); $("pctx").click(); };
    if ($("ptipx")) $("ptipx").onclick = () => { if ($("ptip")) $("ptip").remove(); };
    $("pnew").onclick = () => { if (!msgs.length && !linked) return toast("Tu es déjà dans une nouvelle discussion."); const c = newConv(); p.convs.unshift(c); p.cur = c.id; profSave(p); screenExos(); };
    $("phist").onclick = () => histDrawer(p);
    $("psnew").onclick = () => $("pnew").click();
    histBind(app.querySelector(".pside"), p, what => { if (what === "del") screenExos(); });
    // Quiz interactif dans la bulle : on touche une réponse, elle est corrigée tout de suite avec l'explication.
    // (on ne redessine que le quiz, pour ne pas faire sauter la conversation).
    const wireQcm = () => app.querySelectorAll("[data-qa]").forEach(b => b.onclick = () => {
      const [i, k, c] = b.dataset.qa.split("-").map(Number), m = msgs[i]; if (!m || !m.q || !m.q[k] || m.q[k].a != null) return;
      m.q[k].a = c; save(); ping(c === m.q[k].b);
      const box = app.querySelector(`[data-qbox="${i}"]`); if (box) { box.outerHTML = qcmHtml(m, i); renderMath(app); wireQcm(); }
    });
    wireQcm();
    // Réponses dans la bulle : l'IA donne un exercice avec des champs à remplir.
    app.querySelectorAll("[data-fsend]").forEach(b => b.onclick = () => {
      const i = +b.dataset.fsend, m = msgs[i]; if (!m || !m.f) return;
      const vals = m.f.map((_, k) => (app.querySelector(`[data-fv="${i}-${k}"]`) || {}).value || "").map(v => v.trim());
      if (!vals.some(Boolean)) return toast("Écris au moins une réponse.");
      m.rep = vals; save();
      $("exq").value = "Mes réponses :\n" + m.f.map((l, k) => "- " + l + " : " + (vals[k] || "(pas répondu)")).join("\n") + "\nCorrige-moi : dis ce qui est juste et où je me trompe.";
      send();
    });
    // Façon de répondre : dans des cases ici, ou sur le cahier puis une photo de la copie.
    app.querySelectorAll("[data-fmode]").forEach(b => b.onclick = () => { const m = msgs[+b.dataset.fmode]; if (!m) return; m.ici = b.dataset.m === "ici"; m.cahier = !m.ici; save(); screenExos(); });
    app.querySelectorAll("[data-fphoto]").forEach(b => b.onclick = () => $("exphoto").click());
    // Défilement : on montre le début de la dernière réponse du prof (comme dans une appli de chat), sinon le bas.
    const th = $("exth"), lastAi = th.querySelector(".exmsg.ai:last-child");
    if (lastAi && profJustAnswered) th.scrollTop = Math.max(0, lastAi.offsetTop - th.offsetTop - 8); else th.scrollTop = th.scrollHeight;
    profJustAnswered = false;
    const q = $("exq"), grow = () => { q.style.height = "auto"; q.style.height = Math.min(160, q.scrollHeight) + "px"; };
    q.oninput = grow;
    q.addEventListener("focus", () => document.body.classList.add("typing"));
    q.addEventListener("blur", () => setTimeout(() => { if (document.activeElement !== q) document.body.classList.remove("typing"); }, 100));
    q.onkeydown = e => { if (e.key === "Enter" && !e.shiftKey && matchMedia("(hover: hover)").matches) { e.preventDefault(); send(); } };
    // Photo jointe (bouton +) : aperçu au-dessus du champ, retirable.
    let img = null, docImgs = []; // docImgs : pages en image du fichier joint, envoyées avec le prochain message (pas gardées sur l'appareil)
    const showImg = () => { const el = $("eximg"); el.hidden = !img; el.innerHTML = img ? `<img src="data:image/jpeg;base64,${img.data}" alt="Photo jointe"><span class="small">Photo prête</span><button class="iconbtn flat" id="pimgx" aria-label="Retirer la photo">${I.x}</button>` : ""; if (img) $("pimgx").onclick = () => { img = null; showImg(); }; };
    const onPhoto = async e => { const f = e.target.files[0]; e.target.value = ""; if (!f) return; try { img = await shrinkImage(f); showImg(); if (!q.value.trim()) q.value = "Voici ma copie : dis-moi ce qui est juste dans mon raisonnement et où je me suis trompé."; grow(); } catch (er) { toast("Photo illisible."); } };
    // Fichiers joints (17 nov.) : tous les formats de l'import (PDF, PowerPoint, Word, LibreOffice, texte, photos), lus sur
    // l'appareil avec les mêmes lecteurs. Le texte est gardé dans la discussion (le prof s'en sert à chaque message) ;
    // les pages en image (scans, schémas) partent avec le message suivant. Une seule photo = comme avant (copie à corriger).
    const showDoc = m => { const el = $("eximg"); el.hidden = !conv.doc && !m; el.innerHTML = m ? `<span class="spin" aria-hidden="true"></span><span class="small">${esc(m)}</span>` : conv.doc ? `<span class="mico">${I.book}</span><span class="small grow"><b>${esc(conv.doc.name)}</b><br>${docImgs.length ? plural(docImgs.length, "page en image", "pages en image") + " · " : ""}lu par le prof dans cette discussion</span><button class="iconbtn flat" id="pdocx" aria-label="Retirer le fichier">${I.x}</button>` : ""; if ($("pdocx")) $("pdocx").onclick = () => { delete conv.doc; docImgs = []; save(); showDoc(); }; };
    const onFiles = async e => {
      const files = [...e.target.files]; e.target.value = ""; if (!files.length) return;
      if (files.length === 1 && (files[0].type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(files[0].name))) return onPhoto({ target: { files, value: "" } });
      const fs = [], notes = [], budget = { pages: 0, max: 12, cut: false }, R = fileReaders({}, m => showDoc(m));
      try { for (const f of files) await R.readOne(f, fs, budget, notes, false); }
      catch (er) { showDoc(); return toast(er.message || "Fichier illisible."); }
      const text = fs.filter(x => x.text).map(x => x.text).join("\n\n").slice(0, 60000), pend = fs.filter(x => x.img).map(x => x.img).slice(0, 8);
      if (!text.trim() && !pend.length) { showDoc(); return toast(notes[0] || "Je n'ai rien trouvé à lire dans ce fichier."); }
      conv.doc = { name: files.map(f => f.name).join(", ").slice(0, 120), text, fresh: true }; docImgs = pend; save(); showDoc();
      if (budget.cut || notes.length) toast(budget.cut ? "Seules les 12 premières pages en image sont envoyées." : notes[0]);
      if (!q.value.trim()) { q.value = "Voici mon document : "; grow(); q.focus(); }
    };
    $("exphoto").onchange = onPhoto; $("exfile").onchange = onFiles;
    if (conv.doc) showDoc();
    $("pplus").onclick = () => sheet(`<h1>Ajouter</h1><div class="actgrid pact"><button class="actbtn" id="pa-cam">${I.cam}<span>Prendre une photo</span></button><button class="actbtn" id="pa-img">${I.up}<span>Joindre un fichier<small>PDF, PowerPoint, Word, photo…</small></span></button><button class="actbtn" id="pa-ctx">${I.book}<span>Lier un cours</span></button></div><span class="label">Demandes rapides</span><div class="pqchips">${EXO_QUICK.map((x, i) => x[1] ? `<button class="chip" data-pq="${i}">${x[0]}</button>` : "").join("")}</div>`, el => {
      el.querySelectorAll("[data-pq]").forEach(b => b.onclick = () => { closeSheet(); q.value = EXO_QUICK[+b.dataset.pq][1]; send(); });
      el.querySelector("#pa-cam").onclick = () => { closeSheet(); $("exphoto").click(); };
      el.querySelector("#pa-img").onclick = () => { closeSheet(); $("exfile").click(); };
      el.querySelector("#pa-ctx").onclick = () => { closeSheet(); $("pctx").click(); };
    });
    if ($("exmic")) dictate($("exmic"), q, grow);
    app.querySelectorAll("[data-q]").forEach(b => b.onclick = () => { const x = EXO_QUICK[+b.dataset.q]; if (!x[1]) { $("pplus").click(); return; } q.value = x[1]; send(); });
    $("exsend").onclick = () => send();
    async function send() {
      const t = q.value.trim(); if (!t && !img && !(conv.doc && conv.doc.fresh)) return toast("Écris ton message.");
      if (state.offline) return toast("Il faut être connecté à Internet pour l'IA.");
      const docNew = conv.doc && conv.doc.fresh ? conv.doc : null, mine = Object.assign({ r: "u", t: t || "Voici ma copie.", img: !!img }, docNew ? { doc: conv.doc.name } : {}); msgs.push(mine); if (!conv.t) conv.t = mine.t.slice(0, 60); save();
      $("exsend").disabled = true; q.value = ""; grow();
      const pe = th.querySelector(".pempty"); if (pe) pe.remove();
      th.insertAdjacentHTML("beforeend", `<div class="exmsg me">${esc(mine.t).replace(/\n/g, "<br>")}${img ? '<span class="small muted"> · photo envoyée</span>' : ""}</div><div class="exmsg ai wait"><span class="spin" aria-hidden="true"></span> Je réfléchis…</div>`); th.scrollTop = th.scrollHeight;
      const photo = img; img = null; showImg();
      try {
        const subjNames = conv.ctx.s.map(id => (state.subjects.find(x => x.id === id) || {}).name).filter(Boolean);
        const r = await ai({ action: "exochat", want_title: !conv.named, chapter_ids: ctxChapters(conv.ctx), matieres: subjNames, schemas: ctxSchemas(conv.ctx), messages: msgs.slice(-12).map(m => ({ r: m.r, t: m.t })), image: photo, doc: conv.doc ? { name: conv.doc.name, text: conv.doc.text, images: docImgs } : undefined }, "studio");
        if (conv.doc && conv.doc.fresh) { delete conv.doc.fresh; docImgs = []; save(); showDoc(); }
        if (!conv.named && r.title) { conv.t = String(r.title).slice(0, 60); conv.named = true; }
        const qcm = cleanQcm(r.qcm);
        msgs.push(Object.assign({ r: "a", t: String(r.answer || "").slice(0, 8000) }, qcm.length ? { q: qcm } : Array.isArray(r.fields) && r.fields.length ? { f: r.fields.map(x => String(x).slice(0, 120)).slice(0, 6) } : {})); save();
        profJustAnswered = true; if (location.hash.startsWith("#exos")) screenExos();
      } catch (e) { const w = th.querySelector(".wait"); if (w) { w.classList.remove("wait"); w.textContent = e.message || "L'IA n'a pas répondu. Réessaie."; } $("exsend").disabled = false; }
    }
  }
  // Choisir les cours liés : des matières entières et/ou des chapitres, dans n'importe quelle matière.
  function ctxSheet(conv, done) {
    const ch = new Set(conv.ctx.ch), ss = new Set(conv.ctx.s);
    const list = state.subjects.map(s => ({ s, l: state.chapters.filter(c => c.subject_id === s.id) })).filter(x => x.l.length);
    const row = (c, s) => { const on = ss.has(s.id) || ch.has(c.id); return `<button type="button" class="ctxrow" data-cc="${c.id}" data-sid="${s.id}" aria-pressed="${on}"${ss.has(s.id) ? " disabled" : ""}><span class="ctxbox">${I.check}</span><span class="grow">${esc(c.name)}</span></button>`; };
    sheet(`<h1>Cours liés</h1><p class="muted small">Le prof s'appuiera sur ces cours. Coche des chapitres, ou toute une matière.</p>
      <div class="ctxlist">${list.map(({ s, l }) => `<div class="ctxsub" style="--c:${esc(s.color)}"><div class="ctxhead"><span class="dot"></span><b class="grow">${esc(s.name)}</b><button type="button" class="switch" role="switch" data-cs="${s.id}" aria-checked="${ss.has(s.id)}"><i></i><span>Toute la matière</span></button></div>${l.map(c => row(c, s)).join("")}</div>`).join("") || '<p class="muted">Crée d\'abord un chapitre dans Matières.</p>'}</div>
      <div class="sheetfoot"><button class="btn ghost" id="pctxnone">Aucun cours</button><button class="btn grow" id="pctxok">Valider</button></div>`, el => {
      el.querySelectorAll("[data-cs]").forEach(b => b.onclick = () => {
        const id = b.dataset.cs, on = !ss.has(id); on ? ss.add(id) : ss.delete(id); b.setAttribute("aria-checked", String(on));
        el.querySelectorAll(`[data-sid="${id}"]`).forEach(c => { c.disabled = on; if (on) ch.delete(c.dataset.cc); c.setAttribute("aria-pressed", String(on || ch.has(c.dataset.cc))); });
      });
      el.querySelectorAll("[data-cc]").forEach(b => b.onclick = () => { const id = b.dataset.cc, on = !ch.has(id); on ? ch.add(id) : ch.delete(id); b.setAttribute("aria-pressed", String(on)); });
      el.querySelector("#pctxnone").onclick = () => { conv.ctx = { ch: [], s: [] }; closeSheet(); done(); };
      el.querySelector("#pctxok").onclick = () => { conv.ctx = { ch: [...ch].filter(id => !ss.has((state.chapters.find(c => c.id === id) || {}).subject_id)), s: [...ss] }; closeSheet(); done(); };
    });
  }
  // Mes discussions : panneau qui glisse depuis la gauche (bouton ☰), comme dans une appli de chat. Nom donné automatiquement par l'IA.
  // Glisser le doigt vers la droite sur l'écran Prof ouvre l'historique (comme dans les applis de chat) ; vers la gauche le referme.
  (() => {
    let sx = 0, sy = 0, t0 = 0, okSwipe = false;
    // Bord gauche ou droit de l'écran : iPhone y lance le geste « retour en arrière » des sites web. Dans l'appli on le coupe
    // (sauf sur un bouton ou un champ, pour que les appuis marchent toujours) ; sur l'écran Prof ce geste ouvre l'historique.
    document.addEventListener("touchstart", e => { const t = e.touches[0]; if ((t.clientX < 22 || t.clientX > innerWidth - 22) && !(e.target.closest && e.target.closest("a,button,input,textarea,select,label,[role=button],.sheetwrap"))) e.preventDefault(); }, { passive: false });
    document.addEventListener("touchstart", e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; t0 = Date.now(); okSwipe = e.touches.length === 1 && !(e.target.closest && e.target.closest(".pctx,.chips,.pqchips,pre,.katex-display,textarea,input,.sheetwrap,table")); }, { passive: true });
    document.addEventListener("touchend", e => {
      if (!okSwipe) return; const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dy) > 60 || Math.abs(dx) < Math.abs(dy) * 1.5 || Date.now() - t0 > 800) return;
      const pd = document.getElementById("pdrawer");
      if (pd && dx < -60) { const c = pd.querySelector("[data-pdclose]"); if (c) c.click(); return; }
      if (!pd && dx > 70 && app.classList.contains("profmode") && !document.getElementById("sheet")) histDrawer(profGet());
    }, { passive: true });
  })();
  // Liste des discussions (panneau du téléphone et colonne fixe du PC).
  function histRows(p) {
    const list = p.convs.filter(c => c.m.length).sort((a, b) => b.at - a.at), today = localDay();
    const when = c => { const d = localDay(new Date(c.at)); if (d === today) return "Aujourd'hui"; const y = new Date(); y.setDate(y.getDate() - 1); if (d === localDay(y)) return "Hier"; return Date.now() - c.at < 7 * 864e5 ? "7 derniers jours" : "Plus ancien"; };
    const label = c => { const n = c.ctx.ch.length + c.ctx.s.length; return n ? plural(n, "cours lié", "cours liés") : "Discussion libre"; };
    let last = "", rows = "";
    list.forEach(c => { const g = when(c); if (g !== last) { rows += `<p class="label pdgrp">${g}</p>`; last = g; } rows += `<div class="pdrow${c.id === p.cur ? " on" : ""}"><button class="pdconv" data-conv="${c.id}"><b>${esc(c.t || "Discussion")}</b><span class="small muted">${label(c)}</span></button><button class="iconbtn flat" data-cdel="${c.id}" aria-label="Supprimer la discussion">${I.x}</button></div>`; });
    return rows || '<p class="muted small">Aucune discussion pour l\'instant.</p>';
  }
  // Ouvrir / supprimer une discussion. Supprimer : on demande confirmation, puis on reste dans l'historique
  // (la discussion ouverte ne change que si c'est elle qu'on supprime).
  function histBind(el, p, after) {
    el.querySelectorAll("[data-conv]").forEach(b => b.onclick = () => { p.cur = b.dataset.conv; profSave(p); after("open"); screenExos(); });
    el.querySelectorAll("[data-cdel]").forEach(b => b.onclick = async () => {
      const c = p.convs.find(x => x.id === b.dataset.cdel); if (!c) return;
      if (!(await askConfirm("Supprimer cette discussion ?", "« " + (c.t || "Discussion") + " » sera effacée. Tu ne pourras pas la récupérer."))) return;
      const wasCur = p.cur === c.id; p.convs = p.convs.filter(x => x.id !== c.id); if (wasCur) p.cur = null; profSave(p);
      after("del", wasCur); toast("Discussion supprimée.");
    });
  }
  function histDrawer(p) {
    const old = document.getElementById("pdrawer"); if (old) old.remove();
    const el = document.createElement("div"); el.id = "pdrawer"; el.className = "pdwrap";
    el.innerHTML = `<div class="pdshade" data-pdclose></div><aside class="pdpanel" role="dialog" aria-label="Mes discussions"><div class="row"><h2 class="grow" style="margin:0">Discussions</h2><button class="iconbtn flat" data-pdclose aria-label="Fermer">${I.x}</button></div><button class="btn" id="pdnew">${I.plus}Nouvelle discussion</button><div class="pdlist">${histRows(p)}</div></aside>`;
    document.body.appendChild(el); requestAnimationFrame(() => el.classList.add("open"));
    const close = () => { el.classList.remove("open"); setTimeout(() => el.remove(), 200); };
    el.querySelectorAll("[data-pdclose]").forEach(b => b.onclick = close);
    el.querySelector("#pdnew").onclick = () => { el.remove(); $("pnew").click(); };
    histBind(el, p, (what, wasCur) => {
      if (what === "open") { el.remove(); return; }
      if (wasCur) screenExos();
      el.remove(); histDrawer(profGet()); const nd = document.getElementById("pdrawer"); if (nd) nd.classList.add("open");
    });
  }
  // Champs de réponse d'un message de l'IA : choix de la façon de répondre, cases à remplir, ou réponses déjà envoyées.
  // Quiz rendu par le prof : [{ q, c: [choix], b: index de la bonne, e: explication, a: choix de l'élève }].
  function cleanQcm(x) {
    return (Array.isArray(x) ? x : []).map(o => ({ q: String(o && o.q || "").slice(0, 400), c: (Array.isArray(o && o.choix) ? o.choix : []).map(v => String(v).slice(0, 200)).slice(0, 5), b: Number(o && o.bonne), e: String(o && o.explication || "").slice(0, 600) })).filter(o => o.q && o.c.length >= 2 && o.b >= 0 && o.b < o.c.length).slice(0, 10);
  }
  function qcmHtml(m, i) {
    if (!Array.isArray(m.q) || !m.q.length) return "";
    const done = m.q.filter(o => o.a != null), ok = done.filter(o => o.a === o.b).length;
    return `<div class="pqcm" data-qbox="${i}">${m.q.map((o, k) => `<div class="pq${o.a != null ? (o.a === o.b ? " ok" : " ko") : ""}"><b>${k + 1}. ${mx(o.q)}</b><div class="pqc">${o.c.map((c, j) => `<button class="pqo${o.a != null && j === o.b ? " good" : ""}${o.a === j && j !== o.b ? " bad" : ""}" data-qa="${i}-${k}-${j}"${o.a != null ? " disabled" : ""}>${mx(c)}</button>`).join("")}</div>${o.a != null && o.e ? `<p class="small pqe">${mx(o.e)}</p>` : ""}</div>`).join("")}${done.length === m.q.length ? `<p class="pqscore"><b>${ok} / ${m.q.length}</b> ${ok === m.q.length ? "Parfait !" : ok >= m.q.length / 2 ? "Bien joué." : "Relis les explications, puis demande-moi un autre quiz."}</p>` : ""}</div>`;
  }
  function fieldsHtml(m, i) {
    if (!Array.isArray(m.f) || !m.f.length) return "";
    if (m.rep) return `<div class="exform done">${m.f.map((l, k) => `<div class="exf"><span class="small muted">${esc(l)}</span><b>${esc(m.rep[k] || "—")}</b></div>`).join("")}</div>`;
    if (m.cahier) return `<div class="exform"><p class="small muted">Fais l'exercice sur ton cahier, puis envoie la photo de ta copie : je te dis ce qui est juste et où ça coince.</p><div class="row" style="flex-wrap:wrap"><button class="btn sm" data-fphoto="${i}">${I.cam}Envoyer ma copie</button><button class="btn sm ghost" data-fmode="${i}" data-m="ici">Répondre ici plutôt</button></div></div>`;
    if (!m.ici) return `<div class="exform"><p class="small"><b>Comment veux-tu répondre ?</b></p><div class="row" style="flex-wrap:wrap"><button class="btn sm" data-fmode="${i}" data-m="ici">Ici, dans des cases</button><button class="btn sm ghost" data-fmode="${i}" data-m="cahier">Sur mon cahier, puis une photo</button></div></div>`;
    return `<div class="exform">${m.f.map((l, k) => `<label class="exf"><span class="small">${esc(l)}</span><textarea rows="1" data-fv="${i}-${k}" placeholder="Ta réponse"></textarea></label>`).join("")}<div class="row" style="flex-wrap:wrap"><button class="btn sm" data-fsend="${i}">Envoyer mes réponses</button><button class="btn sm ghost" data-fmode="${i}" data-m="cahier">Sur mon cahier</button></div></div>`;
  }
  // Photo de copie : réduite (1 600 px, JPEG) avant l'envoi.
  async function shrinkImage(f) {
    const bmp = await createImageBitmap(f), k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), cv = document.createElement("canvas");
    cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k); cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
    return { mime: "image/jpeg", data: cv.toDataURL("image/jpeg", 0.82).split(",")[1] };
  }
  // ---------- modes : apprendre, quiz, contrôle ----------
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  // Mauvaises propositions qui ressemblent à la bonne réponse (quiz avec les cartes, mode Apprendre, textes à trous déjà générés) :
  // même nature (nombre, formule, mot court, phrase), longueur proche, mots en commun, même unité, même terminaison.
  // Sinon un nombre se repérait tout seul au milieu de mots, ou une phrase longue au milieu de réponses d'un mot.
  function lookalikes(target, pool, n, key) {
    key = key || (x => x);
    const nz = t => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\$[^$]*\$/g, " formule ").replace(/[^a-z0-9]+/g, " ").trim();
    const kind = t => { const x = String(t || "").trim(), w = nz(x).split(" ").filter(Boolean).length; return /\$/.test(x) ? "tex" : /^[-+−]?[\d.,\s]+(\s*[a-zA-Zµ°%/·²³⁻¹Ω]{0,8})?$/.test(x) ? "num" : w <= 3 ? "mot" : w <= 10 ? "groupe" : "phrase"; };
    const words = t => new Set(nz(t).split(" ").filter(w => w.length >= 4));
    const unit = t => (String(t || "").match(/\d\s*([a-zA-Zµ°%Ω][a-zA-Z0-9µ°%Ω/·²³⁻¹]*)\s*$/) || [])[1] || "";
    const T = String(target || ""), tk = kind(T), tw = words(T), tl = Math.max(1, T.length), tn = nz(T), tu = unit(T);
    const seen = new Set([tn]), cand = [];
    for (const item of pool) {
      const v = String(key(item) || ""), vn = nz(v); if (!vn || seen.has(vn)) continue; seen.add(vn);
      const vw = words(v), inter = [...vw].filter(w => tw.has(w)).length, uni = new Set([...vw, ...tw]).size || 1;
      let sc = (kind(v) === tk ? 4 : 0) + 2 * Math.min(tl, v.length) / Math.max(tl, v.length) + 3 * inter / uni;
      if (tu && unit(v) === tu) sc += 1.5;
      if (tk === "mot" && vn.slice(-2) === tn.slice(-2)) sc += 0.5;
      if (/^[A-ZÀ-Ý]/.test(v.trim()) === /^[A-ZÀ-Ý]/.test(T.trim())) sc += 0.3;
      cand.push({ item, sc: sc + Math.random() * 0.8 });
    }
    return cand.sort((a, b) => b.sc - a.sc).slice(0, n).map(c => c.item);
  }
  window.__mergeLookalikes = lookalikes;
  async function chapterCards(id) {
    const local = () => cardsOf(id).filter(c => c.front).map(c => ({ id: c.id, front: c.front, back: c.back }));
    if (state.offline) return local();
    let r; try { r = await sb.from("cards").select("id,front,back").eq("chapter_id", id); } catch (e) { return local(); }
    if (r.error) { const l = local(); if (!l.length) fail(r.error, "Cartes non chargées"); return l; } return r.data || [];
  }
  // kind : "apprendre" (QCM, les erreurs reviennent), "quiz" (QCM ou rédigé, note), "controle" (complet, note sur 20), "blanc" (chronométré).
  // Quiz et contrôle sont écrits par l'IA à partir du cours (1 appel, gardé ensuite) ; sans IA, ils se font avec les cartes.
  let midQuiz = null;
  let freshAi = false;
  // Nouvelles cartes à partir du cours, sans refaire celles qui existent déjà.
  async function moreCards(id, btn, n) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) return;
    const label = btn ? btn.innerHTML : ""; if (btn) { btn.disabled = true; btn.textContent = "L'IA écrit de nouvelles cartes…"; }
    try {
      const text = await courseText(id); if (text.trim().length < 80) throw new Error("Importe d'abord ton cours dans ce chapitre.");
      const have = cardsOf(id), seen = new Set(have.map(c => norm(c.front)));
      const r = await ai({ action: "generate", text, n: n || 20, avoid: have.map(c => c.front).filter(Boolean).slice(-200) });
      const nt = norm(text), fresh = (r.cards || []).filter(c => c && c.front && c.back && !seen.has(norm(c.front)));
      if (!fresh.length) throw new Error("Ton cours est déjà entièrement couvert par tes cartes. Importe un autre cours ou un complément pour en créer d'autres.");
      const ins = await sb.from("cards").insert(fresh.map(c => ({ chapter_id: id, front: String(c.front).slice(0, 500), back: String(c.back).slice(0, 2000), source_quote: c.source_quote ? String(c.source_quote).slice(0, 400) : null, needs_check: !c.source_quote || !nt.includes(norm(c.source_quote).slice(0, 60)) })));
      if (ins.error) throw ins.error;
      await loadAll(); toast(plural(fresh.length, "nouvelle carte créée", "nouvelles cartes créées") + "."); location.hash = "#cartes-" + id;
    } catch (e) { if (btn) { btn.disabled = false; btn.innerHTML = label; } toast(e.code === "quota" ? QUOTA_MSG : (e.message || "Création impossible.")); }
  }
  async function screenQuestions(id, kind) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; app.innerHTML = `<p class="muted">Chargement…</p>`;
    const all = await chapterCards(id), back = "#chapitre-" + id, here = location.hash;
    const top = (t) => `<div class="row"><a class="iconbtn" href="${back}" aria-label="Fermer">${I.x}</a><div class="grow" style="text-align:center;font-weight:800">${t}</div><span style="width:44px"></span></div>`;
    if (kind === "controle" && mastery(cardsOf(id)) < 100) { app.innerHTML = top("Contrôle") + `<div class="card done"><div class="tutoicon">${I.lock}</div><h1>Pas encore débloqué</h1><p class="muted">Le contrôle s'ouvre quand tu atteins 100 % de maîtrise sur ce chapitre. Tu en es à ${mastery(cardsOf(id))} %.</p><div class="bar" style="width:100%"><i style="width:${mastery(cardsOf(id))}%"></i></div><a class="btn" href="#cartes-${id}">Réviser les cartes</a></div>`; return; }
    if (all.length < 4) { app.innerHTML = top(ch.name) + `<div class="card done"><p class="muted">Il faut au moins 4 cartes dans ce chapitre pour ce mode.</p><a class="btn" href="${back}">Retour</a></div>`; return; }
    const title = kind === "apprendre" ? "Apprendre" : kind === "quiz" ? "Quiz" : kind === "blanc" ? "Interro chronométrée" : "Contrôle";
    const S = { written: kind === "blanc", queue: [], total: 0, good: 0, missed: [], asked: [] };
    const okQ = q => q && q.q && (Array.isArray(q.choix) ? q.choix.length >= 2 && q.choix[+q.bonne] != null : !!q.ideal);
    const fromAi = (list, n, tag) => (list || []).filter(okQ).slice(0, n).map((q, k) => Array.isArray(q.choix) ? { id: tag + k, front: String(q.q), back: String(q.choix[+q.bonne]), opts: q.choix.map(String), expl: q.explication || "", ia: true } : { id: tag + k, front: String(q.q), back: String(q.ideal), ia: true });
    const leftS = () => Math.max(0, Math.round((S.deadline - Date.now()) / 1000)), leftTxt = () => "Temps restant : " + Math.floor(leftS() / 60) + " min " + String(leftS() % 60).padStart(2, "0") + " s";
    function begin(items) {
      S.queue = items || shuffle(all).slice(0, kind === "apprendre" ? 12 : kind === "quiz" ? 8 : 10); S.total = S.queue.length;
      if (kind === "blanc") { S.deadline = Date.now() + S.total * 60000; clearInterval(timerInt); timerInt = setInterval(() => { const el = $("qtimer"); if (!el) { if (!S.queue.length || !location.hash.startsWith("#blanc-")) clearInterval(timerInt); return; } const left = leftS(); el.textContent = leftTxt(); if (left <= 0) { clearInterval(timerInt); S.total = Math.max(1, S.asked.length + S.queue.length); S.queue.forEach(c => S.asked.push({ q: c.front, a: c.back, ok: false })); S.queue = []; end(); } }, 1000); }
      ask();
    }
    // Prépare (ou relit) le contenu IA puis lance ; en cas d'échec, propose la version avec les cartes.
    async function withAi(what, pick, fallback) {
      app.innerHTML = top(title) + `<div class="card done"><div class="spin" aria-hidden="true"></div><p class="muted" role="status">Merge prépare ${what === "quiz" ? "ton quiz" : "ton contrôle"} à partir de ton cours…</p></div>`;
      try { const fresh = freshAi; freshAi = false; const c = await study(id, what, fresh); if (location.hash !== here) return; const items = pick(c); if (!items.length) throw new Error("L'IA n'a pas renvoyé de questions utilisables."); begin(items); }
      catch (e) { if (location.hash !== here) return; app.innerHTML = top(title) + `<div class="card pad stack">${errHtml(e)}<button class="btn" id="fb2">${what === "quiz" ? "Faire le quiz avec mes cartes" : "Faire le contrôle avec mes cartes"}</button><a class="btn ghost" href="${back}">Retour au chapitre</a></div>`; $("fb2").onclick = fallback; }
    }
    if (kind === "quiz") {
      const cached = await getCached(id, "quiz"); if (location.hash !== here) return;
      app.innerHTML = top("Quiz") + `<div class="card pad stack"><h1>${mx(ch.name)}</h1><p class="muted">Un quiz d'entraînement écrit à partir de ton cours. Choisis comment répondre.</p><button class="btn" id="qcm">QCM · 8 questions</button><button class="btn ghost" id="ecrit">Réponse rédigée · 4 questions</button>
        <p class="note">${cached ? "Quiz déjà préparé et gardé : aucun appel IA." : "Première fois : 1 appel IA, puis le quiz est gardé."}</p><button class="linkbtn" id="nocall">Quiz rapide avec mes cartes, sans IA</button></div>`;
      $("qcm").onclick = () => withAi("quiz", c => shuffle(fromAi(c.qcm, 8, "q")), () => { S.written = false; begin(); });
      $("ecrit").onclick = () => withAi("quiz", c => fromAi(c.redige, 4, "r"), () => { S.written = true; begin(); });
      $("nocall").onclick = () => { S.written = false; begin(); };
    } else if (kind === "controle") {
      const cached = await getCached(id, "controle"); if (location.hash !== here) return;
      app.innerHTML = top("Contrôle") + `<div class="card pad stack"><span class="pill" style="align-self:flex-start">Débloqué · 100 % de maîtrise</span><h1>${mx(ch.name)}</h1><p class="muted">Une évaluation complète sur tout le chapitre, comme en classe : 10 QCM puis 6 questions rédigées, tirées uniquement de ton cours. Note sur 20.</p><button class="btn" id="cgo">Commencer le contrôle</button>
        <p class="note">${cached ? "Contrôle déjà préparé et gardé : aucun appel IA." : "Première fois : 1 appel IA, puis le contrôle est gardé."}</p><button class="linkbtn" id="nocall">Contrôle avec mes cartes, sans IA</button></div>`;
      $("cgo").onclick = () => withAi("controle", c => fromAi(c.qcm, 10, "q").concat(fromAi(c.redige, 6, "r")), () => { S.written = true; begin(); });
      $("nocall").onclick = () => { S.written = true; begin(); };
    } else begin();
    function next(ok, c, given) {
      ping(ok);
      S.asked.push({ q: c.front, a: c.back, ok });
      if (ok) S.good++; else { if (!S.missed.includes(c)) S.missed.push(c); logMistake(id, c.front, c.back, given || "", title.toLowerCase(), c.ia ? null : c.id); if (kind === "apprendre") S.queue.push(c); }
      S.queue.shift(); S.queue.length ? ask() : end();
    }
    function ask() {
      const c = S.queue[0], done = S.total - new Set(S.queue).size, head = top(title) + `<div class="bar"><i style="width:${done / S.total * 100}%"></i></div>${S.deadline ? '<p class="small muted" id="qtimer" role="timer">' + leftTxt() + '</p>' : ""}`;
      if (!c.opts && (S.written || c.ia)) {
        screenSession.key = null;
        app.innerHTML = head + `<div class="card pad stack"><p class="small muted">Question ${Math.min(S.asked.length + 1, S.total)} sur ${S.total} · réponse rédigée</p><h2 class="qtxt">${cfront(c)}</h2><div class="field"><label for="ans">Ta réponse</label><textarea id="ans" style="min-height:110px"></textarea></div><button class="btn" id="check">Voir la réponse attendue</button><div id="fb"></div></div>`;
        $("check").onclick = () => { $("check").hidden = true; $("ans").readOnly = true; $("fb").innerHTML = `<div class="stack"><p class="label">Réponse idéale attendue</p><p class="expected">${mx(c.back)}</p><p class="note">Compare avec ta réponse et valide toi-même : c'est le sens qui compte, pas les mots exacts.</p><button class="linkbtn" id="aicmp">Demander à l'IA de comparer (1 appel)</button><div class="md" id="aiout"></div><div class="answers"><button class="btn bad" id="ko">${I.x}Faux</button><button class="btn good" id="okb">${I.check}Juste</button></div></div>`; $("ko").onclick = () => next(false, c, $("ans").value); $("okb").onclick = () => next(true, c);
          $("aicmp").onclick = async () => { $("aicmp").disabled = true; $("aiout").innerHTML = '<p class="muted">Comparaison…</p>'; try { const r = await ai({ action: "ask", text: "Question : " + c.front + "\nRéponse attendue d'après le cours : " + c.back, question: "La réponse de l'élève est : « " + $("ans").value.slice(0, 500) + " ». A-t-elle le même sens que la réponse attendue ? Commence par OUI ou NON, puis explique en une phrase ce qui manque ou ce qui est faux." }); if ($("aiout")) $("aiout").innerHTML = md(r.answer); } catch (e) { if ($("aiout")) { showErr($("aiout"), e); $("aicmp").disabled = false; } } }; };
        return;
      }
      const opts = c.opts ? shuffle(c.opts.map((t, k) => ({ id: t === c.back ? c.id : c.id + "x" + k, back: t }))) : shuffle([c, ...lookalikes(c.back, all.filter(x => x.id !== c.id && x.back !== c.back), 3, x => x.back)]);
      app.innerHTML = head + `<div class="card pad stack"><span class="pill ${S.missed.includes(c) ? "warn" : ""}" style="align-self:flex-start">${S.missed.includes(c) ? "Essayons à nouveau" : "Question " + Math.min(S.asked.length + 1, S.total) + " sur " + S.total}</span><h2 class="qtxt">${cfront(c)}</h2><p class="fb" id="fb" role="status"></p><div class="opts">${opts.map((o, i) => `<button class="opt" data-i="${i}">${mx(o.back)}</button>`).join("")}</div><p class="note" id="expl" hidden></p><button class="btn" id="cont" hidden>Continuer</button></div>`;
      screenSession.key = (e) => { const n = "1234".indexOf(e.key); const bs = app.querySelectorAll(".opt"); if (n >= 0 && bs[n] && !bs[n].disabled) bs[n].click(); else if (e.key === "Enter" && $("cont") && !$("cont").hidden) $("cont").click(); };
      app.querySelectorAll(".opt").forEach(b => b.onclick = () => {
        const ok = opts[+b.dataset.i].id === c.id;
        app.querySelectorAll(".opt").forEach(x => { x.disabled = true; if (opts[+x.dataset.i].id === c.id) x.classList.add("good"); });
        if (!ok) b.classList.add("bad");
        $("fb").textContent = ok ? "Bon travail !" : "Pas encore. La bonne réponse est en vert."; $("fb").className = "fb " + (ok ? "ok" : "ko");
        if (c.expl) { $("expl").hidden = false; $("expl").textContent = "Dans ton cours : " + c.expl; }
        $("cont").hidden = false; $("cont").onclick = () => next(ok, c, opts[+b.dataset.i].back); $("cont").focus();
      });
    }
    async function end() {
      if (kind === "blanc") clearInterval(timerInt);
      screenSession.key = null;
      const first = S.asked.slice(0, S.total), good = kind === "apprendre" ? S.total - S.missed.length : first.filter(a => a.ok).length, note = Math.round(good / S.total * 20 * 2) / 2;
      if (note >= 15) setTimeout(() => confetti(), 300);
      let extra = "";
      if (kind === "quiz") { const qz = await sb.from("quizzes").insert({ chapter_id: id, questions: first }).select("id").single(); if (!qz.error) await sb.from("quiz_results").insert({ quiz_id: qz.data.id, score: note }); }
      if (kind === "controle") {
        const old = await sb.from("exams").select("id,best_score").eq("chapter_id", id).maybeSingle(), best = Math.max(note, (old.data && old.data.best_score) || 0);
        if (old.data) await sb.from("exams").update({ questions: first, best_score: best }).eq("id", old.data.id); else await sb.from("exams").insert({ chapter_id: id, questions: first, best_score: best });
        extra = `<p class="note">Meilleure note sur ce chapitre : ${String(best).replace(".", ",")} / 20.</p>`;
      }
      const resume = midQuiz === id; midQuiz = null;
      app.innerHTML = top(title) + `<div class="card done"><h1>${good === S.total ? "Bon travail !" : "C'est fini"}</h1>${kind === "apprendre" ? `<p class="muted">${plural(S.total, "notion vue", "notions vues")}, ${plural(S.missed.length, "à retravailler", "à retravailler")}.</p>` : `<div class="big">${String(note).replace(".", ",")} / 20</div><p class="muted">${good} bonnes réponses sur ${S.total}.</p>`}${extra}
        ${S.missed.length ? `<div class="stack" style="text-align:left;width:100%"><p class="label">À revoir</p>${S.missed.map(c => `<div class="term" style="padding:8px 0"><b>${cfront(c, true)}</b><p>${mx(c.back)}</p></div>`).join("")}</div>` : ""}
        ${resume ? `<a class="btn" href="#cartes-${id}">Reprendre mes cartes</a>` : ""}<button class="btn${resume ? " ghost" : ""}" id="again">Recommencer</button>${kind === "quiz" || kind === "controle" ? `<button class="btn ghost" id="newai">${I.spark}${kind === "quiz" ? "Nouveau quiz, nouvelles questions" : "Nouveau contrôle, nouvelles questions"}</button>` : ""}${kind === "apprendre" ? `<button class="btn ghost" id="morec">${I.spark}Créer d'autres cartes</button>` : ""}<a class="btn ghost" href="${back}">Retour au chapitre</a></div>`;
      $("again").onclick = () => screenQuestions(id, kind);
      if ($("newai")) $("newai").onclick = () => { freshAi = true; screenQuestions(id, kind); };
      if ($("morec")) $("morec").onclick = () => moreCards(id, $("morec"));
    }
  }

  // ---------- mode associer ----------
  // Séries de 6 paires question-réponse. Chrono en direct, record du chapitre, et à la fin : « Nouvelle série » (d'autres
  // cartes, celles déjà vues passent en dernier) ou « Rejouer la même ». Une erreur fait trembler les deux cases.
  const matchSeen = {};
  async function screenMatch(id, same) {
    tabs.hidden = true; app.innerHTML = `<p class="muted">Chargement…</p>`;
    const all = await chapterCards(id), back = "#chapitre-" + id, bestKey = "merge.match." + id;
    const head = `<div class="row"><a class="iconbtn" href="${back}" aria-label="Fermer">${I.x}</a><div class="grow" style="text-align:center;font-weight:800">Associer</div><span style="width:44px"></span></div>`;
    if (all.length < 3) { app.innerHTML = head + `<div class="card done"><p class="muted">Il faut au moins 3 cartes pour ce jeu.</p><a class="btn" href="${back}">Retour</a></div>`; return; }
    const seen = matchSeen[id] = matchSeen[id] || { ids: [], last: [] };
    let pairs;
    if (same && seen.last.length) pairs = seen.last.map(k => all.find(c => c.id === k)).filter(Boolean);
    else {
      const fresh = shuffle(all.filter(c => !seen.ids.includes(c.id))), old = shuffle(all.filter(c => seen.ids.includes(c.id)));
      pairs = fresh.concat(old).slice(0, 6);
      if (fresh.length < 6) seen.ids = []; // tout le chapitre a été vu : on repart de zéro
      seen.ids.push(...pairs.map(c => c.id)); seen.last = pairs.map(c => c.id);
    }
    const tiles = shuffle(pairs.flatMap(c => [{ k: c.id, t: c.front, q: 1 }, { k: c.id, t: c.back, q: 0 }])), t0 = Date.now(), best = +(safeGet(bestKey) || 0);
    let first = null, left = pairs.length, errors = 0, tick;
    app.innerHTML = head + `<div class="row between"><span class="small muted">Touche une question puis sa réponse.</span><span class="pill" id="mclock" role="timer">0 s</span></div>
      <div class="bar"><i id="mbar" style="width:0%"></i></div><div class="match">${tiles.map((t, i) => `<button class="card tilebtn${t.q ? " isq" : ""}" data-i="${i}">${mx(t.t)}</button>`).join("")}</div>`;
    tick = setInterval(() => { const el = $("mclock"); if (!el) return clearInterval(tick); el.textContent = Math.round((Date.now() - t0) / 1000) + " s"; }, 500);
    app.querySelectorAll(".tilebtn").forEach(b => b.onclick = () => {
      if (b.classList.contains("sel")) { b.classList.remove("sel"); first = null; return; }
      if (!first) { first = b; b.classList.add("sel"); return; }
      const a = first; first = null; a.classList.remove("sel");
      if (tiles[+a.dataset.i].k === tiles[+b.dataset.i].k && a !== b) {
        [a, b].forEach(x => { x.classList.add("gone"); x.disabled = true; }); ping(true);
        $("mbar").style.width = ((pairs.length - left + 1) / pairs.length * 100) + "%";
        if (--left === 0) {
          clearInterval(tick);
          const sec = Math.round((Date.now() - t0) / 1000), rec = !errors && (!best || sec < best), stars = errors === 0 ? 3 : errors <= 2 ? 2 : 1;
          if (rec) safeSet(bestKey, String(sec));
          app.innerHTML = head + `<div class="card done"><h1>${rec ? "Nouveau record !" : stars === 3 ? "Parfait !" : "Bien joué !"}</h1><div class="mstars" aria-label="${stars} étoiles sur 3">${[1, 2, 3].map(n => `<span class="${n <= stars ? "on" : ""}">${I.star}</span>`).join("")}</div><div class="big">${sec} s</div><p class="muted">${plural(pairs.length, "paire trouvée", "paires trouvées")}, ${plural(errors, "erreur", "erreurs")}.${best || rec ? ` Record sans erreur : ${rec ? sec : best} s.` : ""}</p><button class="btn" id="again">Nouvelle série</button><button class="btn ghost" id="same">Rejouer la même série</button><a class="btn ghost" href="${back}">Retour au chapitre</a></div>`;
          $("again").onclick = () => screenMatch(id); $("same").onclick = () => screenMatch(id, true);
        }
      } else { errors++; ping(false); [a, b].forEach(x => { x.classList.add("miss"); setTimeout(() => x.classList.remove("miss"), 500); }); }
    });
  }

  // ---------- mode écouter ----------
  // Onglet « Cours expliqué » : un prof explique tout le cours à voix haute (texte écrit par l'IA à partir du cours, gardé dans ai_cache sous « audio »).
  let listenWant = null; const audioDraft = {};
  const speakClean = s => String(s || "").replace(/\[\[PAGE\]\]/g, " ").replace(/[#*_>`]/g, "").replace(/\s+/g, " ").trim();
  // Le texte écrit par l'IA : « ## Titre » puis des paragraphes parlés.
  function parseScript(s) {
    const secs = []; let cur = null;
    String(s || "").replace(/\r/g, "").split("\n").forEach(l => {
      const t = l.trim(); if (!t) return; const m = /^#{1,4}\s*(.+)$/.exec(t);
      if (m) { cur = { h: speakClean(m[1]), p: [] }; secs.push(cur); return; }
      if (!cur) { cur = { h: "", p: [] }; secs.push(cur); }
      const c = speakClean(t); if (c) cur.p.push(c);
    });
    return secs.filter(x => x.p.length);
  }
  // Le cours est expliqué par tranches (une tranche = un appel IA) pour rester rapide et complet.
  function splitCourse(text, max) {
    const paras = String(text || "").split(/\n{2,}|\[\[PAGE\]\]/).map(x => x.trim()).filter(Boolean), out = []; let cur = "";
    for (let p of paras) {
      while (p.length > max) { if (cur) { out.push(cur); cur = ""; } out.push(p.slice(0, max)); p = p.slice(max); }
      if (cur && (cur + "\n\n" + p).length > max) { out.push(cur); cur = ""; }
      cur = cur ? cur + "\n\n" + p : p;
    }
    if (cur) out.push(cur);
    return out;
  }
  async function screenListen(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; app.innerHTML = `<p class="muted">Chargement…</p>`;
    // Écouter et Mains libres réunis : deux façons d'écouter, on passe de l'une à l'autre en haut de l'écran.
    const back = "#chapitre-" + id, head = `<div class="row"><a class="iconbtn" href="${back}" aria-label="Fermer">${I.x}</a><div class="grow" style="text-align:center;font-weight:800">Écouter</div><span style="width:44px"></span></div><div class="seg" role="tablist"><button role="tab" aria-selected="true">Lecture</button><a role="tab" aria-selected="false" href="#bus-${id}">Mains libres</a></div>`;
    if (!("speechSynthesis" in window) && !neuralWanted()) { app.innerHTML = head + `<div class="card done"><p class="muted">Ton navigateur ne sait pas lire à voix haute.</p><a class="btn" href="${back}">Retour</a></div>`; return; }
    const [cards, sum, src, aud] = await Promise.all([chapterCards(id), sb.from("summaries").select("markdown").eq("chapter_id", id).maybeSingle(), sb.from("sources").select("extracted_text").eq("chapter_id", id), getCached(id, "audio").catch(() => null)]);
    const clean = s => String(s || "").replace(/[#*_>`]/g, "").replace(/\s+/g, " ").trim();
    const parts = { resume: sum.data ? String(sum.data.markdown).split(/\n+/).map(clean).filter(Boolean) : [], cartes: cards.flatMap(c => [clean(c.front), clean(c.back)]), cours: (src.data || []).map(x => x.extracted_text || "").join("\n").replace(/\[\[PAGE\]\]/g, "\n").split(/(?<=[.!?])\s+|\n+/).map(clean).filter(x => x.length > 2), expl: [] };
    let secs = [];
    const setExpl = a => { secs = ((a && a.parts) || []).filter(x => x && Array.isArray(x.p) && x.p.length); parts.expl = secs.flatMap(x => x.p); };
    setExpl(aud);
    const wantExpl = listenWant === "expl"; listenWant = null;
    const L = { what: wantExpl ? "expl" : parts.resume.length ? "resume" : "cartes", i: 0, rate: voiceRate(), playing: false, sleep: 0, sleepAt: 0 };
    const saved = (safeGet("merge.ecoute." + id) || "").split(":"); if (parts[saved[0]] && +saved[1] < parts[saved[0]].length && (!wantExpl || saved[0] === "expl")) { L.what = saved[0]; L.i = +saved[1] || 0; }
    const lang = (ch.lang || "fr").startsWith("fr") ? "fr-FR" : ch.lang;
    const secOf = i => { let n = 0; for (let k = 0; k < secs.length; k++) { n += secs[k].p.length; if (i < n) return k; } return Math.max(0, secs.length - 1); };
    const secFirst = k => secs.slice(0, k).reduce((a, x) => a + x.p.length, 0);
    // Préparation du cours expliqué : une tranche de cours = un appel IA, avec barre de progression.
    const G = { busy: false, k: 0, n: 1, t0: 0, err: null };
    const genPct = () => Math.min(96, Math.max(4, Math.round(((G.k + 0.92 * (1 - Math.exp(-(Date.now() - G.t0) / 30000))) / Math.max(1, G.n)) * 100)));
    const genStat = () => G.n > 1 ? "Partie " + (G.k + 1) + " sur " + G.n + " : le prof explique ton cours…" : "Le prof explique ton cours…";
    const genHtml = () => { const p = genPct(); return `<div class="card pad stack"><h2>Je prépare le cours expliqué…</h2><div class="bar big"><i id="xprog" style="width:${p}%"></i></div><div class="row between small muted"><span id="xstat" role="status">${esc(genStat())}</span><b id="xpct">${p} %</b></div><p class="small muted">Environ ${Math.max(1, Math.round(G.n * 0.8))} min. Garde l'appli ouverte : une notification te prévient à la fin si tu changes d'application.</p></div>`; };
    const paintGen = () => { const b = $("xprog"); if (!b) return; const p = genPct(); b.style.width = p + "%"; $("xpct").textContent = p + " %"; $("xstat").textContent = genStat(); };
    async function makeExpl() {
      if (G.busy) return; if (state.offline) return toast("Il faut être connecté à Internet pour préparer le cours expliqué.");
      G.busy = true; G.err = null; G.t0 = Date.now(); L.what = "expl"; draw();
      let tick = null;
      try {
        let dr = audioDraft[id];
        if (!dr) { const text = await courseText(id); if (text.trim().length < 80) throw new Error("Importe d'abord ton cours dans ce chapitre."); const pieces = splitCourse(text, Math.max(24000, Math.ceil(text.length / 8))); dr = audioDraft[id] = { pieces, done: [] }; }
        G.n = dr.pieces.length; tick = setInterval(paintGen, 300);
        while (dr.done.length < dr.pieces.length) {
          G.k = dr.done.length; G.t0 = Date.now(); paintGen();
          const r = await ai({ action: "audio", text: dr.pieces[G.k], i: G.k + 1, n: dr.pieces.length, titre: ch.name });
          if (!r || !String(r.script || "").trim()) throw new Error("L'IA n'a rien renvoyé. Réessaie.");
          dr.done.push(String(r.script));
        }
        clearInterval(tick); tick = null;
        const sc = parseScript(dr.done.join("\n\n")); if (!sc.length) throw new Error("Le cours expliqué n'a pas pu être écrit. Réessaie.");
        const content = { v: 1, parts: sc }; await putCached(id, "audio", content); delete audioDraft[id];
        setExpl(content); L.what = "expl"; L.i = 0; G.busy = false;
        if (document.hidden) impNotify("Cours audio prêt", "« " + ch.name + " » : le cours expliqué est prêt à écouter.");
        if (location.hash === "#ecouter-" + id) draw(); else toast("Le cours expliqué de « " + ch.name + " » est prêt.");
      } catch (e) {
        if (tick) clearInterval(tick); G.busy = false; G.err = e;
        if (location.hash === "#ecouter-" + id) draw(); else toast((e && e.message) || "Le cours expliqué n'a pas pu être préparé.");
      }
    }
    function speak() {
      const list = parts[L.what]; if (L.i >= list.length) { L.playing = false; L.i = 0; return draw(); }
      if (L.sleepAt && Date.now() > L.sleepAt) { L.playing = false; L.sleepAt = 0; L.sleep = 0; return draw(); }
      safeSet("merge.ecoute." + id, L.what + ":" + L.i);
      speakText(list[L.i], lang, () => { if (!L.playing) return; L.i++; speak(); }, L.rate); draw();
      if (list[L.i + 1]) prefetchSpeech(list[L.i + 1], lang);
    }
    function draw() {
      const list = parts[L.what], chips = `<div class="chips">${[["resume", "Le résumé"], ["cartes", "Les cartes"], ["cours", "Le cours complet"], ["expl", "Cours expliqué"]].map(t => `<button class="chip" data-w="${t[0]}" aria-pressed="${L.what === t[0]}" ${parts[t[0]].length || t[0] === "expl" ? "" : "disabled"}>${t[1]}</button>`).join("")}</div>`;
      const wire = () => app.querySelectorAll("[data-w]").forEach(b => b.onclick = () => { L.what = b.dataset.w; L.i = 0; L.playing = false; stopSpeak(); draw(); });
      if (L.what === "expl" && !parts.expl.length) {
        app.innerHTML = head + `<h1>${esc(ch.name)}</h1>${chips}` + (G.busy ? genHtml() : `<div class="card pad stack"><h2>Le cours expliqué</h2><p class="muted">Un prof reprend tout ton cours dans l'ordre et te l'explique à voix haute : il décortique les notions, les formules et les schémas, avec des exemples et des liens entre les idées. Ce n'est pas une simple lecture de ton texte.</p>${G.err ? `<div id="xerr">${errHtml(G.err)}</div>` : ""}<button class="btn" id="mkexpl">${G.err ? "Réessayer" : "Préparer le cours expliqué"}</button><p class="note">Utilise l'IA (1 appel par tranche de cours, 1 à 3 en général), puis c'est gardé sur tous tes appareils.</p></div>`);
        wire(); if ($("mkexpl")) $("mkexpl").onclick = makeExpl; return;
      }
      const ex = L.what === "expl", sk = ex ? secOf(L.i) : 0, words = ex ? parts.expl.join(" ").split(/\s+/).length : 0;
      app.innerHTML = head + `<h1>${esc(ch.name)}</h1>
        ${chips}
        ${ex ? `<div class="chips secchips" aria-label="Parties du cours">${secs.map((s, k) => `<button class="chip" data-sec="${k}" aria-pressed="${k === sk}">${esc(s.h || "Partie " + (k + 1))}</button>`).join("")}</div>` : ""}
        <div class="card pad stack">${ex ? `<p class="explsec">${esc((secs[sk] && secs[sk].h) || "")}</p>` : ""}<p class="small muted">${list.length ? (L.i + 1) + " sur " + list.length + (ex ? " · environ " + Math.max(1, Math.round(words / 150 / L.rate)) + " min d'écoute" : "") : "Rien à lire"}</p><p class="qtxt" aria-live="polite">${esc(list[L.i] || "")}</p><div class="bar"><i style="width:${list.length ? (L.i / list.length * 100) : 0}%"></i></div>
          <div class="row" style="justify-content:center"><button class="btn ghost sm" id="prevp">Précédent</button><button class="btn" id="play">${L.playing ? "Pause" : "Lire"}</button><button class="btn ghost sm" id="nextp">Suivant</button></div></div>
        <div class="field"><span class="label">Vitesse</span><div class="chips">${[0.75, 1, 1.25, 1.5, 2].map(r => `<button class="chip" data-r="${r}" aria-pressed="${L.rate === r}">${String(r).replace(".", ",")}x</button>`).join("")}</div></div>
        <div class="field"><span class="label">Arrêt automatique</span><div class="chips">${[[0, "Jamais"], [15, "15 min"], [30, "30 min"]].map(t => `<button class="chip" data-sl="${t[0]}" aria-pressed="${L.sleep === t[0]}">${t[1]}</button>`).join("")}</div></div>
        ${ex ? '<button class="linkbtn" id="rgexpl" style="align-self:flex-start">Refaire le cours expliqué (IA)</button>' : ""}
        <p class="note">${neuralWanted() ? "Lecture avec la voix Merge (la voix de ton appareil prend le relais hors ligne)." : "Lecture avec la voix de ton appareil."} Elle reprend là où tu t'es arrêté.</p>`;
      app.querySelectorAll("[data-sl]").forEach(b => b.onclick = () => { L.sleep = +b.dataset.sl; L.sleepAt = L.sleep ? Date.now() + L.sleep * 60000 : 0; draw(); });
      $("play").onclick = () => { L.playing = !L.playing; if (L.playing) speak(); else { stopSpeak(); draw(); } };
      $("prevp").onclick = () => { L.i = Math.max(0, L.i - 1); L.playing ? speak() : draw(); };
      $("nextp").onclick = () => { L.i = Math.min(Math.max(0, list.length - 1), L.i + 1); L.playing ? speak() : draw(); };
      wire();
      app.querySelectorAll("[data-sec]").forEach(b => b.onclick = () => { L.i = secFirst(+b.dataset.sec); L.playing ? speak() : draw(); });
      if ($("rgexpl")) $("rgexpl").onclick = async () => { if (!(await askConfirm("Refaire le cours expliqué ?", "Le prof réécrit tout le cours expliqué (quelques appels IA). L'ancien est remplacé.", "Refaire"))) return; stopSpeak(); L.playing = false; setExpl(null); makeExpl(); };
      app.querySelectorAll("[data-r]").forEach(b => b.onclick = () => { L.rate = +b.dataset.r; safeSet("merge.rate", String(L.rate)); if (spk.el && !spk.el.paused) { spk.el.defaultPlaybackRate = spk.el.playbackRate = L.rate; draw(); } else if (L.playing) speak(); else draw(); });
    }
    if (wantExpl && !parts.expl.length && !G.busy && audioDraft[id]) { draw(); return; }
    draw();
  }

  // ---------- badges ----------
  // Badges avec leur progression (pour « Prochains badges » dans Progrès).
  function badgeProgress() {
    const reviews = state.cards.reduce((s, c) => s + (c.right_count || 0) + (c.wrong_count || 0), 0), st = streak();
    const ms = state.chapters.map(c => { const cs = cardsOf(c.id); return cs.length ? mastery(cs) : 0; }), full = ms.filter(x => x >= 100).length, best = Math.max(0, ...ms);
    const b = (name, cur, goal, unit) => ({ name, cur: Math.min(cur, goal), goal, label: unit ? `${Math.min(cur, goal)} / ${goal}${unit}` : `${Math.min(cur, goal)} / ${goal}` });
    return [b("Première carte", reviews, 1), b("100 réponses", reviews, 100), b("1 000 réponses", reviews, 1000), b("3 jours d'affilée", st, 3), b("7 jours d'affilée", st, 7), b("30 jours d'affilée", st, 30), b("Un chapitre à 100 %", best, 100, " %"), b("5 chapitres à 100 %", full, 5), b("100 cartes créées", state.cards.length, 100)];
  }
  function badges() {
    const reviews = state.cards.reduce((s, c) => s + (c.right_count || 0) + (c.wrong_count || 0), 0), st = streak();
    const full = state.chapters.filter(c => { const cs = cardsOf(c.id); return cs.length && mastery(cs) >= 100; }).length;
    return [["Première carte", reviews >= 1], ["100 réponses", reviews >= 100], ["1 000 réponses", reviews >= 1000], ["3 jours d'affilée", st >= 3], ["7 jours d'affilée", st >= 7], ["30 jours d'affilée", st >= 30], ["Un chapitre à 100 %", full >= 1], ["5 chapitres à 100 %", full >= 5], ["100 cartes créées", state.cards.length >= 100]];
  }

  // ---------- mode vrai ou faux ----------
  async function screenTrueFalse(id) {
    tabs.hidden = true;
    const all = cardsOf(id), back = "#chapitre-" + id, head = `<div class="row"><a class="iconbtn" href="${back}" aria-label="Fermer">${I.x}</a><div class="grow" style="text-align:center;font-weight:800">Vrai ou faux</div><span style="width:44px"></span></div>`;
    if (all.length < 4) { app.innerHTML = head + `<div class="card done"><p class="muted">Il faut au moins 4 cartes pour ce mode.</p><a class="btn" href="${back}">Retour</a></div>`; return; }
    const qs = shuffle(all).slice(0, 10).map(c => { const truth = Math.random() < 0.5, other = lookalikes(c.back, shuffle(all.filter(x => x.id !== c.id && x.back !== c.back)), 2, x => x.back)[Math.random() < 0.7 ? 0 : 1] || all.find(x => x.id !== c.id && x.back !== c.back); return { c, truth: truth || !other, shown: truth || !other ? c.back : other.back }; });
    let i = 0, good = 0; const missed = [];
    function ask() {
      if (i >= qs.length) { app.innerHTML = head + `<div class="card done"><h1>${good === qs.length ? "Bon travail !" : "C'est fini"}</h1><div class="big">${good} / ${qs.length}</div>${missed.length ? `<div class="stack" style="text-align:left;width:100%"><p class="label">À revoir</p>${missed.map(c => `<div class="term" style="padding:8px 0"><b>${cfront(c, true)}</b><p>${mx(c.back)}</p></div>`).join("")}</div>` : ""}<button class="btn" id="again">Rejouer</button><a class="btn ghost" href="${back}">Retour au chapitre</a></div>`; $("again").onclick = () => screenTrueFalse(id); return; }
      const q = qs[i];
      app.innerHTML = head + `<div class="bar"><i style="width:${i / qs.length * 100}%"></i></div><div class="card pad stack"><p class="small muted">Affirmation ${i + 1} sur ${qs.length}</p><h2 class="qtxt">${mx(q.c.front)}</h2><p class="expected" style="background:var(--accent-soft);color:var(--accent-ink)">${mx(q.shown)}</p><p class="fb" id="fb" role="status"></p><div class="answers"><button class="btn peach" id="faux">Faux</button><button class="btn" id="vrai">Vrai</button></div><button class="btn ghost" id="cont" hidden>Continuer</button></div>`;
      const pick = (v) => { const ok = v === q.truth; ping(ok); if (ok) good++; else missed.push(q.c); $("vrai").disabled = $("faux").disabled = true; $("fb").className = "fb " + (ok ? "ok" : "ko"); $("fb").textContent = ok ? "Bon travail !" : (q.truth ? "C'était vrai." : "C'était faux. La bonne réponse : " + q.c.back); $("cont").hidden = false; $("cont").onclick = () => { i++; ask(); }; $("cont").focus(); };
      $("vrai").onclick = () => pick(true); $("faux").onclick = () => pick(false);
      screenSession.key = (e) => { if ($("vrai") && !$("vrai").disabled) { if (e.key === "ArrowRight" || e.key.toLowerCase() === "v") pick(true); if (e.key === "ArrowLeft" || e.key.toLowerCase() === "f") pick(false); } else if (e.key === "Enter" && $("cont")) $("cont").click(); };
    }
    ask();
  }

  // ---------- fiche de révision à imprimer ----------
  async function screenSheet(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; app.innerHTML = `<p class="muted">Chargement…</p>`;
    const { data: sum } = await sb.from("summaries").select("markdown").eq("chapter_id", id).maybeSingle(), cards = cardsOf(id), s = state.subjects.find(x => x.id === ch.subject_id);
    app.innerHTML = `<div class="row between noprint"><a class="iconbtn" href="#chapitre-${id}" aria-label="Retour au chapitre">${I.back}</a><button class="btn sm" id="print">Imprimer ou enregistrer en PDF</button></div>
      <div class="sheet"><p class="small muted">${esc(s ? s.name : "")}</p><h1>${esc(ch.name)}</h1>
      ${sum ? `<div class="md">${md(sum.markdown)}</div>` : ""}
      ${ch.notes ? `<h2 style="margin-top:16px">Mes notes</h2><p style="white-space:pre-wrap">${esc(ch.notes)}</p>` : ""}
      <h2 style="margin-top:16px">${plural(cards.length, "carte", "cartes")}</h2><table class="sheettable"><tbody>${cards.map(c => `<tr><th scope="row">${esc(c.front)}</th><td>${esc(c.back)}</td></tr>`).join("")}</tbody></table></div>`;
    $("print").onclick = () => printDoc(app.querySelector(".sheet"), "Fiche " + ch.name);
  }

  // ---------- petits outils communs aux nouveaux modes ----------
  const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  function highlight(text, marks) {
    const low = text.toLowerCase(), spans = [];
    marks.forEach(m => { const e = String(m.t || "").trim(); if (e.length < 3) return; const k = low.indexOf(e.toLowerCase()); if (k >= 0) spans.push({ a: k, b: k + e.length, cls: m.cls, tip: m.tip }); });
    spans.sort((x, y) => x.a - y.a); let out = "", pos = 0;
    for (const s of spans) { if (s.a < pos) continue; out += esc(text.slice(pos, s.a)) + `<mark class="hl ${s.cls}"${s.tip ? ` title="${esc(s.tip)}"` : ""}>${esc(text.slice(s.a, s.b))}</mark>`; pos = s.b; }
    return out + esc(text.slice(pos));
  }
  const li = (arr) => (arr || []).filter(Boolean).map(x => `<li>${mx(typeof x === "string" ? x : JSON.stringify(x))}</li>`).join("");
  const emptyTool = (id, title, msg) => { app.innerHTML = toolHead(id, title) + `<div class="card done"><p class="muted">${msg}</p><a class="btn" href="#chapitre-${id}">Retour au chapitre</a></div>`; };
  // Voix : on prend la meilleure voix installée (voix « naturelles » ou Google d'abord), ou celle choisie dans Réglages.
  function voicesFor(lang) { if (!("speechSynthesis" in window)) return []; const p = (lang || "fr").slice(0, 2).toLowerCase(); return speechSynthesis.getVoices().filter(v => (v.lang || "").toLowerCase().startsWith(p)); }
  function voiceScore(v) { const n = v.name || ""; let k = 0; if (/natural|neural|online|premium|enhanced|améliorée|siri/i.test(n)) k += 100; if (/google/i.test(n)) k += 60; if (/hortense|julie|paul|compact|espeak/i.test(n)) k -= 30; if (!v.localService) k += 10; if (/fr[-_]FR/i.test(v.lang)) k += 5; return k; }
  function pickVoice(lang) { const vs = voicesFor(lang); if (!vs.length) return null; const want = (lang || "fr").slice(0, 2).toLowerCase() === "fr" ? safeGet("merge.voice") : null; return vs.find(v => v.voiceURI === want) || vs.slice().sort((a, b) => voiceScore(b) - voiceScore(a))[0]; }
  const voiceRate = () => Math.min(2, Math.max(0.5, parseFloat(safeGet("merge.rate")) || 1));
  function utter(t, lang, rate) { const u = new SpeechSynthesisUtterance(t); u.lang = lang || "fr-FR"; const v = pickVoice(u.lang); if (v) { u.voice = v; u.lang = v.lang; } u.rate = Math.min(2, rate || voiceRate()); return u; }
  if ("speechSynthesis" in window) { try { speechSynthesis.getVoices(); } catch (e) { /* voix chargées plus tard */ } }
  // Les longues phrases sont lues par morceaux : certaines voix en ligne se coupent après une quinzaine de secondes.
  // Lecture à voix haute. Voix Merge (fonction `voix`, chaque phrase gardée sur le serveur) si elle est disponible,
  // sinon voix de l'appareil : hors ligne, API pas encore activée, ou quota gratuit du mois atteint.
  const spk = { el: null, token: 0, down: 0 };
  const neuralWanted = () => safeGet("merge.vengine") !== "appareil";
  const spkUrls = new Map();
  async function neuralUrl(text, lang) {
    const k = (lang || "fr") + "|" + text; if (spkUrls.has(k)) return spkUrls.get(k);
    const { data, error } = await sb.functions.invoke("voix", { body: { text, lang: (lang || "fr").slice(0, 2) } });
    if (error || !data || !(data.url || data.audio)) { spk.down = Date.now(); throw new Error("voix"); }
    const url = data.url || ("data:audio/mpeg;base64," + data.audio); spkUrls.set(k, url); return url;
  }
  function stopSpeak() { spk.token++; try { if ("speechSynthesis" in window) speechSynthesis.cancel(); } catch (e) { /* rien */ } if (spk.el) { spk.el.pause(); spk.el.onended = null; } }
  function speakTextDevice(t, lang, onend, rate) {
    if (!("speechSynthesis" in window)) { if (onend) onend(); return; }
    const bits = String(t).match(/[^.!?;:\n]+[.!?;:]*\s*/g) || [String(t)], chunks = []; let cur = "";
    bits.forEach(b => { if ((cur + b).length > 180 && cur.trim()) { chunks.push(cur); cur = ""; } cur += b; }); if (cur.trim()) chunks.push(cur);
    speechSynthesis.cancel(); let k = 0, over = false; const end = () => { if (!over) { over = true; if (onend) onend(); } };
    const next = () => { if (over) return; if (k >= chunks.length) return end(); const u = utter(chunks[k++], lang, rate); u.onend = next; u.onerror = end; speechSynthesis.speak(u); };
    next();
  }
  // iPhone : un son ne peut démarrer que pendant le toucher de l'élève. La voix Merge arrive après un appel au serveur, donc trop tard :
  // iOS la bloquait et l'appli retombait sur la voix de l'appareil. On « réveille » le lecteur tout de suite avec un silence
  // d'une fraction de seconde ; ensuite iOS le laisse jouer la vraie voix.
  let silentUrl = "";
  function unlockAudio() {
    try {
      if (!silentUrl) {
        const n = 800, b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, t) => [...t].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
        w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
        v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 2, true);
        silentUrl = URL.createObjectURL(new Blob([b], { type: "audio/wav" }));
      }
      const a = spk.el || (spk.el = new Audio()); a.src = silentUrl; const p = a.play(); if (p && p.catch) p.catch(() => {});
    } catch (e) { /* pas de son possible : la voix de l'appareil prendra le relais */ }
  }
  function speakText(t, lang, onend, rate) {
    stopSpeak(); const my = spk.token;
    t = /[$\\]/.test(String(t)) ? texPlain(t).replace(/\(([^()]*)\)\/\(([^()]*)\)/g, "$1 sur $2") : String(t);
    const useNeural = neuralWanted() && state.user && !state.offline && navigator.onLine !== false && Date.now() - spk.down > 600000;
    if (!useNeural) return speakTextDevice(t, lang, onend, rate);
    unlockAudio();
    const bits = t.match(/[^.!?;:\n]+[.!?;:]*\s*/g) || [t], chunks = []; let cur = "";
    bits.forEach(b => { if ((cur + b).length > 900 && cur.trim()) { chunks.push(cur.trim()); cur = ""; } cur += b; }); if (cur.trim()) chunks.push(cur.trim());
    let k = 0, over = false; const end = () => { if (!over && my === spk.token) { over = true; if (onend) onend(); } };
    const fallback = () => { if (my !== spk.token) return; speakTextDevice(chunks.slice(k).join(" "), lang, end, rate); };
    const next = async () => {
      if (my !== spk.token) return; if (k >= chunks.length) return end();
      let url; try { url = await neuralUrl(chunks[k], lang); } catch (e) { return fallback(); }
      if (my !== spk.token) return; k++;
      if (k < chunks.length) neuralUrl(chunks[k], lang).catch(() => {});
      const a = spk.el || (spk.el = new Audio()); a.preservesPitch = true; a.defaultPlaybackRate = rate || voiceRate(); a.src = url; a.playbackRate = rate || voiceRate(); a.onended = next; a.onerror = () => { k--; fallback(); };
      const pr = a.play(); if (pr && pr.catch) pr.catch(() => { k--; fallback(); });
    };
    next();
  }
  function prefetchSpeech(t, lang) {
    if (!t || !neuralWanted() || !state.user || state.offline || navigator.onLine === false || Date.now() - spk.down <= 600000) return;
    t = /[$\\]/.test(String(t)) ? texPlain(t).replace(/\(([^()]*)\)\/\(([^()]*)\)/g, "$1 sur $2") : String(t);
    const bits = t.match(/[^.!?;:\n]+[.!?;:]*\s*/g) || [t]; let first = "";
    for (const b of bits) { if ((first + b).length > 900 && first.trim()) break; first += b; }
    if (first.trim()) neuralUrl(first.trim(), lang).catch(() => {});
  }
  const chLang = ch => (!ch.lang || ch.lang.startsWith("fr")) ? "fr-FR" : ch.lang;
  const getMnemo = c => c.mnemonic || safeGet("merge.mnemo." + c.id) || "";

  // ---------- chasse aux pièges : deviens le correcteur ----------
  function screenTraps(id) {
    toolGate(id, "pieges", "Chasse aux pièges", "Deviens le correcteur : Merge écrit une copie d'élève qui contient 2 ou 3 erreurs classiques. À toi de les repérer et de les corriger.", (data, ch, regen) => {
      const exos = (data.exercices || []).filter(e => e && e.copie && (e.erreurs || []).length); let i = 0, found = 0, total = 0;
      if (!exos.length) return emptyTool(id, "Chasse aux pièges", "Aucune copie n'a pu être préparée pour ce cours.");
      function show() {
        const e = exos[i], sents = (e.copie.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [e.copie]).map(x => x.trim()).filter(Boolean), sel = new Set();
        const bad = sents.map(st => e.erreurs.findIndex(er => norm(er.extrait).length > 3 && (norm(st).includes(norm(er.extrait)) || norm(er.extrait).includes(norm(st)))));
        app.innerHTML = toolHead(id, "Chasse aux pièges") + `<div class="bar"><i style="width:${i / exos.length * 100}%"></i></div>
          <div class="card pad stack"><span class="pill" style="align-self:flex-start">Copie ${i + 1} sur ${exos.length}</span><h2 class="qtxt">${mx(e.question)}</h2>
          <p class="note">Cette copie contient ${plural(e.erreurs.length, "erreur", "erreurs")}. Touche les phrases que tu penses fausses.</p>
          <div class="copie" id="copie">${sents.map((st, k) => `<button class="sent" data-k="${k}" aria-pressed="false">${mx(st)}</button>`).join(" ")}</div>
          <div class="field"><label for="fix">Ta correction (facultatif)</label><textarea id="fix" style="min-height:80px" placeholder="Écris ce qu'il aurait fallu dire"></textarea></div>
          <button class="btn" id="chk">Corriger la copie</button><div id="res" class="stack"></div></div>`;
        app.querySelectorAll(".sent").forEach(b => b.onclick = () => { const k = +b.dataset.k; sel.has(k) ? sel.delete(k) : sel.add(k); b.setAttribute("aria-pressed", sel.has(k)); });
        $("chk").onclick = () => {
          const hit = new Set(); let alarms = 0;
          app.querySelectorAll(".sent").forEach(b => { const k = +b.dataset.k; b.disabled = true; if (bad[k] >= 0) { b.classList.add(sel.has(k) ? "found" : "missed"); if (sel.has(k)) hit.add(bad[k]); } else if (sel.has(k)) { b.classList.add("alarm"); alarms++; } });
          found += hit.size; total += e.erreurs.length; ping(hit.size === e.erreurs.length && !alarms);
          e.erreurs.forEach((er, k) => { if (!hit.has(k)) logMistake(id, e.question, er.correction, er.extrait, "pièges"); });
          $("chk").hidden = true; $("fix").readOnly = true;
          $("res").innerHTML = `<p class="fb ${hit.size === e.erreurs.length ? "ok" : "ko"}">${hit.size} sur ${plural(e.erreurs.length, "erreur trouvée", "erreurs trouvées")}${alarms ? ", " + plural(alarms, "phrase juste accusée à tort", "phrases justes accusées à tort") : ""}.</p>
            ${e.erreurs.map(er => `<div class="fix"><p><s>${mx(er.extrait)}</s></p><p class="expected">${mx(er.correction)}</p>${er.explication ? `<p class="note">${mx(er.explication)}</p>` : ""}</div>`).join("")}
            <button class="btn" id="nx">${i < exos.length - 1 ? "Copie suivante" : "Terminer"}</button>`;
          $("nx").onclick = () => { i++; i < exos.length ? show() : end(); };
        };
      }
      function end() {
        app.innerHTML = toolHead(id, "Chasse aux pièges") + `<div class="card done"><h1>${found === total ? "Bon travail !" : "C'est fini"}</h1><div class="big">${found} / ${total}</div><p class="muted">erreurs repérées dans ${plural(exos.length, "copie", "copies")}.</p><button class="btn" id="again">Recommencer</button><a class="btn ghost" href="#chapitre-${id}">Retour au chapitre</a></div>${regenHtml}`;
        $("again").onclick = () => { i = 0; found = 0; total = 0; show(); }; wireRegen(regen);
      }
      show();
    });
  }

  // ---------- blurting : la feuille blanche ----------
  async function screenBlurting(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const T = "Feuille blanche", here = location.hash;
    const last = await getCached(id, "blurting"); if (location.hash !== here) return;
    function form(text) {
      app.innerHTML = toolHead(id, T) + `<h1>Écris tout ce dont tu te souviens</h1><p class="muted">Ferme ton cours. Écris sans notes tout ce que tu as retenu de « ${mx(ch.name)} », dans l'ordre qui te vient. Merge compare ensuite avec ton cours.</p>
        <div class="field"><label for="bl">Ta feuille blanche</label><textarea id="bl" style="min-height:42vh" placeholder="Je me souviens que…">${esc(text || "")}</textarea></div>
        <button class="btn" id="go">Corriger ma feuille</button><p class="note">1 appel IA par correction.</p><div id="msg"></div>
        ${last ? '<button class="linkbtn" id="lastb">Revoir ma dernière correction</button>' : ""}`;
      if ($("lastb")) $("lastb").onclick = () => result(last.recall, last.res);
      $("go").onclick = async () => {
        const recall = $("bl").value.trim(); if (recall.length < 20) return toast("Écris au moins quelques phrases.");
        $("go").disabled = true; $("msg").innerHTML = '<p class="muted" role="status">Merge compare ta feuille avec ton cours…</p>';
        try { const text = await courseText(id); if (text.trim().length < 80) throw new Error("Importe d'abord ton cours dans ce chapitre.");
          const r = await ai({ action: "blurting", text, recall }); await putCached(id, "blurting", { recall, res: r.content }); if (location.hash === here) result(recall, r.content);
        } catch (e) { if ($("go")) $("go").disabled = false; showErr($("msg"), e); }
      };
    }
    function result(recall, r) {
      r = r || {}; const cards = (r.cartes || []).filter(c => c && c.front && c.back).slice(0, 3);
      const marks = (r.acquis || []).map(t => ({ t, cls: "ok" })).concat((r.erreurs || []).map(e => ({ t: e.extrait, cls: "ko", tip: e.correction })));
      app.innerHTML = toolHead(id, T) + `<div class="row between"><h1>Ta correction</h1>${r.score != null ? `<span class="pill">${Math.round(+r.score || 0)} % du cours restitué</span>` : ""}</div>
        <div class="legend"><span><mark class="hl ok">Vert</mark> acquis</span><span><mark class="hl warn">Orange</mark> oublis</span><span><mark class="hl ko">Rouge</mark> erreurs</span></div>
        <div class="card pad"><p class="recall">${highlight(recall, marks)}</p></div>
        ${(r.erreurs || []).length ? `<div class="card pad stack"><h2>Erreurs à corriger</h2>${r.erreurs.map(e => `<div class="fix"><p><mark class="hl ko">${mx(e.extrait)}</mark></p><p class="expected">${mx(e.correction)}</p></div>`).join("")}</div>` : ""}
        ${(r.oublis || []).length ? `<div class="card pad stack"><h2>Ce que tu as oublié</h2><ul class="plain">${r.oublis.map(o => `<li><mark class="hl warn">${mx(o)}</mark></li>`).join("")}</ul></div>` : ""}
        ${cards.length ? `<div class="card pad stack"><h2>${plural(cards.length, "carte de renfort", "cartes de renfort")}</h2>${cards.map(c => `<div class="term" style="padding:6px 0"><b>${cfront(c, true)}</b><p>${mx(c.back)}</p></div>`).join("")}<button class="btn sm" id="addc">Ajouter ces cartes au chapitre</button></div>` : ""}
        <button class="btn ghost" id="redo">Refaire une feuille blanche</button>`;
      $("redo").onclick = () => form("");
      if ($("addc")) $("addc").onclick = async () => {
        $("addc").disabled = true;
        const ins = await sb.from("cards").insert(cards.map(c => ({ chapter_id: id, front: String(c.front).slice(0, 500), back: String(c.back).slice(0, 2000), source_quote: c.source_quote ? String(c.source_quote).slice(0, 400) : null })));
        if (ins.error) { $("addc").disabled = false; return fail(ins.error, "Cartes non ajoutées"); }
        await loadAll(); $("addc").textContent = "Cartes ajoutées"; toast("Cartes de renfort ajoutées.");
      };
    }
    form("");
  }

  // ---------- méthode Feynman ----------
  function screenFeynman(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const T = "Méthode Feynman", here = location.hash, notions = cardsOf(id).map(c => c.front).slice(0, 40);
    function form(notion, expl) {
      app.innerHTML = toolHead(id, T) + `<h1>Explique-le à un enfant de 10 ans</h1><p class="muted">Si tu peux l'expliquer simplement, c'est que tu as compris. Pas de mots compliqués, des exemples, des phrases courtes.</p>
        <div class="field"><label for="fn">La notion à expliquer</label><input id="fn" type="text" maxlength="200" list="fnl" value="${esc(notion || "")}" placeholder="Ex. La mitose"><datalist id="fnl">${notions.map(n => `<option value="${esc(n)}"></option>`).join("")}</datalist></div>
        <div class="field"><label for="fe">Ton explication</label><textarea id="fe" style="min-height:32vh" placeholder="Imagine que…">${esc(expl || "")}</textarea></div>
        <button class="btn" id="go">Vérifier ma compréhension</button><p class="note">1 appel IA par vérification.</p><div id="msg"></div>`;
      $("go").onclick = async () => {
        const n = $("fn").value.trim(), e = $("fe").value.trim(); if (n.length < 2) return toast("Indique la notion."); if (e.length < 20) return toast("Écris ton explication.");
        $("go").disabled = true; $("msg").innerHTML = '<p class="muted" role="status">Merge relit ton explication…</p>';
        try { const text = await courseText(id); if (text.trim().length < 80) throw new Error("Importe d'abord ton cours dans ce chapitre.");
          const r = await ai({ action: "feynman", text, notion: n, explication: e }); if (location.hash === here) result(n, e, r.content || {});
        } catch (err) { if ($("go")) $("go").disabled = false; showErr($("msg"), err); }
      };
    }
    function result(n, e, r) {
      const note = Math.max(0, Math.min(5, Math.round(+r.note || 0))), sec = (t, arr, cls) => (arr || []).length ? `<div class="card pad stack"><h2>${t}</h2><ul class="plain ${cls || ""}">${li(arr)}</ul></div>` : "";
      app.innerHTML = toolHead(id, T) + `<div class="card done"><p class="small muted">${mx(n)}</p><div class="big">${note} / 5</div><div class="stars" role="img" aria-label="${note} sur 5">${[1, 2, 3, 4, 5].map(k => `<i class="${k <= note ? "on" : ""}"></i>`).join("")}</div><p>${mx(r.verdict || "")}</p></div>
        ${sec("Ce que tu as vraiment compris", r.compris)}${sec("Ce qui reste flou", r.flou)}${sec("Ce qui manque", r.manque)}
        ${(r.faux || []).length ? `<div class="card pad stack"><h2>À corriger</h2>${r.faux.map(f => `<div class="fix"><p><mark class="hl ko">${mx(f.dit)}</mark></p><p class="expected">${mx(f.correction)}</p></div>`).join("")}</div>` : ""}
        ${(r.jargon || []).length ? `<div class="card pad stack"><h2>Mots trop compliqués</h2><div class="chips">${r.jargon.map(j => `<span class="pill warn">${mx(j)}</span>`).join("")}</div></div>` : ""}
        ${r.conseil ? `<div class="banner"><div><h2>Conseil</h2><p class="small">${mx(r.conseil)}</p></div></div>` : ""}
        <button class="btn" id="retry">Améliorer mon explication</button><button class="btn ghost" id="other">Expliquer une autre notion</button>`;
      $("retry").onclick = () => form(n, e); $("other").onclick = () => form("", "");
    }
    form("", "");
  }

  // ---------- professeur IA + « Rends ça concret » ----------
  const threads = {};
  function screenAsk(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const th = threads[id] = threads[id] || [];
    const THEMES = [["pop", "Pop culture"], ["manga", "Mangas"], ["sport", "Sport"], ["quotidien", "Vie quotidienne"]];
    function draw(err) {
      app.innerHTML = toolHead(id, "Professeur IA") + `<h1>Pose tes questions sur ton cours</h1><p class="muted">Ton professeur IA répond uniquement avec ce qui est écrit dans « ${esc(ch.name)} ». Si la réponse n'y est pas, il te le dit.</p>
        <div class="stack" id="thread">${th.map((m, k) => m.role === "eleve" ? `<div class="bubble me">${esc(m.text)}</div>` : `<div class="bubble card"><div class="md">${md(m.text)}</div>${m.concret ? "" : `<div class="concret"><span class="small muted">Rends ça concret avec :</span><div class="chips">${THEMES.map(t => `<button class="chip sm" data-th="${t[0]}" data-k="${k}">${t[1]}</button>`).join("")}</div></div>`}</div>`).join("")}</div>
        <div id="amsg"></div>
        <div class="field"><label for="qq">Ta question</label><textarea id="qq" style="min-height:90px" placeholder="Ex. C'est quoi la différence entre période et fréquence ?"></textarea></div>
        <button class="btn" id="send">Demander</button><p class="note">1 appel IA par question ou par exemple concret.</p>`;
      if (err) showErr($("amsg"), err);
      const busy = (on, msg) => { app.querySelectorAll("#send,[data-th]").forEach(b => b.disabled = on); if (on) $("amsg").innerHTML = `<p class="muted" role="status">${msg}</p>`; };
      $("send").onclick = async () => {
        const q = $("qq").value.trim(); if (q.length < 3) return toast("Écris ta question.");
        busy(true, "Ton professeur cherche dans ton cours…");
        try { const text = await courseText(id); if (!text.trim()) throw new Error("Importe d'abord ton cours dans ce chapitre.");
          const r = await ai({ action: "prof", text, question: q, history: th.slice(-6).map(m => ({ role: m.role, text: m.text })) });
          th.push({ role: "eleve", text: q }, { role: "prof", text: r.answer || "" }); if ($("thread")) draw();
        } catch (e) { if ($("thread")) { busy(false); showErr($("amsg"), e); } }
      };
      app.querySelectorAll("[data-th]").forEach(b => b.onclick = async () => {
        const k = +b.dataset.k, q = th[k - 1] ? th[k - 1].text : "", label = THEMES.find(t => t[0] === b.dataset.th)[1];
        busy(true, "Merge cherche une comparaison…");
        try { const text = await courseText(id); const r = await ai({ action: "concret", text, notion: q, theme: b.dataset.th });
          th.push({ role: "eleve", text: "Rends ça concret (" + label.toLowerCase() + ") : " + q }, { role: "prof", text: r.answer || "", concret: true }); if ($("thread")) draw();
        } catch (e) { if ($("thread")) { busy(false); showErr($("amsg"), e); } }
      });
      if (th.length) { const last = $("thread").lastElementChild; if (last && last.scrollIntoView) last.scrollIntoView({ block: "nearest" }); }
    }
    draw();
  }

  // ---------- bilan de la semaine ----------
  function screenWeek() {
    drawTabs("progres");
    const d14 = lastDays(14, state.sessions), cur = d14.slice(7), prev = d14.slice(0, 7);
    const sum = (a, k) => a.reduce((x, y) => x + (y[k] || 0), 0), days = a => a.filter(x => x.seconds > 0 || x.cards_reviewed > 0).length;
    const mins = Math.round(sum(cur, "seconds") / 60), pmins = Math.round(sum(prev, "seconds") / 60), cards = sum(cur, "cards_reviewed"), pcards = sum(prev, "cards_reviewed"), nd = days(cur), pd = days(prev);
    const weak = state.chapters.map(c => ({ c, n: cardsOf(c.id).length, m: mastery(cardsOf(c.id)) })).filter(x => x.n).sort((a, b) => a.m - b.m)[0];
    const diff = (a, b) => a === b ? "comme la semaine d'avant" : (a > b ? "+" + (a - b) : "−" + (b - a)) + " par rapport à la semaine d'avant";
    const goal = Math.min(7, Math.max(3, nd + 1)), si = streakInfo();
    safeSet("merge.bilanseen", localDay(mondayOf(new Date())));
    app.innerHTML = `<div class="row"><a class="iconbtn" href="#progres" aria-label="Retour">${I.back}</a><h1>Bilan de la semaine</h1></div>
      <p class="muted">Les 7 derniers jours, comparés aux 7 d'avant.</p>
      <div class="card stats"><div class="stat s1"><span class="sico">${I.cal}</span><div><b>${nd} / 7</b><span>jours révisés</span></div></div><div class="stat s2"><span class="sico">${I.cards}</span><div><b>${cards}</b><span>cartes révisées</span></div></div><div class="stat s3"><span class="sico">${I.clock}</span><div><b>${mins} min</b><span>de révision</span></div></div><div class="stat s4"><span class="sico">${I.bolt}</span><div><b>${si.n}</b><span>${si.n > 1 ? "jours d'affilée" : "jour d'affilée"}</span></div></div></div>
      <div class="card pad stack"><h2>Par rapport à la semaine d'avant</h2><div class="srow"><span>Jours révisés</span><b>${diff(nd, pd)}</b></div><div class="srow"><span>Cartes</span><b>${diff(cards, pcards)}</b></div><div class="srow"><span>Minutes</span><b>${diff(mins, pmins)}</b></div></div>
      <div class="card pad stack"><h2>Tes 7 derniers jours</h2><div class="wbars" role="img" aria-label="Révision des 7 derniers jours">${(() => { const val = y => Math.max(y.seconds, y.cards_reviewed * 20), top = Math.max(300, ...cur.map(val)), td = localDay(); return cur.map(x => { const v = val(x), isT = x.day === td; return `<div class="wcol${isT ? " now" : ""}${v ? " hit" : ""}"><span class="wv">${x.cards_reviewed ? x.cards_reviewed : x.seconds ? Math.round(x.seconds / 60) + "′" : ""}</span><div class="wtrack"><i style="height:${v ? Math.max(8, Math.round(v / top * 100)) : 0}%"></i>${v ? "" : "<b></b>"}</div><span class="wd">${isT ? "Auj." : "DLMMJVS"[new Date(x.day + "T00:00:00").getDay()]}</span></div>`; }).join(""); })()}</div><p class="small muted">Nombre de cartes révisées chaque jour (ou minutes, ′).</p></div>
      ${weak ? `<div class="banner"><div><h2>Ton chapitre le plus fragile</h2><p class="small">${esc(weak.c.name)} : ${weak.m} % de maîtrise.</p></div><a class="btn sm" href="#cartes-${weak.c.id}">Le réviser</a></div>` : ""}
      <div class="card pad stack"><h2>Objectif de la semaine prochaine</h2><p>${nd >= 7 ? "Tu as révisé tous les jours. Garde ce rythme." : "Réviser " + goal + " jours sur 7, même 5 minutes."}</p><p class="note">${si.frozen ? "Ton gel de série a sauvé un jour raté cette semaine." : "Gel de série : 1 jour raté par semaine ne casse pas ta série."}</p></div>`;
  }

  // ---------- statistiques d'un chapitre ----------
  function screenStats(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; recordHist([id], 0, null);
    const cs = cardsOf(id), m = mastery(cs), h = jget("merge.hist." + id, []), right = cs.reduce((a, c) => a + (c.right_count || 0), 0), wrong = cs.reduce((a, c) => a + (c.wrong_count || 0), 0), secs = parseInt(safeGet("merge.time." + id), 10) || 0;
    const worst = cs.filter(c => (c.wrong_count || 0) > 0).sort((a, b) => b.wrong_count - a.wrong_count).slice(0, 5);
    const pts = h.map((x, i) => [h.length > 1 ? 6 + i * 288 / (h.length - 1) : 150, 94 - x.m * 0.88]);
    app.innerHTML = toolHead(id, "Statistiques") + `<h1>${esc(ch.name)}</h1>
      <div class="card stats"><div class="stat s2"><span class="sico">${I.check}</span><div><b>${m} %</b><span>de maîtrise</span></div></div><div class="stat s1"><span class="sico">${I.cards}</span><div><b>${cs.filter(isMastered).length} / ${cs.length}</b><span>cartes maîtrisées</span></div></div><div class="stat s4"><span class="sico">${I.bolt}</span><div><b>${right + wrong ? Math.round(right / (right + wrong) * 100) + " %" : "–"}</b><span>de bonnes réponses sur ${right + wrong}</span></div></div><div class="stat s3"><span class="sico">${I.clock}</span><div><b>${Math.round(secs / 60)} min</b><span>passées sur les cartes</span></div></div></div>
      <div class="card pad stack"><h2>Ta maîtrise dans le temps</h2>${h.length > 1 ? `<svg class="curve" viewBox="0 0 300 100" preserveAspectRatio="none" role="img" aria-label="Courbe de maîtrise"><path d="M6 94H294M6 50H294M6 6H294" class="gl"/><polyline points="${pts.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")}"/>${pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.5"/>`).join("")}</svg><div class="row between small muted"><span>${esc(new Date(h[0].d + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" }))}</span><span>aujourd'hui</span></div>` : '<p class="muted">La courbe se dessine au fil des jours : reviens après ta prochaine session.</p>'}<p class="note">Suivi depuis le 13 novembre 2026, gardé sur cet appareil.</p></div>
      <div class="card pad stack"><h2>Les cartes que tu rates le plus</h2>${worst.length ? worst.map(c => `<div class="srow"><span>${esc(c.front)}</span><b class="r">${c.wrong_count} ×</b></div>`).join("") + `<a class="btn sm" href="#difficiles-${id}">Travailler ces cartes</a>` : '<p class="muted">Aucune carte ratée pour l\'instant.</p>'}</div>`;
  }

  // ---------- schémas à légender : l'élève cache des zones d'une page et s'entraîne à les retrouver ----------
  async function screenOccl(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const here = location.hash, key = "merge.occl." + id, data = jget(key, {}), urls = {}, dir = state.user.id + "/" + id;
    let pages = Object.keys(data), cur = null, mode = "edit", open = new Set();
    app.innerHTML = toolHead(id, "Schémas à légender") + '<p class="muted">Chargement…</p>';
    try { const r = await sb.storage.from("cours").list(dir, { limit: 200 }); (r.data || []).forEach(f => { const p = dir + "/" + f.name; if (/\.(jpe?g|png|webp)$/i.test(f.name) && !pages.includes(p)) pages.push(p); }); } catch (e) { /* liste indisponible */ }
    if (location.hash !== here) return;
    const urlOf = async (p) => { if (urls[p] !== undefined) return urls[p]; try { const { data: d, error } = await sb.storage.from("cours").createSignedUrl(p, 3600); urls[p] = !error && d ? d.signedUrl : null; } catch (e) { urls[p] = null; } return urls[p]; };
    const save = () => { Object.keys(data).forEach(k => { if (!data[k].length) delete data[k]; }); jset(key, data); };
    async function addImage(file) {
      try {
        const bmp = await createImageBitmap(file), k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k); cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
        const blob = await new Promise(r => cv.toBlob(r, "image/jpeg", 0.85)), path = dir + "/schema-" + Date.now() + ".jpg";
        const up = await sb.storage.from("cours").upload(path, blob, { contentType: "image/jpeg" }); if (up.error) throw up.error;
        urls[path] = URL.createObjectURL(blob); pages.unshift(path); cur = path; mode = "edit"; draw();
      } catch (e) { toast("Image non ajoutée : " + (e.message || "format non lu") + "."); }
    }
    async function draw() {
      if (location.hash !== here) return;
      if (!cur) {
        app.innerHTML = toolHead(id, "Schémas à légender") + `<h1>Schémas à légender</h1><p class="muted">Choisis une page de ton cours avec un schéma, cache les légendes, puis entraîne-toi à les retrouver.</p>
          <label class="btn sm" for="oadd">${I.plus}Ajouter une image</label><input id="oadd" type="file" accept="image/*" hidden>
          <div class="ogrid">${pages.length ? pages.map((p, i) => `<button class="card othumb" data-pg="${i}"><span class="oimg" data-th="${i}"></span><span class="small muted">${(data[p] || []).length ? plural(data[p].length, "cache", "caches") : "Aucun cache"}</span></button>`).join("") : `<div class="card empty"><span class="mico big">${I.grid}</span><b>Aucune page avec schéma dans ce chapitre</b><p class="small muted">Ajoute une photo ou une capture d'un schéma de ton cours.</p></div>`}</div>`;
        $("oadd").onchange = e => { if (e.target.files[0]) addImage(e.target.files[0]); };
        app.querySelectorAll("[data-pg]").forEach(b => b.onclick = () => { cur = pages[+b.dataset.pg]; mode = (data[cur] || []).length ? "train" : "edit"; open = new Set(); draw(); });
        pages.slice(0, 30).forEach(async (p, i) => { const u = await urlOf(p), el = app.querySelector(`[data-th="${i}"]`); if (el) el.innerHTML = u ? `<img src="${esc(u)}" alt="Page ${i + 1} du cours" loading="lazy">` : '<span class="small muted">Image indisponible</span>'; });
        return;
      }
      const u = await urlOf(cur), masks = data[cur] || (data[cur] = []); if (location.hash !== here) return;
      app.innerHTML = toolHead(id, "Schémas à légender") + `<div class="row between" style="flex-wrap:wrap"><button class="btn sm ghost" id="oback">${I.back}Toutes les pages</button><div class="seg" role="group" aria-label="Mode"><button data-om="edit" aria-pressed="${mode === "edit"}">Placer les caches</button><button data-om="train" aria-pressed="${mode === "train"}">S'entraîner</button></div></div>
        <p class="note" id="ohint">${mode === "edit" ? "Fais glisser ton doigt ou ta souris sur une légende pour la cacher. Touche un cache pour l'enlever." : masks.length ? "Devine ce qu'il y a sous chaque cache, puis touche-le pour vérifier." : "Place d'abord au moins un cache."}</p>
        ${u ? `<div class="occl ${mode}" id="occl"><img src="${esc(u)}" alt="Schéma du cours" draggable="false">${masks.map((k, i) => `<button class="omask${open.has(i) ? " open" : ""}" data-mk="${i}" style="left:${k.x}%;top:${k.y}%;width:${k.w}%;height:${k.h}%" aria-label="Cache ${i + 1}"><span>${i + 1}</span></button>`).join("")}</div>` : '<p class="err">Image indisponible. Vérifie ta connexion.</p>'}
        <div class="row" style="flex-wrap:wrap">${mode === "train" ? `<span class="pill" id="ocount">${open.size} / ${masks.length} découverts</span><button class="btn sm ghost" id="ohide">Tout recacher</button>` : `<span class="pill">${plural(masks.length, "cache", "caches")}</span><button class="btn sm ghost" id="oclear">Enlever tous les caches</button>`}</div>`;
      $("oback").onclick = () => { save(); cur = null; draw(); };
      app.querySelectorAll("[data-om]").forEach(b => b.onclick = () => { mode = b.dataset.om; open = new Set(); draw(); });
      if ($("ohide")) $("ohide").onclick = () => { open = new Set(); draw(); };
      if ($("oclear")) $("oclear").onclick = () => { data[cur] = []; save(); draw(); };
      const box = $("occl"); if (!box) return;
      box.querySelectorAll("[data-mk]").forEach(b => b.onclick = (e) => { e.stopPropagation(); const i = +b.dataset.mk; if (mode === "edit") { masks.splice(i, 1); save(); draw(); } else { open.has(i) ? open.delete(i) : open.add(i); b.classList.toggle("open", open.has(i)); $("ocount").textContent = open.size + " / " + masks.length + " découverts"; } });
      if (mode !== "edit") return;
      let st = null, ghost = null; const pos = e => { const r = box.getBoundingClientRect(); return [Math.min(100, Math.max(0, (e.clientX - r.left) / r.width * 100)), Math.min(100, Math.max(0, (e.clientY - r.top) / r.height * 100))]; };
      box.onpointerdown = e => { if (e.target.closest("[data-mk]")) return; e.preventDefault(); st = pos(e); ghost = document.createElement("div"); ghost.className = "omask ghost"; box.appendChild(ghost); try { box.setPointerCapture(e.pointerId); } catch (er) { /* sans capture */ } };
      box.onpointermove = e => { if (!st) return; const p = pos(e); ghost.style.cssText = `left:${Math.min(st[0], p[0])}%;top:${Math.min(st[1], p[1])}%;width:${Math.abs(p[0] - st[0])}%;height:${Math.abs(p[1] - st[1])}%`; };
      box.onpointerup = box.onpointercancel = e => { if (!st) return; const p = pos(e), k = { x: +Math.min(st[0], p[0]).toFixed(2), y: +Math.min(st[1], p[1]).toFixed(2), w: +Math.abs(p[0] - st[0]).toFixed(2), h: +Math.abs(p[1] - st[1]).toFixed(2) }; st = null; if (ghost) ghost.remove(); if (k.w >= 2 && k.h >= 1.5) { masks.push(k); save(); draw(); } };
    }
    draw();
  }

  // ---------- demande libre : l'élève écrit ce qu'il veut, l'IA le fabrique à partir du cours ----------
  function screenLibre(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const key = "merge.libre." + id; let hist = []; try { hist = JSON.parse(safeGet(key) || "[]") || []; } catch (e) { hist = []; }
    const IDEAS = ["Fais-moi un plan du chapitre en 5 points", "10 questions pièges avec les réponses", "Explique-moi ce chapitre comme si j'avais 10 ans", "Une histoire pour retenir les définitions", "Classe les notions de la plus importante à la moins importante", "Ce qui tombe le plus souvent en contrôle d'après ce cours"];
    let draft = "", busy = false;
    function draw(err) {
      app.innerHTML = toolHead(id, "Demande libre") + `<div class="libre"><div class="stack"><h1>Demande ce que tu veux</h1><p class="muted">Écris exactement ce que tu veux pour réviser « ${esc(ch.name)} ». L'IA le fabrique uniquement à partir de ton cours.</p>
        <div class="field"><label for="lq">Ta demande</label><textarea id="lq" style="min-height:110px" maxlength="1200" placeholder="Ex. Fais-moi 10 questions pièges avec les réponses">${esc(draft)}</textarea></div>
        <div class="chips">${IDEAS.map((t, i) => `<button class="chip sm" data-idea="${i}">${t}</button>`).join("")}</div>
        <button class="btn" id="lsend"${busy ? " disabled" : ""}>${I.spark}Créer</button><p class="note">1 appel IA par demande. Les réponses restent gardées sur cet appareil.</p><div id="lmsg">${busy ? '<div class="row"><div class="spin" aria-hidden="true"></div><p class="muted" role="status">L\'IA prépare ta demande à partir de ton cours…</p></div>' : ""}</div></div>
        <div class="stack" id="lout">${hist.length ? hist.map((h, k) => `<div class="card pad stack"><div class="row between"><b>${esc(h.q)}</b><button class="mini" data-ldel="${k}">Retirer</button></div><div class="md">${md(h.a)}</div></div>`).join("") : '<div class="card empty"><span class="mico big">' + I.spark + '</span><b>Tes créations apparaîtront ici</b><p class="small muted">Choisis une idée ou écris la tienne.</p></div>'}</div></div>`;
      if (err) showErr($("lmsg"), err);
      app.querySelectorAll("[data-idea]").forEach(b => b.onclick = () => { $("lq").value = IDEAS[+b.dataset.idea]; $("lq").focus(); });
      app.querySelectorAll("[data-ldel]").forEach(b => b.onclick = () => { draft = $("lq").value; hist.splice(+b.dataset.ldel, 1); safeSet(key, JSON.stringify(hist)); draw(); });
      $("lsend").onclick = async () => {
        const q = $("lq").value.trim(); if (q.length < 4) return toast("Écris ce que tu veux."); draft = q; busy = true; draw();
        try { const text = await courseText(id); if (text.trim().length < 80) throw new Error("Importe d'abord ton cours dans ce chapitre.");
          const r = await ai({ action: "libre", text, demande: q }, "studio"); hist.unshift({ q, a: r.answer || "" }); hist = hist.slice(0, 8); safeSet(key, JSON.stringify(hist)); draft = ""; busy = false; if ($("lout")) draw();
        } catch (e) { busy = false; if ($("lout")) draw(e); }
      };
    }
    draw();
  }

  // ---------- khôlle : interrogation orale au micro ----------
  function screenOral(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const T = "Khôlle", here = location.hash, all = cardsOf(id);
    if (!all.length) return emptyTool(id, T, "Il faut au moins une carte dans ce chapitre.");
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition, list = shuffle(all).slice(0, 5), notes = [];
    let i = 0, rec = null, recDone = Promise.resolve();
    // iPhone : Safari peut planter si un son démarre alors que la dictée (micro) n'est pas complètement arrêtée.
    // On attend donc la vraie fin de la dictée (au plus 1,5 s) puis un court délai avant de lire la question.
    const wait = ms => new Promise(r => setTimeout(r, ms));
    function speakSafe(t) {
      stopSpeak(); try { if (rec) rec.abort(); } catch (e) { /* déjà arrêtée */ }
      Promise.race([recDone, wait(1500)]).then(() => wait(rec ? 400 : 0)).then(() => { if (location.hash === here) speakText(t, chLang(ch)); });
    }
    const FILL = /\b(e+u+h+|h+e+u+|bah|ben|hum+|genre|du coup|en fait|tu vois)\b/gi;
    function ask() {
      const c = list[i]; let final = "", t0 = 0, secs = 0, on = false;
      app.innerHTML = toolHead(id, T) + `<div class="bar"><i style="width:${i / list.length * 100}%"></i></div>
        <div class="card pad stack"><span class="pill" style="align-self:flex-start">Question ${i + 1} sur ${list.length}</span><h2 class="qtxt">${cfront(c)}</h2>
          ${"speechSynthesis" in window ? `<button class="linkbtn" id="hear" style="align-self:flex-start">${I.listen}Réécouter la question</button>` : ""}
          ${Rec ? `<button class="btn" id="mic">${I.mic}Répondre au micro</button><p class="transcript" id="tr" aria-live="polite"></p>` : `<p class="note">Ton navigateur ne gère pas la dictée vocale. Réponds à voix haute, puis écris ce que tu as dit.</p>`}
          <div class="field"${Rec ? " hidden" : ""} id="trf"><label for="trt">Ta réponse</label><textarea id="trt" style="min-height:100px"></textarea></div>
          <button class="btn ghost" id="done"${Rec ? " hidden" : ""}>Voir la correction</button><div id="fb" class="stack"></div></div>`;
      speakSafe(c.front);
      if ($("hear")) $("hear").onclick = () => { if (on) stop(); speakSafe(c.front); };
      const stop = () => { if (!on) return; on = false; secs = Math.max(1, Math.round((Date.now() - t0) / 1000)); try { rec.stop(); } catch (e) { /* déjà arrêté */ } if ($("mic")) { $("mic").innerHTML = I.mic + "Recommencer ma réponse"; $("mic").classList.remove("rec"); } if ($("trt")) { $("trt").value = final.trim(); $("trf").hidden = false; $("done").hidden = false; } };
      if (Rec) $("mic").onclick = () => {
        if (on) return stop();
        stopSpeak(); if (music.on) musicStop(); // pas de son pendant que le micro écoute (plantages de Safari sur iPhone)
        try {
          rec = new Rec(); rec.lang = chLang(ch); rec.continuous = true; rec.interimResults = true; final = "";
          let fin; recDone = new Promise(r => { fin = r; }); setTimeout(() => fin && fin(), 120000);
          rec.onresult = (ev) => { let interim = ""; for (let k = ev.resultIndex; k < ev.results.length; k++) { if (ev.results[k].isFinal) final += ev.results[k][0].transcript + " "; else interim += ev.results[k][0].transcript; } if ($("tr")) $("tr").innerHTML = esc(final) + `<i>${mx(interim)}</i>`; };
          rec.onerror = (ev) => { if ($("tr") && ev.error !== "aborted" && ev.error !== "no-speech") $("tr").textContent = ev.error === "not-allowed" ? "Micro refusé : autorise le micro pour ce site, ou écris ta réponse." : "La dictée s'est arrêtée (" + ev.error + "). Tu peux écrire ta réponse."; stop(); if ($("trf")) { $("trf").hidden = false; $("done").hidden = false; } };
          rec.onend = () => { stop(); fin(); };
          rec.start(); on = true; t0 = Date.now(); $("mic").innerHTML = I.x + "J'ai fini de répondre"; $("mic").classList.add("rec"); $("tr").textContent = "Je t'écoute…";
        } catch (e) { $("tr").textContent = "Impossible d'utiliser le micro. Écris ta réponse."; $("trf").hidden = false; $("done").hidden = false; }
      };
      $("done").onclick = () => {
        stop(); const said = $("trt").value.trim(), words = said ? said.split(/\s+/).length : 0, fill = (said.match(FILL) || []).length;
        $("done").hidden = true; if ($("mic")) $("mic").hidden = true; $("trt").readOnly = true;
        $("fb").innerHTML = `<p class="label">Réponse du cours</p><p class="expected">${mx(c.back)}</p>
          ${secs && words ? `<div class="tiles"><div class="tile"><b>${Math.round(words / secs * 60)}</b><span>mots par minute</span></div><div class="tile"><b>${fill}</b><span>${fill > 1 ? "hésitations" : "hésitation"} (euh, du coup…)</span></div></div>` : ""}
          <button class="linkbtn" id="aik">Correction détaillée par l'IA (1 appel)</button><div id="aiout"></div>
          <p class="note">C'est le sens qui compte, pas les mots exacts.</p><div class="answers"><button class="btn bad" id="ko">${I.x}Faux</button><button class="btn good" id="okb">${I.check}Juste</button></div>`;
        const next = (ok) => { ping(ok); notes.push({ c, ok }); if (!ok) logMistake(id, c.front, c.back, said, "khôlle", c.id); i++; i < list.length ? ask() : end(); };
        $("ko").onclick = () => next(false); $("okb").onclick = () => next(true);
        $("aik").onclick = async () => {
          if (said.length < 2) return toast("Je n'ai pas de réponse à corriger."); $("aik").disabled = true; $("aiout").innerHTML = '<p class="muted" role="status">Correction…</p>';
          try { const r = (await ai({ action: "khole", question: c.front, attendu: c.back, transcription: said })).content || {}; if (!$("aiout")) return;
            $("aiout").innerHTML = `<div class="card pad stack inner"><div class="row between"><b>Note de l'IA</b><span class="pill ${r.juste ? "" : "warn"}">${mx(String(r.note != null ? r.note : "?"))} / 20</span></div><p><b>Précision.</b> ${mx(r.precision || "")}</p><p><b>Aisance.</b> ${mx(r.aisance || "")}</p>${r.conseil ? `<p class="note">${mx(r.conseil)}</p>` : ""}</div>`;
          } catch (e) { if ($("aiout")) { showErr($("aiout"), e); $("aik").disabled = false; } }
        };
      };
    }
    function end() {
      if (location.hash !== here) return; const good = notes.filter(n => n.ok).length;
      app.innerHTML = toolHead(id, T) + `<div class="card done"><h1>${good === notes.length ? "Bon travail !" : "Khôlle terminée"}</h1><div class="big">${good} / ${notes.length}</div>${notes.some(n => !n.ok) ? `<div class="stack" style="text-align:left;width:100%"><p class="label">À revoir</p>${notes.filter(n => !n.ok).map(n => `<div class="term" style="padding:8px 0"><b>${mx(n.c.front)}</b><p>${mx(n.c.back)}</p></div>`).join("")}</div>` : ""}<button class="btn" id="again">Nouvelle khôlle</button><a class="btn ghost" href="#chapitre-${id}">Retour au chapitre</a></div>`;
      $("again").onclick = () => screenOral(id);
    }
    ask();
  }

  // ---------- combat de boss de fin de chapitre ----------
  function screenBoss(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const T = "Combat de boss", all = cardsOf(id);
    if (all.length < 4) return emptyTool(id, T, "Il faut au moins 4 cartes dans ce chapitre pour affronter le boss.");
    const B = { hp: 100, shields: 3, combo: 0, queue: shuffle(all), hits: 0, n: 0 };
    const bossSvg = (cls) => `<svg class="boss ${cls || ""}" viewBox="0 0 120 110" role="img" aria-label="Le boss du chapitre"><path d="M28 30 L18 6 L44 22 M92 30 L102 6 L76 22" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><rect x="14" y="20" width="92" height="80" rx="26" fill="currentColor"/><circle cx="44" cy="54" r="10" fill="#fff"/><circle cx="76" cy="54" r="10" fill="#fff"/><circle cx="${B.hp > 0 ? 46 : 44}" cy="56" r="4.500" fill="#14151c"/><circle cx="${B.hp > 0 ? 74 : 76}" cy="56" r="4.500" fill="#14151c"/><path d="${B.hp > 50 ? "M42 80 q18 -12 36 0" : B.hp > 0 ? "M44 80 h32" : "M42 76 q18 12 36 0"}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>`;
    const hud = (cls) => `<div class="bossbox">${bossSvg(cls)}<div class="grow stack" style="gap:8px"><div class="row between small"><b>Boss · ${mx(ch.name)}</b><span>${Math.max(0, B.hp)} PV</span></div><div class="bar hp" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.max(0, B.hp)}" aria-label="Points de vie du boss"><i style="width:${Math.max(0, B.hp)}%"></i></div>
      <div class="row between small"><span class="shields" role="img" aria-label="${plural(B.shields, "bouclier", "boucliers")}">${[0, 1, 2].map(k => `<i class="${k < B.shields ? "on" : ""}">${I.shield}</i>`).join("")}</span><span class="pill ${B.combo >= 3 ? "" : "ghostpill"}">Combo x${B.combo}</span></div></div></div>`;
    function ask() {
      if (B.hp <= 0 || B.shields <= 0) return end();
      if (!B.queue.length) B.queue = shuffle(all);
      const c = B.queue.shift(), opts = shuffle([c, ...lookalikes(c.back, all.filter(x => x.id !== c.id && x.back !== c.back), 3, x => x.back)]);
      app.innerHTML = toolHead(id, T) + hud() + `<div class="card pad stack"><h2 class="qtxt">${cfront(c)}</h2><p class="fb" id="fb" role="status"></p><div class="opts">${opts.map((o, k) => `<button class="opt" data-i="${k}">${mx(o.back)}</button>`).join("")}</div><button class="btn" id="cont" hidden>Continuer</button></div>`;
      screenSession.key = (e) => { const n = "1234".indexOf(e.key), bs = app.querySelectorAll(".opt"); if (n >= 0 && bs[n] && !bs[n].disabled) bs[n].click(); else if (e.key === "Enter" && $("cont") && !$("cont").hidden) $("cont").click(); };
      app.querySelectorAll(".opt").forEach(b => b.onclick = () => {
        const ok = opts[+b.dataset.i].id === c.id; B.n++;
        app.querySelectorAll(".opt").forEach(x => { x.disabled = true; if (opts[+x.dataset.i].id === c.id) x.classList.add("good"); }); if (!ok) b.classList.add("bad");
        let dmg = 0; if (ok) { B.combo++; B.hits++; dmg = 12 + (B.combo >= 3 ? 6 : 0); B.hp -= dmg; } else { B.combo = 0; B.shields--; logMistake(id, c.front, c.back, opts[+b.dataset.i].back, "boss", c.id); }
        ping(ok); app.querySelector(".bossbox").outerHTML = hud(ok ? "hit" : "atk");
        $("fb").className = "fb " + (ok ? "ok" : "ko"); $("fb").textContent = ok ? "Touché ! " + dmg + " dégâts" + (B.combo >= 3 ? " (bonus de combo)" : "") + "." : "Raté : tu perds un bouclier.";
        $("cont").hidden = false; $("cont").onclick = ask; $("cont").focus();
      });
    }
    function end() {
      const win = B.hp <= 0; if (win) safeSet("merge.boss." + id, "1");
      app.innerHTML = toolHead(id, T) + `<div class="card done">${bossSvg(win ? "dead" : "")}<h1>${win ? "Boss vaincu !" : "Le boss a gagné"}</h1><p class="muted">${win ? "Tu as terminé « " + esc(ch.name) + " » avec " + plural(B.shields, "bouclier restant", "boucliers restants") + "." : "Il lui restait " + B.hp + " PV. Révise tes cartes et reviens le défier."}</p><p class="small muted">${B.hits} bonnes réponses sur ${B.n}.</p><button class="btn" id="again">${win ? "Rejouer" : "Retenter le combat"}</button><a class="btn ghost" href="#${win ? "chapitre" : "cartes"}-${id}">${win ? "Retour au chapitre" : "Réviser les cartes"}</a></div>`;
      if (win) confetti(Math.random() < 0.5 ? "feux" : "explosion");
      $("again").onclick = () => screenBoss(id);
    }
    app.innerHTML = toolHead(id, T) + `<div class="card done">${bossSvg()}<h1>Le boss de « ${mx(ch.name)} »</h1><p class="muted">Il a 100 PV. Chaque bonne réponse lui inflige 12 dégâts, 18 à partir de 3 bonnes réponses d'affilée. Chaque erreur te coûte un de tes 3 boucliers.</p><button class="btn" id="fight">Combattre</button></div>`;
    $("fight").onclick = ask;
  }

  // ---------- flash 60 secondes ----------
  function screenFlash(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const T = "Flash 60 secondes", all = cardsOf(id), bestKey = "merge.flash." + id;
    if (all.length < 4) return emptyTool(id, T, "Il faut au moins 4 cartes dans ce chapitre pour ce mode.");
    const S = { score: 0, combo: 0, good: 0, n: 0, end: 0, q: null, int: null, best: +(safeGet(bestKey) || 0) };
    const mult = () => Math.min(5, 1 + Math.floor(S.combo / 3));
    // De plus en plus vite : chaque question a son propre temps (6 s au début, puis 0,25 s de moins à chaque réponse,
    // 1,5 s au minimum). Trop lent = compté faux et le combo retombe.
    const qTime = () => Math.max(1500, 6000 - S.n * 250);
    function nextQ() { S.qEnd = Date.now() + qTime(); S.qLen = qTime(); const c = all[Math.floor(Math.random() * all.length)], truth = Math.random() < 0.5, other = lookalikes(c.back, shuffle(all.filter(x => x.id !== c.id && x.back !== c.back)), 2, x => x.back)[Math.random() < 0.7 ? 0 : 1] || all.find(x => x.id !== c.id && x.back !== c.back); S.q = { c, truth: truth || !other, shown: truth || !other ? c.back : other.back }; draw(); }
    function draw(flash) {
      const left = Math.max(0, Math.ceil((S.end - Date.now()) / 1000));
      app.innerHTML = toolHead(id, T) + `<div class="row between"><span class="big" id="fclock" role="timer">${left} s</span><div style="text-align:right"><div class="big">${S.score}</div><span class="pill ${mult() > 1 ? "" : "ghostpill"}">x${mult()}</span></div></div><div class="bar"><i id="fbar" style="width:${left / 60 * 100}%"></i></div>
        <div class="card pad stack flashq ${flash || ""}"><div class="qbar" aria-hidden="true"><i id="qbar"></i></div><span class="small muted" id="qspeed">${(S.qLen / 1000).toFixed(1).replace(".", ",")} s par question</span><h2 class="qtxt">${mx(S.q.c.front)}</h2><p class="expected neutral">${mx(S.q.shown)}</p></div>
        <div class="answers"><button class="btn bad" id="faux">${I.x}Faux</button><button class="btn good" id="vrai">${I.check}Vrai</button></div><p class="note" style="text-align:center">La réponse affichée est-elle la bonne ? Au clavier : flèche gauche = faux, flèche droite = vrai.</p>`;
      $("vrai").onclick = () => pick(true); $("faux").onclick = () => pick(false);
    }
    function pick(v, late) {
      if (Date.now() >= S.end) return; const ok = !late && v === S.q.truth; S.n++;
      if (ok) { S.score += 10 * mult(); S.combo++; S.good++; } else { S.combo = 0; logMistake(id, S.q.c.front, S.q.c.back, S.q.truth ? "" : S.q.shown, "flash", S.q.c.id); }
      ping(ok); const prev = ok ? "okflash" : "koflash"; nextQ(); const el = app.querySelector(".flashq"); if (el) el.classList.add(prev);
    }
    function finish() {
      clearInterval(S.int); screenSession.key = null; const rec = S.score > S.best; if (rec) safeSet(bestKey, String(S.score));
      app.innerHTML = toolHead(id, T) + `<div class="card done"><h1>${rec ? "Nouveau record !" : "Temps écoulé"}</h1><div class="big">${S.score} points</div><p class="muted">${S.good} bonnes réponses sur ${S.n}. Record : ${Math.max(S.best, S.score)} points.</p><button class="btn" id="again">Rejouer</button><a class="btn ghost" href="#chapitre-${id}">Retour au chapitre</a></div>`;
      $("again").onclick = () => screenFlash(id);
    }
    app.innerHTML = toolHead(id, T) + `<div class="card done"><div class="tutoicon">${I.bolt}</div><h1>60 secondes chrono</h1><p class="muted">Une question, une réponse affichée : vrai ou faux ? Ça va de plus en plus vite : 6 secondes pour la première, puis un peu moins à chaque réponse. Trop lent, c'est compté faux. Toutes les 3 bonnes réponses d'affilée, ton multiplicateur monte (jusqu'à x5). Une erreur le remet à x1.</p>${S.best ? `<p class="small muted">Ton record : ${S.best} points.</p>` : ""}<button class="btn" id="go">C'est parti</button></div>`;
    $("go").onclick = () => {
      S.end = Date.now() + 60000;
      S.int = setInterval(() => { const el = $("fclock"); if (!el) return clearInterval(S.int); const now = Date.now(), left = Math.max(0, Math.ceil((S.end - now) / 1000)); el.textContent = left + " s"; $("fbar").style.width = left / 60 * 100 + "%"; const qb = $("qbar"); if (qb) qb.style.width = Math.max(0, (S.qEnd - now) / S.qLen * 100) + "%"; if (left <= 0) return finish(); if (now > S.qEnd) pick(null, true); }, 100);
      screenSession.key = (e) => { if (e.key === "ArrowRight" || e.key.toLowerCase() === "v") pick(true); if (e.key === "ArrowLeft" || e.key.toLowerCase() === "f") pick(false); };
      nextQ();
    };
  }

  // ---------- face-à-face : les notions qu'on confond ----------
  function screenVersus(id) {
    toolGate(id, "faceaface", "Face-à-face", "Merge repère dans ton cours les notions qu'on confond souvent (par exemple masse et poids, mitose et méiose), les compare dans un tableau, puis te teste.", (data, ch, regen) => {
      const pairs = (data.paires || []).filter(p => p && p.a && p.b); let k = 0;
      if (!pairs.length) { emptyTool(id, "Face-à-face", "Merge n'a pas trouvé de notions qui se confondent dans ce cours."); app.insertAdjacentHTML("beforeend", regenHtml); return wireRegen(regen); }
      function table() {
        const p = pairs[k], qs = (p.quiz || []).filter(q => q && q.affirmation && /^[ab]$/i.test(String(q.reponse)));
        app.innerHTML = toolHead(id, "Face-à-face") + (pairs.length > 1 ? `<div class="chips">${pairs.map((x, n) => `<button class="chip" data-p="${n}" aria-pressed="${n === k}">${mx(x.a)} / ${mx(x.b)}</button>`).join("")}</div>` : "") +
          `<div class="card pad stack"><div class="vshead"><b>${mx(p.a)}</b><span>VS</span><b>${mx(p.b)}</b></div><div class="scrollx"><table class="vs"><thead><tr><td></td><th scope="col">${mx(p.a)}</th><th scope="col">${mx(p.b)}</th></tr></thead><tbody>${(p.criteres || []).map(c => `<tr><th scope="row">${mx(c.critere)}</th><td>${mx(c.a)}</td><td>${mx(c.b)}</td></tr>`).join("")}</tbody></table></div></div>
          ${qs.length ? `<button class="btn" id="vq">Mini-quiz réflexe</button>` : ""}${regenHtml}`;
        app.querySelectorAll("[data-p]").forEach(b => b.onclick = () => { k = +b.dataset.p; table(); });
        if ($("vq")) $("vq").onclick = () => quiz(p, shuffle(qs)); wireRegen(regen);
      }
      function quiz(p, qs) {
        let n = 0, good = 0;
        (function ask() {
          if (n >= qs.length) { app.innerHTML = toolHead(id, "Face-à-face") + `<div class="card done"><h1>${good === qs.length ? "Bon travail !" : "C'est fini"}</h1><div class="big">${good} / ${qs.length}</div><button class="btn" id="bk">Revoir le tableau</button></div>`; $("bk").onclick = table; return; }
          const q = qs[n], rep = String(q.reponse).toLowerCase();
          app.innerHTML = toolHead(id, "Face-à-face") + `<div class="bar"><i style="width:${n / qs.length * 100}%"></i></div><div class="card pad stack"><p class="small muted">De quelle notion parle-t-on ?</p><h2 class="qtxt">${mx(q.affirmation)}</h2><p class="fb" id="fb" role="status"></p><div class="answers"><button class="btn ghost" data-r="a">${mx(p.a)}</button><button class="btn ghost" data-r="b">${mx(p.b)}</button></div><button class="btn" id="cont" hidden>Continuer</button></div>`;
          app.querySelectorAll("[data-r]").forEach(b => b.onclick = () => { const ok = b.dataset.r === rep; ping(ok); if (ok) good++; else logMistake(id, q.affirmation, rep === "a" ? p.a : p.b, b.dataset.r === "a" ? p.a : p.b, "face-à-face"); app.querySelectorAll("[data-r]").forEach(x => { x.disabled = true; if (x.dataset.r === rep) x.classList.add("goodsel"); }); $("fb").className = "fb " + (ok ? "ok" : "ko"); $("fb").textContent = ok ? "Bon réflexe !" : "C'était : " + (rep === "a" ? p.a : p.b) + "."; $("cont").hidden = false; $("cont").onclick = () => { n++; ask(); }; $("cont").focus(); });
        })();
      }
      table();
    });
  }

  // ---------- mains libres : lecteur audio question, pause, réponse ----------
  let busStop = null;
  function silentAudio() {
    const n = 8000, b = new Uint8Array(44 + n), v = new DataView(b.buffer), w = (o, s) => { for (let k = 0; k < s.length; k++) b[o + k] = s.charCodeAt(k); };
    w(0, "RIFF"); v.setUint32(4, 36 + n, true); w(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, "data"); v.setUint32(40, n, true); b.fill(128, 44);
    const a = new Audio(URL.createObjectURL(new Blob([b], { type: "audio/wav" }))); a.loop = true; return a;
  }
  function screenBus(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const T = "Mains libres", all = cardsOf(id);
    if (!all.length) return emptyTool(id, T, "Il faut au moins une carte dans ce chapitre.");
    if (!("speechSynthesis" in window)) return emptyTool(id, T, "Ton navigateur ne sait pas lire à voix haute.");
    const B = { list: all.slice(), i: 0, phase: "q", playing: false, pause: 4, timer: null, audio: null, token: 0 }, lang = chLang(ch), ms = "mediaSession" in navigator;
    const meta = () => { if (!ms) return; try { navigator.mediaSession.metadata = new MediaMetadata({ title: B.list[B.i].front.slice(0, 90), artist: ch.name, album: "Merge." }); navigator.mediaSession.playbackState = B.playing ? "playing" : "paused"; } catch (e) { /* non géré */ } };
    function step() {
      if (!B.playing) return; const my = ++B.token, c = B.list[B.i], live = () => B.playing && my === B.token;
      draw(); meta();
      if (B.phase === "q") speakText(c.front, lang, () => { if (!live()) return; B.phase = "p"; draw(); B.timer = setTimeout(() => { if (!live()) return; B.phase = "a"; step(); }, B.pause * 1000); });
      else speakText(c.back, lang, () => { if (!live()) return; B.timer = setTimeout(() => { if (!live()) return; B.i = (B.i + 1) % B.list.length; B.phase = "q"; if (B.i === 0) { pause(); return draw(); } step(); }, 1200); });
    }
    function play() { B.playing = true; try { B.audio = B.audio || silentAudio(); B.audio.play().catch(() => {}); } catch (e) { /* pas d'audio de fond */ } step(); }
    function pause() { B.playing = false; B.token++; clearTimeout(B.timer); stopSpeak(); if (B.audio) B.audio.pause(); meta(); }
    function move(d) { const was = B.playing; pause(); B.i = (B.i + d + B.list.length) % B.list.length; B.phase = "q"; was ? play() : draw(); }
    function draw() {
      if (!location.hash.startsWith("#bus-")) return; const c = B.list[B.i];
      app.innerHTML = toolHead(id, "Écouter") + `<div class="seg" role="tablist"><a role="tab" aria-selected="false" href="#ecouter-${id}">Lecture</a><button role="tab" aria-selected="true">Mains libres</button></div><h1>${mx(ch.name)}</h1><div class="card pad stack player"><p class="small muted">Carte ${B.i + 1} sur ${B.list.length} · ${B.phase === "q" ? "Question" : B.phase === "p" ? "Réfléchis…" : "Réponse"}</p><p class="qtxt" aria-live="polite">${cfront(c)}</p><p class="expected${B.phase === "a" ? "" : " veiled"}">${B.phase === "a" ? esc(c.back) : "La réponse arrive après la pause."}</p><div class="bar"><i style="width:${(B.i + (B.phase === "a" ? 0.7 : 0.2)) / B.list.length * 100}%"></i></div>
        <div class="row" style="justify-content:center"><button class="iconbtn" id="bprev" aria-label="Carte précédente">${I.back}</button><button class="btn" id="bplay" style="min-width:140px">${B.playing ? "Pause" : "Lecture"}</button><button class="iconbtn" id="bnext" aria-label="Carte suivante" style="transform:scaleX(-1)">${I.back}</button></div></div>
        <div class="field"><span class="label">Temps de réflexion avant la réponse</span><div class="chips">${[2, 4, 6, 10].map(s => `<button class="chip" data-ps="${s}" aria-pressed="${B.pause === s}">${s} s</button>`).join("")}</div></div>
        <div class="row"><button class="chip" id="bshuf">Mélanger les cartes</button></div>
        <p class="note">Mets tes écouteurs et range ton téléphone : question, pause pour réfléchir, réponse, puis carte suivante. Les boutons lecture, pause et suivant de l'écran verrouillé ou des écouteurs fonctionnent quand le téléphone le permet.</p>`;
      $("bplay").onclick = () => { B.playing ? (pause(), draw()) : play(); };
      $("bprev").onclick = () => move(-1); $("bnext").onclick = () => move(1);
      $("bshuf").onclick = () => { pause(); B.list = shuffle(B.list); B.i = 0; B.phase = "q"; draw(); toast("Cartes mélangées."); };
      app.querySelectorAll("[data-ps]").forEach(b => b.onclick = () => { B.pause = +b.dataset.ps; draw(); });
    }
    if (ms) { try { const h = navigator.mediaSession; h.setActionHandler("play", play); h.setActionHandler("pause", () => { pause(); draw(); }); h.setActionHandler("nexttrack", () => move(1)); h.setActionHandler("previoustrack", () => move(-1)); } catch (e) { /* non géré */ } }
    busStop = () => { pause(); if (ms) { try { ["play", "pause", "nexttrack", "previoustrack"].forEach(a => navigator.mediaSession.setActionHandler(a, null)); navigator.mediaSession.metadata = null; } catch (e) { /* rien */ } } busStop = null; };
    draw();
  }

  // ---------- exercices guidés pas à pas ----------
  function screenExercises(id) {
    toolGate(id, "exercices", "Exercices guidés", "Trois exercices d'application construits avec les méthodes et les formules de ton cours. Tu avances seul, avec deux indices puis la solution rédigée si tu bloques.", (data, ch, regen) => {
      const exos = (data.exercices || []).filter(e => e && e.enonce); const open = exos.map(() => 0);
      if (!exos.length) return emptyTool(id, "Exercices guidés", "Aucun exercice n'a pu être préparé pour ce cours.");
      const LBL = ["Indice 1", "Indice 2", "Solution rédigée"];
      function draw() {
        app.innerHTML = toolHead(id, "Exercices guidés") + exos.map((e, k) => `<div class="card pad stack"><span class="pill" style="align-self:flex-start">Exercice ${k + 1}</span><h2>${mx(e.titre || "")}</h2><p class="enonce">${mx(e.enonce)}</p>
          ${open[k] >= 1 ? `<div class="hint"><b>Indice 1</b><p>${mx(e.indice1 || "")}</p></div>` : ""}${open[k] >= 2 ? `<div class="hint"><b>Indice 2</b><p>${mx(e.indice2 || "")}</p></div>` : ""}
          ${open[k] >= 3 ? `<div class="solution"><b>Solution rédigée</b>${(e.etapes || []).length ? `<ol>${li(e.etapes)}</ol>` : ""}<p>${mx(e.solution || "")}</p></div>` : `<button class="btn ghost sm" data-ex="${k}" style="align-self:flex-start">${open[k] === 0 ? "J'ai besoin d'un indice" : "Voir : " + LBL[open[k]]}</button>`}</div>`).join("") + regenHtml;
        app.querySelectorAll("[data-ex]").forEach(b => b.onclick = () => { open[+b.dataset.ex]++; const y = scrollY; draw(); scrollTo(0, y); }); wireRegen(regen);
      }
      draw();
    });
  }

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

  // ---------- navigation ----------
  let enterT = null, lastHash = null;
  function route() {
    app.classList.remove("enter"); void app.offsetWidth; app.classList.add("enter"); clearTimeout(enterT); enterT = setTimeout(() => app.classList.remove("enter"), 700);
    document.body.classList.remove("nav"); app.classList.toggle("profmode", /^#exos/.test(location.hash)); app.classList.toggle("planmode", /^#(calendrier|journee)/.test(location.hash));
    const pd = document.getElementById("pdrawer"); if (pd) pd.remove(); document.body.classList.remove("typing");
    // Section de Réglages ouverte : refermée quand on change d'écran, gardée quand le même écran est redessiné (réglage enregistré, synchro).
    if (location.hash !== lastHash) app.removeAttribute("data-sec"); lastHash = location.hash;
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
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(reg => { document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); }); }).catch(() => {});
  // Nouvelle version installée pendant que l'appli est ouverte : on recharge une fois pour l'afficher tout de suite.
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) { let reloaded = false; navigator.serviceWorker.addEventListener("controllerchange", () => { if (!reloaded) { reloaded = true; location.reload(); } }); }
  start();
})();
