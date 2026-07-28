# 08 - Arkanoid: breakout port with sprites, levels, and explosions

- **Status:** Approved
- **Dependencies:** 05-asteroids-integration (engine/canvas contract), 06-games-and-scores-supabase (games/scores schema), 07-tetris-integration (registry already exists)
- **Date:** 2026-07-28
- **Objective:** Port the `04-arkanoid` template as a real playable game (`arkanoid`) with paddle+ball+5 block levels, sprites and sound, registered in Supabase and in `GAME_ENGINES`.

## Scope

### In scope

- New catalog entry `arkanoid` (distinct from `bloque-buster`) in `app/data/games.ts` + `.cover-arkanoid` in `app/globals.css` (cloned/recolored from `.cover-bricks`).
- Supabase `games` row for `arkanoid` via `mcp__supabase__apply_migration` (`seed_game_arkanoid`).
- `components/games/arkanoid/engine.ts` — full port of the template: paddle, ball, AABB collisions against blocks, 5 levels (`LEVELS`, per-level `speed`), 3 lives, explosions (4 frames per color, 150ms), `playing`/`gameover`/`win` states.
- `components/games/arkanoid/arkanoid-canvas.tsx` — keyboard control (← →) **and** mouse (`mousemove` over the canvas moves the paddle), no click-driven level-select.
- Sprites and sounds ported to `public/games/arkanoid/` (`spritesheet-breakout.png`, `ball-bounce.mp3`, `break-sound.mp3`), with the JS's relative paths rewritten to point there.
- `reset()` designed from scratch (the template has no restart mechanism): full reset of score, lives, level, blocks, paddle, ball, explosions, and state.
- The `win` state (clearing level 5) fires `onGameOver(finalScore)` the same as losing all 3 lives — same score-save path.
- Registering `arkanoid` in `GAME_ENGINES` (`components/games/registry.ts`).

### Not in scope

- Click-driven level-select on the pause overlay (present in the template, dropped — `PAUSA` only freezes/resumes, as `GamePlayer` already does).
- Dispatcher refactor (`game-player.tsx`) — already uses the registry since the tetris integration.
- Changes to `app/juegos/[id]/jugar/page.tsx` — already reads `getGame(id)`.
- Replacing or removing the fake `bloque-buster` entry — it stays intact, duplicating the ARCADE block-breaker theme (same accepted pattern as `asteroids` vs. `rocas`).

## Data Model

### Supabase `games` row (migration `seed_game_arkanoid`)

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays)
values ('arkanoid', 'ARKANOID',
        'Rebota la pelota y destruye 5 muros de bloques.',
        'Controla una paleta con teclado o mouse y rebota una pelota para pulverizar bloques cromáticos a través de 5 niveles con patrones distintos. La pelota acelera un 10% por nivel. Tres vidas, sin piedad.',
        'ARCADE', 'cover-arkanoid', 'cyan', 32000, '1.0K');
```

### `ArkanoidSnapshot` (`components/games/arkanoid/engine.ts`)

```ts
export type ArkanoidState = "playing" | "gameover" | "win";

