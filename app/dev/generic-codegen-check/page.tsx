import { parse } from 'node-html-parser'
import { requireDevAccess } from '@/lib/devAccess'
import { runStageText } from '@/lib/ai/harness'
import { stripCodeFence } from '@/lib/ai/stripCodeFence'
import { flattenProposalFacts, type FlatFact } from '@/lib/ai/flattenProposalFacts'
import { genericVerifyFields } from '@/lib/ai/genericVerifyFields'
import { genericInjectFields } from '@/lib/ai/genericInjectFields'
import { buildGenericCodegenPrompt } from '@/lib/ai/genericCodegenPrompt'
import { FIXTURE_PROPOSAL_CONTENT, FIXTURE_CURRENCY, FIXTURE_BRAND_KIT } from '@/lib/ai/fixtures'

const INITIAL_MAX_OUTPUT_TOKENS = 8000
const RETRY_MAX_OUTPUT_TOKENS = 14000

/** A response that doesn't end with </html>, or whose last unmatched "<" comes after its last
 * ">", was cut off mid-tag/mid-attribute — a token-limit artifact, not the model "choosing" to
 * skip tags. Must be checked BEFORE trusting any compliance number from that run. */
function looksTruncated(html: string): boolean {
  const trimmed = html.trim()
  if (!trimmed.toLowerCase().endsWith('</html>')) return true
  return trimmed.lastIndexOf('<') > trimmed.lastIndexOf('>')
}

type RunResult = {
  runIndex: number
  provider: string
  model: string
  usedFallback: boolean
  usage: { promptTokens: number; completionTokens: number }
  truncated: boolean
  retried: boolean
  totalFacts: number
  taggedCount: number
  matchedCount: number
  missingPaths: string[]
  mismatchedPaths: string[]
  acceptActionCount: number
  complianceFraction: number
}

async function generateOnce(prompt: string, maxOutputTokens: number) {
  const genResult = await runStageText('codegen', { prompt, maxOutputTokens })
  return { genResult, html: stripCodeFence(genResult.text) }
}

async function runAndEvaluate(runIndex: number, facts: FlatFact[], prompt: string): Promise<RunResult> {
  let { genResult, html } = await generateOnce(prompt, INITIAL_MAX_OUTPUT_TOKENS)
  let truncated = looksTruncated(html)
  let retried = false

  // Truncation invalidates a low compliance reading — re-run once at a higher limit rather than
  // counting missing tags near the cut-off point as the model declining to tag them.
  if (truncated) {
    retried = true
    ;({ genResult, html } = await generateOnce(prompt, RETRY_MAX_OUTPUT_TOKENS))
    truncated = looksTruncated(html)
  }

  const root = parse(html)
  const report = genericVerifyFields(root, facts)
  const taggedCount = report.filter((r) => r.present).length
  const matchedCount = report.filter((r) => r.matches).length
  const missingPaths = report.filter((r) => !r.present).map((r) => r.path)
  const mismatchedPaths = report.filter((r) => r.present && !r.matches).map((r) => r.path)
  genericInjectFields(root, facts) // confirms injection still functions at this scale
  const acceptActionCount = root.querySelectorAll('[data-proposal-action="accept"]').length

  return {
    runIndex,
    provider: genResult.provider,
    model: genResult.model,
    usedFallback: genResult.usedFallback,
    usage: genResult.usage,
    truncated,
    retried,
    totalFacts: facts.length,
    taggedCount,
    matchedCount,
    missingPaths,
    mismatchedPaths,
    acceptActionCount,
    complianceFraction: facts.length ? taggedCount / facts.length : 1,
  }
}

/** Proves the generic fact-addressing mechanism (docs/PROJECT_ROADMAP.md §6, sub-piece 2) against
 * a real AI generation call — not a fixture-authored HTML string like sub-piece 1's proof. Uses a
 * hand-built ProposalType (3 packages, 4 timeline phases — FIXTURE_PROPOSAL_CONTENT), but the
 * generation itself is real, via runStageText. Deliberately not wired into any real flow. */
export default async function GenericCodegenCheckPage() {
  await requireDevAccess()

  const facts = flattenProposalFacts(FIXTURE_PROPOSAL_CONTENT, FIXTURE_CURRENCY)
  const prompt = buildGenericCodegenPrompt(facts, FIXTURE_BRAND_KIT)

  const results: RunResult[] = []
  for (let i = 1; i <= 3; i++) {
    results.push(await runAndEvaluate(i, facts, prompt))
  }

  return (
    <div style={{ padding: 16, fontFamily: 'monospace', fontSize: 13 }}>
      <h3>Generic codegen wiring — sub-piece 2 proof</h3>
      <p>Total addressable facts for this fixture: {facts.length}</p>

      {results.map((r) => (
        <div key={r.runIndex} style={{ marginBottom: 24, borderTop: '1px solid #ccc', paddingTop: 12 }}>
          <h4>Run {r.runIndex}</h4>
          <p>
            provider: {r.provider} · model: {r.model} · usedFallback: {String(r.usedFallback)}
          </p>
          <p>usage: {JSON.stringify(r.usage)}</p>
          <p>
            truncated (final, post any retry): {String(r.truncated)}
            {r.retried ? ' — initial response was truncated, RE-RAN at a higher token limit; numbers below are from the retry.' : ''}
          </p>
          <p>
            tagged: {r.taggedCount}/{r.totalFacts} · matched: {r.matchedCount}/{r.totalFacts} · compliance:{' '}
            {(r.complianceFraction * 100).toFixed(1)}%
          </p>
          <p>accept-action count (expect 1): {r.acceptActionCount}</p>
          {r.missingPaths.length > 0 && <p style={{ whiteSpace: 'pre-wrap' }}>missing paths: {JSON.stringify(r.missingPaths)}</p>}
          {r.mismatchedPaths.length > 0 && <p style={{ whiteSpace: 'pre-wrap' }}>mismatched paths: {JSON.stringify(r.mismatchedPaths)}</p>}
        </div>
      ))}
    </div>
  )
}
