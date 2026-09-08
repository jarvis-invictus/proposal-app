import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAccountContext } from '@/lib/accountContext'
import { runStage } from '@/lib/ai/harness'

/** Proves the Claude-primary/OpenAI-fallback harness (docs/CORE_ENGINE_V2_SPEC.md §3) end to
 * end on one new, low-stakes call — deliberately not wired into any real proposal flow.
 * Authenticated only, same as every other route, so it can't become a free way to burn API
 * credits. */
export async function GET() {
  const account = await getAccountContext()
  if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await runStage('harness-check', {
      schema: z.object({ ok: z.boolean() }),
      prompt: 'Reply with ok: true.',
    })
    return NextResponse.json({
      provider: result.provider,
      model: result.model,
      usedFallback: result.usedFallback,
      object: result.object,
    })
  } catch {
    return NextResponse.json({ error: 'Both primary and fallback failed.' }, { status: 500 })
  }
}
