"use client";

import { useEffect, useRef } from "react";
import {
  TetrisEngine,
  type TetrisSnapshot,
} from "@/components/games/tetris/engine";

const WIDTH = 300;
const HEIGHT = 600;
const NEXT_SIZE = 120;
const GAME_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowDown",
  "ArrowUp",
  "KeyX",
  "Space",
]);

export interface TetrisCanvasProps {
  paused: boolean;
  onSnapshot: (snapshot: TetrisSnapshot) => void;
  onGameOver: (finalScore: number) => void;
  restartSignal: number;
}

export function TetrisCanvas({
  paused,
  onSnapshot,
  onGameOver,
  restartSignal,
}: TetrisCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TetrisEngine | null>(null);
  const pausedRef = useRef(paused);
  const onSnapshotRef = useRef(onSnapshot);
  const onGameOverRef = useRef(onGameOver);
  const wasGameOverRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
    onSnapshotRef.current = onSnapshot;
    onGameOverRef.current = onGameOver;
  }, [paused, onSnapshot, onGameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const nextCtx = nextCanvasRef.current?.getContext("2d");
    if (!canvas || !ctx || !nextCtx) return;

    const engine = new TetrisEngine(ctx, WIDTH, HEIGHT);
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
        engine.drawNext(nextCtx);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    engineRef.current?.handleKeyDown(e.code);
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    engineRef.current?.handleKeyUp(e.code);
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        justifyContent: "center",
        flexWrap: "wrap",
      }}
    >
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
      <canvas
        ref={nextCanvasRef}
        width={NEXT_SIZE}
        height={NEXT_SIZE}
        style={{
          display: "block",
          width: "100%",
          maxWidth: NEXT_SIZE,
          height: "auto",
          margin: "0 auto",
        }}
      />
    </div>
  );
}
