# 01 - DUELO DE RANAS: dueling AI race integration

- **Status:** Draft
- **Dependencies:** 05-asteroids-integration (engine/canvas contract), 06-games-and-scores-supabase (games/scores schema)
- **Date:** 2026-08-02
- **Objective:** Add a real, playable original game to Arcade Vault — a split-screen frog-crossing race where the player hops across traffic and river lanes against an AI-controlled rival frog racing the same hazard pattern, wired into the catalog, Supabase, and the existing `GAME_ENGINES` registry.

## Scope

### In scope

- Original engine (`components/games/duelo-de-ranas/engine.ts`), designed from scratch (no template exists for this mechanic) against the platform's engine contract.
- Single 800×600 canvas split into two equal 400×600 vertical columns: left half is the player's lane track, right half is the AI rival's lane track, both rendered simultaneously.
- Discrete grid movement: each column is a 10-cell-wide × 15-cell-tall grid (`CELL = 40`px). The player's frog and the AI's frog each occupy one cell at a time and hop exactly one cell per input/AI decision — no continuous movement.
- Row layout per round (shared, identical hazard definition instantiated independently in both columns for a fair but non-overlapping race): a bottom safe starting row (row 14), a band of road lanes with cars moving left/right at varying speeds, a median safe row, a band of river lanes with floating logs (riding a log carries the frog sideways with it; landing on open water without a log drowns the frog), and a top goal row (row 0) with lily pads.
- AI opponent: a simple reactive controller that hops up one row when the corresponding cell ahead in its own column is clear, otherwise waits or side-steps; it has a random per-decision hesitation/error chance so it is beatable but not trivial, tuned independently of the player's input.
- Round/life loop: both frogs start each round at the bottom row. The first frog to reach the goal row resolves the round (round winner flag, resolved once per round). Reaching goal first as the player awards a flat round-bonus to score; the AI reaching first ends the round with no bonus. Either outcome triggers a new, harder round (faster/denser hazards) and resets both frogs to their starting row. This is the natural `level` progression (round number = speed tier).
- Forward-progress scoring: the player's score increases by a fixed amount the first time (per life, per round) they reach a row strictly closer to the goal than their prior best in that life — moving back down and re-advancing over already-scored rows does not re-score, preventing score-farming by oscillating.
- Real `lives`: player starts with 3. Colliding with a car, or being caught in open water without a log when the tick resolves, costs one life and resets the player (not the AI) to the round's starting row, preserving score and round progress otherwise. Losing the 3rd life transitions `state` to `"gameover"`.
- Canvas-drawn HUD (score, lives, current round/level, a compact "TÚ" / "IA" label pair) inside the engine's `draw()`, in addition to `GamePlayer`'s existing React overlay.
- Keyboard controls: arrow keys (Up/Down/Left/Right) and WASD, scoped to the canvas element only, one discrete hop per keydown (not held-key continuous movement).
- Full reset on `restartSignal`: both frogs to starting row, score to 0, lives to 3, level/round to 1, hazard definitions regenerated at base speed.
- New catalog entry `duelo-de-ranas` (Supabase `games` row + `app/data/games.ts` entry), distinct from the existing fake `ranaria` entry (a different, single-lane, non-competitive Frogger placeholder) and the existing fake `duelo-pixel` entry (a different, Pong-style placeholder) — neither touched.
- New `.cover-duelo-ranas` CSS block, cloned from `.cover-duelo` (the closest thematic sibling: it already draws a dashed center divider splitting two competitors) and recolored/re-detailed with `.cover-rana`'s lane-stripe motif, per `/frontend-design` governance.
- One `GAME_ENGINES` registry entry (`"duelo-de-ranas": DueloDeRanasCanvas`) — registry and dispatcher already exist, no refactor needed.

### Not in scope

