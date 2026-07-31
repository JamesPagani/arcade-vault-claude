import { notFound } from "next/navigation";
import { getGame } from "@/lib/games";
import { GamePlayer } from "@/components/game-player";

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
