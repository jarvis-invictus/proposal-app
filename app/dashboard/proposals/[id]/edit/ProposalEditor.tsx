'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { EditorHeader, type SaveStatus } from '@/components/editor/EditorHeader'
import { DocStats } from '@/components/editor/DocStats'
import { StructuredDocument } from '@/components/editor/StructuredDocument'
import { PackagesBlock, type PackageItem } from '@/components/editor/PackagesBlock'
import { AddOnsBlock, type AddOnItem } from '@/components/editor/AddOnsBlock'
import { TimelineBlock, type TimelinePhase } from '@/components/editor/TimelineBlock'
import { AttachmentsBlock } from '@/components/editor/AttachmentsBlock'
import { TermsPaymentBlock, type PaymentSection } from '@/components/editor/TermsPaymentBlock'
import { RevisionChat } from '@/components/editor/RevisionChat'
import { ResizablePanel } from '@/components/editor/ResizablePanel'
import type { Attachment } from '@/lib/attachments'
import { PublishModal } from '@/components/editor/PublishModal'
import { type ThemeRoles } from '@/components/app/ThemeColorPicker'
import { PdfExportModal, type PdfExportOptions } from '@/components/app/PdfExportModal'
import { PDF_SECTIONS } from '@/app/p/[slug]/PublicProposalView'
import { Icon } from '@/components/ui/Icon'
import { getPublicProposalUrl } from '@/lib/publicUrl'

const AUTOSAVE_DEBOUNCE_MS = 2500

/** Returns [debounced, cancelPending] — cancelPending clears a scheduled-but-not-yet-fired
 * call without running it, so a caller that's about to do its own immediate/awaited invocation
 * (see flushBeforePublish below) doesn't race a redundant debounced one right behind it. */
function useDebouncedCallback<T extends (...args: any[]) => void>(callback: T, delay: number) {
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  React.useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }, [])
  const debounced = React.useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => { timeoutRef.current = null; callback(...args) }, delay)
    },
    [callback, delay]
  )
  const cancelPending = React.useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
  }, [])
  return [debounced, cancelPending] as const
}

