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

// ---------- vérification sur l'image réellement découpée (Tâche n°1, 17 nov.) ----------
// Extrait les masques [y0,x0,y1,x1] de image_box.slice(4), qu'ils soient en sous-tableaux ou à plat.
export function groups(b) {
  const r = [];
  if (!Array.isArray(b)) return r;
  for (let i = 0; i < b.length; i++) {
    if (Array.isArray(b[i])) r.push(b[i].map(Number));
    else if (i + 3 < b.length && !b.slice(i, i + 4).some(Array.isArray)) {
      r.push(b.slice(i, i + 4).map(Number));
      i += 3;
    }
  }
  return r.filter((m) => m.length === 4 && m.every(Number.isFinite));
}

// Coordonnées en pixels du cadre [y0,x0,y1,x1] (0–1000) sur une page de largeur W et hauteur H.
export function cropRect(frame, W, H) {
  const [y0, x0, y1, x1] = frame.map((v) => Math.max(0, Math.min(1000, Number(v) || 0)));
  const x = Math.max(0, Math.min(W - 1, Math.round((x0 * W) / 1000)));
  const y = Math.max(0, Math.min(H - 1, Math.round((y0 * H) / 1000)));
  const w = Math.max(1, Math.min(W - x, Math.round(((x1 - x0) * W) / 1000)));
  const h = Math.max(1, Math.min(H - y, Math.round(((y1 - y0) * H) / 1000)));
  return { x, y, w, h };
}

// Coordonnées en pixels d'un masque [my0,mx0,my1,mx1] (0–1000 page entière) sur la découpe (cw × ch) du cadre [y0,x0,y1,x1].
export function maskPixels(mask, frame, cw, ch) {
  const [y0, x0, y1, x1] = frame;
  const [my0, mx0, my1, mx1] = mask;
  const fw = Math.max(1, x1 - x0), fh = Math.max(1, y1 - y0);
  const x = Math.max(0, Math.min(cw, Math.round(((mx0 - x0) / fw) * cw)));
  const y = Math.max(0, Math.min(ch, Math.round(((my0 - y0) / fh) * ch)));
  const x2 = Math.max(0, Math.min(cw, Math.round(((mx1 - x0) / fw) * cw)));
  const y2 = Math.max(0, Math.min(ch, Math.round(((my1 - y0) / fh) * ch)));
  return x2 > x && y2 > y ? { x, y, w: x2 - x, h: y2 - y } : null;
}

// Reconvertit un cadre [ry0,rx0,ry1,rx1] (0–1000 relatif à l'image découpée) en coordonnées 0–1000 de la page entière.
export function cropToPageBox(rel, frame) {
  const n = (Array.isArray(rel) ? rel : String(rel ?? "").split(/[,;\s]+/)).filter((x) => x !== "" && x != null).map(Number);
  if (n.length !== 4 || n.some((x) => !Number.isFinite(x))) return null;
  let [ry0, rx0, ry1, rx1] = n.map((x) => Math.max(0, Math.min(1000, x)));
  if (ry1 < ry0) [ry0, ry1] = [ry1, ry0];
  if (rx1 < rx0) [rx0, rx1] = [rx1, rx0];
  const [y0, x0, y1, x1] = frame;
  return [
    Math.round(y0 + (ry0 / 1000) * (y1 - y0)),
    Math.round(x0 + (rx0 / 1000) * (x1 - x0)),
    Math.round(y0 + (ry1 / 1000) * (y1 - y0)),
    Math.round(x0 + (rx1 / 1000) * (x1 - x0)),
  ];
}

// Applique le nouveau cadre renvoyé par Gemini sur l'image découpée, avec garde-fous :
// - ne jamais agrandir le cadre ;
// - refuser un cadre plus petit que 15 % de l'ancien ;
// - ne pas couper les masques existants ;
// - si Gemini répond mal, garder l'ancien cadre.
export function tightenFrame(frame, res, masks = []) {
  const orig = frame.slice(0, 4).map((x) => Math.round(Number(x) || 0));
  if (!res || typeof res !== "object" || !res.texte_parasite) return orig;
  let rel = null;
  const raw = res.nouveau_cadre;
  const n = (Array.isArray(raw) ? raw : String(raw ?? "").split(/[,;\s]+/)).filter((x) => x !== "" && x != null).map(Number);
  if (n.length === 4 && n.every(Number.isFinite)) {
    let [ry0, rx0, ry1, rx1] = n.map((x) => Math.max(0, Math.min(1000, x)));
    if (ry1 < ry0) [ry0, ry1] = [ry1, ry0];
    if (rx1 < rx0) [rx0, rx1] = [rx1, rx0];
    rel = [ry0, rx0, ry1, rx1];
  }
  const ou = String(res.ou ?? "").toLowerCase();
  if ((!rel || (rel[0] <= 5 && rel[1] <= 5 && rel[2] >= 995 && rel[3] >= 995)) && /(haut|bas|gauche|droite)/.test(ou)) {
    rel = [
      /haut/.test(ou) ? 120 : 0,
      /gauche/.test(ou) ? 120 : 0,
      /bas/.test(ou) ? 880 : 1000,
      /droite/.test(ou) ? 880 : 1000,
    ];
  }
  if (!rel) return orig;
  const pageBox = cropToPageBox(rel, orig);
  if (!pageBox) return orig;
  let [ny0, nx0, ny1, nx1] = pageBox;
  // Ne jamais agrandir le cadre.
  ny0 = Math.max(orig[0], ny0);
  nx0 = Math.max(orig[1], nx0);
  ny1 = Math.min(orig[2], ny1);
  nx1 = Math.min(orig[3], nx1);
  // Ne pas couper une légende déjà masquée à l'intérieur du schéma.
  for (const m of groups(masks)) {
    if (m[0] >= orig[0] - 30 && m[1] >= orig[1] - 30 && m[2] <= orig[2] + 30 && m[3] <= orig[3] + 30) {
      ny0 = Math.min(ny0, Math.max(orig[0], m[0]));
      nx0 = Math.min(nx0, Math.max(orig[1], m[1]));
      ny1 = Math.max(ny1, Math.min(orig[2], m[2]));
      nx1 = Math.max(nx1, Math.min(orig[3], m[3]));
    }
  }
  const oldArea = Math.max(1, (orig[2] - orig[0]) * (orig[3] - orig[1]));
  const newArea = (ny1 - ny0) * (nx1 - nx0);
  if (ny1 - ny0 < 50 || nx1 - nx0 < 50 || newArea < oldArea * 0.15) return orig;
  return [ny0, nx0, ny1, nx1].map(Math.round);
}

