'use client'

import { useState } from 'react'
import { extractFromUrl, extractFromImage, saveBrandKit } from './actions'

export default function BrandKitPage() {
  const [sourceType, setSourceType] = useState<'url' | 'image' | 'manual'>('url')
  const [sourceRef, setSourceRef] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [error, setError] = useState('')
  
  const [brandData, setBrandData] = useState({
    colors: { primary: '#000000', secondary: '#ffffff', accent: '#000000', background: '#ffffff', text: '#000000' },
    fonts: { heading: 'sans-serif', body: 'sans-serif' },
    logoUrl: ''
  })

  const [hasExtracted, setHasExtracted] = useState(false)

  const handleUrlExtraction = async () => {
    try {
      setIsExtracting(true)
      setError('')
      const data = await extractFromUrl(sourceRef)
      setBrandData(data as any)
      setHasExtracted(true)
    } catch (err: any) {
      setError(err.message || 'Failed to extract from URL')
    } finally {
      setIsExtracting(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result as string
      setSourceRef(file.name)
      try {
        setIsExtracting(true)
        setError('')
        const data = await extractFromImage(base64)
        setBrandData(data as any)
        setHasExtracted(true)
      } catch (err: any) {
        setError(err.message || 'Failed to extract from Image')
      } finally {
        setIsExtracting(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    try {
      await saveBrandKit({
        source_type: sourceType,
        source_reference: sourceRef,
        ...brandData
      })
    } catch (err: any) {
      setError(err.message || 'Failed to save')
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Set up your Brand Kit</h1>
      
      {!hasExtracted ? (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Extract from existing assets</h2>
          
          <div className="flex gap-4 mb-6">
            <button 
              onClick={() => setSourceType('url')}
              className={`px-4 py-2 rounded-md ${sourceType === 'url' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}
            >
              From Website URL
            </button>
            <button 
              onClick={() => setSourceType('image')}
              className={`px-4 py-2 rounded-md ${sourceType === 'image' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}
            >
              From Document/Image
            </button>
            <button 
              onClick={() => { setSourceType('manual'); setHasExtracted(true); }}
              className={`px-4 py-2 rounded-md ${sourceType === 'manual' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}
            >
              Enter Manually
            </button>
          </div>

          {sourceType === 'url' && (
            <div className="space-y-4">
              <input 
                type="url"
                value={sourceRef}
                onChange={e => setSourceRef(e.target.value)}
                placeholder="https://yourwebsite.com"
                className="block w-full rounded-md border border-gray-300 px-4 py-2"
              />
              <button
                onClick={handleUrlExtraction}
                disabled={isExtracting || !sourceRef}
                className="bg-indigo-600 text-white px-6 py-2 rounded-md disabled:opacity-50"
              >
                {isExtracting ? 'Extracting via AI...' : 'Extract Brand Kit'}
              </button>
            </div>
          )}

          {sourceType === 'image' && (
            <div className="space-y-4">
              <input 
                type="file"
                accept="image/*,.pdf"
                onChange={handleImageUpload}
                disabled={isExtracting}
                className="block w-full rounded-md border border-gray-300 px-4 py-2"
              />
              {isExtracting && <p className="text-indigo-600">Analyzing image with Claude Vision...</p>}
            </div>
          )}

          {error && <p className="mt-4 text-red-500">{error}</p>}
        </div>
      ) : (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Review & Edit Brand Kit</h2>
            <button onClick={() => setHasExtracted(false)} className="text-sm text-gray-500 hover:text-gray-900">
              Start Over
            </button>
          </div>

          {(brandData as any).is_low_confidence && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Low Confidence Extraction</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  We couldn&apos;t extract much from this site (missing logo or minimal colors detected). Please double-check these fields.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Colors</h3>
              {Object.entries(brandData.colors).map(([key, val]) => (
                <div key={key} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full border shadow-sm" style={{ backgroundColor: val }} />
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 capitalize">{key}</label>
                    <input 
                      type="text" 
                      value={val}
                      onChange={e => setBrandData({...brandData, colors: {...brandData.colors, [key]: e.target.value}})}
                      className="block w-full border-b border-gray-200 focus:border-indigo-600 outline-none py-1"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Typography</h3>
                {Object.entries(brandData.fonts).map(([key, val]) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-500 capitalize">{key} Font</label>
                    <input 
                      type="text" 
                      value={val}
                      onChange={e => setBrandData({...brandData, fonts: {...brandData.fonts, [key]: e.target.value}})}
                      className="block w-full border-b border-gray-200 focus:border-indigo-600 outline-none py-1"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Logo</h3>
                <input 
                  type="url" 
                  value={brandData.logoUrl}
                  onChange={e => setBrandData({...brandData, logoUrl: e.target.value})}
                  className="block w-full border-b border-gray-200 focus:border-indigo-600 outline-none py-1"
                  placeholder="https://..."
                />
                {brandData.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brandData.logoUrl} alt="Logo Preview" className="h-16 object-contain" />
                )}
              </div>
            </div>
          </div>

          {error && <p className="mt-4 text-red-500">{error}</p>}

          <div className="mt-8 flex justify-end">
            <button 
              onClick={handleSave}
              className="bg-indigo-600 text-white px-8 py-3 rounded-md hover:bg-indigo-700 shadow-md font-medium transition"
            >
              Save & Continue to Templates
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
