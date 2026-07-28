# 07 - Tetris: Real Game Integration

- **Status:** Approved
- **Dependencies:** 05-asteroids-integration (engine/canvas contract), 06-games-and-scores-supabase (games/scores schema)
- **Date:** 2026-07-28
- **Objective:** Port the standalone canvas prototype in `references/templates/started-games/03-tetris/` into a real, playable Tetris game inside `components/games/tetris/`, adding it to the catalog as a new `tetris` entry, introducing the `GAME_ENGINES` registry/dispatcher refactor as a no-regression prerequisite, and wiring its live score/lines/level and game-over flow into the existing `GamePlayer` HUD and save-score modal.

## Scope

### In scope

- New catalog entry `tetris` in `app/data/games.ts` (`GAMES`): `PUZZLE` category, `yellow` color, new `cover-tetris` cover class in `app/globals.css` (cloned/recolored from the existing `.cover-tetro` block used by the fake `caida` entry), Spanish copy adapted from the template's README, placeholder `best`/`plays` consistent with the rest of the catalog. `caida` stays untouched, same precedent as `asteroids` vs. `rocas`.
- Introduce `components/games/registry.ts` and switch `components/game-player.tsx` from the hardcoded `isAsteroids` branch to a `GAME_ENGINES` lookup (`reference.md` §4) — a no-regression refactor verified by playing Asteroids before and after this step, prior to adding Tetris to the registry.
- Switch `app/juegos/[id]/jugar/page.tsx` from `GAMES.find((g) => g.id === id)` to `getGame(id)` (with `notFound()` on a miss), matching the detail route (`reference.md` §5).
- Full port of the game engine (`references/templates/started-games/03-tetris/game.js`) to TypeScript under `components/games/tetris/`:
  - `engine.ts`: board matrix, 8 piece types (including the undocumented "N/tuerca" piece — see Decisions), `rotateCW` + wall-kick rotation, collision detection, line clearing, classic scoring (`LINE_SCORES` × level, hard/soft drop bonuses), level/speed progression — logic ported 1:1, no new mechanics. `dt` handling is adapted to the platform's seconds-based, capped convention (see Decisions) while preserving the original's millisecond drop-speed thresholds internally.
  - `tetris-canvas.tsx`: client component owning **two** canvases (300×600 main board + 120×120 next-piece preview), the `requestAnimationFrame` loop, and keyboard input, following the Asteroids canvas structural contract (refs for `paused`/`onSnapshot`/`onGameOver`, empty-deps mount effect, edge-triggered game over, scoped `tabIndex`/keyboard handling).
- Canvas-drawn HUD: in addition to the DOM `#score`/`#lines`/`#level` panel the original used (not ported — `GamePlayer`'s React HUD already covers this), the ported canvas also draws SCORE/LINES/LEVEL text directly on the board canvas, matching the Asteroids precedent of on-canvas HUD duplication.
- Register `tetris: TetrisCanvas` in `GAME_ENGINES`.
- `GamePlayer` drives the real live `score`/`lines`/`level`/game-over state for `tetris` through the registry dispatch, same as it does for `asteroids` — no second hardcoded branch.
- PAUSA/REANUDAR freezes and resumes the `requestAnimationFrame` loop; FIN and the engine's own game-over (piece can't spawn) both open the existing save-score modal pre-filled with the real final score.
- "JUGAR DE NUEVO" fully resets engine state: empty board, `score=0`, `lines=0`, `level=1`, `dropInterval=1000`, fresh `next` piece.
- Canvas keeps its logical 300×600 (+120×120 preview) resolution, scaled responsively via CSS, consistent with the Asteroids canvas.
- Supabase `games` row insert for `tetris` (migration `seed_game_tetris`), applied by `/spec-impl`.
- Manual verification only, per Acceptance Criteria below — no automated tests, consistent with prior specs.

### Not in scope

- The template's light/dark theme toggle (`#theme-toggle`, `localStorage['tetris-theme']`) — Arcade Vault has its own site-wide theme; this per-game toggle is dropped entirely.
- Touch/mobile controls — keyboard-only, no on-screen controls added.
- Any gameplay changes or new mechanics beyond what's in `game.js` (no new piece types, hold-piece, T-spin detection, sound, etc.).
- Retrofitting the registry/dispatcher pattern's benefits onto any other catalog game — `bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel` keep today's placeholder fake-simulation behavior untouched, including `caida`, which stays a separate, still-fake entry despite the thematic overlap with `tetris`.
- Sound/audio — the original template has none; none is added.
- Landing-page rail visibility beyond the standard `app/data/games.ts` entry — no changes to `app/page.tsx` itself.
- Changes to `favicon.svg` or any other template-only asset not needed for in-app integration.

