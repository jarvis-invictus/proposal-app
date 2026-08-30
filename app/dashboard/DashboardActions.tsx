'use client'

import { useRouter } from 'next/navigation'
import { ProposalCard } from '@/components/app/ProposalCard'

const STATUS_MAP: Record<string, 'draft' | 'sent' | 'accepted'> = {
  DRAFT: 'draft',
  PUBLISHED: 'sent',
}

export function DashboardActions({ proposal }: { proposal: { id: string; content: any; updated_at: string; status: string } }) {
  const router = useRouter()
  const title = proposal.content?.title || 'Untitled Proposal'
  const clientName = proposal.content?.clientName || 'Unknown Client'

  return (
    <ProposalCard
      title={title}
      client={clientName}
      updated={`Updated ${new Date(proposal.updated_at).toLocaleDateString()}`}
      status={STATUS_MAP[proposal.status] ?? 'draft'}
      onOpen={() => router.push(`/dashboard/proposals/${proposal.id}/edit`)}
    />
  )
}
