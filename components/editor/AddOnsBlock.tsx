'use client'

import * as React from 'react'
import { IconButton } from '@/components/ui/IconButton'
import { Button } from '@/components/ui/Button'
import { currencySymbol } from '@/lib/formatCurrency'

// ProposalSchemaV1's addOns shape: name, description, price, deliverables. There is no
// `optional` boolean field on this type — every add-on is conceptually optional by
// definition (that's what "add-on" means), which is likely where that got assumed from.
// `deliverables` exists on the schema but isn't rendered by the pre-correction editor or
// PublicProposalView.tsx either, so it's left out here too rather than adding a new,
// nowhere-else-consumed editing surface.
export type AddOnItem = {
  name: string
  description: string
  price: number
  deliverables: string[]
}

export interface AddOnsBlockProps {
  addOns: AddOnItem[]
  onChange: (next: AddOnItem[]) => void
  currency?: string
}

const BLANK_ADDON: AddOnItem = { name: 'New add-on', description: '', price: 0, deliverables: [] }

export function AddOnsBlock({ addOns, onChange, currency = 'USD' }: AddOnsBlockProps) {
  const updateAddOn = (index: number, patch: Partial<AddOnItem>) => {
    onChange(addOns.map((a, i) => (i === index ? { ...a, ...patch } : a)))
  }
  const removeAddOn = (index: number) => {
    const name = addOns[index]?.name || 'this add-on'
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return
    onChange(addOns.filter((_, i) => i !== index))
  }
  const addAddOn = () => onChange([...addOns, { ...BLANK_ADDON }])

  return (
    <div style={{ padding: '32px 40px', borderBottom: '1px solid var(--border-hairline)' }}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 25, letterSpacing: 0, marginBottom: 20 }}>Optional Add-ons</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {addOns.map((addon, idx) => (
          <div key={idx} style={{
            display: 'flex', alignItems: 'flex-start', gap: 16, padding: 16,
            borderRadius: 'var(--radius-sm)', background: 'var(--surface-sunken)', border: '1px solid var(--border-hairline)',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <input value={addon.name} onChange={(e) => updateAddOn(idx, { name: e.target.value })} placeholder="Add-on name"
                style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', marginBottom: 4 }} />
              <textarea value={addon.description} onChange={(e) => updateAddOn(idx, { description: e.target.value })} placeholder="Description" rows={1}
                style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }} />
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 1, flex: 'none', paddingLeft: 16, marginLeft: 4, borderLeft: '1px solid var(--border-hairline)' }}>
              <span style={{ fontSize: 'var(--text-body)', fontWeight: 700, color: 'var(--text-primary)' }}>+{currencySymbol(currency)}</span>
              <input type="number" value={addon.price} onChange={(e) => updateAddOn(idx, { price: Number(e.target.value) || 0 })}
                style={{ width: `${Math.max(2, String(addon.price).length + 1)}ch`, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)' }} />
            </span>
            <IconButton icon="trash-2" size="sm" variant="ghost" label="Delete add-on" onClick={() => removeAddOn(idx)} />
          </div>
        ))}
      </div>
      <Button variant="secondary" size="sm" icon="plus" onClick={addAddOn} style={{ marginTop: 16 }}>Add add-on</Button>
    </div>
  )
}
