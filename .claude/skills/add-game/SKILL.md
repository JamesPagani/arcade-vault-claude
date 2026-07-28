---
name: add-game
description: Authors a spec for integrating a new playable game and its Supabase leaderboard into Arcade Vault. Reads the reference template under references/templates/started-games/ when one exists, interviews for what it cannot infer, and writes specs/NN-<slug>-integration.md. Does not write code.
disable-model-invocation: true
argument-hint: "<game name or slug, e.g. tetris>"
---

# /add-game — Guided game-integration spec designer

This skill produces a spec for adding one new real, playable game (with its
Supabase leaderboard) to Arcade Vault, following the same recipe already
executed for Asteroids across `specs/05-asteroids-integration.md` and
`specs/06-games-and-scores-supabase.md`. **You don't write code, CSS, or SQL
here, and you never call `mcp__supabase__apply_migration` or any other
Supabase write tool.** Your job is to resolve the game's source material,
ask what can't be inferred, and develop the spec section by section until it
is ready to save into `specs/`. `/spec-impl` is what executes it afterward.

Read `reference.md` (in the same directory as this skill) before Phase 2 —
it is the platform contract every generated spec must respect: the engine
and canvas-component contracts, the two-place registration rule, the
registry-vs-hardcoded-branch dispatcher rule, the already-generic data
layer, the existing schema, the cover-art CSS pattern, and the specific
hazards found in each reference template. Lean on it at every step; do not
re-derive it from scratch.

## Philosophy

Same as `/spec`: the spec is the contract that drives `/spec-impl`. This
flow is deliberately slow while resolving the game's mechanics and fast
once decisions are locked. Your replies must be in the same language as the
initial prompt (Spanish in, Spanish out; English in, English out).

## Session context

Run before Phase 1, so you start informed rather than guessing:

Template folders available:
!`ls references/templates/started-games/`

Existing spec numbering, to pick the next one:
!`ls specs/`

Games already ported:
!`ls components/games/`

Whether the dispatcher registry (§4 of `reference.md`) already exists:
!`ls components/games/registry.ts 2>/dev/null || echo "registry.ts does not exist yet"`

Whether `game-player.tsx` still hardcodes a single-game branch:
!`grep -n "isAsteroids\|GAME_ENGINES" components/game-player.tsx`

Whether the play route still reads the static array instead of Supabase:
!`grep -n "GAMES.find\|getGame" "app/juegos/[id]/jugar/page.tsx"`

---

### Phase 1 — Resolve the game and its source

1. Take the `$ARGUMENTS` game name/slug. Fuzzy-match it against the
   `NN-<name>` folders under `references/templates/started-games/` (e.g.
   "tetris" → `03-tetris`, "arkanoid"/"breakout" → `04-arkanoid`). If
   `$ARGUMENTS` is empty, ask for the game name first.
2. **If a template matches:** read its `README.md`, `CLAUDE.md`, and
   `index.html`. From `index.html`, enumerate **every** `<script src>` tag
   in load order — never assume a single `game.js` file exists (one
   template loads three). Read each script. Build a findings table
   covering: canvas element id + `width`/`height` attributes, number of
   canvases, dt units and whether capped, class-based vs plain-function
   style, constant tables (scoring, speeds, piece/level data), the
   score/lives/level variable names, the exact game-over signal (variable,
   value, and the function that sets it), the restart mechanism (if any),
   HUD location (canvas-drawn vs DOM), any binary assets, any
   `document.getElementById`/`querySelector` dependency beyond the main
   canvas, and any `localStorage` use.
   Then state plainly: **README tables in these templates have been found
   to contradict their own code** — name the specific drift for this
   template if `reference.md` §9 documents one for it, and note that
   anything load-bearing in your findings table came from the code, not
   the docs.
