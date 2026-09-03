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
    }
  }
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
      formats: [{ type: 'branding' }],
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
    is_low_confidence: isLowConfidence,
  }
}
