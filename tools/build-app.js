// Reconstruit js/app.js à partir des morceaux de js/src/ (dans l'ordre des noms de fichiers).
// L'appli charge toujours un seul fichier, js/app.js : on modifie les morceaux, puis on lance « node tools/build-app.js ».
// tests/run.js vérifie que js/app.js est bien à jour.
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "..", "js", "src");
const out = fs.readdirSync(dir).filter(f => f.endsWith(".js")).sort().map(f => fs.readFileSync(path.join(dir, f), "utf8")).join("");
if (process.argv.includes("--check")) { if (fs.readFileSync(path.join(__dirname, "..", "js", "app.js"), "utf8") !== out) { console.error("js/app.js n'est pas à jour : lance node tools/build-app.js"); process.exit(1); } }
else fs.writeFileSync(path.join(__dirname, "..", "js", "app.js"), out);
