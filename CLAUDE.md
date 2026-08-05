# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault ("arcade-vault") — a Next.js 16 platform for playing retro arcade games in the browser and competing on a shared leaderboard. Four games are actually playable (Asteroids, Tetris, Arkanoid, Snake); the rest of the catalog is still placeholder metadata backed by a mock scoring simulation in `GamePlayer`.

**All user-facing copy is in Spanish**, including route segments (`/juegos`, `/salon-de-la-fama`, `/iniciar-sesion`, `/acerca-de`). Match that language when adding UI, and reply in the language the user writes in.

## Commands

```bash
npm run dev           # next dev
npm run build         # next build — the acceptance gate for every spec
npm run lint          # eslint
npm run format        # prettier --write .
npm run format:check  # prettier --check .
```

## Spec Driven Design

This project follows Spec Driven Design. Specs live in `specs/NN-<slug>.md`, numbered sequentially, each with a `**Status:**` field (`Draft` → `Approved` → `Implemented`). **Read the relevant spec before implementing anything**; specs 01–09 are all implemented and are the authoritative record of why the code looks the way it does.

Skills that drive the workflow:

- **`/spec`** — authors a general feature spec (from `.agents/skills/spec/`, installed via `npx skills@latest add Klerith/fernando-skills`).
- **`/spec-impl`** — executes an approved spec step by step, one commit per step. Branch creation is controlled by `AutoCreateBranch` in `specs/.spec-config.yml` (currently `true`).
- **`/add-game`** — project-local skill (`.claude/skills/add-game/`) that authors a game-integration spec. It never writes code, CSS, or SQL. Its `reference.md` is the **platform contract** for game integration (engine contract, canvas contract, registration rule, data layer, schema, cover-art pattern, per-template hazards) — read it before touching anything under `components/games/`.
- **`/frontend-design`** — always use this when designing or reshaping UI.

### Agents

- **`game-planner`** (`.claude/agents/game-planner.md`) — decides _which_ game the platform builds next. It scores candidates against the platform contract (portability, leaderboard fit, catalog balance, CSS-only cover art, asset burden, effort), maintains the Spanish to-do list at `references/game-suggestions-todo.md`, and keeps its own memory in `.claude/game-planner/` (`decisions.md` append-only log, `rejected.md` ledger, `README.md` protocol). It writes nowhere else and never produces specs or code.
- **`game-jam`** (`.claude/agents/game-jam.md`) — given a loose topic (e.g. "a game about coffee"), invents an original game from scratch and authors at least two full, independently implementable specs for it under `specs/game-jam/<game-id>/` (a core integration spec plus follow-ups), reusing the same platform contract. Runs autonomously, no interview. Writes only under `specs/game-jam/`; never code, CSS, SQL, or migrations.
- **`skin-designer`** (`.claude/agents/skin-designer.md`) — invoked as `skin-designer <slug>`, gives **one already-implemented** game three canvas skins: `classic` (a byte-exact transcription of its current look, and the default), `neon`, and `retro`. It lifts the engine's hardcoded draw literals into `components/games/<slug>/skins.ts`, adds `setSkin()` to the engine, and on its first run builds the platform seam (`components/games/skins.ts`, a `skin` prop on `GameCanvasProps`, and an `av_skin`-backed picker in `GamePlayer`'s `.hud-actions`). Unlike the other two agents it **does write code**, but only under `components/games/**` and `components/game-player.tsx`; it keeps its contract and an append-only palette ledger in `.claude/skin-designer/`. Scope is canvas visuals only — never site chrome, `:root`, `.cover-*`, gameplay, or Supabase. A slug with no `GAME_ENGINES` entry is refused outright with nothing written.
- **`mobile-porter`** (`.claude/agents/mobile-porter.md`) — invoked as `mobile-porter <slug>`, makes **one already-implemented** game's play screen fit both desktop and mobile: HUD wrapping, `.crt`/`.crt-screen` sizing (via a `--crt-aspect` custom property so a non-4:3 canvas like Tetris's doesn't need a per-game branch), and `clamp()`-scaled touch-control sizing with a safe-area inset. It also writes code, but only in play-screen blocks of `app/globals.css`, `components/game-player.tsx`, and the target game's `<slug>-canvas.tsx` wrapper — never canvas `width`/`height` attributes, `engine.ts`, or `skins.ts`, which stay `skin-designer`'s territory (color is not layout). It keeps its contract and an append-only viewport ledger in `.claude/mobile-porter/`. Scope is the play screen only — never site chrome, `:root`, `.av-nav`, `.cover-*`, gameplay, or Supabase. A slug with no `GAME_ENGINES` entry is refused outright with nothing written.

Four hand-off chains: **`game-planner` → `/add-game <slug>` → `/spec-impl`** for picking a known game from the backlog, **`game-jam <topic>` → `/spec-impl specs/game-jam/<slug>/01-...`** for inventing an original one from a theme, and **`skin-designer <slug>`** and **`mobile-porter <slug>`**, each standing alone, run once per game after that game is already playable — one dresses the canvas, the other fits the screen around it.

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
- `app/data/games.ts` still exports the `Game`/`GameCategory` types and the legacy `GAMES` array plus `CATS`. **The type is what's live** — the array is now historical/seed reference, since routes read from Supabase.
- `app/data/players.ts` provides fake seeded leaderboard names for placeholder games.
- Auth (`components/auth-provider.tsx`) is a mock localStorage-backed context, read after mount to avoid hydration mismatch. There is no real Supabase Auth.

### Games

Each game is `components/games/<slug>/engine.ts` + `<slug>-canvas.tsx`:

- **Engine** — framework-free class (no React, no DOM beyond `CanvasRenderingContext2D`, no persistence): `update(dt)`, `draw()`, `handleKeyDown/Up(code)`, `reset()`, `getSnapshot()`. Vanilla-template module globals become instance fields.
- **Canvas component** — props `{ paused, onSnapshot, onGameOver, restartSignal }` (see `GameCanvasProps` in `components/games/registry.ts`).
- **Registration is two places**: a row in the Supabase `games` table and an entry in `GAME_ENGINES` in `components/games/registry.ts`. `GamePlayer` dispatches purely off that registry — never add a hardcoded per-game branch. A `game.id` with no registry entry falls through to the mock score simulation.
- Binary assets live under `public/games/<slug>/` (Arkanoid spritesheet + sounds, Snake fruit sprites).
- Cover art is a `.cover-<slug>` CSS block in `app/globals.css` (pure CSS gradients/pseudo-elements, no images).

All currently implemented games can be found at `references/implemented-games.md`.

### Styling

Tailwind CSS v4 via `@tailwindcss/postcss` — configured through CSS, there is no `tailwind.config.*`. `app/globals.css` (~1300 lines) holds the neon-arcade design system and all cover-art blocks. `components/use-reveal.ts` drives scroll-reveal animations.

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
