# 02 - Home Landing Page & Library Relocation

- **Status:** Approved
- **Dependencies:** [01-arcade-vault-mvp.md](./01-arcade-vault-mvp.md)
- **Date:** 2026-07-24
- **Objective:** Replace the current `/` route (which shows the game library) with a new marketing-style landing page ported from `references/templates/home-about/home.jsx`, and move the existing library page to `/juegos`.

## Scope

### In scope
- New `/` route: the landing/marketing home page ported from `references/templates/home-about/home.jsx`, including:
  - Hero section with floating pixel-silhouette decorations, headline, subcopy, and CTAs ("Explorar Juegos" → `/juegos`, "Crear Cuenta" → `/iniciar-sesion`).
  - "¿Por qué Arcade Vault?" feature grid (4 static feature cards with pixel icons).
  - "Juegos Disponibles Ahora" preview rail showing the first 6 `GAMES`, each linking to `/juegos/[id]`, with a "Ver Todos los Juegos" CTA → `/juegos`.
  - Stats band (e.g. "12+ JUEGOS", "MILES DE PARTIDAS", "GLOBAL RANKING") ported as static hardcoded content, matching the template.
  - "Actividad en Vivo" section: recent-scores ticker and "Top Jugadores · Hoy" list, both ported as static hardcoded content (not derived from `seededScores`/`GAMES`), with a "Ver Salón →" link to `/salon-de-la-fama`.
  - "Precios" section: free-plan pricing card + FAQ, ported as-is, with CTA → `/iniciar-sesion`.
  - Final CTA section ("¿Listo Para Jugar?") → `/juegos`.
  - Scroll-reveal animation behavior (`useReveal` / `IntersectionObserver` + `.reveal`/`.in` classes) ported as a new client-side hook/component.
