import { parse } from 'node-html-parser'
import { requireDevAccess } from '@/lib/devAccess'
import { flattenProposalFacts } from '@/lib/ai/flattenProposalFacts'
import { genericVerifyFields } from '@/lib/ai/genericVerifyFields'
import { genericInjectFields } from '@/lib/ai/genericInjectFields'
import type { ProposalType } from '@/lib/schema/proposal'

// Hand-built fixture, not AI-generated — this proof is about the walker functions themselves
// (sub-piece 1), not generation. Exercises every addressable path shape: top-level scalar, object
// nesting, array-of-object leaf, and a nested array-within-array-item (packages[i].deliverables[j]).
const FIXTURE_CONTENT: ProposalType = {
  title: 'Website Redesign for Acme Corp',
  clientName: 'Acme Corp',
  preparedFor: 'Jane Doe',
  preparedBy: 'Invictus',
  dateIssued: 'October 24, 2026',
  validUntil: 'November 24, 2026',
  packages: [
    {
      name: 'Core',
      description: 'For small teams',
      originalPrice: 0,
      discountedPrice: 2500,
      popular: false,
      deliverables: ['Homepage redesign', 'Mobile responsive'],
    },
    {
      name: 'Pro',
      description: 'For growing teams',
      originalPrice: 6000,
      discountedPrice: 4500,
      popular: true,
      deliverables: ['Full site redesign', 'SEO audit'],
    },
  ],
  addOns: [
    { name: 'Extra revision round', description: 'One additional round of revisions', price: 300, deliverables: ['1 revision round'] },
  ],
  timeline: [
    { phase: 'Discovery', duration: '1 week', description: 'Research and planning' },
    { phase: 'Execution', duration: '3 weeks', description: 'Design and build' },
  ],
  terms: [
    'Revisions beyond 2 rounds billed hourly',
    '50% deposit required to begin work',
  ],
  paymentSection: {
    schedule: '50% advance, 50% on completion',
    terms: 'Payment due within 7 days of invoice',
  },
  attachments: [{ url: 'https://example.com/mockup.png', type: 'image', caption: 'Homepage mockup preview' }],
}

const FIXTURE_CURRENCY = 'USD'

// Deliberately hand-built HTML, not AI-generated. Contains: several correctly-tagged elements
// (expect matches:true), one deliberate mismatch (packages[0].discountedPrice tagged with the
// wrong price), one addressable path left completely untagged (timeline[0].duration — expect
// present:false), and one tag for a field EXCLUDED from the addressable list
// (packages[0].popular) — proving the walker structurally ignores it rather than needing a
// runtime filter, since it's never in `facts` to begin with.
const FIXTURE_HTML = `<!DOCTYPE html><html><body>
  <h1 data-proposal-field="title">Website Redesign for Acme Corp</h1>
  <p data-proposal-field="clientName">Acme Corp</p>
  <p data-proposal-field="dateIssued">October 24, 2026</p>
  <div data-proposal-field="packages[0].discountedPrice">$9,999</div>
  <div data-proposal-field="packages[1].discountedPrice">$4,500</div>
  <ul><li data-proposal-field="packages[0].deliverables[0]">Homepage redesign</li></ul>
  <p data-proposal-field="terms[1]">50% deposit required to begin work</p>
  <p data-proposal-field="paymentSection.schedule">50% advance, 50% on completion</p>
  <p data-proposal-field="attachments[0].caption">Homepage mockup preview</p>
  <span data-proposal-field="packages[0].popular">Yes</span>
</body></html>`

const EXCLUDED_FIELD_PATH = 'packages[0].popular'
const MISSING_FIELD_PATH = 'timeline[0].duration'
const MISMATCH_FIELD_PATH = 'packages[0].discountedPrice'

/** Proves the generic fact-addressing walker (docs/PROJECT_ROADMAP.md §6, sub-piece 1) against a
 * hand-built fixture — no AI call, no real DB row, deliberately not wired into any real flow. */
export default async function GenericFactWalkerCheckPage() {
  await requireDevAccess()

  const facts = flattenProposalFacts(FIXTURE_CONTENT, FIXTURE_CURRENCY)
  const root = parse(FIXTURE_HTML)
  const report = genericVerifyFields(root, facts)
  const injectedHtml = genericInjectFields(root, facts)

  const excludedFieldInReport = report.some((r) => r.path === EXCLUDED_FIELD_PATH)
  const excludedEl = root.querySelector(`[data-proposal-field="${EXCLUDED_FIELD_PATH}"]`)
  const missingFieldReport = report.find((r) => r.path === MISSING_FIELD_PATH)
  const mismatchFieldReportPreInjection = report.find((r) => r.path === MISMATCH_FIELD_PATH)
  const mismatchEl = root.querySelector(`[data-proposal-field="${MISMATCH_FIELD_PATH}"]`)

  return (
    <div style={{ padding: 16, fontFamily: 'monospace', fontSize: 13 }}>
      <h3>Generic fact-addressing walker — sub-piece 1 proof</h3>
      <p>Total addressable facts flattened: {facts.length}</p>

      <h4>Flattened facts</h4>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(facts, null, 2)}</pre>

      <h4>Verification report (captured before injection)</h4>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(report, null, 2)}</pre>

      <h4>Targeted checks</h4>
      <p>
        Missing case ({MISSING_FIELD_PATH}) reported present:false (expect true): {String(missingFieldReport?.present === false)}
      </p>
      <p>
        Mismatch case ({MISMATCH_FIELD_PATH}) reported matches:false pre-injection (expect true):{' '}
        {String(mismatchFieldReportPreInjection?.matches === false)}
      </p>
      <p>
        Excluded field ({EXCLUDED_FIELD_PATH}) never appears in the report (expect true): {String(!excludedFieldInReport)}
      </p>
      <p>
        Excluded field's tag left untouched by injection, still reads &quot;Yes&quot; (expect true):{' '}
        {String(excludedEl?.textContent === 'Yes')}
      </p>
      <p>
        Mismatch tag corrected to the real value after injection (expect true):{' '}
        {String(mismatchEl?.textContent === facts.find((f) => f.path === MISMATCH_FIELD_PATH)?.displayValue)}
      </p>

      <h4>Post-injection HTML</h4>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{injectedHtml}</pre>
    </div>
  )
}
