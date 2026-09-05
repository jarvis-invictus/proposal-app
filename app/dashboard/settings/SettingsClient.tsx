'use client'

import * as React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { FilterChip } from '@/components/ui/FilterChip'
import { Badge } from '@/components/ui/Badge'
import { Pill } from '@/components/ui/Pill'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { Modal } from '@/components/app/Modal'
import { Toast, ToastHost, useToasts } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { validateSubdomain } from '@/lib/publicUrl'
import {
  updateUserProfile, updateBusinessDetails, updatePaymentDetails, updateAvatarUrl,
  inviteMember, changeMemberRole, approveProposal, requestChanges,
  connectDomain, buyDomainSlot, switchPlan, updateCurrency, updateSubdomain,
} from './actions'

type Account = {
  id: string; name: string
  business_address: string | null; gstin: string | null; default_validity_days: number
  payment_upi_id: string | null; payment_link: string | null; payment_qr_url: string | null
  plan_tier: 'free' | 'pay_per_proposal' | 'agency'; extra_domain_slots: number
  currency: 'USD' | 'EUR' | 'INR'
  stripe_customer_id: string | null; stripe_subscription_id: string | null; stripe_price_id: string | null
  billing_status: 'free' | 'trialing' | 'active' | 'past_due' | 'canceled'
  subdomain: string | null
} | null
type Member = { id: string; role: string; avatar_url: string | null; email: string }
type Invitation = { id: string; email: string; role: string; invited_at: string; accepted_at: string | null }
type PendingApproval = { id: string; title: string; submittedByEmail: string; submittedAt: string }
type RecentApproval = { id: string; title: string; approvedByEmail: string; approvedAt: string }
type Domain = { id: string; domain_name: string; cname_verified: boolean; ssl_issued: boolean }

const TABS = [
  { id: 'profile', label: 'Profile & business', icon: 'user' },
  { id: 'payment', label: 'Payment details', icon: 'qr-code' },
  { id: 'team', label: 'Team', icon: 'users' },
  { id: 'domains', label: 'Custom domain', icon: 'globe' },
  { id: 'billing', label: 'Plan & billing', icon: 'credit-card' },
] as const

const ROLE_LABEL: Record<string, string> = { owner: 'Owner', approver: 'Approver', drafter: 'Drafter' }
const PLAN_SLOTS: Record<string, number> = { free: 0, pay_per_proposal: 1, agency: 3 }
const PLAN_NAME: Record<string, string> = { free: 'Free', pay_per_proposal: 'Pay per proposal', agency: 'Agency' }

function initialsOf(email: string) {
  return (email || '?').slice(0, 2).toUpperCase()
}

