# Platform contract for game integration specs

This file is the reference the `/add-game` skill consults when authoring a
spec. It is not itself a spec, and it is not code to copy verbatim into one —
it is the shape a game-integration spec must respect, distilled from
`specs/05-asteroids-integration.md` and `specs/06-games-and-scores-supabase.md`,
the only two real implementations in this repo.

---

## 1. Engine contract (`components/games/<slug>/engine.ts`)

Framework-free: no React, no DOM beyond `CanvasRenderingContext2D`. No
`localStorage`/persistence inside the engine — score saving is entirely
`GamePlayer`'s job.

```ts
export type <Name>State = "playing" | "dead" | "gameover"; // adapt states to the game

export interface <Name>Snapshot {
  score: number;
  lives: number;
  level: number;
  state: <Name>State;
}

export class <Name>Engine {
  constructor(ctx: CanvasRenderingContext2D, width: number, height: number);
  update(dt: number): void;
  draw(): void;
  handleKeyDown(code: string): void;
  handleKeyUp(code: string): void;
  reset(): void;
  getSnapshot(): <Name>Snapshot;
}
```

Module-level globals from the vanilla template (`W`, `H`, `keys`, `ctx`,
`lastTime`) become **instance fields**, not statics. Internal helper classes
(e.g. `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp` in the asteroids
port) stay unexported, each with the same `update`/`draw` shape as the
outer engine. Worked example: `components/games/asteroids/engine.ts`.

