# Memory and contract for the `mobile-porter` agent

This directory is the long-term memory of the `mobile-porter` agent (`.claude/agents/mobile-porter.md`). The
agent keeps nothing between sessions except these files, and reads them **before** touching any game.

## What lives where

| File           | What it is                                                            | Mutability                           |
| -------------- | --------------------------------------------------------------------- | ------------------------------------ |
| `README.md`    | This contract: the viewport matrix, the seam, the per-game recipe     | Only changes if the protocol changes |
| `viewports.md` | Ledger: which game, which breakpoints, and the measured height budget | **Append-only**                      |

The layout code itself **does not live here**. It lives in `app/globals.css` (the shared responsive seam) and
in each game's own `<slug>-canvas.tsx` (the per-game fit). This directory only keeps the reasoning, which is
exactly what the code can't say on its own.

## The viewport matrix

Every run is checked against the same five targets. Each one exists to catch a specific failure mode — don't
drop one just because a game "obviously" passes it.

| Viewport | What it represents    | What it stresses                                                   |
| -------- | --------------------- | ------------------------------------------------------------------ |
| 360×640  | Small Android phone   | The hard **width** case — HUD wrapping, `.crt` padding, dpad size  |
| 390×844  | Modern iPhone         | A realistic mid-size phone, portrait                               |
| 844×390  | Same phone, landscape | The hard **height** case — spec 10's flagged, untested risk        |
| 768×1024 | Tablet, portrait      | `pointer: coarse` with room to spare — confirms nothing broke here |
| 1440×900 | Desktop               | The **no-regression** reference — nothing here may change          |

## The height budget

On a short viewport, these bands stack and must fit above the fold (or scroll gracefully, never clip):

1. Site nav (`.av-nav`, outside this agent's scope but part of the budget — read its height, don't touch it).
2. `.player-hud` — the stat row plus `.hud-actions`, which wraps to two lines on narrow screens once the seam
   adds `flex-wrap`.
3. `.crt` — its own padding and border, plus `.crt-screen`'s content height, which is the canvas's rendered
   height at the current viewport width under `width: 100%; max-width: <native>px; height: auto`.
4. `.crt-bottom` — the fixed 8px status row.
5. `.touch-controls` — only present under `pointer: coarse`, sized by the seam's `clamp()` rules.
6. `env(safe-area-inset-bottom)` on devices with a home indicator.

Compute the actual pixel sum for 360×640 and for 844×390 every run, and record it in the ledger. A claim that
"it fits" without the arithmetic is not verification — see the agent's Verification section.

## Scope: the play screen only

**In scope** (may edit): `.av-player`, `.player-hud`, `.hud-actions`, `.hud-stat`, `.crt`, `.crt-screen`,
`.crt-content`, `.crt-bottom`, `.touch-controls`, `.dpad`, `.dpad-btn`, `.action-buttons`, `.action-btn`,
`.modal`, `.modal-bd`, `.final`, `.input-row`, `.actions` — and the canvas wrapper/inline style inside the
target game's `<slug>-canvas.tsx`.

**Out of scope** (never edit): `:root`, `.av-nav`, `.hamburger`, `.av-mobile-panel`, `.av-mobile-backdrop`,
`.cover-*`, anything under `/juegos` catalog listing, `/salon-de-la-fama`, `/`, or `/acerca-de`. Those are
site chrome or other pages, and spec 10 deliberately kept its own scope on the play screen — this agent
inherits that boundary.

## The responsive seam

Built once, on the first run that finds `--crt-aspect` absent from `app/globals.css`:

1. `.hud-actions { flex-wrap: wrap; }` and `.player-hud`'s padding/gap converted to `clamp()` ranges anchored
   at the current fixed values as the maximum.
2. `.crt`'s `padding` and `border-radius` converted to `clamp()`, anchored the same way.
3. `.crt-screen`'s `aspect-ratio` reads a custom property: `aspect-ratio: var(--crt-aspect, 4 / 3);`. Games
   that need a different ratio set `--crt-aspect` inline on their own canvas wrapper — never a selector keyed
   to `game.id` in `game-player.tsx`.
4. `.touch-controls`, `.dpad`, `.dpad-btn`, `.action-buttons`, `.action-btn` converted to `clamp()` sizing,
   holding ≥44px effective touch target at the smallest size, plus
   `padding-bottom: max(16px, env(safe-area-inset-bottom));` on `.touch-controls`.
5. A `@media (max-height: 420px)` (or similar — measure first) block that tightens vertical spacing in
   `.player-hud`, `.crt`, and `.crt-bottom` for the landscape-phone case.

## The per-game recipe

For the target game only:

1. Read its native canvas dimensions from `<slug>-canvas.tsx` (the `width`/`height` JSX attributes — never
   change these).
2. If its aspect ratio isn't 4:3, set `--crt-aspect` inline on its canvas wrapper to the native ratio.
3. If it has more than one canvas (Tetris), fix the wrapper's flex/grid so neither canvas claims `width: 100%`
   of the row — give the secondary canvas a fixed or `clamp()`-based basis instead, so it doesn't compete with
   the main canvas for space and doesn't wrap onto its own line at desktop widths.
4. Re-run the height budget for this specific game's canvas height at 360×640 and 844×390.

## Per-game hazards

Verify against the code every time, not against this table — it records what was true as of the dates in
`viewports.md`, not a permanent fact.

| Game        | Real work                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `asteroids` | 800×600, already 4:3 — seats cleanly in the default `--crt-aspect`. Touch bar shows ↓ and B dimmed; confirm they don't shift the dpad/action-button layout when inert.                                                                                                                                                                                                                                                                       |
| `arkanoid`  | 800×600, already 4:3. Touch bar shows four of six slots dimmed (↑, ↓, A, B) — confirm the dpad still reads as a cross shape rather than looking broken with half its buttons dead.                                                                                                                                                                                                                                                           |
| `snake`     | 800×600, already 4:3. Touch bar shows A/B dimmed only; full dpad is live. Lowest-risk of the four.                                                                                                                                                                                                                                                                                                                                           |
| `tetris`    | **The real defect.** Main canvas 300×600 (1:2) plus a 120×120 "next piece" canvas, both `width: 100%` inside a flex row, inside a 4:3 `overflow: hidden` frame — the playfield clips top/bottom and the next-piece preview wraps unpredictably. Needs its own `--crt-aspect` (roughly the combined wrapper's true ratio, not the main canvas's alone) and a wrapper that gives the next-piece canvas a fixed basis instead of `width: 100%`. |

## Format of `viewports.md`

```markdown
## YYYY-MM-DD — <game>

One sentence of context: what was broken, and in which viewport.

- **Seam:** which shared pieces this run built, or found already built
- **Per-game changes:** what was adjusted on the canvas and its wrapper
- **Breakpoints touched:** each one with its reason
- **Height budget:** the numbers computed at 360×640 and 844×390
- **Left alone:** what was deliberately not touched, and why
- **Risks:** what the next run should watch
```

The date comes from `date +%F`, never guessed. Being append-only, a past entry is never edited: a later run
that changes a breakpoint writes a new entry that supersedes the old one and says what changed.
