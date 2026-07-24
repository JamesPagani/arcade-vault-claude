# 01 - Arcade Vault MVP (Visual Shell)

- **Status:** Draft
- **Dependencies:** None (first spec of the project)
- **Date:** 2026-07-24
- **Objective:** Port the 5 screens from the static prototype in `references/templates/` (library, detail, player, auth, and hall of fame) into real Next.js 16 App Router routes with the same retro/neon visual design, mock data, and fake localStorage-based session, without implementing any real game logic.

## Scope

### In scope
- 5 routes, all client-visible pages with Spanish UI copy (ported as-is from the templates):
  - `/` — Library (Biblioteca): search, category filter chips, game grid/cards.
  - `/juegos/[id]` — Game Detail (Detalle): game info, tags, stat strip, leaderboard, "Play"/"Back" actions.
  - `/juegos/[id]/jugar` — Player (Reproductor): CRT-styled arena visual with the placeholder auto-incrementing score/level/lives simulation, pause/end flow, save-score modal.
  - `/salon-de-la-fama` — Hall of Fame (Salón de la Fama): per-game tabs, podium (top 3), full leaderboard table, "your score" row when logged in.
  - `/iniciar-sesion` — Auth: sign-in/sign-up tabs, guest login, fake social buttons (non-functional).
- Shared `Nav` component (desktop + mobile hamburger panel) and footer, present across all routes via the root layout.
- Fake session handled by a client-side `AuthProvider` (React Context) wrapping the root layout, persisting to `localStorage` (`av_user`), exposed via a `useAuth()` hook. Any submitted username logs the user in — no real validation, no backend.
- Fake score persistence to `localStorage` (`av_scores`) on save, same shape as the template (`{ game, score, name, at }`).
- Mock data (`GAMES`, `CATS`, `PLAYERS`, `seededScores`) ported into `app/data/`, typed with TypeScript interfaces, matching today's content/values from `data.jsx`.
- Visual system: `styles.css` ported into `app/globals.css` alongside Tailwind v4 (Tailwind stays available for utilities; the visual identity comes from the ported CSS). Pixel-for-pixel match to the templates for layout, colors, animations, and CRT/neon effects.
- Fonts (Press Start 2P, Courier Prime, JetBrains Mono) loaded via `next/font/google` in the root layout.
- Fully responsive behavior as already defined in `styles.css` (mobile nav panel, grid collapse, etc.).

### Not in scope
- Any real, playable game logic. The player screen keeps only the visual placeholder simulation from the template (fake score ticking on an interval) — no real game engines, no per-game mechanics (bricks, tetro, snake, etc.).
- Real authentication/backend: no real user accounts, password hashing, sessions, or API calls. Everything stays client-only/localStorage.
- Real score/leaderboard backend: no database, no server-side ranking — `seededScores` stays a deterministic pseudo-random generator as in the template.
- Internationalization/translation layer — UI copy stays hardcoded Spanish, no i18n framework.
- SEO/metadata polish beyond a basic root `<title>`/description in the layout.
- Any new pages/features not present in the 5 templates (e.g. settings, profile editing, real social login, payments/"credits" system — the coin counter stays a static display).
- Automated tests (unit/e2e) — this spec covers implementation only, verified manually per the acceptance criteria.

## Data Model

All data is mock/static, ported from `references/templates/data.jsx` into typed TypeScript, living under `app/data/`.

### `app/data/games.ts`

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export interface Game {
  id: string;          // slug, e.g. "bloque-buster"
  title: string;
  short: string;        // short description (card)
  long: string;         // long description (detail page)
  cat: GameCategory;
  cover: string;        // CSS class name driving the cover-art gradient (e.g. "cover-bricks")
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;         // global best score (mock)
  plays: string;        // display string, e.g. "12.4K"
}

export const GAMES: Game[];
export const CATS: readonly ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];
```

### `app/data/players.ts`

```ts
export const PLAYERS: string[]; // pool of mock player handles

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/YYYY"
}

export function seededScores(seed: number, count?: number): ScoreRow[];
// Deterministic pseudo-random leaderboard generator, same algorithm as the template.
```

### Session & score persistence (client-side only, via `AuthProvider`)

```ts
export interface AuthUser {
  name: string; // uppercase, max 10 chars
}

