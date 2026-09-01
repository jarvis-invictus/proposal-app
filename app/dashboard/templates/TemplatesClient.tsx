'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/app/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Icon } from '@/components/ui/Icon'
import { Pill } from '@/components/ui/Pill'
import { FilterChip } from '@/components/ui/FilterChip'
import { Modal } from '@/components/app/Modal'

export type TemplateRow = {
  id: string
  name: string
  category: string
  sectionCount: number
  tagline: string | null
}

const SECTION_LABELS = ['Header & cover', 'Executive summary', 'Scope of work', 'Packages & pricing', 'Terms', 'Payment schedule']

export function TemplatesClient({
  accountName, planLabel, templates,
}: {
  accountName: string
  planLabel: string
  templates: TemplateRow[]
}) {
  const router = useRouter()
  const [category, setCategory] = React.useState('All')
  const [q, setQ] = React.useState('')
  const [preview, setPreview] = React.useState<TemplateRow | null>(null)

  const categories = ['All', ...Array.from(new Set(templates.map((t) => t.category))).sort()]
  const list = templates.filter(
    (t) => (category === 'All' || t.category === category) && (q === '' || t.name.toLowerCase().includes(q.toLowerCase()))
  )

  return (
    <AppShell screen="templates" title="Templates" subtitle="Start from a structure that already works, then let AI fill it in."
      accountName={accountName} planLabel={planLabel}
      search={<Input icon="search" size="sm" placeholder="Search templates" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 220 }} />}
      actions={
        <>
          <Button variant="secondary" size="sm" icon="file-plus-2" onClick={() => router.push('/dashboard/proposals/new')}>Start blank</Button>
          <Button variant="primary" size="sm" icon="layout-template" onClick={() => router.push('/dashboard')}>Save a proposal as template</Button>
        </>
      }>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {categories.map((c) => (
          <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>{c}</FilterChip>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 18 }}>
        {list.map((t) => (
          <Card key={t.id} interactive padding={0} radius="var(--radius-card)" onClick={() => setPreview(t)} style={{ overflow: 'hidden' }}>
            <div style={{ aspectRatio: '4 / 3', padding: 14, background: 'var(--pure-white)', borderBottom: '1px solid var(--border-hairline)' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 17, marginBottom: 9 }}>{t.name}</div>
              {[100, 88, 70, 94, 62].map((w, i) => (
                <div key={i} style={{ height: 4, width: w + '%', borderRadius: 2, background: 'var(--ink-06)', marginBottom: 5 }} />
              ))}
              <div style={{ marginTop: 10, display: 'flex', gap: 5 }}>
                <div style={{ flex: 1, height: 22, borderRadius: 5, background: 'var(--surface-sunken)' }} />
                <div style={{ flex: 1, height: 22, borderRadius: 5, background: 'var(--surface-sunken)' }} />
              </div>
            </div>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 'var(--text-body)', fontWeight: 500 }}>{t.name}</div>
              <div style={{ marginTop: 3, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{t.category} · {t.sectionCount} sections</div>
            </div>
          </Card>
        ))}
      </div>
      <Modal open={!!preview} eyebrow={preview?.category} title={preview?.name} onClose={() => setPreview(null)} width={560}
        footer={
          <>
            <Pill tone="solid" size="sm" icon="layers">{preview?.sectionCount} sections</Pill>
            <span style={{ flex: 1 }} />
            <Button variant="ghost" onClick={() => setPreview(null)}>Close</Button>
            <Button variant="primary" iconRight="arrow-right" onClick={() => {
              const id = preview?.id
              setPreview(null)
              router.push(id ? `/dashboard/proposals/new?template=${id}` : '/dashboard/proposals/new')
            }}>Use this template</Button>
          </>
        }>
        <p style={{ fontSize: 'var(--text-body)', color: 'var(--text-secondary)', marginBottom: 16 }}>
          {preview?.tagline || `A ${preview?.category} template`}. Your default brand kit is applied automatically.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SECTION_LABELS.slice(0, preview ? preview.sectionCount : 6).map((s) => (
            <div key={s} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderRadius: 'var(--radius-sm)',
              background: 'var(--glass-card)', border: '1px solid var(--border-hairline)', fontSize: 'var(--text-body)',
            }}>
              <Icon name="align-left" size={15} color="var(--text-muted)" />{s}
            </div>
          ))}
        </div>
      </Modal>
    </AppShell>
  )
}
