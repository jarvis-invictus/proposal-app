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

  const { data: userRecord } = await supabase.from('users').select('role, account_id').eq('id', user.id).single()

  const [{ data: proposal, error }, { data: accountRecord }] = await Promise.all([
    supabase.from('proposals').select('*, brand_kits(*)').eq('id', resolvedParams.id).single(),
    userRecord ? supabase.from('accounts').select('currency, subdomain').eq('id', userRecord.account_id).single() : Promise.resolve({ data: null }),
  ])

  if (error || !proposal) {
    redirect('/dashboard') // Handle not found
  }

  // Never ship the hash into the editor's client bundle — only whether one is set.
  const { password_hash, ...proposalForClient } = proposal

  return (
    <div className="min-h-screen bg-gray-100">
      <ProposalEditor initialProposal={{ ...proposalForClient, hasPassword: !!password_hash }} userRole={userRecord?.role || 'owner'} accountCurrency={accountRecord?.currency || 'USD'} accountSubdomain={accountRecord?.subdomain || null} />
    </div>
  )
}
