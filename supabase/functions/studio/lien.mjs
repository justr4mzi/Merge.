// Import d'un cours depuis un lien Genially (view.genially.com, ancien view.genial.ly).
// La page publique d'un Genially contient, pour les moteurs de recherche, un bloc JSON-LD (schema.org CreativeWork)
// dont le champ « text » est la transcription de tous les textes du Genially. On ne lit que ce bloc : pas d'IA, pas de script exécuté.
// Utilisé par la fonction `studio` (action « lien »), testé par tests/run.js (suite « genially »).

const HOSTS = /^(view\.)?(genially\.com|genial\.ly)$/i;

// Lien Genially valide → adresse publique normalisée, sinon null.
export function geniallyUrl(raw) {
  let u; try { u = new URL(String(raw || "").trim()); } catch (_e) { return null; }
  if (!/^https?:$/.test(u.protocol) || !HOSTS.test(u.hostname)) return null;
  const id = u.pathname.split("/").filter(Boolean)[0] || "";
  if (!/^[0-9a-f]{24}$/i.test(id)) return null;
  return "https://view.genially.com/" + id;
}

// Textes de modèle que Genially laisse dans les créations (pas du cours).
const FILLER = [/An awesome subtitle here/gi, /\bTitle here\b/gi, /Magic (Design|Link|Window)\b/gi, /\bInteractivity\b/gi, /With this function\.\.\./gi,
  /You can add exciting additional content[^.]*\.?[^.]*\.?/gi, /The window allows you to add wider content\.?/gi, /You can enrich your genially[^.]*\.?/gi,
  /Got an idea\?[^.]*\.?/gi, /Did you know[^?]*\?/gi, /Write a great title here/gi, /Lorem ipsum[^.]*\./gi];

const decode = s => s.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

// Page HTML d'un Genially → { title, text } (text vide si rien de lisible).
export function geniallyText(html) {
  const blocks = [...String(html || "").matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  let title = "", text = "";
  for (const b of blocks) {
    let j; try { j = JSON.parse(b[1]); } catch (_e) { try { j = JSON.parse(decode(b[1])); } catch (_e2) { continue; } }
    for (const o of [].concat(j && j["@graph"] ? j["@graph"] : j)) {
      if (!o || typeof o !== "object") continue;
      if (typeof o.text === "string" && o.text.length > text.length) { text = o.text; title = typeof o.name === "string" ? o.name : title; }
    }
  }
  for (const f of FILLER) text = text.replace(f, " ");
  text = text.replace(/\s+/g, " ").trim();
  return { title: title.trim().slice(0, 200), text: text.slice(0, 400000) };
}
