import { redirect } from 'next/navigation'
import { parse } from 'node-html-parser'
import { getAccountContext } from '@/lib/accountContext'
import { runStageText } from '@/lib/ai/harness'
import { buildCodegenPrompt, type CodegenDealFacts } from '@/lib/ai/codegenPrompt'
import { buildRevisePrompt } from '@/lib/ai/revisePrompt'
import { verifyProposalTags, type ProposalSourceOfTruth, type VerificationReport } from '@/lib/ai/verifyProposalTags'
import { injectVerifiedValues } from '@/lib/ai/injectVerifiedValues'
import { compileTailwindForHtml, buildFinalArtifact } from '@/lib/ai/compileTailwind'
import { publishGeneratedPage } from '@/lib/ai/publishGeneratedPage'

// Default test proposal (Phase 1 sub-piece 5's leftover — already at version 1, so it's NOT used
// for real verification runs, only as a fallback if no ?proposalId= is given). Each real
// verification run passes its own freshly-created row via ?proposalId=, so its v1→v4 sequence
// lands cleanly on versions 1-4 — nowhere near the round cap, which stays untriggered by anything
// this page does.
const DEFAULT_TEST_PROPOSAL_ID = 'd80d88e6-39ba-428a-a83d-ddb2e083116c'

// Phase 2 sub-piece 2 — 3 distinct, concrete, checkable revision rounds chained on top of v1
// (docs/CORE_ENGINE_V2_SPEC.md §2 stage 10, §8's "2-3 rounds"). Each round's feedback is
// unrelated to the others', so persistence of earlier rounds' content into later versions is a
// real, checkable question, not assumed.
const REVISION_ROUNDS = [
  'Add a short FAQ section before the Accept button.',
  'Make the tone more premium and upscale throughout.',
  "Add a one-sentence testimonial quote near the top, attributed to 'a past client'.",
]

const FIXTURE_FACTS: CodegenDealFacts = {
  clientName: 'Bloom & Ives',
  projectName: 'Website Redesign',
  totalPrice: '4500 USD',
  dueDate: 'the 15th of November, 2026',
  deliverables: ['Homepage redesign', '5 interior pages', 'Mobile-responsive layout'],
  paymentTerm: '50% due upon acceptance, 50% due on delivery',
}

const SOURCE_OF_TRUTH: ProposalSourceOfTruth = {
  priceTotal: 4500,
  currency: 'USD',
  dueDate: '2026-11-15',
}

