<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="icons/logo-dark.svg"><img src="icons/logo.svg" width="360" alt="Merge."></picture></p>

Merge is a revision app for French high-school students. You import a lesson (PDF, photos of a notebook, PowerPoint, Word, a Genially link or pasted text) and Merge turns it into a summary and flashcards, then helps you learn them: spaced repetition, quizzes, written tests, games, audio, and an AI teacher. What is generated from a lesson comes from that lesson only.

The interface is in French. It runs on phones (installable as a PWA) and on desktop. This README is written for someone taking over the project: what the app does, how the code is organised, how to run, test and deploy it, and the rules followed so far. Every product and technical decision, with its reason, is logged in French in [DECISIONS.md](DECISIONS.md) (newest at the bottom). Read its last sections before changing a screen.

## What the app does

The bottom bar (left sidebar on desktop) has six tabs: **Accueil, Matières, Prof, Planning, Progrès, Réglages**.

- **Accueil**: cards due today with a big "Réviser maintenant" button, other ways to revise (mixed revision across subjects, custom selection), the week chart, upcoming tests, streak and mastered cards, the plan of the day, and "Reprendre" for recent chapters.
- **Matières**: a grid of subject tiles (initials, number of chapters and cards, next test, mastery bar). A subject holds folders and chapters, its tests (with a "no test, free revision" switch), a revision plan and links to past exam papers.
- **Chapter screen**: mastery ring, a big "Réviser maintenant" button (flashcards), shortcuts (Résumé, Quiz, Interro écrite, Contrôle, Schémas when the chapter has a real diagram, favourite tools, Demander au prof), and every other tool inside "Plus d'outils":
  - Comprendre: Feuille blanche (blurting), Feynman, Texte à trous, Face à face (confused notions), Pièges, Exercices guidés, Carte mentale.
  - Fiches: one-page A4 revision sheet, my mistakes.
  - Oral et audio: Khôlle (oral questioning with speech recognition), Écouter (tabs "Lecture" and "Mains libres").
  - Jouer: Boss, Flash 60 secondes (faster and faster), Associer (series of 6 pairs, replay or new series).
  - Variants: "Seulement les difficiles" (flashcards), "Interro chronométrée" (written test against the clock).
  - Old routes (`#apprendre-`, `#blanc-`, `#difficiles-`, `#bus-`, `#libre-`, `#questions-`, `#planche-`, `#vraifaux-`, `#stats-`) still work so old links and notifications never break.
- **Flashcards**: FSRS scheduling (`ts-fsrs`), Faux / Juste / "Juste, mais à revoir bientôt" / "Trop facile", undo, optional typed answer, notes, highlights, read-aloud, schema cards (the notebook photo cropped to the diagram). The chapter test (Contrôle) unlocks at 100 % mastery.
- **Prof**: a chat with an AI teacher. Chapters (or whole subjects) can be linked so it follows the student's lessons; without a link it answers at high-school level. It invents exercises with answer fields, corrects a photo of a copy, makes plans, sheets, mnemonics, and **interactive quizzes** (tappable choices corrected instantly with a score). Conversations are kept in a history; reopening the app starts a fresh one.
- **Planning**: a day timeline mixing school lessons (from the timetable, read by the AI from a photo or PDF) and revision blocks. Actions under the week strip: Pas cours, IA (describe your day in words or by voice), Contrôle. A "+" button adds a block. Month calendar view too.
- **Progrès**: level and shop, rewards, weekly report, mistakes, per-chapter statistics, streak, charts, badges, Duo (two students share statistics only, through an invitation code or link).
- **Réglages**: an iPhone-style list (profile, revision and voice, reminders, timetable, appearance, AI usage, sharing, archives, delete my data). One section opens at a time.
- **Motivation**: points, levels, badges, a daily streak with one freeze per week, a shop paid with coins earned by studying (themes, animated backgrounds, mascot outfits, card styles, titles, chests). Optional real-life gifts (`GIFTS` in `js/src/04-niveaux-boutique.js`) are only shown to accounts enabled in the admin page.
- **Reminders** (Web Push): daily reminder only if the student has not studied yet, "your streak ends tonight" at 9 pm, test reminders (one week, three days, the day before, the morning). Quiet weekends and school holidays (French zones A, B, C) are options.
- **Admin page** (`/admin`, password protected): students, screen time, AI usage, real gift access and requests.

## Architecture

Merge is a static site (plain HTML, CSS and JavaScript, no framework, no bundler) that talks to a Supabase project. All AI calls go through Supabase Edge Functions to Gemini on Google Vertex AI; the browser never sees any credential.

```
Browser (static site, installable PWA)
  ├─ Supabase Auth            Google sign-in
  ├─ Supabase Postgres        data, Row Level Security on every table
  ├─ Supabase Storage         bucket "cours" (imported photos/pages), bucket "voix" (cached audio)
  └─ Supabase Edge Functions
        ├─ ai       study tools (quiz, test, summary, cloze, mind map, sheet…), cached per chapter
        ├─ studio   server-side imports, Prof chat, timetable reading, dictation, day planning
        ├─ remind   push reminders (pg_cron every 15 min)
        ├─ voix     natural read-aloud voice, each sentence cached
        ├─ admin    data for /admin
        └─ diag     real-AI diagnostic for schema reading (no student data)
```

