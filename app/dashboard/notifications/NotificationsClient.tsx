'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/app/AppShell'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/app/EmptyState'
import { relativeTime } from '@/lib/relativeTime'
import { classifyNotification } from '@/lib/classifyNotification'
import { approveProposal } from '../settings/actions'

export type NotificationRow = {
  id: string
  message: string
  read: boolean
  createdAt: string
  proposalId: string | null
  proposalSlug: string | null
  proposalStatus: string | null
}

const ICON_FOR_KIND: Record<string, string> = { view: 'eye', accepted: 'check', approval: 'clock', other: 'bell' }

export function NotificationsClient({
  accountName, planLabel, notifications, myRole,
}: {
  accountName: string
  planLabel: string
  notifications: NotificationRow[]
  myRole: string
}) {
  const router = useRouter()
  const [items, setItems] = React.useState(notifications)
  const [approvingId, setApprovingId] = React.useState<string | null>(null)
  const canApprove = myRole === 'owner' || myRole === 'approver'

  const markRead = (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(console.error)
  }

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }).catch(console.error)
  }

  const handleApprove = async (n: NotificationRow) => {
    if (!n.proposalId) return
    setApprovingId(n.id)
    try {
      await approveProposal(n.proposalId)
      setItems((prev) => prev.map((item) => (item.proposalId === n.proposalId ? { ...item, proposalStatus: 'PUBLISHED' } : item)))
    } catch (err) {
      console.error(err)
    } finally {
      setApprovingId(null)
    }
  }

  const unreadCount = items.filter((n) => !n.read).length

  return (
    <AppShell screen="notifications" title="Activity" subtitle="Who viewed, accepted, or submitted a proposal — and what needs your attention."
      accountName={accountName} planLabel={planLabel}
      actions={unreadCount > 0 ? <Button variant="ghost" size="sm" icon="check-check" onClick={markAllRead}>Mark all read</Button> : undefined}>
      {items.length === 0 ? (
        <EmptyState icon="bell" title="Nothing yet" description="Client views, acceptances, and approval requests will show up here." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 760 }}>
          {items.map((n) => {
            const kind = classifyNotification(n.message)
            const icon = ICON_FOR_KIND[kind]
            const showApprove = kind === 'approval' && canApprove && n.proposalStatus === 'PENDING_APPROVAL'
            return (
              <Card key={n.id} padding={16} interactive onClick={() => !n.read && markRead(n.id)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, flex: 'none',
                    borderRadius: 'var(--radius-pill)', background: n.read ? 'var(--brand-12)' : 'var(--brand-deep)', color: n.read ? 'var(--brand-deep)' : '#fff',
                  }}>
                    <Icon name={icon} size={16} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 'var(--text-body)', fontWeight: 500 }}>{n.message}</span>
                      {!n.read && <Badge tone="new">New</Badge>}
                    </div>
                    <div style={{ marginTop: 3, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{relativeTime(n.createdAt)}</div>
                  </div>
                  {showApprove && (
                    <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
                      {n.proposalId && (
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/proposals/${n.proposalId}/edit`) }}>
                          Review
                        </Button>
                      )}
                      <Button variant="primary" size="sm" icon="check" loading={approvingId === n.id}
                        onClick={(e) => { e.stopPropagation(); handleApprove(n) }}>
                        Approve &amp; publish
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}
