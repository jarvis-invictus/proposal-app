'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function requireAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: userRecord } = await supabase.from('users').select('account_id, role').eq('id', user.id).single()
  if (!userRecord) throw new Error('No account found')
  return { supabase, user, accountId: userRecord.account_id, role: userRecord.role as string }
}

export async function updateUserProfile(fullName: string) {
  if (!fullName || !fullName.trim()) throw new Error('Name is required')
  const { supabase } = await requireAccount()
  const { error } = await supabase.auth.updateUser({ data: { full_name: fullName.trim() } })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings')
}

export async function updateBusinessDetails({ name, business_address, gstin, default_validity_days }: {
  name: string; business_address: string; gstin: string; default_validity_days: number
}) {
  const { supabase, accountId } = await requireAccount()
  const { error } = await supabase
    .from('accounts')
    .update({ name: name.trim(), business_address: business_address || null, gstin: gstin || null, default_validity_days })
    .eq('id', accountId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings')
}

export async function updatePaymentDetails({ upi_id, payment_link, qr_url }: { upi_id: string; payment_link: string; qr_url: string }) {
  const { supabase, accountId } = await requireAccount()
  const { error } = await supabase
    .from('accounts')
    .update({ payment_upi_id: upi_id || null, payment_link: payment_link || null, payment_qr_url: qr_url || null })
    .eq('id', accountId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings')
}

export async function updateAvatarUrl(avatarUrl: string) {
  const { supabase, user } = await requireAccount()
  const { error } = await supabase.from('users').update({ avatar_url: avatarUrl }).eq('id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings')
}

// Invitations only create the record — there's no email-sending infrastructure in this app,
// so nothing is actually sent yet. The member shows up as "Pending" until that's built.
export async function inviteMember({ email, role }: { email: string; role: string }) {
  if (!email || !email.trim()) throw new Error('Email is required')
  const { supabase, user, accountId } = await requireAccount()
  const { error } = await supabase.from('invitations').insert({
    account_id: accountId, email: email.trim(), role, invited_by: user.id,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings')
}

export async function changeMemberRole({ userId, role }: { userId: string; role: string }) {
  const { supabase, role: myRole } = await requireAccount()
  if (myRole !== 'owner') throw new Error('Only an owner can change roles')
  const { error } = await supabase.from('users').update({ role }).eq('id', userId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings')
}

export async function approveProposal(proposalId: string) {
  const { supabase, user, role } = await requireAccount()
  if (role !== 'owner' && role !== 'approver') throw new Error('Only an owner or approver can release a proposal')
  const { error } = await supabase
    .from('proposals')
    .update({ status: 'PUBLISHED', approved_by: user.id, approved_at: new Date().toISOString() })
    .eq('id', proposalId)
    .eq('status', 'PENDING_APPROVAL')
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings')
}

export async function requestChanges(proposalId: string) {
  const { supabase, role } = await requireAccount()
  if (role !== 'owner' && role !== 'approver') throw new Error('Only an owner or approver can request changes')
  const { error } = await supabase
    .from('proposals')
    .update({ status: 'DRAFT', submitted_by: null, submitted_at: null })
    .eq('id', proposalId)
    .eq('status', 'PENDING_APPROVAL')
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings')
}

// No DNS/CNAME verification exists — this records the domain as requested. cname_verified /
// ssl_issued stay false until that real infrastructure exists.
export async function connectDomain(domainName: string) {
  if (!domainName || !domainName.trim()) throw new Error('Domain is required')
  const { supabase, accountId } = await requireAccount()

  const { data: account } = await supabase.from('accounts').select('plan_tier, extra_domain_slots').eq('id', accountId).single()
  const { count } = await supabase.from('domains').select('id', { count: 'exact', head: true }).eq('account_id', accountId)
  const baseSlots = account?.plan_tier === 'agency' ? 3 : account?.plan_tier === 'pay_per_proposal' ? 1 : 0
  const totalSlots = baseSlots + (account?.extra_domain_slots || 0)
  if ((count || 0) >= totalSlots) throw new Error('No domain slots available on your current plan')

  const { error } = await supabase.from('domains').insert({ account_id: accountId, domain_name: domainName.trim() })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings')
}

// No payment processor exists for platform billing (same "display only" principle as client
// payments) — this grants the slot without collecting any real charge.
export async function buyDomainSlot() {
  const { supabase, accountId } = await requireAccount()
  const { data: account } = await supabase.from('accounts').select('extra_domain_slots').eq('id', accountId).single()
  const { error } = await supabase
    .from('accounts')
    .update({ extra_domain_slots: (account?.extra_domain_slots || 0) + 1 })
    .eq('id', accountId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings')
}

export async function switchPlan(planTier: string) {
  const { supabase, role, accountId } = await requireAccount()
  if (role !== 'owner') throw new Error('Only an owner can change the plan')
  const { error } = await supabase.from('accounts').update({ plan_tier: planTier }).eq('id', accountId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings')
}
