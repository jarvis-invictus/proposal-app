import { NextResponse } from 'next/server'
import { getAccountContext } from '@/lib/accountContext'
import { runStageText } from '@/lib/ai/harness'
import { buildCodegenPrompt, type CodegenDealFacts } from '@/lib/ai/codegenPrompt'
import { checkTags } from '@/lib/ai/checkTags'

const FIXTURE_FACTS: CodegenDealFacts = {
  clientName: 'Bloom & Ives',
  projectName: 'Website Redesign',
  totalPrice: '$4,500',
  dueDate: 'November 15, 2026',
  deliverables: ['Homepage redesign', '5 interior pages', 'Mobile-responsive layout'],
  paymentTerm: '50% due upon acceptance, 50% due on delivery',
}

const FIXTURE_BRAND_KIT = {
  id: 'fixture',
  name: 'Bloom & Ives',
  colors: { primary: '#2F6F4E', secondary: '#F4EFE6', accent: '#C97B4A' },
  fonts: { heading: 'Fraunces', body: 'Inter' },
  personality: 'Warm, earthy, understated confidence — like a boutique florist that also does corporate work.',
}

/** Strips a leading/trailing ```html fence if the model adds one despite the prompt's explicit
 * instruction not to — a known, common quirk worth handling defensively rather than ignoring. */
function stripCodeFence(text: string): string {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:html)?\s*\n([\s\S]*?)\n```$/)
  return fenced ? fenced[1].trim() : trimmed
}

/** Proves the harness wrapper can drive a model to write a full custom HTML proposal page with
 * the tagging contract (docs/CORE_ENGINE_V2_SPEC.md §4) enforced in the same generation call,
 * plus a plain-code check that the tags actually landed on the right content — a first, minimal
 * proof of stage 6's mechanism. Deliberately not wired into any real flow, same as
 * /api/dev/harness-check. Authenticated only, same reason as that route. */
export async function GET() {
  const account = await getAccountContext()
  if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const prompt = buildCodegenPrompt(FIXTURE_FACTS, FIXTURE_BRAND_KIT)
    const result = await runStageText('codegen', { prompt, maxOutputTokens: 6000 })
    const html = stripCodeFence(result.text)
    const tagCheck = checkTags(html, { totalPrice: '4,500', dueDate: FIXTURE_FACTS.dueDate })

    return NextResponse.json({
      provider: result.provider,
      model: result.model,
      usedFallback: result.usedFallback,
      tagCheck,
      html,
    })
  } catch {
    return NextResponse.json({ error: 'Both primary and fallback failed.' }, { status: 500 })
  }
}
