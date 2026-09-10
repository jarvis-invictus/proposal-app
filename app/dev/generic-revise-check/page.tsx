import { redirect } from 'next/navigation'
import { parse } from 'node-html-parser'
import { getAccountContext } from '@/lib/accountContext'
import { runStageText } from '@/lib/ai/harness'
import { stripCodeFence } from '@/lib/ai/stripCodeFence'
import { flattenProposalFacts, type FlatFact } from '@/lib/ai/flattenProposalFacts'
import { genericVerifyFields, type FieldReport } from '@/lib/ai/genericVerifyFields'
import { genericInjectFields } from '@/lib/ai/genericInjectFields'
import { buildGenericCodegenPrompt } from '@/lib/ai/genericCodegenPrompt'
import { buildGenericRevisePrompt } from '@/lib/ai/genericRevisePrompt'
import { FIXTURE_PROPOSAL_CONTENT, FIXTURE_CURRENCY, FIXTURE_BRAND_KIT } from '@/lib/ai/fixtures'

const INITIAL_MAX_OUTPUT_TOKENS = 8000
const RETRY_MAX_OUTPUT_TOKENS = 14000
const REVISE_FEEDBACK = 'Add a short FAQ section before the Accept button.'

function looksTruncated(html: string): boolean {
  const trimmed = html.trim()
  if (!trimmed.toLowerCase().endsWith('</html>')) return true
  return trimmed.lastIndexOf('<') > trimmed.lastIndexOf('>')
}

async function generateOnce(prompt: string, stage: string, maxOutputTokens: number) {
  const genResult = await runStageText(stage, { prompt, maxOutputTokens })
  return { genResult, html: stripCodeFence(genResult.text) }
}

async function generateWithRetry(prompt: string, stage: string) {
  let { genResult, html } = await generateOnce(prompt, stage, INITIAL_MAX_OUTPUT_TOKENS)
  let truncated = looksTruncated(html)
  let retried = false
  if (truncated) {
    retried = true
    ;({ genResult, html } = await generateOnce(prompt, stage, RETRY_MAX_OUTPUT_TOKENS))
    truncated = looksTruncated(html)
  }
  return { genResult, html, truncated, retried }
}

function summarizeReport(report: FieldReport[]) {
  const taggedCount = report.filter((r) => r.present).length
  const matchedCount = report.filter((r) => r.matches).length
  const presentPaths = new Set(report.filter((r) => r.present).map((r) => r.path))
  return { taggedCount, matchedCount, presentPaths }
}

type RunResult = {
  runIndex: number
  v1: { usage: unknown; truncated: boolean; retried: boolean; taggedCount: number; matchedCount: number }
  v2: { usage: unknown; truncated: boolean; retried: boolean; taggedCount: number; matchedCount: number }
  lostPaths: string[]
  faqPresent: boolean
}

async function runOnce(runIndex: number, facts: FlatFact[]): Promise<RunResult & { v2Html: string }> {
  const codegenPrompt = buildGenericCodegenPrompt(facts, FIXTURE_BRAND_KIT)
  const v1 = await generateWithRetry(codegenPrompt, 'codegen')
  const v1Root = parse(v1.html)
  const v1Report = genericVerifyFields(v1Root, facts)
  const v1Summary = summarizeReport(v1Report)
  const v1InjectedHtml = genericInjectFields(v1Root, facts) // matches the real pipeline's convention: revise gets post-injection HTML

  const revisePrompt = buildGenericRevisePrompt(v1InjectedHtml, facts, FIXTURE_BRAND_KIT, REVISE_FEEDBACK)
  const v2 = await generateWithRetry(revisePrompt, 'revise')
  const v2Root = parse(v2.html)
  const v2Report = genericVerifyFields(v2Root, facts)
  const v2Summary = summarizeReport(v2Report)
  genericInjectFields(v2Root, facts) // confirms injection still functions post-revise

  const lostPaths = [...v1Summary.presentPaths].filter((p) => !v2Summary.presentPaths.has(p))
  const faqPresent = /faq|frequently asked/i.test(v2.html)

  return {
    runIndex,
    v1: { usage: v1.genResult.usage, truncated: v1.truncated, retried: v1.retried, taggedCount: v1Summary.taggedCount, matchedCount: v1Summary.matchedCount },
    v2: { usage: v2.genResult.usage, truncated: v2.truncated, retried: v2.retried, taggedCount: v2Summary.taggedCount, matchedCount: v2Summary.matchedCount },
    lostPaths,
    faqPresent,
    v2Html: v2.html,
  }
}

/** Proves the generic revise mechanism (docs/PROJECT_ROADMAP.md §6, sub-piece 4) — does a revise
 * round preserve the ~50 original facts while adding genuinely new content? Not wired into any
 * real flow. genericVerifyFields/genericInjectFields are unchanged from sub-pieces 1-3; only
 * genericRevisePrompt.ts (new) and a small, output-preserving extraction in
 * genericCodegenPrompt.ts are new here. */
export default async function GenericReviseCheckPage() {
  const account = await getAccountContext()
  if (!account) redirect('/login')

  const facts = flattenProposalFacts(FIXTURE_PROPOSAL_CONTENT, FIXTURE_CURRENCY)

  const results: (RunResult & { v2Html: string })[] = []
  for (let i = 1; i <= 3; i++) {
    results.push(await runOnce(i, facts))
  }

  return (
    <div style={{ padding: 16, fontFamily: 'monospace', fontSize: 13 }}>
      <h3>Generic revise — sub-piece 4 proof</h3>
      <p>Total addressable facts: {facts.length}</p>
      <p>Feedback used: &quot;{REVISE_FEEDBACK}&quot;</p>

      {results.map((r) => (
        <div key={r.runIndex} style={{ marginBottom: 24, borderTop: '1px solid #ccc', paddingTop: 12 }}>
          <h4>Run {r.runIndex}</h4>
          <p>
            v1 (codegen) — truncated: {String(r.v1.truncated)}
            {r.v1.retried ? ' (retried at higher limit)' : ''} · tagged: {r.v1.taggedCount}/{facts.length} · matched: {r.v1.matchedCount}/{facts.length} · usage:{' '}
            {JSON.stringify(r.v1.usage)}
          </p>
          <p>
            v2 (revise) — truncated: {String(r.v2.truncated)}
            {r.v2.retried ? ' (retried at higher limit)' : ''} · tagged: {r.v2.taggedCount}/{facts.length} · matched: {r.v2.matchedCount}/{facts.length} · usage:{' '}
            {JSON.stringify(r.v2.usage)}
          </p>
          <p>
            persistence: {r.v2.taggedCount}/{r.v1.taggedCount} of v1's tagged facts still tagged after revise ({r.v1.taggedCount ? ((r.v2.taggedCount / r.v1.taggedCount) * 100).toFixed(1) : '0'}%)
          </p>
          <p>FAQ content present in v2 (expect true): {String(r.faqPresent)}</p>
          {r.lostPaths.length > 0 && <p style={{ whiteSpace: 'pre-wrap' }}>paths present in v1 but lost in v2: {JSON.stringify(r.lostPaths)}</p>}
        </div>
      ))}
    </div>
  )
}
