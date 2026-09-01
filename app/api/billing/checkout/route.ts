import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripeClient, STRIPE_PRICE_ID_BY_TIER } from '@/lib/stripe'

type PaidTier = keyof typeof STRIPE_PRICE_ID_BY_TIER

export async function POST(request: NextRequest) {
  const stripe = getStripeClient()
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured on this environment.' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRecord } = await supabase.from('users').select('account_id').eq('id', user.id).single()
  if (!userRecord) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: account } = await supabase
    .from('accounts')
    .select('id, stripe_customer_id')
    .eq('id', userRecord.account_id)
    .single()
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const { plan_tier } = await request.json()
  if (plan_tier !== 'pay_per_proposal' && plan_tier !== 'agency') {
    return NextResponse.json({ error: 'plan_tier must be "pay_per_proposal" or "agency"' }, { status: 400 })
  }

  const priceId = STRIPE_PRICE_ID_BY_TIER[plan_tier as PaidTier]
  if (!priceId) {
    return NextResponse.json({ error: `No Stripe price configured for plan "${plan_tier}".` }, { status: 500 })
  }

  const origin = request.headers.get('origin') || new URL(request.url).origin

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      // The webhook's source of truth for which account and tier this checkout belongs to —
      // client_reference_id for the account (Stripe's dedicated field for this), plan_tier in
      // metadata since client_reference_id is a single plain string.
      client_reference_id: account.id,
      metadata: { account_id: account.id, plan_tier, price_id: priceId },
      ...(account.stripe_customer_id
        ? { customer: account.stripe_customer_id }
        : { customer_email: user.email }),
      success_url: `${origin}/dashboard/settings?tab=billing&checkout=success`,
      cancel_url: `${origin}/dashboard/settings?tab=billing&checkout=cancel`,
    })

    return NextResponse.json({ checkout_url: session.url })
  } catch (err: any) {
    console.error('Failed to create Stripe checkout session:', err)
    return NextResponse.json({ error: 'Failed to start checkout.' }, { status: 500 })
  }
}
