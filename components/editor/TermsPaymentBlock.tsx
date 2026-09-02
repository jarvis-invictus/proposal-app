'use client'

import * as React from 'react'
import { IconButton } from '@/components/ui/IconButton'
import { Button } from '@/components/ui/Button'

export type PaymentSection = { schedule: string; terms: string }

export interface TermsPaymentBlockProps {
  paymentSection: PaymentSection
  onPaymentSectionChange: (next: PaymentSection) => void
  terms: string[]
  onTermsChange: (next: string[]) => void
}

export function TermsPaymentBlock({ paymentSection, onPaymentSectionChange, terms, onTermsChange }: TermsPaymentBlockProps) {
  const updateTerm = (index: number, value: string) => {
    onTermsChange(terms.map((t, i) => (i === index ? value : t)))
  }
  const removeTerm = (index: number) => {
    const text = (terms[index] || '').trim()
    const label = text ? `"${text.length > 60 ? text.slice(0, 60) + '…' : text}"` : 'this term'
    if (!window.confirm(`Delete ${label}? This can't be undone.`)) return
    onTermsChange(terms.filter((_, i) => i !== index))
  }
  const addTerm = () => onTermsChange([...terms, ''])

  return (
    <div style={{ padding: '32px 40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 40 }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 25, letterSpacing: 0, marginBottom: 16 }}>Payment Schedule</h2>
        <input value={paymentSection.schedule} onChange={(e) => onPaymentSectionChange({ ...paymentSection, schedule: e.target.value })}
          placeholder="e.g. 50% advance, 50% on completion"
          style={{
            width: '100%', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-body)', fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)', marginBottom: 10,
          }} />
        <textarea value={paymentSection.terms} onChange={(e) => onPaymentSectionChange({ ...paymentSection, terms: e.target.value })}
          placeholder="Additional payment notes" rows={3}
          style={{
            width: '100%', border: 'none', outline: 'none', resize: 'none', background: 'transparent', fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-body)', color: 'var(--text-secondary)',
          }} />
      </div>
      <div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 25, letterSpacing: 0, marginBottom: 16 }}>Terms & Conditions</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {terms.map((term, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ flex: 'none', color: 'var(--text-muted)' }}>&bull;</span>
              <input value={term} onChange={(e) => updateTerm(idx, e.target.value)} placeholder="Term"
                style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }} />
              <IconButton icon="x" size="sm" variant="ghost" label="Remove term" onClick={() => removeTerm(idx)} />
            </div>
          ))}
        </div>
        <Button variant="secondary" size="sm" icon="plus" onClick={addTerm} style={{ marginTop: 12 }}>Add term</Button>
      </div>
    </div>
  )
}
