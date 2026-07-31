import { listGames } from "@/lib/games";
import GamesLibrary from "./games-library";

export default async function Page() {
  const games = await listGames();
  return <GamesLibrary games={games} />;
}