export function SettingsClient({ account, userEmail, myRole, members, invitations, pendingApprovals, recentApprovals, sharedItems, domains }: {
  account: Account
  userEmail: string
  myRole: string
  members: Member[]
  invitations: Invitation[]
  pendingApprovals: PendingApproval[]
  recentApprovals: RecentApproval[]
  sharedItems: { kits: string[]; templates: string[] }
  domains: Domain[]
}) {
  type TabId = typeof TABS[number]['id']
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // The tab lives in the URL (?tab=...), not just component state — previously a refresh or a
  // shared link always landed on "Profile & business" no matter which tab you were actually on,
  // and Back left the whole page instead of the tab you came from. `replace` (not `push`) so five
  // tab clicks don't turn into five stops on the back button — only the current tab is meant to
  // be linkable/refreshable, not a full click-by-click history.
  const tabFromUrl = TABS.find((t) => t.id === searchParams.get('tab'))?.id as TabId | undefined
  const [tab, setTabState] = React.useState<TabId>(tabFromUrl ?? 'profile')
  React.useEffect(() => {
    if (tabFromUrl && tabFromUrl !== tab) setTabState(tabFromUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the URL changing (e.g. browser back/forward), not to our own setTab below
  }, [tabFromUrl])

  const setTab = (id: TabId) => {
    setTabState(id)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', id)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const tabRefs = React.useRef<Record<TabId, HTMLButtonElement | null>>({} as Record<TabId, HTMLButtonElement | null>)
  const handleTabListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const i = TABS.findIndex((t) => t.id === tab)
    const next = TABS[(i + (e.key === 'ArrowDown' ? 1 : TABS.length - 1)) % TABS.length]
    setTab(next.id)
    tabRefs.current[next.id]?.focus()
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '232px minmax(0,1fr)', gap: 26, maxWidth: 1060, margin: '0 auto' }}>
      <div>
        <nav role="tablist" aria-label="Settings sections" aria-orientation="vertical" onKeyDown={handleTabListKeyDown}
          style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {TABS.map((t) => (
            <TabRow key={t.id} ref={(el) => { tabRefs.current[t.id] = el }} id={t.id} label={t.label} icon={t.icon}
              active={tab === t.id} onClick={() => setTab(t.id)} />
          ))}
        </nav>
      </div>
      {/* key={tab} remounts this wrapper on every switch so the fade-up animation actually
          replays — previously a tab switch hard-cut between panels with no transition at all. */}
      <div key={tab} role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0}
        style={{ animation: 'fade-up var(--duration-base) var(--ease-standard) both', outline: 'none' }}>
        {tab === 'profile' && <ProfileTab account={account} userEmail={userEmail} />}
        {tab === 'payment' && <PaymentTab account={account} />}
        {tab === 'team' && (
          <TeamTab
            members={members} invitations={invitations}
            pendingApprovals={pendingApprovals} recentApprovals={recentApprovals}
            sharedItems={sharedItems}
          />
        )}
        {tab === 'domains' && <DomainTab account={account} domains={domains} onSeePlan={() => setTab('billing')} />}
        {tab === 'billing' && <BillingTab account={account} />}
      </div>
    </div>
  )
}

const TabRow = React.forwardRef<HTMLButtonElement, { id: string; label: string; icon: string; active: boolean; onClick: () => void }>(
  function TabRow({ id, label, icon, active, onClick }, ref) {
    const [hover, setHover] = React.useState(false)
    return (
      <button ref={ref} type="button" role="tab" id={`tab-${id}`} aria-selected={active} aria-controls={`panel-${id}`}
        tabIndex={active ? 0 : -1} onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: 'none', borderRadius: 'var(--radius-sm)',
        background: active ? 'var(--ink-06)' : hover ? 'var(--ink-04)' : 'transparent', cursor: 'pointer', textAlign: 'left',
        fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)', color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontWeight: active ? 'var(--weight-medium)' : 'var(--weight-regular)',
      }}>
        <Icon name={icon} size={16} />{label}
      </button>
    )
  }
)

function Section({ title, description, children, footer }: { title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <Card padding={24} style={{ marginBottom: 18 }}>
      <div style={{ marginBottom: 18 }}>
        <h3 style={{ fontSize: 'var(--text-h4)' }}>{title}</h3>
        {description && <p style={{ marginTop: 5, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{description}</p>}
      </div>
      {children}
      {footer && <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10 }}>{footer}</div>}
    </Card>
  )
}

async function uploadToPublicAssets(accountId: string, file: File, pathSuffix: string) {
  const supabase = createClient()
  const ext = file.name.split('.').pop() || 'png'
  const path = `${accountId}/${pathSuffix}.${ext}`
  const { error } = await supabase.storage.from('public-assets').upload(path, file, { upsert: true })
  if (error) throw new Error(error.message)
  return supabase.storage.from('public-assets').getPublicUrl(path).data.publicUrl
}

