// ISO 3166-1 alpha-2 codes. Only used to key the India/rest-of-world payment provider
// split, so this doesn't need to be an exhaustive list — India first, then common markets.
export const COUNTRIES: { code: string; name: string }[] = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SG', name: 'Singapore' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'IE', name: 'Ireland' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'BR', name: 'Brazil' },
  { code: 'JP', name: 'Japan' },
  { code: 'OTHER', name: 'Other' },
]

export function providerForCountry(code: string | null | undefined): 'razorpay' | 'skydo' {
  return code === 'IN' ? 'razorpay' : 'skydo'
}
