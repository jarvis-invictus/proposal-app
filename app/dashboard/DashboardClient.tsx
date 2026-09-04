'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/app/AppShell'
import { ProposalCard } from '@/components/app/ProposalCard'
import { StatStrip } from '@/components/app/StatStrip'
import { EmptyState } from '@/components/app/EmptyState'
import { Checklist } from '@/components/app/Checklist'
import { Menu, MenuRow, MenuDivider } from '@/components/app/Menu'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { FilterChip } from '@/components/ui/FilterChip'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { Icon } from '@/components/ui/Icon'
import { PromptInput } from '@/components/ui/PromptInput'
import { Toast, ToastHost, useToasts } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/app/ConfirmDialog'
import { relativeTime } from '@/lib/relativeTime'
import { getPublicProposalUrl } from '@/lib/publicUrl'
import { prefersReducedMotion } from '@/lib/reducedMotion'
import { duplicateProposalAsDraft, deleteProposal } from './actions'

/** Mirrors the starter ids NewProposal.jsx will branch on once it's rebuilt (Correction 6, item 4) —
 * for now these just carry a `starter` query param the intake page doesn't yet read. */
const QUICK = [
  { id: 'fixed', label: 'A fixed-scope project' },
  { id: 'retainer', label: 'An ongoing retainer' },
  { id: 'discovery', label: 'A discovery sprint' },
  { id: 'notes', label: 'Paste my notes' },
] as const

const RECOMMENDED: Record<string, [string, string][]> = {
  agency: [['Retainer · monthly', 'repeat'], ['Campaign launch', 'megaphone'], ['SEO engagement', 'trending-up']],
  dev: [['Fixed-scope build', 'code'], ['Discovery sprint', 'search'], ['Maintenance retainer', 'wrench']],
  design: [['Brand identity', 'palette'], ['Website redesign', 'layout-template'], ['Design system', 'component']],
  freelance: [['Simple one-pager', 'file-text'], ['Hourly engagement', 'clock'], ['Project + revisions', 'repeat']],
  other: [['Blank proposal', 'file-plus-2'], ['Fixed-scope project', 'briefcase'], ['Retainer', 'repeat']],
}
const CATEGORY_LABEL: Record<string, string> = { agency: 'marketing agencies', dev: 'dev studios', design: 'design studios', freelance: 'freelancers', other: 'you' }

const STATUS_FILTERS = ['All', 'Draft', 'Sent', 'Viewed', 'Accepted'] as const

export type DashboardProposal = {
  id: string
  slug: string
  title: string
  client: string
  updatedAt: string
  value: string
  displayStatus: 'draft' | 'sent' | 'viewed' | 'accepted'
  statusLabel?: string
  pendingApproval: boolean
}

