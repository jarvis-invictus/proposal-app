import { describe, it, expect } from 'vitest'
import { extractBrandKitFromUrl } from '../lib/brand-extraction/url'

// Make sure timeout is long enough for Browserless
describe('URL Brand Extraction', () => {
  it('extracts brand kit from apple.com', async () => {
    const data = await extractBrandKitFromUrl('https://apple.com')
    console.log("Apple Data:", data)
    expect(data.colors).toBeDefined()
  }, 30000)

  it('extracts brand kit from stripe.com', async () => {
    const data = await extractBrandKitFromUrl('https://stripe.com')
    console.log("Stripe Data:", data)
    expect(data.colors).toBeDefined()
  }, 30000)

  it('extracts brand kit from vercel.com', async () => {
    const data = await extractBrandKitFromUrl('https://vercel.com')
    console.log("Vercel Data:", data)
    expect(data.colors).toBeDefined()
  }, 30000)

  it('extracts brand kit from a small business site', async () => {
    const data = await extractBrandKitFromUrl('https://www.lingscars.com/')
    console.log("Small Business Data:", data)
    expect(data.colors).toBeDefined()
  }, 30000)
})