function ProfileTab({ account, userEmail }: { account: Account; userEmail: string }) {
  const [fullName, setFullName] = React.useState('')
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false)
  const avatarInputRef = React.useRef<HTMLInputElement>(null)

  const [businessName, setBusinessName] = React.useState(account?.name || '')
  const [address, setAddress] = React.useState(account?.business_address || '')
  const [gstin, setGstin] = React.useState(account?.gstin || '')
  const [validity, setValidity] = React.useState(String(account?.default_validity_days ?? 30))
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [savingProfile, setSavingProfile] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !account) return
    setUploadingAvatar(true)
    setError(null)
    try {
      const url = await uploadToPublicAssets(account.id, file, 'avatar')
      setAvatarUrl(url)
      await updateAvatarUrl(url)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      await updateUserProfile(fullName || userEmail)
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSaveBusiness = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await updateBusinessDetails({ name: businessName, business_address: address, gstin, default_validity_days: Number(validity) || 30 })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Section title="Your profile" description="Shown on every proposal you send.">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" width={56} height={56} style={{ borderRadius: 'var(--radius-pill)', objectFit: 'cover' }} />
          ) : (
            <span style={{
              width: 56, height: 56, borderRadius: 'var(--radius-pill)', background: 'var(--brand-deep)', color: 'var(--text-inverse)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, fontWeight: 600,
            }}>{initialsOf(fullName || userEmail)}</span>
          )}
          <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
          <Button variant="secondary" size="sm" icon="upload" onClick={() => avatarInputRef.current?.click()} loading={uploadingAvatar}>Upload a photo</Button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 14 }}>
          <Input label="Full name" placeholder="Jane Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} onBlur={handleSaveProfile} />
          <Input label="Email" value={userEmail} disabled />
        </div>
        {savingProfile && <p style={{ marginTop: 8, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Saving…</p>}
      </Section>

      <Section title="Appearance" description="Dark mode follows your system by default. Override it here — the proposal your client sees always stays light.">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['Light', 'Dark', 'Follow system'].map((mode) => (
              <FilterChip key={mode} active={mode === 'Follow system'} disabled>{mode}</FilterChip>
            ))}
          </div>
          <Badge tone="draft">Coming soon</Badge>
        </div>
      </Section>

      <Section
        title="Business details"
        description="Used in the header and terms of every proposal."
        footer={<><Button variant="primary" size="sm" onClick={handleSaveBusiness} loading={saving}>Save changes</Button>{saved && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Saved</span>}</>}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 14 }}>
          <Input label="Business name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          <Input label="Registered address" value={address} onChange={(e) => setAddress(e.target.value)} />
          <Input label="GSTIN / Tax ID" value={gstin} onChange={(e) => setGstin(e.target.value)} />
          <Input label="Default proposal validity (days)" type="number" value={validity} onChange={(e) => setValidity(e.target.value)} />
        </div>
      </Section>
      {error && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--status-caution-text)' }}>{error}</p>}
    </>
  )
}

/** Ported from ui_kits/app/Settings.jsx's PaymentTab — the info banner copy is exact. */
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
      updatePaymentDetails({ upi_id: next.upiId ?? upiId, payment_link: next.paymentLink ?? paymentLink, qr_url: next.qrUrl ?? qrUrl })
    }, 700)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !account) return
    setUploading(true)
    setError(null)
    try {
      const url = await uploadToPublicAssets(account.id, file, 'payment-qr')
      setQrUrl(url)
      await updatePaymentDetails({ upi_id: upiId, payment_link: paymentLink, qr_url: url })
    } catch (err: any) {
      setError(err.message || 'Failed to upload QR code')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <Section title="Payment display" description="Marg shows these details to your client. We do not process, track or confirm payments.">
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 'var(--radius-sm)',
        background: 'var(--glass-card)', border: '1px solid var(--border-hairline)', marginBottom: 18,
      }}>
        <Icon name="info" size={16} />
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Display only — mark a proposal as paid yourself once the money lands.</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 14 }}>
        <Input label="UPI ID" placeholder="you@okhdfc" value={upiId} onChange={(e) => { setUpiId(e.target.value); scheduleSave({ upiId: e.target.value }) }} />
        <Input label="Payment link (optional)" placeholder="https://…" value={paymentLink} onChange={(e) => { setPaymentLink(e.target.value); scheduleSave({ paymentLink: e.target.value }) }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 18, padding: 16, borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-strong)' }}>
        {qrUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrUrl} alt="Payment QR code" width={40} height={40} style={{ borderRadius: 6, flex: 'none' }} />
        ) : (
          <Icon name="qr-code" size={40} />
        )}
        <div>
          <div style={{ fontSize: 'var(--text-body)', fontWeight: 500 }}>QR code</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Upload the QR your bank app generates — we show it in the Payment section.</div>
        </div>
        <span style={{ flex: 1 }} />
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        <Button variant="secondary" size="sm" icon="upload" onClick={() => fileInputRef.current?.click()} loading={uploading}>Upload QR</Button>
      </div>
      {error && <p style={{ marginTop: 12, fontSize: 'var(--text-sm)', color: 'var(--status-caution-text)' }}>{error}</p>}
    </Section>
  )
}

