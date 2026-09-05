import { describe, it, expect } from 'vitest'
import { correctPricing } from './pricing'

describe('correctPricing', () => {
  it('drops a fabricated originalPrice that is not actually higher than discountedPrice (equal)', () => {
    const result = correctPricing({ packages: [{ originalPrice: 100, discountedPrice: 100 }] })
    expect(result.packages![0].originalPrice).toBe(0)
  })

  it('drops originalPrice when it is lower than discountedPrice', () => {
    const result = correctPricing({ packages: [{ originalPrice: 50, discountedPrice: 100 }] })
    expect(result.packages![0].originalPrice).toBe(0)
  })

  it('keeps a genuine discount (originalPrice higher than discountedPrice)', () => {
    const result = correctPricing({ packages: [{ originalPrice: 150, discountedPrice: 100 }] })
    expect(result.packages![0].originalPrice).toBe(150)
    expect(result.packages![0].discountedPrice).toBe(100)
  })

  it('leaves a package with no originalPrice untouched', () => {
    const result = correctPricing({ packages: [{ originalPrice: undefined, discountedPrice: 100 }] })
    expect(result.packages![0].originalPrice).toBeUndefined()
  })

  it('leaves a package with no discountedPrice untouched', () => {
    const result = correctPricing({ packages: [{ originalPrice: 100 }] })
    expect(result.packages![0].originalPrice).toBe(100)
  })

  it('is a no-op when packages is missing entirely', () => {
    const content: { title: string; packages?: Array<{ originalPrice?: number; discountedPrice?: number }> } = { title: 'A proposal' }
    expect(correctPricing(content)).toBe(content)
  })

  it('is a no-op when packages is not an array', () => {
    const content = { packages: 'not-an-array' } as any
    expect(correctPricing(content)).toBe(content)
  })

  it('handles negative prices the same as any other non-discount (originalPrice <= discountedPrice)', () => {
    const result = correctPricing({ packages: [{ originalPrice: -10, discountedPrice: -5 }] })
    expect(result.packages![0].originalPrice).toBe(0)
  })

  it('processes multiple packages independently', () => {
    const result = correctPricing({
      packages: [
        { originalPrice: 150, discountedPrice: 100 },
        { originalPrice: 80, discountedPrice: 100 },
      ],
    })
    expect(result.packages![0].originalPrice).toBe(150)
    expect(result.packages![1].originalPrice).toBe(0)
  })
})
