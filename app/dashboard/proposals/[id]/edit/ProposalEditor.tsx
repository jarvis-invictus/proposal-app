'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Check, Loader2, ArrowUp, ArrowDown } from 'lucide-react'
import { NotificationsDropdown } from '@/components/NotificationsDropdown'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { ThemeColorPicker } from '@/components/app/ThemeColorPicker'
import { PdfExportModal, type PdfExportOptions } from '@/components/app/PdfExportModal'

// Simple debounce hook for auto-saving
function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay]
  )
}

// Editable Text Component using contentEditable
const EditableText = ({
  value,
  onChange,
  className = '',
  style,
  multiline = false,
  as: Component = 'span'
}: {
  value: string
  onChange: (newVal: string) => void
  className?: string
  style?: React.CSSProperties
  multiline?: boolean
  as?: React.ElementType
}) => {
  const handleInput = (e: React.FormEvent<HTMLElement>) => {
    // Only capture innerText to avoid HTML injection
    onChange(e.currentTarget.innerText)
  }

  // Prevent Enter key if not multiline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
    }
  }

  // Strip rich text on paste
  const handlePaste = (e: React.ClipboardEvent<HTMLElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }

  // inline-block only makes sense for the default `span` usage (genuinely inline text, or a
  // flex child) — forcing it on block-level tags like `p`/`div`/`h1` collapses adjacent fields
  // onto the same line, since inline-level boxes don't get a line break between them by
  // themselves (e.g. two stacked `<p>` name fields rendering as "Acme Corp.Acme Corp.").
  const displayClass = Component === 'span' ? 'inline-block' : 'block'

  return (
    <Component
      className={`outline-none focus:ring-2 focus:ring-[var(--brand)] focus:bg-[var(--brand-12)] rounded transition-colors break-words min-w-[20px] ${displayClass} ${className}`}
      style={style}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleInput}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      dangerouslySetInnerHTML={{ __html: value || '' }}
    />
  )
}

// Editable Number Component using a hidden input behind text
const EditableNumber = ({
  value,
  onChange,
  className = '',
  style
}: {
  value: number
  onChange: (newVal: number) => void
  className?: string
  style?: React.CSSProperties
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [tempVal, setTempVal] = useState(value.toString())
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="number"
        className={`bg-transparent outline-none border-b focus:ring-0 p-0 w-24 ${className}`}
        style={{ ...style, borderColor: 'var(--brand)' }}
        value={tempVal}
        onChange={(e) => setTempVal(e.target.value)}
        onBlur={() => {
          setIsEditing(false)
          const num = parseInt(tempVal, 10)
          if (!isNaN(num)) {
            onChange(num)
          } else {
            setTempVal(value.toString())
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur()
          }
        }}
      />
    )
  }

  return (
    <span
      className={`cursor-text hover:bg-[var(--ink-06)] rounded px-1 transition-colors ${className}`}
      style={style}
      onClick={() => setIsEditing(true)}
    >
      ${value.toLocaleString()}
    </span>
  )
}