If a game's snapshot doesn't naturally have `lives` (e.g. a lines-cleared
puzzle game), keep the field and use a sentinel the HUD can special-case
(document the choice in the spec's Decisions section) — don't change the
shape of `<Name>Snapshot` per game, `GamePlayer`'s HUD reads it generically.

---

## 2. Canvas component contract (`components/games/<slug>/<slug>-canvas.tsx`)

```ts
export interface <Name>CanvasProps {
  paused: boolean;                              // driven by GamePlayer's PAUSA button
  onSnapshot: (snapshot: <Name>Snapshot) => void; // fired once per frame
  onGameOver: (finalScore: number) => void;       // fired once, edge-triggered
  restartSignal: number;                          // bump to force engine.reset()
}
```

Non-negotiable structural rules, copied from
`components/games/asteroids/asteroids-canvas.tsx` (copy that file and change
only `WIDTH`/`HEIGHT`/the key set/the engine class — do not redesign the
wrapper per game):

- `paused`, `onSnapshot`, `onGameOver` are read through **refs**, updated in
  a separate `useEffect`, so the `requestAnimationFrame` loop's `useEffect`
  has an **empty dependency array** and mounts exactly once. Without this,
  prop changes on every render would tear down and recreate the canvas/engine.
- `dt` is computed as `Math.min((ts - lastTime) / 1000, 0.05)` — seconds,
  capped at 50ms, `lastTime` starting `null`.
- `restartSignal === 0` is a no-op guard (mount) — only `restartSignal > 0`
  triggers `engine.reset()`, via its own effect keyed on `[restartSignal]`.
- Game-over is **edge-triggered**: a `wasGameOverRef` boolean so
  `onGameOver` fires exactly once per run, not every frame while
  `state === "gameover"`.
- Keyboard is scoped to the **canvas element**, not `window`: `tabIndex={0}`,
  React `onKeyDown`/`onKeyUp` handlers, `e.preventDefault()` only for that
  game's specific key set (a `Set<string>` of `e.code` values) — never a
  blanket preventDefault, or the rest of the site's scrolling breaks.
- Canvas is fixed-resolution via `width`/`height` attributes, scaled
  responsively via inline style: `display: block; width: 100%; maxWidth:
WIDTH; height: auto; margin: 0 auto; outline: none`.
- If the template drives a **second canvas** (e.g. tetris' `next` preview)
  or a **DOM HUD**, that's a per-game decision the spec's Phase 2 questions
  must resolve explicitly — the contract above only guarantees the primary
  gameplay canvas.

---

## 3. Registration is two-place, not one

- **Supabase `games` row** — feeds `/juegos` (library), `/juegos/[id]`
  (detail + leaderboard), `/salon-de-la-fama` (hall of fame tabs), and
  `/juegos/[id]/jugar` (play route, once the registry refactor below has
  landed). This is the source of truth for anything reachable through
  `/juegos/*`.
- **Static `GAMES` array in `app/data/games.ts`** — still feeds the landing
  page rail in `app/page.tsx` (`GAMES.slice(0, 6)`, a `"use client"`
  marketing page that does not read Supabase at all). A new game invisible
  in this array simply won't appear on `/`, which is acceptable but must be
  a stated choice, not an oversight.

A spec that only inserts the Supabase row and skips the `GAMES` array entry
will 404 or omit the game from one of these two surfaces — call out which
surfaces the new game will and won't appear on.

---

## 4. Dispatcher: registry, not another branch

`components/game-player.tsx` currently hardcodes:

```ts
const isAsteroids = game.id === "asteroids";
```

...and branches on it in three places (fake-simulation `useEffect`s, the
canvas render ternary, the save-score modal's `insertScore` vs `saveScore`
fork). **The second real game must not add a second hardcoded branch.**

If `components/games/registry.ts` does not yet exist, the spec's
Implementation Plan step 1 introduces it:

```ts
// components/games/registry.ts
import type { ComponentType } from "react";
import { AsteroidsCanvas } from "@/components/games/asteroids/asteroids-canvas";
import type { AsteroidsSnapshot } from "@/components/games/asteroids/engine";

export interface GameCanvasProps {
  paused: boolean;
  onSnapshot: (snapshot: {
    score: number;
    lives: number;
    level: number;
  }) => void;
  onGameOver: (finalScore: number) => void;
  restartSignal: number;
}

export const GAME_ENGINES: Record<string, ComponentType<GameCanvasProps>> = {
  asteroids: AsteroidsCanvas,
};
```

`game-player.tsx` then reads `const Canvas = GAME_ENGINES[game.id]` and
`const isReal = Boolean(Canvas)` in place of `isAsteroids`, with the render
ternary and the save-score fork switched to `isReal`/`Canvas`. This step
must be a no-regression refactor — asteroids plays identically before and
after — verified before any new game is added.

If the registry already exists (a prior add-game run already added it), the
new spec's plan only adds one entry to `GAME_ENGINES`; it does not touch
`game-player.tsx`'s branching logic again.

---

## 5. `/juegos/[id]/jugar` must read the same source as `/juegos/[id]`

`app/juegos/[id]/page.tsx` resolves via `getGame(id)` (Supabase). Until
fixed, `app/juegos/[id]/jugar/page.tsx` still resolves via
`GAMES.find((g) => g.id === id)` (the static array) — so a game present in
one and not the other silently 404s on exactly one of the two routes.

If the session-context grep shows `jugar/page.tsx` still uses `GAMES.find`,
the spec's plan includes switching it to `getGame(id)` (with `notFound()`
on a miss), matching the detail route:

```ts
const { id } = await params;
const game = await getGame(id);
if (!game) notFound();
return <GamePlayer game={game} />;
```

Once this lands, the Supabase `games` row alone is sufficient to make a
game reachable through every `/juegos/*` route; only the landing rail still
needs the static array entry (see §3).

---

## 6. Data layer — already generic, reuse it

Do not redesign or duplicate these; every function is already
game-id-parameterized:

- `lib/games.ts` — `listGames(): Promise<Game[]>`, `getGame(id): Promise<Game | null>`. Server-side (`lib/supabase/server.ts`).
- `lib/scores.ts` — `listScores(gameId): Promise<ScoreRow[]>`, ordered by `score` desc. Server-side.
- `lib/scores-client.ts` — `insertScore(gameId, name, score): Promise<void>`. Browser-side (`lib/supabase/client.ts`), called from `GamePlayer`'s save-score modal.

`Game` type is defined once in `app/data/games.ts` and re-exported by
`lib/games.ts` — don't redefine it per game.

---

## 7. Schema — already exists, only a data row is new

`games` and `scores` tables, RLS, and policies were created in spec 06 and
must not be recreated. A new game needs exactly one migration:

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays)
values ('<slug>', '<TITLE>', '<short Spanish copy>', '<long Spanish copy>',
        '<ARCADE|PUZZLE|SHOOTER|VERSUS>', 'cover-<slug>', '<cyan|magenta|yellow|green>',
        <best:int>, '<plays, e.g. "1.2K">');
