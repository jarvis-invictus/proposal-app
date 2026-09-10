import type { CodegenDealFacts } from '@/lib/ai/codegenPrompt'
import type { ProposalSourceOfTruth } from '@/lib/ai/verifyProposalTags'
import type { ProposalType } from '@/lib/schema/proposal'

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

/** Sub-piece 2 (generic fact-addressing) fixture — a realistic, complete ProposalType with 3
 * packages and 4 timeline phases, deliberately more than sub-piece 1's 2/2 fixture, to prove the
 * generic walker + codegen prompt scale past the smallest case. Not related to FIXTURE_FACTS
 * above (that's the old fixed-3 contract's reduced summary) — this feeds flattenProposalFacts
 * directly. Never real customer data. */
export const FIXTURE_CURRENCY = 'USD'

export const FIXTURE_PROPOSAL_CONTENT: ProposalType = {
  title: 'Marketing Site Rebuild for Meridian Analytics',
  clientName: 'Meridian Analytics',
  preparedFor: 'Priya Raman',
  preparedBy: 'Invictus',
  dateIssued: 'September 10, 2026',
  validUntil: 'October 10, 2026',
  packages: [
    {
      name: 'Essentials',
      description: 'A focused rebuild of the core marketing pages',
      originalPrice: 0,
      discountedPrice: 3200,
      popular: false,
      deliverables: ['Homepage redesign', 'Pricing page redesign'],
    },
    {
      name: 'Growth',
      description: 'Full site rebuild plus SEO foundation',
      originalPrice: 8500,
      discountedPrice: 6800,
      popular: true,
      deliverables: ['Full 8-page site redesign', 'Technical SEO audit', 'Analytics setup'],
    },
    {
      name: 'Scale',
      description: 'Everything in Growth plus ongoing support',
      originalPrice: 14000,
      discountedPrice: 11500,
      popular: false,
      deliverables: ['Full 8-page site redesign', 'Technical SEO audit', '3 months of support'],
    },
  ],
  addOns: [
    { name: 'Copywriting pass', description: 'Full copy rewrite for every page', price: 900, deliverables: ['All page copy'] },
    { name: 'Extra revision round', description: 'One additional round of revisions', price: 350, deliverables: ['1 revision round'] },
  ],
  timeline: [
    { phase: 'Discovery', duration: '1 week', description: 'Stakeholder interviews and content audit' },
    { phase: 'Design', duration: '2 weeks', description: 'Wireframes and visual design' },
    { phase: 'Build', duration: '3 weeks', description: 'Development and content integration' },
    { phase: 'Launch', duration: '1 week', description: 'QA, launch, and handoff' },
  ],
  terms: [
    'Revisions beyond 2 rounds billed hourly',
    '50% deposit required to begin work',
  ],
  paymentSection: {
    schedule: '50% advance, 50% on completion',
    terms: 'Payment due within 7 days of invoice',
  },
  attachments: [{ url: 'https://example.com/homepage-mock.png', type: 'image', caption: 'Homepage concept preview' }],
}

/** Sub-piece 3 (honest handling of missing values) fixture — the same real proposal as above,
 * with three deliberate real-shaped gaps, one per case this sub-piece needs to distinguish:
 * `clientName` set to `undefined` (behaviorally identical to a real record where the key is
 * missing entirely — confirmed the dominant real shape via a live query of local data), one
 * timeline phase's `description` left as an empty string (the other real "blank" shape found),
 * and one package's `discountedPrice` set to the literal `0` — the negative case, proving a real
 * $0 price is never treated as "not provided," per the confirmed decision.
 *
 * `title` is deliberately REWORDED here, not reused verbatim from FIXTURE_PROPOSAL_CONTENT — the
 * base fixture's title ("...for Meridian Analytics") literally contains the client's name, which
 * would leak the real value elsewhere in the same prompt and confound the one thing this fixture
 * exists to test (does the model fabricate a value it has genuinely zero information about,
 * anywhere in the prompt). Confirmed via a first real run: with the leaky title, the model simply
 * never tagged `clientName` at all rather than inventing anything — a real result, but not a clean
 * answer to the actual question, since the model still had the true name available via `title`.
 *
 * Never real customer data. */
export const FIXTURE_PROPOSAL_CONTENT_WITH_GAPS: ProposalType = {
  ...FIXTURE_PROPOSAL_CONTENT,
  title: 'Marketing Site Rebuild Proposal',
  clientName: undefined as unknown as string,
  packages: FIXTURE_PROPOSAL_CONTENT.packages.map((pkg, i) => (i === 0 ? { ...pkg, discountedPrice: 0 } : pkg)),
  timeline: FIXTURE_PROPOSAL_CONTENT.timeline.map((phase, i) => (i === 2 ? { ...phase, description: '' } : phase)),
}
