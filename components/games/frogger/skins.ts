import type { SkinId } from "@/components/games/skins";

export interface FroggerPalette {
  /** Base canvas fill, visible in the HUD row and bottom timer-bar row. */
  background: string;
  /** Home-bank strip (row 1) behind the five goal bays. */
  goalZone: string;
  /** River strip (rows 2-7) behind logs and turtles. */
  riverZone: string;
  /** Median strip (row 8) between river and road. */
  median: string;
  /** Road strip (rows 9-13) behind cars and trucks. */
  roadZone: string;
  /** Start strip (row 14) where the frog respawns. */
  startZone: string;
  /** Empty (not yet filled) goal bay. */
  goalCellEmpty: string;
  /** Goal bay once a frog has reached it this round. */
  goalCellFilled: string;
  /** Non-goal shore cells flanking the bays. */
  shoreCell: string;
  /** Car body (road hazard). */
  car: string;
  /** Truck body (road hazard). */
  truck: string;
  /** Floating log (river support). */
  log: string;
  /** Turtle while surfaced (river support). */
  turtleSurfaced: string;
  /** Turtle while submerged (offers no support), drawn at 0.4 alpha. */
  turtleSubmerged: string;
  /** Living frog fill. */
  frogAlive: string;
  /** Living frog stroke outline. */
  frogOutline: string;
  /** Death-beat ripple stroke when drowned. */
  frogDeathWater: string;
  /** Death-beat splat fill when run over. */
  frogDeathRoad: string;
  /** HUD score/level text, life icons, and the game-over subtitle — the classic engine
   *  used the same literal for all three, so this one field covers them all. */
  hudText: string;
  /** Timer bar track (the unfilled part). */
  timerBarBg: string;
  /** Timer bar fill while time is plentiful (> 50%). */
  timerHigh: string;
  /** Timer bar fill at medium time (25-50%). */
  timerMid: string;
  /** Timer bar fill when time is almost out (< 25%). */
  timerLow: string;
  /** Game-over headline. */
  overlayTitle: string;
  /** ctx.shadowBlur applied to every drawn element. 0 disables glow entirely. */
  glowBlur: number;
}

export const FROGGER_PALETTES: Record<SkinId, FroggerPalette> = {
  // Transcription of the literals that were hardcoded in engine.ts before the refactor.
  // Do not "improve" these values: classic must render exactly what shipped.
  classic: {
    background: "#0a0a18",
    goalZone: "#123018",
    riverZone: "#0d2b4a",
    median: "#1a1a1a",
    roadZone: "#2a2a2a",
    startZone: "#1a1a1a",
    goalCellEmpty: "#08130a",
    goalCellFilled: "#39d353",
    shoreCell: "#0b3d16",
    car: "#e57373",
    truck: "#ffb74d",
    log: "#8d5524",
    turtleSurfaced: "#39d353",
    turtleSubmerged: "#0d5f3a",
    frogAlive: "#c6ff00",
    frogOutline: "#0a0a18",
    frogDeathWater: "#8ecae6",
    frogDeathRoad: "#7a1f1f",
    hudText: "#e6e6e6",
    timerBarBg: "#1a1a1a",
    timerHigh: "#39d353",
    timerMid: "#ffd54f",
    timerLow: "#e57373",
    overlayTitle: "#e57373",
    glowBlur: 0,
  },

  // Site neons from :root in app/globals.css, copied literally (the engine cannot read CSS
  // variables): --cyan #00f5ff, --magenta #ff006e, --yellow #f5ff00, --green #00ff88,
  // --bg #0a0a0f, --ink #e6e9ff. The frog is the one entity that must read against every
  // background it crosses (goal, river, road), so it gets --ink rather than a hue that would
  // camouflage against one of the zones. Road hazards (car/truck) and river supports
  // (log/turtle) each get their own site neon so every collision pair — frog-vs-car,
  // frog-vs-truck, frog-vs-water when unsupported — stays a distinct hue. Turtle submerged is
  // a dim, dark-green variant of turtle surfaced (not a hue swap) so "no support" reads as the
  // same entity gone dark, and it keeps the classic engine's 0.4 alpha on top for a second
  // step of dimming.
  neon: {
    background: "#0a0a0f",
    goalZone: "#04160b",
    riverZone: "#03141a",
    median: "#14141c",
    roadZone: "#1c1c26",
    startZone: "#14141c",
    goalCellEmpty: "#03110a",
    goalCellFilled: "#00ff88",
    shoreCell: "#062012",
    car: "#ff006e",
    truck: "#f5ff00",
    log: "#00f5ff",
    turtleSurfaced: "#00ff88",
    turtleSubmerged: "#0a4d31",
    frogAlive: "#e6e9ff",
    frogOutline: "#0a0a0f",
    frogDeathWater: "#00f5ff",
    frogDeathRoad: "#ff006e",
    hudText: "#e6e9ff",
    timerBarBg: "#14141c",
    timerHigh: "#00ff88",
    timerMid: "#f5ff00",
    timerLow: "#ff006e",
    overlayTitle: "#ff006e",
    glowBlur: 12,
  },

  // Amber phosphor, four luminance steps of one hue, matching the scale already fixed on
  // asteroids/arkanoid/snake: L4 #ffe8b0 · L3 #ffb000 · L2 #c07800 · background #140d00. The
  // frog (player) is always L4, the brightest thing on screen. Road hazards (car and truck)
  // flatten to the single L2 step — distinguishing car from truck is cosmetic here, not a
  // collision pair, so flattening them is the correct calibration rather than smuggling in a
  // second hue (same reasoning arkanoid used to flatten its six brick rows). River supports
  // (log, turtle surfaced) sit at L3, one full step above the road hazards and one below the
  // frog. Turtle submerged reuses L3 rather than a fifth step: the classic engine's 0.4 alpha
  // already dims it relative to the surfaced turtle, so "brightness, not hue" holds without
  // inventing a value nothing else uses. The timer bar runs low-to-high in reverse — dim while
  // there's plenty of time, brightest as it runs out — so the moment demanding attention is
  // also the moment the phosphor is brightest.
  retro: {
    background: "#140d00",
    goalZone: "#1a1100",
    riverZone: "#120b00",
    median: "#1f1400",
    roadZone: "#241800",
    startZone: "#1f1400",
    goalCellEmpty: "#120b00",
    goalCellFilled: "#ffe8b0",
    shoreCell: "#1a1100",
    car: "#c07800",
    truck: "#c07800",
    log: "#ffb000",
    turtleSurfaced: "#ffb000",
    turtleSubmerged: "#ffb000",
    frogAlive: "#ffe8b0",
    frogOutline: "#140d00",
    frogDeathWater: "#ffb000",
    frogDeathRoad: "#c07800",
    hudText: "#ffb000",
    timerBarBg: "#1f1400",
    timerHigh: "#c07800",
    timerMid: "#ffb000",
    timerLow: "#ffe8b0",
    overlayTitle: "#ffe8b0",
    glowBlur: 6,
  },
};
