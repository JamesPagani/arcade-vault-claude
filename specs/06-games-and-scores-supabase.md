# 06 - Games & Scores: Supabase-Backed Leaderboard

- **Status:** Approved
- **Dependencies:** 04-supabase-installation (client SDKs, env vars), 05-asteroids-integration (only real game with live gameplay to award real scores)
- **Date:** 2026-07-27
- **Objective:** Create real Supabase `games` and `scores` tables seeded with only the `asteroids` row, replacing the static `GAMES` array and `seededScores`/`av_scores` mock wherever these tables are read, accepting that Library/Game Detail/Hall of Fame will show only 1 game until a future spec migrates the other 8.

## Scope

### In scope

- **Supabase migration** (applied via `mcp__supabase__apply_migration`, e.g. named `create_games_and_scores`):
  - `games` table: `id` (text, PK, the existing slug e.g. `"asteroids"`), `title`, `short`, `long`, `cat`, `cover`, `color`, `best` (int), `plays` (text). RLS enabled, public `SELECT` policy.
  - `scores` table: `id` (uuid, PK, default gen), `game_id` (text, FK → `games.id`), `name` (text), `score` (int), `created_at` (timestamptz, default now()). RLS enabled, public `SELECT` and public `INSERT` policies (no `UPDATE`/`DELETE` policies).
  - Seed data: **only** the `asteroids` entry (values ported 1:1 from `app/data/games.ts`) inserted into `games`. No rows seeded into `scores`. The other 8 `GAMES` entries are **not** migrated into the table in this spec.
- **`app/page.tsx` (Library)** becomes a Server Component: fetches all rows from `games` server-side (`lib/supabase/server.ts` — at this point, just the single `asteroids` row) and passes them as props into a client component that keeps today's exact search input + category-chip filtering behavior over that in-memory list. `GAMES` (the static array) is no longer imported here.
- **`app/juegos/[id]/page.tsx` (Game Detail)** becomes a Server Component: fetches the matching row from `games` (404 via `notFound()` for any id not present — i.e. every id except `asteroids`).
  - Its leaderboard section, for `id === "asteroids"` (the only id that can reach this page now): queries real rows from `scores` (ordered by `score` desc).
- **`app/salon-de-la-fama/page.tsx` (Hall of Fame)**: tabs are driven by the `games` table, so only an `asteroids` tab renders. Podium (top 3) + full table are built from real `scores` rows for that `game_id`. The "your score" highlighted row (when logged in via the fake `AuthProvider`) keeps working by matching `name` against the current session's username.
- **Asteroids score saving**: `GamePlayer`'s save-score modal, when `game.id === "asteroids"`, inserts a new row into `scores` (`game_id: "asteroids"`, `name`, `score`) via the Supabase browser client (`lib/supabase/client.ts`) instead of `useAuth().saveScore()`'s `av_scores` localStorage write.
- New query helper module(s) (e.g. `lib/games.ts`, `lib/scores.ts`) wrapping the Supabase queries used above (list games, get game by id, list scores by game id, insert score).
- `app/data/games.ts`'s `Game` interface/type is reused (not redefined) as the shape returned by the `games` table queries, so existing components don't need prop-shape changes.

### Not in scope

- Migrating the other 8 `GAMES` entries into the `games` table, or their scoring off `av_scores`/`seededScores` — they simply stop appearing on `/`, `/juegos/[id]`, and `/salon-de-la-fama` after this spec, since those routes now read exclusively from the `games` table. Confirmed intentional; restoring them is deferred to a future spec.
- `app/data/games.ts`'s static `GAMES` array itself is **not** deleted in this spec (kept as a reference/fallback for the future migration spec), it is simply no longer imported by Library/Detail/Hall of Fame.
- Real Supabase Auth — the fake `localStorage` `AuthProvider` (spec 01) stays exactly as-is; `scores.name` is a free-text string, no `user_id` foreign key, no per-user RLS.
- Any UI/visual changes to Library, Game Detail, Hall of Fame, or the Player screen beyond swapping their data source — layout, styling, and copy stay pixel-identical to specs 01/02/03/05 for whatever content still renders.
- Pagination, rate limiting, or abuse protection on the public `scores` insert policy — matches today's trust level (anyone can already fabricate a `localStorage` score).
- Editing/deleting scores (no `UPDATE`/`DELETE` policy, no admin UI).
- Migrating `best`/`plays` on the `games` table to be computed from real `scores` data — they stay static display values ported from `GAMES`, unrelated to actual leaderboard contents.
- Automated tests — verified manually per Acceptance Criteria, consistent with prior specs.

