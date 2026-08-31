import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createRazorpayCustomer } from '@/lib/payments/razorpay'

// "Manage billing" for now just means: create (or return) a Razorpay customer record for
// this account. There's no subscription/plan model in the app yet, so there's nothing to
// hand the account owner a self-serve portal for — this just gets a customer id on file.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRecord } = await supabase.from('users').select('account_id').eq('id', user.id).single()
  if (!userRecord) return NextResponse.json({ error: 'No account found' }, { status: 404 })

  const { data: account } = await supabase
    .from('accounts')
    .select('id, name, payment_provider, provider_customer_id')
    .eq('id', userRecord.account_id)
    .single()

  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  if (account.provider_customer_id) {
    return NextResponse.json({ providerCustomerId: account.provider_customer_id, provider: account.payment_provider })
  }

  if (account.payment_provider !== 'razorpay') {
    return NextResponse.json({ error: `Customer record creation for ${account.payment_provider || 'this provider'} isn't available yet` }, { status: 501 })
  }

  const customer = await createRazorpayCustomer({ name: account.name, email: user.email! })

  await supabase.from('accounts').update({ provider_customer_id: customer.id }).eq('id', account.id)

  return NextResponse.json({ providerCustomerId: customer.id, provider: account.payment_provider })
}
