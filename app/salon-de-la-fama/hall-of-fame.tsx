"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import type { Game } from "@/lib/games";
import type { ScoreRow } from "@/lib/scores";

export default function HallOfFame({
  games,
  scoresByGame,
}: {
  games: Game[];
  scoresByGame: Record<string, ScoreRow[]>;
}) {
  const { user } = useAuth();
  const [tab, setTab] = useState(games[0].id);
  const rows = scoresByGame[tab] ?? [];
  const game = games.find((g) => g.id === tab)!;

  const yourBest = useMemo(
    () => (user ? (rows.find((r) => r.name === user.name) ?? null) : null),
    [user, rows],
  );
  const yourRank = yourBest ? rows.indexOf(yourBest) + 1 : null;

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {games.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 80,
            color: "var(--ink-faint)",
          }}
        >
          <div
            className="pixel"
            style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}
          >
            AÚN NO HAY PUNTUACIONES
          </div>
          <div>
            Sé el primero en aparecer en el salón de la fama de {game.title}.
          </div>
        </div>
      ) : (
        <>
          <div className="podium">
            <div className="podium-slot silver">
              <div className="rank-num">02</div>
              <div className="name">{rows[1]?.name ?? "—"}</div>
              <div className="score">
                {rows[1] ? rows[1].score.toLocaleString("es-ES") : "—"}
              </div>
              <div className="date">
                {rows[1]
                  ? new Date(rows[1].created_at).toLocaleDateString("es-ES")
                  : ""}
              </div>
            </div>
            <div className="podium-slot gold">
              <div
                className="pixel"
                style={{
                  fontSize: 9,
                  color: "var(--gold)",
                  letterSpacing: "0.18em",
                }}
              >
                CAMPEÓN
              </div>
              <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
                01
              </div>
              <div className="name">{rows[0]?.name ?? "—"}</div>
              <div className="score" style={{ fontSize: 20 }}>
                {rows[0] ? rows[0].score.toLocaleString("es-ES") : "—"}
              </div>
              <div className="date">
                {rows[0]
                  ? new Date(rows[0].created_at).toLocaleDateString("es-ES")
                  : ""}
              </div>
            </div>
            <div className="podium-slot bronze">
              <div className="rank-num">03</div>
              <div className="name">{rows[2]?.name ?? "—"}</div>
              <div className="score">
                {rows[2] ? rows[2].score.toLocaleString("es-ES") : "—"}
              </div>
              <div className="date">
                {rows[2]
                  ? new Date(rows[2].created_at).toLocaleDateString("es-ES")
                  : ""}
              </div>
            </div>
          </div>

          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.id}
                className={
                  "tr" +
                  (i === 0
                    ? " top1"
                    : i === 1
                      ? " top2"
                      : i === 2
                        ? " top3"
                        : "")
                }
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(i + 1).padStart(2, "0")}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                <div className="dt">
                  {new Date(r.created_at).toLocaleDateString("es-ES")}
                </div>
              </div>
            ))}
            {yourBest && (
              <>
                <div className="tr you-label">
                  ▸ TU MEJOR MARCA EN {game.title}
                </div>
                <div
                  className="tr you"
                  style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
                >
                  <div className="rk" style={{ color: "var(--yellow)" }}>
                    #{String(yourRank).padStart(2, "0")}
                  </div>
                  <div className="pl" style={{ color: "var(--yellow)" }}>
                    {yourBest.name}
                  </div>
                  <div
                    className="sc"
                    style={{
                      color: "var(--yellow)",
                      textShadow: "0 0 6px rgba(245,255,0,0.5)",
                    }}
                  >
                    {yourBest.score.toLocaleString("es-ES")}
                  </div>
                  <div className="dt">
                    {new Date(yourBest.created_at).toLocaleDateString("es-ES")}
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/juegos" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
