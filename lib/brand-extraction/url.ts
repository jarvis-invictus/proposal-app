import { env } from '@/env'

type FirecrawlBrandingColors = {
  primary?: string
  secondary?: string
  accent?: string
  background?: string
  textPrimary?: string
  textSecondary?: string
}

type FirecrawlBrandingResponse = {
  success: boolean
  data?: {
    branding?: {
      logo?: string | null
      colors?: FirecrawlBrandingColors
      typography?: {
        fontFamilies?: { primary?: string; heading?: string; code?: string }
      }
      // Exact sub-field names aren't confirmed against a real response yet — Firecrawl's own
      // docs only describe this in prose ("tone, energy, target audience"). Parsed defensively
      // below so a wrong guess here just means no personality text, not a crash.
      personality?: Record<string, unknown> | null
    }
  }
}

function asText(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (Array.isArray(value)) {
    const joined = value.filter((v) => typeof v === 'string' && v.trim()).join(', ')
    return joined || undefined
  }
  return undefined
}

/** Condenses Firecrawl's personality object into one plain-English sentence for the generation
 * prompt. Defensive against unconfirmed field names — tries a few plausible keys per concept
 * and simply omits anything it can't find, rather than guessing wrong and failing loudly. */
function summarizePersonality(personality: Record<string, unknown> | null | undefined): string | undefined {
  if (!personality || typeof personality !== 'object') return undefined
  const tone = asText(personality.tone)
  const energy = asText(personality.energy)
  const audience = asText(personality.audience) || asText(personality.targetAudience) || asText((personality as any).target_audience)

  const parts: string[] = []
  if (tone) parts.push(`Tone: ${tone}.`)
  if (energy) parts.push(`Energy: ${energy}.`)
  if (audience) parts.push(`Speaks to: ${audience}.`)
  if (!parts.length) {
    console.warn('[brand-extraction] personality object present but no known fields matched — raw shape:', JSON.stringify(personality))
    return undefined
  }
  return parts.join(' ')
}

export async function extractBrandKitFromUrl(url: string) {
  const target = /^https?:\/\//i.test(url) ? url : `https://${url}`

  const response = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: target,
      formats: ['branding'],
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    console.error('Firecrawl scrape failed:', response.status, body)
    throw new Error('Failed to extract brand kit from URL')
  }

  const json = (await response.json()) as FirecrawlBrandingResponse
  const branding = json.data?.branding

  if (!branding) {
    console.error('Firecrawl response missing branding data:', JSON.stringify(json))
    throw new Error('Failed to extract brand kit from URL')
  }

  const colors = branding.colors || {}
  const fontFamilies = branding.typography?.fontFamilies || {}

  const uniqueColors = new Set(
    [colors.primary, colors.secondary, colors.accent, colors.background, colors.textPrimary].filter(Boolean)
  ).size
  const isLowConfidence = !branding.logo || uniqueColors < 2

  return {
    colors: {
      primary: colors.primary || '#000000',
      secondary: colors.secondary || '#ffffff',
      accent: colors.accent || '#000000',
      background: colors.background || '#ffffff',
      text: colors.textPrimary || colors.textSecondary || '#000000',
    },
    fonts: {
      heading: fontFamilies.heading || fontFamilies.primary || 'sans-serif',
      body: fontFamilies.primary || fontFamilies.heading || 'sans-serif',
    },
    logoUrl: branding.logo || '',
    personality: summarizePersonality(branding.personality),
    is_low_confidence: isLowConfidence,
  }
}
