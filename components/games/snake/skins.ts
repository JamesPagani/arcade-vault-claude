import type { SkinId } from "@/components/games/skins";

export interface SnakePalette {
  /** Full-canvas background fill. */
  background: string;
  /** Snake head segment fill. */
  head: string;
  /** Snake body segment fill. */
  body: string;
  /** Faint grid line stroke. */
  gridLine: string;
  /** Arena wall stroke. */
  wall: string;
  /** HUD score / level text. */
  hudText: string;
  /** Game-over headline. */
  overlayTitle: string;
  /** Game-over subtitle (dimmer than the title in every skin). */
  overlaySub: string;
  /** ctx.shadowBlur applied to every drawn element. 0 disables glow entirely. */
  glowBlur: number;
}

export const SNAKE_PALETTES: Record<SkinId, SnakePalette> = {
  // Transcription of the literals that were hardcoded in engine.ts before the refactor.
  // Do not "improve" these values: classic must render exactly what shipped.
  classic: {
    background: "#000",
    head: "#4ade80",
    body: "#16a34a",
    gridLine: "rgba(255,255,255,0.05)",
    wall: "#4ade80",
    hudText: "#fff",
    overlayTitle: "#fff",
    overlaySub: "rgba(255,255,255,0.65)",
    glowBlur: 0,
  },

  // Site neons from :root in app/globals.css, copied literally (the engine cannot read CSS
  // variables): --cyan #00f5ff, --magenta #ff006e, --yellow #f5ff00, --green #00ff88,
  // --bg #0a0a0f, --ink #e6e9ff. The only collision pair that matters here is snake-vs-wall
  // (the fruit is an unskinned sprite, see palettes.md), so head/body/wall each get a
  // distinct hue and the wall never repeats the snake's own color as it did in classic.
  neon: {
    background: "#0a0a0f",
    head: "#00ff88",
    body: "#00f5ff",
    gridLine: "rgba(0, 245, 255, 0.08)",
    wall: "#ff006e",
    hudText: "#e6e9ff",
    overlayTitle: "#ff006e",
    overlaySub: "rgba(230, 233, 255, 0.65)",
    glowBlur: 12,
  },

  // Amber phosphor, four luminance steps of one hue (no second hue anywhere), matching the
  // scale already fixed on asteroids/arkanoid: L4 #ffe8b0 · L3 #ffb000 · L2 #c07800 ·
  // background #140d00. The player's own head is the brightest thing on screen (L4), the
  // body one step down (L3), and the wall it can collide with a further step down (L2), so
  // every collidable pair differs by at least one full step.
  retro: {
    background: "#140d00",
    head: "#ffe8b0",
    body: "#ffb000",
    gridLine: "rgba(255, 176, 0, 0.06)",
    wall: "#c07800",
    hudText: "#ffb000",
    overlayTitle: "#ffe8b0",
    overlaySub: "rgba(255, 176, 0, 0.65)",
    glowBlur: 6,
  },
};
