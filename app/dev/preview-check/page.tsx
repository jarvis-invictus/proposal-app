import { redirect } from 'next/navigation'
import { parse } from 'node-html-parser'
import { getAccountContext } from '@/lib/accountContext'
import { runStageText } from '@/lib/ai/harness'
import { buildCodegenPrompt, type CodegenDealFacts } from '@/lib/ai/codegenPrompt'
import { buildRevisePrompt } from '@/lib/ai/revisePrompt'
import { verifyProposalTags, type ProposalSourceOfTruth } from '@/lib/ai/verifyProposalTags'
import { injectVerifiedValues } from '@/lib/ai/injectVerifiedValues'
import { compileTailwindForHtml, buildFinalArtifact } from '@/lib/ai/compileTailwind'
import { publishGeneratedPage } from '@/lib/ai/publishGeneratedPage'

// Default test proposal (Phase 1 sub-piece 5's leftover — already at version 1, so it's NOT used
// for Phase 2 sub-piece 1's real verification runs, only as a fallback if no ?proposalId= is
// given). Each of sub-piece 1's 3 verification runs passes its own freshly-created row via
// ?proposalId=, so its v1→v2 sequence lands cleanly on versions 1 and 2 — nowhere near the
// 3-version cap, which stays untriggered by anything this page does.
const DEFAULT_TEST_PROPOSAL_ID = 'd80d88e6-39ba-428a-a83d-ddb2e083116c'

const REVISION_FEEDBACK = 'Add a short FAQ section before the Accept button.'

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

/** Proves generation (v1) + one bounded revision round (v2) through the exact same guardrail
 * chain (docs/CORE_ENGINE_V2_SPEC.md §2 stages 4-11, §4, §6, §7). Pass ?proposalId=<uuid> for a
 * fresh test proposal row per verification run — never reuse one that already has a version, or
 * the 3-version cap in publishGeneratedPage() will refuse the run for reasons unrelated to
 * whether revision itself works. Deliberately not wired into any real flow, same as every other
 * /dev proof page this phase. */
export default async function PreviewCheckPage({ searchParams }: { searchParams: Promise<{ proposalId?: string }> }) {
  const account = await getAccountContext()
  if (!account) redirect('/login')

  const { proposalId: queryProposalId } = await searchParams
  const proposalId = queryProposalId || DEFAULT_TEST_PROPOSAL_ID

  // v1 — generation, same chain as Phase 1.
  const v1Prompt = buildCodegenPrompt(FIXTURE_FACTS, FIXTURE_BRAND_KIT)
  const v1Result = await runStageText('codegen', { prompt: v1Prompt, maxOutputTokens: 6000 })
  const v1HtmlBeforeInjection = stripCodeFence(v1Result.text)

  const v1Root = parse(v1HtmlBeforeInjection)
  const v1Verification = verifyProposalTags(v1Root, SOURCE_OF_TRUTH)
  const v1HtmlAfterInjection = injectVerifiedValues(v1Root, SOURCE_OF_TRUTH)

  const v1CompiledCss = await compileTailwindForHtml(v1HtmlAfterInjection)
  const v1FinalHtml = buildFinalArtifact(v1HtmlAfterInjection, v1CompiledCss)

  const v1Published = await publishGeneratedPage(proposalId, {
    html: v1FinalHtml,
    provider: v1Result.provider,
    model: v1Result.model,
    usedFallback: v1Result.usedFallback,
  })

  // v2 — one bounded revision round (Phase 2 sub-piece 1). Full prior *markup* as context
  // (v1HtmlAfterInjection, pre-compile — not v1FinalHtml, which has compiled CSS the model
  // doesn't need), same verify→inject→compile chain, same publish function.
  const revisePrompt = buildRevisePrompt(v1HtmlAfterInjection, FIXTURE_FACTS, FIXTURE_BRAND_KIT, REVISION_FEEDBACK)
  const v2Result = await runStageText('revise', { prompt: revisePrompt, maxOutputTokens: 6000 })
  const v2HtmlBeforeInjection = stripCodeFence(v2Result.text)

  const v2Root = parse(v2HtmlBeforeInjection)
  const v2Verification = verifyProposalTags(v2Root, SOURCE_OF_TRUTH)
  const v2HtmlAfterInjection = injectVerifiedValues(v2Root, SOURCE_OF_TRUTH)

  const v2CompiledCss = await compileTailwindForHtml(v2HtmlAfterInjection)
  const v2FinalHtml = buildFinalArtifact(v2HtmlAfterInjection, v2CompiledCss)

  const v2Published = await publishGeneratedPage(proposalId, {
    html: v2FinalHtml,
    provider: v2Result.provider,
    model: v2Result.model,
    usedFallback: v2Result.usedFallback,
  })

  return (
    <div style={{ padding: 16, fontFamily: 'monospace', fontSize: 13 }}>
      <p>proposalId: {proposalId}</p>
      <h3>v1 (generation)</h3>
      <p>
        provider: {v1Result.provider} · model: {v1Result.model} · usedFallback: {String(v1Result.usedFallback)} · compiledCss:{' '}
        {v1CompiledCss.length} bytes
      </p>
      <p>verification: {JSON.stringify(v1Verification)}</p>
      <p>
        published: generated_pages id={v1Published.id}, version={v1Published.version}
      </p>
      <iframe sandbox="allow-scripts" srcDoc={v1FinalHtml} style={{ width: '100%', height: '50vh', border: '1px solid #ccc' }} />

      <h3>v2 (revision — feedback: "{REVISION_FEEDBACK}")</h3>
      <p>
        provider: {v2Result.provider} · model: {v2Result.model} · usedFallback: {String(v2Result.usedFallback)} · compiledCss:{' '}
        {v2CompiledCss.length} bytes
      </p>
      <p>
        usage: promptTokens={v2Result.usage.promptTokens}, completionTokens={v2Result.usage.completionTokens}
      </p>
      <p>verification: {JSON.stringify(v2Verification)}</p>
      <p>
        published: generated_pages id={v2Published.id}, version={v2Published.version}
      </p>
      <iframe sandbox="allow-scripts" srcDoc={v2FinalHtml} style={{ width: '100%', height: '50vh', border: '1px solid #ccc' }} />
    </div>
  )
}
