import type { ComponentType } from "react";
import { ArkanoidCanvas } from "@/components/games/arkanoid/arkanoid-canvas";
import { AsteroidsCanvas } from "@/components/games/asteroids/asteroids-canvas";
import { SnakeCanvas } from "@/components/games/snake/snake-canvas";
import { TetrisCanvas } from "@/components/games/tetris/tetris-canvas";
import type { SkinId } from "@/components/games/skins";

export interface GameCanvasProps {
  paused: boolean;
  onSnapshot: (snapshot: {
    score: number;
    lives: number;
    level: number;
  }) => void;
  onGameOver: (finalScore: number) => void;
  restartSignal: number;
  /** Canvas skin. Games without a palette yet simply ignore it. */
  skin?: SkinId;
}

export const GAME_ENGINES: Record<string, ComponentType<GameCanvasProps>> = {
  arkanoid: ArkanoidCanvas,
  asteroids: AsteroidsCanvas,
  snake: SnakeCanvas,
  tetris: TetrisCanvas,
};

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

export interface GameControlsHandle {
  handleKeyDown: (code: string) => void;
  handleKeyUp: (code: string) => void;
}
