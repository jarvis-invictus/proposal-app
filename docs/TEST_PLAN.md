# Test Plan

## Critical End-to-End Paths

The following flows must have automated coverage (e.g., using Playwright or Cypress). The list of required assertions matters more than the specific testing tool chosen.

### 1. Core Generation to Signature Flow
**Path:** Signup → Onboarding → Create Proposal → Publish → Client Views & Signs → Status Updates
**Assertions:**
* A new user completing the 4-step wizard creates an `accounts` and `users` record with valid defaults.
* AI chat correctly parses a mocked transcript and returns a valid `finalize_proposal_details` tool call.
* The 5-step generation sequence resolves and saves a `ProposalSchemaV1` JSON object to the DB.
* The Owner user can publish the proposal (changes status to `PUBLISHED`).
* Visiting the public `/p/[slug]` link as an anonymous browser loads the correct content.
* Viewing the public link increments/injects `lastViewedAt` into the proposal's metadata and inserts a `notifications` row for the Owner.
* Submitting the signature pad records `accepted_by_name` and `accepted_at`, and the proposal transitions to a "Deal Won" state.

### 2. Settings & Tenant Isolation
**Path:** Settings changes persist correctly
**Assertions:**
* Changing "Profile & business" fields updates the `accounts` table correctly.
* User A cannot read or modify User B's templates, brand kits, or proposals (RLS test).
* A Drafter user cannot publish a proposal; their attempt correctly transitions the proposal to `PENDING_APPROVAL`.

### 3. Brand Kit Extraction & Injection
**Path:** Brand kit colors actually apply to a generated proposal
**Assertions:**
* Uploading an image or entering a URL correctly extracts hex codes.
* Saving the Brand Kit persists `{ primary, secondary, accent, background, text, extra }` to `brand_kits.colors`.
* Generating a new proposal with that Brand Kit selected correctly applies the primary and background colors to the generated document (verified by CSS variables applied to the preview container).

## Tooling Recommendation
* **Playwright:** Recommended for full end-to-end browser testing due to its robust cross-browser support and tracing capabilities, which are essential for verifying the AI streaming UI and canvas-based Signature Pad interactions.
