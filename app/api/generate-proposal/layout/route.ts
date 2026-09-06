import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { AI_MODEL } from '@/lib/generation/model'
import { LayoutSchema, type LayoutSection, type LayoutPrimitive } from '@/lib/layout/registry'
import { buildLayoutPrompt } from '@/lib/generation/layoutPrompt'
import { getAccountContext } from '@/lib/accountContext'
import { checkAiRateLimit, extractClientIp, rateLimitIdentifier } from '@/lib/ratelimit'
import { resolveBrandKit, brandContextBlock } from '@/lib/brand-extraction/prompt'
import { styleReferenceBlock, briefBlock } from '@/lib/generation/promptBlocks'
import { logError } from '@/lib/logging'

export const maxDuration = 60

/**
 * Layout generation, deliberately kept as its OWN endpoint rather than folded into
 * /api/generate-proposal. Two reasons:
 *
 * 1. It can't run first. Primitives reference structured data by index (packageRefs), so the
 *    packages have to exist before the layout can be designed around them.
 * 2. It fails independently. If layout generation errors or times out, the caller still has a
 *    complete structured proposal and can fall back to today's fixed rendering — the new
 *    capability degrades to the current product rather than taking generation down with it.
 */

// The model can nest a pricingTable inside a card or a column, not just at the top level of a
// section — walk the whole tree rather than only checking top-level nodes.
function sanitizeNode(node: LayoutPrimitive, packageCount: number): LayoutPrimitive | null {
  if (node.type === 'pricingTable') {
    const packageRefs = node.packageRefs.filter((i) => i >= 0 && i < packageCount)
    if (packageRefs.length === 0) return null
    return { ...node, packageRefs }
  }
  if (node.type === 'card') {
    const children = node.children
      .map((child) => sanitizeNode(child, packageCount))
      .filter((child): child is NonNullable<typeof child> => child !== null)
    if (children.length === 0) return null
    return { ...node, children } as LayoutPrimitive
  }
  if (node.type === 'columns') {
    const columns = node.columns
      .map((col) => col.map((child) => sanitizeNode(child, packageCount)).filter((c): c is NonNullable<typeof c> => c !== null))
      .filter((col) => col.length > 0)
    if (columns.length < 2) return null
    return { ...node, columns } as LayoutPrimitive
  }
  return node
}

function sanitizeLayout(layout: LayoutSection[], packageCount: number): LayoutSection[] {
  return layout
    .map((section) => {
      const children = section.children
        .map((child) => sanitizeNode(child, packageCount))
        .filter((child): child is NonNullable<typeof child> => child !== null)
      return children.length > 0 ? { ...section, children } : null
    })
    .filter((section): section is LayoutSection => section !== null)
}

export async function POST(req: Request) {
  const account = await getAccountContext()
  const ip = extractClientIp(req)
  const { success } = await checkAiRateLimit(rateLimitIdentifier(account?.accountId ?? null, ip), 'generate')
  if (!success) {
    return new Response(JSON.stringify({ error: 'Too many requests — please wait a few minutes.' }), { status: 429 })
  }

  const { summary, content, styleReference, brief, brandKitId, referenceLayout } = await req.json()
  if (!summary || !content) {
    return new Response(JSON.stringify({ error: 'Missing summary or content' }), { status: 400 })
  }

  try {
    const brandKit = await resolveBrandKit(account?.accountId ?? null, brandKitId)
    const contextBlock = `${styleReferenceBlock(styleReference)}${briefBlock(brief)}${brandContextBlock(brandKit)}`

    // Only a compact preview of the structured data goes into the prompt — the model needs to
    // know what exists and at which index to reference it, not re-read every deliverable.
    const packagesPreview = (content.packages ?? [])
      .map((p: { name: string; discountedPrice: number }, i: number) => `  [${i}] ${p.name} — ${p.discountedPrice}`)
      .join('\n') || '  (none)'
    const timelinePreview = (content.timeline ?? [])
      .map((t: { phase: string; duration: string }) => `  - ${t.phase} (${t.duration})`)
      .join('\n') || '  (none)'

    const { object } = await generateObject({
      model: openai(AI_MODEL),
      schema: LayoutSchema,
      prompt: buildLayoutPrompt({
        summary,
        packagesPreview,
        timelinePreview,
        contextBlock,
        clientName: content.clientName || 'this client',
        referenceLayout: referenceLayout ?? undefined,
      }),
      maxTokens: 4000,
      abortSignal: AbortSignal.timeout(45_000),
    })

    // The model can reference a package index that doesn't exist, or produce a card/columns node
    // that's empty once its bad refs are dropped — sanitize the whole tree rather than letting a
    // renderer read undefined out of the packages array at display time.
    // Cast: generateObject's inferred `object` type reflects the schema's pre-default (input)
    // shape for enum fields with .default(), even though Zod guarantees defaults are filled in by
    // the time this callback runs — a compile-time-only mismatch, not a runtime concern.
    const packageCount = (content.packages ?? []).length
    const layout = sanitizeLayout(object.layout as LayoutSection[], packageCount)

    return new Response(JSON.stringify({ layout: layout.length > 0 ? layout : null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    logError('Failed to generate proposal layout:', error, { accountId: account?.accountId ?? null })
    // Deliberately not a 500 — an absent layout is a valid state meaning "render the classic
    // fixed sections", so the caller treats this as a soft failure rather than a broken generation.
    return new Response(JSON.stringify({ layout: null }), { status: 200 })
  }
}
