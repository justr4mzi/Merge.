// Schémas des cours et cartes en double : fonctions pures, utilisées par la fonction `studio` et testées par tests/run.js (suite « schemasServeur »).
//
// Pendant la lecture d'une photo, l'IA écrit pour chaque schéma une ligne repère :
//   [[SCHEMA|ymin,xmin,ymax,xmax|titre court]]
// suivie de sa description. Les 4 nombres sont le cadre du schéma sur la page, de 0 à 1000 (format habituel de Gemini).
// Ici on remplace chaque repère par « [Schéma S1 : titre] » (lisible pour le résumé, les cartes et le Prof)
// et on garde la liste des schémas (page, cadre) pour afficher l'image recadrée sur les cartes.

// L'IA n'écrit pas toujours le repère pareil : « 120,80,560,900 », « 120|80|560|900 », « [120, 80, 560, 900] »…
// (vu au test réel : séparateurs « | »). On lit donc les 4 premiers nombres, et le reste est le titre.
const MARK = /\[\[\s*SCHEMA\s*\|([^\n]*?)\]\](?!\])/gi;
const NUM = "\\s*\\[?\\s*(-?\\d+(?:\\.\\d+)?)";
const INNER = new RegExp("^" + NUM + "\\s*[,;|\\s]" + NUM + "\\s*[,;|\\s]" + NUM + "\\s*[,;|\\s]" + NUM + "\\s*\\]?\\s*(?:\\|\\s*)?([\\s\\S]*)$");
export function parseMark(inner) {
  const m = INNER.exec(String(inner ?? ""));
  return m ? { box: [m[1], m[2], m[3], m[4]].join(","), titre: m[5] } : { box: "", titre: String(inner ?? "").split("|").pop() };
}

// Cadre valide, un peu agrandi (marge de 2,5 % pour ne pas couper les légendes), sinon null.
export function cleanBox(raw) {
  const n = String(raw ?? "").split(/[,;\s]+/).filter(Boolean).map(Number);
  if (n.length !== 4 || n.some((x) => !Number.isFinite(x))) return null;
  let [y0, x0, y1, x1] = n.map((x) => Math.max(0, Math.min(1000, x)));
  if (y1 < y0) [y0, y1] = [y1, y0];
  if (x1 < x0) [x0, x1] = [x1, x0];
  const h = y1 - y0, w = x1 - x0;
  if (h < 60 || w < 60 || (h * w) / 1e6 < 0.015) return null; // trop petit : un mot ou un symbole, pas un schéma
  const pad = 25;
  return [Math.max(0, y0 - pad), Math.max(0, x0 - pad), Math.min(1000, y1 + pad), Math.min(1000, x1 + pad)].map(Math.round);
}

