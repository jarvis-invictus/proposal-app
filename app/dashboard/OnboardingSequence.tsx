'use client'

import { useRouter } from 'next/navigation'
import { Checklist } from '@/components/app/Checklist'
import { EntryCard } from '@/components/app/EntryCard'

const STEPS = [
  {
    id: 'brandKit',
    label: 'Set up your brand kit',
    description: 'Colors, logo, and fonts — used on every proposal automatically.',
    icon: 'palette',
    href: '/dashboard/brand-kit',
  },
  {
    id: 'proposal',
    label: 'Create your first proposal',
    description: 'Describe a deal and let AI draft the whole thing.',
    icon: 'sparkles',
    href: '/dashboard/proposals/new',
  },
  {
    id: 'shared',
    label: 'Share it with a client',
    description: 'Publish it and send the link so your client can view and accept it.',
    icon: 'send',
    href: null, // resolved dynamically — needs an existing proposal to open
  },
] as const

export interface OnboardingDone {
  brandKit: boolean
  proposal: boolean
  shared: boolean
}

export function OnboardingSequence({
  name,
  done,
  latestProposalId,
}: {
  name: string
  done: OnboardingDone
  latestProposalId?: string | null
}) {
  const router = useRouter()
  const doneIds = STEPS.filter((s) => done[s.id]).map((s) => s.id)
  const nextStep = STEPS.find((s) => !done[s.id])

  const go = (id: string) => {
    if (id === 'shared') {
      // Sharing means opening an existing proposal to publish/copy its link — if none exists
      // yet, the only sensible place to send someone is to create one first.
      router.push(latestProposalId ? `/dashboard/proposals/${latestProposalId}/edit` : '/dashboard/proposals/new')
      return
    }
    const step = STEPS.find((s) => s.id === id)
    if (step?.href) router.push(step.href)
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 'var(--text-h2)', fontWeight: 'var(--weight-semibold)', letterSpacing: 'var(--tracking-tight)', color: 'var(--text-primary)' }}>
          Welcome, {name}
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Three steps to your first sent proposal.
        </p>
      </div>

      <Checklist
        items={STEPS.map(({ id, label, icon }) => ({ id, label, icon }))}
        done={doneIds}
        onSelect={(item) => go(item.id)}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 14 }}>
        {STEPS.map((step) => (
          <EntryCard
            key={step.id}
            icon={step.icon}
            title={step.label}
            description={step.description}
            primary={nextStep?.id === step.id}
            onClick={() => go(step.id)}
          />
        ))}
      </div>
    </div>
  )
}
