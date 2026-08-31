import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'
import { verifyRazorpayPaymentSignature } from '@/lib/payments/razorpay'

// Razorpay's Checkout.js hands back {order_id, payment_id, signature} to the browser on
// success. Verifying it here gives an immediate UI update without waiting on the webhook,
// which remains the authoritative mark-paid path for payment methods that settle async.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = await params
  const { orderId, paymentId, signature } = await request.json()

  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: 'Missing verification fields' }, { status: 400 })
  }

  if (!verifyRazorpayPaymentSignature({ orderId, paymentId, signature })) {
    return NextResponse.json({ error: 'Signature mismatch' }, { status: 400 })
  }

  const adminSupabase = createAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: proposal, error } = await adminSupabase
    .from('proposals')
    .update({ deposit_status: 'paid', deposit_provider_payment_id: paymentId })
    .eq('slug', slug)
    .eq('deposit_provider_order_id', orderId)
    .select('deposit_status')
    .single()

  if (error || !proposal) {
    return NextResponse.json({ error: 'Could not match this order to a proposal' }, { status: 404 })
  }

  return NextResponse.json(proposal)
}
