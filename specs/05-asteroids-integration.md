# 05 - Asteroids: Real Game Integration

- **Status:** Draft
- **Dependencies:** 01-arcade-vault-mvp (catalog, GamePlayer shell, auth/score persistence)
- **Date:** 2026-07-27
- **Objective:** Port the standalone canvas prototype in `references/templates/started-games/02-asteroids/` into a real, playable Asteroids game inside `components/games/asteroids/`, adding it to the catalog as a new `asteroids` entry and wiring its live score/lives/level and game-over flow into the existing `GamePlayer` HUD and save-score modal.

## Scope

### In scope

- New catalog entry `asteroids` in `app/data/games.ts` (`GAMES`): SHOOTER category, cyan color, `cover-asteroids` cover class (new CSS gradient class in `app/globals.css`, styled like the existing `cover-*` variants), Spanish copy adapted from the template's README, and placeholder `best`/`plays` values consistent with the rest of the catalog.
- Full port of the game engine (`references/templates/started-games/02-asteroids/game.js`) to TypeScript under `components/games/asteroids/`:
  - `engine.ts` (or similar): `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp` classes, toroidal wrapping, collisions, splitting, triple-shot power-up, level progression — logic ported 1:1, no new mechanics.
  - `asteroids-canvas.tsx`: client component owning the `<canvas>`, the `requestAnimationFrame` loop, keyboard input, and exposing live `score`/`lives`/`level`/`gameOver` state to its parent via props/callbacks.
- Canvas requires explicit focus (click or `tabIndex`) before it captures keyboard input (arrows + Space), with `preventDefault()` on those keys only while focused and the game is active, so the rest of the site's scrolling/navigation isn't affected.
- Canvas keeps its own internal HUD exactly as in the original (drawn SCORE/NIVEL/lives text, GAME OVER overlay) — not stripped out, even though this duplicates what `GamePlayer`'s React HUD also shows.
- `GamePlayer` becomes a per-game dispatcher: when `game.id === "asteroids"`, it renders `AsteroidsCanvas` and drives its HUD/score/lives/level from the engine's real live state (via a callback fired once per frame or on relevant state changes) instead of the fake incrementing simulation. All other game ids keep today's fake simulation untouched.
- Wiring Next's existing chrome to the real engine, for `asteroids` only:
  - **PAUSA** button freezes the engine's `requestAnimationFrame` loop (existing "EN PAUSA" overlay keeps working as-is).
  - **FIN** button and the engine's own game-over (lives reaching 0) both end the run and open the existing save-score modal pre-filled with the real final score, replacing the original's "press Space to restart" behavior in that case.
  - "JUGAR DE NUEVO" in the modal restarts the engine's internal state (new `initGame()`-equivalent call), not just React's placeholder counters.
- Canvas keeps its logical 800×600 resolution; scaled responsively via CSS (`max-width: 100%; height: auto`) to fit narrow viewports, consistent with the existing `.crt-screen` responsive behavior.
- Manual verification only, per the acceptance criteria below (no automated tests), consistent with spec 01.

### Not in scope

- Touch/mobile controls — the game stays keyboard-only; no on-screen d-pad or tap-to-shoot is added.
- Any gameplay changes or new mechanics beyond what's in `game.js` (no new power-ups, enemy types, sound, etc.).
- Real leaderboard/backend changes — score saving keeps using the existing `av_scores` localStorage mechanism from spec 01; no Supabase persistence in this spec.
- Retrofitting the dispatcher pattern's fake-simulation path, or any other catalog game (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`) — they keep today's placeholder behavior untouched, including `rocas`, which stays as a separate, still-fake entry despite the thematic overlap with `asteroids`.
- Sound/audio — the original template has none; none is added.
- Changes to `favicon.svg` or any other template-only asset not needed for in-app integration.

## Data Model

### `app/data/games.ts` — new entry

```ts
{
  id: "asteroids",
  title: "ASTEROIDS",
  short: "Sobrevive en un campo de rocas en gravedad cero.",
  long: "Pilota una nave triangular en el vacío absoluto de un campo toroidal. Dispara y rota para partir las rocas grandes en fragmentos cada vez más pequeños, recoge el power-up de disparo triple y sobrevive oleada tras oleada.",
  cat: "SHOOTER",
  cover: "cover-asteroids",
  color: "cyan",
  best: 38700,
  plays: "4.2K",
}
```

- `app/globals.css`: new `.cover-asteroids` rule (background gradient + `::after`/`::before` accents), following the same pattern as `.cover-rocas`/`.cover-invaders`.

### `components/games/asteroids/engine.ts` (ported, TypeScript)

