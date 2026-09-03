# Feature Audit — What's Actually Real

Grounded against the live codebase and database on 2026-09-01, not recalled from memory or
prior PR descriptions. Every "confirmed" claim below was checked by reading the actual
file/route in question or querying the running database directly. Where something is
described as missing, that means grepped for and not found — not "I don't remember it."

Status legend: ✅ Real and working · 🟡 Partially real / honest gaps · ❌ Not built at all

Update this file whenever a feature's real/fake status changes — it's meant to stay accurate,
not become another stale snapshot like ROADMAP.md currently is.

**Reconciled against the live code on 2026-09-02**: §6, §7, and §11 (team invites) have
genuinely changed since the original 2026-09-01 audit below and are marked accordingly. §12
now also reflects a real (if narrow) automated-test suite. Everything else was re-checked and
stands exactly as originally written.

## 1. Auth & Onboarding — ✅
Real Supabase Auth (signup/login/logout). Real 4-step onboarding wizard writing real
`accounts`/`brand_kits` rows.

## 2. Dashboard — ✅
Real proposal list, filters (status/client/search), stats, duplicate/delete/copy-link. Deal
values inherit the currency-semantics gap described in §6.

## 3. Templates — 🟡
3 real system templates (`templates` table, `is_system_default = true`). Filter/search/preview
all real. "Save a proposal as template" is still a "coming soon" toast — no account has ever
saved a custom template, so the library can't grow past those 3 seeded rows yet.

## 4. Brand Kit extraction — 🟡 (3 of 5 sources real)
- ✅ Scan website (URL) — real GPT-4o extraction
- ✅ Upload assets (image) — real GPT-4o vision extraction
- ✅ Describe in words (text) — real GPT-4o extraction, verified live (correctly returned
  #000000/#FFFF00 for a "black and neon yellow streetwear" description)
- ❌ Upload a brand guide (PDF/doc) — "Coming soon", no backend
- ❌ Connect a codebase — "Coming soon", no backend

4 real brand kits exist in the DB.

## 5. New Proposal AI intake — ✅
Real streaming GPT-4o conversation (`/api/chat`), real follow-up questions, real structured
extraction. "Reference a past proposal" is real — verified via direct server calls (with the
reference present, the model correctly reports seeing the referenced proposal's exact title;
without it, it reports seeing nothing). Dictation uses the real browser Web Speech API.

## 6. Generation — ✅ (currency gap fixed since the original audit)
`/api/generate-proposal` is a genuine GPT-4o call against `ProposalSchemaV1`.

**Currency-semantics gap — fixed as of 2026-09-02.** The original finding here was that
`ProposalSchemaV1` has no `currency` field and the generation prompt never mentioned currency,
so a deal described in rupees could render as "$50,000" on a USD-configured account. Confirmed
by reading the current route directly: the account's selected currency is now injected into
every generation prompt via `currencyPromptInstruction()` (`lib/accountCurrency.ts`), shared
between the chat intake and the generation call so the instruction can't drift between them.

Separately, generation went through a substantial rebuild in PRs #39/#40/#41 (proposal-generation
overhaul, see `docs/PHASE2_INITIATIVES_PLAN.md` §1): brand kit colors/fonts/name and an optional
style brief now genuinely shape the writing (previously extracted and then never read by any
prompt), and the single `generateObject` call was split into section-by-section drafting plus an
advisory critique pass that flags concerns (fabricated pricing, tone inconsistencies) without
blocking generation.

## 7. Editor — 🟡 real for what's built, one item never built (regression below now fixed)
Confirmed by re-reading the current `ProposalEditor.tsx` directly:
- ✅ Real, autosaving: title, packages, add-ons, timeline, terms & payment — all five confirmed
  persisting correctly, including nested arrays.
- ✅ **Regression fixed as of 2026-09-02.** The original finding here was that no
  `ThemeColorPicker` and no `PdfExportModal`/"Download PDF" button existed anywhere in the
  current Editor, a real drop from the pre-correction editor. Confirmed directly in the current
  code: both are wired in and working now — `EditorHeader.tsx` renders a live `ThemeColorPicker`
  bound to the proposal's brand color, and an "Export PDF" button opens the same
  `PdfExportModal` used on the public view. `AIDock.tsx` and `SectionRail.tsx` were not part of
  this fix and remain unused — not re-checked this pass.
