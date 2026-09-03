import { createClient } from '@/lib/supabase/server'

export type BrandKitContext = {
  id: string
  name: string | null
  colors: { primary?: string; secondary?: string; accent?: string; background?: string; text?: string } | null
  fonts: { heading?: string; body?: string } | null
  personality: string | null
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
    return (data as BrandKitContext) ?? null
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
