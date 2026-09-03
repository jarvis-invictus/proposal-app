# Phase 2 Initiatives — Planning Document

**This is a plan, not a build log.** Per explicit instruction: nothing here gets executed until
it's reviewed and approved, item by item. All three initiatives below came out of the same
conversation, but they don't have to ship together, and one of them (the consistency audit) is
worth running before the other two are even scoped in detail, because its findings should
inform how the other two get built.

---

## 1. Multi-step AI generation agent

### What exists today (verified against the actual code, not assumed)

Generation is currently a two-call pipeline, both using GPT-4o:

1. **`/api/chat`** — a conversational intake (`streamText`) that asks follow-up questions until
   it has enough facts, then calls a `finalize_proposal_details` tool that returns a plain-text
   `summary` plus a short structured `preview` shown to the user before generating.
2. **`/api/generate-proposal`** — one `generateObject` call that takes that summary and fills in
   `ProposalSchemaV1` (title, 2-3 packages, add-ons, timeline, terms, payment section) in a
   single shot, constrained by a Zod schema so it can't produce malformed output.

The AI never touches presentation — `content` is stored as JSONB and rendered by fixed React
components (`ProposalEditor.tsx`, `PublicProposalView.tsx`). Visual quality is 100% controlled
by hand-built code regardless of what the model drafts.

### What "multi-step agent" means here, concretely

Sahil's choice, made explicitly aware this is more than the current architecture needs today.
Proposed shape:

1. **Intake** — same conversational gathering, extended to accept uploaded images/documents as
   context (ties into Initiative 3 below — these two should share one upload mechanism, not two).
2. **Planning step** — a call that decides structure (tier count, whether a discovery phase fits
   this deal type) *before* any drafting happens, instead of inferring structure implicitly
   inside one big prompt.
3. **Section-by-section drafting** — separate calls for packages, timeline, and terms instead of
   one combined call, so each section can be prompted, evaluated, and retried independently.
4. **Critique pass** — a second model call reviews the draft for unrealistic pricing,
   inconsistent tone, or missing information before it reaches the user.
5. **Asset placement** — if images were uploaded during intake, a step decides where each belongs
   (logo → header, portfolio shot → a specific package) rather than the user placing them by hand.

`ProposalSchemaV1` and the rendering layer don't need to change — this only replaces what
happens *before* that schema gets filled in.

### Real tradeoffs (stated once, for the record, not to relitigate the decision)

- **Cost**: 4-6 model calls per proposal instead of 2. At GPT-4o pricing this is a meaningful
  per-proposal cost increase, worth modeling before committing (rough estimate needed once the
  exact prompts are drafted — not guessed here).
- **Latency**: sequential steps mean generation takes noticeably longer than today's single call.
  The existing "Generating…" screen already has named steps rather than a bare spinner, so this
  is a UX fit, not a UX regression — but the actual wait time will grow.
- **Failure surface**: every added step is a place a call can fail, time out, or need a retry.
  Today's single-call design fails in one place; a 5-step pipeline fails in five.
- **New infra need**: multi-step LLM pipelines are usually built with the AI SDK's own
  multi-step/tool-calling primitives (already a dependency — `ai` package is in use) rather than
  hand-rolled sequential fetch calls, to get retry/timeout handling for free rather than rebuilding it.

### Effort: L. Sequencing note

This is the largest and riskiest of the three initiatives, and the one most likely to need
revision after a first pass (multi-step LLM pipelines are usually tuned empirically, not
designed perfectly up front). Recommend this comes *after* the consistency audit (§2) and *after*
Initiative 3's upload mechanism exists, since asset placement (step 5) depends on uploads
already working — building it first would mean building the upload plumbing twice.

### Open questions for Sahil to decide before this gets designed further
- What does "the critique pass" actually check for — a fixed checklist, or another
  freeform-judgment LLM call? The former is testable and predictable; the latter is more
  flexible but harder to evaluate.
- Should a failed/low-confidence critique block generation (user sees an error, tries again) or
  just flag the result for the user to review more carefully? Blocking is safer; flagging is
  faster and less frustrating.

---

## 2. Consistency audit

### Why this comes first

Sahil identified visual/design, AI-output-quality, and feature-behavior inconsistency, but
without specific examples in hand. Rather than guessing at fixes, this is a grounded,
read-only investigation — the same approach `docs/FEATURE_AUDIT.md` used earlier — producing a
concrete list of *where* and *what*, before anyone decides how to fix it.

