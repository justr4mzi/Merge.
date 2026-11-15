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
  function coinsInfo() { const x = xpInfo(), st = rwState(), earned = Math.floor(x.xp / COIN_PTS) + levelBonus(x.level), spent = st.buys.reduce((a, b) => a + (+b.price || 0), 0); return { earned, spent, balance: Math.max(0, earned - spent) }; }
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
      <div class="big pclock" id="pclock">${fmtT(pomo.left)}</div><p class="muted" id="pphase"></p>
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

