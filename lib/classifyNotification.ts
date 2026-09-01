// notifications.message is free text with no `type` column — every real inserter (view,
// accept, publish routes) uses a consistent enough phrase that this can classify reliably
// without a schema change.
export type NotificationKind = 'view' | 'accepted' | 'approval' | 'other'

export function classifyNotification(message: string): NotificationKind {
  if (message.includes('submitted for approval')) return 'approval'
  if (message.includes('accepted')) return 'accepted'
  if (message.includes('viewed')) return 'view'
  return 'other'
}
