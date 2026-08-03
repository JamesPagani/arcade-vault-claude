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