function TeamTab({ members, invitations, pendingApprovals, recentApprovals, sharedItems }: {
  members: Member[]; invitations: Invitation[]
  pendingApprovals: PendingApproval[]; recentApprovals: RecentApproval[]
  sharedItems: { kits: string[]; templates: string[] }
}) {
  const [invite, setInvite] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState('')
  const [inviteRole, setInviteRole] = React.useState('drafter')
  const [sending, setSending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [busyId, setBusyId] = React.useState<string | null>(null)

  const handleSendInvite = async () => {
    setSending(true)
    setError(null)
    try {
      await inviteMember({ email: inviteEmail, role: inviteRole })
      setInvite(false)
      setInviteEmail('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleRoleChange = async (userId: string, role: string) => {
    setError(null)
    try {
      await changeMemberRole({ userId, role })
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleApprove = async (id: string) => {
    setBusyId(id)
    setError(null)
    try {
      await approveProposal(id)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleRequestChanges = async (id: string) => {
    setBusyId(id)
    setError(null)
    try {
      await requestChanges(id)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const sharedPills = [
    ...sharedItems.kits.map((k) => ({ label: k, icon: 'palette' })),
    ...sharedItems.templates.map((t) => ({ label: t, icon: 'layout-template' })),
  ]

  return (
    <>
      {error && <p style={{ marginBottom: 12, fontSize: 'var(--text-sm)', color: 'var(--status-caution-text)' }}>{error}</p>}

      <Section
        title="Members"
        description="Drafters write proposals. Approvers review and release them. Owners manage billing."
        footer={<Button variant="primary" size="sm" icon="user-plus" onClick={() => setInvite(true)}>Invite a member</Button>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {members.map((m) => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-hairline)', background: 'var(--glass-card)',
            }}>
              <span style={{
                width: 32, height: 32, borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--brand-deep)', color: '#fff', fontSize: 12, fontWeight: 600,
              }}>{initialsOf(m.email)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--text-body)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
              </div>
              <SelectMenu
                style={{ flex: 'none' }}
                value={ROLE_LABEL[m.role] || m.role}
                options={['Owner', 'Approver', 'Drafter']}
                onSelect={(v) => handleRoleChange(m.id, v.toLowerCase())}
              />
            </div>
          ))}
          {invitations.map((inv) => (
            <div key={inv.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-hairline)', background: 'var(--glass-card)',
            }}>
              <span style={{
                width: 32, height: 32, borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--brand-12)', color: 'var(--brand-deep)', fontSize: 12, fontWeight: 600,
              }}>{initialsOf(inv.email)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--text-body)', fontWeight: 500 }}>{inv.email}</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Invited {new Date(inv.invited_at).toLocaleDateString()}</div>
              </div>
              <Badge tone="draft">Pending</Badge>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{ROLE_LABEL[inv.role]}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Approval chain" description="Drafters cannot publish. Their proposals wait here until an approver releases them.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pendingApprovals.length === 0 && recentApprovals.length === 0 && (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Nothing waiting on approval.</p>
          )}
          {pendingApprovals.map((a) => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--ink-45)', background: 'var(--glass-card)',
            }}>
              <Icon name="clock" size={17} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--text-body)', fontWeight: 500 }}>{a.title}</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{a.submittedByEmail} · Submitted {new Date(a.submittedAt).toLocaleString()}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="ghost" size="sm" onClick={() => handleRequestChanges(a.id)} loading={busyId === a.id}>Request changes</Button>
                <Button variant="primary" size="sm" icon="check" onClick={() => handleApprove(a.id)} loading={busyId === a.id}>Approve &amp; send</Button>
              </div>
            </div>
          ))}
          {recentApprovals.map((a) => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-hairline)', background: 'var(--glass-card)',
            }}>
              <Icon name="circle-check-big" size={17} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--text-body)', fontWeight: 500 }}>{a.title}</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Approved by {a.approvedByEmail} · {new Date(a.approvedAt).toLocaleDateString()}</div>
              </div>
              <Badge tone="accepted">Approved</Badge>
            </div>
          ))}
        </div>
      </Section>

      {sharedPills.length > 0 && (
        <Section title="Shared with the team" description="Everyone on the team can use these.">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {sharedPills.map((p, i) => <Pill key={i} tone="solid" size="sm" icon={p.icon}>{p.label}</Pill>)}
          </div>
        </Section>
      )}

      {/* Modal is always rendered, never gated behind `{invite && ...}` — it manages its own
          mount/unmount internally now (see components/app/Modal.tsx) so it can play an exit
          animation instead of vanishing the instant `invite` goes false. The old wrapper div was
          only ever there to force the scrim to cover the viewport, which Modal's own `position:
          fixed` scrim already does directly. */}
      <Modal open={invite} eyebrow="Team" title="Invite a member" onClose={() => setInvite(false)} width={470}
        footer={<><span style={{ flex: 1 }} /><Button variant="ghost" onClick={() => setInvite(false)}>Cancel</Button><Button variant="primary" icon="send" onClick={handleSendInvite} loading={sending} disabled={!inviteEmail.trim()}>Send invitation</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Email address" placeholder="name@studio.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 8 }}>Role</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Drafter', 'Approver', 'Owner'].map((r) => (
                <FilterChip key={r} active={inviteRole === r.toLowerCase()} onClick={() => setInviteRole(r.toLowerCase())}>{r}</FilterChip>
              ))}
            </div>
            <p style={{ marginTop: 10, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Drafters write and submit for approval. They cannot publish or change billing.</p>
          </div>
        </div>
      </Modal>
    </>
  )
}

