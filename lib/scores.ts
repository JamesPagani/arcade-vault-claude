import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

export interface ScoreRow {
  id: string;
  game_id: string;
  name: string;
  score: number;
  created_at: string;
}

export async function listScores(gameId: string): Promise<ScoreRow[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("game_id", gameId)
    .order("score", { ascending: false });

  if (error) throw error;

  return data as ScoreRow[];
}

export async function insertScore(
  gameId: string,
  name: string,
  score: number,
): Promise<void> {
  const supabase = createBrowserClient();
  const { error } = await supabase
    .from("scores")
    .insert({ game_id: gameId, name, score });

  if (error) throw error;
}
