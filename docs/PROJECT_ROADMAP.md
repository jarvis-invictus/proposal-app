# Marg — Complete Project Roadmap & Architecture Reference

_Last updated: 2026-09-10. This is the single reference for what this
product is, what's been built, what's actually decided, and what's
still open. Update it whenever a major thread closes. If a future
session or a future you needs to understand this project from zero,
this file plus docs/CORE_ENGINE_V2_SPEC.md plus docs/DECISION_LOG.md
should be sufficient — nothing should require re-deriving from chat
history._

---

## 1. What this product actually is

An AI-powered SaaS: a freelancer or agency describes a deal in plain
language, and the product produces a real, hosted, branded proposal
web page — one link, no PDF — that a client can view, accept, and
(eventually) pay from. Primary audience: small agencies and
freelancers, India-first but explicitly serving international
clients too.

**The founding product decision, made after extensive manual proof:**
this automates a process the founder already ran by hand, successfully,
multiple times. It is not a speculative idea — it's automating
something proven to work.

---

## 2. Current state — comprehensive, as of 2026-09-10

### 2.1 The two "engines" — and the decision to have only one

Historically this product had two ways to turn structured deal data
into a visible proposal page:

- **The original engine:** a fixed-section template, filled with
  structured data (`ProposalSchemaV1`), plus a later refinement (a
  16-section layout-composition system from PR #76) that let the AI
  choose section order/composition within still-fixed building
  blocks.
- **Core Engine V2 (new):** the AI writes a fully custom HTML/CSS
  page from scratch per proposal — no fixed template, no fixed
  section list. Built specifically to raise the visual-quality
  ceiling above what template-fill can ever reach.

**Decision, made 2026-09-10:** Core Engine V2 becomes the *only*
engine going forward. There are no real customers yet, which makes
this the correct, low-risk time to commit fully rather than run two
systems in parallel indefinitely. See Section 5 for what "only one
engine" precisely does and does not mean.

### 2.2 Core Engine V2 — what's actually built, proven, and shipped

Built and verified sub-piece by sub-piece, every step backed by real
evidence (not claims) before being trusted:

- **Generation + tagging contract:** the AI writes full HTML/CSS/JS.
  A small, fixed set of required tags (price, date, the single
  accept action) get enforced in the same generation prompt.
  *(Section 6 replaces this fixed 3-tag approach with a generic
  mechanism — read that before building on top of this.)*
- **Deterministic verification + value injection:** after
  generation, plain code (no AI call) checks the tagged values
  against the real database record, and force-overwrites them with
  the real value regardless of what the AI wrote. Proven with a real
  caught case: the model wrote "$4500 USD," the system corrected it
  to "$4,500."
- **Real server-side Tailwind compilation:** the AI's freely-chosen
  Tailwind classes — including brand-specific arbitrary values like
  a custom hex color or a quoted custom font name, and classes only
  referenced inside inline `<script>` (e.g. a scroll-triggered fade-in)
  — get compiled into real, correct CSS, not left to a dev-only
  browser script.
- **Sandboxed preview:** while still in-app, the generated page
  renders inside a deliberately configured sandboxed iframe. Proven
  live, in a real browser, with a genuine browser-thrown security
  error — not just code that looks right.
- **Versioned, isolated-origin publish:** once published, the page
  is served from a genuinely separate origin (no iframe needed at
  that point — nothing left to nest it inside). Proven with a real
  cookie set on the main app, confirmed invisible from the published
  page's own origin.
- **Bounded multi-round revision:** a person can ask for 2-3 rounds
  of changes ("make the tone more premium," "add an FAQ"), each a
  full-page regeneration built on the previous round. Proven that
  earlier rounds' changes survive later, unrelated rounds — this was
  specifically tested, not assumed.
- **Missing-tag and duplicate-tag auto-repair:** if a required tag is
  missing, or appears more than once (e.g. two accept buttons), the
  system automatically asks the AI to fix just that specific problem,
  bounded to 2 attempts, before surfacing a real failure rather than
  publishing something broken.
- **Real-account integration:** wired into the actual product,
  currently gated to a single account via an environment-variable
  flag. Tested once on a real, existing proposal — this real test
  caught and fixed a genuine timezone bug (dates were off by a day)
  and a genuine leak of internal dev-testing scaffolding into
  customer-facing output. Both fixed and re-verified.

**What's real and current, worth being honest about:**
- Every generation to date has run on the fallback model (OpenAI's
  GPT-4o), not the intended primary (Claude) — Anthropic API access
  was never set up. Nobody has yet seen what this engine produces on
  its actual intended primary model.
- Only handles a single price and a single date — see Section 6,
  this is being redesigned generically, not patched narrowly.
- No real click-to-edit UI exists yet — the only way to change
  anything post-generation is the AI-driven revise loop. See Section
  6 — this changes.
- No handling yet for "this fact was never provided" — every test
  case assumed complete data.

### 2.3 Security & correctness audit — closed

Run in parallel with the engine build, covering the whole existing
application, not just new work:

- Full grant/RLS/trigger audit across every real database table.
  Found and fixed **two genuine privilege-escalation bugs** — a
  normal team member could have made themselves (or anyone) an
  account owner, and could have made their own proposal template the
  default template shown to every account. Both fixed, both verified
  with real authenticated-session tests, no evidence either was ever
  actually exploited.
- A mysterious historical database wipe — investigated and explained
  (very likely a deliberate backup restore).
- Google OAuth, PDF export, notification delivery, and Firecrawl-based
  brand-kit extraction — each independently investigated with real
  evidence, not assumed. PDF export had a real, user-visible bug
  (dashboard navigation leaking into printed pages) — found via an
  actual exported file, root-caused precisely, fixed, and re-verified
  with a second real export.
- Free-tier "1 active proposal" limit — was completely unenforced,
  now genuinely blocks it at the real creation boundary.
- Timeline duration field — now has real format validation, matching
  exactly what the new engine's date logic depends on.

All of the above is committed and live on production.

### 2.4 Deliberately not yet done

- AI SDK library upgrade (currently ~2 years behind current; touches
  7+ backend files plus the chat UI) — real, scoped future work, not
  attempted casually.
- Real credits/usage metering and billing — waiting on a business
  decision about replacing the payment provider, not an engineering
  question.
- Phase 3 of the original engine spec (an automated visual self-check
  step, where the AI looks at a screenshot of its own output before a
  human does) — intentionally waiting for real usage data before
  deciding it's worth the added cost/complexity.
- Sorting a pile of pre-existing, untracked repo files unrelated to
  any of this work — queued, not urgent.
- Confirming the real brand kit saved correctly and re-testing the
  engine styled with real brand colors/fonts instead of the plain
  fallback.

---

## 3. The core product-thinking mistake to actively avoid going forward

**Nothing in this project should be designed around a hand-picked
subset of fields.** The instinct to reach for "price and date" as the
example, or to solve "multiple packages" as its own special case,
is the wrong shape of thinking. The proposal's real data model has —
and will keep gaining — many fields: client name, project title,
individual deliverable lines, each package's name/price/feature list,
add-ons, payment terms text, prepared-by name, issue and validity
dates, and whatever gets added later. **Any solution that only
handles two or three of these by name is already incomplete the
day it ships.** Section 6 is the fix: a generic mechanism, not a
growing list of special cases.

## 4. This is a complete production application, not a feature demo

Going forward, every piece of this — not just the new engine's
guardrails — gets built and reviewed to a real production bar: UI/UX
consistency, real empty/error/loading states, accessibility, and
actual polish, not "works when I click it once in a happy path."
Tonight's audit already found and fixed several small but real UI
bugs (a confirmation modal rendering clipped inside its own card;
dashboard chrome leaking into printed PDFs) precisely because nobody
had looked closely before. A dedicated, explicit UI/UX and
production-readiness pass across the *whole* application — not just
new-engine output — is real, planned future work; it gets properly
scoped as its own initiative, not squeezed into an engine task as an
afterthought.

---

## 5. What "one engine" precisely means

- **Retired:** the old fixed-template renderer and the PR #76
  layout-composition system, as the way a proposal's page gets
  produced.
- **Not retired, never was "the old engine" to begin with:** the
  structured facts themselves (price, deliverables, timeline, terms,
  etc.), collected via the existing chat intake. This structured data
  is what makes the new engine trustworthy at all — it's the real
  source of truth every generation gets checked against. Losing it
  would mean losing the entire verification/injection safety
  mechanism this project depends on.
- **A concrete, near-term consequence:** once ready, new-proposal
  creation should default straight to the new engine automatically —
  no separate opt-in "beta" button, since there's no real customer
  risk in removing that distinction right now.
- **Needs a real decision, not yet made:** what happens to any
  proposal already built the old way. Does it stay on the old
  renderer forever (frozen), or does it get regenerated through the
  new engine once eligible? This needs an explicit answer before the
  old renderer is actually torn out of the codebase.

---

## 6. The generalized fact-sync architecture (replaces the narrow price/date-only approach)

### 6.1 The problem with what exists today

Right now, exactly three things are "tagged" in a generated page:
the total price, the due date, and the single accept button. Every
other real fact on the page — client name, deliverable text, package
details, payment terms — is just prose the AI wrote, with nothing
forcing it to match the real record, and no way for a person to
directly correct it without going through the AI at all.

### 6.2 The fix: address every field generically, not by a fixed list of names

Instead of a fixed set of special attribute names
(`data-proposal-field="price_total"`), every real field in the
proposal's structured content gets a **stable, generic path-based
address** baked into its tag — e.g.
`data-proposal-field="packages[1].discountedPrice"`,
`data-proposal-field="timeline[2].duration"`,
`data-proposal-field="clientName"`. The verification/injection code
becomes a single generic walker: read the real structured content
object, and for every leaf value it contains, look for a tag with
that exact path in the generated HTML — if present, force the real
value in, regardless of what the AI wrote. **This one mechanism
automatically covers every current field and every field added to
the schema in the future — nobody has to remember to special-case
the next one.**

### 6.3 This also solves the "list-shaped facts" problem for free

Multiple packages, a variable-length deliverables list, several
timeline phases — these were flagged earlier as a separate, harder
problem than single values like price/date. Under the path-based
scheme, they're not actually different: `packages[0].name`,
`packages[1].name`, `packages[2].name` are just three ordinary
addresses, and the walker handles any number of them the same way,
list-length included. One design covers both problems that were
previously being tracked as two.

### 6.4 This is also what makes real click-to-edit possible

Because every meaningful piece of the visible page already carries
its own real data address, a click-to-edit UI (the Lovable/Bolt-style
mechanism discussed) becomes mechanical, not a new invention: clicking
an element reads its `data-proposal-field` address, and a plain-text
edit writes directly to that exact path in the real database record —
no AI involved, no interpretation, no drift possible between what's
shown and what's real. Only genuinely fuzzy requests ("make this
section feel more premium") go through the AI at all, and even those
can be scoped to just the relevant part of the page rather than the
whole document.

### 6.5 Handling a fact that was never provided

If the real value at a given path is null or empty, the system must
force a plain, honest placeholder into that tag (e.g. "Pricing to be
confirmed") — never let the AI's freehand guess stand in as if it
were a real value. Same underlying principle as forcing the real
price in place of a wrong one; extended to include "there is
honestly nothing here yet."

---

## 7. How we proceed from here

Same discipline as every prior piece of this build: one clearly
scoped micro-plan at a time, sent to Claude Code, each with its own
research step, explicit boundaries, and real verification evidence
required before anything is trusted or committed. This document is
the map; each open item above becomes its own micro-plan when it's
time to build it.

**Suggested first micro-plan, following from this document:**
generalize the tagging/verification/injection mechanism (Section 6)
— since the list-shaped-facts problem, the click-to-edit foundation,
and the "don't guess a missing fact" problem are all actually the
same underlying fix, not three separate future tasks.
