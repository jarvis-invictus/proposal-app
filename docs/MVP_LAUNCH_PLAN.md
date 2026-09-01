# MVP Launch Plan

**This is a plan, not a build log.** Nothing in this document has been executed. It exists to
turn `FEATURE_AUDIT.md`'s findings into a sequenced, prioritized, industry-grounded path to a
launchable MVP — so the next phase of work executes against a plan instead of against whatever
seems most interesting that day.

Every recommendation below is either grounded in the audit (verified against real code/DB) or
in real competitive/industry research (cited). Where I'm making a judgment call instead of
citing a source, it's labeled as one.

---

## 0. The one thing to resolve before anything else in this plan matters

**Is there a real, deployed, hosted version of this app anywhere?**

While researching this plan I found that `.env.local` — the file this entire project has been
built and tested against, this whole session — points to `localhost` (the local Docker Supabase
instance). But `supabase/.temp/project-ref` shows a real, linked *hosted* Supabase project
(`tkrfqagkqshyvrmtpdxn`), and `.env.local` contains a commented-out `OLD_NEXT_PUBLIC_SUPABASE_URL`
line, implying the target was switched at some point. There's no `vercel.json` and no other
evidence in the repo of an active deployment.

I don't know, and I'm not going to guess, whether:
- That hosted Supabase project has the same schema as local (all 9 tables, all migrations,
  including the ones from this week)
- Anything is actually deployed to a reachable URL right now
- If something is deployed, whether it's the current code or an old snapshot

**This has to be answered first**, because it changes the shape of everything else here —
"finish the remaining features" and "stand up production for the first time" are different
projects with different sequencing. Everything below assumes production doesn't exist yet and
needs to be stood up as part of this plan; if it turns out something's already live, several
items reorder.

---

## 1. What "industry benchmark" actually means for this category

Researched against PandaDoc, Proposify, and Better Proposals — the three products anyone
evaluating a proposal tool will have already looked at.

**Table stakes across the category** (Marg already has all of these, for real):
interactive pricing tables, view/open tracking, e-signature, approval workflows, branded
templates.

**The important nuance: full payment processing is not required for category parity.**
Better Proposals — a real, successful, purpose-built proposal tool — explicitly does *not*
handle payments or contracts, and competes fine on proposal creation/tracking/close-rate alone.
This matters because it means "add Razorpay" is not a blocking requirement to call this an MVP
in its category. It's something else, addressed in §3.

**Where the category is actually moving**, and where Marg would fall behind if it stays purely
display-only: Qwilr (QwilrPay), Ignition, and Plutio all now offer *embedded payment collection
at the moment of signing* — sign and pay in one flow, no separate invoice step. This is
increasingly the differentiator that separates "proposal tool" from "proposal tool that closes
the loop." Worth treating as a genuine competitive opportunity, not just a gap to apologize for.

**E-signature legal minimum bar** (ESIGN Act, the relevant US federal standard — most states
layer UETA on top, which is compatible): four requirements —
1. Clear consent/intent to sign (a "Sign" click plus a disclosure is enough — no notarization
   needed)
2. The signature must be uniquely linked to the signer (email and/or IP address)
3. An audit trail: retained evidence of consent, the signed record, and a log
4. The signer must be able to review and download the document afterward

I checked `app/api/proposals/[id]/accept/route.ts` directly against this: it currently captures
**only a typed name and a timestamp**. No IP, no user agent, no snapshot of exactly what content
was agreed to. If the proposal's content were edited *after* someone signed it (which nothing
currently prevents — see §4), there'd be no way to prove what they actually agreed to. This is
a real, concrete, checkable gap against a real legal standard, not a vague "should probably add
this someday."

**Standard SaaS launch checklist** (industry-general, not category-specific) breaks into six
buckets: infrastructure (backups, secrets, CI/CD), auth/authz, billing, security (HTTPS, rate
limiting, dependency scanning), observability (error tracking, uptime monitoring), and launch
readiness (custom domain, transactional email, legal pages). Mapped against this app in §5.

---

## 2. Definition of "MVP-launch-ready" for Marg specifically

A concrete bar, not an aspirational one. Marg is launch-ready when:

1. A real prospective user can sign up, generate a proposal with AI, brand it, send it, have a
   real client view and sign it, and **you can actually get paid for the work described in
   that proposal** — at minimum via the existing display-only UPI/link/QR (already true) with a
   credible near-term path to embedded collection (not yet true).
2. Marg itself can charge *you* — or rather, your future paying customers — for a subscription.
   Right now nothing can generate revenue for the business itself.
3. Nothing a real user does can silently corrupt or lose their data (the currency-semantics bug
   and the no-conflict-resolution autosave in §4 are exactly this class of risk).
4. If it breaks in front of a client, you find out from a monitor, not from the client.
5. The legal minimum for "this signature means something" is met, since real money and real
   client relationships are on the line even before payment processing exists.

Everything that doesn't serve one of these five is explicitly **not** required for MVP —
see §7.

---

