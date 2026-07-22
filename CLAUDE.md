# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault ("arcade-vault") — a platform for playing games online and competing on points. The codebase is currently a fresh `create-next-app` scaffold (App Router, TypeScript, Tailwind CSS v4) with no custom application code yet; `app/page.tsx` and `app/layout.tsx` are still the generated defaults.

This project follows Spec Driven Design via the `/spec` and `/spec-impl` skills from https://github.com/Klerith/fernando-skills (installed with `npx skills@latest add Klerith/fernando-skills`). Check for spec files describing intended features before implementing, since the current source tree does not yet reflect them.

## Commands

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`, extends `next/core-web-vitals` + `next/typescript`)

There is no test runner configured yet.

## Architecture notes

- App Router only (`app/` directory) — no `pages/` router in use.
- Path alias `@/*` maps to the repo root (see `tsconfig.json`).
- Styling is Tailwind CSS v4 via `@tailwindcss/postcss` (no `tailwind.config.*` file — v4 is configured through CSS/PostCSS, see `postcss.config.mjs` and `app/globals.css`).
- **This is Next.js 16, not the version in your training data.** APIs, conventions, and file structure may differ from what you expect. Before writing routing, data-fetching, or config code, check the bundled docs in `node_modules/next/dist/docs/` (`01-app/`, `02-pages/`, `03-architecture/`, `04-community/`) and follow any deprecation notices found there rather than assuming Next.js 13/14 conventions.