export function cropCheckPrompt(front, back) {
  const q = String(front ?? "").replace(/\s+/g, " ").trim();
  const a = String(back ?? "").replace(/\s+/g, " ").trim();
  return `Voici l'image DÉCOUPÉE d'un schéma de cours telle que l'élève la voit sur sa carte de révision. Les rectangles violets pleins cachent la légende à deviner.\nQuestion de la carte : ${q}\nRéponse à deviner : ${a}\n\nVérifie deux choses en regardant uniquement cette image découpée :\n1) "texte_parasite" (true/false) : reste-t-il au bord de l'image du texte extérieur au schéma (titre de page, titre ou bandeau d'activité comme « Activité 2 : … », numéro de document « Doc. 1… », consigne ou paragraphe de cours) ?\nAttention : les légendes du schéma, les mots dans les boîtes d'un schéma fonctionnel, les flèches, symboles ou formules (H2O, CO2…) font partie du schéma et ne sont PAS du texte parasite. Si l'image ne contient que le schéma et ses légendes, mets "texte_parasite": false et "nouveau_cadre": null.\nSi "texte_parasite" est true : indique le bord dans "ou" ("haut", "bas", "gauche" ou "droite") et donne dans "nouveau_cadre" [ymin, xmin, ymax, xmax] (4 entiers de 0 à 1000 SUR CETTE IMAGE DÉCOUPÉE, où [0,0,1000,1000] = toute l'image actuelle) le cadre resserré qui retire le texte parasite sans couper le dessin ni ses légendes ni les rectangles violets.\n2) "reponse_visible" (true/false) : la réponse « ${a} » est-elle encore écrite en clair et lisible sur cette image (en dehors des rectangles violets, et hors mots déjà présents dans la question) ?\nSi "reponse_visible" est true : donne dans "cacher" [[ymin, xmin, ymax, xmax]] (de 0 à 1000 SUR CETTE IMAGE DÉCOUPÉE) le cadre serré de chaque endroit où la réponse est lisible, pour qu'on le recouvre d'un rectangle violet.\n\nRéponds uniquement en JSON :\n{"texte_parasite":false,"ou":"","nouveau_cadre":null,"reponse_visible":false,"cacher":[]}`;
}

// Vérifie et resserre le cadre d'une carte sur l'image réellement découpée (3 essais maximum, jamais de carte supprimée).
export async function checkCroppedSchema({ frame, masks, front, back, renderCrop, askGemini }) {
  const origFrame = frame.slice(0, 4).map((x) => Math.round(Number(x) || 0));
  let curFrame = origFrame.slice();
  let curMasks = groups(masks);
  let tries = 0, lastRes = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    tries = attempt + 1;
    let res = null;
    try {
      const imgB64 = await renderCrop(curFrame, curMasks);
      res = await askGemini(cropCheckPrompt(front, back), imgB64);
    } catch (_e) {
      break;
    }
    if (!res || typeof res !== "object") break;
    lastRes = res;
    let addedMask = false;
    if (res.reponse_visible === true && Array.isArray(res.cacher)) {
      for (const rawBox of res.cacher) {
        const pb = cropToPageBox(rawBox, curFrame);
        const lb = pb ? cleanLabelBox(pb.join(",")) : null;
        if (lb && !curMasks.some((m) => m.join(",") === lb.join(","))) {
          curMasks.push(lb);
          addedMask = true;
        }
      }
    }
    if (res.texte_parasite === true) {
      const nf = tightenFrame(curFrame, res, curMasks);
      if (nf.join(",") !== curFrame.join(",")) {
        curFrame = nf;
        curMasks = curMasks.filter((b) => b[0] >= curFrame[0] - 30 && b[1] >= curFrame[1] - 30 && b[2] <= curFrame[2] + 30 && b[3] <= curFrame[3] + 30);
        if (attempt < 2) continue;
      }
    }
    if (res.reponse_visible === true) {
      if (addedMask && attempt < 2) continue;
      if (!addedMask) curMasks = [];
      break;
    }
    break;
  }
  curMasks = curMasks.filter((b) => b[0] >= curFrame[0] - 30 && b[1] >= curFrame[1] - 30 && b[2] <= curFrame[2] + 30 && b[3] <= curFrame[3] + 30);
  return {
    frame: curFrame,
    masks: curMasks,
    box: [...curFrame, ...curMasks],
    tightened: curFrame.join(",") !== origFrame.join(","),
    tries,
    lastRes,
  };
}
