'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/app/Modal'
import { SignaturePad } from '@/components/app/SignaturePad'
import { DealWon } from '@/components/app/DealWon'
import { PdfExportModal, type PdfExportOptions } from '@/components/app/PdfExportModal'
import { DeckView } from '@/components/presentation/DeckView'
import { BrandFontLink } from '@/components/app/BrandFontLink'
import { formatCurrency } from '@/lib/formatCurrency'
import { ESIGN_CONSENT_STATEMENT, type Signature } from '@/lib/signature'

function formatUtc(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const datePart = d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' })
  return `${datePart} at ${timePart} UTC`
}

const CORNER_MAP: Record<PdfExportOptions['pageNumbers'], string> = {
  tl: 'top-left', tr: 'top-right', bl: 'bottom-left', br: 'bottom-right', none: 'none',
}
const DATES_MAP: Record<PdfExportOptions['dates'], string> = {
  both: 'both', issued: 'issued', valid: 'validUntil', none: 'none',
}
const FORMAT_MAP: Record<PdfExportOptions['dateFormat'], string> = {
  long: 'standard', us: 'slashes', iso: 'iso', custom: 'standard',
}

/** The only sections this proposal's print view actually toggles — must match the ids
 * PdfExportModal is given everywhere it's opened for a proposal (also from the Editor),
 * otherwise a chosen "hide this section" option silently does nothing. */
export const PDF_SECTIONS = [
  { id: 'addOns', label: 'Optional Add-ons' },
  { id: 'timeline', label: 'Project Timeline' },
  { id: 'attachments', label: 'Attachments' },
  { id: 'terms', label: 'Terms & Conditions' },
]

