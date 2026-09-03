'use client'

import * as React from 'react'
import { IconButton } from '@/components/ui/IconButton'
import { Button } from '@/components/ui/Button'

export type TimelinePhase = {
  phase: string
  duration: string
  description: string
}

export interface TimelineBlockProps {
  timeline: TimelinePhase[]
  onChange: (next: TimelinePhase[]) => void
}

const BLANK_PHASE: TimelinePhase = { phase: 'New phase', duration: '', description: '' }

export function TimelineBlock({ timeline, onChange }: TimelineBlockProps) {
  const updatePhase = (index: number, patch: Partial<TimelinePhase>) => {
    onChange(timeline.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  }
  const removePhase = (index: number) => {
    const name = timeline[index]?.phase || 'this phase'
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return
    onChange(timeline.filter((_, i) => i !== index))
  }
  const addPhase = () => onChange([...timeline, { ...BLANK_PHASE }])

  return (
    <div style={{ padding: '32px 40px', borderBottom: '1px solid var(--border-hairline)' }}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 25, letterSpacing: 0, marginBottom: 20 }}>Project Timeline</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {timeline.map((phase, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <div style={{ width: 150, flex: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <input value={phase.phase} onChange={(e) => updatePhase(idx, { phase: e.target.value })} placeholder="Phase"
                style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)', fontWeight: 700, color: 'var(--text-primary)' }} />
              <input value={phase.duration} onChange={(e) => updatePhase(idx, { duration: e.target.value })} placeholder="Duration"
                style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingBottom: 18, borderBottom: '1px solid var(--border-hairline)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <textarea value={phase.description} onChange={(e) => updatePhase(idx, { description: e.target.value })} placeholder="What happens during this phase" rows={2}
                style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', resize: 'none', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-snug)', color: 'var(--text-secondary)' }} />
              <IconButton icon="trash-2" size="sm" variant="ghost" label="Delete phase" onClick={() => removePhase(idx)} />
            </div>
          </div>
        ))}
      </div>
      <Button variant="secondary" size="sm" icon="plus" onClick={addPhase} style={{ marginTop: 16 }}>Add phase</Button>
    </div>
  )
}