## 3. Gap-by-gap remediation plan

Each item: what's wrong (from the audit), the recommended fix, why that approach, and a rough
effort tier (S = under a day, M = a few days, L = a real sub-project).

### 3.1 Payments — the highest-leverage gap

**Two separate problems, don't conflate them:**

**(a) Marg charging its own users** (the Subscribe scaffold). Recommended: build the real
Razorpay Subscriptions integration behind the existing scaffold. Razorpay's Subscriptions API
supports exactly the plan/subscription model already designed (`plan_tier`, fixed billing
periods) and already has a decision on record (`docs/DECISION_LOG.md`) favoring it. One real
limitation surfaced in research worth planning around: Razorpay is noted as "less compelling for
complex subscription logic or merchant-of-record global coverage" — meaning if international
customers become a real goal, this may need revisiting later. For an India-first MVP, it's the
right, already-decided choice. **Effort: L** (webhook handling, plan lifecycle, failed-payment
retry logic, dunning).

**(b) Client-side payment collection** (getting your users' clients to actually pay through
Marg). Recommended: **do not build this for MVP.** Better Proposals proves it's not required
for category parity, and it's a materially bigger lift than (a) — it means acting as a payment
facilitator between two other parties, with its own compliance surface. Keep the current
display-only UPI/link/QR (it already works, it's honest, it's actually how most freelancers in
this market already get paid). Revisit as a genuine differentiator (matching Qwilr/Ignition)
once (a) is live and there's a real user base to justify the lift. **Effort if deferred: none
now.**

### 3.2 E-signature legal hardening

Bring the accept flow up to the real ESIGN Act minimum bar identified in §1:
- Capture IP address and user agent at signing time (both trivially available server-side —
  `request.headers`)
- Snapshot the exact proposal content (or a hash of it) at the moment of signing, so a later
  edit can never be confused with what was actually agreed to
