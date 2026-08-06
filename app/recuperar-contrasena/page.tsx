"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/restablecer-contrasena`,
    });

    setSubmitting(false);
    setSent(true);
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
            RECUPERAR CONTRASEÑA
          </div>
        </div>

        {sent ? (
          <p
            style={{
              textAlign: "center",
              color: "var(--ink-faint)",
              fontSize: 13,
              padding: "16px 0",
            }}
          >
            Si <strong>{email}</strong> tiene una cuenta, te enviamos un
            enlace para restablecer tu contraseña. Revisa tu correo.
          </p>
        ) : (
          <form onSubmit={submit}>
            <div className="field">
              <label>Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jugador@vault.gg"
              />
            </div>

            <button
              className="btn lg"
              type="submit"
              disabled={submitting}
              style={{ width: "100%", marginTop: 8 }}
            >
              ENVIAR ENLACE
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