## Data Model

### Supabase: `games` table

```sql
create table public.games (
  id     text primary key,        -- slug, e.g. "asteroids"
  title  text not null,
  short  text not null,
  long   text not null,
  cat    text not null,           -- "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS"
  cover  text not null,           -- CSS class name, e.g. "cover-asteroids"
  color  text not null,           -- "cyan" | "magenta" | "yellow" | "green"
  best   integer not null,        -- static display value, ported from GAMES
  plays  text not null            -- static display string, e.g. "4.2K"
);

alter table public.games enable row level security;

create policy "games are publicly readable"
  on public.games for select
  using (true);
```

Seed (this migration, single row):

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays)
values (
  'asteroids', 'ASTEROIDS',
  'Sobrevive en un campo de rocas en gravedad cero.',
  'Pilota una nave triangular en el vacío absoluto de un campo toroidal. Dispara y rota para partir las rocas grandes en fragmentos cada vez más pequeños, recoge el power-up de disparo triple y sobrevive oleada tras oleada.',
  'SHOOTER', 'cover-asteroids', 'cyan', 38700, '4.2K'
);
```

### Supabase: `scores` table

```sql
create table public.scores (
  id         uuid primary key default gen_random_uuid(),
  game_id    text not null references public.games(id),
  name       text not null,
  score      integer not null,
  created_at timestamptz not null default now()
);

alter table public.scores enable row level security;

create policy "scores are publicly readable"
  on public.scores for select
  using (true);

create policy "anyone can submit a score"
  on public.scores for insert
  with check (true);
```

No rows seeded.

### `lib/games.ts` (new)

```ts
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string;
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;
}

export async function listGames(): Promise<Game[]>;
export async function getGame(id: string): Promise<Game | null>;
```

- Same `Game` shape as today's `app/data/games.ts` export, so `GameCard`, Detail page, etc. need no prop-type changes — only their data source changes.
- Both functions use the server-side Supabase client (`lib/supabase/server.ts`), called from Server Components.

### `lib/scores.ts` (new)

```ts
export interface ScoreRow {
  id: string;
  game_id: string;
  name: string;
  score: number;
  created_at: string;
}

