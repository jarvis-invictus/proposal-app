# Master fix plan — Marg

Source: [2026-09-04-full-audit.md](./2026-09-04-full-audit.md), ~120 findings across six audit passes.

## How this works

17 phases, ordered by risk and dependency, not by how the findings happened to be discovered. Each phase is sized to be one focused session: audit-scope items get fixed, verified live (not just typechecked — same standard as every phase this session so far), and shipped as its own branch/PR. Nothing merges without a separate explicit go-ahead, same pattern as PRs #55-#58.

To resume in a future session, just say which phase number to work on — point at this file and the phase, and everything needed (which findings, which files, what "done" looks like) is here. Check off items as they land so this file stays an accurate map of what's left.

Do not skip ahead into Phase 6+ before Phase 1-3 are done — those three are the ones with a live exploit path or a live trust-breaking bug. Everything after Phase 5 can be reordered to taste; the sequencing there is about coherence, not risk.

---

### Phase 1 — RLS & authorization lockdown ✅ [PR #59](https://github.com/jarvis-invictus/proposal-app/pull/59)
**Why first:** five ways to escalate privilege or bypass billing via a direct REST call, no app code involved.
- [x] `users` RLS policy lets any member PATCH their own `role` — restrict role writes to callers whose own role is already `'owner'` (new migration `20260904080000_rls_authorization_lockdown.sql`, `BEFORE UPDATE` trigger since RLS can't compare OLD/NEW)
- [x] `accounts` RLS policy lets any member PATCH `plan_tier`/`stripe_*` — restrict billing-column writes to service-role only (same migration, column-level `REVOKE`/`GRANT`)
- [x] `proposals` RLS policy lets a drafter PATCH `status` to `PUBLISHED` — restrict status transitions by role, in RLS or a trigger (same migration, `BEFORE UPDATE` trigger)
- [x] `inviteMember` never checks caller's role — require `role === 'owner'` (`app/dashboard/settings/actions.ts:56-65`)
- [x] `switchPlan` trusts a caller-supplied tier — only allow downgrade to `'free'` here; paid tiers only via the Stripe webhook (`app/dashboard/settings/actions.ts:173-178`)

**Verify:** for each RLS fix, attempt the exploit directly against the local Supabase REST API with a non-owner session token, confirm it's now rejected. For the two action-file fixes, call them as a non-owner and confirm a clean permission error.

---

### Phase 2 — Publish & signature integrity ✅ [PR #60](https://github.com/jarvis-invictus/proposal-app/pull/60)
**Why second:** the product's core promise is a document a client signs; these three mean the signed/published artifact can silently not match what the user thinks they sent.
- [x] `handlePublish()` never flushes the pending autosave and `canPublish` never checks `saveStatus` — await a direct save before publish, block while saving/errored (`components/editor/PublishModal.tsx:58`) — fixed via a new `flushBeforePublish` in `ProposalEditor.tsx`, awaited before the publish call
- [x] Signature accept is check-then-act, not atomic — add `.is('accepted_at', null)` to the update filter, check affected row count (`app/api/proposals/[id]/accept/route.ts:41-56`)
- [x] Publish modal title renders "Ready to send to?" when `clientName` is empty (`components/editor/PublishModal.tsx:122`)
- [x] The one RLS isolation test throws instead of asserting — fix the insert handling and assertion so it actually verifies cross-tenant isolation (`__tests__/rls.test.ts:87-116`) — this surfaced a **real dormant regression** (anon lost `EXECUTE` on `get_account_id()` from the Sep-3 hardening migration, breaking anon reads of published proposals entirely); fixed with a new migration

**Verify:** publish immediately after an edit with a throttled/failed save and confirm the published content matches; open two tabs, sign in both, confirm only the first write wins; run the fixed RLS test and confirm it now fails loudly if RLS is ever weakened.

---

### Phase 3 — Public-page front door ✅ [PR #61](https://github.com/jarvis-invictus/proposal-app/pull/61)
**Why third:** this is what a prospect or client actually sees first; a dead nav or a crashable render both cost you the deal before it starts.
- [x] Mobile hamburger button has no `onClick` — the entire nav and "Start Free" CTA are unreachable under `md` breakpoint (`components/MarketingNavbar.tsx:49`); also fix its 20×24px touch target — now a real panel, 44×44px target
- [x] `PATCH /api/proposals/[id]` writes unvalidated `content` — validate against `ProposalSchemaV1` before saving, so a malformed shape can't crash the public render for every future visitor (`app/api/proposals/[id]/route.ts:65-66`) — `.partial().passthrough()`

**Verify:** open the marketing site at a real mobile width, confirm the menu opens and every link/CTA works; PATCH the proposal endpoint with a deliberately malformed `content` shape and confirm it's rejected with a clean error instead of persisted.

---

### Phase 4 — Editor honesty fixes ✅ [PR #62](https://github.com/jarvis-invictus/proposal-app/pull/62)
**Why here:** small, fast, high-visibility — these are the editor lying to the user about their own document.
- [x] `DocStats` shows hardcoded fake stats on every proposal, never updating — compute real counts or hide the bar (`components/editor/DocStats.tsx:6-10`)
- [x] PDF "long" date format previews correctly but silently no-ops on the actual public page — reuse `PdfExportModal`'s `formatDate` (`app/p/[slug]/PublicProposalView.tsx`)
- [x] `PriceInput` always shows `originalPrice` struck through even when `correctPricing()` zeroed it — copy the guard `DeckView.tsx` already has

**Verify:** create a proposal, confirm the stats bar reflects real content and updates as you edit; export with "long" date format and confirm the published page matches the preview; trigger a price-correction case and confirm no nonsensical struck-through "0" appears.

---

### Phase 5 — Billing correctness ⏸️ DEFERRED (2026-09-04)
**Paused, not skipped.** Sahil is moving off Stripe to a different, India-friendly processor (LemonSqueezy or similar — not yet finalized; see `docs/DECISION_LOG.md`'s Sep 4 entry). No point fixing bugs in `lib/stripe.ts`/`/api/webhooks/stripe`/`/api/billing/checkout` when that code is about to be replaced. Revisit this phase once the new provider is chosen — the two findings below may or may not still apply verbatim depending on that provider's own API shape.
**Why here (once resumed):** silent billing failures are the kind of bug you only discover when a customer complains they paid and got nothing.
- [ ] `listUsers()` unpaginated in two places — past 50 total users project-wide, email lookups silently fail (`app/api/webhooks/stripe/route.ts:41`, `app/dashboard/settings/page.tsx:54`) — the `settings/page.tsx` half of this is provider-agnostic and could be fixed independently if worth doing before the provider swap
- [ ] Stripe webhook drops an unresolved `checkout.session.completed` with only a `console.error` — add alerting and persist unresolved events for manual reconciliation (`app/api/webhooks/stripe/route.ts:60-63`) — this exact finding is Stripe-specific; the new provider will need the equivalent check built fresh, not this one ported over
- [ ] `inviteMember` sends a real invite email but no redemption flow exists — **needs your decision**: build redemption, or stop sending the email until it's built (`app/dashboard/settings/actions.ts:56-88`)

**Verify:** simulate a Stripe webhook for a user outside the first 50 (or lower the page size in a test), confirm it resolves correctly or alerts instead of silently dropping; send a real invite locally and confirm the decided behavior (redemption works, or the email no longer promises something that doesn't happen).

---

### Phase 6 — Marketing page honesty
**Why here:** everything in this phase is visible to every prospect, right now, on the page meant to convert them.
- [ ] ⏸️ DEFERRED with Phase 5 — ₹ pricing contradicts the resolved USD-via-Stripe decision in `docs/MVP_LAUNCH_PLAN.md` — update to the real resolved pricing, sourced from the actual Price ID (`components/Pricing.tsx:6-32`, `SettingsClient.tsx:640-671`) — blocked on which processor and which currency/pricing the new provider actually settles on; fixing this against Stripe-shaped assumptions now would likely need redoing
- [x] A literal "Placeholder Pricing" dev badge is shipped live (`components/Pricing.tsx:38-43`) — provider-independent, doable now — **done, [PR #63](https://github.com/jarvis-invictus/proposal-app/pull/63)**
- [x] Two fabricated customer testimonials on a pre-launch product (`components/Testimonials.tsx:3-14`) — provider-independent, doable now — **done, component removed, [PR #63](https://github.com/jarvis-invictus/proposal-app/pull/63)**
- [x] Pay-per-proposal / Agency plan CTAs link to dead `href="#"` (`components/Pricing.tsx:75`) — provider-independent, doable now (though where they should actually lead depends partly on the new checkout flow once it exists) — **done, all route to /signup for now, [PR #63](https://github.com/jarvis-invictus/proposal-app/pull/63)**

**Verify:** confirm no dev-only badge or fabricated quote remains; click every pricing CTA and confirm it goes somewhere real (or at least not a dead `#`). Full "does the shown price match what's actually charged" verification waits for Phase 5.

---

### Phase 7 — AI call safety ✅ [PR #64](https://github.com/jarvis-invictus/proposal-app/pull/64)
**Why here:** cost and reliability exposure across every AI feature, not any one bug.
- [x] No timeout/`AbortSignal` on any of the 9 AI SDK call sites (`app/api/generate-proposal/route.ts`, `app/api/chat/route.ts`, `app/api/proposals/[id]/revise/route.ts`, `lib/brand-extraction/{vision,text}.ts`)
- [x] No `maxDuration` on the revise route or brand-kit extraction actions, unlike their siblings — **revise already had it** (audit finding was stale); brand-kit actions.ts **cannot** have it (Next.js forbids non-async exports from a `'use server'` file — discovered live, broke the dashboard, fixed by relying on per-call `abortSignal` instead)
- [x] No input length cap or output token cap on any of the 9 call sites
- [x] Brand-kit extraction (`extractFromUrl`/`extractFromImage`/`extractFromText`) has zero rate limiting — add a bucket in `lib/ratelimit.ts` (`app/dashboard/brand-kit/actions.ts:9-25`) — also had **zero auth check**, fixed alongside it

**Verify:** simulate a slow/hung provider response (mock or artificial delay) and confirm the call fails cleanly within budget instead of riding the platform's hard kill; loop the brand-kit extraction action and confirm it now gets rate-limited.

---

### Phase 8 — AI correctness ✅ [PR #65](https://github.com/jarvis-invictus/proposal-app/pull/65)
**Why here:** these make the AI features actually work as designed, building on Phase 7's safety net.
- [x] `ReviseSchema` only shallow-`.partial()`'d — one dropped nested field on any array item fails the entire revision; deep-partial the schema or repair/merge server-side (`app/api/proposals/[id]/revise/route.ts:16-19`) — did both: `.deepPartial()` + a `repairChanges()` backfill step
- [x] Brand font values assumed to be a single bare family name everywhere, but extraction prompts explicitly allow compound values like `"Inter, sans-serif"` — split on first comma or constrain the prompt (`lib/webfonts.ts:8` + 4 consumer sites) — turned out to be 1 real consumer (`BrandFontLink`, used at 3 sites) + 3 files doing their own CSS quoting
- [x] Critique call in `generate-proposal` is fully awaited despite its own comment calling it non-blocking — return the draft immediately, run critique as a genuine background follow-up (`app/api/generate-proposal/route.ts:98-116`) — split into a new endpoint, client fires it concurrently with the save
- [x] `gpt-4o` hardcoded inline at all 9 call sites — centralize into one constant (`lib/generation/model.ts`)

**Verify:** revise a proposal where the model would plausibly drop a nested field, confirm it no longer hard-fails; extract a brand kit whose font is a compound CSS value, confirm it renders; time a generation and confirm the response returns before critique finishes.

---

### Phase 9 — Accessibility: critical/high ✅ [PR #66](https://github.com/jarvis-invictus/proposal-app/pull/66)
**Why here:** the accessibility-tester flagged these as launch-blocking on their own.
- [x] `prefers-reduced-motion` ignored across nearly every animated component — `globals.css`, `Button.tsx`, `Switch.tsx`, `SelectMenu.tsx`, `Modal.tsx`, `MicButton.tsx`, `Menu.tsx`, `FilterChip.tsx`, `Toast.tsx`, `DashboardClient.tsx`, `Skeleton`, `AppShell.tsx` — fixed with one universal `globals.css` catch-all rather than 8 individual component edits
- [x] Six delete-confirmation call sites use native `window.confirm()` instead of the app's accessible `Modal` — build one small `ConfirmDialog`, reuse across `PackagesBlock.tsx`, `AddOnsBlock.tsx`, `TimelineBlock.tsx`, `TermsPaymentBlock.tsx`, `AttachmentsBlock.tsx`, `DashboardClient.tsx` — actually 7 sites, found `BrandKitPageClient.tsx` during the sweep too
- [x] `Modal.tsx` itself is missing `role`, `aria-modal`, `aria-labelledby`, and focus trapping — also added Escape-to-close
- [x] `SelectMenu` missing `aria-haspopup`/`aria-expanded`/`aria-controls`/`role="listbox"`/keyboard arrow navigation — also added click-outside-to-close and Tab-to-close

**Verify:** enable OS-level reduced-motion and confirm animations actually stop; tab through a delete confirmation with a screen reader and confirm it announces as a dialog with a trapped focus, not a native browser confirm.

---

### Phase 10 — Accessibility: medium/low ✅ [PR #67](https://github.com/jarvis-invictus/proposal-app/pull/67)
**Why here:** the long tail of the same audit, worth a dedicated pass once the launch-blocking items are done.
- [x] Missing accessible names on `OnboardingWizard` step/category buttons, `DashboardClient` quick-chips and template buttons
- [x] No skip-to-content link (`app/layout.tsx`)
- [x] Form errors not announced via `aria-live`/`role="alert"` (sign error on the public proposal page)
- [x] Color-contrast pairs verified via WCAG computation — `--mist` was measured at 4.39:1 (just under AA) and adjusted to `#656b78`; `--text-secondary` measured 8.9–9.8:1, already passing, no change needed
- [x] `Input.tsx` focus styling switched from JS state to CSS `:focus-visible`
- [x] `Menu`/`RowMenu` given keyboard arrow navigation (auto-focus on open + ArrowUp/ArrowDown roving focus with wraparound)

**Verify:** run an automated contrast checker against the flagged pairs; tab through onboarding and the dashboard quick-actions with a screen reader and confirm every control announces its purpose.

---

### Phase 11 — Database & query performance ✅ [PR #68](https://github.com/jarvis-invictus/proposal-app/pull/68)
**Why here:** invisible today at low volume, compounding as the product grows — worth doing before real usage makes it painful to fix live.
- [x] No `CREATE INDEX` anywhere despite every RLS policy filtering on `account_id` — added indexes on `proposals`, `notifications`, `brand_kits`, `users`, plus `invitations`/`domains`/`templates` (same shape, same fix)
- [x] Settings page's 8+ independent queries now run via `Promise.all`
- [x] Public-proposal view no longer rewrites the entire `content` JSONB just to stamp a timestamp — `last_viewed_at` (its own column) is the only thing touched now
- [x] Added safety-cap `.limit()`s to the dashboard's main proposal list and settings' pending-approvals list
- [x] `getAccountContext()`'s 2-query chain (users → accounts) replaced with one joined select
- [x] Notifications, dashboard, and settings queries no longer pull entire proposal `content` JSONB just to read `slug`/`status`/`title`/`clientName` — selected via `->>` path operators instead

**Verify:** `EXPLAIN ANALYZE` the account-scoped queries before/after the index migration; time the settings page load before/after parallelizing.

---

### Phase 12 — Frontend performance
**Why here:** same theme as Phase 11, client side.
- [ ] Public proposal page fetched twice per load via two separate admin-client calls — dedupe with `React.cache()`
- [ ] Duplicate render-blocking Google Fonts `<link>` loading fonts `next/font` already self-hosts (`app/layout.tsx:37`)
- [ ] Fake 900ms dashboard loading delay, fake 320ms card-open delay unrelated to real data readiness
- [ ] `DeckView` (statically imports `framer-motion`) loads eagerly in the public bundle even though most visitors never click "View as deck" — `next/dynamic` it
- [ ] Entire public proposal page is one top-level client component — convert the bulk to a server component with small client islands (sign modal, PDF modal, view toggle)
- [ ] Marketing homepage hero video uses `preload="auto"` — switch to `preload="metadata"` + poster + lazy start

**Verify:** Lighthouse/Core Web Vitals before/after on the public proposal page and the homepage; confirm bundle size drop after the `DeckView` dynamic import.

---

### Phase 13 — Observability
**Why here:** once the above phases are shipping fixes, you need to actually see if something breaks in production.
- [ ] `Sentry.captureException` called from exactly one place in the whole codebase — wire it into the 18 files currently only `console.error`-ing
- [ ] Raw Postgres/Supabase `error.message` returned directly in JSON responses from public endpoints, including the unauthenticated accept endpoint — map to generic user-facing messages, log real errors server-side only
- [ ] `deleteProposal` and `deleteBrandKit` have zero logging on success — log actor + target on every destructive action

**Verify:** trigger a real error in each fixed path locally, confirm it shows up in Sentry; confirm no raw error text reaches the client response body.

---

### Phase 14 — Storage & data hygiene
- [ ] Uploaded attachments/brand-kit logos never cleaned up if the referencing save fails or the row is deleted — storage grows with orphans forever
- [ ] File size/type limits enforced only in client JS — add server-side or storage-policy enforcement (`lib/attachments.ts:9-27`)

**Verify:** delete a proposal with attachments, confirm the storage objects are actually gone; attempt a direct oversized upload via the storage API and confirm it's rejected.

---

### Phase 15 — Copy & microcopy polish
- [ ] Supabase signup errors discarded, replaced with generic "Could not sign up" (`app/(auth)/actions.ts:46-50`)
- [ ] "5 of 5, filled in" — awkward phrasing (`PublishModal.tsx:32`)
- [ ] Apostrophe glyph inconsistency in `OnboardingWizard.tsx`, `BrandExtract.tsx`
- [ ] "Save as template" menu item looks live but is a dead click — disable with "(coming soon)" like the pattern already used elsewhere (`DashboardClient.tsx:115,376`)
- [ ] Save-error microcopy describes an instruction rather than the real auto-retry mechanism (`EditorHeader.tsx:14`)
- [ ] Public-page footer CTA assumes email-only sharing (`PublicProposalView.tsx:560`)
- [ ] Signature Certificate shows raw IP/UA with no explanation
- [ ] No `openGraph`/`twitter` metadata on the public proposal page — the core "share one link" feature previews as bare in Slack/iMessage/WhatsApp
- [ ] "Export PDF" dashboard menu item navigates to a query param the editor never reads — silently does nothing

**Verify:** share a real proposal link into Slack/iMessage and confirm a real preview renders; click every dashboard menu item and confirm none are silently dead.

---

### Phase 16 — Testing & CI foundation
**Why late, not first:** by this point there's a real backlog of fixes to protect with a real gate — standing up CI before that existed would have had little to protect.
- [ ] No `test` script wired (only `test:e2e`) — add one
- [ ] 146 ESLint errors/40 warnings never block the build or any CI — wire lint into the build or a CI check
- [ ] No CI configuration anywhere in the repo — add one (build + typecheck + lint + test on every PR)

**Verify:** open a PR with a deliberately broken build/test and confirm CI actually fails it.

---

### Phase 17 — Repo housekeeping
- [ ] A dozen throwaway debug/verification scripts committed at the repo root and in `scripts/`
- [ ] Default Next.js/Vercel scaffold SVGs still shipping in `public/`, unreferenced
- [ ] `README.md` claims the wrong font and is otherwise unmodified boilerplate
- [ ] Stale comment claims invite-redemption doesn't exist (already resolved by whatever Phase 5 decides)
- [ ] A generated PDF artifact committed to the repo root
- [ ] Core AI SDK packages are all pre-1.0 — evaluate upgrading
- [ ] Public proposal slugs use non-cryptographic `Math.random()` instead of `crypto.randomUUID()`

**Verify:** confirm `npm run build` and `npm run lint` still pass clean after cleanup; confirm no removed script was actually referenced anywhere (`package.json` scripts, CI, docs).

---

## Progress tracking

| Phase | Status |
|---|---|
| 1 — RLS & authorization lockdown | Done — [PR #59](https://github.com/jarvis-invictus/proposal-app/pull/59), awaiting merge |
| 2 — Publish & signature integrity | Done — [PR #60](https://github.com/jarvis-invictus/proposal-app/pull/60), awaiting merge |
| 3 — Public-page front door | Done — [PR #61](https://github.com/jarvis-invictus/proposal-app/pull/61), awaiting merge |
| 4 — Editor honesty fixes | Done — [PR #62](https://github.com/jarvis-invictus/proposal-app/pull/62), awaiting merge |
| 5 — Billing correctness | ⏸️ Deferred — Sahil is switching off Stripe to an India-friendly processor (LemonSqueezy or similar, not yet finalized); revisit once chosen |
| 6 — Marketing page honesty | Partially done — [PR #63](https://github.com/jarvis-invictus/proposal-app/pull/63) (badge/testimonials/CTAs), awaiting merge; pricing-accuracy item deferred with Phase 5 |
| 7 — AI call safety | Done — [PR #64](https://github.com/jarvis-invictus/proposal-app/pull/64), awaiting merge |
| 8 — AI correctness | Done — [PR #65](https://github.com/jarvis-invictus/proposal-app/pull/65), awaiting merge |
| 9 — Accessibility: critical/high | Done — [PR #66](https://github.com/jarvis-invictus/proposal-app/pull/66), awaiting merge |
| 10 — Accessibility: medium/low | Done — [PR #67](https://github.com/jarvis-invictus/proposal-app/pull/67), awaiting merge |
| 11 — Database & query performance | Done — [PR #68](https://github.com/jarvis-invictus/proposal-app/pull/68), awaiting merge |
| 12 — Frontend performance | Not started |
| 13 — Observability | Not started |
| 14 — Storage & data hygiene | Not started |
| 15 — Copy & microcopy polish | Not started |
| 16 — Testing & CI foundation | Not started |
| 17 — Repo housekeeping | Not started |
