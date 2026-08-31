import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'
import { createRazorpayOrder } from '@/lib/payments/razorpay'

// Public route, called from the accept/sign page once a proposal has been signed and has a
// deposit amount set. Only Razorpay is wired up — Skydo's API details haven't arrived yet.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = await params
  const adminSupabase = createAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: proposal, error } = await adminSupabase
    .from('proposals')
    .select('id, status, accepted_at, deposit_amount, deposit_currency, deposit_status, account_id, accounts(payment_provider)')
    .eq('slug', slug)
    .single()

  if (error || !proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
  }
  if (!proposal.accepted_at) {
    return NextResponse.json({ error: 'Proposal must be accepted before paying a deposit' }, { status: 400 })
  }
  if (!proposal.deposit_amount || proposal.deposit_amount <= 0) {
    return NextResponse.json({ error: 'No deposit amount set on this proposal' }, { status: 400 })
  }
  if (proposal.deposit_status === 'paid') {
    return NextResponse.json({ error: 'Deposit already paid' }, { status: 409 })
  }

  const provider = (proposal.accounts as any)?.payment_provider
  if (provider !== 'razorpay') {
    return NextResponse.json({ error: `Deposit payment via ${provider || 'this provider'} isn't available yet` }, { status: 501 })
  }

  const currency = proposal.deposit_currency || 'INR'
  const amountInSubunits = Math.round(Number(proposal.deposit_amount) * 100)

  const order = await createRazorpayOrder({
    amount: amountInSubunits,
    currency,
    receipt: `proposal_${proposal.id}`,
    notes: { proposal_id: proposal.id, slug },
  })

  await adminSupabase.from('proposals').update({ deposit_provider_order_id: order.id }).eq('id', proposal.id)

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  })
}