const FIXTURE_BRAND_KIT = {
  id: 'fixture',
  name: 'Bloom & Ives',
  colors: { primary: '#2F6F4E', secondary: '#F4EFE6', accent: '#C97B4A' },
  fonts: { heading: 'Fraunces', body: 'Inter' },
  personality: 'Warm, earthy, understated confidence — like a boutique florist that also does corporate work.',
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:html)?\s*\n([\s\S]*?)\n```$/)
  return fenced ? fenced[1].trim() : trimmed
}

type RoundOutput = {
  htmlAfterInjection: string
  verification: VerificationReport
  compiledCss: string
  finalHtml: string
}

/** The same guardrail chain every prior sub-piece already built — parse → verify → inject →
 * compile → combine — factored out here because with 4 total versions now, inlining this block
 * once per version (as sub-piece 1 did for its 2) would be real duplication, not composition. No
 * new guardrail logic; this proves the existing chain holds identically at every round. */
async function runRound(rawText: string): Promise<RoundOutput> {
  const htmlBeforeInjection = stripCodeFence(rawText)
  const root = parse(htmlBeforeInjection)
  const verification = verifyProposalTags(root, SOURCE_OF_TRUTH)
  const htmlAfterInjection = injectVerifiedValues(root, SOURCE_OF_TRUTH)
  const compiledCss = await compileTailwindForHtml(htmlAfterInjection)
  const finalHtml = buildFinalArtifact(htmlAfterInjection, compiledCss)
  return { htmlAfterInjection, verification, compiledCss, finalHtml }
}

type RoundSummary = {
  label: string
  feedback: string | null
  provider: string
  model: string
  usedFallback: boolean
  usage: { promptTokens: number; completionTokens: number } | null
  verification: VerificationReport
  compiledCssLength: number
  publishedVersion: number
  finalHtml: string
}

/** Proves a chained multi-round revision (docs/CORE_ENGINE_V2_SPEC.md §2 stages 4-11, §4, §6,
 * §7, §8's "2-3 rounds") through the exact same guardrail chain at every round — no new
 * mechanism. Each round's revise prompt gets ONLY the immediately-prior round's full markup as
 * context (`priorHtml` is reassigned each iteration, never accumulated), which is what keeps
 * per-round token cost flat rather than growing — checked directly via real usage figures, not
 * assumed from the code structure alone. Pass ?proposalId=<uuid> for a fresh test proposal row
 * per verification run — never reuse one that already has a version, or the round cap will
 * refuse the run for reasons unrelated to whether chained revision itself works. Deliberately not
 * wired into any real flow, same as every other /dev proof page this phase. */
export default async function PreviewCheckPage({ searchParams }: { searchParams: Promise<{ proposalId?: string }> }) {
  const account = await getAccountContext()
  if (!account) redirect('/login')

  const { proposalId: queryProposalId } = await searchParams
  const proposalId = queryProposalId || DEFAULT_TEST_PROPOSAL_ID

  const summaries: RoundSummary[] = []

  // v1 — generation.
  const v1Prompt = buildCodegenPrompt(FIXTURE_FACTS, FIXTURE_BRAND_KIT)
  const v1Result = await runStageText('codegen', { prompt: v1Prompt, maxOutputTokens: 6000 })
  const v1Round = await runRound(v1Result.text)
  const v1Published = await publishGeneratedPage(proposalId, {
    html: v1Round.finalHtml,
    provider: v1Result.provider,
    model: v1Result.model,
    usedFallback: v1Result.usedFallback,
  })
  summaries.push({
    label: 'v1 (generation)',
    feedback: null,
    provider: v1Result.provider,
    model: v1Result.model,
    usedFallback: v1Result.usedFallback,
    usage: null,
    verification: v1Round.verification,
    compiledCssLength: v1Round.compiledCss.length,
    publishedVersion: v1Published.version,
    finalHtml: v1Round.finalHtml,
  })

  // Rounds 2-4 — chained revisions. priorHtml holds ONLY the immediately-prior round's markup.
  let priorHtml = v1Round.htmlAfterInjection
  let lastFinalHtml = v1Round.finalHtml

  for (const feedback of REVISION_ROUNDS) {
    const revisePrompt = buildRevisePrompt(priorHtml, FIXTURE_FACTS, FIXTURE_BRAND_KIT, feedback)
    const result = await runStageText('revise', { prompt: revisePrompt, maxOutputTokens: 6000 })
    const round = await runRound(result.text)
    const published = await publishGeneratedPage(proposalId, {
      html: round.finalHtml,
      provider: result.provider,
      model: result.model,
      usedFallback: result.usedFallback,
    })

    summaries.push({
      label: `v${published.version} (revision)`,
      feedback,
      provider: result.provider,
      model: result.model,
      usedFallback: result.usedFallback,
      usage: result.usage,
      verification: round.verification,
      compiledCssLength: round.compiledCss.length,
      publishedVersion: published.version,
      finalHtml: round.finalHtml,
    })

    priorHtml = round.htmlAfterInjection
    lastFinalHtml = round.finalHtml
  }

  return (
    <div style={{ padding: 16, fontFamily: 'monospace', fontSize: 13 }}>
      <p>proposalId: {proposalId}</p>
      {summaries.map((s) => (
        <div key={s.label}>
          <h3>
            {s.label}
            {s.feedback ? ` — feedback: "${s.feedback}"` : ''}
          </h3>
          <p>
            provider: {s.provider} · model: {s.model} · usedFallback: {String(s.usedFallback)} · compiledCss: {s.compiledCssLength} bytes
          </p>
          {s.usage && (
            <p>
              usage: promptTokens={s.usage.promptTokens}, completionTokens={s.usage.completionTokens}
            </p>
          )}
          <p>verification: {JSON.stringify(s.verification)}</p>
          <p>published version: {s.publishedVersion}</p>
        </div>
      ))}
      <h3>Final version rendered</h3>
      <iframe sandbox="allow-scripts" srcDoc={lastFinalHtml} style={{ width: '100%', height: '60vh', border: '1px solid #ccc' }} />
    </div>
  )
}
