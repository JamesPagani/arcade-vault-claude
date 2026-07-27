# 04 - Supabase Installation & Configuration

- **Status:** Draft
- **Dependencies:** None (infrastructure spec, independent of specs 01-03)
- **Date:** 2026-07-27
- **Objective:** Install and configure the Supabase client SDKs (`@supabase/supabase-js`, `@supabase/ssr`) in the Next.js App Router project, with browser and server client utilities and environment variables, without implementing any real auth, database schema, or functional features.

## Scope

### In scope

- Install `@supabase/supabase-js` and `@supabase/ssr` as dependencies.
- `lib/supabase/client.ts` — browser client factory using `createBrowserClient` from `@supabase/ssr`.
- `lib/supabase/server.ts` — server client factory using `createServerClient` from `@supabase/ssr` (cookie-based, for use in Server Components and Route Handlers).
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, added to `.env.local` (real values, not committed) and `.env.template` (placeholders, committed).

### Not in scope

- Middleware / session-refresh (`middleware.ts`) — no protected routes exist yet.
- Any database schema/tables (e.g. `scores`, `profiles`) — the project's Supabase database stays empty (0 tables) after this spec.
- Any real authentication flow (sign-in, sign-up, guest, OAuth) — `AuthProvider`'s existing `localStorage`-based fake auth (spec 01) is untouched.
- Any real score/leaderboard persistence — `av_scores` localStorage mock (spec 01) is untouched.
- Row Level Security policies — deferred until real tables exist.
- Any runtime connectivity check, smoke test page, or script that calls Supabase — verification is limited to build/type success (per Phase 2 answer).
- Replacing the legacy `anon` key anywhere — only the new publishable key naming is used.

## Data Model

No new data structures or tables are introduced — the Supabase database remains empty (0 tables), per Scope. This section is skipped.

## Implementation Plan

1. **Install dependencies** — Add `@supabase/supabase-js` and `@supabase/ssr` to `package.json` via npm. System still builds/runs unchanged (no imports yet).

2. **Environment variables** — Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (real values) to `.env.local`, and matching placeholder entries to `.env.template`. No code references them yet.

3. **Browser client** — Create `lib/supabase/client.ts` exporting a `createClient()` function that wraps `createBrowserClient` from `@supabase/ssr`, reading the two env vars. Not yet imported/used anywhere.

4. **Server client** — Create `lib/supabase/server.ts` exporting an async `createClient()` function that wraps `createServerClient` from `@supabase/ssr`, wiring the Next.js `cookies()` API for `get`/`set`/`remove`, reading the same two env vars. Not yet imported/used anywhere.

5. **Build & type-check pass** — Run `npm run build` and `npm run lint` to confirm both new files compile and type-check cleanly with no unused-code warnings, and that the rest of the app is unaffected.

## Acceptance Criteria

- [ ] `@supabase/supabase-js` and `@supabase/ssr` appear in `package.json` dependencies and are installed in `node_modules`.
- [ ] `.env.local` contains real `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` values; `.env.template` contains matching placeholder entries (no real secrets).
- [ ] `lib/supabase/client.ts` exists and exports a working browser client factory using `createBrowserClient`.
- [ ] `lib/supabase/server.ts` exists and exports a working server client factory using `createServerClient`, correctly wired to Next.js `cookies()`.
- [ ] No `middleware.ts` is introduced by this spec.
- [ ] The Supabase project has 0 tables in the `public` schema after this spec (verifiable via `list_tables`).
- [ ] No existing functionality changes: `AuthProvider`'s `localStorage` auth (`av_user`) and score persistence (`av_scores`) behave exactly as before.
- [ ] `npm run build` completes with no TypeScript or lint errors.
- [ ] `npm run lint` reports no errors related to the new files (e.g. no unused exports/imports).

## Decisions Taken and Discarded

- **`@supabase/ssr` over the deprecated `@supabase/auth-helpers-nextjs`.** `auth-helpers-nextjs` is Supabase's older, now-deprecated package for Next.js cookie handling; `@supabase/ssr` is the current officially supported replacement for App Router projects.
- **Both browser and server client utilities installed now, middleware deferred.** The user wants both `lib/supabase/client.ts` and `lib/supabase/server.ts` in place as groundwork, but explicitly deferred `middleware.ts` since no protected routes exist yet to justify session-refresh middleware.
- **New "publishable key" naming (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) over the legacy `anon` key naming.** Confirmed via `mcp__supabase__get_publishable_keys` that the project has both a legacy `anon` key and a new `publishable` key; per user direction, only the new naming is adopted going forward.
- **Zero database schema in this spec.** Considered scaffolding an empty `scores`/`profiles` table now to save a step later. Discarded per explicit user direction — this spec is installation/configuration only; schema design is deferred to the future spec that implements real auth and scores, where it can be designed against actual requirements instead of speculatively.
- **No runtime connectivity check.** Considered adding a temporary smoke-test call (e.g. `supabase.auth.getSession()`) to prove the client can reach the project. Discarded per user direction — verification is limited to build/type success; a real connectivity test is more meaningful once actual auth/data flows exist to exercise.
- **Existing fake `localStorage` auth/scores (spec 01) left untouched.** This spec only installs plumbing; replacing `AuthProvider`'s fake session and `av_scores` with real Supabase Auth/tables is explicitly out of scope, deferred to a future spec.

## Identified Risks

- **`@supabase/ssr`'s cookie API assumptions may not match Next.js 16's `cookies()` behavior.** This project explicitly runs a newer Next.js version than most `@supabase/ssr` documentation/examples target (see `AGENTS.md`/`CLAUDE.md`), so the exact `cookies()` async/sync contract should be checked against the bundled docs (`node_modules/next/dist/docs/`) rather than assumed from older Next.js examples. Mitigation: verify `lib/supabase/server.ts` against Next.js 16's actual `cookies()` signature during implementation, not copy-pasted from a Next 13/14 tutorial.
- **Publishable key naming is newer/less documented than the legacy `anon` key.** Some `@supabase/ssr`/`supabase-js` examples and older docs still reference `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Mitigation: confirm both client factories work with the publishable key value at build/type-check time; if the installed SDK version has issues accepting the new key format, flag it rather than silently falling back to the legacy anon key.
- **Unused-export lint warnings.** Since `lib/supabase/client.ts` and `lib/supabase/server.ts` are created but not yet imported anywhere (per Scope), some lint configurations flag unused exports. Mitigation: confirmed acceptable since acceptance criteria only require no _errors_; if the project's ESLint config treats this as an error, adjust the rule scope rather than prematurely wiring the clients into unrelated pages just to "use" them.
