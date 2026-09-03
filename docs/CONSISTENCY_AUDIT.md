# Consistency Audit — Visual, AI-Output, and Feature-Behavior Drift

Grounded against the live codebase on 2026-09-02, not recalled from memory. Every finding below
was checked by reading the actual file/component in question or grepping for its real usage —
same discipline as `docs/FEATURE_AUDIT.md`. This is the second of the three Phase 2 initiatives
scoped in `docs/PHASE2_INITIATIVES_PLAN.md` §2; it's a read-only investigation, not a build —
see the companion "quick wins" PR for the handful of findings below worth fixing immediately.

Status legend: 🔴 Real inconsistency, worth fixing · 🟡 Minor/cosmetic · ⚪ Dead code, not live drift

## 1. Token-adherence drift

The design token system (`app/globals.css`) is comprehensive — colors, an ink/alpha scale,
semantic surface/text/border tokens, radii, shadows, a full typography scale, spacing, and
motion durations/easings all exist as real custom properties. Across `app/` + `components/`,
token usage is the dominant pattern (374 `var(--text-*)` references vs. 74 raw `fontSize:`
literals) — the drift below is real but concentrated, not systemic to the whole app.

- 🔴 **`components/app/ProposalCard.tsx`** — the dashboard proposal tile is mostly tokenized, but
  its `Thumb` sub-component hardcodes every font size as a raw number (`fontSize: 9`, `19`, `7`,
  `11`) instead of referencing the scale, even where a value happens to coincide with one.
- 🔴 **`components/editor/PackagesBlock.tsx`** — the block heading uses an untokenized
  `fontSize: 25`, which matches no step in the actual scale (`--text-h3` is 24, `--text-h2` is
  34). The price display passes raw `size={30}`/`size={16}` into `PriceInput`, which sets them
  directly as `fontSize` with no token reference.
- 🟡 **`app/p/[slug]/PublicProposalView.tsx`** — the same untokenized `fontSize: 30` reappears in
  the price display here, so at least the Editor and public view agree with each other, just not
  with the token system. Separately, `themeColor` falls back to a raw `#4F46E5` that doesn't
  match the brand palette at all (`--brand`/`--brand-deep` are sky blues, `#7cbcdc`/`#2f7fbf`),
  and `effectiveThemeColor` hardcodes `'#000000'` for ink-saving mode.
- 🟡 **`app/dashboard/settings/SettingsClient.tsx`** — the Members row avatar hardcodes
  `color: '#fff'` and a raw `fontSize: 12` sitting directly next to token-driven siblings.
- 🟡 **`app/dashboard/OnboardingWizard.tsx` and `app/dashboard/brand-kit/BrandExtract.tsx`** —
  both hand-roll a pill/badge with hardcoded hex that exactly *equals* existing tokens
  (`#cfe4f2`/`#7cbcdc`/`#17384f` == `--brand-tint`/`--brand`/`--brand-ink`) instead of
  referencing them, plus a raw `fontSize: 9`/`12`.

## 2. A documented rule being violated — one real instance, one false positive corrected

🔴 **`components/ui/Badge.tsx`** states outright, in its own doc comment: *"Status pill.
Monochrome-plus-brand only — never green/red/amber."* The marketing homepage's `Pricing.tsx`
genuinely violates it: a hand-rolled "Dev Warning Badge" ("Placeholder Pricing") using
Tailwind's default `bg-yellow-100 text-yellow-800`, bypassing the real `Badge` component
entirely — scoped into the marketing-page finding below rather than fixed here in isolation.

An earlier pass of this audit also flagged `OnboardingWizard.tsx` and `BrandExtract.tsx`
rendering literal `['#e5554e','#e5b34e','#4eb56a']` (red/amber/green) dots as the same
violation — **on closer reading, that's wrong.** Both are macOS/browser-window traffic-light
chrome on a mock browser frame (`SampleFrame`/the URL-scan preview), not status pills, and don't
use the `Badge` component at all. Red/amber/green is the universally-recognized convention for
that specific decoration; changing it would make the mockup look broken, not more consistent.
Left as-is — correcting the record here rather than "fixing" something that wasn't wrong.

