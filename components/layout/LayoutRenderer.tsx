'use client'

import * as React from 'react'
import type { LayoutSection } from '@/lib/layout/registry'
import type { LayoutContext } from './context'
import { renderPrimitive } from './primitives'

function SectionComponent({ section, ctx, index }: { section: LayoutSection; ctx: LayoutContext; index: number }) {
  // A missing/empty children array (deepPartial allows Section itself to omit it, since Section
  // is a plain ZodObject, not a discriminated union) renders nothing for this section, rather
  // than an empty styled box.
  if (!section.children || section.children.length === 0) return null
  return (
    <div
      className="print:break-inside-avoid"
      style={{
        padding: 48,
        borderBottom: '1px solid var(--border-hairline)',
        background: section.tone === 'sunken' ? 'var(--surface-sunken)' : undefined,
      }}
    >
      {section.children.map((child, i) => renderPrimitive(child, ctx, i))}
    </div>
  )
}

export function LayoutRenderer({ layout, ctx }: { layout: LayoutSection[]; ctx: LayoutContext }) {
  return (
    <>
      {layout.map((section, i) => (
        <SectionComponent key={i} section={section} ctx={ctx} index={i} />
      ))}
    </>
  )
}
