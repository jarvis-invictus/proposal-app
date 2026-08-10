import { chromium } from 'playwright-core'
import { env } from '@/env'

export async function extractBrandKitFromUrl(url: string) {
  // Use Browserless standard websocket endpoint for Playwright
  const browserWSEndpoint = `wss://production-sfo.browserless.io/chromium/playwright?token=${env.BROWSERLESS_API_KEY}`
  const browser = await chromium.connect({ wsEndpoint: browserWSEndpoint })

  try {
    const context = await browser.newContext()
    const page = await context.newPage()
    
    // Wait for the page to render fully, with a bounded timeout
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 10000 })
    } catch (e) {
      // Catch navigation timeouts so we can still attempt extraction on partially loaded pages
      console.warn(`Navigation to ${url} timed out after 10s, proceeding with extraction...`)
    }
    
    // Extract actual computed CSS from the rendered DOM
    const extracted = await page.evaluate(async () => {
      // Explicitly wait for web fonts to finish loading
      await document.fonts.ready

      const getFrequent = (arr: string[], top: number, excludePredicate?: (val: string) => boolean) => {
        const counts = arr.reduce((acc, val) => {
          if (!val || val === 'transparent') return acc
          // Exclude colors with 0 alpha like rgba(255, 255, 255, 0)
          if (val.replace(/\s/g, '').match(/rgba\(\d+,\d+,\d+,0\)/)) return acc
          
          if (excludePredicate && excludePredicate(val)) return acc
          
          acc[val] = (acc[val] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        return Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, top)
      }

      const elements = document.querySelectorAll('h1, h2, h3, p, a, button, .btn, header, footer')
      const bgColors: string[] = []
      const textColors: string[] = []
      const headingFonts: string[] = []
      const bodyFonts: string[] = []

      elements.forEach(el => {
        const style = window.getComputedStyle(el)
        const tag = el.tagName.toLowerCase()
        
        bgColors.push(style.backgroundColor)
        textColors.push(style.color)
        
        if (tag.match(/^h[1-6]$/)) {
          headingFonts.push(style.fontFamily)
        } else if (tag === 'p') {
          bodyFonts.push(style.fontFamily)
        }
      })

      // Get document background explicitly
      const bodyStyle = window.getComputedStyle(document.body)
      const pageBg = bodyStyle.backgroundColor

      // Extract logo
      let logoUrl = ''
      const icon = document.querySelector('link[rel="icon"]') || 
                   document.querySelector('link[rel="shortcut icon"]')
      if (icon) {
        logoUrl = (icon as HTMLLinkElement).href
      } else {
        const ogImage = document.querySelector('meta[property="og:image"]')
        if (ogImage) logoUrl = (ogImage as HTMLMetaElement).content
      }

      const isMonospace = (font: string) => font.toLowerCase().includes('monospace') || font.toLowerCase().includes('courier')

      const bodyFontCandidates = getFrequent(bodyFonts, 2, isMonospace)
      const finalBodyFont = bodyFontCandidates.length > 0 ? bodyFontCandidates[0] : (getFrequent(bodyFonts, 1)[0] || 'sans-serif')

      const uniqueColors = new Set(bgColors.filter(c => c && c !== 'transparent' && !c.replace(/\s/g, '').match(/rgba\(\d+,\d+,\d+,0\)/))).size
      const isLowConfidence = !logoUrl || uniqueColors < 2

      return {
        colors: {
          primary: getFrequent(bgColors, 3)[0] || '#000000',
          secondary: getFrequent(bgColors, 3)[1] || '#ffffff',
          accent: getFrequent(bgColors, 3)[2] || '#000000',
          background: pageBg === 'rgba(0, 0, 0, 0)' ? '#ffffff' : pageBg,
          text: getFrequent(textColors, 2)[0] || '#000000',
        },
        fonts: {
          heading: getFrequent(headingFonts, 1)[0] || 'sans-serif',
          body: finalBodyFont
        },
        logoUrl,
        is_low_confidence: isLowConfidence
      }
    })
    
    return extracted
  } catch (error) {
    console.error("Brand extraction failed:", error)
    throw new Error("Failed to extract brand kit from URL")
  } finally {
    await browser.close()
  }
}
