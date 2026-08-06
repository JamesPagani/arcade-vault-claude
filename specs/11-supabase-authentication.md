# 11 - Real Authentication: Supabase Auth Sign-Up, Login, Recovery & OAuth

- **Status:** Implemented
- **Dependencies:** 01-arcade-vault-mvp (mock `AuthProvider` being replaced), 04-supabase-installation (client SDKs, explicitly deferred middleware/auth to this spec), 06-games-and-scores-supabase (`scores` table being extended)
- **Date:** 2026-08-05
- **Objective:** Replace the mock `localStorage`-based `AuthProvider` with real Supabase Auth (email+password, Google/GitHub OAuth, email confirmation, password recovery), so `/iniciar-sesion` and its new sibling pages create and manage real sessions instead of a fake local session.

## Scope

### In scope

- **Email + password auth**: sign-up and login, both from the existing `/iniciar-sesion` route (same tabbed UI pattern as today), backed by `supabase.auth.signUp()` / `supabase.auth.signInWithPassword()`.
- **Email confirmation required**: after sign-up, the user sees a "revisa tu correo" state instead of being logged in immediately. No session exists until the confirmation link is followed.
- **OAuth login via Google and GitHub**: the existing (today non-functional) social buttons on `/iniciar-sesion` call `supabase.auth.signInWithOAuth()`. Configuring the provider credentials (Client ID/Secret, authorized redirect URI) in the Supabase dashboard is a manual, undocumented-in-code prerequisite — the spec's acceptance criteria can verify the button exists and starts the correct redirect, not a full OAuth round-trip in CI.
- **Password recovery**: new `/recuperar-contrasena` (request a reset email) and `/restablecer-contrasena` (set a new password) routes.
- **One shared callback route** (`app/auth/callback/route.ts`) that exchanges the Supabase `code` param for a session — reused by OAuth login, the email-confirmation link, and the password-recovery link, redirecting onward per a `next` param.
- **Session refresh plumbing**: `proxy.ts` at the repo root (Next.js 16's replacement for `middleware.ts`) plus a `lib/supabase/proxy.ts` helper, refreshing the Supabase session cookie on every request — the standard `@supabase/ssr` pattern spec 04 explicitly deferred.
- **`profiles` table**: a real display alias (username) chosen at sign-up, separate from the auth email, auto-created via a database trigger when a new `auth.users` row appears (works even before email confirmation completes).
- **`scores.user_id`**: new nullable column so a save from a logged-in user is tied to their account. Guests keep today's free-text name entry; logged-in users get their profile's username auto-filled, non-editable.
- **`components/auth-provider.tsx` rewritten**: still the single `useAuth()` seam consumed by `nav.tsx` and `game-player.tsx`, now backed by a real Supabase session (`onAuthStateChange` + the `profiles` row) instead of `localStorage`.
- **`nav.tsx`** and **`game-player.tsx`**'s save-score modal updated to the new `user` shape (`{ id, email, username }` instead of `{ name }`).

### Not in scope

- Any OAuth provider besides Google and GitHub.
- A profile/account page (view/edit alias, change password while already logged in, delete account) — the nav's existing "cerrar sesión" affordance is enough for now; a dedicated page is deferred to a future spec.
- Multi-factor authentication, role-based access, or any admin/permissions concept.
- Rate limiting or anti-abuse on sign-up, login, or score submission — matches the already-accepted open trust level from spec 06 (anyone can already fabricate a score; this spec does not close that gap, it only adds an optional `user_id`).
- Protecting any route behind login — the whole catalog and every game stay playable as a guest, per this spec's Phase 2 answer. `/juegos/[id]/jugar` performs no auth check.
- Automated tests — verified manually per Acceptance Criteria, consistent with every prior spec.
- Migrating the still-mock placeholder games or touching anything about their unreachable fallback path.

## Data Model

### Supabase migration (new)

```sql
-- profiles: one row per auth.users row, holding the public display alias
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null unique
    check (char_length(username) between 3 and 12)
    check (username ~ '^[A-Za-z0-9_]+$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Auto-create a profile row when a new auth user appears (runs before email
-- confirmation, so the alias exists the moment sign-up succeeds).
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- scores: optionally tied to the authenticated user who saved it
alter table public.scores
  add column user_id uuid references auth.users(id);
```

- `username` is passed as sign-up metadata: `supabase.auth.signUp({ email, password, options: { data: { username } } })`.
- No `insert`/`update` policy on `profiles` — the trigger runs `security definer` and is the only writer; there is no in-scope feature that edits a profile after creation.
- `scores.user_id` is nullable: guest saves keep it `null`, exactly like every score saved before this spec.

### `lib/profiles.ts` (new)

```ts
export interface Profile {
  id: string;
  username: string;
}

export async function getProfile(userId: string): Promise<Profile | null>;
```

- Browser-side only (called from `auth-provider.tsx` right after a session appears), via `lib/supabase/client.ts`.

### `lib/scores.ts` / `lib/scores-client.ts` (changed)

```ts
export interface ScoreRow {
  id: string;
  game_id: string;
  name: string;
  score: number;
  user_id: string | null;
  created_at: string;
}

export async function insertScore(
  gameId: string,
  name: string,
  score: number,
  userId?: string,
): Promise<void>;
```

- `userId` is optional so every existing call site (mock/placeholder games, if ever reached) keeps compiling unchanged.

### `components/auth-provider.tsx` (rewritten shape)

```ts
export interface AuthUser {
  id: string;
  email: string;
  username: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean; // true until the first getSession()/getProfile() resolves
  signOut: () => Promise<void>;
}
```

- `login()` and `saveScore()` are removed — they belonged to the mock. `/iniciar-sesion` and its siblings call `supabase.auth.*` directly; `game-player.tsx` calls `insertScore` directly (already true for every real game today).
- Populated via `supabase.auth.onAuthStateChange`, resolving `getProfile(session.user.id)` whenever a session appears.

### `lib/supabase/proxy.ts` (new)

```ts
export async function updateSession(request: NextRequest): Promise<NextResponse>;
```

- Standard `@supabase/ssr` refresh pattern: reads/writes the session cookie via `createServerClient`, called from `proxy.ts`'s `proxy()` export on every request except static assets.

### `app/auth/callback/route.ts` (new)

- `GET` handler reading `code` and `next` (default `/juegos`) query params, calling `supabase.auth.exchangeCodeForSession(code)`, then redirecting to `next`.
- Reused by three flows, distinguished only by the `next`/`redirectTo` each one sets when it kicks off:
  - OAuth login → `next=/juegos`.
  - Email confirmation link → `next=/juegos`.
  - Password recovery link → `next=/restablecer-contrasena`.

## Implementation Plan

1. **Migration** (`create_profiles_and_scores_user_id`, via `mcp__supabase__apply_migration`): creates `profiles` (RLS + trigger) and adds `scores.user_id`, per Data Model. Verify via `list_tables`/`execute_sql` that both changes exist. No app code reads/writes them yet — behavior unchanged.
2. **Session-refresh plumbing** — `lib/supabase/proxy.ts` (`updateSession`) and root `proxy.ts` calling it on every request except static assets, per the Next.js 16 `proxy` convention (`node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`). Verify: every existing route still renders identically, `npm run build` clean — this step only refreshes cookies, nothing consumes them yet.
3. **`lib/profiles.ts`** (`getProfile`) and the `scores.ts`/`scores-client.ts` changes (`user_id` column, optional `userId` param on `insertScore`). Not yet imported by any new caller; existing `insertScore(gameId, name, score)` call sites keep compiling unchanged. Verify via `npm run build`.
4. **`app/auth/callback/route.ts`** — the shared code-exchange handler. Not yet linked from anywhere; verify it compiles and manually hit it with a bad `code` to confirm it fails gracefully (redirects to `/iniciar-sesion` with an error, rather than crashing).
5. **Rewrite `components/auth-provider.tsx`** to the real-session shape (Data Model above), and update `/iniciar-sesion` in the same step (they're coupled — the page currently calls the mock's `login()`, which is being removed): sign-up now calls `supabase.auth.signUp()` with the username metadata and shows a "revisa tu correo" state instead of navigating away; login calls `supabase.auth.signInWithPassword()` and shows the Spanish translation of a wrong-credentials error inline; the "jugar como invitado" button simply navigates to `/juegos` with no Supabase call, since guest is already the default unauthenticated state. Manual test: sign up with a real inbox, confirm the "check your email" state renders, follow the confirmation link, land back on `/juegos` logged in.
6. **Password recovery pages** — `/recuperar-contrasena` (calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: '<origin>/auth/callback?next=/restablecer-contrasena' })`, always shows the same generic success message regardless of whether the email exists, to avoid leaking which emails are registered) and `/restablecer-contrasena` (calls `supabase.auth.updateUser({ password })` using the session the callback just established, then redirects to `/juegos`). Manual test: request a reset, follow the email link, set a new password, log in with it.
7. **Wire OAuth buttons** on `/iniciar-sesion` to `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: '<origin>/auth/callback?next=/juegos' } })` for both Google and GitHub. Document (in a code comment pointing at this spec, not as a runtime check) that the provider's Client ID/Secret and redirect URI must be configured in the Supabase dashboard first. Manual test: with credentials configured, click through a full Google login once.
8. **Update `nav.tsx` and `game-player.tsx`'s save-score modal** to the new `user` shape: nav shows `user.username` instead of `user.name`; the save-score modal, when `user` is present, skips the editable name input and calls `insertScore(game.id, user.username, score, user.id)` directly, while a guest keeps today's free-text input calling `insertScore(game.id, name, score)` unchanged. Manual test: save a score as a guest (unchanged behavior) and as a logged-in user (name locked to the profile alias, `user_id` populated).
9. **Cross-check pass** — full manual walkthrough: sign up → confirm email → land on `/juegos` logged in → log out → log back in with password → forgot password → reset it → log in with the new password → OAuth login (if credentials are configured) → play any real game as a guest and save a score (`user_id` null, free-text name) → play again logged in and save a score (`user_id` populated, name locked to alias) → confirm both appear correctly on that game's leaderboard and on `/salon-de-la-fama`. No console errors throughout. `npm run build` completes cleanly.

## Acceptance Criteria

- [x] Supabase project has a `profiles` table (RLS enabled, self-only `SELECT` policy, `username` unique + length/charset constraints) and a trigger that creates a profile row the moment a new `auth.users` row is inserted, verifiable via `list_tables`/`execute_sql`.
- [x] Supabase project's `scores` table has a nullable `user_id` column referencing `auth.users(id)`.
- [x] Signing up with a new email, password, and username shows a "revisa tu correo" confirmation state — no session/redirect happens yet.
- [x] Following the confirmation email's link lands the user logged in on `/juegos`.
- [x] Logging in with a confirmed account's correct email/password redirects to `/juegos`; wrong credentials show an inline Spanish error and do not navigate.
- [x] Visiting `/iniciar-sesion` while already logged in redirects to `/juegos`.
- [x] "Jugar como invitado" reaches `/juegos` with no session created.
- [x] `/recuperar-contrasena` accepts an email and always shows the same success message, whether or not that email has an account.
- [x] Following the recovery email's link lands on `/restablecer-contrasena`; submitting a new password there logs the user in witx it going forward and the old password no longer works.
- [x] Clicking the Google/GitHub buttons on `/iniciar-sesion` starts the correct `signInWithOAuth` redirect (full round-trip verified manually once provider credentials are configured, not required to pass automatically).
- [x] `nav.tsx` shows the logged-in user's `username` (from `profiles`, not the email) and "cerrar sesión" ends the real Supabase session.
- [x] Saving a score while logged in inserts a row with `user_id` set and `name` equal to the profile's `username`, with no editable name field shown.
- [x] Saving a score as a guest behaves exactly as before this spec: free-text name field, `user_id` left `null`.
- [x] Both kinds of saved scores appear correctly, ranked by score descending, on that game's leaderboard and on `/salon-de-la-fama`.
- [x] No console errors/warnings during the full walkthrough in the Implementation Plan's step 9.
- [x] `npm run build` completes with no TypeScript or lint errors.

## Decisions Taken and Discarded

- **Replace the mock `AuthProvider` entirely, not run it alongside real auth.** A dual system would mean two sources of truth for "who is logged in" with no clear precedence rule; the mock was always documented as a placeholder (spec 01), so removing it is the point of this spec.
- **Email+password and OAuth (Google/GitHub) both in scope**, over email+password only. Decided explicitly in Phase 2 despite the extra manual dashboard-configuration surface, because the existing `/iniciar-sesion` UI already has social buttons mocked in — leaving them dead would be a visible regression from "looks real" to "known fake."
- **Guest play stays available everywhere.** No route gets an auth gate. Matches today's behavior and spec 01's original design intent (arcade cabinets don't require login to play a round).
- **Username chosen at sign-up, stored in a separate `profiles` table**, not derived from the email or OAuth profile name. Needed uniformly across both auth methods (OAuth providers don't reliably return a usable, unique display name), and keeps the email private from the leaderboard.
- **Profile row created via a database trigger (`security definer`), not a client-side insert after `signUp()`.** With email confirmation required, there is no session (hence no `auth.uid()`) immediately after `signUp()` returns, so a client-side insert would fail the natural RLS check `auth.uid() = id`. A trigger on `auth.users` sidesteps that entirely and is the standard Supabase pattern for this exact situation.
- **`scores.user_id` added as nullable, `scores.name` kept as the display column.** Avoids a breaking change to every existing read path (leaderboard/Hall of Fame already render `name`); `user_id` is purely additive, for future features that might need to look up "my scores" by account rather than by fuzzy name match.
- **No `INSERT`/`UPDATE` policy added to `profiles`.** Nothing in this spec's scope writes to `profiles` outside the trigger; adding a policy for a feature (profile editing) that isn't being built yet would be speculative.
- **No RLS tightening on `scores.INSERT`** beyond what spec 06 already accepted. Tying inserts to `auth.uid() = user_id` would still let a guest insert with `user_id = null` and would not stop a logged-in user from passing someone else's `user_id`, so enforcing it partially would be a false sense of security without solving anything; deferred to a real anti-cheat spec if one is ever prioritized.
- **One shared `/auth/callback` route** over three separate callback endpoints for OAuth/confirmation/recovery. All three are the same "exchange a code for a session" operation in Supabase's SSR flow; only the `next` redirect target differs, which is just a query param.
- **Password-recovery success message is identical whether or not the email exists.** Prevents using `/recuperar-contrasena` to enumerate registered emails.
- **`proxy.ts`, not `middleware.ts`.** Next.js 16 deprecated the `middleware` filename/export in favor of `proxy` (confirmed in the bundled v16 upgrade guide); starting the file with the current name avoids an immediate deprecation warning.
- **No automated tests.** Consistent with every prior spec in this project — acceptance is verified manually against the checklist above.

## Identified Risks

- **OAuth cannot be verified in an automated/CI sense.** Google/GitHub app credentials are project-specific secrets configured outside the codebase. Mitigation: acceptance criteria only require the button to start the correct redirect; the full round-trip is a manual, one-time check once credentials exist (per spec's Phase 2 answer).
- **Trigger-based profile creation runs with elevated (`security definer`) privileges.** A bug in `handle_new_user()` could silently break every sign-up. Mitigation: keep the function to the one insert shown in Data Model, no branching logic, and verify it manually against a real sign-up in step 5 before moving on.
- **`scores` insert stays fully open (public, unauthenticated).** Adding `user_id` without also restricting who can set it means a malicious client could still fabricate a score under someone else's `user_id`. Mitigation: none in this spec — accepted as a continuation of spec 06's already-documented trust level, not a new regression it introduces.
- **Renaming `middleware.ts`-equivalent work to `proxy.ts` is new, Next.js-16-specific territory** with less community precedent than the well-documented `middleware.ts` pattern most Supabase SSR guides show. Mitigation: cross-check `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` before implementing step 2, rather than assuming the `middleware.ts` guide's code translates 1:1.

## What is **not** in this spec

- A profile/account page (view/edit alias, change password while logged in, delete account).
- Any OAuth provider besides Google and GitHub.
- Multi-factor authentication or role-based access.
- Rate limiting / anti-abuse on sign-up, login, or score submission.
- Gating any route (catalog, game detail, or gameplay) behind login.
- Automated tests.

Each one of those, if it lands, goes in its own spec.
