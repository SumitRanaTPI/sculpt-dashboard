# SCULPT Dashboard

Studio website for the SCULPT project. It signs into the **existing** Supabase project and does two things:

1. Reads the studio: home stats, every active garment, one garment's detail, the studio profile, and the Spec catalog.
2. Adds taxonomy the phone can use: a new Spec (`create_parameter`) and a new option on a Spec (`upsert_parameter_option`).

Everything else — garment creation, media upload, editing or deleting Specs, Edge Functions — stays on the phone. See `SCULPT_DASHBOARD_SPEC.md` for the full brief.

## Stack

- Next.js (App Router) + TypeScript `strict`
- Direct `fetch` to PostgREST (`/rest/v1`) and GoTrue (`/auth/v1`). No Supabase client library, no second database.
- Plain CSS with the mobile studio palette.

## Setup

```bash
cp .env.example .env.local   # fill in the two values below
npm install
npm run dev                  # http://localhost:3000
```

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Same project as the mobile app's `EXPO_PUBLIC_SUPABASE_URL`. Origin only, no trailing slash. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Same value as `EXPO_PUBLIC_SUPABASE_ANON_KEY`. |
| `NEXT_PUBLIC_AUTH_LOGIN_MODE` | No | `email_alias` (default) or `phone`. Must match the mobile app. |
| `NEXT_PUBLIC_AUTH_ALIAS_EMAIL_DOMAIN` | No | Default `phone.sculpt.studio`. |

The service-role key must never appear here, in any `NEXT_PUBLIC_*` variable, or in git.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build (also typechecks and lints) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Routes

| Route | Content |
|---|---|
| `/sign-in` | Mobile + password. Same identifier rules as the phone app. |
| `/` | `home_dashboard`: four stats, studio label, date label, recent garments |
| `/garments` | Every `garment_list` row, newest first, with client-side search |
| `/garments/[id]` | `garment_detail`; retired or unknown ids show a not-found state |
| `/studio` | `studio_profile` and sign-out |
| `/specs` | `parameter_catalog` grouped by coding slot, "Add Spec", "Add option" on each Spec |

Signed-out visits to studio routes redirect to `/sign-in`. A valid session in `sessionStorage` skips sign-in.

## Auth behaviour

- Sign-in: `POST /auth/v1/token?grant_type=password`
- On HTTP 401 from any data call: refresh once (`grant_type=refresh_token`) and retry once. Only one refresh is ever in flight.
- If the refresh fails, the session is cleared and the app returns to `/sign-in`.
- Sign-out: best-effort `POST /auth/v1/logout?scope=local`, then clear the session.
- Tokens live in `sessionStorage` only. Nothing is logged and nothing is put in the URL.

## Layout

```
src/
  app/
    layout.tsx              root layout + AuthProvider
    sign-in/page.tsx
    (studio)/               guarded route group
      layout.tsx            redirect when signed out, header shell, profile fetch
      page.tsx              home
      garments/page.tsx
      garments/[id]/page.tsx
      studio/page.tsx
      specs/page.tsx
  components/
    AuthProvider.tsx        session context
    ProfileProvider.tsx     studio_profile shared by header and /studio
    AppShell.tsx            header + nav
    GarmentCard.tsx
    States.tsx              loading / empty / error
    specs/AddSpecForm.tsx
    specs/AddOptionForm.tsx
  lib/
    env.ts
    auth/session.ts         sessionStorage read/write
    auth/mobile.ts          mobile normalisation (matches the phone app)
    auth/api.ts             sign in, single-flight refresh, sign out
    api/client.ts           PostgREST fetch wrapper with 401 retry
    api/studio.ts           the five reads, the two writes, error → copy mapping
    api/types.ts
    hooks/useAsync.ts
```
