# 09 - Snake Integration: original engine with random fruit sprites

- **Status:** Implemented
- **Dependencies:** 05-asteroids-integration (engine/canvas contract), 06-games-and-scores-supabase (games/scores schema)
- **Date:** 2026-07-31
- **Objective:** Add a real, playable Snake game to Arcade Vault — an original grid-based engine (no template exists for it) that spawns a random fruit sprite from the provided atlas as the edible each time, wired into the catalog, Supabase, and the existing `GAME_ENGINES` registry.

## Scope

### In scope

- Original Snake engine (`components/games/snake/engine.ts`) designed from scratch against the platform's engine contract — no template to port from.
- Grid-based movement: 800×600 canvas, 20px cells → 40×30 logical grid.
- Random fruit-sprite edibles: on each spawn, pick one of the 21 fruits in the ported atlas at random, drawn via `ctx.drawImage` from a single `fruits.png` spritesheet. All fruits worth equal base points — sprite choice is cosmetic only.
- Wall collision = death (strict classic Snake), same as self-collision.
- Speed progression: tick interval multiplies by 0.95 every 5 fruit eaten, floored at a minimum interval; `level` in the snapshot tracks the current speed tier.
- `lives` in the snapshot fixed at a sentinel value of `1` (documented convention, no real lives in this game).
- Canvas-drawn HUD (score/level) inside the engine's `draw()`, in addition to `GamePlayer`'s existing React overlay.
- Keyboard controls: arrow keys + WASD, scoped to the canvas element only.
- Full reset on `restartSignal`: snake back to initial position/length, score to 0, tick interval to base, new random fruit spawned.
- New catalog entry `snake` (Supabase `games` row + `app/data/games.ts` entry) — distinct from the existing fake `serpentina` entry, which is left untouched.
- Reuse of the existing `.cover-snake` CSS block (already self-contained, currently only referenced by the fake `serpentina` entry) as the cover art for the real `snake` entry.
- Asset relocation: `fruits.png` copied to `public/games/snake/fruits.png`; the coordinate atlas ported as a TS constant inside `engine.ts` (not kept as a loose `sprites.js`).
- One `GAME_ENGINES` registry entry (`snake: SnakeCanvas`) — registry and dispatcher already exist, no refactor needed.

### Not in scope

- Any change to the fake `serpentina` catalog entry (left as-is, duplication accepted, same precedent as `rocas`/`asteroids`).
- Sound effects, power-ups, difficulty selector, or mouse controls.
- Wraparound movement (explicitly rejected in favor of wall-death).
- Fruit point tiers (all fruits score identically; only the sprite varies).
- Any registry/dispatcher refactor or `jugar/page.tsx` data-source switch (already done by a prior add-game run).

## Data Model

### Supabase `games` row

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays)
values ('snake', 'SNAKE', 'Devora frutas y crece sin morder tu propia cola.',
        'Una serpiente pixelada recorre una grilla neón devorando frutas reales del recreativo original — manzana, sandía, piña y más, elegidas al azar en cada aparición. Cada bocado la alarga y acelera su avance. Un giro en falso contra la pared o tu propia cola termina la partida.',
        'ARCADE', 'cover-snake', 'green', 0, '0');
```

(Migration name: `seed_game_snake`. `best`/`plays` seeded at 0 like a fresh entry — no fabricated leaderboard history.)

### `app/data/games.ts` entry

Same fields as above, added as a new object in the `GAMES` array (`id: "snake"`), leaving the existing `serpentina` object untouched.

### Engine snapshot (`components/games/snake/engine.ts`)

Standard shape, no deviation in field names — `lives` and `level` are repurposed per §1 of `reference.md` (documented here, not hidden):

```ts
export type SnakeState = "playing" | "dead" | "gameover";

export interface SnakeSnapshot {
  score: number; // += BASE_POINTS per fruit eaten (fruit sprite is cosmetic only)
  lives: number; // sentinel, always 1 — no real lives in classic Snake
  level: number; // speed tier, +1 every time the tick interval is scaled down
  state: SnakeState;
}

