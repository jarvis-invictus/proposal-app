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

export default function ProposalEditor({ initialProposal, userRole = 'owner' }: { initialProposal: any; userRole?: string }) {
  const [proposal, setProposal] = React.useState(initialProposal)
  const [content, setContent] = React.useState<any>(initialProposal.content)
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>('saved')
  const [showPublishModal, setShowPublishModal] = React.useState(false)

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
        canPublish={proposal.status === 'DRAFT'}
      />
      <DocStats />
      <StructuredDocument>
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
        />
        <AddOnsBlock
          addOns={(content.addOns as AddOnItem[]) || []}
          onChange={(next) => updateField('addOns', next)}
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
      </StructuredDocument>
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