export async function listScores(gameId: string): Promise<ScoreRow[]>; // ordered by score desc, server-side
export async function insertScore(
  gameId: string,
  name: string,
  score: number,
): Promise<void>; // client-side, from GamePlayer
```

- `listScores` is called server-side (Game Detail, Hall of Fame) via `lib/supabase/server.ts`.
- `insertScore` is called client-side (`GamePlayer`'s save-score modal, `asteroids` branch only) via `lib/supabase/client.ts`.

## Implementation Plan

1. **Migration** — Apply the Supabase migration (`create_games_and_scores`) via `mcp__supabase__apply_migration`: creates `games` and `scores` tables with the RLS policies and column definitions above, and seeds the single `asteroids` row into `games`. Verify via `list_tables`/`list_migrations` that both tables exist, RLS is on, and `games` has exactly 1 row. System is otherwise unchanged — no app code reads these tables yet.

2. **Query helpers** — Create `lib/games.ts` (`listGames`, `getGame`) and `lib/scores.ts` (`listScores`, `insertScore`), wrapping Supabase queries against the new tables using the existing `lib/supabase/server.ts` / `lib/supabase/client.ts` factories from spec 04. Not yet imported anywhere; verify via `npm run build`.

3. **Library route (`/`)** — Convert `app/page.tsx` into a Server Component calling `listGames()`, passing the result into a new client component that owns the existing search/filter-chip interactivity (extracted from today's `app/page.tsx` logic). Confirm `/` now renders only the "ASTEROIDS" card.

4. **Game Detail route (`/juegos/[id]`)** — Convert `app/juegos/[id]/page.tsx` into a Server Component calling `getGame(id)` (404 via `notFound()` if not found) instead of looking up `GAMES`. Its leaderboard section calls `listScores("asteroids")` instead of `seededScores(...)` when rendering the asteroids page. Confirm `/juegos/asteroids` still renders correctly (now backed by real, currently-empty, scores) and any other id (e.g. `/juegos/rocas`) now 404s.

5. **Hall of Fame route (`/salon-de-la-fama`)** — Convert tab generation to be driven by `listGames()` (so only an "asteroids" tab exists) and its podium/table to `listScores("asteroids")` instead of `seededScores`. Confirm the page renders with one tab, an empty podium/table state (no scores saved yet), and the "your score" row logic still matches on `name` against the logged-in session.

6. **Wire asteroids score saving** — Modify `GamePlayer`'s save-score modal so that for `game.id === "asteroids"` it calls `insertScore("asteroids", name, score)` (client-side) instead of `useAuth().saveScore()`. All other game ids keep calling `useAuth().saveScore()` into `av_scores` unchanged (dead code path in practice now, since only `asteroids` is reachable via routing, but left untouched per Scope).

7. **Cross-check pass** — Full manual walkthrough: `/` shows only Asteroids → `/juegos/asteroids` shows real (empty) leaderboard → play a run → save a score → confirm it appears instantly on `/juegos/asteroids`'s leaderboard and on `/salon-de-la-fama` → save a second, higher score from a different name and confirm ranking/podium updates correctly → confirm no console errors and `npm run build` passes.

## Acceptance Criteria

- [ ] Supabase project has a `games` table (RLS enabled, public `SELECT` policy) containing exactly 1 row (`asteroids`), verifiable via `list_tables`/`execute_sql`.
- [ ] Supabase project has a `scores` table (RLS enabled, public `SELECT` and public `INSERT` policies, no `UPDATE`/`DELETE` policies), verifiable via `list_tables`.
- [ ] `/` renders only the "ASTEROIDS" card (no other 8 games appear), sourced from `listGames()` — the static `GAMES` array is no longer imported by this page.
- [ ] Search input and category chips on `/` still work over the (now single-item) list with no behavior change to the filtering logic itself.
- [ ] `/juegos/asteroids` renders the Game Detail page sourced from `getGame("asteroids")`; any other id (e.g. `/juegos/rocas`) returns a 404.
- [ ] `/juegos/asteroids`'s leaderboard section shows real rows from the `scores` table (empty state before any score is saved).
- [ ] `/salon-de-la-fama` shows only an "asteroids" tab (sourced from `listGames()`), with podium/table built from real `scores` rows for `game_id = "asteroids"`.
- [ ] Playing `/juegos/asteroids/jugar` to game-over and saving a score inserts a new row into the Supabase `scores` table (`game_id: "asteroids"`, correct `name`/`score`), verifiable via `execute_sql`.
- [ ] A newly saved asteroids score appears immediately (on next navigation/reload) on both `/juegos/asteroids`'s leaderboard and `/salon-de-la-fama`'s asteroids tab, correctly ranked by score descending.
- [ ] The "your score" highlighted row on `/salon-de-la-fama` still appears correctly when logged in via the existing fake `AuthProvider` session, matching on `name`.
- [ ] The other 8 catalog games (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`) no longer appear anywhere in the UI (confirmed intentional per Scope).
- [ ] No console errors/warnings during the full flow (browse → detail → play → save score → hall of fame).
- [ ] `npm run build` completes with no TypeScript or lint errors.

