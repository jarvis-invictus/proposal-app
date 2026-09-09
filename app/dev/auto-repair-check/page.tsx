import { redirect } from 'next/navigation'
import { parse } from 'node-html-parser'
import { getAccountContext } from '@/lib/accountContext'
import { runStageText } from '@/lib/ai/harness'
import { buildCodegenPromptTestOnly, type CodegenDealFacts } from '@/lib/ai/codegenPrompt'
import { verifyProposalTags } from '@/lib/ai/verifyProposalTags'
import { injectVerifiedValues } from '@/lib/ai/injectVerifiedValues'
import { compileTailwindForHtml, buildFinalArtifact } from '@/lib/ai/compileTailwind'
import { publishGeneratedPage } from '@/lib/ai/publishGeneratedPage'
import { stripCodeFence } from '@/lib/ai/stripCodeFence'
import { attemptAutoRepair } from '@/lib/ai/autoRepair'
import { FIXTURE_FACTS, SOURCE_OF_TRUTH, FIXTURE_BRAND_KIT } from '@/lib/ai/fixtures'
import type { BrandKitContext } from '@/lib/brand-extraction/prompt'

// Default test proposal — same fallback pattern as app/dev/preview-check/page.tsx. Scenario A
// (the only scenario that publishes) should always be given its own fresh ?proposalId=.
const DEFAULT_TEST_PROPOSAL_ID = 'd80d88e6-39ba-428a-a83d-ddb2e083116c'

// TEST-ONLY SCAFFOLDING — deliberately incomplete tagging contract, omitting the accept-action
// instruction entirely. Reliably forces a real, reproducible missing-tag case rather than hoping
// the model organically forgets one of the three instructions it's normally always given. Never
// used by any real generation/revision path — only by this dev proof page.
const BROKEN_TAGGING_CONTRACT_TEST_ONLY = `TAGGING CONTRACT — non-negotiable, in addition to your creative freedom above. These attributes must each appear exactly once, on the real HTML element that actually shows or triggers the corresponding thing:
1. data-proposal-field="price_total" — on the element whose visible text shows the final total price (must contain the real total price figure given above).
2. data-proposal-field="due_date" — on the element whose visible text shows the project due date (must contain the real due date given above).`

function buildBrokenCodegenPromptTestOnly(facts: CodegenDealFacts, brandKit: BrandKitContext | null): string {
  return `You are writing a complete, self-contained HTML proposal page for a freelancer/agency to send a client.

DEAL FACTS — use only these, never invent figures or terms not listed here:
Client: ${facts.clientName}
Project: ${facts.projectName}
Total price: ${facts.totalPrice}
Due date: ${facts.dueDate}
Deliverables: ${facts.deliverables.join(', ')}
Payment term: ${facts.paymentTerm}

CREATIVE FREEDOM: you have full control over layout, copy, styling, and animation.

${BROKEN_TAGGING_CONTRACT_TEST_ONLY}

OUTPUT FORMAT: respond with ONLY the raw HTML document, starting with <!DOCTYPE html> and ending with </html>. No markdown code fences, no explanation before or after, no commentary.`
}

/** TEST-ONLY — used as `attemptAutoRepair`'s injectable prompt builder for Scenario C, to prove
 * the exhaustion path deterministically rather than hoping the model fails twice in a row.
 *
 * First attempt at this (kept as a comment, not silently dropped) just omitted the general
 * tagging-contract instruction — that alone did NOT reliably force failure: `attemptAutoRepair`'s
 * own `describeMissingTags()` feedback string names the exact missing attribute by name, and that
 * targeted instruction gave the model enough signal to add it correctly anyway, regardless of
 * what the surrounding template omitted. The real fix is to also discard the informative feedback
 * itself — `feedback` is intentionally UNUSED here, replaced with a generic, useless instruction —
 * so the model genuinely has no signal about what's missing on any attempt. */
function buildBrokenRevisePromptTestOnly(priorHtml: string, facts: CodegenDealFacts, brandKit: BrandKitContext | null, _feedback: string): string {
  return `You are revising an existing HTML proposal page based on real human feedback. Produce a COMPLETE, new version of the entire page.

DEAL FACTS:
Client: ${facts.clientName}
Total price: ${facts.totalPrice}
Due date: ${facts.dueDate}

FEEDBACK TO ADDRESS:
"Make the page look nicer overall."

PRIOR VERSION OF THE PAGE:
${priorHtml}

${BROKEN_TAGGING_CONTRACT_TEST_ONLY}

OUTPUT FORMAT: respond with ONLY the raw HTML document, starting with <!DOCTYPE html> and ending with </html>. No markdown code fences, no explanation before or after, no commentary.`
}

