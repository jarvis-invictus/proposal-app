'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { slugify } from '@/lib/slugify'
import { logError, logAction } from '@/lib/logging'
import { checkActiveProposalLimit } from '@/lib/proposalLimits'

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

  const limitCheck = await checkActiveProposalLimit(supabase, source.account_id)
  if (!limitCheck.allowed) throw new Error(limitCheck.reason)

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

export async function unpublishProposal(proposalId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: userRecord } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!userRecord || (userRecord.role !== 'owner' && userRecord.role !== 'approver')) {
    throw new Error('Only an owner or approver can unpublish a proposal')
  }

  const { data: proposalRow } = await supabase.from('proposals').select('status, accepted_at').eq('id', proposalId).maybeSingle()
  if (!proposalRow) throw new Error('Proposal not found')
  if (proposalRow.status !== 'PUBLISHED') throw new Error(`Cannot unpublish a proposal with status ${proposalRow.status}`)
  if (proposalRow.accepted_at) throw new Error('This proposal has been signed and cannot be unpublished.')

  // .eq('status', 'PUBLISHED') is what actually prevents the race, not the earlier SELECT above
  // — same pattern publish/route.ts and accept/route.ts already use for their own transitions.
  const { data: updated, error } = await supabase
    .from('proposals')
    .update({ status: 'ARCHIVED', updated_at: new Date().toISOString() })
    .eq('id', proposalId)
    .eq('status', 'PUBLISHED')
    .select('status')
    .maybeSingle()

  if (error) {
    logError('Failed to unpublish proposal', error, { proposalId })
    throw new Error('Failed to unpublish the proposal — please try again.')
  }
  if (!updated) {
    throw new Error('This proposal was already changed — refresh and try again.')
  }

  logAction('unpublish_proposal', user.id, { proposalId })
  revalidatePath('/dashboard')
}

/** Soft delete — moves the proposal to Trash (docs/DECISION_LOG.md, 2026-09-11). Uniform across
 * every status, no role/accepted_at restriction: reversible, only hides the row from the active
 * dashboard view. The real, irreversible action is `permanentlyDeleteProposal` below, which is
 * where the signed-record protection actually lives. */
export async function deleteProposal(proposalId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('proposals')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', proposalId)

  if (error) {
    logError('Failed to move proposal to trash', error, { proposalId })
    throw new Error('Failed to move the proposal to trash — please try again.')
  }

  logAction('trash_proposal', user.id, { proposalId })
  revalidatePath('/dashboard')
}

/** Moves a trashed proposal back to the active dashboard — real status (DRAFT/PUBLISHED/etc.) was
 * never touched by the soft delete, so it reappears exactly as it was. */
export async function restoreProposal(proposalId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('proposals')
    .update({ deleted_at: null })
    .eq('id', proposalId)

  if (error) {
    logError('Failed to restore proposal', error, { proposalId })
    throw new Error('Failed to restore the proposal — please try again.')
  }

  logAction('restore_proposal', user.id, { proposalId })
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/trash')
}

/** The real, irreversible delete — only reachable from Trash. App-level guard mirrors
 * unpublishProposal's exact pattern, same error string as the DB trigger
 * (enforce_proposal_delete_signed_lock) by design: a signed proposal is a legal record and must
 * not be destroyable, even from Trash. Attachment cleanup moved here from the old hard-delete
 * path — a soft-deleted proposal's attachments must survive in case it's restored. */
export async function permanentlyDeleteProposal(proposalId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: proposalRow } = await supabase.from('proposals').select('account_id, accepted_at').eq('id', proposalId).maybeSingle()
  if (!proposalRow) throw new Error('Proposal not found')
  if (proposalRow.accepted_at) throw new Error('This proposal has been signed and cannot be permanently deleted.')

  const { error } = await supabase.from('proposals').delete().eq('id', proposalId)
  if (error) {
    logError('Failed to permanently delete proposal', error, { proposalId })
    throw new Error('Failed to permanently delete the proposal — please try again.')
  }

  // Best-effort: the proposal is considered gone the moment its row is gone — a storage cleanup
  // failure shouldn't resurrect it or block the user, just leave an orphaned file.
  if (proposalRow.account_id) {
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

  logAction('permanently_delete_proposal', user.id, { proposalId })
  revalidatePath('/dashboard/trash')
}
