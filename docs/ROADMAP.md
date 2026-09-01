# Roadmap

This roadmap defines sequential milestones for the project. **Do not propose new milestones running in parallel with an unfinished one — sequential only.** Each milestone requires passing the `docs/DEFINITION_OF_DONE.md` gate.

## Milestone 1 (M1): Finish Correction 6
**Goal:** Complete the remaining screens from the Correction 6 batch to bring the entire core application up to the canonical design spec.
* **1.1 Editor (`Editor.jsx`):** Rebuild the proposal editor interface to match the real design, replacing the current implementation. Ensure real-time updates and saving work against `proposals.content`.
* **1.2 Publish Flow (`PublishFlow.jsx`):** Wire up the final publication steps, link generation, and role-based approval gating (Drafters trigger `PENDING_APPROVAL`, Owners release).
* **1.3 Notifications (`Notifications.jsx`):** Build the dedicated notifications screen to display view events, acceptances, and approval requests.

## Milestone 2 (M2): Stabilization & Testing
**Goal:** Ensure the MVP paths are bulletproof.
* Implement end-to-end testing for the core paths (Signup -> Generate -> Publish -> Accept).
* Fix layout shifts, mobile responsiveness, and polish animations to match `tokens/base.css`.

## Milestone 3 (M3): Deferred AI Features
**Goal:** Implement the "Coming Soon" features honestly.
* Build extraction pipelines for Brand Guide uploads, Codebase connections, and Text descriptions.
* Wire "Reference a past proposal" into the AI intake prompt as a stylistic guide.

## Milestone 4 (M4): SaaS Billing & Localization
**Goal:** Implement the business-level decisions regarding monetization and global support.
* **4.1 Currency Switching:** Add a `currency` column to `accounts` (and/or proposals) and update the UI to support USD/EUR/INR dynamically, replacing the hardcoded USD/INR symbols.
* **4.2 SaaS Billing Integration:** Integrate Razorpay or LemonSqueezy for subscription management tied to the `plan_tier`.
