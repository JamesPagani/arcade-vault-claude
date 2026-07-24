"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface AuthUser {
  name: string;
}

export interface ScoreEntry {
  game: string;
  score: number;
  name: string;
  at: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (user: AuthUser | null) => void;
  signOut: () => void;
  saveScore: (entry: Omit<ScoreEntry, "at">) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    // Reads localStorage (unavailable during server render) after mount to avoid a
    // hydration mismatch; the state is always null on first paint by design.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(JSON.parse(localStorage.getItem("av_user") || "null"));
    } catch {
      setUser(null);
    }
  }, []);

  const login = (user: AuthUser | null) => {
    setUser(user);
    if (user) {
      localStorage.setItem("av_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("av_user");
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem("av_user");
  };

  const saveScore = (entry: Omit<ScoreEntry, "at">) => {
    try {
      const all = JSON.parse(localStorage.getItem("av_scores") || "[]");
      all.push({ ...entry, at: Date.now() });
      localStorage.setItem("av_scores", JSON.stringify(all));
    } catch {
      // ignore corrupt/missing localStorage, same as template
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signOut, saveScore }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