export function DashboardClient({
  accountName, planLabel, category, proposals, counts, clients, setupDone, showNudge, accountSubdomain = null,
}: {
  accountName: string
  planLabel: string
  category: string | null
  proposals: DashboardProposal[]
  counts: { total: number; open: number; won: number }
  clients: string[]
  setupDone: { brand: boolean; proposal: boolean; share: boolean }
  showNudge: boolean
  accountSubdomain?: string | null
}) {
  const router = useRouter()

  const [filter, setFilter] = React.useState<typeof STATUS_FILTERS[number]>('All')
  const [client, setClient] = React.useState('All clients')
  const [q, setQ] = React.useState('')
  const [menu, setMenu] = React.useState<string | null>(null)
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts()
  const [opening, setOpening] = React.useState<string | null>(null)
  const [nudge, setNudge] = React.useState(true)
  const [aiValue, setAiValue] = React.useState('')
  const [listening, setListening] = React.useState(false)
  const [pendingDelete, setPendingDelete] = React.useState<DashboardProposal | null>(null)

  const list = proposals.filter((p) =>
    (filter === 'All' || p.displayStatus === filter.toLowerCase()) &&
    (client === 'All clients' || p.client === client) &&
    (q === '' || (p.title + p.client).toLowerCase().includes(q.toLowerCase()))
  )

  const goNew = (params?: Record<string, string>) => {
    const usp = new URLSearchParams(params)
    router.push(`/dashboard/proposals/new${usp.toString() ? `?${usp}` : ''}`)
  }

  const handleDuplicate = async (p: DashboardProposal) => {
    setMenu(null)
    try {
      const copy = await duplicateProposalAsDraft(p.id)
      pushToast(`Duplicated as a draft — "${copy.title}"`)
      router.refresh()
    } catch (err: any) {
      pushToast(err.message || 'Failed to duplicate', { tone: 'error' })
    }
  }

  const handleCopyLink = (p: DashboardProposal) => {
    setMenu(null)
    navigator.clipboard.writeText(getPublicProposalUrl(p.slug, accountSubdomain, window.location.origin))
    pushToast('Public link copied')
  }

  const handleExportPdf = (p: DashboardProposal) => {
    setMenu(null)
    router.push(`/dashboard/proposals/${p.id}/edit?export=pdf`)
  }

  const handleSaveAsTemplate = () => {
    setMenu(null)
    pushToast('Saving a proposal as a template is coming soon')
  }

  const handleDelete = (p: DashboardProposal) => {
    setMenu(null)
    setPendingDelete(p)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    const p = pendingDelete
    setPendingDelete(null)
    try {
      await deleteProposal(p.id)
      pushToast('Proposal deleted')
      router.refresh()
    } catch (err: any) {
      pushToast(err.message || 'Failed to delete', { tone: 'error' })
    }
  }

  const subtitle = proposals.length === 0
    ? 'Your first proposal is about a minute away.'
    : `${counts.total} proposal${counts.total === 1 ? '' : 's'} · ${counts.open} waiting on a client`

  return (
    <AppShell
      screen="proposals"
      title="Proposals"
      subtitle={subtitle}
      accountName={accountName}
      planLabel={planLabel}
      search={<Input icon="search" size="sm" placeholder="Search proposals or clients" value={q} onChange={(e) => setQ(e.target.value)} wrapperStyle={{ width: 250 }} />}
    >
      <AILauncher
        value={aiValue} setValue={setAiValue} listening={listening} setListening={setListening}
        onSubmit={() => goNew(aiValue.trim() ? { text: aiValue.trim() } : undefined)}
        onQuick={(id) => goNew({ starter: id })}
      />
      <SecondaryStarts onTemplates={() => router.push('/dashboard/templates')} />

      {showNudge && nudge && (
        <Checklist
          items={[
            { id: 'brand', icon: 'palette', label: 'Set up your brand kit', hint: 'Colours, fonts and logo' },
            { id: 'proposal', icon: 'sparkles', label: 'Write your first proposal', hint: 'From a deal you already closed' },
            { id: 'share', icon: 'link', label: 'Share it with a client', hint: 'One link — no PDF' },
          ]}
          done={Object.entries(setupDone).filter(([, v]) => v).map(([k]) => k)}
          onDismiss={() => setNudge(false)}
          onSelect={(item) => {
            if (item.id === 'brand') router.push('/dashboard/brand-kit')
            else router.push('/dashboard/proposals/new')
          }}
        />
      )}

      {category && <RecommendedRow category={category} onBrowse={() => router.push('/dashboard/templates')} />}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 'var(--text-h4)', letterSpacing: 'var(--tracking-tight)', marginRight: 4 }}>Your proposals</h2>
        {STATUS_FILTERS.map((t) => <FilterChip key={t} active={filter === t} onClick={() => setFilter(t)}>{t}</FilterChip>)}
        <SelectMenu icon="users" value={client} options={['All clients', ...clients]} onSelect={setClient} style={{ marginLeft: 6 }} />
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{list.length} of {proposals.length}</span>
      </div>

      {proposals.length > 0 && <StatStrip counts={counts} />}

      {proposals.length === 0 ? (
        <FirstRunEmpty />
      ) : list.length === 0 ? (
        <EmptyState title="Nothing matches that filter" description="Clear the filters, or describe a new deal and we'll draft the whole proposal for you."
          action={<Button icon="sparkles" onClick={() => goNew()}>Create with AI</Button>} />
      ) : (
        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 22 }}>
          {list.map((p) => (
            <ProposalCard key={p.id} title={p.title} client={p.client} updated={`Updated ${relativeTime(p.updatedAt)}`}
              status={p.displayStatus} statusLabel={p.statusLabel} value={p.value}
              onOpen={() => {
                setOpening(p.id)
                if (prefersReducedMotion()) router.push(`/dashboard/proposals/${p.id}/edit`)
                else setTimeout(() => router.push(`/dashboard/proposals/${p.id}/edit`), 320)
              }}
              style={opening && opening !== p.id ? { opacity: 0.35, transform: 'scale(0.985)', transition: 'all 300ms var(--ease-standard)' } :
                opening === p.id ? { transform: 'scale(1.02)', transition: 'transform 300ms var(--ease-out-soft)', zIndex: 2 } : undefined}
              onMenu={() => setMenu(menu === p.id ? null : p.id)}
              menu={menu === p.id ? (
                <RowMenu onClose={() => setMenu(null)}
                  onDuplicate={() => handleDuplicate(p)}
                  onCopyLink={() => handleCopyLink(p)}
                  onExportPdf={() => handleExportPdf(p)}
                  onSaveAsTemplate={handleSaveAsTemplate}
                  onDelete={() => handleDelete(p)} />
              ) : null} />
          ))}
        </div>
      )}

      {toasts.length > 0 && (
        <ToastHost>
          {toasts.map((t) => (
            <Toast key={t.id} tone={t.tone} onDismiss={() => dismissToast(t.id)} action={t.action} actionLabel={t.actionLabel}>
              {t.message}
            </Toast>
          ))}
        </ToastHost>
      )}
      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.title || 'this proposal'}"?`}
        body="This can't be undone."
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </AppShell>
  )
}

