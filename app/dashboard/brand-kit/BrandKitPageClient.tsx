'use client'

import { useRouter } from 'next/navigation'
import { BrandExtract } from './BrandExtract'

export function BrandKitPageClient({ accountId, accountName }: { accountId: string; accountName: string }) {
  const router = useRouter()
  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 32px', fontSize: 'var(--text-h2)', fontWeight: 'var(--weight-semibold)', letterSpacing: 'var(--tracking-tight)', color: 'var(--text-primary)' }}>
        Set up your Brand Kit
      </h1>
      <BrandExtract
        accountId={accountId}
        kitNameDefault={accountName}
        onConfirm={() => router.push('/dashboard/templates')}
        onSkip={() => router.push('/dashboard/templates')}
      />
    </div>
  )
}
