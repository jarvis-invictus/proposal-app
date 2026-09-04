import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'
import { ProposalSchemaV1 } from '@/lib/schema/proposal'
import { createClient } from '@/lib/supabase/server'
import { getAccountContext } from '@/lib/accountContext'
import { currencyPromptInstruction } from '@/lib/accountCurrency'
import { checkAiRateLimit, extractClientIp, rateLimitIdentifier } from '@/lib/ratelimit'
import { resolveBrandKit, brandContextBlock } from '@/lib/brand-extraction/prompt'
import { correctPricing } from '@/lib/generation/pricing'

export const maxDuration = 60

// .partial() is the whole trick — every field becomes optional, so the model can return just
// the top-level keys the request actually concerns, each still fully validated against the real
// schema. No new schema to author, no diff/patch format to invent.
const ReviseSchema = z.object({
  changes: ProposalSchemaV1.partial(),
  summary: z.string().describe("One short sentence describing what changed, shown to the user in the chat — e.g. \"Dropped the Essential package to $6,500.\""),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const account = await getAccountContext()
  if (!account) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const ip = extractClientIp(req)
  const { success } = await checkAiRateLimit(rateLimitIdentifier(account.accountId, ip), 'chat')
  if (!success) {
    return new Response(JSON.stringify({ error: 'Too many requests — please wait a few minutes before asking for another change.' }), { status: 429 })
  }

  const { content, instruction, brandKitId } = await req.json()
  if (!content || typeof instruction !== 'string' || !instruction.trim()) {
    return new Response(JSON.stringify({ error: 'Missing content or instruction' }), { status: 400 })
  }
  if (instruction.length > 2_000) {
    return new Response(JSON.stringify({ error: 'That request is too long — keep it under 2,000 characters.' }), { status: 400 })
  }

  // RLS already scopes this to the caller's own account (same "Users can manage own proposals"
  // policy every other proposal route relies on) — a foreign id simply returns no row.
  const supabase = await createClient()
  const { data: proposalRow } = await supabase.from('proposals').select('id').eq('id', id).maybeSingle()
  if (!proposalRow) {
    return new Response(JSON.stringify({ error: 'Proposal not found' }), { status: 404 })
  }

  try {
    const currency = account.currency || 'USD'
    const brandKit = await resolveBrandKit(account.accountId, brandKitId)

    const prompt = `You are revising an existing proposal document based on a specific request from the person who owns it. Return ONLY the top-level fields that actually need to change — leave every other field out of your response entirely, don't set it to null or empty.

ARRAYS (critical — this is the most common way a revision goes wrong): if a field is an array (packages, addOns, timeline, terms) and you're including it because ONE item in it needs to change, you must still return the COMPLETE array — every existing item, in the same order, with only the requested item modified or added. Silently dropping items the request didn't mention is a real bug, not an acceptable shortcut. If nothing in an array needs to change, leave that whole field out of your response rather than re-including it.

GROUNDING (critical): every new value you return must come from either the current proposal content above or something explicitly stated in the request — never invent a package name, deliverable, price, or detail that isn't there. If part of the request needs information you don't have (e.g. "add our logo" when no logo image is available to you), do NOT fabricate a placeholder or fake URL. Leave that field out entirely and say what you couldn't do, plainly, in the summary — a request you can only partially fulfill should be partially fulfilled, with the gap named, not papered over.

OUT OF SCOPE REQUESTS (critical): some requests aren't about the document's content at all — they're about layout, animation, visual styling, or media you don't have (a logo image, a photo). This schema only holds text and numbers; it cannot express those things. When a request is like this, the correct response is an EMPTY changes object and a summary explaining it's not something this can do yet — not a workaround. Specifically: never turn a design/presentation request into a fake sellable add-on, package, or deliverable just to have something to return. Inventing a product nobody asked to sell is worse than doing nothing.

CURRENCY (critical): ${currencyPromptInstruction(currency)}
${brandContextBlock(brandKit)}

Current proposal (JSON):
${JSON.stringify(content)}

Requested change:
${instruction.trim()}`

    const { object } = await generateObject({
      model: openai('gpt-4o'),
      schema: ReviseSchema,
      prompt,
      maxTokens: 4000,
      // Under the 60s maxDuration above — the full current proposal is echoed back in the
      // prompt, so this can legitimately take longer than a short chat turn, but still needs a
      // bound of its own rather than none.
      abortSignal: AbortSignal.timeout(45_000),
    })

    // Same objective, deterministic fix generation already applies — a revise call can touch
    // pricing too, so it needs the same safety net, not just a better-worded prompt.
    const correctedChanges = correctPricing(object.changes)

    return new Response(JSON.stringify({ ...object, changes: correctedChanges }), { status: 200 })
  } catch (err: any) {
    console.error('Failed to revise proposal:', err)
    return new Response(JSON.stringify({ error: "Couldn't process that request — try rephrasing it." }), { status: 500 })
  }
}