export function cleanTitle(t) {
  return String(t ?? "").replace(/[\[\]|*_#`]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

// Cadre d'une légende (un mot ou quelques mots sur le schéma) : petit, mais pas vide. Marge de 0,8 % pour bien la cacher.
export function cleanLabelBox(raw) {
  const n = String(raw ?? "").split(/[,;\s]+/).filter(Boolean).map(Number);
  if (n.length !== 4 || n.some((x) => !Number.isFinite(x))) return null;
  let [y0, x0, y1, x1] = n.map((x) => Math.max(0, Math.min(1000, x)));
  if (y1 < y0) [y0, y1] = [y1, y0];
  if (x1 < x0) [x0, x1] = [x1, x0];
  if (y1 - y0 < 4 || x1 - x0 < 6 || (y1 - y0) * (x1 - x0) > 120000) return null;
  const pad = 8;
  return [Math.max(0, y0 - pad), Math.max(0, x0 - pad), Math.min(1000, y1 + pad), Math.min(1000, x1 + pad)].map(Math.round);
}
// Une légende compte pour un schéma si son cadre est (presque) dans celui du schéma.
const inside = (l, b) => l[0] >= b[0] - 30 && l[1] >= b[1] - 30 && l[2] <= b[2] + 30 && l[3] <= b[3] + 30;

// pages : [{ text, path }] dans l'ordre du cours (path = photo de la page, ou null pour du texte).
// Renvoie { texts, schemas } : textes sans les repères, et schémas [{ id: "S1", path, box, titre, labels: [{ box, text }] }].
// Les légendes ([[LEGENDE|cadre|texte]], écrites juste après leur schéma) servent à les cacher côté question sur les cartes.
export function extractSchemas(pages) {
  const schemas = [];
  const texts = (pages || []).map((p) => {
    let perPage = 0, cur = null;
    return String(p?.text ?? "").replace(ANY, (_, kind, inner) => {
      const { box, titre } = parseMark(inner);
      if (/legende/i.test(kind.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) {
        const t = cleanTitle(titre), lb = cur ? cleanLabelBox(box) : null;
        if (t && lb && inside(lb, cur.box) && cur.labels.length < 20) cur.labels.push({ box: lb, text: t });
        return t ? `(légende : ${t})` : "";
      }
      const t = cleanTitle(titre) || "schéma", b = p?.path ? cleanBox(box) : null;
      if (!b || perPage >= 4 || schemas.length >= 60) { cur = null; return `[Schéma : ${t}]`; }
      perPage++;
      const id = "S" + (schemas.length + 1);
      cur = { id, path: p.path, box: b, titre: t, labels: [] };
      schemas.push(cur);
      return `[Schéma ${id} : ${t}]`;
    });
  });
  return { texts, schemas };
}
const ANY = /\[\[\s*(SCHEMA|L[EÉ]GENDE)\s*\|([^\n]*?)\]\](?!\])/gi;
// Légendes à cacher pour une carte : celle qui est la réponse (« masque » donné par l'IA) si on la retrouve, sinon toutes.
export function labelMasks(schema, masque) {
  const labels = (schema && schema.labels) || [];
  if (!labels.length) return [];
  const m = String(masque ?? "").trim();
  if (m) {
    const mw = words(m).join(" ");
    const hit = labels.filter((l) => { const lw = words(l.text).join(" "); return lw && (lw === mw || lw.includes(mw) || mw.includes(lw) || similar(l.text, m) >= 0.5); });
    // Toutes les légendes qui portent ce texte sont cachées (une légende écrite deux fois sur le schéma donnerait la réponse).
    if (hit.length) return hit.map((l) => l.box);
    // Légende réponse introuvable : on ne cache rien plutôt que tout ; la revérification (étape « schcheck ») s'en occupe.
    return [];
  }
  return labels.map((l) => l.box);
}

// ---------- cartes en double (deuxième import dans un chapitre qui a déjà des cartes) ----------
const STOP = new Set("les des une un le la de du et en est que qui quoi quel quelle quels quelles dans pour par sur avec son sa ses au aux ce cette ces comment pourquoi quand est-ce qu il elle on se ne pas plus a d l".split(" "));
export function words(t) {
  return String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w.length > 1 && !STOP.has(w));
}
// Ressemblance de deux questions (0 à 1) : mots communs / mots en tout.
export function similar(a, b) {
  const A = new Set(words(a)), B = new Set(words(b));
  if (!A.size || !B.size) return 0;
  let n = 0;
  for (const w of A) if (B.has(w)) n++;
  return n / (A.size + B.size - n);
}
// Garde les nouvelles cartes qui ne redisent pas une carte existante (ni une autre nouvelle carte déjà gardée).
export function dedupCards(cards, existingFronts, seuil = 0.75) {
  const seen = (existingFronts || []).map(String), out = [];
  for (const c of cards || []) {
    const f = String(c?.front ?? "");
    if (!f || seen.some((s) => s.trim().toLowerCase() === f.trim().toLowerCase() || similar(s, f) >= seuil)) continue;
    out.push(c); seen.push(f);
  }
  return out;
}
