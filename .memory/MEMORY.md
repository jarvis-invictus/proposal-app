# Marg (proposal-app) — Curated Long-Term Memory

Durable rules and standing context, distinct from `.memory/daily/*.md` session logs. Update
this file when something learned should outlive a single session; keep session-specific detail
in the daily logs instead.

## Source of truth documents (read these before assuming project state)
- `docs/PRD.md` — product definition, personas, MVP scope
- `docs/SCHEMA.md` — full data dictionary
- `docs/API_AI_CONTRACTS.md` — every API route + every AI call's real behavior
- `docs/DESIGN_FIDELITY_MAP.md` — which screens are ported from `ui_kits/app/*.jsx` and verified
- `docs/DEFINITION_OF_DONE.md` — the checklist every screen/feature must pass before merge
- `docs/DECISION_LOG.md` — chronological record of every real decision made, with why
- `docs/ROADMAP.md` — milestone sequencing (drifts stale easily — cross-check against reality)
- `docs/FEATURE_AUDIT.md` — grounded real/partial/missing status per feature (as of 2026-09-01)
- `docs/MVP_LAUNCH_PLAN.md` — sequenced, research-grounded path to launch (as of 2026-09-01)

## Founding discipline of this project
The entire "Correction" initiative (Corrections 1 through 6.9) exists because the original
build approximated the real design source (`ui_kits/app/*.jsx`) from memory instead of reading
it in full. That single mistake caused a full rebuild cycle. The resulting rule, now load-
bearing for everything in this codebase: **read the actual source — design file, schema,
running database — in full before writing code or making a claim about current state. Never
approximate from memory.** This extends to status reports: verify against real code/DB, don't
recall from an earlier PR description.

## Standing technical gotchas
- **Git**: merging a stacked PR with `--delete-branch` auto-*closes* PRs that target the
  deleted branch, rather than retargeting them to the deleted branch's own base. If stacking
  PRs, retarget every dependent to its final base *before* deleting any branch mid-stack.
- **Browser automation**: `mcp__Claude_Browser__computer` clicks intermittently fail with "No
  node found at given location." Workaround: `javascript_tool` calling `.click()` on the
  element directly, or open a fresh tab.
- **`read_console_messages` retains history across navigations** in the same tab — a warning
  from several page loads ago will still appear. Verify with a fresh tab
  (`tabs_create` + `navigate`) before concluding a warning is still live.
- **Local dev DB**: `docker exec supabase_db_proposal-app psql -U postgres -d postgres -c "..."`
  is the direct-verification pattern — trust this over inferring DB state from UI behavior.
- **Production deployment status is unresolved as of 2026-09-01.** `.env.local` points to local
  Docker; a real hosted Supabase project is linked (`supabase/.temp/project-ref`) but unused by
  local dev, and a commented-out `OLD_NEXT_PUBLIC_SUPABASE_URL` implies a prior switch. Do not
  assume either "nothing is deployed" or "something is live" without asking directly.

## Known real gaps (see docs/FEATURE_AUDIT.md for full detail, this is the short list)
- No real payment processing anywhere (client-side display-only; platform billing is a
  Subscribe scaffold with a real payload preview, no live Razorpay connection).
- Editor is missing its theme color picker and PDF export button — a regression from Correction
  6.4's rebuild, not a disclosed deferral. The components still exist, unused, in `components/`.
- Proposal generation has no currency awareness (`ProposalSchemaV1` has no currency field) —
  display formatting works, the generation layer underneath it doesn't know what currency was
  meant.
- E-signature capture doesn't meet the real ESIGN Act minimum bar (no IP/audit trail/consent
  line/reviewable copy) — currently just a name and a timestamp.
- Zero automated tests anywhere in the repo. Every "verified" claim in every PR this project has
  produced means a live manual click-through happened once, not that a regression suite exists.
- No transactional email (team invitations create a DB row and notify no one).
- Custom domains are UI-only — no DNS verification, no routing logic.

## Team roles (real, enforced via RLS + server actions)
`owner` (billing, full access) / `approver` (can review + release pending proposals) /
`drafter` (creates/edits, cannot publish directly — routes to `PENDING_APPROVAL`).