// localStorage keys (unchanged from template):
// "av_user"   -> AuthUser | null
// "av_scores" -> Array<{ game: string; score: number; name: string; at: number }>
```

- `AuthProvider` (`components/auth-provider.tsx`, client component) wraps `app/layout.tsx`, exposing `useAuth()` → `{ user, login(user), signOut(), saveScore(entry) }`.
- No schema versioning — this is disposable mock data; corrupt/missing localStorage values are treated as empty/null (same defensive `try/catch` pattern as the template).

## Implementation Plan

1. **Data layer** — Create `app/data/games.ts` and `app/data/players.ts` with the typed `Game`, `ScoreRow` interfaces, `GAMES`, `CATS`, `PLAYERS`, and the `seededScores` function, ported 1:1 from `data.jsx`. System still builds/runs (no visual change yet).

2. **Global styles & fonts** — Port `references/templates/styles.css` into `app/globals.css` (merged with the existing Tailwind v4 base import), and configure `next/font/google` for Press Start 2P, Courier Prime, and JetBrains Mono in `app/layout.tsx`. Add the `av-bg` / `av-noise` background layers to the root layout. System still builds; default scaffold page may look unstyled/broken temporarily.

3. **Auth context** — Create `components/auth-provider.tsx` (`AuthProvider` + `useAuth()` hook) implementing the `av_user` localStorage session and `av_scores` save function. Wrap it around `{children}` in `app/layout.tsx`. No visual output yet, but the provider is testable in isolation.

4. **Shared Nav** — Create `components/nav.tsx` ported from `nav.jsx`, using `next/link` and `usePathname()` for active-route detection instead of the template's route-object comparison, and wired to `useAuth()`. Mount it (plus footer) in `app/layout.tsx`. System now shows a working nav shell on every route (even if pages below are still stubs).

5. **Library route (`/`)** — Implement `app/page.tsx` porting `biblioteca.jsx` (hero, search, category chips, `GameCard` grid with tilt effect) using `GAMES`/`CATS`. Fully functional, standalone page.

6. **Game Detail route (`/juegos/[id]`)** — Implement `app/juegos/[id]/page.tsx` porting `detalle.jsx` (cover, tags, description, stat strip, leaderboard via `seededScores`, play/back actions using `next/link`). Handle unknown `id` via `notFound()`.

7. **Player route (`/juegos/[id]/jugar`)** — Implement `app/juegos/[id]/jugar/page.tsx` porting `reproductor.jsx` (CRT arena visual, HUD, pause/end/restart, save-score modal calling `useAuth().saveScore`). Fully functional placeholder gameplay screen.

8. **Auth route (`/iniciar-sesion`)** — Implement `app/iniciar-sesion/page.tsx` porting `auth.jsx` (sign-in/sign-up tabs, guest login, fake social buttons), calling `useAuth().login` and redirecting to `/` via `useRouter()`.

9. **Hall of Fame route (`/salon-de-la-fama`)** — Implement `app/salon-de-la-fama/page.tsx` porting `salon.jsx` (per-game tabs, podium, leaderboard table, "your score" row when `useAuth().user` is set).

10. **Cross-page pass & polish** — Walk through all 5 routes end-to-end (nav highlighting, mobile hamburger panel, sign-in → play → save score → hall of fame flow, guest flow), fixing any visual drift from the templates and removing the unused default `create-next-app` scaffold content.

## Acceptance Criteria

- [ ] `/` renders the Library: hero header, search input filters the grid by title, category chips filter by `cat`, and each `GameCard` links to `/juegos/[id]`.
- [ ] `/juegos/[id]` renders the Game Detail page for every id in `GAMES` (cover, tags, description, stat strip, leaderboard list from `seededScores`), with "Play Now" linking to `/juegos/[id]/jugar` and "Back" linking to `/`. An unknown id returns a 404 (`notFound()`).
- [ ] `/juegos/[id]/jugar` renders the CRT/arena visual and HUD (player name, score, lives, level), score increases automatically on an interval, "Pause"/"Resume" toggles the tick, "End" opens the game-over modal showing the final score, and saving a score writes an entry to `localStorage` (`av_scores`) and shows the "saved" confirmation state.
- [ ] `/salon-de-la-fama` renders per-game tabs, switching tabs re-generates the podium (top 3) and table via `seededScores` for that game's id, and shows a highlighted "your score" row only when a user is logged in.
- [ ] `/iniciar-sesion` lets the user submit sign-in or sign-up forms (any input accepted) or continue as guest, in all cases setting the session and redirecting to `/`.
- [ ] The Nav (desktop + mobile hamburger) is present on all 5 routes, highlights the active route, and toggles between "Sign In" and the logged-in username with a working sign-out.
- [ ] A logged-in session persists across a full page reload (via `localStorage` `av_user`) and disappears after sign-out.
- [ ] Visual output (colors, fonts, spacing, CRT/neon animations, responsive breakpoints) matches the reference templates on both desktop and mobile viewport widths.
- [ ] No console errors/warnings in the browser on any of the 5 routes during the flows above.
- [ ] `npm run build` completes with no TypeScript or lint errors.

## Decisions Taken and Discarded

- **Path-based routing over hash-based routing.** The template uses a single hash-encoded route object (`#biblioteca`, `#detalle`, ...) in one root component. We discarded replicating that and instead use real App Router file-based routes with Spanish slugs (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/salon-de-la-fama`, `/iniciar-sesion`), since this is idiomatic Next.js and gives shareable/bookmarkable URLs.
- **Keep the player screen's fake score simulation.** Considered stripping the reproductor screen down to a fully static mock (frozen numbers, no interval). Decided to keep the auto-incrementing placeholder simulation as-is, since it was already a visual-only mock in the template (not a real game engine) and removing it would reduce fidelity to the reference without reducing actual scope.
- **Session state via a client Context provider, not per-component localStorage reads.** The template's single-component `useState` for `user` doesn't map onto separate route files. Chose a dedicated `AuthProvider` + `useAuth()` hook over independent per-page localStorage reads so that state updates (e.g. sign-out) reactively propagate to the Nav and other consumers without a full page reload.
- **Port `styles.css` directly rather than reimplementing in Tailwind utilities.** Chosen for pixel-fidelity to the templates and lower implementation risk; Tailwind v4 stays available for any incidental utility needs but is not the primary styling mechanism for this feature.
- **Fonts via `next/font/google` instead of `<link>` tags.** Matches Next.js 16 conventions (self-hosted, no CDN request waterfall, no layout shift) instead of copying the template's raw `<link>` tags.
- **Keep all UI copy in Spanish, no i18n layer.** Matches the reference templates exactly; adding translation infrastructure is out of scope for a visual MVP.
- **Mock data lives under `app/data/`, not `lib/`.** Per user direction, anticipating this will later be swapped for calls to a real database — keeping it colocated under `app/` marks it as the "current data source" rather than a general-purpose library.
- **No automated tests in this spec.** Acceptance is verified manually against the criteria above; test coverage can be addressed in a future spec if needed.

## Identified Risks

- **Hydration mismatches from client-only session state.** Reading `av_user`/`av_scores` from `localStorage` differs between server render (no access) and client render, which can cause React hydration warnings/mismatches in the Nav and pages that depend on `user`. Mitigation: initialize `AuthProvider` state as `null`/empty on first render and sync from `localStorage` in a `useEffect`, matching the template's existing lazy-init pattern, accepting a brief flash of "logged out" UI on load.
- **Tailwind v4 base reset colliding with the ported `styles.css`.** Tailwind's preflight reset may override or conflict with base element styles the custom CSS relies on (buttons, inputs, headings). Mitigation: import order matters — load the ported CSS after Tailwind's base layer, and visually diff each route against the templates during implementation.
- **`next/font/google` metrics differing from the template's raw Google Fonts `<link>` loading**, potentially causing minor spacing/kerning differences in pixel-font headings. Mitigation: accept minor differences as within tolerance for a visual MVP; only escalate if a heading visibly clips or overlaps.
