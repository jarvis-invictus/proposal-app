'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Check, Loader2, ArrowUp, ArrowDown, Palette } from 'lucide-react'
import { NotificationsDropdown } from '@/components/NotificationsDropdown'

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
  multiline = false,
  as: Component = 'span'
}: {
  value: string
  onChange: (newVal: string) => void
  className?: string
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

  return (
    <Component
      className={`outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50/50 rounded transition-colors break-words min-w-[20px] inline-block ${className}`}
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
  className = ''
}: {
  value: number
  onChange: (newVal: number) => void
  className?: string
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
        className={`bg-transparent outline-none border-b border-blue-500 focus:ring-0 p-0 w-24 ${className}`}
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
      className={`cursor-text hover:bg-gray-100 rounded px-1 transition-colors ${className}`}
      onClick={() => setIsEditing(true)}
    >
      ${value.toLocaleString()}
    </span>
  )
}

export default function ProposalEditor({ initialProposal }: { initialProposal: any }) {
  const [proposal, setProposal] = useState(initialProposal)
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [themeColor, setThemeColor] = useState(
    initialProposal.content.themeColor || '#4F46E5' // Default Indigo
  )

  const content = proposal.content

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
        body: JSON.stringify({ status: 'PUBLISHED' }) // Will be handled by the route
      })
      if (!res.ok) throw new Error('Failed to publish')
      setProposal({ ...proposal, status: 'PUBLISHED' })
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
    <div className="relative min-h-screen pb-32">
      
      {/* Editor Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-medium text-gray-900">Proposal Editor</h2>
          <span className={`px-2 py-1 rounded text-xs font-medium ${proposal.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {proposal.status}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <NotificationsDropdown />
          {proposal.status === 'PUBLISHED' && (
            <button
              onClick={copyLink}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md transition-colors"
            >
              Copy Public Link
            </button>
          )}
          {proposal.status === 'DRAFT' && (
            <button
              onClick={handlePublish}
              className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md transition-colors"
            >
              Publish
            </button>
          )}
        </div>
      </div>
      {/* Floating Theme Control Panel */}
      <div className="fixed top-24 right-8 bg-white shadow-xl rounded-lg border border-gray-200 p-4 z-50 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Palette className="w-4 h-4" /> Theme Color
        </div>
        <div className="flex gap-2">
          {['#4F46E5', '#0F172A', '#10B981', '#F59E0B', '#EF4444'].map((color) => (
            <button
              key={color}
              className={`w-8 h-8 rounded-full border-2 focus:outline-none ${themeColor === color ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105'}`}
              style={{ backgroundColor: color }}
              onClick={() => handleColorChange(color)}
              title={color}
            />
          ))}
          <input
            type="color"
            value={themeColor}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
          />
        </div>
      </div>

      {/* Auto-save Status Indicator */}
      <div className="fixed bottom-8 right-8 bg-white shadow-lg rounded-full px-4 py-2 flex items-center gap-2 z-50 border border-gray-100">
        {savingState === 'saving' && (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
            <span className="text-sm text-gray-500">Saving...</span>
          </>
        )}
        {savingState === 'saved' && (
          <>
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-600">Saved</span>
          </>
        )}
        {savingState === 'idle' && (
          <span className="text-sm text-gray-400">All changes saved</span>
        )}
        {savingState === 'error' && (
          <span className="text-sm font-medium text-red-500">Failed to save - Edit again to retry</span>
        )}
      </div>

      {/* Proposal Render */}
      <div className="max-w-4xl mx-auto mt-12 bg-white shadow-2xl rounded-xl overflow-hidden print:shadow-none print:mt-0">
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
          <div className="p-12 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Investment Options</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {content.packages.map((pkg: any, idx: number) => (
                <div
                  key={idx}
                  className={`group relative border-2 rounded-xl p-6 ${pkg.popular ? 'border-transparent shadow-lg' : 'border-gray-100'}`}
                  style={pkg.popular ? { borderColor: themeColor } : {}}
                >
                  {/* Reorder controls visible on hover */}
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => moveArrayItem('packages', idx, 'up')} className="p-1 bg-white shadow rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-30" disabled={idx === 0}>
                      <ArrowUp className="w-3 h-3 text-gray-600" />
                    </button>
                    <button onClick={() => moveArrayItem('packages', idx, 'down')} className="p-1 bg-white shadow rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-30" disabled={idx === content.packages.length - 1}>
                      <ArrowDown className="w-3 h-3 text-gray-600" />
                    </button>
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
                    className="text-xl font-bold text-gray-900 mb-2 block"
                    value={pkg.name}
                    onChange={(v) => updateArrayItem('packages', idx, 'name', v)}
                  />
                  <EditableText
                    as="p"
                    className="text-sm text-gray-600 mb-6 block min-h-[40px]"
                    multiline
                    value={pkg.description}
                    onChange={(v) => updateArrayItem('packages', idx, 'description', v)}
                  />

                  <div className="mb-6 flex items-baseline gap-2">
                    <EditableNumber
                      className="text-3xl font-bold text-gray-900"
                      value={pkg.discountedPrice || pkg.price}
                      onChange={(v) => updateArrayItem('packages', idx, 'discountedPrice', v)}
                    />
                    {pkg.originalPrice && (
                      <span className="text-lg text-gray-400 line-through">
                        <EditableNumber
                          value={pkg.originalPrice}
                          onChange={(v) => updateArrayItem('packages', idx, 'originalPrice', v)}
                        />
                      </span>
                    )}
                  </div>

                  <ul className="space-y-3">
                    {pkg.deliverables?.map((deliv: string, dIdx: number) => (
                      <li key={dIdx} className="flex items-start gap-3 text-sm text-gray-700">
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
          <div className="p-12 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Optional Add-ons</h2>
            <div className="space-y-4">
              {content.addOns.map((addon: any, idx: number) => (
                <div key={idx} className="group relative flex items-start justify-between p-4 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => moveArrayItem('addOns', idx, 'up')} className="p-1 bg-white shadow rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-30" disabled={idx === 0}>
                      <ArrowUp className="w-3 h-3 text-gray-600" />
                    </button>
                    <button onClick={() => moveArrayItem('addOns', idx, 'down')} className="p-1 bg-white shadow rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-30" disabled={idx === content.addOns.length - 1}>
                      <ArrowDown className="w-3 h-3 text-gray-600" />
                    </button>
                  </div>

                  <div className="flex-1 pl-4">
                    <EditableText as="h4" className="font-bold text-gray-900" value={addon.name} onChange={(v) => updateArrayItem('addOns', idx, 'name', v)} />
                    <EditableText as="p" className="text-sm text-gray-600 mt-1" multiline value={addon.description} onChange={(v) => updateArrayItem('addOns', idx, 'description', v)} />
                  </div>
                  <div className="font-bold text-gray-900 pl-4 border-l border-gray-200 ml-4">
                    +<EditableNumber value={addon.price} onChange={(v) => updateArrayItem('addOns', idx, 'price', v)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline Section */}
        {content.timeline && content.timeline.length > 0 && (
          <div className="p-12 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Project Timeline</h2>
            <div className="space-y-6">
              {content.timeline.map((phase: any, idx: number) => (
                <div key={idx} className="group relative flex gap-6">
                  <div className="absolute -left-3 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => moveArrayItem('timeline', idx, 'up')} className="p-1 bg-white shadow rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-30" disabled={idx === 0}>
                      <ArrowUp className="w-3 h-3 text-gray-600" />
                    </button>
                    <button onClick={() => moveArrayItem('timeline', idx, 'down')} className="p-1 bg-white shadow rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-30" disabled={idx === content.timeline.length - 1}>
                      <ArrowDown className="w-3 h-3 text-gray-600" />
                    </button>
                  </div>

                  <div className="w-32 shrink-0">
                    <EditableText as="div" className="font-bold text-gray-900" value={phase.phase} onChange={(v) => updateArrayItem('timeline', idx, 'phase', v)} />
                    <EditableText as="div" className="text-sm text-gray-500" value={phase.duration} onChange={(v) => updateArrayItem('timeline', idx, 'duration', v)} />
                  </div>
                  <div className="flex-1 pb-6 border-b border-gray-100">
                    <EditableText as="p" className="text-gray-700" multiline value={phase.description} onChange={(v) => updateArrayItem('timeline', idx, 'description', v)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment & Terms Section */}
        <div className="p-12 bg-gray-50 grid grid-cols-1 md:grid-cols-2 gap-12">
          {content.paymentSection && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Payment Schedule</h2>
              <div className="prose prose-sm text-gray-600">
                <EditableText as="p" className="font-medium text-gray-900 mb-2 block" value={content.paymentSection.schedule} onChange={(v) => updateContent(prev => ({ ...prev, paymentSection: { ...prev.paymentSection, schedule: v } }))} />
                <EditableText as="p" className="block" multiline value={content.paymentSection.terms} onChange={(v) => updateContent(prev => ({ ...prev, paymentSection: { ...prev.paymentSection, terms: v } }))} />
              </div>
            </div>
          )}

          {content.terms && content.terms.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Terms & Conditions</h2>
              <ul className="list-disc pl-4 space-y-2 text-sm text-gray-600">
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
