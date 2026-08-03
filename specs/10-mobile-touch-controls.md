# 10 - Mobile Touch Controls: D-pad and A/B buttons for all playable games

- **Status:** Draft
- **Dependencies:** 05-asteroids-integration (canvas/engine contract), 07-tetris-integration, 08-arkanoid-integration, 09-snake-integration (canvas/engine contract of the 4 existing games)
- **Date:** 2026-08-03
- **Objective:** Add touch controls (directional D-pad + A/B action buttons) to the four playable games, shown automatically on touch-pointer devices and coexisting with keyboard input, via a centralized per-game declarative mapping.

## Scope

### In scope

- Generic `TouchControls` component rendering a D-pad (cross layout: ↑/↓/←/→) plus A/B action buttons, shown only when the device's primary pointer is coarse (touch), below the canvas.
- New `GAME_TOUCH_CONTROLS` map in `components/games/registry.ts`, one entry per game (`asteroids`, `tetris`, `arkanoid`, `snake`), each slot declaring `{ code, mode: "hold" | "tap", enabled }`.
- Each `*-canvas.tsx` exposes `handleKeyDown`/`handleKeyUp` imperatively (via `forwardRef` + `useImperativeHandle`) so `TouchControls` calls the engine directly — no synthetic `KeyboardEvent`s.
- `GamePlayer` renders `TouchControls` alongside the existing canvas, wired through the new ref.
- Disabled buttons (e.g. ↓ on Arkanoid, both A/B on Snake) render dimmed/inert, not hidden.
- "Hold" buttons call `handleKeyDown` on touch-start and `handleKeyUp` on touch-end/cancel; "tap" buttons call `handleKeyDown` once on touch-start and `handleKeyUp` on touch-end, with no repeat while held.

### Not in scope

- Any change to keyboard behavior on desktop — coexists unchanged.
- Swipe/gesture-based controls (D-pad and buttons only).
- Any change to the mock/placeholder games (they have no real engine to wire).
- Visual redesign of `GamePlayer`'s existing HUD beyond adding the new control bar.
- Haptic feedback / vibration on tap.

## Data Model

### Touch control mapping (`components/games/registry.ts`)

```ts
export type TouchButtonSlot = "up" | "down" | "left" | "right" | "a" | "b";

export interface TouchButtonMapping {
  code: string; // e.g. "ArrowUp", "Space" — same values as each engine's handleKeyDown/Up
  mode: "hold" | "tap";
  enabled: boolean;
}

export type GameTouchControls = Record<TouchButtonSlot, TouchButtonMapping>;

export const GAME_TOUCH_CONTROLS: Record<string, GameTouchControls> = {
  asteroids: {
    up: { code: "ArrowUp", mode: "hold", enabled: true },
    down: { code: "ArrowDown", mode: "hold", enabled: false },
    left: { code: "ArrowLeft", mode: "hold", enabled: true },
    right: { code: "ArrowRight", mode: "hold", enabled: true },
    a: { code: "Space", mode: "hold", enabled: true },
    b: { code: "Space", mode: "hold", enabled: false },
  },
  arkanoid: {
    up: { code: "ArrowUp", mode: "hold", enabled: false },
    down: { code: "ArrowDown", mode: "hold", enabled: false },
    left: { code: "ArrowLeft", mode: "hold", enabled: true },
    right: { code: "ArrowRight", mode: "hold", enabled: true },
    a: { code: "", mode: "tap", enabled: false },
    b: { code: "", mode: "tap", enabled: false },
  },
  snake: {
    up: { code: "ArrowUp", mode: "hold", enabled: true },
    down: { code: "ArrowDown", mode: "hold", enabled: true },
    left: { code: "ArrowLeft", mode: "hold", enabled: true },
    right: { code: "ArrowRight", mode: "hold", enabled: true },
    a: { code: "", mode: "tap", enabled: false },
    b: { code: "", mode: "tap", enabled: false },
  },
  tetris: {
    up: { code: "ArrowUp", mode: "tap", enabled: true }, // rotate — fires once per touch, never repeats while held
    down: { code: "ArrowDown", mode: "hold", enabled: true }, // soft drop
    left: { code: "ArrowLeft", mode: "hold", enabled: true },
    right: { code: "ArrowRight", mode: "hold", enabled: true },
    a: { code: "Space", mode: "tap", enabled: true }, // hard drop — fires once per touch
    b: { code: "KeyX", mode: "tap", enabled: false }, // redundant alt-rotate key, left disabled
  },
};
```

### Imperative ref contract (`components/games/registry.ts`)

```ts
export interface GameControlsHandle {
  handleKeyDown: (code: string) => void;
  handleKeyUp: (code: string) => void;
}
// each *-canvas.tsx becomes forwardRef<GameControlsHandle, <Name>CanvasProps>
```

No Supabase/schema changes — this feature introduces no persisted data.

## Implementation Plan