/** Proves the missing-tag auto-repair mechanism (docs/CORE_ENGINE_V2_SPEC.md §4) — the gap
 * flagged and deferred since Phase 1 sub-piece 2. Pass ?scenario=a|b|c|d (default a).
 * Scenario a (repair succeeds) is the only one that publishes — give it its own fresh
 * ?proposalId= each run, same hygiene as every other /dev proof page. Deliberately not wired
 * into any real flow. */
export default async function AutoRepairCheckPage({ searchParams }: { searchParams: Promise<{ scenario?: string; proposalId?: string }> }) {
  const account = await getAccountContext()
  if (!account) redirect('/login')

  const { scenario: scenarioParam, proposalId: queryProposalId } = await searchParams
  const scenario = scenarioParam || 'a'
  const proposalId = queryProposalId || DEFAULT_TEST_PROPOSAL_ID

  if (scenario === 'a') {
    const genPrompt = buildBrokenCodegenPromptTestOnly(FIXTURE_FACTS, FIXTURE_BRAND_KIT)
    const genResult = await runStageText('codegen', { prompt: genPrompt, maxOutputTokens: 6000 })
    const htmlBeforeInjection = stripCodeFence(genResult.text)
    const initialVerification = verifyProposalTags(parse(htmlBeforeInjection), SOURCE_OF_TRUTH)

    const repair = await attemptAutoRepair(htmlBeforeInjection, FIXTURE_FACTS, FIXTURE_BRAND_KIT, SOURCE_OF_TRUTH, initialVerification)

    let publishedVersion: number | null = null
    let finalHtml = ''
    if (repair.verification.allPresent) {
      const root = parse(repair.html)
      const htmlAfterInjection = injectVerifiedValues(root, SOURCE_OF_TRUTH)
      const compiledCss = await compileTailwindForHtml(htmlAfterInjection)
      finalHtml = buildFinalArtifact(htmlAfterInjection, compiledCss)
      const published = await publishGeneratedPage(proposalId, {
        html: finalHtml,
        provider: genResult.provider,
        model: genResult.model,
        usedFallback: genResult.usedFallback,
      })
      publishedVersion = published.version
    }

    return (
      <div style={{ padding: 16, fontFamily: 'monospace', fontSize: 13 }}>
        <h3>Scenario A — repair succeeds</h3>
        <p>proposalId: {proposalId}</p>
        <p>initial verification (expect acceptAction.present: false): {JSON.stringify(initialVerification)}</p>
        <p>
          attemptsUsed: {repair.attemptsUsed} · repaired: {String(repair.repaired)}
        </p>
        <p>final verification: {JSON.stringify(repair.verification)}</p>
        <p>published version: {publishedVersion ?? '(not published — repair did not succeed)'}</p>
        {finalHtml && <iframe sandbox="allow-scripts" srcDoc={finalHtml} style={{ width: '100%', height: '50vh', border: '1px solid #ccc' }} />}
      </div>
    )
  }

  if (scenario === 'b') {
    // Normal, working prompt — expect allPresent: true, zero repair attempts.
    const genPrompt = buildCodegenPromptTestOnly(FIXTURE_FACTS, FIXTURE_BRAND_KIT)
    const genResult = await runStageText('codegen', { prompt: genPrompt, maxOutputTokens: 6000 })
    const htmlBeforeInjection = stripCodeFence(genResult.text)
    const verification = verifyProposalTags(parse(htmlBeforeInjection), SOURCE_OF_TRUTH)

    const repair = await attemptAutoRepair(htmlBeforeInjection, FIXTURE_FACTS, FIXTURE_BRAND_KIT, SOURCE_OF_TRUTH, verification)

    return (
      <div style={{ padding: 16, fontFamily: 'monospace', fontSize: 13 }}>
        <h3>Scenario B — no-op path</h3>
        <p>initial verification (expect allPresent: true): {JSON.stringify(verification)}</p>
        <p>
          attemptsUsed: {repair.attemptsUsed} (expect 0) · repaired: {String(repair.repaired)} (expect false)
        </p>
        <p>Check server logs for zero new [ai-harness] revise lines from this request.</p>
      </div>
    )
  }

  if (scenario === 'c') {
    // Exhaustion path. Repair itself is also instructed to omit the tag, via the injectable
    // buildPrompt option, so it can never succeed — proving the cap fires deterministically.
    const genPrompt = buildBrokenCodegenPromptTestOnly(FIXTURE_FACTS, FIXTURE_BRAND_KIT)
    const genResult = await runStageText('codegen', { prompt: genPrompt, maxOutputTokens: 6000 })
    const htmlBeforeInjection = stripCodeFence(genResult.text)
    const initialVerification = verifyProposalTags(parse(htmlBeforeInjection), SOURCE_OF_TRUTH)

    const repair = await attemptAutoRepair(htmlBeforeInjection, FIXTURE_FACTS, FIXTURE_BRAND_KIT, SOURCE_OF_TRUTH, initialVerification, {
      buildPrompt: buildBrokenRevisePromptTestOnly,
    })

    return (
      <div style={{ padding: 16, fontFamily: 'monospace', fontSize: 13 }}>
        <h3>Scenario C — exhaustion path</h3>
        <p>initial verification (expect acceptAction.present: false): {JSON.stringify(initialVerification)}</p>
        <p>
          attemptsUsed: {repair.attemptsUsed} (expect 2) · repaired: {String(repair.repaired)} (expect false)
        </p>
        <p>final verification: {JSON.stringify(repair.verification)}</p>
        <p><b>No publishGeneratedPage call is made in this branch — confirmed by code path, not just this report.</b></p>
      </div>
    )
  }

  // scenario === 'd' — duplicate accept action, the gap closed by this task. Forced
  // deterministically at the DOM level, not by asking the model to add a second button (far less
  // reliable than the missing-tag scenarios' technique of omitting an instruction — a model asked
  // to affirmatively duplicate an element isn't guaranteed to comply, especially with
  // TAGGING_CONTRACT_BLOCK's own "exactly one" instruction still present in the same prompt).
  const genPrompt = buildCodegenPromptTestOnly(FIXTURE_FACTS, FIXTURE_BRAND_KIT)
  const genResult = await runStageText('codegen', { prompt: genPrompt, maxOutputTokens: 6000 })
  const htmlBeforeInjection = stripCodeFence(genResult.text)

  const cleanRoot = parse(htmlBeforeInjection)
  const cleanVerification = verifyProposalTags(cleanRoot, SOURCE_OF_TRUTH)
  // Sanity check the real generation actually produced a single accept element before mutating —
  // confirmed, not assumed, same discipline as every other forced-test-case this session.
  if (!cleanVerification.acceptAction.exactlyOne) {
    return (
      <div style={{ padding: 16, fontFamily: 'monospace', fontSize: 13 }}>
        <h3>Scenario D — setup failed</h3>
        <p>Real generation did not produce exactly one accept element to duplicate: {JSON.stringify(cleanVerification.acceptAction)}</p>
        <p>Re-run — this is the codegen step misbehaving, not the thing being tested.</p>
      </div>
    )
  }

  const acceptEl = cleanRoot.querySelector('[data-proposal-action="accept"]')!
  acceptEl.after(acceptEl.clone())
  const duplicatedHtml = cleanRoot.toString()
  const initialVerification = verifyProposalTags(parse(duplicatedHtml), SOURCE_OF_TRUTH)

  const repair = await attemptAutoRepair(duplicatedHtml, FIXTURE_FACTS, FIXTURE_BRAND_KIT, SOURCE_OF_TRUTH, initialVerification)

  return (
    <div style={{ padding: 16, fontFamily: 'monospace', fontSize: 13 }}>
      <h3>Scenario D — duplicate accept action</h3>
      <p>clean single-accept verification, pre-mutation (expect exactlyOne: true, count: 1): {JSON.stringify(cleanVerification.acceptAction)}</p>
      <p>initial verification post-mutation (expect count: 2, exactlyOne: false, allPresent: false): {JSON.stringify(initialVerification)}</p>
      <p>
        attemptsUsed: {repair.attemptsUsed} · repaired: {String(repair.repaired)}
      </p>
      <p>final verification (expect count: 1, exactlyOne: true, allPresent: true): {JSON.stringify(repair.verification)}</p>
    </div>
  )
}
