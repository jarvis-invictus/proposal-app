import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { AI_MODEL } from '@/lib/generation/model'
import { z } from 'zod'
import { ProposalSchemaV1 } from '@/lib/schema/proposal'
import { createClient } from '@/lib/supabase/server'
import { getAccountContext } from '@/lib/accountContext'
import { currencyPromptInstruction } from '@/lib/accountCurrency'
import { checkAiRateLimit, extractClientIp, rateLimitIdentifier } from '@/lib/ratelimit'
import { resolveBrandKit, brandContextBlock } from '@/lib/brand-extraction/prompt'
import { correctPricing } from '@/lib/generation/pricing'

export const maxDuration = 60

// .deepPartial() (not just .partial()) is the whole trick — .partial() only makes the TOP-LEVEL
// fields optional, so every field inside an array item (packages[].popular, etc.) was still
// required the moment the model included that array at all. The prompt below demands the model
// re-send every existing item's full shape when only one changed — a single dropped nested
// field on any untouched item used to fail the whole revision with a generic error.
// .deepPartial() makes fields inside nested objects/arrays optional too, so a minor omission on
// an item the model wasn't even trying to change no longer kills the request.
const ReviseSchema = z.object({
  changes: ProposalSchemaV1.deepPartial(),
  summary: z.string().describe("One short sentence describing what changed, shown to the user in the chat — e.g. \"Dropped the Essential package to $6,500.\""),
})

// deepPartial only stops a dropped field from failing validation — it doesn't stop the field
// from actually being missing. Left as-is, a package the model returned without `popular` would
// ship to the client, get merged into content, and then fail the PATCH route's own (shallow)
// content validation the next autosave. Backfilling each array item against the original item at
// the same index (and each object field against the original object) means what actually reaches
// the client is always a complete shape — a genuinely dropped field falls back to what was
// already there, not undefined.
function repairChanges(rawChanges: Record<string, any>, original: Record<string, any>): Record<string, any> {
  const repaired: Record<string, any> = {}
  for (const key of Object.keys(rawChanges)) {
    const value = rawChanges[key]
    const originalValue = original?.[key]
    if (Array.isArray(value) && Array.isArray(originalValue)) {
      repaired[key] = value.map((item, i) => (
        item && typeof item === 'object' && !Array.isArray(item)
          ? { ...(originalValue[i] || {}), ...item }
          : item
      ))
    } else if (value && typeof value === 'object' && !Array.isArray(value) && originalValue && typeof originalValue === 'object') {
      repaired[key] = { ...originalValue, ...value }
    } else {
      repaired[key] = value
    }
  }
  return repaired
}

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
      model: openai(AI_MODEL),
      schema: ReviseSchema,
      prompt,
      maxTokens: 4000,
      // Under the 60s maxDuration above — the full current proposal is echoed back in the
      // prompt, so this can legitimately take longer than a short chat turn, but still needs a
      // bound of its own rather than none.
      abortSignal: AbortSignal.timeout(45_000),
    })

    // Repair first (backfill any dropped nested field against the original, still-partial
    // shape), then run the same deterministic pricing correction generate-proposal applies — a
    // revise call can touch pricing too, and correctPricing needs complete package objects to
    // reason about, which is only guaranteed once repairChanges has run.
    const repairedChanges = correctPricing(repairChanges(object.changes, content))
    return new Response(JSON.stringify({ ...object, changes: repairedChanges }), { status: 200 })
  } catch (err: any) {
    console.error('Failed to revise proposal:', err)
    return new Response(JSON.stringify({ error: "Couldn't process that request — try rephrasing it." }), { status: 500 })
  }
}