- ❌ **Never built, not even orphaned:** version history (no code exists anywhere for this — the
  only "version" reference in the whole app is the mockup source file), the docked AI assistant
  for section rewrites, drag-to-reorder. These are the two features flagged at the start of
  Correction 6 as needing a schema/AI-call decision before being built — still true.
- Public-page theming still reads `content.themeColor` with a real fallback chain (proposal's
  own color → brand kit primary → hardcoded indigo), so newly generated proposals theme off the
  brand kit correctly. Per-proposal color override is unavailable until the picker is rewired.

## 8. Publish Flow — ✅
Owner/approver publishes directly; drafter → `PENDING_APPROVAL` with a real notification
insert. Verified live for both roles, including cross-checking the drafter path against
Settings' pre-existing approval-chain UI.

## 9. Notifications — 🟡
✅ Real events (view/accept/approval-request), real mark-as-read, real approve action (reuses
Correction 2's `approveProposal`, not a duplicate).
❌ Never built: live "reading now" presence, per-section time-on-page analytics, reminder-nudge
toggles, AI-drafted follow-up (flagged from day one as needing a decision — still unmade).
29 real notification rows exist in the DB from this session's testing.

## 10. Client-facing public page — 🟡
✅ Real view tracking, real signature capture, real accept flow, real "deal won" state, real
acceptance notification.
🟡 PDF export is the browser's native print-to-PDF (`window.print()`) — there is no
server-side PDF renderer anywhere in this codebase. Honest and working, just not a real PDF
service.

## 11. Settings — 🟡 (re-checked each sub-tab against its actual code)
- ✅ Profile & business — fully real.
- ✅ Payment details — real display fields (UPI ID, link, QR upload). No processing, by design
  — honest, not incomplete.
- ✅ **Team — fixed as of 2026-09-02.** The original finding was that invite records were real
  but no email ever sent. Confirmed directly in the current code: `lib/email.ts` has a real
  Resend integration, and the invite action actually calls it — an invited teammate now gets a
  real email.
- 🔴 Custom domains — real DB rows and real slot-limit enforcement, but confirmed zero
  DNS/CNAME verification code and zero routing logic anywhere (`proxy.ts` included) that would
  serve a proposal from a custom domain even if verification existed. Currently a naming
  exercise with no infrastructure behind it.
- 🟡 Plan & billing — free-tier switch is real and instant. Paid tiers open the Subscribe
  scaffold: real payload preview, explicit "won't charge you" disclosure, no real
  Razorpay/LemonSqueezy connection. Currency selector is real and correctly wired through
  Editor + public view + Dashboard (see §6 for the AI-side gap this doesn't cover).

## 12. Cross-cutting

- **Mobile responsiveness** — real, verified fixes (sidebar auto-collapse, grid stacking).
  Editor header stays visually cramped on very narrow phones — disclosed, not fixed; a real
  mobile-native Editor redesign is a feature project, not a polish task.
- **Automated tests** — improved as of 2026-09-02, still far from comprehensive. The original
  finding was zero, anywhere in the repo. A real (if narrow) end-to-end suite now exists,
  covering the signature loop and the login flow (merged PR #36). Every other "verified" claim
  across this project still means a human-equivalent live click-through happened once, not that
  a regression suite exists.
- **`credit_transactions` table** — real migration, real RLS policy, zero rows, zero code
  references anywhere. Pure scaffolding for the pay-per-proposal plan tier; nothing reads or
  writes it yet.
- **This `docs/` folder** — was already stale relative to shipped work as of this audit;
  `ROADMAP.md` didn't reflect that pieces of M1 through M4 had landed out of sequence. Worth a
  cleanup pass so this doesn't quietly recur.

## Current DB snapshot (as of this audit)
| Table | Rows |
|---|---|
| accounts | 6 |
| users | 6 |
| proposals | 5 |
| brand_kits | 4 |
| templates | 3 |
| notifications | 29 |
| domains | 1 |
| invitations | 1 |
| credit_transactions | 0 |
