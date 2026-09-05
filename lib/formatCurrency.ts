const LOCALE_FOR_CURRENCY: Record<string, string> = { USD: 'en-US', EUR: 'de-DE', INR: 'en-IN' }
const SYMBOL_FOR_CURRENCY: Record<string, string> = { USD: '$', EUR: '€', INR: '₹' }

export type SupportedCurrency = 'USD' | 'EUR' | 'INR'

export function currencySymbol(currency: string | null | undefined): string {
  return SYMBOL_FOR_CURRENCY[currency || 'USD'] || '$'
}

/** Grouped digits with no currency symbol — for the editor's inline price fields, which render
 * the symbol as its own adjacent element. Uses the same locale table as formatCurrency, so INR
 * gets lakh grouping (6,00,000) rather than 600,000. */
export function formatAmount(amount: number | null | undefined, currency: string | null | undefined): string {
  const value = amount ?? 0
  const code = currency || 'USD'
  try {
    return new Intl.NumberFormat(LOCALE_FOR_CURRENCY[code] || 'en-US', { maximumFractionDigits: 0 }).format(value)
  } catch {
    return String(value)
  }
}

export function formatCurrency(amount: number | null | undefined, currency: string | null | undefined): string {
  const value = amount ?? 0
  const code = currency || 'USD'
  try {
    return new Intl.NumberFormat(LOCALE_FOR_CURRENCY[code] || 'en-US', {
      style: 'currency', currency: code, maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${currencySymbol(code)}${value.toLocaleString()}`
  }
}