```

Applied via `mcp__supabase__apply_migration` (name it `seed_game_<slug>`) —
by `/spec-impl`, not by this skill. Env vars for client config:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (note:
publishable key, not the conventional anon key name).

---

## 8. Cover art CSS pattern

`app/globals.css`, cover block starts around line 413
(`/* ===== Cover art generators (pure CSS) ===== */`). Pattern: a shared
positioned `.cover-bg` base, then per-game `.cover-<slug>` sets a gradient
`background`, and layers pixel-art via `::after` (`radial-gradient`/
`linear-gradient` stacks) plus an optional `::before` glyph, using the CSS
vars `--cyan`/`--magenta`/`--yellow`/`--green`/`--ink`. The established move
is to **clone the closest thematic sibling and recolor** — `cover-asteroids`
is a recolored `cover-rocas`. The spec's plan should name which existing
`.cover-*` block the new one is cloned from.

Per `CLAUDE.md`: always use `/frontend-design` when designing new UI —
cover art and any HUD/chrome layout changes count.

---

## 9. Known template hazards (from `references/templates/started-games/`)

The three template folders (`02-asteroids`, `03-tetris`, `04-arkanoid`)
diverge on every axis below. Treat each as a per-game finding to extract
from the code, never assumed from the README:

| Axis            | asteroids                | tetris                                             | arkanoid                                                                  |
| --------------- | ------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------- |
| Canvas size     | 800×600                  | 300×600 (+120×120 preview)                         | 800×600                                                                   |
| Canvas count    | 1                        | 2                                                  | 1                                                                         |
| JS files        | 1                        | 1                                                  | 3 (`game.js`, `levels.js`, `assets/spritesheet.js`, load-order dependent) |
| HUD             | canvas-drawn             | DOM (`textContent`)                                | canvas-drawn inline in `draw()`                                           |
| Game-over UI    | canvas overlay           | DOM `#overlay` + button                            | canvas overlay                                                            |
| Restart         | Space key → `initGame()` | button click → `init()`                            | **none — page reload required**                                           |
| dt units        | seconds, capped 0.05     | milliseconds, uncapped, accumulator                | seconds, uncapped                                                         |
| Key event       | `e.code`                 | `e.code`                                           | `e.key` (+ mouse `mousemove`/`click`)                                     |
| Extra DOM deps  | none                     | 8+ non-canvas elements, `getComputedStyle`         | none                                                                      |
| Assets          | vector only              | vector only                                        | PNG spritesheet + 2 mp3s, async `loadSpritesheet(cb)` gate                |
| Loop continuity | RAF forever              | self-terminating (`return`/`cancelAnimationFrame`) | RAF forever, `update` skipped when paused                                 |

**Doc-vs-code drift — trust the code, not the README, for anything
load-bearing:**

- Asteroids' README scoring table orders large/medium/small opposite to the
  actual `POINTS` array.
- Tetris' README says 7 piece types; the code (`PIECES`) has 8 (includes an
  extra "N/tuerca" piece).
- Arkanoid's README/CLAUDE.md call a level field `ballSpeedMultiplier`;
  `levels.js` actually names it `speed`.

**Global-name collisions:** every template declares `canvas`, `ctx`, `keys`,
`score`, `lives`, `level`, `lastTime`, `loop`, `update`, `draw` as top-level
`const`/`let`/`function`. Irrelevant once ported into a module-scoped class,
but a hazard if code is ever copied in bulk rather than ported field-by-field
into instance state.

**Binary assets** (arkanoid's spritesheet/mp3s): if a spec needs them, they
land under `public/games/<slug>/...`, and the JS string literals that
reference relative paths (`'assets/sounds/...'`) must be grepped and
rewritten — path fixes in `index.html` alone are insufficient.

---

## 10. Formatting

A `PostToolUse` hook (`.claude/hooks/format-file.mjs`) runs prettier on every
Write/Edit during implementation. Neither this skill nor a generated spec
should instruct anyone to manually format files.