export interface ArkanoidSnapshot {
  score: number;
  lives: number;
  level: number; // currentLevel, 1-indexed, 1..5
  state: ArkanoidState;
}
```

Deviation from the standard contract (documented per `reference.md` §1): adds a `"win"` state (clearing level 5) alongside `"playing"`/`"gameover"`, instead of asteroids' intermediate `"dead"` state — arkanoid has no transient "you just lost a life" state, it loses a life and continues without a pause. `"win"` and `"gameover"` are both terminal: the canvas treats either as the edge-triggered signal for `onGameOver(finalScore)`.

### `ArkanoidCanvasProps` (`components/games/arkanoid/arkanoid-canvas.tsx`)

```ts
export interface ArkanoidCanvasProps {
  paused: boolean;
  onSnapshot: (snapshot: ArkanoidSnapshot) => void;
  onGameOver: (finalScore: number) => void;
  restartSignal: number;
}
```

Same shape as the standard contract (`reference.md` §2) — no secondary canvas, no parallel DOM HUD (the original HUD is already canvas-drawn, kept that way).

## Implementation Plan

1. **Assets:** copy `assets/spritesheet-breakout.png`, `assets/sounds/ball-bounce.mp3`, `assets/sounds/break-sound.mp3` from the template into `public/games/arkanoid/` (same relative structure: `public/games/arkanoid/spritesheet-breakout.png`, `public/games/arkanoid/sounds/ball-bounce.mp3`, `public/games/arkanoid/sounds/break-sound.mp3`).

2. **Catalog:** add the `arkanoid` entry to `GAMES` in `app/data/games.ts` (see Data Model) and a `.cover-arkanoid` block in `app/globals.css`, cloned and recolored from `.cover-bricks` (via `/frontend-design`, per `CLAUDE.md`).

3. **Supabase:** apply migration `seed_game_arkanoid` via `mcp__supabase__apply_migration` with the insert from the Data Model section.

4. **Engine — `components/games/arkanoid/engine.ts`:**
   - Port `game.js`/`levels.js`/`assets/spritesheet.js` into an `ArkanoidEngine` class, with `W`/`H`/`paddle`/`ball`/`blocks`/`explosions`/`score`/`lives`/`currentLevel`/`state` as instance fields (not module-level globals).
   - Constants from `game.js` (`PADDLE_SPEED`, `BLOCK_COLS/ROWS`, `BLOCK_W/H`, `BASE_BALL_VX/VY`) and `LEVELS` from `levels.js` (5 levels, field `speed` — **not** `ballSpeedMultiplier`, per the documented drift from Phase 1) are ported as-is.
   - Sprites: `loadSpritesheet(cb)`/`drawSprite`/`drawFrame` from `spritesheet.js` are ported as internal class methods/helpers; the async spritesheet load must resolve before `draw()` attempts to draw sprites (same `ssLoaded` guard as the original). PNG path rewritten to `/games/arkanoid/spritesheet-breakout.png`.
   - Sounds: `bounceSound`/`breakSound` are instantiated in the constructor pointing at `/games/arkanoid/sounds/ball-bounce.mp3` and `/games/arkanoid/sounds/break-sound.mp3`; played the same way as the original (`.cloneNode().play()`).
   - `update(dt)`: paddle input from `keys` (a Set of `e.code`, see canvas), ball movement, wall/paddle bounces, AABB collision against blocks (one per frame, same as the original), level advance on clearing blocks, `state = "win"` on clearing level 5, life loss when the ball falls off, `state = "gameover"` at 3 lives lost. `dt` already arrives capped at 50ms from the canvas (standard contract), replacing the template's uncapped `dt`.
   - `draw()`: background, live blocks, explosions (frame by `elapsed`), paddle, ball, HUD (score/level/lives as in the original), "GAME OVER" / "¡Completaste el juego!" overlay per `state`.
   - `handleKeyDown`/`handleKeyUp`: toggle the pressed-key Set for `ArrowLeft`/`ArrowRight`.
   - Additional method `handlePointerMove(canvasX: number)` (or similar) so the canvas can feed the mouse's X position — paddle clamped the same way as the original (`Math.max(0, Math.min(...))`).
   - `reset()`: designed from scratch (the template has no equivalent) — resets score=0, lives=3, currentLevel=1, reloads level-1 blocks, paddle centered, ball repositioned, explosions cleared, state="playing".
   - `getSnapshot()`: `{ score, lives, level: currentLevel, state }`.

5. **Canvas — `components/games/arkanoid/arkanoid-canvas.tsx`:** copy the structure of `components/games/asteroids/asteroids-canvas.tsx`, changing only:
   - `WIDTH = 800`, `HEIGHT = 600` (same as asteroids, no dimension change).
   - `GAME_KEYS = new Set(["ArrowLeft", "ArrowRight"])`, with `preventDefault()` only for those.
   - An `onMouseMove` handler on the `<canvas>` that translates `clientX` into canvas coordinates (via `getBoundingClientRect` + scale factor, same as the original) and calls `engine.handlePointerMove(x)`.
   - Engine class: `ArkanoidEngine`.
   - The rest of the structure (refs for `paused`/`onSnapshot`/`onGameOver`, capped `dt`, `restartSignal` guard, edge-triggered `onGameOver`, `tabIndex={0}`, responsive scaling) unchanged from the asteroids pattern.

6. **Registration:** add `arkanoid: ArkanoidCanvas` to `GAME_ENGINES` in `components/games/registry.ts`.

7. **Cross-check:** full manual playthrough (losing all 3 lives → game over; clearing all 5 levels → win, both opening the save-score modal), verify score insertion via `execute_sql`, confirm ranking on the detail leaderboard and on `/salon-de-la-fama`, confirm Asteroids and Tetris remain unregressed, and a clean `npm run build`.

## Acceptance Criteria

- [ ] `ARKANOID` card appears on `/juegos` under the ARCADE filter.
- [ ] `/juegos/arkanoid` detail page renders via `getGame("arkanoid")`, including the `.cover-arkanoid` art.
- [ ] `/juegos/arkanoid/jugar` renders the real `ArkanoidCanvas`, not a placeholder.
- [ ] Paddle responds to both ← → keys and mouse movement over the canvas.
- [ ] Ball bounces correctly off walls, paddle, and blocks; blocks disappear with the 4-frame explosion animation and play the break sound.
- [ ] Losing a life (ball falls past the paddle) decrements lives and repositions the ball without ending the run, until lives reach 0.
- [ ] Clearing all blocks in a level advances to the next level (2 through 5) with the correct block pattern and ball-speed multiplier.
- [ ] Clearing level 5 triggers the `win` state and behaves as a game over (score-save modal opens).
- [ ] Losing all 3 lives triggers `gameover` and opens the same score-save modal.
- [ ] Keyboard input (← →) only affects the game when the canvas is focused and never scrolls the page.
- [ ] PAUSA/REANUDAR freezes and resumes the game (paddle, ball, blocks, explosions all stop and resume together).
- [ ] JUGAR DE NUEVO fully resets score, lives, level, blocks, paddle, ball, and explosions to a fresh level-1 state.
- [ ] Saving a score inserts a `scores` row for `arkanoid`, verifiable via `execute_sql`.
- [ ] The new score ranks correctly on both the `/juegos/arkanoid` leaderboard and `/salon-de-la-fama`.
- [ ] Canvas scales responsively on narrow viewports without horizontal overflow.
- [ ] Asteroids and Tetris remain fully unregressed (both playable end-to-end as before).
- [ ] No console errors, including sprite/sound asset loading.
- [ ] `npm run build` completes cleanly.

## Decisions Taken and Discarded

- **New `arkanoid` catalog entry instead of reusing `bloque-buster`.** Accepts the thematic duplication (two ARCADE block-breaker cards) to match the precedent set by `asteroids` vs. `rocas` in spec 05 — real games get their own slug rather than overwriting a fake placeholder.
- **Keyboard + mouse control, not keyboard-only.** The template's primary control is mouse `mousemove`; dropping it would meaningfully change how the game feels to play. Kept both, with keyboard still scoped to the canvas element and only `ArrowLeft`/`ArrowRight` preventDefault'd — mouse input doesn't interfere with page scroll either way.
- **Level-select-by-click pause overlay dropped.** Template-only extra; `GamePlayer`'s own PAUSA button already provides pause/resume, so a second, game-specific pause UI with click handling was deemed unnecessary scope.
- **`win` state added to `ArkanoidSnapshot` alongside `gameover`.** The reference contract's `<Name>State` is meant to be adapted per game (`reference.md` §1); arkanoid genuinely has two distinct terminal conditions (lose all lives vs. clear all levels), and both must reach the same `onGameOver`/score-save path.
- **`reset()` designed from scratch.** The template has no restart mechanism at all (page reload only) — there is no original behavior to port here, only the standard "what should JUGAR DE NUEVO fully clear" question to answer directly.
- **Sprites and sounds ported, not simplified to flat rects.** Preserves visual/audio fidelity to the original, consistent with how asteroids' vector art and tetris' visuals were preserved in their respective ports — this is the only reference template with binary assets, so it is the first spec to exercise the `public/games/<slug>/...` asset path rewrite described in `reference.md` §9.
- **`speed` field name kept as-is, not "corrected" to `ballSpeedMultiplier`.** The template's `CLAUDE.md`/README name is aspirational, not real — `levels.js` itself uses `speed`, and the port follows the code, per `reference.md`'s documented doc-vs-code drift.

## Identified Risks

- **Binary asset path rewrite is easy to miss.** Both `game.js` (`'assets/sounds/ball-bounce.mp3'`, `'assets/sounds/break-sound.mp3'`) and `spritesheet.js` (`'assets/spritesheet-breakout.png'`) contain relative string literals — a grep of `index.html` alone would miss these. Both files' JS string literals must be located and rewritten to the `public/games/arkanoid/` paths.
- **Async spritesheet load gates first draw.** The original only calls `requestAnimationFrame(loop)` inside `loadSpritesheet`'s callback; the ported canvas component's mount effect must preserve this ordering (engine shouldn't attempt `draw()` before `ssLoaded` is true), or blocks/paddle/ball will silently not render for a frame or throw on an undefined sprite.
- **Capping `dt` changes ball-speed feel versus the original.** The template's `update(dt)` runs with an uncapped `dt`, but the canvas contract mandates `Math.min(dt, 0.05)`. Under normal frame rates this is unobservable, but after a tab-switch or a dropped-frame stall the ball will now visibly move less far per frame than the original template would have — expected and consistent with how asteroids/tetris were already ported, not a regression to chase.
- **Mouse-driven paddle movement is new territory for this platform's canvas contract.** `reference.md` §2's non-negotiable structural rules were written against keyboard-only games (asteroids, tetris); adding an `onMouseMove` handler is compatible with the contract's spirit (scoped to the canvas element, no blanket side effects) but is the first port to require it — worth double-checking `getBoundingClientRect`/scale-factor math against the original during the cross-check step, since a scaling mismatch would make the paddle track the mouse incorrectly rather than fail loudly.
