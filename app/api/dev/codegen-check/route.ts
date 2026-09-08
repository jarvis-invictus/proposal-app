import { NextResponse } from 'next/server'
import { parse } from 'node-html-parser'
import { getAccountContext } from '@/lib/accountContext'
import { runStageText } from '@/lib/ai/harness'
import { buildCodegenPrompt, type CodegenDealFacts } from '@/lib/ai/codegenPrompt'
import { verifyProposalTags, type ProposalSourceOfTruth } from '@/lib/ai/verifyProposalTags'
import { injectVerifiedValues } from '@/lib/ai/injectVerifiedValues'

// Raw facts, not pre-formatted — the model is free to phrase these naturally, which is exactly
// what's needed to exercise a real correction (Phase 1 sub-piece 2) rather than a no-op where the
// model just echoes an already-canonical string back.
const FIXTURE_FACTS: CodegenDealFacts = {
  clientName: 'Bloom & Ives',
  projectName: 'Website Redesign',
  totalPrice: '4500 USD',
  dueDate: 'the 15th of November, 2026',
  deliverables: ['Homepage redesign', '5 interior pages', 'Mobile-responsive layout'],
  paymentTerm: '50% due upon acceptance, 50% due on delivery',
}

// The real, canonical values verifyProposalTags/injectVerifiedValues check and inject against.
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

/** Strips a leading/trailing ```html fence if the model adds one despite the prompt's explicit
 * instruction not to — a known, common quirk worth handling defensively rather than ignoring. */
function stripCodeFence(text: string): string {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:html)?\s*\n([\s\S]*?)\n```$/)
  return fenced ? fenced[1].trim() : trimmed
}

/** Proves the full generate → verify → inject chain (docs/CORE_ENGINE_V2_SPEC.md §2 stages 4-7,
 * §4) in isolation. A missing tag is surfaced as-is in `verification` (present: false) — no
 * auto-repair or regeneration attempt exists yet; that's a deferred future sub-piece, not
 * silently worked around here. Deliberately not wired into any real flow, same as
 * /api/dev/harness-check and /api/dev/codegen-check's sub-piece 1 version. */
export async function GET() {
  const account = await getAccountContext()
  if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const prompt = buildCodegenPrompt(FIXTURE_FACTS, FIXTURE_BRAND_KIT)
    const result = await runStageText('codegen', { prompt, maxOutputTokens: 6000 })
    const htmlBeforeInjection = stripCodeFence(result.text)

    const root = parse(htmlBeforeInjection)
    const verification = verifyProposalTags(root, SOURCE_OF_TRUTH)
    const htmlAfterInjection = injectVerifiedValues(root, SOURCE_OF_TRUTH)

    return NextResponse.json({
      provider: result.provider,
      model: result.model,
      usedFallback: result.usedFallback,
      verification,
      htmlBeforeInjection,
      htmlAfterInjection,
    })
  } catch {
    return NextResponse.json({ error: 'Both primary and fallback failed.' }, { status: 500 })
  }
}
