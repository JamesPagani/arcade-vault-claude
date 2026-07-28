"use client";

import { useEffect, useRef } from "react";
import {
  ArkanoidEngine,
  type ArkanoidSnapshot,
} from "@/components/games/arkanoid/engine";

const WIDTH = 800;
const HEIGHT = 600;
const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight"]);

export interface ArkanoidCanvasProps {
  paused: boolean;
  onSnapshot: (snapshot: ArkanoidSnapshot) => void;
  onGameOver: (finalScore: number) => void;
  restartSignal: number;
}

export function ArkanoidCanvas({
  paused,
  onSnapshot,
  onGameOver,
  restartSignal,
}: ArkanoidCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ArkanoidEngine | null>(null);
  const pausedRef = useRef(paused);
  const onSnapshotRef = useRef(onSnapshot);
  const onGameOverRef = useRef(onGameOver);
  const wasOverRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
    onSnapshotRef.current = onSnapshot;
    onGameOverRef.current = onGameOver;
  }, [paused, onSnapshot, onGameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const engine = new ArkanoidEngine(ctx, WIDTH, HEIGHT);
    engineRef.current = engine;
    wasOverRef.current = false;

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
        const isOver =
          snapshot.state === "gameover" || snapshot.state === "win";
        if (isOver && !wasOverRef.current) {
          onGameOverRef.current(snapshot.score);
        }
        wasOverRef.current = isOver;
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
    wasOverRef.current = false;
    engineRef.current?.reset();
  }, [restartSignal]);

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
