'use client'

import * as React from 'react'

export interface StructuredDocumentProps {
  children: React.ReactNode
}

/** The white "paper" surface that houses the structured form blocks (Header, Packages, Timeline, ...). */
export function StructuredDocument({ children }: StructuredDocumentProps) {
  return (
    <div style={{ position: 'relative', flex: 1, overflowY: 'auto', padding: '26px 34px 130px' }}>
      <div style={{
        maxWidth: 840, margin: '0 auto', background: 'var(--surface-card)', borderRadius: 'var(--radius-card-lg)',
        boxShadow: 'var(--shadow-modal)', overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  )
}