## Decisions Taken and Discarded

- **`games` table seeded with only `asteroids`, not all 9 catalog entries.** Seeding all 9 was considered (and initially drafted) to avoid a visible regression on Library/Detail/Hall of Fame. Reversed per explicit user direction: the `games` table should only contain the one real game for now; the other 8 disappearing from the site is an accepted, temporary consequence, deferred to a future spec that migrates them for real.
- **Slug (`text`) as the `games` primary key, not a `uuid`.** A `uuid` PK with a separate `slug` column is more conventional Postgres, but would require translating slug↔uuid at every route boundary (`/juegos/[id]`, `GamePlayer`, `scores.game_id`). Using the existing slug string directly as the PK keeps all current route/prop code (`id: string`) unchanged.
- **`scores` scoped to `asteroids` only, not all 9 games.** A fully generic scores table usable by every game was considered, but with only 1 real game, wiring the other 8's fake-simulation save flow to real Supabase inserts would be speculative work with no real gameplay behind it. Their save-score modal keeps writing to `av_scores` untouched (effectively unreachable now that routing only exposes asteroids, but left as-is per Scope).
- **No real Supabase Auth in this spec.** Consistent with spec 04's decision to defer real auth. `scores.name` stays a free-text string with no `user_id` FK; RLS is public-read/public-insert rather than per-user, matching today's trust level where anyone can already fabricate a `localStorage` score.
- **Server Components + a client-side filter component for Library, over full server-side query-param filtering.** Server-side re-querying on every keystroke/chip click would change today's instant, no-navigation filtering UX. Fetching once server-side and filtering client-side in memory (over what is now a 1-item list, but generalizes correctly once more games are seeded later) preserves the existing UX exactly.
- **Migration applied via `mcp__supabase__apply_migration`, not a manual SQL file.** Keeps the schema change tracked and inspectable (`list_migrations`), consistent with the Supabase-native tooling already set up in spec 04, rather than an untracked one-off script.
- **`app/data/games.ts`'s static `GAMES` array is kept in the repo, just unused by these 3 pages.** Deleting it now would make the future "migrate remaining 8 games" spec harder (no reference data to port from); keeping it as inert reference data costs nothing and documents the pre-migration shape.
- **No automated tests.** Consistent with prior specs — acceptance is verified manually against the checklist above.

## Identified Risks

- **Visible regression: 8 of 9 games disappear from the site.** This is an accepted, intentional consequence of scoping the `games` table to `asteroids` only (per Decisions), but it's a real, user-facing change in behavior compared to every prior spec. Mitigation: none needed functionally, but worth flagging to anyone reviewing the diff who isn't aware this was a deliberate scope choice — not a bug.
- **Public `INSERT` policy on `scores` allows unbounded, unauthenticated score submission** (any score value, any name, no rate limit). Mitigation: accepted per Scope as matching today's trust level (localStorage scores are equally fakeable); revisit if real auth/anti-cheat is ever prioritized in a future spec.
- **Server Component data fetching + Next.js 16 caching behavior may differ from Next 13/14 assumptions** (e.g. default fetch/query caching could serve a stale `scores` list right after a save, showing an outdated leaderboard until revalidation). Mitigation: check `node_modules/next/dist/docs/01-app/` for Next.js 16's current data-fetching/revalidation conventions before implementing steps 3–5, and explicitly force a fresh read (e.g. `revalidatePath`/no-store as appropriate) after `insertScore` so the just-saved score shows up immediately, per the acceptance criteria.
- **Splitting Library's search/filter logic out of `app/page.tsx` into a new client component** touches working code from spec 01/02 with no functional change intended. Mitigation: extract mechanically (props in, same state/handlers), and manually re-verify the search input and every category chip against spec 02's acceptance criteria during step 3.
