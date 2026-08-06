"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getProfile } from "@/lib/profiles";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function resolveUser(session: Session | null): Promise<AuthUser | null> {
  if (!session?.user?.email) return null;

  const profile = await getProfile(session.user.id);
  if (!profile) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    username: profile.username,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      resolveUser(session).then((resolved) => {
        setUser(resolved);
        setLoading(false);
      });
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        resolveUser(session).then(setUser);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
