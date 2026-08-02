# 02 - DUELO DE RANAS: bonus insects and round timer pressure

- **Status:** Draft
- **Dependencies:** 05-asteroids-integration (engine/canvas contract), 06-games-and-scores-supabase (games/scores schema), 01-duelo-de-ranas-integration (base race engine, catalog entry, registry)
- **Date:** 2026-08-02
- **Objective:** Add a second scoring dimension (collectible bonus insects, a classic Frogger scoring device) and per-round time pressure to the base dueling-race engine, without changing the catalog entry, Supabase row, or snapshot shape established in `01`.

## Scope

### In scope

- Bonus insects (flies), spawned only in the player's column: at a random empty, currently-unoccupied-by-a-hazard cell within the road or safe rows, at a random interval within each round (at most one on-screen fly at a time). A fly is visually distinct (small pulsing dot, canvas-drawn) and grants a flat bonus to `score` the instant the player's frog hops onto its cell; it despawns either on pickup or after a fixed time-to-live if never collected (no penalty for missing one).
- Per-round time pressure: a countdown timer starts the instant a new round begins (visible only via the canvas-drawn HUD — it is internal engine state, not a new snapshot field, since `getSnapshot()`'s shape is fixed). If the timer reaches zero before the player reaches the goal row, the player loses one life and resets to the round's starting row, identically to a car/drowning collision — the AI is unaffected by the player's timer and continues its own independent progress toward the goal.
- Timer duration shortens slightly every round (paired with the existing per-round speed/density scaling from `01`), reinforcing the same escalating difficulty curve rather than introducing an unrelated one.
- HUD addition: a canvas-drawn countdown readout (e.g. a shrinking bar or numeric seconds) alongside the existing score/lives/level readout from `01`.

### Not in scope

- Any change to the `duelo-de-ranas` Supabase row, `app/data/games.ts` entry, cover art, or `GAME_ENGINES` registration — all already complete after `01`.
- Any change to `DueloSnapshot`'s shape (`score`, `lives`, `level`, `state` stay exactly as `01` defined them) — the round timer is derivable/re-creatable engine-internal state, not part of the fixed snapshot contract.
- Insects/timer pressure for the AI column — the AI is only ever affected by the shared per-round speed/density scaling already established in `01`, not by a symmetrical timer or its own bonus insects (kept asymmetric on purpose, see Decisions).
- Multiple simultaneous on-screen flies, fly point-value tiers, or a combo/streak multiplier for consecutive fly pickups (flat bonus only).
- Sound effects, mouse control, or any change to the discrete-hop movement/collision rules established in `01`.

## Data Model

No Supabase schema or catalog changes — this spec is engine-only. The relevant shapes from `01` are extended internally as follows.

### Engine snapshot (unchanged from `01`)

```ts
export type DueloState = "playing" | "gameover";

export interface DueloSnapshot {
  score: number; // now also += FLY_BONUS_POINTS per fly collected, in addition to 01's row-advance/round-win scoring
  lives: number; // now also decremented when the per-round timer reaches zero, in addition to 01's collision causes
  level: number; // unchanged: round number
  state: DueloState;
}
```

### New internal engine state (not exposed via `getSnapshot()`)

- `fly: { col: number; row: number; ttl: number } | null` — the single active fly, or `null` when none is spawned; `ttl` counts down and despawns the fly (not the player) when it hits zero.
- `flySpawnTimer: number` — counts down to the next fly spawn attempt once the current fly (if any) is gone.
- `roundTimer: number` — counts down from a per-round `roundTimeLimit` (shortened each round alongside `01`'s existing speed/density scaling); resets to the new round's `roundTimeLimit` every time a round resolves or the player loses a life within a round.

### Canvas component props

Unchanged from `01` — `DueloDeRanasCanvasProps` (`paused`, `onSnapshot`, `onGameOver`, `restartSignal`) is not touched by this spec; the countdown/fly HUD lives entirely inside the engine's `draw()`.

## Implementation Plan

1. **Engine extension (`components/games/duelo-de-ranas/engine.ts`):** add `fly`, `flySpawnTimer`, `roundTimer`, `roundTimeLimit` as new instance fields initialized in the constructor and in `reset()`; add fly spawn/collision/despawn logic to `update(dt)` (spawn attempt when `flySpawnTimer` elapses and no fly is active, pick a random empty road/safe-row cell in the player's column not currently occupied by an obstacle, collision check against the player's cell each tick, TTL despawn); add round-timer countdown to `update(dt)` gated by `paused` exactly like `01`'s existing timers, with the zero-reached branch reusing `01`'s existing life-loss/reset-to-round-start code path rather than duplicating it.
2. **HUD extension:** add the countdown readout and fly rendering to `draw()`, positioned so it doesn't overlap `01`'s existing score/lives/level HUD text.
3. **Round-transition wiring:** when a round resolves (either frog reaches the goal, per `01`'s existing `roundResolved` logic), reset `roundTimer` to that round's `roundTimeLimit` (computed with the same difficulty-scaling formula as `01`'s lane speed/density, so the two curves move together) and clear any active `fly`.
4. **Cross-check pass:** manual play-through confirming fly spawn/pickup/despawn/TTL behavior, timer countdown visible and correctly shortening round-over-round, a timer expiry costing exactly one life and resetting the player (not the AI) to the round start, pause freezing both the fly TTL and the round timer, restart clearing any active fly and resetting the timer to round 1's base duration; `npm run build` clean; confirm `01`'s full acceptance criteria still hold unregressed (this spec must not break the base race, lives, or scoring already shipped).

## Acceptance Criteria

- [ ] A bonus fly occasionally appears at a random empty cell in the player's road/safe rows, at most one at a time.
- [ ] Hopping the player's frog onto the fly's cell grants a flat bonus to `score` and despawns the fly immediately.
- [ ] An uncollected fly despawns after its time-to-live elapses with no penalty to the player.
- [ ] A visible round countdown (canvas-drawn) starts fresh at the beginning of every round and shortens slightly round-over-round in step with `01`'s existing speed/density scaling.
- [ ] The countdown reaching zero costs the player exactly one life and resets the player's frog to the round's starting row — identical in effect to a car/drowning collision from `01` — while the AI's position and progress are unaffected.
- [ ] The AI never spawns or benefits from flies, and is never subject to the round timer — its only difficulty lever remains `01`'s shared per-round lane speed/density scaling.
- [ ] PAUSA freezes the fly's TTL countdown and the round timer identically to freezing the rest of the simulation; REANUDAR resumes both from the exact same remaining values.
- [ ] JUGAR DE NUEVO (restart) clears any active fly and resets the round timer to round 1's base duration, alongside every reset already required by `01`.
- [ ] `getSnapshot()`'s shape is unchanged (`score`, `lives`, `level`, `state`) — no new field was added to accommodate the timer or fly state.
- [ ] Every acceptance criterion from `01-duelo-de-ranas-integration.md` still passes unregressed (catalog card, detail page, `/jugar` route, base race/collision/round mechanics, save-score flow, leaderboard ranking, responsive canvas, no console errors).
- [ ] `npm run build` completes clean.

## Decisions Taken and Discarded

- **Flies only in the player's column, not the AI's.** Considered giving the AI symmetric flies for visual fairness, but discarded: the AI has no use for a score bonus (it doesn't have its own leaderboard entry), and giving the AI a picked-up "bonus" would need fabricated logic with no gameplay payoff — asymmetric by design, not an oversight.
- **Timer costs a life via the exact same code path as `01`'s collision losses**, rather than a parallel "timeout" state, to avoid duplicating the life-loss/reset-to-round-start logic and to keep `DueloState` at exactly two values (`"playing"`/`"gameover"`) as `01` defined it.
- **No snapshot shape change.** The round timer and fly are real gameplay state but not part of the fixed `{score, lives, level, state}` contract — documented explicitly since it would be easy to reflexively add a `timeLeft` field; the HUD reads them directly from engine-internal state inside `draw()`, the same way `01`'s HUD already renders info (round number, TÚ/IA labels) that isn't part of the snapshot either.
- **Flat bonus only, no tiered fly values or combo multiplier.** A tiered/combo system was considered as an alternative for "a second scoring dimension" but discarded as scope creep beyond a single genuine increment — flat-value collectibles are the same simplicity level as `01`'s round-win bonus.
- **Single on-screen fly at a time.** Keeps spawn logic and collision checks trivial (no fly-list management) and avoids the fly becoming a dominant scoring strategy over the core race mechanic.

## Identified Risks

- **Round-timer reset must be driven by the same round-transition point `01` already uses (`roundResolved`), not a second independent trigger.** Wiring a separate "new round started" event risks the timer and the lane-difficulty scaling drifting out of sync (e.g. timer resets but lanes don't re-scale, or vice versa) if the two aren't reset from the same call site.
- **Fly spawn-cell validity must be checked against the _current_ obstacle layout, not a stale snapshot of the lanes.** Since `01`'s lanes continuously scroll, a cell that was empty when the spawn attempt began could have a car in it by the time the fly actually renders in the same tick if the check and the spawn aren't done atomically within a single `update(dt)` call.
- **Timer-driven life loss and the round-win check can both become true in the same tick** (e.g. the player reaches the goal on the exact tick the timer would have expired) — the implementation must decide a deterministic precedence (goal-reached should win over timer-expiry, since the player physically succeeded) or the frog could be simultaneously scored for winning the round and penalized for running out of time.
