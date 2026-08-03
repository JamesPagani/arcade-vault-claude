"use client";

import { useEffect, useRef } from "react";
import {
  SnakeEngine,
  type SnakeSnapshot,
} from "@/components/games/snake/engine";
import { DEFAULT_SKIN, type SkinId } from "@/components/games/skins";

const WIDTH = 800;
const HEIGHT = 600;
const GAME_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
]);

export interface SnakeCanvasProps {
  paused: boolean;
  onSnapshot: (snapshot: SnakeSnapshot) => void;
  onGameOver: (finalScore: number) => void;
  restartSignal: number;
  skin?: SkinId;
}

export function SnakeCanvas({
  paused,
  onSnapshot,
  onGameOver,
  restartSignal,
  skin = DEFAULT_SKIN,
}: SnakeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SnakeEngine | null>(null);
  const pausedRef = useRef(paused);
  const onSnapshotRef = useRef(onSnapshot);
  const onGameOverRef = useRef(onGameOver);
  const wasGameOverRef = useRef(false);
  // Read through a ref so the mount-only rAF effect keeps its empty dependency array;
  // later changes arrive through the imperative setSkin effect below.
  const initialSkinRef = useRef(skin);

  useEffect(() => {
    pausedRef.current = paused;
    onSnapshotRef.current = onSnapshot;
    onGameOverRef.current = onGameOver;
  }, [paused, onSnapshot, onGameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const engine = new SnakeEngine(ctx, WIDTH, HEIGHT, initialSkinRef.current);
    engineRef.current = engine;
    wasGameOverRef.current = false;

    let lastTime: number | null = null;
    let frameId: number;

    const loop = (ts: number) => {
      const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;

      if (!pausedRef.current) {
        engine.update(dt);
        engine.draw();

        const snapshot = engine.getSnapshot();
        onSnapshotRef.current(snapshot);
        if (snapshot.state === "gameover" && !wasGameOverRef.current) {
          onGameOverRef.current(snapshot.score);
        }
        wasGameOverRef.current = snapshot.state === "gameover";
      }

      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(frameId);
    // Intentionally only re-runs on mount/unmount: paused/onSnapshot/onGameOver are read via refs
    // so the loop and its canvas/engine instance survive prop changes across renders.
  }, []);

  useEffect(() => {
    if (restartSignal === 0) return;
    wasGameOverRef.current = false;
    engineRef.current?.reset();
  }, [restartSignal]);

  // Imperative, never a remount: the engine survives prop changes, so switching skins
  // mid-run must not reset the game. Same shape as the restartSignal effect above.
  useEffect(() => {
    engineRef.current?.setSkin(skin);
  }, [skin]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    engineRef.current?.handleKeyDown(e.code);
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    engineRef.current?.handleKeyUp(e.code);
  };

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      style={{
        display: "block",
        width: "100%",
        maxWidth: WIDTH,
        height: "auto",
        margin: "0 auto",
        outline: "none",
      }}
    />
  );
}