- Bonus insects/collectibles, round timers, or any hazard beyond cars/logs/water (all deferred to `02-duelo-de-ranas-bonus-insects.md`).
- Sound effects, mouse control, difficulty selector menus, or a true human-vs-human local mode (the platform has no multiplayer layer; this ships as single-player-vs-AI only, satisfying the design constraint for a `VERSUS` entry).
- Any change to `ranaria` or `duelo-pixel`'s catalog rows — both are left as-is, same duplication precedent as `rocas`/`asteroids` and `serpentina`/`snake`.
- Any registry/dispatcher refactor or `jugar/page.tsx` data-source switch — both already landed in spec 07, confirmed at startup.
- Wraparound movement or off-grid horizontal movement past the column's own 10-cell width (frog hopping left/right is clamped to its own column's bounds, it cannot cross into the rival's half).
- Gators, submerging turtles, trains, or any hazard variety beyond straightforward cars and logs (deferred, see follow-up).

## Data Model

### Supabase `games` row

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays)
values ('duelo-de-ranas', 'DUELO DE RANAS', 'Cruza los carriles antes que tu rana rival, sin acabar aplastado.',
        'Dos ranas de neón se lanzan a cruzar la misma autopista y el mismo río al mismo tiempo: la tuya a la izquierda, la de una IA rival a la derecha. Esquiva coches, cabalga troncos a la deriva y llega a los nenúfares antes que tu contrincante para ganar la ronda. Cada ronda ganada — por cualquiera de los dos — acelera el tráfico y la corriente. Tres vidas, ni una rana más.',
        'VERSUS', 'cover-duelo-ranas', 'magenta', 0, '0');
```

(Migration name: `seed_game_duelo_de_ranas`. `best`/`plays` seeded at 0/"0" — fresh entry, no fabricated leaderboard history, per Snake's precedent.)

### `app/data/games.ts` entry

Same fields as above, added as a new object in the `GAMES` array (`id: "duelo-de-ranas"`), leaving the existing `ranaria` and `duelo-pixel` objects untouched.

### Engine snapshot (`components/games/duelo-de-ranas/engine.ts`)

Standard shape, **no sentinel needed** — unlike Snake, this game has a natural `lives` (3, real) and a natural `level` (round number), documented here for contrast with the sentinel cases in `reference.md` §1:

```ts
export type DueloState = "playing" | "gameover";

export interface DueloSnapshot {
  score: number; // += ROW_ADVANCE_POINTS per new best row reached this life; += ROUND_WIN_BONUS if player beats AI to the goal
  lives: number; // real lives, starts at 3, decremented on car/drowning collision
  level: number; // round number, +1 every time a round resolves (player or AI reaches goal first)
  state: DueloState;
}

