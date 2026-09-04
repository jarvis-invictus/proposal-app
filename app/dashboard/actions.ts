'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { slugify } from '@/lib/slugify'
import { logError, logAction } from '@/lib/logging'

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
  if (error) {
    logError('Failed to duplicate proposal', error, { accountId: source.account_id, sourceProposalId: proposalId })
    throw new Error('Failed to duplicate the proposal — please try again.')
  }

  revalidatePath('/dashboard')
  return { id: copy.id, title: copy.content?.title as string }
}

export async function deleteProposal(proposalId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Fetched before the delete — account_id is how uploaded attachments are located in storage,
  // and it's only available through this row.
  const { data: proposalRow } = await supabase.from('proposals').select('account_id').eq('id', proposalId).maybeSingle()

  const { error } = await supabase.from('proposals').delete().eq('id', proposalId)
  if (error) {
    logError('Failed to delete proposal', error, { proposalId })
    throw new Error('Failed to delete the proposal — please try again.')
  }

  // Best-effort: the proposal is considered deleted the moment its row is gone — a storage
  // cleanup failure shouldn't resurrect it or block the user, just leave an orphaned file.
  if (proposalRow?.account_id) {
    try {
      const prefix = `${proposalRow.account_id}/attachments/${proposalId}`
      const { data: files } = await supabase.storage.from('public-assets').list(prefix)
      if (files && files.length > 0) {
        await supabase.storage.from('public-assets').remove(files.map((f) => `${prefix}/${f.name}`))
      }
    } catch (storageErr) {
      logError('Failed to clean up proposal attachments from storage', storageErr, { proposalId })
    }
  }

  logAction('delete_proposal', user.id, { proposalId })
  revalidatePath('/dashboard')
}