3. **If no template matches:** say so explicitly ("no template found under
   `references/templates/started-games/` for `<name>` — this will be an
   original engine designed from scratch against the platform's engine
   contract") and move to Phase 2 with the from-scratch question set.

---

### Phase 2 — Clarify through questions

Same rules as `/spec`: blocks of 3–5 questions, wait for an answer before
continuing, concrete options with a stated recommendation, flag anything
that smells like its own future spec. Work through this checklist,
adapting wording to whether a template exists:

1. **Catalog metadata.** `id` slug, `title`, Spanish `short`/`long` copy,
   `cat` (`ARCADE`/`PUZZLE`/`SHOOTER`/`VERSUS`), `color`
   (`cyan`/`magenta`/`yellow`/`green`), placeholder `best`/`plays`. If the
   game thematically overlaps an existing fake catalog entry (e.g. tetris
   vs. `caida`, arkanoid/breakout vs. `bloque-buster`), ask explicitly:
   new distinct entry, or replace/reuse the existing slug? Note that spec
   05 chose a new `asteroids` entry over reusing the thematically similar
   `rocas`, accepting the duplication.
2. **Cover art.** Which existing `.cover-*` block (see `reference.md` §8)
   is the closest sibling to clone and recolor for `.cover-<slug>`?
   Remind that `/frontend-design` governs new UI/cover-art work per
   `CLAUDE.md`.
3. **Canvas shape.** Logical width/height, how many canvases (does the
   game need a secondary preview canvas like tetris' `next` piece?), which
   exact key codes need `preventDefault` while focused and playing.
4. **HUD placement.** If the template drives a DOM HUD instead of
   canvas-drawn text, does the port move HUD rendering into the canvas
   (consistent with the engine contract) or keep a parallel DOM HUD? Note
   that `GamePlayer` already renders its own `player-hud` React overlay
   regardless, and spec 05 deliberately kept the canvas's own duplicate
   HUD for visual fidelity to the original.
5. **Restart semantics.** What must "JUGAR DE NUEVO" fully reset (score,
   lives if applicable, level/board state)? If the template has no restart
   path at all (true for one of the three references), say so and confirm
   the engine's `reset()` is being designed fresh, not ported.
6. **Assets.** Any binary assets (sprites, audio)? If yes, confirm they
   land under `public/games/<slug>/...` and that path rewrites must grep
   the JS string literals referencing them, not just `index.html`.
7. **Scope trims.** Any template-only extras (theme toggles, mouse-driven
   controls, level-select overlays, persisted settings) — explicitly in or
   out of this spec's scope?

**Stop asking** once you can answer, without assuming: which files will
appear or change, what the first and last executable steps are, and how to
verify the feature end-to-end (same three-question gate as `/spec`).

---

### Phase 3 — Decide which one-time platform steps this spec carries

Using the Session-context results:

- If `components/games/registry.ts` does **not** exist yet, this spec's
  Implementation Plan must open with the registry + dispatcher refactor
  (`reference.md` §4) as a no-regression step — Asteroids must play
  identically before and after. State this to the user before drafting.
- If it already exists, this spec only adds one entry to `GAME_ENGINES`;
  say so, and do not reintroduce dispatcher branching.
- If `app/juegos/[id]/jugar/page.tsx` still resolves via `GAMES.find`, this
  spec's plan includes switching it to `getGame(id)` (`reference.md` §5).
  If it's already been switched by a prior add-game run, skip that step.

State plainly which of these one-time steps apply to _this_ spec before
moving to Phase 4, so the user isn't surprised by "infrastructure" steps
appearing in what they expect to be a single-game spec.

---

### Phase 4 — Develop the spec section by section

**Do not generate the full spec in one shot.** Build it section by section,
show each in markdown, wait for confirmation, in this exact order — this is
the repo's real house format as used in `specs/05` and `specs/06`, which
diverges from the blockquote style in `.agents/skills/spec/template.md` and
takes precedence for this skill:

1. **Header** — bullet list, not blockquote:
   ```markdown
   # NN - <Title>: <short subtitle>

   - **Status:** Draft
   - **Dependencies:** 05-asteroids-integration (engine/canvas contract), 06-games-and-scores-supabase (games/scores schema)
   - **Date:** <today, ISO>
   - **Objective:** one sentence. If it needs two, the feature is too big.
   ```
2. **Scope** — `## Scope` with `### In scope` and `### Not in scope`
   bullet lists (both mandatory, "not in scope" captures anything raised in
   Phase 2 that got deferred).
3. **Data Model** — `## Data Model` with real names: the `games` table
   insert values, the engine's `<Name>Snapshot` shape (only if it varies
   from the standard `{score, lives, level, state}` — note the deviation
   and why per `reference.md` §1), the canvas component's prop interface.
4. **Implementation Plan** — `## Implementation Plan`, numbered, each step
   leaving the app in a runnable state, adapted from this skeleton:
   1. _(only if Phase 3 flagged it)_ Registry + dispatcher refactor.
   2. _(only if Phase 3 flagged it)_ Switch `jugar/page.tsx` to `getGame(id)`.
   3. Catalog metadata: `GAMES` entry in `app/data/games.ts` + `.cover-<slug>` in `app/globals.css`.
   4. Supabase row via `mcp__supabase__apply_migration` (`seed_game_<slug>`) — single insert, tables already exist.
   5. `components/games/<slug>/engine.ts` — port or author against the engine contract.
   6. `components/games/<slug>/<slug>-canvas.tsx` — copy the asteroids canvas structure, changing only dimensions/keys/engine class.
   7. Register `<slug>` in `GAME_ENGINES`.
   8. Cross-check pass: full manual play-through + `execute_sql` check on the inserted score + `npm run build`.
5. **Acceptance Criteria** — `## Acceptance Criteria`, boolean checklist,
   adapted from spec 05/06's checklists (card appears on `/juegos`; detail
   page renders via `getGame`; real gameplay matches this game's mechanics;
   keyboard only affects the game when focused and doesn't scroll the
   page; PAUSA/REANUDAR freeze and resume; FIN and in-game game-over both
   open the save-score modal with the real score; saving inserts a
   `scores` row, verifiable via `execute_sql`; the new score ranks
   correctly on both the detail leaderboard and `/salon-de-la-fama`;
   JUGAR DE NUEVO fully resets; canvas scales on narrow viewports without
   horizontal overflow; other games (including Asteroids) are unregressed;
   no console errors; `npm run build` clean).
