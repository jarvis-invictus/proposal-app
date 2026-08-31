'use client'

import * as React from 'react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { FilterChip } from '@/components/ui/FilterChip'
import { Badge } from '@/components/ui/Badge'
import { COUNTRIES } from '@/lib/countries'
import { updateAccountName, markNotificationRead, markAllNotificationsRead } from './actions'

type Account = { id: string; name: string; billing_country: string | null; payment_provider: string | null; provider_customer_id: string | null } | null
type Notification = { id: string; message: string; read: boolean; created_at: string }
type ApiKey = { id: string; name: string; key_prefix: string; created_at: string; revoked_at: string | null }

const TABS = ['Account', 'Notifications', 'Billing', 'API keys'] as const

export function SettingsClient({ account, userEmail, notifications, apiKeys }: {
  account: Account
  userEmail: string
  notifications: Notification[]
  apiKeys: ApiKey[]
}) {
  const [tab, setTab] = React.useState<typeof TABS[number]>('Account')

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 24px', fontSize: 'var(--text-h2)', fontWeight: 'var(--weight-semibold)', letterSpacing: 'var(--tracking-tight)', color: 'var(--text-primary)' }}>
        Settings
      </h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {TABS.map((t) => (
          <FilterChip key={t} active={tab === t} onClick={() => setTab(t)}>{t}</FilterChip>
        ))}
      </div>

      {tab === 'Account' && <AccountTab account={account} userEmail={userEmail} />}
      {tab === 'Notifications' && <NotificationsTab notifications={notifications} />}
      {tab === 'Billing' && <BillingTab account={account} />}
      {tab === 'API keys' && <ApiKeysTab initialKeys={apiKeys} />}
    </div>
  )
}

function AccountTab({ account, userEmail }: { account: Account; userEmail: string }) {
  const [name, setName] = React.useState(account?.name || '')
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)

  const countryName = COUNTRIES.find((c) => c.code === account?.billing_country)?.name || account?.billing_country || 'Not set'

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await updateAccountName(name)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card padding={24} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Input label="Agency / account name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="Email" value={userEmail} disabled />
      <div>
        <span style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)', marginBottom: 6 }}>
          Billing country
        </span>
        <Badge tone="draft">{countryName}</Badge>
        <p style={{ margin: '8px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          Set at signup — determines your payment provider, so it can&apos;t be changed here.
        </p>
      </div>
      <div>
        <Button variant="primary" onClick={handleSave} loading={saving}>Save changes</Button>
        {saved && <span style={{ marginLeft: 12, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Saved</span>}
      </div>
    </Card>
  )
}

function NotificationsTab({ notifications }: { notifications: Notification[] }) {
  const [items, setItems] = React.useState(notifications)
  const unreadCount = items.filter((n) => !n.read).length

  const handleMarkRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    await markNotificationRead(id)
  }

  const handleMarkAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    await markAllNotificationsRead()
  }

  return (
    <Card padding={24} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        </span>
        {unreadCount > 0 && <Button variant="ghost" size="sm" onClick={handleMarkAll}>Mark all read</Button>}
      </div>
      {items.length === 0 && (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No notifications yet.</p>
      )}
      {items.map((n) => (
        <div key={n.id} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '12px 0',
          borderTop: '1px solid var(--border-hairline)',
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            {!n.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)', marginTop: 6, flex: 'none' }} />}
            <div>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: n.read ? 'var(--text-muted)' : 'var(--text-primary)' }}>{n.message}</p>
              <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{new Date(n.created_at).toLocaleString()}</p>
            </div>
          </div>
          {!n.read && <Button variant="ghost" size="sm" onClick={() => handleMarkRead(n.id)}>Mark read</Button>}
        </div>
      ))}
    </Card>
  )
}

function BillingTab({ account }: { account: Account }) {
  const [customerId, setCustomerId] = React.useState(account?.provider_customer_id || null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const provider = account?.payment_provider

  const handleManageBilling = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/settings/billing/create-customer', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to set up billing')
      setCustomerId(data.providerCustomerId)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card padding={24} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <span style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)', marginBottom: 6 }}>
          Payment provider
        </span>
        <Badge tone={provider ? 'sent' : 'draft'}>{provider === 'razorpay' ? 'Razorpay' : provider === 'skydo' ? 'Skydo' : 'Not set'}</Badge>
        {provider === 'skydo' && (
          <p style={{ margin: '8px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Skydo integration is pending — billing management isn&apos;t available for this provider yet.
          </p>
        )}
      </div>

      {provider === 'razorpay' && (
        <div>
          {customerId ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>Customer record created</span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{customerId}</span>
              <p style={{ margin: '6px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                There&apos;s no subscription on this account yet, so there&apos;s nothing further to self-manage right now.
              </p>
            </div>
          ) : (
            <Button variant="primary" onClick={handleManageBilling} loading={loading}>Manage billing</Button>
          )}
          {error && <p style={{ marginTop: 8, fontSize: 'var(--text-sm)', color: 'var(--status-caution-text)' }}>{error}</p>}
        </div>
      )}
    </Card>
  )
}

function ApiKeysTab({ initialKeys }: { initialKeys: ApiKey[] }) {
  const [keys, setKeys] = React.useState(initialKeys)
  const [name, setName] = React.useState('')
  const [creating, setCreating] = React.useState(false)
  const [revealedKey, setRevealedKey] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const handleCreate = async () => {
    if (!name.trim()) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create key')
      setKeys((prev) => [{ id: data.id, name: data.name, key_prefix: data.key_prefix, created_at: data.created_at, revoked_at: null }, ...prev])
      setRevealedKey(data.key)
      setName('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k)))
    await fetch(`/api/settings/api-keys/${id}`, { method: 'DELETE' })
  }

  return (
    <Card padding={24} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <Input label="New key name" placeholder="e.g. Zapier integration" value={name} onChange={(e) => setName(e.target.value)} wrapperStyle={{ flex: 1 }} />
        <Button variant="primary" onClick={handleCreate} loading={creating} disabled={!name.trim()}>Generate</Button>
      </div>
      {error && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--status-caution-text)' }}>{error}</p>}

      {revealedKey && (
        <div style={{
          padding: 14, borderRadius: 'var(--radius-card)', background: 'var(--status-caution-surface)',
          border: '1px solid var(--status-caution-border)', display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)', color: 'var(--status-caution-text)' }}>
            Copy this now — it won&apos;t be shown again.
          </span>
          <code style={{ fontSize: 'var(--text-sm)', wordBreak: 'break-all' }}>{revealedKey}</code>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {keys.length === 0 && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No API keys yet.</p>}
        {keys.map((k) => (
          <div key={k.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0',
            borderTop: '1px solid var(--border-hairline)',
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)' }}>{k.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{k.key_prefix}…</p>
            </div>
            {k.revoked_at ? (
              <Badge tone="draft">Revoked</Badge>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => handleRevoke(k.id)}>Revoke</Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
