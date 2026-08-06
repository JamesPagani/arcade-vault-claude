import { createClient } from "@/lib/supabase/client";

export async function insertScore(
  gameId: string,
  name: string,
  score: number,
  userId?: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("scores")
    .insert({ game_id: gameId, name, score, user_id: userId ?? null });

  if (error) throw error;
}
