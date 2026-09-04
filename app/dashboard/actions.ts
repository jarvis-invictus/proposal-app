'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { slugify } from '@/lib/slugify'

export async function duplicateProposalAsDraft(proposalId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: source, error: fetchError } = await supabase
    .from('proposals')
    .select('account_id, template_id, brand_kit_id, content')
    .eq('id', proposalId)
    .single()
  if (fetchError || !source) throw new Error('Proposal not found')

  const title = (source.content?.title || 'Untitled proposal') + ' (copy)'
  const content = { ...source.content, title }

  const { data: copy, error } = await supabase
    .from('proposals')
    .insert({
      account_id: source.account_id,
      template_id: source.template_id,
      brand_kit_id: source.brand_kit_id,
      status: 'DRAFT',
      content,
      slug: slugify(title),
    })
    .select('id, content')
    .single()
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  return { id: copy.id, title: copy.content?.title as string }
}

export async function deleteProposal(proposalId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase.from('proposals').delete().eq('id', proposalId)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
}
