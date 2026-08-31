'use client'

import * as React from 'react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { FilterChip } from '@/components/ui/FilterChip'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { createClient } from '@/lib/supabase/client'
import { updateAccountName, updatePaymentDetails, markNotificationRead, markAllNotificationsRead } from './actions'

type Account = { id: string; name: string; payment_upi_id: string | null; payment_link: string | null; payment_qr_url: string | null } | null
type Notification = { id: string; message: string; read: boolean; created_at: string }
type ApiKey = { id: string; name: string; key_prefix: string; created_at: string; revoked_at: string | null }

const TABS = ['Account', 'Notifications', 'Payment details', 'API keys'] as const

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
      {tab === 'Payment details' && <PaymentTab account={account} />}
      {tab === 'API keys' && <ApiKeysTab initialKeys={apiKeys} />}
    </div>
  )
}

function AccountTab({ account, userEmail }: { account: Account; userEmail: string }) {
  const [name, setName] = React.useState(account?.name || '')
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)

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

/**
 * Marg never processes payments. Ported from ui_kits/app/Settings.jsx's PaymentTab — the info
 * banner copy is exact. Fields autosave (debounced) since the source has no visible Save
 * button for them; only the QR row's "Upload QR" action is a real button in the design.
 */
function PaymentTab({ account }: { account: Account }) {
  const [upiId, setUpiId] = React.useState(account?.payment_upi_id || '')
  const [paymentLink, setPaymentLink] = React.useState(account?.payment_link || '')
  const [qrUrl, setQrUrl] = React.useState(account?.payment_qr_url || '')
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleSave = (next: { upiId?: string; paymentLink?: string; qrUrl?: string }) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      updatePaymentDetails({
        upi_id: next.upiId ?? upiId,
        payment_link: next.paymentLink ?? paymentLink,
        qr_url: next.qrUrl ?? qrUrl,
      })
    }, 700)
  }

  const handleUploadClick = () => fileInputRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !account) return
    setUploading(true)
    setError(null)
    try {
      const supabase = createClient()
      const path = `${account.id}/payment-qr.${file.name.split('.').pop() || 'png'}`
      const { error: uploadError } = await supabase.storage.from('public-assets').upload(path, file, { upsert: true })
      if (uploadError) throw new Error(uploadError.message)
      const { data } = supabase.storage.from('public-assets').getPublicUrl(path)
      setQrUrl(data.publicUrl)
      await updatePaymentDetails({ upi_id: upiId, payment_link: paymentLink, qr_url: data.publicUrl })
    } catch (err: any) {
      setError(err.message || 'Failed to upload QR code')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <Card padding={24} style={{ marginBottom: 18 }}>
      <div style={{ marginBottom: 18 }}>
        <h3 style={{ fontSize: 'var(--text-h4)' }}>Payment display</h3>
        <p style={{ marginTop: 5, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Marg shows these details to your client. We do not process, track or confirm payments.
        </p>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 'var(--radius-sm)',
        background: 'var(--glass-card)', border: '1px solid var(--border-hairline)', marginBottom: 18,
      }}>
        <Icon name="info" size={16} />
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          Display only — mark a proposal as paid yourself once the money lands.
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 14 }}>
        <Input
          label="UPI ID"
          placeholder="you@okhdfc"
          value={upiId}
          onChange={(e) => { setUpiId(e.target.value); scheduleSave({ upiId: e.target.value }) }}
        />
        <Input
          label="Payment link (optional)"
          placeholder="https://…"
          value={paymentLink}
          onChange={(e) => { setPaymentLink(e.target.value); scheduleSave({ paymentLink: e.target.value }) }}
        />
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, marginTop: 18, padding: 16, borderRadius: 'var(--radius-sm)',
        border: '1px dashed var(--border-strong)',
      }}>
        {qrUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrUrl} alt="Payment QR code" width={40} height={40} style={{ borderRadius: 6, flex: 'none' }} />
        ) : (
          <Icon name="qr-code" size={40} />
        )}
        <div>
          <div style={{ fontSize: 'var(--text-body)', fontWeight: 500 }}>QR code</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Upload the QR your bank app generates — we show it in the Payment section.
          </div>
        </div>
        <span style={{ flex: 1 }} />
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        <Button variant="secondary" size="sm" icon="upload" onClick={handleUploadClick} loading={uploading}>Upload QR</Button>
      </div>
      {error && <p style={{ marginTop: 12, fontSize: 'var(--text-sm)', color: 'var(--status-caution-text)' }}>{error}</p>}
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