function AILauncher({ value, setValue, listening, setListening, onSubmit, onQuick }: {
  value: string; setValue: (v: string) => void; listening: boolean; setListening: (v: boolean | ((l: boolean) => boolean)) => void
  onSubmit: () => void; onQuick: (id: string) => void
}) {
  const [hover, setHover] = React.useState(false)
  return (
    <section className="fade-up liquid liquid-flat liquid-drift" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', overflow: 'hidden', marginBottom: 30, padding: '30px 32px 26px',
        borderRadius: 'var(--radius-card-lg)', background: 'var(--gradient-feature)',
        backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)',
        border: '1px solid var(--brand-38)', boxShadow: hover ? 'var(--shadow-brand-lg)' : 'var(--shadow-brand)',
        transition: 'box-shadow var(--duration-slow) var(--ease-standard)',
      }}>
      <span aria-hidden="true" style={{
        position: 'absolute', right: '-8%', top: '-70%', width: 460, height: 460, borderRadius: '50%',
        background: 'radial-gradient(circle,var(--bloom-feature) 0%,rgba(124,188,220,0) 68%)', pointerEvents: 'none',
        animation: 'sky-drift 22s var(--ease-standard) infinite',
      }} />
      <div style={{ position: 'relative', maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 13px 5px 8px', borderRadius: 'var(--radius-pill)',
          background: 'var(--glass-card-hover)', border: '1px solid var(--brand-38)', fontSize: 'var(--text-xs)',
          fontWeight: 'var(--weight-medium)', color: 'var(--brand-ink)',
        }}>
          <Icon name="sparkles" size={15} /> Start here
        </span>
        <h2 style={{ fontSize: 34, letterSpacing: 'var(--tracking-tight)', textAlign: 'center', color: 'var(--brand-ink)' }}>
          What did you just <em style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400, letterSpacing: 0 }}>agree</em> to?
        </h2>
        <p style={{ marginTop: -8, fontSize: 'var(--text-body)', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 460 }}>
          Describe the deal in a sentence. Marg asks what&apos;s missing, then writes the whole proposal.
        </p>
        <PromptInput size="lg" value={value} onChange={(e) => setValue(e.target.value)}
          onSubmit={onSubmit} listening={listening} onToggleMic={() => setListening((l) => !l)}
          placeholder="Dashboard redesign for Acme Corp, around $50k, three months…"
          style={{ maxWidth: 660 }} />
        <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {QUICK.map((x) => <QuickChip key={x.id} label={`Start a new proposal: ${x.label}`} onClick={() => onQuick(x.id)}>{x.label}</QuickChip>)}
        </div>
      </div>
    </section>
  )
}

function QuickChip({ children, label, onClick }: { children: React.ReactNode; label?: string; onClick: () => void }) {
  const [hover, setHover] = React.useState(false)
  return (
    <button type="button" onClick={onClick} aria-label={label} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        padding: '7px 15px', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-sm)', border: '1px solid ' + (hover ? 'var(--brand)' : 'var(--brand-38)'),
        background: hover ? 'var(--glass-card-hover)' : 'var(--glass-quiet)',
        color: hover ? 'var(--brand-ink)' : 'var(--text-secondary)',
        transform: hover ? 'var(--hover-lift)' : 'none', boxShadow: hover ? 'var(--shadow-brand)' : 'none',
        transition: 'all var(--duration-base) var(--ease-standard)',
      }}>{children}</button>
  )
}

function SecondaryStarts({ onTemplates }: { onTemplates: () => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: -16, marginBottom: 30 }}>
      <TextStart icon="layout-template" onClick={onTemplates}>Start from a template</TextStart>
      {/* "Import a document" has no backend anywhere in this app — the source itself leaves it
          unwired (onClick={()=>{}}); shown honestly disabled instead of a silent dead click. */}
      <TextStart icon="upload" disabled>Import a document (coming soon)</TextStart>
    </div>
  )
}