## Data Model

### `app/data/games.ts` — new entry

```ts
{
  id: "tetris",
  title: "TETRIS",
  short: "Encaja las piezas antes de que se acumulen.",
  long: "Piezas geométricas caen desde el borde superior del tablero. Rótalas con wall kicks, usa la pieza fantasma para apuntar y limpia líneas completas para subir de nivel. La velocidad de caída aumenta cada 10 líneas.",
  cat: "PUZZLE",
  cover: "cover-tetris",
  color: "yellow",
  best: 210000,
  plays: "1.0K",
},
```

### Supabase `games` row (migration `seed_game_tetris`)

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays)
values ('tetris', 'TETRIS', 'Encaja las piezas antes de que se acumulen.',
        'Piezas geométricas caen desde el borde superior del tablero. Rótalas con wall kicks, usa la pieza fantasma para apuntar y limpia líneas completas para subir de nivel. La velocidad de caída aumenta cada 10 líneas.',
        'PUZZLE', 'cover-tetris', 'yellow', 210000, '1.0K');
```

### `components/games/tetris/engine.ts`

```ts
export type TetrisState = "playing" | "gameover";

export interface TetrisSnapshot {
  score: number;
  lives: number; // always -1: not applicable to Tetris, HUD hides/ignores this field for this game
  level: number;
  state: TetrisState;
}

