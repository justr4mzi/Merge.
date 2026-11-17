# Passation du projet Merge. (pour Antigravity / tout assistant de code)

Lis ce fichier en entier avant de toucher au code. Puis lis `README.md` (fonctionnement) et `DECISIONS.md` (historique de chaque choix, du plus ancien au plus récent : les dernières lignes sont les plus à jour).

## 1. Le projet

**Merge.** est une appli de révision (PWA) pour lycéens, faite par Ramzi (Terminale STI2D SIN, Lyon). Utilisée pour de vrai par lui, sa copine Déborah, Esteban et d'autres. Ramzi **ne code pas** : il teste sur téléphone et PC, envoie des captures, et attend des corrections finies, testées et en ligne. Il parle français, de façon familière ; réponds-lui en français simple, court, sans jargon.

- Dépôt GitHub : `justr4mzi/Merge.` (public). Le site est servi depuis ce dépôt (Pages) : **un push = mise en ligne**.
- Backend : Supabase, projet `dmevntylywocyumgotij` (base Postgres, stockage `cours`, fonctions Edge en Deno).
- IA : Gemini (Vertex AI) appelé uniquement côté serveur, dans les fonctions Edge.

Fonctions principales : matières → chapitres → import de cours (PDF, PowerPoint, Word, photos…) → l'IA fait flashcards, résumés, quiz, cartes de schéma « légende cachée » ; révision espacée ; planning (emploi du temps lu par l'IA + révisions) ; « Prof » (chat IA qui s'appuie sur les cours liés et lit les fichiers joints) ; progrès ; pomodoro ; musique ; réglages.

## 2. Organisation du code

- `index.html`, `css/app.css` (un seul fichier CSS ; les règles récentes sont **à la fin** et écrasent les anciennes), `sw.js` (service worker).
- **JS : on n'édite JAMAIS `js/app.js` à la main.** On édite `js/src/NN-*.js`, puis `node tools/build-app.js` les concatène dans `js/app.js`.
  - `01-outils` utilitaires, `02-donnees` données/état, `03-connexion` connexion + onglets + routeur, `04-niveaux-boutique` (niveaux, recherche, pomodoro, musique), `05-accueil-chapitres` (accueil, matière, chapitre), `06-import` (import de cours, lecteurs de fichiers `fileReaders`), `07-session-cartes` (révision, cartes de schéma `schMasks`/`schOnFront`), `08-reglages-outils`, `09b-journee` (planning), `09c-exos` (Prof).
- Fonctions Edge : `supabase/functions/<nom>/index.ts`
  - `studio` : imports côté serveur (étapes `img` → `gen` → `schcheck` → `save` → `verify`, chaque étape se relance elle-même ; un cron relance un job bloqué depuis 3 min), chat du Prof (`exochat`), lecture d'emploi du temps, dictée, planification.
  - `studio/schemas.mjs` : logique pure des schémas (`labelMasks`, `cleanBox`, `cleanLabelBox`, `words`, `dedupCards`), testée par `tests/run.js`.
  - `diag` : réparations ponctuelles protégées par le secret cron (`schema_recheck`, `schema_fix`, `schema_add`, `bac_test`, `sign`).
  - `ai` (garde la vérif JWT), `remind`, `admin`, `voix`.

## 3. Règles à respecter (Ramzi y tient)

**Commits**
- Uniquement sous son nom : `git -c user.name="justr4mzi" -c user.email="ramzihouhou8@gmail.com" commit -m "..."`.
- Message en anglais. **Aucune** ligne co-auteur / « Generated with » / mention d'IA, ni dans les commits ni dans le README.

**Avant chaque commit**
1. `node tools/build-app.js && node -c js/app.js`
2. Tests : `node tests/run.js` (Playwright + faux Supabase `tests/fake-supabase.js`).
   - Tout passe en environ 13 min (environ 1 518 vérifications).
   - Ne PAS l'entourer de `timeout` : ça tue le navigateur et donne un faux échec « Target closed ».
   - Sous-ensembles : `ONLY=suite1,suite2 node tests/run.js`.
   - Captures d'écran à regarder : `ONLY=apercu ROUTES=accueil,journee,reglages SHOTS=/tmp/x node tests/run.js` (sort du 393 px et du 1440 px). Options : `EDT=1` (emploi du temps de test), `FAKE=...`, `DBG='expression JS'` (affiche le résultat).
3. Incrémenter le nom du cache dans `sw.js` (`merge-shell-v108` actuellement → v109…), sinon les téléphones gardent l'ancienne version.
4. Ajouter une ligne dans `DECISIONS.md` (en français, ce qui change et pourquoi) ; mettre à jour `README.md` si une fonction visible change.
5. Push. Le message « repository moved » est sans importance.

**Design**
- Thème sombre, violet `#4b39c8` / `#9483ff`, police Nunito.
- Boutons d'au moins 44 px (un test le vérifie).
- Pas d'emoji dans les boutons, pas de néon ni de glow.
- Toujours vérifier téléphone **393×852** ET PC **1440×900**. Sur PC, il y a un menu latéral à gauche ; Ramzi se plaint quand un écran PC laisse la moitié de l'écran vide.
- Pas de `backdrop-filter` (flou) sur de grandes surfaces : ça faisait laguer les menus au survol.

**Base de données / Supabase**
- Migrations : ne pas les appliquer soi-même. Donner à Ramzi le lien https://supabase.com/dashboard/project/dmevntylywocyumgotij/sql/new et le SQL à copier-coller.
- **Ne jamais supprimer de données soi-même.** Lui donner le SQL.
- Ne jamais afficher de secrets. Le secret cron ne s'utilise que dans le SQL : `(select value from app_secrets where name='cron')`. Garder l'URL du site privée.

**Déployer une fonction Edge**
1. `deno check supabase/functions/<fn>/index.ts`
2. Commit + push.
3. Vérifier que le fichier sur GitHub est identique :
   `curl -s https://raw.githubusercontent.com/justr4mzi/Merge./<sha>/supabase/functions/<fn>/index.ts | sha256sum`, à comparer avec le sha256 local.
4. Déployer une **amorce** de 1 ligne : `index.ts` = `import "https://raw.githubusercontent.com/justr4mzi/Merge./<sha>/supabase/functions/<fn>/index.ts";`
   - `verify_jwt` à **false** pour studio, diag, remind, admin, voix ; `ai` garde le JWT.
   - Version actuelle : studio v22 (commit 1f4ea7d) ; diag v11 (commit 2bf4966).
5. Vérifier dans les logs Supabase : `POST | 200`. Une erreur `546` = limite mémoire/temps de la fonction : relancer (une page photo trop lourde).

**Lancer une action `diag`** (depuis l'éditeur SQL ou l'outil SQL) :
```sql
select net.http_post(url := 'https://dmevntylywocyumgotij.supabase.co/functions/v1/diag',
  headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',(select value from app_secrets where name='cron')),
  body := '{"action":"schema_recheck","only":0}'::jsonb, timeout_milliseconds := 120000);
```
Les réponses de pg_net ne sont pas fiables. Les résultats sont écrits avec `console.log` : lis-les dans les logs des fonctions.

## 4. Les cartes de schéma (le sujet du moment)

- Une carte de schéma a `image_path` (page dans le stockage `cours`) et `image_box`.
  - `image_box = [y0, x0, y1, x1, [masque], [masque]…]`, coordonnées de 0 à 1000 sur la page.
  - Les 4 premiers nombres = le **cadre** du schéma ; les tableaux suivants = les **légendes cachées** (la réponse).
  - Le client accepte aussi les masques « à plat » (4 nombres à la suite).
- Avec des masques : le schéma est sur la question, légende cachée. Sans masques (4 nombres seulement) : le schéma n'est montré qu'au dos. Dans ce cas, le client retire « Sur ce schéma, » de la question (`noSchRef` dans `07-session-cartes.js`).
- Problème restant : le **cadre** contient parfois encore du texte (titre de page, « Activité 2 : … », paragraphes). Gemini donne des coordonnées sans voir le résultat.
- Comptes actuels de cartes de schéma :
  - Déborah : 90 (86 cachées, 4 au dos seulement) ;
  - Esteban : 98 (87 / 11), une copie des cours de Déborah ;
  - Ramzi : 3.

### TÂCHE N°1 à faire : vérification du découpage par Gemini (validée par Ramzi)

Objectif : que Gemini juge **l'image découpée réelle**, pas des coordonnées.

1. Dans `studio` (étape `schcheck`) et dans `diag` (`schema_recheck`), après avoir obtenu le cadre :
   - **découper** la page avec ce cadre (lib Deno d'images, par ex. `https://deno.land/x/imagescript` : `Image.decode` → `crop` → `encodeJPEG(80)`) ;
   - dessiner les masques en aplat ;
   - envoyer **cette image découpée** à Gemini.
2. Lui demander, en JSON :
   `{ "texte_parasite": bool, "ou": "haut|bas|gauche|droite", "reponse_visible": bool, "nouveau_cadre": [y0,x0,y1,x1] }`
   - texte parasite = titre de page, titre d'activité, phrase ou paragraphe qui n'est pas une légende du schéma ;
   - réponse visible = la réponse de la carte est lisible quelque part sur l'image.
3. S'il y a du texte parasite : appliquer le nouveau cadre (ou rogner le bord indiqué) et recommencer, **3 essais maximum**.
4. Si la réponse est visible : ajouter un masque, sinon passer la carte au dos seulement (4 nombres).
   - **Ne jamais supprimer de carte.**
5. Faire attention à la mémoire : traiter une page à la fois et réduire la page (environ 1600 px de large max) avant le découpage, sinon erreur 546.
   - Dans `studio`, garder le compteur d'essais par page (`st.pitry`, une page qui plante est sautée au 3e essai).
6. Tester avec `deno check`. Tester `schemas.mjs` avec `ONLY=schemasServeur node tests/run.js`. Déployer avec la méthode de l'amorce.
7. Lancer sur l'existant : `diag` `schema_recheck` page par page (`only: 0`, puis 1, 2…, environ 63 pages, triées par `image_path`). Lire les logs.
8. Expliquer à Ramzi, en simple, combien de cadres ont été resserrés.

## 5. Ce qui vient d'être fait (17 nov.)

- Prof sur PC : historique à droite. Retoucher l'onglet Prof = nouvelle discussion. Pastilles des derniers chapitres sur l'écran vide. Le Prof accepte PDF, PowerPoint, Word, LibreOffice, texte et photos.
- Planning sur PC : colonne résumé à droite. Un seul « + » en haut (menu) et un bouton « IA ».
- Matière : bouton Réviser identique à l'accueil. Accueil : « À réviser aujourd'hui », gros bouton.
- Réglages sur PC : 2 colonnes. Pomodoro et minuteur dans un anneau. Plus de flou (lag).
- Imports : cadre serré, règles strictes pour Gemini, étape de vérification `schcheck`, une seule carte par légende, page qui plante sautée.
- Tous les schémas existants ont été repassés (`schema_recheck`). Quelques cadres ont été resserrés à la main.

## 6. Phase actuelle

Phase de **finition et de bugs** : Ramzi teste sur son téléphone et sur le PC, envoie des captures, et chaque retour doit être corrigé proprement, testé, mis en ligne, puis résumé en quelques lignes en français.

Méthode qui marche :
1. Reproduire avec les captures `apercu`.
2. Corriger dans `js/src` et `css/app.css` (ajouter les règles à la fin).
3. Ajouter un test dans `tests/run.js` si possible.
4. Lancer le sous-ensemble de tests concerné, puis la suite complète.
5. Bump de `sw.js`, `DECISIONS.md`, commit, push.

Il veut des tests à chaque fois (« je t'ai dit de faire des tests »).

## 7. Détails en plus pour la TÂCHE N°1 (Gemini)

- Fichiers : `supabase/functions/studio/index.ts` (cherche `schcheck`) et `supabase/functions/diag/index.ts` (fonction `schemaRecheck`). La logique pure va dans `studio/schemas.mjs`, avec des tests dans la suite `schemasServeur` de `tests/run.js`.
- Appel Gemini existant : la fonction `gemini(...)` de studio (image en base64 + prompt, réponse JSON). Dans studio, on appelle `gemini(..., true, 0, "high")` (n'est pas compté dans le quota de l'élève).
- Conversion des coordonnées : cadre `[y0,x0,y1,x1]` sur 0–1000, donc en pixels `x = x0 * largeur / 1000`, `y = y0 * hauteur / 1000`. Le `nouveau_cadre` renvoyé par Gemini est relatif à l'image découpée : le reconvertir en coordonnées de la page entière avant d'enregistrer.
- Les masques sont aussi sur 0–1000 de la page entière. Pour les dessiner sur la découpe : `(mx - x0) / (x1 - x0) * largeurDécoupe`.
- Garde-fous :
  - ne jamais agrandir le cadre ;
  - refuser un cadre plus petit que 15 % de l'ancien ;
  - si Gemini se trompe ou répond mal, garder l'ancien cadre.
- Dans `diag`, garder le mode `dry: true`, qui affiche les changements dans les logs sans écrire. Lancer d'abord en `dry` sur 3 pages, regarder, puis en vrai.
- Page de test connue : `1794679952176-5.jpg` (arbre / sève). Les cadres corrigés à la main sont `[510,42,735,478]` (arbre) et `[279,551,493,932]` (schéma fonctionnel). Le nouveau code ne doit pas les abîmer.

## 8. TÂCHE N°2 : écran Prof sur téléphone (captures de Ramzi, 17 nov.)

Fichiers : `js/src/09c-exos.js` (fonctions `screenExos` et `recentChips`, constante `EXO_QUICK`) et `css/app.css`.

1. **Écran vide trop chargé sur téléphone.** On ne voit plus le haut : trop de texte et trop de suggestions.
   - Enlever le long paragraphe « Pour que je m'appuie sur ton cours… » et la phrase du bas « Sans cours lié… 1 message = 1 appel IA ».
   - Garder l'icône, le titre et une phrase courte.
   - **Enlever les 6 demandes rapides de l'écran vide** : elles restent dans le menu « + » (rubrique « Demandes rapides »).
   - Garder les pastilles des chapitres récents. Elles sont trop grosses : en faire des pastilles plus petites, sur une ligne si possible, avec le nom coupé par « … ».
   - **Première visite seulement** : afficher une petite bulle ou fenêtre « Lie un chapitre pour que le prof s'appuie sur ton cours » avec un bouton « Lier un cours ». Elle ne revient plus ensuite (`localStorage` `merge.profTip`).
2. **Menu « + » (fenêtre « Ajouter »).**
   - Le sous-titre de « Joindre un fichier » (PDF, PowerPoint, Word, photo…) passe sur 3 lignes et décale tout. Mettre le sous-titre sur une seule ligne, coupée par « … », ou enlever le sous-titre sur téléphone.
   - « Lier un cours » est seul sur sa ligne : soit le passer en pleine largeur, soit mettre les 3 boutons en une colonne.
   - Les demandes rapides du menu sont sur 2 lignes chacune : texte plus petit ou une colonne.
3. Vérifier en 393×852 et en 1440×900 :
   `ONLY=apercu ROUTES=exos SHOTS=/tmp/x node tests/run.js`.
   Puis lancer `ONLY=profPc,profFichier,ongletRetour node tests/run.js` et la suite complète. Ensuite bump de `sw.js`, `DECISIONS.md`, commit, push.