### What gets checked, concretely

**Visual/design**: cross-reference every screen's actual styling against the design tokens
already defined in `app/globals.css` (colors, spacing, radii, typography scale) — flagging any
component or screen using a one-off value instead of a token, and any place the same UI concept
(a badge, a button variant, a section header) is styled differently in different screens.

**AI output quality**: generate several proposals from varied real-world-shaped inputs (a
one-line description, a thorough transcript, a vague description with almost no detail) and
compare the outputs for consistency of tone, realism of pricing, and completeness — not a formal
benchmark, but a grounded sample large enough to catch obvious variance.

**Feature behavior**: cross-check the same *kind* of action (create/edit/delete/save patterns,
loading states, error messages) across every screen that has one, flagging where the same
concept is handled differently for no evident reason.

### Deliverable

A single audit document (`docs/CONSISTENCY_AUDIT.md`), structured like `FEATURE_AUDIT.md`:
specific findings, each with a file/screen reference, not vague impressions.

### Effort: M. This is investigation, not code — safe to run without touching the app.

---

## 3. Image/video attachment (intake chat + Editor)

### What already exists (this lowers the real cost of this initiative)

Supabase Storage already has a working `public-assets` bucket with account-scoped upload
policies (`storage.foldername(name))[1] = get_account_id()`), currently used for QR codes and
avatars. `uploadToPublicAssets()` in `SettingsClient.tsx` is a proven, working pattern for
exactly this kind of upload — new upload UI can reuse this approach rather than inventing one.

### What's actually needed

1. **Schema**: `ProposalSchemaV1`/`content` needs a place to reference uploaded media — likely a
   dedicated `attachments: Array<{ url, type: 'image' | 'video', caption? }>` field, since forcing
   an upload into an existing field (like a package's deliverables list) would conflate two
   different concepts.
2. **Upload UI in the intake chat** — a file-attach control alongside the existing text input
   (`PromptInput` in `NewProposalClient.tsx`), uploading immediately on selection rather than
   waiting for generation, so the AI (once Initiative 1 exists) or the user (today) has the URL
   available right away.
3. **Upload UI in the Editor** — a way to attach/remove media on an already-generated proposal,
   independent of the AI entirely — this part doesn't depend on Initiative 1 at all and could
   ship on its own.
4. **Rendering** — both `ProposalEditor.tsx` and `PublicProposalView.tsx` need a place in the
   layout to actually display attached media (a gallery section, or per-package image slots —
   a design decision, not just an engineering one).
5. **Video-specific work**: Supabase Storage's default per-file size limit is not currently
   configured for this bucket, so it needs an explicit, deliberate limit (not just "whatever the
   default is") before video uploads are allowed — video files are meaningfully larger than
   images and this needs a real answer, not an assumption. Playback also needs its own UI
   (a video element with controls, poster frame) and consideration for page load time on the
   public proposal view, which currently loads everything eagerly.

### Effort: M for images alone; L once video is included, mainly because of the size-limit,
playback, and page-load design work — not because uploading a video file is technically hard.

### This one doesn't have to wait

Unlike Initiative 1, this is useful and shippable on its own — a proposal with an attached
product photo or demo video is valuable even with zero AI involvement. Recommend treating
"upload works in the Editor" as a first slice, independent of whether Initiative 1 ever happens.

---

## 4. Suggested sequencing across all three

1. **Consistency audit** (§2) — read-only, cheap, and its findings may reveal that some of what
   feels like "inconsistency" is actually a design-system enforcement gap, not a content problem
   — which changes how urgent the other two initiatives actually are.
2. **Media attachment, Editor-only slice first** (§3) — real, shippable value, reuses existing
   storage infrastructure, and builds the upload mechanism the agent redesign will eventually
   need anyway.
3. **Media attachment, intake-chat slice** (§3) — once the Editor slice is proven, extend the
   same upload mechanism into the chat.
4. **Multi-step generation agent** (§1) — the largest, riskiest piece, sequenced last so it can
   build on an upload mechanism that already exists and works, rather than building both at once.

## 5. Open decisions, consolidated

- Multi-step agent: what does the critique step actually check, and does a failed critique block
  or just flag?
- Media attachments: what's the actual video file size limit, and where in the proposal layout
  does attached media live (gallery vs. per-package)?
- Timing: does the consistency audit run now (this session, read-only) or wait until a dedicated
  session alongside the other two?
