'use client'

import * as React from 'react'
import { IconButton } from '@/components/ui/IconButton'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/app/ConfirmDialog'
import { currencySymbol, formatAmount } from '@/lib/formatCurrency'

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
  currency?: string
}

const BLANK_PACKAGE: PackageItem = {
  name: 'New package', description: '', originalPrice: 0, discountedPrice: 0, popular: false, deliverables: [],
}

/** Editable pricing tiers, bound directly to ProposalSchemaV1's packages array. */
export function PackagesBlock({ packages, onChange, currency = 'USD' }: PackagesBlockProps) {
  const [pendingDelete, setPendingDelete] = React.useState<number | null>(null)
  const updatePackage = (index: number, patch: Partial<PackageItem>) => {
    onChange(packages.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  }
  const confirmRemovePackage = () => {
    if (pendingDelete === null) return
    onChange(packages.filter((_, i) => i !== pendingDelete))
    setPendingDelete(null)
  }
  const addPackage = () => {
    onChange([...packages, { ...BLANK_PACKAGE, deliverables: [] }])
  }
  // `deliverables` is required by ProposalSchemaV1, but a proposal row can still reach the editor
  // without it (older records, a template, a partially-applied AI revision). Reading it
  // unguarded threw "Cannot read properties of undefined (reading 'map')", which took the whole
  // editor down behind the error boundary — and "Try again" just re-crashed, permanently locking
  // the owner out of their own proposal. Treat a missing list as an empty one instead.
  const addDeliverable = (index: number) => {
    updatePackage(index, { deliverables: [...(packages[index].deliverables ?? []), ''] })
  }
  const updateDeliverable = (index: number, dIndex: number, value: string) => {
    updatePackage(index, { deliverables: (packages[index].deliverables ?? []).map((d, i) => (i === dIndex ? value : d)) })
  }
  const removeDeliverable = (index: number, dIndex: number) => {
    updatePackage(index, { deliverables: (packages[index].deliverables ?? []).filter((_, i) => i !== dIndex) })
  }

  return (
    <div style={{ padding: '32px 40px', borderBottom: '1px solid var(--border-hairline)' }}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 25, letterSpacing: 0, marginBottom: 20 }}>Packages</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
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
              <IconButton icon="trash-2" size="sm" variant="ghost" label="Delete package" onClick={() => setPendingDelete(idx)} />
            </div>

            <input value={pkg.name} onChange={(e) => updatePackage(idx, { name: e.target.value })} placeholder="Package name"
              aria-label={`Package ${idx + 1} name`}
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-h4)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', marginBottom: 6,
              }} />
            <textarea value={pkg.description} onChange={(e) => updatePackage(idx, { description: e.target.value })}
              placeholder="Who this package is for" rows={2} aria-label={`${pkg.name || `Package ${idx + 1}`} description`}
              style={{
                width: '100%', border: 'none', outline: 'none', resize: 'none', background: 'transparent', fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-snug)', color: 'var(--text-muted)', marginBottom: 14,
              }} />

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
              <PriceInput value={pkg.discountedPrice} onChange={(v) => updatePackage(idx, { discountedPrice: v })} size={30} weight={700} currency={currency}
                label={`${pkg.name || 'Package'} price`} />
              <PriceInput value={pkg.originalPrice} onChange={(v) => updatePackage(idx, { originalPrice: v })} size={16} weight={400}
                strike={pkg.originalPrice > pkg.discountedPrice} muted={pkg.originalPrice > pkg.discountedPrice} currency={currency}
                label={`${pkg.name || 'Package'} original price before discount`} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(pkg.deliverables ?? []).map((d, dIdx) => (
                <div key={dIdx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="check" size={14} color="var(--brand-deep)" style={{ flex: 'none' }} />
                  <input value={d} onChange={(e) => updateDeliverable(idx, dIdx, e.target.value)} placeholder="Deliverable"
                    aria-label={`${pkg.name || `Package ${idx + 1}`} deliverable ${dIdx + 1}`}
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
      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete "${(pendingDelete !== null && packages[pendingDelete]?.name) || 'this package'}"?`}
        body="This can't be undone."
        onConfirm={confirmRemovePackage}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

/** A text input rather than type="number" on purpose: the author needs to read this figure at a
 * glance and `type="number"` can't hold grouping separators, so a six-figure deal rendered as an
 * unreadable "450000" here while the client's own view showed "$450,000". The old `ch`-based
 * width also ignored the number spinner Chrome reserves space for inside the control, so the last
 * digit of a six-figure price was silently cut off — a ₹600,000 package displayed as "60000". */
function PriceInput({ value, onChange, size, weight, strike, muted, currency, label }: {
  value: number; onChange: (v: number) => void; size: number; weight: number; strike?: boolean; muted?: boolean; currency: string; label: string
}) {
  const formatted = formatAmount(value, currency)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 1 }}>
      <span style={{ fontSize: size, fontWeight: weight, color: muted ? 'var(--text-muted)' : 'var(--text-primary)' }}>{currencySymbol(currency)}</span>
      <input type="text" inputMode="numeric" aria-label={label} value={formatted}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)}
        style={{
          // +1ch of headroom for the caret, plus a few px: `ch` is the advance of "0", but bold
          // digits at the large size run slightly wider than that reference, which left the
          // headline price a pixel short of its own content.
          width: `calc(${formatted.length + 1}ch + 4px)`, border: 'none', outline: 'none', background: 'transparent',
          fontFamily: 'var(--font-sans)', fontSize: size, fontWeight: weight, fontVariantNumeric: 'tabular-nums',
          color: muted ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: strike ? 'line-through' : 'none',
        }} />
    </span>
  )
}
