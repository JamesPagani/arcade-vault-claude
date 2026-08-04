# Frogger Core Integration: original grid-hop engine on the platform contract

- **Status:** Approved
- **Dependencies:** 05-asteroids-integration (engine/canvas contract), 06-games-and-scores-supabase (games/scores schema), 10-mobile-touch-controls (touch-control contract)
- **Date:** 2026-08-04
- **Objective:** Add Frogger to Arcade Vault as a real playable game — an original 13×16 grid-hop engine (road traffic, river of logs and submerging turtles, five goal bays, round timer) wired into the catalog, Supabase, `GAME_ENGINES` and `GAME_TOUCH_CONTROLS`, with `GamePlayer` handling HUD, pause, restart and score saving unchanged.

## Scope

### In scope

- Original engine `components/games/frogger/engine.ts`, authored from scratch against the platform engine contract — no template exists for Frogger in `references/templates/started-games/`.
- Canvas `components/games/frogger/frogger-canvas.tsx`, structurally a copy of `snake-canvas.tsx` (refs-for-props, empty-deps RAF effect, edge-triggered game over, canvas-scoped keyboard, `forwardRef` + `useImperativeHandle` exposing `GameControlsHandle`), changing only `WIDTH`/`HEIGHT`, the key set and the engine class.
- Portrait geometry: 520 × 640 canvas, `CELL = 40` → 13 columns × 16 rows. Letterboxed inside the fixed `4/3` `.crt-screen`, exactly as Tetris's 300×600 already is.
- Fixed row layout (row 0 = top):

  | Rows | Zone                                                                          |
  | ---- | ----------------------------------------------------------------------------- |
  | 0    | Canvas HUD strip — `PUNTAJE`, `NIVEL`                                         |
  | 1    | Goal row — five single-cell bays at columns 0, 3, 6, 9, 12; hedge on the rest |
  | 2–7  | River — 6 lanes (logs and turtle groups)                                      |
  | 8    | Safe median                                                                   |
  | 9–13 | Road — 5 lanes (cars and trucks)                                              |
  | 14   | Start row (safe), frog spawns at column 6                                     |
  | 15   | Canvas bottom bar — countdown timer bar + life icons                          |

- Discrete frog movement: one cell per key press in four directions, with a 120 ms hop animation during which further input is buffered as at most one pending direction. The frog cannot leave columns 0–12, cannot enter row 0 or row 15, and cannot descend below row 14.
- Road lanes: cars (1 cell) and trucks (2–3 cells) per lane, alternating direction, looping horizontally — an entity leaving one edge re-enters from the opposite one. Any overlap with the frog is a death.
- River lanes: logs (2–4 cells) and turtle groups (2–3 cells). The frog survives a river lane only while standing on a log or on a _surfaced_ turtle group; otherwise it drowns. While supported, the frog drifts with its support at that lane's speed and direction; being carried past either lateral edge is a death.
- Turtle submersion: each group cycles 3 s surfaced → 1.5 s submerged, with a per-group phase offset so groups do not blink in unison. A submerged group offers no support — the frog standing on one drowns.
- Goal bays: reaching a free bay scores and marks it filled. Landing on a hedge cell of row 1, or on an already-filled bay, is a death. Filling all five bays completes the round.
- Round timer drawn as a bar on row 15, shifting green → yellow → red as it drains. Base 15 s, reduced 1 s per level, floored at 8 s. Reaching zero is a death.
- Three real lives. `lives` in the snapshot is the true remaining count (no sentinel), so `GamePlayer`'s `♥` HUD block works as-is.
- Scoring: +10 per row advanced beyond the round's previous furthest row (each row pays once per round), +50 per bay filled, + `ceil(remaining_seconds) × 10` time bonus on filling a bay, +200 on completing a round.
- Level progression: completing a round increments `level`, rebuilds all lanes with speeds scaled ×1.15 compounding, resets the timer to the new (shorter) duration, and empties the bays.
- Death beat: on any death the engine enters a `dying` state for ~700 ms — the frog is drawn as a flattened splat (road) or a bubble marker (water), lanes keep moving, input is ignored. Then a life is deducted and the frog respawns at row 14 / column 6 with a fresh timer. At zero lives the state becomes `gameover` instead.
- Everything drawn with canvas primitives (rects, arcs, composite paths) — no image assets, nothing added under `public/games/`.
- Canvas-drawn HUD (rows 0 and 15) in addition to `GamePlayer`'s React HUD, per the established double-HUD pattern.
- Keyboard: arrow keys + WASD, scoped to the canvas element, `preventDefault` limited to that key set.
- New catalog entry `frogger` — a Supabase `games` row (migration `seed_game_frogger`) plus an entry in the `GAMES` array in `app/data/games.ts` so it appears on the landing rail.
- Reuse of the existing `.cover-rana` CSS block as the cover art. No new CSS.
- One `GAME_ENGINES` entry (`frogger: FroggerCanvas`) and one `GAME_TOUCH_CONTROLS` entry (four `tap`-mode direction buttons, `a`/`b` disabled).