function TextStart({ icon, children, onClick, disabled }: { icon: string; children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  const [hover, setHover] = React.useState(false)
  return (
    <button type="button" disabled={disabled} onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 12px', border: 'none', borderRadius: 'var(--radius-pill)',
        background: hover && !disabled ? 'var(--brand-12)' : 'transparent', color: disabled ? 'var(--text-muted)' : hover ? 'var(--brand-deep)' : 'var(--text-muted)',
        fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
        transition: 'background var(--duration-base) var(--ease-standard),color var(--duration-base) var(--ease-standard)',
      }}>
      <Icon name={icon} size={15} />{children}
    </button>
  )
}

function FirstRunEmpty() {
  const [pos, setPos] = React.useState({ x: 50, y: 50 })
  const track = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
  }
  return (
    <div onMouseMove={track} onMouseLeave={() => setPos({ x: 50, y: 50 })}
      style={{
        position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 14, padding: '64px 24px', borderRadius: 'var(--radius-card-lg)',
        border: '1px dashed var(--brand-38)', background: 'var(--glass-quiet)',
      }}>
      <span aria-hidden="true" style={{
        position: 'absolute', left: pos.x + '%', top: pos.y + '%', width: 420, height: 420,
        transform: 'translate(-50%,-50%)', borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle,var(--bloom-feature) 0%,rgba(124,188,220,0) 70%)',
        transition: 'left 700ms var(--ease-out-soft),top 700ms var(--ease-out-soft)',
      }} />
      <span style={{
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 46, height: 46,
        borderRadius: 'var(--radius-pill)', background: 'var(--brand-12)', color: 'var(--brand-deep)',
      }}>
        <Icon name="file-plus-2" size={21} />
      </span>
      <h3 style={{ position: 'relative', fontSize: 'var(--text-h4)' }}>No proposals yet</h3>
      <p style={{ position: 'relative', maxWidth: 380, textAlign: 'center', fontSize: 'var(--text-body)', color: 'var(--text-muted)', lineHeight: 'var(--leading-snug)' }}>
        Describe a deal you just closed in the box above. Marg asks what&apos;s missing, then writes the whole thing.
      </p>
    </div>
  )
}

function RecommendedRow({ category, onBrowse }: { category: string; onBrowse: () => void }) {
  const list = RECOMMENDED[category] || RECOMMENDED.other
  const label = CATEGORY_LABEL[category] || 'you'
  return (
    <section className="fade-up" style={{ marginBottom: 26 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
        <Icon name="sparkles" size={15} color="var(--brand-deep)" />
        <h3 style={{ fontSize: 'var(--text-h4)' }}>Recommended for {label}</h3>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={onBrowse} style={{ border: 'none', background: 'none', padding: 0, color: 'var(--brand-deep)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)' }}>Browse all templates</button>
      </div>
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
        {list.map(([name, icon]) => (
          <button key={name} type="button" onClick={onBrowse} aria-label={`Use ${name} template`} className="liquid liquid-hover"
            style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 15px', textAlign: 'left', cursor: 'pointer', borderRadius: 'var(--radius-card)', fontFamily: 'var(--font-sans)' }}>
            <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, flex: 'none', borderRadius: 'var(--radius-pill)', background: 'var(--brand-12)', color: 'var(--brand-deep)' }}>
              <Icon name={icon} size={15} />
            </span>
            <span style={{ position: 'relative', zIndex: 1, fontSize: 'var(--text-sm)', fontWeight: 500 }}>{name}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function RowMenu({ onClose, onDuplicate, onCopyLink, onExportPdf, onSaveAsTemplate, onDelete }: {
  onClose: () => void; onDuplicate: () => void; onCopyLink: () => void; onExportPdf: () => void; onSaveAsTemplate: () => void; onDelete: () => void
}) {
  return (
    <Menu onClose={onClose}>
      <MenuRow icon="copy" onClick={(e) => { e.stopPropagation(); onDuplicate() }}>Duplicate as draft</MenuRow>
      <MenuRow icon="link" onClick={(e) => { e.stopPropagation(); onCopyLink() }}>Copy share link</MenuRow>
      <MenuRow icon="file-down" onClick={(e) => { e.stopPropagation(); onExportPdf() }}>Export PDF</MenuRow>
      <MenuRow icon="layout-template" onClick={(e) => { e.stopPropagation(); onSaveAsTemplate() }}>Save as template</MenuRow>
      <MenuDivider />
      <MenuRow icon="trash-2" destructive onClick={(e) => { e.stopPropagation(); onDelete() }}>Delete</MenuRow>
    </Menu>
  )
}
