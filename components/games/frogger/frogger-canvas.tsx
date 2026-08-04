"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  FroggerEngine,
  type FroggerSnapshot,
} from "@/components/games/frogger/engine";
import type { GameControlsHandle } from "@/components/games/registry";

const WIDTH = 520;
const HEIGHT = 640;
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

export interface FroggerCanvasProps {
  paused: boolean;
  onSnapshot: (snapshot: FroggerSnapshot) => void;
  onGameOver: (finalScore: number) => void;
  restartSignal: number;
}

export const FroggerCanvas = forwardRef<GameControlsHandle, FroggerCanvasProps>(
  function FroggerCanvas(
    { paused, onSnapshot, onGameOver, restartSignal },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<FroggerEngine | null>(null);
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
      if (!canvas || !ctx) return;

      const engine = new FroggerEngine(ctx, WIDTH, HEIGHT);
      engineRef.current = engine;
      wasGameOverRef.current = false;

      let lastTime: number | null = null;
      let frameId: number;

      const loop = (ts: number) => {
        const dt =
          lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
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

    useImperativeHandle(ref, () => ({
      handleKeyDown: (code: string) => engineRef.current?.handleKeyDown(code),
      handleKeyUp: (code: string) => engineRef.current?.handleKeyUp(code),
    }));

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
  },
);
