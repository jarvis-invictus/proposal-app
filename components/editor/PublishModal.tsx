'use client'

import * as React from 'react'
import { Modal } from '@/components/app/Modal'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { getPublicProposalUrl } from '@/lib/publicUrl'

export interface PublishModalProps {
  open: boolean
  onClose: () => void
  proposalId: string
  slug: string
  content: any
  brandKitName: string | null
  userRole: string
  proposalStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'PENDING_APPROVAL'
  initialHasPassword: boolean
  /** The account's branded subdomain, if set — see Settings → Custom domain → "Your Marg link". */
  accountSubdomain?: string | null
  /** Cancels any pending autosave and saves the current in-memory content immediately, awaited
   * before publish/submit actually fires — without this, publishing right after an edit (or
   * while the last autosave is still mid-flight or has already failed) can lock in whatever
   * content last reached the DB, not what's on screen. Returns whether the save succeeded. */
  onBeforePublish: () => Promise<boolean>
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
  return `${filled} of ${checks.length} complete`
}

/** Password protection controls — shown in both the pre-publish review stage and the post-publish
 * manage stage, since privacy can be set/changed independent of the publish transition itself.
 * Owns its own save action rather than piggybacking on the Publish button, so it works before
 * ever publishing and any time after without re-publishing. */
function PasswordProtectionField({ proposalId, initialHasPassword }: { proposalId: string; initialHasPassword: boolean }) {
  const [enabled, setEnabled] = React.useState(initialHasPassword)
  const [password, setPassword] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')
  const [saved, setSaved] = React.useState(false)
  const [hasPassword, setHasPassword] = React.useState(initialHasPassword)

  const dirty = enabled !== hasPassword || (enabled && password.trim().length > 0)

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const body = enabled ? { password: password.trim() || null } : { password: null }
      if (enabled && !password.trim() && !hasPassword) {
        throw new Error('Enter a password')
      }
      const res = await fetch(`/api/proposals/${proposalId}/password`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setHasPassword(data.hasPassword)
      setPassword('')
      setSaved(true)
    } catch (err: any) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '13px 15px', borderRadius: 'var(--radius-sm)', background: 'var(--glass-card)', border: '1px solid var(--border-hairline)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon name="lock" size={15} color="var(--brand-deep)" />
        <span style={{ flex: 1, fontSize: 'var(--text-body)' }}>Require a password to view</span>
        <Switch checked={enabled} onChange={() => { setEnabled((v) => !v); setSaved(false) }} size="sm" />
      </div>
      {enabled && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Input
              type="password"
              size="sm"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setSaved(false) }}
              placeholder={hasPassword ? 'Leave blank to keep current password' : 'Choose a password'}
            />
          </div>
          <Button variant="secondary" size="sm" onClick={handleSave} loading={saving} disabled={!dirty}>Save</Button>
        </div>
      )}
      {!enabled && hasPassword !== enabled && (
        <Button variant="secondary" size="sm" onClick={handleSave} loading={saving} style={{ alignSelf: 'flex-start' }}>Remove password</Button>
      )}
      {error && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--status-caution-text)', margin: 0 }}>{error}</p>}
      {saved && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--brand-deep)', margin: 0 }}>{hasPassword ? 'Password saved.' : 'Password removed — the link is open to anyone who has it.'}</p>}
    </div>
  )
}

export function PublishModal({
  open, onClose, proposalId, slug, content, brandKitName, userRole, proposalStatus, initialHasPassword,
  accountSubdomain, onBeforePublish, onPublished,
}: PublishModalProps) {
  const [stage, setStage] = React.useState<'review' | 'manage' | 'result'>('review')
  const [publishing, setPublishing] = React.useState(false)
  const [error, setError] = React.useState('')
  const [resultStatus, setResultStatus] = React.useState<'PUBLISHED' | 'PENDING_APPROVAL' | null>(null)
  const [copied, setCopied] = React.useState(false)
  // Real failure mode, must not be silent: the publish route also attempts Core Engine V2
  // generation for beta-enabled accounts, awaited in the same request. aiPageError is only ever
  // set when that was genuinely attempted and failed (see app/api/proposals/[id]/publish/
  // route.ts) — non-beta accounts and accounts where generation isn't attempted get null here,
  // so this is never shown as noise to someone who was never getting the AI page anyway.
  const [aiPageError, setAiPageError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) { setStage(proposalStatus === 'PUBLISHED' ? 'manage' : 'review'); setError(''); setCopied(false) }
  }, [open, proposalStatus])

  const isDrafter = userRole === 'drafter'
  const publicUrl = getPublicProposalUrl(slug, accountSubdomain, typeof window !== 'undefined' ? window.location.origin : '')

  const rows: [string, string][] = [
    ['Brand kit applied', brandKitName || 'No brand kit selected'],
    ['Sections', filledSectionsSummary(content)],
    ['Client', content?.clientName || 'No client name set'],
  ]

  const handlePublish = async () => {
    setPublishing(true)
    setError('')
    try {
      const saved = await onBeforePublish()
      if (!saved) throw new Error("Couldn't save your latest changes — try again before publishing")
      const res = await fetch(`/api/proposals/${proposalId}/publish`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to publish')
      setResultStatus(data.status)
      setAiPageError(data.aiPageError || null)
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

  if (stage === 'manage') {
    return (
      <Modal open={open} eyebrow="Link settings" title="Manage this proposal's link" onClose={onClose} width={540}
        footer={<><span style={{ flex: 1 }} /><Button variant="primary" onClick={onClose}>Done</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '13px 15px', borderRadius: 'var(--radius-sm)',
            background: 'var(--brand-12)', border: '1px solid var(--brand-38)', fontSize: 'var(--text-sm)', color: 'var(--brand-ink)',
          }}>
            <Icon name="link" size={15} color="var(--brand-deep)" style={{ flex: 'none' }} />
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{publicUrl}</span>
            <Button variant="ghost" size="sm" icon="link" onClick={handleCopy}>{copied ? 'Copied' : 'Copy'}</Button>
          </div>
          <PasswordProtectionField proposalId={proposalId} initialHasPassword={initialHasPassword} />
        </div>
      </Modal>
    )
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
            }}><Icon name="check" size={24} color="var(--text-inverse)" /></span>
          </div>
          {published ? (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '13px 15px', borderRadius: 'var(--radius-sm)',
                background: 'var(--brand-12)', border: '1px solid var(--brand-38)', fontSize: 'var(--text-sm)', color: 'var(--brand-ink)',
              }}>
                <Icon name="link" size={15} color="var(--brand-deep)" />{publicUrl}
              </div>
              {aiPageError && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '13px 15px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--status-caution-surface)', border: '1px solid var(--status-caution-border)', fontSize: 'var(--text-sm)', color: 'var(--status-caution-text)',
                }}>
                  <Icon name="triangle-alert" size={15} style={{ marginTop: 1, flex: 'none' }} />
                  <span>The new AI page design didn&apos;t generate this time ({aiPageError}) — your client will see the standard proposal layout instead. The link above is still real and live.</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Badge tone="sent">Sent</Badge>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>You&apos;ll be notified the moment they open it.</span>
              </div>
              <PasswordProtectionField proposalId={proposalId} initialHasPassword={initialHasPassword} />
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
    <Modal open={open} eyebrow="Publish" title={`Ready to ${isDrafter ? 'submit to' : 'send to'}${content?.clientName ? ` ${content.clientName}` : ' your client'}?`} onClose={onClose} width={540}
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
        {!isDrafter && <PasswordProtectionField proposalId={proposalId} initialHasPassword={initialHasPassword} />}
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
