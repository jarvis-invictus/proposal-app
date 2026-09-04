'use client'

import * as React from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { ThemeColorPicker, type ThemeRoles } from '@/components/app/ThemeColorPicker'

export type SaveStatus = 'saved' | 'saving' | 'error'
export type EditorProposalStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'PENDING_APPROVAL'

const SAVE_LABEL: Record<SaveStatus, string> = {
  saving: 'Saving…',
  saved: 'Saved just now',
  // There's no background retry timer — the only thing that actually re-triggers a save is the
  // debounced autosave firing again off the user's next edit, so say that, not "edit again to
  // retry" (which reads as a deliberate step to take, when it's really just what already
  // happens the moment they keep working).
  error: "Couldn't save — retries on your next edit",
}

export interface EditorHeaderProps {
  title: string
  proposalStatus: EditorProposalStatus
  saveStatus: SaveStatus
  onPreview: () => void
  onPreviewDeck: () => void
  onPublish: () => void
  publishLabel: string
  canPublish: boolean
  themeColor: string
  brandColor: string
  onThemeChange: (roles: ThemeRoles) => void
  onExportPdf: () => void
  locked?: boolean
}

/** Thin editor chrome: document title + save state center, Preview/Publish right — matches Editor.jsx's EditorToolbar. */
export function EditorHeader({
  title, proposalStatus, saveStatus, onPreview, onPreviewDeck, onPublish, publishLabel, canPublish,
  themeColor, brandColor, onThemeChange, onExportPdf, locked = false,
}: EditorHeaderProps) {
  return (
    <header style={{
      position: 'relative', zIndex: 30, display: 'flex', alignItems: 'center', gap: 16, height: 58, padding: '0 16px 0 20px',
      borderBottom: '1px solid var(--border-hairline)', background: 'var(--glass-quiet)',
      backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)', fontFamily: 'var(--font-sans)',
    }}>
      <span style={{
        padding: '3px 9px', borderRadius: 'var(--radius-pill)', fontSize: 'var(--text-micro)', fontWeight: 'var(--weight-medium)',
        background: proposalStatus === 'PUBLISHED' ? 'var(--brand-12)' : 'transparent',
        border: `1px solid ${proposalStatus === 'PUBLISHED' ? 'var(--brand-38)' : 'var(--border-hairline)'}`,
        color: proposalStatus === 'PUBLISHED' ? 'var(--brand-deep)' : 'var(--text-muted)', flex: 'none',
      }}>
        {proposalStatus === 'PENDING_APPROVAL' ? 'Waiting for approval' : proposalStatus}
      </span>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, minWidth: 0 }}>
        <span style={{ fontSize: 'var(--text-body)', fontWeight: 'var(--weight-medium)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', whiteSpace: 'nowrap',
          color: saveStatus === 'error' ? 'var(--status-caution-text)' : 'var(--text-muted)',
        }}>
          <Icon name={saveStatus === 'saving' ? 'loader-circle' : 'check'} size={12}
            style={saveStatus === 'saving' ? { animation: 'spin 900ms linear infinite' } : undefined} />
          {SAVE_LABEL[saveStatus]}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* A real fieldset, not just a pointer-events wrapper — that would only stop mouse
            clicks, not keyboard activation or a programmatic .click(). display:contents keeps
            it out of the flex layout while still disabling every descendant control. */}
        <fieldset disabled={locked} style={{ display: 'contents', border: 'none', margin: 0, padding: 0 }}>
          <ThemeColorPicker
            value={themeColor} brandColor={brandColor} onChange={onThemeChange}
            style={{ opacity: locked ? 0.5 : 1 }}
            title={locked ? 'Locked — this proposal has been signed' : undefined}
          />
        </fieldset>
        <Button variant="ghost" size="sm" icon="file-down" onClick={onExportPdf}>Export PDF</Button>
        <Button variant="ghost" size="sm" icon="sparkles" onClick={onPreviewDeck}>Preview as deck</Button>
        <Button variant="ghost" size="sm" icon="eye" onClick={onPreview}>Preview</Button>
        {canPublish && <Button variant="primary" size="sm" onClick={onPublish}>{publishLabel}</Button>}
      </div>
    </header>
  )
}
