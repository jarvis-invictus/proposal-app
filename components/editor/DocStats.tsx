'use client'

import * as React from 'react'
import { Icon } from '@/components/ui/Icon'

function countWords(text: string | undefined | null): number {
  if (!text) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

/** Sections count as "present" the same way PublishModal's own filled-sections check does —
 * a block with real content in it, not just one of the six the editor always renders. A blank
 * draft should read close to 0 sections/words, not the same number as a full proposal. */
function computeDocStats(content: any) {
  let words = 0
  let sections = 0

  if (content?.title) { sections++; words += countWords(content.title) }

  const packages = Array.isArray(content?.packages) ? content.packages : []
  if (packages.length > 0) {
    sections++
    for (const p of packages) {
      words += countWords(p?.name) + countWords(p?.description)
      for (const d of p?.deliverables || []) words += countWords(d)
    }
  }

  const addOns = Array.isArray(content?.addOns) ? content.addOns : []
  if (addOns.length > 0) {
    sections++
    for (const a of addOns) {
      words += countWords(a?.name) + countWords(a?.description)
      for (const d of a?.deliverables || []) words += countWords(d)
    }
  }

  const timeline = Array.isArray(content?.timeline) ? content.timeline : []
  if (timeline.length > 0) {
    sections++
    for (const t of timeline) words += countWords(t?.phase) + countWords(t?.duration) + countWords(t?.description)
  }

  const attachments = Array.isArray(content?.attachments) ? content.attachments : []
  if (attachments.length > 0) {
    sections++
    for (const a of attachments) words += countWords(a?.caption)
  }

  const terms = Array.isArray(content?.terms) ? content.terms : []
  const hasPaymentText = !!(content?.paymentSection?.schedule || content?.paymentSection?.terms)
  if (terms.length > 0 || hasPaymentText) {
    sections++
    for (const t of terms) words += countWords(t)
    words += countWords(content?.paymentSection?.schedule) + countWords(content?.paymentSection?.terms)
  }

  return { sections, words, readMinutes: Math.max(1, Math.round(words / 220)) }
}

/** Live word count and read-time bar, directly under the header — matches Editor.jsx's DocStats. */
export function DocStats({ content }: { content: any }) {
  const { sections, words, readMinutes } = React.useMemo(() => computeDocStats(content), [content])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16, padding: '7px 34px',
      borderBottom: '1px solid var(--border-hairline)', background: 'var(--glass-quiet)',
      fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)',
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="layout-list" size={13} />{sections} section{sections === 1 ? '' : 's'}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="type" size={13} />{words.toLocaleString()} words</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="clock" size={13} />{readMinutes} min read</span>
    </div>
  )
}