1. **Registry additions** (`components/games/registry.ts`): add `TouchButtonSlot`, `TouchButtonMapping`, `GameTouchControls`, `GAME_TOUCH_CONTROLS` (all 4 games, per Data Model above), and `GameControlsHandle`. No behavior change yet — build stays green.
2. **Convert one canvas to forwardRef** (`asteroids-canvas.tsx`, chosen as the reference pattern per `reference.md`): wrap in `forwardRef<GameControlsHandle, AsteroidsCanvasProps>`, add `useImperativeHandle` calling `engineRef.current.handleKeyDown/Up` directly. Manual test: keyboard play still works identically.
3. **`components/games/touch-controls.tsx`**: generic component taking `{ controls: GameTouchControls, targetRef }`; renders the D-pad cross + A/B, dims disabled slots, wires `onTouchStart/End/Cancel` per slot's `mode` (hold → keydown on start, keyup on end/cancel; tap → keydown once on start, keyup on end, no repeat). Not yet mounted anywhere.
4. **CSS** (`app/globals.css`): `.touch-controls` bar + `.dpad`/`.dpad-btn`/`.action-btn` styles, `@media (pointer: coarse)` gate, matching the neon-arcade design system (via `/frontend-design`).
5. **Wire into `GamePlayer`**: hold a ref to the active `Canvas`, render `<TouchControls controls={GAME_TOUCH_CONTROLS[game.id]} targetRef={canvasRef} />` beneath the `.crt` block when `isReal`. Manual test: on a touch-emulated viewport, Asteroids responds to D-pad/A.
6. **Convert remaining 3 canvases** (`tetris`, `arkanoid`, `snake`) to `forwardRef` the same way as step 2, one at a time, verifying each still plays correctly by keyboard before moving on.
7. **Cross-check pass**: manual touch playthrough of all 4 games (Playwright touch emulation or a real mobile viewport), confirm keyboard still works unchanged on desktop, confirm disabled buttons are inert, `npm run build` clean.

## Acceptance Criteria

- [ ] On a touch-pointer viewport, a control bar (D-pad + A/B) renders below the canvas for all 4 playable games.
- [ ] On a mouse-pointer viewport (no coarse pointer), the control bar does not render.
- [ ] Asteroids: ↑/←/→/A respond while held (continuous thrust/rotate/fire); ↓/B are dimmed and inert.
- [ ] Arkanoid: ←/→ respond while held; ↑/↓/A/B are dimmed and inert.
- [ ] Snake: ↑/↓/←/→ respond while held; A/B are dimmed and inert.
- [ ] Tetris: ←/→/↓ respond while held (move/soft-drop); ↑ (rotate) and A (hard drop) fire exactly once per touch, not repeatedly while held; B is dimmed and inert.
- [ ] Releasing a "hold" button stops the corresponding action immediately (e.g. ship stops thrusting).
- [ ] Keyboard controls on desktop are unaffected — all 4 games play identically to before this spec.
- [ ] PAUSA/game-over/restart flows are unaffected by the presence of touch controls.
- [ ] No console errors during a touch playthrough of any of the 4 games.
- [ ] `npm run build` completes cleanly.

## Decisions Taken and Discarded

- **Unified D-pad + A/B layout across all 4 games**, with per-game slots disabled rather than a bespoke layout per game. Consistent muscle memory across the catalog; disabled slots absorb each game's smaller key set (e.g. Arkanoid only needs ←/→).
- **Direct imperative engine calls (`handleKeyDown`/`handleKeyUp` via `forwardRef`) instead of synthetic `KeyboardEvent`s.** Reuses the exact same engine entry points keyboard already uses, avoids the fragility of fabricating DOM events.
- **`pointer: coarse` detection over a width breakpoint.** Matches actual input capability (touch) rather than guessing from viewport width, so a narrow desktop window doesn't get touch controls and a large touch tablet does.
- **Touch and keyboard coexist unconditionally**, no mutual exclusion. Supports tablets with an attached keyboard; no engine change needed to arbitrate between the two input sources since both just call the same `handleKeyDown/Up`.
- **Per-button `mode: "hold" | "tap"` instead of a single global rule.** Some actions (thrust, move, soft-drop) should persist while held; others (rotate, hard-drop) must fire once regardless of hold duration — declared per slot in `GAME_TOUCH_CONTROLS`, decided per game during spec authoring.
- **Disabled buttons rendered dimmed/inert, not hidden.** Keeps the D-pad/A-B grid visually identical across games (consistent muscle memory) at the cost of a few inert buttons on simpler games like Arkanoid/Snake.
- **Centralized mapping in `registry.ts` over per-canvas exports.** One place to audit all 4 games' touch bindings; consistent with how `GAME_ENGINES` already centralizes registration.
- **No swipe/gesture controls.** Explicit buttons are unambiguous and match the classic-arcade aesthetic; gesture detection is a materially different (and riskier) input model, left out of scope.

## Identified Risks

- **`pointer: coarse` doesn't perfectly capture all devices.** Some touch laptops report a fine pointer as primary; those users would see no touch bar despite having a touchscreen. Accepted as a known edge case — matches standard web practice, not worth extra detection heuristics.
- **Touch bar height competes with viewport space on small phones in landscape.** The 800×600 (or 300×600 Tetris) canvas already scales via `maxWidth`/`height:auto`; adding a fixed-height bar below it may push content below the fold on short viewports. Implementation should keep the bar compact and test on a small-height mobile viewport, not just width.
- **`forwardRef` conversion touches all 4 existing canvas components.** Structural changes to already-shipped, working games carry regression risk; the plan mitigates this by converting and manually re-verifying one game at a time (steps 2 and 6) rather than all 4 at once.
- **Multi-touch edge cases (two buttons pressed at once, e.g. ← + A) are not explicitly handled beyond "each button tracks its own touch independently."** Standard `onTouchStart`/`onTouchEnd` per element should handle this correctly without extra logic, but it's worth a specific manual check during the cross-check pass.
