# Core Engine V2 — Agentic Proposal Generation Spec

## 1. What this is and isn't
New generation mode: the AI writes full custom HTML/CSS/Tailwind
(+ light JS) per proposal, instead of filling a fixed schema/template.
Goal: raise the visual-quality ceiling above what schema-based
template-fill (including the existing layout engine from PR #76)
can reach. This is NOT a replacement of the current engine yet, and
NOT a full rewrite — it is a new, separate mode, built alongside the
existing schema/layout engine, until proven in real use. Scope stays
proposals only, per CLAUDE.md's existing scope discipline.

## 2. Full lifecycle
1. Intake — unchanged, existing chat flow.
2. Plan — one call, mid-tier model, plain-language plan (not code).
3. Confirm — human approves the plan before any expensive work.
4. Code generation — primary model writes full HTML/CSS/Tailwind/JS.
5. Tagging contract — see §4, enforced in the same prompt as stage 4.
6. Deterministic check — plain code, no model call, verifies tags.
7. Value injection — real values overwrite what the model wrote.
8. Tailwind compile — see §7.
9. Preview — sandboxed iframe, in-dashboard.
10. Revise (Phase 2, not v1) — bounded full-page regeneration.
11. Publish — isolated subdomain, versioned storage.

## 3. Model harness rule
Claude is primary; OpenAI is fallback, not the reverse. Every stage
call goes through one wrapper function per stage — never call a
provider SDK directly inline in a route file. The wrapper reads
which provider/model to use from one config source (env var or
settings row) — swapping models must be a one-line config change,
not a multi-file edit. On primary failure (timeout, rate-limit,
error), retry once against the fallback before surfacing an error;
log which provider actually served each request. New code (this
spec) uses the wrapper from day one. The existing, working GPT-4o
intake pipeline is migrated to the wrapper LAST, only once the
wrapper is proven on new, lower-stakes work first.

## 4. Non-negotiable guardrails — ship with generation itself, never deferred
- Tagging contract: the generation prompt requires specific
  data-attributes on the accept/sign trigger element, and on every
  element displaying a price, date, or payment term.
- Deterministic verification: after generation, a plain-code parser
  (no model call) checks every required tag exists and its value
  matches the real source-of-truth record. Mismatch triggers an
  auto-repair pass, same pattern as the existing Zod-validation loop.
- Value injection: once tags are confirmed present, the real
  source-of-truth value is injected into that node, overriding
  whatever the model wrote.

## 5. Explicitly out of scope — considered and rejected
- WebContainers: rejected, no backend/npm to run.
- Cloud sandboxes (E2B/Daytona/Docker execution): rejected, nothing
  to execute — output is markup, not runnable backend code.
- Browserless or any hosted headless-browser API: rejected. If a
  render/screenshot step is ever needed (Phase 3), self-host
  Playwright (already a project dependency for E2E tests) — never a
  third-party hosted browser service.
- Automated visual self-check loop (render → screenshot → vision
  critique → auto-fix): real, wanted, Phase 3 — NOT part of the
  initial build. Do not build this early or unprompted.
- Revise/regeneration loop: Phase 2, deferred — v1 ships single-shot.

## 6. Isolation model
In-dashboard preview: sandboxed iframe (configure the `sandbox`
attribute deliberately — verify the permission combination doesn't
accidentally defeat isolation). Published: its own isolated
subdomain, separate from the main app's domain — isolation here
comes from browser same-origin rules, no iframe needed since there's
nothing left to nest it inside. The Accept & Sign element (tagged
per §4) talks back to the app via a deliberate, origin-validated
postMessage bridge — real, separate design work, not automatic.

## 7. Tailwind rendering requirement
Generated pages use Tailwind classes freely, including arbitrary
values. These are compiled server-side, after generation, using
Tailwind's own compiler run once against the generated HTML as its
content source, producing real finished CSS stored alongside the
page. Do NOT use the Tailwind Play CDN / browser-JIT script for
production output — development-only per Tailwind's own docs.

## 8. Phased build order
- Phase 0a: audit cleanup (separate, already in progress).
- Phase 0b: AI SDK upgrade + build the primary/fallback wrapper,
  proven on one low-stakes, non-production-critical call.
- Phase 1: plan → confirm → codegen → tagging → verification →
  injection → Tailwind compile → publish. No revise loop, no visual
  self-check. Likely 2-3 sessions, one sub-piece per session.
- Phase 2: bounded revise loop (2-3 rounds), only after Phase 1 is
  live and reviewed.
- Phase 3: visual self-check loop, only after real usage from
  Phases 1-2 suggests it's worth the complexity.

## 9. Genuinely open questions — do not silently resolve
- Exact primary/fallback model per stage (plan vs. codegen may
  differ in tier).
- Phase 2: does round 2 see full prior HTML, or a compact summary?
- New table needed for versioned generated-page storage (not the
  existing jsonb `content` column) — schema not yet designed.
