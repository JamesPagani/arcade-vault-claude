import { listGames } from "@/lib/games";
import { listScores } from "@/lib/scores";
import type { ScoreRow } from "@/lib/scores";
import HallOfFame from "./hall-of-fame";

export default async function Page() {
  const games = await listGames();
  const scoresByGame: Record<string, ScoreRow[]> = {};
  for (const game of games) {
    scoresByGame[game.id] = await listScores(game.id);
  }

  return <HallOfFame games={games} scoresByGame={scoresByGame} />;
}
