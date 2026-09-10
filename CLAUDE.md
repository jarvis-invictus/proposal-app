# Project Context: AI-Generated Branded Proposal Microsites

This file is the persistent project memory for Claude Code / Antigravity. Read this in full before proposing any plan or writing any code. Do not skip to implementation — this project has already been through an extended planning phase, and the decisions below are locked unless explicitly revisited with the founder (Sahil).

---

## 1. What This Product Is

A micro-SaaS that lets freelancers and agencies turn a client pitch into a **branded, hosted web page** (not a PDF/document) using an AI agent — no design or coding skill required. The founder has already manually built and sold multiple real proposals in exactly this format, with a track record of zero rejections. This product automates a process that already works — it is not a speculative idea.

**Scope discipline:** this product does ONE thing — proposals. Not general websites, not invoices, not recurring billing (yet). Do not expand scope into adjacent document types without explicit sign-off.

## 2. Who It's For

Primary ICP: solo freelancers and small agencies (2-15 people) in high-ticket service work (marketing agencies, web/dev shops, consultants, creative agencies).

**Important target-market nuance:** many of these Indian sellers pitch **international clients** (US/EU/Gulf), not just domestic Indian clients. This affects the payment layer — see Section 5.

## 3. Product Vision

This is intended as the founder's credible entrepreneurial proof point — something fully owned, working, and generating real revenue. "Working" means genuinely reliable end-to-end, good enough to send to a real client without hesitation.

## 4. Core Product Flow (Lovable-style, confirmed with founder)

conversational intake → confirm → generate, not a manual block-editor.

1. User enters a template library or starts blank.
2. Brand kit (optional): logo, colors, fonts, extracted or uploaded, reusable across proposals.
3. Conversational AI intake: never assumes or invents details.
4. Confirm-before-build: AI summarizes everything, nothing generated until explicit confirmation.
5. AI generates the full proposal, structurally validated so pricing/deliverables can't be hallucinated.
6. Post-generation, no-code editing layer.
7. Publish → live shareable link (explicit action, not automatic).
8. Client views the link (no login), accepts, pays.
9. Agency gets notified, tracked, can follow up.

## 5. Payment Flow — Two Separate Flows, Do Not Conflate

**Flow A** — Agency pays platform (SaaS credits/subscription): INR/UPI, unchanged.

**Flow B** — Client pays agency inside the proposal: needs a non-UPI, international-friendly option for cross-border clients, not just UPI. Not yet architected — flag before building further.

**Known schema gap:** UTR confirmation storage needs a defined place (`payment_confirmations` table or fields on `proposals`).

## 6. Guardrails That Must Not Be Skipped

- **AI never auto-publishes.** Draft state only until explicit Publish click.
- **RLS policies explicit in migrations, not patched in later.**
- **Credit ledger is append-only** — this is money-adjacent and needs an audit trail. (NOTE, Sep 2026: `credit_transactions` table was dropped and no replacement enforcement mechanism currently exists — see DECISION_LOG.md. This guardrail is currently NOT satisfied in production and needs a real fix, not just documentation.)
- **Currency/localization:** do not build multi-currency speculatively, don't hard-block international payment display either.

## 7. Tech Stack

- Framework: Next.js (App Router), TypeScript
- Styling: Tailwind CSS (v4, via @tailwindcss/postcss — config model differs from v3) + Shadcn UI
- Database/Auth: Supabase, dual dev/prod
- AI/Validation: Vercel AI SDK + Zod — CURRENT: gpt-4o is the live model at all AI call sites (see `lib/generation/model.ts`). `@ai-sdk/anthropic` is installed but unused. Plan in progress: Claude as primary, OpenAI as fallback, via a per-stage wrapper — see docs/CORE_ENGINE_V2_SPEC.md.
- Deployment: Vercel
- Brand-kit extraction: Firecrawl `/v2/scrape` (`formats: ['branding']`) — replaced Browserless as of commit bc46a4e (Browserless was crashing in production).
- Local dev: Node.js LTS, npm/pnpm, Git, hosted Supabase free-tier project, API keys.

## 8. Database Schema

**`proposals`**: id, account_id, brand_kit_id, template_id, status, content (jsonb), slug, last_viewed_at, created_at, updated_at, accepted_at, accepted_by_name, submitted_by, submitted_at, approved_by, approved_at, signature (jsonb), password_hash.

**`credit_transactions`**: DROPPED (was: append-only ledger). Currently no credit enforcement exists anywhere in code — free tier's "1 active proposal" claim is not enforced. Tracked as an open issue in DECISION_LOG.md.

## 9. Full Feature Inventory (reference — not all in v1)

Brand Kit System, Template Library, AI Intake Engine, No-Code Editing Layer, Proposal Management, Client-Facing Experience, Payment & Business Ops, Tracking & Notifications, Team features.

**Explicitly parked, do not build now:** recurring/monthly reminder proposals, invoicing, negotiation-assist AI, live interactive pricing sliders, personalized video/voice intros, auto-localization, white-label tier.

## 10. Working Process — How This Project Must Be Built

- **Explore → Plan → Execute → Review**, always, for every non-trivial change. Use Plan Mode (read-only) before writing code. Present the plan for founder review before executing.
- **Least code that correctly solves the problem** (YAGNI, reuse before rewrite) while never cutting validation, security, error handling, accessibility.
- **No speculative architecture.** Do not build features from Section 9 not explicitly scoped into the current milestone. This is a named, previously-repeated failure mode for this project.
- **Claude (chat) is a thinking/planning partner, not a code writer.** Antigravity/Claude Code does implementation. Technical proposals should be reviewed collaboratively, not rubber-stamped.

### Addendum — Session Discipline (added 2026-09-08)

- Every session must read this file, docs/PROJECT_ROADMAP.md, and any active feature spec (e.g. docs/CORE_ENGINE_V2_SPEC.md) in full, then restate its understood scope for the current session before proposing a plan or writing any code.
- No self-merge. Every PR stays open for Sahil's review — prepare a short summary of what changed and why, but do not click merge yourself.
- One phase/scope per session. If something adjacent-but-out-of-scope is noticed mid-session, report it as a suggestion for a future phase — do not build it in the same session.
- End of session: update DECISION_LOG.md and the relevant status doc with real evidence (file paths, actual output, row counts) — not narrative summaries.
- **No secret values (API keys, tokens, passwords) ever appear in a session report or committed doc — confirm-only.** Applies retroactively: redact any pre-existing exposed values found in committed docs.

## 11. Genuinely Open Questions

- International payment mechanism for Flow B.
- Post-publish mutability: edit a PUBLISHED link, or clone + spend a new credit?
- Formal client "Accept" step vs. simple scroll-to-payment.
- Notification depth: confirmed dashboard-only and non-live today, verified end-to-end 2026-09-09 (server-rendered once per page load, no polling/realtime — a new notification needs a navigation/reload to appear). Whether to build instant/live notifications remains a genuinely open, undecided future option.
- Real ₹ pricing numbers — untested with real users.
- UTR storage schema.
- Credit enforcement mechanism — needs rebuilding since `credit_transactions` was dropped.

---

## Auto-maintained Next.js agent notes

@AGENTS.md