```ts
export type AsteroidsState = "playing" | "dead" | "gameover";

export interface AsteroidsSnapshot {
  score: number;
  lives: number;
  level: number;
  state: AsteroidsState;
}

export class AsteroidsEngine {
  constructor(ctx: CanvasRenderingContext2D, width: number, height: number);
  update(dt: number): void;
  draw(): void;
  handleKeyDown(code: string): void;
  handleKeyUp(code: string): void;
  reset(): void;
  getSnapshot(): AsteroidsSnapshot;
}
```

- Internally owns `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp` classes and all constants (`RADII`, `SPEEDS`, `POINTS`, power-up tuning) ported 1:1 from `game.js`, with `W`/`H` taken from the constructor instead of module-level globals, and `keys`/`justPressed` as instance fields instead of `window`-scoped state.
- No `localStorage`/persistence inside the engine itself — score saving stays entirely in `GamePlayer`/`useAuth().saveScore`, unchanged from spec 01.

### `components/games/asteroids/asteroids-canvas.tsx` (new, client component)

```ts
export interface AsteroidsCanvasProps {
  paused: boolean; // controlled by GamePlayer's PAUSA button
  onSnapshot: (snapshot: AsteroidsSnapshot) => void; // fired once per frame
  onGameOver: (finalScore: number) => void; // fired once when lives reach 0
  restartSignal: number; // bump to force engine.reset() (e.g. "JUGAR DE NUEVO")
}
```

- Owns the `<canvas width={800} height={600}>`, `tabIndex={0}` for focus capture, keyboard listeners scoped to the canvas element (not `window`), and the `requestAnimationFrame` loop (paused via a ref check on `paused`, not by unmounting).

### `components/game-player.tsx` — dispatcher change

- No new exported types; `GamePlayer` branches internally on `game.id === "asteroids"` to render `AsteroidsCanvas` + real-state HUD, vs. today's fake-simulation JSX for every other id.

## Implementation Plan

1. **Catalog entry** — Add the `asteroids` object to `app/data/games.ts` (`GAMES`) and the `.cover-asteroids` rule to `app/globals.css`. System still builds; `/` and `/juegos/asteroids` now show the new card/detail page using the existing (unmodified) template/placeholder player.

2. **Engine port** — Create `components/games/asteroids/engine.ts`: port `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`, constants, and the `AsteroidsEngine` class (constructor, `update`, `draw`, `handleKeyDown/Up`, `reset`, `getSnapshot`) 1:1 from `game.js`, replacing module-level globals (`W`, `H`, `keys`, `justPressed`, `ctx`) with instance state. No UI yet; verify via a throwaway unit script or manual `console.log` that `getSnapshot()` returns sane values is optional — the real check happens in step 3.

3. **Canvas component** — Create `components/games/asteroids/asteroids-canvas.tsx`: mounts the `<canvas>`, instantiates `AsteroidsEngine` in a `useEffect`, runs the `requestAnimationFrame` loop (skipping `update()` while `paused` is true), attaches keyboard listeners on the canvas element (focus-gated, with `preventDefault()` on ArrowUp/ArrowLeft/ArrowRight/Space), calls `onSnapshot` each frame, calls `onGameOver` once when `state` transitions to `"gameover"`, and calls `engine.reset()` when `restartSignal` changes. Drop it into a scratch page or the existing `/juegos/asteroids/jugar` route temporarily to confirm the game runs, wraps, shoots, splits asteroids, and shows the canvas's own HUD/GAME OVER overlay correctly, with responsive CSS scaling.

4. **GamePlayer dispatcher** — Modify `components/game-player.tsx` to branch on `game.id === "asteroids"`: render `AsteroidsCanvas` inside the existing `.crt-screen` container (instead of the static `.game-arena` divs), feed `onSnapshot` into the existing score/lives/level display, wire **PAUSA** to the `paused` prop, wire **FIN** and `onGameOver` to the existing end-of-game modal (pre-filled with the real score), and wire "JUGAR DE NUEVO" to bump `restartSignal` (instead of resetting the fake counters). All other game ids continue through the untouched fake-simulation path.

5. **Cross-check pass** — Play a full run end-to-end: navigate `/` → `/juegos/asteroids` → `/juegos/asteroids/jugar`, verify focus/keyboard capture, pause/resume, level progression across multiple waves, triple-shot power-up pickup, dying down to 0 lives opening the save-score modal with the correct score, saving it and confirming it appears in `/salon-de-la-fama`, restarting a run, and exiting back to `/juegos/asteroids`. Confirm no regressions to the other catalog games' placeholder behavior and no console errors.

## Acceptance Criteria

