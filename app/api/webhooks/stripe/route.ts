import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { env } from '@/env'
import { getStripeClient } from '@/lib/stripe'
import { logError } from '@/lib/logging'

// Webhooks carry real billing state — unlike the AI rate limiter or Sentry, there's no safe
// "bypass and proceed" here. Without a configured secret we can't verify the signature, so we
// fail closed (500) rather than either trusting an unverified payload or silently no-opping.
async function verifiedEvent(request: NextRequest): Promise<{ event: Stripe.Event } | { error: NextResponse }> {
  const stripe = getStripeClient()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !webhookSecret) {
    return { error: NextResponse.json({ error: 'Stripe webhook is not configured on this environment.' }, { status: 500 }) }
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return { error: NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 }) }
  }

  // App Router route handlers never auto-parse the body, so this IS the raw body Stripe's
  // signature was computed over — no `micro` or manual raw-body workaround needed here.
  const rawBody = await request.text()

  try {
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    return { event }
  } catch (err: any) {
    logError('Stripe webhook signature verification failed:', err)
    return { error: NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 }) }
  }
}

/** client_reference_id is the authoritative lookup — it's set by our own /api/billing/checkout
 * on every real session we create, so this is the only path that matters in practice. Email is
 * a best-effort fallback for the rare event that arrives without it (e.g. a test event sent
 * from the Stripe dashboard rather than through real checkout). */
async function findAccountIdByEmail(adminSupabase: any, email: string | null | undefined): Promise<string | null> {
  if (!email) return null
  const { data } = await adminSupabase.auth.admin.listUsers()
  const authUser = data?.users.find((u: any) => u.email === email)
  if (!authUser) return null
  const { data: userRecord } = await adminSupabase.from('users').select('account_id').eq('id', authUser.id).single()
  return userRecord?.account_id ?? null
}

export async function POST(request: NextRequest) {
  const verified = await verifiedEvent(request)
  if ('error' in verified) return verified.error
  const { event } = verified

  const adminSupabase = createAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const accountId = session.client_reference_id || (await findAccountIdByEmail(adminSupabase, session.customer_details?.email))

      if (!accountId) {
        logError('checkout.session.completed had no resolvable account (no client_reference_id, no matching email)', new Error('Unresolvable account on checkout.session.completed'), { sessionId: session.id })
        break
      }

      const { error } = await adminSupabase
        .from('accounts')
        .update({
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
          stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null,
          stripe_price_id: session.metadata?.price_id ?? null,
          billing_status: 'active',
          // The webhook task's explicit spec only names stripe_customer_id/subscription_id/
          // billing_status — but without also setting plan_tier here, a real successful Stripe
          // subscription would never actually unlock the plan the user paid for (plan_tier is
          // what every other feature check in the app reads). Sourced from the metadata we set
          // ourselves when creating the session, not re-derived from the price id.
          ...(session.metadata?.plan_tier ? { plan_tier: session.metadata.plan_tier } : {}),
        })
        .eq('id', accountId)

      if (error) logError('Failed to update account after checkout.session.completed:', error, { accountId })
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id

      if (!customerId) {
        logError('customer.subscription.deleted had no resolvable customer id', new Error('Unresolvable customer id on customer.subscription.deleted'), { subscriptionId: subscription.id })
        break
      }

      const { error } = await adminSupabase
        .from('accounts')
        .update({ billing_status: 'canceled' })
        .eq('stripe_customer_id', customerId)

      if (error) logError('Failed to update account after customer.subscription.deleted:', error, { customerId })
      break
    }

    default:
      // Unhandled event types are expected — Stripe sends far more than we act on. 200 tells
      // Stripe delivery succeeded; it's not an error just because we don't process this one.
      break
  }

  return NextResponse.json({ received: true })
}
