import { redirect } from 'next/navigation'
import { parse } from 'node-html-parser'
import { getAccountContext } from '@/lib/accountContext'
import { runStageText } from '@/lib/ai/harness'
import { stripCodeFence } from '@/lib/ai/stripCodeFence'
import { flattenProposalFacts, type FlatFact } from '@/lib/ai/flattenProposalFacts'
import { genericVerifyFields } from '@/lib/ai/genericVerifyFields'
import { genericInjectFields } from '@/lib/ai/genericInjectFields'
import { buildGenericCodegenPrompt } from '@/lib/ai/genericCodegenPrompt'
import { attemptGenericAutoRepair, checkAcceptAction } from '@/lib/ai/genericAutoRepair'
import { FIXTURE_PROPOSAL_CONTENT, FIXTURE_CURRENCY, FIXTURE_BRAND_KIT } from '@/lib/ai/fixtures'

const INITIAL_MAX_OUTPUT_TOKENS = 8000
const RETRY_MAX_OUTPUT_TOKENS = 14000

// Three specific paths, deliberately spanning different sections/leaf shapes, deliberately NOT
// including clientName (sub-piece 2 already showed that path can go missing for an unrelated,
// known reason — title/clientName text overlap — which would confound this forced test).
const OMITTED_PATHS = ['packages[1].discountedPrice', 'timeline[2].description', 'addOns[0].price']

function looksTruncated(html: string): boolean {
  const trimmed = html.trim()
  if (!trimmed.toLowerCase().endsWith('</html>')) return true
  return trimmed.lastIndexOf('<') > trimmed.lastIndexOf('>')
}

async function generateWithRetry(prompt: string) {
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
  return { genResult, html, truncated, retried }
}

async function runOnce(runIndex: number, facts: FlatFact[]) {
  // Forced gap: the model only ever sees 48 of 51 facts in this one generation call — it can only
  // tag what it was shown, so verifying against the FULL 51-fact list below produces a real,
  // reproducible, exact gap without a hand-written broken prompt or DOM mutation.
  const visibleFacts = facts.filter((f) => !OMITTED_PATHS.includes(f.path))
  const brokenPrompt = buildGenericCodegenPrompt(visibleFacts, FIXTURE_BRAND_KIT)

  const gen = await generateWithRetry(brokenPrompt)
  const initialRoot = parse(gen.html)
  const initialReport = genericVerifyFields(initialRoot, facts)
  const initialAcceptAction = checkAcceptAction(initialRoot)
  const initialPresentCount = initialReport.filter((r) => r.present).length
  const forcedGapConfirmed = OMITTED_PATHS.every((p) => initialReport.find((r) => r.path === p)?.present === false)
  const unforcedMissing = initialReport.filter((r) => !r.present && !OMITTED_PATHS.includes(r.path)).map((r) => r.path)

  const repair = await attemptGenericAutoRepair(gen.html, facts, FIXTURE_BRAND_KIT, initialReport, initialAcceptAction)

  const finalRoot = parse(repair.html)
  genericInjectFields(finalRoot, facts) // real pipeline order: repair, then inject

  const forcedGapRepaired = OMITTED_PATHS.every((p) => repair.report.find((r) => r.path === p)?.present === true)
  const finalPresentCount = repair.report.filter((r) => r.present).length

  return {
    runIndex,
    initialGenTruncated: gen.truncated,
    initialGenRetried: gen.retried,
    initialPresentCount,
    initialAcceptAction,
    forcedGapConfirmed,
    unforcedMissing,
    attemptsUsed: repair.attemptsUsed,
    repaired: repair.repaired,
    forcedGapRepaired,
    finalPresentCount,
    finalAcceptAction: repair.acceptAction,
    attemptsLog: repair.attemptsLog,
  }
}

/** Proves the generic auto-repair mechanism (docs/PROJECT_ROADMAP.md §6, sub-piece 5) against a
 * real, deterministically-forced tagging gap — not a hope that the model happens to miss
 * something. Not wired into any real flow. genericVerifyFields/genericInjectFields/
 * genericCodegenPrompt/genericRevisePrompt are all unchanged from sub-pieces 1-4; only
 * genericAutoRepair.ts (new) is added here. */
export default async function GenericAutoRepairCheckPage() {
  const account = await getAccountContext()
  if (!account) redirect('/login')

  const facts = flattenProposalFacts(FIXTURE_PROPOSAL_CONTENT, FIXTURE_CURRENCY)

  const results = []
  for (let i = 1; i <= 3; i++) {
    results.push(await runOnce(i, facts))
  }

  return (
    <div style={{ padding: 16, fontFamily: 'monospace', fontSize: 13 }}>
      <h3>Generic auto-repair — sub-piece 5 proof</h3>
      <p>Total addressable facts: {facts.length}</p>
      <p>Forced-omitted paths: {JSON.stringify(OMITTED_PATHS)}</p>

      {results.map((r) => (
        <div key={r.runIndex} style={{ marginBottom: 24, borderTop: '1px solid #ccc', paddingTop: 12 }}>
          <h4>Run {r.runIndex}</h4>
          <p>
            initial forced-gap generation — truncated: {String(r.initialGenTruncated)}
            {r.initialGenRetried ? ' (retried at higher limit)' : ''} · present: {r.initialPresentCount}/{facts.length}
          </p>
          <p>all 3 forced-omitted paths confirmed missing before repair (expect true): {String(r.forcedGapConfirmed)}</p>
          {r.unforcedMissing.length > 0 && <p style={{ whiteSpace: 'pre-wrap' }}>other, unforced missing paths (normal ~2% variance, not hidden): {JSON.stringify(r.unforcedMissing)}</p>}

          <p>accept-action before repair: {JSON.stringify(r.initialAcceptAction)}</p>
          <p>
            repair — attemptsUsed: {r.attemptsUsed} · repaired: {String(r.repaired)} · final present: {r.finalPresentCount}/{facts.length} · final accept-action:{' '}
            {JSON.stringify(r.finalAcceptAction)}
          </p>
          <p>all 3 forced-omitted paths present after repair (expect true): {String(r.forcedGapRepaired)}</p>

          <p>per-attempt log (real token cost + truncation status, per attempt):</p>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(r.attemptsLog, null, 2)}</pre>
        </div>
      ))}
    </div>
  )
}
