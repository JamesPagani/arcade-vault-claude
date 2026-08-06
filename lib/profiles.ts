import { createClient } from "@/lib/supabase/client";

export interface Profile {
  id: string;
  username: string;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  return data;
}
