# Product Requirements Document (PRD)

## Product Summary
Marg is a proposal generation platform built for creative freelancers and agencies. Its core differentiator is AI-driven drafting connected seamlessly with brand kit extraction and professional delivery/tracking, allowing freelancers to generate visually stunning, customized proposals quickly without manual layout formatting.

## Primary Personas
* **Owner (Account Owner):** Manages billing, custom domains, settings, team invites, and has final publishing authority.
* **Approver:** Can review and release drafted proposals to clients.
* **Drafter:** Can create new proposals using AI and edit them, but cannot publish (their proposals go to `PENDING_APPROVAL`).
* **Client / Recipient:** An unauthenticated user who receives a public link, views the proposal, and signs/accepts it.

## Core User Journey
1. **Signup & Onboarding:** New user signs up and completes a 4-step wizard (business category, brand kit extraction, sample preview, create first proposal).
2. **Dashboard & Templates:** User views their stats, manages their brand kits, and saves or browses templates.
3. **Creation (AI Chat):** User creates a new proposal by chatting with an AI that gathers client facts, pricing tiers, and timeline. 
4. **Editor:** (Not verified/ported yet) User refines the generated structure and layout.
5. **Publish & Send:** (Not verified/ported yet) User publishes the proposal and sends the link to the client.
6. **Client View & Accept:** Client views the public `/p/[slug]` link (triggering a view notification), reviews the tiers/UPI details, signs via a Signature Pad, and triggers a "Deal Won" state.

## Feature Inventory
| Screen/Feature | Status | Design Source File | Real Data Source | Known Gaps / Deferred |
| -------------- | ------ | ------------------ | ---------------- | --------------------- |
| **Dashboard** | live-and-real | `Dashboard.jsx` | `proposals`, `brand_kits`, `templates` | Stubbed "Duplicate/Save as Template" menu |
| **Settings** | live-and-real | `Settings.jsx` | `accounts`, `users`, `domains`, `invitations` | Invoices and payment methods are honestly empty (no Stripe integration) |
| **Brand Kit Extract** | live-and-real | `BrandExtract.jsx` | `brand_kits`, `storage.objects` | URL/image are real. Codebase, Brand Guide, Describe in Words are "Coming Soon". |
| **Templates** | live-and-real | `Templates.jsx` | `templates` | "Use this template" passes query param `?template=` which AI intake must handle. |
| **New Proposal (AI)** | live-and-real | `NewProposal.jsx`, `Generating.jsx` | `proposals` | "Reference a past proposal" pill is decorative right now. Client picker uses AI fallback. |
| **Onboarding** | live-and-real | `Onboarding.jsx` | `accounts`, `brand_kits` | Fully functional 4-step wizard. |
| **Accept/Sign** | live-and-real | `ClientPage.jsx` | `proposals` | Client signature is recorded as a name + timestamp. |
| **Editor** | not-started | `Editor.jsx` | `proposals` | Queued for Correction 6.4/M1. |
| **Publish Flow** | not-started | `PublishFlow.jsx` | `proposals` | Queued for Correction 6.5/M1. |
| **Notifications** | not-started | `Notifications.jsx`| `notifications` | Queued for Correction 6.6/M1. |

## Explicit MVP Scope
**In Scope:**
* AI-driven proposal generation (GPT-4o) with structured facts extraction.
* Visual presentation engine (liquid glassmorphism CSS).
* Brand kit extraction from URLs and images.
* Basic team roles (Owner, Approver, Drafter) and approval workflows.
* Display-only payments (UPI ID, Payment link, QR code upload).
* Simple electronic acceptance (Name + Timestamp).

**Deliberately Out of Scope (Deferred):**
* Real Payment Processing (Stripe/Razorpay/Skydo) — removed in Correction 1.
* Automated real DNS verification for Custom Domains (Correction 2).
* API Keys feature — removed entirely (Correction 2).
* Email sending infrastructure for invitations (Correction 2).

## Non-Functional Requirements
* **Security & RLS:** Absolute tenant isolation. Users can only access rows matching `get_account_id()`. Published proposals are public, but strictly read-only for anonymous users.
* **Performance:** Generation step must animate 5-step UI sequence matching exact source timing while GPT-4o `generateObject` runs in the background.

## Concrete Success Metrics
* **AI Generation Latency:** < 30 seconds for complete `generateObject` resolution.
* **Uptime Target:** 99.9% for critical paths (Dashboard, View Proposal).
* **Editor Autosave Latency:** Debounced, 2-3 seconds after typing stops (see Resolved Product Decisions).

## Resolved Product Decisions (Previously Open Questions)
* **Target Market & Currency (Planned for M4):** The platform will support currency switching (e.g., USD, EUR, INR). Currently, the MVP UI is hardcoded to USD.
* **Legal Compliance for E-Signatures:** For the MVP, a basic signature capture (`accepted_by_name` + `accepted_at`) is sufficient. Compliant audit logs and PDF stamping may be considered post-MVP.
* **Monetization & Pricing Model (Planned for M4):** Marg will charge its users (SaaS subscriptions) via alternative payment providers (e.g., Razorpay or LemonSqueezy), rather than Stripe.
* **Team Seat Model:** Seat management is tied to the plan tier (e.g., Agency plan includes a set number of seats). Extra seats are not billed dynamically per-user.
* **Editor Autosave Latency:** The proposal editor will feature a modern, Google Docs-like debounced autosave (saving 2-3 seconds after typing stops) to prevent database hammering while ensuring data is securely saved.
