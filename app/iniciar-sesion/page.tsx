"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";

function translateAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (message.includes("Email not confirmed")) {
    return "Debes confirmar tu correo antes de iniciar sesión.";
  }
  if (message.includes("already registered")) {
    return "Ese correo ya tiene una cuenta.";
  }
  return "Ocurrió un error. Intenta de nuevo.";
}

export default function AuthPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"in" | "up">("in");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signupSent, setSignupSent] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/juegos");
    }
  }, [loading, user, router]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    setSubmitting(false);

    if (error) {
      setError(translateAuthError(error.message));
      return;
    }

    router.push("/juegos");
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { username } },
    });

    setSubmitting(false);

    if (error) {
      setError(translateAuthError(error.message));
      return;
    }

    setSignupSent(true);
  };

  const guest = () => {
    router.push("/juegos");
  };

  // OAuth requires the provider's Client ID/Secret and authorized redirect
  // URI to be configured in the Supabase dashboard first — see spec
  // specs/11-supabase-authentication.md, "OAuth login via Google and GitHub".
  const oauthLogin = async (provider: "google" | "github") => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/juegos` },
    });
  };

  if (signupSent) {
    return (
      <div className="av-auth-wrap fade-in">
        <div className="auth-card">
          <div className="auth-header">
            <div className="mark"></div>
            <h2 className="neon-cyan">ARCADE VAULT</h2>
          </div>
          <div
            className="mono"
            style={{ textAlign: "center", padding: "24px 0", color: "var(--green)" }}
          >
            REVISA TU CORREO
          </div>
          <p style={{ textAlign: "center", color: "var(--ink-faint)", fontSize: 13 }}>
            Te enviamos un enlace de confirmación a <strong>{email}</strong>.
            Ábrelo para activar tu cuenta.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.16em", marginTop: 6 }}>
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>

        <div className="auth-tabs">
          <button
            className={tab === "in" ? "on" : ""}
            onClick={() => {
              setTab("in");
              setError(null);
            }}
          >
            INICIAR SESIÓN
          </button>
          <button
            className={tab === "up" ? "on" : ""}
            onClick={() => {
              setTab("up");
              setError(null);
            }}
          >
            CREAR CUENTA
          </button>
        </div>

        <form onSubmit={tab === "in" ? login : signUp}>
          {tab === "up" && (
            <div className="field slide-in">
              <label>Usuario</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="px_kai"
              />
            </div>
          )}
          <div className="field">
            <label>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jugador@vault.gg"
            />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div
              className="mono"
              style={{ color: "var(--magenta)", fontSize: 12, marginBottom: 8 }}
            >
              {error}
            </div>
          )}

          <button
            className="btn lg"
            type="submit"
            disabled={submitting}
            style={{ width: "100%", marginTop: 8 }}
          >
            {tab === "in" ? "ENTRAR AL VAULT" : "CREAR Y JUGAR"}
          </button>
        </form>

        {tab === "in" && (
          <Link
            href="/recuperar-contrasena"
            className="mono"
            style={{
              display: "block",
              textAlign: "center",
              marginTop: 10,
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.06em",
            }}
          >
            ¿OLVIDASTE TU CONTRASEÑA?
          </Link>
        )}

        <button className="btn ghost" style={{ width: "100%", marginTop: 10 }} onClick={guest}>
          JUGAR COMO INVITADO
        </button>

        <div className="auth-divider">O CONTINÚA CON</div>
        <div className="social">
          <button className="btn ghost" type="button" onClick={() => oauthLogin("google")}>
            ◆  GOOGLE
          </button>
          <button className="btn ghost" type="button" onClick={() => oauthLogin("github")}>
            ▣  GITHUB
          </button>
        </div>

        <div style={{ marginTop: 18, textAlign: "center", fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.1em" }}>
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