### Not in scope

- Any change to `components/game-player.tsx`, `components/games/touch-controls.tsx`, `app/juegos/**`, `lib/**`, or the `games`/`scores` schema — the registry, the data layer and the touch-control host are all already generic.
- Any new field in the snapshot or in `GameCanvasProps`. The round timer is canvas-only precisely so the generic HUD contract stays untouched.
- Skins. The engine hardcodes its draw literals and `FroggerCanvasProps` omits `skin` entirely, exactly as `tetris-canvas.tsx` does. Adding `components/games/frogger/skins.ts` and `setSkin()` is the `skin-designer frogger` pass, run separately after this spec ships.
- `.crt-screen` aspect-ratio work for the portrait canvas. Letterboxing is accepted here; fitting the play screen is `mobile-porter frogger`'s job.
- The placeholder `ranaria` entry in `GAMES` — left completely untouched, same accepted duplication as `rocas`/`asteroids` and `serpentina`/`snake`.
- Crocodiles disguised as logs, the bonus fly in a goal bay, otters/snakes on the median, and particle death animations.
- Sound effects, difficulty selector, mouse controls, diagonal movement.
- Supabase Auth / RLS tightening, realtime leaderboards.

## Data Model

### Supabase `games` row (migration `seed_game_frogger`)

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays)
values ('frogger', 'FROGGER', 'Cruza la carretera y el río sin convertirte en papilla.',
        'Guía a tu rana por una autopista repleta de coches y camiones, y después por un río de troncos a la deriva y tortugas que se sumergen sin avisar. Llena las cinco bocas del otro lado para completar la ronda: cada nivel acelera el tráfico y acorta el reloj. Tres vidas, mucho asfalto y muy poca agua firme.',
        'ARCADE', 'cover-rana', 'green', 0, '0');
```

`cat` is one of the four legal `GameCategory` values; `color` is one of the four legal values (`green`, not `lime`). `best`/`plays` seeded at `0`/`'0'` like Snake — no fabricated history. Tables already exist; this is a data row, not a schema change.

### `app/data/games.ts` entry

The same nine fields as a new object in the `GAMES` array (`id: "frogger"`), leaving `ranaria` untouched.

### Engine (`components/games/frogger/engine.ts`)

```ts
export type FroggerState = "playing" | "dying" | "gameover";

export interface FroggerSnapshot {
  score: number; // rows advanced, bays filled, time bonus, round bonus
  lives: number; // real count, 3 → 0
  level: number; // round number, starts at 1
  state: FroggerState;
}

export class FroggerEngine {
  constructor(ctx: CanvasRenderingContext2D, width: number, height: number);
  update(dt: number): void; // dt in seconds, capped at 0.05 by the wrapper
  draw(): void; // zones, lanes, entities, frog, bays, HUD row 0 + timer/lives row 15
  handleKeyDown(code: string): void; // Arrow* + KeyW/A/S/D
  handleKeyUp(code: string): void; // no press-and-hold behaviour; empty
  reset(): void;
  getSnapshot(): FroggerSnapshot;
}
```

Module-level constants (unexported):

```ts
const CELL = 40;
const COLS = 13;
const ROWS = 16;
const ROW_HUD = 0;
const ROW_GOALS = 1;
const ROW_RIVER_TOP = 2;
const ROW_RIVER_BOTTOM = 7;
const ROW_MEDIAN = 8;
const ROW_ROAD_TOP = 9;
const ROW_ROAD_BOTTOM = 13;
const ROW_START = 14;
const ROW_BOTTOM_BAR = 15;
const GOAL_COLS = [0, 3, 6, 9, 12];
const START_COL = 6;
const HOP_MS = 120;
const DEATH_MS = 700;
const BASE_ROUND_TIME = 15;
const MIN_ROUND_TIME = 8;
const SPEED_PER_LEVEL = 1.15;
const TURTLE_SURFACE_S = 3;
const TURTLE_SUBMERGED_S = 1.5;
const POINTS_ROW = 10;
const POINTS_BAY = 50;
const POINTS_TIME_PER_SECOND = 10;
const POINTS_ROUND = 200;
const KEY_TO_DIRECTION: Record<string, Direction>; // arrows + WASD
```

Internal types (unexported):

```ts
type Direction = "up" | "down" | "left" | "right";
type EntityKind = "car" | "truck" | "log" | "turtle";