### Front end

- `js/src/NN-*.js` are numbered pieces of one big IIFE. `node tools/build-app.js` concatenates them into `js/app.js`, the only script the browser loads. **Edit `js/src/`, never `js/app.js`.** The tests check that `js/app.js` is up to date.

  | File | Content |
  |---|---|
  | `00-base.js` | helpers, icons (`I.*`), Markdown and LaTeX rendering |
  | `01-outils.js` | storage helpers, synced keys (`SYNC` regexp: localStorage keys mirrored to the `user_kv` table), sheets, toasts |
  | `02-donnees.js` | loading data into `state` (subjects, chapters, cards…), mastery, streak |
  | `03-connexion.js` | sign-in, onboarding, the tab bar (`TABS`, `drawTabs`) |
  | `04-niveaux-boutique.js` | levels, coins, shop, gifts |
  | `05-accueil-chapitres.js` | home screen, chapter screen, the list of tools (`MODES`, `MODE_MAIN`, `MODE_VAR`, `MODE_CATS`) |
  | `06-import.js` | import screen, file reading in the browser, import jobs and the floating progress chip |
  | `07-session-cartes.js` | flashcard sessions, schema cards |
  | `08-reglages-outils.js` | settings, search, tutorial |
  | `09-matieres-calendrier-progres.js` | subjects, folders, calendar, Progrès |
  | `09b-journee.js` | Planning (day timeline) |
  | `09c-exos.js` | Prof tab |
  | `10-modes.js`, `11-modes-suite.js` | study modes and games |
  | `12-navigation.js` | `route()`: picks the `screenXxx` function from the URL hash |

- **Caching AI output**: generated content is kept in memory, in `localStorage` and in the `ai_cache` table (one row per chapter and kind), so reopening a tool never costs a second call. When the daily quota is reached, a fixed message appears and every non-AI tool keeps working.
- **Service worker** (`sw.js`): network first with `cache: "no-cache"`, registered with `updateViaCache: "none"`, and the page reloads once when a new worker takes over. **Bump the cache name (`merge-shell-vNN`) at every release**, otherwise phones keep old files.

### Edge Functions

All are in `supabase/functions/`. Internal calls (pg_cron, one import step calling the next) are authenticated with the `cron` value of `app_secrets`, sent in the `x-cron-secret` header.

- **`studio`** (`index.ts` + `titre.mjs` for automatic chapter names + `schemas.mjs` for schema markers and duplicate cards). Deployed **without** JWT verification (it checks the user itself). Actions:
  - `import_start`, `import_step`, `import_resume`, `sweep`: imports run as jobs in `import_jobs`, in steps (`img` → `gen` → `save` → `verify`), each step one function call that calls the next, so an import continues when the app is closed and a push notification announces the result. Each step has a deadline (105 s for photos, 130 s otherwise) to stay under the platform's wall-time limit; a step that runs out of time is resumed, lighter, by the next one. `sweep` (pg_cron every 2 min) restarts jobs that have not moved for 3 minutes, and the app also auto-resumes a stale import.
  - Photos are read in batches of 4 pages: reading, re-reading against the photos, then deciphering of `[illisible]` passages. For each diagram the AI writes `[[SCHEMA|ymin,xmin,ymax,xmax|title]]`; the server turns it into `[Schéma S1 : title]` and keeps the box, so cards about a diagram show the cropped photo (`cards.image_path` + `cards.image_box`).
  - Card count: chosen by the AI by default ("auto", 100 max) or fixed by the student. A second import into the same chapter only adds what is new (the AI sees existing questions and summary, then `dedupCards` filters near duplicates).
  - `exochat` (Prof chat, returns `answer`, `fields`, `qcm`, `title`), `libre` (older free request), `edt_start` (timetable photo read in the background), `transcrire` (dictation), `planjour` (Planning by voice/text), `schema_test` (used by `diag`).
- **`ai`**: the study tools of the chapter screen. Keeps JWT verification.
- **`remind`**: push reminders; called every 15 minutes by pg_cron.
- **`voix`**: Google Text-to-Speech voice; each sentence is stored in the private `voix` bucket so it is never paid twice; a monthly cap (`TTS_MONTHLY_FREE`) falls back to the device voice.
- **`admin`**: password checked against `admin_pw_sha256`.
- **`diag`**: sends test pages (`tests/schemas/`) to `studio` `schema_test` to check schema detection with the real model.

Every call that uses the AI counts in `ai_usage` against a daily quota per user (`AI_DAILY_QUOTA`, 40 by default). Re-reading passes during an import, dictation and the voice do not count.

### Database