## 3. The marketing homepage is inconsistent with itself

🔴 The single biggest concrete finding. `app/page.tsx` composes seven components on one screen:
`HeroContent.tsx` and `MarketingNavbar.tsx` are fully tokenized (15 and 18 `var(--...)`
references, zero Tailwind arbitrary-px classes, between them) — but their siblings on the exact
same page are not: `Pricing.tsx` (0 tokens, 7 arbitrary-px classes, default Tailwind palette
colors), `Testimonials.tsx` (0 tokens, 3 arbitrary-px), `Features.tsx` (1 token, 2 arbitrary-px),
`Footer.tsx` (2 tokens, 13 arbitrary-px), `HowItWorks.tsx` (0 tokens, 3 arbitrary-px). A visitor
scrolling this one page moves between two genuinely different styling systems without any
functional reason for the split. This is real design work to fix properly, not a quick patch —
scoped as its own follow-up rather than bundled into the quick-wins PR.

## 4. Dead, fully off-system code

⚪ **`components/SignatureCard.tsx`** — uses zero design tokens anywhere in the file (raw hex,
raw px font sizes, a literal `fontFamily` string instead of `var(--font-serif)`), confirmed via
grep to be imported nowhere in `app/` or `components/`. Not live drift since nothing renders it —
a deletion candidate, not a fix.

## 5. Feature-behavior inconsistency

🔴 **Delete/remove actions treat the same kind of risk two different ways.** Dashboard's "delete
proposal" (`DashboardClient.tsx`, `handleDelete`) at least confirms first, via a native blocking
`window.confirm()`. The Editor's four "remove item" actions — `PackagesBlock`, `AddOnsBlock`,
`TimelineBlock`, `TermsPaymentBlock` (all four byte-for-byte the same pattern: an icon button's
`onClick` calls `remove*` directly) — have **no confirmation or undo at all** for a comparably
irreversible action. Neither pattern is wrong in isolation; having both for the same class of
action ("you're about to lose data") is the inconsistency.

🔴 **A proper toast system exists and nobody uses it.** `components/ui/Toast.tsx` exports a
`useToasts()` hook with real, documented error semantics ("Errors persist until dismissed — a
failed save must not vanish") and a working `tone="error"` + `onDismiss` + undo-action API.
Confirmed via grep: it has zero callers anywhere in the app. Both real toast call sites
(`DashboardClient.tsx`, `SettingsClient.tsx`) reinvented their own one-off single-string toast
state instead — Dashboard's always auto-dismisses after a fixed timeout (including on a failed
delete), Settings' does distinguish an error case but with its own bespoke state, not the shared
hook.

## 6. No tooling exists to catch any of this

🟡 `package.json` has ESLint (Next's default config) and Playwright/Vitest for testing — no
stylelint, no custom rule restricting raw hex/px or enforcing `var(--...)` usage anywhere.
`postcss.config.mjs` only wires up Tailwind. Without at least a lightweight guard, findings like
the ones above will keep recurring rather than getting caught at review time. Worth a minimal
CI check (even a plain grep-based script flagging new raw hex colors in `app/`/`components/`)
as a longer-term follow-up — not in scope for the quick-wins PR below.

## What's fixed in the companion quick-wins PR

Scoped to the lowest-risk, most clearly-correct items above — real design work (the marketing
page retokenization, a stylelint/CI guard) is deliberately left for a separately scoped pass:

- Wire `useToasts()` into `DashboardClient.tsx` and `SettingsClient.tsx` instead of their
  one-off toast state (§5).
- Add a real confirm step to the Editor's four remove actions (§5).
- Delete the dead `components/SignatureCard.tsx` (§4).

The marketing page's yellow badge (§2) and the wider retokenization it's part of (§3) are left
for a separately scoped design pass, not this PR.
