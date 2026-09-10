import { redirect } from 'next/navigation'
import { parse } from 'node-html-parser'
import { getAccountContext } from '@/lib/accountContext'
import { runStageText } from '@/lib/ai/harness'
import { stripCodeFence } from '@/lib/ai/stripCodeFence'
import { flattenProposalFacts } from '@/lib/ai/flattenProposalFacts'
import { genericVerifyFields } from '@/lib/ai/genericVerifyFields'
import { genericInjectFields } from '@/lib/ai/genericInjectFields'
import { buildGenericCodegenPrompt } from '@/lib/ai/genericCodegenPrompt'
import { FIXTURE_PROPOSAL_CONTENT_WITH_GAPS, FIXTURE_CURRENCY, FIXTURE_BRAND_KIT } from '@/lib/ai/fixtures'

const INITIAL_MAX_OUTPUT_TOKENS = 8000
const RETRY_MAX_OUTPUT_TOKENS = 14000

// The three deliberate gaps in FIXTURE_PROPOSAL_CONTENT_WITH_GAPS — see fixtures.ts for why each
// one was chosen. The first two are the real "not provided" cases this sub-piece must handle
// honestly; the third is the negative case proving a real $0 is never mistaken for one.
const NOT_PROVIDED_PATHS = ['clientName', 'timeline[2].description']
const REAL_ZERO_PRICE_PATH = 'packages[0].discountedPrice'

/** Same truncation guard as app/dev/generic-codegen-check/page.tsx — a cut-off response would
 * make a "the AI didn't tag this" reading meaningless. */
function looksTruncated(html: string): boolean {
  const trimmed = html.trim()
  if (!trimmed.toLowerCase().endsWith('</html>')) return true
  return trimmed.lastIndexOf('<') > trimmed.lastIndexOf('>')
}

/** Proves honest handling of missing values (docs/PROJECT_ROADMAP.md §6.5, sub-piece 3) against a
 * real AI generation call. The real risk this checks for: the model inventing a plausible-looking
 * value for a genuinely blank fact, with nothing catching it. Deliberately not wired into any real
 * flow — flattenProposalFacts/genericVerifyFields/genericInjectFields/buildGenericCodegenPrompt
 * are all otherwise unchanged from sub-pieces 1-2. */
export default async function GenericMissingValueCheckPage() {
  const account = await getAccountContext()
  if (!account) redirect('/login')

  const facts = flattenProposalFacts(FIXTURE_PROPOSAL_CONTENT_WITH_GAPS, FIXTURE_CURRENCY)
  const prompt = buildGenericCodegenPrompt(facts, FIXTURE_BRAND_KIT)

  let genResult = await runStageText('codegen', { prompt, maxOutputTokens: INITIAL_MAX_OUTPUT_TOKENS })
  let html = stripCodeFence(genResult.text)
  let truncated = looksTruncated(html)
  let retried = false

  if (truncated) {
    retried = true
    genResult = await runStageText('codegen', { prompt, maxOutputTokens: RETRY_MAX_OUTPUT_TOKENS })
    html = stripCodeFence(genResult.text)
    truncated = looksTruncated(html)
  }

  const root = parse(html)
  const preInjectionReport = genericVerifyFields(root, facts)
  genericInjectFields(root, facts)
  const postInjectionReport = genericVerifyFields(root, facts) // re-read the now-mutated tree

  const notProvidedRows = NOT_PROVIDED_PATHS.map((path) => {
    const fact = facts.find((f) => f.path === path)!
    const pre = preInjectionReport.find((r) => r.path === path)!
    const post = postInjectionReport.find((r) => r.path === path)!
    return { path, fact, pre, post }
  })

  const zeroFact = facts.find((f) => f.path === REAL_ZERO_PRICE_PATH)!
  const zeroPre = preInjectionReport.find((r) => r.path === REAL_ZERO_PRICE_PATH)!
  const zeroPost = postInjectionReport.find((r) => r.path === REAL_ZERO_PRICE_PATH)!

  return (
    <div style={{ padding: 16, fontFamily: 'monospace', fontSize: 13 }}>
      <h3>Honest handling of missing values — sub-piece 3 proof</h3>
      <p>Total addressable facts: {facts.length}</p>
      <p>
        provider: {genResult.provider} · model: {genResult.model} · usedFallback: {String(genResult.usedFallback)}
      </p>
      <p>usage: {JSON.stringify(genResult.usage)}</p>
      <p>
        truncated (final, post any retry — must be false to trust anything below): {String(truncated)}
        {retried ? ' — initial response was truncated, RE-RAN at a higher token limit.' : ''}
      </p>

      <h4>Not-provided cases (expect: provided:false, honest placeholder, mismatch pre-injection unless the AI wrote the placeholder itself, forced placeholder post-injection)</h4>
      {notProvidedRows.map((row) => (
        <div key={row.path} style={{ marginBottom: 16, borderTop: '1px solid #ccc', paddingTop: 8 }}>
          <p>
            <b>{row.path}</b> — fact.provided: {String(row.fact.provided)} · fact.displayValue: &quot;{row.fact.displayValue}&quot;
          </p>
          <p>AI's raw tagged text (what the model actually wrote, if it tagged this path at all): {row.pre.rawText === null ? '(not tagged at all)' : `"${row.pre.rawText}"`}</p>
          <p>pre-injection matches (expect false, unless the AI happened to write the placeholder verbatim): {String(row.pre.matches)}</p>
          <p>post-injection text (expect exactly the honest placeholder, regardless of what the AI wrote): &quot;{row.post.rawText}&quot;</p>
          <p>post-injection matches placeholder (expect true): {String(row.post.rawText === row.fact.displayValue)}</p>
        </div>
      ))}

      <h4>Negative case — a real $0 price must NOT be treated as "not provided"</h4>
      <p>
        {REAL_ZERO_PRICE_PATH} — fact.provided (expect true): {String(zeroFact.provided)} · fact.displayValue (expect &quot;$0&quot;): &quot;{zeroFact.displayValue}&quot;
      </p>
      <p>AI's raw tagged text: {zeroPre.rawText === null ? '(not tagged at all)' : `"${zeroPre.rawText}"`}</p>
      <p>post-injection text (expect &quot;$0&quot;, never the pricing placeholder): &quot;{zeroPost.rawText}&quot;</p>
    </div>
  )
}
