'use client'

import React, { useEffect, useState } from 'react'
import { Check, Printer, Settings, X } from 'lucide-react'

export default function PublicProposalView({ 
  proposal, 
  paymentInfo, 
  isOwner 
}: { 
  proposal: any, 
  paymentInfo: any, 
  isOwner: boolean 
}) {
  const content = proposal.content
  const themeColor = content.themeColor || '#4F46E5'

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
      terms: true
    },
    hideLineItemPrices: false,
    inkSavingMode: false
  })

  const handlePrint = () => {
    setShowConfigModal(false)
    // Small delay to allow the DOM to update based on state changes before printing
    setTimeout(() => window.print(), 100)
  }

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
    <div className={`min-h-screen bg-gray-100 print:bg-white print:min-h-0 ${pdfConfig.inkSavingMode ? 'print:text-black' : ''}`}>
      
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
        }
      `}</style>

      {/* Top action bar - Hidden in Print */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-40 print:hidden">
        <div>
          <h2 className="text-lg font-medium text-gray-900">{content.clientName} Proposal</h2>
          {isOwner && proposal.status === 'DRAFT' && (
            <span className="text-sm font-semibold text-red-600 bg-red-50 px-2 py-1 rounded ml-2">Preview Mode (DRAFT)</span>
          )}
        </div>
        <button
          onClick={() => setShowConfigModal(true)}
          className="flex items-center gap-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 px-4 py-2 rounded-md transition-colors shadow-sm"
        >
          <Settings className="w-4 h-4" /> Configure & Print PDF
        </button>
      </div>

      {/* PDF Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 print:hidden">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><Printer className="w-5 h-5 text-gray-500"/> PDF Print Settings</h3>
              <button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex flex-col gap-6">
              
              {/* Header Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Print Header</label>
                <input 
                  type="text" 
                  value={pdfConfig.headerText}
                  onChange={(e) => setPdfConfig(p => ({ ...p, headerText: e.target.value }))}
                  placeholder={content.title}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank to use proposal title.</p>
              </div>

              {/* Page Numbers */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Page Numbers</label>
                <select 
                  value={pdfConfig.pageNumbers}
                  onChange={(e) => setPdfConfig(p => ({ ...p, pageNumbers: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="none">None</option>
                  <option value="top-left">Top Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-right">Bottom Right</option>
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Show Dates</label>
                  <select 
                    value={pdfConfig.datesMode}
                    onChange={(e) => setPdfConfig(p => ({ ...p, datesMode: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="both">Issued & Valid Until</option>
                    <option value="issued">Issued Only</option>
                    <option value="validUntil">Valid Until Only</option>
                    <option value="none">Hide Dates</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
                  <select 
                    value={pdfConfig.datesFormat}
                    onChange={(e) => setPdfConfig(p => ({ ...p, datesFormat: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="standard">Standard (Oct 24, 2023)</option>
                    <option value="slashes">Slashes (10/24/2023)</option>
                    <option value="iso">ISO (2023-10-24)</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 grid grid-cols-2 gap-6">
                {/* Visibility Toggles */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3">Include Sections</h4>
                  <label className="flex items-center gap-2 mb-2 text-sm text-gray-700">
                    <input type="checkbox" checked={pdfConfig.visibleSections.addOns} onChange={(e) => setPdfConfig(p => ({...p, visibleSections: {...p.visibleSections, addOns: e.target.checked}}))} />
                    Optional Add-ons
                  </label>
                  <label className="flex items-center gap-2 mb-2 text-sm text-gray-700">
                    <input type="checkbox" checked={pdfConfig.visibleSections.timeline} onChange={(e) => setPdfConfig(p => ({...p, visibleSections: {...p.visibleSections, timeline: e.target.checked}}))} />
                    Timeline
                  </label>
                  <label className="flex items-center gap-2 mb-2 text-sm text-gray-700">
                    <input type="checkbox" checked={pdfConfig.visibleSections.terms} onChange={(e) => setPdfConfig(p => ({...p, visibleSections: {...p.visibleSections, terms: e.target.checked}}))} />
                    Terms & Conditions
                  </label>
                </div>

                {/* Print Options */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3">Print Settings</h4>
                  <label className="flex items-center gap-2 mb-2 text-sm text-gray-700">
                    <input type="checkbox" checked={pdfConfig.hideLineItemPrices} onChange={(e) => setPdfConfig(p => ({...p, hideLineItemPrices: e.target.checked}))} />
                    Hide Line-Item Prices
                  </label>
                  <label className="flex items-center gap-2 mb-2 text-sm text-gray-700">
                    <input type="checkbox" checked={pdfConfig.inkSavingMode} onChange={(e) => setPdfConfig(p => ({...p, inkSavingMode: e.target.checked}))} />
                    Ink-Saving Mode (No Backgrounds)
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowConfigModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
              <button onClick={handlePrint} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm">Apply & Print</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto my-12 bg-white shadow-2xl rounded-xl overflow-hidden print:shadow-none print:my-0 print:rounded-none">
        
        {/* Header Section */}
        <div 
          className={`p-12 text-white print:text-black ${pdfConfig.inkSavingMode ? 'print:bg-transparent print:border-b print:border-gray-300' : ''}`} 
          style={!pdfConfig.inkSavingMode ? { backgroundColor: themeColor } : {}}
        >
          <h1 className="text-4xl font-bold mb-4 print:text-5xl">{headerTextToRender}</h1>
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

        {/* Packages Section */}
        {content.packages && content.packages.length > 0 && (
          <div className="p-12 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Investment Options</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid print:grid-cols-2">
              {content.packages.map((pkg: any, idx: number) => (
                <div
                  key={idx}
                  className={`relative border-2 rounded-xl p-6 print:break-inside-avoid print:border-gray-300 ${pkg.popular && !pdfConfig.inkSavingMode ? 'border-transparent shadow-lg print:shadow-none print:border-4' : 'border-gray-100'}`}
                  style={pkg.popular && !pdfConfig.inkSavingMode ? { borderColor: themeColor } : {}}
                >
                  {pkg.popular && (
                    <div
                      className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider print:text-black print:bg-gray-200 ${pdfConfig.inkSavingMode ? 'bg-gray-200 text-black border border-gray-300' : 'text-white'}`}
                      style={!pdfConfig.inkSavingMode ? { backgroundColor: themeColor } : {}}
                    >
                      Most Popular
                    </div>
                  )}

                  <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                  <p className="text-sm text-gray-600 mb-6 min-h-[40px] whitespace-pre-wrap">{pkg.description}</p>

                  <div className="mb-6 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-900">${(pkg.discountedPrice || pkg.price).toLocaleString()}</span>
                    {pkg.originalPrice && !pdfConfig.hideLineItemPrices && (
                      <span className="text-lg text-gray-400 line-through">
                        ${pkg.originalPrice.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <ul className="space-y-3">
                    {pkg.deliverables?.map((deliv: string, dIdx: number) => (
                      <li key={dIdx} className="flex items-start gap-3 text-sm text-gray-700">
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
          <div className="p-12 border-b border-gray-100 print:break-inside-avoid">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Optional Add-ons</h2>
            <div className="space-y-4">
              {content.addOns.map((addon: any, idx: number) => (
                <div key={idx} className={`flex items-start justify-between p-4 rounded-lg border border-gray-100 print:bg-white print:border-gray-200 ${pdfConfig.inkSavingMode ? 'bg-white' : 'bg-gray-50'}`}>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900">{addon.name}</h4>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{addon.description}</p>
                  </div>
                  {!pdfConfig.hideLineItemPrices && (
                    <div className="font-bold text-gray-900 pl-4 border-l border-gray-200 ml-4">
                      +${addon.price.toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline Section */}
        {pdfConfig.visibleSections.timeline && content.timeline && content.timeline.length > 0 && (
          <div className="p-12 border-b border-gray-100 print:break-inside-avoid">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Project Timeline</h2>
            <div className="space-y-6">
              {content.timeline.map((phase: any, idx: number) => (
                <div key={idx} className="flex gap-6">
                  <div className="w-32 shrink-0">
                    <div className="font-bold text-gray-900">{phase.phase}</div>
                    <div className="text-sm text-gray-500">{phase.duration}</div>
                  </div>
                  <div className="flex-1 pb-6 border-b border-gray-100 print:border-gray-300">
                    <p className="text-gray-700 whitespace-pre-wrap">{phase.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment & Terms Section */}
        <div className={`p-12 grid grid-cols-1 md:grid-cols-2 gap-12 print:bg-white print:break-inside-avoid ${pdfConfig.inkSavingMode ? 'bg-white border-t border-gray-100' : 'bg-gray-50'}`}>
          {content.paymentSection && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Payment Schedule</h2>
              <div className="prose prose-sm text-gray-600">
                <p className="font-medium text-gray-900 mb-2">{content.paymentSection.schedule}</p>
                <p className="whitespace-pre-wrap">{content.paymentSection.terms}</p>
              </div>

              {paymentInfo && (
                <div className="mt-6 pt-6 border-t border-gray-200 print:border-gray-300">
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Payment Details</h3>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {paymentInfo.instructions || JSON.stringify(paymentInfo, null, 2)}
                  </div>
                </div>
              )}
            </div>
          )}

          {pdfConfig.visibleSections.terms && content.terms && content.terms.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Terms & Conditions</h2>
              <ul className="list-disc pl-4 space-y-2 text-sm text-gray-600">
                {content.terms.map((term: string, idx: number) => (
                  <li key={idx} className="whitespace-pre-wrap">{term}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
