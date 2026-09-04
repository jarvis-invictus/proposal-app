'use client'

import * as React from 'react'

/** A fixed-width side panel with a draggable left edge. Width persists per-browser via
 * localStorage (a per-viewer convenience, not data worth syncing anywhere) so it stays how you
 * left it across visits, without needing a preferences row in the database for it. */
export function ResizablePanel({ storageKey, defaultWidth, min = 280, max = 640, children }: {
  storageKey: string
  defaultWidth: number
  min?: number
  max?: number
  children: React.ReactNode
}) {
  const [width, setWidth] = React.useState(defaultWidth)
  const draggingRef = React.useRef(false)

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      const n = saved ? parseInt(saved, 10) : NaN
      if (!Number.isNaN(n)) setWidth(Math.min(max, Math.max(min, n)))
    } catch { /* private mode / storage blocked — just use the default */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    draggingRef.current = true
    const startX = e.clientX
    const startWidth = width

    const onMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return
      // Handle sits on the panel's left edge — dragging left grows it, dragging right shrinks it.
      setWidth(Math.min(max, Math.max(min, startWidth - (ev.clientX - startX))))
    }
    const onUp = () => {
      draggingRef.current = false
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setWidth((w) => {
        try { localStorage.setItem(storageKey, String(w)) } catch { /* best-effort only */ }
        return w
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div style={{ width, flex: 'none', position: 'relative', display: 'flex', minWidth: 0 }}>
      <div
        onPointerDown={onPointerDown}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        tabIndex={-1}
        style={{ position: 'absolute', left: -4, top: 0, bottom: 0, width: 8, cursor: 'col-resize', zIndex: 5, touchAction: 'none' }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}
