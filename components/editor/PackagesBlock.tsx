'use client'

import * as React from 'react'
import { IconButton } from '@/components/ui/IconButton'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'

export type PackageItem = {
  name: string
  description: string
  originalPrice: number
  discountedPrice: number
  popular: boolean
  deliverables: string[]
}

export interface PackagesBlockProps {
  packages: PackageItem[]
  onChange: (next: PackageItem[]) => void
}

const BLANK_PACKAGE: PackageItem = {
  name: 'New package', description: '', originalPrice: 0, discountedPrice: 0, popular: false, deliverables: [],
}

/** Editable pricing tiers, bound directly to ProposalSchemaV1's packages array. */
export function PackagesBlock({ packages, onChange }: PackagesBlockProps) {
  const updatePackage = (index: number, patch: Partial<PackageItem>) => {
    onChange(packages.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  }
  const removePackage = (index: number) => {
    onChange(packages.filter((_, i) => i !== index))
  }
  const addPackage = () => {
    onChange([...packages, { ...BLANK_PACKAGE, deliverables: [] }])
  }
  const addDeliverable = (index: number) => {
    updatePackage(index, { deliverables: [...packages[index].deliverables, ''] })
  }
  const updateDeliverable = (index: number, dIndex: number, value: string) => {
    updatePackage(index, { deliverables: packages[index].deliverables.map((d, i) => (i === dIndex ? value : d)) })
  }
  const removeDeliverable = (index: number, dIndex: number) => {
    updatePackage(index, { deliverables: packages[index].deliverables.filter((_, i) => i !== dIndex) })
  }

  return (
    <div style={{ padding: '32px 40px', borderBottom: '1px solid var(--border-hairline)' }}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 25, letterSpacing: 0, marginBottom: 20 }}>Packages</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
        {packages.map((pkg, idx) => (
          <div key={idx} style={{
            position: 'relative', padding: 20, borderRadius: 'var(--radius-card)',
            border: pkg.popular ? '2px solid var(--brand)' : '1px solid var(--border-hairline)',
          }}>
            {pkg.popular && (
              <span style={{
                position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                padding: '3px 12px', borderRadius: 'var(--radius-pill)', background: 'var(--brand-deep)',
                color: 'var(--text-inverse)', fontSize: 'var(--text-micro)', fontWeight: 'var(--weight-medium)',
                letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase', whiteSpace: 'nowrap',
              }}>Most popular</span>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginBottom: 4 }}>
              <IconButton icon="star" size="sm" variant="ghost" active={pkg.popular}
                label={pkg.popular ? 'Unmark as popular' : 'Mark as popular'}
                onClick={() => updatePackage(idx, { popular: !pkg.popular })} />
              <IconButton icon="trash-2" size="sm" variant="ghost" label="Delete package" onClick={() => removePackage(idx)} />
            </div>

            <input value={pkg.name} onChange={(e) => updatePackage(idx, { name: e.target.value })} placeholder="Package name"
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-h4)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', marginBottom: 6,
              }} />
            <textarea value={pkg.description} onChange={(e) => updatePackage(idx, { description: e.target.value })}
              placeholder="Who this package is for" rows={2}
              style={{
                width: '100%', border: 'none', outline: 'none', resize: 'none', background: 'transparent', fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-snug)', color: 'var(--text-muted)', marginBottom: 14,
              }} />

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
              <PriceInput value={pkg.discountedPrice} onChange={(v) => updatePackage(idx, { discountedPrice: v })} size={30} weight={700} />
              <PriceInput value={pkg.originalPrice} onChange={(v) => updatePackage(idx, { originalPrice: v })} size={16} weight={400} strike muted />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pkg.deliverables.map((d, dIdx) => (
                <div key={dIdx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="check" size={14} color="var(--brand-deep)" style={{ flex: 'none' }} />
                  <input value={d} onChange={(e) => updateDeliverable(idx, dIdx, e.target.value)} placeholder="Deliverable"
                    style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }} />
                  <IconButton icon="x" size="sm" variant="ghost" label="Remove deliverable" onClick={() => removeDeliverable(idx, dIdx)} />
                </div>
              ))}
              <button type="button" onClick={() => addDeliverable(idx)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 4,
                  border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-xs)', color: 'var(--brand-deep)', padding: 0,
                }}>
                <Icon name="plus" size={12} /> Add deliverable
              </button>
            </div>
          </div>
        ))}
      </div>
      <Button variant="secondary" size="sm" icon="plus" onClick={addPackage} style={{ marginTop: 16 }}>Add package</Button>
    </div>
  )
}

function PriceInput({ value, onChange, size, weight, strike, muted }: {
  value: number; onChange: (v: number) => void; size: number; weight: number; strike?: boolean; muted?: boolean
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 1 }}>
      <span style={{ fontSize: size, fontWeight: weight, color: muted ? 'var(--text-muted)' : 'var(--text-primary)' }}>$</span>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)}
        style={{
          width: `${Math.max(2, String(value).length + 1)}ch`, border: 'none', outline: 'none', background: 'transparent',
          fontFamily: 'var(--font-sans)', fontSize: size, fontWeight: weight, fontVariantNumeric: 'tabular-nums',
          color: muted ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: strike ? 'line-through' : 'none',
        }} />
    </span>
  )
}
