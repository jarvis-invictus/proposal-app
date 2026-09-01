'use client'

import * as React from 'react'
import { Icon } from '@/components/ui/Icon'

// Hardcoded per Milestone 1.1 scope — becomes real once section-block scaffolding
// (word count per block, live section list) lands in a later Milestone 1 sub-task.
const SECTION_COUNT = 6
const WORDS = 1240
const READ_MINUTES = Math.max(1, Math.round(WORDS / 220))

/** Live word count and read-time bar, directly under the header — matches Editor.jsx's DocStats. */
export function DocStats() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16, padding: '7px 34px',
      borderBottom: '1px solid var(--border-hairline)', background: 'var(--glass-quiet)',
      fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)',
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="layout-list" size={13} />{SECTION_COUNT} sections</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="type" size={13} />{WORDS.toLocaleString()} words</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="clock" size={13} />{READ_MINUTES} min read</span>
    </div>
  )
}
