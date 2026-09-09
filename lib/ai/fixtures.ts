import type { CodegenDealFacts } from '@/lib/ai/codegenPrompt'
import type { ProposalSourceOfTruth } from '@/lib/ai/verifyProposalTags'

/** Shared dev-proof fixture — extracted from `app/dev/preview-check/page.tsx` (previously a local
 * const there) so `app/dev/auto-repair-check/page.tsx` reuses the identical deal facts/brand kit
 * instead of a second hand-copied one that could drift from it. Never real customer data. */
export const FIXTURE_FACTS: CodegenDealFacts = {
  clientName: 'Bloom & Ives',
  projectName: 'Website Redesign',
  totalPrice: '4500 USD',
  dueDate: 'the 15th of November, 2026',
  deliverables: ['Homepage redesign', '5 interior pages', 'Mobile-responsive layout'],
  paymentTerm: '50% due upon acceptance, 50% due on delivery',
}

export const SOURCE_OF_TRUTH: ProposalSourceOfTruth = {
  priceTotal: 4500,
  currency: 'USD',
  dueDate: '2026-11-15',
}

export const FIXTURE_BRAND_KIT = {
  id: 'fixture',
  name: 'Bloom & Ives',
  colors: { primary: '#2F6F4E', secondary: '#F4EFE6', accent: '#C97B4A' },
  fonts: { heading: 'Fraunces', body: 'Inter' },
  personality: 'Warm, earthy, understated confidence — like a boutique florist that also does corporate work.',
}
