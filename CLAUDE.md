# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault ("arcade-vault") — a Next.js 16 platform for playing retro arcade games in the browser and competing on a shared leaderboard. Five games are actually playable (Asteroids, Tetris, Arkanoid, Snake, Frogger). The Supabase `games` table holds only those five rows, so `/juegos`, `/juegos/[id]` and `/salon-de-la-fama` show nothing else. The old placeholder catalog survives only in the static `GAMES` array in `app/data/games.ts`, which still feeds the landing-page preview rail (`app/page.tsx`, `GAMES.slice(0, 6)`) — those placeholder cards 404 if followed, since every game route resolves through Supabase. `GamePlayer`'s mock scoring simulation is consequently unreachable today; it's kept as the documented fallback for a `game.id` with no `GAME_ENGINES` entry.

**All user-facing copy is in Spanish**, including route segments (`/juegos`, `/salon-de-la-fama`, `/iniciar-sesion`, `/acerca-de`). Match that language when adding UI, and reply in the language the user writes in.

## Commands

Standard `npm run` scripts (see `package.json`). `npm run build` doubles as the acceptance gate for every spec.

## Spec Driven Design

This project follows Spec Driven Design. Specs live in `specs/NN-<slug>.md`, numbered sequentially, each with a `**Status:**` field (`Draft` → `Approved` → `Implemented`). **Read the relevant spec before implementing anything**; specs 01–10 are all implemented (08's status literal reads `Integrated`) and are the authoritative record of why the code looks the way it does. Game-jam specs live at `specs/game-jam/<game-id>/NN-<slug>.md`: `frogger/01` is Implemented; both `duelo-de-ranas` specs are still `Draft`.

Skills that drive the workflow:

- **`/spec`** — authors a general feature spec (from `.agents/skills/spec/`, installed via `npx skills@latest add Klerith/fernando-skills`).
- **`/spec-impl`** — executes an approved spec step by step, one commit per step. Branch creation is controlled by `AutoCreateBranch` in `specs/.spec-config.yml` (currently `true`).
- **`/spec-impl-game`** — `/spec-impl` plus two automatic follow-on steps once the build is green: `skin-designer <slug>` then `mobile-porter <slug>`, run **strictly in series, never in the same message** (both write `components/game-player.tsx` and blocks of `app/globals.css`, so parallel runs would conflict).
- **`/add-game`** — project-local skill (`.claude/skills/add-game/`) that authors a game-integration spec. It never writes code, CSS, or SQL. Its `reference.md` is the **platform contract** for game integration (engine contract, canvas contract, registration rule, data layer, schema, cover-art pattern, per-template hazards) — read it before touching anything under `components/games/`.
- **`/frontend-design`** — always use this when designing or reshaping UI.

### Agents

Five agents extend the workflow beyond specs. Each keeps its own append-only memory/ledger under
`.claude/<agent-name>/`; read `.claude/agents/<name>.md` for the full contract (scope limits, refusal rules,
exact write paths) before invoking one.

| Agent              | What it does                                                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `game-planner`      | Decides which known game the platform builds next; ranks candidates and owns `references/game-suggestions-todo.md`. Writes no specs or code.                                                                     |
| `game-jam`          | Turns a loose topic into an original game plus ≥2 implementable specs under `specs/game-jam/<game-id>/`. Writes only specs, never code/CSS/SQL.                                                                  |
| `skin-designer`     | Gives one already-playable game its three canvas skins (`classic`/`neon`/`retro`). Writes only `components/games/**` and `game-player.tsx`. Refuses a slug absent from `GAME_ENGINES`.                           |
| `mobile-porter`     | Fits one already-playable game's play screen to mobile (HUD wrap, `--crt-aspect`, touch sizing). Writes only play-screen CSS, `game-player.tsx`, `<slug>-canvas.tsx`. Refuses a slug absent from `GAME_ENGINES`. |
| `security-auditor`  | Sweeps source and the live Supabase database for security gaps; owns `references/security/security-checklist.md`. Read-only against the database, never fixes anything itself.                                  |

Current coverage: `skin-designer` has run for asteroids, arkanoid, snake and frogger — **tetris still has no
`skins.ts` and ignores the `skin` prop**. `mobile-porter` has run for frogger only, but the `--crt-aspect`
seam that run built onto `.crt-screen` is shared platform plumbing every game's canvas can use.

Five hand-off chains: **`game-planner` → `/add-game <slug>` → `/spec-impl`** for picking a known game from the backlog, **`game-jam <topic>` → `/spec-impl specs/game-jam/<slug>/01-...`** for inventing an original one from a theme, **`/spec-impl-game <spec>`** to run a spec plus reskin plus mobile port in one pass, **`skin-designer <slug>`** / **`mobile-porter <slug>`** standing alone, run once per game after that game is already playable, and **`security-auditor` → `/spec` → `/spec-impl`** for turning an audit finding into a hardening spec — spec 12 is the worked precedent.

## Architecture

### Routing (App Router only, no `pages/`)

| Route                | File                                                 | Notes                                                         |
| -------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| `/`                  | `app/page.tsx`                                       | Landing page (spec 02)                                        |
| `/juegos`            | `app/juegos/page.tsx` + `games-library.tsx`          | Catalog from Supabase                                         |
| `/juegos/[id]`       | `app/juegos/[id]/page.tsx`                           | Detail + per-game leaderboard                                 |
| `/juegos/[id]/jugar` | `app/juegos/[id]/jugar/page.tsx`                     | Resolves via `getGame(id)`, renders `GamePlayer`              |
| `/salon-de-la-fama`  | `app/salon-de-la-fama/page.tsx` + `hall-of-fame.tsx` | Global leaderboard                                            |
| `/iniciar-sesion`    | `app/iniciar-sesion/page.tsx`                        | Mock local auth                                               |
| `/acerca-de`         | `app/acerca-de/page.tsx`                             | Contact form (spec 03)                                        |
| `POST /api/contacto` | `app/api/contacto/route.ts`                          | Resend email, validated by `components/contact-validation.ts` |

`params` is a Promise in Next.js 16 — `const { id } = await params;`.

### Data layer

- **Supabase** (`@supabase/ssr`) is the source of truth for games and scores. `lib/supabase/server.ts` (cookie-aware, `await cookies()`) for server components; `lib/supabase/client.ts` for the browser.
- `lib/games.ts` — `listGames()`, `getGame(id)`. `lib/scores.ts` — `listScores(gameId)` (server read). `lib/scores-client.ts` — `insertScore(gameId, name, score)` (browser write). These are already generic; adding a game requires **no changes here**.
- Tables: `games` (text `id` slug PK, title/short/long/cat/cover/color/best/plays) and `scores` (uuid PK, `game_id` FK, name, score, created_at). Both have RLS with public select; `scores` also allows public insert. Schema is documented in `specs/06-games-and-scores-supabase.md`.
- `app/data/games.ts` still exports the `Game`/`GameCategory` types and the legacy `GAMES` array plus `CATS`. **The type is what's live**, and `CATS` still drives the `/juegos` category-filter chips; `GAMES` itself is live only for the landing-page preview rail (`app/page.tsx`) — otherwise it's historical/seed reference, since every game route reads from Supabase.
- `app/data/players.ts` provides fake seeded leaderboard names for placeholder games.
- Auth (`components/auth-provider.tsx`) is a mock localStorage-backed context, read after mount to avoid hydration mismatch. There is no real Supabase Auth.

### Games

Each game is `components/games/<slug>/engine.ts` + `<slug>-canvas.tsx`:

- **Engine** — framework-free class (no React, no DOM beyond `CanvasRenderingContext2D`, no persistence): `update(dt)`, `draw()`, `handleKeyDown/Up(code)`, `reset()`, `getSnapshot()`. Vanilla-template module globals become instance fields.
- **Canvas component** — `forwardRef` + `useImperativeHandle` exposing `GameControlsHandle` (`handleKeyDown`/`handleKeyUp`), so `TouchControls` can drive any game without a per-game branch. Props `{ paused, onSnapshot, onGameOver, restartSignal, skin? }` (see `GameCanvasProps` in `components/games/registry.ts`) — `skin` is optional so a game without a palette yet (tetris) simply ignores it.
- **Registration is three places**: a row in the Supabase `games` table, an entry in `GAME_ENGINES`, and an entry in `GAME_TOUCH_CONTROLS` (per-slot `code`/`hold`|`tap`/`enabled`) — all in `components/games/registry.ts`. `GamePlayer` dispatches purely off these registries — never add a hardcoded per-game branch. A `game.id` with no `GAME_ENGINES` entry falls through to the mock score simulation.
- **Skins** — a per-game `components/games/<slug>/skins.ts` palette plus `setSkin()` on the engine; the platform seam (`components/games/skins.ts` — `SkinId`, `SKIN_IDS`, `DEFAULT_SKIN`, `SKINS`, `isSkinId`) backs a three-way picker in `GamePlayer`'s `.hud-actions`, persisted as `localStorage["av_skin"]` and read after mount. See `skin-designer` in Agents above for which games have one.
- **Non-4:3 canvases** set the `--crt-aspect` CSS custom property on their ancestor `.crt-screen` imperatively from the canvas wrapper's mount effect (e.g. `frogger-canvas.tsx` → `520 / 640`) — custom properties only cascade downward, and `.crt-screen` is rendered by the game-agnostic `game-player.tsx` as an ancestor of whatever `GAME_ENGINES` renders.
- Binary assets live under `public/games/<slug>/` — only Arkanoid (spritesheet + 2 sounds) and Snake (fruit sprites) have any.
- Cover art is a `.cover-<slug>` CSS block in `app/globals.css` (pure CSS gradients/pseudo-elements, no images) — or reuse of an existing one when the visual already fits (Frogger reuses `.cover-rana`, no new CSS).

All currently implemented games can be found at `references/implemented-games.md`.

### Styling

Tailwind CSS v4 via `@tailwindcss/postcss` — configured through CSS, there is no `tailwind.config.*`. `app/globals.css` (~1460 lines) holds the neon-arcade design system, all cover-art blocks, and the skin/touch-control/`.crt` play-screen rules. `components/use-reveal.ts` drives scroll-reveal animations.

### Tooling

- Path alias `@/*` → repo root.
- Prettier (`.prettierrc.json`, with `prettier-plugin-tailwindcss`) + `eslint-config-prettier`. A **PostToolUse hook** (`.claude/hooks/format-file.mjs`, wired in `.claude/settings.json`) auto-runs Prettier on every written `.tsx/.jsx/.md/.mdx` file and `eslint --fix` on React files — do not hand-format.
- `.mcp.json` configures the **Supabase MCP server**; migrations go through `mcp__supabase__apply_migration`, verification through `mcp__supabase__execute_sql`. Playwright MCP is available for browser verification (`.playwright-mcp/`, `.playwright-screenshots/`).
- Env vars (see `.env.template`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `CONTACT_EMAIL`.

### `references/` (not shipped, Prettier-ignored)

- `references/templates/*.jsx` + `styles.css` — the original static design mockups the pages were ported from.
- `references/templates/started-games/NN-<game>/` — vanilla HTML/JS source games used as porting input. **Their READMEs are known to contradict their own code** — trust the code, and check `reference.md` §9 for documented per-template hazards. All three (asteroids, tetris, arkanoid) are already ported; future games have no template.
- `references/implemented-games.md` — the shipped catalog, in Spanish. Source of truth for what exists.
- `references/game-suggestions-todo.md` — the ranked backlog of proposed games, owned by the `game-planner` agent. Prettier does not touch this directory, so keep it tidy by hand.

## Next.js 16

**This is Next.js 16, not the version in your training data.** APIs, conventions, and file structure may differ from what you expect. Before writing routing, data-fetching, or config code, check the bundled docs in `node_modules/next/dist/docs/` (`01-app/`, `02-pages/`, `03-architecture/`, `04-community/`) and follow any deprecation notices found there rather than assuming Next.js 13/14 conventions.
