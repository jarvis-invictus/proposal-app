import { redirect } from 'next/navigation'
import { parse } from 'node-html-parser'
import { getAccountContext } from '@/lib/accountContext'
import { runStageText } from '@/lib/ai/harness'
import { buildCodegenPrompt, type CodegenDealFacts } from '@/lib/ai/codegenPrompt'
import { verifyProposalTags, type ProposalSourceOfTruth } from '@/lib/ai/verifyProposalTags'
import { injectVerifiedValues } from '@/lib/ai/injectVerifiedValues'
import { compileTailwindForHtml, buildFinalArtifact } from '@/lib/ai/compileTailwind'

// Same fixture as app/api/dev/codegen-check/route.ts — this page reuses the exact same
// generate→verify→inject→compile chain, just rendered as a real page instead of returning JSON.
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

/** Proves the sandboxed-preview stage (docs/CORE_ENGINE_V2_SPEC.md §2 stage 9, §6) in isolation —
 * a real browsable page, not a JSON API route, because the actual proof here is a human opening
 * it in a real browser and confirming the isolation-check div reads BLOCKED. Nothing here
 * self-certifies that. `sandbox="allow-scripts"` only, deliberately without `allow-same-origin` —
 * confirmed against MDN (see docs/DECISION_LOG.md) that for a `srcDoc` iframe specifically, adding
 * `allow-same-origin` would make the framed content same-origin with this page, defeating
 * isolation entirely. Deliberately not wired into any real flow, same as every other /dev proof
 * page this phase. */
export default async function PreviewCheckPage() {
  const account = await getAccountContext()
  if (!account) redirect('/login')

  const prompt = buildCodegenPrompt(FIXTURE_FACTS, FIXTURE_BRAND_KIT)
  const result = await runStageText('codegen', { prompt, maxOutputTokens: 6000 })
  const htmlBeforeInjection = stripCodeFence(result.text)

  const root = parse(htmlBeforeInjection)
  const verification = verifyProposalTags(root, SOURCE_OF_TRUTH)
  const htmlAfterInjection = injectVerifiedValues(root, SOURCE_OF_TRUTH)

  const compiledCss = await compileTailwindForHtml(htmlAfterInjection)
  const finalHtml = buildFinalArtifact(htmlAfterInjection, compiledCss)

  return (
    <div style={{ padding: 16, fontFamily: 'monospace', fontSize: 13 }}>
      <p>
        provider: {result.provider} · model: {result.model} · usedFallback: {String(result.usedFallback)} · compiledCss:{' '}
        {compiledCss.length} bytes
      </p>
      <p>verification: {JSON.stringify(verification)}</p>
      <p>
        Look inside the iframe below for a div reading either <b>BLOCKED — ...</b> (isolation working) or{' '}
        <b>NOT BLOCKED — isolation failed</b>. Also check the browser console for a security error.
      </p>
      <iframe sandbox="allow-scripts" srcDoc={finalHtml} style={{ width: '100%', height: '80vh', border: '1px solid #ccc' }} />
    </div>
  )
}