interface Entity {
  col: number; // fractional, in cells
  width: number; // in cells
  kind: EntityKind;
  cyclePhase: number; // turtles only: seconds offset into the submersion cycle
}

interface Lane {
  row: number;
  speed: number; // cells per second, always positive
  dir: 1 | -1;
  entities: Entity[];
}

interface Frog {
  col: number; // fractional while hopping or drifting on the river
  row: number;
  hopFrom: { col: number; row: number } | null;
  hopT: number; // ms elapsed into the current hop
}
```

Instance fields (never module globals): `ctx`, `width`, `height`, `lanes`, `frog`, `pendingDirection`, `bays: boolean[]` (length 5), `furthestRow`, `timeLeft`, `roundTime`, `score`, `lives`, `level`, `state`, `deathT`, `deathKind: "road" | "water" | null`.

Private helpers: `buildLanes(level)`, `startHop(dir)`, `finishHop()`, `resolveCell()`, `roadCollision()`, `riverSupport()` (returns the supporting `Entity` or `null`; a turtle group whose cycle phase places it submerged returns `null`), `enterBay()`, `completeRound()`, `killFrog(kind)`, `respawn()`, `drawZones()`, `drawLanes()`, `drawFrog()`, `drawBays()`, `drawHud()`, `drawTimerBar()`, `drawOverlay()`.

### Canvas component (`components/games/frogger/frogger-canvas.tsx`)

```ts
export interface FroggerCanvasProps {
  paused: boolean;
  onSnapshot: (snapshot: FroggerSnapshot) => void;
  onGameOver: (finalScore: number) => void;
  restartSignal: number;
}
```

No `skin` prop — same as `TetrisCanvasProps`, and still assignable to `GameCanvasProps` in the registry map. `WIDTH = 520`, `HEIGHT = 640`, `GAME_KEYS = new Set(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyW","KeyA","KeyS","KeyD"])`.

### Touch controls (`components/games/registry.ts`)

```ts
frogger: {
  up: { code: "ArrowUp", mode: "tap", enabled: true },
  down: { code: "ArrowDown", mode: "tap", enabled: true },
  left: { code: "ArrowLeft", mode: "tap", enabled: true },
  right: { code: "ArrowRight", mode: "tap", enabled: true },
  a: { code: "", mode: "tap", enabled: false },
  b: { code: "", mode: "tap", enabled: false },
},
```

`tap` mode on all four directions: one hop per touch, never auto-repeating while held — the same reasoning as Tetris's rotate button.

## Implementation Plan

Registry, dispatcher, data layer and touch-control host all already exist; this plan only adds a game.

1. **Catalog metadata** — add the `frogger` object to `GAMES` in `app/data/games.ts` with the Data Model values, `cover: "cover-rana"`. Leave `ranaria` alone. Verify: the card renders on `/` with the frog cover.
2. **Supabase row** — `mcp__supabase__apply_migration` named `seed_game_frogger`, the single insert above. Verify with `mcp__supabase__execute_sql` that the row exists and `/juegos` plus `/juegos/frogger` render it.
3. **Engine skeleton** — `components/games/frogger/engine.ts` with constants, types, `reset()`, `getSnapshot()`, `buildLanes()`, and a `draw()` that renders the static map only (zone backgrounds, hedge and five bays, median and start rows, both HUD strips, frog parked at row 14 / column 6). Verify: the map is legible and correctly proportioned at 520×640.
4. **Canvas wrapper** — `components/games/frogger/frogger-canvas.tsx` copied from `snake-canvas.tsx`, changing only `WIDTH`/`HEIGHT`, `GAME_KEYS` and the engine class; register `frogger: FroggerCanvas` in `GAME_ENGINES` and add the `GAME_TOUCH_CONTROLS` entry. Verify: `/juegos/frogger/jugar` renders the static map inside the CRT, PAUSA freezes it, no console errors.
5. **Lane motion** — implement entity advance (`entity.col += lane.speed * lane.dir * dt`) with wraparound re-entry at `col = -entity.width` or `col = COLS`, plus the turtle submersion cycle driven off `cyclePhase`. Verify: every lane has visible gaps the frog could pass through, entities loop seamlessly, turtle groups surface and submerge out of phase with each other.
6. **Frog hop and input** — `handleKeyDown` maps arrows/WASD to `pendingDirection`; `update` starts a hop when idle, interpolates `hopT` over `HOP_MS`, and on completion snaps to the target cell and calls `resolveCell()`. Enforce the lateral clamp and the row 0 / row 15 / below-14 bounds. Verify: exactly one cell per press, no double-hops, no way off the playfield.
7. **Collision, support and drift** — `roadCollision()` for rows 9–13; `riverSupport()` for rows 2–7 returning the log or surfaced turtle group under the frog, or `null`; while supported and not hopping, apply the lane's drift to `frog.col`; drifting past either lateral edge is a death. Verify: vehicles kill, water kills, riding a log carries the frog, a group submerging under the frog kills it.
8. **Bays, scoring and round completion** — `enterBay()` on reaching row 1: a free bay scores `POINTS_BAY` plus the time bonus and is marked filled; a hedge cell or a filled bay is a death. `furthestRow` pays `POINTS_ROW` once per newly reached row per round. `completeRound()` on all five bays: `POINTS_ROUND`, `level + 1`, `buildLanes(level)`, bays emptied, timer reset to `max(MIN_ROUND_TIME, BASE_ROUND_TIME - (level - 1))`. Verify: the React HUD's score and level track the canvas; round two is visibly faster with a shorter bar.
9. **Timer, death beat and game over** — drain `timeLeft`, colour the row-15 bar green/yellow/red, zero is a death. `killFrog(kind)` sets `state = "dying"` and `deathT = 0`; during `dying` lanes keep updating, input is ignored, and the frog draws as a splat or bubble; after `DEATH_MS` deduct a life and either `respawn()` or set `state = "gameover"`. Verify: `♥` count drops per death, the modal opens once on the third death with the real final score.
10. **Cross-check pass** — full playthrough (all three death causes, log riding, a completed round, pause/resume mid-river, JUGAR DE NUEVO, save score); confirm the inserted `scores` row via `execute_sql` and its ranking on `/juegos/frogger` and `/salon-de-la-fama`; check touch buttons on a narrow viewport; `npm run build` clean; confirm the other four games and every placeholder entry are unregressed.

## Acceptance Criteria

- [ ] The `frogger` row exists in the Supabase `games` table with exactly the Data Model values (`cat: ARCADE`, `cover: cover-rana`, `color: green`).
- [ ] A `FROGGER` card appears on `/juegos` and on the landing rail, distinct from and alongside the existing `RANARIA` card.
- [ ] `/juegos/frogger` renders via `getGame("frogger")` with the real row's copy, cover and leaderboard.
- [ ] `/juegos/frogger/jugar` renders `GamePlayer` with the real `FroggerCanvas` (not the mock score simulation).
- [ ] The 520×640 canvas shows the seven zones distinctly: HUD strip, goal row with five bays and hedge, six river lanes, median, five road lanes, start row, bottom bar.
- [ ] The five bays sit at columns 0, 3, 6, 9 and 12; the frog spawns at row 14, column 6.
- [ ] One direction key press moves the frog exactly one cell, animated over ~120 ms; a press during a hop is buffered as at most one pending direction.
- [ ] The frog cannot leave columns 0–12, cannot enter row 0 or row 15, and cannot move below row 14.
- [ ] Road entities loop horizontally with per-lane speed and direction, re-entering from the opposite edge, with passable gaps.
- [ ] River logs and turtle groups loop the same way; turtle groups alternate 3 s surfaced / 1.5 s submerged and are visibly out of phase with each other.
- [ ] Contact with any car or truck kills the frog.
- [ ] Standing in a river lane with no log or surfaced turtle beneath it kills the frog.
- [ ] The frog drifts with the log or turtle group it stands on, and dies if carried past either lateral edge.
- [ ] A turtle group submerging beneath the frog kills it.
- [ ] The round timer drains, shifts green → yellow → red, and reaching zero kills the frog.
- [ ] Reaching a free bay fills it, scores +50 plus `ceil(remaining) × 10`, and returns the frog to the start row.
- [ ] Landing on a hedge cell of the goal row, or on an already-filled bay, kills the frog.
- [ ] Advancing to a row not yet reached this round scores +10, and re-crossing that row in the same round scores nothing more.
- [ ] Filling all five bays scores +200, increments `level`, empties the bays, rebuilds the lanes ~15 % faster, and shortens the timer by 1 s (floored at 8 s).
- [ ] Each death shows the ~700 ms splat/bubble beat with lanes still moving and input ignored, then respawns the frog with a fresh timer.
- [ ] `GamePlayer`'s React HUD tracks score, `♥` lives (3 → 0) and level in real time, with no change to `game-player.tsx`.
- [ ] PAUSA freezes lanes, hop, timer and submersion cycles; REANUDAR resumes from the identical state with no dt spike or teleport.
- [ ] The third death fires `onGameOver` exactly once and opens the save-score modal with the real final score.
- [ ] Saving inserts a `scores` row for `game_id = "frogger"` (verified via `execute_sql`) that ranks correctly on `/juegos/frogger` and `/salon-de-la-fama`.
- [ ] JUGAR DE NUEVO fully resets: score 0, lives 3, level 1, bays empty, lanes at base speed, timer at 15 s, frog at row 14 / column 6.
- [ ] Arrow keys and WASD affect the game only while the canvas is focused and never scroll the page.
- [ ] On a touch viewport the four direction buttons each produce exactly one hop per tap and do not auto-repeat while held; the `a`/`b` buttons are disabled.
- [ ] The canvas scales without horizontal overflow, letterboxed inside `.crt-screen` like Tetris.
- [ ] Asteroids, Tetris, Arkanoid, Snake and every placeholder entry are unregressed; no console errors during a full playthrough.
- [ ] `npm run build` completes clean.

## Decisions Taken and Discarded

- **No template → original engine.** `references/templates/started-games/` has only asteroids, tetris and arkanoid. Frogger is authored from scratch against the engine contract, same as Snake.
- **Engine + canvas split, not one component.** The superseded draft proposed a single `components/games/FroggerGame.tsx` holding the loop, the HUD and the score modal. Rejected: the platform contract puts framework-free logic in `engine.ts` and confines React to a thin wrapper.
- **No dedicated play page.** The draft proposed `app/games/frogger/play/page.tsx` with its own HUD, CRT, modal, `gameKey` and `localStorage` name handling. Rejected: `/juegos/[id]/jugar` + `GamePlayer` already provide all of it, and the registration rule forbids per-game pages and per-game branches.
- **`onSnapshot`, not four callbacks.** The draft's `onScoreChange`/`onLivesChange`/`onLevelChange`/`onGameOver` are replaced by the contract's single per-frame `onSnapshot` plus edge-triggered `onGameOver`; `restartSignal` replaces remounting via `gameKey`.
- **Portrait 520×640, letterboxed.** Frogger's map is vertical, so the 800×600 landscape footprint used by Asteroids/Arkanoid/Snake would squash the crossing. 13×16 at 40 px reproduces the arcade board's proportions, and Tetris's 300×600 already establishes letterboxing inside the fixed `4/3` `.crt-screen` as acceptable. Chasing a `--crt-aspect` seam here is `mobile-porter`'s territory, not this spec's.
- **13 columns, 40 px cells.** Matches the original board width exactly and divides 520 cleanly.
- **Two canvas HUD strips (rows 0 and 15) outside the playfield.** Keeps score/level/timer/lives text off the moving lanes; costs two of sixteen rows and still leaves the canonical five road lanes plus six river lanes.
- **Five single-cell bays at columns 0, 3, 6, 9, 12.** Symmetric, two-column hedge between bays, and the centre bay lines up with the spawn column. Landing on hedge is fatal, as in the original.
- **Timer drawn on canvas only.** `GamePlayer`'s HUD renders score, lives and level generically for every game; adding a timer field for one game would break that contract. Snake and Arkanoid already keep game-specific readouts inside the canvas. Encoding time into `level` was considered and rejected as actively misleading.
- **Real `lives`, no sentinel.** Frogger genuinely has three lives, so `lives` carries its true meaning and the `♥` HUD block works untouched — unlike Snake's `lives: 1` sentinel.
- **`level` means round number.** Straightforward here, no repurposing.
- **Discrete cell hops, not continuous motion.** Canonical Frogger, and it reduces collision and support checks to integer row comparisons plus a one-dimensional column-range test.
- **Frog drifts fractionally while on a log.** The one place `frog.col` is not an integer. Necessary: a frog that stuck to integer columns on a moving log would not read as riding it. Column comparisons use `Math.round(frog.col)` for cell resolution.
- **~700 ms death freeze with a splat/bubble shape.** Instant respawn reads as a teleport glitch at high traffic. Costs one state, one timer and one alternate frog shape — no particle system, which stays out of scope.
- **Turtle submersion cycle with per-group phase offset.** The mechanic that distinguishes the river from a plain log field; the offset stops all groups blinking in unison, which would look like a rendering bug.
- **Speeds ×1.15 compounding per level; timer −1 s floored at 8 s.** Difficulty ramps on both axes without becoming unplayable at high rounds.
- **Canvas primitives, no assets.** No Frogger art exists in the repo and nothing needs to land under `public/games/`. Sprites would add an `onload` gate for no gameplay benefit.
- **`.cover-rana` reused verbatim.** The block already ships (green frog over cyan lanes) and is self-contained — pure class selectors with no coupling to the `ranaria` entry. Same precedent as Snake reusing `.cover-snake`, and it means no new UI design work, so no `/frontend-design` pass is required.
- **`color: green`, not `lime`.** `lime` is not one of the four legal values in the `Game` type's `color` union; the draft's value would not type-check.
- **New `frogger` entry, `ranaria` untouched.** Same accepted duplication as `rocas`/`asteroids` and `serpentina`/`snake` — nothing currently referencing `ranaria` breaks.
- **Touch controls in scope, all four directions in `tap` mode.** `GAME_TOUCH_CONTROLS` is now part of the contract; `hold` would auto-repeat hops and make the river unsurvivable, so the reasoning matches Tetris's rotate button.
- **Skins deferred.** `FroggerCanvasProps` omits `skin` and the engine hardcodes its literals, exactly as Tetris does today. `skin-designer frogger` transcribes those literals into a `classic` palette later; pre-authoring palettes here would duplicate that agent's work and risk contradicting its ledger.
- **Discarded from scope:** crocodiles disguised as logs, the bonus fly in a bay, otters and snakes on the median, particle death animations, sound, diagonal movement, mouse controls, difficulty selector, RLS tightening and realtime leaderboards.

## Identified Risks

- **Fractional drift vs. integer cell logic.** `frog.col` is fractional while hopping or drifting but every collision, support and bay test is cell-based. Pick one rounding rule (`Math.round(frog.col)`) and apply it in `roadCollision`, `riverSupport` and `enterBay` alike, or the frog will die on a log it visually occupies.
- **Support loss must not be evaluated mid-hop.** Checking `riverSupport()` while `hopFrom !== null` would drown a frog in flight between two logs. Resolve the cell only in `finishHop()`, and re-check support per frame only while idle.
- **Buildable lanes are not guaranteed by random generation.** A lane whose entities happen to leave no gap of at least one cell makes the round impossible. `buildLanes` must place entities with explicit minimum gaps rather than trusting randomness — especially at high levels where speeds compound.
- **Turtle cycle and the dt cap.** With `dt` capped at 0.05 s, a long frame stall makes the submersion cycle drift out of real time. Harmless in isolation, but if the cycle is driven from an accumulator distinct from the one moving the entities, the visual state and the support state can disagree. Derive both from the same per-lane elapsed-time field.
- **Round-timer death during the death freeze.** `timeLeft` must stop draining once `state === "dying"`, or a timer death can trigger a second `killFrog` and burn two lives on one mistake.
- **Portrait canvas inside a 4/3 screen.** At 520×640 the letterboxed canvas is noticeably narrower than the other games'; on small viewports the effective cell size shrinks a lot. Acceptable per the geometry decision, but worth a visual check on a phone-width viewport before declaring step 10 done — and it is the first thing `mobile-porter frogger` should look at.
- **`insertScore` has no error handling in `GamePlayer`.** A failed insert leaves `saved` false with no user-visible message. Pre-existing platform behaviour, out of scope to fix here, but do not mistake it for a Frogger bug during verification.