export default function PublicProposalView({
  proposal,
  paymentDisplay,
  isOwner,
  currency = 'USD',
}: {
  proposal: any,
  paymentDisplay: { payment_upi_id: string | null; payment_link: string | null; payment_qr_url: string | null } | null,
  isOwner: boolean,
  currency?: string,
}) {
  const content = proposal.content
  // Same fallback chain as the editor: an explicit choice on the proposal wins, then the
  // linked brand kit's primary color, then the old hardcoded default for accounts with no kit.
  const themeColor = content.themeColor || proposal.brand_kits?.colors?.primary || '#4F46E5'
  const headingFontName = proposal.brand_kits?.fonts?.heading || null
  const bodyFontName = proposal.brand_kits?.fonts?.body || null
  const headingFontFamily = headingFontName ? `"${headingFontName}", var(--font-serif)` : undefined

  const searchParams = useSearchParams()
  // The document is the permanent, signable record — deck is a presentational extra, so a
  // shared link defaults to the document unless explicitly asked for the deck via ?view=deck.
  const [viewMode, setViewMode] = useState<'document' | 'deck'>(searchParams.get('view') === 'deck' ? 'deck' : 'document')

  // Accept & sign state
  const [acceptedAt, setAcceptedAt] = useState<string | null>(proposal.accepted_at)
  const [acceptedByName, setAcceptedByName] = useState<string | null>(proposal.accepted_by_name)
  const [signature, setSignature] = useState<Signature | null>(proposal.signature ?? null)
  const [showSignModal, setShowSignModal] = useState(false)
  const [signerName, setSignerName] = useState('')
  const [signing, setSigning] = useState(false)
  const [signError, setSignError] = useState<string | null>(null)
  const [burst, setBurst] = useState(false)

  const canAcceptSign = !isOwner && proposal.status === 'PUBLISHED'

  const handleAcceptSign = async () => {
    if (!signerName.trim()) return
    setSigning(true)
    setSignError(null)
    try {
      const res = await fetch(`/api/proposals/${proposal.slug}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: signerName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to sign')
      setAcceptedAt(data.accepted_at)
      setAcceptedByName(data.accepted_by_name)
      setSignature(data.signature ?? null)
      setShowSignModal(false)
      setBurst(true)
    } catch (err: any) {
      setSignError(err.message)
    } finally {
      setSigning(false)
    }
  }

  // View Tracking (only fire if not owner)
  useEffect(() => {
    if (!isOwner && proposal.status === 'PUBLISHED') {
      fetch(`/api/proposals/${proposal.slug}/view`, { method: 'POST' }).catch(console.error)
    }
  }, [proposal.slug, proposal.status, isOwner])

  // PDF Configuration State
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [pdfConfig, setPdfConfig] = useState({
    pageNumbers: 'none', // 'none', 'top-left', 'top-right', 'bottom-left', 'bottom-right'
    headerText: '',
    datesMode: 'both', // 'both', 'issued', 'validUntil', 'none'
    datesFormat: 'standard', // 'standard', 'slashes', 'iso'
    visibleSections: {
      addOns: true,
      timeline: true,
      attachments: true,
      terms: true
    },
    hideLineItemPrices: false,
    inkSavingMode: false
  })

  const handlePdfExport = (opts: PdfExportOptions) => {
    setPdfConfig({
      pageNumbers: CORNER_MAP[opts.pageNumbers] ?? 'none',
      headerText: opts.headerIsDefault ? '' : opts.header,
      datesMode: DATES_MAP[opts.dates] ?? 'both',
      datesFormat: FORMAT_MAP[opts.dateFormat] ?? 'standard',
      visibleSections: {
        addOns: !opts.hiddenSections.includes('addOns'),
        timeline: !opts.hiddenSections.includes('timeline'),
        attachments: !opts.hiddenSections.includes('attachments'),
        terms: !opts.hiddenSections.includes('terms'),
      },
      hideLineItemPrices: opts.totalOnly,
      inkSavingMode: opts.inkSaving,
    })
    setShowConfigModal(false)
    // Small delay to allow the DOM to update based on state changes before printing
    setTimeout(() => window.print(), 100)
  }

  // The Editor's "Export PDF" button can't print its own editable canvas (unstyled for print),
  // so it opens this page with the chosen options encoded here instead — apply them and print
  // automatically. Guarded by a ref so React 18 Strict Mode's double-effect in dev can't
  // trigger the print dialog twice.
  const printTriggeredRef = useRef(false)
  useEffect(() => {
    if (printTriggeredRef.current) return
    const raw = searchParams.get('pdfExport')
    if (!raw) return
    try {
      const opts = JSON.parse(raw) as PdfExportOptions
      printTriggeredRef.current = true
      handlePdfExport(opts)
    } catch {
      // Malformed query param — ignore rather than crash the page.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const formatDate = (dateStr: string, format: string) => {
    if (!dateStr) return ''
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr // fallback if not parseable

      if (format === 'slashes') return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
      if (format === 'iso') return d.toISOString().split('T')[0]
      return dateStr // standard original
    } catch {
      return dateStr
    }
  }

  const effectiveThemeColor = pdfConfig.inkSavingMode ? '#000000' : themeColor
  const headerTextToRender = pdfConfig.headerText || content.title

  if (viewMode === 'deck') {
    return (
      <DeckView
        content={content}
        brand={{
          primary: themeColor,
          secondary: proposal.brand_kits?.colors?.secondary,
          accent: proposal.brand_kits?.colors?.accent,
          name: proposal.brand_kits?.name || null,
          headingFont: headingFontName,
          bodyFont: bodyFontName,
        }}
        currency={currency}
        onExit={() => setViewMode('document')}
      />
    )
  }

  // Generate page number CSS based on selection (Using CSS counter pseudo-elements in a fixed container)
  const getPageNumberClass = () => {
    switch (pdfConfig.pageNumbers) {
      case 'top-left': return 'top-8 left-8 text-left'
      case 'top-right': return 'top-8 right-8 text-right'
      case 'bottom-left': return 'bottom-8 left-8 text-left'
      case 'bottom-right': return 'bottom-8 right-8 text-right'
      default: return 'hidden'
    }
  }

  return (
    <div className={`relative min-h-screen print:min-h-0 ${pdfConfig.inkSavingMode ? 'print:text-black' : ''}`} style={{ background: 'var(--surface-page)' }}>
      <BrandFontLink heading={headingFontName} body={bodyFontName} />

      {/* Anchored to the viewport, not this potentially long-scrolling document — same fix as
          the Modal/PdfExportModal below, so the celebration centers on screen regardless of
          scroll position or page length. */}
      {burst && (
        <div className="print:hidden" style={{ position: 'fixed', inset: 0, zIndex: 90 }}>
          <DealWon show={burst} onDone={() => setBurst(false)} />
        </div>
      )}

      {/* Dynamic Print Page Numbers (Fixed) - Removed in favor of @page CSS injected via style tag */}
      <style>{`
        @media print {
          @page {
            ${pdfConfig.pageNumbers !== 'none' ? `
              @${pdfConfig.pageNumbers} {
                content: counter(page);
              }
            ` : ''}
          }
          body { background: #ffffff !important; }
        }
      `}</style>

      {/* Top action bar - Hidden in Print */}
      <div className="print:hidden px-4 sm:px-8" style={{
        position: 'sticky', top: 0, zIndex: 40, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
        rowGap: 10, columnGap: 16, padding: '16px 0', background: 'var(--glass-quiet)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)',
        borderBottom: '1px solid var(--border-hairline)', fontFamily: 'var(--font-sans)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flexWrap: 'wrap', rowGap: 6 }}>
          <h2 style={{ margin: 0, fontSize: 'var(--text-body)', fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)' }}>{content.clientName} Proposal</h2>
          {isOwner && proposal.status === 'DRAFT' && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 'var(--radius-pill)',
              background: 'var(--status-caution-surface)', border: '1px solid var(--status-caution-border)', color: 'var(--status-caution-text)',
              fontSize: 'var(--text-micro)', fontWeight: 'var(--weight-medium)', flex: 'none',
            }}>
              Preview Mode (DRAFT)
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="ghost" size="sm" icon="sparkles" onClick={() => setViewMode('deck')}>View as deck</Button>
          <Button variant="ink" size="sm" icon="settings" onClick={() => setShowConfigModal(true)}>Configure &amp; Print PDF</Button>
        </div>
      </div>

      {/* Modal is designed to fill its nearest positioned ancestor — anchor that to the
          viewport (not this long-scrolling document) so it doesn't land off-screen. */}
      {showConfigModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60 }}>
          <PdfExportModal
            open={showConfigModal}
            onClose={() => setShowConfigModal(false)}
            title={content.title}
            accent={themeColor}
            sections={PDF_SECTIONS}
            onExport={handlePdfExport}
          />
        </div>
      )}

      <div className="max-w-4xl mx-auto my-12 print:my-0 print:rounded-none print:shadow-none" style={{
        background: 'var(--surface-card)', borderRadius: 'var(--radius-card-lg)', boxShadow: 'var(--shadow-modal)', overflow: 'hidden',
      }}>

        {/* Header Section — a soft radial highlight and an accent rule give this the same
            "hero" language the deck view already uses for its cover slide, instead of a flat
            block of color. Skipped for print/ink-saving, same as the background color itself. */}
        <div
          className={`relative p-12 text-white print:text-black ${pdfConfig.inkSavingMode ? 'print:bg-transparent print:border-b print:border-gray-300' : ''}`}
          style={{ overflow: 'hidden', ...(!pdfConfig.inkSavingMode ? { backgroundColor: themeColor } : {}) }}
        >
          {!pdfConfig.inkSavingMode && (
            <div aria-hidden="true" className="print:hidden" style={{
              position: 'absolute', top: '-40%', right: '-8%', width: '65%', height: '180%',
              background: 'radial-gradient(closest-side, rgba(255,255,255,0.18), transparent 70%)', pointerEvents: 'none',
            }} />
          )}
          <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 className="text-4xl font-bold mb-1 print:text-5xl" style={{ fontFamily: headingFontFamily }}>{headerTextToRender}</h1>
          {!pdfConfig.inkSavingMode && (
            <span aria-hidden="true" className="print:hidden" style={{ display: 'block', width: 48, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.55)', margin: '14px 0 20px' }} />
          )}
          <div className="grid grid-cols-2 gap-8 mt-8 opacity-90 text-sm print:opacity-100">
            <div>
              <p className="uppercase tracking-wider text-xs mb-1 opacity-70 print:text-gray-500">Prepared For</p>
              <p className="font-medium">{content.preparedFor}</p>
              <p>{content.clientName}</p>
            </div>
            <div>
              <p className="uppercase tracking-wider text-xs mb-1 opacity-70 print:text-gray-500">Prepared By</p>
              <p className="font-medium">{content.preparedBy}</p>
            </div>

            {pdfConfig.datesMode !== 'none' && (
              <>
                {(pdfConfig.datesMode === 'both' || pdfConfig.datesMode === 'issued') && (
                  <div>
                    <p className="uppercase tracking-wider text-xs mb-1 opacity-70 print:text-gray-500">Date Issued</p>
                    <p>{formatDate(content.dateIssued, pdfConfig.datesFormat)}</p>
                  </div>
                )}
                {(pdfConfig.datesMode === 'both' || pdfConfig.datesMode === 'validUntil') && (
                  <div>
                    <p className="uppercase tracking-wider text-xs mb-1 opacity-70 print:text-gray-500">Valid Until</p>
                    <p>{formatDate(content.validUntil, pdfConfig.datesFormat)}</p>
                  </div>
                )}
              </>
            )}
          </div>
          </div>
        </div>

        {/* Packages Section */}
        {content.packages && content.packages.length > 0 && (
          <div className="p-12 print:break-inside-avoid" style={{ borderBottom: '1px solid var(--border-hairline)' }}>
            <h2 className="text-ink" style={{ fontSize: 'var(--text-h3)', fontWeight: 700, marginBottom: 32, fontFamily: headingFontFamily }}>Investment Options</h2>
            <div className={content.packages.length === 1 ? 'grid grid-cols-1 gap-6 print:grid print:grid-cols-1 max-w-md' : 'grid grid-cols-1 md:grid-cols-2 gap-6 print:grid print:grid-cols-2'}>
              {content.packages.map((pkg: any, idx: number) => (
                <div
                  key={idx}
                  className={`relative rounded-xl p-6 print:break-inside-avoid print:border-gray-300 ${pkg.popular && !pdfConfig.inkSavingMode ? 'shadow-lg print:shadow-none print:border-4' : ''}`}
                  style={{ border: pkg.popular && !pdfConfig.inkSavingMode ? `2px solid ${themeColor}` : '1px solid var(--border-hairline)' }}
                >
                  {pkg.popular && (
                    <div
                      className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider print:text-black print:bg-gray-200 ${pdfConfig.inkSavingMode ? 'bg-gray-200 text-black border border-gray-300' : 'text-white'}`}
                      style={!pdfConfig.inkSavingMode ? { backgroundColor: themeColor } : {}}
                    >
                      Most Popular
                    </div>
                  )}

                  <h3 className="text-ink" style={{ fontSize: 'var(--text-h4)', fontWeight: 700, marginBottom: 8 }}>{pkg.name}</h3>
                  <p className="text-slate" style={{ fontSize: 'var(--text-sm)', marginBottom: 24, minHeight: 40, whiteSpace: 'pre-wrap' }}>{pkg.description}</p>

                  <div className="mb-6 flex items-baseline gap-2">
                    <span className="text-ink" style={{ fontSize: 30, fontWeight: 700 }}>{formatCurrency(pkg.discountedPrice, currency)}</span>
                    {pkg.originalPrice > 0 && !pdfConfig.hideLineItemPrices && (
                      <span className="text-mist" style={{ fontSize: 'var(--text-body-lg)', textDecoration: 'line-through' }}>
                        {formatCurrency(pkg.originalPrice, currency)}
                      </span>
                    )}
                  </div>

                  <ul className="space-y-3">
                    {pkg.deliverables?.map((deliv: string, dIdx: number) => (
                      <li key={dIdx} className="text-slate flex items-start gap-3" style={{ fontSize: 'var(--text-sm)' }}>
                        <Check className="w-5 h-5 shrink-0 mt-0.5 print:text-black" style={!pdfConfig.inkSavingMode ? { color: themeColor } : {}} />
                        <span className="flex-1 whitespace-pre-wrap">{deliv}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add-ons Section */}
        {pdfConfig.visibleSections.addOns && content.addOns && content.addOns.length > 0 && (
          <div className="p-12 print:break-inside-avoid" style={{ borderBottom: '1px solid var(--border-hairline)' }}>
            <h2 className="text-ink" style={{ fontSize: 'var(--text-h4)', fontWeight: 700, marginBottom: 24, fontFamily: headingFontFamily }}>Optional Add-ons</h2>
            <div className="space-y-4">
              {content.addOns.map((addon: any, idx: number) => (
                <div key={idx} className="flex items-start justify-between rounded-lg p-4 print:bg-white print:border-gray-200"
                  style={{ background: pdfConfig.inkSavingMode ? 'var(--surface-card)' : 'var(--surface-sunken)', border: '1px solid var(--border-hairline)' }}>
                  <div className="flex-1">
                    <h4 className="text-ink" style={{ fontWeight: 700 }}>{addon.name}</h4>
                    <p className="text-slate" style={{ fontSize: 'var(--text-sm)', marginTop: 4, whiteSpace: 'pre-wrap' }}>{addon.description}</p>
                  </div>
                  {!pdfConfig.hideLineItemPrices && (
                    <div className="text-ink" style={{ fontWeight: 700, paddingLeft: 16, marginLeft: 16, borderLeft: '1px solid var(--border-hairline)' }}>
                      +{formatCurrency(addon.price, currency)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline Section */}
        {pdfConfig.visibleSections.timeline && content.timeline && content.timeline.length > 0 && (
          <div className="p-12 print:break-inside-avoid" style={{ borderBottom: '1px solid var(--border-hairline)' }}>
            <h2 className="text-ink" style={{ fontSize: 'var(--text-h3)', fontWeight: 700, marginBottom: 32, fontFamily: headingFontFamily }}>Project Timeline</h2>
            <div className="space-y-6">
              {content.timeline.map((phase: any, idx: number) => (
                <div key={idx} className="flex gap-4">
                  <span aria-hidden="true" className="print:hidden" style={{ width: 10, height: 10, borderRadius: '50%', background: themeColor, marginTop: 6, flex: 'none' }} />
                  <div className="w-32 shrink-0">
                    <div className="text-ink" style={{ fontWeight: 700 }}>{phase.phase}</div>
                    <div className="text-mist" style={{ fontSize: 'var(--text-sm)' }}>{phase.duration}</div>
                  </div>
                  <div className="flex-1 pb-6 print:border-gray-300" style={{ borderBottom: '1px solid var(--border-hairline)' }}>
                    <p className="text-slate" style={{ whiteSpace: 'pre-wrap' }}>{phase.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attachments Section */}
        {pdfConfig.visibleSections.attachments && content.attachments && content.attachments.length > 0 && (
          <div className="p-12 print:break-inside-avoid" style={{ borderBottom: '1px solid var(--border-hairline)' }}>
            <h2 className="text-ink" style={{ fontSize: 'var(--text-h4)', fontWeight: 700, marginBottom: 24, fontFamily: headingFontFamily }}>Attachments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid print:grid-cols-2">
              {content.attachments.map((a: any, idx: number) => (
                <div key={idx} className="print:break-inside-avoid" style={{ borderRadius: 'var(--radius-card)', overflow: 'hidden', border: '1px solid var(--border-hairline)' }}>
                  {a.type === 'video' ? (
                    <video src={a.url} controls preload="none" style={{ width: '100%', display: 'block', background: 'var(--ink-06)' }} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.url} alt={a.caption || 'Attachment'} loading="lazy" style={{ width: '100%', display: 'block' }} />
                  )}
                  {a.caption && (
                    <p className="text-slate" style={{ fontSize: 'var(--text-sm)', padding: '10px 14px' }}>{a.caption}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment & Terms Section */}
        <div className="p-12 grid grid-cols-1 md:grid-cols-2 gap-12 print:bg-white print:break-inside-avoid"
          style={{ background: pdfConfig.inkSavingMode ? 'var(--surface-card)' : 'var(--surface-sunken)' }}>
          {content.paymentSection && (
            <div>
              <h2 className="text-ink" style={{ fontSize: 'var(--text-body-lg)', fontWeight: 700, marginBottom: 16, fontFamily: headingFontFamily }}>Payment Schedule</h2>
              <div className="text-slate" style={{ fontSize: 'var(--text-sm)' }}>
                <p className="text-ink" style={{ fontWeight: 'var(--weight-medium)', marginBottom: 8 }}>{content.paymentSection.schedule}</p>
                <p style={{ whiteSpace: 'pre-wrap' }}>{content.paymentSection.terms}</p>
              </div>

              {paymentDisplay && (paymentDisplay.payment_upi_id || paymentDisplay.payment_link || paymentDisplay.payment_qr_url) && (
                <div className="mt-6 pt-6 print:border-gray-300 print:break-inside-avoid" style={{
                  borderTop: '1px solid var(--border-hairline)', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)',
                }}>
                  {paymentDisplay.payment_qr_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={paymentDisplay.payment_qr_url} alt="Payment QR code" width={56} height={56} style={{ borderRadius: 8, flex: 'none' }} />
                  ) : (
                    <Icon name="qr-code" size={30} />
                  )}
                  <div>
                    <div className="text-ink" style={{ fontSize: 'var(--text-body)', fontWeight: 500 }}>Pay via UPI or QR</div>
                    <div className="text-slate" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                      {paymentDisplay.payment_upi_id && `UPI: ${paymentDisplay.payment_upi_id}`}
                      {paymentDisplay.payment_upi_id && paymentDisplay.payment_link && ' · '}
                      {paymentDisplay.payment_link && (
                        <a href={paymentDisplay.payment_link} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-deep)', fontWeight: 500 }}>
                          Payment link
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {pdfConfig.visibleSections.terms && content.terms && content.terms.length > 0 && (
            <div>
              <h2 className="text-ink" style={{ fontSize: 'var(--text-body-lg)', fontWeight: 700, marginBottom: 16, fontFamily: headingFontFamily }}>Terms & Conditions</h2>
              <ul className="text-slate list-disc pl-4 space-y-2" style={{ fontSize: 'var(--text-sm)' }}>
                {content.terms.map((term: string, idx: number) => (
                  <li key={idx} style={{ whiteSpace: 'pre-wrap' }}>{term}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Signature Certificate — part of the permanent document once signed, so it prints
            and stays visible to both the signer and the owner reviewing the same page. */}
        {acceptedAt && (
          <div className="p-12 print:break-inside-avoid" style={{ borderTop: '1px solid var(--border-hairline)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span aria-hidden="true" className="print:hidden" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: themeColor, flex: 'none' }}>
                <Icon name="lock" size={15} color="#fff" />
              </span>
              <Icon name="lock" size={15} color="var(--text-muted)" className="hidden print:inline" />
              <h2 className="text-ink" style={{ fontSize: 'var(--text-body-lg)', fontWeight: 700, margin: 0 }}>Signature Certificate</h2>
            </div>
            <div style={{
              border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)', padding: '20px 24px',
              background: 'var(--surface-sunken)',
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <p className="uppercase tracking-wider text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Signatory Name</p>
                  <p className="text-ink" style={{ fontWeight: 'var(--weight-medium)' }}>{acceptedByName}</p>
                </div>
                <div>
                  <p className="uppercase tracking-wider text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Timestamp (UTC)</p>
                  <p className="text-ink" style={{ fontWeight: 'var(--weight-medium)' }}>{formatUtc(acceptedAt)}</p>
                </div>
                <div>
                  <p className="uppercase tracking-wider text-xs mb-1" style={{ color: 'var(--text-muted)' }}>IP Address</p>
                  <p className="text-slate" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
                    {signature?.ip_address || 'Not recorded'}
                  </p>
                </div>
                <div>
                  <p className="uppercase tracking-wider text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Browser / User-Agent</p>
                  <p className="text-slate" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', wordBreak: 'break-all' }}>
                    {signature?.user_agent || 'Not recorded'}
                  </p>
                </div>
              </div>
              {signature?.consent_statement && (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-hairline)' }}>
                  <p className="uppercase tracking-wider text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Consent statement</p>
                  <p className="text-slate" style={{ fontSize: 'var(--text-sm)', fontStyle: 'italic', lineHeight: 'var(--leading-body)' }}>
                    &ldquo;{signature.consent_statement}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {canAcceptSign && !acceptedAt && <div style={{ height: 88 }} className="print:hidden" />}

      {/* Review & sign / accepted state — pinned to the viewport bottom, hidden in print. */}
      {canAcceptSign && (
        <div className="print:hidden" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, display: 'flex', justifyContent: 'center',
          padding: '16px 24px', background: 'var(--glass-quiet)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)',
          borderTop: '1px solid var(--border-hairline)', fontFamily: 'var(--font-sans)',
        }}>
          <div className="w-full max-w-4xl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            {!acceptedAt ? (
              <>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Questions? Reply to the email this link came from.</span>
                <Button variant="primary" icon="signature" onClick={() => setShowSignModal(true)}>Accept proposal</Button>
              </>
            ) : (
              <>
                <Badge tone="accepted">Accepted by {acceptedByName}</Badge>
              </>
            )}
          </div>
        </div>
      )}

      {showSignModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60 }}>
          <Modal
            eyebrow="Optional e-signature"
            title="Accept this proposal"
            onClose={() => setShowSignModal(false)}
            footer={
              <>
                <span style={{ flex: 1 }} />
                <Button variant="secondary" onClick={() => setShowSignModal(false)}>Cancel</Button>
                <Button variant="primary" icon="check" onClick={handleAcceptSign} loading={signing} disabled={!signerName.trim()}>Accept &amp; sign</Button>
              </>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input label="Your full name" placeholder="Jane Doe" value={signerName} onChange={(e) => setSignerName(e.target.value)} autoFocus />
              <SignaturePad name={signerName} />
              <div style={{
                padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-sunken)',
                border: '1px solid var(--border-hairline)',
              }}>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--leading-body)' }}>
                  {ESIGN_CONSENT_STATEMENT}
                </p>
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Your name, IP address and browser will be recorded alongside this consent to form the signature's audit trail.
              </p>
              {signError && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--status-caution-text)' }}>{signError}</p>}
            </div>
          </Modal>
        </div>
      )}
    </div>
  )
}
