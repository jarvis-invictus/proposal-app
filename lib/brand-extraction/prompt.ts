import { createClient } from '@/lib/supabase/server'

export type BrandKitContext = {
  id: string
  name: string | null
  colors: { primary?: string; secondary?: string; accent?: string; background?: string; text?: string } | null
  fonts: { heading?: string; body?: string } | null
  personality: string | null
}

// System-font-stack tokens, not real declared brand fonts — a real, confirmed extraction defect
// (Firecrawl's own branding-scrape response, not this codebase's code) has produced these
// verbatim as fonts.heading/fonts.body. Using one directly as a CSS font-family value doesn't
// fail cleanly: several of these (e.g. "Apple Color Emoji") are genuinely installed system fonts,
// so the browser successfully resolves them — just with no real glyphs for ordinary Latin text,
// rendering as garbled, wide-spaced text rather than falling through to a sane default.
const REJECTED_FONT_TOKENS = new Set([
  '-apple-system', 'blinkmacsystemfont', 'system-ui', 'segoe ui', 'apple color emoji',
  'segoe ui emoji', 'segoe ui symbol', 'noto color emoji', 'ui-sans-serif', 'ui-serif',
  'ui-monospace', 'sans-serif', 'serif', 'monospace', 'none', '',
])

/** Rejects system-font-stack tokens and placeholder strings a brand kit's stored font value
 * should never be used as-is — see REJECTED_FONT_TOKENS. Falls back to `undefined` on rejection
 * so every existing caller's own default (e.g. genericCodegenPrompt.ts's `|| 'Georgia'`) still
 * runs, rather than this function inventing a new fallback. */
export function sanitizeFontName(name: string | null | undefined): string | undefined {
  if (!name) return undefined
  const normalized = name.trim().toLowerCase()
  if (REJECTED_FONT_TOKENS.has(normalized)) return undefined
  return name.trim()
}

/** Server-side only. Re-resolves a brand kit by id, scoped to the caller's own account, rather
 * than trusting client-supplied color/font values verbatim. Returns null if the kit doesn't
 * exist, doesn't belong to this account, or no account/kit id was given at all. */
export async function resolveBrandKit(accountId: string | null, brandKitId: unknown): Promise<BrandKitContext | null> {
  if (!accountId || typeof brandKitId !== 'string' || !brandKitId) return null
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('brand_kits')
      .select('id, name, colors, fonts, personality')
      .eq('id', brandKitId)
      .eq('account_id', accountId)
      .maybeSingle()
    if (!data) return null
    const kit = data as BrandKitContext
    return {
      ...kit,
      fonts: {
        heading: sanitizeFontName(kit.fonts?.heading),
        body: sanitizeFontName(kit.fonts?.body),
      },
    }
  } catch {
    return null
  }
}

/** Folds a resolved brand kit into a prompt block. Colors/fonts inform tone only — the model is
 * told never to state them as literal text in the generated document. */
export function brandContextBlock(kit: BrandKitContext | null): string {
  if (!kit) return ''
  const parts: string[] = []
  if (kit.name) parts.push(`Brand name: ${kit.name}`)
  if (kit.colors?.primary) {
    const extra = [kit.colors.secondary && `secondary ${kit.colors.secondary}`, kit.colors.accent && `accent ${kit.colors.accent}`].filter(Boolean)
    parts.push(`Primary brand color: ${kit.colors.primary}${extra.length ? ` (${extra.join(', ')})` : ''}`)
  }
  if (kit.fonts?.heading || kit.fonts?.body) {
    parts.push(`Brand typography: heading "${kit.fonts?.heading || 'default'}", body "${kit.fonts?.body || 'default'}"`)
  }
  if (!parts.length && !kit.personality) return ''

  const toneGuidance = kit.personality
    ? `This business's actual brand voice: ${kit.personality} Let this directly guide the proposal's tone and word choice — it's a stronger signal than color/font alone.`
    : `Let it subtly inform tone (e.g. a bold, saturated palette suggests a confident, energetic voice; muted neutrals suggest a refined, understated one).`
  const details = parts.length ? `\n${parts.join('\n')}` : ''

  return `\n\nBRAND CONTEXT — this business has an established brand identity. ${toneGuidance} Never state raw colors, fonts, or this description as literal text anywhere in the proposal:${details}`
}
