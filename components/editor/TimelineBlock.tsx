'use client'

import * as React from 'react'
import { IconButton } from '@/components/ui/IconButton'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { ConfirmDialog } from '@/components/app/ConfirmDialog'
import { parseDurationDays } from '@/lib/ai/mapProposalToDealFacts'

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
  const [pendingDelete, setPendingDelete] = React.useState<number | null>(null)
  // Per-phase index, same positional identity every other reference in this file already uses
  // (TimelinePhase has no id field). Reindexed on delete below so a removed phase's touched state
  // never silently reattaches to whatever phase slides into its old index.
  const [touched, setTouched] = React.useState<Set<number>>(new Set())
  const updatePhase = (index: number, patch: Partial<TimelinePhase>) => {
    onChange(timeline.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  }
  const confirmRemovePhase = () => {
    if (pendingDelete === null) return
    const removedIndex = pendingDelete
    onChange(timeline.filter((_, i) => i !== removedIndex))
    setTouched((prev) => {
      const next = new Set<number>()
      for (const i of prev) {
        if (i < removedIndex) next.add(i)
        else if (i > removedIndex) next.add(i - 1)
      }
      return next
    })
    setPendingDelete(null)
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
              <input value={phase.duration} onChange={(e) => updatePhase(idx, { duration: e.target.value })}
                onBlur={() => setTouched((prev) => new Set(prev).add(idx))} placeholder="Duration" maxLength={40}
                style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }} />
              {touched.has(idx) && parseDurationDays(phase.duration) === null && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                  <Icon name="triangle-alert" size={12} color="var(--text-muted)" style={{ marginTop: 1, flex: 'none' }} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, lineHeight: 'var(--leading-snug)', color: 'var(--text-muted)' }}>
                    Use a format like "2 weeks" — needed for the AI page designer to compute a due date.
                  </span>
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingBottom: 18, borderBottom: '1px solid var(--border-hairline)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <textarea value={phase.description} onChange={(e) => updatePhase(idx, { description: e.target.value })} placeholder="What happens during this phase" rows={2}
                style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', resize: 'none', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-snug)', color: 'var(--text-secondary)' }} />
              <IconButton icon="trash-2" size="sm" variant="ghost" label="Delete phase" onClick={() => setPendingDelete(idx)} />
            </div>
          </div>
        ))}
      </div>
      <Button variant="secondary" size="sm" icon="plus" onClick={addPhase} style={{ marginTop: 16 }}>Add phase</Button>
      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete "${(pendingDelete !== null && timeline[pendingDelete]?.phase) || 'this phase'}"?`}
        body="This can't be undone."
        onConfirm={confirmRemovePhase}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
