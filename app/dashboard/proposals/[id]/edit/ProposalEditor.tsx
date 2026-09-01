'use client'

import * as React from 'react'
import { EditorHeader, type SaveStatus } from '@/components/editor/EditorHeader'
import { DocStats } from '@/components/editor/DocStats'
import { StructuredDocument } from '@/components/editor/StructuredDocument'
import { PackagesBlock, type PackageItem } from '@/components/editor/PackagesBlock'
import { AddOnsBlock, type AddOnItem } from '@/components/editor/AddOnsBlock'
import { TimelineBlock, type TimelinePhase } from '@/components/editor/TimelineBlock'
import { TermsPaymentBlock, type PaymentSection } from '@/components/editor/TermsPaymentBlock'
import { PublishModal } from '@/components/editor/PublishModal'
import { type ThemeRoles } from '@/components/app/ThemeColorPicker'
import { PdfExportModal, type PdfExportOptions } from '@/components/app/PdfExportModal'
import { PDF_SECTIONS } from '@/app/p/[slug]/PublicProposalView'
import { Icon } from '@/components/ui/Icon'

const AUTOSAVE_DEBOUNCE_MS = 2500

function useDebouncedCallback<T extends (...args: any[]) => void>(callback: T, delay: number) {
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  React.useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }, [])
  return React.useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => callback(...args), delay)
    },
    [callback, delay]
  )
}

export default function ProposalEditor({ initialProposal, userRole = 'owner', accountCurrency = 'USD' }: { initialProposal: any; userRole?: string; accountCurrency?: string }) {
  const [proposal, setProposal] = React.useState(initialProposal)
  const [content, setContent] = React.useState<any>(initialProposal.content)
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>('saved')
  const [showPublishModal, setShowPublishModal] = React.useState(false)
  const [showPdfModal, setShowPdfModal] = React.useState(false)

  // Signed proposals have no separate "ACCEPTED" status — acceptance is accepted_at/signature
  // on a PUBLISHED proposal (same real-schema check the API route enforces server-side).
  const isLocked = !!(proposal.accepted_at || proposal.signature)
  const brandColor = initialProposal.brand_kits?.colors?.primary || '#4F46E5'
  const themeColor = content.themeColor || brandColor

  const saveContent = React.useCallback(async (nextContent: any) => {
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: nextContent }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSaveStatus('saved')
    } catch (err) {
      console.error(err)
      setSaveStatus('error')
    }
  }, [proposal.id])

  const debouncedSave = useDebouncedCallback(saveContent, AUTOSAVE_DEBOUNCE_MS)

  const updateField = (field: string, value: any) => {
    setContent((prev: any) => {
      const next = { ...prev, [field]: value }
      debouncedSave(next)
      return next
    })
  }

  const handlePreview = () => {
    window.open(`/p/${proposal.slug}`, '_blank')
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
    window.open(`/p/${proposal.slug}?pdfExport=${encodeURIComponent(JSON.stringify(options))}`, '_blank')
  }

  const handlePublished = (result: { status: 'PUBLISHED' | 'PENDING_APPROVAL'; slug: string }) => {
    setProposal((prev: any) => ({ ...prev, status: result.status }))
  }

  return (
    <div style={{ position: 'relative', height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gradient-app)' }}>
      <EditorHeader
        title={content.title || 'Untitled proposal'}
        proposalStatus={proposal.status}
        saveStatus={saveStatus}
        onPreview={handlePreview}
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
      <DocStats />
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
          <TermsPaymentBlock
            paymentSection={(content.paymentSection as PaymentSection) || { schedule: '', terms: '' }}
            onPaymentSectionChange={(next) => updateField('paymentSection', next)}
            terms={(content.terms as string[]) || []}
            onTermsChange={(next) => updateField('terms', next)}
          />
        </fieldset>
      </StructuredDocument>
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
        onPublished={handlePublished}
      />
    </div>
  )
}