function DomainTab({ account, domains, onSeePlan }: { account: Account; domains: Domain[]; onSeePlan: () => void }) {
  const planTier = account?.plan_tier || 'free'
  const slots = (PLAN_SLOTS[planTier] || 0) + (account?.extra_domain_slots || 0)
  const used = domains.length
  const [connect, setConnect] = React.useState(false)
  const [buy, setBuy] = React.useState(false)
  const [domainName, setDomainName] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'your-root-domain.com'
  const [subdomainInput, setSubdomainInput] = React.useState(account?.subdomain || '')
  const [subdomainSaving, setSubdomainSaving] = React.useState(false)
  const [subdomainSaved, setSubdomainSaved] = React.useState(false)
  const [subdomainError, setSubdomainError] = React.useState<string | null>(null)

  const handleSaveSubdomain = async () => {
    setSubdomainSaving(true)
    setSubdomainError(null)
    setSubdomainSaved(false)
    const clientError = validateSubdomain(subdomainInput)
    if (clientError) {
      setSubdomainError(clientError)
      setSubdomainSaving(false)
      return
    }
    try {
      await updateSubdomain(subdomainInput)
      setSubdomainSaved(true)
      setTimeout(() => setSubdomainSaved(false), 2500)
    } catch (err: any) {
      setSubdomainError(err.message)
    } finally {
      setSubdomainSaving(false)
    }
  }

  const handleConnect = async () => {
    setBusy(true)
    setError(null)
    try {
      await connectDomain(domainName)
      setConnect(false)
      setDomainName('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleBuySlot = async () => {
    setBusy(true)
    try {
      await buyDomainSlot()
      setBuy(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Section
        title="Your Marg link"
        description="Free on every plan — no DNS setup needed. Give your proposals a branded link instead of a shared one."
        footer={<Button variant="primary" size="sm" loading={subdomainSaving} disabled={subdomainInput.trim() === (account?.subdomain || '')} onClick={handleSaveSubdomain}>
          {subdomainSaved ? 'Saved' : 'Save'}
        </Button>}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Input
              value={subdomainInput}
              onChange={(e) => setSubdomainInput(e.target.value.toLowerCase())}
              placeholder="yourstudio"
              error={subdomainError || undefined}
            />
          </div>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>.{rootDomain}</span>
        </div>
        {!process.env.NEXT_PUBLIC_ROOT_DOMAIN && (
          <p style={{ marginTop: 10, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            No root domain configured yet — this link will start working once one is set up and connected in Vercel. Saving now still reserves your name.
          </p>
        )}
      </Section>

      <Section
        title="Custom domain"
        description={`The ${PLAN_NAME[planTier]} plan includes ${slots} connected domain${slots === 1 ? '' : 's'}. Proposals are served from your domain instead of marg.app.`}
        footer={<>
          <Button variant="primary" size="sm" icon="plus" disabled={used >= slots} onClick={() => setConnect(true)}>Connect a domain</Button>
          <Button variant="secondary" size="sm" icon="shopping-bag" onClick={() => setBuy(true)}>Buy another slot</Button>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{used} of {slots} slots used</span>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {domains.map((d) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)', background: 'var(--glass-card)' }}>
              <Icon name="globe" size={17} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--text-body)', fontWeight: 500 }}>{d.domain_name}</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{d.cname_verified ? 'CNAME verified' : 'Awaiting CNAME verification'} · {d.ssl_issued ? 'SSL issued' : 'SSL pending'}</div>
              </div>
              <Badge tone={d.cname_verified && d.ssl_issued ? 'accepted' : 'draft'}>{d.cname_verified && d.ssl_issued ? 'Live' : 'Pending'}</Badge>
              <IconButton icon="more-horizontal" label="Domain options" />
            </div>
          ))}
          {used < slots && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-strong)' }}>
              <Icon name="plus" size={17} color="var(--text-muted)" />
              <div style={{ flex: 1, fontSize: 'var(--text-body)', color: 'var(--text-muted)' }}>{slots - used} slot{slots - used === 1 ? '' : 's'} still free on the {PLAN_NAME[planTier]} plan</div>
            </div>
          )}
        </div>
      </Section>

      <Section title="How slots work" description="Domain slots are tied to your plan.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[['free', 'No custom domain — proposals live on marg.app'], ['pay_per_proposal', '1 connected domain'], ['agency', '3 connected domains, buy more as an add-on']].map(([p, d]) => (
            <div key={p} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 'var(--radius-sm)',
              border: '1px solid ' + (p === planTier ? 'var(--brand)' : 'var(--border-hairline)'),
              background: p === planTier ? 'var(--brand-12)' : 'transparent',
            }}>
              <span style={{ width: 126, fontSize: 'var(--text-body)', fontWeight: 500 }}>{PLAN_NAME[p]}</span>
              <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{d}</span>
              {p === planTier ? <Badge tone="accepted">Your plan</Badge> : <Button variant="ghost" size="sm" onClick={onSeePlan}>See plan</Button>}
            </div>
          ))}
        </div>
      </Section>

      {error && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--status-caution-text)' }}>{error}</p>}

      <Modal open={connect} eyebrow="Custom domain" title="Connect a domain" onClose={() => setConnect(false)} width={440}
        footer={<><span style={{ flex: 1 }} /><Button variant="ghost" onClick={() => setConnect(false)}>Cancel</Button><Button variant="primary" onClick={handleConnect} loading={busy} disabled={!domainName.trim()}>Connect</Button></>}>
        <Input label="Domain" placeholder="proposals.yourstudio.com" value={domainName} onChange={(e) => setDomainName(e.target.value)} />
        <p style={{ marginTop: 10, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>You&apos;ll need to point a CNAME at marg.app — verification isn&apos;t automated yet, so this records the domain as requested.</p>
      </Modal>
      <Modal open={buy} eyebrow="Add-on" title="Buy an extra domain slot" onClose={() => setBuy(false)} width={440}
        footer={<><span style={{ flex: 1 }} /><Button variant="ghost" onClick={() => setBuy(false)}>Cancel</Button><Button variant="primary" onClick={handleBuySlot} loading={busy}>Add for ₹299/mo</Button></>}>
        <p style={{ fontSize: 'var(--text-body)', color: 'var(--text-secondary)' }}>Extra slots are billed monthly alongside your Agency plan and can be removed at any time.</p>
      </Modal>
    </>
  )
}

