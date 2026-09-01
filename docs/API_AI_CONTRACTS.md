# API & AI Contracts

## API Routes

### `POST /api/chat`
* **Auth Requirement:** Implicitly protected (expected to be called from the dashboard by an authenticated user, though relies on UI for access).
* **Request Shape:** `{ "messages": Array<{ role, content }> }` (Vercel AI SDK format).
* **Response Shape:** Streaming AI response (`.toAIStreamResponse()`).
* **AI Model:** `gpt-4o`.
* **Prompt Behavior:** Gathers client facts, pricing tiers, and timeline sequentially. Employs a strict rule to ask 1-2 focused questions at a time. Must call the `finalize_proposal_details` tool when all info is gathered.
* **Tool Schema:** `finalize_proposal_details(summary: string, preview: object, isComplete: boolean)`. Returns a summary of facts gathered, and a small `preview` object (clientName, packageCount, priceRange, timeline, terms, paymentSchedule) for the confirmation modal.
* **Hard Rule:** "never fabricate a figure, name, or fact the user did not provide."

### `POST /api/generate-proposal`
* **Auth Requirement:** Called from within the authenticated dashboard context.
* **Request Shape:** `{ "summary": "string" }` (The summary outputted by `/api/chat`).
* **Response Shape:** JSON object conforming to `ProposalSchemaV1` (title, clientName, packages, addOns, timeline, terms, paymentSection).
* **AI Model:** `gpt-4o` (using `generateObject`).
* **Prompt Behavior:** Populates the rigid `ProposalSchemaV1` based strictly on the provided summary. Enforces logic like "originalPrice is higher than discountedPrice" and defaults the `issueDate` and `validUntil` appropriately.
* **Hard Rule:** Keep terms standard and concise, fill fields accurately based on facts provided.

### `POST /api/proposals/[id]/accept`
* **Auth Requirement:** Public (bypasses RLS using `SUPABASE_SERVICE_ROLE_KEY`).
* **Request Shape:** `{ "name": "string" }`.
* **Response Shape:** `{ "accepted_at": "string", "accepted_by_name": "string" }` or `{ "error": "string" }`.
* **Behavior:** Verifies the proposal is 'PUBLISHED' and not already accepted. Updates the proposal with acceptance details.

### `POST /api/proposals/[id]/view`
* **Auth Requirement:** Public (bypasses RLS using `SUPABASE_SERVICE_ROLE_KEY` to update view metrics).
* **Request Shape:** Empty POST body.
* **Response Shape:** `{ "success": boolean, "message"?: "string" }`.
* **Behavior:** Records a view by injecting `lastViewedAt` into the `content.metadata` JSONB blob. Creates a notification for the account owner. Safely ignores views from the authenticated owner to prevent self-triggering metrics.

### `POST /api/proposals`
* **Auth Requirement:** Handled by Supabase RLS directly.
* **Behavior:** Saves the AI-generated proposal to the database, assigning standard defaults.

## Standing AI Rules
**CRITICAL RULE:** Any NEW AI call or prompt change must be proposed as a decision in `docs/DECISION_LOG.md` before being built, not added silently.
