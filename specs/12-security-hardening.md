# 12 - Security Hardening: Response Headers, Supabase Function/RLS Fixes, Login-Gated Score Saving

- **Status:** Implemented
- **Dependencies:** 06-games-and-scores-supabase (`scores` table and its RLS policies), 11-supabase-authentication (`auth-provider.tsx`, `profiles`, `handle_new_user` trigger, the save-score modal, the password forms)
- **Date:** 2026-08-06
- **Objective:** Close the security gaps listed in `references/security/security-checklist.md` — Next.js response headers, two Supabase function/RLS warnings, and the fully-open `scores` INSERT policy (closed by requiring a session to save a score) — while documenting the three Supabase Auth dashboard settings that have no code or migration path.

## Scope

### In scope

- **Next.js security headers**: `next.config.ts` returns exactly the three headers from the checklist (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`) on every route.
- **`handle_new_user()` search-path fix**: pin its `search_path`, closing the `function_search_path_mutable` advisor warning.
- **Revoke public `EXECUTE` on two functions**: `handle_new_user()` and `rls_auto_enable()` (a pre-existing Supabase-managed function, not created by any spec in this repo) — closes the `anon_security_definer_function_executable` / `authenticated_security_definer_function_executable` warnings on both. Neither function is ever called directly by app code; both currently run as triggers, which do not require grantee-level `EXECUTE`.
- **Tighten the `scores` INSERT policy**: replace the always-true `"anyone can submit a score"` policy with one that only allows the `authenticated` role, and only when `auth.uid() = user_id`. This closes `rls_policy_always_true` and, per this spec's explicit decision, means **guests can no longer save scores at all** — a deliberate reversal of spec 11's "guests keep today's free-text name entry."
- **Save-score modal UX** (`components/game-player.tsx`): a logged-out user who finishes a game sees a "log in to save your score" message and a link to `/iniciar-sesion`, instead of the free-text name input and save button. Logged-in behavior is unchanged.
- **Client-side minimum password length**: a shared `components/auth-validation.ts` module (`MIN_PASSWORD_LENGTH = 8`, `validatePassword()`), wired into the sign-up tab of `/iniciar-sesion` and into `/restablecer-contrasena`, blocking submission with an inline Spanish error before any Supabase call.
- **Documenting three Supabase Auth dashboard settings** that this spec cannot script (no migration or MCP tool covers Auth project config): minimum password length ≥ 8, leaked-password protection, and a signup rate limit per IP. Same precedent as spec 11's OAuth dashboard credentials — documented as a manual prerequisite, not verified automatically.

### Not in scope

- Content-Security-Policy, Strict-Transport-Security, Permissions-Policy, or any header beyond the checklist's three — explicit choice this round; a CSP needs its own pass to enumerate Supabase/Resend/OAuth origins.
- Any anti-cheat beyond requiring a session: a logged-in user can still submit an inflated score for their own `user_id`. No server-side score validation is added.
- Deleting or backfilling pre-existing `scores` rows where `user_id is null`. They remain visible on both leaderboard views; this spec only changes future inserts.
- Editing the unreachable mock/placeholder scoring path documented in `CLAUDE.md` — it shares the same modal code being changed here, but no `game.id` reaches it today, and this spec does not change that.
- A dedicated account/profile page, MFA, or role-based access — still deferred per spec 11.
- Scripting the three Supabase Auth dashboard settings via the Management API — investigated and rejected this round; no MCP tool exposes it.
- Updating `.claude/skills/add-game/reference.md`'s already-stale `insertScore` signature documentation — pre-existing drift, unrelated to this spec.

## Data Model

### Supabase migration (new)

```sql
-- Pin search_path on the sign-up trigger function (fixes function_search_path_mutable).
alter function public.handle_new_user() set search_path = public;

-- Neither function is ever called directly by app code; both run only as
-- triggers, which do not require grantee-level EXECUTE. Revoking closes the
-- anon/authenticated_security_definer_function_executable warnings.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Replace the always-true scores.INSERT policy: only a session's own user_id may be written.
drop policy "anyone can submit a score" on public.scores;

create policy "only authenticated users can submit a score"
  on public.scores for insert
  to authenticated
  with check (auth.uid() = user_id);
```

- `scores.user_id` stays nullable — this is a write-path fix, not a data migration; existing `user_id is null` rows are untouched and still readable.
- No change to the `scores`/`games` SELECT policies (`using (true)`) — reading stays public, per the checklist's own note that public-read `SELECT` policies are intentionally not flagged.

### `components/auth-validation.ts` (new)

```ts
export const MIN_PASSWORD_LENGTH = 8;

export function validatePassword(password: string): boolean;
```

- Mirrors the existing `components/contact-validation.ts` pattern (a plain validation function, no framework dependency).

### `components/game-player.tsx` (changed)

- In the game-over modal's `!saved` branch: if `user` is set, behavior is identical to today (save button calling `insertScore(game.id, user.username, score, user.id)`). If `user` is `null`, render a message plus a `Link` to `/iniciar-sesion` instead of the name `<input>` and save `<button>`.
- The `name`/`setName` state becomes dead once the guest input is removed and should be deleted along with it.

### `next.config.ts` (changed)

```ts
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];
// nextConfig.headers() returns [{ source: "/(.*)", headers: securityHeaders }]
```

## Implementation Plan

1. **Migration** (`harden_functions_and_scores_policy`, via `mcp__supabase__apply_migration`): the four statements in Data Model above. Verify with `mcp__supabase__get_advisors(type:"security")` — the `function_search_path_mutable` and both `security_definer_function_executable` warnings for `handle_new_user`/`rls_auto_enable` should be gone. Manual test right after applying: sign up with a brand-new email and confirm a `profiles` row is still created (the trigger still fires with `EXECUTE` revoked — if it doesn't, this step must be fixed before continuing).
2. **`next.config.ts` headers.** Verify: `npm run build`, then check any route's response headers (browser devtools or `curl -I`) show all three values.
3. **`components/auth-validation.ts`** (new, not yet wired). Verify: `npm run build`.
4. **Wire it into `/iniciar-sesion`'s sign-up (`signUp` in `app/iniciar-sesion/page.tsx`)**: call `validatePassword(pass)` before `supabase.auth.signUp`; on failure, `setError("La contraseña debe tener al menos 8 caracteres.")` and return. Manual test: try signing up with a 5-character password, see the inline error, confirm no Supabase request fires.
5. **Wire it into `/restablecer-contrasena` (`submit` in `app/restablecer-contrasena/page.tsx`)**, same pattern before `supabase.auth.updateUser`. Same manual test.
6. **Save-score modal** (`components/game-player.tsx`): replace the guest branch per Data Model above, reusing existing `.modal`/button/mono classes already in `app/globals.css` — no new design-system work expected for a one-line message and a link. Remove the now-unused `name`/`setName` state. Manual test: finish a game logged out → see the login prompt, no input, no console error; finish a game logged in → unchanged save flow, `user_id` populated.
7. **Cross-check pass**: full manual walkthrough — sign up with a <8-char password (blocked) then a valid one; confirm email; log in; play a game as a guest and confirm the login prompt (no insert attempted); log in and save a score (`user_id` set); reset password with a <8-char value (blocked) then a valid one; confirm the three headers on `/`, `/juegos`, and `/api/contacto`; re-run `get_advisors(type:"security")` (only `auth_leaked_password_protection` should remain, expected until the manual dashboard step below is done). `npm run build` clean, no console errors.
8. **Manual dashboard steps** (documented here, not executed by any code in this spec): in the Supabase Dashboard's Auth settings, set the minimum password length to 8+, enable leaked-password protection, and set a signup rate limit per IP. No migration or MCP tool covers Auth project configuration; this mirrors spec 11's OAuth-credentials precedent.

## Acceptance Criteria

- [x] `next.config.ts` returns `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: strict-origin-when-cross-origin` on every route.
- [x] `handle_new_user()` has a pinned `search_path` and `EXECUTE` revoked from `public`/`anon`/`authenticated`; a fresh sign-up still creates a `profiles` row.
- [x] `rls_auto_enable()` has `EXECUTE` revoked from `public`/`anon`/`authenticated`.
- [x] `mcp__supabase__get_advisors(type:"security")` no longer reports `function_search_path_mutable`, `anon_security_definer_function_executable`, or `authenticated_security_definer_function_executable`.
- [x] The `scores` table's INSERT policy only allows the `authenticated` role with `auth.uid() = user_id`; an anonymous insert attempt is rejected by RLS.
- [x] A logged-out user finishing a game sees a message with a link to `/iniciar-sesion` instead of a name input and save button.
- [x] A logged-in user finishing a game saves a score exactly as before this spec (name locked to the profile's username, `user_id` populated).
- [x] Pre-existing scores with `user_id = null` still appear on that game's leaderboard and on `/salon-de-la-fama`.
- [x] Signing up with a password under 8 characters shows an inline Spanish error and never calls `supabase.auth.signUp`.
- [x] Submitting a new password under 8 characters on `/restablecer-contrasena` shows an inline Spanish error and never calls `supabase.auth.updateUser`.
- [x] No console errors during the full manual walkthrough in step 7.
- [x] `npm run build` completes with no TypeScript or lint errors.

## Decisions Taken and Discarded

- **Guests can no longer save scores at all, enforced at the RLS level.** Decided explicitly this round: the checklist's `rls_policy_always_true` warning on `scores.INSERT` is a real open write, and requiring a session is the only closure that doesn't need new anti-cheat design. This supersedes spec 11's "guests keep today's free-text name entry."
- **`to authenticated with check (auth.uid() = user_id)`**, not a looser "any non-null `user_id`" check — stops a logged-in user from inserting a score under someone else's `user_id`, a gap spec 11 explicitly left open.
- **`scores.user_id` stays nullable; no backfill or deletion of legacy null rows.** The checklist is about closing the write path going forward, not rewriting history.
- **Revoke `EXECUTE` on `rls_auto_enable()` too, even though it predates this project's own migrations.** User's explicit call. Trigger firing in Postgres does not depend on grantee-level `EXECUTE`, so this mirrors the same safe fix already needed for `handle_new_user` with no expected functional impact.
- **Exactly the checklist's three headers — no CSP/HSTS/Permissions-Policy.** Explicit choice this round; a CSP needs its own pass to enumerate Supabase/Resend/OAuth origins without breaking anything.
- **Password length, leaked-password protection, and signup rate limiting documented as manual Supabase Dashboard steps, not scripted.** No migration or MCP tool exposes Auth project configuration; same precedent as spec 11's OAuth credential setup.
- **Client-side password-length validation added on top of, not instead of, the dashboard setting.** The dashboard setting is the real enforcement; the frontend check only gives immediate feedback instead of a round trip, following the existing client-validation pattern in `contact-validation.ts`.
- **`insertScore`'s `userId` parameter stays optional in `lib/scores-client.ts`**, even though the one remaining call site always passes it now. Narrower diff; not part of the checklist, and changing a documented data-layer contract signature is a separate cleanup if ever wanted.

## Identified Risks

- **Revoking `EXECUTE` on `handle_new_user`/`rls_auto_enable` could break sign-up** if this Postgres/Supabase version's trigger invocation turns out to check grantee-level `EXECUTE` after all. Mitigated by testing a real sign-up immediately after the migration (step 1), before any other step proceeds.
- **Tightening the `scores` INSERT policy is the one change with real user-facing impact.** Any other client that inserted scores as a guest would silently break. Mitigated by confirming (via `Grep`) that `components/game-player.tsx` is the only call site of `insertScore` in the codebase.
- **The `auth_leaked_password_protection` advisor warning will still appear after this spec ships**, since it is a dashboard-only toggle outside code. Expected, not a regression — tracked as the manual step in the Implementation Plan.

## What is **not** in this spec

- Content-Security-Policy, Strict-Transport-Security, or Permissions-Policy headers.
- Any anti-cheat beyond requiring a session (no server-side score-value validation).
- Deleting or backfilling pre-existing guest (`user_id is null`) score rows.
- A dedicated account/profile page, MFA, or role-based access.
- Scripting the Supabase Auth dashboard settings via the Management API.

Each one of those, if it lands, goes in its own spec.