export class TetrisEngine {
  constructor(ctx: CanvasRenderingContext2D, width: number, height: number);
  update(dt: number): void; // dt in seconds, capped at 0.05, per platform convention
  draw(): void;
  handleKeyDown(code: string): void;
  handleKeyUp(code: string): void;
  reset(): void;
  getSnapshot(): TetrisSnapshot;
  // second canvas support:
  drawNext(nextCtx: CanvasRenderingContext2D): void;
}
```

Internal state ported from the template's module globals into instance fields: `board` (10×20 matrix), `current`/`next` piece objects, `lines`, `dropAccum`, `dropInterval`. `lines` is tracked internally and surfaced via the canvas-drawn HUD (per Scope) even though it isn't part of `TetrisSnapshot` — the snapshot shape stays `{score, lives, level, state}` per `reference.md` §1, and `lines` is not something `GamePlayer`'s generic HUD needs to read.

### `components/games/tetris/tetris-canvas.tsx`

```ts
export interface TetrisCanvasProps {
  paused: boolean;
  onSnapshot: (snapshot: TetrisSnapshot) => void;
  onGameOver: (finalScore: number) => void;
  restartSignal: number;
}
```

Same structural contract as `AsteroidsCanvasProps` (`reference.md` §2), plus internally rendering a second `<canvas>` (120×120) for the next-piece preview, driven by `engine.drawNext(nextCtx)` each frame.

## Implementation Plan

1. Registry + dispatcher refactor: create `components/games/registry.ts` with `GAME_ENGINES = { asteroids: AsteroidsCanvas }` and the shared `GameCanvasProps` interface (`reference.md` §4). Update `components/game-player.tsx` to replace `isAsteroids` with `const Canvas = GAME_ENGINES[game.id]` / `const isReal = Boolean(Canvas)`, switching the fake-simulation `useEffect`s, the canvas render ternary, and the save-score modal's `insertScore`/`saveScore` fork to use `isReal`/`Canvas`. Verify: Asteroids plays identically before and after (manual play-through), no other game's fake simulation regresses.
2. Switch `app/juegos/[id]/jugar/page.tsx` from `GAMES.find((g) => g.id === id)` to `await getGame(id)` with `notFound()` on a miss, matching `app/juegos/[id]/page.tsx`. Verify: `/juegos/asteroids/jugar` still loads.
3. Catalog metadata: add the `tetris` entry to `GAMES` in `app/data/games.ts` (Data Model above) and add `.cover-tetris` to `app/globals.css`, cloned from `.cover-tetro` and recolored to the yellow (`--yellow`) palette per `reference.md` §8. Per `CLAUDE.md`, use `/frontend-design` for this cover-art work.
4. Supabase row: `mcp__supabase__apply_migration` named `seed_game_tetris` with the insert from the Data Model section. Single insert, `games`/`scores` tables already exist.
5. `components/games/tetris/engine.ts`: port `game.js`'s logic into a `TetrisEngine` class per the Data Model interface above:
   - Module globals (`board`, `current`, `next`, `score`, `lines`, `level`, `dropAccum`, `dropInterval`) become instance fields.
   - Port `PIECES` (all 8, including the undocumented "N/tuerca" piece), `COLORS`, `LINE_SCORES`, `createBoard`, `randomPiece`, `collide`, `rotateCW`, `tryRotate` (wall kicks `[0,-1,1,-2,2]`), `merge`, `clearLines`, `ghostY`, `hardDrop`, `softDrop`, `lockPiece`, `spawn` 1:1 as private methods.
   - `update(dt)` receives seconds (capped 0.05) per the platform's `TetrisCanvas` loop; convert internally to accumulate against `dropInterval` (still expressed in ms, e.g. `dropAccum += dt * 1000`) so the original's speed curve (`max(100, 1000 - (level-1)*90)`) is unchanged.
   - `draw()` renders the grid, board, ghost piece (`globalAlpha=0.2`), current piece, and the canvas-drawn HUD text (SCORE/LINES/LEVEL) per Scope.
   - `drawNext(nextCtx)` renders the preview piece onto the second canvas, ported from `drawNext`.
   - Game over: spawning a piece that immediately collides sets `state = "gameover"` (equivalent to the original's `endGame()`), no `lives` decrement.
   - `handleKeyDown`/`handleKeyUp`: `ArrowLeft`/`ArrowRight` move, `ArrowUp`/`KeyX` rotate, `ArrowDown` soft drop, `Space` hard drop. `KeyP` (pause) is NOT handled inside the engine — pause is driven externally via the `paused` prop, consistent with the Asteroids contract (the original's own `togglePause` is not ported).
   - `reset()`: re-runs the equivalent of `init()` (fresh board/score/lines/level/next piece, `dropInterval=1000`).
6. `components/games/tetris/tetris-canvas.tsx`: copy `asteroids-canvas.tsx`'s structure (refs for `paused`/`onSnapshot`/`onGameOver`, empty-deps mount effect, `dt` computed as `Math.min((ts-lastTime)/1000, 0.05)`, edge-triggered `wasGameOverRef`, `restartSignal>0`-triggered `engine.reset()`), changing dimensions to 300×600, the key set to `ArrowLeft/ArrowRight/ArrowDown/ArrowUp/KeyX/Space` (preventDefault only for these while focused and playing), and the engine class to `TetrisEngine`. Add the second 120×120 `<canvas>` for the next-piece preview inside the same component, rendered via `engine.drawNext(nextCtx)` each frame after `engine.draw()`.
7. Register `tetris: TetrisCanvas` in `GAME_ENGINES` (`components/games/registry.ts`).
8. Cross-check pass: full manual play-through (movement, rotation with wall kicks, soft/hard drop, line clear scoring, level speed-up, ghost piece, game over on blocked spawn, pause/resume, restart) + `execute_sql` check on an inserted score + `npm run build` clean, plus a regression check that Asteroids is unaffected.

## Acceptance Criteria

- [x] `tetris` card appears on `/juegos` with the correct PUZZLE category, yellow color, and `cover-tetris` art.
- [x] `/juegos/tetris` (detail page) renders via `getGame("tetris")`, including its leaderboard section.
- [ ] `/juegos/tetris/jugar` renders via `getGame("tetris")` (not `GAMES.find`), matching the detail route's data source.
- [ ] Real gameplay matches the original mechanics: 8 piece types (including the undocumented "N/tuerca" piece) fall and lock, wall-kick rotation works at walls, ghost piece shows the landing position, soft drop (+1/row) and hard drop (+2/cell) both score correctly, line clears score `LINE_SCORES[n] × level`, level increases every 10 lines and drop speed increases accordingly.
- [ ] Canvas-drawn HUD (SCORE/LINES/LEVEL) is visible on the main board canvas in addition to `GamePlayer`'s React HUD.
- [ ] Next-piece preview canvas (120×120) renders the upcoming piece correctly, centered.
- [ ] Keyboard (arrows, X, Space) only affects the game when the canvas is focused, and does not scroll the page.
- [ ] PAUSA/REANUDAR freezes and resumes the drop loop without losing board state.
- [ ] Both FIN and a real in-game game-over (blocked spawn) open the save-score modal pre-filled with the real final score.
- [ ] Saving a score inserts a `scores` row for `tetris`, verifiable via `execute_sql`.
- [ ] The new score ranks correctly on both `/juegos/tetris`'s leaderboard and `/salon-de-la-fama`.
- [ ] "JUGAR DE NUEVO" fully resets the board, score, lines, level, drop speed, and next piece.
- [ ] Canvas scales responsively on narrow viewports without horizontal overflow (both canvases).
- [ ] Asteroids (and all other catalog games) are unregressed after the registry/dispatcher refactor and the `jugar/page.tsx` switch.
- [ ] No console errors during a full play-through.
- [ ] `npm run build` completes cleanly.

## Decisions Taken and Discarded

- **New `tetris` catalog entry vs. reusing `caida`.** Chose a new distinct entry over replacing the existing fake `caida` slot, same precedent as `asteroids` vs. `rocas` in spec 05 — accepts the thematic duplication rather than disturbing an existing (if fake) catalog item.
- **`lives` sentinel.** `TetrisSnapshot.lives` is always `-1` (not applicable) rather than repurposed to mirror `lines`, per `reference.md`'s guidance to keep the snapshot shape uniform across games — `GamePlayer`'s generic HUD special-cases this sentinel to hide/ignore the lives readout for Tetris.
- **Canvas-drawn HUD added despite the original never having one.** The template's HUD was DOM-only (`#score`/`#lines`/`#level` spans); this port adds a small canvas-drawn SCORE/LINES/LEVEL text block anyway, for consistency with the Asteroids precedent of duplicating HUD info on-canvas, even though `GamePlayer`'s React HUD already covers it.
- **Next-piece preview kept in scope.** The second 120×120 canvas is ported as part of `TetrisCanvas` rather than trimmed, preserving the original's visible feature set — this is the first game needing the platform's "secondary canvas" allowance noted in `reference.md` §2.
- **8 piece types, not 7.** The README claims the classic 7-piece set; the actual `PIECES`/`COLORS` arrays in `game.js` define 8, including an undocumented gray "N/tuerca" piece. The port follows the code, carrying all 8 pieces into `TetrisEngine` — trusting `reference.md` §9's documented drift over the README.
- **`dt` unit conversion.** The template accumulates raw milliseconds (`dropAccum += dt`) with no cap; the platform's canvas contract feeds `update(dt)` in seconds capped at 0.05 (`reference.md` §1/§2). The engine converts internally (`dropAccum += dt * 1000`) so the original's millisecond-based speed curve (`max(100, 1000-(level-1)*90)`) is preserved without behavior change, while staying consistent with every other engine's `update` signature.
- **Theme toggle dropped.** The template's own light/dark toggle and its `localStorage['tetris-theme']` key are out of scope entirely — Arcade Vault already has site-wide theming; a second, per-game toggle would conflict with it.
- **Pause key (`KeyP`) not ported into the engine.** The original's `togglePause` (bound to `P`) is replaced by the platform's external `paused` prop, consistent with how `AsteroidsCanvas` doesn't self-manage pause either — avoids two competing pause mechanisms.

