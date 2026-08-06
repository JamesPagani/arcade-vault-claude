import { createClient } from "@/lib/supabase/server";

export interface ScoreRow {
  id: string;
  game_id: string;
  name: string;
  score: number;
  user_id: string | null;
  created_at: string;
}

export async function listScores(gameId: string): Promise<ScoreRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("game_id", gameId)
    .order("score", { ascending: false });

  if (error) throw error;

  return data as ScoreRow[];
}
