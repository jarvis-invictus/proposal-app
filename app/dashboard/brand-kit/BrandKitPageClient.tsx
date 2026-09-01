'use client'

import { useRouter } from 'next/navigation'
import { BrandExtract } from './BrandExtract'

export function BrandKitPageClient({ accountId, accountName }: { accountId: string; accountName: string }) {
  const router = useRouter()
  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <BrandExtract
        accountId={accountId}
        kitNameDefault={accountName}
        onConfirm={() => router.push('/dashboard/templates')}
        onSkip={() => router.push('/dashboard/templates')}
      />
    </div>
  )
}
