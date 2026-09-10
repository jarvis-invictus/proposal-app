import { parse } from 'node-html-parser'
import type { BrandKitContext } from '@/lib/brand-extraction/prompt'
import { runStageText } from '@/lib/ai/harness'
import { stripCodeFence } from '@/lib/ai/stripCodeFence'
import { buildGenericRevisePrompt } from '@/lib/ai/genericRevisePrompt'
import { genericVerifyFields, type FieldReport } from '@/lib/ai/genericVerifyFields'
import type { FlatFact } from '@/lib/ai/flattenProposalFacts'

const INITIAL_MAX_OUTPUT_TOKENS = 6000
const RETRY_MAX_OUTPUT_TOKENS = 10000

/** Same truncation guard used everywhere else this session — a repair attempt regenerates a full
 * page via buildGenericRevisePrompt, the same class of output sub-pieces 2-4 already needed
 * headroom for. A truncated attempt must never read as "the model declined to add the tags." */
function looksTruncated(html: string): boolean {
  const trimmed = html.trim()
  if (!trimmed.toLowerCase().endsWith('</html>')) return true
  return trimmed.lastIndexOf('<') > trimmed.lastIndexOf('>')
}

export type GenericAutoRepairOptions = {
  maxAttempts?: number
  /** Injectable prompt-builder, defaulting to the real buildGenericRevisePrompt — same test seam
   * as AutoRepairOptions.buildPrompt, not a production configuration point. */
  buildPrompt?: typeof buildGenericRevisePrompt
}

export type RepairAttemptLog = {
  attempt: number
  usage: { promptTokens: number; completionTokens: number }
  truncated: boolean
  retried: boolean
}

export type GenericAutoRepairResult = {
  html: string
  report: FieldReport[]
  attemptsUsed: number
  repaired: boolean
  attemptsLog: RepairAttemptLog[]
}

/** Generalizes autoRepair.ts's attemptAutoRepair to an arbitrary-length FlatFact[] list instead of
 * the fixed 3-field contract. Gate is deliberately `report.every(r => r.present)`, NOT
 * `present && matches` — mirrors allPresent's real semantics exactly: a tag that exists but shows
 * the wrong value is not a repair target, because genericInjectFields unconditionally
 * force-corrects any present tag afterward regardless of attempt count. Repair's only real job is
 * making sure a tag exists at all for each required fact. Failure feedback names every currently-
 * missing path individually, no summarizing or count cutoff — mirroring describeTagFailures's own
 * specificity, which is what made the fixed-3 mechanism reliably self-correct in the first place. */
export async function attemptGenericAutoRepair(
  html: string,
  facts: FlatFact[],
  brandKit: BrandKitContext | null,
  report: FieldReport[],
  opts: GenericAutoRepairOptions = {}
): Promise<GenericAutoRepairResult> {
  const maxAttempts = opts.maxAttempts ?? 2
  const buildPrompt = opts.buildPrompt ?? buildGenericRevisePrompt

  if (report.every((r) => r.present)) {
    return { html, report, attemptsUsed: 0, repaired: false, attemptsLog: [] }
  }

  let currentHtml = html
  let currentReport = report
  const attemptsLog: RepairAttemptLog[] = []

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const failures = currentReport
      .filter((r) => !r.present)
      .map((r) => {
        const fact = facts.find((f) => f.path === r.path)
        return `data-proposal-field="${r.path}" is missing — add it to the real element whose visible text shows "${fact?.displayValue}".`
      })
    const feedback = `AUTOMATIC REPAIR REQUIRED — the previous version has the following problem(s): ${failures.join('; ')}. Fix ONLY this. Do not change anything else about the page.`
    const prompt = buildPrompt(currentHtml, facts, brandKit, feedback)

    let result = await runStageText('revise', { prompt, maxOutputTokens: INITIAL_MAX_OUTPUT_TOKENS })
    let attemptHtml = stripCodeFence(result.text)
    let truncated = looksTruncated(attemptHtml)
    let retried = false
    if (truncated) {
      retried = true
      result = await runStageText('revise', { prompt, maxOutputTokens: RETRY_MAX_OUTPUT_TOKENS })
      attemptHtml = stripCodeFence(result.text)
      truncated = looksTruncated(attemptHtml)
    }

    attemptsLog.push({ attempt, usage: result.usage, truncated, retried })

    currentHtml = attemptHtml
    currentReport = genericVerifyFields(parse(currentHtml), facts)

    if (currentReport.every((r) => r.present)) {
      return { html: currentHtml, report: currentReport, attemptsUsed: attempt, repaired: true, attemptsLog }
    }
  }

  return { html: currentHtml, report: currentReport, attemptsUsed: maxAttempts, repaired: false, attemptsLog }
}
