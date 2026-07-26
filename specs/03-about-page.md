# 03 - About Page & Contact Email

- **Status:** Draft
- **Dependencies:** [02-home-landing-page.md](./02-home-landing-page.md)
- **Date:** 2026-07-25
- **Objective:** Port the `/acerca-de` page (mission statement + contact form) from `references/templates/home-about/about.jsx`, wiring the contact form to send an email via Resend.

## Scope

### In scope
- New `/acerca-de` route ported from `references/templates/home-about/about.jsx`:
  - About hero: kicker, title, mission statement paragraph, and the 3-item highlight row (pixel icons + text), ported as static content.
  - Divider banner (decorative pixel strip), ported as-is.
  - Contact section: intro copy + tips list, and the contact form (name, email, message fields).
  - Scroll-reveal behavior on the divider and contact section, reusing the existing `useReveal` hook/pattern from `components/use-reveal.ts` (spec 02) instead of re-implementing the template's inline `IntersectionObserver` logic.
  - Client-side validation before submit: name, email, and message must be non-empty (matching the template); additionally, email must match a basic format regex. Failing validation triggers the existing shake animation, same as the template.
  - Submit states: idle → sending (loading indicator on the submit button, button disabled) → success (the template's "terminal" success screen, showing the submitted name) or error (inline error message in the form, allowing the user to retry without losing their typed input).
- Contact email delivery via Resend:
  - A Next.js Route Handler (`app/api/contacto/route.ts`) receives the form payload (`name`, `email`, `message`), sends it as an email through the Resend SDK, and returns success/failure to the client.
  - Email sent from `onboarding@resend.dev` (Resend's shared test sender, since no verified custom domain exists yet) to a fixed destination address configured via the `CONTACT_EMAIL` environment variable (value for this environment: `jaime.galvez@vibeconsulting.com.co`).
  - Email body includes the submitted name, email, and message in a simple readable format (plain text or minimal HTML).
  - `RESEND_API_KEY` read from environment variables (`.env.local`, not committed); the user configures the real key themselves.
  - `resend` npm package added as a new dependency.
- Enable the "Acerca de" Nav entry (`components/nav.tsx`, desktop + mobile panel): replace the disabled `<span>` placeholder with a real `Link` to `/acerca-de`, including active-route highlighting.
- Port the additional CSS rules needed for the about/contact page (`.about`, `.about-hero`, `.highlight-row`/`.highlight`, `.about-divider`/`.div-bar`/`.div-pixels`, `.about-contact`/`.contact-grid`/`.contact-form`, and related keyframes) from `references/templates/home-about/styles.css` into `app/globals.css`.

### Not in scope
- Reply-To header on the outgoing email — the email is sent only from `onboarding@resend.dev` with no way to reply directly to the submitter from the inbox.
- Anti-spam protection (honeypot fields, rate limiting, CAPTCHA) on the contact endpoint.
- Persisting contact submissions anywhere (database, localStorage, logs beyond default server logs) — a submission either sends an email or it doesn't; nothing is stored.
- Verifying a custom domain in Resend or using a branded "From" address (e.g. `contacto@arcadevault.com`) — deferred until a real domain is available.
- Any change to the "Home" (`/`) or "Library" (`/juegos`) pages beyond the Nav update.
- Automated tests — verified manually per the acceptance criteria, consistent with specs 01 and 02.

## Data Model

No persistent data structures are introduced (nothing is stored — see Scope). This section documents the contact endpoint's request/response contract and required environment variables.

### `app/api/contacto/route.ts` — POST contract

```ts
// Request body
interface ContactRequest {
  name: string;    // non-empty, trimmed
  email: string;   // non-empty, trimmed, basic email-format regex
  message: string; // non-empty, trimmed
}

// Response body
type ContactResponse =
  | { ok: true }
  | { ok: false; error: string }; // generic message, safe to show in the UI
```

- Server-side re-validates that `name`, `email`, and `message` are non-empty strings and that `email` matches the same basic format regex used client-side (defense in depth — never trust client validation alone).
- On any failure (missing fields, invalid email, Resend API error/exception), responds with HTTP 4xx/5xx as appropriate and `{ ok: false, error: "..." }`; no stack traces or Resend internals leak to the client.

### Environment variables (`.env.local`, not committed)

```
RESEND_API_KEY=re_xxxxxxxx   # Resend API key, used server-side only
CONTACT_EMAIL=jaime.galvez@vibeconsulting.com.co   # fixed destination for contact-form emails
```

- Both are read only inside the Route Handler (server-side); never exposed to the client bundle.
- Required variables are already documented in `.env.template` at the repo root.

## Implementation Plan

1. **Install Resend & configure environment** — Add the `resend` package to `package.json`, create/update `.env.local` with `RESEND_API_KEY` and `CONTACT_EMAIL` placeholders, and add a `.env.example` (or equivalent) documenting the required variables without real secrets. System still builds; no behavior change yet.
2. **Contact API route** — Create `app/api/contacto/route.ts` implementing the `POST` handler: parse and validate the request body (non-empty fields + email regex), send the email via the Resend SDK (`from: onboarding@resend.dev`, `to: process.env.CONTACT_EMAIL`), and return the `ContactResponse` shape described in the Data Model. Testable independently via a manual HTTP request (e.g. `curl`) before any UI exists.
3. **Port required CSS** — Add the about/contact page rules (`.about`, `.about-hero`, `.highlight-row`/`.highlight`, `.about-divider`/`.div-bar`/`.div-pixels`, `.about-contact`/`.contact-grid`/`.contact-form`, keyframes) from `references/templates/home-about/styles.css` into `app/globals.css`, checking for collisions with rules already ported in specs 01/02.
4. **About page route** — Create `app/acerca-de/page.tsx` porting `about.jsx`'s JSX structure (hero, highlight row, divider, contact intro/tips) as a client component, using the existing `useReveal` hook (from spec 02) instead of the template's inline `IntersectionObserver` effect. Static content renders correctly at `/acerca-de`; the form is not yet wired to the API.
5. **Wire the contact form** — Implement form state (idle/sending/success/error), client-side validation (non-empty + email regex, triggering the shake animation on failure), and the `fetch("/api/contacto", { method: "POST", ... })` call on submit. On success, show the template's "terminal" success screen with the submitted name; on error, show an inline error message and keep the user's input intact for retry.
6. **Enable the Nav link** — In `components/nav.tsx` (desktop links + mobile panel), replace the disabled `<span>` "Acerca de" placeholder with a `Link` to `/acerca-de`, adding an `isAcercaDe` active-route check consistent with the existing `isInicio`/`isBiblioteca`/`isSalon` pattern.
7. **Cross-page pass & polish** — Walk through: Nav → "Acerca de" → `/acerca-de` (verify visual match to the template, scroll-reveal on divider/contact section) → fill and submit the contact form (happy path: real email arrives at `CONTACT_EMAIL`) → submit with an invalid email (shake + no request sent) → simulate a server error (e.g. temporarily invalid `RESEND_API_KEY`) to confirm the inline error state renders correctly. Verify Nav highlighting on desktop and mobile.

## Acceptance Criteria

- [ ] `/acerca-de` renders the about hero (kicker, title, mission paragraph, 3-item highlight row), the divider banner, and the contact section (intro copy, tips, form) — matching `references/templates/home-about/about.jsx` + `styles.css` visually and structurally.
- [ ] The divider and contact section fade/animate into view on scroll (via the shared `useReveal` hook), without console errors.
- [ ] Submitting the form with any empty field, or with a malformed email address, triggers the shake animation and does not send a request to `/api/contacto`.
- [ ] Submitting the form with valid name, email, and message shows a "sending" state (disabled submit button), then, on success, replaces the form with the "terminal" success screen showing the submitted name — and a real email arrives at the `CONTACT_EMAIL` inbox containing the submitted name, email, and message.
- [ ] "ENVIAR OTRO MENSAJE" on the success screen resets the form back to its empty, editable state.
- [ ] If the email fails to send (e.g. invalid `RESEND_API_KEY` or Resend outage), the form shows an inline error message, keeps the user's typed input, and allows retrying submission — the success screen is never shown for a failed send.
- [ ] `POST /api/contacto` rejects requests with missing/empty fields or an invalid email format with an HTTP 4xx response and `{ ok: false, error: "..." }`, without leaking Resend internals or stack traces.
- [ ] The Nav (desktop + mobile) shows "Acerca de" as a working link to `/acerca-de`, highlighted as active only on that route; the previous disabled placeholder no longer appears.
- [ ] Visual output on `/acerca-de` (colors, fonts, spacing, animations, responsive breakpoints) matches `references/templates/home-about/about.jsx` + `styles.css` on desktop and mobile viewport widths.
- [ ] No console errors/warnings on `/acerca-de` during the flows above.
- [ ] `npm run build` completes with no TypeScript or lint errors.

## Decisions Taken and Discarded

- **Route Handler (`app/api/contacto/route.ts`) over a Server Action.** Both are valid in Next.js 16, but the rest of the codebase uses plain client components calling out via explicit `fetch`/handlers (no Server Actions used anywhere yet), so a Route Handler keeps the pattern consistent with the app's existing client-driven architecture (`AuthProvider`, `game-player.tsx`, etc.).
- **Fixed destination email via `CONTACT_EMAIL` env var, not a hardcoded address in source.** Keeps the real inbox out of version control and makes it trivial to repoint in a different environment without a code change.
- **Send from `onboarding@resend.dev`, no Reply-To.** No domain is verified in Resend yet, so a custom "From" isn't possible; adding Reply-To was considered but explicitly deferred (see Scope) to keep this spec's surface area small — revisit once a real domain/sender strategy exists.
- **Added email-format validation beyond the template's empty-check-only behavior.** The template only checks for non-empty fields; since this form now triggers a real external side effect (an email send, unlike the original static mock), a basic format check avoids wasting sends on obviously malformed addresses. Re-validated server-side too, since client-side checks can be bypassed.
- **No persistence of contact submissions.** Considered logging submissions to `localStorage` or a file for record-keeping, matching the project's "mock persistence" pattern elsewhere (`av_user`, `av_scores`). Discarded because email delivery via Resend already is the record (it lands in the destination inbox); adding a second copy is unrequested scope.
- **No anti-spam protection in this spec.** Honeypot/rate-limiting would add meaningful implementation surface (extra fields, server-side throttling logic) for a form with no current public traffic; deferred to a future spec if abuse becomes a real concern.
- **Reuse the existing `useReveal` hook (spec 02) instead of porting the template's inline `IntersectionObserver` effect a second time.** Avoids duplicating scroll-reveal logic that already exists in the codebase; the template's inline version was only necessary because `about.jsx` was a standalone script, not a modular Next.js app.
- **Nav's "Acerca de" is enabled as part of this spec, not deferred further.** It only made sense to keep it disabled while the page didn't exist (spec 02's decision); implementing the page and leaving the link disabled would just recreate the same "not ready" signal for no reason.

## Identified Risks

- **Missing or invalid `RESEND_API_KEY` at runtime.** If the env var is unset or wrong, every submission will fail server-side. Mitigation: the Route Handler catches the Resend SDK error explicitly and returns the generic error response (never a 500 with an unhandled exception page); the required variables are already documented in `.env.template` (`CONTACT_EMAIL`, `RESEND_API_KEY`), so setup isn't forgotten.
- **Resend's shared test sender (`onboarding@resend.dev`) getting rate-limited or filtered as spam by some receiving mail providers.** Since no custom domain is verified, deliverability to `CONTACT_EMAIL` isn't guaranteed on every provider. Mitigation: accepted as a known limitation of the test sender for this spec; verifying a real domain is explicitly out of scope and can be revisited later.
- **CSS rule collisions when merging about/contact styles into `app/globals.css`.** Some class names (e.g. generic `.tip`, `.field`) could overlap with rules already ported in specs 01/02. Mitigation: diff new rules against the existing `globals.css` before appending, matching the approach already used in spec 02.
- **Client-only email regex diverging from the server-side regex**, letting a client-accepted address fail server validation (or vice versa) with a confusing UX. Mitigation: use the exact same regex constant in both the client component and the Route Handler (shared via a small utility or duplicated verbatim with a comment marking them as intentionally identical).