- Add an explicit consent line ("By signing, you agree this constitutes your electronic
  signature...") before the signature capture, not just a signature pad
- Make the signed record downloadable/reviewable by the signer afterward (currently there's no
  way for a client to get a copy of what they signed)

This is cheap relative to its importance — it's the difference between "we have e-signature"
and "our e-signature would hold up." **Effort: S–M.**

### 3.3 The currency/generation gap (confirmed in the audit)

Add a `currency` field to `ProposalSchemaV1` and have the generation prompt either (a) extract
currency from context when explicitly stated, defaulting to the account's selected currency
otherwise, or (b) simpler and safer: pass the account's selected currency into the prompt as a
hint and instruct the model to assume that currency unless the user explicitly states another
one. Option (b) is recommended — smaller surface area, no new schema field needed on the
proposal side, consistent with how the account-level currency selector already works.
**Effort: S.**

### 3.4 The Editor regression

Rewire `ThemeColorPicker.tsx` and `PdfExportModal.tsx` back into `ProposalEditor.tsx` — both
components already exist, fully built, confirmed zero other usages to conflict with. This is
close to a pure rewire: pull in the theme-color state pattern the pre-correction editor already
proved out, wire the PDF button to the same `window.print()` fallback the public view already
uses. **Effort: S**, disproportionately high value since it's a confirmed regression, not new
scope.

### 3.5 Team invitations don't notify anyone

Needs real transactional email. Recommended: Resend or Postmark (both have generous free tiers
and trivial Next.js integration) for a single templated "you've been invited" email. This is
also the same infrastructure needed for any future "client hasn't opened it in 3 days" nudge,
password reset flows, etc. — worth building once, generally, rather than one-off per feature.
**Effort: M** (mostly the email-provider setup and domain verification for deliverability, not
the code itself).

### 3.6 Custom domains

Currently pure UI with zero backing infrastructure (confirmed: no verification code, no routing
logic anywhere). Real implementation needs: CNAME verification (a scheduled or on-demand DNS
lookup), SSL issuance (if hosting on Vercel, this is largely automatic via their domain APIs),
and proxy/routing logic to resolve an incoming custom domain to the right account's proposals.
**Effort: L.** Recommend deferring past MVP — see §7. It's a real feature but not one that
blocks anyone from using the core product.

### 3.7 Production infrastructure (the standard SaaS checklist, mapped to this app)

- **Hosting decision + deploy**: Vercel is the natural fit (Next.js, already how the design
  system references itself). Resolve §0 first.
- **Real Supabase environment**: confirm the linked hosted project has every migration applied
  (there are 10 real migration files in `supabase/migrations/` as of this audit — verify all 10
  are applied to the hosted project, not just local).
- **Secrets**: confirm `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, etc. are only ever in
  environment variables, never committed — worth a one-time repo-wide grep as a sanity check
  before this goes anywhere public.
- **Error tracking**: Sentry (or similar) — currently zero visibility into production errors.
  Real cost: near-free at this scale, real value: you find out about breakage before a client
  does.
- **Uptime monitoring**: a free-tier pinger (Better Stack, UptimeRobot) against the production
  URL once it exists.
- **Backups**: if using hosted Supabase, daily backups are usually included on paid tiers —
  confirm the plan tier includes it and that a restore has actually been tested once, not just
  assumed to work.
- **Rate limiting**: the AI endpoints (`/api/chat`, `/api/generate-proposal`) currently have no
  rate limiting — a real cost-control and abuse-prevention gap once this is publicly reachable,
  given each call is a real (billed) GPT-4o request.

**Effort: M overall**, mostly configuration and verification rather than new code, but
genuinely blocking for "launch" in the literal sense.

### 3.8 Automated tests

Not a blocker for MVP launch in the narrow sense, but the single highest-leverage investment for
everything *after* launch, per the audit's own conclusion. Recommended scope for a first pass,
not comprehensive coverage: automate the critical path only — signup → generate → publish →
client views → client signs → status updates correctly. That's the one sequence where a silent
regression would be worst (a broken signing flow = lost deals, not just an annoyance).
**Effort: M**, and worth doing right after §3.1–3.3, not before — no point writing tests against
an editor that's about to change.

### 3.9 Deferred features from the audit, explicitly not part of this plan's MVP scope
Version history, docked AI section-rewrite assistant, drag-to-reorder, live notification
presence/per-section analytics, reminder nudges, AI-drafted follow-ups, brand-guide-PDF and
codebase brand extraction, custom-template saving. All real, all already flagged, none of them
block a real user from completing the core loop. See §7 for the explicit reasoning on why each
stays out.

---

## 4. One risk the audit didn't cover, worth naming here

**No conflict resolution on the Editor's autosave.** Multiple team members (owner/approver/
drafter) can open the same proposal. The debounced autosave is last-write-wins with no locking,
no presence indication, no merge — two people editing simultaneously will silently clobber each
other's changes. Untested, because it requires two simultaneous sessions to even observe. Low
likelihood at current scale (solo/small teams), real risk once "Team" is actually used by more
than one person. Recommend: not an MVP blocker, but worth a simple mitigation (e.g., a "someone
else is editing this" banner using proposal's existing `updated_at` timestamp) before actively
selling the Team feature as reliable.

---

## 5. Suggested sequencing

Ordered by dependency and leverage, not by how the gaps happened to be discovered.

1. **Resolve §0** — production/deployment status. Answers everything else's urgency.
2. **Cheap, high-value, low-risk fixes**: §3.3 (currency/generation), §3.4 (Editor regression),
   §3.2 (e-signature hardening). All small, all real correctness/trust issues, none depend on
   anything else.
3. **Production infrastructure** (§3.7) — stand this up once, properly, rather than
   retrofitting it after real users exist.
4. **Marg's own billing** (§3.1a — Razorpay subscriptions) — the actual revenue-unblocking
   piece, now that the ground underneath it is solid.
5. **Transactional email** (§3.5) — needed for invitations now, and everything nudge/reminder-
   related later.
6. **Critical-path automated tests** (§3.8) — once the above has stabilized the surface area
   worth protecting.
7. Everything in §3.9, prioritized opportunistically after MVP, informed by what real users
   actually ask for rather than guessed in advance.

Custom domains (§3.6) and client-side payment collection (§3.1b) are real, valuable, explicitly
**post-MVP** — see §7 for why neither blocks launch.

---

## 6. Open questions this plan can't resolve on its own

- **§0**: is there already a deployed instance anywhere? This needs a direct answer, not an
  inference.
- **Target market for v1**: this plan assumes India-first (matching the existing Razorpay
  decision, GSTIN field, UPI-centric payment display) with USD/EUR support as a secondary,
  already-built capability. If the real intent is global-first, the billing-provider choice in
  §3.1a may need revisiting given Razorpay's noted limitations for non-Indian merchant-of-record
  coverage.
- **Execution capacity**: this plan doesn't estimate calendar time because that depends on how
  much of it runs through AI-assisted execution (the pattern used for everything so far) versus
  needing hands-on review of billing/legal-sensitive pieces specifically. Worth deciding
  up front which sections (especially §3.1 and §3.2) get extra scrutiny before shipping, given
  real money and real legal exposure.

---

## 7. Explicitly out of scope for MVP, and why

| Feature | Why it can wait |
|---|---|
| Client-side payment collection | Category parity doesn't require it (Better Proposals proof point); bigger lift than Marg's own billing; better built once there's a real user base asking for it |
| Custom domains (real DNS/SSL) | Real infrastructure lift; proposals already work fine on the default domain; nobody is blocked from using the product without it |
| Version history, AI docked assistant, drag-to-reorder | Real editor-power-user features; the Editor is fully functional without them |
| Notification presence/analytics, reminder nudges, AI-drafted follow-ups | Real product richness; the core "you get notified when something happens" loop already works |
| Brand-guide-PDF / codebase brand extraction | 3 of 5 extraction sources already work; these two are the least commonly needed |
| Custom template saving | The 3 system templates cover the common cases; account-level template libraries are a retention feature, not a launch blocker |
