# 08 - Arkanoid: breakout port with sprites, levels, and explosions

- **Status:** Approved
- **Dependencies:** 05-asteroids-integration (engine/canvas contract), 06-games-and-scores-supabase (games/scores schema), 07-tetris-integration (registry already exists)
- **Date:** 2026-07-28
- **Objective:** Port the `04-arkanoid` template as a real playable game (`arkanoid`) with paddle+ball+3 block levels, sprites and sound, registered in Supabase and in `GAME_ENGINES`.

> **Post-implementation note (2026-07-28):** several facts this spec originally asserted about the `04-arkanoid` template turned out not to match the actual source (see "Post-implementation correction" below). This document has been amended to describe what was actually ported. Acceptance criteria and the `Implemented` status flip are intentionally left for manual verification/sign-off.

## Scope

### In scope

- New catalog entry `arkanoid` (distinct from `bloque-buster`) in `app/data/games.ts` + `.cover-arkanoid` in `app/globals.css` (cloned/recolored from `.cover-bricks`).
- Supabase `games` row for `arkanoid` via `mcp__supabase__apply_migration` (`seed_game_arkanoid`).
- `components/games/arkanoid/engine.ts` — full port of the template: paddle, ball, AABB collisions against blocks, 3 levels (`LEVELS`, ported verbatim from `game.js` — the template does not define 5), 3 lives, explosions (4 frames per color, 150ms), `playing`/`gameover`/`win` states.
- `components/games/arkanoid/arkanoid-canvas.tsx` — keyboard control (← →) only, no click-driven level-select.
- Sprites and sounds ported to `public/games/arkanoid/` (`spritesheet-breakout.png`, `ball-bounce.mp3`, `break-sound.mp3`), with the JS's relative paths rewritten to point there.
- `reset()` designed from scratch (the template has no restart mechanism): full reset of score, lives, level, blocks, paddle, ball, explosions, and state.
- The `win` state (clearing level 3, the template's last level) fires `onGameOver(finalScore)` the same as losing all 3 lives — same score-save path.
- Registering `arkanoid` in `GAME_ENGINES` (`components/games/registry.ts`).

### Not in scope

- Mouse-driven paddle control. The template has no `mousemove` handling at all — this spec originally described it as the template's "primary control," which was incorrect (see "Post-implementation correction"). Only keyboard (← →) was ported.
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

> **Post-implementation correction:** this insert was applied as originally written, so the live `games` row and the `app/data/games.ts` catalog entry still read "5 muros de bloques" / "teclado o mouse" / "5 niveles" — copy that no longer matches the shipped game (3 levels, keyboard-only). Correcting that user-facing copy in Supabase/`games.ts` was left out of this amendment since it touches shipped data rather than spec text; flag it for a follow-up pass before calling this Implemented.

### `ArkanoidSnapshot` (`components/games/arkanoid/engine.ts`)

```ts
export type ArkanoidState = "playing" | "gameover" | "win";

export interface ArkanoidSnapshot {
  score: number;
  lives: number;
  level: number; // currentLevel, 1-indexed, 1..3
  state: ArkanoidState;
}
```

Deviation from the standard contract (documented per `reference.md` §1): adds a `"win"` state (clearing level 3, the template's last level) alongside `"playing"`/`"gameover"`, instead of asteroids' intermediate `"dead"` state — arkanoid has no transient "you just lost a life" state, it loses a life and continues without a pause. `"win"` and `"gameover"` are both terminal: the canvas treats either as the edge-triggered signal for `onGameOver(finalScore)`.

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
   - Port `game.js`/`assets/spritesheet.js` into an `ArkanoidEngine` class, with `width`/`height`/`paddle`/`ball`/`blocks`/`explosions`/`score`/`lives`/`currentLevel`/`state` as instance fields (not module-level globals). There is no `levels.js` in the actual template — `LEVELS` lives inline in `game.js` and was ported from there.
   - Constants from `game.js` (`BRICK_ROWS/COLS`, `BRICK_WIDTH/HEIGHT`, `PADDLE_WIDTH/HEIGHT`, `PADDLE_SPEED`, `BALL_RADIUS`, `BALL_SPEED`) are ported as-is, using the template's real names rather than the `BLOCK_COLS/ROWS`/`BLOCK_W/H`/`BASE_BALL_VX/VY` names this spec originally (and incorrectly) assumed. `LEVELS` has **3** layouts, not 5, and there is no per-level `speed` field anywhere in the template — ball speed is a flat constant, not scaled per level.
   - Sprites: `loadSpritesheet`/`drawSprite`/`drawFrame` from `spritesheet.js` are ported as internal class methods/helpers; the async spritesheet load must resolve before sprites draw (same `ssLoaded` guard as the original, checked per-sprite rather than gating the whole draw call). PNG path rewritten to `/games/arkanoid/spritesheet-breakout.png`.
   - Sounds: `bounceSound`/`breakSound` are instantiated in the constructor pointing at `/games/arkanoid/sounds/ball-bounce.mp3` and `/games/arkanoid/sounds/break-sound.mp3`; played the same way as the original (`.cloneNode().play()`).
   - `update(dt)`: paddle input from a keyboard state map, ball movement, wall/paddle bounces, AABB collision against blocks (one per frame, same as the original), level advance on clearing blocks, `state = "win"` on clearing level 3 (the template's last level), life loss when the ball falls off, `state = "gameover"` at 3 lives lost. `dt` is accepted for interface compatibility with the standard contract but is not used to scale ball movement — the template steps the ball a fixed distance per frame, and changing that would alter game feel from the source.
   - `draw()`: background, live blocks, explosions (frame by elapsed time), paddle, ball, HUD (score/level/lives as in the original), "GAME OVER" / "¡Completaste el juego!" overlay per `state`.
   - `handleKeyDown`/`handleKeyUp`: toggle a pressed-key map for `ArrowLeft`/`ArrowRight` only (the template also accepts `KeyA`/`KeyD`; dropped here to match the standard contract's arrow-key-only convention used by asteroids/tetris).
   - No `handlePointerMove` method — the template has no mouse input to port (see "Not in scope").
   - `reset()`: designed from scratch (the template has no equivalent) — resets score=0, lives=3, currentLevel=0 (level 1), reloads level-1 blocks, paddle centered, ball repositioned and immediately relaunched (no "press Space to launch" step — the template's `start`/`life-lost`/`level-complete` states are collapsed away per the Data Model's documented `ArkanoidState`), state="playing".
   - `getSnapshot()`: `{ score, lives, level: currentLevel + 1, state }`.

5. **Canvas — `components/games/arkanoid/arkanoid-canvas.tsx`:** copy the structure of `components/games/asteroids/asteroids-canvas.tsx`, changing only:
   - `WIDTH = 800`, `HEIGHT = 600` (same as asteroids, no dimension change).
   - `GAME_KEYS = new Set(["ArrowLeft", "ArrowRight"])`, with `preventDefault()` only for those.
   - No mouse handler — see "Not in scope."
   - Engine class: `ArkanoidEngine`.
   - The rest of the structure (refs for `paused`/`onSnapshot`/`onGameOver`, capped `dt`, `restartSignal` guard, edge-triggered `onGameOver` on either `"gameover"` or `"win"`, `tabIndex={0}`, responsive scaling) unchanged from the asteroids pattern.

6. **Registration:** add `arkanoid: ArkanoidCanvas` to `GAME_ENGINES` in `components/games/registry.ts`.

7. **Cross-check:** full manual playthrough (losing all 3 lives → game over; clearing all 3 levels → win, both opening the save-score modal), verify score insertion via `execute_sql`, confirm ranking on the detail leaderboard and on `/salon-de-la-fama`, confirm Asteroids and Tetris remain unregressed, and a clean `npm run build`.

## Acceptance Criteria

- [x] `ARKANOID` card appears on `/juegos` under the ARCADE filter.
- [x] `/juegos/arkanoid` detail page renders via `getGame("arkanoid")`, including the `.cover-arkanoid` art.
- [x] `/juegos/arkanoid/jugar` renders the real `ArkanoidCanvas`, not a placeholder.
- [x] Paddle responds to ← → keys (keyboard-only — see "Not in scope" for why mouse control was dropped).
- [x] Ball bounces correctly off walls, paddle, and blocks; blocks disappear with the 4-frame explosion animation and play the break sound.
- [x] Losing a life (ball falls past the paddle) decrements lives and repositions the ball without ending the run, until lives reach 0.
- [] Clearing all blocks in a level advances to the next level (2 and 3) with the correct block pattern.
- [ ] Clearing level 3 (the template's last level) triggers the `win` state and behaves as a game over (score-save modal opens).
- [x] Losing all 3 lives triggers `gameover` and opens the same score-save modal.
- [x] Keyboard input (← →) only affects the game when the canvas is focused and never scrolls the page.
- [x] PAUSA/REANUDAR freezes and resumes the game (paddle, ball, blocks, explosions all stop and resume together).
- [x] JUGAR DE NUEVO fully resets score, lives, level, blocks, paddle, ball, and explosions to a fresh level-1 state.
- [x] Saving a score inserts a `scores` row for `arkanoid`, verifiable via `execute_sql`.
- [x] The new score ranks correctly on both the `/juegos/arkanoid` leaderboard and `/salon-de-la-fama`.
- [x] Canvas scales responsively on narrow viewports without horizontal overflow.
- [x] Asteroids and Tetris remain fully unregressed (both playable end-to-end as before).
- [x] No console errors, including sprite/sound asset loading.
- [x] `npm run build` completes cleanly.

## Decisions Taken and Discarded

- **New `arkanoid` catalog entry instead of reusing `bloque-buster`.** Accepts the thematic duplication (two ARCADE block-breaker cards) to match the precedent set by `asteroids` vs. `rocas` in spec 05 — real games get their own slug rather than overwriting a fake placeholder.
- **Level-select-by-click pause overlay dropped.** Template-only extra; `GamePlayer`'s own PAUSA button already provides pause/resume, so a second, game-specific pause UI with click handling was deemed unnecessary scope.
- **`win` state added to `ArkanoidSnapshot` alongside `gameover`.** The reference contract's `<Name>State` is meant to be adapted per game (`reference.md` §1); arkanoid genuinely has two distinct terminal conditions (lose all lives vs. clear all levels), and both must reach the same `onGameOver`/score-save path.
- **`reset()` designed from scratch.** The template has no restart mechanism at all (page reload only) — there is no original behavior to port here, only the standard "what should JUGAR DE NUEVO fully clear" question to answer directly.
- **Sprites and sounds ported, not simplified to flat rects.** Preserves visual/audio fidelity to the original, consistent with how asteroids' vector art and tetris' visuals were preserved in their respective ports — this is the only reference template with binary assets, so it is the first spec to exercise the `public/games/<slug>/...` asset path rewrite described in `reference.md` §9.

## Post-implementation correction (2026-07-28)

This spec was originally drafted describing a version of the `04-arkanoid` template that does not match the actual repository at `04-arkanoid`. During Step 4 of implementation the following mismatches were found between spec text and template source, and the spec was corrected to describe what was actually ported rather than silently inventing the originally-described behavior:

- **5 levels → 3 levels.** The template's `game.js` defines `LEVELS` inline with exactly 3 layouts (full grid, pyramid, checkerboard). There is no `levels.js` file in the template at all, and no per-level `speed`/`ballSpeedMultiplier` field anywhere — ball speed is a flat constant.
- **Keyboard + mouse → keyboard-only.** The template has no `mousemove` handling whatsoever; this spec's claim that "the template's primary control is mouse `mousemove`" was incorrect. Only ← → keyboard control was ported.
- **Constant names.** The spec referenced `PADDLE_SPEED`/`BLOCK_COLS`/`BLOCK_ROWS`/`BLOCK_W`/`BLOCK_H`/`BASE_BALL_VX`/`BASE_BALL_VY`; the real template uses `PADDLE_SPEED` (this one matched), `BRICK_ROWS`/`BRICK_COLS`/`BRICK_WIDTH`/`BRICK_HEIGHT`, and `ball.speed` + launch angle (not separate vx/vy base constants). The port uses the template's real names.

Resolution taken (confirmed with the user mid-implementation): port the template literally rather than inventing the extra 2 levels and mouse control the spec had described, and correct this document afterward — this note plus the edits above are that correction. The live Supabase `games` row and `app/data/games.ts` catalog copy still describe "5 niveles" and "teclado o mouse" (applied before the mismatch was caught); updating that user-facing copy to match the shipped 3-level, keyboard-only game was left as a follow-up rather than bundled into this correction pass.

## Identified Risks

- **Binary asset path rewrite is easy to miss.** Both `game.js` (`'assets/sounds/ball-bounce.mp3'`, `'assets/sounds/break-sound.mp3'`) and `spritesheet.js` (`'assets/spritesheet-breakout.png'`) contain relative string literals — a grep of `index.html` alone would miss these. Both files' JS string literals must be located and rewritten to the `public/games/arkanoid/` paths.
- **Async spritesheet load gates first draw.** The original only calls `requestAnimationFrame(loop)` inside `loadSpritesheet`'s callback; the ported engine guards each `drawSprite`/`drawFrame` call on `ssLoaded` instead, so sprites simply don't render for a frame rather than throwing on an undefined image — same effective guarantee, different mechanism since the ported canvas loop starts on mount rather than waiting on the load callback.
- **Live catalog/DB copy still describes the pre-correction feature set.** The `games` row and `app/data/games.ts` entry both still say "5 niveles" and "teclado o mouse," which no longer match the shipped game. This should be corrected before the acceptance criteria are signed off, since it's user-facing and currently misleading.