Main tables: `profiles`, `subjects`, `groups` (folders), `chapters`, `cards`, `summaries`, `sources` (extracted lesson text), `exams`, `study_sessions`, `quiz_results`, `quizzes`, `mistakes`, `ai_cache`, `ai_usage`, `import_jobs`, `user_kv` (synced settings), `push_subscriptions`, `card_trash`, `chapter_shares`, `gift_access`, `gift_claims`, `tts_usage`, `app_secrets` (service role only). Every user table has Row Level Security; Duo goes through SQL functions that only expose statistics.

`supabase/migrations/` holds the migrations since v6 (earlier tables were created in the Supabase project directly). The latest is v24 (`cards.image_box`). The app tolerates a missing new column (it retries without it), so a migration can be applied after the code is deployed. `supabase/optional/` holds SQL that is ready but not applied.

## Configuration

`js/config.js` holds only public values (app name, Supabase URL and publishable key, VAPID public key, music list, contact link). **No secret belongs in this repository.**

The Supabase project needs:

1. The migrations in `supabase/migrations/`, applied in order (SQL editor or `supabase db push`). The owner prefers pasting SQL in the SQL editor himself; nothing in a migration should delete data.
2. Google sign-in (Authentication → Providers) and the site address in Authentication → URL Configuration.
3. Edge Function secrets: `GCP_SERVICE_ACCOUNT_JSON` (Google Cloud service account allowed to call Vertex AI). Optional: `GEMINI_MODEL`, `GEMINI_LOCATION`, `AI_DAILY_QUOTA`, `TTS_VOICE`, `TTS_MONTHLY_FREE`.
4. The `public.app_secrets` table (`name`, `value`), with `cron` (random string), `vapid_public` / `vapid_private` (Web Push keys), `admin_pw_sha256`.
5. Two pg_cron jobs, both sending the `x-cron-secret` header: `remind` every 15 minutes, and `studio` with `{"action":"sweep"}` every 2 minutes (job `merge-import-sweep`).

Deploy a function with `supabase functions deploy <name> --project-ref <ref>` (add `--no-verify-jwt` for `studio`, `remind`, `voix`, `admin`, `diag`). For `studio`, deploy the three files together. Run `deno check` before deploying.

### Making it your own

- Name, colours and links: `js/config.js` and `css/app.css`.
- Real gifts: `GIFTS` in `js/src/04-niveaux-boutique.js` and the `gift_claims` check constraint. Nobody sees them until an account is enabled in `/admin`.
- Music and artwork: listed in `js/config.js`; use tracks and images you are allowed to use (see `NOTICE.md`).

## Running and deploying

Serve the folder with any static server (`python3 -m http.server 8080`). Google sign-in only works from an address allowed in the Supabase URL configuration.

The site is deployed as static files (Cloudflare, no build command, output directory `/`). After the first deployment, add the address to the Supabase URL configuration and to the authorised JavaScript origins of the Google OAuth client (redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`).

## Tests

```
node tools/build-app.js
node -c js/app.js
node tests/run.js
```

`tests/run.js` uses Playwright with Chromium. It serves the repository on a local port and replaces `vendor/supabase.js` with `tests/fake-supabase.js` (in-memory tables, storage, a simulated AI and Edge Functions). It sweeps every screen at 390 px and 1280 px in light and dark themes (overflow, 44 px buttons, JavaScript errors), checks a 320 px phone and an empty account, then runs about sixty flow suites (onboarding, imports including stalls and resumes, card sessions, each study mode, Prof and its quizzes, Planning, reminders logic, shop, Duo, settings, schema cards…). A full run takes about 10 minutes and must end with 0 failures.

- `ONLY=refonte,flows node tests/run.js` runs chosen suites (names in the `SUITES` object at the bottom of `tests/run.js`).
- `ONLY=apercu SHOTS=/tmp/shots node tests/run.js` saves screenshots of the main screens on phone (393 × 852) and desktop (1440 × 900) for a visual check; `ROUTES=journee,progres` limits it.
- Real-AI checks are not in the suite: they go through the `diag` function.

## Working rules

- Workflow for every change: edit `js/src/` → `node tools/build-app.js` → `node -c js/app.js` → `node tests/run.js` (all green) → bump `merge-shell-vNN` in `sw.js` → add an entry to `DECISIONS.md` → commit (English message) → push.
- Design: dark theme by default, accent `#4b39c8` / `#9483ff`, Nunito. Buttons at least 44 px high, no emoji in buttons, no neon or glow effects. Check every screen on a phone (393 × 852) and on desktop (1440 × 900); on desktop, screens should use the space well.
- Fewer choices beat more: tools that do the same job are merged rather than added (see the chapter refonte in `DECISIONS.md`). Wording should encourage (for example "révise aujourd'hui pour lancer ta série" rather than "0 jour").
- Every AI prompt keeps the lesson as the only source for generated study material, and treats lesson text as data, not instructions.
- Never commit a secret or the production address.

## Status

In production with a small group of students. Checked by the automated suite and by hand on an iPhone. Not yet verified on a real notebook import: schema cropping (tested with the real model on prepared pages in `tests/schemas/`).

## Licence

Third-party libraries and image credits are listed in [NOTICE.md](NOTICE.md).
