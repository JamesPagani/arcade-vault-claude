"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pass });

    setSubmitting(false);

    if (error) {
      setError("No pudimos actualizar tu contraseña. Intenta de nuevo.");
      return;
    }

    router.push("/juegos");
  };

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            NUEVA CONTRASEÑA
          </div>
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label>Contraseña nueva</label>
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
            GUARDAR CONTRASEÑA
          </button>
        </form>
      </div>
    </div>
  );
}
