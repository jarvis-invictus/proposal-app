# Marg

AI-guided brand kits and proposals. Describe a deal in plain language, and Marg drafts a
full, on-brand proposal — packages, timeline, terms — ready to send as a single shareable link.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + React 19 + TypeScript
- [Supabase](https://supabase.com) — Postgres, Auth, Row Level Security, Storage
- [AI SDK](https://sdk.vercel.ai) + OpenAI (`gpt-4o`) for proposal generation and the intake chat
- [Firecrawl](https://www.firecrawl.dev) — scrapes a client's site to read their brand (colors, fonts, logo)
- [Resend](https://resend.com) — transactional email; [Upstash Redis](https://upstash.com) — AI-endpoint rate limiting
- [Stripe](https://stripe.com) — billing (paused — see `docs/DECISION_LOG.md`)
- [Sentry](https://sentry.io) — error tracking
- Deployed on [Vercel](https://vercel.com)

## Getting started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure environment variables** — copy `.env.example` to `.env.local` and fill in the
   required values (Supabase, OpenAI, Firecrawl). Everything else in that file is optional for
   local dev and degrades gracefully when unset (see the comments in `.env.example`).
3. **Start a local Supabase stack** (requires the [Supabase CLI](https://supabase.com/docs/guides/cli) and Docker):
   ```bash
   npx supabase start
   ```
   This applies every migration in `supabase/migrations/` and seeds local data from
   `supabase/seed.sql`. Point `.env.local`'s Supabase variables at the local URL/keys it prints.
4. **Run the dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server (Turbopack) |
| `npm run build` | Production build — also runs Next.js's own TypeScript check |
| `npm start` | Serve a production build |
| `npm run lint` | ESLint |
| `npm test` | Unit/integration tests ([Vitest](https://vitest.dev)) |
| `npm run test:e2e` | End-to-end tests ([Playwright](https://playwright.dev)) |

CI (`.github/workflows/ci.yml`) runs typecheck, build, test, and lint on every pull request.

## Project docs

`docs/` has the deeper reference material: `PRD.md` (product spec), `SCHEMA.md` (database
schema), `ROADMAP.md`, `DECISION_LOG.md` (why things are the way they are, including paused or
reversed decisions), and `TEST_PLAN.md`.
