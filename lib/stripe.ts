import Stripe from 'stripe'

/** Maps a plan_tier to the Stripe Price object Sahil creates in the Stripe Dashboard. The
 * actual amount/currency lives in Stripe, not here — this file only knows which Price ID
 * corresponds to which tier, via env vars Sahil sets once the Products/Prices exist. Free has
 * no Stripe price; it's never routed through checkout. */
export const STRIPE_PRICE_ID_BY_TIER: Record<'pay_per_proposal' | 'agency', string | undefined> = {
  pay_per_proposal: process.env.STRIPE_PRICE_ID_PAY_PER_PROPOSAL,
  agency: process.env.STRIPE_PRICE_ID_AGENCY,
}

export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key)
}
