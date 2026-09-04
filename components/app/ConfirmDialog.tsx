'use client'

import * as React from 'react'
import { Modal } from './Modal'
import { Button } from '../ui/Button'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  body?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/** Shared confirm-before-destroying dialog — replaces window.confirm() everywhere a delete/
 * remove action needs an "are you sure" step. A native confirm() ignores the app's theme, can't
 * be styled, and its focus/announcement behavior is inconsistent across browsers; this reuses
 * the same accessible Modal (focus trap, Escape-to-close, role="dialog") every other dialog in
 * the app already gets. */
export function ConfirmDialog({ open, title, body, confirmLabel = 'Delete', cancelLabel = 'Cancel', onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal open={open} title={title} onClose={onCancel} width={400}
      footer={
        <>
          <span style={{ flex: 1 }} />
          <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant="ink" onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }>
      {body && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>{body}</p>}
    </Modal>
  )
}
