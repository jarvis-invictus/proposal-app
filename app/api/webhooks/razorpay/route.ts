import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'
import { verifyRazorpayWebhookSignature } from '@/lib/payments/razorpay'

// Registered as the webhook URL in the Razorpay Dashboard (test mode), listening for
// payment.captured. This is the authoritative mark-paid path — verify-deposit is just an
// optimistic client-side shortcut for methods that settle instantly.
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-razorpay-signature')

  if (!signature || !verifyRazorpayWebhookSignature({ rawBody, signature })) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(rawBody)

  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const payment = event.payload?.payment?.entity
    const orderId = payment?.order_id
    const paymentId = payment?.id

    if (orderId) {
      const adminSupabase = createAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      await adminSupabase
        .from('proposals')
        .update({ deposit_status: 'paid', deposit_provider_payment_id: paymentId })
        .eq('deposit_provider_order_id', orderId)
    }
  }

  return NextResponse.json({ received: true })
}
