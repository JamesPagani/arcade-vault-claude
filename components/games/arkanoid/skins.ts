import type { SkinId } from "@/components/games/skins";

// Arkanoid is the hardest game to skin (see .claude/skin-designer/README.md's per-game hazard
// table): every visible entity in the template is a `drawImage` from spritesheet-breakout.png,
// and a brick's "color" is a sprite-atlas key, not a fillStyle. Classic keeps the spritesheet
// (`useSprites: true`) so it stays byte-identical to what shipped. Neon and retro switch to
// procedural drawing (`useSprites: false`): filled rects for bricks/paddle, an arc for the ball,
// and a fading flash instead of the sprite explosion animation. Tinting the spritesheet's
// offscreen canvas uniformly was considered and rejected — it collapses all six row hues into
// one and destroys the row distinction the template draws.

export interface ArkanoidPalette {
  /** Classic draws the spritesheet; neon/retro draw every entity procedurally instead. */
  useSprites: boolean;
  /** Full-canvas background fill. */
  background: string;
  /**
   * Fill color per brick row, keyed by the template's row-color name (`ROW_COLORS` in
   * engine.ts). Only read when `useSprites` is false — classic's rows are the spritesheet
   * frames, not these values.
   */
  brickColors: Record<string, string>;
  /** Paddle fill, procedural skins only. */
  paddle: string;
  /** Ball fill, procedural skins only. */
  ball: string;
  /** Procedural brick-break flash, replacing the sprite explosion animation. */
  explosionFlash: string;
  /** HUD score/level/lives text. */
  hudText: string;
  /** Game-over / win overlay dim layer. */
  overlayScrim: string;
  /** Game-over / win headline. */
  overlayTitle: string;
  /** Game-over / win subtitle (final score line). */
  overlaySubtitle: string;
  /** ctx.shadowBlur applied to every procedurally drawn element. 0 disables glow entirely. */
  glowBlur: number;
}

export const ARKANOID_PALETTES: Record<SkinId, ArkanoidPalette> = {
  // Transcription of the literals hardcoded in engine.ts before the refactor (line numbers of
  // the pre-refactor file): background #000 (451) · HUD text #fff (417) · overlay scrim
  // rgba(0,0,0,0.7) (435) · overlay title/subtitle #fff (438). Sprites remain the source of
  // truth for paddle, ball, bricks, and explosions, so `useSprites: true` and the procedural
  // fields below are never read in this skin; they're filled in with the template's own
  // row-color names so they document the mapping without a `string | undefined` in the type.
  classic: {
    useSprites: true,
    background: "#000",
    brickColors: {
      red: "red",
      yellow: "yellow",
      cyan: "cyan",
      magenta: "magenta",
      hotpink: "hotpink",
      green: "green",
    },
    paddle: "#fff",
    ball: "#fff",
    explosionFlash: "#fff",
    hudText: "#fff",
    overlayScrim: "rgba(0, 0, 0, 0.7)",
    overlayTitle: "#fff",
    overlaySubtitle: "#fff",
    glowBlur: 0,
  },

  // Site neons from :root in app/globals.css, copied literally (the engine cannot read CSS
  // variables): --bg #0a0a0f, --cyan #00f5ff, --magenta #ff006e, --yellow #f5ff00,
  // --green #00ff88, --ink #e6e9ff. Only four neons exist for six brick rows, so adjacent rows
  // cycle through them (cyan, magenta, yellow, green, cyan, magenta) — never repeating on a
  // row that touches it, even though non-adjacent rows can share a hue; row-vs-row is cosmetic,
  // not a collision pair. Paddle takes cyan to match the "player" hue asteroids' ship also
  // uses; ball takes the bright site ink so it always reads against any brick color behind it.
  neon: {
    useSprites: false,
    background: "#0a0a0f",
    brickColors: {
      red: "#00f5ff",
      yellow: "#ff006e",
      cyan: "#f5ff00",
      magenta: "#00ff88",
      hotpink: "#00f5ff",
      green: "#ff006e",
    },
    paddle: "#00f5ff",
    ball: "#e6e9ff",
    explosionFlash: "#f5ff00",
    hudText: "#e6e9ff",
    overlayScrim: "rgba(0, 0, 0, 0.7)",
    overlayTitle: "#ff006e",
    overlaySubtitle: "rgba(230, 233, 255, 0.65)",
    glowBlur: 10,
  },

  // Amber phosphor, the same family and the same four-step ramp already established for
  // asteroids: L4 #ffe8b0 (brightest) · L3 #ffb000 · L2 #c07800 · background #140d00. The two
  // player-controlled entities (paddle, ball) take L4 so they're always the brightest things on
  // screen; every brick — all six rows — flattens to one L2 fill, because retro distinguishes
  // by brightness, not hue, and row identity is cosmetic. That still clears the legibility gate:
  // bricks (L2) sit a full step below the paddle/ball (L4) they can collide with, and a full
  // step above the background.
  retro: {
    useSprites: false,
    background: "#140d00",
    brickColors: {
      red: "#c07800",
      yellow: "#c07800",
      cyan: "#c07800",
      magenta: "#c07800",
      hotpink: "#c07800",
      green: "#c07800",
    },
    paddle: "#ffe8b0",
    ball: "#ffe8b0",
    explosionFlash: "#ffe8b0",
    hudText: "#ffb000",
    overlayScrim: "rgba(0, 0, 0, 0.7)",
    overlayTitle: "#ffe8b0",
    overlaySubtitle: "rgba(255, 176, 0, 0.65)",
    glowBlur: 6,
  },
};
