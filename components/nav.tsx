"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const isInicio = pathname === "/";
  const isBiblioteca = pathname.startsWith("/juegos");
  const isAcercaDe = pathname === "/acerca-de";
  const isSalon = pathname === "/salon-de-la-fama";
  const isAuth = pathname === "/iniciar-sesion";

  const close = () => setOpen(false);

  const handleSignOut = () => {
    close();
    signOut();
  };

  const handleAuthClick = () => {
    close();
    if (user) {
      handleSignOut();
    } else {
      router.push("/iniciar-sesion");
    }
  };

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={isInicio ? "active" : ""} onClick={close}>
            Inicio
          </Link>
          <Link href="/juegos" className={isBiblioteca ? "active" : ""} onClick={close}>
            Biblioteca
          </Link>
          <Link href="/acerca-de" className={isAcercaDe ? "active" : ""} onClick={close}>
            Acerca de
          </Link>
          <Link href="/salon-de-la-fama" className={isSalon ? "active" : ""} onClick={close}>
            Salón de la Fama
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <button className="btn ghost auth-btn" onClick={handleSignOut}>
            {user.name} ▾
          </button>
        ) : (
          <Link href="/iniciar-sesion" className="btn auth-btn" onClick={close}>
            Iniciar Sesión
          </Link>
        )}
        <button
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>

      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={close}
      ></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>
          MENÚ
        </div>
        <Link href="/" className={isInicio ? "active" : ""} onClick={close}>
          Inicio
        </Link>
        <Link href="/juegos" className={isBiblioteca ? "active" : ""} onClick={close}>
          Biblioteca
        </Link>
        <Link href="/acerca-de" className={isAcercaDe ? "active" : ""} onClick={close}>
          Acerca de
        </Link>
        <Link href="/salon-de-la-fama" className={isSalon ? "active" : ""} onClick={close}>
          Salón de la Fama
        </Link>
        <a className={isAuth ? "active" : ""} onClick={handleAuthClick}>
          {user ? "Cuenta" : "Iniciar Sesión"}
        </a>
        <div style={{ flex: 1 }}></div>
        <div className="pixel" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}>
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
