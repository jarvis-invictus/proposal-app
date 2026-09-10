import { parse, type HTMLElement } from 'node-html-parser'
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
 * headroom for. A truncated attempt must never read as "the model declined to add the tags."
 * Exported so the real beta-ai-page route (sub-piece 6) reuses this instead of a third copy. */
export function looksTruncated(html: string): boolean {
  const trimmed = html.trim()
  if (!trimmed.toLowerCase().endsWith('</html>')) return true
  return trimmed.lastIndexOf('<') > trimmed.lastIndexOf('>')
}

export type AcceptActionStatus = { present: boolean; exactlyOne: boolean; count: number }

/** The one concept genericVerifyFields/genericInjectFields deliberately never touch (sub-piece
 * 2's confirmed decision: accept-action is a UI affordance, not a data value, no FlatFact entry).
 * Kept its own small, separate check — same shape as the old fixed-3 VerificationReport's
 * `acceptAction` field — rather than folded into FieldReport, since it isn't a per-path fact. */
export function checkAcceptAction(root: HTMLElement): AcceptActionStatus {
  const els = root.querySelectorAll('[data-proposal-action="accept"]')
  return { present: els.length > 0, exactlyOne: els.length === 1, count: els.length }
}

function describeAcceptActionFailure(status: AcceptActionStatus): string | null {
  if (!status.present) {
    return 'data-proposal-action="accept" is missing — add it to the single accept/sign button.'
  }
  if (!status.exactlyOne) {
    return `data-proposal-action="accept" appears on ${status.count} different elements, but must appear on exactly ONE. Remove this attribute from every extra element — keep it on only the real accept/sign button — without changing anything else about the page.`
  }
  return null
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
  acceptAction: AcceptActionStatus
  attemptsUsed: number
  repaired: boolean
  attemptsLog: RepairAttemptLog[]
}

/** Generalizes autoRepair.ts's attemptAutoRepair to an arbitrary-length FlatFact[] list instead of
 * the fixed 3-field contract, PLUS the accept-action check the old `verifyProposalTags` bundled in
 * (real gap found designing sub-piece 6: this function originally tracked only field presence,
 * but the real route needs both checked and repaired together, one unified loop rather than two
 * sequential ones). Gate is `report.every(r => r.present) && acceptAction.exactlyOne` — deliberately
 * NOT `present && matches` for fields: mirrors allPresent's real semantics exactly, a tag that
 * exists but shows the wrong value is not a repair target, because genericInjectFields
 * unconditionally force-corrects any present tag afterward regardless of attempt count. Repair's
 * only real job is making sure a tag exists at all for each required fact, and exactly one accept
 * action exists. Failure feedback names every currently-missing path individually, no summarizing
 * or count cutoff, plus the accept-action line when relevant — mirroring describeTagFailures's own
 * specificity, which is what made the fixed-3 mechanism reliably self-correct in the first place. */
export async function attemptGenericAutoRepair(
  html: string,
  facts: FlatFact[],
  brandKit: BrandKitContext | null,
  report: FieldReport[],
  acceptAction: AcceptActionStatus,
  opts: GenericAutoRepairOptions = {}
): Promise<GenericAutoRepairResult> {
  const maxAttempts = opts.maxAttempts ?? 2
  const buildPrompt = opts.buildPrompt ?? buildGenericRevisePrompt
  const isComplete = (r: FieldReport[], a: AcceptActionStatus) => r.every((x) => x.present) && a.exactlyOne

  if (isComplete(report, acceptAction)) {
    return { html, report, acceptAction, attemptsUsed: 0, repaired: false, attemptsLog: [] }
  }

  let currentHtml = html
  let currentReport = report
  let currentAcceptAction = acceptAction
  const attemptsLog: RepairAttemptLog[] = []

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const fieldFailures = currentReport
      .filter((r) => !r.present)
      .map((r) => {
        const fact = facts.find((f) => f.path === r.path)
        return `data-proposal-field="${r.path}" is missing — add it to the real element whose visible text shows "${fact?.displayValue}".`
      })
    const acceptFailure = describeAcceptActionFailure(currentAcceptAction)
    const failures = acceptFailure ? [...fieldFailures, acceptFailure] : fieldFailures
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
    const currentRoot = parse(currentHtml)
    currentReport = genericVerifyFields(currentRoot, facts)
    currentAcceptAction = checkAcceptAction(currentRoot)

    if (isComplete(currentReport, currentAcceptAction)) {
      return { html: currentHtml, report: currentReport, acceptAction: currentAcceptAction, attemptsUsed: attempt, repaired: true, attemptsLog }
    }
  }

  return { html: currentHtml, report: currentReport, acceptAction: currentAcceptAction, attemptsUsed: maxAttempts, repaired: false, attemptsLog }
}
