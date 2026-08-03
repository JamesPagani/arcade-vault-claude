// Platform seam for canvas skins. A skin only changes what an engine draws inside its
// <canvas> (fillStyle / strokeStyle / shadow* / sprite choice) — never geometry, timing,
// scoring or the snapshot shape. Site chrome (.crt, .player-hud, :root, .cover-*) is out
// of scope on purpose: a second site-wide theming system conflicts with the existing one
// (see specs/07-tetris-integration.md).
//
// Ids are English (code keys); labels are Spanish (user-facing), per CLAUDE.md.

export type SkinId = "classic" | "neon" | "retro";

export const SKIN_IDS = ["classic", "neon", "retro"] as const satisfies readonly SkinId[];

/** The look each game already shipped with. Default so nothing changes unasked. */
export const DEFAULT_SKIN: SkinId = "classic";

export const SKINS: Record<SkinId, { label: string }> = {
  classic: { label: "Clásico" },
  neon: { label: "Neón" },
  retro: { label: "Retro" },
};

/** Guards the localStorage["av_skin"] read, which can hold anything. */
export function isSkinId(value: unknown): value is SkinId {
  return typeof value === "string" && (SKIN_IDS as readonly string[]).includes(value);
}