export class SnakeEngine {
  constructor(ctx: CanvasRenderingContext2D, width: number, height: number);
  update(dt: number): void; // dt in seconds, capped at 0.05
  draw(): void; // grid, snake, fruit sprite, canvas-drawn HUD
  handleKeyDown(code: string): void; // ArrowUp/Down/Left/Right + KeyW/A/S/D
  handleKeyUp(code: string): void;
  reset(): void;
  getSnapshot(): SnakeSnapshot;
}
```

Internal state (instance fields, not module globals): `grid` (40×30 logical cells, `CELL = 20`), `snake` (array of `{x, y}` segments), `direction`/`pendingDirection` (to prevent reversing into self on the current tick), `food: {x, y, fruitKey}` (`fruitKey` indexes into the ported `FRUIT_ATLAS`), `tickInterval` (starts at a base value, ×0.95 every 5 fruit, floored), `tickAccumulator`.

### Ported fruit atlas

`sprites.js`'s `window.SPRITE_ATLAS.fruits` (21 entries, `{x, y, w, h}` crops into `fruits.png`) becomes a module-level `const FRUIT_ATLAS: Record<string, {x:number;y:number;w:number;h:number}>` inside `engine.ts`, with an `Image` instance loaded from `/games/snake/fruits.png`.

### Canvas component (`components/games/snake/snake-canvas.tsx`)

```ts
export interface SnakeCanvasProps {
  paused: boolean;
  onSnapshot: (snapshot: SnakeSnapshot) => void;
  onGameOver: (finalScore: number) => void;
  restartSignal: number;
}
```

Structurally identical to `asteroids-canvas.tsx` per `reference.md` §2 — only `WIDTH=800`/`HEIGHT=600`, the key set (`ArrowUp/Down/Left/Right`, `KeyW/A/S/D`), and the engine class differ.

## Implementation Plan

Both one-time platform steps (registry/dispatcher, `jugar/page.tsx` data source) are already done by a prior add-game run — this plan starts straight at catalog/engine work.

1. **Assets:** copy `references/templates/source-assets/snake-assets/fruits.png` to `public/games/snake/fruits.png`. Port the coordinate atlas from `sprites.js` into a `FRUIT_ATLAS` TS constant (do not keep `sprites.js` as a loose runtime file).
2. **Catalog metadata:** add the `snake` entry to `GAMES` in `app/data/games.ts` (values per Data Model above), reusing `cover: "cover-snake"` — no new CSS needed since that block is already self-contained and unrelated to the `serpentina` entry's markup.
3. **Supabase row:** `mcp__supabase__apply_migration` named `seed_game_snake` — single insert per Data Model above (tables already exist, no schema change).
4. **`components/games/snake/engine.ts`:** author `SnakeEngine` from scratch against the engine contract — grid state, movement tick loop (fixed `tickInterval`, not per-frame), fruit spawn/collision, wall/self collision → `gameover`, speed-up every 5 fruit, canvas-drawn HUD in `draw()`.
5. **`components/games/snake/snake-canvas.tsx`:** copy `asteroids-canvas.tsx`'s structure verbatim, changing only `WIDTH`/`HEIGHT`, the key set, and the engine class — refs for `paused`/`onSnapshot`/`onGameOver`, empty-deps RAF effect, edge-triggered game-over, scoped keyboard handling with `preventDefault` limited to the arrow/WASD key set.
6. **Register `snake` in `GAME_ENGINES`** (`components/games/registry.ts`) — one new map entry, no changes to `game-player.tsx`'s branching (it already reads the registry generically).
7. **Cross-check pass:** full manual play-through (movement, growth, wall death, self-collision death, speed-up, pause/resume, restart, save-score modal); `execute_sql` check confirming the inserted `snake` `games` row and a saved `scores` row after a real playthrough; `npm run build` clean; confirm `serpentina` and all other games are unregressed.

## Acceptance Criteria

- [x] `SNAKE` card appears on `/juegos`, distinct from the existing `SERPENTINA` card (both visible, no collision).
- [x] `/juegos/snake` detail page renders via `getGame("snake")`, showing the real Supabase row (title, copy, cover art).
- [x] `/juegos/snake/jugar` resolves the same `snake` game via `getGame(id)` and renders `GamePlayer` with the real `SnakeCanvas`.
- [x] Real gameplay: snake moves on a fixed grid tick, grows by one segment per fruit eaten, a random fruit sprite (of the 21 in the atlas) renders at each new food position.
- [x] Colliding with the wall ends the game; colliding with the snake's own body ends the game; both produce the same `gameover` state.
- [x] Speed increases audibly/visibly every 5 fruit eaten (tick interval shortens), and `level` in the HUD reflects the current speed tier.
- [x] Keyboard (arrow keys and WASD) only affects the game when the canvas is focused, and never scrolls the page (no blanket `preventDefault`).
- [x] PAUSA freezes the tick loop; REANUDAR resumes from the exact same state (snake position, direction, food, score, tick interval).
- [x] Reaching `gameover` (wall/self collision) opens the save-score modal with the real final score.
- [x] Saving a score inserts a `scores` row for `game_id = "snake"`, verifiable via `execute_sql`.
- [x] The new score ranks correctly, sorted descending, on both `/juegos/snake`'s leaderboard and `/salon-de-la-fama`.
- [x] JUGAR DE NUEVO fully resets: snake back to initial position/length, score to 0, tick interval to base, level to 1, a freshly randomized fruit.
- [x] Canvas scales responsively on narrow viewports without horizontal overflow (`maxWidth: 800px`, `height: auto`).
- [x] Other games (Asteroids, Tetris, Arkanoid, and the fake `serpentina` entry) are unregressed — no shared state, no broken registry lookups.
- [x] No console errors during a full playthrough (movement, growth, death, restart, save).
- [x] `npm run build` completes clean.

## Decisions Taken and Discarded

- **No template match → original engine.** `references/templates/started-games/` only has asteroids/tetris/arkanoid; Snake is authored from scratch against the platform's engine contract rather than ported.
- **New `snake` catalog entry, `serpentina` left untouched.** Same precedent as `rocas`→`asteroids`: accepted duplication over repurposing the existing fake entry, so nothing that currently references `serpentina` breaks.
- **Reused `.cover-snake` CSS verbatim.** Confirmed self-contained (pure class selectors, no markup coupling to `serpentina`) — no new cover art needed, satisfying `/frontend-design`'s governance by not requiring new design work at all.
- **800×600 canvas, 40×30 grid (20px cells)** — chosen to match Asteroids/Arkanoid's canvas footprint rather than a smaller/squarer board, for visual consistency across the game library.
- **Wall collision = death, no wraparound** — classic strict Snake behavior, consistent difficulty with self-collision death.
- **All fruits worth equal points, sprite chosen at random purely for visual variety** — avoids extra scoring-tier logic not requested, keeps the atlas's role purely cosmetic.
- **`lives` sentineled at 1, `level` repurposed as speed tier** — per `reference.md` §1's guidance not to change `<Name>Snapshot`'s shape per game; documented here rather than silently reinterpreted.
- **Fixed tick-interval movement loop, not per-frame continuous movement** — matches classic Snake's grid-stepping feel; `update(dt)` accumulates `dt` against `tickInterval` rather than moving every frame.
- **Atlas ported to a TS constant in `engine.ts`, not kept as a loose `sprites.js`** — keeps the engine framework-free and self-contained per the engine contract (no ad-hoc script loading).
- **Scope trims:** no sound, no power-ups, no difficulty selector, no mouse control — kept as minimal as Asteroids/Arkanoid's own scope.

## Identified Risks

- **Fruit atlas coordinates are approximate, not authoritative.** `sprites.js`'s header comment states the crops were "detected by pixel analysis" of a third-party sheet (spriters-resource), not sourced from original game data — some fruit crops may clip or include partial neighboring sprites. Implementation should visually spot-check a handful of fruit types after wiring `drawImage`, not assume every one of the 21 entries is pixel-perfect.
- **Grid-stepped movement inside a per-frame `update(dt)` contract.** Unlike Asteroids' continuous physics, Snake's movement must advance one cell per fixed tick, not per frame — `update(dt)` needs an internal accumulator (`tickAccumulator += dt; while (tickAccumulator >= tickInterval) { step(); tickAccumulator -= tickInterval }`) to stay correct under variable frame rates, including the `dt` cap at 0.05s.
- **Direction-reversal-into-self edge case.** Classic Snake bug: if the player reverses direction within the same tick the snake would double back into its own neck. Must buffer the newest direction (`pendingDirection`) and only apply it at the next tick if it isn't the exact opposite of the current direction.
- **Single large spritesheet load.** `fruits.png` (3790×442px) is loaded once via `new Image()`; `draw()` must not attempt to render fruit before the image's `onload` has fired (first frame(s) may need a guard, e.g. skip drawing the fruit sprite — not the whole engine — until `imageLoaded` is true).