- [ ] `/` shows an "ASTEROIDS" card (SHOOTER category) linking to `/juegos/asteroids`.
- [ ] `/juegos/asteroids` renders the Game Detail page (cover, tags, description, leaderboard) with "Play Now" linking to `/juegos/asteroids/jugar`.
- [ ] `/juegos/asteroids/jugar` renders the real, playable game: the ship rotates/thrusts with arrows, shoots with Space, wraps toroidally, asteroids split into smaller fragments when shot and award points per size, and the triple-shot power-up can be picked up and expires after its duration.
- [ ] Keyboard input only affects the game when the canvas has focus, and doesn't scroll the page while playing.
- [ ] The canvas's own HUD (SCORE/NIVEL/lives, GAME OVER overlay) still renders as in the original, alongside React's `player-hud`, which shows the same score/lives/level values in real time (not the fake incrementing simulation).
- [ ] Clicking **PAUSA** freezes the game (ship/asteroids/bullets stop moving) and shows the existing "EN PAUSA" overlay; **REANUDAR** resumes exactly where it left off.
- [ ] Clicking **FIN**, or losing all 3 lives in-game, opens the existing save-score modal pre-filled with the real final score reached in that run.
- [ ] Saving the score from that modal writes to `localStorage` (`av_scores`) with the game id `asteroids`, and it appears correctly on `/salon-de-la-fama` under the Asteroids tab.
- [ ] "JUGAR DE NUEVO" fully resets the engine (score 0, 3 lives, level 1, fresh asteroid field) and the game is immediately playable again.
- [ ] On a narrow/mobile viewport, the canvas scales down visually (no horizontal overflow) while gameplay coordinates/logic remain unaffected.
- [ ] All other catalog games' player screens are unchanged (still show the fake incrementing simulation).
- [ ] No console errors/warnings during a full play-through (start → play → pause → die → save → restart → exit).
- [ ] `npm run build` completes with no TypeScript or lint errors.

## Decisions Taken and Discarded

- **New `asteroids` catalog entry instead of reusing `rocas`.** `rocas` already describes similar theming ("Pulveriza asteroides en gravedad cero"), but it's a separate, still-fake catalog entry from spec 01. Reusing it would tie this spec's real implementation to a card whose copy/best score were written for the placeholder, and would require reworking spec 01's data untouched by this spec. Decided to add a distinct `asteroids` entry and leave `rocas` exactly as-is, accepting the thematic duplication for now.
- **Port to TypeScript inside a React component, not an iframe or near-untouched script copy.** An iframe would keep the original 100% intact but fully disconnect it from `GamePlayer`'s HUD/pause/save-score flow, which the user explicitly wants wired to the real game state. A near-untouched JS copy was considered as lower-risk, but porting to TS classes owned by a client component is the only option that lets `GamePlayer` read live score/lives/level and drive pause/restart, so it was chosen despite being the highest-effort option.
- **`GamePlayer` becomes a per-`game.id` dispatcher rather than a generic pluggable engine interface.** A fully generic "game engine" abstraction (common interface all future games implement) was considered, but with only one real game so far, designing that abstraction now would be speculative. Decided to hard-code the `asteroids` branch and defer any generalization to a future spec once a second real game exists.
- **Canvas keeps drawing its own HUD/GAME OVER overlay, duplicating React's `player-hud`.** Stripping the canvas's internal HUD to avoid duplication was considered, but the user chose to keep both as-is: it preserves visual fidelity to the original prototype and avoids extra engine changes just to remove text rendering, at the cost of showing the same score/lives/level twice on screen.
- **Canvas requires focus (click/`tabIndex`) to capture keyboard input, over always-on `preventDefault`.** A global, always-active listener was considered simpler, but would risk hijacking arrow keys/Space anywhere on the page (e.g. focused inputs elsewhere, if the player screen is ever embedded differently). Requiring explicit focus is more consistent with how embedded games typically behave and keeps the rest of the site unaffected.
- **No automated tests.** Consistent with spec 01's decision — acceptance is verified manually per the checklist above.

## Identified Risks

- **Porting ~510 lines of tightly-coupled, module-global game logic into instance state can introduce subtle bugs** (e.g. `this` binding issues, stale closures in the `requestAnimationFrame` loop, or drift between the ported physics constants and the original feel). Mitigation: port class-by-class, keep numeric constants identical, and manually verify feel (thrust, rotation, wrapping, splitting) against the reference `README.md`/demo during step 3 before wiring the dispatcher.
- **Double HUD (React + canvas-drawn) could visually desync** if the per-frame `onSnapshot` callback lags behind the canvas's own internal draw of the same values, especially right at game-over or level-transition frames. Mitigation: fire `onSnapshot` synchronously within the same `update`/`draw` tick the canvas uses, so both HUDs read from the same frame's state.
- **Keyboard focus requirement may be non-obvious to players** (game looks idle until the canvas is clicked). Mitigation: acceptable per user decision; can be revisited with an on-canvas "click to play" hint in a future spec if it proves confusing in testing.
- **Next.js 16 API differences** (per `AGENTS.md`/`CLAUDE.md`) could affect how client components, refs, or the canvas element behave compared to the engineer's Next.js 13/14 assumptions. Mitigation: check `node_modules/next/dist/docs/01-app/` for client-component and ref-related guidance before implementing steps 3–4, per project convention.
