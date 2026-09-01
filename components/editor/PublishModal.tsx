'use client'

import * as React from 'react'
import { Modal } from '@/components/app/Modal'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Badge } from '@/components/ui/Badge'

export interface PublishModalProps {
  open: boolean
  onClose: () => void
  proposalId: string
  slug: string
  content: any
  brandKitName: string | null
  userRole: string
  onPublished: (result: { status: 'PUBLISHED' | 'PENDING_APPROVAL'; slug: string }) => void
}

function filledSectionsSummary(content: any): string {
  const checks = [
    !!content?.title,
    Array.isArray(content?.packages) && content.packages.length > 0,
    Array.isArray(content?.timeline) && content.timeline.length > 0,
    Array.isArray(content?.terms) && content.terms.length > 0,
    !!content?.paymentSection?.schedule,
  ]
  const filled = checks.filter(Boolean).length
  return `${filled} of ${checks.length}, filled in`
}

export function PublishModal({ open, onClose, proposalId, slug, content, brandKitName, userRole, onPublished }: PublishModalProps) {
  const [stage, setStage] = React.useState<'review' | 'result'>('review')
  const [publishing, setPublishing] = React.useState(false)
  const [error, setError] = React.useState('')
  const [resultStatus, setResultStatus] = React.useState<'PUBLISHED' | 'PENDING_APPROVAL' | null>(null)
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (open) { setStage('review'); setError(''); setCopied(false) }
  }, [open])

  const isDrafter = userRole === 'drafter'
  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/p/${slug}` : `/p/${slug}`

  const rows: [string, string][] = [
    ['Brand kit applied', brandKitName || 'No brand kit selected'],
    ['Sections', filledSectionsSummary(content)],
    ['Client', content?.clientName || 'No client name set'],
    ['Link privacy', 'Anyone with the link can view'],
  ]

  const handlePublish = async () => {
    setPublishing(true)
    setError('')
    try {
      const res = await fetch(`/api/proposals/${proposalId}/publish`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to publish')
      setResultStatus(data.status)
      setStage('result')
      onPublished({ status: data.status, slug: data.slug })
    } catch (err: any) {
      setError(err.message || 'Failed to publish')
    } finally {
      setPublishing(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (stage === 'result') {
    const published = resultStatus === 'PUBLISHED'
    return (
      <Modal open={open} eyebrow={published ? 'Published' : 'Submitted'} title={published ? 'Your proposal is live' : 'Sent for approval'} onClose={onClose} width={540}
        footer={
          <>
            <span style={{ flex: 1 }} />
            <Button variant="ghost" onClick={onClose}>Done</Button>
            {published && <Button variant="primary" icon="link" onClick={handleCopy}>{copied ? 'Copied' : 'Copy link'}</Button>}
          </>
        }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '6px 0 4px' }}>
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', width: 54, height: 54, borderRadius: '50%',
              background: 'var(--brand-deep)', color: 'var(--text-inverse)', boxShadow: 'var(--shadow-brand-lg)',
              animation: 'pop-in 520ms var(--ease-spring) both',
            }}><Icon name="check" size={24} color="#fff" /></span>
          </div>
          {published ? (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '13px 15px', borderRadius: 'var(--radius-sm)',
                background: 'var(--brand-12)', border: '1px solid var(--brand-38)', fontSize: 'var(--text-sm)', color: 'var(--brand-ink)',
              }}>
                <Icon name="link" size={15} color="var(--brand-deep)" />{publicUrl}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Badge tone="sent">Sent</Badge>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>You&apos;ll be notified the moment they open it.</span>
              </div>
            </>
          ) : (
            <p style={{ textAlign: 'center', fontSize: 'var(--text-body)', color: 'var(--text-secondary)' }}>
              This proposal has been sent to your account&apos;s owner or an approver for review. It&apos;ll go live as soon as they publish it.
            </p>
          )}
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} eyebrow="Publish" title={`Ready to ${isDrafter ? 'submit to' : 'send to'}${content?.clientName ? ` ${content.clientName}` : ''}?`} onClose={onClose} width={540}
      footer={
        <>
          <span style={{ flex: 1 }} />
          <Button variant="ghost" onClick={onClose} disabled={publishing}>Keep editing</Button>
          <Button variant="primary" icon="send" onClick={handlePublish} loading={publishing}>
            {isDrafter ? 'Submit for approval' : 'Publish & get link'}
          </Button>
        </>
      }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 'var(--radius-sm)', background: 'var(--glass-card)', border: '1px solid var(--border-hairline)' }}>
            <Icon name="check" size={15} color="var(--brand-deep)" />
            <span style={{ flex: 1, fontSize: 'var(--text-body)' }}>{k}</span>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{v}</span>
          </div>
        ))}
        {error && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--status-caution-text)' }}>{error}</p>}
        <p style={{ marginTop: 6, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          {isDrafter
            ? "Submitting sends this to your account's owner or an approver — they'll publish it from here."
            : "Publishing creates a public link. You'll be notified the moment your client opens it."}
        </p>
      </div>
    </Modal>
  )
}