6. **Decisions Taken and Discarded** — `## Decisions Taken and Discarded`,
   one bullet per real decision from Phase 1–3 with its reason (catalog
   slug choice, HUD placement, restart design, any scope trims).
7. **Identified Risks** — `## Identified Risks`, only if non-obvious risks
   exist (template-specific hazards from `reference.md` §9 are usually
   worth carrying here if this game's template had any).

After each section: show it, ask "¿Esta sección queda así o quieres
ajustarla?" (or the English equivalent if the conversation is in English),
apply requested changes, only proceed once confirmed.

---

### Phase 5 — Save the spec

1. Determine the next sequential number from `specs/` (list already ran in
   Session context).
2. Slug from the objective, e.g. `tetris-integration`.
3. Confirm the proposed filename `specs/NN-<slug>.md` with the user before
   writing.
4. Write the file with all approved sections, `Status: Draft`.
5. Confirm to the user:
   - The path of the created file.
   - That it's `Draft` — they flip it to `Approved` once re-read.
   - Next step: `/spec-impl NN-<slug>` once approved.
   - **Stop here.** Do not propose implementing it, writing code, or
     applying the migration yourself.

---

## Hard rules

- **Never write code, CSS, or SQL files, and never call
  `mcp__supabase__apply_migration` or any other write-capable Supabase
  tool.** The spec _specifies_ the migration; `/spec-impl` applies it.
- **Never invent template details.** If a template exists, read its actual
  code for anything load-bearing — the reference templates' own READMEs
  are known to drift from their code (`reference.md` §9).
- **Never assume the registry/dispatcher state.** Always check via the
  Session-context greps before deciding whether Phase 3's infra steps
  apply.
- **Never generate the full spec in one response.** Section by section,
  with confirmation, per Phase 4.
- **Never mark the spec `Approved`**, and never propose implementation
  after saving — your job ends at the confirmation in Phase 5.
- **If the user wants to skip Phase 2**, warn them the cost is paid later
  in `/spec-impl`, same as `/spec`; if they insist, record "quick
  definition without detailed clarification" in the Decisions section.

## Arguments

If invoked as `/add-game tetris`, use `tetris` to resolve the template
match in Phase 1 and as the initial slug suggestion — still confirm the
final filename in Phase 5. If invoked with no arguments, ask for the game
name/slug first.
