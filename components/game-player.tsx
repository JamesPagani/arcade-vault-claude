"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import type { Game } from "@/app/data/games";
import {
  GAME_ENGINES,
  GAME_TOUCH_CONTROLS,
  type GameControlsHandle,
} from "@/components/games/registry";
import { TouchControls } from "@/components/games/touch-controls";
import {
  DEFAULT_SKIN,
  isSkinId,
  SKIN_IDS,
  SKINS,
  type SkinId,
} from "@/components/games/skins";
import { insertScore } from "@/lib/scores-client";

export function GamePlayer({ game }: { game: Game }) {
  const Canvas = GAME_ENGINES[game.id];
  const isReal = Boolean(Canvas);
  const { user, saveScore } = useAuth();
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState(user ? user.name : "INVITADO");
  const [saved, setSaved] = useState(false);
  const [restartSignal, setRestartSignal] = useState(0);
  const [skin, setSkin] = useState<SkinId>(DEFAULT_SKIN);
  const canvasRef = useRef<GameControlsHandle>(null);
  const touchControls = GAME_TOUCH_CONTROLS[game.id];

  useEffect(() => {
    // Reads localStorage (unavailable during server render) after mount to avoid a
    // hydration mismatch, same as AuthProvider; the default skin is always what the
    // first paint shows by design.
    const stored = localStorage.getItem("av_skin");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isSkinId(stored)) setSkin(stored);
  }, []);

  const cycleSkin = () => {
    setSkin((current) => {
      const next = SKIN_IDS[(SKIN_IDS.indexOf(current) + 1) % SKIN_IDS.length];
      localStorage.setItem("av_skin", next);
      return next;
    });
  };

  useEffect(() => {
    if (isReal || over || paused) return;
    const t = setInterval(
      () => setScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [isReal, over, paused]);

  useEffect(() => {
    // Placeholder level-up tick matching the template's fake simulation, not a real
    // scoring engine — see spec decision to keep the player screen's mock as-is.
    if (isReal) return;
    if (score > 0 && score % 2500 < 100) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLevel((l) => l + 1);
    }
  }, [isReal, score]);

  const handleSnapshot = useCallback(
    (snapshot: { score: number; lives: number; level: number }) => {
      setScore(snapshot.score);
      setLives(snapshot.lives);
      setLevel(snapshot.level);
    },
    [],
  );

  const handleGameOver = useCallback((finalScore: number) => {
    setScore(finalScore);
    setOver(true);
  }, []);

  const endGame = () => setOver(true);
  const restart = () => {
    setScore(0);
    setLevel(1);
    setLives(3);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setRestartSignal((s) => s + 1);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          {lives >= 0 && (
            <div className="hud-stat lives">
              <div className="l">Vidas</div>
              <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
            </div>
          )}
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          {isReal && (
            <button className="btn" onClick={cycleSkin} title="Cambiar aspecto">
              {SKINS[skin].label}
            </button>
          )}
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <Link href={`/juegos/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {isReal ? (
            <Canvas
              ref={canvasRef}
              paused={paused || over}
              onSnapshot={handleSnapshot}
              onGameOver={handleGameOver}
              restartSignal={restartSignal}
              skin={skin}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {isReal && touchControls && (
        <TouchControls controls={touchControls} targetRef={canvasRef} />
      )}

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                />
                <button
                  className="btn yellow"
                  onClick={async () => {
                    if (isReal) {
                      await insertScore(game.id, name, score);
                    } else {
                      saveScore({ game: game.id, score, name });
                    }
                    setSaved(true);
                  }}
                >
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/juegos" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