export default function ProposalEditor({ initialProposal, userRole = 'owner' }: { initialProposal: any; userRole?: string }) {
  const [proposal, setProposal] = useState(initialProposal)
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Brand kit colors, if this proposal is linked to one (proposals.brand_kit_id, joined by the
  // page's query). An explicit prior choice on the proposal itself always wins; the brand kit's
  // primary color is the fallback for a proposal that's never had its theme touched; the old
  // hardcoded indigo is the last resort for accounts with no brand kit at all yet.
  const brandKitColors = initialProposal.brand_kits?.colors
  const brandKitAccent = brandKitColors?.primary || '#171717'
  const [themeColor, setThemeColor] = useState(
    initialProposal.content.themeColor || brandKitColors?.primary || '#4F46E5' // Default Indigo
  )
  const themeKit = brandKitColors
    ? [
        brandKitColors.primary && { hex: brandKitColors.primary, label: 'Primary' },
        brandKitColors.secondary && { hex: brandKitColors.secondary, label: 'Secondary' },
        brandKitColors.accent && { hex: brandKitColors.accent, label: 'Accent' },
      ].filter(Boolean) as { hex: string; label: string }[]
    : undefined
  const [showPdfExport, setShowPdfExport] = useState(false)

  const content = proposal.content

  const PDF_SECTIONS = [
    { id: 'addOns', label: 'Optional Add-ons' },
    { id: 'timeline', label: 'Project Timeline' },
    { id: 'terms', label: 'Terms & Conditions' },
  ]

  const handlePdfExport = (_opts: PdfExportOptions) => {
    // No server-side PDF renderer exists yet — export falls back to the browser's print-to-PDF,
    // same mechanism the public proposal page uses.
    setShowPdfExport(false)
    setTimeout(() => window.print(), 100)
  }

  // Warn on unload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (savingState === 'saving' || savingState === 'error') {
        e.preventDefault()
        e.returnValue = '' // Standard way to trigger the browser's unload warning
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [savingState])

  // Auto-save function
  const saveProposal = async (updatedContent: any) => {
    setSavingState('saving')
    try {
      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: updatedContent })
      })
      if (!res.ok) throw new Error('Failed to save')
      setSavingState('saved')
      setTimeout(() => setSavingState('idle'), 2000)
    } catch (err) {
      console.error(err)
      setSavingState('error')
      // Error state persists so the user knows. The state in React holds the latest change, 
      // so if they edit again it will retry saving everything.
    }
  }

  const debouncedSave = useDebounce(saveProposal, 1000)

  const updateContent = (updater: (prevContent: any) => any) => {
    setProposal((prev: any) => {
      const nextContent = updater(prev.content)
      const nextProposal = { ...prev, content: nextContent }
      debouncedSave(nextContent)
      return nextProposal
    })
  }

  const updateField = (field: string, value: any) => {
    updateContent(prev => ({ ...prev, [field]: value }))
  }

  const moveArrayItem = (arrayField: string, index: number, direction: 'up' | 'down') => {
    updateContent(prev => {
      const arr = [...(prev[arrayField] || [])]
      if (direction === 'up' && index > 0) {
        const temp = arr[index - 1]
        arr[index - 1] = arr[index]
        arr[index] = temp
      } else if (direction === 'down' && index < arr.length - 1) {
        const temp = arr[index + 1]
        arr[index + 1] = arr[index]
        arr[index] = temp
      }
      return { ...prev, [arrayField]: arr }
    })
  }

  const updateArrayItem = (arrayField: string, index: number, itemField: string, value: any) => {
    updateContent(prev => {
      const arr = [...(prev[arrayField] || [])]
      arr[index] = { ...arr[index], [itemField]: value }
      return { ...prev, [arrayField]: arr }
    })
  }
  
  const updateDeliverable = (pkgIndex: number, delivIndex: number, value: string) => {
    updateContent(prev => {
      const pkgs = [...prev.packages]
      const delivs = [...pkgs[pkgIndex].deliverables]
      delivs[delivIndex] = value
      pkgs[pkgIndex] = { ...pkgs[pkgIndex], deliverables: delivs }
      return { ...prev, packages: pkgs }
    })
  }

  // Handle theme color changes
  const handleColorChange = (newColor: string) => {
    setThemeColor(newColor)
    updateContent(prev => ({ ...prev, themeColor: newColor }))
  }

  const handlePublish = async () => {
    setSavingState('saving')
    try {
      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PUBLISHED' }) // Drafters are redirected server-side to PENDING_APPROVAL
      })
      if (!res.ok) throw new Error('Failed to publish')
      const updated = await res.json()
      setProposal({ ...proposal, status: updated.status })
      setSavingState('saved')
      setTimeout(() => setSavingState('idle'), 2000)
    } catch (err) {
      console.error(err)
      setSavingState('error')
    }
  }

  const copyLink = () => {
    const url = `${window.location.origin}/p/${proposal.slug}`
    navigator.clipboard.writeText(url)
    alert('Public link copied to clipboard!')
  }

  return (
    <div className="relative min-h-screen pb-32" style={{ background: 'var(--surface-page)' }}>

      {/* Editor Header */}
      <div className="print:hidden" style={{
        position: 'sticky', top: 0, zIndex: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 32px', background: 'var(--glass-quiet)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)',
        borderBottom: '1px solid var(--border-hairline)', fontFamily: 'var(--font-sans)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h2 style={{ margin: 0, fontSize: 'var(--text-body)', fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)' }}>Proposal Editor</h2>
          <span style={{
            padding: '3px 9px', borderRadius: 'var(--radius-pill)', fontSize: 'var(--text-micro)', fontWeight: 'var(--weight-medium)',
            background: proposal.status === 'PUBLISHED' ? 'var(--brand-12)' : 'transparent',
            border: `1px solid ${proposal.status === 'PUBLISHED' ? 'var(--brand-38)' : 'var(--border-hairline)'}`,
            color: proposal.status === 'PUBLISHED' ? 'var(--brand-deep)' : 'var(--text-muted)',
          }}>
            {proposal.status === 'PENDING_APPROVAL' ? 'Waiting for approval' : proposal.status}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <NotificationsDropdown />
          <Button variant="ghost" size="sm" icon="file-down" onClick={() => setShowPdfExport(true)}>Download PDF</Button>
          {proposal.status === 'PUBLISHED' && (
            <Button variant="secondary" size="sm" icon="link" onClick={copyLink}>Copy Public Link</Button>
          )}
          {proposal.status === 'DRAFT' && (
            <Button variant="primary" size="sm" onClick={handlePublish}>
              {userRole === 'drafter' ? 'Submit for approval' : 'Publish'}
            </Button>
          )}
        </div>
      </div>

      {/* Floating Theme Control Panel */}
      <div className="fixed top-24 right-8 z-50 print:hidden">
        <ThemeColorPicker
          value={themeColor}
          brandColor={brandKitAccent}
          kit={themeKit}
          align="right"
          onChange={(roles) => handleColorChange(roles.accent)}
        />
      </div>

      {/* Modal is designed to fill its nearest positioned ancestor — anchor that to the
          viewport (not this long-scrolling document) so it doesn't land off-screen. */}
      {showPdfExport && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60 }}>
          <PdfExportModal
            open={showPdfExport}
            onClose={() => setShowPdfExport(false)}
            title={content.title}
            accent={themeColor}
            sections={PDF_SECTIONS}
            onExport={handlePdfExport}
          />
        </div>
      )}

      {/* Auto-save Status Indicator */}
      <div className="fixed bottom-8 right-8 z-50 print:hidden" style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 'var(--radius-pill)',
        background: 'var(--glass-panel)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)',
        border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-raised)', fontFamily: 'var(--font-sans)',
      }}>
        {savingState === 'saving' && (
          <>
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Saving...</span>
          </>
        )}
        {savingState === 'saved' && (
          <>
            <Check className="w-4 h-4" style={{ color: 'var(--brand-deep)' }} />
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--brand-deep)' }}>Saved</span>
          </>
        )}
        {savingState === 'idle' && (
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>All changes saved</span>
        )}
        {savingState === 'error' && (
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--status-caution-text)' }}>Failed to save - Edit again to retry</span>
        )}
      </div>

      {/* Proposal Render */}
      <div className="max-w-4xl mx-auto mt-12 print:shadow-none print:mt-0" style={{
        background: 'var(--surface-card)', borderRadius: 'var(--radius-card-lg)', boxShadow: 'var(--shadow-modal)', overflow: 'hidden',
      }}>
        {/* Header Section */}
        <div className="p-12 text-white" style={{ backgroundColor: themeColor }}>
          <EditableText
            as="h1"
            className="text-4xl font-bold mb-4"
            value={content.title || ''}
            onChange={(v) => updateField('title', v)}
          />
          <div className="grid grid-cols-2 gap-8 mt-8 opacity-90 text-sm">
            <div>
              <p className="uppercase tracking-wider text-xs mb-1 opacity-70">Prepared For</p>
              <EditableText
                as="p"
                className="font-medium"
                value={content.preparedFor || ''}
                onChange={(v) => updateField('preparedFor', v)}
              />
              <EditableText
                as="p"
                value={content.clientName || ''}
                onChange={(v) => updateField('clientName', v)}
              />
            </div>
            <div>
              <p className="uppercase tracking-wider text-xs mb-1 opacity-70">Prepared By</p>
              <EditableText
                as="p"
                className="font-medium"
                value={content.preparedBy || ''}
                onChange={(v) => updateField('preparedBy', v)}
              />
            </div>
            <div>
              <p className="uppercase tracking-wider text-xs mb-1 opacity-70">Date Issued</p>
              <EditableText
                as="p"
                value={content.dateIssued || ''}
                onChange={(v) => updateField('dateIssued', v)}
              />
            </div>
            <div>
              <p className="uppercase tracking-wider text-xs mb-1 opacity-70">Valid Until</p>
              <EditableText
                as="p"
                value={content.validUntil || ''}
                onChange={(v) => updateField('validUntil', v)}
              />
            </div>
          </div>
        </div>

        {/* Packages Section */}
        {content.packages && content.packages.length > 0 && (
          <div className="p-12" style={{ borderBottom: '1px solid var(--border-hairline)' }}>
            <h2 className="text-ink" style={{ fontSize: 'var(--text-h3)', fontWeight: 700, marginBottom: 32 }}>Investment Options</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {content.packages.map((pkg: any, idx: number) => (
                <div
                  key={idx}
                  className={`group relative rounded-xl p-6 ${pkg.popular ? 'shadow-lg' : ''}`}
                  style={{ border: pkg.popular ? `2px solid ${themeColor}` : '1px solid var(--border-hairline)' }}
                >
                  {/* Reorder controls visible on hover */}
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <IconButton icon="arrow-up" size="sm" variant="outline" label="Move package up" onClick={() => moveArrayItem('packages', idx, 'up')} disabled={idx === 0} />
                    <IconButton icon="arrow-down" size="sm" variant="outline" label="Move package down" onClick={() => moveArrayItem('packages', idx, 'down')} disabled={idx === content.packages.length - 1} />
                  </div>

                  {pkg.popular && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider"
                      style={{ backgroundColor: themeColor }}
                    >
                      Most Popular
                    </div>
                  )}

                  <EditableText
                    as="h3"
                    className="text-ink block"
                    style={{ fontSize: 'var(--text-h4)', fontWeight: 700, marginBottom: 8 }}
                    value={pkg.name}
                    onChange={(v) => updateArrayItem('packages', idx, 'name', v)}
                  />
                  <EditableText
                    as="p"
                    className="text-slate block"
                    style={{ fontSize: 'var(--text-sm)', marginBottom: 24, minHeight: 40 }}
                    multiline
                    value={pkg.description}
                    onChange={(v) => updateArrayItem('packages', idx, 'description', v)}
                  />

                  <div className="mb-6 flex items-baseline gap-2">
                    <EditableNumber
                      className="text-ink"
                      style={{ fontSize: 30, fontWeight: 700 }}
                      value={pkg.discountedPrice || pkg.price}
                      onChange={(v) => updateArrayItem('packages', idx, 'discountedPrice', v)}
                    />
                    {pkg.originalPrice && (
                      <span className="text-mist" style={{ fontSize: 'var(--text-body-lg)', textDecoration: 'line-through' }}>
                        <EditableNumber
                          value={pkg.originalPrice}
                          onChange={(v) => updateArrayItem('packages', idx, 'originalPrice', v)}
                        />
                      </span>
                    )}
                  </div>

                  <ul className="space-y-3">
                    {pkg.deliverables?.map((deliv: string, dIdx: number) => (
                      <li key={dIdx} className="text-slate flex items-start gap-3" style={{ fontSize: 'var(--text-sm)' }}>
                        <Check className="w-5 h-5 shrink-0 mt-0.5" style={{ color: themeColor }} />
                        <EditableText
                          className="flex-1"
                          multiline
                          value={deliv}
                          onChange={(v) => updateDeliverable(idx, dIdx, v)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add-ons Section */}
        {content.addOns && content.addOns.length > 0 && (
          <div className="p-12" style={{ borderBottom: '1px solid var(--border-hairline)' }}>
            <h2 className="text-ink" style={{ fontSize: 'var(--text-h4)', fontWeight: 700, marginBottom: 24 }}>Optional Add-ons</h2>
            <div className="space-y-4">
              {content.addOns.map((addon: any, idx: number) => (
                <div key={idx} className="group relative flex items-start justify-between rounded-lg p-4" style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-hairline)' }}>
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <IconButton icon="arrow-up" size="sm" variant="outline" label="Move add-on up" onClick={() => moveArrayItem('addOns', idx, 'up')} disabled={idx === 0} />
                    <IconButton icon="arrow-down" size="sm" variant="outline" label="Move add-on down" onClick={() => moveArrayItem('addOns', idx, 'down')} disabled={idx === content.addOns.length - 1} />
                  </div>

                  <div className="flex-1 pl-4">
                    <EditableText as="h4" className="text-ink" style={{ fontWeight: 700 }} value={addon.name} onChange={(v) => updateArrayItem('addOns', idx, 'name', v)} />
                    <EditableText as="p" className="text-slate" style={{ fontSize: 'var(--text-sm)', marginTop: 4 }} multiline value={addon.description} onChange={(v) => updateArrayItem('addOns', idx, 'description', v)} />
                  </div>
                  <div className="text-ink" style={{ fontWeight: 700, paddingLeft: 16, marginLeft: 16, borderLeft: '1px solid var(--border-hairline)' }}>
                    +<EditableNumber value={addon.price} onChange={(v) => updateArrayItem('addOns', idx, 'price', v)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline Section */}
        {content.timeline && content.timeline.length > 0 && (
          <div className="p-12" style={{ borderBottom: '1px solid var(--border-hairline)' }}>
            <h2 className="text-ink" style={{ fontSize: 'var(--text-h3)', fontWeight: 700, marginBottom: 32 }}>Project Timeline</h2>
            <div className="space-y-6">
              {content.timeline.map((phase: any, idx: number) => (
                <div key={idx} className="group relative flex gap-6">
                  <div className="absolute -left-3 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <IconButton icon="arrow-up" size="sm" variant="outline" label="Move phase up" onClick={() => moveArrayItem('timeline', idx, 'up')} disabled={idx === 0} />
                    <IconButton icon="arrow-down" size="sm" variant="outline" label="Move phase down" onClick={() => moveArrayItem('timeline', idx, 'down')} disabled={idx === content.timeline.length - 1} />
                  </div>

                  <div className="w-32 shrink-0">
                    <EditableText as="div" className="text-ink" style={{ fontWeight: 700 }} value={phase.phase} onChange={(v) => updateArrayItem('timeline', idx, 'phase', v)} />
                    <EditableText as="div" className="text-mist" style={{ fontSize: 'var(--text-sm)' }} value={phase.duration} onChange={(v) => updateArrayItem('timeline', idx, 'duration', v)} />
                  </div>
                  <div className="flex-1 pb-6" style={{ borderBottom: '1px solid var(--border-hairline)' }}>
                    <EditableText as="p" className="text-slate" multiline value={phase.description} onChange={(v) => updateArrayItem('timeline', idx, 'description', v)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment & Terms Section */}
        <div className="p-12 grid grid-cols-1 md:grid-cols-2 gap-12" style={{ background: 'var(--surface-sunken)' }}>
          {content.paymentSection && (
            <div>
              <h2 className="text-ink" style={{ fontSize: 'var(--text-body-lg)', fontWeight: 700, marginBottom: 16 }}>Payment Schedule</h2>
              <div className="text-slate" style={{ fontSize: 'var(--text-sm)' }}>
                <EditableText as="p" className="text-ink block" style={{ fontWeight: 'var(--weight-medium)', marginBottom: 8 }} value={content.paymentSection.schedule} onChange={(v) => updateContent(prev => ({ ...prev, paymentSection: { ...prev.paymentSection, schedule: v } }))} />
                <EditableText as="p" className="block" multiline value={content.paymentSection.terms} onChange={(v) => updateContent(prev => ({ ...prev, paymentSection: { ...prev.paymentSection, terms: v } }))} />
              </div>
            </div>
          )}

          {content.terms && content.terms.length > 0 && (
            <div>
              <h2 className="text-ink" style={{ fontSize: 'var(--text-body-lg)', fontWeight: 700, marginBottom: 16 }}>Terms & Conditions</h2>
              <ul className="text-slate list-disc pl-4 space-y-2" style={{ fontSize: 'var(--text-sm)' }}>
                {content.terms.map((term: string, idx: number) => (
                  <li key={idx}>
                    <EditableText multiline value={term} onChange={(v) => {
                      updateContent(prev => {
                        const newTerms = [...prev.terms]
                        newTerms[idx] = v
                        return { ...prev, terms: newTerms }
                      })
                    }} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