- Move the current library page (today's `app/page.tsx`) to `app/juegos/page.tsx`, unchanged in behavior/content (hero, search, category chips, game grid).
- Update `Nav` (`components/nav.tsx`):
  - Add an "Inicio" link → `/`.
  - "Biblioteca" link now points to `/juegos` (was `/`).
  - Add a visually-present but non-navigating "Acerca de" placeholder (greyed/disabled styling), since the About page itself is out of scope.
  - Active-route highlighting updated accordingly (`/` highlights "Inicio", `/juegos*` highlights "Biblioteca").
- Update all internal links that currently point to `/` with the intent of "go to the library" so they point to `/juegos` instead:
  - `app/juegos/[id]/page.tsx` back button.
  - `components/game-player.tsx` game-over screen's back-to-library button.
  - `app/salon-de-la-fama/page.tsx` "Volver a Biblioteca" button.
  - `app/iniciar-sesion/page.tsx` post-login/signup/guest redirect (currently `router.push("/")`, both call sites).
  - Labels/copy on these buttons stay unchanged — only the `href`/`push` target changes.
- Port the additional CSS rules needed for the new sections (`.home-hero`, `.home-silos`/`.silo`, `.home-section`, `.feature-grid`, `.mini-rail`, `.home-stats`, `.activity-grid`, `.pricing-grid`, `.home-final`, and related rules) from `references/templates/home-about/styles.css` into `app/globals.css`, merging with the existing ported styles (no duplication of shared rules already ported in spec 01).
- Root layout / logo click in `Nav` continues to point at `/`, which now correctly resolves to the new landing page (no code change needed there beyond what's listed above).

### Not in scope
- The "Acerca de" (About) page itself — `about.jsx` is **not** implemented in this spec. The Nav's "Acerca de" entry is a non-clickable placeholder only.
- Any change to the "Salón de la Fama" or "Auth" page content/logic beyond the single link-target fix listed above.
- Wiring the new home page's stats/activity/leaderboard sections to real or existing mock data (`GAMES`, `seededScores`) — they stay hardcoded static content matching the template.
- Any new data structures — this spec introduces no new `app/data/*` types.
- SEO/metadata changes beyond what already exists in the root layout.
- Automated tests — verified manually per the acceptance criteria, consistent with spec 01.

## Implementation Plan

1. **Move the library page** — `git mv`/recreate `app/page.tsx` as `app/juegos/page.tsx` with identical content. System still builds; `/juegos` now shows the library, `/` temporarily 404s (or shows a stale default) until step 2.
2. **Port the home page** — Create the new `app/page.tsx`, porting `home.jsx`'s JSX structure (hero, floating silhouettes, feature grid, games preview rail, stats, activity/leaderboard, pricing, final CTA) into a Next.js client component, using `Link`/`useRouter` for navigation instead of the template's `navigate()` prop, and pulling the preview rail from the existing `GAMES` data. `/` now renders the new landing page end-to-end (visual polish deferred to step 4).
3. **Port scroll-reveal behavior** — Create a small client-side `useReveal` hook (e.g. `components/use-reveal.ts` or inline in the home page) replicating the template's `IntersectionObserver` + `.reveal`/`.in` logic, applied to each section of the new home page.
4. **Port required CSS** — Add the missing home-page rules (`.home-hero`, `.home-silos`/`.silo`, `.home-section`, `.feature-grid`, `.mini-rail`, `.home-stats`, `.activity-grid`, `.pricing-grid`, `.home-final`, and related keyframes/media queries) from `references/templates/home-about/styles.css` into `app/globals.css`. Visual output on `/` now matches the reference template.
5. **Update the Nav** — Add the "Inicio" link (→ `/`), repoint "Biblioteca" to `/juegos`, add the disabled "Acerca de" placeholder, and fix active-route detection for both desktop and mobile panels. Nav now reflects the new route structure on every page.
6. **Fix remaining internal links** — Update the back-to-library links in `app/juegos/[id]/page.tsx`, `components/game-player.tsx`, and `app/salon-de-la-fama/page.tsx`, plus both `router.push("/")` calls in `app/iniciar-sesion/page.tsx`, to target `/juegos`. All "return to the game library" flows now land on `/juegos` instead of the new home page.
7. **Cross-page pass & polish** — Walk through: `/` (new landing) → CTAs → `/juegos` → game detail → play → save score → back-to-library → `/salon-de-la-fama` → sign-in → redirect to `/juegos`, verifying nav highlighting, mobile hamburger behavior, and no visual drift from the reference template on desktop and mobile widths.

## Acceptance Criteria

- [ ] `/` renders the new landing page: hero with floating silhouettes and CTAs, feature grid, games preview rail (first 6 `GAMES`, each linking to `/juegos/[id]`), stats band, activity/leaderboard section, pricing/FAQ section, and final CTA — matching `references/templates/home-about/home.jsx` visually and structurally.
- [ ] `/juegos` renders exactly what `/` used to render before this spec: hero header, search input, category chips, and game grid linking to `/juegos/[id]`.
- [ ] `/` no longer shows the library; `/juegos` is the only route showing it.
- [ ] Scroll-reveal: sections on the new home page fade/animate into view as they cross into the viewport (matching the template's `.reveal`/`.in` behavior), without console errors.
- [ ] On the new home page, "Explorar Juegos" and "Ver Todos los Juegos" and the final CTA all navigate to `/juegos`; "Crear Cuenta" and the pricing CTA navigate to `/iniciar-sesion`; "Ver Salón →" navigates to `/salon-de-la-fama`; each of the 6 preview game cards navigates to its `/juegos/[id]`.
- [ ] The Nav (desktop + mobile) shows "Inicio", "Biblioteca", a non-clickable "Acerca de" placeholder, and "Salón de la Fama"; "Inicio" highlights as active on `/`, "Biblioteca" highlights as active on `/juegos` and `/juegos/[id]*`.
- [ ] The Nav logo click and "Inicio" link both navigate to `/` (the new landing page).
- [ ] The back button on `/juegos/[id]`, the game-over screen's back-to-library button, and "Volver a Biblioteca" on `/salon-de-la-fama` all navigate to `/juegos` (not `/`).
- [ ] Signing in, signing up, or continuing as guest on `/iniciar-sesion` redirects to `/juegos` (not `/`).
- [ ] Visual output on `/` (colors, fonts, spacing, animations, responsive breakpoints) matches `references/templates/home-about/home.jsx` + `styles.css` on desktop and mobile viewport widths.
- [ ] No console errors/warnings on `/` or `/juegos` during the flows above.
- [ ] `npm run build` completes with no TypeScript or lint errors.

## Decisions Taken and Discarded

- **Relocate the library to `/juegos` rather than introducing a new path like `/biblioteca`.** `/juegos` already exists as the parent segment for `/juegos/[id]` and `/juegos/[id]/jugar`, so nesting the library list at `/juegos` keeps the game-related routes under one consistent prefix instead of scattering them across `/` and `/biblioteca`.
- **"Acerca de" gets a disabled Nav placeholder, not a working link or omission.** Matches the template's visual layout (4 nav items) now, while making it explicit to users that the page isn't ready, without doing any of the actual About-page work — that's deferred to its own spec.
- **Stats and activity/leaderboard sections stay hardcoded, not wired to `GAMES`/`seededScores`.** This spec is a visual port, consistent with spec 01's approach; deriving "real" numbers from mock data is a logic change beyond a landing-page port and can be revisited later if desired.
- **Post-login redirect changes from `/` to `/juegos`.** Since `/` is no longer the library, sending a freshly-authenticated user to the library (the actual "let's play" experience) preserves the original intent of that redirect better than sending them to the new marketing page they likely just came from.
- **All "back to library" links get their `href`/`push` target updated to `/juegos`, with no copy changes.** These buttons' intent ("return to the game list") is unchanged; only the underlying route moved.
- **Scroll-reveal ported as a small reusable hook rather than inlined per-section logic.** Mirrors the template's `useReveal()` pattern and keeps the new home page component readable, consistent with how `AuthProvider`/`useAuth()` was factored out in spec 01.

## Identified Risks

- **Missing a "back to library" link during the `href` sweep.** Four call sites need the `/` → `/juegos` fix (detail back button, game-over screen, hall-of-fame button, two auth redirects); missing one would silently strand a flow on the new landing page instead of the library. Mitigation: the grep-confirmed list in the Implementation Plan is the checklist for step 6; re-grep for `href="/"` and `push("/")` after the change to confirm none remain outside the Nav/logo.
- **CSS rule collisions/duplication when merging home-page styles into `app/globals.css`.** Some selectors ported in spec 01 (e.g. shared button/section utility classes) may overlap with rules in the home-page section of the template's `styles.css`. Mitigation: diff the new rules against existing `globals.css` before appending; only add rules not already present.
- **`IntersectionObserver`-based scroll-reveal running before hydration or without guarding for `IntersectionObserver` support.** Could cause sections to never reveal (stuck at opacity 0) if the observer setup runs too early or in an unsupported environment. Mitigation: mirror the template's `useEffect`-based setup exactly (runs post-mount, client-only), and treat "always visible, no animation" as an acceptable degraded state rather than blocking content.
