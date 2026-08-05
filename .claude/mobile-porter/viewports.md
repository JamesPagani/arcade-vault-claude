# Viewport ledger — `mobile-porter`

Append-only. Most recent entry last. Protocol in [README.md](./README.md).

One entry per agent invocation — that is, per game ported.

## 2026-08-04 — frogger

`--crt-aspect` was absent from `app/globals.css` — this is the first run, so it built the shared seam
(README's five bullets) before touching Frogger specifically. Frogger's 520×600 canvas is 520×640 (0.8125,
taller than wide), the only one of the four playable games that isn't 4:3 or wider-than-tall, so its
`.crt-screen` was clipping/stretching under the hardcoded `aspect-ratio: 4 / 3`.

- **Seam:** built for the first time (no prior ledger entry). All five pieces from the README: `.hud-actions`
  `flex-wrap: wrap`; `.player-hud` padding/gap → `clamp()` anchored at the old fixed values (14px/18px/16px)
  as the max; `.crt` padding/border-radius → `clamp()` anchored at 24px/28px as the max; `.crt-screen`'s
  `aspect-ratio` now reads `var(--crt-aspect, 4 / 3)`; `.touch-controls`/`.dpad`/`.action-buttons`/`.action-btn`
  → `clamp()` sizing plus `padding-bottom: max(16px, env(safe-area-inset-bottom))` on `.touch-controls`; a
  `@media (max-height: 420px)` block tightening `.player-hud`, `.crt`, `.crt-bottom`, `.touch-controls`.
- **Per-game changes:** `frogger-canvas.tsx`'s mount effect now does
  `canvas.closest('.crt-screen')?.style.setProperty('--crt-aspect', '520 / 640')`, cleaned up on unmount via
  `removeProperty`. This was necessary rather than a literal inline style on a "canvas wrapper div," because
  CSS custom properties only cascade **downward** — `.crt-screen` is rendered by the shared, per-game-agnostic
  `game-player.tsx` as an _ancestor_ of whatever the registry's `Canvas` component renders, so a property set
  on a child inside the canvas file cannot influence its own ancestor's computed `aspect-ratio` through normal
  CSS inheritance. Setting it imperatively on the actual `.crt-screen` DOM node found via `closest()`, scoped
  to that one mounted instance and reverted on unmount, achieves the same effect without a `game.id` branch in
  `game-player.tsx`. No second canvas, so the Tetris-style "competing `width: 100%`" wrapper problem does not
  apply here.
- **Breakpoints touched:** no new width breakpoints. Reused the existing `pointer: coarse` gate for
  `.touch-controls` (untouched, per spec 10 — never converted to a width query). Added exactly one new
  breakpoint, `@media (max-height: 420px)`, sized so it catches 844×390 (390 < 420) but not 390×844 or
  768×1024 — chosen as "a little above the worst-case landscape phone height" rather than an exact 390 match,
  so slightly taller landscape devices get the same relief.
- **Height budget:**
  - **360×640** (portrait): nav ≈ 53px (mobile nav padding 12px×2 + 28px logo mark + 1px border) + `.player-hud`
    ≈ 112px (padding ≈ 2×10.8px at `3vw` + stat/action rows ≈ 72px + 18px margin) + `.crt` ≈ 405px (padding
    ≈ 2×14.4px at `4vw` + `.crt-screen` at width ≈ 283px → height ≈ 283 / 0.8125 ≈ 349px + `.crt-bottom` row
    - its 14px margin) + `.touch-controls` ≈ 184px (dpad clamped to its 140px floor + padding + margin) ≈
      **754px total** against a 640px viewport. This does **not** clip — `.crt-screen`'s `overflow: hidden` now
      matches the canvas's real ratio exactly, so nothing inside it is cut off — but the page needs to scroll
      roughly 114px to reach the touch bar. That's the accepted "scroll gracefully, never clip" outcome the
      README allows, not a regression from before (before this run the aspect mismatch would have clipped the
      canvas itself, which is strictly worse).
  - **844×390** (landscape, `max-height: 420px` active): nav ≈ 57px (width > 840px keeps the desktop nav) +
    `.player-hud` ≈ 58px (short-viewport padding tightened to ≈7.8px×2 + one unwrapped row ≈ 34px + 8px margin)
    - `.crt` ≈ 976px (short-viewport padding ≈ 7.8px×2 + `.crt-screen` at width ≈ 780px → height ≈
      780 / 0.8125 ≈ 960px, since nothing currently caps `.crt-screen`'s own height for an extreme aspect ratio
      in a wide-but-short viewport) + `.touch-controls` ≈ 178px ≈ **≈1269px total** against a 390px viewport.
      Frogger's height budget is dominated entirely by its own tall canvas, not by HUD/touch-bar chrome — the
      landscape tightening this run added helps the _other_ three games (which are 4:3, so their `.crt-screen`
      height tracks viewport _width_, not the reverse) far more than it helps Frogger.
- **Left alone:** `.dpad`'s min bound was raised from the old implicit 132px to 140px (documented inline in
  `app/globals.css`) — at 132px the three grid cells minus their 4px gaps are ≈41.3px each, under the 44px
  floor this run is required to hold. `.touch-controls` only ever renders under `pointer: coarse`, which real
  desktop mice never satisfy, so this is not a literal "desktop regression" (nothing changes for a mouse-driven
  1440×900 session) — it only grows the touch bar slightly on a coarse-pointer desktop, which is the same
  edge case spec 10 already flagged and accepted. Did not touch `GAME_TOUCH_CONTROLS.frogger` (all four dpad
  slots enabled, A/B disabled and dimmed per existing registry entry) or `engine.ts`/`skins.ts` (mid-flight,
  uncommitted `skin-designer` work already present in the tree before this run started — left untouched).
- **Risks:** Frogger's 520×640 canvas is portrait-shaped, the opposite problem from Tetris's 300×600 — in a
  _landscape_ phone viewport (844×390), the canvas's rendered height balloons to roughly 2.5× the viewport
  height because `.crt-screen`'s width tracks the wide viewport while its height is forced up by the tall
  aspect ratio. Nothing in this run's seam caps `.crt-screen`'s own height for this case; the page will need a
  long scroll to reach the touch bar in landscape. A future run could consider a `max-height` clamp on
  `.crt-screen` for extreme (non-4:3, non-landscape-shaped) aspect ratios specifically inside the
  `max-height: 420px` block, but that wasn't added here since it isn't in the README's literal recipe and
  risks squeezing the canvas away from its native ratio's visual proportions. Flagging for the next visual
  check and the next agent to read before changing this block.
