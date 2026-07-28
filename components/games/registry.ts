import type { ComponentType } from "react";
import { ArkanoidCanvas } from "@/components/games/arkanoid/arkanoid-canvas";
import { AsteroidsCanvas } from "@/components/games/asteroids/asteroids-canvas";
import { TetrisCanvas } from "@/components/games/tetris/tetris-canvas";

export interface GameCanvasProps {
  paused: boolean;
  onSnapshot: (snapshot: {
    score: number;
    lives: number;
    level: number;
  }) => void;
  onGameOver: (finalScore: number) => void;
  restartSignal: number;
}

export const GAME_ENGINES: Record<string, ComponentType<GameCanvasProps>> = {
  arkanoid: ArkanoidCanvas,
  asteroids: AsteroidsCanvas,
  tetris: TetrisCanvas,
};
