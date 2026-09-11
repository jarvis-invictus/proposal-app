'use client'

import * as React from 'react'
import { AppShell } from '@/components/app/AppShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FilterChip } from '@/components/ui/FilterChip'
import { EmptyState } from '@/components/app/EmptyState'
import { ConfirmDialog } from '@/components/app/ConfirmDialog'
import { Toast, ToastHost, useToasts } from '@/components/ui/Toast'
import { relativeTime } from '@/lib/relativeTime'
import { restoreProposal, permanentlyDeleteProposal } from '../actions'

export type TrashProposal = {
  id: string
  slug: string
  title: string
  client: string
  status: string
  acceptedAt: string | null
  deletedAt: string
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', PENDING_APPROVAL: 'Pending approval', PUBLISHED: 'Published', ARCHIVED: 'Archived',
}

export function TrashClient({ accountName, planLabel, proposals }: { accountName: string; planLabel: string; proposals: TrashProposal[] }) {
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts()
  const [items, setItems] = React.useState(proposals)
  const [signedOnly, setSignedOnly] = React.useState(false)
  const [restoringId, setRestoringId] = React.useState<string | null>(null)
  const [pendingPurge, setPendingPurge] = React.useState<TrashProposal | null>(null)

  const signedCount = items.filter((p) => !!p.acceptedAt).length
  const visible = signedOnly ? items.filter((p) => !!p.acceptedAt) : items

  const handleRestore = async (p: TrashProposal) => {
    setRestoringId(p.id)
    try {
      await restoreProposal(p.id)
      setItems((prev) => prev.filter((item) => item.id !== p.id))
      pushToast('Restored to your proposals')
    } catch (err: any) {
      pushToast(err.message || 'Failed to restore', { tone: 'error' })
    } finally {
      setRestoringId(null)
    }
  }

  const confirmPurge = async () => {
    if (!pendingPurge) return
    const p = pendingPurge
    setPendingPurge(null)
    try {
      await permanentlyDeleteProposal(p.id)
      setItems((prev) => prev.filter((item) => item.id !== p.id))
      pushToast('Permanently deleted')
    } catch (err: any) {
      pushToast(err.message || 'Failed to permanently delete', { tone: 'error' })
    }
  }

  return (
    <AppShell screen="trash" title="Trash" subtitle="Moved here from your proposals — restore anytime, or delete permanently."
      accountName={accountName} planLabel={planLabel}
      actions={items.length > 0 ? (
        <FilterChip active={signedOnly} onClick={() => setSignedOnly((s) => !s)} icon="signature" count={signedCount}>
          Signed only
        </FilterChip>
      ) : undefined}>
      {toasts.length > 0 && (
        <ToastHost>
          {toasts.map((t) => (
            <Toast key={t.id} tone={t.tone} onDismiss={() => dismissToast(t.id)} action={t.action} actionLabel={t.actionLabel}>
              {t.message}
            </Toast>
          ))}
        </ToastHost>
      )}
      {items.length === 0 ? (
        <EmptyState icon="trash-2" title="Trash is empty" description="Proposals you move to Trash from your dashboard will show up here until you restore or permanently delete them." />
      ) : visible.length === 0 ? (
        <EmptyState icon="signature" title="No signed proposals in Trash" description="Nothing here matches the current filter." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 760 }}>
          {visible.map((p) => {
            const signed = !!p.acceptedAt
            return (
              <Card key={p.id} padding={16}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 'var(--text-body)', fontWeight: 500 }}>{p.title}</span>
                      <Badge tone="draft">{STATUS_LABEL[p.status] || p.status}</Badge>
                      {signed && <Badge tone="accepted">Signed</Badge>}
                    </div>
                    <div style={{ marginTop: 3, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                      {p.client} · Moved to Trash {relativeTime(p.deletedAt)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
                    <Button variant="secondary" size="sm" icon="rotate-ccw" loading={restoringId === p.id} onClick={() => handleRestore(p)}>
                      Restore
                    </Button>
                    {signed ? (
                      <Button variant="ghost" size="sm" icon="trash-2" disabled title="Signed proposals can't be permanently deleted">
                        Delete permanently
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" icon="trash-2" onClick={() => setPendingPurge(p)}>
                        Delete permanently
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      <ConfirmDialog
        open={!!pendingPurge}
        title={`Permanently delete "${pendingPurge?.title || 'this proposal'}"?`}
        body="This cannot be undone — the proposal and everything generated for it will be gone for good."
        confirmLabel="Delete permanently"
        onConfirm={confirmPurge}
        onCancel={() => setPendingPurge(null)}
      />
    </AppShell>
  )
}
