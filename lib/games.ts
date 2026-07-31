import { createClient } from "@/lib/supabase/server";
import type { Game } from "@/app/data/games";

export type { Game };

export async function listGames(): Promise<Game[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("games").select("*");

  if (error) throw error;

  return data as Game[];
}

export async function getGame(id: string): Promise<Game | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data as Game | null;
}
