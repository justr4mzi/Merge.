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
  const PEPS = ["Un peu chaque jour vaut mieux que tout la veille.", "Dix minutes maintenant, c'est ça de moins avant le contrôle.", "Ce que tu révises aujourd'hui, tu le sais encore dans un mois.", "Une carte après l'autre : c'est comme ça que ça rentre.", "Ton toi du contrôle te dira merci.", "Se tromper sur une carte, c'est déjà apprendre.", "Régulier bat intense. Toujours."];
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

  const svg = (d, extra) => `<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" ${extra || ""}>${d}</svg>`;
  const I = {
    back: svg('<path d="M15 6l-6 6 6 6"/>'), undo: svg('<path d="M9 7L4.5 11.5 9 16"/><path d="M5 11.5h9.5a5 5 0 010 10H12"/>'), search: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'), clock: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 3h5"/>'), star: svg('<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z"/>'), info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'), spark: svg('<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>'), x: svg('<path d="M6 6l12 12M18 6L6 18"/>'), plus: svg('<path d="M12 5v14M5 12h14"/>'),
    play: svg('<path d="M8 5.5v13l10.5-6.5z"/>'), pause: svg('<path d="M8.5 5.5v13M15.5 5.5v13"/>'), next: svg('<path d="M6 6v12l8.5-6zM18 6v12"/>'),
    home: svg('<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>'),
    gear: svg('<g transform="translate(12 12) scale(.82) translate(-12 -12)" stroke-width="2.6"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></g>'),
    cards: '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="7" width="15" height="11" rx="2.5"/><path d="M8 4h11a3 3 0 013 3v8a1 1 0 01-2 0V7a1 1 0 00-1-1H8a1 1 0 010-2z" opacity=".55"/></svg>',
    learn: svg('<path d="M20 12a8 8 0 11-3-6.2"/><path d="M20 4v4h-4"/>'),
    quiz: svg('<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h5"/>'),
    match: '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="4" width="11" height="8" rx="2"/><rect x="11" y="12" width="11" height="8" rx="2" opacity=".55"/></svg>',
    listen: svg('<path d="M4 14v-2a8 8 0 0116 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>'),
    sum: svg('<path d="M5 6h14M5 11h14M5 16h9"/>'),
    lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
    up: svg('<path d="M12 16V5M7 10l5-5 5 5M5 19h14"/>'),
    cal: svg('<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10.5h16M8.5 4v3.5M15.5 4v3.5"/>'),
    chart: svg('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 16v-3M12 16V8M15.5 16v-5"/>'),
    copy: svg('<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>'), share: svg('<path d="M12 15V4M8 8l4-4 4 4"/><path d="M6 12v6a2 2 0 002 2h8a2 2 0 002-2v-6"/>'),
    coin: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><path d="M12 9.5v5"/>'), gift: svg('<rect x="3.5" y="9" width="17" height="11" rx="2"/><path d="M12 9v11M3.5 13h17M12 9c-2.5 0-5-1-5-3s3-2 5 3c2-5 5-5 5-3s-2.5 3-5 3"/>'), shop: svg('<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9h16v2a2.7 2.7 0 01-5.3 0 2.7 2.7 0 01-5.4 0A2.7 2.7 0 014 11z"/><path d="M5.5 13.5V20h13v-6.5"/>'),
    duo: svg('<circle cx="9" cy="8" r="3.6"/><circle cx="16.5" cy="8.6" r="2.9"/><path d="M3.5 20a5.5 5.5 0 0111 0M14.5 15.3A4.6 4.6 0 0120.5 20"/>'),
    ask: svg('<path d="M5 5h14v10H10l-5 4z"/><path d="M10 8.500a2 2 0 113 1.700c-.6.4-1 .8-1 1.300M12 13.200v.1"/>'),
    subj: svg('<rect x="3.2" y="5.5" width="3.8" height="14.5" rx="1.1"/><rect x="9.2" y="4" width="3.8" height="16" rx="1.1"/><rect x="15.2" y="7.3" width="3.4" height="13" rx="1.1" transform="rotate(-12 15.2 7.3)"/><path d="M3.2 9.5H7M9.2 8H13"/>'),
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
    steps: svg('<path d="M4 19h5v-5h5V9h6"/>'),
    map: svg('<circle cx="5" cy="12" r="2.200"/><circle cx="18" cy="5" r="2.200"/><circle cx="18" cy="12" r="2.200"/><circle cx="18" cy="19" r="2.200"/><path d="M7.200 12h8.600M7 11c4 0 4-6 8.800-6M7 13c4 0 4 6 8.800 6"/>'),
    cloze: svg('<path d="M3 8h6M3 16h4M19 8h2M17 16h4"/><rect x="11" y="5" width="6" height="6" rx="1.500"/><rect x="9" y="13" width="6" height="6" rx="1.500"/>'),
    book: svg('<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z"/><path d="M5 17a3 3 0 013-3h11M12 7.500v3M12 12.500v.1"/>'),
    grid: svg('<rect x="4" y="3" width="16" height="18" rx="1.500"/><path d="M12 3v18M4 9h16M4 15h16"/>')
  };

