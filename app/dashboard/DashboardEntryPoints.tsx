'use client'

import { useRouter } from 'next/navigation'
import { EntryCard } from '@/components/app/EntryCard'

export function DashboardEntryPoints() {
  const router = useRouter()
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 14, marginBottom: 32 }}>
      <EntryCard primary icon="sparkles" title="New proposal" description="Start drafting a new client proposal."
        onClick={() => router.push('/dashboard/proposals/new')} />
      <EntryCard icon="layout-template" title="Start from template" description="Pick a proven structure from the library."
        onClick={() => router.push('/dashboard/templates')} />
    </div>
  )
}
