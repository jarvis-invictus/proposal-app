# Design Fidelity Map

This document tracks the explicit porting of `marg-design-system/project/ui_kits/app/*.jsx` sources into the real Next.js application.

| Route | Design Source File | Status | PR/Correction | Deviations & Notes |
|-------|--------------------|--------|---------------|---------------------|
| `/dashboard/settings` | `Settings.jsx` | live-verified-in-browser | Correction 2 | Removed Notifications & API Keys tabs. "Buy another slot" is honest UI only (no real billing). |
| `/dashboard/brand-kit` | `BrandExtract.jsx` | live-verified-in-browser | Correction 4 | Codebase, Brand Guide, Describe in Words extractors show "Coming Soon". Logo auto-extraction deliberately omitted (always manual upload). |
| `/(auth)/signup` (and Onboarding) | `Onboarding.jsx` | live-verified-in-browser | Correction 3 | Completely replaced the old checklist with the real 4-step wizard. |
| `/p/[slug]` | `ClientPage.jsx` | live-verified-in-browser | Correction 5 | Accept/Sign flow uses real DealWon and SignaturePad components. |
| `/dashboard` | `Dashboard.jsx` | live-verified-in-browser | Correction 6.1 | Row actions (Duplicate, Delete, Copy link) operate on real data. |
| `/dashboard/templates` | `Templates.jsx` | live-verified-in-browser | Correction 6.2 | Category chips map to actual `category` column rather than hardcoded taxonomy. |
| `/dashboard/proposals/new` | `NewProposal.jsx`, `Generating.jsx` | live-verified-in-browser | Correction 6.3 | Fully uses GPT-4o backend instead of mockup's hardcoded regex. "Reference a past proposal" UI is present but decorative. Dictation uses native Web Speech API. |
| `/dashboard/proposals/[id]/edit` | `Editor.jsx` | not-started | (Pending M1) | Route exists (`ProposalEditor.tsx`) with an older, pre-correction implementation — must be re-ported against `Editor.jsx`, not built from scratch. |
| `/dashboard/proposals/[id]/publish` | `PublishFlow.jsx` | not-started | (Pending M1) | Route does not exist yet; must be built. |
| `/dashboard/notifications` | `Notifications.jsx`| not-started | (Pending M1) | Route does not exist yet; must be built. |

