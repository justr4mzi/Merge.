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
   - Captures d'écran à regarder : `ONLY=apercu ROUTES=accueil,journee,reglages SHOTS=/tmp/x node tests/run.js` (sort du 393 px, du 1440 px et du 1920 px). Options : `EDT=1` (emploi du temps de test), `FAKE=...`, `DBG='expression JS'` (affiche le résultat).
3. Incrémenter le nom du cache dans `sw.js` (`merge-shell-v109` actuellement → v110…), sinon les téléphones gardent l'ancienne version.
4. Ajouter une ligne dans `DECISIONS.md` (en français, ce qui change et pourquoi) ; mettre à jour `README.md` et `HANDOFF.md` si une fonction visible change.
5. Push. Le message « repository moved » est sans importance.

**Design**
- Thème sombre, violet `#4b39c8` / `#9483ff`, police Nunito.
- Boutons d'au moins 44 px (un test le vérifie).
- Pas d'emoji dans les boutons, pas de néon ni de glow.
- Toujours vérifier téléphone **393×852** (iPhone 2556×1179 à l'échelle `@3x`), PC **1440×900** ET **1920×1080**. Sur PC, il y a un menu latéral à gauche ; Ramzi se plaint quand un écran PC laisse la moitié de l'écran vide.
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
   - Version actuelle : studio v25 (commit 3464ae7) ; diag v17 (commit 6fd7099).
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
- Comptes actuels de cartes de schéma (après `schema_recheck` sur images découpées, 17 nov.) :
  - Déborah : 90 (90 cachées, 0 au dos seulement — 82 cadres resserrés sur 90) ;
  - Esteban : 98 (92 cachées, 6 au dos seulement — 88 cadres resserrés sur 98) ;
  - Ramzi : 3 (2 cachées, 1 au dos seulement — 3 cadres resserrés sur 3).

### TÂCHE N°1 : vérification du découpage par Gemini (FAIT le 17 nov., `studio` v25 et `diag` v17)

Objectif : que Gemini juge **l'image découpée réelle**, pas des coordonnées.

1. **Codé, déployé et exécuté sur toutes les pages** dans `supabase/functions/studio/schemas.mjs` (`groups`, `cropRect`, `maskPixels`, `cropToPageBox`, `tightenFrame`, `cropCheckPrompt`, `checkCroppedSchema`), `supabase/functions/studio/index.ts` (étape `schcheck`, v25) et `supabase/functions/diag/index.ts` (`schemaRecheck`, v17) :
   - découpe directe en mémoire des pixels du cadre sans dupliquer toute la page (2 ms, évite l'erreur `546`), réduction à 900 px max de la découpe et encodage JPEG (qualité 80) ;
   - masques dessinés en aplat violet (`#4b39c8`) sur la découpe ;
   - envoi de l'image découpée à Gemini (jusqu'à **3 essais maximum** pour resserrer un cadre qui contient du texte parasite : titre de page/diapo, « Activité 2 : … », paragraphe) ;
   - garde-fous : ne jamais agrandir le cadre, refuser `< 15 %` de la surface, ne jamais couper un masque existant, garder l'ancien cadre si Gemini échoue ;
   - si la réponse reste visible sans masque possible : passage au dos seulement (4 nombres), **aucune carte n'est jamais supprimée** ;
   - dans `diag`, une carte mise à jour chez Déborah met aussi à jour sa copie identique chez Esteban (`copies: 2`), et `only` + `to` permet de traiter une plage de pages en séquence sans surcharge mémoire.
2. **Résultat sur l'existant** : les 63 pages (191 cartes) ont toutes été traitées (`POST | 200`) : **173 cartes sur 191** ont eu leur cadre resserré (82/90 chez Déborah, 88/98 chez Esteban, 3/3 chez Ramzi ; la page témoin `1794679952176-5.jpg` est restée intacte). Aucune carte supprimée.

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

## 8. TÂCHE N°2 : écran Prof sur téléphone (FAIT le 17 nov.)

Fichiers : `js/src/09c-exos.js` (fonctions `screenExos` et `recentChips`, constante `EXO_QUICK`) et `css/app.css`.

1. **Écran vide allégé sur téléphone et PC.**
   - Long paragraphe du haut et phrase du bas retirés ; restent l'icône, le titre et une phrase courte.
   - Les 6 demandes rapides sont retirées de l'écran vide et restent dans le menu « + » (rubrique « Demandes rapides »).
   - Pastilles des chapitres récents plus petites, sur une seule ligne, avec le nom coupé par « … » (`.rct`).
   - Première visite seulement (`localStorage` `merge.profTip`, synchronisé) : bulle « Lie un chapitre pour que le prof s'appuie sur ton cours. » avec le bouton « Lier un cours ».
2. **Menu « + » (fenêtre « Ajouter ») rangé.**
   - Les 3 boutons (`Prendre une photo`, `Joindre un fichier`, `Lier un cours`) sont en une colonne (`.actgrid.pact`), avec le sous-titre sur une seule ligne coupée par « … ».
   - Les demandes rapides du menu tiennent sur une seule ligne chacune.

## 9. Tout le reste à savoir (détails)

### Comment travailler avec Ramzi
- Il écrit vite, souvent en dictée vocale, avec des fautes : reformule sa demande dans ta tête, et ne lui pose une question que si c'est vraiment ambigu.
- Il veut du **vérifié**, pas des suppositions. Si tu n'as pas testé, dis-le.
- Il envoie des captures téléphone (iPhone, environ 393 px de large) et PC (Windows, appli installée, 1920×1080 avec mise à l'échelle). Corrige toujours **les deux** formats, pas seulement celui de la capture.
- Il n'aime pas le terminal : ne lui demande jamais de lancer une commande. Une seule exception, le SQL qu'il colle lui-même dans l'éditeur Supabase.
- Fin de chaque tour : un résumé court en français simple (ce qui a changé, ce qu'il doit tester), puis « ferme et rouvre l'appli » (à cause du cache).
- Les utilisateurs réels sont Ramzi, Déborah (sa copine, Terminale générale, SVT) et Esteban (il a des copies des cours de Déborah), plus quelques autres. **Leurs données sont précieuses** : ne jamais rien casser ni supprimer.

### Données (Supabase)
- Tables principales : `profiles` (clé `user_id` : `display_name`, `classe`, `theme`, `text_size`, `daily_goal_kind`, `daily_goal_value`, `reminders_enabled`, `reminder_time`, `quiet_weekend`, `quiet_holidays`, `holiday_zone`, `sounds`…), `subjects` (matières : `color`, `exam_date`…), `chapters` (`subject_id`), `cards` (`front`, `back`, `chapter_id`, `user_id`, `image_path`, `image_box`), `app_secrets` (`name`, `value` : secret `cron` notamment ; ne jamais l'afficher).
- Le reste (jobs d'import, sessions, résumés, etc.) : regarde les migrations dans `supabase/` et le faux backend `tests/fake-supabase.js`, qui reproduit toutes les tables utilisées.
- Stockage : bucket privé `cours`. Pages d'import en JPG, chemin `<user_id>/<import_id>/<horodatage>-<n>.jpg`. On les ouvre avec un lien signé (`createSignedUrl`).
- RLS activé : chaque élève ne voit que ses données. Les fonctions serveur utilisent la clé service.

### Stockage local du navigateur (`localStorage`)
- `merge.prof` : discussions du Prof (`{cur, convs:[{id,t,ctx:{ch,s},m:[{r:"u"|"a",t,img?,doc?}],at}]}`, 20 maximum).
- `merge.jview` : vue du planning (`lvl` jour/mois). `merge.edt` : emploi du temps (`slots: [{day,start,end,subject,room,week}]`, `ab`).
- `merge.pomocfg` : réglages du pomodoro (`mode`, `work`, `brk`, `timer`). `merge.pomomute` : couper la musique pendant la pause. `merge.boostj` : jours de révision intensive avant un contrôle.
- Les tests modifient ces clés pour préparer un état. Garde les mêmes noms.

### Le client (détails utiles)
- Routeur par `location.hash` (`#accueil`, `#matieres`, `#matiere-<id>`, `#chapitre-<id>`, `#cartes-<id>`, `#cartes-jour`, `#exos`, `#calendrier`, `#mois`, `#reglages`, `#revision-<subjectId>`, `#methode-…`, `#bac-…`…). `app` = `#app`, le conteneur de l'écran.
- Onglets : `drawTabs(nom)`. Toucher l'onglet de l'écran où on est déjà enlève `data-sec` (Réglages revient à la liste) et envoie l'évènement `merge:tabagain` (le Prof repart sur une nouvelle discussion).
- Fenêtres : `sheet(html, el => {...})`. Messages : `toast("…")`. Icônes SVG : objet `I` (`I.plus`, `I.back`, `I.play`, `I.spark`, `I.clock`…). Échappement HTML : `esc()`. Pluriel : `plural(n, "carte", "cartes")`. Raccourci `$("id")` = `getElementById`.
- **Pièges connus :**
  - Une classe CSS déjà utilisée ailleurs (exemple `.stile`) a cassé la grille des matières. Avant d'ajouter une classe, cherche-la avec `grep` dans `css/app.css`.
  - Les règles écrites en bas de `app.css` écrasent celles du haut : ajoute plutôt que de modifier les anciennes.
  - Sur PC, on cible souvent un écran avec `.app:has(> .classe)` dans `@media (min-width:1100px)` ou `(min-width:1200px)`.
  - Le test « boutons de 44 px minimum » échoue si un bouton est trop petit.
  - Le test « pas de débordement horizontal » à 320 px échoue si un texte ne passe pas à la ligne ; utilise `.hidexs` pour cacher un libellé sur les petits écrans.

### Les tests (`tests/run.js`)
- Chaque suite est une fonction `async function nom(browser)` listée dans le tableau des suites ; `ONLY=nom` lance seulement celle-là.
- Aides : `open(browser,{w,h,theme,extra})` ouvre l'appli avec le faux backend, `go(page,"#route",attente)`, `txt(page)` donne le texte visible, `ok(condition,"libellé",détail)`, `jm(page,"#jadd")` ouvre le menu + du planning et clique un choix.
- Le faux backend se règle avec `localStorage fake.*` (option `extra`). Par exemple, `schema: "3"` donne des cartes de schéma au format « à plat ».
- Suites récentes : `apercu` (captures), `ongletRetour`, `profPc`, `profFichier`, `schemaPlat`, `schemasServeur` (teste `studio/schemas.mjs` directement), `v8` (favoris), `v10`, `flows`.
- Une vraie régression = un test rouge. Ne supprime jamais un test pour le faire passer : corrige le code, ou mets le test à jour seulement si le comportement voulu a changé (et note-le dans `DECISIONS.md`).

### Imports côté serveur (studio), plus en détail
- Le client lit le fichier sur l'appareil (`fileReaders` dans `06-import.js` : pdf.js pour les PDF, décompression pour pptx/docx/odf, HEIC vers JPEG). Il envoie le texte et les images de pages. Le serveur crée un job et enchaîne les étapes.
- `img` repère les schémas sur chaque page (prompt LECTURE : cadre serré, chaque légende avec sa position).
- `gen` écrit les cartes (prompt « RÈGLES STRICTES » : la réponse n'est jamais lisible, la question ne contient pas la réponse, une légende = une carte).
- `schcheck` fait revérifier chaque carte de schéma par Gemini (`{n, garder, cadre, cacher, raison}`).
- `save` enregistre : `image_box = [...cadre, ...masques]`.
- `verify` contrôle le résultat.
- L'état du job est dans `state` (`st.pi` = page en cours, `st.pitry` = essais). Une étape = un appel qui se relance lui-même. Un cron relance un job bloqué depuis 3 min.
- Limite de la fonction : erreur 546 si une photo est trop lourde. Réduis toujours les images avant de les traiter.

### Choses à NE PAS faire
- Modifier `js/app.js` à la main ; oublier de bump `sw.js` ; pousser sans tests.
- Supprimer des cartes, des chapitres ou des comptes ; afficher un secret ; mettre l'URL du site dans un message public.
- Ajouter des emojis dans les boutons, du néon, du flou plein écran.
- Mettre une mention d'IA dans un commit ou dans le README.
