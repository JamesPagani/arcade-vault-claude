import type { SkinId } from "@/components/games/skins";

export interface AsteroidsPalette {
  /** Full-canvas background fill. */
  background: string;
  /** Ship outline. */
  ship: string;
  /** Thruster flame outline (keeps its alpha: the flame is meant to read as translucent). */
  thruster: string;
  /** Bullet dot fill. */
  bullet: string;
  /** Asteroid polygon outline. */
  asteroid: string;
  /** Triple-shot pickup: box outline and its "3x" label. */
  powerUp: string;
  /** Explosion debris streaks, as an `r, g, b` triple — the engine interpolates the alpha. */
  particleRgb: string;
  /** HUD score / level text. */
  hudText: string;
  /** HUD triple-shot countdown text. */
  hudPowerUpText: string;
  /** Remaining-lives ship icons in the HUD. */
  lifeIcon: string;
  /** Game-over headline. */
  overlayTitle: string;
  /** Game-over subtitle (dimmer than the title in every skin). */
  overlaySub: string;
  /** ctx.shadowBlur applied to every drawn element. 0 disables glow entirely. */
  glowBlur: number;
}

export const ASTEROIDS_PALETTES: Record<SkinId, AsteroidsPalette> = {
  // Transcription of the literals that were hardcoded in engine.ts before the refactor.
  // Do not "improve" these values: classic must render exactly what shipped.
  classic: {
    background: "#000",
    ship: "#fff",
    thruster: "rgba(255, 130, 0, 0.85)",
    bullet: "#fff",
    asteroid: "#fff",
    powerUp: "#0ff",
    particleRgb: "255,255,255",
    hudText: "#fff",
    hudPowerUpText: "#0ff",
    lifeIcon: "#fff",
    overlayTitle: "#fff",
    overlaySub: "rgba(255,255,255,0.65)",
    glowBlur: 0,
  },

  // Site neons from :root in app/globals.css, copied literally (the engine cannot read CSS
  // variables): --cyan #00f5ff, --magenta #ff006e, --yellow #f5ff00, --green #00ff88,
  // --bg #0a0a0f, --ink #e6e9ff. One hue per collidable entity so the collision pairs
  // ship/asteroid and bullet/asteroid never share a color.
  neon: {
    background: "#0a0a0f",
    ship: "#00f5ff",
    thruster: "rgba(245, 255, 0, 0.85)",
    bullet: "#f5ff00",
    asteroid: "#ff006e",
    powerUp: "#00ff88",
    particleRgb: "230, 233, 255",
    hudText: "#e6e9ff",
    hudPowerUpText: "#00ff88",
    lifeIcon: "#00f5ff",
    overlayTitle: "#ff006e",
    overlaySub: "rgba(230, 233, 255, 0.65)",
    glowBlur: 12,
  },

  // Amber phosphor, four luminance steps of one hue (no second hue anywhere):
  //   L4 #ffe8b0 (brightest) · L3 #ffb000 · L2 #c07800 · background #140d00.
  // The player's own ship and its bullets take L4 so they stay the brightest things on
  // screen; asteroids drop to L2 and the pickup sits at L3, so every pair that can collide
  // differs by at least one full step.
  retro: {
    background: "#140d00",
    ship: "#ffe8b0",
    thruster: "rgba(255, 176, 0, 0.85)",
    bullet: "#ffe8b0",
    asteroid: "#c07800",
    powerUp: "#ffb000",
    particleRgb: "255, 176, 0",
    hudText: "#ffb000",
    hudPowerUpText: "#ffe8b0",
    lifeIcon: "#ffb000",
    overlayTitle: "#ffe8b0",
    overlaySub: "rgba(255, 176, 0, 0.65)",
    glowBlur: 6,
  },
};