const PLANS = [
  { tier: 'free', name: 'Free', price: '₹0', amountInr: 0, cadence: 'forever', domains: 'No custom domain', lines: ['1 active proposal', 'Full AI generation and brand kit', 'No credit card required'] },
  { tier: 'pay_per_proposal', name: 'Pay per proposal', price: '₹249', amountInr: 249, cadence: 'per proposal', domains: '1 custom domain', lines: ['No subscription', 'Pay only when you publish', 'View tracking'], flag: 'Most flexible' },
  { tier: 'agency', name: 'Agency', price: '₹999', amountInr: 999, cadence: 'per month', domains: '3 custom domains', lines: ['Unlimited proposals', 'Team members and approval chain', 'Priority support'] },
] as const

const CURRENCIES = [
  { code: 'USD', label: 'US Dollar' },
  { code: 'EUR', label: 'Euro' },
  { code: 'INR', label: 'Indian Rupee' },
] as const

function ProposalCurrencySection({ account }: { account: Account }) {
  const current = account?.currency || 'USD'
  const [saving, setSaving] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const handlePick = async (code: string) => {
    if (code === current) return
    setSaving(code)
    setError(null)
    try {
      await updateCurrency(code)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(null)
    }
  }

  return (
    <Section title="Proposal currency" description="The currency shown on the proposals you send to your clients. This is separate from your Marg subscription price below, which is billed in ₹.">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {CURRENCIES.map((c) => (
          <FilterChip key={c.code} active={c.code === current} onClick={() => handlePick(c.code)}>
            {saving === c.code ? 'Saving…' : `${c.code} — ${c.label}`}
          </FilterChip>
        ))}
      </div>
      {error && <p style={{ marginTop: 10, fontSize: 'var(--text-sm)', color: 'var(--status-caution-text)' }}>{error}</p>}
    </Section>
  )
}

