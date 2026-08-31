import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProposalEditor from './ProposalEditor'

export default async function ProposalEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch the proposal
  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('*, brand_kits(*)')
    .eq('id', resolvedParams.id)
    .single()

  if (error || !proposal) {
    redirect('/dashboard') // Handle not found
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <ProposalEditor initialProposal={proposal} />
    </div>
  )
}
