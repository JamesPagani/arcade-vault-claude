import { createClient } from "@/lib/supabase/client";

export async function insertScore(
  gameId: string,
  name: string,
  score: number,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("scores")
    .insert({ game_id: gameId, name, score });

  if (error) throw error;
}
