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

// pages : [{ text, path }] dans l'ordre du cours (path = photo de la page, ou null pour du texte).
// Renvoie { texts, schemas } : textes sans les repères, et schémas [{ id: "S1", path, box, titre }].
export function extractSchemas(pages) {
  const schemas = [];
  const texts = (pages || []).map((p) => {
    let perPage = 0;
    return String(p?.text ?? "").replace(MARK, (_, inner) => {
      const { box, titre } = parseMark(inner);
      const t = cleanTitle(titre) || "schéma", b = p?.path ? cleanBox(box) : null;
      if (!b || perPage >= 4 || schemas.length >= 60) return `[Schéma : ${t}]`;
      perPage++;
      const id = "S" + (schemas.length + 1);
      schemas.push({ id, path: p.path, box: b, titre: t });
      return `[Schéma ${id} : ${t}]`;
    });
  });
  return { texts, schemas };
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