function BillingTab({ account }: { account: Account }) {
  const currentTier = account?.plan_tier || 'free'
  const [switching, setSwitching] = React.useState<string | null>(null)
  const [checkingOut, setCheckingOut] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts()
  const [subscribeTier, setSubscribeTier] = React.useState<(typeof PLANS)[number] | null>(null)

  const handleSwitch = async (tier: string) => {
    setSwitching(tier)
    setError(null)
    try {
      await switchPlan(tier)
      setSubscribeTier(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSwitching(null)
    }
  }

  const handleCheckout = async (tier: string) => {
    setCheckingOut(tier)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_tier: tier }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout failed')
      window.location.href = data.checkout_url
      // Deliberately no finally-reset of checkingOut here — the browser is about to navigate
      // away to Stripe, so leaving the button in its loading state avoids a flash back to
      // "Subscribe" during that instant.
    } catch (err: any) {
      // Surface the real reason — /api/billing/checkout returns a specific error for every
      // rejection path (missing keys locally, a bad price id, a Stripe API error), and a
      // hardcoded "not configured" message here would lie about any failure other than that one.
      pushToast(err.message || 'Checkout failed — please try again.', { tone: 'error' })
      setCheckingOut(null)
    }
  }

  return (
    <>
      <ProposalCurrencySection account={account} />
      <Section title="Your plan" description="Domain slots, team seats and branding all follow the plan you pick.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
          {PLANS.map((p) => {
            const isCurrent = p.tier === currentTier
            const isPaid = p.amountInr > 0
            return (
              <div key={p.tier} style={{
                display: 'flex', flexDirection: 'column', gap: 10, padding: 18, borderRadius: 'var(--radius-card)',
                border: '1px solid ' + (isCurrent ? 'var(--brand)' : 'var(--border-hairline)'),
                background: isCurrent ? 'var(--brand-12)' : 'var(--glass-nav-hover)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 'var(--text-body-lg)', fontWeight: 600 }}>{p.name}</span>
                  {isCurrent && <Badge tone="accepted">Current</Badge>}
                  {'flag' in p && p.flag && <Badge tone="new">{p.flag}</Badge>}
                </div>
                <div><span style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>{p.price}</span>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}> {p.cadence}</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  <Icon name="globe" size={14} color="var(--brand-deep)" />{p.domains}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
                  {p.lines.map((l) => <span key={l} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}><Icon name="check" size={13} style={{ marginTop: 3 }} />{l}</span>)}
                </div>
                <span style={{ flex: 1 }} />
                {/* Stripe checkout is disabled while Marg moves to a different, India-friendly
                    billing provider (docs/DECISION_LOG.md, Sep 4 2026) — re-enable once that
                    provider is wired up; the checkout flow below is left intact for that. */}
                <Button variant="secondary" size="sm" fullWidth disabled={isCurrent || isPaid} loading={switching === p.tier || checkingOut === p.tier}
                  onClick={() => (isPaid ? setSubscribeTier(p) : handleSwitch(p.tier))}>
                  {isCurrent ? 'Your plan' : isPaid ? 'Coming soon' : 'Switch to this'}
                </Button>
              </div>
            )
          })}
        </div>
        {error && <p style={{ marginTop: 12, fontSize: 'var(--text-sm)', color: 'var(--status-caution-text)' }}>{error}</p>}
      </Section>
      <Section title="Billing" description="No payment processor is connected yet, so there's nothing to charge or invoice." footer={<Button variant="secondary" size="sm" icon="credit-card" disabled>Update payment method</Button>}>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No invoices yet.</p>
      </Section>

      {subscribeTier && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60 }}>
          <Modal open={!!subscribeTier} eyebrow="Subscribe" title={`Upgrade to ${subscribeTier.name}`} onClose={() => setSubscribeTier(null)} width={480}
            footer={<>
              <span style={{ flex: 1 }} />
              <Button variant="ghost" onClick={() => setSubscribeTier(null)}>Cancel</Button>
              <Button variant="primary" loading={checkingOut === subscribeTier.tier} onClick={() => handleCheckout(subscribeTier.tier)}>Continue to Stripe</Button>
            </>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                You&apos;ll be redirected to Stripe to complete checkout securely. Your plan updates automatically once payment succeeds — nothing more to do here afterward.
              </p>
            </div>
          </Modal>
        </div>
      )}
      {toasts.length > 0 && (
        <ToastHost>
          {toasts.map((t) => (
            <Toast key={t.id} tone={t.tone} onDismiss={() => dismissToast(t.id)}>{t.message}</Toast>
          ))}
        </ToastHost>
      )}
    </>
  )
}