## Identified Risks

- **`dt` unit mismatch is the highest-risk port detail.** The template's `loop(ts)` accumulates raw, uncapped millisecond deltas; the platform contract caps `dt` at 50ms (seconds). If a frame hitches for >50ms, the template's original behavior would drop the piece by more than one row that frame — the capped version cannot replicate that, so very long hitches will feel slightly different (piece drops fewer rows on frame drops than the original would have). Not a bug per se, but a behavior delta worth noting if a play-through feels "slower to recover" after a stutter versus the original file.
- **First platform game needing a second canvas.** `reference.md` §2 flags the primary-canvas contract only; wiring `restartSignal`, `paused`, and the RAF loop correctly across _two_ canvases (main + preview) inside one component is new territory — a bug here (e.g. preview not clearing on reset) is easy to miss visually since the preview canvas is small and off to the side.
- **`getComputedStyle(document.body)` dependency for grid line color is dropped.** The original's `drawGrid()` reads a CSS variable (`--grid-line`) from the page at draw time; since the DOM structure around the canvas is completely different in `GamePlayer`, this needs a hardcoded or engine-constant color instead — a straightforward substitution, but a silent visual regression if forgotten (grid lines drawn transparent/wrong color).
- **8-piece set includes an unnamed/undocumented piece.** The "N/tuerca" piece has no official Tetris identity — if `/frontend-design` or copy work later references "the 7 classic pieces," that copy would be inaccurate against the actual ported behavior; Spanish copy in this spec already avoids naming a piece count for this reason.