export class DueloDeRanasEngine {
  constructor(ctx: CanvasRenderingContext2D, width: number, height: number);
  update(dt: number): void; // dt in seconds, capped at 0.05
  draw(): void; // two-column grid, cars, logs/water, both frogs, canvas-drawn HUD
  handleKeyDown(code: string): void; // ArrowUp/Down/Left/Right + KeyW/A/S/D, one discrete hop per press
  handleKeyUp(code: string): void;
  reset(): void;
  getSnapshot(): DueloSnapshot;
}
```

Internal state (instance fields, not module globals): `playerCol`/`playerRow`, `aiCol`/`aiRow`, `playerBestRowThisLife` (for forward-progress scoring), `roundNumber` (drives `level`), `lanes: LaneDef[]` (per-row `{ type: "safe" | "road" | "river"; direction: 1 | -1; speed: number; obstacles: Obstacle[] }`, regenerated harder each round), a **second, independently-instantiated** `aiLanes: LaneDef[]` built from the same per-round definition (same type/speed/direction per row index) so the two columns present an identical-difficulty but not literally overlapping simulation, `aiDecisionTimer`/`aiHesitationChance` (tunable per round), `hopCooldown` (debounces discrete hops so a held key doesn't fire multiple hops per press — paired with `handleKeyUp` clearing per-key "already hopped" flags), `roundResolved` boolean (guards the round-win check firing more than once per round).

### Canvas component (`components/games/duelo-de-ranas/duelo-de-ranas-canvas.tsx`)

```ts
export interface DueloDeRanasCanvasProps {
  paused: boolean;
  onSnapshot: (snapshot: DueloSnapshot) => void;
  onGameOver: (finalScore: number) => void;
  restartSignal: number;
}
```

Structurally identical to `asteroids-canvas.tsx` per `reference.md` §2 — only `WIDTH=800`/`HEIGHT=600`, the key set (`ArrowUp/Down/Left/Right`, `KeyW/A/S/D`), and the engine class differ. Discrete-hop input still goes through the same `handleKeyDown`/`handleKeyUp` shape — the "one hop per press, not per frame" debounce lives inside the engine, not the canvas wrapper.

## Implementation Plan

Both one-time platform steps (registry/dispatcher, `jugar/page.tsx` data source) are already done by a prior add-game run — this plan starts straight at catalog/engine work.

1. **Cover art:** author `.cover-duelo-ranas` in `app/globals.css`, cloned from `.cover-duelo`'s split dashed-divider structure and recolored using `.cover-rana`'s repeating lane-stripe pattern, swapping `.cover-duelo`'s cyan/magenta paddle dots for a green frog dot (left, player) and a magenta frog dot (right, AI) via `radial-gradient`/`::after`+`::before` layering — no images. Per `CLAUDE.md`, this step is governed by `/frontend-design`.
2. **Catalog metadata:** add the `duelo-de-ranas` entry to `GAMES` in `app/data/games.ts` per the Data Model above.
3. **Supabase row:** `mcp__supabase__apply_migration` named `seed_game_duelo_de_ranas` — single insert per Data Model above (tables already exist, no schema change).
4. **`components/games/duelo-de-ranas/engine.ts`:** author `DueloDeRanasEngine` from scratch — dual-column grid state, per-round lane generation (road/river/safe rows, speed scaling with round number), player discrete-hop movement with log-riding physics, AI reactive controller with hesitation/error chance, round-win resolution (`roundResolved` guard), forward-progress scoring, lives/collision handling, canvas-drawn HUD.
5. **`components/games/duelo-de-ranas/duelo-de-ranas-canvas.tsx`:** copy `asteroids-canvas.tsx`'s structure verbatim, changing only `WIDTH`/`HEIGHT` (both stay 800×600 here, but still explicit), the key set, and the engine class — refs for `paused`/`onSnapshot`/`onGameOver`, empty-deps RAF effect, edge-triggered game-over, scoped keyboard handling with `preventDefault` limited to the arrow/WASD key set.
6. **Register `duelo-de-ranas` in `GAME_ENGINES`** (`components/games/registry.ts`) — one new map entry, no changes to `game-player.tsx`'s branching (it already reads the registry generically).
7. **Cross-check pass:** full manual play-through (hopping, car collision death, drowning death, log-riding, round win by beating the AI, round loss when the AI wins, life loss and round-position reset, level/round increment, forward-progress scoring not farmable by oscillating, pause/resume, restart, save-score modal); `execute_sql` check confirming the inserted `duelo-de-ranas` `games` row and a saved `scores` row after a real playthrough; `npm run build` clean; confirm `ranaria`, `duelo-pixel`, and all other games remain unregressed.

## Acceptance Criteria

- [ ] `DUELO DE RANAS` card appears on `/juegos` with `VERSUS` category, `magenta` color, and the new `.cover-duelo-ranas` art — distinct from the existing `RANARIA` and `DUELO PIXEL` cards (all three visible, no collision).
- [ ] `/juegos/duelo-de-ranas` detail page renders via `getGame("duelo-de-ranas")`, including its (initially empty) leaderboard.
- [ ] `/juegos/duelo-de-ranas/jugar` resolves the same game via `getGame(id)` and renders `GamePlayer` with the real `DueloDeRanasCanvas`.
- [ ] Real gameplay: the player's frog (left column) hops one grid cell per keypress; cars in road lanes move at their lane's speed/direction and killing the frog on contact costs one life; river lanes without a log under the frog at tick-resolution also cost one life; riding a log carries the frog sideways with the log's drift.
- [ ] The AI's frog (right column) visibly attempts its own crossing on an independently-instantiated but identically-difficult lane set, with occasional hesitation/errors — it is not simply teleporting to the goal or perfectly optimal.
- [ ] Reaching the goal row first as the player awards the round-win bonus to `score`; the AI reaching first ends the round with no bonus; either resolves the round exactly once (no double-scoring), starts a new harder round, and increments `level`.
- [ ] Score increases only for genuinely new forward progress (reaching a row closer to the goal than any previously reached this life) — retreating and re-advancing over already-visited rows does not add score again.
- [ ] `lives` starts at 3, decrements exactly once per car/drowning collision, and reaching 0 lives transitions `state` to `"gameover"`.
- [ ] Keyboard (arrow keys and WASD) only affects the game when the canvas is focused, never scrolls the page, and each keypress produces exactly one hop (no continuous movement while a key is held).
- [ ] PAUSA freezes both the player's and the AI's simulation (car/log movement, AI decision timer) identically; REANUDAR resumes from the exact same state.
- [ ] Reaching `gameover` opens the save-score modal with the real final score.
- [ ] Saving a score inserts a `scores` row for `game_id = "duelo-de-ranas"`, verifiable via `execute_sql`.
- [ ] The new score ranks correctly, sorted descending, on both `/juegos/duelo-de-ranas`'s leaderboard and `/salon-de-la-fama`.
- [ ] JUGAR DE NUEVO fully resets: both frogs to the starting row, score to 0, lives to 3, level/round to 1, lane hazard definitions regenerated at base speed.
- [ ] Canvas scales responsively on narrow viewports without horizontal overflow (`maxWidth: 800px`, `height: auto`), and both columns remain legibly split at smaller widths.
- [ ] Other games (Asteroids, Tetris, Arkanoid, Snake, and the fake `ranaria`/`duelo-pixel` entries) are unregressed — no shared state, no broken registry lookups.
- [ ] No console errors during a full playthrough (movement, round win/loss, collision, death, restart, save).
- [ ] `npm run build` completes clean.

## Decisions Taken and Discarded

- **Concept scoring (candidates considered):**
  - _Endless auto-scrolling ascent_ (camera perpetually scrolls up, single column, score = lanes crossed forever): Portabilidad 5, Puntuación 5, Balance de catálogo 3 (ARCADE is already the most crowded category — `bloque-buster`, `serpentina`, `gloton`, `invasores`, `ranaria`, `snake` all sit there), Portada 5 (clone `.cover-rana` directly), Assets 0, Esfuerzo S/M. Lost on catalog balance — a sixth ARCADE-ish entry versus filling the empty `VERSUS` slot.
  - _Reverse Frogger / traffic controller_ (player places hazards to stop AI frogs, tower-defense-style): Portabilidad 4, Puntuación 3 (scoring shape less natural — "frogs stopped" is closer to a kill-count than a lane-crossing score, weaker thematic fit for "cross the street" cast as the player), Balance 3–4, Portada 4, Assets 0, Esfuerzo M. Lost on weak thematic fit (theme explicitly frames the player as the one crossing) and a less natural score shape.
  - _Rising-flood Frogger_ (water level rises from below, forcing constant forward movement, single column): Portabilidad 5, Puntuación 4 (distance-survived score is serviceable but generic, closer to an endless-runner reskin than an original spin), Balance 3 (same ARCADE crowding), Portada 4, Assets 0, Esfuerzo M. Lost to the chosen concept on catalog balance and on being a smaller genuine departure from vanilla Frogger.
  - **Winner — dueling AI race (chosen):** Portabilidad 5, Puntuación 5 (round-bonus + forward-progress score is a real ascending integer with no natural ceiling), **Balance de catálogo 5 — the only real, playable `VERSUS` entry today; `duelo-pixel` is catalog metadata only, no engine**, Portada 5 (`.cover-duelo` is an exact structural sibling — it already draws a two-competitor split with a center divider), Assets 0, Esfuerzo M. Won primarily on catalog balance (fills the one category with zero playable entries) while still keeping every constraint clean.
- **Slug `duelo-de-ranas`, not `ranaria-2` or reusing `ranaria`.** Checked against the full existing id list (including `ranaria` and `duelo-pixel`, both placeholders) — no collision; keeps both existing fake entries untouched, same duplication precedent as `rocas`/`asteroids` and `serpentina`/`snake`.
- **Color `magenta`, not `green`.** Green is already used four times (`serpentina`, `invasores`, `ranaria`, `snake`) — the most repeated color in the catalog. Magenta has only been used once (`caida`), so a second use here keeps color distribution the least skewed, per the "no color repeats beyond a second use" guidance (re-verified at startup, not assumed).
- **No sentinel needed for `lives`/`level`.** Unlike Snake (which had to sentinel `lives: 1` and repurpose `level` as a speed tier), this mechanic has a genuinely natural 3-life system and a genuinely natural round-number `level` — called out explicitly since `reference.md` §1 anticipates sentinels being the norm, and this game is a counter-example worth documenting.
- **Discrete grid-hop movement, not continuous.** Chosen to preserve Frogger's core "one wrong hop kills you" tension rather than turning this into a continuous-dodge arcade game (which would blur it with Asteroids-style movement); the debounce lives inside the engine's `handleKeyDown`/`handleKeyUp`, not the canvas wrapper, per the existing per-game key-set convention.
- **AI runs on its own independently-instantiated lane set (same definition, different object instances), not a literal shared/overlapping simulation.** Keeps the two columns visually and physically independent (no coordinate translation between halves needed at runtime) while still guaranteeing fairness, since both columns are built from the identical per-round `LaneDef` parameters.
- **Forward-progress-only scoring (no farming by oscillating).** A direct classic-Frogger detail (the original only scores a life's furthest row once) — called out explicitly in Identified Risks since it is easy to implement wrong (naively scoring every row reached, including revisits).
- **Round loss (AI wins) does not cost a life or end the run** — only physical collision (car/drowning) costs a life. This keeps the AI race as a scoring/pacing mechanic rather than a punishing one, so losing to the AI stays low-stakes and the run's actual failure condition stays legible (three collisions, not "the AI is simply faster").
- **Scope trims:** no bonus insects/collectibles, no round timer, no extra hazard types (gators, trains, submerging turtles), no sound, no mouse control, no true local two-player mode — kept to the same minimal-first-pass scope as Asteroids/Snake's own `01` specs. The insect/timer layer is deferred to `02-duelo-de-ranas-bonus-insects.md`.

## Identified Risks

- **Forward-progress scoring is easy to implement as a naive per-row-reached counter instead of a per-life best-row tracker.** `playerBestRowThisLife` must only ever move toward the goal (decrease) and must reset only on a life loss or a round restart — not on every hop — or the score becomes farmable by oscillating up and down across the same rows.
- **`roundResolved` must guard exactly one winner per round.** Both the player and the AI reaching the goal row can, in principle, happen on the same tick (e.g. after a paused frame resumes) — the round-resolution check must run once per `update(dt)` call and must not double-fire the bonus or double-increment `level` if both conditions are true in the same tick (resolve deterministically, e.g. player-first-checked, and treat a true simultaneous arrival as a no-bonus round).
- **Log-riding physics under variable `dt`.** A frog on a log must move with the log's drift speed continuously (not per-hop), while the frog's own hop input still needs to feel discrete and grid-aligned — this is a hybrid of continuous physics (the log's `x` position) and discrete grid logic (the frog's occupied cell), and naively snapping the frog's rendered position to a full grid cell every frame will make log-riding look and feel stuttery. The frog's _logical_ cell (for collision/scoring) should stay grid-based while its _rendered_ `x` can lerp continuously with the log.
- **AI hesitation/error chance must be tuned so the AI is beatable at round 1 but still competitive by round 5+, without the tuning constants drifting into "add tests"-style busywork** — implementers should pick a simple, explicit formula (e.g. hesitation chance decreasing linearly with round number, floored) rather than an elaborate difficulty curve, since over-engineering this is explicitly out of scope per the "no padding" rule.
- **Dual independent lane simulations (player + AI) sharing the same per-round `LaneDef` parameters but not the same object instances** is a subtle source of divergent bugs if the round-regeneration step accidentally reseeds only one column's obstacles on a new round — both `lanes` and `aiLanes` must be regenerated from the same round-derived parameters together, every round, including on `reset()`.
- **Pause must freeze the AI's decision timer, not just its position.** If `aiDecisionTimer`/`hopCooldown` keep counting down while `paused` is true (e.g. because the pause check only gates rendering, not the AI's internal clock), the AI will appear to "catch up" instantly the moment the game resumes — `update(dt)` must be a true no-op (not called, or an early return before any timers advance) while paused.
