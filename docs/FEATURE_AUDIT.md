# Feature Audit — What's Actually Real

Grounded against the live codebase and database on 2026-09-01, not recalled from memory or
prior PR descriptions. Every "confirmed" claim below was checked by reading the actual
file/route in question or querying the running database directly. Where something is
described as missing, that means grepped for and not found — not "I don't remember it."

Status legend: ✅ Real and working · 🟡 Partially real / honest gaps · ❌ Not built at all

Update this file whenever a feature's real/fake status changes — it's meant to stay accurate,
not become another stale snapshot like ROADMAP.md currently is.

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

## 6. Generation — 🟡 real call, real correctness gap
`/api/generate-proposal` is a genuine GPT-4o `generateObject` call against `ProposalSchemaV1`.

**Currency-semantics gap (confirmed, not yet fixed):** `ProposalSchemaV1`
(`lib/schema/proposal.ts`) has no `currency` field, and the generation prompt never mentions
currency. A deal described in rupees gets extracted as a bare number with no unit. Display
formatting then applies whichever currency the *account* has selected, independent of what the
user actually meant. A ₹50,000 deal on a USD-configured account will render as "$50,000". The
Milestone 4 currency work fixed display formatting only — the AI has no concept of currency at
all, and needs one (either extract a currency alongside every number, or accept the account's
selected currency as a hint in the prompt).

## 7. Editor — 🟡 real for what's built, one confirmed regression
Confirmed by re-reading the current `ProposalEditor.tsx` directly:
- ✅ Real, autosaving: title, packages, add-ons, timeline, terms & payment — all five confirmed
  persisting correctly, including nested arrays.
- 🔴 **Regression, not "coming soon":** no `ThemeColorPicker`, no `PdfExportModal`, no "Download
  PDF" button anywhere in the current Editor. The pre-correction editor had both, wired to real
  brand kit colors. Rebuilding the Editor around the real design (Correction 6.4) dropped them
  without re-wiring.
- 🟢 **They're not gone, just disconnected:** `components/app/ThemeColorPicker.tsx`,
  `PdfExportModal.tsx` (still live on the public view), `AIDock.tsx`, and `SectionRail.tsx` all
  still exist, fully built and styled — `grep` confirms zero usage anywhere in `app/`.
  Re-wiring the theme picker and PDF button into the Editor is a rewire job, not a build job.
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
- 🔴 Team — real invite records, but confirmed via the actual code: **no email ever sends**. An
  invited teammate has no way to know except being told directly. 1 real invitation sits
  permanently stuck at "Pending" in the DB right now.
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
- **Automated tests** — zero, anywhere in the repo. Every "verified" claim across this entire
  project means a human-equivalent live click-through happened once, not that a regression
  suite exists.
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