export default function ProposalEditor({ initialProposal, userRole = 'owner', accountCurrency = 'USD', accountSubdomain = null }: { initialProposal: any; userRole?: string; accountCurrency?: string; accountSubdomain?: string | null }) {
  const router = useRouter()
  const [proposal, setProposal] = React.useState(initialProposal)
  const [content, setContent] = React.useState<any>(initialProposal.content)
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>('saved')
  const [showPublishModal, setShowPublishModal] = React.useState(false)
  const [showPdfModal, setShowPdfModal] = React.useState(false)
  const [critiqueIssues, setCritiqueIssues] = React.useState<Array<{ field: string; severity: string; note: string }>>([])

  // Transient, shown once: the AI review pass (if it flagged anything) stashes its findings
  // here right before navigating from generation to this page. Read once, then cleared, so a
  // refresh doesn't keep resurfacing it.
  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`critique:${initialProposal.id}`)
      if (raw) {
        setCritiqueIssues(JSON.parse(raw))
        sessionStorage.removeItem(`critique:${initialProposal.id}`)
      }
    } catch { /* best-effort only */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Signed proposals have no separate "ACCEPTED" status — acceptance is accepted_at/signature
  // on a PUBLISHED proposal (same real-schema check the API route enforces server-side).
  const isLocked = !!(proposal.accepted_at || proposal.signature)
  const brandColor = initialProposal.brand_kits?.colors?.primary || '#4F46E5'
  const themeColor = content.themeColor || brandColor

  const saveContent = React.useCallback(async (nextContent: any): Promise<boolean> => {
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: nextContent }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSaveStatus('saved')
      return true
    } catch (err) {
      console.error(err)
      setSaveStatus('error')
      return false
    }
  }, [proposal.id])

  const [debouncedSave, cancelPendingSave] = useDebouncedCallback(saveContent, AUTOSAVE_DEBOUNCE_MS)

  // Publishing/submitting must never lock in stale content — cancel whatever autosave is
  // scheduled (it would otherwise still fire moments later against a now-published/locked
  // proposal) and save the current in-memory content directly, awaited, so publish only
  // proceeds once the DB actually matches what's on screen.
  const flushBeforePublish = React.useCallback(async () => {
    cancelPendingSave()
    return saveContent(content)
  }, [cancelPendingSave, saveContent, content])

  const updateField = (field: string, value: any) => {
    setContent((prev: any) => {
      const next = { ...prev, [field]: value }
      debouncedSave(next)
      return next
    })
  }

  // Same merge-then-save shape as updateField, but for several fields returned by the revise
  // panel at once — one state update and one debounced save instead of one per changed field.
  const applyChanges = (changes: Record<string, any>) => {
    setContent((prev: any) => {
      const next = { ...prev, ...changes }
      debouncedSave(next)
      return next
    })
  }

  const handlePreview = () => {
    window.open(getPublicProposalUrl(proposal.slug, accountSubdomain, window.location.origin), '_blank')
  }

  const handlePreviewDeck = () => {
    window.open(`${getPublicProposalUrl(proposal.slug, accountSubdomain, window.location.origin)}?view=deck`, '_blank')
  }

  const handleThemeChange = (roles: ThemeRoles) => {
    updateField('themeColor', roles.accent)
  }

  // The Editor's own canvas is an editable form, not styled for print — reuse the print-ready
  // rendering that already exists on the public page instead of duplicating it here. The chosen
  // options travel as a query param; PublicProposalView applies them and triggers window.print()
  // on load when present.
  const handleExportPdf = (options: PdfExportOptions) => {
    setShowPdfModal(false)
    const base = getPublicProposalUrl(proposal.slug, accountSubdomain, window.location.origin)
    window.open(`${base}?pdfExport=${encodeURIComponent(JSON.stringify(options))}`, '_blank')
  }

  const handlePublished = (result: { status: 'PUBLISHED' | 'PENDING_APPROVAL'; slug: string }) => {
    setProposal((prev: any) => ({ ...prev, status: result.status }))
  }

  return (
    <div style={{ position: 'relative', height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gradient-app)' }}>
      <EditorHeader
        onBack={() => router.push('/dashboard')}
        title={content.title || 'Untitled proposal'}
        proposalStatus={proposal.status}
        saveStatus={saveStatus}
        onPreview={handlePreview}
        onPreviewDeck={handlePreviewDeck}
        onPublish={() => setShowPublishModal(true)}
        publishLabel={userRole === 'drafter' ? 'Submit for approval' : 'Publish'}
        canPublish={proposal.status === 'DRAFT' && !isLocked}
        themeColor={themeColor}
        brandColor={brandColor}
        onThemeChange={handleThemeChange}
        onExportPdf={() => setShowPdfModal(true)}
        locked={isLocked}
      />
      {isLocked && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 24px',
          background: 'var(--brand-12)', borderBottom: '1px solid var(--brand-38)',
          fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--brand-ink)',
        }}>
          <Icon name="lock" size={15} color="var(--brand-ink)" />
          This proposal has been signed and is now locked as a legally binding document. Edits are disabled.
        </div>
      )}
      {critiqueIssues.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 24px',
          background: 'var(--status-caution-surface)', borderBottom: '1px solid var(--status-caution-border)',
          fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--status-caution-text)',
        }}>
          <Icon name="triangle-alert" size={15} color="var(--status-caution-text)" style={{ marginTop: 2, flex: 'none' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>
              AI review flagged {critiqueIssues.length} thing{critiqueIssues.length === 1 ? '' : 's'} worth a look
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {critiqueIssues.map((issue, i) => <li key={i}>{issue.note}</li>)}
            </ul>
          </div>
          <button type="button" onClick={() => setCritiqueIssues([])} aria-label="Dismiss"
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--status-caution-text)', flex: 'none', padding: 2 }}>
            <Icon name="x" size={15} />
          </button>
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <DocStats content={content} />
      <StructuredDocument>
        <fieldset disabled={isLocked} style={{ border: 'none', margin: 0, padding: 0 }}>
          <div style={{ padding: '32px 40px', borderBottom: '1px solid var(--border-hairline)' }}>
            <label style={{ display: 'block', fontSize: 'var(--text-micro)', letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'var(--weight-medium)', marginBottom: 10 }}>
              Proposal title
            </label>
            <input
              value={content.title || ''}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Untitled proposal"
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontFamily: 'var(--font-sans)', fontSize: 32, fontWeight: 'var(--weight-semibold)',
                letterSpacing: 'var(--tracking-tight)', color: 'var(--text-primary)',
              }}
            />
          </div>
          <PackagesBlock
            packages={(content.packages as PackageItem[]) || []}
            onChange={(next) => updateField('packages', next)}
            currency={accountCurrency}
          />
          <AddOnsBlock
            addOns={(content.addOns as AddOnItem[]) || []}
            onChange={(next) => updateField('addOns', next)}
            currency={accountCurrency}
          />
          <TimelineBlock
            timeline={(content.timeline as TimelinePhase[]) || []}
            onChange={(next) => updateField('timeline', next)}
          />
          <AttachmentsBlock
            attachments={(content.attachments as Attachment[]) || []}
            onChange={(next) => updateField('attachments', next)}
            accountId={initialProposal.account_id}
            proposalId={proposal.id}
          />
          <TermsPaymentBlock
            paymentSection={(content.paymentSection as PaymentSection) || { schedule: '', terms: '' }}
            onPaymentSectionChange={(next) => updateField('paymentSection', next)}
            terms={(content.terms as string[]) || []}
            onTermsChange={(next) => updateField('terms', next)}
          />
        </fieldset>
      </StructuredDocument>
      </div>
      <ResizablePanel storageKey="marg-revise-panel-width" defaultWidth={340} min={280} max={640}>
        <RevisionChat
          proposalId={proposal.id}
          content={content}
          brandKitId={initialProposal.brand_kit_id ?? null}
          disabled={isLocked}
          onApply={applyChanges}
        />
      </ResizablePanel>
      </div>
      {showPdfModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60 }}>
          <PdfExportModal
            open={showPdfModal}
            onClose={() => setShowPdfModal(false)}
            title={content.title || 'Untitled proposal'}
            accent={themeColor}
            sections={PDF_SECTIONS}
            onExport={handleExportPdf}
          />
        </div>
      )}
      <PublishModal
        open={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        proposalId={proposal.id}
        slug={proposal.slug}
        content={content}
        brandKitName={initialProposal.brand_kits?.name || null}
        userRole={userRole}
        accountSubdomain={accountSubdomain}
        onBeforePublish={flushBeforePublish}
        onPublished={handlePublished}
      />
    </div>
  )
}
