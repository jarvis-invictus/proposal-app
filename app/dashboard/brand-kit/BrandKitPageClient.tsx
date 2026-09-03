'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { BrandExtract } from './BrandExtract'

export type BrandKitRow = {
  id: string
  name: string
  colors: { primary?: string; secondary?: string; accent?: string } | null
  headingFont: string | null
  logoUrl: string | null
}

export function BrandKitPageClient({ accountId, accountName, kits }: { accountId: string; accountName: string; kits: BrandKitRow[] }) {
  const router = useRouter()
  const [mode, setMode] = React.useState<'list' | 'create'>(kits.length > 0 ? 'list' : 'create')

  const backToList = () => { router.refresh(); setMode('list') }

  if (mode === 'create') {
    return (
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        {kits.length > 0 && (
          <button type="button" onClick={() => setMode('list')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16, border: 'none', background: 'none', padding: 0, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)' }}>
            <Icon name="arrow-left" size={14} /> Back to your brand kits
          </button>
        )}
        <BrandExtract
          accountId={accountId}
          kitNameDefault={accountName}
          onConfirm={backToList}
          onSkip={() => (kits.length > 0 ? setMode('list') : router.push('/dashboard/templates'))}
        />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 14, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 'var(--text-body)', color: 'var(--text-muted)', maxWidth: 480 }}>
          Every proposal picks one of these when it&apos;s generated. Add another if you work across different brands or clients.
        </p>
        <Button variant="primary" icon="plus" onClick={() => setMode('create')}>Add another brand kit</Button>
      </div>

      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
        {kits.map((kit) => <BrandKitCard key={kit.id} kit={kit} />)}
      </div>
    </div>
  )
}

function BrandKitCard({ kit }: { kit: BrandKitRow }) {
  const swatches = [kit.colors?.primary, kit.colors?.secondary, kit.colors?.accent].filter(Boolean) as string[]
  return (
    <div style={{ padding: '18px 18px 16px', borderRadius: 'var(--radius-card)', background: 'var(--surface-card)', border: '1px solid var(--border-hairline)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        {kit.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={kit.logoUrl} alt="" style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', objectFit: 'contain', background: 'var(--glass-quiet)', border: '1px solid var(--border-hairline)' }} />
        ) : (
          <span style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--brand-12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-deep)', flex: 'none' }}>
            <Icon name="palette" size={17} />
          </span>
        )}
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 'var(--text-body)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{kit.name}</span>
          {kit.headingFont && <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{kit.headingFont}</span>}
        </span>
      </div>
      {swatches.length > 0 && (
        <div style={{ display: 'flex', gap: 6 }}>
          {swatches.map((c, i) => <span key={i} style={{ width: 22, height: 22, borderRadius: 'var(--radius-xs)', background: c, border: '1px solid var(--border-hairline)' }} />)}
        </div>
      )}
    </div>
  )
}
